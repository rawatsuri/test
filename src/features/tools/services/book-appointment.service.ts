import { PrismaService } from '../../../config/prisma.config';
import { BookAppointmentPayload } from '../internal/schemas/book-appointment.schema';

const urgencyMap = {
  routine: 'ROUTINE',
  urgent: 'URGENT',
  emergency: 'EMERGENCY',
} as const;

export class BookAppointmentService {
  private prisma = PrismaService.getInstance().client;

  private generateReferenceCode(): string {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `APT-${Date.now()}-${suffix}`;
  }

  async execute(payload: BookAppointmentPayload): Promise<{
    success: boolean;
    appointment_id?: string;
    reference_code?: string;
    message: string;
  }> {
    let tenantId: string | undefined;
    let callerId: string | undefined;
    let callId: string | undefined;

    if (payload.call_id) {
      const call = await this.prisma.call.findUnique({
        where: { id: payload.call_id },
        select: {
          id: true,
          tenantId: true,
          callerId: true,
        },
      });
      if (call) {
        callId = call.id;
        tenantId = call.tenantId;
        callerId = call.callerId;
      }
    }

    if (!tenantId || !callerId) {
      const caller = await this.prisma.caller.findFirst({
        where: { phoneNumber: payload.phone_number },
        orderBy: { lastCallAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
        },
      });
      if (caller) {
        tenantId = tenantId || caller.tenantId;
        callerId = callerId || caller.id;
      }
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        referenceCode: this.generateReferenceCode(),
        tenantId,
        callerId,
        callId,
        patientName: payload.patient_name,
        phoneNumber: payload.phone_number,
        appointmentDate: payload.appointment_date,
        appointmentTime: payload.appointment_time,
        reasonForVisit: payload.reason_for_visit,
        isNewPatient: payload.is_new_patient,
        urgency: urgencyMap[payload.urgency],
        status: 'CONFIRMED',
      },
    });

    return {
      success: true,
      appointment_id: appointment.id,
      reference_code: appointment.referenceCode,
      message: `Appointment booked for ${payload.appointment_date} at ${payload.appointment_time}. Reference ${appointment.referenceCode}.`,
    };
  }
}

export const bookAppointmentService = new BookAppointmentService();
