const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@b4skills.com';
  const password = await bcrypt.hash('admin123', 10);
  
  let admin = await prisma.user.findUnique({ where: { email } });
  if (admin) {
    console.log('Admin already exists!');
    await prisma.user.update({
        where: { email },
        data: { role: 'SUPER_ADMIN', password }
    });
    console.log('Admin updated with new password and role.');
  } else {
    admin = await prisma.user.create({
      data: {
        email,
        name: 'System Admin',
        password,
        role: 'SUPER_ADMIN'
      }
    });
    console.log('Admin created successfully:', admin.email);
  }
}

createAdmin().catch(console.error).finally(() => prisma.$disconnect());
