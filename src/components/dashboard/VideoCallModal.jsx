import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaCopy } from 'react-icons/fa';
import { useSocket } from '../../contexts/SocketContext';

/**
 * VideoCallModal
 * 
 * IMPORTANT: This component reuses the GLOBAL socket from SocketContext.
 * It does NOT create its own WebRTCVideoCall / socket connection.
 * This ensures the userId→socketId mapping on the server is never overwritten.
 *
 * Supports two flows:
 * 1. Manual flow: User clicks "Start New Call" or enters a room code to join
 * 2. Direct call flow: Initiated via SocketContext (startCall / acceptIncomingCall)
 *    - Outgoing: `isDirectCall=true` + `directCallRoomId` → auto-creates room, shows "Calling..."
 *    - Incoming (accepted): `initialRoomCode` → auto-joins the room
 */
const VideoCallModal = ({ 
  open, 
  onClose, 
  patientName, 
  doctorName, 
  doctorId = null, 
  patientId = null, 
  onRoomCreated = null, 
  initialRoomCode = null,
  // Direct call props
  isDirectCall = false,
  directCallRoomId = null,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const autoJoinTriggeredRef = useRef(false);
  const directCallTriggeredRef = useRef(false);
  const listenersSetupRef = useRef(false);
  const retryTimerRef = useRef(null);
  
  const { callStatus, endCall: endGlobalCall, outgoingCall, cancelOutgoingCall, getWebRTC } = useSocket();

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, calling, waiting, connected
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  // Track local stream separately so we can stop it on close
  const localStreamRef = useRef(null);

  // Helper: get the shared WebRTC instance (may be null briefly during init)
  const getSharedWebRTC = useCallback(() => {
    return getWebRTC();
  }, [getWebRTC]);

  // ====== Cleanup on close ======
  useEffect(() => {
    if (!open) {
      // Reset all state when modal closes
      autoJoinTriggeredRef.current = false;
      directCallTriggeredRef.current = false;
      listenersSetupRef.current = false;
      
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // Leave room on the shared WebRTC
      const webrtc = getSharedWebRTC();
      if (webrtc && (callState === 'connected' || callState === 'waiting' || callState === 'calling')) {
        try { webrtc.leaveRoom(); } catch(e) { /* ignore */ }
      }

      // Stop local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current?.srcObject) {
        remoteVideoRef.current.srcObject = null;
      }

      // Close peer connections created during this call
      if (webrtc) {
        webrtc.peerConnections.forEach(pc => pc.close());
        webrtc.peerConnections.clear();
      }
      
      setCameraOn(false);
      setCallState('idle');
      setRoomId(null);
      setRoomCode(null);
      setRemoteParticipants([]);
      setHasRemoteStream(false);
      setError(null);
      setLoading(false);
      setJoinCode('');
    }
  }, [open]);

  // ====== Handle local stream display ======
  const displayLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(err => console.error('Play error:', err));
    }
  }, []);

  // ====== Handle remote stream display ======
  const displayRemoteStream = useCallback((stream) => {
    console.log('🎥 Displaying remote stream');
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(err => console.error('Play error:', err));
      setHasRemoteStream(true);
      setCallState('connected');
    }
  }, []);

  // ====== Setup WebRTC event listeners on the SHARED socket ======
  const setupWebRTCListeners = useCallback(() => {
    const webrtc = getSharedWebRTC();
    if (!webrtc?.socket || listenersSetupRef.current) return;
    listenersSetupRef.current = true;

    webrtc.onRemoteStream = displayRemoteStream;

    webrtc.socket.on('room:participantJoined', (data) => {
      console.log('🎉 Participant joined:', data.participant?.userName);
      setRemoteParticipants(data.allParticipants.filter(p => p.socketId !== webrtc.socket.id));
      setCallState('connected');
      
      // Send offer to new participant
      webrtc.sendOffer(data.participant.socketId).catch(console.error);
    });

    webrtc.socket.on('webrtc:offer', (data) => {
      console.log('📥 Received offer from', data.from);
      webrtc.handleOffer(data.from, data.offer).catch(console.error);
    });

    webrtc.socket.on('webrtc:answer', (data) => {
      console.log('📥 Received answer from', data.from);
      webrtc.handleAnswer(data.from, data.answer).catch(console.error);
    });

    webrtc.socket.on('webrtc:ice-candidate', (data) => {
      webrtc.handleIceCandidate(data.from, data.candidate).catch(console.error);
    });

    webrtc.socket.on('room:participantLeft', (data) => {
      console.log('👋 Participant left:', data.participant?.userName);
      const webrtcNow = getSharedWebRTC();
      const remaining = data.allParticipants?.filter(p => p.socketId !== webrtcNow?.socket?.id) || [];
      setRemoteParticipants(remaining);
      if (remaining.length === 0) {
        setHasRemoteStream(false);
      }
    });
  }, [displayRemoteStream, getSharedWebRTC]);

  // ====== Remove WebRTC listeners on cleanup ======
  const removeWebRTCListeners = useCallback(() => {
    const webrtc = getSharedWebRTC();
    if (!webrtc?.socket) return;
    webrtc.socket.off('room:participantJoined');
    webrtc.socket.off('webrtc:offer');
    webrtc.socket.off('webrtc:answer');
    webrtc.socket.off('webrtc:ice-candidate');
    webrtc.socket.off('room:participantLeft');
    webrtc.onRemoteStream = null;
    listenersSetupRef.current = false;
  }, [getSharedWebRTC]);

  // Cleanup listeners when modal closes
  useEffect(() => {
    if (!open) {
      removeWebRTCListeners();
    }
  }, [open, removeWebRTCListeners]);

  // ====== Get local media stream using the shared WebRTC instance ======
  const acquireLocalStream = useCallback(async () => {
    const webrtc = getSharedWebRTC();
    if (!webrtc) throw new Error('WebRTC not initialized');
    const stream = await webrtc.getLocalStream();
    displayLocalStream(stream);
    setCameraOn(true);
    return stream;
  }, [getSharedWebRTC, displayLocalStream]);

  // ====== DIRECT OUTGOING CALL: auto-create room and wait ======
  useEffect(() => {
    if (!open || !isDirectCall || !directCallRoomId || directCallTriggeredRef.current) return;

    const webrtc = getSharedWebRTC();
    if (!webrtc?.socket) {
      // WebRTC not ready yet, retry in 500ms
      retryTimerRef.current = setTimeout(() => {
        // Force re-run by toggling a dummy state — but actually,
        // since the effect depends on open/isDirectCall/directCallRoomId which don't change,
        // we just call the function directly
        directCallTriggeredRef.current = false; // allow retry
      }, 500);
      return;
    }

    directCallTriggeredRef.current = true;

    const startDirectCall = async () => {
      setLoading(true);
      setError(null);
      setCallState('calling');

      try {
        // Get local stream
        await acquireLocalStream();

        // Setup listeners
        setupWebRTCListeners();

        // Create room with the specific roomId that was sent to the callee
        const roomData = await webrtc.createRoom(directCallRoomId);
        setRoomId(roomData.roomId);
        setRoomCode(roomData.roomName);

        console.log('📞 Direct call room created:', roomData.roomName, '- waiting for callee...');

        if (onRoomCreated) {
          onRoomCreated(roomData.roomName);
        }
      } catch (err) {
        console.error('Error starting direct call:', err);
        setError(err.message || 'Failed to start call');
        setCallState('idle');
      } finally {
        setLoading(false);
      }
    };

    startDirectCall();
  }, [open, isDirectCall, directCallRoomId, acquireLocalStream, setupWebRTCListeners, onRoomCreated, getSharedWebRTC]);

  // ====== DIRECT INCOMING CALL: Patient/Doctor accepted, auto-join ======
  useEffect(() => {
    if (!open || !initialRoomCode || autoJoinTriggeredRef.current) return;

    const webrtc = getSharedWebRTC();
    if (!webrtc?.socket) {
      // WebRTC not ready yet, retry in 500ms
      retryTimerRef.current = setTimeout(() => {
        autoJoinTriggeredRef.current = false; // allow retry
      }, 500);
      return;
    }

    autoJoinTriggeredRef.current = true;

    const joinDirectCall = async () => {
      setLoading(true);
      setError(null);

      try {
        // Setup listeners
        setupWebRTCListeners();

        // Get local stream
        await acquireLocalStream();

        // Join the room
        await webrtc.joinRoom(initialRoomCode);
        setRoomId(initialRoomCode);
        setRoomCode(initialRoomCode);
        setCallState('connected');

        console.log('✅ Joined direct call room:', initialRoomCode);
      } catch (err) {
        console.error('Error joining direct call:', err);
        setError(err.message || 'Failed to join call');
        setCallState('idle');
      } finally {
        setLoading(false);
      }
    };

    joinDirectCall();
  }, [open, initialRoomCode, acquireLocalStream, setupWebRTCListeners, getSharedWebRTC]);

  // ====== Watch for call rejection/failure from SocketContext ======
  useEffect(() => {
    if (callState === 'calling' && (callStatus === 'rejected' || callStatus === 'failed')) {
      setCallState('idle');
      setError(callStatus === 'rejected' ? 'Call was declined' : 'Call failed — user may be offline');
    }
  }, [callStatus, callState]);

  // ====== Manual: Create a new call room ======
  const handleCreateCall = async () => {
    const webrtc = getSharedWebRTC();
    if (!webrtc?.socket) {
      setError('Not connected to server. Please refresh.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setupWebRTCListeners();
      await acquireLocalStream();

      const roomData = await webrtc.createRoom();
      setRoomId(roomData.roomId);
      setRoomCode(roomData.roomName);
      setCallState('waiting');

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

  // ====== Manual: Join an existing call room ======
  const handleJoinCall = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    const webrtc = getSharedWebRTC();
    if (!webrtc?.socket) {
      setError('Not connected to server. Please refresh.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setupWebRTCListeners();
      await acquireLocalStream();

      await webrtc.joinRoom(joinCode);
      setRoomId(joinCode);
      setRoomCode(joinCode);
      setCallState('connected');

      console.log('✅ Joined call room:', joinCode);
    } catch (err) {
      console.error('Error joining call:', err);
      setError(err.message || 'Failed to join call');
    } finally {
      setLoading(false);
    }
  };

  // ====== Copy room code ======
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ====== End/close the call ======
  const handleEndCall = () => {
    const webrtc = getSharedWebRTC();
    if (webrtc) {
      try { webrtc.leaveRoom(); } catch(e) { /* ignore */ }
      // Close peer connections
      webrtc.peerConnections.forEach(pc => pc.close());
      webrtc.peerConnections.clear();
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject = null;
    }

    // Cancel outgoing call if still calling
    if (callState === 'calling' && outgoingCall) {
      cancelOutgoingCall();
    }

    // Remove listeners
    removeWebRTCListeners();

    // Clear webrtc local stream reference so it can be re-acquired
    if (webrtc) {
      webrtc.localStream = null;
    }

    setCameraOn(false);
    setCallState('idle');
    setRoomId(null);
    setRoomCode(null);
    setRemoteParticipants([]);
    setHasRemoteStream(false);
    endGlobalCall();
    onClose();
  };

  // ====== Toggle audio/video ======
  const handleToggleMic = () => {
    const webrtc = getSharedWebRTC();
    if (webrtc) webrtc.setAudioEnabled(!micOn);
    setMicOn(!micOn);
  };
  const handleToggleVideo = () => {
    const webrtc = getSharedWebRTC();
    if (webrtc) webrtc.setVideoEnabled(!videoOn);
    setVideoOn(!videoOn);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/70 animate-fadeIn">
      <div className="w-full h-full max-w-full max-h-full flex flex-col items-center justify-center">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-dark-900/40 backdrop-blur-[8px]" />

        {/* Error message */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-4 rounded-lg shadow-lg z-10 max-w-md text-center">
            <div className="mb-2">{error}</div>
            {error.includes('permission') && (
              <div className="text-sm opacity-90 mb-3">
                Click the camera icon in the address bar to allow access
              </div>
            )}
            <button
              onClick={() => { setError(null); setCallState('idle'); }}
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

        {/* ====== CALLING STATE (outgoing direct call, waiting for answer) ====== */}
        {callState === 'calling' && (
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center" style={{ animation: 'pulse 2s infinite' }}>
                <div className="w-14 h-14 rounded-full bg-green-500/40 flex items-center justify-center">
                  <FaVideo className="text-white text-2xl" />
                </div>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">Calling...</h2>
              <p className="text-white/60 text-lg">{outgoingCall?.targetName || patientName || 'User'}</p>
              <p className="text-white/40 text-sm mt-2">Waiting for response...</p>
            </div>

            {/* Show local video preview while calling */}
            <div className="w-48 h-36 mx-auto mb-6 rounded-xl overflow-hidden bg-dark-800 border border-white/10">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ background: '#233a44' }}
              />
            </div>

            <button
              onClick={handleEndCall}
              className="w-14 h-14 mx-auto rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-xl transition text-xl text-white"
              title="Cancel call"
            >
              <FaPhoneSlash />
            </button>
          </div>
        )}

        {/* ====== IDLE STATE (manual create/join) ====== */}
        {callState === 'idle' && !loading && (
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-white text-2xl font-bold mb-6 text-center">Video Call</h2>

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

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-primary-400 text-2xl"
            >
              ✕
            </button>
          </div>
        )}

        {/* ====== IN-CALL STATE (waiting or connected) ====== */}
        {(callState === 'waiting' || callState === 'connected') && (
          <div className="relative w-full max-w-4xl h-[70vh] flex flex-col items-center justify-center rounded-3xl shadow-2xl overflow-hidden bg-dark-900">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hasRemoteStream ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: '#233a44' }}
            />
            
            {/* Local Video (full when waiting, PiP when connected) */}
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

            {/* Status badge */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full shadow-lg z-20">
              <span className="text-white font-medium">
                {callState === 'waiting' ? '⏳ Waiting for participant...' : '✅ Connected'}
              </span>
            </div>

            {/* Room Code (when waiting) */}
            {callState === 'waiting' && roomCode && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-primary-600/90 text-white px-6 py-3 rounded-lg shadow-lg z-20 flex items-center gap-3">
                <span className="text-sm">Room: <code className="font-mono font-bold">{roomCode}</code></span>
                <button onClick={handleCopyCode} className="hover:bg-white/20 p-2 rounded transition" title="Copy room code">
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
                  micOn ? 'bg-white/80 text-primary-700 border-white' : 'bg-red-600 text-white border-red-700'
                }`}
                title={micOn ? 'Mute' : 'Unmute'}
              >
                {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>

              <button
                onClick={handleToggleVideo}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition text-2xl border-2 ${
                  videoOn ? 'bg-white/80 text-primary-700 border-white' : 'bg-yellow-600 text-white border-yellow-700'
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
