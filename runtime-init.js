const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Force production mode in deployment when start is called directly, ignoring non-standard environments.
if (process.env.NODE_ENV !== 'development') process.env.NODE_ENV = 'production';

// 1. Hardcode DATABASE_URL to avoid GoDaddy Preview Environment DB overrides
const url = 'mysql://localhost:MathCraft314@118.139.180.144:3306/MathCraft';
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
console.log("Configured DATABASE_URL explicitly to 118.139.180.144 to prevent GoDaddy overrides.");

// 2. In this deployment flow, schema migration is handled during build time.
//    runtime-init only needs to ensure DATABASE_URL is present for runtime.
console.log("runtime-init finished: DATABASE_URL is configured.");
