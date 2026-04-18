const fs = require('fs');
let code = fs.readFileSync('src/components/AuthPage.tsx', 'utf8');

code = code.replace(/const storeToken = \(userData\) => \{[\s\S]+? window\.location\.reload\(\);\n  \};\n/, "");

code = code.replace(/storeToken\(data\.user\);/g, "localStorage.setItem('token', data.token); window.location.reload();");

fs.writeFileSync('src/components/AuthPage.tsx', code);
console.log("Patched AuthPage.tsx storeToken");
