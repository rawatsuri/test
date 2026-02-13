import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { env } from '../config/env-config';

/**
 * Validates Exotel webhook signature
 * Exotel sends signature in header for verification
 */
export const validateExotelWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const signature = req.headers['x-exotel-signature'] as string;

    if (!signature) {
      res.status(401).json({
        success: false,
        message: 'Missing Exotel signature',
      });
      return;
    }

    const webhookSecret = env.EXOTEL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      // In development, skip validation if secret not set
      if (env.NODE_ENV === 'development') {
        console.warn('⚠️  Exotel webhook secret not set, skipping validation in development');
        next();
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Webhook secret not configured',
      });
      return;
    }

    // Verify signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha1', webhookSecret)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      res.status(401).json({
        success: false,
        message: 'Invalid Exotel signature',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Exotel webhook validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook validation failed',
    });
  }
};

/**
 * Validates Plivo webhook signature
 * Plivo includes signature in X-Plivo-Signature header
 */
export const validatePlivoWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const signature = req.headers['x-plivo-signature'] as string;
    const nonce = req.headers['x-plivo-signature-nonce'] as string;

    if (!signature || !nonce) {
      res.status(401).json({
        success: false,
        message: 'Missing Plivo signature headers',
      });
      return;
    }

    const webhookSecret = env.PLIVO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      if (env.NODE_ENV === 'development') {
        console.warn('⚠️  Plivo webhook secret not set, skipping validation in development');
        next();
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Webhook secret not configured',
      });
      return;
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(nonce + payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      res.status(401).json({
        success: false,
        message: 'Invalid Plivo signature',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Plivo webhook validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook validation failed',
    });
  }
};

/**
 * Validate Twilio webhook signature.
 * Signature = base64(hmac_sha1(auth_token, full_url + sortedParams))
 */
export const validateTwilioWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const signature = req.headers['x-twilio-signature'] as string | undefined;
    if (!signature) {
      res.status(401).json({
        success: false,
        message: 'Missing Twilio signature',
      });
      return;
    }

    const authToken = env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      if (env.NODE_ENV === 'development') {
        console.warn('Twilio auth token not set, skipping signature validation in development');
        next();
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Twilio auth token is not configured',
      });
      return;
    }

    // Prefer configured public URL to avoid proxy/host mismatch in local tunneling.
    const configuredBase = env.PUBLIC_WEBHOOK_BASE_URL;
    const fullUrl = configuredBase ? `${configuredBase}${req.originalUrl}` : `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const params = req.body as Record<string, unknown>;
    const sortedKeys = Object.keys(params).sort();
    const payload = sortedKeys
      .map(key => `${key}${Array.isArray(params[key]) ? params[key].join('') : String(params[key] ?? '')}`)
      .join('');

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(fullUrl + payload)
      .digest('base64');

    // Constant-time comparison where possible.
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    const signaturesMatch =
      providedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(providedBuffer, expectedBuffer);

    if (!signaturesMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid Twilio signature',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Twilio webhook validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook validation failed',
    });
  }
};

/**
 * Webhook deduplication middleware
 * Prevents processing duplicate webhooks using Redis or in-memory cache
 */
const processedWebhooks = new Set<string>();

export const deduplicateWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Generate stable ID from endpoint + payload so only exact retries are deduplicated.
    const providedWebhookId = req.headers['x-webhook-id'] as string | undefined;
    const payloadFingerprint = crypto
      .createHash('sha256')
      .update(`${req.originalUrl}:${JSON.stringify(req.body)}`)
      .digest('hex');
    const webhookId = providedWebhookId || payloadFingerprint;

    if (processedWebhooks.has(webhookId)) {
      console.log(`🔄 Duplicate webhook detected: ${webhookId}`);
      res.status(200).json({
        success: true,
        message: 'Duplicate webhook ignored',
      });
      return;
    }

    // Add to processed set
    processedWebhooks.add(webhookId);

    // Clean up old entries (keep last 1000)
    if (processedWebhooks.size > 1000) {
      const firstItem = processedWebhooks.values().next().value;
      if (firstItem) {
        processedWebhooks.delete(firstItem);
      }
    }

    next();
  } catch (error) {
    console.error('Webhook deduplication error:', error);
    next(); // Continue even if deduplication fails
  }
};

/**
 * Combined webhook middleware for Exotel
 */
export const exotelWebhookMiddleware = [deduplicateWebhook, validateExotelWebhook];

/**
 * Combined webhook middleware for Plivo
 */
export const plivoWebhookMiddleware = [deduplicateWebhook, validatePlivoWebhook];

/**
 * Combined webhook middleware for Twilio.
 */
export const twilioWebhookMiddleware = [deduplicateWebhook, validateTwilioWebhook];
