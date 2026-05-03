import { db } from '../config/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, increment, limit } from 'firebase/firestore';

export const saveUserProfile = async (user, role) => {
  if (!user) return;
  const userRef = doc(db, 'userProfiles', user.uid);
  const data = {
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    role: role || 'patient',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    emailVerified: user.emailVerified || false,
    providerId: user.providerData[0]?.providerId || 'google.com',
    providerUid: user.providerData[0]?.uid || '',
  };
  await setDoc(userRef, data, { merge: true });
};

export const isEmailRoleConflict = async (email, role) => {
  // Query for any user with this email
  const q = query(collection(db, 'userProfiles'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return false;
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.role && data.role !== role) {
      return true;
    }
  }
  return false;
};

export const getAllDoctors = async () => {
  const q = query(collection(db, 'userProfiles'), where('role', '==', 'doctor'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAllPatients = async () => {
  const q = query(collection(db, 'userProfiles'), where('role', '==', 'patient'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const scheduleChat = async (chatData) => {
  // chatData should include doctorId, patientId, doctorName, patientName, date, time, etc.
  const ref = collection(db, 'scheduledChats');
  await addDoc(ref, chatData);
};

export const getScheduledChatsForDoctor = async (doctorId) => {
  const q = query(collection(db, 'scheduledChats'), where('doctorId', '==', doctorId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createOrGetChat = async (chatId, participants) => {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      participants,
      createdAt: new Date().toISOString(),
      lastMessage: '',
      lastTimestamp: null,
      unreadCountPatient: 0,
      unreadCountDoctor: 0,
    });
  }
  return chatRef;
};

export const sendMessageToChat = async (chatId, messageData) => {
  const chatRef = doc(db, 'chats', chatId);
  const messagesRef = collection(chatRef, 'messages');
  await addDoc(messagesRef, messageData);
  // Optionally update lastMessage/lastTimestamp
  // Determine which unread count to increment
  const incrementField = messageData.senderRole === 'patient' ? 'unreadCountDoctor' : 'unreadCountPatient';

  await setDoc(chatRef, {
    lastMessage: messageData.text,
    lastTimestamp: messageData.timestamp,
    [incrementField]: increment(1), // Increment the unread count
  }, { merge: true });
};

export const getChatDocument = async (chatId) => {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  return chatSnap.exists() ? { id: chatSnap.id, ...chatSnap.data() } : null;
};

export const listenForChatMessages = (chatId, callback) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};

export const listenForChatDocChanges = (chatId, callback) => {
  const chatRef = doc(db, 'chats', chatId);
  return onSnapshot(chatRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  });
};

export const resetUnreadCount = async (chatId, userId, userRole) => {
  const chatRef = doc(db, 'chats', chatId);
  let updateData = {};
  if (userRole === 'patient') {
    updateData.unreadCountPatient = 0;
  } else if (userRole === 'doctor') {
    updateData.unreadCountDoctor = 0;
  }
  if (Object.keys(updateData).length > 0) {
    await setDoc(chatRef, updateData, { merge: true });
  }
};

// ==========================================
// Real-Time Patient Emotion Intelligence
// ==========================================

/**
 * Saves an emotion detection result for a patient message.
 * Stored in a per-chat subcollection so doctors get real-time updates.
 */
export const savePatientEmotionLog = async (chatId, emotionData) => {
  try {
    const emotionRef = collection(db, 'chats', chatId, 'emotionLogs');
    await addDoc(emotionRef, {
      ...emotionData,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Error saving emotion log:', err);
  }
};

/**
 * Real-time listener for patient emotion logs within a chat.
 * Doctor subscribes to this to see live emotion updates.
 */
export const listenForPatientEmotions = (chatId, callback) => {
  const emotionRef = collection(db, 'chats', chatId, 'emotionLogs');
  const q = query(emotionRef, orderBy('timestamp', 'desc'), limit(30));
  return onSnapshot(q, (snapshot) => {
    const emotions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(emotions);
  });
};

/**
 * Updates the chat document with the latest patient emotion (for header display).
 */
export const updateChatPatientEmotion = async (chatId, emotionData) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, {
      patientEmotion: emotionData.emotion,
      patientEmotionSeverity: emotionData.severity,
      patientEmotionTimestamp: new Date().toISOString(),
      patientRiskFlag: emotionData.risk_flag || false,
    }, { merge: true });
  } catch (err) {
    console.error('Error updating chat emotion:', err);
  }
};

const videoTranscriptsCollection = collection(db, 'video_transcripts');
const transcriptSummariesCollection = collection(db, 'transcript_summaries');

export const saveChatReport = async (reportData) => {
  try {
    const reportRef = await addDoc(collection(db, 'chat_reports'), {
      ...reportData,
      createdAt: new Date(),
    });
    console.log("Report saved with ID: ", reportRef.id);
    return reportRef.id;
  } catch (error) {
    console.error("Error saving chat report: ", error);
    throw error;
  }
};

// Save mental health test results for a user
export const saveMentalHealthTest = async (userId, answers, extraData = {}) => {
  try {
    const testRef = await addDoc(collection(db, 'mental_health_tests'), {
      userId,
      answers,
      ...extraData,
      createdAt: new Date(),
    });
    console.log("Mental health test saved with ID: ", testRef.id);
    return testRef.id;
  } catch (error) {
    console.error("Error saving mental health test: ", error);
    throw error;
  }
};

export const getChatReportsForPatient = async (patientId) => {
  try {
    const reportsQuery = query(
      collection(db, 'chat_reports'),
      where('patientId', '==', patientId)
    );
    const querySnapshot = await getDocs(reportsQuery);
    const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return reports;
  } catch (error) {
    console.error("Error fetching chat reports: ", error);
    throw error;
  }
};

// ==========================================
// Phase 4: Video Transcription Services
// ==========================================

export const saveVideoTranscript = async (data) => {
  try {
    const docRef = await addDoc(videoTranscriptsCollection, {
      ...data,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error('Error saving transcript:', err);
    throw err;
  }
};

export const saveTranscriptSummary = async (data) => {
  try {
    await addDoc(transcriptSummariesCollection, {
      ...data,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Error saving transcript summary:', err);
  }
};

export const getVideoTranscriptsForPatient = async (patientId) => {
  try {
    const q = query(
      videoTranscriptsCollection,
      where('patientId', '==', patientId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    const transcripts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch summaries for each transcript
    const summaryQ = query(
      transcriptSummariesCollection,
      where('patientId', '==', patientId)
    );
    const summarySnap = await getDocs(summaryQ);
    const summaries = summarySnap.docs.reduce((acc, doc) => {
      const data = doc.data();
      acc[data.transcriptId] = data;
      return acc;
    }, {});

    return transcripts.map(t => ({
      ...t,
      summary: summaries[t.id] || null
    }));
  } catch (err) {
    console.error('Error fetching transcripts:', err);
    return [];
  }
};

// ==========================================
// Phase 5: Patient History Data Aggregation
// ==========================================

export const getGad7History = async (userId) => {
  try {
    const q = query(
      collection(db, 'testResults'),
      where('userId', '==', userId),
      where('testId', '==', 'gad7'),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
    }));
  } catch (err) {
    console.error('Error fetching GAD7 history:', err);
    return [];
  }
};

export const getEmotionHistory = async (userId) => {
  try {
    // Check user's individual emotionLogs collection
    const logsRef = collection(db, 'users', userId, 'emotionLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
    }));
  } catch (err) {
    console.error('Error fetching emotion history:', err);
    return [];
  }
};

export const getAIChatHistory = async (userId) => {
  try {
    // Assuming AI chats are in a specific collection or flagged in messages
    const q = query(
      collection(db, 'messages'),
      where('userId', '==', userId),
      where('receiverId', '==', 'ai_therapist'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
    }));
  } catch (err) {
    console.error('Error fetching AI chat history:', err);
    return [];
  }
};

/**
 * Aggregates all patient data for clinical review
 */
export const getComprehensivePatientData = async (patientId) => {
  try {
    const [
      profileSnap,
      gad7,
      emotions,
      aiChats,
      sessionNotes,
      transcripts,
      testResults
    ] = await Promise.all([
      getDoc(doc(db, 'userProfiles', patientId)),
      getGad7History(patientId),
      getEmotionHistory(patientId),
      getAIChatHistory(patientId),
      getChatReportsForPatient(patientId), // Existing notes/reports
      getVideoTranscriptsForPatient(patientId),
      getMentalHealthTestResultsForUser(patientId)
    ]);

    return {
      profile: profileSnap.exists() ? profileSnap.data() : { id: patientId },
      history: {
        gad7,
        emotions,
        aiChats,
        sessionNotes,
        transcripts,
        testResults
      }
    };
  } catch (err) {
    console.error('Error fetching comprehensive patient data:', err);
    throw err;
  }
};

// Update user's test status (e.g., hasCompletedTest)
export const updateUserTestStatus = async (userId, hasCompletedTest) => {
  if (!userId) return;
  const userRef = doc(db, 'userProfiles', userId);
  await setDoc(userRef, { hasCompletedTest }, { merge: true });
};

// Save a full mental health test attempt (answers, results, date, user info) in a new collection
export const saveMentalHealthTestResult = async (userId, testData) => {
  try {
    const testRef = await addDoc(collection(db, 'mental_health_test_results'), {
      userId,
      ...testData,
      createdAt: new Date(),
    });
    return testRef.id;
  } catch (error) {
    console.error("Error saving mental health test result: ", error);
    throw error;
  }
};

// Fetch all mental health test results for a user, ordered by date descending
export const getMentalHealthTestResultsForUser = async (userId) => {
  try {
    const resultsQuery = query(
      collection(db, 'mental_health_test_results'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(resultsQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching mental health test results: ", error);
    throw error;
  }
};

// Get scheduled appointments for a specific patient
export const getScheduledAppointmentsForPatient = async (patientId) => {
  const q = query(collection(db, 'scheduledChats'), where('patientId', '==', patientId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Listen for real-time appointment updates for a doctor
export const listenForAppointmentsForDoctor = (doctorId, callback) => {
  const q = query(collection(db, 'scheduledChats'), where('doctorId', '==', doctorId));
  return onSnapshot(q, (snapshot) => {
    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(appointments);
  });
};

// Update appointment status (e.g., Confirmed, Cancelled, Completed)
export const updateAppointmentStatus = async (appointmentId, status) => {
  const appointmentRef = doc(db, 'scheduledChats', appointmentId);
  await updateDoc(appointmentRef, { status, updatedAt: new Date().toISOString() });
};

// Save or update today's mood for a user
export const saveUserMood = async (userId, date, mood) => {
  if (!userId || !date || !mood) return;
  const moodRef = doc(db, 'userProfiles', userId, 'moods', date);
  await setDoc(moodRef, {
    mood,
    timestamp: new Date().toISOString(),
  }, { merge: true });
};

// Get a user's profile data from userProfiles
export const getUserProfile = async (userId) => {
  if (!userId) return null;
  const userRef = doc(db, 'userProfiles', userId);
  const snap = await getDoc(userRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Update a user's profile fields in userProfiles (merge)
export const updateUserProfile = async (userId, data) => {
  if (!userId || !data) return;
  const userRef = doc(db, 'userProfiles', userId);
  await setDoc(userRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
};

// ============== GAD-7 ASSESSMENT SYSTEM ==============

/**
 * Save GAD-7 assessment results
 * @param {string} userId - The user's UID
 * @param {number} score - Total GAD-7 score
 * @param {string} severity - Minimal, Mild, Moderate, or Severe
 * @param {Array<number>} answers - Array of the 7 chosen scores
 */
export const saveGad7Result = async (userId, score, severity, answers) => {
  if (!userId) return;
  try {
    // 1. Save the full result in a dedicated collection
    await addDoc(collection(db, 'gad7Results'), {
      userId,
      score,
      severity,
      answers,
      timestamp: new Date().toISOString(),
    });

    // 2. Update the user's profile with the latest score and date
    const userRef = doc(db, 'userProfiles', userId);
    await updateDoc(userRef, {
      lastGad7Score: score,
      lastGad7Severity: severity,
      lastGad7Date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ GAD-7 result saved for user:', userId);
  } catch (error) {
    console.error('Error saving GAD-7 result:', error);
    throw error;
  }
};

// ============== ESCALATION SYSTEM ==============

/**
 * Save an escalation record when AI chat triggers doctor handoff.
 * @param {Object} data - { patientId, patientName, chatHistory, riskScore, avgRisk, reason, emotion }
 * @returns {Promise<string>} - The escalation document ID
 */
export const saveEscalation = async (data) => {
  try {
    const escalationRef = await addDoc(collection(db, 'escalations'), {
      ...data,
      status: 'pending', // pending | connected | resolved
      createdAt: new Date(),
    });
    console.log('🚨 Escalation saved with ID:', escalationRef.id);
    return escalationRef.id;
  } catch (error) {
    console.error('Error saving escalation:', error);
    throw error;
  }
};

/**
 * Get pending escalations (for doctor dashboard, if needed)
 * @returns {Promise<Array>}
 */
export const getPendingEscalations = async () => {
  try {
    const q = query(
      collection(db, 'escalations'),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching escalations:', error);
    return [];
  }
};

// ============== PATIENT MONITORING & REPORTING SYSTEM ==============

/**
 * Starts a new AI chat session.
 * @param {string} userId - The user's UID
 * @returns {Promise<string>} - The new session ID
 */
export const startAISession = async (userId) => {
  if (!userId) return null;
  try {
    const sessionRef = await addDoc(collection(db, 'ai_sessions'), {
      userId,
      startTime: new Date().toISOString(),
      endTime: null,
    });
    return sessionRef.id;
  } catch (error) {
    console.error('Error starting AI session:', error);
    return null;
  }
};

/**
 * Ends an active AI chat session.
 * @param {string} sessionId - The session ID to close
 */
export const endAISession = async (sessionId) => {
  if (!sessionId) return;
  try {
    const sessionRef = doc(db, 'ai_sessions', sessionId);
    await updateDoc(sessionRef, {
      endTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error ending AI session:', error);
  }
};

/**
 * Logs a single AI chat message and emotion to Firestore in real-time.
 * @param {string} sessionId 
 * @param {string} userId 
 * @param {string} messageText 
 * @param {string} senderType - 'user' or 'ai'
 * @param {string} emotionLabel 
 */
export const logAIChatMessage = async (sessionId, userId, messageText, senderType, emotionLabel = 'neutral') => {
  if (!userId || !sessionId) return;
  try {
    await addDoc(collection(db, 'ai_chat_logs'), {
      sessionId,
      userId,
      messageText,
      senderType,
      emotionLabel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging AI message:', error);
  }
};

/**
 * Aggregates the last 48 hours of patient data for the doctor report.
 * @param {string} userId 
 * @returns {Promise<Object>} - The comprehensive report
 */
export const getPatientReport48Hours = async (userId) => {
  if (!userId) throw new Error("User ID is required");

  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Fetch user profile for latest GAD-7
    const userRef = doc(db, 'userProfiles', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    
    // 2. Fetch Chat Logs from last 48 hours
    const logsQuery = query(
      collection(db, 'ai_chat_logs'),
      where('userId', '==', userId),
      where('timestamp', '>=', fortyEightHoursAgo),
      orderBy('timestamp', 'asc')
    );
    const logsSnap = await getDocs(logsQuery);
    const chatHistory = logsSnap.docs.map(d => d.data());

    // 3. Extract Emotion Timeline (only user messages with valid emotions)
    const emotionTimeline = chatHistory
      .filter(log => log.senderType === 'user' && log.emotionLabel)
      .map(log => ({
        time: log.timestamp,
        emotion: log.emotionLabel
      }));

    // 4. Calculate Risk Level (Basic rules engine)
    let riskLevel = 'Low';
    if (userData.lastGad7Severity === 'Severe') {
      riskLevel = 'High Risk';
    } else if (emotionTimeline.filter(e => ['anxious', 'fear', 'sad', 'stressed'].includes(e.emotion.toLowerCase())).length > 5) {
      riskLevel = 'Needs Attention';
    }

    return {
      gad_score: userData.lastGad7Score || null,
      severity: userData.lastGad7Severity || 'Not Taken',
      chat_history: chatHistory,
      emotion_timeline: emotionTimeline,
      risk_level: riskLevel,
      last_updated: now.toISOString()
    };
  } catch (error) {
    console.error('Error generating patient report:', error);
    throw error;
  }
};

// ============== DOCTOR SESSION NOTES ==============

/**
 * Saves a structured doctor session note to Firestore.
 * @param {Object} noteData - Contains patientId, doctorId, sessionId, summary, keyPoints, observations, recommendations, status
 */
export const saveSessionNote = async (noteData) => {
  try {
    const noteRef = await addDoc(collection(db, 'doctor_session_notes'), {
      ...noteData,
      createdAt: new Date().toISOString(),
    });
    return noteRef.id;
  } catch (error) {
    console.error('Error saving session note:', error);
    throw error;
  }
};

/**
 * Fetches all previous session notes for a given patient, ordered chronologically.
 * @param {string} patientId 
 * @returns {Promise<Array>}
 */
export const getPatientSessionNotes = async (patientId) => {
  if (!patientId) return [];
  try {
    const q = query(
      collection(db, 'doctor_session_notes'),
      where('patient_id', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching session notes:', error);
    return [];
  }
};

// Get IDs of doctors a patient has chatted with (has a chat document with at least 1 message)
export const getChattedDoctorIds = async (patientId) => {
  if (!patientId) return [];
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', patientId)
  );
  const snap = await getDocs(q);
  const doctorIds = [];
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.lastMessage) {
      const others = (data.participants || []).filter(id => id !== patientId);
      others.forEach(id => { if (!doctorIds.includes(id)) doctorIds.push(id); });
    }
  });
  return doctorIds;
};

// Get IDs of patients a doctor has chatted with (has a chat document with at least 1 message)
export const getChattedPatientIds = async (doctorId) => {
  if (!doctorId) return [];
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', doctorId)
  );
  const snap = await getDocs(q);
  const patientIds = [];
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.lastMessage) {
      const others = (data.participants || []).filter(id => id !== doctorId);
      others.forEach(id => { if (!patientIds.includes(id)) patientIds.push(id); });
    }
  });
  return patientIds;
};
