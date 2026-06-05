import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import GanttChart from '../components/GanttChart';
import './UltraDashboard.css';

const TEAM = [
  { name: 'Ahmed Karimi', role: 'Lead Planner' },
  { name: 'Lina Haddad', role: 'Data Analyst' },
  { name: 'Omar Triki', role: 'Warehouse Manager' },
  { name: 'Sara Ben Salah', role: 'ML Engineer' },
  { name: 'Nour El Amri', role: 'Systems Engineer' }
];

const INITIAL_AGENTS = [
  {
    id: 'OPT-01',
    name: 'Flow Strategist',
    role: 'Optimization — MILP / GA',
    status: 'Active',
    performanceLabel: 'SOLVER QUALITY',
    performanceValue: 96,
    lastAction: 'Generating loading plan...',
    lastActionTime: '12S AGO',
    operator: 'Ahmed Karimi',
    color: 'blue'
  },
  {
    id: 'ANL-02',
    name: 'Reliability Analyst',
    role: 'ML & Anomaly Detection',
    status: 'Active',
    performanceLabel: 'PIPELINE HEALTH',
    performanceValue: 88,
    lastAction: 'Vibration scan complete...',
    lastActionTime: '1M AGO',
    operator: 'Lina Haddad',
    color: 'orange'
  },
  {
    id: 'DAT-03',
    name: 'The Statistician',
    role: 'Industrial Data Analyst',
    status: 'Active',
    performanceLabel: 'OEE ACCURACY',
    performanceValue: 98,
    lastAction: 'Calculating downtime Pareto...',
    lastActionTime: '1M AGO',
    operator: 'Omar Triki',
    color: 'teal'
  },
  {
    id: 'INF-04',
    name: 'Infrastructure Engineer',
    role: 'JPH Network & Connectivity',
    status: 'Active',
    performanceLabel: 'NETWORK FLUIDITY',
    performanceValue: 92,
    lastAction: 'Calculating alt path TB2...',
    lastActionTime: '26S AGO',
    operator: 'Sara Ben Salah',
    color: 'green'
  },
  {
    id: 'ORC-05',
    name: 'Orchestrator',
    role: 'System Coordination',
    status: 'Active',
    performanceLabel: 'LATERAL LATENCY',
    performanceValue: 99,
    lastAction: 'Syncing multi-agent state...',
    lastActionTime: '5S AGO',
    operator: 'Nour El Amri',
    color: 'violet'
  }
];

const GanttWidget = ({ planData }) => {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('classique'); // 'classique' | 'continue'

  const widgetStyle = expanded ? {
    position: 'fixed', top: 40, left: 40, right: 40, bottom: 40, 
    background: '#0a0a0a', zIndex: 10000, padding: '24px', 
    borderRadius: '12px', border: '1px solid #444', overflow: 'auto',
    boxShadow: '0 0 50px rgba(0,0,0,0.8)'
  } : {
    marginTop: '10px', background: '#0a0a0a', padding: '10px', 
    borderRadius: '8px', border: '1px solid #333', overflowX: 'auto', maxWidth: '100%'
  };

  return (
    <>
      {expanded && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999 }} onClick={() => setExpanded(false)}></div>}
      <div className="agent-interactive-widget" style={widgetStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ color: 'var(--accent-yellow)', fontSize: expanded ? '16px' : '12px', margin: 0 }}>📊 GANTT CHART — {planData.metrics?.algo_used}</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setViewMode(v => v === 'classique' ? 'continue' : 'classique')} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
              VIEW: {viewMode === 'classique' ? 'CLASSIC' : 'CONTINUOUS'}
            </button>
            <button onClick={() => setExpanded(!expanded)} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
              {expanded ? 'COLLAPSE' : 'EXPAND'}
            </button>
          </div>
        </div>
        
        <GanttChart 
          lots={planData.lots} 
          hours={planData.hours || Array.from({length: 48}, (_, i) => i)} 
          posteTotals={planData.poste_totals} 
          viewMode={viewMode}
        />
        
        {/* Rade Table */}
        {planData.en_rade && planData.en_rade.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <h5 style={{ color: '#ff4444', fontSize: '11px', marginBottom: '5px' }}>🚨 VESSELS IN ROADSTEAD ({planData.en_rade.length} waiting)</h5>
            <table style={{ width: '100%', fontSize: '10px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #444', color: '#888' }}><th style={{padding:'4px'}}>Vessel</th><th style={{padding:'4px'}}>Priority</th><th style={{padding:'4px'}}>Quality</th><th style={{padding:'4px'}}>Tonnage (T)</th></tr></thead>
              <tbody>
                {planData.en_rade.map((n, idx) => (
                  <tr key={idx} style={{ color: '#999', borderBottom: '1px solid #1a1a1a' }}><td style={{padding:'4px'}}>{n.navire}</td><td style={{padding:'4px'}}>P{n.priorite}</td><td style={{padding:'4px'}}>{n.qualite}</td><td style={{padding:'4px'}}>{(n.td||0).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

// ── ORC-05: Journal Global Widget ─────────────────────────────────────────
const JournalWidget = ({ allMessages, agents }) => {
  const agentColors = { 'OPT-01': '#3b82f6', 'ANL-02': '#f97316', 'DAT-03': '#14b8a6', 'INF-04': '#22c55e', 'ORC-05': '#a78bfa' };
  const agentNames = { 'OPT-01': 'Stratège Flux', 'ANL-02': 'Analyste Fiabilité', 'DAT-03': 'Le Statisticien', 'INF-04': 'Ingénieur Infrastructure', 'ORC-05': 'Orchestrateur' };

  const grouped = {};
  let totalMessages = 0;
  Object.entries(allMessages).forEach(([agentId, msgs]) => {
    const plain = msgs.filter(m => !m.isLoading && !m.component && m.text);
    if (plain.length > 0) { grouped[agentId] = plain; totalMessages += plain.length; }
  });

  if (totalMessages === 0) {
    return (
      <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
        <div style={{ fontSize: '11px', color: '#555' }}>No conversations recorded.<br/>Start chatting with the agents.</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', overflow: 'hidden', maxHeight: '420px', overflowY: 'auto' }}>
      <div style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.25), transparent)', padding: '8px 14px', borderBottom: '1px solid rgba(139,92,246,0.2)', position: 'sticky', top: 0, backdropFilter: 'blur(4px)' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1.5px' }}>📋 GLOBAL LOG — {totalMessages} MESSAGES · {Object.keys(grouped).length} AGENTS</span>
      </div>
      {Object.entries(grouped).map(([agentId, msgs]) => {
        const color = agentColors[agentId] || '#a78bfa';
        const name = agentNames[agentId] || agentId;
        const colorRgb = { '#3b82f6': '59,130,246', '#f97316': '249,115,22', '#14b8a6': '20,184,166', '#22c55e': '34,197,94', '#a78bfa': '139,92,246' }[color] || '139,92,246';
        return (
          <div key={agentId} style={{ borderBottom: '1px solid #111' }}>
            <div style={{ padding: '7px 14px', background: `rgba(${colorRgb},0.08)`, display: 'flex', alignItems: 'center', gap: '8px', borderLeft: `3px solid ${color}` }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '1px' }}>{agentId}</span>
              <span style={{ fontSize: '9px', color: '#666' }}>— {name}</span>
              <span style={{ fontSize: '9px', color: '#444', marginLeft: 'auto' }}>{msgs.length} msg</span>
            </div>
            <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {msgs.slice(-6).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '3px 0', borderBottom: '1px solid #0d0d0d' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: m.sender === 'agent' ? color : '#777', minWidth: '42px', flexShrink: 0 }}>{m.sender === 'agent' ? agentId : '👤 USER'}</span>
                  <span style={{ fontSize: '10px', color: '#aaa', lineHeight: 1.4, flex: 1, wordBreak: 'break-word' }}>{m.text?.slice(0, 130)}{m.text?.length > 130 ? '…' : ''}</span>
                  <span style={{ fontSize: '8px', color: '#383838', flexShrink: 0 }}>{m.time}</span>
                </div>
              ))}
              {msgs.length > 6 && <div style={{ fontSize: '9px', color: '#383838', textAlign: 'center', paddingTop: '4px' }}>+{msgs.length - 6} previous messages</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Web Audio & Speech API (Wow Effect) ──────────────────────────────────
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'connect') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'boot') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) { console.error('Audio API error', e); }
};

const VOICE_PRESETS = {
  'OPT-01': { pitch: 0.4, rate: 0.9, voiceType: 'robot', label: '🤖 OPT-01' },
  'ANL-02': { pitch: 0.9, rate: 1.0, voiceType: 'homme', label: '🧔 ANL-02' },
  'DAT-03': { pitch: 1.1, rate: 1.1, voiceType: 'homme', label: '🧔 DAT-03' },
  'INF-04': { pitch: 1.3, rate: 1.0, voiceType: 'femme', label: '👩 INF-04' },
  'ORC-05': { pitch: 0.2, rate: 0.8, voiceType: 'robot', label: '🤖 ORC-05' },
  robot: { pitch: 0.4, rate: 0.9, voiceType: 'robot', label: '🤖 Robot' },
  homme: { pitch: 0.8, rate: 1.0, voiceType: 'homme', label: '🧔 Male EN' },
  femme: { pitch: 1.3, rate: 1.0, voiceType: 'femme', label: '👩 Female EN' },
  mute: { pitch: 0, rate: 0, voiceType: 'mute', label: '🔇 Mute' },
};

const speakText = (text, onStart = null, onEnd = null, voicePreset = null) => {
  const preset = VOICE_PRESETS[voicePreset] || VOICE_PRESETS.robot;
  if (preset === VOICE_PRESETS.mute || !('speechSynthesis' in window)) {
    if (onEnd) setTimeout(onEnd, 100);
    return;
  }
  window.speechSynthesis.cancel();
  
  let cleanText = text.replace(/\*\*/g, '').replace(/#/g, '').replace(/_/g, '');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-US';
  utterance.pitch = preset.pitch;
  utterance.rate = preset.rate;
  
  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    if (preset.voiceType === 'femme') {
      const voice = voices.find(v => v.lang.includes('en') && v.name.toLowerCase().includes('female')) || voices.find(v => v.lang.includes('en'));
      if (voice) utterance.voice = voice;
    } else {
      const voice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Male'))) || voices.find(v => v.lang.includes('en'));
      if (voice) utterance.voice = voice;
    }
  }
  
  utterance.onerror = (e) => console.error("[SpeechSynthesis] Error:", e);
  window.speechSynthesis.speak(utterance);
};

export default function UltraDashboard({ onExit }) {
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [team, setTeam] = useState(TEAM);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [voiceResponseText, setVoiceResponseText] = useState('');
  
  // ── NEW: 12 Improvements State ──
  const [voiceType, setVoiceType] = useState(() => localStorage.getItem('ultra_voice_type') || 'robot');
  const [pendingAction, setPendingAction] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [feedbackMap, setFeedbackMap] = useState(() => { try { return JSON.parse(localStorage.getItem('ultra_feedback') || '{}'); } catch { return {}; } });
  const [isStreaming, setIsStreaming] = useState(false);

  // Refs to avoid stale closures in voice / speech callbacks
  const selectedAgentRef = useRef(selectedAgent);
  useEffect(() => { selectedAgentRef.current = selectedAgent; }, [selectedAgent]);

  const isVoiceModeActiveRef = useRef(isVoiceModeActive);
  useEffect(() => { isVoiceModeActiveRef.current = isVoiceModeActive; }, [isVoiceModeActive]);

  const voiceTypeRef = useRef(voiceType);
  useEffect(() => { voiceTypeRef.current = voiceType; }, [voiceType]);

  const isListeningRef = useRef(isListening);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const inputRef = useRef(input);
  useEffect(() => { inputRef.current = input; }, [input]);
  const abortRecordingRef = useRef(false);
  
  // New Team Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [roundtableRunning, setRoundtableRunning] = useState(false);
  const [showRoundtable, setShowRoundtable] = useState(false);
  const [rtProgress, setRtProgress] = useState({
    phase: 'idle',
    currentAgent: null,
    responses: {},
  });

  // ── localStorage Persistence: Load messages on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ultra_messages');
      if (saved) setMessages(JSON.parse(saved));
    } catch (e) { console.error('Failed to load messages from localStorage', e); }
  }, []);

  // ── localStorage Persistence: Save messages on change ──
  useEffect(() => {
    if (Object.keys(messages).length > 0) {
      localStorage.setItem('ultra_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // ── Save voiceType preference ──
  useEffect(() => { localStorage.setItem('ultra_voice_type', voiceType); }, [voiceType]);

  // ── Save feedback to localStorage ──
  useEffect(() => { localStorage.setItem('ultra_feedback', JSON.stringify(feedbackMap)); }, [feedbackMap]);

  // ── Refs for Wake Word (avoid stale closures) ──
  const agentsRef = useRef(agents);
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
  const showRoundtableRef = useRef(showRoundtable);
  useEffect(() => { showRoundtableRef.current = showRoundtable; }, [showRoundtable]);

  // Fetch Data on Mount
  useEffect(() => {
    // Warm up speech synthesis voices (fixes Chrome empty voices array issue)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    const fetchData = async () => {
      try {
        const teamRes = await api.getTeamMembers();
        if (teamRes.team && teamRes.team.length > 0) {
          setTeam(teamRes.team);
        }

        const assignRes = await api.getAgentAssignments();
        if (assignRes.assignments && assignRes.assignments.length > 0) {
          const assignmentMap = {};
          assignRes.assignments.forEach(a => {
            assignmentMap[a.agent_id] = a.operator_name;
          });

          setAgents(prev => prev.map(ag => ({
            ...ag,
            operator: assignmentMap[ag.id] || ag.operator
          })));
        }
      } catch (err) {
        console.error('Error fetching team/assignments:', err);
      }
    };
    fetchData();
  }, []);

  const handleAssign = async (agentId, newOperator) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, operator: newOperator } : a));
    try {
      await api.updateAgentAssignment({ agent_id: agentId, operator_name: newOperator });
    } catch (err) {
      console.error("Failed to update assignment in Supabase:", err);
    }
  };

  const handleAddTeamMember = async () => {
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    setIsAddingMember(true);
    try {
      const newMember = { name: newMemberName.trim(), role: newMemberRole.trim() };
      const res = await api.addTeamMember(newMember);
      if (res.success && res.data) {
        setTeam(prev => [...prev, res.data]);
        setNewMemberName('');
        setNewMemberRole('');
      } else {
        // Fallback locally if backend fails gracefully
        setTeam(prev => [...prev, newMember]);
        setNewMemberName('');
        setNewMemberRole('');
      }
    } catch (err) {
      console.error("Failed to add team member:", err);
      alert("Erreur lors de l'ajout du membre.");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleChat = (agent) => {
    playSound('connect');
    setSelectedAgent(agent);
    setChatOpen(true);
    if (!messages[agent.id]) {
      setMessages(prev => ({
        ...prev,
        [agent.id]: [
          { sender: 'agent', text: `${agent.name} initialized. Systems at nominal capacity. What is your request?`, time: '23:11' }
        ]
      }));
    }
  };

  // ── ORC-05: Launch War Room (Table Ronde) ──────────────────────────────
  const RT_AGENTS = [
    { id: 'OPT-01', name: 'Stratège Flux',            color: '#3b82f6', colorRgb: '59,130,246',  question: 'Donne-moi un résumé de ton état actuel, le dernier plan généré et les actions en cours. Sois concis.' },
    { id: 'ANL-02', name: 'Analyste Fiabilité',       color: '#f97316', colorRgb: '249,115,22',  question: 'Donne-moi un résumé de ton état actuel, les alertes actives et les équipements surveillés. Sois concis.' },
    { id: 'DAT-03', name: 'Le Statisticien',          color: '#14b8a6', colorRgb: '20,184,166',  question: 'Donne-moi un résumé du TRG actuel, les KPI clés et les anomalies statistiques détectées. Sois concis.' },
    { id: 'INF-04', name: 'Ingénieur Infrastructure',  color: '#22c55e', colorRgb: '34,197,94',   question: 'Donne-moi un résumé de l\'état du réseau portuaire, les convoyeurs actifs et les niveaux de stocks. Sois concis.' },
  ];

  // ── Helper pour formater le Markdown (gras) ──
  const formatMarkdown = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--accent-yellow)', fontWeight: 800, textShadow: '0 0 8px rgba(212,255,0,0.4)', letterSpacing: '0.5px' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleOpenRoundtable = async () => {
    if (roundtableRunning) return;
    playSound('boot');
    speakText("Initialisation de la table ronde. Synchronisation multi-agents activée.");
    setShowRoundtable(true);
    setRoundtableRunning(true);

    // Phase 1: Booting
    setRtProgress({ phase: 'booting', currentAgent: null, responses: {} });
    await new Promise(r => setTimeout(r, 1800));

    // Phase 2: Sequential queries
    setRtProgress(prev => ({ ...prev, phase: 'querying' }));

    const newResponses = {};
    for (const agent of RT_AGENTS) {
      setRtProgress(prev => ({ ...prev, currentAgent: agent.id }));

      try {
        const res = await api.chat({ message: agent.question, history: [], agent_id: agent.id });
        playSound('connect');
        newResponses[agent.id] = { status: 'done', response: res.response, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
      } catch (e) {
        newResponses[agent.id] = { status: 'error', response: '❌ Agent non disponible — vérifiez la connexion.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
      }

      setRtProgress(prev => ({ ...prev, responses: { ...prev.responses, [agent.id]: newResponses[agent.id] } }));
      await new Promise(r => setTimeout(r, 600)); // Brief pause between agents
    }

    // Phase 3: Done
    setRtProgress(prev => ({ ...prev, phase: 'done', currentAgent: null }));
    speakText("Synchronisation terminée. Tous les agents ont rapporté.");
    setRoundtableRunning(false);
  };

  // ── Render: War Room Full-Screen Interface ──────────────────────────────
  const renderWarRoom = () => {
    if (!showRoundtable) return null;

    const { phase, currentAgent, responses } = rtProgress;
    const doneCount = Object.values(responses).filter(r => r.status === 'done').length;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    // Determine ORC-05 center status text
    let orcStatusText = '';
    if (phase === 'booting') orcStatusText = 'INITIALISATION DES PROTOCOLES DE COMMUNICATION...';
    else if (phase === 'querying' && currentAgent) orcStatusText = `INTERROGATION DE ${currentAgent} EN COURS...`;
    else if (phase === 'done') orcStatusText = `BRIEFING TERMINÉ — ${doneCount} AGENTS ONT RÉPONDU`;
    else orcStatusText = 'SYSTÈMES EN ATTENTE';

    return (
      <div className="war-room-overlay">
        {/* Header */}
        <div className="war-room-header">
          <div className="war-room-title">
            <h1>⬡ Table Ronde</h1>
            <span className="subtitle">ORC-05 · War Room · JPH Jorf Lasfar</span>
          </div>
          <button className="war-room-exit" onMouseEnter={() => playSound('hover')} onClick={() => { setShowRoundtable(false); setRoundtableRunning(false); }}>
            ✕ FERMER
          </button>
        </div>

        {/* Main Grid */}
        <div className="war-room-content">
          {/* Agent Panels — positioned in the grid */}
          {RT_AGENTS.map((agent, idx) => {
            const agentResp = responses[agent.id];
            const isCurrentlyQuerying = currentAgent === agent.id && phase === 'querying';
            const isDone = agentResp?.status === 'done';
            const isError = agentResp?.status === 'error';
            const isWaiting = !agentResp && !isCurrentlyQuerying;

            let panelClass = 'agent-com-panel';
            if (isCurrentlyQuerying) panelClass += ' active';
            else if (isWaiting && phase !== 'booting') panelClass += ' waiting';

            const gridPositions = [
              { gridColumn: '1', gridRow: '1' },
              { gridColumn: '3', gridRow: '1' },
              { gridColumn: '1', gridRow: '2' },
              { gridColumn: '3', gridRow: '2' },
            ];

            return (
              <div
                key={agent.id}
                className={panelClass}
                style={{
                  ...gridPositions[idx],
                  '--panel-color': agent.color,
                  '--panel-rgb': agent.colorRgb,
                }}
              >
                <div className="panel-hud-corner top-left"></div>
                <div className="panel-hud-corner bottom-right"></div>
                
                <div className="panel-header">
                  <div className={`panel-status-dot ${isDone || isError ? 'connected' : isCurrentlyQuerying ? 'active' : ''}`}
                    style={isError ? { background: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.8)' } : {}} />
                  <span className="panel-agent-id">{agent.id}</span>
                  <span className="panel-agent-name">{agent.name}</span>
                </div>
                <div className="panel-body">
                  {phase === 'booting' && (
                    <div className="panel-waiting-text">SÉQUENCE D'INITIALISATION...</div>
                  )}
                  {isWaiting && phase !== 'booting' && (
                    <div className="panel-waiting-text">EN ATTENTE DE LIAISON DONNÉES</div>
                  )}
                  {isCurrentlyQuerying && !isDone && (
                    <div className="panel-loading-text">
                      <div className="loader-bar"><div className="loader-fill"></div></div>
                      EXTRACTION DES TÉLÉMÉTRIES...
                    </div>
                  )}
                  {(isDone || isError) && (
                    <div className="panel-response">
                      {formatMarkdown(agentResp.response)}
                    </div>
                  )}
                </div>
                <div className="panel-footer">
                  <span className="panel-timestamp">{agentResp?.timestamp || '—'}</span>
                  {isDone && <span className="panel-badge success">LINK ESTABLISHED</span>}
                  {isError && <span className="panel-badge error">LINK FAILED</span>}
                  {!isDone && !isError && <span className="panel-badge pending">STANDBY</span>}
                </div>
              </div>
            );
          })}

          {/* Central Connecting Lines SVG */}
          <svg className="connection-lines-svg" preserveAspectRatio="none">
            <line x1="25%" y1="25%" x2="50%" y2="50%" className={`svg-line ${responses['OPT-01']?.status === 'done' ? 'active' : ''}`} />
            <line x1="75%" y1="25%" x2="50%" y2="50%" className={`svg-line ${responses['ANL-02']?.status === 'done' ? 'active' : ''}`} />
            <line x1="25%" y1="75%" x2="50%" y2="50%" className={`svg-line ${responses['DAT-03']?.status === 'done' ? 'active' : ''}`} />
            <line x1="75%" y1="75%" x2="50%" y2="50%" className={`svg-line ${responses['INF-04']?.status === 'done' ? 'active' : ''}`} />
          </svg>

          {/* Center Hub: ORC-05 */}
          <div className="war-room-center">
            <div className={`orc-hub ${phase === 'querying' ? 'pulsing' : ''}`}>
              <div className="orc-hub-inner">
                <div className="ai-core-orb"></div>
                <div className="orc-label">ORC-05</div>
                <div className="orc-status">
                  {phase === 'booting' ? 'BOOT SEQ' : phase === 'querying' ? 'PROCESSING' : phase === 'done' ? 'NOMINAL' : 'IDLE'}
                </div>
              </div>
            </div>
            <div className="orc-status-text">{orcStatusText}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="war-room-footer">
          <span className="wr-stat">Phase: <span className="wr-val">{phase.toUpperCase()}</span></span>
          <span className="wr-stat">Agents connectés: <span className="wr-val">{doneCount} / {RT_AGENTS.length}</span></span>
          <span className="wr-stat">{dateStr} :: <span className="wr-val">{timeStr}</span></span>
        </div>
      </div>
    );
  };

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const toggleListen = async (silent = false, forceAgent = null) => {
    if (isListeningRef.current) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
      }
      return;
    }

    abortRecordingRef.current = false;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch(e) {
      alert("⚠️ Microphone access denied.");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    let hasSpoken = false;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onstart = () => {
      console.log("[Voice] MediaRecorder started");
      if (!silent) playSound('hover');
      setIsListening(true);
      
      const activeAgent = forceAgent || selectedAgentRef.current;
      if (activeAgent) {
        if (forceAgent) {
          setSelectedAgent(forceAgent);
          selectedAgentRef.current = forceAgent;
          setChatOpen(true);
        }
        setIsVoiceModeActive(true);
        setVoiceStatus('listening');
      }
      setLoading(false);
      setIsStreaming(false);
      setInput(silent ? '' : '🎙️ Speak now...');
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setIsListening(false);

      const chunks = [...audioChunksRef.current];
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;

      if (abortRecordingRef.current) {
        console.log("[Voice] Recording aborted by CLOSE button.");
        abortRecordingRef.current = false;
        return;
      }

      if (!chunks.length || !hasSpoken) {
        if (isVoiceModeActiveRef.current) setVoiceStatus('idle');
        setInput('');
        return;
      }

      if (isVoiceModeActiveRef.current) setVoiceStatus('processing');
      setInput('⏳ Transcribing...');

      try {
        const blob = new Blob(chunks, { type: mimeType });
        const formData = new FormData();
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        formData.append('file', blob, `recording.${ext}`);

        const res = await fetch('http://localhost:8000/api/agent/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        const transcribed = (data.text || '').trim();
        
        if (abortRecordingRef.current) return;

        if (transcribed) {
          setInput(transcribed);

          const w = transcribed.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
          const isCloseCommand = /\b(close|fermer|quitter|exit)\b/i.test(w);
          if (isCloseCommand && (chatOpenRef.current || isVoiceModeActiveRef.current)) {
            handleCloseVoiceMode();
            playSound('hover');
            return;
          }

          const hasAgentWord = /\b(agent|hey|robot|opt|anl|dat|inf|orc)\b/i.test(w);
          const hasRoleWord = /\b(analyst|infrastructure|engineer|strategist|planner|statistician|orchestrator|coordinator|flow|reliability|data)\b/i.test(w);
          const isWake = hasAgentWord || hasRoleWord;

          const isAgent1 = /\b(1|one|won|first|un|une|opt|flow|strategist|planner)\b/i.test(w);
          const isAgent2 = /\b(2|two|to|too|second|deux|anl|analyst|reliability)\b/i.test(w);
          const isAgent3 = /\b(3|three|tree|third|trois|dat|data|statistician|stat)\b/i.test(w);
          const isAgent4 = /\b(4|four|for|fourth|quatre|inf|infra|infrastructure|engineer)\b/i.test(w);
          const isAgent5 = /\b(5|five|fifth|cinq|orc|orchestrator|coordinator|multi|manager)\b/i.test(w);
          const isExplicitAgent = isAgent1 || isAgent2 || isAgent3 || isAgent4 || isAgent5;

          const shouldSwitchAgent = (!chatOpenRef.current && isWake) ||
                                    (chatOpenRef.current && isWake && isExplicitAgent);

          if (shouldSwitchAgent) {
            let targetAgent = null;
            if (isAgent5) targetAgent = agentsRef.current.find(a => a.id === 'ORC-05');
            else if (isAgent4) targetAgent = agentsRef.current.find(a => a.id === 'INF-04');
            else if (isAgent3) targetAgent = agentsRef.current.find(a => a.id === 'DAT-03');
            else if (isAgent2) targetAgent = agentsRef.current.find(a => a.id === 'ANL-02');
            else if (isAgent1) targetAgent = agentsRef.current.find(a => a.id === 'OPT-01');
            else targetAgent = agentsRef.current[0];

            if (targetAgent) {
              playSound('boot');
              setSelectedAgent(targetAgent);
              selectedAgentRef.current = targetAgent;
              setChatOpen(true);
              setIsVoiceModeActive(true);
              setLoading(false);
              setIsStreaming(false);
              setMessages(prev => {
                if (!prev[targetAgent.id]) {
                  return { ...prev, [targetAgent.id]: [
                    { sender: 'agent', text: `${targetAgent.name} initialized. Systems at nominal capacity. What is your request?`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                  ]};
                }
                return prev;
              });

              const greetingText = `Yes, ${targetAgent.name} listening.`;
              setVoiceResponseText(greetingText);
              setVoiceStatus('speaking');
              speakText(greetingText, null, () => {
                if (!abortRecordingRef.current) setTimeout(() => toggleListen(false, null), 300);
              }, targetAgent.id);
              return;
            }
          }

          if (chatOpenRef.current || showRoundtableRef.current || isVoiceModeActiveRef.current) {
            playSound('connect');
            if (isVoiceModeActiveRef.current) setVoiceStatus('processing');
            handleSendMessage(transcribed);
          }

        } else {
          setInput('');
          if (isVoiceModeActiveRef.current) setVoiceStatus('idle');
        }
      } catch(e) {
        setInput('');
        if (isVoiceModeActiveRef.current) setVoiceStatus('idle');
      }
    };

    recorder.start(250);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    let silenceStart = Date.now();
    let isSilent = true;
    const SILENCE_THRESHOLD = 0.015;

    const checkSilence = () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        audioCtx.close();
        return;
      }

      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const floatVal = (dataArray[i] - 128) / 128;
        sum += floatVal * floatVal;
      }
      const rms = Math.sqrt(sum / bufferLength);

      if (rms > SILENCE_THRESHOLD) {
        hasSpoken = true;
        isSilent = false;
        silenceStart = Date.now();
      } else {
        isSilent = true;
      }

      if (isSilent && (Date.now() - silenceStart > 2000)) {
        mediaRecorderRef.current.stop();
        audioCtx.close();
      } else {
        requestAnimationFrame(checkSilence);
      }
    };
    
    requestAnimationFrame(checkSilence);
  };

  const handleActionConfirm = async () => {
    setShowConfirmModal(false);
    if (!pendingAction) return;

    const { agentId, actionType, params, history } = pendingAction;
    setPendingAction(null);

    const loadingMsg = { sender: 'agent', text: "🔄 Exécution en cours...", time: 'WAIT', isLoading: true };
    setMessages(prev => ({ ...prev, [agentId]: [...(prev[agentId] || []), loadingMsg] }));

    try {
      if (actionType === 'run_planning' || actionType === 'run_simulation') {
        const isSim = actionType === 'run_simulation';
        const apiParams = { ...params };
        if (isSim) {
          let { scenario_type, scenario_target } = apiParams;
          if (scenario_type === 'AXIS_DOWN') {
            if (!scenario_target) scenario_target = 'Axe1';
            apiParams.axes_health = { [scenario_target]: { probability: 1.0, is_anomaly: 1 } };
          } else if (scenario_type === 'WEATHER_ALERT') {
            apiParams.weather_alerts = [{ target: scenario_target || 'Quai 2', start: 0, duration: 12 }];
          } else if (scenario_type === 'QUALITY_SHORTAGE') {
            apiParams.quality_shortages = [{ target: scenario_target || 'DAP', start: 0, duration: 8 }];
          }
        }
        const planRes = await api.generatePlan(apiParams);
        const lots = planRes.all_lots || [];
        const metrics = planRes.metrics || {};
        const horizon = params?.horizon || 48;
        const hours = Array.from({ length: horizon }, (_, i) => i);
        const enRade = lots.filter(l => !l.scheduled);
        const score = metrics.score || 0;
        const totalCharge = metrics.total_charge || 0;

        const computeCost = (lots) => lots.reduce((acc, l) => l.scheduled && l.attente > 0 ? acc + l.attente * 1000 : acc, 0);
        const simCost = computeCost(lots);

        setMessages(prev => {
          const msgs = [...(prev[agentId] || [])];
          const idx = msgs.findIndex(m => m.isLoading);
          if (idx > -1) {
            msgs[idx] = {
              sender: 'agent',
              id: Date.now().toString(),
              text: isSim 
                ? `🚨 **Simulation Terminée !**\nLe plan a été recalculé pour s'adapter à la perturbation.`
                : `✅ **Planification terminée !**\n📊 Score: ${score.toFixed(2)} | ⚓ Tonnage: ${totalCharge.toLocaleString()}T`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              component: 'gantt',
              simMetrics: isSim ? { cost: simCost, wait: metrics.total_attente, congestion: metrics.quay_occupancy } : null,
              planData: { lots, hours, en_rade: enRade, poste_totals: metrics.poste_totals || {}, metrics }
            };
          }
          return { ...prev, [agentId]: msgs };
        });
      } else if (actionType === 'run_benchmark') {
        const benchRes = await api.runBenchmark(params || {});
        const results = benchRes.results || [];
        const bestResult = results.reduce((best, r) => (!best || r.score > best.score) ? r : best, null);
        const bestAlgoName = bestResult?.algo_name || 'N/A';

        setMessages(prev => {
          const msgs = [...(prev[agentId] || [])];
          const idx = msgs.findIndex(m => m.isLoading);
          if (idx > -1) {
            msgs[idx] = {
              sender: 'agent',
              id: Date.now().toString(),
              text: `✅ **Benchmark terminé !**\n🏆 Meilleur algorithme: **${bestAlgoName}**`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              component: 'benchmark_table',
              benchData: { results, best_algo: bestAlgoName }
            };
          }
          return { ...prev, [agentId]: msgs };
        });
      } else if (actionType === 'show_cartography') {
          setMessages(prev => {
            const msgs = [...(prev[agentId] || [])];
            const idx = msgs.findIndex(m => m.isLoading);
            if (idx > -1) msgs.splice(idx, 1);
            msgs.push({
              sender: 'agent',
              id: Date.now().toString(),
              text: '🗺️ **Cartographie JPH** — Plan complet du réseau portuaire de Jorf Lasfar.',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              component: 'cartography'
            });
            return { ...prev, [agentId]: msgs };
          });
      }
      else if (actionType === 'get_kpi_dashboard') {
          const kpiData = params?.kpi_data || [];
          setMessages(prev => {
            const msgs = [...(prev[agentId] || [])];
            const idx = msgs.findIndex(m => m.isLoading);
            if (idx > -1) msgs.splice(idx, 1);
            msgs.push({
              sender: 'agent',
              id: Date.now().toString(),
              text: '📊 **Tableau de Bord TRG** (DAT-03)',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              component: 'kpi_dashboard',
              kpiData: kpiData
            });
            return { ...prev, [agentId]: msgs };
          });
      }
    } catch (e) {
      setMessages(prev => {
        const msgs = [...(prev[agentId] || [])];
        const idx = msgs.findIndex(m => m.isLoading);
        if (idx > -1) msgs[idx] = { sender: 'agent', text: "❌ Échec de l'action.", time: 'ERR' };
        return { ...prev, [agentId]: msgs };
      });
    }
    setLoading(false);
  };

  const handleSendMessage = async (customText = null) => {
    const currentAgent = selectedAgentRef.current;
    const currentInput = inputRef.current;
    const textToSend = typeof customText === 'string' ? customText : currentInput;
    if (!textToSend.trim() || loading || !currentAgent) return;
    const msgText = textToSend.trim();
    const agentId = currentAgent.id;
    
    const userMsg = { sender: 'user', id: Date.now().toString(), text: msgText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg]
    }));
    setInput('');
    setLoading(true);
    setIsStreaming(true);

    // Initial placeholder for typing indicator
    const streamMsgId = Date.now().toString() + "-agent";
    setMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), { id: streamMsgId, sender: 'agent', text: '', isTyping: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
    }));

    try {
      const history = (messagesRef.current[agentId] || []).map(m => ({
        role: m.sender === 'agent' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await api.chatStream({
        message: msgText,
        history: history,
        agent_id: agentId,
        session_id: 'session-' + Date.now()
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = '';
      let isFirstToken = true;

      let currentEvent = 'message';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        const lines = chunkValue.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '{}') continue;
            try {
              const data = JSON.parse(dataStr);
              
              if (currentEvent === 'token' && data.t) {
                fullText += data.t;
                if (isFirstToken) {
                  isFirstToken = false;
                  setMessages(prev => {
                    const msgs = [...(prev[agentId] || [])];
                    const idx = msgs.findIndex(m => m.id === streamMsgId);
                    if (idx > -1) {
                      msgs[idx] = { ...msgs[idx], isTyping: false, isStreaming: true, text: fullText };
                    }
                    return { ...prev, [agentId]: msgs };
                  });
                } else {
                  setMessages(prev => {
                    const msgs = [...(prev[agentId] || [])];
                    const idx = msgs.findIndex(m => m.id === streamMsgId);
                    if (idx > -1) {
                      msgs[idx] = { ...msgs[idx], text: fullText };
                    }
                    return { ...prev, [agentId]: msgs };
                  });
                }
              } else if (currentEvent === 'action') {
                setPendingAction({ agentId, actionType: data.type, params: data.params, history });
                setShowConfirmModal(true);
                if (isFirstToken) {
                  isFirstToken = false;
                  setMessages(prev => {
                    const msgs = [...(prev[agentId] || [])];
                    const idx = msgs.findIndex(m => m.id === streamMsgId);
                    if (idx > -1) msgs[idx] = { ...msgs[idx], isTyping: false, isStreaming: false, text: "Action requested, waiting for confirmation..." };
                    return { ...prev, [agentId]: msgs };
                  });
                }
              } else if (currentEvent === 'suggestions') {
                setSuggestions(prev => ({ ...prev, [agentId]: data }));
              }
            } catch (e) {
              console.error("SSE parse error", e);
            }
          }
        }
      }
      
      // End stream
      setIsStreaming(false);
      setMessages(prev => {
        const msgs = [...(prev[agentId] || [])];
        const idx = msgs.findIndex(m => m.id === streamMsgId);
        if (idx > -1) msgs[idx] = { ...msgs[idx], isStreaming: false };
        return { ...prev, [agentId]: msgs };
      });
      
      // Sync to Table Ronde if active
      if (showRoundtableRef.current) {
         setRtProgress(prev => ({
           ...prev,
           responses: {
             ...prev.responses,
             [agentId]: { status: 'done', response: fullText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
           }
         }));
      }

      // Text-to-speech short confirmation or full response for realism
      const textToSpeak = fullText && fullText.trim() !== "" ? fullText : "Generation successful.";
      const targetVoice = voiceTypeRef.current === 'mute' ? 'mute' : agentId;
      if (isVoiceModeActiveRef.current) {
        setVoiceStatus('speaking');
        setVoiceResponseText(textToSpeak);
        speakText(textToSpeak, null, () => {
          setVoiceStatus('idle');
          if (isVoiceModeActiveRef.current) setTimeout(() => toggleListen(), 500);
        }, targetVoice);
      } else if (voiceTypeRef.current !== 'mute') {
        speakText(textToSpeak, null, null, targetVoice);
      }

      // Save history background
      api.saveHistory({ agent_id: agentId, session_id: 'session-web', messages: [...history, {role: 'user', content: msgText}, {role: 'assistant', content: fullText}] }).catch(() => {});

    } catch (error) {
      console.error(error);
      setIsStreaming(false);
      setMessages(prev => {
        const msgs = [...(prev[agentId] || [])];
        const idx = msgs.findIndex(m => m.id === streamMsgId);
        if (idx > -1) msgs[idx] = { ...msgs[idx], isTyping: false, isStreaming: false, text: "⚠️ Connection error. Transcription failed.", isError: true };
        return { ...prev, [agentId]: msgs };
      });
    }
    setLoading(false);
  };

  const handleFeedback = (msgId, isUpvote) => {
    setFeedbackMap(prev => ({ ...prev, [msgId]: isUpvote ? 'up' : 'down' }));
    // Optimistic background save
    const msg = messages[selectedAgent?.id]?.find(m => m.id === msgId);
    if (msg) api.sendFeedback({ agent_id: selectedAgent.id, message_text: msg.text, feedback: isUpvote ? 'up' : 'down' }).catch(() => {});
  };

  const handleCloseVoiceMode = () => {
    abortRecordingRef.current = true; // Signal onstop to ignore transcripts
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch(e) {}
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    window.speechSynthesis.cancel();
    // Reset all states atomically to unblock the UI
    setIsListening(false);
    setIsVoiceModeActive(false);
    setVoiceStatus('idle');
    setChatOpen(false);
    setLoading(false);
    setIsStreaming(false);
    setInput('');
  };

  const renderAgentComponent = (m) => {
    return (
      <>
        {m.simMetrics && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', marginTop: '12px' }}>
                        <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', borderLeft: '2px solid #ef4444', flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>${m.simMetrics.cost.toLocaleString()}</div>
                          <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>Demurrage Cost</div>
                        </div>
                        <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', borderLeft: '2px solid #ef4444', flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{m.simMetrics.wait}h</div>
                          <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>Total Waiting</div>
                        </div>
                        <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', borderLeft: '2px solid #ef4444', flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{m.simMetrics.congestion ? m.simMetrics.congestion.toFixed(1) : 0}%</div>
                          <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>Quay Congestion</div>
                        </div>
                      </div>
                    )}

                    {m.component === 'gantt' && m.planData && (
                      <GanttWidget planData={m.planData} />
                    )}

                    {m.component === 'benchmark_table' && m.benchData && (
                      <div className="agent-interactive-widget" style={{ marginTop: '10px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
                        <h4 style={{ color: 'var(--accent-yellow)', marginBottom: '10px', fontSize: '12px' }}>📈 BENCHMARK RESULTS (PARETO)</h4>
                        <table style={{ width: '100%', fontSize: '10px', textAlign: 'left', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #444', color: '#888' }}>
                              <th style={{ padding: '4px' }}>Algo</th>
                              <th style={{ padding: '4px' }}>Tonnage</th>
                              <th style={{ padding: '4px' }}>Attente</th>
                              <th style={{ padding: '4px' }}>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.benchData.results.map((r, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                                <td style={{ padding: '4px', fontWeight: 'bold' }}>{r.algo_name}</td>
                                <td style={{ padding: '4px', color: '#4ade80' }}>{r.total_charge}T</td>
                                <td style={{ padding: '4px', color: '#f87171' }}>{r.total_attente}h</td>
                                <td style={{ padding: '4px', color: 'var(--accent-yellow)' }}>{r.score.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── INF-04: Cartography Map Viewer ── */}
                    {m.component === 'cartography' && (
                      <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.4)', background: '#0a0a0a' }}>
                        <div style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                          <span style={{ fontSize: '14px' }}>🗺️</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', letterSpacing: '1px', textTransform: 'uppercase' }}>CARTOGRAPHIE JPH — RÉSEAU COMPLET</span>
                        </div>
                        <img
                          src="/CARTO.png"
                          alt="Cartographie JPH"
                          style={{ width: '100%', display: 'block', cursor: 'zoom-in', maxHeight: '300px', objectFit: 'contain', background: '#000' }}
                          onClick={() => window.open('/CARTO.png', '_blank')}
                        />
                        <div style={{ padding: '6px 12px', fontSize: '9px', color: '#666', textAlign: 'center' }}>
                          Cliquez pour agrandir · Plan Jorf Lasfar JPH
                        </div>
                      </div>
                    )}

                    {/* ── INF-04: Network Path Step Visualizer ── */}
                    {m.component === 'network_path' && m.pathData?.path?.length > 0 && (
                      <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.2), transparent)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            🔍 ROUTE OPTIMALE (DIJKSTRA)
                          </span>
                          <span style={{ fontSize: '10px', color: '#6ee7b7', fontWeight: 700 }}>
                            Poids: {typeof m.pathData.weight === 'number' ? m.pathData.weight.toFixed(1) : '—'}
                          </span>
                        </div>
                        <div style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          {m.pathData.path.map((node, idx) => (
                            <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{
                                background: idx === 0 ? 'rgba(139,92,246,0.3)' : idx === m.pathData.path.length - 1 ? 'rgba(110,231,183,0.2)' : 'rgba(255,255,255,0.05)',
                                border: idx === 0 ? '1px solid #8b5cf6' : idx === m.pathData.path.length - 1 ? '1px solid #6ee7b7' : '1px solid #333',
                                color: idx === 0 ? '#a78bfa' : idx === m.pathData.path.length - 1 ? '#6ee7b7' : '#ccc',
                                padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace'
                              }}>
                                {node}
                              </span>
                              {idx < m.pathData.path.length - 1 && (
                                <span style={{ color: '#555', fontSize: '10px' }}>→</span>
                              )}
                            </span>
                          ))}
                        </div>
                        <div style={{ padding: '6px 12px', borderTop: '1px solid #1a1a1a', display: 'flex', gap: '16px' }}>
                          <span style={{ fontSize: '9px', color: '#a78bfa' }}>⬛ SOURCE: {m.pathData.source}</span>
                          <span style={{ fontSize: '9px', color: '#6ee7b7' }}>⬛ DEST: {m.pathData.target}</span>
                          <span style={{ fontSize: '9px', color: '#888' }}>{m.pathData.path.length} noeuds traversés</span>
                        </div>
                      </div>
                    )}

                    {/* ── INF-04: Stock Level Cards ── */}
                    {m.component === 'stock_level' && m.stockData && (
                      <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.2), transparent)', padding: '8px 12px', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            📦 ÉTAT DES STOCKS — {m.stockData.product}
                          </span>
                        </div>
                        {m.stockData.stocks.length > 0 ? (
                          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {m.stockData.stocks.map((s, idx) => {
                              const pct = s.capacite_max > 0 ? Math.min(100, (s.quantite / s.capacite_max) * 100) : 0;
                              const color = pct > 60 ? '#4ade80' : pct > 30 ? '#fbbf24' : '#f87171';
                              return (
                                <div key={idx} style={{ background: '#111', borderRadius: '6px', padding: '10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{s.qualite || m.stockData.product}</span>
                                    <span style={{ fontSize: '11px', color }}>Hall {s.hall} — {s.quantite?.toLocaleString()}T / {s.capacite_max?.toLocaleString()}T</span>
                                  </div>
                                  <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.5s' }} />
                                  </div>
                                  <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', textAlign: 'right' }}>{pct.toFixed(1)}% capacité</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                            Aucun stock disponible pour ce produit.
                          </div>
                        )}
                      </div>
                    )}
                    {/* ── DAT-03: KPI Dashboard ── */}
                    {m.component === 'kpi_dashboard' && m.kpiData && (
                      <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(20,184,166,0.4)', borderRadius: '8px', padding: '12px' }}>
                        <h4 style={{ color: '#14b8a6', margin: '0 0 12px 0', fontSize: '12px' }}>📈 TRG PAR AXE (Hebdo)</h4>
                        {m.kpiData.length > 0 ? (
                          <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                              <BarChart data={m.kpiData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <XAxis dataKey="axe_nom" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip cursor={{fill: '#222'}} contentStyle={{backgroundColor: '#000', border: '1px solid #14b8a6', fontSize: '11px', color: '#14b8a6'}} />
                                <Bar dataKey="trg" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={30} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', padding: '20px' }}>Aucune donnée KPI disponible. Avez-vous importé les données historiques ?</div>
                        )}
                      </div>
                    )}

                    {/* ── DAT-03: Pareto des arrêts ── */}
                    {m.component === 'pareto_arrets' && m.paretoData && (
                      <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(20,184,166,0.4)', borderRadius: '8px', padding: '12px' }}>
                        <h4 style={{ color: '#14b8a6', margin: '0 0 12px 0', fontSize: '12px' }}>📊 TOP 10 CAUSES D'ARRÊTS (Heures)</h4>
                        {m.paretoData.length > 0 ? (
                          <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                              <BarChart data={m.paretoData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <XAxis type="number" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis dataKey="cause" type="category" width={100} stroke="#888" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{fill: '#222'}} contentStyle={{backgroundColor: '#000', border: '1px solid #14b8a6', fontSize: '11px', color: '#14b8a6'}} />
                                <Bar dataKey="duree" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={15} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', padding: '20px' }}>Aucune donnée d'arrêts disponible.</div>
                        )}
                      </div>
                    )}

                    {/* ── DAT-03: Export Dashboard ── */}
                    {m.component === 'export_dashboard' && m.exportData && (() => {
                      const COLORS = ['#14b8a6','#0ea5e9','#8b5cf6','#f59e0b','#ef4444','#22c55e','#f97316','#ec4899'];
                      return (
                        <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(20,184,166,0.4)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ background: 'linear-gradient(90deg,rgba(20,184,166,0.2),transparent)', padding: '8px 12px', borderBottom: '1px solid rgba(20,184,166,0.15)' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '1px' }}>🚢 EXPORTS 2025 — {m.exportData.total} LIGNES</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px' }}>
                            <div>
                              <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Tonnage par Qualité</div>
                              <div style={{ width: '100%', height: 180 }}>
                                <ResponsiveContainer>
                                  <PieChart>
                                    <Pie data={m.exportData.qualPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}
                                      label={({ name, percent }) => percent > 0.05 ? `${name.slice(0,8)} ${(percent*100).toFixed(0)}%` : ''}>
                                      {m.exportData.qualPie.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #14b8a6', fontSize: '10px' }} formatter={(v) => [`${v.toLocaleString()}T`]} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Top 10 Navires (Tonnage)</div>
                              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                                <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                                  <thead><tr style={{ color: '#555', borderBottom: '1px solid #222' }}><th style={{ padding: '3px', textAlign: 'left' }}>Navire</th><th style={{ padding: '3px', textAlign: 'right' }}>Tonnage</th><th style={{ padding: '3px', textAlign: 'right' }}>Val. USD</th></tr></thead>
                                  <tbody>{m.exportData.topNavires.map((n, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #111', color: i === 0 ? '#14b8a6' : '#aaa' }}>
                                      <td style={{ padding: '3px' }}>{n.navire}</td>
                                      <td style={{ padding: '3px', textAlign: 'right' }}>{n.tonnage.toLocaleString()}T</td>
                                      <td style={{ padding: '3px', textAlign: 'right', color: '#4ade80' }}>${(n.valeur/1e6).toFixed(1)}M</td>
                                    </tr>
                                  ))}</tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── DAT-03: Arrêts par Axe ── */}
                    {m.component === 'arrets_axe' && m.arretsData && (
                      <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(20,184,166,0.4)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg,rgba(20,184,166,0.2),transparent)', padding: '8px 12px', borderBottom: '1px solid rgba(20,184,166,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '1px' }}>🔍 ARRÊTS — {m.axeFilter}</span>
                          <span style={{ fontSize: '9px', color: '#888' }}>{m.arretsData.length} événements</span>
                        </div>
                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                          <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#0a0a0a' }}>
                              <tr style={{ color: '#555', borderBottom: '1px solid #222' }}>
                                {['Date','Axe','Début','Fin','Durée(h)','Cause','Navire'].map(h => <th key={h} style={{ padding: '4px', textAlign: 'left' }}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>{m.arretsData.slice(0, 50).map((r, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #0d0d0d', color: '#999' }}>
                                <td style={{ padding: '3px' }}>{r.date?.slice(0,10)}</td>
                                <td style={{ padding: '3px', color: '#14b8a6' }}>{r.axe}</td>
                                <td style={{ padding: '3px' }}>{r.debut}</td>
                                <td style={{ padding: '3px' }}>{r.fin}</td>
                                <td style={{ padding: '3px', color: '#f59e0b', fontWeight: 700 }}>{r.duree_h?.toFixed(2)}</td>
                                <td style={{ padding: '3px', color: '#f87171' }}>{r.cause}</td>
                                <td style={{ padding: '3px' }}>{r.navire || '—'}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                          {m.arretsData.length > 50 && <div style={{ textAlign: 'center', fontSize: '9px', color: '#555', padding: '4px' }}>+{m.arretsData.length - 50} lignes supplémentaires</div>}
                        </div>
                      </div>
                    )}

                    {/* ── ORC-05: Journal Global ── */}
                    {m.component === 'orc_journal' && (
                      <JournalWidget allMessages={messages} agents={agents} />
                    )}

                    {/* ── ORC-05: Table Ronde Results ── */}
                    {m.component === 'orc_roundtable' && m.roundtableData && (
                      <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.25), transparent)', padding: '8px 14px', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1.5px' }}>🔄 TABLE RONDE — RAPPORT DE TOUS LES AGENTS</span>
                        </div>
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {m.roundtableData.map((r, idx) => (
                            <div key={idx} style={{ background: '#111', borderRadius: '6px', padding: '12px', borderLeft: `3px solid ${r.color || '#a78bfa'}` }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: r.color || '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>{r.agentId}</span>
                                <span style={{ fontSize: '9px', color: '#555' }}>— {r.agentName}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.response}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
      </>
    );
  };

  return (
    <div className="ultra-dashboard-scrollable">
      {renderWarRoom()}
      <div className="top-right-actions">
        <button className="exit-ultra" onClick={onExit}>EXIT ULTRA MODE</button>
      </div>
      
      {/* SECTION 1: ROUNDTABLE VISUAL */}
      <div className="roundtable-hero">
        <div className="roundtable-visual">
          <img 
            src="/agents_visual3.png" 
            alt="Agents Roundtable" 
            className="roundtable-main-img" 
          />
          <div className="vignette"></div>
          
          <div className="agent-hotspots">
            {agents.map((agent, idx) => (
              <div 
                key={agent.id} 
                className={`agent-hotspot agent-${idx}`}
                onClick={() => handleChat(agent)}
              >
                <div className="hotspot-label">
                  <span className="agent-tag">{agent.id}</span>
                  <span className="agent-name-tag">{agent.name}</span>
                </div>
                <div className="hotspot-pulse"></div>
              </div>
            ))}
          </div>

          <div className="center-info">
            <div className="glitch-title">AGENT <span className="text-yellow">CONTROL ROOM</span></div>
            <p>Industrial agent orchestration · Port logistics control room</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: CONTROL TABLE & TEAM */}
      <div className="ultra-content-container">
        <div className="control-table-section">
          <div className="section-header">
            <div className="dot"></div>
            <h2>AI Agents · Control Table</h2>
            <span className="agent-count">{agents.length} AGENTS</span>
          </div>

          <div className="agents-table">
            <div className="table-header">
              <div className="col-agent">AGENT</div>
              <div className="col-status">STATUS</div>
              <div className="col-perf">PERFORMANCE</div>
              <div className="col-operator">ASSIGNED OPERATOR</div>
              <div className="col-btns">ACTIONS</div>
            </div>

            {agents.map(agent => (
              <div key={agent.id} className="agent-row">
                <div className="col-agent">
                  <div className="agent-avatar-small">
                    <img 
                      src="/avatar_base.png" 
                      alt="Agent Avatar" 
                      className={`avatar-img color-${agent.color}`} 
                      width="72" 
                      height="72" 
                    />
                  </div>
                  <div className="agent-meta">
                    <div className="agent-name">{agent.name}</div>
                    <div className="agent-id">{agent.id}</div>
                  </div>
                </div>
                <div className="col-status">
                  <span className={`status-badge ${agent.status.toLowerCase()}`}>
                    {agent.status}
                  </span>
                </div>
                <div className="col-perf">
                  <div className="perf-label">{agent.performanceLabel} <span className="text-yellow">{agent.performanceValue}%</span></div>
                  <div className="perf-bar"><div className="perf-fill" style={{ width: `${agent.performanceValue}%` }}></div></div>
                </div>
                <div className="col-operator">
                  <select 
                    className="operator-dropdown"
                    value={agent.operator}
                    onChange={(e) => handleAssign(agent.id, e.target.value)}
                  >
                    {team.map(member => (
                      <option key={member.name} value={member.name}>{member.name} ({member.role})</option>
                    ))}
                  </select>
                </div>
                <div className="col-btns">
                  <button className="chat-btn-small" onClick={() => handleChat(agent)}>CHAT</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="team-assignment-section">
          <div className="section-header">
            <h2>Team Assignment</h2>
          </div>
          
          <div className="add-member-form" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="Name..." 
              value={newMemberName} 
              onChange={e => setNewMemberName(e.target.value)} 
              className="operator-dropdown"
              style={{ flex: 1 }}
            />
            <input 
              type="text" 
              placeholder="Role..." 
              value={newMemberRole} 
              onChange={e => setNewMemberRole(e.target.value)} 
              className="operator-dropdown"
              style={{ flex: 1 }}
            />
            <button 
              className="chat-btn-small" 
              onClick={handleAddTeamMember}
              disabled={isAddingMember}
            >
              {isAddingMember ? '...' : '+ ADD'}
            </button>
          </div>

          <div className="team-list">
            {team.map(member => {
              const assignedAgents = agents.filter(a => a.operator === member.name);
              return (
                <div key={member.name} className="team-card">
                  <div className="op-info">
                    <div className="op-name">{member.name}</div>
                    <div className="op-role">{member.role}</div>
                  </div>
                  <div className="assigned-chips">
                    {assignedAgents.length > 0 ? assignedAgents.map(a => (
                      <span key={a.id} className="agent-chip">{a.id}</span>
                    )) : <span className="no-assignment">UNBOUND</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bottom-telemetry-fixed">
        <div className="tel-group"><span className="label">SYS:</span><span className="value text-yellow">NOMINAL</span></div>
        <div className="tel-group"><span className="label">DATABUS:</span><span className="value text-yellow">CONNECTED</span></div>
        <div className="tel-time">29 AVR. 2026 :: 23:15:04</div>
      </div>

      {chatOpen && selectedAgent && (
        <div className="ultra-chat-overlay" onClick={() => setChatOpen(false)}>
          
          {['OPT-01','ANL-02','DAT-03','INF-04','ORC-05'].includes(selectedAgent.id) && (
            <div className="chat-large-visual" onClick={e => e.stopPropagation()}>
              <button className="exit-large-visual-btn" onClick={() => setChatOpen(false)}>
                ← BACK
              </button>
              <img src={`/${selectedAgent.id}.png`} alt={`${selectedAgent.name} Visual`} className="large-agent-img" />
            </div>
          )}

          <div className="chat-window" onClick={e => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-agent-info">
                <div className="agent-avatar">
                  <img 
                    src="/avatar_base.png" 
                    alt="Agent Avatar" 
                    className={`avatar-img color-${selectedAgent.color}`} 
                    width="72" 
                    height="72" 
                  />
                </div>
                <div>
                  <div className="agent-name">{selectedAgent.name} <span className="agent-id">{selectedAgent.id}</span></div>
                  <div className="agent-role">Operator: {selectedAgent.operator}</div>
                </div>
              </div>
              <button className="close-chat" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-messages">
              {(messages[selectedAgent.id] || []).map((m, i) => (
                <div key={i} className={`message ${m.sender}${m.isLoading ? ' loading' : ''}${m.isStreaming ? ' streaming' : ''}`}>
                  <div className="message-content">
                    {m.isTyping ? (
                      <div className="typing-indicator">
                        <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                        <span className="label">PROCESSING...</span>
                      </div>
                    ) : (
                      <>
                        {m.sender === 'agent' ? formatMarkdown(m.text) : m.text}
                        {renderAgentComponent(m)}
                        
                        {/* Feedback & Retry UI */}
                        {m.sender === 'agent' && m.id && !m.isStreaming && !m.isTyping && (
                          <div className="feedback-row">
                            <button className={`feedback-btn ${feedbackMap[m.id] === 'up' ? 'active-up' : ''}`} onClick={() => handleFeedback(m.id, true)}>👍</button>
                            <button className={`feedback-btn ${feedbackMap[m.id] === 'down' ? 'active-down' : ''}`} onClick={() => handleFeedback(m.id, false)}>👎</button>
                            {m.isError && <button className="retry-btn" onClick={() => { setMessages(prev => { const msgs = [...prev[selectedAgent.id]]; msgs.splice(i, 1); return {...prev, [selectedAgent.id]: msgs}; }); handleSendMessage(messages[selectedAgent.id][i-1]?.text); }}>🔄 Retry</button>}
                          </div>
                        )}
                        
                        {/* Suggestions UI */}
                        {m.sender === 'agent' && !m.isStreaming && i === messages[selectedAgent.id].length - 1 && suggestions[selectedAgent.id] && (
                          <div className="suggestions-row">
                            {suggestions[selectedAgent.id].map((s, idx) => (
                              <div key={idx} className="suggestion-chip" onClick={() => { setInput(s); handleSendMessage(s); }}>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="message-time">{m.time}</div>
                </div>
              ))}
            </div>
            <div className="chat-footer">
              <div className="chat-context">CONTEXT-SCOPED TO {selectedAgent.id} · INDUSTRIAL MODE</div>
              {selectedAgent.id === 'DAT-03' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {[
                    { label: 'TRG Axe 3', msg: 'Affiche le TRG de l\'axe 3' },
                    { label: 'Pareto Arrêts', msg: 'Analyse les causes d\'arrêts 2025 pareto' },
                    { label: 'Top Exports', msg: 'Affiche le dashboard des exports navires 2025' },
                    { label: 'Arrêts Axe 1', msg: 'Arrêts de l\'axe 1 détail' },
                    { label: 'KPI Global', msg: 'Affiche tous les indicateurs KPI 2025' },
                    { label: 'MTBF/MTTR', msg: 'Analyse MTBF et MTTR des pannes 2025' },
                  ].map((a, i) => (
                    <button key={i} onClick={() => setInput(a.msg)} className="quick-action-btn">
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {/* ORC-05 Quick Actions */}
              {selectedAgent.id === 'ORC-05' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <button
                    onClick={handleOpenRoundtable}
                    disabled={roundtableRunning}
                    className="quick-action-btn"
                    style={roundtableRunning ? { opacity: 0.5, cursor: 'not-allowed' } : { borderColor: 'rgba(139,92,246,0.5)', color: '#c4b5fd' }}>
                    {roundtableRunning ? 'ROUNDTABLE (RUNNING)' : 'START ROUNDTABLE'}
                  </button>
                  {[
                    { label: 'GLOBAL LOG',  msg: 'Affiche le journal global de toutes les conversations' },
                    { label: 'DELEGATE OPT-01', msg: 'Délègue à l\'agent OPT-01 pour la planification' },
                    { label: 'DELEGATE DAT-03', msg: 'Délègue à l\'agent DAT-03 pour les statistiques KPI' },
                    { label: 'DELEGATE ANL-02', msg: 'Délègue à l\'agent ANL-02 pour l\'analyse des anomalies' },
                    { label: 'DELEGATE INF-04', msg: 'Délègue à l\'agent INF-04 pour l\'infrastructure réseau' },
                  ].map((a, i) => (
                    <button key={i} onClick={() => setInput(a.msg)} className="quick-action-btn">
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="chat-input-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', alignItems: 'center' }}>
                  <div className="voice-selector">
                    <span style={{ fontSize: '10px', color: '#888' }}>VOICE:</span>
                    <select value={voiceType} onChange={e => setVoiceType(e.target.value)}>
                      {Object.entries(VOICE_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button className="voice-preview-btn" onClick={() => speakText("Voice test.", null, null, voiceType)}>🔊</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button className="clear-history-btn" onClick={() => { if(window.confirm('Clear history?')) { setMessages(prev => ({...prev, [selectedAgent.id]: []})); } }}>🗑️ CLEAR</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input 
                    type="text" 
                    placeholder={isListening ? "Listening..." : `Message ${selectedAgent.id}...`} 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    disabled={loading || isListening}
                  />
                  <button 
                    className={`mic-btn ${isListening ? 'listening' : ''}`} 
                    onClick={toggleListen} 
                    disabled={false}
                    title="Speak into microphone"
                  >
                    🎙️
                  </button>
                  <button className="send-btn" onClick={() => handleSendMessage()} disabled={loading}>
                    {loading ? 'PROCESSING...' : 'SEND'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h3>⚠️ Execution Confirmation</h3>
            <p>Do you want to authorize <strong>{pendingAction.agentId}</strong> to execute the action:</p>
            <div style={{ fontSize: '12px', background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: '#fff', fontFamily: 'monospace' }}>
              [{pendingAction.actionType.toUpperCase()}]
            </div>
            {Object.keys(pendingAction.params || {}).length > 0 && (
              <div className="confirm-params">
                {Object.entries(pendingAction.params).map(([k,v]) => <span key={k}>{k}: {JSON.stringify(v)}</span>)}
              </div>
            )}
            <div className="confirm-actions">
              <button className="confirm-btn-no" onClick={() => { setShowConfirmModal(false); setPendingAction(null); }}>CANCEL</button>
              <button className="confirm-btn-yes" onClick={handleActionConfirm}>AUTHORIZE EXECUTION</button>
            </div>
          </div>
        </div>
      )}
      


      {/* Voice Mode Overlay (JARVIS Style) */}
      {isVoiceModeActive && selectedAgent && (
        <div className="voice-mode-overlay">
          <button className="voice-mode-exit" onMouseEnter={() => playSound('hover')} onClick={handleCloseVoiceMode} style={{ zIndex: 2000 }}>
            ✕ CLOSE
          </button>
          
          <div className={`orc-hub pulsing large ${voiceStatus === 'speaking' ? 'speaking' : ''}`}>
            <div className="orc-hub-inner" style={{
              '--panel-rgb': selectedAgent.color === 'blue' ? '59,130,246' : 
                             selectedAgent.color === 'orange' ? '249,115,22' : 
                             selectedAgent.color === 'teal' ? '20,184,166' : 
                             selectedAgent.color === 'green' ? '34,197,94' : '139,92,246'
            }}>
              <div className={`ai-core-orb ${voiceStatus}`} style={{ 
                background: `radial-gradient(circle at 30% 30%, rgba(var(--panel-rgb), 0.9), rgba(var(--panel-rgb), 0.4) 40%, transparent 80%)`,
                boxShadow: `0 0 80px rgba(var(--panel-rgb), 0.6), inset 0 0 40px rgba(var(--panel-rgb), 0.8)`
              }}></div>
              <div className="orc-label">{selectedAgent.id}</div>
              <div className="orc-status" style={{ color: `rgba(var(--panel-rgb), 1)`, borderColor: `rgba(var(--panel-rgb), 0.4)` }}>
                {voiceStatus.toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="voice-mode-text">
            {voiceStatus === 'listening' && (
              <span className="listening-text">{input || "Listening..."}</span>
            )}
            {voiceStatus === 'processing' && (
              <span className="processing-text">GENERATING RESPONSE...</span>
            )}
            {voiceStatus === 'speaking' && (
              <div className="speaking-response">{formatMarkdown(voiceResponseText)}</div>
            )}
          </div>
          
          <div className="voice-mode-controls">
             {voiceStatus !== 'listening' && (
               <button className="voice-action-btn" onClick={toggleListen}>
                 🎙️ RESUME LISTENING
               </button>
             )}
          </div>
          
          {/* Overlaid UI Component (e.g. Gantt, Dashboard) */}
          {(() => {
            const agentMessages = messages[selectedAgent.id] || [];
            const lastCompMsg = [...agentMessages].reverse().find(msg => msg.component || msg.simMetrics);
            if (lastCompMsg) {
              return (
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '90vw', height: '85vh', zIndex: 1000, background: 'rgba(5,5,5,0.95)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(15px)', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}>
                  {renderAgentComponent(lastCompMsg)}
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

    </div>
  );
}
