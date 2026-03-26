import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { UserRepository } from '../../tenant-users/repositories/user.repository';
import { UserService } from '../../tenant-users/services/user.service';

const router = Router();
const prisma = PrismaService.getInstance().client;
const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);

/**
 * Testing routes for Users - No validation, for development only
 */

// Quick create user without validation
router.post('/tenants/:tenantId/users', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await userService.createUser(
      {
        email: req.body.email || `test-${Date.now()}@example.com`,
        name: req.body.name || 'Test User',
        role: req.body.role || 'MEMBER',
        tenantId,
      },
      req.body.clerkId || `clerk-${Date.now()}`,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// List all users for tenant
router.get('/tenants/:tenantId/users', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await userService.getUsersByTenant(tenantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
