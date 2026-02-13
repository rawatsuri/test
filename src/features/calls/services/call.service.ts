import { Call, PrismaClient } from '@prisma/client';
import axios from 'axios';

import { env } from '../../../config/env-config';
import { PrismaService } from '../../../config/prisma.config';
import { CreateCallInput, UpdateCallInput } from '../schemas/call.schema';

export class CallService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaService.getInstance().client;
  }

  private async getTenantCall(id: string, tenantId: string): Promise<Call | null> {
    return this.prisma.call.findFirst({
      where: { id, tenantId },
    });
  }

  async create(data: CreateCallInput): Promise<Call> {
    return this.prisma.call.create({
      data: {
        externalId: data.externalId,
        tenantId: data.tenantId,
        phoneNumberId: data.phoneNumberId,
        callerId: data.callerId,
        direction: data.direction,
        status: data.status,
      },
      include: {
        caller: {
          select: {
            id: true,
            phoneNumber: true,
            name: true,
          },
        },
        phoneNumber: {
          select: {
            id: true,
            number: true,
            label: true,
          },
        },
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<Call | null> {
    return this.prisma.call.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        caller: true,
        transcripts: {
          orderBy: {
            timestamp: 'asc',
          },
        },
        extractions: true,
        recordings: true,
        phoneNumber: {
          select: {
            id: true,
            number: true,
            label: true,
          },
        },
      },
    });
  }

  async findByExternalId(externalId: string): Promise<Call | null> {
    return this.prisma.call.findUnique({
      where: { externalId },
      include: {
        caller: true,
        tenant: true,
      },
    });
  }

  async findByTenant(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      from?: Date;
      to?: Date;
    },
  ): Promise<{ calls: Call[]; total: number }> {
    const where: any = { tenantId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.from || options.to) {
      where.startedAt = {};
      if (options.from) {
        where.startedAt.gte = options.from;
      }
      if (options.to) {
        where.startedAt.lte = options.to;
      }
    }

    const [calls, total] = await Promise.all([
      this.prisma.call.findMany({
        where,
        skip: options.page && options.limit ? (options.page - 1) * options.limit : undefined,
        take: options.limit,
        orderBy: { startedAt: 'desc' },
        include: {
          caller: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
            },
          },
          phoneNumber: {
            select: {
              id: true,
              number: true,
              label: true,
            },
          },
          _count: {
            select: {
              transcripts: true,
              extractions: true,
            },
          },
        },
      }),
      this.prisma.call.count({ where }),
    ]);

    return { calls, total };
  }

  async update(id: string, tenantId: string, data: UpdateCallInput): Promise<Call> {
    const existing = await this.getTenantCall(id, tenantId);
    if (!existing) {
      throw new Error('Call not found');
    }

    return this.prisma.call.update({
      where: {
        id,
      },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.summary && { summary: data.summary }),
        ...(data.sentiment && { sentiment: data.sentiment }),
        ...(data.status === 'COMPLETED' && { endedAt: new Date() }),
        ...(data.status === 'IN_PROGRESS' && { answeredAt: new Date() }),
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    data?: { durationSecs?: number; endedAt?: Date },
  ): Promise<Call> {
    return this.prisma.call.update({
      where: { id },
      data: {
        status: status as any,
        ...(data?.durationSecs !== undefined && { durationSecs: data.durationSecs }),
        ...(data?.endedAt && { endedAt: data.endedAt }),
        ...(status === 'COMPLETED' && { endedAt: new Date() }),
        ...(status === 'IN_PROGRESS' && { answeredAt: new Date() }),
      },
    });
  }

  async delete(id: string, tenantId: string): Promise<Call> {
    const existing = await this.getTenantCall(id, tenantId);
    if (!existing) {
      throw new Error('Call not found');
    }

    return this.prisma.call.delete({
      where: {
        id,
      },
    });
  }

  async triggerOutboundCall(
    tenantId: string,
    phoneNumberId: string,
    toNumber: string,
  ): Promise<{ success: boolean; call?: Call; error?: string }> {
    try {
      // Get phone number
      const phoneNumber = await this.prisma.phoneNumber.findFirst({
        where: {
          id: phoneNumberId,
          tenantId,
        },
      });

      if (!phoneNumber) {
        return { success: false, error: 'Phone number not found' };
      }

      // Find or create caller
      let caller = await this.prisma.caller.findUnique({
        where: {
          tenantId_phoneNumber: {
            tenantId,
            phoneNumber: toNumber,
          },
        },
      });

      if (!caller) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });

        caller = await this.prisma.caller.create({
          data: {
            tenantId,
            phoneNumber: toNumber,
            expiresAt: new Date(
              Date.now() + (tenant?.dataRetentionDays || 15) * 24 * 60 * 60 * 1000,
            ),
          },
        });
      }

      let externalId = `outbound-${Date.now()}`;
      if (phoneNumber.provider === 'TWILIO') {
        externalId = await this.createTwilioOutboundCall(phoneNumber.number, toNumber);
      }

      // Create call record
      const call = await this.prisma.call.create({
        data: {
          externalId,
          tenantId,
          phoneNumberId,
          callerId: caller.id,
          direction: 'OUTBOUND',
          status: 'RINGING',
          provider: phoneNumber.provider,
        },
      });

      return { success: true, call };
    } catch (error) {
      console.error('Error triggering outbound call:', error);
      return { success: false, error: 'Failed to trigger outbound call' };
    }
  }

  private async createTwilioOutboundCall(fromNumber: string, toNumber: string): Promise<string> {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.PUBLIC_WEBHOOK_BASE_URL) {
      throw new Error(
        'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and PUBLIC_WEBHOOK_BASE_URL are required for outbound calls',
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`;
    const payload = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Url: `${env.PUBLIC_WEBHOOK_BASE_URL}/webhooks/twilio/incoming`,
      Method: 'POST',
      StatusCallback: `${env.PUBLIC_WEBHOOK_BASE_URL}/webhooks/twilio/status`,
      StatusCallbackMethod: 'POST',
      StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'].join(' '),
    });

    const response = await axios.post(url, payload.toString(), {
      auth: {
        username: env.TWILIO_ACCOUNT_SID,
        password: env.TWILIO_AUTH_TOKEN,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });

    if (!response.data?.sid) {
      throw new Error('Twilio did not return call SID');
    }

    return response.data.sid as string;
  }
}
