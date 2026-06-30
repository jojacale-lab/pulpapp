import React, { useState, useRef, useEffect } from 'react';
import { aiApi, patientsApi } from '../services/api';

const QUICK_PROMPTS = [
  { icon: '🔴', label: 'Diagnóstico de caries', prompt: 'El paciente presenta sensibilidad al frío y calor en el sector posterior. ¿Cuál es el diagnóstico diferencial y el manejo recomendado?' },
  { icon: '💊', label: 'Prescripción post-extracción', prompt: 'Dame el protocolo de analgésicos y antibióticos recomendado post-extracción dental simple en adulto sano.' },
  { icon: '😬', label: 'Manejo de ansiedad', prompt: '¿Cuáles son las mejores técnicas para manejar la ansiedad dental en adultos? Incluye técnicas farmacológicas y no farmacológicas.' },
  { icon: '🦷', label: 'Endodoncia indicaciones', prompt: '¿Cuáles son las indicaciones y contraindicaciones del tratamiento endodóntico?' },
  { icon: '📋', label: 'Consentimiento informado', prompt: 'Redacta un consentimiento informado para extracción dental simple.' },
  { icon: '🤰', label: 'Odontología en embarazo', prompt: '¿Qué tratamientos dentales son seguros durante el embarazo y en qué trimestre es más recomendable realizarlos?' },
];

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, marginTop: 2 }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'var(--blue)' : 'white',
        color: isUser ? 'white' : 'var(--gray-800)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid var(--gray-100)',
        whiteSpace: 'pre-wrap'
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, marginTop: 2 }}>
          Dr
        </div>
      )}
    </div>
  );
};

export default function AIAssistant() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: '¡Hola! Soy PulpIA, tu asistente dental con inteligencia artificial. 🦷\n\nPuedo ayudarte con:\n• Diagnósticos diferenciales\n• Protocolos de tratamiento\n• Prescripción de medicamentos\n• Redacción de informes clínicos\n• Educación al paciente\n\n¿En qué te puedo ayudar hoy?'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!patientSearch) { setPatientResults([]); return; }
    const search = async () => {
      const { patients } = await patientsApi.list({ search: patientSearch, limit: 5 });
      setPatientResults(patients || []);
    };
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const patientCtx = selectedPatient ? {
        name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        age: selectedPatient.date_of_birth ? Math.floor((new Date() - new Date(selectedPatient.date_of_birth)) / (365.25 * 24 * 3600 * 1000)) : null,
        number: selectedPatient.patient_number
      } : null;

      const { response, isDemo } = await aiApi.chat(text, history, patientCtx);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: 'calc(100vh - 140px)' }}>
      {/* Left panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
        {/* Branding */}
        <div style={{
          background: 'linear-gradient(135deg, var(--green) 0%, var(--blue) 100%)',
          borderRadius: 12, padding: 16, color: 'white', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🤖</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>PulpIA</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: 2 }}>Asistente Dental con IA</div>
        </div>

        {/* Patient context */}
        <div className="card card-sm">
          <div className="section-title">Contexto del paciente</div>
          {selectedPatient ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--green-light)', borderRadius: 8, marginBottom: 8 }}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                  {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedPatient.first_name} {selectedPatient.last_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>{selectedPatient.patient_number}</div>
                </div>
                <button onClick={() => setSelectedPatient(null)} className="btn btn-ghost btn-sm" style={{ padding: '2px 4px' }}>✕</button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                Las respuestas tendrán en cuenta el contexto de este paciente.
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                placeholder="Buscar paciente..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
              />
              {patientResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                  {patientResults.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(''); setPatientResults([]); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid var(--gray-50)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      {p.first_name} {p.last_name}
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{p.patient_number}</div>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 6 }}>Opcional: agrega contexto del paciente</p>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="card card-sm">
          <div className="section-title">Preguntas rápidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => sendMessage(qp.prompt)}
                className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '7px 8px', fontSize: '0.8rem', lineHeight: 1.3 }}
              >
                <span>{qp.icon}</span>
                <span>{qp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Clear chat */}
        <button
          onClick={() => setMessages([{
            role: 'assistant',
            content: '¡Chat reiniciado! ¿En qué te puedo ayudar?'
          }])}
          className="btn btn-outline btn-sm"
        >
          🗑 Limpiar conversación
        </button>
      </div>

      {/* Chat panel */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🤖</div>
              <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'white', border: '1px solid var(--gray-100)', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--gray-300)',
                    animation: `bounce 1.2s ${i * 0.2}s infinite`
                  }} />
                ))}
                <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }`}</style>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              className="form-textarea"
              style={{ flex: 1, minHeight: 44, maxHeight: 120, resize: 'none', fontSize: '0.9rem', lineHeight: 1.5 }}
              placeholder="Escribe tu consulta dental... (Enter para enviar, Shift+Enter para nueva línea)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="btn btn-primary"
              style={{ padding: '10px 16px', flexShrink: 0 }}
            >
              {loading ? <div className="spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> : '➤'}
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 6, textAlign: 'center' }}>
            PulpIA proporciona información orientativa. Siempre verifica con criterio clínico.
          </p>
        </div>
      </div>
    </div>
  );
}
