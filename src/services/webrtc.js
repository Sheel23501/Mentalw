// WebRTC Video Call Service
// Handles peer-to-peer video connections using WebRTC

import io from 'socket.io-client';

class WebRTCVideoCall {
  constructor(serverUrl) {
    // Prefer explicit serverUrl, otherwise derive from environment or current host.
    let resolved = serverUrl;

    // Use Vite env var if provided at build time
    try {
      if (!resolved && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SIGNALING_SERVER) {
        resolved = import.meta.env.VITE_SIGNALING_SERVER;
      }
    } catch (e) {
      // import.meta may not be available in some contexts; ignore
    }

    // Fallback: build URL from current page host so other devices connect to the correct machine
    if (!resolved && typeof window !== 'undefined') {
      const host = window.location.hostname || 'localhost';
      const protocol = window.location.protocol || 'http:';
      resolved = `${protocol}//${host}:3001`;
    }

    // Final fallback
    this.serverUrl = resolved || 'http://localhost:3001';
    this.socket = null;
    this.peerConnections = new Map();
    this.localStream = null;
    this.roomId = null;
    this.userId = null;
    this.userName = null;
  }

  /**
   * Initialize socket connection
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to signaling server');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Register user with the server
   */
  registerUser(userId, userName) {
    return new Promise((resolve, reject) => {
      this.userId = userId;
      this.userName = userName;

      this.socket.emit('user:register', { userId, userName }, (response) => {
        if (response?.success) {
          console.log(`✅ User registered: ${userName}`);
          resolve(response);
        } else {
          reject(new Error('Failed to register user'));
        }
      });

      // Fallback: listen for registration response
      this.socket.once('user:registered', (response) => {
        resolve(response);
      });
    });
  }

  /**
   * Create a new room using Socket.IO
   * @param {string} [customRoomName] - Optional room name. If not provided, generates one.
   */
  async createRoom(customRoomName) {
    return new Promise((resolve, reject) => {
      const roomName = customRoomName || `call-${Date.now()}`;
      
      this.socket.emit('room:create', {
        roomName,
        userId: this.userId,
        userName: this.userName
      });

      this.socket.once('room:created', (data) => {
        if (data.success) {
          this.roomId = data.roomId;
          console.log(`✅ Room created: ${data.roomName} (${data.roomId})`);
          resolve(data);
        } else {
          reject(new Error('Failed to create room'));
        }
      });

      setTimeout(() => reject(new Error('Room creation timeout')), 5000);
    });
  }

  /**
   * Join an existing room
   */
  joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      this.roomId = roomId;

      this.socket.emit('room:join', {
        roomId,
        userId: this.userId,
        userName: this.userName
      });

      this.socket.once('room:joined', (data) => {
        if (data.success) {
          console.log(`✅ Joined room: ${roomId}`);
          console.log(`👥 Participants:`, data.participants);
          resolve(data);
        } else {
          reject(new Error('Failed to join room'));
        }
      });

      this.socket.once('room:joinFailed', (data) => {
        reject(new Error(data.message));
      });

