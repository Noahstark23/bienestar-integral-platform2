import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AgentChatProps {
  token: string;
  userName: string;
}

const QUICK_ACTIONS = [
  'Resumen de hoy',
  'Citas de mañana',
  'Solicitudes pendientes',
  'Pacientes activos',
];

export const AgentChat: React.FC<AgentChatProps> = ({ token, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    const history = messages.slice(-12);

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text.trim(), history })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error del servidor');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: err.message?.includes('GEMINI_API_KEY')
          ? 'GEMINI_API_KEY no está configurada en Coolify. Agrégala en las variables de entorno.'
          : 'Tuve un problema. Intenta de nuevo.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!hasGreeted) {
      setHasGreeted(true);
      sendMessage(`Hola, soy ${userName}. ¿Qué tenemos hoy?`);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setHasGreeted(false);
    sendMessage(`Hola, soy ${userName}. ¿Qué tenemos hoy?`);
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          title="Isabel — Asistente IA"
          className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-brand-600 text-white rounded-full shadow-xl hover:bg-brand-700 hover:scale-105 transition-all flex items-center justify-center"
        >
          <Bot size={26} />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Panel de chat */}
      {isOpen && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ width: '370px', height: '560px' }}
        >
          {/* Header */}
          <div className="bg-brand-600 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Isabel</p>
                <p className="text-brand-100 text-xs mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span>
                  Secretaria IA · Gemini
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Nueva conversación"
                className="text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-10 text-slate-400">
                <Sparkles size={36} className="mx-auto mb-3 text-brand-300" />
                <p className="text-sm font-medium text-slate-500">Isabel está lista</p>
                <p className="text-xs mt-1">Tu secretaria personal con IA</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center shrink-0 mb-0.5">
                    <Bot size={13} className="text-brand-600" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-end gap-1.5 justify-start">
                <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-brand-600" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Acciones rápidas — solo al inicio */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-3 py-2 bg-white border-t border-slate-100 shrink-0">
              <p className="text-xs text-slate-400 mb-1.5">Acciones rápidas:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="px-2.5 py-1 text-xs bg-brand-50 text-brand-700 rounded-full border border-brand-200 hover:bg-brand-100 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ej: Agenda una cita para Ana mañana..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent disabled:opacity-50 placeholder:text-slate-400"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading
                ? <Loader2 size={15} className="animate-spin" />
                : <Send size={15} />
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
};
