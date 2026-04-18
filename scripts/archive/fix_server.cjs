const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/bcrypt\.default\./g, 'bcrypt.');
code = code.replace(/jwt\.default\./g, 'jwt.');

fs.writeFileSync('server.ts', code);
console.log("Fixed server.ts defaults");
