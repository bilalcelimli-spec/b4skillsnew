const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/signOut\(auth\)/g, "signOut()");

fs.writeFileSync('src/App.tsx', code);
console.log("Patched signOut in App.tsx");
