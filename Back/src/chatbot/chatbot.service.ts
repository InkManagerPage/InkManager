import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const generateAIResponse = async (userMessage: string, history: any[] = []): Promise<string> =>{
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash-lite',
            systemInstruction: `
            Eres "InkBot", el asistente virtual oficial de la plataforma "InkManager".
            Tu objetivo es ayudar a clientes, tatuadores y administradores de estudios de tatuajes.
            -NUNCA repitas frases de presentación como "¡Hola! Soy InkBot..." a menos que sea estrictamente el primer saludo de la conversación.
            -Responde dudas sobre agendar turnos, pagos de señas con Mercado Pago y recomendaciones generales.
            -Mantén un tono amigable, profesional, conciso y cercano.
            -Si el usuario te hace preguntas fuera del tema de tatuajes o de la plataforma InkManager, indica amablemente que solo estás capacitado para asistir en temas del sistema y del mundo del tatuaje.
            `
        });
        const chat = model.startChat({history: history,})

        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    }catch(error){
        console.error('Error al comunicarse con Gemini API:', error);
        throw new Error ('No se pudo generar la respuesta de la IA')
    }

}