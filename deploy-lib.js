const { spawnSync } = require('child_process');
const fs = require('fs');

const API_BASE_URL = 'https://api.github.com';
const DEFAULT_BRANCH = 'main';

function runCommand(command, args) {
    const result = spawnSync(command, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });

    if (result.error) {
        throw new Error(`Falha ao executar "${command} ${args.join(' ')}": ${result.error.message}`);
    }

    if (result.status !== 0) {
        const output = (result.stderr || result.stdout || '').trim();
        throw new Error(output || `O comando "${command}" retornou código ${result.status}.`);
    }

    return (result.stdout || '').trim();
}

function getGitHubToken() {
    return process.env.GITHUB_TOKEN
        || process.env.GH_TOKEN
        || runCommand('gh', ['auth', 'token']);
}

async function githubRequest(token, endpoint, options = {}) {
    const {
        method = 'GET',
        body,
        expectedStatuses = [200]
    } = options;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'manifestation-bridge-deploy'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;

    if (!expectedStatuses.includes(response.status)) {
        const message = data?.message || `GitHub API retornou ${response.status}.`;
        throw new Error(`${message} (${method} ${endpoint})`);
    }

    return { status: response.status, data };
}

async function getAuthenticatedUsername(token) {
    const response = await githubRequest(token, '/user');
    return response.data.login;
}

async function ensureRepository(token, owner, repoName, visibility = 'public') {
    const repoPath = `/repos/${owner}/${repoName}`;
    const existing = await githubRequest(token, repoPath, { expectedStatuses: [200, 404] });

    if (existing.status === 200) {
        return existing.data;
    }

    const created = await githubRequest(token, '/user/repos', {
        method: 'POST',
        expectedStatuses: [201],
        body: {
            name: repoName,
            private: visibility !== 'public',
            auto_init: false
        }
    });

    return created.data;
}

async function getFileSha(token, owner, repoName, destinationPath) {
    const response = await githubRequest(
        token,
        `/repos/${owner}/${repoName}/contents/${destinationPath}`,
        { expectedStatuses: [200, 404] }
    );

    return response.status === 200 ? response.data.sha : null;
}

async function uploadRepositoryFile({
    token,
    owner,
    repoName,
    sourcePath,
    destinationPath,
    commitMessage,
    branch = DEFAULT_BRANCH
}) {
    const content = fs.readFileSync(sourcePath).toString('base64');
    const sha = await getFileSha(token, owner, repoName, destinationPath);

    await githubRequest(token, `/repos/${owner}/${repoName}/contents/${destinationPath}`, {
        method: 'PUT',
        expectedStatuses: [200, 201],
        body: {
            message: commitMessage,
            content,
            branch,
            ...(sha ? { sha } : {})
        }
    });
}

async function enableGitHubPages(token, owner, repoName, branch = DEFAULT_BRANCH) {
    const response = await githubRequest(token, `/repos/${owner}/${repoName}/pages`, {
        method: 'POST',
        expectedStatuses: [201, 409, 422],
        body: {
            source: {
                branch,
                path: '/'
            }
        }
    });

    return response.status;
}

module.exports = {
    DEFAULT_BRANCH,
    enableGitHubPages,
    ensureRepository,
    getAuthenticatedUsername,
    getGitHubToken,
    uploadRepositoryFile
};
