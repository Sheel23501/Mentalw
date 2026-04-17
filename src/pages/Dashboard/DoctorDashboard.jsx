import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaComments, FaCalendarAlt, FaEnvelope, FaTimes, FaHistory, FaArrowLeft, FaBrain, FaChartLine, FaVideo, FaUser, FaEdit, FaSave, FaSignOutAlt, FaTh, FaUsers } from 'react-icons/fa';
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
  getChatReportsForPatient,
  getMentalHealthTestResultsForUser,
  listenForAppointmentsForDoctor,
  updateAppointmentStatus
} from '../../services/firestore';
import SessionNotes from '../../components/dashboard/SessionNotes.jsx';
import EmotionPanel from '../../components/dashboard/EmotionPanel.jsx';
import VideoCallModal from '../../components/dashboard/VideoCallModal.jsx';
import { analyzeChatSession } from '../../services/gemini.js';
import { useSocket } from '../../contexts/SocketContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// ─── Left Sidebar ────────────────────────────────────────────────────────────
const Sidebar = ({ activeTab, setActiveTab, doctorName, doctorPhoto, onLogout }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FaTh /> },
    { id: 'appointments', label: 'Appointments', icon: <FaCalendarAlt /> },
    { id: 'patients', label: 'Patients', icon: <FaUsers /> },
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
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 500, marginLeft: '42px', letterSpacing: '1px', textTransform: 'uppercase' }}>Doctor Portal</p>
      </div>

      {/* Doctor mini-profile */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={doctorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName || 'Doctor')}&background=4a7c65&color=fff`}
          alt={doctorName}
          style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }}
        />
        <div style={{ overflow: 'hidden' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doctorName || 'Doctor'}</p>
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
const OverviewTab = ({ patients, loading, scheduledChats, loadingChats, unreadCounts, patientsWithUnread, scheduledChatsWithUnread, setChatPatient, openModal }) => {
  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {/* Active Patients */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #4a7c65 0%, #2d4a3e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>👥</div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Active Patients</p>
            <p style={{ color: '#1f2937', fontSize: '30px', fontWeight: 800, lineHeight: 1 }}>{loading ? '—' : patients.length}</p>
            <p style={{ color: '#059669', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Under your care</p>
          </div>
        </div>

        {/* Pending */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>📅</div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Pending Requests</p>
            <p style={{ color: '#1f2937', fontSize: '30px', fontWeight: 800, lineHeight: 1 }}>{loadingChats ? '—' : scheduledChats.length}</p>
            <p style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Awaiting response</p>
          </div>
        </div>

        {/* Unread */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${(patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? '#fca5a5' : 'rgba(0,0,0,0.05)'}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: (patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>💬</div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Unseen Messages</p>
            <p style={{ color: (patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? '#ef4444' : '#1f2937', fontSize: '30px', fontWeight: 800, lineHeight: 1 }}>{patientsWithUnread.length + scheduledChatsWithUnread.length}</p>
            <p style={{ color: (patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? '#ef4444' : '#9ca3af', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>{(patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 ? 'Needs attention' : 'All caught up!'}</p>
          </div>
        </div>
      </div>

      {/* Unseen Messages */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaEnvelope style={{ color: '#ef4444', fontSize: '14px' }} />
            </div>
            <h2 style={{ color: '#1f2937', fontWeight: 700, fontSize: '17px' }}>Unseen Messages</h2>
          </div>
          {(patientsWithUnread.length + scheduledChatsWithUnread.length) > 0 && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px' }}>
              {patientsWithUnread.length + scheduledChatsWithUnread.length} new
            </span>
          )}
        </div>
        {(patientsWithUnread.length + scheduledChatsWithUnread.length) === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
            <p style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 500 }}>All caught up! No unseen messages.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {patientsWithUnread.map(patient => (
              <div key={patient.id} onClick={() => setChatPatient(patient)}
                style={{ background: 'white', borderRadius: '16px', border: '1px solid #fee2e2', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '14px' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={patient.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.displayName || patient.email || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700, borderRadius: '999px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCounts[patient.id]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>{patient.displayName || patient.email || 'Unknown'}</p>
                  <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500, marginTop: '2px' }}>💬 {unreadCounts[patient.id]} unread message{unreadCounts[patient.id] > 1 ? 's' : ''}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setChatPatient(patient); }}
                  style={{ background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaComments style={{ fontSize: '11px' }} /> Reply
                </button>
              </div>
            ))}
            {scheduledChatsWithUnread.map(chat => (
              <div key={chat.id} onClick={() => openModal('view', chat)}
                style={{ background: 'white', borderRadius: '16px', border: '1px solid #fee2e2', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '14px' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={chat.patientPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.patientName || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700, borderRadius: '999px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCounts[chat.id]}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>{chat.patientName || 'Unknown'}</p>
                  <p style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 500 }}>📅 Scheduled session</p>
                  <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500, marginTop: '2px' }}>💬 {unreadCounts[chat.id]} unread</p>
                </div>
                <button onClick={e => { e.stopPropagation(); openModal('view', chat); }}
                  style={{ background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaComments style={{ fontSize: '11px' }} /> Reply
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Appointments */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCalendarAlt style={{ color: '#3b82f6', fontSize: '14px' }} />
            </div>
            <h2 style={{ color: '#1f2937', fontWeight: 700, fontSize: '17px' }}>Pending Appointment Requests</h2>
          </div>
          <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px' }}>{scheduledChats.length} request{scheduledChats.length !== 1 ? 's' : ''}</span>
        </div>

        {loadingChats ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af' }}>Loading appointments...</p>
          </div>
        ) : scheduledChats.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No pending appointment requests.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scheduledChats.map(chat => (
              <div key={chat.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
              >
                <img src={chat.patientPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.patientName || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '14px' }}>{chat.patientName || 'Unknown Patient'}</p>
                    <span style={{ background: '#fffbeb', color: '#d97706', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', border: '1px solid #fde68a' }}>{chat.status || 'Pending'}</span>
                    {unreadCounts[chat.id] > 0 && (
                      <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700, borderRadius: '999px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCounts[chat.id]}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FaCalendarAlt style={{ fontSize: '11px' }} /> {chat.date || 'No date'}
                    </span>
                    <span style={{ background: '#f0fdf4', color: '#15803d', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px' }}>
                      🕐 {chat.time || 'No time'}
                    </span>
                  </div>
                  <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>📧 {chat.patientEmail || 'Unknown'}</p>
                </div>
                <button onClick={() => openModal('view', chat)}
                  style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '9px 18px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; }}
                >
                  <FaCalendarAlt style={{ fontSize: '11px' }} /> Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Appointments Tab ────────────────────────────────────────────────────────
const AppointmentsTab = ({ appointments, loading, onUpdateStatus, openModal }) => {
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const filtered = appointments.filter(a => {
    if (filter === 'all') return true;
    return a.status?.toLowerCase() === filter.toLowerCase();
  });

  // Sort: upcoming first, then by date/time
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder = { 'Scheduled': 0, 'Confirmed': 1, 'Completed': 2, 'Cancelled': 3 };
    const sA = statusOrder[a.status] ?? 99;
    const sB = statusOrder[b.status] ?? 99;
    if (sA !== sB) return sA - sB;
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA - dateB;
  });

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await onUpdateStatus(id, status);
    } catch (e) {
      console.error('Failed to update appointment:', e);
    }
    setUpdatingId(null);
  };

  const statusConfig = {
    'Scheduled': { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Pending', icon: '⏳' },
    'Confirmed': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Confirmed', icon: '✅' },
    'Cancelled': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Cancelled', icon: '❌' },
    'Completed': { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', label: 'Completed', icon: '✔️' },
  };

  const filterBtns = [
    { key: 'all', label: 'All' },
    { key: 'scheduled', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterBtns.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 18px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
              background: filter === f.key ? 'linear-gradient(135deg, #4a7c65, #3d6655)' : '#f3f4f6',
              color: filter === f.key ? 'white' : '#6b7280',
              transition: 'all 0.2s',
              boxShadow: filter === f.key ? '0 2px 8px rgba(74,124,101,0.3)' : 'none',
            }}
          >{f.label} {f.key === 'all' ? `(${appointments.length})` : `(${appointments.filter(a => a.status?.toLowerCase() === f.key).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading appointments...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>{filter === 'all' ? 'No appointments yet.' : `No ${filter} appointments.`}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sorted.map(appt => {
            const sc = statusConfig[appt.status] || statusConfig['Scheduled'];
            const apptDate = new Date(`${appt.date}T${appt.time || '00:00'}`);
            const isPast = apptDate < new Date();
            const isUpdating = updatingId === appt.id;

            return (
              <div key={appt.id}
                style={{
                  background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)',
                  padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s', opacity: appt.status === 'Cancelled' ? 0.6 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Patient avatar */}
                  <img
                    src={appt.patientPhotoURL || appt.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.patientName || 'P')}&background=c7d2c4&color=374151`}
                    alt=""
                    style={{ width: '52px', height: '52px', borderRadius: '14px', objectFit: 'cover', border: '2px solid #f3f4f6', flexShrink: 0 }}
                  />
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '15px', margin: 0 }}>{appt.patientName || 'Unknown Patient'}</p>
                      <span style={{
                        background: sc.bg, color: sc.color, fontSize: '11px', fontWeight: 700,
                        padding: '3px 10px', borderRadius: '999px', border: `1px solid ${sc.border}`,
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                      }}>{sc.icon} {sc.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FaCalendarAlt style={{ fontSize: '11px' }} />
                        {appt.date ? new Date(appt.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                      </span>
                      <span style={{ background: '#f0fdf4', color: '#15803d', fontSize: '12px', fontWeight: 600, padding: '5px 12px', borderRadius: '10px' }}>
                        🕐 {appt.time || 'No time'}
                      </span>
                      {isPast && appt.status === 'Scheduled' && (
                        <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>Overdue</span>
                      )}
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>📧 {appt.patientEmail || 'Unknown'}</p>
                    {appt.reason && (
                      <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '8px 12px', marginTop: '8px', border: '1px solid #f3f4f6' }}>
                        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, lineHeight: '1.5' }}>📝 {appt.reason}</p>
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    {appt.status === 'Scheduled' && (
                      <>
                        <button onClick={() => handleStatusChange(appt.id, 'Confirmed')} disabled={isUpdating}
                          style={{ background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: isUpdating ? 0.6 : 1, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
                          ✅ Confirm
                        </button>
                        <button onClick={() => handleStatusChange(appt.id, 'Cancelled')} disabled={isUpdating}
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.6 : 1, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
                          ❌ Decline
                        </button>
                      </>
                    )}
                    {appt.status === 'Confirmed' && (
                      <>
                        <button onClick={() => openModal('view', appt)}
                          style={{ background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                          <FaComments style={{ fontSize: '11px' }} /> Start Session
                        </button>
                        <button onClick={() => handleStatusChange(appt.id, 'Completed')} disabled={isUpdating}
                          style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                          ✔️ Complete
                        </button>
                      </>
                    )}
                    {(appt.status === 'Completed' || appt.status === 'Cancelled') && (
                      <span style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                        {appt.status === 'Completed' ? 'Session completed' : 'Declined'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Patients Tab ─────────────────────────────────────────────────────────────
const PatientsTab = ({ patients, loading, unreadCounts, setChatPatient, handleViewHistory, handleStartVideoCall }) => {
  const [search, setSearch] = useState('');
  const filtered = patients.filter(p =>
    (p.displayName || p.name || p.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#1f2937', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.5px' }}>All Patients</h1>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '2px' }}>{loading ? '...' : `${patients.length} patient${patients.length !== 1 ? 's' : ''} under your care`}</p>
        </div>
        <input
          type="text"
          placeholder="🔍  Search patients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', outline: 'none', width: '220px', background: 'white', color: '#374151', fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>{search ? 'No patients match your search.' : 'No patients yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map(patient => (
            <div key={patient.id} style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={patient.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.displayName || patient.email || 'P')}&background=c7d2c4&color=374151`}
                    alt=""
                    style={{ width: '54px', height: '54px', borderRadius: '14px', objectFit: 'cover', border: '2px solid #f3f4f6' }}
                  />
                  {(unreadCounts[patient.id] || 0) > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700, borderRadius: '999px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>{unreadCounts[patient.id]}</span>
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient.displayName || patient.name || 'Unknown'}</p>
                  <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient.email || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setChatPatient(patient)}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #4a7c65, #3d6655)', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <FaComments style={{ fontSize: '11px' }} /> Chat
                </button>
                <button onClick={() => handleStartVideoCall(patient)}
                  style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '9px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                >
                  <FaVideo style={{ fontSize: '11px' }} /> Call
                </button>
                <button onClick={() => handleViewHistory(patient)}
                  style={{ flex: 1, background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '9px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
                >
                  <FaHistory style={{ fontSize: '11px' }} /> History
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
const ProfileTab = ({ currentUser }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    displayName: currentUser?.displayName || '',
    specialization: '',
    experience: '',
    availability: '',
    about: '',
    phone: '',
    clinic: '',
  });

  // Load profile from Firestore on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) return;
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        const snap = await getDoc(doc(db, 'userProfiles', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setForm(prev => ({
            ...prev,
            displayName: data.displayName || currentUser.displayName || '',
            specialization: data.specialization || '',
            experience: data.experience || '',
            availability: data.availability || '',
            about: data.about || '',
            phone: data.phone || '',
            clinic: data.clinic || '',
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
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      await updateDoc(doc(db, 'userProfiles', currentUser.uid), form);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
    setSaving(false);
  };

  const field = (label, key, placeholder, textarea = false) => (
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
        ) : (
          <input
            value={form[key]}
            onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', fontFamily: "'Inter', sans-serif", color: '#374151', outline: 'none', background: '#f9fafb', boxSizing: 'border-box' }}
          />
        )
      ) : (
        <p style={{ color: form[key] ? '#1f2937' : '#9ca3af', fontSize: '14px', padding: '10px 14px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          {form[key] || `—`}
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
          src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.displayName || 'Doctor')}&background=4a7c65&color=fff&size=128`}
          alt="Profile"
          style={{ width: '88px', height: '88px', borderRadius: '20px', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.25)', flexShrink: 0, position: 'relative', zIndex: 1 }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Psychologist Profile</p>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.5px', marginBottom: '4px' }}>{form.displayName || 'Doctor'}</h1>
          <p style={{ color: 'rgba(74,222,128,0.9)', fontSize: '14px', fontWeight: 600 }}>{form.specialization || 'Specialization not set'}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>{currentUser?.email}</p>
        </div>
      </div>

      {/* Form card */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ color: '#1f2937', fontWeight: 700, fontSize: '18px' }}>Professional Information</h2>
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
          <div>{field('Full Name', 'displayName', 'Dr. John Doe')}</div>
          <div>{field('Specialization', 'specialization', 'e.g. Clinical Psychology')}</div>
          <div>{field('Years of Experience', 'experience', 'e.g. 8')}</div>
          <div>{field('Phone Number', 'phone', 'e.g. +91 98765 43210')}</div>
          <div>{field('Clinic / Hospital', 'clinic', 'e.g. MindCare Clinic')}</div>
          <div>{field('Availability', 'availability', 'e.g. Mon–Fri, 9AM–5PM')}</div>
        </div>
        {field('About / Bio', 'about', 'Describe your background, approach, and expertise...', true)}
      </div>
    </div>
  );
};

// ─── Main DoctorDashboard ────────────────────────────────────────────────────
const DoctorDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
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
  const [videoCallPatient, setVideoCallPatient] = useState(null);
  const [isOutgoingCall, setIsOutgoingCall] = useState(false);

  const [viewingPatientHistory, setViewingPatientHistory] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [emotionAnalysisEnabled, setEmotionAnalysisEnabled] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [showEmotionPanel, setShowEmotionPanel] = useState(false);
  const [audioEmotionHistory, setAudioEmotionHistory] = useState([]);  // Phase 3: vocal emotion log

  const handleAudioEmotion = useCallback((result) => {
    setAudioEmotionHistory(prev => [...prev, result].slice(-30)); // keep last 30 readings
  }, []);

  const { startCall, callStatus, activeCallRoomId, incomingCall, outgoingCall } = useSocket();

  const handleStartVideoCall = (patient) => {
    const patientName = patient.displayName || patient.name || patient.email || 'Patient';
    setVideoCallPatient(patient);
    setIsOutgoingCall(true);
    setVideoCallOpen(true);
    startCall(patient.id, patientName);
  };

  useEffect(() => {
    if (callStatus === 'connected' && incomingCall && !videoCallOpen) {
      const callerPatient = patients.find(p => p.id === incomingCall.callerId);
      setVideoCallPatient(callerPatient || { id: incomingCall.callerId, displayName: incomingCall.callerName });
      setPendingRoomCode(incomingCall.roomId);
      setIsOutgoingCall(false);
      setVideoCallOpen(true);
    }
  }, [callStatus, incomingCall, videoCallOpen, patients]);

  const getEmotionEmoji = (emotion) => {
    const emojiMap = {
      happy: '😊', sad: '😢', angry: '😠', fear: '😨',
      surprised: '😲', neutral: '😐', disgust: '🤢', unknown: '❓',
    };
    return emojiMap[emotion?.toLowerCase()] || '🎭';
  };

  useEmotionMonitor({
    enabled: emotionAnalysisEnabled,
    intervalMs: 5000,
    onResult: (res) => {
      const emotion = toFriendlyLabel(res?.aggregated?.emotion || res?.faces?.[0]?.emotion || 'unknown');
      setDetectedEmotion(emotion);
      setEmotionHistory(prev => [...prev, { emotion, timestamp: new Date(), score: res?.faces?.[0]?.score }].slice(-20));
    },
  });

  const timerRef = useRef(null);
  const chatBodyRef = useRef(null);
  const chatBodyRefDirect = useRef(null);

  const handleSaveAndEndChat = async (chatType, messages, patientInfo) => {
    closeChatModals(true);
    if (!messages || messages.length === 0) return;

    // Run Gemini AI analysis on the chat transcript (Phase 2)
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeChatSession(messages);
    } catch (err) {
      console.warn('AI chat analysis failed (non-blocking):', err);
    }

    const reportData = {
      doctorId: currentUser.uid,
      patientId: patientInfo.patientId,
      patientName: patientInfo.patientName,
      patientPhotoURL: patientInfo.patientPhotoURL,
      messages: messages.map(m => ({ ...m, timestamp: m.timestamp || new Date() })),
      aiAnalysis: aiAnalysis || null,
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

  const handleViewHistory = async (patient) => {
    setViewingPatientHistory(patient);
    setHistoryLoading(true);
    try {
      const [chats, tests] = await Promise.all([
        getChatReportsForPatient(patient.id).catch(() => []),
        getMentalHealthTestResultsForUser(patient.id).catch(() => [])
      ]);
      
      const typedChats = chats.map(c => ({ ...c, historyType: 'chat' }));
      const typedTests = tests.map(t => ({ ...t, historyType: 'test' }));
      
      const combined = [...typedChats, ...typedTests].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending
      });
      
      const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
      const filtered = combined.filter(item => {
        const itemDate = item.createdAt?.toDate ? item.createdAt.toDate().getTime() : new Date(item.createdAt).getTime();
        return itemDate >= fortyEightHoursAgo;
      });
      
      setPatientHistory(filtered);
    } catch (error) {
      setPatientHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    setViewingPatientHistory(null);
    setPatientHistory([]);
  };

  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [chatMessages]);

  useEffect(() => {
    if (chatBodyRefDirect.current) chatBodyRefDirect.current.scrollTop = chatBodyRefDirect.current.scrollHeight;
  }, [chatMessagesDirect]);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try { const data = await getAllPatients(); setPatients(data); }
      catch { setPatients([]); }
      setLoading(false);
    };
    fetchPatients();
  }, []);

  // Real-time listener for scheduled appointments
  useEffect(() => {
    if (!currentUser) return;
    setLoadingChats(true);
    const unsub = listenForAppointmentsForDoctor(currentUser.uid, (appointments) => {
      setScheduledChats(appointments);
      setLoadingChats(false);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || (!patients.length && !scheduledChats.length)) return;
    const unsubscribes = [];
    patients.forEach(patient => {
      const chatId = `${currentUser.uid}_${patient.id}`;
      const unsub = listenForChatDocChanges(chatId, (chatDoc) => {
        if (chatDoc) setUnreadCounts(prev => ({ ...prev, [patient.id]: chatDoc.unreadCountDoctor || 0 }));
      });
      unsubscribes.push(unsub);
    });
    scheduledChats.forEach(chat => {
      const unsub = listenForChatDocChanges(chat.id, (chatDoc) => {
        if (chatDoc) setUnreadCounts(prev => ({ ...prev, [chat.id]: chatDoc.unreadCountDoctor || 0 }));
      });
      unsubscribes.push(unsub);
    });
    return () => unsubscribes.forEach(u => u());
  }, [patients, scheduledChats, currentUser]);

  useEffect(() => {
    if (modalOpen && modalType === 'view' && modalData && modalData.id) {
      const chatId = modalData.id;
      const participants = [modalData.doctorId, modalData.patientId];
      setChatMessages([]);
      setChatLoading(true);
      createOrGetChat(chatId, participants).then(() => {
        const unsub = listenForChatMessages(chatId, (msgs) => { setChatMessages(msgs); setChatLoading(false); });
        setChatListener(() => unsub);
      }).catch(() => setChatLoading(false));
      if (currentUser) resetUnreadCount(chatId, currentUser.uid, 'doctor');
      setTimeLeft(45 * 60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) { clearInterval(timerRef.current); closeChatModals(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (chatListener) { chatListener(); setChatListener(null); }
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(null);
    }
    return () => {
      if (chatListener) { chatListener(); setChatListener(null); }
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line
  }, [modalOpen, modalType, modalData, currentUser]);

  useEffect(() => {
    if (chatPatient && currentUser) {
      const chatId = `${currentUser.uid}_${chatPatient.id}`;
      const participants = [currentUser.uid, chatPatient.id];
      setChatMessagesDirect([]);
      setChatLoadingDirect(true);
      createOrGetChat(chatId, participants).then(() => {
        const unsub = listenForChatMessages(chatId, (msgs) => { setChatMessagesDirect(msgs); setChatLoadingDirect(false); });
        setChatListenerDirect(() => unsub);
      }).catch(() => setChatLoadingDirect(false));
      if (currentUser) resetUnreadCount(chatId, currentUser.uid, 'doctor');
      setTimeLeft(45 * 60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) { clearInterval(timerRef.current); closeChatModals(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (chatListenerDirect) { chatListenerDirect(); setChatListenerDirect(null); }
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(null);
    }
    return () => {
      if (chatListenerDirect) { chatListenerDirect(); setChatListenerDirect(null); }
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line
  }, [chatPatient, currentUser]);

  useEffect(() => {
    const allMessages = [...chatMessages, ...chatMessagesDirect];
    const videoInvites = allMessages.filter(msg => msg.videoCall && msg.roomCode);
    const latestInvite = videoInvites.length > 0 ? videoInvites[videoInvites.length - 1] : null;
    if (latestInvite && latestInvite.roomCode !== pendingRoomCode) setPendingRoomCode(latestInvite.roomCode);
  }, [chatMessages, chatMessagesDirect, pendingRoomCode]);

  const openModal = (type, data) => { setModalType(type); setModalData(data); setModalOpen(true); };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !modalData || !modalData.id) return;
    const msg = chatInput; setChatInput(''); setChatLoading(true);
    try {
      await sendMessageToChat(modalData.id, { senderId: currentUser.uid, senderRole: 'doctor', senderName: currentUser.displayName || currentUser.email || 'Doctor', senderImage: currentUser.photoURL || '', text: msg, timestamp: new Date() });
    } catch { } finally { setChatLoading(false); }
  };

  const handleSendMessageDirect = async () => {
    if (!chatInputDirect.trim() || !chatPatient) return;
    const msg = chatInputDirect; setChatInputDirect(''); setChatLoadingDirect(true);
    const chatId = `${currentUser.uid}_${chatPatient.id}`;
    try {
      await sendMessageToChat(chatId, { senderId: currentUser.uid, senderRole: 'doctor', senderName: currentUser.displayName || currentUser.email || 'Doctor', senderImage: currentUser.photoURL || '', text: msg, timestamp: new Date() });
    } catch { } finally { setChatLoadingDirect(false); }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const patientsWithUnread = patients.filter(p => (unreadCounts[p.id] || 0) > 0);
  const scheduledChatsWithUnread = scheduledChats.filter(c => (unreadCounts[c.id] || 0) > 0);

  const handleLogout = async () => { try { await logout(); } catch (e) { console.error(e); } };

  // ── Patient history view ──
  if (viewingPatientHistory) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <Sidebar activeTab={activeTab} setActiveTab={tab => { setActiveTab(tab); setViewingPatientHistory(null); }} doctorName={currentUser?.displayName} doctorPhoto={currentUser?.photoURL} onLogout={handleLogout} />
        <main style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f0 0%, #e8efe5 30%, #f5f0eb 70%, #faf8f5 100%)', padding: '40px 40px' }}>
          <div style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button onClick={handleBackToDashboard} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <FaArrowLeft style={{ color: '#6b7280' }} />
              </button>
              <img src={viewingPatientHistory.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewingPatientHistory.displayName || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '52px', height: '52px', borderRadius: '14px', objectFit: 'cover' }} />
              <div>
                <h2 style={{ color: '#1f2937', fontWeight: 800, fontSize: '22px' }}>{viewingPatientHistory.displayName || 'Unknown'}</h2>
                <p style={{ color: '#9ca3af', fontSize: '13px' }}>Recent History (Last 48 Hours)</p>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {historyLoading ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>Loading history...</p>
              ) : patientHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                  <p style={{ color: '#9ca3af' }}>No chat history found for this patient.</p>
                </div>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {patientHistory.map((item, index) => {
                    const isTest = item.historyType === 'test';
                    
                    return (
                    <li key={item.id || index} onClick={() => { if (!isTest) { setChatReport(item); setReportModalOpen(true); } }}
                      style={{ background: '#f9fafb', borderRadius: '14px', border: '1px solid #f3f4f6', padding: '16px', cursor: isTest ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                      onMouseEnter={e => { if(!isTest) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.background = 'white'; } }}
                      onMouseLeave={e => { if(!isTest) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isTest ? '#eff6ff' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isTest ? <FaBrain style={{ color: '#3b82f6', fontSize: '14px' }} /> : <FaComments style={{ color: '#059669', fontSize: '14px' }} />}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>
                            {isTest ? `Mental Health Test: ${item.riskLevel || 'Checked'}` : 'Chat Session'}
                          </p>
                          <p style={{ color: '#9ca3af', fontSize: '12px' }}>
                            {isTest ? `Score: ${item.score || item.totalScore || 'N/A'}` : `${item.messages?.length || 0} messages`}
                          </p>
                        </div>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '12px' }}>{formatTimestamp(item.createdAt)}</p>
                    </li>
                  )})}
                </ul>
              )}
            </div>
          </div>
        </main>
        {reportModalOpen && chatReport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: '24px', maxWidth: '640px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: '17px' }}>Chat Transcript — {formatTimestamp(chatReport.createdAt)}</h3>
                <button onClick={() => setReportModalOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaTimes style={{ color: '#6b7280', fontSize: '12px' }} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {chatReport.messages.map(msg => (
                  <div key={msg.id || msg.timestamp?.seconds} style={{ marginBottom: '12px', padding: '12px', borderRadius: '12px', background: '#f9fafb' }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>
                      {msg.senderName || (msg.senderRole === 'doctor' ? 'Doctor' : 'Patient')}
                      <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '11px', marginLeft: '8px' }}>{formatTimestamp(msg.timestamp)}</span>
                    </p>
                    <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>{msg.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setReportModalOpen(false)} style={{ background: '#1f2937', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main layout ──
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} doctorName={currentUser?.displayName} doctorPhoto={currentUser?.photoURL} onLogout={handleLogout} />

      {/* Main content area */}
      <main style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f0 0%, #e8efe5 30%, #f5f0eb 70%, #faf8f5 100%)' }}>
        {/* Page header */}
        <div style={{ background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 40%, #4a7c65 100%)', padding: '32px 40px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '30%', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <p style={{ color: 'rgba(74,222,128,0.9)', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px', position: 'relative' }}>
            {activeTab === 'overview' ? 'Doctor Dashboard' : activeTab === 'appointments' ? 'Appointment Management' : activeTab === 'patients' ? 'Patient Management' : 'Your Profile'}
          </p>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.5px', position: 'relative' }}>
            {activeTab === 'overview'
              ? <>Welcome back, <span style={{ color: '#86efac' }}>{currentUser?.displayName?.split(' ')[0] || 'Doctor'}</span></>
              : activeTab === 'appointments' ? 'Appointments'
              : activeTab === 'patients' ? 'All Patients'
              : 'Profile Settings'
            }
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '4px', position: 'relative' }}>
            {activeTab === 'overview' ? "Here's your activity overview for today." : activeTab === 'appointments' ? 'View and manage all patient appointment requests.' : activeTab === 'patients' ? 'Manage and interact with your patients.' : 'View and update your professional information.'}
          </p>
        </div>

        {/* Tab content */}
        <div style={{ padding: '32px 40px' }}>
          {activeTab === 'overview' && (
            <OverviewTab
              patients={patients} loading={loading}
              scheduledChats={scheduledChats} loadingChats={loadingChats}
              unreadCounts={unreadCounts}
              patientsWithUnread={patientsWithUnread}
              scheduledChatsWithUnread={scheduledChatsWithUnread}
              setChatPatient={setChatPatient}
              openModal={openModal}
            />
          )}
          {activeTab === 'appointments' && (
            <AppointmentsTab
              appointments={scheduledChats}
              loading={loadingChats}
              onUpdateStatus={updateAppointmentStatus}
              openModal={openModal}
            />
          )}
          {activeTab === 'patients' && (
            <PatientsTab
              patients={patients} loading={loading}
              unreadCounts={unreadCounts}
              setChatPatient={setChatPatient}
              handleViewHistory={handleViewHistory}
              handleStartVideoCall={handleStartVideoCall}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileTab currentUser={currentUser} />
          )}
        </div>
      </main>

      {/* ── Video Call (standalone) ── */}
      {videoCallOpen && !chatPatient && !modalOpen && (
        <VideoCallModal
          open={videoCallOpen}
          onClose={() => { setVideoCallOpen(false); setPendingRoomCode(null); setVideoCallPatient(null); setIsOutgoingCall(false); }}
          patientName={videoCallPatient?.displayName || videoCallPatient?.name || 'Patient'}
          doctorName={currentUser?.displayName || 'Doctor'}
          patientId={videoCallPatient?.id}
          doctorId={currentUser?.uid}
          initialRoomCode={pendingRoomCode}
          isDirectCall={isOutgoingCall && !!activeCallRoomId}
          directCallRoomId={activeCallRoomId}
          onAudioEmotion={handleAudioEmotion}
        />
      )}

      {/* ── Scheduled Chat Modal ── */}
      {modalOpen && modalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', minHeight: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 40%, #4a7c65 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={modalData.patientPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(modalData.patientName || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
                <div>
                  <h3 style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>{modalData.patientName || 'Unknown'}</h3>
                  <p style={{ color: 'rgba(167,243,208,0.9)', fontSize: '11px' }}>Scheduled Session</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {timeLeft !== null && (
                  <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '5px 10px', borderRadius: '8px' }}>
                    {`${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
                  </span>
                )}
                {emotionAnalysisEnabled && detectedEmotion && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                    <span style={{ color: 'white', fontSize: '12px' }}>{getEmotionEmoji(detectedEmotion)} {detectedEmotion}</span>
                  </div>
                )}
                <button onClick={() => setEmotionAnalysisEnabled(!emotionAnalysisEnabled)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: emotionAnalysisEnabled ? 'rgba(251,191,36,0.8)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FaBrain style={{ fontSize: '13px' }} />
                </button>
                <button onClick={() => setShowEmotionPanel(!showEmotionPanel)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: showEmotionPanel ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FaChartLine style={{ fontSize: '13px' }} />
                </button>
                <button onClick={closeChatModals} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FaTimes style={{ fontSize: '13px' }} />
                </button>
              </div>
            </div>
            {/* Emotion panel */}
            {showEmotionPanel && (
              <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaChartLine style={{ color: '#3b82f6' }} /> Emotion Analysis
                  </p>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: emotionAnalysisEnabled ? '#dcfce7' : '#f3f4f6', color: emotionAnalysisEnabled ? '#15803d' : '#6b7280', fontWeight: 600 }}>
                    {emotionAnalysisEnabled ? '🔴 Live' : 'Paused'}
                  </span>
                </div>
                {emotionHistory.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>No emotions detected yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                    {emotionHistory.map((entry, idx) => (
                      <span key={idx} style={{ fontSize: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getEmotionEmoji(entry.emotion)} {entry.emotion}
                        <span style={{ color: '#d1d5db' }}>{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Chat body */}
            <div ref={chatBodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'linear-gradient(180deg, #f8faf8 0%, #ffffff 100%)' }}>
              {chatLoading ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0', fontSize: '13px' }}>Loading messages...</p>
              ) : chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                    {msg.senderId !== currentUser.uid && (
                      <img src={modalData.patientPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(modalData.patientName || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: '16px', fontSize: '13px', wordBreak: 'break-word', background: msg.senderId === currentUser.uid ? 'linear-gradient(135deg, #3d6655, #4a7c65)' : 'white', color: msg.senderId === currentUser.uid ? 'white' : '#1f2937', border: msg.senderId === currentUser.uid ? 'none' : '1px solid #e5e7eb', borderBottomRightRadius: msg.senderId === currentUser.uid ? '4px' : '16px', borderBottomLeftRadius: msg.senderId !== currentUser.uid ? '4px' : '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      {msg.text}
                      <div style={{ fontSize: '10px', marginTop: '4px', color: msg.senderId === currentUser.uid ? 'rgba(167,243,208,0.8)' : '#9ca3af', textAlign: 'right' }}>
                        {msg.timestamp && new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Session notes */}
            <div style={{ padding: '8px 16px' }}>
              <SessionNotes doctorId={currentUser?.uid} patientId={modalData?.patientId} sessionId={modalData?.id} sessionDate={modalData?.date} />
            </div>
            {/* Footer */}
            <div style={{ borderTop: '1px solid #f3f4f6', background: 'white' }}>
              <div style={{ padding: '10px 12px', display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="Type your message..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) handleSendMessage(); }} autoFocus
                  style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', background: '#f9fafb', color: '#374151' }} />
                <button onClick={handleSendMessage} disabled={!chatInput.trim()} style={{ background: 'linear-gradient(135deg, #3d6655, #4a7c65)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !chatInput.trim() ? 0.5 : 1 }}>Send</button>
              </div>
              <div style={{ padding: '8px 12px 12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => {
                  const patientName = modalData?.patientName || 'Patient';
                  const patientId = modalData?.patientId;
                  setVideoCallPatient({ id: patientId, displayName: patientName, photoURL: modalData?.patientPhotoURL });
                  setIsOutgoingCall(true);
                  setVideoCallOpen(true);
                  if (patientId) startCall(patientId, patientName);
                }} style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '8px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <FaVideo style={{ fontSize: '11px' }} /> Video Call
                </button>
                <button onClick={() => handleSaveAndEndChat('scheduled', chatMessages, { patientId: modalData?.patientId, patientName: modalData?.patientName, patientPhotoURL: modalData?.patientPhotoURL })} disabled={chatMessages.length === 0} style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: chatMessages.length === 0 ? 0.5 : 1 }}>
                  Save & End Session
                </button>
              </div>
            </div>
            <VideoCallModal open={videoCallOpen} onClose={() => { setVideoCallOpen(false); setPendingRoomCode(null); setIsOutgoingCall(false); setVideoCallPatient(null); }} patientName={modalData?.patientName} doctorName={currentUser?.displayName} patientId={modalData?.patientId} doctorId={currentUser?.uid} initialRoomCode={pendingRoomCode} isDirectCall={isOutgoingCall && !!activeCallRoomId} directCallRoomId={activeCallRoomId} onAudioEmotion={handleAudioEmotion} />
          </div>
        </div>
      )}

      {/* ── Direct Chat Modal ── */}
      {chatPatient && currentUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', minHeight: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #2d4a3e 0%, #3d6655 40%, #4a7c65 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={chatPatient.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatPatient.displayName || chatPatient.email || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
                <div>
                  <h3 style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>{chatPatient.displayName || chatPatient.email || 'Unknown'}</h3>
                  <p style={{ color: 'rgba(167,243,208,0.9)', fontSize: '11px' }}>Direct Chat</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {timeLeft !== null && (
                  <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '5px 10px', borderRadius: '8px' }}>
                    {`${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
                  </span>
                )}
                {emotionAnalysisEnabled && detectedEmotion && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                    <span style={{ color: 'white', fontSize: '12px' }}>{getEmotionEmoji(detectedEmotion)} {detectedEmotion}</span>
                  </div>
                )}
                <button onClick={() => { closeChatModals(); handleViewHistory(chatPatient); }} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }} title="View Past 48h History">
                  <FaHistory style={{ fontSize: '13px' }} />
                </button>
                <button onClick={() => {
                  const patientName = chatPatient.displayName || chatPatient.name || chatPatient.email || 'Patient';
                  setVideoCallPatient(chatPatient);
                  setIsOutgoingCall(true);
                  setVideoCallOpen(true);
                  startCall(chatPatient.id, patientName);
                }} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(96,165,250,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }} title="Start Video Call">
                  <FaVideo style={{ fontSize: '13px' }} />
                </button>
                <button onClick={() => setEmotionAnalysisEnabled(!emotionAnalysisEnabled)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: emotionAnalysisEnabled ? 'rgba(251,191,36,0.8)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FaBrain style={{ fontSize: '13px' }} />
                </button>
                <button onClick={() => setShowEmotionPanel(!showEmotionPanel)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: showEmotionPanel ? 'rgba(96,165,250,0.8)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FaChartLine style={{ fontSize: '13px' }} />
                </button>
                <button onClick={closeChatModals} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FaTimes style={{ fontSize: '13px' }} />
                </button>
              </div>
            </div>
            {/* Emotion panel */}
            {showEmotionPanel && (
              <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaChartLine style={{ color: '#3b82f6' }} /> Emotion Analysis
                  </p>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: emotionAnalysisEnabled ? '#dcfce7' : '#f3f4f6', color: emotionAnalysisEnabled ? '#15803d' : '#6b7280', fontWeight: 600 }}>
                    {emotionAnalysisEnabled ? '🔴 Live' : 'Paused'}
                  </span>
                </div>
                {emotionHistory.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>No emotions detected yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                    {emotionHistory.map((entry, idx) => (
                      <span key={idx} style={{ fontSize: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '3px 8px' }}>
                        {getEmotionEmoji(entry.emotion)} {entry.emotion}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Chat body */}
            <div ref={chatBodyRefDirect} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'linear-gradient(180deg, #f8faf8 0%, #ffffff 100%)' }}>
              {chatLoadingDirect ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0', fontSize: '13px' }}>Loading messages...</p>
              ) : chatMessagesDirect.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatMessagesDirect.map(msg =>
                  msg.videoCall ? (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaVideo style={{ color: '#2563eb', fontSize: '14px' }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '13px', color: '#1d4ed8' }}>Video Call Invitation</p>
                          <p style={{ fontSize: '10px', color: '#93c5fd', fontFamily: 'monospace' }}>Room: {msg.roomCode}</p>
                        </div>
                        <button onClick={() => { setPendingRoomCode(msg.roomCode); setVideoCallOpen(true); }}
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          Join
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                      {msg.senderId !== currentUser.uid && (
                        <img src={chatPatient.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatPatient.displayName || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: '16px', fontSize: '13px', wordBreak: 'break-word', background: msg.senderId === currentUser.uid ? 'linear-gradient(135deg, #3d6655, #4a7c65)' : 'white', color: msg.senderId === currentUser.uid ? 'white' : '#1f2937', border: msg.senderId === currentUser.uid ? 'none' : '1px solid #e5e7eb', borderBottomRightRadius: msg.senderId === currentUser.uid ? '4px' : '16px', borderBottomLeftRadius: msg.senderId !== currentUser.uid ? '4px' : '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        {msg.text}
                        <div style={{ fontSize: '10px', marginTop: '4px', color: msg.senderId === currentUser.uid ? 'rgba(167,243,208,0.8)' : '#9ca3af', textAlign: 'right' }}>
                          {msg.timestamp && new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
            {/* Footer */}
            <div style={{ borderTop: '1px solid #f3f4f6', background: 'white' }}>
              <div style={{ padding: '10px 12px', display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="Type your message..." value={chatInputDirect} onChange={e => setChatInputDirect(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chatInputDirect.trim()) handleSendMessageDirect(); }} autoFocus
                  style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', background: '#f9fafb', color: '#374151' }} />
                <button onClick={handleSendMessageDirect} disabled={!chatInputDirect.trim()} style={{ background: 'linear-gradient(135deg, #3d6655, #4a7c65)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !chatInputDirect.trim() ? 0.5 : 1 }}>Send</button>
              </div>
              <div style={{ padding: '8px 12px 12px' }}>
                <button onClick={() => handleSaveAndEndChat('direct', chatMessagesDirect, { patientId: chatPatient?.id, patientName: chatPatient?.displayName || chatPatient?.name, patientPhotoURL: chatPatient?.photoURL })} disabled={chatMessagesDirect.length === 0}
                  style={{ width: '100%', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', padding: '9px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: chatMessagesDirect.length === 0 ? 0.5 : 1 }}>
                  Save & End Session
                </button>
              </div>
            </div>
            <VideoCallModal open={videoCallOpen} onClose={() => { setVideoCallOpen(false); setPendingRoomCode(null); setIsOutgoingCall(false); }} patientName={chatPatient?.displayName || chatPatient?.name || 'Patient'} doctorName={currentUser?.displayName || 'Doctor'} patientId={chatPatient?.id} doctorId={currentUser?.uid} initialRoomCode={pendingRoomCode} isDirectCall={isOutgoingCall && !!activeCallRoomId} directCallRoomId={activeCallRoomId} onAudioEmotion={handleAudioEmotion} />
          </div>
        </div>
      )}

      {/* ── Chat Report Modal ── */}
      {reportModalOpen && chatReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '24px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: '17px' }}>Session Report & AI Analysis</h3>
              <button onClick={() => setReportModalOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaTimes style={{ color: '#6b7280', fontSize: '12px' }} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Patient header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
                <img src={chatReport.patientPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatReport.patientName || 'P')}&background=c7d2c4&color=374151`} alt="" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover' }} />
                <div>
                  <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '15px' }}>{chatReport.patientName}</p>
                  <p style={{ color: '#9ca3af', fontSize: '12px' }}>Session Summary · {chatReport.messages?.length || 0} messages</p>
                </div>
              </div>

              {/* ── AI Analysis Panel (Phase 2) ── */}
              {chatReport.aiAnalysis && (
                <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 50%, #f5f3ff 100%)', borderRadius: '16px', padding: '20px', marginBottom: '20px', border: '1px solid #dbeafe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <FaBrain style={{ color: '#3b82f6', fontSize: '15px' }} />
                    <h4 style={{ fontWeight: 700, color: '#1e40af', fontSize: '14px', margin: 0 }}>AI Session Analysis</h4>
                  </div>

                  {/* Stat cards row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    {/* Primary Emotion */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #e0e7ff' }}>
                      <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Primary Emotion</p>
                      <p style={{ color: '#1f2937', fontSize: '16px', fontWeight: 800 }}>{chatReport.aiAnalysis.primary_emotion || '—'}</p>
                    </div>
                    {/* Anxiety Level */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #e0e7ff' }}>
                      <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Anxiety Level</p>
                      <p style={{ color: (chatReport.aiAnalysis.anxiety_level || 0) >= 7 ? '#dc2626' : (chatReport.aiAnalysis.anxiety_level || 0) >= 4 ? '#d97706' : '#059669', fontSize: '16px', fontWeight: 800 }}>{chatReport.aiAnalysis.anxiety_level || 0}/10</p>
                    </div>
                    {/* Mood Trajectory */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #e0e7ff' }}>
                      <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Mood Trend</p>
                      <p style={{ color: chatReport.aiAnalysis.mood_trajectory === 'Improving' ? '#059669' : chatReport.aiAnalysis.mood_trajectory === 'Declining' ? '#dc2626' : '#6b7280', fontSize: '16px', fontWeight: 800 }}>
                        {chatReport.aiAnalysis.mood_trajectory === 'Improving' ? '📈' : chatReport.aiAnalysis.mood_trajectory === 'Declining' ? '📉' : '➡️'} {chatReport.aiAnalysis.mood_trajectory || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Risk flag */}
                  {chatReport.aiAnalysis.risk_flag && (
                    <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>⚠️</span>
                      <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 700, margin: 0 }}>Risk Flag: This session may require immediate follow-up or escalation.</p>
                    </div>
                  )}

                  {/* Key concerns */}
                  {chatReport.aiAnalysis.key_concerns && chatReport.aiAnalysis.key_concerns.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#374151', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Key Concerns:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {chatReport.aiAnalysis.key_concerns.map((c, i) => (
                          <span key={i} style={{ background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', border: '1px solid #fde68a' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical summary */}
                  {chatReport.aiAnalysis.clinical_summary && (
                    <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e0e7ff' }}>
                      <p style={{ color: '#374151', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Clinical Summary:</p>
                      <p style={{ color: '#4b5563', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{chatReport.aiAnalysis.clinical_summary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chat transcript */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chatReport.messages.map((msg, idx) => (
                  <div key={msg.id || idx} style={{ padding: '12px', borderRadius: '10px', background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>
                      {msg.senderRole === 'doctor' ? (currentUser.displayName || 'Doctor') : (chatReport.patientName || 'Patient')}
                      <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '11px', marginLeft: '8px' }}>{new Date(msg.timestamp?.seconds * 1000 || msg.timestamp).toLocaleString()}</span>
                    </p>
                    <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setReportModalOpen(false)} style={{ background: '#1f2937', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
