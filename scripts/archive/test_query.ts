import { prisma } from './src/lib/prisma'; async function check() { const u = await prisma.user.findFirst({where: {email: 'bilalcelimli@gmail.com'}}); console.log(u); } check();
