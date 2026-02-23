
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Recent Calls ---');
  const calls = await prisma.call.findMany({
    take: 5,
    orderBy: { startedAt: 'desc' },
    include: {
      caller: true,
      transcripts: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  calls.forEach(call => {
    console.log(`Call ID: ${call.id}`);
    console.log(`Status: ${call.status}`);
    console.log(`To: ${call.caller.phoneNumber}`);
    console.log(`Transcripts: ${call.transcripts.length}`);
    call.transcripts.forEach(t => {
      console.log(`  [${t.role}] ${t.content}`);
    });
    console.log('-------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
