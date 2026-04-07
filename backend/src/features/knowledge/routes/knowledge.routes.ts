import { Router } from 'express';

import { requireRole } from '../../../middleware/auth.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { KnowledgeController } from '../controllers/knowledge.controller';
import { createKnowledgeItemSchema, updateKnowledgeItemSchema } from '../schemas/knowledge.schema';

const router = Router({ mergeParams: true });
const knowledgeController = new KnowledgeController();

// Routes for /v1/tenants/:tenantId/knowledge
router.post('/', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), validateRequest(createKnowledgeItemSchema), knowledgeController.create);
router.get('/', knowledgeController.getAll);
router.get('/search', knowledgeController.search);
router.get('/context', knowledgeController.getContext);
router.get('/:knowledgeId', knowledgeController.getById);
router.put('/:knowledgeId', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), validateRequest(updateKnowledgeItemSchema), knowledgeController.update);
router.delete('/:knowledgeId', requireRole(['OWNER', 'ADMIN', 'SUPER_ADMIN']), knowledgeController.delete);

export default router;
