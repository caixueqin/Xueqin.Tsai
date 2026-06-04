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
    
    // Write it to .env so Prisma and Next.js can pick it up
    const envPath = path.join(__dirname, '.env');
    fs.appendFileSync(envPath, `\nDATABASE_URL="${url}"\n`);
    
    console.log("Configured DATABASE_URL from GoDaddy managed database variables.");
}
