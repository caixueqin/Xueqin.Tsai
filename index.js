const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// 1. Run GoDaddy DB setup
if (process.env.DB_HOST) {
    const user = process.env.DB_USER || '';
    const password = process.env.DB_PASSWORD || '';
    const host = process.env.DB_HOST || '';
    const portDB = process.env.DB_PORT || '3306';
    const dbName = process.env.DB_NAME || '';
    const url = `mysql://${user}:${password}@${host}:${portDB}/${dbName}`;
    // Make DATABASE_URL available to this Node process immediately
    process.env.DATABASE_URL = url;
    
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    const urlLine = `DATABASE_URL="${url}"`;
    if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/g, urlLine);
    } else {
        envContent += `\n${urlLine}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("Configured DATABASE_URL from GoDaddy managed database variables.");
}

// 2. Start Next.js custom server
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on port ${port}`);
  });
});
