const fs = require('fs');
const path = require('path');

// GoDaddy Node.js Hosting PaaS provides these managed database variables
if (process.env.DB_HOST) {
    const user = process.env.DB_USER || '';
    const password = process.env.DB_PASSWORD || '';
    const host = process.env.DB_HOST || '';
    const port = process.env.DB_PORT || '3306';
    const dbName = process.env.DB_NAME || '';
    
    // Construct the standard Prisma connection string
    const url = `mysql://${user}:${password}@${host}:${port}/${dbName}`;
    // Make DATABASE_URL available to this Node process immediately
    process.env.DATABASE_URL = url;
    
    // Write it to .env so Prisma and Next.js can pick it up
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
