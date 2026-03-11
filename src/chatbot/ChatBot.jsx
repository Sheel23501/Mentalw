import React, { useState, useRef, useEffect } from 'react';
import { IoMdClose } from 'react-icons/io';
import { FiSend } from 'react-icons/fi';

// Response patterns for the chatbot
const RESPONSE_PATTERNS = {
  greeting: {
    patterns: ['hi', 'hello', 'hey'],
    response: "Hello! How are you feeling today?"
  },
  help: {
    patterns: ['help', 'support', 'need help'],
    response: "I'm here to listen and support you. Would you like to talk about what's on your mind?"
  },
  sadness: {
    patterns: ['sad', 'depressed', 'unhappy', 'down'],
    response: "I'm sorry to hear that you're feeling this way. Remember, it's okay to feel sad sometimes. Would you like to talk more about what's bothering you?"
  },
  anxiety: {
    patterns: ['anxious', 'anxiety', 'worried', 'stress'],
    response: "Anxiety can be really challenging. Let's take a moment to breathe together. Would you like to try some calming exercises?"
  },
  default: {
    response: "I'm here to listen and support you. Could you tell me more about how you're feeling?"
  }
};

// Remove API_KEY and fetch logic, and update getBotResponse for more natural, context-aware replies and complex question detection

const COMPLEX_KEYWORDS = [
  'diagnose', 'prescribe', 'medical advice', 'analyze', 'complex', 'report', 'treatment', 'therapy', 'doctor', 'appointment', 'AI', 'GPT', 'OpenAI', 'code', 'program', 'calculate', 'math', 'solve', 'research', 'study', 'statistics', 'data', 'disease', 'condition', 'symptom', 'test', 'result', 'prescription', 'medication', 'medicine', 'pharmacy', 'hospital', 'specialist', 'refer', 'emergency', 'urgent', 'critical', 'difficult', 'advanced', 'future', 'under development', 'hard'
];

// Expand CONVO_RESPONSES with more nuanced, empathetic, and context-aware responses
const CONVO_RESPONSES = [
  {
    patterns: ['hi', 'hello', 'hey'],
    responses: [
      "Hello! I'm here to support you. How are you feeling today?",
      "Hi there! Whenever you're ready, you can share what's on your mind.",
      "Hey! If there's anything you'd like to talk about, I'm here to listen."
    ]
  },
  {
    patterns: ['sad', 'depressed', 'unhappy', 'down'],
    responses: [
      "I'm really sorry you're feeling this way. If you'd like, you can tell me more about what's been bothering you.",
      "Thank you for opening up. Would you like to talk about what's making you feel this way?",
      "It's okay to feel down sometimes. If you want to share more, I'm here for you."
    ]
  },
  {
    patterns: ['anxious', 'anxiety', 'worried', 'stress'],
    responses: [
      "Anxiety can be tough. If you want, we can try a calming exercise together or talk about what's making you anxious.",
      "I'm here for you. Would you like to share what's been on your mind lately?",
      "If you're feeling stressed, sometimes talking about it can help. Would you like to try?"
    ]
  },
  {
    patterns: ['help', 'support', 'need help'],
    responses: [
      "Of course, I'm here to help. Is there something specific you'd like to talk about or get support with?",
      "You can share anything with me, and I'll do my best to support you. What's been going on?",
      "I'm always here to listen. If you want to talk about your feelings or a situation, I'm here."
    ]
  },
  {
    patterns: ['thank', 'thanks', 'thank you'],
    responses: [
      "You're very welcome. Remember, you're not alone in this.",
      "I'm glad I could help. If you want to talk more, I'm here for you.",
      "Anytime. Take care of yourself, and reach out whenever you need support."
    ]
  },
  {
    patterns: ['how are you feeling today', 'how are you today', 'how do you feel'],
    responses: [
      "Thank you for asking. I'm here to listen to you—how are you feeling today?",
      "I'm here to support you. How are you feeling right now?",
      "I'm just a helper, but I'm always ready to listen if you want to talk about your feelings."
    ]
  },
  {
    patterns: ['lonely', 'alone', 'isolated'],
    responses: [
      "Feeling lonely can be really hard. If you want to talk about it, I'm here for you.",
      "You're not alone, even if it feels that way. Would you like to share more about what's making you feel this way?",
      "Thank you for sharing. Sometimes reaching out is the first step to feeling better."
    ]
  },
  {
    patterns: ['angry', 'frustrated', 'irritated'],
    responses: [
      "Anger is a valid emotion. If you want to talk about what's causing it, I'm here to listen.",
      "It's okay to feel frustrated. Sometimes expressing it can help. Would you like to share more?",
      "If you're comfortable, we can talk about what's making you feel this way."
    ]
  },
  {
    patterns: ['happy', 'good', 'better', 'improved'],
    responses: [
      "I'm glad to hear you're feeling better. If you want to talk about what helped, I'm here to listen.",
      "That's wonderful! Would you like to share what's been going well?",
      "It's great to hear some positivity. If you want to share more, I'm here."
    ]
  },
  {
    patterns: ['breathe', 'breathing', 'exercise'],
    responses: [
      "Let's try a simple breathing exercise together: Inhale slowly for 4 seconds, hold for 4, and exhale for 6. Would you like to do a few rounds?",
      "Breathing exercises can help. If you want, I can guide you through one now.",
      "If you'd like, we can do a calming exercise together. Just let me know."
    ]
  }
];

