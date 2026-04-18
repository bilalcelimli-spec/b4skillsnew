const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const bcrypt = await import\("bcrypt"\);\n/g, "");
code = code.replace(/const jwt = await import\("jsonwebtoken"\);\n/g, "");

fs.writeFileSync('server.ts', code);
console.log("Cleaned dynamic imports");
