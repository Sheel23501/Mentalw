import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaComments, FaCalendarAlt, FaStar, FaVideo, FaBrain, FaClock, FaCheckCircle, FaTimesCircle, FaTh, FaUserMd, FaClipboardList, FaUser, FaSignOutAlt, FaEdit, FaSave, FaRobot } from 'react-icons/fa';
import { BsInfoCircle } from 'react-icons/bs';
import { getAllDoctors, scheduleChat, createOrGetChat, sendMessageToChat, listenForChatMessages, listenForChatDocChanges, resetUnreadCount, getChatDocument, getScheduledAppointmentsForPatient, getUserProfile, updateUserProfile } from '../services/firestore';
import MoodTracker from '../components/dashboard/MoodTracker.jsx';
import VideoCallModal from '../components/dashboard/VideoCallModal.jsx';
import AITherapistChat from '../components/dashboard/AITherapistChat.jsx';
import MentalHealthTest from './Dashboard/MentalHealthTest.jsx';
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

// ─── Left Sidebar ────────────────────────────────────────────────────────────
const PatientSidebar = ({ activeTab, setActiveTab, patientName, patientPhoto, onLogout }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FaTh /> },
    { id: 'doctors', label: 'Available Doctors', icon: <FaUserMd /> },
    { id: 'tests', label: 'Tests', icon: <FaClipboardList /> },
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
  ];

  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #1e3a2f 0%, #2d4a3e 50%, #1a3028 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
      boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
    }}>
      {/* Brand */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ade80, #22c55e)', flexShrink: 0 }} />
          <span style={{ color: 'white', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', fontFamily: "'Inter', sans-serif" }}>TruCare</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 500, marginLeft: '42px', letterSpacing: '1px', textTransform: 'uppercase' }}>Patient Portal</p>
      </div>

      {/* Patient mini-profile */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={patientPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(patientName || 'Patient')}&background=4a7c65&color=fff`}
          alt={patientName}
          style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }}
        />
        <div style={{ overflow: 'hidden' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patientName || 'Patient'}</p>
          <p style={{ color: 'rgba(74,222,128,0.8)', fontSize: '11px', fontWeight: 500 }}>● Online</p>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              fontWeight: activeTab === item.id ? 700 : 500,
              color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.55)',
              background: activeTab === item.id
                ? 'linear-gradient(135deg, rgba(74,124,101,0.7) 0%, rgba(61,102,85,0.5) 100%)'
                : 'transparent',
              boxShadow: activeTab === item.id ? '0 2px 12px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={e => {
              if (activeTab !== item.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== item.id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
              }
            }}
          >
            <span style={{ fontSize: '15px', opacity: activeTab === item.id ? 1 : 0.7 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '11px 14px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(252,165,165,0.85)',
            background: 'transparent',
            transition: 'all 0.2s ease',
            width: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
            e.currentTarget.style.color = '#fca5a5';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(252,165,165,0.85)';
          }}
        >
          <FaSignOutAlt style={{ fontSize: '15px' }} />
          Logout
        </button>
      </div>
    </aside>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = ({ currentUser, doctors, myAppointments, appointmentsLoading, onStartChat, onScheduleChat, setActiveTab }) => {
  // Find next upcoming appointment
  const upcomingAppointment = myAppointments
    .filter(a => {
      const dt = new Date(`${a.date}T${a.time || '00:00'}`);
      return dt >= new Date() && (a.status === 'Scheduled' || a.status === 'Confirmed');
    })
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))[0];

  const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return 'No date';
    const dt = new Date(dateStr + 'T00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (dt.toDateString() === today.toDateString()) return 'Today';
    if (dt.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Completed goals count (for demo purposes we track appointments completed)
  const completedAppts = myAppointments.filter(a => a.status === 'Completed').length;
  const totalAppts = myAppointments.length;
  const progressPercent = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0;

  return (
    <div>
      {/* Welcome + Stats Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ color: '#1f2937', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.5px', marginBottom: '6px', fontFamily: "'Inter', sans-serif" }}>
            Hello, {currentUser?.displayName?.split(' ')[0] || 'there'}.
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', maxWidth: '420px' }}>
            It's a beautiful day to prioritize your mental wellbeing.
            {totalAppts > 0 && <><br />You've completed {progressPercent}% of your appointments.</>}
          </p>
        </div>
        <button
          onClick={() => setActiveTab('tests')}
          style={{
            background: 'linear-gradient(135deg, #4a7c65 0%, #3d6655 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 4px 16px rgba(74,124,101,0.3)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          Take Assessment
        </button>
      </div>

      {/* Two-column cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Upcoming Session Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span style={{
            display: 'inline-block',
            background: '#ecfdf5',
            color: '#059669',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '999px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '16px',
            border: '1px solid #a7f3d0',
          }}>Upcoming Session</span>

          {upcomingAppointment ? (
            <>
              <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: '18px', marginBottom: '12px' }}>
                Therapy with {upcomingAppointment.doctorName || 'Doctor'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>
                  <FaCalendarAlt style={{ color: '#4a7c65', fontSize: '12px' }} />
                  {formatAppointmentDate(upcomingAppointment.date)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>
                  <FaClock style={{ color: '#4a7c65', fontSize: '12px' }} />
                  {upcomingAppointment.time || 'No time set'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    const doc = doctors.find(d => d.id === upcomingAppointment.doctorId);
                    if (doc) onStartChat(doc);
                  }}
                  style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    borderRadius: '999px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#d1fae5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ecfdf5'}
                >
                  Prepare for Session
                </button>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  {upcomingAppointment.status === 'Confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                </span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>No upcoming sessions</p>
              <button
                onClick={() => setActiveTab('doctors')}
                style={{
                  background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                  borderRadius: '999px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Book a Session
              </button>
            </div>
          )}
        </div>

        {/* AI Wellness Companion Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a2f 0%, #2d4a3e 60%, #3d6655 100%)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(30,58,47,0.3)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(74,222,128,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <FaRobot style={{ color: '#4ade80', fontSize: '18px' }} />
            </div>
            <h3 style={{ color: 'white', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>AI Wellness Companion</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              Feeling overwhelmed? Chat with your AI assistant for immediate grounding exercises and support.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('ai-chat')}
            style={{
              background: 'white',
              color: '#1e3a2f',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              alignSelf: 'flex-start',
              transition: 'all 0.2s',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            Start Chatting
          </button>
        </div>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #4a7c65 0%, #2d4a3e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>👥</div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Available Doctors</p>
            <p style={{ color: '#1f2937', fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>{doctors.length}</p>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📅</div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>My Appointments</p>
            <p style={{ color: '#1f2937', fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>{myAppointments.length}</p>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>⭐</div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Progress</p>
            <p style={{ color: '#1f2937', fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>Level {Math.min(Math.floor(completedAppts / 2) + 1, 5)}</p>
          </div>
        </div>
      </div>

      {/* Mood Tracker */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '28px' }}>
        <MoodTracker />
      </div>

      {/* My Appointments Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCalendarAlt style={{ color: '#3b82f6', fontSize: '14px' }} />
            </div>
            <h2 style={{ color: '#1f2937', fontWeight: 700, fontSize: '17px' }}>My Appointments</h2>
          </div>
          <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px' }}>
            {myAppointments.length} total
          </span>
        </div>

        {appointmentsLoading ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af' }}>Loading appointments...</p>
          </div>
        ) : myAppointments.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No appointments scheduled yet.</p>
            <p style={{ color: '#d1d5db', fontSize: '12px', marginTop: '4px' }}>Book an appointment with a doctor to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
            {myAppointments
              .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))
              .map(appt => {
                const apptDate = new Date(`${appt.date}T${appt.time || '00:00'}`);
                const isPast = apptDate < new Date();
                const statusConfig = {
                  'Scheduled': { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: '⏳' },
                  'Confirmed': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: '✅' },
                  'Cancelled': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: '❌' },
                  'Completed': { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', icon: '✔️' },
                };
                const sc = statusConfig[appt.status] || statusConfig['Scheduled'];
                return (
                  <div key={appt.id} style={{
                    background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)',
                    padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s', opacity: isPast && appt.status === 'Scheduled' ? 0.6 : 1,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={appt.doctorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.doctorName || 'D')}&background=c7d2c4&color=374151`}
                          alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #f3f4f6' }}
                        />
                        <div>
                          <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '14px' }}>{appt.doctorName || 'Doctor'}</p>
                          <p style={{ color: '#4a7c65', fontSize: '11px', fontWeight: 500 }}>{appt.doctorSpecialization || 'Specialist'}</p>
                        </div>
                      </div>
                      <span style={{
                        background: sc.bg, color: sc.color, fontSize: '10px', fontWeight: 700,
                        padding: '3px 10px', borderRadius: '999px', border: `1px solid ${sc.border}`,
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                      }}>{sc.icon} {appt.status || 'Scheduled'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FaCalendarAlt style={{ fontSize: '11px' }} />
                        {appt.date ? new Date(appt.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'No date'}
                      </span>
                      <span style={{ background: '#f0fdf4', color: '#15803d', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '10px' }}>
                        🕐 {appt.time || 'No time'}
                      </span>
                    </div>
                    {appt.reason && (
                      <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '10px', background: '#f9fafb', borderRadius: '8px', padding: '8px 12px', lineHeight: '1.4' }}>
                        📝 {appt.reason}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Available Doctors Tab ────────────────────────────────────────────────────
const DoctorsTab = ({ doctors, loading, onStartChat, onScheduleChat, unreadCounts }) => {
  const [search, setSearch] = useState('');
  const filtered = doctors.filter(d =>
    (d.displayName || d.name || d.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.specialization || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '2px' }}>{loading ? '...' : `${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} available`}</p>
        </div>
        <input
          type="text"
          placeholder="🔍  Search doctors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', outline: 'none', width: '220px', background: 'white', color: '#374151', fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading doctors...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👨‍⚕️</div>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>{search ? 'No doctors match your search.' : 'No doctors available at the moment.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map(doctor => (
            <div key={doctor.id} style={{
              background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)',
              padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <img
                  src={doctor.photoURL || doctor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.displayName || doctor.name || doctor.email || 'Doctor')}&background=c7d2c4&color=374151`}
                  alt="" style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover', border: '2px solid #f3f4f6' }}
                />
                {(unreadCounts[doctor.id] || 0) > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700, borderRadius: '999px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>{unreadCounts[doctor.id]}</span>
                )}
              </div>
              <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: '15px', textAlign: 'center', marginBottom: '4px' }}>
                {doctor.displayName || doctor.name || doctor.email || 'Unknown Doctor'}
              </h3>
              <p style={{ color: '#4a7c65', fontSize: '12px', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
                {doctor.specialization || 'Specialist'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>
                  {doctor.rating !== undefined && doctor.rating !== null ? doctor.rating : '—'} ★
                </span>
                <span style={{ color: '#d1d5db' }}>•</span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{doctor.experience || '—'} yrs</span>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '11px', textAlign: 'center', marginBottom: '18px' }}>
                {doctor.availability || 'Availability: Unknown'}
              </p>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button onClick={() => onStartChat(doctor)}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <FaComments style={{ fontSize: '11px' }} /> Chat
                </button>
                <button onClick={() => onScheduleChat(doctor)}
                  style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                >
                  <FaCalendarAlt style={{ fontSize: '11px' }} /> Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Profile Tab ──────────────────────────────────────────────────────────────
const PatientProfileTab = ({ currentUser }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    displayName: currentUser?.displayName || '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    emergencyContact: '',
    address: '',
    bio: '',
  });

  // Load profile from Firestore on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) return;
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setForm(prev => ({
            ...prev,
            displayName: profile.displayName || currentUser.displayName || '',
            phone: profile.phone || '',
            dateOfBirth: profile.dateOfBirth || '',
            gender: profile.gender || '',
            emergencyContact: profile.emergencyContact || '',
            address: profile.address || '',
            bio: profile.bio || '',
          }));
        }
      } catch (e) {
        // silently fail
      }
    };
    loadProfile();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, form);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
    setSaving(false);
  };

  const field = (label, key, placeholder, type = 'text', textarea = false) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', color: '#374151', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>{label}</label>
      {editing ? (
        textarea ? (
          <textarea
            value={form[key]}
            onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
            rows={3}
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Inter', sans-serif", color: '#374151', outline: 'none', resize: 'vertical', background: '#f9fafb', boxSizing: 'border-box' }}
          />
        ) : type === 'select' ? (
          <select
            value={form[key]}
            onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Inter', sans-serif", color: '#374151', outline: 'none', background: '#f9fafb', boxSizing: 'border-box', cursor: 'pointer' }}
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        ) : (
          <input
            type={type}
            value={form[key]}
            onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Inter', sans-serif", color: '#374151', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
          />
        )
      ) : (
        <p style={{ color: form[key] ? '#1f2937' : '#9ca3af', fontSize: '14px', padding: '10px 14px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          {form[key] || '—'}
        </p>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Header card */}
      <div style={{ background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 50%, #4a7c65 100%)', borderRadius: '24px', padding: '32px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '20%', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <img
          src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.displayName || 'Patient')}&background=4a7c65&color=fff&size=128`}
          alt="Profile"
          style={{ width: '88px', height: '88px', borderRadius: '20px', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.25)', flexShrink: 0, position: 'relative', zIndex: 1 }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Patient Profile</p>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.5px', marginBottom: '4px' }}>{form.displayName || 'Patient'}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>{currentUser?.email}</p>
        </div>
      </div>

      {/* Form card */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ color: '#1f2937', fontWeight: 700, fontSize: '18px' }}>Personal Information</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {saved && <span style={{ color: '#059669', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>✅ Saved!</span>}
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.7 : 1 }}>
                  <FaSave style={{ fontSize: '12px' }} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                style={{ background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaEdit style={{ fontSize: '12px' }} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>{field('Full Name', 'displayName', 'John Doe')}</div>
          <div>{field('Phone Number', 'phone', 'e.g. +91 98765 43210')}</div>
          <div>{field('Date of Birth', 'dateOfBirth', '', 'date')}</div>
          <div>{field('Gender', 'gender', '', 'select')}</div>
          <div>{field('Emergency Contact', 'emergencyContact', 'Name & Phone')}</div>
          <div>{field('Address', 'address', 'City, State')}</div>
        </div>
        {field('Bio / Notes', 'bio', 'Tell us a bit about yourself...', 'text', true)}
      </div>
    </div>
  );
};

// ─── AI Chat Tab (inline wrapper) ─────────────────────────────────────────────
const AIChatTab = () => {
  return (
    <div style={{ maxWidth: '800px' }}>
      <AITherapistChat />
    </div>
  );
};

// ─── Main Dashboard Component ─────────────────────────────────────────────────
const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
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
    intervalMs: 5000,
    onResult: (res) => {
      const emotion = toFriendlyLabel(res?.aggregated?.emotion || res?.faces?.[0]?.emotion || 'unknown');
      setDetectedEmotion(emotion);
      setEmotionAnalyzing(false);
    },
  });

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
    if (currentUser) {
      const chatId = `${doctor.id}_${currentUser.uid}`;
      resetUnreadCount(chatId, currentUser.uid, 'patient');
    }
  };

  const handleScheduleChat = (doctor) => {
    setSelectedDoctor(doctor);
    setShowScheduleModal(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
        return unsub;
      });
    }
    // eslint-disable-next-line
  }, [showChatModal, selectedDoctor, currentUser]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const messageToSend = chatInput;
    setChatInput('');
    setChatLoading(true);
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
      setChatLoading(false);
    }
  };

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
    } catch (e) { }
  };

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

  // Tab header info
  const tabHeaders = {
    overview: { subtitle: 'Patient Dashboard', title: <>Welcome back, <span style={{ color: '#86efac' }}>{currentUser?.displayName?.split(' ')[0] || 'Patient'}</span></>, desc: "Here's your wellness overview for today." },
    doctors: { subtitle: 'Care Team', title: 'Available Doctors', desc: 'Connect with our mental health professionals.' },
    tests: { subtitle: 'Assessments', title: 'Mental Health Tests', desc: 'Take assessments to track your mental wellbeing.' },
    profile: { subtitle: 'Account', title: 'Profile Settings', desc: 'View and update your personal information.' },
    'ai-chat': { subtitle: 'AI Support', title: 'AI Wellness Companion', desc: 'Chat with your AI assistant for immediate support.' },
  };

  const currentHeader = tabHeaders[activeTab] || tabHeaders.overview;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <PatientSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        patientName={currentUser?.displayName}
        patientPhoto={currentUser?.photoURL}
        onLogout={handleLogout}
      />

      {/* Main content area */}
      <main style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f0 0%, #e8efe5 30%, #f5f0eb 70%, #faf8f5 100%)' }}>
        {/* Page header */}
        <div style={{ background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 40%, #4a7c65 100%)', padding: '32px 40px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '30%', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <p style={{ color: 'rgba(74,222,128,0.9)', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px', position: 'relative' }}>
            {currentHeader.subtitle}
          </p>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.5px', position: 'relative' }}>
            {currentHeader.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '4px', position: 'relative' }}>
            {currentHeader.desc}
          </p>
        </div>

        {/* Tab content */}
        <div style={{ padding: '32px 40px' }}>
          {activeTab === 'overview' && (
            <OverviewTab
              currentUser={currentUser}
              doctors={doctors}
              myAppointments={myAppointments}
              appointmentsLoading={appointmentsLoading}
              onStartChat={handleStartChat}
              onScheduleChat={handleScheduleChat}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'doctors' && (
            <DoctorsTab
              doctors={doctors}
              loading={loading}
              onStartChat={handleStartChat}
              onScheduleChat={handleScheduleChat}
              unreadCounts={unreadCounts}
            />
          )}
          {activeTab === 'tests' && (
            <MentalHealthTest />
          )}
          {activeTab === 'profile' && (
            <PatientProfileTab currentUser={currentUser} />
          )}
          {activeTab === 'ai-chat' && (
            <AIChatTab />
          )}
        </div>
      </main>

      {/* ── Chat Modal ── */}
      {showChatModal && selectedDoctor && (
        <>
          <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4 animate-fadeIn" style={{ zIndex: 200 }}>
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

      {/* ── Schedule Appointment Modal ── */}
      {showScheduleModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 200, animation: 'fadeIn 0.2s ease' }}>
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedDoctor.photoURL || selectedDoctor.image || 'https://ui-avatars.com/api/?name=Unknown+Doctor&background=E5E7EB&color=374151'}
                    alt={selectedDoctor.displayName || selectedDoctor.name || 'Doctor'}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/30"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white">Book Appointment</h3>
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
                    <p className="text-green-600 text-xs">Your doctor will be notified.</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Date</label>
                  <input
                    type="date" required value={scheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm bg-gray-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🕐 Time</label>
                  <input
                    type="time" required value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-sm bg-gray-50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={scheduleReason} onChange={e => setScheduleReason(e.target.value)}
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

      {/* Video Call Modal */}
      <VideoCallModal
        open={videoCallOpen}
        onClose={() => {
          setVideoCallOpen(false);
          setPendingVideoRoomCode(null);
          setIsOutgoingCall(false);
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