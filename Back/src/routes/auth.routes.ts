import { Router } from 'express';
import { registerArtist, verifyEmail } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register-artist', registerArtist);
router.get('/verify-email', verifyEmail);

export default router;