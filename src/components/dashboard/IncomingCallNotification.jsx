import React, { useEffect, useRef } from 'react';
import { FaPhone, FaPhoneSlash } from 'react-icons/fa';
import { useSocket } from '../../contexts/SocketContext';

const IncomingCallNotification = () => {
  const { incomingCall, callStatus, acceptIncomingCall, rejectIncomingCall } = useSocket();
  const audioRef = useRef(null);

  // Play a simple ringtone using Web Audio API
  useEffect(() => {
    if (callStatus !== 'ringing' || !incomingCall) return;

    let audioCtx = null;
    let intervalId = null;

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playRingTone = () => {
        // Two-tone ring
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(audioCtx.currentTime);
        osc2.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.8);
        osc2.stop(audioCtx.currentTime + 0.8);
      };

      playRingTone();
      intervalId = setInterval(playRingTone, 2000);
    } catch (e) {
      console.warn('Could not play ringtone:', e);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [callStatus, incomingCall]);

  if (callStatus !== 'ringing' || !incomingCall) return null;

  const callerName = incomingCall.callerName || 'Unknown Caller';
  const callerImage = incomingCall.callerImage || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&background=6366f1&color=fff&size=128`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Dark backdrop with blur */}
      <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-md" />

      {/* Pulsing ring animation */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated rings */}
        <div className="relative mb-8">
          <div className="absolute inset-0 w-32 h-32 -m-4 rounded-full border-2 border-green-400/30" 
               style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
          <div className="absolute inset-0 w-32 h-32 -m-4 rounded-full border-2 border-green-400/20" 
               style={{ animation: 'pulse-ring 2s ease-out infinite 0.5s' }} />
          <div className="absolute inset-0 w-32 h-32 -m-4 rounded-full border-2 border-green-400/10" 
               style={{ animation: 'pulse-ring 2s ease-out infinite 1s' }} />
          
          {/* Caller avatar */}
          <img
            src={callerImage}
            alt={callerName}
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-2xl"
            style={{ animation: 'gentle-bounce 2s ease-in-out infinite' }}
          />
        </div>

        {/* Caller info */}
        <div className="text-center mb-10">
          <h2 className="text-white text-2xl font-bold mb-2">{callerName}</h2>
          <p className="text-green-300 text-lg font-medium" style={{ animation: 'fade-pulse 1.5s ease-in-out infinite' }}>
            📹 Incoming Video Call...
          </p>
        </div>

        {/* Accept / Reject buttons */}
        <div className="flex items-center gap-16">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={rejectIncomingCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
              style={{ boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)' }}
            >
              <FaPhoneSlash className="text-white text-xl" />
            </button>
            <span className="text-white/70 text-sm font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptIncomingCall}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
              style={{ 
                boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
                animation: 'pulse-glow 1.5s ease-in-out infinite',
              }}
            >
              <FaPhone className="text-white text-xl" />
            </button>
            <span className="text-white/70 text-sm font-medium">Accept</span>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes gentle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fade-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.7); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default IncomingCallNotification;
