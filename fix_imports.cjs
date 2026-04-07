const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Insert static import at the top
const importsToAdd = `
import { BillingService } from "./src/lib/enterprise/billing-service.js";
`;

content = content.replace('import { prisma } from "./src/lib/prisma.js";', 'import { prisma } from "./src/lib/prisma.js";' + importsToAdd);

// Remove the dynamic imports for BillingService
content = content.replace(/.*const \{ BillingService \} = await import\("\.\/src\/lib\/enterprise\/billing-service\.js"\);\n/g, '');

fs.writeFileSync('server.ts', content);
