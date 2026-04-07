import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { superAdminOnly, tenantScope } from '../../../middleware/auth.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { TenantController } from '../controllers/tenant.controller';
import { TenantRepository } from '../repositories/tenant.repository';
import { createTenantSchema, updateTenantSchema } from '../schemas/tenant.schema';
import { TenantService } from '../services/tenant.service';

// Dependency Injection
const prismaService = PrismaService.getInstance();
const prisma = prismaService.client;
const tenantRepository = new TenantRepository(prisma);
const tenantService = new TenantService(tenantRepository);
const tenantController = new TenantController(tenantService);

const router = Router();

router.post('/', superAdminOnly, validateRequest(createTenantSchema), tenantController.create);
router.get('/', superAdminOnly, tenantController.getAll);
router.get('/:id', tenantScope, tenantController.getById);
router.put('/:id', superAdminOnly, validateRequest(updateTenantSchema), tenantController.update);
router.delete('/:id', superAdminOnly, tenantController.delete);

export default router;
