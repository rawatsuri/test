import { NextFunction, Request, Response } from 'express';

import { env } from '../config/env-config';

export const requireInternalApiSecret = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const configuredSecret = env.INTERNAL_API_SECRET;

  // Allow non-production environments when no secret is configured.
  if (!configuredSecret && env.NODE_ENV !== 'production') {
    next();
    return;
  }

  if (!configuredSecret) {
    res.status(500).json({
      success: false,
      message: 'Internal API secret not configured',
    });
    return;
  }

  const providedSecret = req.headers['x-internal-api-secret'];
  if (typeof providedSecret !== 'string' || providedSecret !== configuredSecret) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized internal API call',
    });
    return;
  }

  next();
};
