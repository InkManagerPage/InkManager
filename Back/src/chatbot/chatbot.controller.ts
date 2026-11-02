import { Request, Response } from 'express';
import { generateAIResponse } from './chatbot.service.js';

export const handleChatbotQuery = async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'El mensaje es requerido y debe ser un texto.' });
        }

        const reply = await generateAIResponse(message, history);

        return res.status(200).json({ reply });
    } catch (error: any) {
        return res.status(500).json({ 
        error: 'Hubo un problema procesando tu consulta.', 
        details: error.message 
        });
    }
};