const path = require('path');
const {
    enableGitHubPages,
    ensureRepository,
    getAuthenticatedUsername,
    getGitHubToken,
    uploadRepositoryFile
} = require('./deploy-lib');

const repoName = process.env.KD_REPO_NAME || 'kd-embalagens';
const baseDir = path.join(__dirname, 'agencia-marketing', 'clientes', 'kd-embalagens-fabrica');

async function deploy() {
    console.log(`Iniciando deploy do catálogo principal para ${repoName}...`);

    const token = getGitHubToken();
    const username = await getAuthenticatedUsername(token);

    await ensureRepository(token, username, repoName, 'public');

    await uploadRepositoryFile({
        token,
        owner: username,
        repoName,
        sourcePath: path.join(baseDir, 'catalogo-geral-kd.html'),
        destinationPath: 'index.html',
        commitMessage: 'chore: atualiza catálogo principal'
    });

    await uploadRepositoryFile({
        token,
        owner: username,
        repoName,
        sourcePath: path.join(baseDir, 'catalog-utils.js'),
        destinationPath: 'catalog-utils.js',
        commitMessage: 'chore: publica utilitário do catálogo'
    });

    const pagesStatus = await enableGitHubPages(token, username, repoName);

    if (pagesStatus === 201) {
        console.log('GitHub Pages ativado.');
    } else {
        console.log('GitHub Pages já estava ativo ou aguardando publicação.');
    }

    console.log(`Deploy concluído: https://${username}.github.io/${repoName}/`);
}

deploy().catch((error) => {
    console.error(`Falha no deploy principal: ${error.message}`);
    process.exitCode = 1;
});
