import { Router } from 'express';

import {
  attachUserContext,
  getAuthContext,
  requireApiAuth,
} from '../../../middleware/clerk-auth.middleware';
import { ClerkWebhookController } from '../controllers/clerk-webhook.controller';

const router = Router();
const clerkWebhookController = new ClerkWebhookController();

// Clerk webhook endpoint (public, signature verified in controller)
router.post('/webhook/clerk', clerkWebhookController.handleWebhook);

// Get current authenticated user info
router.get('/me', requireApiAuth, attachUserContext, (req, res) => {
  res.json({
    success: true,
    data: getAuthContext(req),
  });
});

export default router;
