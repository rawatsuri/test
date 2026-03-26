import { Request, Response } from 'express';
import { Webhook } from 'svix';

import { env } from '../../../config/env-config';
import { PrismaService } from '../../../config/prisma.config';

/**
 * Handle Clerk webhooks for user management
 * https://clerk.com/docs/integrations/webhooks/overview
 */
export class ClerkWebhookController {
  private prisma = PrismaService.getInstance().client;

  /**
   * Main webhook handler
   * Verifies webhook signature and processes events
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify webhook signature
      const payload = req.body;
      const headers = req.headers;

      const wh = new Webhook(env.CLERK_WEBHOOK_SECRET || '');
      let evt: any;

      try {
        evt = wh.verify(payload, headers as any);
      } catch (err) {
        console.error('Invalid webhook signature:', err);
        res.status(400).json({
          success: false,
          message: 'Invalid webhook signature',
        });
        return;
      }

      const eventType = evt.type;

      // Process different event types
      switch (eventType) {
        case 'user.created':
          await this.handleUserCreated(evt.data);
          break;

        case 'user.updated':
          await this.handleUserUpdated(evt.data);
          break;

        case 'user.deleted':
          await this.handleUserDeleted(evt.data);
          break;

        default:
          console.log(`Unhandled Clerk event: ${eventType}`);
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processed',
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handle user.created event
   * Called when a new user signs up via Clerk
   */
  private async handleUserCreated(data: any): Promise<void> {
    const { id: clerkId, email_addresses, first_name, last_name } = data;

    const email = email_addresses?.[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(' ') || null;

    console.log(`Creating user from Clerk: ${email}`);

    // User will be created manually via API when they join/create a tenant
    // This webhook just logs the event for now
    // In production, you might auto-create a user with a default tenant
  }

  /**
   * Handle user.updated event
   * Called when user profile is updated in Clerk
   */
  private async handleUserUpdated(data: any): Promise<void> {
    const { id: clerkId, email_addresses, first_name, last_name } = data;

    const email = email_addresses?.[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(' ') || null;

    // Update user in our database
    await this.prisma.user.updateMany({
      where: { clerkId },
      data: {
        email: email || undefined,
        name: name || undefined,
      },
    });

    console.log(`Updated user from Clerk: ${email}`);
  }

  /**
   * Handle user.deleted event
   * Called when user is deleted from Clerk
   */
  private async handleUserDeleted(data: any): Promise<void> {
    const { id: clerkId } = data;

    // Soft delete user in our database
    await this.prisma.user.updateMany({
      where: { clerkId },
      data: {
        active: false,
      },
    });

    console.log(`Deactivated user from Clerk: ${clerkId}`);
  }
}
