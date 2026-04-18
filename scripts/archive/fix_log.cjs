const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace('res.status(500).json({ error: "Failed to fetch billing summary" });', 'console.error(err); res.status(500).json({ error: "Failed to fetch billing summary" });');
fs.writeFileSync('server.ts', content);
