import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaChartLine, FaExclamationTriangle, FaBrain, FaRobot, FaUser } from 'react-icons/fa';
import { getPatientReport48Hours } from '../../services/firestore';
import { generateDoctorInsight } from '../../services/gemini';

const getEmotionColor = (emotion) => {
  const e = emotion?.toLowerCase();
  if (['happy', 'joy', 'hopeful', 'grateful'].includes(e)) return '#34d399'; // Green
  if (['sad', 'lonely', 'hopeless'].includes(e)) return '#60a5fa'; // Blue
  if (['angry', 'frustrated', 'disgust'].includes(e)) return '#ef4444'; // Red
  if (['anxious', 'fear', 'stressed', 'overwhelmed'].includes(e)) return '#f59e0b'; // Orange
  return '#9ca3af'; // Neutral/Gray
};

const PatientReportModal = ({ open, onClose, patient }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [insight, setInsight] = useState('');
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!open || !patient?.id) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    const fetchData = async () => {
      try {
        const data = await getPatientReport48Hours(patient.id);
        if (!isMounted) return;
        setReport(data);

        // Generate AI Insight
        if (data.chat_history && data.chat_history.length > 0) {
          const aiInsight = await generateDoctorInsight(data.chat_history, data.emotion_timeline);
          if (isMounted) setInsight(aiInsight);
        } else {
          setInsight('No chat data available in the last 48 hours to generate insights.');
        }
      } catch (err) {
        console.error("Failed to load patient report:", err);
        if (isMounted) setError("Failed to load patient data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [open, patient]);

  // Scroll chat to bottom when loaded
  useEffect(() => {
    if (!loading && report?.chat_history) {
      chatEndRef.current?.scrollIntoView();
    }
  }, [loading, report]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(20, 40, 30, 0.8)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'modalSlideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          background: 'linear-gradient(135deg, #1e3a2f 0%, #2d4a3e 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaChartLine style={{ color: '#a7f3d0' }} />
              Patient 48-Hour Report
            </h2>
            <p style={{ margin: 0, marginTop: '4px', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              {patient?.displayName || patient?.email || 'Unknown Patient'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', background: '#f9fafb' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
              <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: '16px' }}>
                <FaBrain size={40} style={{ color: '#4a7c65' }} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>Aggregating 48-Hour Clinical Data...</p>
            </div>
          ) : error ? (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
              <FaExclamationTriangle size={30} style={{ marginBottom: '12px' }} />
              <p style={{ fontWeight: 600 }}>{error}</p>
            </div>
          ) : (
            <>
              {/* Top Row: Summaries */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* GAD-7 & Risk Card */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '1px', marginBottom: '16px' }}>Latest GAD-7</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1, color: '#1f2937' }}>
                      {report.gad_score !== null ? report.gad_score : '--'}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#9ca3af', paddingBottom: '6px' }}>/ 21</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: report.severity === 'Severe' ? '#fef2f2' : report.severity === 'Moderate' ? '#fffbeb' : '#f0fdf4',
                      color: report.severity === 'Severe' ? '#dc2626' : report.severity === 'Moderate' ? '#d97706' : '#15803d',
                      border: `1px solid ${report.severity === 'Severe' ? '#fecaca' : report.severity === 'Moderate' ? '#fde68a' : '#bbf7d0'}`
                    }}>
                      {report.severity} Anxiety
                    </span>
                    {report.risk_level !== 'Low' && (
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FaExclamationTriangle /> {report.risk_level}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Insight Card */}
                <div style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', padding: '24px', borderRadius: '20px', border: '1px solid #99f6e4', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#0f766e', fontWeight: 700, letterSpacing: '1px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaBrain /> AI Clinical Insight
                  </h3>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#115e59', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                      {insight ? `"${insight}"` : "Generating insights..."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emotion Timeline */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', color: '#1f2937', fontWeight: 700, marginBottom: '20px' }}>Emotion Timeline (Last 48 Hrs)</h3>
                
                {report.emotion_timeline && report.emotion_timeline.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '12px' }}>
                    {report.emotion_timeline.map((e, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                          {new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: getEmotionColor(e.emotion),
                          boxShadow: `0 0 0 4px ${getEmotionColor(e.emotion)}33`
                        }} title={e.emotion} />
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginTop: '8px', textTransform: 'capitalize' }}>
                          {e.emotion}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>No significant emotions detected in the last 48 hours.</p>
                )}
              </div>

              {/* Chat Transcript */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px' }}>
                <h3 style={{ fontSize: '16px', color: '#1f2937', fontWeight: 700, marginBottom: '16px' }}>AI Interaction Logs</h3>
                
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {report.chat_history && report.chat_history.length > 0 ? (
                    report.chat_history.map((log, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: log.senderType === 'user' ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{
                          maxWidth: '75%',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          background: log.senderType === 'user' ? '#dcfce7' : '#f3f4f6',
                          color: log.senderType === 'user' ? '#166534' : '#1f2937',
                          borderBottomRightRadius: log.senderType === 'user' ? '4px' : '16px',
                          borderBottomLeftRadius: log.senderType === 'ai' ? '4px' : '16px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '11px', color: log.senderType === 'user' ? '#15803d' : '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                            {log.senderType === 'user' ? <FaUser /> : <FaRobot />}
                            <span>{log.senderType === 'user' ? 'Patient' : 'AI Therapist'}</span>
                            <span style={{ opacity: 0.6, marginLeft: 'auto', fontWeight: 500 }}>
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                            {log.messageText}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>No interactions recorded in the last 48 hours.</p>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PatientReportModal;
