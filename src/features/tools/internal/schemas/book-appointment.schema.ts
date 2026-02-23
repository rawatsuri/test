import { z } from 'zod';

export const bookAppointmentPayloadSchema = z.object({
  patient_name: z.string().min(1, 'patient_name is required'),
  phone_number: z.string().min(7, 'phone_number is required'),
  appointment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'appointment_date must be YYYY-MM-DD'),
  appointment_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'appointment_time must be HH:MM (24-hour)'),
  reason_for_visit: z.string().min(1, 'reason_for_visit is required'),
  is_new_patient: z.boolean().optional().default(true),
  urgency: z.enum(['routine', 'urgent', 'emergency']).optional().default('routine'),
  call_id: z.string().optional(),
});

export const externalActionEnvelopeSchema = z.object({
  payload: bookAppointmentPayloadSchema,
});

export type BookAppointmentPayload = z.infer<typeof bookAppointmentPayloadSchema>;
