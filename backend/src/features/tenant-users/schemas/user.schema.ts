import { z } from 'zod';

export const userRoleEnum = z.enum(['OWNER', 'ADMIN', 'MEMBER']);

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: userRoleEnum.default('MEMBER'),
  tenantId: z.string().uuid('Invalid tenant ID'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: userRoleEnum.optional(),
  active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
