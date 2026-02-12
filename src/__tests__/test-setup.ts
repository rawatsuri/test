import { PrismaService } from '../config/prisma.config';

/**
 * Test utilities for database cleanup
 */
export class TestSetup {
  static async cleanDatabase() {
    const prisma = PrismaService.getInstance().client;

    // Delete in order to respect foreign keys
    await prisma.webhookLog.deleteMany();
    await prisma.recording.deleteMany();
    await prisma.transcript.deleteMany();
    await prisma.extraction.deleteMany();
    await prisma.call.deleteMany();
    await prisma.caller.deleteMany();
    await prisma.knowledgeItem.deleteMany();
    await prisma.agentConfig.deleteMany();
    await prisma.phoneNumber.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  }

  static async createTestTenant() {
    const prisma = PrismaService.getInstance().client;

    return prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: `test-${Date.now()}`,
        industry: 'HEALTHCARE',
      },
    });
  }

  static async createTestPhoneNumber(tenantId: string) {
    const prisma = PrismaService.getInstance().client;

    return prisma.phoneNumber.create({
      data: {
        number: `+919876543210`,
        provider: 'EXOTEL',
        tenantId,
      },
    });
  }

  static async createTestCaller(tenantId: string) {
    const prisma = PrismaService.getInstance().client;

    return prisma.caller.create({
      data: {
        tenantId,
        phoneNumber: '+919876543211',
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
