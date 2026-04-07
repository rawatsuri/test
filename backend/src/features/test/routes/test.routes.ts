import { Request, Response } from 'express';
import { Router } from 'express';

import cleanupTestRoutes from './test-cleanup.routes';
import tenantTestRoutes from './test-tenant.routes';
import userTestRoutes from './test-user.routes';

const router = Router();

// Mount test routes
router.use('/', tenantTestRoutes);
router.use('/', userTestRoutes);
router.use('/', cleanupTestRoutes);

/**
 * Testing routes - No validation, for development only
 * These routes bypass normal validation for quick testing
 */

router.get('/auth-test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth test endpoint',
    authenticated: !!req.userId,
    userId: req.userId || null,
    tenantId: req.tenantId || null,
    role: req.userRole || null,
  });
});

router.get('/auth-required', (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Protected endpoint',
    userId: req.userId,
  });
});

export default router;
