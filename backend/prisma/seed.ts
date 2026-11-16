import { PrismaClient } from '@prisma/client';
import { buildSeedData, SEED_COUNTS } from './seed-data';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const data = buildSeedData(new Date());

  await prisma.auditLog.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.triageSuggestion.deleteMany();
  await prisma.ticket.updateMany({ data: { duplicateOf: null } });
  await prisma.ticket.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.user.deleteMany();

  for (const user of data.users ?? []) {
    await prisma.user.create({ data: user });
  }

  for (const technician of data.technicians ?? []) {
    await prisma.technician.create({
      data: {
        id: technician.id,
        name: technician.name,
        skills: technician.skills.join(','),
        available: technician.available,
      },
    });
  }

  for (const ticket of data.tickets ?? []) {
    await prisma.ticket.create({
      data: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        building: ticket.building,
        room: ticket.room,
        reporterId: ticket.reporterId,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo,
        duplicateOf: ticket.duplicateOf,
        createdAt: new Date(ticket.createdAt),
        approvedBy: ticket.approvedBy,
        approvedAt: ticket.approvedAt ? new Date(ticket.approvedAt) : null,
        humanOverride: ticket.humanOverride,
      },
    });
  }

  for (const suggestion of data.suggestions ?? []) {
    await prisma.triageSuggestion.create({
      data: {
        ticketId: suggestion.ticketId,
        category: suggestion.category,
        priority: suggestion.priority,
        possibleDuplicateOf: suggestion.possibleDuplicateOf,
        suggestedTechnician: suggestion.suggestedTechnician,
        draftReply: suggestion.draftReply,
        reason: suggestion.reason,
        needsHuman: suggestion.needsHuman,
        createdAt: new Date(),
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    technicians: await prisma.technician.count(),
    tickets: await prisma.ticket.count(),
    suggestions: await prisma.triageSuggestion.count(),
  };

  console.log(
    `Seeded ${counts.users} users, ${counts.technicians} technicians, ` +
      `${counts.tickets} tickets, ${counts.suggestions} suggestions ` +
      `(expected ${SEED_COUNTS.users}/${SEED_COUNTS.technicians}/${SEED_COUNTS.tickets}).`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
