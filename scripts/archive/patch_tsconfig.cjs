const fs = require('fs');
let code = fs.readFileSync('tsconfig.json', 'utf8');

code = code.replace(/"allowJs": true,/, '"allowJs": true,\n    "esModuleInterop": true,');
fs.writeFileSync('tsconfig.json', code);
console.log("Patched tsconfig");
