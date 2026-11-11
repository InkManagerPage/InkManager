'use server';

import { Resend } from 'resend';

type ContactResult = { success: true; message: string } | { success: false; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const recipient = 'inkmanagerpf2026@gmail.com';

export async function sendContactMessage(
  name: unknown,
  email: unknown,
  message: unknown,
): Promise<ContactResult> {
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return { success: false, message: 'Revisá los datos del formulario.' };
  }

  const senderName = name.trim();
  const senderEmail = email.trim();
  const senderMessage = message.trim();

  if (
    !senderName ||
    senderName.length > 100 ||
    senderEmail.length > 254 ||
    !emailPattern.test(senderEmail) ||
    !senderMessage ||
    senderMessage.length > 5000
  ) {
    return {
      success: false,
      message: 'Revisá los datos del formulario e intentá nuevamente.',
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    console.error('Contact form email is not configured.');
    return {
      success: false,
      message: 'El formulario de contacto no está disponible por el momento.',
    };
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from,
      to: recipient,
      replyTo: senderEmail,
      subject: 'Nuevo mensaje desde InkManager',
      text: `Nombre: ${senderName}\nEmail: ${senderEmail}\n\nMensaje:\n${senderMessage}`,
    });

    if (error) {
      console.error('Resend rejected a contact email:', error.name);
      return {
        success: false,
        message: 'No pudimos enviar tu mensaje. Intentá nuevamente más tarde.',
      };
    }
  } catch (error) {
    console.error(
      'Contact email delivery failed:',
      error instanceof Error ? error.name : 'Unknown error',
    );
    return {
      success: false,
      message: 'No pudimos enviar tu mensaje. Intentá nuevamente más tarde.',
    };
  }

  return {
    success: true,
    message: '¡Gracias! Recibimos tu mensaje y te responderemos pronto.',
  };
}
