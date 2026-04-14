import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import WebRTCVideoCall from '../services/webrtc';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const webrtcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); // { callerId, callerName, callerImage, callerSocketId, roomId }
  const [outgoingCall, setOutgoingCall] = useState(null); // { targetUserId, targetName, roomId }
  const [activeCallRoomId, setActiveCallRoomId] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, connected, ended, rejected, failed
  const cleanupRef = useRef(null);
  const ringtoneTimeoutRef = useRef(null);
  const [remoteCallEnded, setRemoteCallEnded] = useState(false);

  // Initialize socket connection when user logs in
  useEffect(() => {
    if (!currentUser?.uid) {
      // Cleanup when user logs out
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
        webrtcRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const initSocket = async () => {
      try {
        const webrtc = new WebRTCVideoCall();
        await webrtc.connect();
        await webrtc.registerUser(
          currentUser.uid,
          currentUser.displayName || currentUser.email || 'User'
        );

        webrtcRef.current = webrtc;
        setIsConnected(true);
        console.log('🔌 Global socket connected for', currentUser.displayName);

        // Setup call listeners
        const cleanup = webrtc.setupCallListeners({
          onIncomingCall: (data) => {
            console.log('📞 Incoming call from:', data.callerName);
            setIncomingCall(data);
            setCallStatus('ringing');

            // Auto-dismiss after 30 seconds (missed call)
            if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
            ringtoneTimeoutRef.current = setTimeout(() => {
              setIncomingCall(null);
              setCallStatus('idle');
            }, 30000);
          },
          onCallAccepted: (data) => {
            console.log('✅ Call accepted by:', data.acceptedByName);
            setCallStatus('connected');
            setActiveCallRoomId(data.roomId);
          },
          onCallRejected: (data) => {
            console.log('❌ Call rejected by:', data.rejectedByName);
            setCallStatus('rejected');
            setOutgoingCall(null);
            // Reset after showing message
            setTimeout(() => setCallStatus('idle'), 3000);
          },
          onCallCancelled: (data) => {
            console.log('🚫 Call cancelled by:', data.cancelledByName);
            setIncomingCall(null);
            setCallStatus('idle');
            if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
          },
          onCallFailed: (data) => {
            console.log('💥 Call failed:', data.reason);
            setCallStatus('failed');
            setOutgoingCall(null);
            setTimeout(() => setCallStatus('idle'), 3000);
          },
          onCallEnded: (data) => {
            console.log('📴 Call ended by remote:', data.endedByName);
            setRemoteCallEnded(true);
            setCallStatus('ended');
            // Reset after a moment so VideoCallModal can react to remoteCallEnded first
            setTimeout(() => {
              setRemoteCallEnded(false);
              setIncomingCall(null);
              setOutgoingCall(null);
              setCallStatus('idle');
              setActiveCallRoomId(null);
            }, 500);
          },
        });

        cleanupRef.current = cleanup;
      } catch (err) {
        console.error('Failed to initialize socket:', err);
      }
    };

    initSocket();

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
        webrtcRef.current = null;
        setIsConnected(false);
      }
    };
  }, [currentUser?.uid]);

  // Initiate a call to another user
  const startCall = useCallback(async (targetUserId, targetName) => {
    if (!webrtcRef.current || !currentUser) return;

    const roomId = `call-${Date.now()}`;
    setOutgoingCall({ targetUserId, targetName, roomId });
    setCallStatus('calling');
    setActiveCallRoomId(roomId);

    try {
      await webrtcRef.current.initiateCall(
        targetUserId,
        currentUser.displayName || currentUser.email || 'User',
        currentUser.photoURL || '',
        roomId
      );
    } catch (err) {
      console.error('Failed to initiate call:', err);
      setCallStatus('failed');
      setOutgoingCall(null);
      setTimeout(() => setCallStatus('idle'), 3000);
    }
  }, [currentUser]);

  // Accept an incoming call
  const acceptIncomingCall = useCallback(() => {
    if (!webrtcRef.current || !incomingCall) return;
    
    if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);

    webrtcRef.current.acceptCall(
      incomingCall.callerId,
      incomingCall.callerSocketId,
      incomingCall.roomId
    );

    setActiveCallRoomId(incomingCall.roomId);
    setCallStatus('connected');
    // NOTE: Do NOT clear incomingCall here — the dashboard needs it to know 
    // who called and what roomId to join. It will be cleared when endCall is called.
  }, [incomingCall]);

  // Reject an incoming call
  const rejectIncomingCall = useCallback(() => {
    if (!webrtcRef.current || !incomingCall) return;

    if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);

    webrtcRef.current.rejectCall(
      incomingCall.callerId,
      incomingCall.callerSocketId,
      incomingCall.roomId
    );

    setIncomingCall(null);
    setCallStatus('idle');
  }, [incomingCall]);

  // Cancel an outgoing call
  const cancelOutgoingCall = useCallback(() => {
    if (!webrtcRef.current || !outgoingCall) return;

    webrtcRef.current.cancelCall(
      outgoingCall.targetUserId,
      outgoingCall.roomId
    );

    setOutgoingCall(null);
    setCallStatus('idle');
    setActiveCallRoomId(null);
  }, [outgoingCall]);

  // End an active call (local side initiated the end)
  const endCall = useCallback(() => {
    // Signal the other party
    if (webrtcRef.current && activeCallRoomId) {
      webrtcRef.current.endCallSignal(activeCallRoomId);
    }
    setIncomingCall(null);
    setOutgoingCall(null);
    setCallStatus('idle');
    setActiveCallRoomId(null);
  }, [activeCallRoomId]);

  // Get the WebRTC instance (for direct access when needed)
  const getWebRTC = useCallback(() => webrtcRef.current, []);

  const value = {
    isConnected,
    webrtc: webrtcRef.current,
    getWebRTC,
    incomingCall,
    outgoingCall,
    callStatus,
    activeCallRoomId,
    remoteCallEnded,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    cancelOutgoingCall,
    endCall,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
