import { Router } from 'express';

import { requireRole } from '../../../middleware/auth.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { CallerController } from '../controllers/caller.controller';
import { updateCallerSchema } from '../schemas/caller.schema';

const router = Router({ mergeParams: true });
const callerController = new CallerController();

// Routes for /v1/tenants/:tenantId/callers
router.get('/', callerController.getAll);
router.get('/:callerId', callerController.getById);
router.put('/:callerId', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), validateRequest(updateCallerSchema), callerController.update);
router.post('/:callerId/save', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), callerController.saveCaller);
router.post('/:callerId/unsave', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), callerController.unsaveCaller);
router.delete('/:callerId', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), callerController.delete);

export default router;
