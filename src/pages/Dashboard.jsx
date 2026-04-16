import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaComments, FaCalendarAlt, FaStar, FaVideo, FaBrain, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { BsInfoCircle } from 'react-icons/bs';
import { getAllDoctors, scheduleChat, createOrGetChat, sendMessageToChat, listenForChatMessages, listenForChatDocChanges, resetUnreadCount, getChatDocument, getScheduledAppointmentsForPatient } from '../services/firestore';
import MoodTracker from '../components/dashboard/MoodTracker.jsx';
import VideoCallModal from '../components/dashboard/VideoCallModal.jsx';
import AITherapistChat from '../components/dashboard/AITherapistChat.jsx';
import { useEmotionMonitor } from '../utils/useEmotionMonitor';
import { toFriendlyLabel } from '../utils/emotionLabels';
import { useSocket } from '../contexts/SocketContext';

// Helper to get emoji for emotion
const getEmotionEmoji = (emotion) => {
  const emojiMap = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fear: '😨',
    surprised: '😲',
    neutral: '😐',
    disgust: '🤢',
    unknown: '❓',
  };
  return emojiMap[emotion?.toLowerCase()] || '🎭';
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleReason, setScheduleReason] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatListener, setChatListener] = useState(null);
  const [scheduledChats, setScheduledChats] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [emotionAnalysisEnabled, setEmotionAnalysisEnabled] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [emotionAnalyzing, setEmotionAnalyzing] = useState(false);
  const [pendingVideoRoomCode, setPendingVideoRoomCode] = useState(null);
  const [isOutgoingCall, setIsOutgoingCall] = useState(false);
  const [myAppointments, setMyAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // Socket context for direct video calls
  const { startCall, callStatus, activeCallRoomId, incomingCall } = useSocket();

  // When an incoming call is accepted (from IncomingCallNotification), open the video call modal
  useEffect(() => {
    if (callStatus === 'connected' && incomingCall && !videoCallOpen) {
      setPendingVideoRoomCode(incomingCall.roomId);
      setIsOutgoingCall(false);
      setVideoCallOpen(true);
    }
  }, [callStatus, incomingCall, videoCallOpen]);

  // Emotion monitoring hook - captures webcam frames and sends to Hugging Face API
  useEmotionMonitor({
    enabled: emotionAnalysisEnabled,
    intervalMs: 5000, // Analyze every 5 seconds
    onResult: (res) => {
      const emotion = toFriendlyLabel(res?.aggregated?.emotion || res?.faces?.[0]?.emotion || 'unknown');
      setDetectedEmotion(emotion);
      setEmotionAnalyzing(false);
    },
  });

  // Set analyzing state when emotion analysis starts
  useEffect(() => {
    if (emotionAnalysisEnabled) {
      setEmotionAnalyzing(true);
      setDetectedEmotion(null);
    } else {
      setDetectedEmotion(null);
      setEmotionAnalyzing(false);
    }
  }, [emotionAnalysisEnabled]);

  const chatBodyRef = useRef(null);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const docs = await getAllDoctors();
        setDoctors(docs);
      } catch (err) {
        setDoctors([]);
      }
      setLoading(false);
    };
    fetchDoctors();
  }, []);

  // Fetch patient's own appointments
  useEffect(() => {
    if (!currentUser) return;
    const fetchAppointments = async () => {
      setAppointmentsLoading(true);
      try {
        const appts = await getScheduledAppointmentsForPatient(currentUser.uid);
        setMyAppointments(appts);
      } catch (err) {
        setMyAppointments([]);
      }
      setAppointmentsLoading(false);
    };
    fetchAppointments();
  }, [currentUser]);

  // Listen for unread counts for each doctor
  useEffect(() => {
    if (!currentUser || !doctors.length) return;

    const unsubscribes = [];

    doctors.forEach(doctor => {
      const chatId = `${doctor.id}_${currentUser.uid}`;
      const unsub = listenForChatDocChanges(chatId, (chatDoc) => {
        if (chatDoc) {
          setUnreadCounts(prevCounts => ({
            ...prevCounts,
            [doctor.id]: chatDoc.unreadCountPatient || 0,
          }));
        }
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [doctors, currentUser]);

  const handleStartChat = (doctor) => {
    setSelectedDoctor(doctor);
    setShowChatModal(true);
    // Reset unread count when chat is opened
    if (currentUser) {
      const chatId = `${doctor.id}_${currentUser.uid}`;
      resetUnreadCount(chatId, currentUser.uid, 'patient');
    }
  };

  const handleScheduleChat = (doctor) => {
    setSelectedDoctor(doctor);
    setShowScheduleModal(true);
  };

  // Helper to get chatId: use scheduled chat's Firestore ID if available, else fallback
  const getChatId = () => {
    if (selectedDoctor && currentUser) {
      const scheduledChat = scheduledChats && scheduledChats.find(
        chat => chat.doctorId === selectedDoctor.id && chat.patientId === currentUser.uid
      );
      if (scheduledChat) return scheduledChat.id;
      return `${selectedDoctor.id}_${currentUser.uid}`;
    }
    return '';
  };

  // Listen for messages when chat modal opens
  useEffect(() => {
    if (showChatModal && selectedDoctor && currentUser) {
      const chatId = getChatId();
      const participants = [selectedDoctor.id, currentUser.uid];
      setChatMessages([]);
      setChatLoading(true);
      createOrGetChat(chatId, participants).then(() => {
        const unsub = listenForChatMessages(chatId, (msgs) => {
          setChatMessages(msgs);
          setChatLoading(false);
        });
        // Directly return unsub for cleanup
        return unsub;
      });
    }
    // eslint-disable-next-line
  }, [showChatModal, selectedDoctor, currentUser]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const messageToSend = chatInput;
    setChatInput(''); // Clear input immediately
    setChatLoading(true); // Indicate loading state

    const chatId = getChatId();
    try {
      await sendMessageToChat(chatId, {
        senderId: currentUser.uid,
        senderRole: 'patient',
        senderName: currentUser.displayName || currentUser.email || 'Unknown Patient',
        senderImage: currentUser.photoURL || '',
        text: messageToSend,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setChatLoading(false); // Ensure loading state is reset
    }
  };

  // Add a helper to add a system message to chatMessages
  const addSystemMessage = async (text) => {
    const chatId = getChatId();
    const systemMsg = {
      text,
      senderId: 'system',
      senderRole: 'system',
      senderName: 'System',
      senderImage: '',
      timestamp: new Date(),
      system: true,
    };
    setChatMessages((prev) => [
      ...prev,
      { ...systemMsg, id: `system-${Date.now()}` },
    ]);
    try {
      await sendMessageToChat(chatId, systemMsg);
    } catch (e) {
      // Optionally handle error
    }
  };

  // Send video call invitation with room code
  const sendVideoCallInvitation = async (roomCode) => {
    const chatId = getChatId();
    const invitationMsg = {
      text: `📹 Video call started! Room code: ${roomCode}`,
      senderId: 'system',
      senderRole: 'system',
      senderName: 'System',
      senderImage: '',
      timestamp: new Date(),
      system: true,
      videoCall: true,
      roomCode: roomCode,
    };
    setChatMessages((prev) => [
      ...prev,
      { ...invitationMsg, id: `videocall-${Date.now()}` },
    ]);
    try {
      await sendMessageToChat(chatId, invitationMsg);
    } catch (e) {
      console.error('Failed to send video call invitation:', e);
    }
  };

  useEffect(() => {
    if (showChatModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [showChatModal]);

  // Helper to format time
  const formatTime = (date) => {
    if (!date) return '';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by sender for iMessage style
  const groupedMessages = [];
  let lastSender = null;
  let group = [];
  chatMessages.forEach((msg, idx) => {
    if (msg.system) {
      if (group.length) groupedMessages.push(group);
      groupedMessages.push([msg]);
      group = [];
      lastSender = null;
    } else if (msg.senderId === lastSender) {
      group.push(msg);
    } else {
      if (group.length) groupedMessages.push(group);
      group = [msg];
      lastSender = msg.senderId;
    }
    if (idx === chatMessages.length - 1 && group.length) groupedMessages.push(group);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 pb-24">
      {/* Apple-style floating navbar is already present */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-32">
        {/* Welcome Section */}
        <div className="mb-20 text-center">
          <h1 className="text-4xl font-semibold text-gray-900 mb-3 tracking-tight" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
            Welcome back, <span className="text-primary-600 font-bold">{currentUser?.displayName || 'Patient'}</span>
          </h1>
          <p className="mt-2 text-base text-gray-500 font-light max-w-xl mx-auto">
            Your personalized mental health journey starts here. Connect with our professionals, track your progress, and take control of your well-being.
          </p>
        </div>

        {/* Doctors Section */}
        <div className="mb-20">
          <h2 className="text-lg font-semibold text-gray-800 mb-8 text-left" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
            Your Care Team
          </h2>
          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading doctors...</div>
          ) : doctors.length === 0 ? (
            <div className="text-center text-gray-400 py-12">No doctors are available at the moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center border border-gray-100 hover:shadow-lg transition-all duration-200"
                  style={{ minWidth: 260, maxWidth: 320 }}
                >
                  <img
                    src={doctor.photoURL || doctor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.displayName || doctor.name || doctor.email || 'Unknown Doctor')}&background=E5E7EB&color=374151`}
                    alt={doctor.displayName || doctor.email || 'Unknown Doctor'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-primary-100 mb-3 shadow-sm"
                  />
                  <h3 className="text-base font-semibold text-gray-900 text-center mb-1" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>{doctor.displayName || doctor.name || doctor.email || 'Unknown Doctor'}</h3>
                  <p className="text-xs text-primary-600 text-center mb-2 font-medium">{doctor.specialization || 'Specialist'}</p>
                  <div className="flex items-center text-xs text-gray-500 justify-center mb-1 gap-2">
                    <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">{doctor.rating !== undefined && doctor.rating !== null ? doctor.rating : '—'} ★</span>
                    <span className="mx-2">•</span>
                    <span>{doctor.experience || '—'} yrs</span>
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-4">{doctor.availability || 'Availability: Unknown'}</p>
                  <div className="flex gap-3 w-full mt-auto">
                    <button
                      onClick={() => handleStartChat(doctor)}
                      className="flex-1 bg-primary-100 text-primary-700 py-2 rounded-full font-semibold text-sm shadow-sm hover:bg-primary-200 transition-all"
                    >
                      Chat Now
                    </button>
                    <button
                      onClick={() => handleScheduleChat(doctor)}
                      className="flex-1 bg-secondary-100 text-secondary-700 py-2 rounded-full font-semibold text-sm shadow-sm hover:bg-secondary-200 transition-all"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Appointments Section */}
        <div className="mb-20">
          <h2 className="text-lg font-semibold text-gray-800 mb-8 text-left" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
            My Appointments
          </h2>
          {appointmentsLoading ? (
            <div className="text-center text-gray-400 py-12">Loading appointments...</div>
          ) : myAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-500 text-sm">No appointments scheduled yet.</p>
              <p className="text-gray-400 text-xs mt-1">Book an appointment with a doctor above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myAppointments
                .sort((a, b) => {
                  const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
                  const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
                  return dateA - dateB;
                })
                .map((appt) => {
                  const apptDate = new Date(`${appt.date}T${appt.time || '00:00'}`);
                  const isPast = apptDate < new Date();
                  const statusColors = {
                    'Scheduled': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <FaClock className="text-amber-500" /> },
                    'Confirmed': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <FaCheckCircle className="text-green-500" /> },
                    'Cancelled': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <FaTimesCircle className="text-red-500" /> },
                    'Completed': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: <FaCheckCircle className="text-gray-400" /> },
                  };
                  const sc = statusColors[appt.status] || statusColors['Scheduled'];
                  return (
                    <div
                      key={appt.id}
                      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200 ${isPast && appt.status === 'Scheduled' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={appt.doctorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.doctorName || 'D')}&background=E5E7EB&color=374151`}
                            alt={appt.doctorName}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                          />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{appt.doctorName || 'Doctor'}</p>
                            <p className="text-xs text-primary-600">{appt.doctorSpecialization || 'Specialist'}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {sc.icon}
                          {appt.status || 'Scheduled'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                          <FaCalendarAlt className="text-[10px]" />
                          {appt.date ? new Date(appt.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No date'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-secondary-50 text-secondary-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                          🕐 {appt.time || 'No time'}
                        </span>
                      </div>
                      {appt.reason && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
                          📝 {appt.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Mood Tracker Section */}
        <div className="mb-20">
          <MoodTracker />
        </div>

        {/* AI Therapist Chat Section */}
        <div className="mb-20">
          <h2 className="text-lg font-semibold text-gray-800 mb-8 text-left" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
            AI Therapist Support
          </h2>
          <AITherapistChat />
        </div>

        {/* Chat Modal and Schedule Modal remain unchanged, but benefit from new background and spacing */}
        {showChatModal && selectedDoctor && (
          <>
            <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4 animate-fadeIn">
              <div className="bg-primary-50 w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-lg sm:max-h-[90vh] sm:min-h-[400px] overflow-hidden border border-primary-100 animate-slideUp">
                {/* Chat Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-primary-200 bg-primary-600 text-white rounded-t-3xl">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedDoctor.photoURL || selectedDoctor.image || 'https://ui-avatars.com/api/?name=Unknown+Doctor&background=E5E7EB&color=374151'}
                      alt={selectedDoctor.displayName || selectedDoctor.name || selectedDoctor.email || 'Unknown Doctor'}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white ring-opacity-50"
                    />
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedDoctor.displayName || selectedDoctor.name || selectedDoctor.email || 'Unknown Doctor'}
                      </h3>
                      <p className="text-sm text-primary-100">{selectedDoctor.specialization || 'Doctor'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Emotion Analysis Display */}
                    {emotionAnalysisEnabled && (
                      <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                        <span className="text-xs text-white/80">Emotion:</span>
                        <span className="text-sm font-semibold text-white">
                          {emotionAnalyzing ? '🔄 Analyzing...' : detectedEmotion ? `${getEmotionEmoji(detectedEmotion)} ${detectedEmotion}` : '—'}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => setEmotionAnalysisEnabled(!emotionAnalysisEnabled)}
                      className={`${emotionAnalysisEnabled ? 'bg-green-400 text-white' : 'bg-primary-100 text-primary-700'} hover:bg-primary-200 p-2 rounded-full transition shadow flex items-center justify-center`}
                      title={emotionAnalysisEnabled ? 'Disable Emotion Analysis' : 'Enable Emotion Analysis'}
                    >
                      <FaBrain className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        // Initiate call via socket for real-time notification
                        if (selectedDoctor) {
                          const doctorName = selectedDoctor.displayName || selectedDoctor.name || selectedDoctor.email || 'Doctor';
                          startCall(selectedDoctor.id, doctorName);
                        }
                        setIsOutgoingCall(true);
                        setVideoCallOpen(true);
                      }}
                      className="bg-primary-100 hover:bg-primary-200 text-primary-700 p-2 rounded-full transition shadow flex items-center justify-center"
                      title="Start Video Call"
                    >
                      <FaVideo className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowChatModal(false)}
                      className="text-white hover:text-primary-200 transition-colors text-2xl font-bold ml-2"
                      title="Close"
                    >
                      &times;
                    </button>
                  </div>
                </div>
                {/* Chat Body */}
                <div ref={chatBodyRef} className="flex-1 overflow-y-auto px-4 py-6 flex flex-col space-y-4 pb-24">
                  {chatLoading ? (
                    <div className="text-center text-gray-400 py-8">Loading messages...</div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
                  ) : (
                    groupedMessages.map((group, gIdx) => (
                      group[0].system ? (
                        <div key={group[0].id} className="flex justify-center my-4 animate-slideInCenter">
                          <div className="flex items-center gap-2 bg-tertiary-100 border border-tertiary-200 text-primary-700 text-xs px-4 py-2 rounded-full shadow font-semibold italic opacity-90">
                            <BsInfoCircle className="w-4 h-4 text-tertiary-400" />
                            <span>{group[0].text}</span>
                          </div>
                          <span className="block text-[10px] text-gray-400 mt-1 ml-2">{formatTime(group[0].timestamp)}</span>
                        </div>
                      ) : (
                        <div key={group[0].id} className={`flex ${group[0].senderId === currentUser.uid ? 'justify-end' : 'justify-start'} mb-2 animate-slideIn${group[0].senderId === currentUser.uid ? 'Right' : 'Left'}`}> 
                          <div className="flex items-end gap-2">
                            {/* Avatar only for first in group, not for self */}
                            {group[0].senderId !== currentUser.uid && (
                              <img
                                src={group[0].senderImage || selectedDoctor?.photoURL || selectedDoctor?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDoctor?.displayName || selectedDoctor?.name || selectedDoctor?.email || 'Unknown Doctor')}&background=E5E7EB&color=374151`}
                                alt={group[0].senderName || 'Doctor'}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border-2 border-primary-100"
                              />
                            )}
                            <div className="flex flex-col items-end">
                              {group.map((msg, idx) => (
                                <div
                                  key={msg.id}
                                  className={`max-w-[70vw] px-4 py-2 mb-1 rounded-3xl shadow text-sm break-words transition-all duration-300 ${msg.senderId === currentUser.uid ? 'bg-primary-500 text-white rounded-br-md' : 'bg-white text-gray-900 border border-primary-100 rounded-bl-md'} ${idx === group.length - 1 ? 'mb-0' : ''}`}
                                  style={{ animation: `bubbleIn 0.3s ${gIdx * 0.05 + idx * 0.01}s both` }}
                                >
                                  {msg.text}
                                  <span className="block text-[10px] text-gray-400 mt-1 text-right">{formatTime(msg.timestamp)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    ))
                  )}
                  {/* Typing indicator placeholder (simulate doctor typing for demo) */}
                  {/* {isTyping && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-150"></span>
                      <span className="text-xs text-primary-400 ml-2">Doctor is typing...</span>
                    </div>
                  )} */}
                </div>
                {/* Chat Input */}
                <div className="absolute bottom-0 w-full flex items-center gap-3 px-4 py-4 border-t border-primary-100 bg-white rounded-b-3xl">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 border border-primary-200 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm bg-primary-50"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); setIsTyping(true); setTimeout(() => setIsTyping(false), 1200); }}
                    autoFocus
                  />
                  <button
                    className="bg-primary-600 text-white px-8 py-3 rounded-full hover:bg-primary-700 transition-colors text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow flex items-center gap-2"
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Schedule Appointment Modal */}
        {showScheduleModal && selectedDoctor && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ animation: 'fadeIn 0.2s ease' }}>
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.3s ease' }}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedDoctor.photoURL || selectedDoctor.image || 'https://ui-avatars.com/api/?name=Unknown+Doctor&background=E5E7EB&color=374151'}
                      alt={selectedDoctor.displayName || selectedDoctor.name || 'Doctor'}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/30"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Book Appointment
                      </h3>
                      <p className="text-sm text-primary-100">
                        with {selectedDoctor.displayName || selectedDoctor.name || selectedDoctor.email || 'Doctor'} · {selectedDoctor.specialization || 'Specialist'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowScheduleModal(false); setScheduleSuccess(false); setScheduleError(''); }}
                    className="text-white/70 hover:text-white transition-colors text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>
              </div>
              {/* Modal Body */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setScheduleLoading(true);
                  setScheduleError('');
                  setScheduleSuccess(false);
                  try {
                    const appointmentData = {
                      doctorId: selectedDoctor.id,
                      doctorName: selectedDoctor.displayName || selectedDoctor.name || selectedDoctor.email || 'Unknown Doctor',
                      doctorPhoto: selectedDoctor.photoURL || selectedDoctor.image || '',
                      doctorSpecialization: selectedDoctor.specialization || '',
                      patientId: currentUser.uid,
                      patientName: currentUser.displayName || currentUser.email || 'Unknown Patient',
                      patientEmail: currentUser.email || '',
                      patientImage: currentUser.photoURL || '',
                      patientPhotoURL: currentUser.photoURL || '',
                      date: scheduleDate,
                      time: scheduleTime,
                      reason: scheduleReason,
                      status: 'Scheduled',
                      createdAt: new Date().toISOString(),
                    };
                    await scheduleChat(appointmentData);
                    setScheduleSuccess(true);
                    setScheduleDate('');
                    setScheduleTime('');
                    setScheduleReason('');
                    // Refresh appointments list
                    const appts = await getScheduledAppointmentsForPatient(currentUser.uid);
                    setMyAppointments(appts);
                  } catch (err) {
                    setScheduleError('Failed to schedule appointment. Please try again.');
                  }
                  setScheduleLoading(false);
                }}
                className="p-6 space-y-5"
              >
                {scheduleSuccess && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <FaCheckCircle className="text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-green-800 font-semibold text-sm">Appointment Scheduled!</p>
                      <p className="text-green-600 text-xs">Your doctor will be notified. You can view it in "My Appointments" below.</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Date</label>
                    <input
                      type="date"
                      required
                      value={scheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm bg-gray-50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">🕐 Time</label>
                    <input
                      type="time"
                      required
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm bg-gray-50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Reason for Appointment <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    value={scheduleReason}
                    onChange={e => setScheduleReason(e.target.value)}
                    placeholder="Brief description of what you'd like to discuss..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm bg-gray-50 resize-none transition-all"
                  />
                </div>
                {scheduleError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <FaTimesCircle className="flex-shrink-0" /> {scheduleError}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={scheduleLoading}
                >
                  <FaCalendarAlt className="text-sm" />
                  {scheduleLoading ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Video Call Modal — rendered outside all other modals so it works
          regardless of whether a chat modal is open */}
      <VideoCallModal
        open={videoCallOpen}
        onClose={() => {
          setVideoCallOpen(false);
          setPendingVideoRoomCode(null);
          setIsOutgoingCall(false);
          // Only add system message if chat is open
          if (showChatModal && selectedDoctor) {
            addSystemMessage('Video call ended');
          }
        }}
        patientName={currentUser?.displayName}
        doctorName={selectedDoctor?.displayName}
        patientId={currentUser?.uid}
        onRoomCreated={(roomCode) => {
          if (showChatModal && selectedDoctor) {
            sendVideoCallInvitation(roomCode);
          }
        }}
        initialRoomCode={pendingVideoRoomCode}
        isDirectCall={isOutgoingCall && !!activeCallRoomId}
        directCallRoomId={activeCallRoomId}
      />
    </div>
  );
};

export default Dashboard;