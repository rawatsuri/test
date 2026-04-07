import { Router } from 'express';

import { auth } from '../../../middleware/auth.middleware';
import { LocalAuthController } from '../controllers/local-auth.controller';

const router = Router();
const localAuthController = new LocalAuthController();

router.post('/login', localAuthController.login);
router.get('/me', auth, localAuthController.me);

export default router;
