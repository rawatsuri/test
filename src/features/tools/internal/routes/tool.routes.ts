import { Router } from 'express';

import { toolController } from '../controllers/tool.controller';

const router = Router();

router.post('/book-appointment', toolController.bookAppointment);

export default router;
