// test-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Supabase PostgreSQL connection...');

  // Create a test user with an associated attendance entry
  const newUser = await prisma.user.create({
    data: {
      email: `student_${Date.now()}@example.com`,
      name: 'Verification User',
      attendances: {
        create: {
          status: 'PRESENT',
        },
      },
    },
    include: {
      attendances: true,
    },
  });

  console.log('Successfully written to database:');
  console.log(JSON.stringify(newUser, null, 2));

  const count = await prisma.user.count();
  console.log(`\nTotal records in 'users' table: ${count}`);
}

main()
  .catch((e) => {
    console.error('Database connection test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });