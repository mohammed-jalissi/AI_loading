import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';

export default function AIAssistant({ data }) {
  const { metrics = {} } = data || {};
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 **Agent IA Expert JPH** — Je suis prêt. Posez une question sur le port, les quais, halls, ou lancez un algorithme." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await api.chat({ message: msg, history: messages, metrics });
      setMessages(m => [...m, { role: 'assistant', content: res.response }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: '❌ Erreur: ' + e.message }]);
    }
    setLoading(false);
  };

  const quickActions = [
    { label: '🧬 Génétique 50', msg: "Lance l'algorithme génétique avec 50 population et 30 générations" },
    { label: '⚡ Greedy', msg: 'Lance la planification greedy' },
    { label: '🏭 Halls TSP?', msg: 'Quels halls stockent du TSP ?' },
    { label: '📐 Quais?', msg: 'Décris les quais disponibles du port JPH' },
  ];

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      <h2 style={{ fontSize: 16, color: '#fbbf24', marginBottom: 8 }}>AI_ASSIST // EXPERT_JPH</h2>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {quickActions.map((a, i) => (
          <button key={i} className="btn-secondary" style={{ maxWidth: 160, fontSize: 10 }}
            onClick={() => { setInput(a.msg); }}>
            {a.label}
          </button>
        ))}
      </div>
      <div className="chat-messages" style={{ flex: 1 }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="loading-spinner"><div className="spinner-icon" /> Processing...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input className="kinetic-input" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Question ou commande..." />
        <button className="btn-primary" style={{ maxWidth: 100 }} onClick={send} disabled={loading}>
          SEND →
        </button>
      </div>
    </div>
  );
}
