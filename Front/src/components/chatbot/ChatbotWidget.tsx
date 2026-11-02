'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: '¡Hola! Soy **InkBot**, tu asistente virtual en **InkManager**. ¿En qué te puedo ayudar hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (response.ok && data.reply) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Lo siento, hubo un inconveniente. Intenta de nuevo.' },
        ]);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'No se pudo conectar con el servidor.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, fontFamily: 'system-ui, sans-serif' }}>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🤖</span>
          <span>InkBot</span>
        </button>
      )}

      {/* Ventana Desplegable del Chat */}
      {isOpen && (
        <div
          style={{
            width: '360px',
            height: '500px',
            backgroundColor: '#fff',
            borderRadius: '20px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#222', padding: '6px', borderRadius: '50%', fontSize: '16px' }}>🤖</div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', lineHeight: '1.2' }}>InkBot AI</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
                  En línea
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                fontSize: '18px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ✕
            </button>
          </div>

          {/* Historial de Mensajes (Burbujas / Nubes) */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#f9fafb',
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    backgroundColor: msg.sender === 'user' ? '#000' : '#fff',
                    color: msg.sender === 'user' ? '#fff' : '#1f2937',
                    border: msg.sender === 'bot' ? '1px solid #e5e7eb' : 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    borderBottomRightRadius: msg.sender === 'user' ? '2px' : '14px',
                    borderBottomLeftRadius: msg.sender === 'bot' ? '2px' : '14px',
                  }}
                >
                  {msg.sender === 'bot' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    color: '#9ca3af',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    fontSize: '12px',
                    fontStyle: 'italic',
                  }}
                >
                  InkBot está escribiendo...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input de Envío */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fff',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe tu consulta..."
              style={{
                flex: 1,
                border: '1px solid #d1d5db',
                borderRadius: '50px',
                padding: '8px 14px',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#f9fafb',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}