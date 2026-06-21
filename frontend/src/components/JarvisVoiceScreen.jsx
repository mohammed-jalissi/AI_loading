import React, { useEffect, useState, useRef, useCallback } from 'react';
import './JarvisVoiceScreen.css';
import { api } from '../api/client';
import { useJarvisStore } from '../store/jarvisStore';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import GanttChart from '../components/GanttChart';
import MetricCard from '../components/MetricCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, CartesianGrid, AreaChart, Area } from 'recharts';

const AGENTS = [
  { id: 'OPT-01', number: '1', name: 'Stratège Flux', color: [14, 165, 233] },
  { id: 'ANL-02', number: '2', name: 'Analyste Fiabilité', color: [239, 68, 68] },
  { id: 'DAT-03', number: '3', name: 'Le Statisticien', color: [234, 179, 8] },
  { id: 'INF-04', number: '4', name: 'Ingénieur Infra', color: [34, 197, 94] },
  { id: 'ORC-05', number: '5', name: 'L\'Orchestrateur', color: [139, 92, 246] }
];

export const normalizeText = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\bagents\b/g, 'agent'); 
};

export const isWakeWord = (text) => {
  const t = normalizeText(text);
  return t.includes('wake up jarvis') || t.includes('wake jarvis') || t.includes('hey jarvis') || 
         t.includes('hello jarvis') || t === 'jarvis' || t.includes('start jarvis') || 
         t.includes('activate jarvis') || t.includes('wake up jervis') || t.includes('welcome jarvis') ||
         t.includes('welcome jervis') || t.includes('bonjour jarvis') || t.includes('lance jarvis') || 
         t.includes('allo jarvis') || t.includes('ya jarvis');
};

export const extractAgentNumber = (text) => {
  const norm = ` ${normalizeText(text)} `; 
  if (norm.match(/\b(1|one|un|opt|optimizer|planning|flow strategist|opt-01|opt 01)\b/)) return '1';
  if (norm.match(/\b(2|two|deux|anl|analyst|reliability|anomaly|anl-02|anl 02)\b/)) return '2';
  if (norm.match(/\b(3|three|trois|dat|statistician|data|dat-03|dat 03)\b/)) return '3';
  if (norm.match(/\b(4|four|quatre|inf|infrastructure|infra|inf-04|inf 04)\b/)) return '4';
  if (norm.match(/\b(5|five|cinq|orc|orchestrator|orc-05|orc 05)\b/)) return '5';
  return null;
};

// Global helper for voices
async function getAvailableVoices() {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };
  });
}

// ── Expandable Widget Panel ──
const ExpandableResultPanel = ({ title, children, icon, color = 'var(--accent-yellow)' }) => {
  const [expanded, setExpanded] = useState(false);
  const widgetStyle = expanded ? {
    position: 'fixed', top: 40, left: 40, right: 40, bottom: 40, 
    background: '#0a0a0a', zIndex: 10000, padding: '24px', 
    borderRadius: '12px', border: `1px solid ${color}`, overflow: 'auto',
    boxShadow: '0 0 50px rgba(0,0,0,0.8)'
  } : {
    marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', 
    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto', maxWidth: '100%',
    transition: 'all 0.3s ease'
  };

  return (
    <>
      {expanded && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, backdropFilter: 'blur(4px)' }} onClick={() => setExpanded(false)}></div>}
      <div className="jarvis-result-widget" style={widgetStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <h4 style={{ color: color, fontSize: expanded ? '16px' : '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
             {icon} {title}
          </h4>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {expanded ? 'COLLAPSE' : 'FULLSCREEN'}
          </button>
        </div>
        {children}
      </div>
    </>
  );
};


export default function JarvisVoiceScreen({ isOpen, onClose }) {
  // ── State ──
  const [voiceState, setVoiceState] = useState('standby');
  const canvasRef = useRef(null);

  const activeAgent = useJarvisStore((state) => state.activeAgent);
  const setActiveAgent = useJarvisStore((state) => state.setActiveAgent);
  const goBack = useJarvisStore((state) => state.goBack);
  const resetJarvis = useJarvisStore((state) => state.resetJarvis);
  const messagesMap = useJarvisStore((state) => state.messages);
  const addMessage = useJarvisStore((state) => state.addMessage);
  const setAgentMessages = useJarvisStore((state) => state.setAgentMessages);

  const [isWakeWordDetected, setWakeWordDetected] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [agentResponseText, setAgentResponseText] = useState("");
  const [analyser, setAnalyser] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // ── Refs (callback-safe, never stale) ──
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isOpenRef = useRef(false);
  const isWakeWordDetectedRef = useRef(false);
  const activeAgentRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Function refs — updated every render so recognition callbacks never go stale
  const handleVoiceCommandRef = useRef(null);
  const restartRecognitionRef = useRef(null);

  // Sync refs with React state
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { isWakeWordDetectedRef.current = isWakeWordDetected; }, [isWakeWordDetected]);
  useEffect(() => { activeAgentRef.current = activeAgent; }, [activeAgent]);

  // ── Visualizer Setup ──
  useEffect(() => {
    let stream;
    let audioCtx;
    if (isOpen) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
        stream = s;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(s);
        const an = audioCtx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        setAnalyser(an);
      }).catch(e => console.warn("Visualizer mic error:", e));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioCtx) audioCtx.close();
      setAnalyser(null);
    };
  }, [isOpen]);

  useAudioVisualizer(analyser, canvasRef, activeAgent, voiceState);

  // ══════════════════════════════════════════════
  // ── Microphone Permission ──
  // ══════════════════════════════════════════════
  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log("Microphone permission granted");
      setVoiceError("");
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setVoiceError("Microphone permission is required.");
      return false;
    }
  }

  // ══════════════════════════════════════════════
  // ── Recognition: Stop ──
  // ══════════════════════════════════════════════
  function stopRecognition() {
    if (!recognitionRef.current) return;
    console.log("Stopping recognition");
    try {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.onstart = null;
      recognitionRef.current.stop();
    } catch (error) {
      console.warn("Recognition stop error:", error);
    }
    recognitionRef.current = null;
    setIsListening(false);
  }

  // ══════════════════════════════════════════════
  // ── Recognition: Start Fresh ──
  // ══════════════════════════════════════════════
  function startFreshRecognition() {
    stopRecognition();

    if (!isOpenRef.current) {
      console.log("Skipping recognition: Jarvis not open");
      return;
    }
    if (isSpeakingRef.current) {
      console.log("Skipping recognition: Jarvis is speaking");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition is not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log("Microphone listening started");
      setIsListening(true);
      setVoiceState("listening");
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      console.log("Interim transcript:", interimText);
      console.log("Final transcript:", finalText);

      setLiveTranscript(interimText || finalText);

      if (finalText.trim()) {
        setTranscriptText(finalText.trim());
        setLiveTranscript("");
        // Use ref to call the latest handleVoiceCommand (never stale)
        if (handleVoiceCommandRef.current) {
          handleVoiceCommandRef.current(finalText.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);
      setIsListening(false);

      if (
        event.error !== "not-allowed" &&
        event.error !== "service-not-allowed" &&
        event.error !== "aborted" &&
        isOpenRef.current
      ) {
        // Use ref to call the latest restartRecognition
        if (restartRecognitionRef.current) {
          restartRecognitionRef.current();
        }
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      setIsListening(false);

      if (isOpenRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        if (restartRecognitionRef.current) {
          restartRecognitionRef.current();
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("Recognition start failed:", error);
    }
  }

  // ══════════════════════════════════════════════
  // ── Recognition: Restart ──
  // ══════════════════════════════════════════════
  function restartRecognition() {
    if (!isOpenRef.current || isSpeakingRef.current || isProcessingRef.current) {
      return;
    }
    setTimeout(() => {
      startFreshRecognition();
    }, 300);
  }

  // Keep function ref updated every render (solves stale closure)
  restartRecognitionRef.current = restartRecognition;

  // ══════════════════════════════════════════════
  // ── Text-to-Speech ──
  // ══════════════════════════════════════════════
  function speakJarvis(text) {
    if (!text) return;
    if (!("speechSynthesis" in window)) {
      console.error("Text-to-Speech is not supported in this browser.");
      return;
    }

    console.log("Jarvis TTS text:", text);

    // Stop mic while speaking to avoid capturing Jarvis's own voice
    stopRecognition();
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setVoiceState("speaking");

    getAvailableVoices().then(voices => {
      if (!isOpenRef.current) return;

      const selectedVoice =
        voices.find(v => v.lang === "en-US") ||
        voices.find(v => v.lang && v.lang.startsWith("en")) ||
        voices[0];

      console.log("Selected voice:", selectedVoice);

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = utterance;

      utterance.lang = selectedVoice?.lang || "en-US";
      utterance.voice = selectedVoice || null;
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.pitch = 1;

      setAgentResponseText(text);

      utterance.onstart = () => {
        console.log("TTS started");
        isSpeakingRef.current = true;
        setVoiceState("speaking");
      };

      utterance.onend = () => {
        console.log("TTS ended — restarting mic");
        isSpeakingRef.current = false;
        if (isOpenRef.current) {
          setVoiceState("listening");
          // Restart recognition after Jarvis finishes speaking
          restartRecognitionRef.current?.();
        }
      };

      utterance.onerror = (event) => {
        console.error("TTS error:", event);
        isSpeakingRef.current = false;
        if (isOpenRef.current) {
          setVoiceState("listening");
          restartRecognitionRef.current?.();
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // ══════════════════════════════════════════════
  // ── Close Jarvis ──
  // ══════════════════════════════════════════════
  const closeJarvis = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
    setTimeout(() => {
      stopRecognition();
      window.speechSynthesis.cancel();
      setWakeWordDetected(false);
      setActiveAgent(null);
      setVoiceState('standby');
      isSpeakingRef.current = false;
      isProcessingRef.current = false;
      setTranscriptText("");
      setLiveTranscript("");
      setAgentResponseText("");
      setVoiceError("");
    }, 10);
  };

  // ══════════════════════════════════════════════
  // ── Init on Open ──
  // ══════════════════════════════════════════════
  useEffect(() => {
    if (isOpen) {
      resetJarvis();
      setWakeWordDetected(false);
      setActiveAgent(null);
      setTranscriptText("");
      setLiveTranscript("");
      setAgentResponseText("");
      setVoiceError("");
      isSpeakingRef.current = false;
      isProcessingRef.current = false;
      setVoiceState("standby");

      // Request mic permission then greet
      requestMicrophonePermission().then(granted => {
        if (granted && isOpenRef.current) {
          speakJarvis("Welcome sir. Jarvis is ready. Say wake up Jarvis to start.");
        }
      });
    } else {
      stopRecognition();
      window.speechSynthesis.cancel();
    }

    return () => {
      stopRecognition();
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ══════════════════════════════════════════════
  // ── Voice Command Handler ──
  // ══════════════════════════════════════════════
  const handleVoiceCommand = (text) => {
    const command = normalizeText(text);
    console.log("Recognized command:", command);

    if (!isOpenRef.current) return;

    const isWake = isWakeWordDetectedRef.current;
    const currentAgent = activeAgentRef.current;

    // Close command
    if (command.includes('close') || command.includes('fermer') || command.includes('stop jarvis') || command.includes('exit jarvis')) {
      speakJarvis("Jarvis closed. Back to Ultra Mode.");
      setTimeout(() => closeJarvis(), 2000);
      return;
    }

    // Wake word detection
    if (!isWake && isWakeWord(command)) {
      setWakeWordDetected(true);
      setActiveAgent(AGENTS[4]);
      speakJarvis("Welcome sir. ORC-05 is online. How can I assist you?");
      return;
    }

    // Go back
    if (isWake && (command.includes('go back') || command.includes('previous agent') || command.includes('retour'))) {
      speakJarvis("Going back to previous agent.");
      goBack();
      return;
    }

    // Agent switch
    if (isWake && (command.includes('switch') || command.includes('change to') || command.includes('go to') || command.includes('call agent') || command.includes('open') || command.includes('return to'))) {
      const agentNum = extractAgentNumber(command);
      if (agentNum) {
        const newAgent = AGENTS.find(a => a.number === agentNum);
        if (newAgent) {
          speakJarvis(`Switching to ${newAgent.id}.`);
          setActiveAgent(newAgent);
          return;
        }
      }
    }

    // Business command to agent
    if (isWake && currentAgent && command.length > 2) {
      sendCommandToBackend(command, currentAgent);
    } else {
      restartRecognition();
    }
  };

  // Keep function ref updated every render
  handleVoiceCommandRef.current = handleVoiceCommand;

  const sendCommandToBackend = (command, agent) => {
    let initialResponse = "I have processed your request.";
    if (command.includes('gantt') || command.includes('plan')) initialResponse = "I am preparing the loading plan.";
    else if (command.includes('kpi') || command.includes('dashboard')) initialResponse = "Analyzing the KPI dashboard.";
    else if (command.includes('pareto')) initialResponse = "Generating the Pareto analysis.";
    else if (command.includes('reliability') || command.includes('fiabilité')) initialResponse = "Checking reliability metrics.";
    else if (command.includes('cartography') || command.includes('cartographie')) initialResponse = "Loading the port cartography.";
    else initialResponse = "Processing your request.";

    speakJarvis(initialResponse);

    setVoiceState('processing');
    isProcessingRef.current = true;
    
    const agentId = agent.id;
    const userMsg = { sender: 'user', text: command, time: new Date().toLocaleTimeString(), id: Date.now().toString() };
    const loadingMsg = { sender: 'agent', isStreaming: true, text: '', time: new Date().toLocaleTimeString(), id: (Date.now() + 1).toString() };
    
    addMessage(agentId, userMsg);
    addMessage(agentId, loadingMsg);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    api.chatStream(
      { message: command, agent_id: agentId, history: (messagesMap[agentId] || []).slice(-6).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text || '' })) },
      { signal: abortControllerRef.current.signal }
    ).then(async res => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        let extractedAction = null;
        let extractedParams = {};

        let currentEvent = 'message';
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
             buffer += decoder.decode(value, { stream: true });
          }
          
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            
            let dataStr = '';
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                currentEvent = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr += line.slice(6).trim();
              }
            }
            
            if (dataStr && dataStr !== '{}') {
              try {
                const d = JSON.parse(dataStr);
                if (currentEvent === 'token' && d.t) {
                  full += d.t;
                } else if (currentEvent === 'action') {
                   extractedAction = d.type || d.action;
                   extractedParams = d.params || {};
                } else if (d.response) {
                  full = d.response;
                } else if (d.t) {
                  full += d.t;
                }
              } catch (_) {}
            }
            // removed extra brace
            boundary = buffer.indexOf('\n\n');
          }
          setAgentMessages(agentId, [...(useJarvisStore.getState().messages[agentId] || []).slice(0, -1), { ...loadingMsg, isStreaming: true, text: full }]);
        }
        
        const fullResponse = full.trim() || 'Task completed.';
        
        // Manual fallbacks if LLM forgets to send the action JSON but user clearly asked for it
        if (!extractedAction) {
           const cmd = command.toLowerCase();
           if (agentId === 'ORC-05' && (cmd.includes('roundtable') || cmd.includes('table ronde'))) {
              extractedAction = 'launch_roundtable';
           } else if (agentId === 'INF-04' && (cmd.includes('cartography') || cmd.includes('cartographie') || cmd.includes('map') || fullResponse.toLowerCase().includes('cartography'))) {
              extractedAction = 'show_cartography';
           } else if (agentId === 'OPT-01' && (cmd.includes('simulate') || cmd.includes('simulation') || fullResponse.toLowerCase().includes('simulation'))) {
              extractedAction = 'run_simulation';
              extractedParams = { scenario_type: 'WEATHER_ALERT', scenario_target: 'Quai 2' }; // fallback default params
           } else if (agentId === 'DAT-03' && cmd.includes('pareto')) {
              extractedAction = 'get_pareto_arrets';
           } else if (agentId === 'DAT-03' && (cmd.includes('trg') || cmd.includes('taux'))) {
              extractedAction = 'get_trg_dashboard';
           } else if (agentId === 'DAT-03' && (cmd.includes('export') || cmd.includes('navire'))) {
              extractedAction = 'get_export_dashboard';
           }
        }

        let finalMessage = { ...loadingMsg, isStreaming: false, text: fullResponse };
        
        // --- Execute Actions and Inject Widgets ---
        if (extractedAction) {
           try {
               if (extractedAction === 'run_planning' || extractedAction === 'run_simulation') {
                   const isSim = extractedAction === 'run_simulation';
                   const apiParams = { ...extractedParams };
                   
                   if (isSim) {
                      let { scenario_type, scenario_target } = apiParams;
                      if (!scenario_type) scenario_type = 'WEATHER_ALERT';
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
                   const horizon = extractedParams?.horizon || 48;
                   const hours = Array.from({ length: horizon }, (_, i) => i);
                   
                   const computeCost = (lots) => lots.reduce((acc, l) => l.scheduled && l.attente > 0 ? acc + l.attente * 1000 : acc, 0);
                   const simCost = computeCost(lots);

                   finalMessage.component = 'gantt';
                   if (isSim) {
                       finalMessage.simMetrics = { cost: simCost, wait: metrics.total_attente, congestion: metrics.quay_occupancy };
                   }
                   finalMessage.planData = { lots, hours, poste_totals: metrics.poste_totals || {}, metrics };
               }
               else if (extractedAction === 'launch_roundtable') {
                   const RT_AGENTS = [
                     { id: 'OPT-01', name: 'Stratège Flux' },
                     { id: 'ANL-02', name: 'Analyste Fiabilité' },
                     { id: 'DAT-03', name: 'Le Statisticien' },
                     { id: 'INF-04', name: 'Ingénieur Infrastructure' }
                   ];
                   const roundtableData = [];
                   for (const agent of RT_AGENTS) {
                       const agentHistory = useJarvisStore.getState().messages[agent.id] || [];
                       const historyText = agentHistory.map(m => `${m.sender}: ${m.text}`).join('\n').slice(-1000);
                       const prompt = agentHistory.length > 1 
                         ? `Fais un résumé très concis et professionnel (max 3 phrases) de ton historique de discussion récent avec l'utilisateur ci-dessous :\n\n${historyText}`
                         : `Fais un résumé très concis de ton état actuel. Il n'y a pas eu d'interaction récente avec l'utilisateur.`;
                       try {
                           const res = await fetch('http://127.0.0.1:8000/api/agent/chat', {
                               method: 'POST', headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ message: prompt, history: [], agent_id: agent.id })
                           }).then(r => r.json());
                           roundtableData.push({ agentId: agent.id, name: agent.name, response: res.response });
                       } catch (e) {
                           roundtableData.push({ agentId: agent.id, name: agent.name, response: "❌ Erreur de connexion." });
                       }
                   }
                   finalMessage.component = 'orc_roundtable';
                   finalMessage.roundtableData = roundtableData;
                   finalMessage.text = "🔄 **Table Ronde terminée**. Voici les résumés des agents :";
               }
               else if (extractedAction === 'run_benchmark') {
                   const benchRes = await api.runBenchmark(extractedParams);
                   finalMessage.component = 'benchmark_table';
                   finalMessage.benchData = { results: benchRes.results || [] };
               }
               else if (extractedAction === 'show_cartography') {
                   finalMessage.component = 'cartography';
               }
               else if (extractedAction === 'get_trg_dashboard' || extractedAction === 'get_pareto_arrets' || extractedAction === 'get_export_dashboard' || extractedAction === 'get_arrets_axe') {
                   const rawTrg = extractedParams?.trg_data || [];
                   const rawArrets = extractedParams?.arrets_data || [];
                   const rawExport = extractedParams?.export_data || [];
                   
                   if (extractedAction === 'get_trg_dashboard') {
                     const chartData = rawTrg.map(r => ({ date: r.date, semaine: r.semaine, 'Axe 1': r.axe_1!=null?parseFloat((r.axe_1*100).toFixed(2)):null, 'Axe 2': r.axe_2!=null?parseFloat((r.axe_2*100).toFixed(2)):null, 'Axe 3': r.axe_3!=null?parseFloat((r.axe_3*100).toFixed(2)):null, 'Axe 4': r.axe_4!=null?parseFloat((r.axe_4*100).toFixed(2)):null, total_charge: r.total_charge }));
                     finalMessage.component = 'trg_dashboard';
                     finalMessage.trgData = chartData;
                   } else if (extractedAction === 'get_pareto_arrets') {
                     const byC = {}; rawArrets.forEach(r=>{ const c=r.cause||'Inconnu'; byC[c]=(byC[c]||0)+(r.duree_h||0); });
                     const sorted = Object.entries(byC).sort((a,b)=>b[1]-a[1]).slice(0,12);
                     const total = sorted.reduce((s,[,v])=>s+v,0); let cum=0;
                     finalMessage.component = 'pareto_arrets';
                     finalMessage.paretoData = sorted.map(([cause,duree])=>{ cum+=duree; return { cause:cause.length>18?cause.slice(0,16)+'…':cause, duree:parseFloat(duree.toFixed(2)), cumul:parseFloat(((cum/total)*100).toFixed(1)) }; });
                   } else if (extractedAction === 'get_export_dashboard') {
                     const byQual={},byDest={}; let totalTonnage=0;
                     rawExport.forEach(r=>{ const q=r.famille_qualite||r.qualite||'Autre'; byQual[q]=(byQual[q]||0)+(r.tonnage_bl||0); const d=r.destination||'Inconnu'; byDest[d]=(byDest[d]||0)+(r.tonnage_bl||0); totalTonnage+=r.tonnage_bl||0; });
                     finalMessage.component = 'export_dashboard';
                     finalMessage.exportData = { total: rawExport.length, qualPie: Object.entries(byQual).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value:Math.round(value)})), destBar: Object.entries(byDest).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value:Math.round(value)})), totalTonnage };
                   } else if (extractedAction === 'get_arrets_axe') {
                     finalMessage.component = 'arrets_axe';
                     finalMessage.arretsData = rawArrets;
                     finalMessage.axeFilter = extractedParams?.axe_filter || '';
                   }
               }
           } catch(e) { console.error("Agent Action API error", e); }
        }

        setAgentMessages(agentId, [...(useJarvisStore.getState().messages[agentId] || []).slice(0, -1), finalMessage]);
        isProcessingRef.current = false;
        
        const firstSentence = fullResponse.split(/[.?!]/)[0];
        const shortSummary = firstSentence ? firstSentence.substring(0, 150) : "Task completed.";
        speakJarvis(shortSummary); 
        
    }).catch(err => {
        if (err.name !== 'AbortError') {
          setAgentMessages(agentId, [...(useJarvisStore.getState().messages[agentId] || []).slice(0, -1), { ...loadingMsg, isStreaming: false, text: 'Connection error.' }]);
          isProcessingRef.current = false;
          speakJarvis("I encountered a connection error.");
        }
    });
  };

  if (!isOpen) return null;

  const currentMessages = activeAgent ? (messagesMap[activeAgent.id] || []) : [];

  return (
    <div className="jarvis-voice-screen" role="dialog" aria-label="Jarvis Voice Interface" aria-live="polite">
        <div className="jarvis-split-screen">
            {/* ── LEFT PANE ── */}
            <div className="jarvis-left-pane">
                 {activeAgent ? (
                    <>
                       <div className="jarvis-orb-container" style={{ transform: 'scale(1.2)', marginBottom: '32px' }}>
                          <div className={`jarvis-orb orb-${voiceState} agent-colored-orb`}
                               style={{ '--agent-r': activeAgent.color[0], '--agent-g': activeAgent.color[1], '--agent-b': activeAgent.color[2] }}>
                              <div className="jarvis-orb-inner"></div>
                              <div className="jarvis-orb-ring-1"></div>
                              <div className="jarvis-orb-ring-2"></div>
                          </div>
                          <canvas ref={canvasRef} width="300" height="100" className="jarvis-visualizer"></canvas>
                       </div>
                       
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
                          <div className="jarvis-agent-id" style={{ color: `rgb(${activeAgent.color.join(',')})`, margin: '0 0 8px 0' }}>{activeAgent.id}</div>
                          <div className="jarvis-agent-role" style={{ margin: 0 }}>{activeAgent.name}</div>
                          <div className="jarvis-status-text" style={{ position: 'relative', marginTop: '24px', bottom: 'auto' }}>
                             {voiceState.toUpperCase()}
                          </div>
                       </div>
                    </>
                 ) : (
                    <>
                       <div className="jarvis-orb-container" style={{ transform: 'scale(1.2)', marginBottom: '32px' }}>
                          <div className={`jarvis-orb orb-${voiceState}`} style={{ '--agent-r': 139, '--agent-g': 92, '--agent-b': 246 }}>
                              <div className="jarvis-orb-inner"></div>
                              <div className="jarvis-orb-ring-1"></div>
                              <div className="jarvis-orb-ring-2"></div>
                          </div>
                          <canvas ref={canvasRef} width="300" height="100" className="jarvis-visualizer"></canvas>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
                          <div className="jarvis-agent-id standby-text" style={{ margin: '0 0 8px 0' }}>STANDBY</div>
                          <div className="jarvis-agent-role standby-text" style={{ margin: 0 }}>AWAITING WAKE WORD</div>
                          <div className="jarvis-status-text" style={{ position: 'relative', marginTop: '24px', bottom: 'auto' }}>
                             {voiceState.toUpperCase()}
                          </div>
                       </div>
                    </>
                 )}
            </div>
            
            {/* ── RIGHT PANE ── */}
            <div className="jarvis-right-pane">
                <button className="jarvis-close-btn" onClick={closeJarvis}>CLOSE JARVIS</button>

                <div className="jarvis-transcript-area">
                    <div className="jarvis-transcript-box">
                        <div className="jarvis-user-said">USER</div>
                        <div className="jarvis-user-transcript">{transcriptText || "..."}</div>
                        
                        <div className="jarvis-agent-reply-box">
                            <div className="jarvis-agent-reply-label">JARVIS</div>
                            <div className="jarvis-agent-reply-text">{agentResponseText || (activeAgent ? "..." : "Welcome sir. Jarvis is ready. Say welcome Jarvis to start.")}</div>
                        </div>
                    </div>
                </div>

                <div className="jarvis-widget-area">
                    {currentMessages.length > 0 && currentMessages.map((m, idx) => (
                      <div key={idx} className={`jarvis-msg ${m.sender}`} style={{ marginBottom: 16 }}>
                        {m.sender === 'user' ? (
                          <span style={{ color: '#aaa', fontSize: 13 }}>{m.text}</span>
                        ) : (
                          <div>
                            <span style={{ color: activeAgent ? `rgb(${activeAgent.color.join(',')})` : '#fff', fontSize: 14 }}>
                              {m.text}
                            </span>
                            
                            {/* Render Result Widgets Below the Text */}
                            {m.component === 'gantt' && m.planData && (
                              <ExpandableResultPanel title={m.simMetrics ? `SIMULATION RESULTS` : `GANTT CHART — ${m.planData.metrics?.algo_used || 'PLANNING'}`} icon={m.simMetrics ? "🚨" : "📊"} color={m.simMetrics ? "#ef4444" : "#3b82f6"}>
                                 
                                 {m.simMetrics && (
                                   <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                     <MetricCard label="Surcoût Estimé" value={`$${m.simMetrics.cost?.toLocaleString() || 0}`} variant="warning" />
                                     <MetricCard label="Quay Congestion" value={`${m.simMetrics.congestion ? m.simMetrics.congestion.toFixed(1) : 0}`} unit="%" variant="danger" />
                                   </div>
                                 )}

                                 <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '16px' }}>
                                   <GanttChart 
                                     lots={m.planData.lots} 
                                     hours={m.planData.hours} 
                                     posteTotals={m.planData.poste_totals} 
                                     viewMode="continue"
                                   />
                                 </div>
                                 {m.planData.metrics && (
                                   <div style={{display:'flex', gap:'16px', marginTop:'16px'}}>
                                     <MetricCard label="Score" value={m.planData.metrics.score?.toFixed(2)} />
                                     <MetricCard label="Tonnage" value={`${m.planData.metrics.total_charge?.toLocaleString()}`} unit="T" />
                                   </div>
                                 )}
                              </ExpandableResultPanel>
                            )}

                            {m.component === 'benchmark_table' && m.benchData && (
                              <ExpandableResultPanel title="BENCHMARK RESULTS" icon="📈" color="#f87171">
                                <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse', color:'#fff' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid #444', color: '#888' }}>
                                      <th style={{ padding: '8px' }}>Algo</th>
                                      <th style={{ padding: '8px' }}>Tonnage</th>
                                      <th style={{ padding: '8px' }}>Attente</th>
                                      <th style={{ padding: '8px' }}>Score</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {m.benchData.results.map((r, i) => (
                                      <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{r.algo_name}</td>
                                        <td style={{ padding: '8px', color: '#4ade80' }}>{r.total_charge}T</td>
                                        <td style={{ padding: '8px', color: '#f87171' }}>{r.total_attente}h</td>
                                        <td style={{ padding: '8px', color: 'var(--accent-yellow)' }}>{r.score.toFixed(1)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </ExpandableResultPanel>
                            )}
                            
                            {m.component === 'cartography' && (
                              <ExpandableResultPanel title="CARTOGRAPHIE JPH" icon="🗺️" color="#a78bfa">
                                 <img src="/CARTO.png" alt="Cartography" style={{ width: '100%', borderRadius: '8px' }} />
                              </ExpandableResultPanel>
                            )}

                             {/* ── DAT-03 TRG Chart ── */}
                             {m.component === 'trg_dashboard' && m.trgData && (() => {
                               const AXE_COLORS = ['#14b8a6','#0ea5e9','#8b5cf6','#f59e0b','#ef4444','#22c55e'];
                               const axes = ['Axe 1','Axe 2','Axe 3','Axe 4'];
                               return (
                                 <ExpandableResultPanel title="TRG PAR AXE 2025" icon="📊" color="#14b8a6">
                                   <div style={{ width:'100%', height:220 }}>
                                     <ResponsiveContainer>
                                       <LineChart data={m.trgData} margin={{ top:5, right:16, left:-20, bottom:5 }}>
                                         <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                                         <XAxis dataKey="semaine" stroke="#555" fontSize={9} tickLine={false} label={{ value:'Sem.', position:'insideBottom', offset:-2, fill:'#555', fontSize:9 }} />
                                         <YAxis stroke="#555" fontSize={9} tickLine={false} domain={[-20,100]} tickFormatter={v=>`${v}%`} />
                                         <Tooltip contentStyle={{ background:'#0a0a0a', border:'1px solid #14b8a6', fontSize:'10px' }} formatter={(v,n)=>[`${v}%`,n]} />
                                         <Legend wrapperStyle={{ fontSize:'9px' }} />
                                         {axes.map((a,i)=><Line key={a} type="monotone" dataKey={a} stroke={AXE_COLORS[i]} dot={false} strokeWidth={2} connectNulls />)}
                                       </LineChart>
                                     </ResponsiveContainer>
                                   </div>
                                 </ExpandableResultPanel>
                               );
                             })()}

                             {/* ── DAT-03 Pareto Chart ── */}
                             {m.component === 'pareto_arrets' && m.paretoData && (() => {
                               return (
                                 <ExpandableResultPanel title="PARETO DES ARRÊTS" icon="📈" color="#ef4444">
                                   <div style={{ width:'100%', height:260 }}>
                                     <ResponsiveContainer>
                                       <ComposedChart data={m.paretoData} layout="vertical" margin={{ top:5, right:50, left:5, bottom:5 }}>
                                         <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                                         <XAxis type="number" stroke="#555" fontSize={9} tickLine={false} yAxisId="bar" />
                                         <XAxis type="number" stroke="#14b8a6" fontSize={9} tickLine={false} yAxisId="line" domain={[0,100]} orientation="top" tickFormatter={v=>`${v}%`} />
                                         <YAxis dataKey="cause" type="category" width={110} stroke="#555" fontSize={8} tickLine={false} axisLine={false} />
                                         <Tooltip contentStyle={{ background:'#0a0a0a', border:'1px solid #ef4444', fontSize:'10px' }} formatter={(v,n)=>n==='cumul'?[`${v}%`,n]:[`${v}h`,n]} />
                                         <Bar dataKey="duree" radius={[0,4,4,0]} barSize={13} yAxisId="bar">
                                           {m.paretoData.map((r,i)=><Cell key={i} fill={r.cumul<=80?'#ef4444':r.cumul<=95?'#f59e0b':'#0ea5e9'}/>)}
                                         </Bar>
                                         <Line type="monotone" dataKey="cumul" stroke="#14b8a6" strokeWidth={2} dot={{ r:3, fill:'#14b8a6' }} yAxisId="line" />
                                       </ComposedChart>
                                     </ResponsiveContainer>
                                   </div>
                                 </ExpandableResultPanel>
                               );
                             })()}

                             {/* ── DAT-03 Export Dashboard ── */}
                             {m.component === 'export_dashboard' && m.exportData && (() => {
                               const COLORS = ['#14b8a6','#0ea5e9','#8b5cf6','#f59e0b','#ef4444','#22c55e'];
                               return (
                                 <ExpandableResultPanel title={`EXPORTS 2025 — ${m.exportData.total} lignes`} icon="🚢" color="#0ea5e9">
                                   <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                                     <div>
                                       <div style={{ fontSize:'9px', color:'#888', marginBottom:'4px', textTransform:'uppercase' }}>Tonnage par Qualité</div>
                                       <div style={{ width:'100%', height:160 }}>
                                         <ResponsiveContainer>
                                           <PieChart><Pie data={m.exportData.qualPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} labelLine={false} label={({name,percent})=>percent>0.08?`${name.slice(0,8)} ${(percent*100).toFixed(0)}%`:''}>
                                             {m.exportData.qualPie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                           </Pie><Tooltip contentStyle={{background:'#111',border:'1px solid #0ea5e9',fontSize:'9px'}} formatter={v=>[`${(v||0).toLocaleString()}T`]}/></PieChart>
                                         </ResponsiveContainer>
                                       </div>
                                     </div>
                                     <div>
                                       <div style={{ fontSize:'9px', color:'#888', marginBottom:'4px', textTransform:'uppercase' }}>Top Destinations</div>
                                       <div style={{ width:'100%', height:160 }}>
                                         <ResponsiveContainer>
                                           <BarChart data={m.exportData.destBar} layout="vertical" margin={{left:0,right:16,top:0,bottom:0}}>
                                             <XAxis type="number" hide />
                                             <YAxis dataKey="name" type="category" width={80} stroke="#555" fontSize={8} tickLine={false} axisLine={false} />
                                             <Tooltip contentStyle={{background:'#0a0a0a',border:'1px solid #333',fontSize:'9px'}} formatter={v=>[`${(v||0).toLocaleString()}T`]}/>
                                             <Bar dataKey="value" fill="#0ea5e9" radius={[0,3,3,0]} barSize={10}>
                                               {m.exportData.destBar.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                             </Bar>
                                           </BarChart>
                                         </ResponsiveContainer>
                                       </div>
                                     </div>
                                   </div>
                                 </ExpandableResultPanel>
                               );
                             })()}
                            
                          </div>
                        )}
                      </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
