const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PORT = Number(process.env.ZAIN_DEV_PORT || 3060);

function send(response, statusCode, payload, contentType) {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });
  response.end(payload);
}

function serveFile(response, filePath) {
  if (!fs.existsSync(filePath)) {
    send(response, 404, 'not_found', 'text/plain; charset=utf-8');
    return;
  }

  const extension = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  send(
    response,
    200,
    fs.readFileSync(filePath),
    contentTypes[extension] || 'application/octet-stream'
  );
}

const server = http.createServer((request, response) => {
  const parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const requestPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);
  serveFile(response, filePath);
});

server.listen(PORT, () => {
  console.log(`ZAIN INVENTORY DEV online em http://localhost:${PORT}`);
});