function getBotResponse(message) {
  const lowerMessage = message.toLowerCase();
  // Check for complex keywords
  if (COMPLEX_KEYWORDS.some(keyword => lowerMessage.includes(keyword))) {
    return "I'm still learning to handle complex requests like that. This feature is under development, but I'm here to listen and support you!";
  }
  // Check for conversational patterns
  for (const { patterns, responses } of CONVO_RESPONSES) {
    if (patterns.some(pattern => lowerMessage.includes(pattern))) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  // Fallback
  const fallbackReplies = [
    "I'm here to listen. Could you tell me more about how you're feeling?",
    "Thank you for sharing. Would you like to talk more about it?",
    "I'm always here for you. Feel free to share anything on your mind."
  ];
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}

// Improve getSuggestedMessage for more logical, supportive suggestions
function getSuggestedMessage(messages) {
  const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
  if (!lastUserMsg) return 'I want to talk about my feelings.';
  const text = lastUserMsg.text.toLowerCase();
  if (/(hi|hello|hey)/.test(text)) return 'I’ve been feeling a bit off lately.';
  if (/(sad|depressed|unhappy|down)/.test(text)) return 'It’s been hard to cope with these feelings.';
  if (/(anxious|anxiety|worried|stress)/.test(text)) return 'Sometimes my thoughts race and I can’t relax.';
  if (/(help|support|need help)/.test(text)) return 'I’m not sure where to start, but I need someone to listen.';
  if (/(lonely|alone|isolated)/.test(text)) return 'I wish I felt more connected to others.';
  if (/(angry|frustrated|irritated)/.test(text)) return 'I get upset easily these days.';
  if (/(happy|good|better|improved)/.test(text)) return 'I’m grateful for the good moments.';
  if (/(breathe|breathing|exercise)/.test(text)) return 'Can you guide me through a breathing exercise?';
  return 'I’d like to share more about what I’m going through.';
}

const ChatBot = () => {
  const [messages, setMessages] = useState([
    { 
      text: "Hi! I'm your mental health assistant. How can I help you today?", 
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // In handleSendMessage, remove fetch and use getBotResponse
  const handleSendMessage = async (e, messageText = null) => {
    if (e) {
      e.preventDefault();
    }
    const messageToSend = messageText || inputMessage.trim();

    if (messageToSend) {
      const userMessage = {
        text: messageToSend,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsTyping(true);
      setLoading(true);
      setTimeout(() => {
        const aiText = getBotResponse(messageToSend);
        setMessages(prev => [...prev, {
          text: aiText,
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        setLoading(false);
      }, 900 + Math.random() * 600); // Simulate typing delay
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickReplies = ["How are you feeling today?", "I need help", "I'm feeling sad", "Tell me about anxiety relief"];

  const suggestion = getSuggestedMessage(messages);

  return (
    <div ref={chatRef} className="fixed bottom-0 right-0 z-50">
      {/* Floating Bot Button */}
      <div 
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 transition-transform duration-300 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        onClick={() => setIsOpen(true)}
      >
        <img 
          src="/Bot.png" 
          alt="Chat Bot" 
          className="h-24 sm:h-36 cursor-pointer animate-float"
        />
      </div>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-0 right-0 w-full sm:w-auto transition-all duration-300 p-3 sm:p-10 rounded-2xl ${
          isOpen 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-[65vh] w-full sm:max-h-[80vh] sm:max-w-[350px] lg:max-w-[500px] bg-white rounded-xl border border-gray-200 shadow-2xl">
          {/* Header */}
          <div className="p-4 bg-green-600 text-white rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img 
                src="/Bot.png" 
                alt="Bot Avatar" 
                className="w-8 h-8 rounded-full"
              />
              <div>
                <h2 className="text-lg font-semibold">Mental Health Assistant</h2>
                <p className="text-xs text-green-100">Online</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-green-100 transition-colors"
              aria-label="Close chat"
            >
              <IoMdClose size={24} />
            </button>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-2xl max-w-[75%] ${
                    message.sender === 'user'
                      ? 'bg-green-600 text-white rounded-tr-none border border-green-500'
                      : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                  <span className={`text-xs mt-1 block ${
                    message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="text-left mb-4">
                <div className="inline-block p-3 rounded-2xl bg-white text-gray-800 rounded-tl-none shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-2xl">
            <div className="mb-3 text-center">
              <button
                type="button"
                className="inline-block bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:bg-green-100 transition-colors"
                onClick={e => handleSendMessage(e, suggestion)}
                tabIndex={0}
              >
                {suggestion}
              </button>
            </div>
            {window.innerWidth < 768 ? ( // Check for mobile view
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => handleSendMessage(e, reply)}
                      className="px-3.5 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-gray-500 italic mt-2">Voice to chat (under development)</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-3 border border-gray-200 rounded-full focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  aria-label="Message input"
                />
                <button
                  type="submit"
                  className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!inputMessage.trim() || loading}
                  aria-label="Send message"
                >
                  <FiSend size={20} />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBot; 