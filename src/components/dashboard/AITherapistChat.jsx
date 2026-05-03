import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiMessageCircle, FiMic, FiMicOff, FiVolume2, FiVolumeX, FiAlertTriangle } from 'react-icons/fi';
import { BsRobot } from 'react-icons/bs';
import { FaBrain, FaHeart } from 'react-icons/fa';
import { getGeminiResponse, resetConversationTracking } from '../../services/gemini';
import { useEmotionMonitor } from '../../utils/useEmotionMonitor';
import { toFriendlyLabel } from '../../utils/emotionLabels';
import { useVoiceAssistant } from '../../utils/useVoiceAssistant';
import EscalationModal from './EscalationModal';
import Gad7Modal from './Gad7Modal';
import { saveGad7Result, startAISession, endAISession, logAIChatMessage } from '../../services/firestore';

// Helper to get emoji for emotion
const getEmotionEmoji = (emotion) => {
  const emojiMap = {
    happy: '😊', sad: '😢', angry: '😠', fear: '😨',
    surprised: '😲', neutral: '😐', disgust: '🤢', unknown: '❓',
    stressed: '😰', anxious: '😟', overwhelmed: '😩', lonely: '😔',
    hopeless: '😞', exhausted: '🥱', grateful: '🙏', hopeful: '🌟',
    confused: '🤔', frustrated: '😤',
  };
  return emojiMap[emotion?.toLowerCase()] || '🎭';
};

