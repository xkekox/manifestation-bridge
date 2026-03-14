[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ErrorActionPreference = 'Continue'

$ProjectDir = Split-Path -Parent $PSCommandPath
$RepoName = Split-Path -Leaf $ProjectDir

function Resolve-Executable {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [string[]]$FallbackPaths = @(),
        [switch]$Optional
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    foreach ($path in $FallbackPaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    if ($Optional) {
        return $null
    }

    throw "Nao foi possivel localizar o executavel '$Name'."
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$IgnoreExitCode
    )

    & $FilePath @Arguments
    if (-not $IgnoreExitCode -and $LASTEXITCODE -ne 0) {
        throw "Falha ao executar: $FilePath $($Arguments -join ' ')"
    }
}

function Get-TrimmedOutput {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $output = & $FilePath @Arguments 2>$null
    if ($null -eq $output) {
        return ''
    }

    return ([string]::Join("`n", $output)).Trim()
}

function Get-RepoFiles {
    Get-ChildItem -Path $ProjectDir -Recurse -File | Where-Object {
        $_.FullName -notmatch '\\.git\\' -and
        $_.FullName -notmatch '\\node_modules\\'
    }
}

function Invoke-GitHubApi {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$IgnoreExitCode
    )

    & $ghExe api @Arguments
    if (-not $IgnoreExitCode -and $LASTEXITCODE -ne 0) {
        # Apenas loga o erro em vez de lançar exceção se for uma falha de API comum
        Write-Host "Aviso: Falha ao executar GitHub API: gh api $($Arguments -join ' ')" -ForegroundColor Yellow
    }
}

function Sync-RepositoryWithoutGit {
    param(
        [Parameter(Mandatory = $true)][string]$Owner,
        [Parameter(Mandatory = $true)][string]$Name
    )

    Write-Host 'Git nao encontrado. Usando fallback por GitHub API...' -ForegroundColor Yellow

    Invoke-External -FilePath $ghExe -Arguments @('repo', 'view', "$Owner/$Name", '--json', 'name') -IgnoreExitCode
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Criando repositorio remoto no GitHub...'
        Invoke-External -FilePath $ghExe -Arguments @('repo', 'create', $Name, '--public')
    }

    foreach ($file in Get-RepoFiles) {
        $relativePath = $file.FullName.Substring($ProjectDir.Length).TrimStart('\').Replace('\', '/')
        $escapedPath = [uri]::EscapeDataString($relativePath).Replace('%2F', '/')
        $contentBase64 = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($file.FullName))

        $sha = ''
        $shaOutput = & $ghExe api "repos/$Owner/$Name/contents/$escapedPath" --jq '.sha' 2>$null
        if ($LASTEXITCODE -eq 0 -and $shaOutput) {
            $sha = ([string]::Join("`n", $shaOutput)).Trim()
        }

        $payload = @{
            message = "chore: sync $relativePath"
            content = $contentBase64
            branch  = 'main'
        }

        if ($sha) {
            $payload.sha = $sha
        }

        $tempFile = [System.IO.Path]::GetTempFileName()
        try {
            [System.IO.File]::WriteAllText(
                $tempFile,
                ($payload | ConvertTo-Json -Compress),
                [System.Text.UTF8Encoding]::new($false)
            )

            Write-Host "Publicando $relativePath"
            Invoke-GitHubApi -Arguments @(
                "repos/$Owner/$Name/contents/$escapedPath",
                '--method', 'PUT',
                '--input', $tempFile
            )
        }
        finally {
            Remove-Item $tempFile -ErrorAction SilentlyContinue
        }
    }

    Invoke-GitHubApi -Arguments @(
        "repos/$Owner/$Name/pages",
        '--method', 'POST',
        '-f', 'source[branch]=main',
        '-f', 'source[path]=/'
    ) -IgnoreExitCode

    Write-Host "Sincronizacao concluida: https://github.com/$Owner/$Name" -ForegroundColor Green
}

Set-Location $ProjectDir
Write-Host "Iniciando sincronizacao do repositorio $RepoName..." -ForegroundColor Cyan

$gitExe = Resolve-Executable -Name 'git' -FallbackPaths @(
    'C:\Program Files\Git\bin\git.exe',
    "$env:USERPROFILE\AppData\Local\Programs\Git\bin\git.exe"
) -Optional

$ghExe = Resolve-Executable -Name 'gh' -FallbackPaths @(
    'C:\Program Files\GitHub CLI\gh.exe',
    "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe"
)

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $authStatusOutput = (& $ghExe auth status 2>&1 | Out-String).Trim()
}
finally {
    $ErrorActionPreference = $previousErrorActionPreference
}

if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI sem autenticacao valida. Reautentique com 'gh auth login'. Detalhes: $authStatusOutput"
}

$ghLogin = Get-TrimmedOutput -FilePath $ghExe -Arguments @('api', 'user', '--jq', '.login')
if (-not $ghLogin) {
    throw 'Nao foi possivel identificar o usuario autenticado no GitHub CLI.'
}

if (-not $gitExe) {
    Sync-RepositoryWithoutGit -Owner $ghLogin -Name $RepoName
    return
}

if (-not (Test-Path '.git')) {
    Write-Host 'Inicializando repositorio Git local...'
    Invoke-External -FilePath $gitExe -Arguments @('init')
}

$gitUserName = Get-TrimmedOutput -FilePath $gitExe -Arguments @('config', '--get', 'user.name')
if (-not $gitUserName) {
    Invoke-External -FilePath $gitExe -Arguments @('config', 'user.name', $ghLogin)
}

$gitUserEmail = Get-TrimmedOutput -FilePath $gitExe -Arguments @('config', '--get', 'user.email')
if (-not $gitUserEmail) {
    Invoke-External -FilePath $gitExe -Arguments @('config', 'user.email', "$ghLogin@users.noreply.github.com")
}

Invoke-External -FilePath $gitExe -Arguments @('branch', '-M', 'main')
Invoke-External -FilePath $gitExe -Arguments @('add', '--all')

$pendingChanges = & $gitExe status --porcelain
if ($pendingChanges) {
    $commitMessage = "chore: sync repository on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Invoke-External -FilePath $gitExe -Arguments @('commit', '-m', $commitMessage)
}
else {
    Write-Host 'Nenhuma alteracao local para commit.'
}

$remoteUrl = Get-TrimmedOutput -FilePath $gitExe -Arguments @('remote', 'get-url', 'origin')
Invoke-External -FilePath $ghExe -Arguments @('repo', 'view', "$ghLogin/$RepoName", '--json', 'name') -IgnoreExitCode
$repoExists = $LASTEXITCODE -eq 0

if (-not $remoteUrl) {
    if (-not $repoExists) {
        Write-Host 'Criando repositorio remoto no GitHub...'
        Invoke-External -FilePath $ghExe -Arguments @('repo', 'create', $RepoName, '--public', '--source=.', '--remote=origin')
    }
    else {
        $remoteUrl = "https://github.com/$ghLogin/$RepoName.git"
        Invoke-External -FilePath $gitExe -Arguments @('remote', 'add', 'origin', $remoteUrl)
    }
}

Write-Host 'Enviando branch main para o GitHub...'
Invoke-External -FilePath $gitExe -Arguments @('push', '-u', 'origin', 'main')

Write-Host "Sincronizacao concluida: https://github.com/$ghLogin/$RepoName" -ForegroundColor Green
