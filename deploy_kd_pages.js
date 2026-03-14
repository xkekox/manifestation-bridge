const path = require('path');
const {
    enableGitHubPages,
    ensureRepository,
    getAuthenticatedUsername,
    getGitHubToken,
    uploadRepositoryFile
} = require('./deploy-lib');

const repoName = process.env.KD_PAGES_REPO_NAME || 'kd-catalogo';
const baseDir = path.join(__dirname, 'agencia-marketing', 'clientes', 'kd-embalagens-fabrica');

const files = [
    { src: 'catalogo-geral-kd.html', dest: 'index.html' },
    { src: 'sacolas.html', dest: 'sacolas.html' },
    { src: 'salgados.html', dest: 'salgados.html' },
    { src: 'pizzas.html', dest: 'pizzas.html' },
    { src: 'caixas-especiais.html', dest: 'caixas-especiais.html' },
    { src: 'catalog-utils.js', dest: 'catalog-utils.js' }
];

async function deploy() {
    console.log(`Iniciando deploy das páginas individuais para ${repoName}...`);

    const token = getGitHubToken();
    const username = await getAuthenticatedUsername(token);

    await ensureRepository(token, username, repoName, 'public');

    for (const file of files) {
        await uploadRepositoryFile({
            token,
            owner: username,
            repoName,
            sourcePath: path.join(baseDir, file.src),
            destinationPath: file.dest,
            commitMessage: `chore: publica ${file.dest}`
        });

        console.log(`${file.dest} publicado.`);
    }

    const pagesStatus = await enableGitHubPages(token, username, repoName);

    if (pagesStatus === 201) {
        console.log('GitHub Pages ativado.');
    } else {
        console.log('GitHub Pages já estava ativo ou aguardando publicação.');
    }

    console.log(`Catálogo principal: https://${username}.github.io/${repoName}/`);
    console.log(`Sacolas: https://${username}.github.io/${repoName}/sacolas.html`);
    console.log(`Salgados: https://${username}.github.io/${repoName}/salgados.html`);
    console.log(`Pizzas: https://${username}.github.io/${repoName}/pizzas.html`);
    console.log(`Caixas especiais: https://${username}.github.io/${repoName}/caixas-especiais.html`);
}

deploy().catch((error) => {
    console.error(`Falha no deploy das páginas: ${error.message}`);
    process.exitCode = 1;
});
