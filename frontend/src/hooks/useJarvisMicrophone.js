import { useRef, useCallback, useState, useEffect } from 'react';

export function useJarvisMicrophone({
  isSpeakingRef,
  onTranscriptionResult,
  onError,
  setVoiceStatus
}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  
  // For visualizer
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const setupVisualizer = async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);
      }
    } catch (err) {
      console.error("Visualizer audio setup failed:", err);
    }
  };

  const startListening = useCallback(async () => {
    if (isSpeakingRef.current) return; // Prevent echoing TTS

    // Setup visualizer if not already
    await setupVisualizer();

    // Stop existing recognition safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Prevent trigger loops
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      if (onError) onError(new Error("SpeechRecognition not supported"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false; // We restart manually after each phrase/command
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('listening');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      
      if (onTranscriptionResult && transcript.trim()) {
        onTranscriptionResult(transcript);
      } else {
        // If empty, just restart
        setTimeout(() => startListening(), 200);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Automatically restart if we're not speaking
      if (!isSpeakingRef.current) {
        setTimeout(() => startListening(), 200);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      // Restart on non-fatal errors
      if (event.error === 'no-speech' || event.error === 'network') {
         setTimeout(() => {
             if (!isSpeakingRef.current) startListening();
         }, 200);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      console.error("Error starting recognition", err);
    }
    
  }, [isSpeakingRef, onTranscriptionResult, setVoiceStatus, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const destroy = useCallback(() => {
    stopListening();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stopListening]);

  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    startListening,
    stopListening,
    isListening,
    analyser: analyserRef.current
  };
}