      setTimeout(() => reject(new Error('Room join timeout')), 5000);
    });
  }

  /**
   * Get local media stream
   */
  async getLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      console.log('✅ Local stream acquired');
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera/microphone permission denied. Please allow access in your browser settings and refresh.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone found. Please connect a device and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Camera or microphone is already in use by another application.');
      }
      throw error;
    }
  }

  /**
   * Create WebRTC peer connection with another user
   */
  createPeerConnection(remoteUserId) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice-candidate', {
          roomId: this.roomId,
          to: remoteUserId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('📹 Remote track received:', event.track.kind);
      this.onRemoteStream?.(event.streams[0], remoteUserId);
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        peerConnection.close();
        this.peerConnections.delete(remoteUserId);
      }
    };

    this.peerConnections.set(remoteUserId, peerConnection);
    return peerConnection;
  }

  /**
   * Create and send SDP offer
   */
  async sendOffer(remoteUserId) {
    try {
      const peerConnection = this.createPeerConnection(remoteUserId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        roomId: this.roomId,
        to: remoteUserId,
        offer
      });

      console.log(`📤 Offer sent to ${remoteUserId}`);
    } catch (error) {
      console.error('Error sending offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming offer and send answer
   */
  async handleOffer(remoteUserId, offer) {
    try {
      const peerConnection = this.createPeerConnection(remoteUserId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socket.emit('webrtc:answer', {
        roomId: this.roomId,
        to: remoteUserId,
        answer
      });

      console.log(`📥 Answer sent to ${remoteUserId}`);
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(remoteUserId, answer) {
    try {
      const peerConnection = this.peerConnections.get(remoteUserId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`✅ Answer received from ${remoteUserId}`);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(remoteUserId, candidate) {
    try {
      const peerConnection = this.peerConnections.get(remoteUserId);
      if (peerConnection && candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Leave the room
   */
  leaveRoom() {
    this.socket.emit('room:leave', {
      roomId: this.roomId,
      userId: this.userId
    });

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    console.log('✅ Left room and closed connections');
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('✅ Disconnected from server');
    }
  }

  /**
   * Mute/unmute audio
   */
  setAudioEnabled(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Enable/disable video
   */
  setVideoEnabled(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // ============== Call Signaling Methods ==============

  /**
   * Initiate a call to a specific user
   */
  initiateCall(targetUserId, callerName, callerImage, roomId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('call:initiate', {
        targetUserId,
        callerName,
        callerImage,
        roomId,
      }, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.reason || 'Failed to initiate call'));
        }
      });

      // Fallback: if no ack callback, resolve after short delay
      setTimeout(() => resolve({ success: true }), 2000);
    });
  }

  /**
   * Accept an incoming call
   */
  acceptCall(callerId, callerSocketId, roomId) {
    this.socket.emit('call:accept', {
      callerId,
      callerSocketId,
      roomId,
    });
  }

  /**
   * Reject an incoming call
   */
  rejectCall(callerId, callerSocketId, roomId) {
    this.socket.emit('call:reject', {
      callerId,
      callerSocketId,
      roomId,
    });
  }

  /**
   * Cancel an outgoing call
   */
  cancelCall(targetUserId, roomId) {
    this.socket.emit('call:cancel', {
      targetUserId,
      roomId,
    });
  }

  /**
   * Signal the other party that the call has ended
   */
  endCallSignal(roomId) {
    this.socket.emit('call:end', {
      roomId,
    });
  }

  /**
   * Setup call event listeners
   * Returns a cleanup function to remove all listeners
   */
  setupCallListeners({ onIncomingCall, onCallAccepted, onCallRejected, onCallCancelled, onCallFailed, onCallEnded }) {
    if (!this.socket) return () => {};

    const handlers = {};

    if (onIncomingCall) {
      handlers['call:incoming'] = onIncomingCall;
      this.socket.on('call:incoming', onIncomingCall);
    }
    if (onCallAccepted) {
      handlers['call:accepted'] = onCallAccepted;
      this.socket.on('call:accepted', onCallAccepted);
    }
    if (onCallRejected) {
      handlers['call:rejected'] = onCallRejected;
      this.socket.on('call:rejected', onCallRejected);
    }
    if (onCallCancelled) {
      handlers['call:cancelled'] = onCallCancelled;
      this.socket.on('call:cancelled', onCallCancelled);
    }
    if (onCallFailed) {
      handlers['call:failed'] = onCallFailed;
      this.socket.on('call:failed', onCallFailed);
    }
    if (onCallEnded) {
      handlers['call:ended'] = onCallEnded;
      this.socket.on('call:ended', onCallEnded);
    }

    // Return cleanup function
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        this.socket?.off(event, handler);
      });
    };
  }
}

export default WebRTCVideoCall;
