const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 2. Run Prisma DB Push to create tables in the empty database
try {
    console.log("Running prisma db push to create tables...");
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log("Tables created successfully.");
} catch (error) {
    console.error("Error creating tables:", error);
}
