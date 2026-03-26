import { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../../../../config/prisma.config';
import { telephonyTransferService } from '../../../../services/telephony-transfer.service';
import { CallService } from '../../services/call.service';
import {
  CompleteCallInput,
  SaveExtractionInput,
  SaveTranscriptInput,
  TransferCallInput,
} from '../schemas/internal.schema';

/**
 * Internal API Controller
 * Called by the voice service to save call data.
 */
export class InternalCallController {
  private prisma = PrismaService.getInstance().client;
  private callService = new CallService();

  saveTranscript = async (
    req: Request<{ callId: string }, {}, SaveTranscriptInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { callId } = req.params;
      const { role, content, confidence } = req.body;

      const transcript = await this.prisma.transcript.create({
        data: {
          callId,
          role,
          content,
          confidence,
        },
      });

      res.status(201).json({
        success: true,
        data: transcript,
      });
    } catch (error) {
      next(error);
    }
  };

  saveExtraction = async (
    req: Request<{ callId: string }, {}, SaveExtractionInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { callId } = req.params;
      const { type, data, confidence } = req.body;

      const extraction = await this.prisma.extraction.create({
        data: {
          callId,
          type,
          data,
          confidence,
        },
      });

      res.status(201).json({
        success: true,
        data: extraction,
      });
    } catch (error) {
      next(error);
    }
  };

  completeCall = async (
    req: Request<{ callId: string }, {}, CompleteCallInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { callId } = req.params;
      const { summary, sentiment } = req.body;

      const call = await this.callService.updateStatus(callId, 'COMPLETED', {
        endedAt: new Date(),
      });

      if (summary || sentiment) {
        await this.prisma.call.update({
          where: { id: callId },
          data: {
            ...(summary && { summary }),
            ...(sentiment && { sentiment }),
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Call completed',
        data: call,
      });
    } catch (error) {
      next(error);
    }
  };

  transferCall = async (
    req: Request<{ callId: string }, {}, TransferCallInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { callId } = req.params;
      const { transferTo } = req.body;

      const callRecord = await this.prisma.call.findUnique({
        where: { id: callId },
        select: {
          externalId: true,
          provider: true,
        },
      });

      if (!callRecord) {
        res.status(404).json({
          success: false,
          message: 'Call not found',
        });
        return;
      }

      await telephonyTransferService.transferCall(
        {
          externalId: callRecord.externalId,
          provider: callRecord.provider,
        },
        transferTo,
      );

      const call = await this.callService.updateStatus(callId, 'TRANSFERRED', {
        endedAt: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Call transferred',
        data: call,
      });
    } catch (error) {
      next(error);
    }
  };
}
