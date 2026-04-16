import React, { useRef, useState, useEffect } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaCopy } from 'react-icons/fa';
import WebRTCVideoCall from '../../services/webrtc';

const VideoCallModal = ({ open, onClose, patientName, doctorName, doctorId = null, patientId = null, onRoomCreated = null, initialRoomCode = null }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webrtcRef = useRef(null);
  const localStreamRef = useRef(null); // persist stream so it can be applied after video mounts
  const autoJoinTriggeredRef = useRef(false);
  
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, waiting, connected
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [shouldAutoJoin, setShouldAutoJoin] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  // Initialize WebRTC on mount
  useEffect(() => {
    const initializeWebRTC = async () => {
      try {
        // If no URL is provided, WebRTCVideoCall will resolve the server URL from
        // VITE_SIGNALING_SERVER or the current page host so it works across devices.
        webrtcRef.current = new WebRTCVideoCall();
        await webrtcRef.current.connect();
        
        // Register user
        const userId = patientId || `user-${Date.now()}`;
        const userName = patientName || 'User';
        await webrtcRef.current.registerUser(userId, userName);
        
        console.log('✅ WebRTC initialized for', userName);
      } catch (err) {
        console.error('Error initializing WebRTC:', err);
        setError('Failed to connect to video server');
      }
    };

    if (open && !webrtcRef.current) {
      initializeWebRTC();
    }

    return () => {
      // Cleanup on unmount
      if (webrtcRef.current && callState === 'connected') {
        webrtcRef.current.leaveRoom();
      }
    };
  }, [open, patientId, patientName, callState]);

  // Auto-fill join code if provided (from call invitation) and trigger auto-join
  useEffect(() => {
    if (initialRoomCode && callState === 'idle' && !autoJoinTriggeredRef.current) {
      setJoinCode(initialRoomCode);
      // Schedule auto-join after WebRTC is ready
      setShouldAutoJoin(true);
    }
  }, [initialRoomCode, callState]);

  // Reset auto-join flag when modal closes
  useEffect(() => {
    if (!open) {
      autoJoinTriggeredRef.current = false;
      setShouldAutoJoin(false);
    }
  }, [open]);

  // Handle local stream display — store in ref so useEffect can apply it after video mounts
  const displayLocalStream = (stream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(err => console.error('Local play error:', err));
    }
  };

  // Once the video element is in the DOM (callState changed), attach the stored stream
  useEffect(() => {
    if ((callState === 'waiting' || callState === 'connected') && localStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(err => console.error('Local play error (effect):', err));
      }
    }
  }, [callState]);

  // Handle remote stream display
  const displayRemoteStream = (stream) => {
    console.log('🎥 Displaying remote stream');
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(err => console.error('Remote play error:', err));
      setHasRemoteStream(true);
    }
  };

  // Create a new call room
  const handleCreateCall = async () => {
    setLoading(true);
    setError(null);

    try {
      // Setup remote stream handler FIRST
      webrtcRef.current.onRemoteStream = displayRemoteStream;

      // Get local stream
      const localStream = await webrtcRef.current.getLocalStream();
      displayLocalStream(localStream);

      // Create room
      const roomData = await webrtcRef.current.createRoom();
      setRoomId(roomData.roomId);
      setRoomCode(roomData.roomName);
      setCallState('waiting');
      setCameraOn(true);

      // Listen for remote participants joining
      webrtcRef.current.socket.on('room:participantJoined', (data) => {
        console.log('🎉 Participant joined:', data.participant.name);
        setRemoteParticipants(data.allParticipants.filter(p => p.socketId !== webrtcRef.current.socket.id));
        setCallState('connected');
        
        // Send offer to new participant
        webrtcRef.current.sendOffer(data.participant.socketId).catch(console.error);
      });

      // Listen for offer
      webrtcRef.current.socket.on('webrtc:offer', (data) => {
        console.log('📥 Received offer from', data.from);
        webrtcRef.current.handleOffer(data.from, data.offer).catch(console.error);
      });

      // Listen for answer
      webrtcRef.current.socket.on('webrtc:answer', (data) => {
        console.log('📥 Received answer from', data.from);
        webrtcRef.current.handleAnswer(data.from, data.answer).catch(console.error);
      });

      // Listen for ICE candidates
      webrtcRef.current.socket.on('webrtc:ice-candidate', (data) => {
        webrtcRef.current.handleIceCandidate(data.from, data.candidate).catch(console.error);
      });

      // Notify parent about room creation (for sending invitation)
      if (onRoomCreated) {
        onRoomCreated(roomData.roomName);
      }

      console.log('✅ Call room created:', roomData.roomName);
    } catch (err) {
      console.error('Error creating call:', err);
      setError(err.message || 'Failed to create call');
    } finally {
      setLoading(false);
    }
  };

  // Join an existing call room
  const handleJoinCall = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Setup remote stream handler FIRST (before any WebRTC events)
      webrtcRef.current.onRemoteStream = displayRemoteStream;

      // Get local stream
      const localStream = await webrtcRef.current.getLocalStream();
      displayLocalStream(localStream);

      // Join room by code (we'll use it as roomId)
      await webrtcRef.current.joinRoom(joinCode);

      setRoomId(joinCode);
      setRoomCode(joinCode);
      setCallState('connected');
      setCameraOn(true);

      // Listen for remote participants
      webrtcRef.current.socket.on('room:participantJoined', (data) => {
        console.log('Participant joined:', data.participant.name);
        setRemoteParticipants(data.allParticipants.filter(p => p.socketId !== webrtcRef.current.socket.id));
        
        // Send offer to new participant
        webrtcRef.current.sendOffer(data.participant.socketId).catch(console.error);
      });

      // Listen for offer
      webrtcRef.current.socket.on('webrtc:offer', (data) => {
        console.log('Received offer from', data.from);
        webrtcRef.current.handleOffer(data.from, data.offer).catch(console.error);
      });

      // Listen for answer
      webrtcRef.current.socket.on('webrtc:answer', (data) => {
        console.log('Received answer from', data.from);
        webrtcRef.current.handleAnswer(data.from, data.answer).catch(console.error);
      });

      // Listen for ICE candidates
      webrtcRef.current.socket.on('webrtc:ice-candidate', (data) => {
        webrtcRef.current.handleIceCandidate(data.from, data.candidate).catch(console.error);
      });

      console.log('✅ Joined call room:', joinCode);
    } catch (err) {
      console.error('Error joining call:', err);
      setError(err.message || 'Failed to join call');
    } finally {
      setLoading(false);
      autoJoinTriggeredRef.current = true;
    }
  };

  // Auto-join effect - triggers after WebRTC is initialized and we have a room code
  useEffect(() => {
    if (shouldAutoJoin && webrtcRef.current && joinCode && callState === 'idle' && !loading && !autoJoinTriggeredRef.current) {
      console.log('🔄 Auto-joining room:', joinCode);
      autoJoinTriggeredRef.current = true;
      setShouldAutoJoin(false);
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        handleJoinCall();
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoJoin, joinCode, callState, loading]);

  // Copy room code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // End the call
  const handleEndCall = () => {
    if (webrtcRef.current) {
      webrtcRef.current.leaveRoom();
    }

    // Stop local stream
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }

    // Stop remote stream
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setCallState('idle');
    setRoomId(null);
    setRoomCode(null);
    setRemoteParticipants([]);
    setHasRemoteStream(false);
    onClose();
  };

  // Toggle audio
  const handleToggleMic = () => {
    if (webrtcRef.current) {
      webrtcRef.current.setAudioEnabled(!micOn);
    }
    setMicOn(!micOn);
  };

  // Toggle video
  const handleToggleVideo = () => {
    if (webrtcRef.current) {
      webrtcRef.current.setVideoEnabled(!videoOn);
    }
    setVideoOn(!videoOn);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/70 animate-fadeIn">
      <div className="w-full h-full max-w-full max-h-full flex flex-col items-center justify-center">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-dark-900/40 backdrop-blur-[8px]" />

        {/* Error message with retry option */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-4 rounded-lg shadow-lg z-10 max-w-md text-center">
            <div className="mb-2">{error}</div>
            {error.includes('permission') && (
              <div className="text-sm opacity-90 mb-3">
                Click the camera icon in the address bar to allow access
              </div>
            )}
            <button
              onClick={() => {
                setError(null);
                setCallState('idle');
              }}
              className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900/40 rounded-3xl z-10">
            <div className="text-white text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Initializing video call...</p>
            </div>
          </div>
        )}

        {/* Call Interface */}
        {callState === 'idle' && (
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-white text-2xl font-bold mb-6 text-center">Video Call</h2>

            {/* Create Call */}
            <div className="mb-6">
              <button
                onClick={handleCreateCall}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                <FaVideo className="inline mr-2" /> Start New Call
              </button>
            </div>

            <div className="relative flex items-center my-6">
              <div className="flex-grow border-t border-white/20"></div>
              <span className="mx-4 text-white/60 text-sm">OR</span>
              <div className="flex-grow border-t border-white/20"></div>
            </div>

            {/* Join Call */}
            <div>
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:border-primary-400 mb-3"
              />
              <button
                onClick={handleJoinCall}
                disabled={loading || !joinCode.trim()}
                className="w-full bg-tertiary-400 hover:bg-tertiary-500 text-tertiary-900 font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                <FaPhoneSlash className="inline mr-2 rotate-180" /> Join Call
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-primary-400 text-2xl"
            >
              ✕
            </button>
          </div>
        )}

        {/* In Call Interface */}
        {(callState === 'waiting' || callState === 'connected') && (
          <div className="relative w-full max-w-4xl h-[70vh] flex flex-col items-center justify-center rounded-3xl shadow-2xl overflow-hidden bg-dark-900">
            {/* Remote Video (Full Screen) - Show when connected, hide when waiting */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hasRemoteStream ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: '#233a44' }}
            />
            
            {/* Local Video (Full when waiting, PiP when connected) */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`transition-all duration-300 object-cover ${
                hasRemoteStream 
                  ? 'absolute top-4 right-4 w-40 h-32 md:w-48 md:h-40 rounded-xl shadow-lg border-2 border-primary-400 z-20' 
                  : 'absolute inset-0 w-full h-full'
              }`}
              style={{ background: '#233a44' }}
            />

            {/* Status */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full shadow-lg z-20">
              <span className="text-white font-medium">
                {callState === 'waiting' ? '⏳ Waiting for participant...' : '✅ Connected'}
              </span>
            </div>

            {/* Room Code (when waiting) */}
            {callState === 'waiting' && roomCode && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-primary-600/90 text-white px-6 py-3 rounded-lg shadow-lg z-20 flex items-center gap-3">
                <span className="text-sm">Room: <code className="font-mono font-bold">{roomCode}</code></span>
                <button
                  onClick={handleCopyCode}
                  className="hover:bg-white/20 p-2 rounded transition"
                  title="Copy room code"
                >
                  <FaCopy size={16} />
                </button>
                {copied && <span className="text-xs">Copied!</span>}
              </div>
            )}

            {/* Controls */}
            <div className="absolute left-1/2 bottom-8 -translate-x-1/2 flex gap-8 z-20">
              <button
                onClick={handleToggleMic}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition text-2xl border-2 ${
                  micOn
                    ? 'bg-white/80 text-primary-700 border-white'
                    : 'bg-red-600 text-white border-red-700'
                }`}
                title={micOn ? 'Mute' : 'Unmute'}
              >
                {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>

              <button
                onClick={handleToggleVideo}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition text-2xl border-2 ${
                  videoOn
                    ? 'bg-white/80 text-primary-700 border-white'
                    : 'bg-yellow-600 text-white border-yellow-700'
                }`}
                title={videoOn ? 'Stop video' : 'Start video'}
              >
                {videoOn ? <FaVideo /> : <FaVideoSlash />}
              </button>

              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition bg-red-600 hover:bg-red-700 text-white text-2xl border-2 border-red-700"
                title="End call"
              >
                <FaPhoneSlash />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;
