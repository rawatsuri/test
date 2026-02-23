import crypto from 'crypto';
import { Request, Response } from 'express';

import { env } from '../../../../config/env-config';
import { bookAppointmentService } from '../../services/book-appointment.service';
import { externalActionEnvelopeSchema } from '../schemas/book-appointment.schema';

export class ToolController {
  private isSignatureValid(requestBody: unknown, providedSignature?: string): boolean {
    const secretBase64 = env.VOCODE_ACTION_SIGNATURE_SECRET_BASE64;
    if (!secretBase64 && env.NODE_ENV !== 'production') {
      return true;
    }
    if (!secretBase64) {
      return false;
    }
    if (!providedSignature) {
      return false;
    }

    const secret = Buffer.from(secretBase64, 'base64');
    const payload = Buffer.from(JSON.stringify(requestBody), 'utf-8');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64');

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(providedSignature);
    return (
      expectedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    );
  }

  bookAppointment = async (req: Request, res: Response): Promise<void> => {
    try {
      const providedSignature = req.headers['x-vocode-signature'];
      if (
        !this.isSignatureValid(
          req.body,
          typeof providedSignature === 'string' ? providedSignature : undefined,
        )
      ) {
        res.status(401).json({
          result: {
            success: false,
            error: 'Unauthorized action request',
          },
        });
        return;
      }

      const parsed = externalActionEnvelopeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(200).json({
          result: {
            success: false,
            needs_more_info: true,
            error: 'Missing or invalid booking details',
            validation_errors: parsed.error.errors.map(error => ({
              path: error.path.join('.'),
              message: error.message,
            })),
          },
        });
        return;
      }

      const result = await bookAppointmentService.execute(parsed.data.payload);

      res.status(200).json({
        result,
      });
    } catch (error) {
      console.error('book_appointment tool failed:', error);
      res.status(200).json({
        result: {
          success: false,
          error: 'Failed to book appointment',
        },
      });
    }
  };
}

export const toolController = new ToolController();
