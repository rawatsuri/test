import { z } from 'zod';

export const providerEnum = z.enum(['EXOTEL', 'PLIVO', 'TWILIO', 'VONAGE']);

export const createPhoneNumberSchema = z.object({
  number: z.string().min(10, 'Phone number must be at least 10 digits'),
  provider: providerEnum.default('EXOTEL'),
  label: z.string().optional(), // e.g., "Main Line", "Support"
});

export const updatePhoneNumberSchema = z.object({
  label: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePhoneNumberBodyInput = z.infer<typeof createPhoneNumberSchema>;
export type CreatePhoneNumberInput = CreatePhoneNumberBodyInput & { tenantId: string };
export type UpdatePhoneNumberInput = z.infer<typeof updatePhoneNumberSchema>;
