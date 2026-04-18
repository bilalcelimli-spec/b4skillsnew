const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(/workbox: \{/, "workbox: {\n          maximumFileSizeToCacheInBytes: 5000000, // Configure maximum file size limit for caching (now 5MB)");

fs.writeFileSync('vite.config.ts', code);
console.log("Patched vite.config.ts");
