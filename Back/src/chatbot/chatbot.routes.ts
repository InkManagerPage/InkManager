import { Router } from 'express';
import { handleChatbotQuery } from './chatbot.controller.js';

const router = Router();

// POST /api/chatbot
router.post('/', handleChatbotQuery);

export default router;