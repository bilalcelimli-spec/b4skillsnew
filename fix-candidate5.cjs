const fs = require('fs');
let code = fs.readFileSync('src/components/CandidatePlayer.tsx', 'utf8');

code = code.replace(/const storageRef = ref\(storage[\s\S]*?\}\);\n\s*\}\);/g, "return new Promise((resolve) => { setInterval(() => resolve('https://dummy'), 1000); });");

fs.writeFileSync('src/components/CandidatePlayer.tsx', code);
