import { Router } from 'express';

import { requireRole } from '../../../middleware/auth.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { CallController } from '../controllers/call.controller';
import { listCallsQuerySchema, updateCallSchema } from '../schemas/call.schema';

const router = Router({ mergeParams: true });
const callController = new CallController();

// Routes for /v1/tenants/:tenantId/calls
router.get('/', callController.getAll);
router.get('/:callId', callController.getById);
router.put('/:callId', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), validateRequest(updateCallSchema), callController.update);
router.delete('/:callId', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), callController.delete);
router.post('/outbound', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), callController.triggerOutbound);

export default router;
