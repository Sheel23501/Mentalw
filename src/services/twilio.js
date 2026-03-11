// Twilio Video API Service
// Uses the provided SID and credentials to generate access tokens for video calls

// Store Twilio credentials securely in environment variables
// Create a .env.local file with:
// VITE_TWILIO_ACCOUNT_SID=your_account_sid
// VITE_TWILIO_AUTH_TOKEN=your_auth_token
// VITE_TWILIO_API_KEY=your_api_key

// For now, we'll use the provided credentials
const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN || '';
const TWILIO_API_KEY = import.meta.env.VITE_TWILIO_API_KEY || '';

/**
 * Generate a Twilio Video access token for a participant
 * @param {string} identity - User identifier (e.g., user's name or ID)
 * @param {string} roomName - Video room name
 * @returns {Promise<string>} - Access token
 */
export const generateTwilioToken = async (identity, roomName) => {
  try {
    // In production, call a backend endpoint to generate tokens securely
    // For development, you can use the Twilio JavaScript SDK
    // Install: npm install twilio
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured. Set VITE_TWILIO_ACCOUNT_SID and VITE_TWILIO_AUTH_TOKEN in .env.local');
    }

    // Call backend token generation endpoint
    const response = await fetch('/api/twilio/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity,
        roomName,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate Twilio token');
    }

    const { token } = await response.json();
    return token;
  } catch (error) {
    console.error('Error generating Twilio token:', error);
    throw error;
  }
};

/**
 * Join a Twilio Video room
 * @param {object} Twilio - Twilio Video SDK
 * @param {string} token - Access token
 * @param {string} roomName - Room name to join
 * @param {object} options - Connection options
 * @returns {Promise<object>} - Room object
 */
export const joinVideoRoom = async (Twilio, token, roomName, options = {}) => {
  try {
    if (!Twilio) {
      throw new Error('Twilio SDK not loaded');
    }

    const defaultOptions = {
      name: roomName,
      audio: true,
      video: { width: 640, height: 480 },
      maxAudioBitrate: 16000,
      preferredAudioCodecs: ['opus', 'pcmu'],
      ...options
    };

    const room = await Twilio.connect(token, defaultOptions);
    console.log('Connected to Twilio room:', roomName);
    return room;
  } catch (error) {
    console.error('Error joining Twilio room:', error);
    throw error;
  }
};

/**
 * Leave a Twilio Video room
 * @param {object} room - Room object
 */
export const leaveVideoRoom = (room) => {
  try {
    if (room) {
      room.participants.forEach(participantDisconnect);
      room.localParticipant.tracks.forEach(trackSubscription => trackSubscription.unsubscribe());
      room.disconnect();
      console.log('Disconnected from Twilio room');
    }
  } catch (error) {
    console.error('Error leaving Twilio room:', error);
  }
};

/**
 * Disconnect a participant
 * @param {object} participant - Participant object
 */
const participantDisconnect = (participant) => {
  setParticipantAsDisconnected(participant);
  participant.removeAllListeners();
};

/**
 * Mark participant as disconnected
 * @param {object} participant - Participant object
 */
const setParticipantAsDisconnected = (participant) => {
  // Implementation depends on state management
  console.log(`Participant ${participant.sid} disconnected`);
};

/**
 * Mute/unmute audio track
 * @param {object} localParticipant - Local participant
 * @param {boolean} enabled - Enable or disable
 */
export const toggleAudio = (localParticipant, enabled) => {
  if (localParticipant) {
    localParticipant.audioTracks.forEach(trackPublication => {
      if (enabled) {
        trackPublication.track.enable();
      } else {
        trackPublication.track.disable();
      }
    });
  }
};

/**
 * Mute/unmute video track
 * @param {object} localParticipant - Local participant
 * @param {boolean} enabled - Enable or disable
 */
export const toggleVideo = (localParticipant, enabled) => {
  if (localParticipant) {
    localParticipant.videoTracks.forEach(trackPublication => {
      if (enabled) {
        trackPublication.track.enable();
      } else {
        trackPublication.track.disable();
      }
    });
  }
};
