import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaComments, FaCalendarAlt, FaEnvelope, FaTimes, FaHistory, FaArrowLeft, FaBrain, FaChartLine, FaVideo, FaPhoneSlash } from 'react-icons/fa';
import { useEmotionMonitor } from '../../utils/useEmotionMonitor';
import { toFriendlyLabel } from '../../utils/emotionLabels';
import { 
  getAllPatients, 
  getScheduledChatsForDoctor, 
  createOrGetChat, 
  sendMessageToChat, 
  listenForChatMessages, 
  listenForChatDocChanges, 
  resetUnreadCount, 
  saveChatReport,
  getChatReportsForPatient 
} from '../../services/firestore';
import SessionNotes from '../../components/dashboard/SessionNotes.jsx';
import EmotionPanel from '../../components/dashboard/EmotionPanel.jsx';
import VideoCallModal from '../../components/dashboard/VideoCallModal.jsx';
import { useSocket } from '../../contexts/SocketContext';

const DoctorDashboard = () => {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'chat' or 'view'
  const [modalData, setModalData] = useState(null);
  const [scheduledChats, setScheduledChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatListener, setChatListener] = useState(null);
  const [chatPatient, setChatPatient] = useState(null);
  const [chatMessagesDirect, setChatMessagesDirect] = useState([]);
  const [chatInputDirect, setChatInputDirect] = useState('');
  const [chatLoadingDirect, setChatLoadingDirect] = useState(false);
  const [chatListenerDirect, setChatListenerDirect] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [chatReport, setChatReport] = useState(null);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState(null);
  const [videoCallPatient, setVideoCallPatient] = useState(null); // track which patient is being video called
  const [isOutgoingCall, setIsOutgoingCall] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);

  const [viewingPatientHistory, setViewingPatientHistory] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [emotionAnalysisEnabled, setEmotionAnalysisEnabled] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [showEmotionPanel, setShowEmotionPanel] = useState(false);

  // Socket context for direct video calls
  const { startCall, callStatus, activeCallRoomId, incomingCall, outgoingCall } = useSocket();

  // Handle starting a direct video call to a patient
  const handleStartVideoCall = (patient) => {
    const patientName = patient.displayName || patient.name || patient.email || 'Patient';
    setVideoCallPatient(patient);
    setIsOutgoingCall(true);
    setVideoCallOpen(true);
    startCall(patient.id, patientName);
  };

  // When an incoming call is accepted (from IncomingCallNotification), open the video call modal
  useEffect(() => {
    if (callStatus === 'connected' && incomingCall && !videoCallOpen) {
      // Find the patient by callerId
      const callerPatient = patients.find(p => p.id === incomingCall.callerId);
      setVideoCallPatient(callerPatient || { id: incomingCall.callerId, displayName: incomingCall.callerName });
      setPendingRoomCode(incomingCall.roomId);
      setIsOutgoingCall(false);
      setVideoCallOpen(true);
    }
  }, [callStatus, incomingCall, videoCallOpen, patients]);

  // Helper to get emoji for emotion
  const getEmotionEmoji = (emotion) => {
    const emojiMap = {
      happy: '😊', sad: '😢', angry: '😠', fear: '😨',
      surprised: '😲', neutral: '😐', disgust: '🤢', unknown: '❓',
    };
    return emojiMap[emotion?.toLowerCase()] || '🎭';
  };

  // Emotion monitoring hook
  useEmotionMonitor({
    enabled: emotionAnalysisEnabled,
    intervalMs: 5000,
    onResult: (res) => {
      const emotion = toFriendlyLabel(res?.aggregated?.emotion || res?.faces?.[0]?.emotion || 'unknown');
      setDetectedEmotion(emotion);
      // Add to history with timestamp
      setEmotionHistory(prev => [...prev, { emotion, timestamp: new Date(), score: res?.faces?.[0]?.score }].slice(-20));
    },
  });

  const timerRef = useRef(null);
  const chatBodyRef = useRef(null);
  const chatBodyRefDirect = useRef(null);

  const handleSaveAndEndChat = async (chatType, messages, patientInfo) => {
    closeChatModals(true); 

    if (!messages || messages.length === 0) return;

    const reportData = {
      doctorId: currentUser.uid,
      patientId: patientInfo.patientId,
      patientName: patientInfo.patientName,
      patientPhotoURL: patientInfo.patientPhotoURL,
      messages: messages.map(m => ({ ...m, timestamp: m.timestamp || new Date() })),
    };

    try {
      await saveChatReport(reportData);
    } catch (error) {
      console.error("Failed to save the report:", error);
    }

    if (chatType === 'scheduled') {
      setChatMessages([]);
    } else {
      setChatMessagesDirect([]);
    }

    setChatReport(reportData);
    setReportModalOpen(true);
  };

  const closeChatModals = (isSaving = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(null);
    setModalOpen(false);
    setModalData(null);
    setModalType('');
    setChatPatient(null);
    
    if (!isSaving) {
      setChatMessages([]);
      setChatMessagesDirect([]);
    }
  };

  const handleViewHistory = (patient) => {
    setViewingPatientHistory(patient);
    setHistoryLoading(true);
    getChatReportsForPatient(patient.id)
      .then(setPatientHistory)
      .catch(err => {
        console.error("Failed to fetch history:", err);
        setPatientHistory([]);
      })
      .finally(() => setHistoryLoading(false));
  };

  const handleBackToDashboard = () => {
    setViewingPatientHistory(null);
    setPatientHistory([]);
  };

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (chatBodyRefDirect.current) {
      chatBodyRefDirect.current.scrollTop = chatBodyRefDirect.current.scrollHeight;
    }
  }, [chatMessagesDirect]);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const data = await getAllPatients();
        setPatients(data);
      } catch (err) {
        setPatients([]);
      }
      setLoading(false);
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    const fetchScheduledChats = async () => {
      if (!currentUser) return;
      setLoadingChats(true);
      try {
        const chats = await getScheduledChatsForDoctor(currentUser.uid);
        setScheduledChats(chats);
      } catch (err) {
        setScheduledChats([]);
      }
      setLoadingChats(false);
    };
    fetchScheduledChats();
  }, [currentUser]);

  // Listen for unread counts for each patient
  useEffect(() => {
    if (!currentUser || (!patients.length && !scheduledChats.length)) return;

    const unsubscribes = [];

    // Listen for direct chat unread counts
    patients.forEach(patient => {
      const chatId = `${currentUser.uid}_${patient.id}`;
      const unsub = listenForChatDocChanges(chatId, (chatDoc) => {
        if (chatDoc) {
          setUnreadCounts(prevCounts => ({
            ...prevCounts,
            [patient.id]: chatDoc.unreadCountDoctor || 0,
          }));
        }
      });
      unsubscribes.push(unsub);
    });

    // Listen for scheduled chat unread counts (using chat ID as key)
    scheduledChats.forEach(chat => {
      const unsub = listenForChatDocChanges(chat.id, (chatDoc) => {
        if (chatDoc) {
          setUnreadCounts(prevCounts => ({
            ...prevCounts,
            [chat.id]: chatDoc.unreadCountDoctor || 0,
          }));
        }
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [patients, scheduledChats, currentUser]);

  // Listen for messages when scheduled chat modal opens
  useEffect(() => {
    if (modalOpen && modalType === 'view' && modalData && modalData.id) {
      const chatId = modalData.id;
      const participants = [
        modalData.doctorId, 
        modalData.patientId
      ]; // Assuming these are available in modalData

      setChatMessages([]);
      setChatLoading(true);

      createOrGetChat(chatId, participants).then(() => {
        const unsub = listenForChatMessages(chatId, (msgs) => {
          setChatMessages(msgs);
          setChatLoading(false);
        });
        setChatListener(() => unsub); // Save the unsubscribe function
      }).catch(err => {
        console.error('Error creating/getting chat:', err);
        setChatLoading(false);
      });

      // Reset unread count when scheduled chat is opened
      if (currentUser) {
        resetUnreadCount(chatId, currentUser.uid, 'doctor');
      }

      // Start timer
      setTimeLeft(45 * 60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(timerRef.current);
            closeChatModals(); // Just close the modal, don't save
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } else {
      // Cleanup when modal closes
      if (chatListener) {
        chatListener();
        setChatListener(null);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setTimeLeft(null);
    }

    return () => {
      if (chatListener) {
        chatListener();
        setChatListener(null);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    // eslint-disable-next-line
  }, [modalOpen, modalType, modalData, currentUser]);

  // Listen for messages when direct chat modal opens
  useEffect(() => {
    if (chatPatient && currentUser) {
      const chatId = `${currentUser.uid}_${chatPatient.id}`;
      const participants = [currentUser.uid, chatPatient.id];
      setChatMessagesDirect([]);
      setChatLoadingDirect(true);
      createOrGetChat(chatId, participants).then(() => {
        const unsub = listenForChatMessages(chatId, (msgs) => {
          setChatMessagesDirect(msgs);
          setChatLoadingDirect(false);
        });
        setChatListenerDirect(() => unsub); // Save the unsubscribe function
      }).catch(err => {
        console.error('Error creating/getting direct chat:', err);
        setChatLoadingDirect(false);
      });

      // Reset unread count when direct chat is opened
      if (currentUser) {
        resetUnreadCount(chatId, currentUser.uid, 'doctor');
      }

      // Start timer
      setTimeLeft(45 * 60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(timerRef.current);
            closeChatModals(); // Just close the modal, don't save
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Cleanup when modal closes
      if (chatListenerDirect) {
        chatListenerDirect();
        setChatListenerDirect(null);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setTimeLeft(null);
    }
    
    return () => {
      if (chatListenerDirect) {
        chatListenerDirect();
        setChatListenerDirect(null);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line
  }, [chatPatient, currentUser]);

  // Detect video call invitations from chat messages - use the LATEST invite
  useEffect(() => {
    const allMessages = [...chatMessages, ...chatMessagesDirect];
    // Get the LAST (most recent) video call invitation
    const videoInvites = allMessages.filter(msg => msg.videoCall && msg.roomCode);
    const latestInvite = videoInvites.length > 0 ? videoInvites[videoInvites.length - 1] : null;
    if (latestInvite && latestInvite.roomCode !== pendingRoomCode) {
      setPendingRoomCode(latestInvite.roomCode);
    }
  }, [chatMessages, chatMessagesDirect, pendingRoomCode]);

  const openModal = (type, data) => {
    setModalType(type);
    setModalData(data);
    setModalOpen(true);
  };
  const closeModal = () => {
    handleSaveAndEndChat('scheduled', chatMessages, {
      patientName: modalData?.patientName,
      patientPhotoURL: modalData?.patientPhotoURL
    });
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !modalData || !modalData.id) return;

    const messageToSend = chatInput;
    setChatInput(''); // Clear input immediately
    setChatLoading(true);
    try {
      await sendMessageToChat(modalData.id, {
        senderId: currentUser.uid,
        senderRole: 'doctor',
        senderName: currentUser.displayName || currentUser.email || 'Unknown Doctor',
        senderImage: currentUser.photoURL || '',
        text: messageToSend,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error sending message to scheduled chat:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessageDirect = async () => {
    if (!chatInputDirect.trim() || !chatPatient) return;

    const messageToSend = chatInputDirect;
    setChatInputDirect(''); // Clear input immediately
    setChatLoadingDirect(true);
    const chatId = `${currentUser.uid}_${chatPatient.id}`;
    try {
      await sendMessageToChat(chatId, {
        senderId: currentUser.uid,
        senderRole: 'doctor',
        senderName: currentUser.displayName || currentUser.email || 'Unknown Doctor',
        senderImage: currentUser.photoURL || '',
        text: messageToSend,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error sending message to direct chat:', err);
    } finally {
      setChatLoadingDirect(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (viewingPatientHistory) {
    return (
      <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(135deg, #f0f4f0 0%, #e8efe5 30%, #f5f0eb 70%, #faf8f5 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-28">
          {/* Breadcrumb-style header */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/60 p-8" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={handleBackToDashboard} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all hover:scale-105">
                        <FaArrowLeft className="h-4 w-4 text-gray-600" />
                    </button>
                    <img
                        src={viewingPatientHistory.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingPatientHistory.displayName || 'P')}&background=c7d2c4&color=374151`}
                        alt={viewingPatientHistory.displayName || 'Patient'}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 tracking-tight">{viewingPatientHistory.displayName || 'Unknown Patient'}</h3>
                        <p className="text-sm text-gray-400 font-medium">Session History</p>
                    </div>
                </div>
            </div>

            {historyLoading ? (
              <div className="text-center text-gray-400 py-16 text-sm">Loading history...</div>
            ) : patientHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-400 text-sm">No chat history found for this patient.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {patientHistory.map(report => (
                  <li key={report.id} className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group" onClick={() => { setChatReport(report); setReportModalOpen(true); }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <FaComments className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Chat Session</p>
                          <p className="text-xs text-gray-400 mt-0.5">{report.messages.length} messages</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">{formatTimestamp(report.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {reportModalOpen && chatReport && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4">
            <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-2xl sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-lg font-bold text-gray-800">Chat Transcript — {formatTimestamp(chatReport.createdAt)}</h3>
                  <button onClick={() => setReportModalOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                      <FaTimes className="w-3 h-3 text-gray-500"/>
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-white p-6 space-y-4">
                <div className="prose prose-sm max-w-none">
                  {chatReport.messages.map(msg => (
                    <div key={msg.id || msg.timestamp.seconds} className="mb-3 p-3 rounded-lg bg-gray-50">
                      <p className="font-semibold text-sm text-gray-700">
                        {msg.senderName || (msg.senderRole === 'doctor' ? 'Doctor' : 'Patient')}
                        <span className="text-xs font-normal text-gray-400 ml-2">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button onClick={() => setReportModalOpen(false)} className="bg-gray-800 text-white px-6 py-2.5 rounded-xl hover:bg-gray-900 transition text-sm font-medium">
                      Close
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compute patients with unread messages
  const patientsWithUnread = patients.filter(p => (unreadCounts[p.id] || 0) > 0);
  // Also check scheduled chats for unread
  const scheduledChatsWithUnread = scheduledChats.filter(c => (unreadCounts[c.id] || 0) > 0);

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(135deg, #f0f4f0 0%, #e8efe5 30%, #f5f0eb 70%, #faf8f5 100%)', fontFamily: "'Inter', sans-serif" }}>
      {/* Hero / Welcome Section */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 40%, #4a7c65 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', transform: 'translate(-20%, 30%)' }}></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-28 pb-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-200 text-sm font-medium tracking-widest uppercase mb-2">Doctor Dashboard</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                Welcome back, <span className="text-emerald-300">{currentUser?.displayName?.split(' ')[0] || 'Doctor'}</span>
              </h1>
              <p className="text-emerald-100/70 text-base max-w-lg">Here's your activity overview for today.</p>
            </div>
            {/* Quick stats in the hero */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center">
                <p className="text-emerald-200 text-xs font-medium">Active Patients</p>
                <p className="text-white text-2xl font-bold">{loading ? '—' : patients.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center">
                <p className="text-emerald-200 text-xs font-medium">Pending Appts</p>
                <p className="text-white text-2xl font-bold">{loadingChats ? '—' : scheduledChats.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center">
                <p className="text-emerald-200 text-xs font-medium">Unread Msgs</p>
                <p className="text-white text-2xl font-bold" style={{ color: (patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? '#fca5a5' : 'white' }}>
                  {patientsWithUnread.length + scheduledChatsWithUnread.length}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-transparent" style={{ borderRadius: '100% 100% 0 0', background: 'linear-gradient(135deg, #f0f4f0 0%, #e8efe5 30%, #f5f0eb 70%, #faf8f5 100%)' }}></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-2">
        {/* Emotion Panel */}
        <div className="mb-8 mt-4">
          <EmotionPanel />
        </div>

        {/* ── OVERVIEW STAT CARDS (3 focused widgets) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 mt-4">
          {/* Active Patients Count */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4a7c65 0%, #2d4a3e 100%)' }}>
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Active Patients</p>
              <p className="text-3xl font-bold text-gray-800" style={{ lineHeight: 1 }}>
                {loading ? <span className="text-gray-300 text-2xl">—</span> : patients.length}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Under your care</p>
            </div>
          </div>

          {/* Pending Appointments Count */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Pending Requests</p>
              <p className="text-3xl font-bold text-gray-800" style={{ lineHeight: 1 }}>
                {loadingChats ? <span className="text-gray-300 text-2xl">—</span> : scheduledChats.length}
              </p>
              <p className="text-xs text-blue-600 font-medium mt-1">Awaiting your response</p>
            </div>
          </div>

          {/* Unread Messages Count */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all" style={(patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? { borderColor: '#fca5a5' } : {}}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: (patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}>
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Unseen Messages</p>
              <p className="text-3xl font-bold" style={{ lineHeight: 1, color: (patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? '#ef4444' : '#1f2937' }}>
                {patientsWithUnread.length + scheduledChatsWithUnread.length}
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: (patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? '#ef4444' : '#9ca3af' }}>
                {(patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? 'Needs attention' : 'All caught up!'}
              </p>
            </div>
          </div>
        </div>

        {/* ── UNSEEN MESSAGES ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <FaEnvelope className="w-4 h-4 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">Unseen Messages</h2>
            </div>
            {(patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 && (
              <span className="text-xs font-bold text-white bg-red-500 px-3 py-1.5 rounded-full">
                {patientsWithUnread.length + scheduledChatsWithUnread.length} new
              </span>
            )}
          </div>

          {(patientsWithUnread.length + scheduledChatsWithUnread.length) === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-8 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-gray-400 text-sm font-medium">All caught up! No unseen messages.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Direct chat unreads */}
              {patientsWithUnread.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white/80 backdrop-blur-md rounded-2xl border border-red-100 p-4 hover:shadow-lg hover:border-red-200 transition-all cursor-pointer group"
                  onClick={() => setChatPatient(patient)}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img src={patient.photoURL || patient.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.displayName || patient.name || patient.email || 'Unknown Patient')}&background=c7d2c4&color=374151`} alt={patient.displayName || patient.name || patient.email || 'Unknown Patient'} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shadow">
                        {unreadCounts[patient.id]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm">{patient.displayName || patient.name || patient.email || 'Unknown Patient'}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{patient.email || 'Unknown'}</p>
                      <p className="text-xs text-red-500 font-medium mt-1">💬 {unreadCounts[patient.id]} unread message{unreadCounts[patient.id] > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #4a7c65 0%, #3d6655 100%)' }}
                        onClick={(e) => { e.stopPropagation(); setChatPatient(patient); }}
                      >
                        <FaComments className="w-3 h-3" /> Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* Scheduled chat unreads */}
              {scheduledChatsWithUnread.map((chat) => (
                <div
                  key={chat.id}
                  className="bg-white/80 backdrop-blur-md rounded-2xl border border-red-100 p-4 hover:shadow-lg hover:border-red-200 transition-all cursor-pointer group"
                  onClick={() => openModal('view', chat)}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img src={chat.patientPhotoURL || chat.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.patientName || 'Patient')}&background=c7d2c4&color=374151`} alt={chat.patientName || 'Patient'} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shadow">
                        {unreadCounts[chat.id]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm">{chat.patientName || 'Unknown Patient'}</h3>
                      <p className="text-xs text-blue-500 font-medium">📅 Scheduled session</p>
                      <p className="text-xs text-red-500 font-medium mt-1">💬 {unreadCounts[chat.id]} unread message{unreadCounts[chat.id] > 1 ? 's' : ''}</p>
                    </div>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #4a7c65 0%, #3d6655 100%)' }}
                      onClick={(e) => { e.stopPropagation(); openModal('view', chat); }}
                    >
                      <FaComments className="w-3 h-3" /> Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── PENDING APPOINTMENT REQUESTS ── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <FaCalendarAlt className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">Pending Appointment Requests</h2>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">{scheduledChats.length} request{scheduledChats.length !== 1 ? 's' : ''}</span>
          </div>
          {loadingChats ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-12 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 mb-4"></div>
                <div className="w-32 h-4 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ) : scheduledChats.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-8 text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-gray-400 text-sm">No pending appointment requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledChats.map((chat) => (
                <div key={chat.id} className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-5 hover:shadow-lg hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <img
                      src={chat.patientPhotoURL || chat.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.patientName || chat.patientEmail || 'Unknown Patient')}&background=c7d2c4&color=374151`}
                      alt={chat.patientName || 'Unknown Patient'}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 text-sm">{chat.patientName || 'Unknown Patient'}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold border border-amber-100">
                          {chat.status || 'Pending'}
                        </span>
                        {unreadCounts[chat.id] > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                            {unreadCounts[chat.id]}
                          </span>
                        )}
                      </div>
                      {/* Date & Time displayed prominently */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5">
                          <FaCalendarAlt className="w-3 h-3" />
                          <span className="text-xs font-semibold">{chat.date || 'No date'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-xs font-semibold">{chat.time || 'No time'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1"><FaEnvelope className="w-3 h-3" /> {chat.patientEmail || 'Unknown'}</p>
                    </div>
                    <button
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      onClick={() => openModal('view', chat)}
                    >
                      <FaCalendarAlt className="w-3 h-3" /> Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Standalone Video Call Modal (for direct calls from patient list) */}
      {videoCallOpen && !chatPatient && !modalOpen && (
        <VideoCallModal
          open={videoCallOpen}
          onClose={() => {
            setVideoCallOpen(false);
            setPendingRoomCode(null);
            setVideoCallPatient(null);
            setIsOutgoingCall(false);
          }}
          patientName={videoCallPatient?.displayName || videoCallPatient?.name || 'Patient'}
          doctorName={currentUser?.displayName || 'Doctor'}
          patientId={videoCallPatient?.id}
          doctorId={currentUser?.uid}
          initialRoomCode={pendingRoomCode}
          isDirectCall={isOutgoingCall && !!activeCallRoomId}
          directCallRoomId={activeCallRoomId}
        />
      )}

      {/* Modal for Scheduled Chat/View */}
      {modalOpen && modalData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4">
          <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-lg sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 40%, #4a7c65 100%)' }}>
              <div className="flex items-center space-x-3">
                <img
                  src={modalData.patientPhotoURL || modalData.patientImage || 'https://ui-avatars.com/api/?name=Unknown+Patient&background=c7d2c4&color=374151'}
                  alt={modalData.patientName || 'Unknown Patient'}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-white/30"
                />
                <div>
                  <h3 className="text-base font-bold text-white">{modalData.patientName || 'Unknown Patient'}</h3>
                  <p className="text-xs text-emerald-200 font-medium">Patient • Scheduled Session</p>
                </div>
              </div>
              {timeLeft !== null && (
                <div className="text-white font-mono font-bold text-sm bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  {`${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {emotionAnalysisEnabled && detectedEmotion && (
                  <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-lg backdrop-blur-sm">
                    <span className="text-xs text-white">{getEmotionEmoji(detectedEmotion)} {detectedEmotion}</span>
                  </div>
                )}
                <button
                  onClick={() => setEmotionAnalysisEnabled(!emotionAnalysisEnabled)}
                  className={`${emotionAnalysisEnabled ? 'bg-amber-400 text-gray-800' : 'bg-white/15 text-white'} hover:bg-white/25 p-2 rounded-xl transition backdrop-blur-sm`}
                  title={emotionAnalysisEnabled ? 'Disable Emotion Analysis' : 'Enable Emotion Analysis'}
                >
                  <FaBrain className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowEmotionPanel(!showEmotionPanel)}
                  className={`${showEmotionPanel ? 'bg-blue-400 text-white' : 'bg-white/15 text-white'} hover:bg-white/25 p-2 rounded-xl transition backdrop-blur-sm`}
                  title="View Emotion History"
                >
                  <FaChartLine className="w-3.5 h-3.5" />
                </button>
                <button
                  className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-xl transition backdrop-blur-sm"
                  onClick={closeChatModals}
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Emotion History Panel */}
            {showEmotionPanel && (
              <div className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-b border-blue-100 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-600 flex items-center gap-2 uppercase tracking-wider">
                    <FaChartLine className="text-blue-500" /> Emotion Analysis
                  </h4>
                  {emotionAnalysisEnabled ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">🔴 Live</span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Paused</span>
                  )}
                </div>
                {emotionHistory.length === 0 ? (
                  <p className="text-xs text-gray-400">No emotions detected yet. Enable analysis to start monitoring.</p>
                ) : (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {emotionHistory.map((entry, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white border border-gray-100 rounded-full px-2 py-1 flex items-center gap-1 shadow-sm"
                        title={entry.timestamp.toLocaleTimeString()}
                      >
                        {getEmotionEmoji(entry.emotion)} {entry.emotion}
                        <span className="text-gray-300">{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {modalType === 'view' ? (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col space-y-3 pb-24" style={{ background: 'linear-gradient(180deg, #f8faf8 0%, #ffffff 100%)' }}>
                  {chatLoading ? (
                    <div className="text-center text-gray-400 py-8 text-sm">Loading messages...</div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-3">💬</div>
                      <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex items-end ${msg.senderId === currentUser.uid ? 'justify-end space-x-2' : 'justify-start space-x-2'}`}>
                        {msg.senderId !== currentUser.uid && (
                          <img
                            src={modalData.patientPhotoURL || modalData.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(modalData.patientName || modalData.patientEmail || 'Unknown Patient')}&background=c7d2c4&color=374151`}
                            alt={modalData.patientName || 'Unknown Patient'}
                            className="w-7 h-7 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm break-words shadow-sm ${msg.senderId === currentUser.uid ? 'rounded-br-md text-white' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'}`} style={msg.senderId === currentUser.uid ? { background: 'linear-gradient(135deg, #3d6655 0%, #4a7c65 100%)' } : {}}>
                          <div>{msg.text}</div>
                          <div className={`text-[10px] mt-1 ${msg.senderId === currentUser.uid ? 'text-emerald-200 text-right' : 'text-gray-400 text-left'}`}>{msg.timestamp && new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {msg.senderId === currentUser.uid && (
                          <img
                            src={msg.senderImage || currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.email || 'Unknown Doctor')}&background=c7d2c4&color=374151`}
                            alt={currentUser.displayName || currentUser.email || 'Unknown Doctor'}
                            className="w-7 h-7 rounded-lg object-cover shrink-0"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
                {/* Session Notes below chat */}
                <div className="px-4 pb-4">
                  <SessionNotes
                    doctorId={currentUser?.uid}
                    patientId={modalData?.patientId}
                    sessionId={modalData?.id}
                    sessionDate={modalData?.date}
                  />
                </div>
                {/* Footer */}
                <div className="mt-auto border-t border-gray-100 bg-white">
                    <div className="p-3 flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm bg-gray-50"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) handleSendMessage(); }}
                            autoFocus
                        />
                        <button
                            onClick={handleSendMessage}
                            className="text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #3d6655 0%, #4a7c65 100%)' }}
                            disabled={!chatInput.trim()}>
                            Send
                        </button>
                    </div>
                    <div className="px-4 py-2.5 bg-gray-50/80 flex justify-between items-center border-t border-gray-100 gap-2">
                        <button
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-medium hover:bg-blue-100 transition"
                            onClick={() => setVideoCallOpen(true)}
                        >
                            <FaVideo className="w-3 h-3" /> Video Call
                        </button>
                        <button
                            onClick={() => handleSaveAndEndChat('scheduled', chatMessages, { patientId: modalData?.patientId, patientName: modalData?.patientName, patientPhotoURL: modalData?.patientPhotoURL })}
                            className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
                            disabled={chatMessages.length === 0}
                        >
                            Save & End Session
                        </button>
                    </div>
                </div>
                <VideoCallModal
                  open={videoCallOpen}
                  onClose={() => {
                    setVideoCallOpen(false);
                    setPendingRoomCode(null);
                    setIsOutgoingCall(false);
                  }}
                  patientName={modalData?.patientName}
                  doctorName={currentUser?.displayName}
                  doctorId={currentUser?.uid}
                  initialRoomCode={pendingRoomCode}
                  isDirectCall={isOutgoingCall && !!activeCallRoomId}
                  directCallRoomId={activeCallRoomId}
                />
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Direct Chat Modal */}
      {chatPatient && currentUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4">
          <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-lg sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 40%, #4a7c65 100%)' }}>
              <div className="flex items-center space-x-3">
                <img
                  src={chatPatient.photoURL || chatPatient.image || 'https://ui-avatars.com/api/?name=Unknown+Patient&background=c7d2c4&color=374151'}
                  alt={chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient'}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-white/30"
                />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient'}
                  </h3>
                  <p className="text-xs text-emerald-200 font-medium">Patient • Direct Chat</p>
                </div>
              </div>
              {timeLeft !== null && (
                <div className="text-white font-mono font-bold text-sm bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  {`${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {emotionAnalysisEnabled && detectedEmotion && (
                  <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-lg backdrop-blur-sm">
                    <span className="text-xs text-white">{getEmotionEmoji(detectedEmotion)} {detectedEmotion}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsOutgoingCall(false);
                    setVideoCallOpen(true);
                  }}
                  className="bg-blue-400/80 hover:bg-blue-500 text-white p-2 rounded-xl transition backdrop-blur-sm"
                  title="Start Video Call"
                >
                  <FaVideo className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEmotionAnalysisEnabled(!emotionAnalysisEnabled)}
                  className={`${emotionAnalysisEnabled ? 'bg-amber-400 text-gray-800' : 'bg-white/15 text-white'} hover:bg-white/25 p-2 rounded-xl transition backdrop-blur-sm`}
                  title={emotionAnalysisEnabled ? 'Disable Emotion Analysis' : 'Enable Emotion Analysis'}
                >
                  <FaBrain className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowEmotionPanel(!showEmotionPanel)}
                  className={`${showEmotionPanel ? 'bg-blue-400 text-white' : 'bg-white/15 text-white'} hover:bg-white/25 p-2 rounded-xl transition backdrop-blur-sm`}
                  title="View Emotion History"
                >
                  <FaChartLine className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={closeChatModals}
                  className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-xl transition backdrop-blur-sm"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Emotion History Panel for Direct Chat */}
            {showEmotionPanel && (
              <div className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-b border-blue-100 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-600 flex items-center gap-2 uppercase tracking-wider">
                    <FaChartLine className="text-blue-500" /> Emotion Analysis
                  </h4>
                  {emotionAnalysisEnabled ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">🔴 Live</span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Paused</span>
                  )}
                </div>
                {emotionHistory.length === 0 ? (
                  <p className="text-xs text-gray-400">No emotions detected yet. Enable analysis to start monitoring.</p>
                ) : (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {emotionHistory.map((entry, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white border border-gray-100 rounded-full px-2 py-1 flex items-center gap-1 shadow-sm"
                        title={entry.timestamp.toLocaleTimeString()}
                      >
                        {getEmotionEmoji(entry.emotion)} {entry.emotion}
                        <span className="text-gray-300">{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col space-y-3 pb-24" style={{ background: 'linear-gradient(180deg, #f8faf8 0%, #ffffff 100%)' }}>
              {chatLoadingDirect ? (
                <div className="text-center text-gray-400 py-8 text-sm">Loading messages...</div>
              ) : chatMessagesDirect.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatMessagesDirect.map(msg => (
                  msg.videoCall ? (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                          <FaVideo className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">Video Call Invitation</div>
                          <div className="text-[10px] text-blue-400 font-mono">Room: {msg.roomCode}</div>
                        </div>
                        <button
                          onClick={() => {
                            setPendingRoomCode(msg.roomCode);
                            setVideoCallOpen(true);
                          }}
                          className="text-white px-4 py-2 rounded-xl text-xs font-medium transition hover:scale-105"
                          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                        >
                          Join Call
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div key={msg.id} className={`flex items-end ${msg.senderId === currentUser.uid ? 'justify-end space-x-2' : 'justify-start space-x-2'}`}>
                    {msg.senderId !== currentUser.uid && (
                      <img
                        src={chatPatient.photoURL || chatPatient.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient')}&background=c7d2c4&color=374151`}
                        alt={chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient'}
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm break-words shadow-sm ${msg.senderId === currentUser.uid ? 'rounded-br-md text-white' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'}`} style={msg.senderId === currentUser.uid ? { background: 'linear-gradient(135deg, #3d6655 0%, #4a7c65 100%)' } : {}}>
                      <div>{msg.text}</div>
                      <div className={`text-[10px] mt-1 ${msg.senderId === currentUser.uid ? 'text-emerald-200 text-right' : 'text-gray-400 text-left'}`}>{msg.timestamp && new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {msg.senderId === currentUser.uid && (
                      <img
                        src={msg.senderImage || currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.email || 'Unknown Doctor')}&background=c7d2c4&color=374151`}
                        alt={currentUser.displayName || currentUser.email || 'Unknown Doctor'}
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                    )}
                  </div>
                  )
                ))
              )}
            </div>
            {/* Footer */}
            <div className="mt-auto border-t border-gray-100 bg-white">
                <div className="p-3 flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm bg-gray-50"
                        value={chatInputDirect}
                        onChange={e => setChatInputDirect(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && chatInputDirect.trim()) handleSendMessageDirect(); }}
                        autoFocus
                    />
                    <button
                        onClick={handleSendMessageDirect}
                        className="text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #3d6655 0%, #4a7c65 100%)' }}
                        disabled={!chatInputDirect.trim()}>
                        Send
                    </button>
                </div>
                <div className="px-4 py-2.5 bg-gray-50/80 flex justify-end items-center border-t border-gray-100">
                    <button
                        onClick={() => handleSaveAndEndChat('direct', chatMessagesDirect, { patientId: chatPatient?.id, patientName: chatPatient?.displayName || chatPatient?.name, patientPhotoURL: chatPatient?.photoURL })}
                        className="bg-red-50 text-red-600 px-6 py-2 rounded-xl text-xs font-medium hover:bg-red-100 transition w-full disabled:opacity-50"
                        disabled={chatMessagesDirect.length === 0}
                    >
                        Save & End Session
                    </button>
                </div>
            </div>
            {/* Video Call Modal for Direct Chat */}
            <VideoCallModal
              open={videoCallOpen}
              onClose={() => {
                setVideoCallOpen(false);
                setPendingRoomCode(null);
                setIsOutgoingCall(false);
              }}
              patientName={chatPatient?.displayName || chatPatient?.name || 'Patient'}
              doctorName={currentUser?.displayName || 'Doctor'}
              patientId={chatPatient?.id}
              doctorId={currentUser?.uid}
              initialRoomCode={pendingRoomCode}
              isDirectCall={isOutgoingCall && !!activeCallRoomId}
              directCallRoomId={activeCallRoomId}
            />
          </div>
        </div>
      )}

      {/* Chat Report Modal */}
      {reportModalOpen && chatReport && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-0 z-[100] sm:p-4">
          <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-2xl sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
            {/* Report Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="text-lg font-bold text-gray-800">Chat Report</h3>
                <button
                    onClick={() => setReportModalOpen(false)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                >
                    <FaTimes className="w-3 h-3 text-gray-500" />
                </button>
            </div>

            {/* Report Body */}
            <div className="flex-1 overflow-y-auto bg-white p-6 space-y-4">
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                <img
                    src={chatReport.patientPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatReport.patientName || 'P')}&background=c7d2c4&color=374151`}
                    alt={chatReport.patientName || 'Patient'}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
                />
                <div>
                    <h4 className="text-base font-bold text-gray-800">{chatReport.patientName}</h4>
                    <p className="text-xs text-gray-400 font-medium">Session Summary</p>
                </div>
              </div>

              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-2">Conversation Transcript</h5>
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 max-h-96 overflow-y-auto space-y-2">
                {chatReport.messages.map(msg => (
                  <div key={msg.id} className="p-3 rounded-xl bg-white border border-gray-50">
                    <p className="font-semibold text-sm text-gray-700">
                      {msg.senderRole === 'doctor' ? (currentUser.displayName || 'Doctor') : (chatReport.patientName || 'Patient')}
                      <span className="text-[10px] font-normal text-gray-400 ml-2">
                        {new Date(msg.timestamp?.seconds * 1000 || msg.timestamp).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                    onClick={() => setReportModalOpen(false)}
                    className="bg-gray-800 text-white px-6 py-2.5 rounded-xl hover:bg-gray-900 transition text-sm font-medium"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
