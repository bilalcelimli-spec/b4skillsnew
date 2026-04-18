const fs = require('fs');

let content = fs.readFileSync('src/lib/enterprise/billing-service.ts', 'utf8');

const checkOrgString = `
    const orgCount = await (prisma as any).organization.count({ where: { id: organizationId }});
    if (orgCount === 0) {
      await (prisma as any).organization.create({ data: { id: organizationId, name: organizationId }});
    }
    let license = await (prisma as any).license.findFirst({
`;

content = content.replace('let license = await (prisma as any).license.findFirst({', checkOrgString);

fs.writeFileSync('src/lib/enterprise/billing-service.ts', content);
