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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            {/* History Header */}
            <div className="flex items-center justify-between mb-8 border-b pb-4">
                <div className="flex items-center space-x-4">
                    <button onClick={handleBackToDashboard} className="text-gray-600 hover:text-gray-900">
                        <FaArrowLeft className="h-6 w-6" />
                    </button>
                    <img
                        src={viewingPatientHistory.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingPatientHistory.displayName || 'P')}&background=E5E7EB&color=374151`}
                        alt={viewingPatientHistory.displayName || 'Patient'}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">{viewingPatientHistory.displayName || 'Unknown Patient'}</h3>
                        <p className="text-sm text-gray-500">Chat History</p>
                    </div>
                </div>
            </div>

            {/* History Body */}
            {historyLoading ? (
              <div className="text-center text-gray-500 py-10">Loading history...</div>
            ) : patientHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No chat history found for this patient.</div>
            ) : (
              <ul className="space-y-4">
                {patientHistory.map(report => (
                  <li key={report.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition cursor-pointer" onClick={() => { setChatReport(report); setReportModalOpen(true); }}>
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-800">Chat Session</p>
                      <p className="text-sm text-gray-500">{formatTimestamp(report.createdAt)}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{report.messages.length} messages</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Re-using the report modal to show history details */}
        {reportModalOpen && chatReport && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4">
            <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-2xl sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-xl font-semibold text-gray-800">Chat Transcript - {formatTimestamp(chatReport.createdAt)}</h3>
                  <button onClick={() => setReportModalOpen(false)} className="text-gray-500 hover:text-gray-800 transition-colors">
                      <FaTimes/>
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-white p-6 space-y-4">
                <div className="prose prose-sm max-w-none">
                  {chatReport.messages.map(msg => (
                    <div key={msg.id || msg.timestamp.seconds} className="mb-2">
                      <p className="font-bold">
                        {msg.senderName || (msg.senderRole === 'doctor' ? 'Doctor' : 'Patient')}
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </p>
                      <p>{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button onClick={() => setReportModalOpen(false)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                      Close
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Doctor Dashboard</h1>
          <div className="mb-8">
            <EmotionPanel />
          </div>

          {/* Patient Users Section */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Patients</h2>
            {loading ? (
              <div className="text-gray-500 text-center py-8">Loading patients...</div>
            ) : patients.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No patients found.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <li key={patient.id} className="flex flex-col sm:flex-row items-start sm:items-center bg-gray-50 rounded-lg p-4 sm:p-5 mb-4 hover:shadow transition group">
                    <img src={patient.photoURL || patient.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.displayName || patient.name || patient.email || 'Unknown Patient')}&background=E5E7EB&color=374151`} alt={patient.displayName || patient.name || patient.email || 'Unknown Patient'} className="w-12 h-12 rounded-full object-cover mr-4 mb-2 sm:mb-0 shrink-0" />
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center justify-between flex-wrap">
                        <div className="font-medium text-gray-900 text-base break-words min-w-0 sm:max-w-[calc(100%-60px)]">{patient.displayName || patient.name || patient.email || 'Unknown Patient'}</div>
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-semibold ml-auto sm:ml-2 mt-2 sm:mt-0 whitespace-nowrap">Patient</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1 break-words"> 
                        <FaEnvelope className="mr-1" /> {patient.email || 'Unknown' }
                      </div>
                    </div>
                    <div className="flex flex-col items-end w-full sm:w-auto ml-0 sm:ml-4 mt-4 sm:mt-0 space-y-2">
                      <button
                        className="w-full sm:w-auto flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm relative"
                        onClick={() => setChatPatient(patient)}
                      >
                        <FaComments className="mr-2" /> Chat
                        {unreadCounts[patient.id] > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCounts[patient.id]}
                          </span>
                        )}
                      </button>
                      <button
                        className="w-full sm:w-auto flex items-center justify-center bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm"
                        onClick={() => handleStartVideoCall(patient)}
                      >
                        <FaVideo className="mr-2" /> Video Call
                      </button>
                      <button
                        className="w-full sm:w-auto flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
                        onClick={() => handleViewHistory(patient)}
                      >
                        <FaHistory className="mr-2" /> History
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Scheduled Chats */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Scheduled Chats</h2>
            {loadingChats ? (
              <div className="text-gray-500 text-center py-8">Loading scheduled chats...</div>
            ) : scheduledChats.length === 0 ? (
              <div className="text-gray-500 text-center py-8">This feature is coming soon.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {scheduledChats.map((chat) => (
                  <li key={chat.id} className="flex flex-col sm:flex-row items-start sm:items-center bg-gray-50 rounded-lg p-4 sm:p-5 mb-4 hover:shadow transition group">
                    <img src={chat.patientPhotoURL || chat.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.patientName || chat.patientEmail || 'Unknown Patient')}&background=E5E7EB&color=374151`} alt={chat.patientName || 'Unknown Patient'} className="w-12 h-12 rounded-full object-cover mr-4 mb-2 sm:mb-0 shrink-0" />
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center justify-between flex-wrap">
                        <div className="font-medium text-gray-900 text-base break-words min-w-0 sm:max-w-[calc(100%-60px)]">{chat.patientName || 'Unknown Patient'}</div>
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold ml-auto sm:ml-2 mt-2 sm:mt-0 whitespace-nowrap">{chat.status || 'Scheduled'}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1 break-words">
                        <FaEnvelope className="mr-1" /> {chat.patientEmail || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 break-words">{chat.date} at {chat.time}</div>
                    </div>
                    <div className="flex flex-col items-end w-full sm:w-auto ml-0 sm:ml-4 mt-4 sm:mt-0">
                      <button
                        className="w-full sm:w-auto flex items-center justify-center bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors shadow-sm relative"
                        onClick={() => openModal('view', chat)}
                      >
                        <FaCalendarAlt className="mr-2" /> View
                        {unreadCounts[chat.id] > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCounts[chat.id]}
                          </span>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

      {/* Modal for Chat/View */}
      {modalOpen && modalData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4">
          <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-lg sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-green-600 text-white">
              <div className="flex items-center space-x-3">
                <img
                  src={modalData.patientPhotoURL || modalData.patientImage || 'https://ui-avatars.com/api/?name=Unknown+Patient&background=E5E7EB&color=374151'}
                  alt={modalData.patientName || 'Unknown Patient'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white ring-opacity-50"
                />
                <div>
                  <h3 className="text-xl font-semibold">{modalData.patientName || 'Unknown Patient'}</h3>
                  <p className="text-sm text-green-100">Patient</p>
                </div>
              </div>
              {timeLeft !== null && (
                <div className="text-white font-semibold text-lg bg-white/20 px-3 py-1 rounded-lg">
                  {`${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Emotion Display */}
                {emotionAnalysisEnabled && detectedEmotion && (
                  <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
                    <span className="text-sm">{getEmotionEmoji(detectedEmotion)} {detectedEmotion}</span>
                  </div>
                )}
                {/* Emotion Analysis Toggle */}
                <button
                  onClick={() => setEmotionAnalysisEnabled(!emotionAnalysisEnabled)}
                  className={`${emotionAnalysisEnabled ? 'bg-yellow-400 text-gray-800' : 'bg-white/20 text-white'} hover:bg-white/30 p-2 rounded-full transition`}
                  title={emotionAnalysisEnabled ? 'Disable Emotion Analysis' : 'Enable Emotion Analysis'}
                >
                  <FaBrain className="w-4 h-4" />
                </button>
                {/* Emotion History Panel Toggle */}
                <button
                  onClick={() => setShowEmotionPanel(!showEmotionPanel)}
                  className={`${showEmotionPanel ? 'bg-blue-400 text-white' : 'bg-white/20 text-white'} hover:bg-white/30 p-2 rounded-full transition`}
                  title="View Emotion History"
                >
                  <FaChartLine className="w-4 h-4" />
                </button>
                <button
                  className="text-white hover:text-green-100 transition-colors"
                  onClick={closeChatModals}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Emotion History Panel */}
            {showEmotionPanel && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FaChartLine className="text-blue-500" /> Patient Emotion Analysis
                  </h4>
                  {emotionAnalysisEnabled ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">🔴 Live</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Paused</span>
                  )}
                </div>
                {emotionHistory.length === 0 ? (
                  <p className="text-xs text-gray-500">No emotions detected yet. Enable analysis to start monitoring.</p>
                ) : (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {emotionHistory.map((entry, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white border border-gray-200 rounded-full px-2 py-1 flex items-center gap-1"
                        title={entry.timestamp.toLocaleTimeString()}
                      >
                        {getEmotionEmoji(entry.emotion)} {entry.emotion}
                        <span className="text-gray-400">{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {modalType === 'view' ? (
              <>
                <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-6 flex flex-col space-y-4 pb-24">
                  {chatLoading ? (
                    <div className="text-center text-gray-400 py-8">Loading messages...</div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex items-end ${msg.senderId === currentUser.uid ? 'justify-end space-x-2' : 'justify-start space-x-2'}`}> 
                        {msg.senderId !== currentUser.uid && (
                          <img
                            src={modalData.patientPhotoURL || modalData.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(modalData.patientName || modalData.patientEmail || 'Unknown Patient')}&background=E5E7EB&color=374151`}
                            alt={modalData.patientName || 'Unknown Patient'}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        )}
                        <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-sm break-words ${msg.senderId === currentUser.uid ? 'bg-green-600 text-white rounded-br-none' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'} transition-opacity duration-200 ease-out`}>
                          <div>{msg.text}</div>
                          <div className={`text-xs mt-1 ${msg.senderId === currentUser.uid ? 'text-green-200 text-right' : 'text-gray-500 text-left'}`}>{msg.timestamp && new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {msg.senderId === currentUser.uid && (
                          <img
                            src={msg.senderImage || currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.email || 'Unknown Doctor')}&background=E5E7EB&color=374151`}
                            alt={currentUser.displayName || currentUser.email || 'Unknown Doctor'}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
                {/* Session Notes below chat history */}
                <div className="px-4 pb-6">
                  <SessionNotes
                    doctorId={currentUser?.uid}
                    patientId={modalData?.patientId}
                    sessionId={modalData?.id}
                    sessionDate={modalData?.date}
                  />
                </div>
                {/* Footer with Input and Actions */}
                <div className="mt-auto border-t border-gray-100 bg-white">
                    <div className="p-4 flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Type your message..."
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) handleSendMessage(); }}
                            autoFocus
                        />
                        <button 
                            onClick={handleSendMessage} 
                            className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50" 
                            disabled={!chatInput.trim()}>
                            Send
                        </button>
                    </div>
                    <div className="px-6 py-3 bg-gray-50 flex justify-end items-center border-t">
                        <button
                            onClick={() => handleSaveAndEndChat('scheduled', chatMessages, { patientId: modalData?.patientId, patientName: modalData?.patientName, patientPhotoURL: modalData?.patientPhotoURL })}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full disabled:opacity-50"
                            disabled={chatMessages.length === 0}
                        >
                            Save & End Session
                        </button>
                    </div>
                </div>
                <div className="flex justify-center mt-4">
                  <button
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition shadow"
                    onClick={() => setVideoCallOpen(true)}
                  >
                    Start Video Call
                  </button>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4">
          <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-lg sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-green-600 text-white">
              <div className="flex items-center space-x-3">
                <img
                  src={chatPatient.photoURL || chatPatient.image || 'https://ui-avatars.com/api/?name=Unknown+Patient&background=E5E7EB&color=374151'}
                  alt={chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white ring-opacity-50"
                />
                <div>
                  <h3 className="text-xl font-semibold">
                    {chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient'}
                  </h3>
                  <p className="text-sm text-green-100">Patient</p>
                </div>
              </div>
              {timeLeft !== null && (
                <div className="text-white font-semibold text-lg bg-white/20 px-3 py-1 rounded-lg">
                  {`${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Emotion Display */}
                {emotionAnalysisEnabled && detectedEmotion && (
                  <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg">
                    <span className="text-sm">{getEmotionEmoji(detectedEmotion)} {detectedEmotion}</span>
                  </div>
                )}
                {/* Video Call Button */}
                <button
                  onClick={() => {
                    setIsOutgoingCall(false);
                    setVideoCallOpen(true);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition"
                  title="Start Video Call"
                >
                  <FaVideo className="w-4 h-4" />
                </button>
                {/* Emotion Analysis Toggle */}
                <button
                  onClick={() => setEmotionAnalysisEnabled(!emotionAnalysisEnabled)}
                  className={`${emotionAnalysisEnabled ? 'bg-yellow-400 text-gray-800' : 'bg-white/20 text-white'} hover:bg-white/30 p-2 rounded-full transition`}
                  title={emotionAnalysisEnabled ? 'Disable Emotion Analysis' : 'Enable Emotion Analysis'}
                >
                  <FaBrain className="w-4 h-4" />
                </button>
                {/* Emotion History Panel Toggle */}
                <button
                  onClick={() => setShowEmotionPanel(!showEmotionPanel)}
                  className={`${showEmotionPanel ? 'bg-blue-400 text-white' : 'bg-white/20 text-white'} hover:bg-white/30 p-2 rounded-full transition`}
                  title="View Emotion History"
                >
                  <FaChartLine className="w-4 h-4" />
                </button>
                <button
                  onClick={closeChatModals}
                  className="text-white hover:text-green-100 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Emotion History Panel for Direct Chat */}
            {showEmotionPanel && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FaChartLine className="text-blue-500" /> Patient Emotion Analysis
                  </h4>
                  {emotionAnalysisEnabled ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">🔴 Live</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Paused</span>
                  )}
                </div>
                {emotionHistory.length === 0 ? (
                  <p className="text-xs text-gray-500">No emotions detected yet. Enable analysis to start monitoring.</p>
                ) : (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {emotionHistory.map((entry, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white border border-gray-200 rounded-full px-2 py-1 flex items-center gap-1"
                        title={entry.timestamp.toLocaleTimeString()}
                      >
                        {getEmotionEmoji(entry.emotion)} {entry.emotion}
                        <span className="text-gray-400">{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-6 flex flex-col space-y-4 pb-24">
              {chatLoadingDirect ? (
                <div className="text-center text-gray-400 py-8">Loading messages...</div>
              ) : chatMessagesDirect.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
              ) : (
                chatMessagesDirect.map(msg => (
                  msg.videoCall ? (
                    // Video call invitation with Join button
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-blue-100 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
                        <span className="text-2xl">📹</span>
                        <div>
                          <div className="font-medium">Video Call Invitation</div>
                          <div className="text-xs text-blue-600">Room: {msg.roomCode}</div>
                        </div>
                        <button
                          onClick={() => {
                            setPendingRoomCode(msg.roomCode);
                            setVideoCallOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          Join Call
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div key={msg.id} className={`flex items-end ${msg.senderId === currentUser.uid ? 'justify-end space-x-2' : 'justify-start space-x-2'}`}> 
                    {msg.senderId !== currentUser.uid && (
                      <img
                        src={chatPatient.photoURL || chatPatient.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient')}&background=E5E7EB&color=374151`}
                        alt={chatPatient.displayName || chatPatient.name || chatPatient.email || 'Unknown Patient'}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    )}
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-sm break-words ${msg.senderId === currentUser.uid ? 'bg-green-600 text-white rounded-br-none' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'} transition-opacity duration-200 ease-out`}>
                      <div>{msg.text}</div>
                      <div className={`text-xs mt-1 ${msg.senderId === currentUser.uid ? 'text-green-200 text-right' : 'text-gray-500 text-left'}`}>{msg.timestamp && new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {msg.senderId === currentUser.uid && (
                      <img
                        src={msg.senderImage || currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || currentUser?.email || 'Unknown Doctor')}&background=E5E7EB&color=374151`}
                        alt={currentUser.displayName || currentUser.email || 'Unknown Doctor'}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    )}
                  </div>
                  )
                ))
              )}
            </div>
            {/* Footer with Input and Actions */}
            <div className="mt-auto border-t border-gray-100 bg-white">
                <div className="p-4 flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        value={chatInputDirect}
                        onChange={e => setChatInputDirect(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && chatInputDirect.trim()) handleSendMessageDirect(); }}
                        autoFocus
                    />
                    <button 
                        onClick={handleSendMessageDirect} 
                        className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50" 
                        disabled={!chatInputDirect.trim()}>
                        Send
                    </button>
                </div>
                <div className="px-6 py-3 bg-gray-50 flex justify-end items-center border-t">
                    <button
                        onClick={() => handleSaveAndEndChat('direct', chatMessagesDirect, { patientId: chatPatient?.id, patientName: chatPatient?.displayName || chatPatient?.name, patientPhotoURL: chatPatient?.photoURL })}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 z-[100] sm:p-4">
          <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-2xl sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden">
            {/* Report Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-800">Chat Report</h3>
                <button
                    onClick={() => setReportModalOpen(false)}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Report Body */}
            <div className="flex-1 overflow-y-auto bg-white p-6 space-y-4">
              <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                <img
                    src={chatReport.patientPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatReport.patientName || 'P')}&background=E5E7EB&color=374151`}
                    alt={chatReport.patientName || 'Patient'}
                    className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                    <h4 className="text-lg font-bold text-gray-900">{chatReport.patientName}</h4>
                    <p className="text-sm text-gray-500">Chat Session Summary</p>
                </div>
              </div>

              <h5 className="text-md font-semibold text-gray-700 pt-4">Conversation Transcript:</h5>
              <div className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                {chatReport.messages.map(msg => (
                  <div key={msg.id} className="mb-2">
                    <p className="font-bold">
                      {msg.senderRole === 'doctor' ? (currentUser.displayName || 'Doctor') : (chatReport.patientName || 'Patient')}
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        {new Date(msg.timestamp?.seconds * 1000 || msg.timestamp).toLocaleString()}
                      </span>
                    </p>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                    onClick={() => setReportModalOpen(false)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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