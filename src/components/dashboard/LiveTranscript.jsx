import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaClosedCaptioning, FaChevronDown, FaChevronUp } from 'react-icons/fa';

/**
 * LiveTranscript Component
 * 
 * Handles local speech-to-text using Web Speech API and displays 
 * real-time transcript from both participants.
 */
const LiveTranscript = ({ 
  socket, 
  roomId, 
  userRole, 
  userName,
  onTranscriptChange // callback to parent with the full collected transcript
}) => {
  const [segments, setSegments] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const segmentsRef = useRef([]); // use ref to avoid closure issues in callbacks

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, isExpanded]);

  const addSegment = useCallback((newSegment) => {
    const updated = [...segmentsRef.current, newSegment];
    segmentsRef.current = updated;
    setSegments(updated);
    if (onTranscriptChange) {
      const fullText = updated.map(s => `${s.speaker}: ${s.text}`).join('\n');
      onTranscriptChange(fullText, updated);
    }
  }, [onTranscriptChange]);

  // Listen for transcript segments from the other participant
  useEffect(() => {
    if (!socket) return;

    const handleRemoteSegment = (segment) => {
      console.log('📥 Received remote transcript segment:', segment);
      addSegment(segment);
    };

    socket.on('transcript:segment', handleRemoteSegment);
    return () => socket.off('transcript:segment', handleRemoteSegment);
  }, [socket, addSegment]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        const newSegment = {
          speaker: userRole === 'doctor' ? 'Doctor' : 'Patient',
          text: finalTranscript.trim(),
          timestamp: new Date().toISOString(),
          isFinal: true
        };
        
        addSegment(newSegment);
        
        // Broadcast to other participant
        if (socket && roomId) {
          socket.emit('transcript:segment', { roomId, segment: newSegment });
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') return;
      setIsListening(false);
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening
      if (isListening) {
        try { recognition.start(); } catch(e) {}
      }
    };

    recognitionRef.current = recognition;

    // Start listening
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [socket, roomId, userRole, addSegment]);

  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '600px',
      zIndex: 30,
      transition: 'all 0.3s ease',
    }}>
      {/* Header/Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '8px 16px',
          borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: 'white',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaClosedCaptioning style={{ color: '#38bdf8' }} />
          <span>Live Transcript</span>
          {isListening && (
            <span style={{ display: 'flex', gap: '2px' }}>
              <span style={{ width: '3px', height: '12px', background: '#10b981', animation: 'eq 1s infinite 0.1s' }} />
              <span style={{ width: '3px', height: '12px', background: '#10b981', animation: 'eq 1s infinite 0.3s' }} />
              <span style={{ width: '3px', height: '12px', background: '#10b981', animation: 'eq 1s infinite 0.5s' }} />
            </span>
          )}
        </div>
        {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
      </div>

      {/* Segments List */}
      {isExpanded && (
        <div 
          ref={scrollRef}
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(10px)',
            height: '150px',
            overflowY: 'auto',
            padding: '12px',
            borderRadius: '0 0 12px 12px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {segments.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>
              Speaking... transcript will appear here.
            </p>
          ) : (
            segments.map((s, i) => (
              <div key={i} style={{ fontSize: '13px', lineHeight: 1.4 }}>
                <span style={{ 
                  color: s.speaker === 'Doctor' ? '#38bdf8' : '#34d399', 
                  fontWeight: 700, 
                  marginRight: '8px' 
                }}>
                  {s.speaker}:
                </span>
                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{s.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        @keyframes eq {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};

export default LiveTranscript;
