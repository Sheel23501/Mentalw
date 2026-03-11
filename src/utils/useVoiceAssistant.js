/**
 * useVoiceAssistant - React hook for voice input/output
 * 
 * Uses Browser Web Speech API (free) with optional Hugging Face fallback
 * 
 * Features:
 * - Text-to-Speech (TTS): Speak AI responses
 * - Speech-to-Text (STT): Voice input from user
 * - Voice activity detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Voice API endpoint (FastAPI backend)
const VOICE_API_URL = 'http://localhost:8000';

/**
 * Check if browser supports speech synthesis
 */
const isSpeechSynthesisSupported = () => {
  return 'speechSynthesis' in window;
};

/**
 * Check if browser supports speech recognition
 */
const isSpeechRecognitionSupported = () => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

/**
 * Custom hook for voice assistant functionality
 */
export function useVoiceAssistant() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.abort();
    };
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Select a nice default voice (prefer female English voice)
      const preferred = voices.find(v => 
        v.lang.startsWith('en') && v.name.toLowerCase().includes('samantha')
      ) || voices.find(v => 
        v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
      ) || voices.find(v => 
        v.lang.startsWith('en-US')
      ) || voices[0];
      
      setSelectedVoice(preferred);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /**
   * Speak text using Web Speech API
   */
  const speak = useCallback(async (text, options = {}) => {
    if (!text || !isSpeechSynthesisSupported()) {
      console.warn('Cannot speak: no text or speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice
      utterance.voice = selectedVoice;
      utterance.rate = options.rate || 0.9; // Slightly slower for clarity
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setError(`Speech error: ${event.error}`);
        reject(event.error);
      };
      
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    });
  }, [selectedVoice]);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (isSpeechSynthesisSupported()) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }
    
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setError('Failed to start voice input');
    }
  }, []);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  /**
   * Toggle voice enabled state
   */
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => !prev);
    if (isSpeaking) {
      stopSpeaking();
    }
  }, [isSpeaking, stopSpeaking]);

  /**
   * Speak using Hugging Face API (fallback)
   */
  const speakWithHF = useCallback(async (text) => {
    try {
      const response = await fetch(`${VOICE_API_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error('TTS API failed');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (e) {
      console.error('HF TTS failed:', e);
      // Fallback to browser TTS
      await speak(text);
    }
  }, [speak]);

  return {
    // State
    isSpeaking,
    isListening,
    transcript,
    interimTranscript,
    error,
    voiceEnabled,
    availableVoices,
    selectedVoice,
    
    // Capabilities
    canSpeak: isSpeechSynthesisSupported(),
    canListen: isSpeechRecognitionSupported(),
    
    // Actions
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleVoice,
    setSelectedVoice,
    setVoiceEnabled,
    speakWithHF,
    
    // Utilities
    clearTranscript: () => {
      setTranscript('');
      setInterimTranscript('');
    },
    clearError: () => setError(null),
  };
}

export default useVoiceAssistant;
