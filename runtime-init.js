const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Force production mode in deployment when start is called directly, ignoring non-standard environments.
if (process.env.NODE_ENV !== 'development') process.env.NODE_ENV = 'production';

// 1. Setup DATABASE_URL in .env
if (process.env.DB_HOST) {
    const user = process.env.DB_USER || '';
    const password = process.env.DB_PASSWORD || '';
    const host = process.env.DB_HOST || '';
    const portDB = process.env.DB_PORT || '3306';
    const dbName = process.env.DB_NAME || '';
    const url = `mysql://${user}:${password}@${host}:${portDB}/${dbName}`;
    // Ensure the running Node process sees DATABASE_URL immediately
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
    console.log("Configured DATABASE_URL for runtime initialization.");
}

// 2. In this deployment flow, schema migration is handled during build time.
//    runtime-init only needs to ensure DATABASE_URL is present for runtime.
console.log("runtime-init finished: DATABASE_URL is configured.");
