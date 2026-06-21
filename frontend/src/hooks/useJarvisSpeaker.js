import { useRef, useCallback, useEffect } from 'react';

export function useJarvisSpeaker({ 
  onSpeechEnd, 
  setVoiceStatus 
}) {
  const isSpeakingRef = useRef(false);
  const synth = window.speechSynthesis;

  const speakShortResponse = useCallback((text, callback) => {
    if (!synth) return;
    
    // Stop any ongoing speech
    synth.cancel();
    
    // Set status to speaking
    setVoiceStatus('speaking');
    isSpeakingRef.current = true;
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Use an English voice for Jarvis effect if available, or default
    const voices = synth.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.lang === 'en-GB');
    if (jarvisVoice) {
      utterance.voice = jarvisVoice;
    }
    
    utterance.pitch = 0.9;
    utterance.rate = 1.05;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setVoiceStatus('listening');
      if (onSpeechEnd) onSpeechEnd();
      if (callback) callback();
    };
    
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setVoiceStatus('listening');
      if (onSpeechEnd) onSpeechEnd();
    };

    synth.speak(utterance);
  }, [setVoiceStatus, onSpeechEnd, synth]);

  const stopSpeaking = useCallback(() => {
    if (synth && synth.speaking) {
      synth.cancel();
      isSpeakingRef.current = false;
      setVoiceStatus('listening');
      if (onSpeechEnd) onSpeechEnd();
    }
  }, [synth, setVoiceStatus, onSpeechEnd]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (synth) synth.cancel();
    };
  }, [synth]);

  return {
    isSpeakingRef,
    speakShortResponse,
    stopSpeaking
  };
}
