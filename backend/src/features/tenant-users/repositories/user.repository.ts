import { PrismaClient, User } from '@prisma/client';

import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateUserInput & { clerkId: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        tenantId: data.tenantId,
        clerkId: data.clerkId,
        active: true,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { clerkId },
    });
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });
  }

  async findByTenant(tenantId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.role && { role: data.role }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
  }

  async delete(id: string): Promise<User> {
    // Soft delete by deactivating
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { tenantId },
    });
  }
}
