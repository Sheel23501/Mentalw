import React, { useState, useEffect } from 'react';
import { FaUserMd, FaPhoneAlt, FaComments, FaExclamationTriangle, FaHeart, FaTimes } from 'react-icons/fa';
import { getAllDoctors, saveEscalation } from '../../services/firestore';

/**
 * EscalationModal — Appears when the AI chat triggers a risk-based doctor handoff.
 * Shows a calming UI with available doctors and helpline information.
 *
 * Props:
 *   open          — whether modal is visible
 *   onClose       — close handler
 *   riskScore     — numeric 0-10
 *   avgRisk       — average risk from sliding window
 *   reason        — why escalation was triggered
 *   emotion       — detected emotion string
 *   chatHistory   — array of { role, content } messages
 *   onDoctorSelected — callback(doctor) when user picks a doctor
 *   patientId     — current user's UID
 *   patientName   — current user's display name
 */
const EscalationModal = ({
  open,
  onClose,
  riskScore = 0,
  avgRisk = 0,
  reason = '',
  emotion = '',
  chatHistory = [],
  onDoctorSelected,
  patientId,
  patientName,
}) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [escalationSaved, setEscalationSaved] = useState(false);
  const [connectingDoctor, setConnectingDoctor] = useState(null);

  // Fetch doctors and save escalation record on mount
  useEffect(() => {
    if (!open) return;

    const init = async () => {
      setLoading(true);
      try {
        const docs = await getAllDoctors();
        setDoctors(docs);
      } catch (e) {
        console.error('Failed to fetch doctors for escalation:', e);
        setDoctors([]);
      }
      setLoading(false);

      // Save escalation to Firestore (once)
      if (!escalationSaved && patientId) {
        try {
          const escalationId = await saveEscalation({
            patientId,
            patientName: patientName || 'Unknown',
            riskScore,
            avgRisk,
            reason,
            emotion,
            chatHistoryLength: chatHistory.length,
            // Don't store full chat history in Firestore for privacy — just length + summary
            lastMessages: chatHistory.slice(-5).map(m => ({
              role: m.role,
              content: m.content?.substring(0, 200) || '', // Truncate for storage
            })),
          });

          setEscalationSaved(true);

          // Also call the backend escalation endpoint
          try {
            const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
            await fetch(`${serverUrl}/api/escalate_chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId,
                patientName,
                chatHistory: chatHistory.slice(-10),
                riskScore,
                avgRisk,
                reason,
                emotion,
                escalationId,
              }),
            });
          } catch (fetchErr) {
            console.warn('Backend escalation notification failed (server may be offline):', fetchErr.message);
          }
        } catch (e) {
          console.error('Failed to save escalation:', e);
        }
      }
    };

    init();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDoctorConnect = (doctor) => {
    setConnectingDoctor(doctor.id);
    // Brief animation delay before connecting
    setTimeout(() => {
      if (onDoctorSelected) {
        onDoctorSelected(doctor);
      }
    }, 600);
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'escalationFadeIn 0.4s ease',
    }}>
      {/* Backdrop */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(30,58,47,0.92) 0%, rgba(45,74,62,0.95) 50%, rgba(61,102,85,0.90) 100%)',
        backdropFilter: 'blur(8px)',
      }} />

      {/* Modal Container */}
      <div style={{
        position: 'relative',
        background: 'white',
        borderRadius: '28px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        animation: 'escalationSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 40%, #991b1b 100%)',
          padding: '28px 28px 24px',
          borderRadius: '28px 28px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: '-20px', left: '20%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'escalationPulse 2s infinite',
              }}>
                <FaExclamationTriangle style={{ color: 'white', fontSize: '22px' }} />
              </div>
              <div>
                <h2 style={{ color: 'white', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', marginBottom: '4px', fontFamily: "'Inter', sans-serif" }}>
                  Safety Escalation
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500 }}>
                  Risk Level: {riskScore}/10 • {emotion || 'Unknown'} detected
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              aria-label="Close escalation modal"
            >
              <FaTimes style={{ fontSize: '16px' }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Calming message */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #f59e0b',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <FaHeart style={{ color: '#d97706', fontSize: '18px', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ color: '#92400e', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                You're not alone in this
              </p>
              <p style={{ color: '#a16207', fontSize: '13px', lineHeight: '1.6' }}>
                Based on our conversation, connecting you with a real doctor who can provide proper support is the best next step. Your wellbeing matters most.
              </p>
            </div>
          </div>

          {/* Reason */}
          {reason && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#991b1b',
              lineHeight: '1.5',
            }}>
              <strong>Reason:</strong> {reason}
            </div>
          )}

          {/* Available Doctors */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              color: '#1f2937',
              fontWeight: 700,
              fontSize: '16px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: "'Inter', sans-serif",
            }}>
              <FaUserMd style={{ color: '#4a7c65', fontSize: '16px' }} />
              Available Doctors
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                <div style={{
                  width: '32px', height: '32px', border: '3px solid #e5e7eb',
                  borderTopColor: '#4a7c65', borderRadius: '50%',
                  margin: '0 auto 12px',
                  animation: 'escalationSpin 0.8s linear infinite',
                }} />
                Finding available doctors...
              </div>
            ) : doctors.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '24px',
                background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb',
              }}>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No doctors available right now.</p>
                <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Please use the helpline numbers below.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {doctors.map(doctor => (
                  <div
                    key={doctor.id}
                    style={{
                      background: connectingDoctor === doctor.id
                        ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                        : 'white',
                      border: connectingDoctor === doctor.id
                        ? '2px solid #059669'
                        : '1px solid #e5e7eb',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={doctor.photoURL || doctor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.displayName || doctor.name || 'D')}&background=4a7c65&color=fff`}
                        alt=""
                        style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          objectFit: 'cover', border: '2px solid #f3f4f6', flexShrink: 0,
                        }}
                      />
                      <div>
                        <p style={{ fontWeight: 700, color: '#1f2937', fontSize: '14px' }}>
                          {doctor.displayName || doctor.name || doctor.email || 'Doctor'}
                        </p>
                        <p style={{ color: '#4a7c65', fontSize: '12px', fontWeight: 500 }}>
                          {doctor.specialization || 'Mental Health Specialist'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDoctorConnect(doctor)}
                      disabled={connectingDoctor !== null}
                      style={{
                        background: connectingDoctor === doctor.id
                          ? '#059669'
                          : 'linear-gradient(135deg, #4a7c65 0%, #3d6655 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: connectingDoctor !== null ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        opacity: connectingDoctor !== null && connectingDoctor !== doctor.id ? 0.5 : 1,
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 2px 8px rgba(74,124,101,0.3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {connectingDoctor === doctor.id ? (
                        <>
                          <div style={{
                            width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)',
                            borderTopColor: 'white', borderRadius: '50%',
                            animation: 'escalationSpin 0.6s linear infinite',
                          }} />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <FaComments style={{ fontSize: '12px' }} />
                          Connect Now
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Helplines */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '16px 20px',
          }}>
            <h4 style={{
              color: '#374151', fontWeight: 700, fontSize: '14px',
              marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <FaPhoneAlt style={{ color: '#dc2626', fontSize: '13px' }} />
              Emergency Helplines
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Suicide & Crisis Lifeline</span>
                <a href="tel:988" style={{
                  color: '#dc2626', fontWeight: 700, fontSize: '14px',
                  textDecoration: 'none', background: '#fef2f2',
                  padding: '4px 12px', borderRadius: '8px', border: '1px solid #fecaca',
                }}>988</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Crisis Text Line</span>
                <span style={{
                  color: '#4a7c65', fontWeight: 700, fontSize: '13px',
                  background: '#ecfdf5', padding: '4px 12px', borderRadius: '8px',
                  border: '1px solid #a7f3d0',
                }}>Text HOME to 741741</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>International</span>
                <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" style={{
                  color: '#2563eb', fontWeight: 600, fontSize: '13px',
                  textDecoration: 'none',
                }}>findahelpline.com ↗</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes escalationFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes escalationSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes escalationPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes escalationSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EscalationModal;
