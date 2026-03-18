import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatWidgetProps {
  onOpenBooking?: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ onOpenBooking = () => { } }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "¡Hola! Soy Molbot 🤖. ¿En qué puedo ayudarte hoy? Pregúntame sobre precios, horarios o ubicación.", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Mostrar indicador de "typing..."
    const typingMsg: ChatMessage = {
      id: 'typing',
      text: '...',
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, typingMsg]);

    try {
      // Llamada real a la API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg.text,
          history: messages
            .filter(m => m.id !== 'typing')
            .slice(-10)
            .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      let botText = data.reply || 'Lo siento, no pude procesar tu mensaje.';

      // --- DETECCIÓN DEL COMANDO SECRETO [ABRIR_AGENDA] ---
      if (botText.includes('[ABRIR_AGENDA]')) {
        // 1. Limpiamos el texto para que el usuario no vea el código
        botText = botText.replace('[ABRIR_AGENDA]', '');
        // 2. EJECUTAMOS LA ACCIÓN - Abrir modal de citas
        setTimeout(() => onOpenBooking(), 500); // Pequeño delay para que lea la respuesta
      }
      // ------------------------------------------------------

      // Remover "typing..." y agregar respuesta real
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing');
        return [
          ...filtered,
          {
            id: (Date.now() + 1).toString(),
            text: botText,
            sender: 'bot',
            timestamp: new Date()
          }
        ];
      });

    } catch (error) {
      console.error('Error al enviar mensaje:', error);

      // Remover "typing..." y mostrar mensaje de error
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing');
        return [
          ...filtered,
          {
            id: (Date.now() + 1).toString(),
            text: 'Lo siento, hubo un error de conexión. Por favor intenta de nuevo o llámanos al 87171712.',
            sender: 'bot',
            timestamp: new Date()
          }
        ];
      });
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-brand-600 hover:bg-brand-700'
          } text-white`}
        aria-label="Abrir chat"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-xl shadow-2xl z-40 flex flex-col transition-all duration-300 transform origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`} style={{ height: '500px', maxHeight: '80vh' }}>

        {/* Header */}
        <div className="bg-brand-600 text-white p-4 rounded-t-xl flex items-center gap-3">
          <div className="bg-white p-1 rounded-full">
            <MessageCircle size={20} className="text-brand-600" />
          </div>
          <div>
            <h3 className="font-bold">Molbot</h3>
            <p className="text-xs text-brand-100">Asistente Virtual</p>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'user'
                ? 'bg-brand-600 text-white rounded-br-none'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={handleSend}
              className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};