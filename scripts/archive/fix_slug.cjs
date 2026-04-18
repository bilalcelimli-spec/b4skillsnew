const fs = require('fs');

let content = fs.readFileSync('src/lib/enterprise/billing-service.ts', 'utf8');

content = content.replace('name: organizationId }});', 'name: organizationId, slug: organizationId }});');
fs.writeFileSync('src/lib/enterprise/billing-service.ts', content);