const AITherapistChat = ({ autoOpen = false, onNavigateToDoctors, currentUser }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hey! I'm so glad you're here 💛 Whatever's on your mind — big or small — I want to hear it. How are you doing today? Like, how are you REALLY doing?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [emotionAnalysisEnabled, setEmotionAnalysisEnabled] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  
  // New: Track AI-detected emotion from text
  const [textEmotion, setTextEmotion] = useState(null);
  const [stressScore, setStressScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [currentTip, setCurrentTip] = useState(null);

  // Escalation state
  const [escalationTriggered, setEscalationTriggered] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationRiskScore, setEscalationRiskScore] = useState(0);
  const [escalationAvgRisk, setEscalationAvgRisk] = useState(0);
  const [showEscalationModal, setShowEscalationModal] = useState(false);

  // GAD-7 state
  const [showGad7Modal, setShowGad7Modal] = useState(false);
  const [gad7Context, setGad7Context] = useState(null);

  const [chatStarted, setChatStarted] = useState(false);
  const sessionIdRef = useRef(null);

  // Start/End Session tracking
  useEffect(() => {
    if (chatStarted && currentUser?.uid && !sessionIdRef.current) {
      startAISession(currentUser.uid).then(id => {
        sessionIdRef.current = id;
      });
    }
  }, [chatStarted, currentUser]);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        endAISession(sessionIdRef.current);
      }
    };
  }, []);

  // Initial GAD-7 check on button click instead of mount
  const handleStartConversation = () => {
    if (currentUser) {
      const lastDate = currentUser.lastGad7Date;
      const daysSince = lastDate ? (new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24) : 999;
      if (daysSince > 14) {
        setShowGad7Modal(true);
        return;
      }
    } else {
      // If no user profile loaded yet, just show it to be safe (or based on your auth logic)
      setShowGad7Modal(true);
      return;
    }
    
    setChatStarted(true);
  };

  const handleGad7Complete = async (score, severity, answers) => {
    if (currentUser?.uid) {
      try {
        await saveGad7Result(currentUser.uid, score, severity, answers);
      } catch (err) {
        console.error("Failed to save GAD-7:", err);
      }
    }
    setGad7Context({ score, severity });
    setShowGad7Modal(false);
    setChatStarted(true); // Now start the chat!

    if (score >= 15) {
      setEscalationTriggered(true);
      setEscalationRiskScore(score);
      setEscalationReason('Severe Anxiety detected on GAD-7 assessment');
      setShowEscalationModal(true);
    }
  };

  // Voice assistant hook
  const {
    isSpeaking,
    isListening,
    transcript,
    interimTranscript,
    voiceEnabled,
    canSpeak,
    canListen,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    setVoiceEnabled,
    clearTranscript,
  } = useVoiceAssistant();

  // Emotion monitoring hook
  useEmotionMonitor({
    enabled: emotionAnalysisEnabled && isOpen,
    intervalMs: 5000,
    onResult: (res) => {
      const emotion = toFriendlyLabel(res?.aggregated?.emotion || res?.faces?.[0]?.emotion || 'unknown');
      setDetectedEmotion(emotion);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Speak AI responses when voice is enabled
  useEffect(() => {
    if (voiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !lastMessage.isError) {
        speak(lastMessage.content);
      }
    }
  }, [messages, voiceEnabled, speak]);

  // Handle voice transcript - set as input when user stops speaking
  useEffect(() => {
    if (transcript && !isListening) {
      setInputMessage(transcript);
      clearTranscript();
    }
  }, [transcript, isListening, clearTranscript]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    // Log user message
    if (sessionIdRef.current && currentUser?.uid) {
      logAIChatMessage(sessionIdRef.current, currentUser.uid, userMessage.content, 'user', null);
    }

    try {
      // Prepare conversation history for API
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get AI response with emotion analysis and GAD-7 context
      const result = await getGeminiResponse(conversationHistory, { gad7Context });
      
      // Handle both old string format and new object format
      const aiResponseText = typeof result === 'string' ? result : result.response;
      const emotion = typeof result === 'object' ? result.emotion : null;
      const tip = typeof result === 'object' ? result.tip : null;
      const escalated = typeof result === 'object' ? result.escalated : false;
      const score = typeof result === 'object' ? result.stress_score : 0;
      const risk = typeof result === 'object' ? result.risk_level : 'LOW';
      const isEscalation = typeof result === 'object' ? result.escalation : false;
      const escReason = typeof result === 'object' ? result.escalation_reason : '';
      const escRiskScore = typeof result === 'object' ? result.risk_score : 0;
      const escAvgRisk = typeof result === 'object' ? result.avg_risk : 0;
      
      // Update text-based emotion detection
      if (emotion && emotion !== 'Unknown') {
        setTextEmotion(emotion);
      }
      if (score !== undefined) {
        setStressScore(score);
      }
      if (risk) {
        setRiskLevel(risk);
      }
      if (tip) {
        setCurrentTip(tip);
      }

      // Add AI response to chat
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
        emotion: emotion,
        escalated: escalated || isEscalation,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Log AI response
      if (sessionIdRef.current && currentUser?.uid) {
        logAIChatMessage(sessionIdRef.current, currentUser.uid, aiResponseText, 'ai', emotion);
      }

      // Handle escalation — show modal and lock chat
      if (isEscalation) {
        setEscalationTriggered(true);
        setEscalationReason(escReason);
        setEscalationRiskScore(escRiskScore);
        setEscalationAvgRisk(escAvgRisk);
        // Brief delay so user sees the escalation message first
        setTimeout(() => {
          setShowEscalationModal(true);
        }, 1500);
      }
    } catch (err) {
      console.error('Error getting AI response:', err);
      setError('Sorry, I encountered an error. Please try again.');
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickPrompts = [
    "I'm feeling anxious",
    "I need someone to talk to",
    "Help me manage stress",
    "I'm feeling overwhelmed"
  ];

  const handleQuickPrompt = (prompt) => {
    setInputMessage(prompt);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (!chatStarted) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <BsRobot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Therapist</h2>
              <p className="text-sm text-gray-500">24/7 Emotional Support</p>
            </div>
          </div>
        </div>
        
        <p className="text-gray-600 mb-4 text-sm">
          Chat with our AI therapist for immediate emotional support and guidance. 
          Available anytime you need someone to talk to.
        </p>

        <button
          onClick={handleStartConversation}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
        >
          <FiMessageCircle className="w-5 h-5" />
          Start Conversation
        </button>

        {/* Render GAD-7 Modal here so it can appear before the chat starts */}
        <Gad7Modal 
          open={showGad7Modal} 
          onComplete={handleGad7Complete} 
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-green-100 flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <BsRobot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI Therapist</h3>
            <p className="text-xs text-green-100">Online • Always here for you</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice Status Indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-1 bg-blue-400/30 px-2 py-1 rounded-lg animate-pulse">
              <FiVolume2 className="w-3 h-3" />
              <span className="text-xs">Speaking...</span>
            </div>
          )}
          {isListening && (
            <div className="flex items-center gap-1 bg-red-400/30 px-2 py-1 rounded-lg animate-pulse">
              <FiMic className="w-3 h-3" />
              <span className="text-xs">Listening...</span>
            </div>
          )}
          {/* Voice Toggle */}
          {canSpeak && (
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setVoiceEnabled(!voiceEnabled);
              }}
              className={`${voiceEnabled ? 'bg-blue-400 text-white' : 'bg-white/20 text-white'} hover:bg-white/30 p-2 rounded-full transition`}
              title={voiceEnabled ? 'Disable Voice Output' : 'Enable Voice Output'}
            >
              {voiceEnabled ? <FiVolume2 className="w-4 h-4" /> : <FiVolumeX className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => {
              setIsOpen(false);
              resetConversationTracking(); // Reset escalation when closing
            }}
            className="text-white hover:text-green-100 transition-colors p-1"
            aria-label="Minimize chat"
          >
            <FiX size={24} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-green-50/30 to-white space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-sm'
                  : message.isError
                  ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                  : 'bg-white text-gray-800 border border-green-100 shadow-sm rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
              <span
                className={`text-xs mt-1 block ${
                  message.role === 'user' ? 'text-green-100' : 'text-gray-400'
                }`}
              >
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white text-gray-800 border border-green-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-200">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 py-3 bg-green-50/50 border-t border-green-100">
          <p className="text-xs text-gray-600 mb-2 font-medium">Quick prompts:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-xs bg-white text-green-700 px-3 py-1.5 rounded-full border border-green-200 hover:bg-green-50 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Escalation Banner — shown when chat is locked */}
      {escalationTriggered && (
        <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 border-t border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0" style={{ animation: 'pulse 2s infinite' }}>
              <FiAlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Chat escalated to a doctor</p>
              <p className="text-xs text-red-600">For your safety, this conversation has been paused.</p>
            </div>
            <button
              onClick={() => setShowEscalationModal(true)}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full transition-colors"
            >
              View Doctors
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="px-4 py-4 bg-white border-t border-green-100">
        {/* Voice Input Transcript Display */}
        {(isListening || interimTranscript) && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <FiMic className="w-4 h-4 animate-pulse" />
              <span>{interimTranscript || 'Listening...'}</span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {/* Microphone Button */}
          {canListen && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading || isSpeaking || escalationTriggered}
              className={`${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} p-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${isListening ? 'text-white' : ''}`}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              title={escalationTriggered ? 'Chat has been escalated' : isListening ? 'Stop listening' : 'Speak your message'}
            >
              {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={escalationTriggered ? "Chat has been escalated to a doctor..." : isListening ? "Listening..." : "Type or speak your message..."}
            className={`flex-1 border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent text-sm ${escalationTriggered ? 'border-red-200 bg-red-50/30 text-red-400 cursor-not-allowed focus:ring-red-300' : 'border-green-200 bg-green-50/30 focus:ring-green-400'}`}
            disabled={isLoading || isListening || escalationTriggered}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || escalationTriggered}
            className={`${escalationTriggered ? 'bg-gray-400' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'} text-white px-6 py-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center`}
            aria-label="Send message"
          >
            <FiSend size={18} />
          </button>
        </div>
        {/* Voice Mode Hint */}
        {voiceEnabled && !escalationTriggered && (
          <p className="text-xs text-center text-green-600 mt-2">
            🔊 Voice mode enabled - AI will speak responses
          </p>
        )}
      </form>
      {/* GAD-7 Modal */}
      <Gad7Modal 
        open={showGad7Modal} 
        onComplete={handleGad7Complete} 
      />
      {/* Escalation Modal */}
      <EscalationModal
        open={showEscalationModal}
        onClose={() => setShowEscalationModal(false)}
        riskScore={escalationRiskScore}
        avgRisk={escalationAvgRisk}
        reason={escalationReason}
        emotion={textEmotion || 'Unknown'}
        chatHistory={messages.map(m => ({ role: m.role, content: m.content }))}
        onDoctorSelected={(doctor) => {
          setShowEscalationModal(false);
          // Navigate to doctors tab if callback provided
          if (onNavigateToDoctors) {
            onNavigateToDoctors(doctor);
          }
        }}
        patientId={null} // Will be passed from parent
        patientName={null}
      />
    </div>
  );
};

export default AITherapistChat;
