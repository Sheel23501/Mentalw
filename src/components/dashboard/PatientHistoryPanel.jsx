import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaChartLine, FaBrain, FaComments, FaVideo, FaEdit, FaExclamationTriangle } from 'react-icons/fa';
import { getComprehensivePatientData } from '../../services/firestore';
import { generatePatientOverview } from '../../services/gemini';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const getEmotionColor = (emotion) => {
  const e = emotion?.toLowerCase();
  if (['happy', 'joy', 'hopeful', 'grateful'].includes(e)) return '#34d399';
  if (['sad', 'lonely', 'hopeless'].includes(e)) return '#60a5fa';
  if (['angry', 'frustrated', 'disgust'].includes(e)) return '#ef4444';
  if (['anxious', 'fear', 'stressed', 'overwhelmed'].includes(e)) return '#f59e0b';
  return '#9ca3af';
};

const PatientHistoryPanel = ({ open, onClose, patient }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  const [overview, setOverview] = useState('');
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (!open || !patient?.id) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getComprehensivePatientData(patient.id);
        setHistory(data.history);
        
        // Generate AI overview
        const summary = await generatePatientOverview(data.history);
        setOverview(summary);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
      setLoading(false);
    };

    loadData();
  }, [open, patient]);

  if (!open) return null;

  const TabButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        border: 'none',
        background: activeTab === id ? '#4a7c65' : 'transparent',
        color: activeTab === id ? 'white' : '#6b7280',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        background: 'white',
        width: '100%',
        maxWidth: '1100px',
        height: '90vh',
        borderRadius: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.05)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src={patient.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.displayName || 'P')}&background=c7d2c4&color=374151`} 
              alt="" 
              style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover' }} 
            />
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: 0 }}>Clinical History</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{patient.displayName} • Comprehensive View</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: '#fff', 
              border: '1px solid #e2e8f0', 
              color: '#64748b', 
              padding: '10px', 
              borderRadius: '12px', 
              cursor: 'pointer' 
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 32px', display: 'flex', gap: '8px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          <TabButton id="summary" label="Summary" icon={<FaChartLine />} />
          <TabButton id="gad7" label="GAD-7" icon={<FaBrain />} />
          <TabButton id="emotions" label="Emotions" icon={<FaChartLine />} />
          <TabButton id="aichat" label="AI Chat" icon={<FaComments />} />
          <TabButton id="notes" label="Notes" icon={<FaEdit />} />
          <TabButton id="transcripts" label="Transcripts" icon={<FaVideo />} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#4a7c65', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Synthesizing clinical data...</p>
            </div>
          ) : (
            <div>
              {activeTab === 'summary' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Risk Status</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Low</span>
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Latest GAD-7</p>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{history.gad7[0]?.score || 'N/A'}</span>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{history.gad7[0]?.severity || 'No tests taken'}</p>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Sessions</p>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{history.transcripts.length + history.sessionNotes.length}</span>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total clinical interactions</p>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', padding: '32px', borderRadius: '24px', border: '1px solid #bae6fd', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <FaBrain style={{ color: '#0369a1' }} />
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0369a1', margin: 0 }}>AI Clinical Overview</h3>
                    </div>
                    <p style={{ fontSize: '15px', color: '#0c4a6e', lineHeight: 1.6, margin: 0 }}>
                      {overview}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'gad7' && (
                <div style={{ height: '400px', animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>GAD-7 Score Progression</h3>
                  {history.gad7.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...history.gad7].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={(t) => new Date(t).toLocaleDateString()} 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis domain={[0, 21]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip />
                        <ReferenceLine y={5} stroke="#34d399" strokeDasharray="3 3" label={{ value: 'Mild', fill: '#34d399', fontSize: 10 }} />
                        <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Moderate', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Severe', fill: '#ef4444', fontSize: 10 }} />
                        <Line type="monotone" dataKey="score" stroke="#4a7c65" strokeWidth={4} dot={{ r: 6, fill: '#4a7c65' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>No GAD-7 history available.</div>
                  )}
                </div>
              )}

              {activeTab === 'emotions' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>Recent Emotion Logs</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {history.emotions.map((log, i) => (
                      <div key={i} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getEmotionColor(log.emotion) }}></span>
                          <span style={{ fontWeight: 700, fontSize: '14px', textTransform: 'capitalize' }}>{log.emotion}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                          {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'aichat' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>AI Therapist Interactions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {history.aiChats.length > 0 ? (
                      history.aiChats.map((msg, i) => (
                        <div key={i} style={{ padding: '16px', borderRadius: '16px', background: msg.role === 'user' ? '#f8fafc' : '#f0fdf4', border: '1px solid #f1f5f9', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                          <p style={{ fontSize: '13px', color: '#1e293b', margin: 0 }}>{msg.text}</p>
                          <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>No AI chat history available.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'transcripts' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>Video Consultation History</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {history.transcripts.length > 0 ? (
                      history.transcripts.map((t, i) => (
                        <div key={i} style={{ padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaVideo style={{ color: '#059669' }} />
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>Session Transcript</p>
                                <p style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(t.timestamp?.seconds * 1000).toLocaleString()}</p>
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px' }}>{t.duration || '0'}s</span>
                          </div>
                          
                          {t.summary && (
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid #4a7c65' }}>
                              <p style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>AI Summary</p>
                              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>{t.summary.summary_paragraph}</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                                {t.summary.key_concerns?.map((c, j) => (
                                  <span key={j} style={{ fontSize: '10px', fontWeight: 600, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '999px' }}>{c}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <details style={{ cursor: 'pointer' }}>
                            <summary style={{ fontSize: '13px', color: '#4a7c65', fontWeight: 600 }}>View Full Transcript</summary>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b', lineHeight: 1.6, padding: '12px', background: '#f8fafc', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                              {t.transcript}
                            </div>
                          </details>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>No video call history available.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>Session Notes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {history.sessionNotes.length > 0 ? (
                      history.sessionNotes.map((note, i) => (
                        <div key={i} style={{ padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>{note.date || 'No Date'}</p>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{note.status || 'Archived'}</span>
                          </div>
                          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{note.notes || note.reason || 'No clinical notes provided.'}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>No session notes available.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  );
};

export default PatientHistoryPanel;
