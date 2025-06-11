const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Normalizar URL
    let url = req.url;
    if (url === '/') {
        url = '/index.html';
    }

    // Construir caminho do arquivo
    const filePath = path.join(PUBLIC_DIR, url);
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'text/plain';

    // Ler e servir o arquivo
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Arquivo não encontrado
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // Erro de servidor
                res.writeHead(500);
                res.end(`Internal Server Error: ${error.code}`);
            }
        } else {
            // Sucesso - enviar o arquivo
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/`);
    console.log(`Pressione Ctrl+C para parar`);
});
