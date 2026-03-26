import { Router } from 'express';

import { twilioWebhookMiddleware } from '../../../middleware/webhook-auth.middleware';
import { TwilioWebhookController } from './twilio-webhook.controller';

const router = Router();
const twilioWebhookController = new TwilioWebhookController();

router.post('/incoming', ...twilioWebhookMiddleware, twilioWebhookController.handleIncomingCall);
router.post('/status', ...twilioWebhookMiddleware, twilioWebhookController.handleStatusCallback);

export default router;
