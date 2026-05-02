import React, { useState, useEffect } from 'react';
import { FaTimes, FaBrain, FaSave, FaMagic, FaExclamationTriangle, FaHistory, FaCheckCircle, FaUser } from 'react-icons/fa';
import { getPatientReport48Hours, getPatientSessionNotes, saveSessionNote } from '../../services/firestore';
import { generateSessionNoteDraft } from '../../services/gemini';

const AdvancedSessionNotesModal = ({ open, onClose, patient, doctorId }) => {
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'history'
  
  // Data State
  const [reportData, setReportData] = useState(null);
  const [pastNotes, setPastNotes] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  
  // Form State
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [status, setStatus] = useState('Stable');
  
  // Action State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!open || !patient?.id) return;

    let isMounted = true;
    setLoadingContext(true);

    const fetchContext = async () => {
      try {
        const [report, notes] = await Promise.all([
          getPatientReport48Hours(patient.id),
          getPatientSessionNotes(patient.id)
        ]);
        if (isMounted) {
          setReportData(report);
          setPastNotes(notes);
          setLoadingContext(false);
        }
      } catch (err) {
        console.error("Error loading patient context:", err);
        if (isMounted) setLoadingContext(false);
      }
    };

    fetchContext();

    return () => {
      isMounted = false;
    };
  }, [open, patient]);

  const handleAutoGenerate = async () => {
    if (!reportData) return;
    setIsGenerating(true);
    try {
      const draft = await generateSessionNoteDraft(reportData);
      if (draft) {
        setSummary(draft.summary || '');
        setKeyPoints(draft.key_points || '');
        setObservations(draft.observations || '');
        setRecommendations(draft.recommendations || '');
      }
    } catch (err) {
      console.error("Failed to generate draft:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNote = async () => {
    if (!summary.trim() && !keyPoints.trim()) return;
    
    setIsSaving(true);
    try {
      const noteData = {
        patient_id: patient.id,
        doctor_id: doctorId,
        session_summary: summary,
        key_points: keyPoints,
        observations: observations,
        recommendations: recommendations,
        status: status,
      };
      const noteId = await saveSessionNote(noteData);
      
      // Prepend to past notes for immediate UI update
      setPastNotes(prev => [{
        id: noteId,
        ...noteData,
        createdAt: new Date().toISOString()
      }, ...prev]);

      // Reset form
      setSummary('');
      setKeyPoints('');
      setObservations('');
      setRecommendations('');
      setStatus('Stable');
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setActiveTab('history');
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#f8fafc', borderRadius: '24px', width: '100%', maxWidth: '1200px', height: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', animation: 'modalSlideUp 0.3s ease',
      }}>
        
        {/* Header */}
        <div style={{
          padding: '20px 32px', background: 'white', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUser style={{ color: '#64748b', fontSize: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{patient?.displayName || patient?.email || 'Unknown Patient'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Session Notes & Context</span>
                {!loadingContext && reportData?.gad_score !== null && (
                  <>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: reportData?.severity === 'Severe' ? '#ef4444' : '#10b981' }}>
                      GAD-7: {reportData?.gad_score} ({reportData?.severity})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FaTimes />
          </button>
        </div>

        {/* Layout Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT PANEL: Context & Insights */}
          <div style={{ width: '350px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs for Left Panel */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={() => setActiveTab('write')} style={{ flex: 1, padding: '16px', background: activeTab === 'write' ? 'transparent' : '#f8fafc', border: 'none', borderBottom: activeTab === 'write' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'write' ? '#2563eb' : '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Current Context
              </button>
              <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '16px', background: activeTab === 'history' ? 'transparent' : '#f8fafc', border: 'none', borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'history' ? '#2563eb' : '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <FaHistory /> Past Notes ({pastNotes.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {activeTab === 'write' ? (
                // AI Insights & Context Panel
                loadingContext ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Loading patient context...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ color: '#1d4ed8', fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}><FaBrain /> AI Risk Signals</h4>
                      {reportData?.risk_level === 'High Risk' || reportData?.risk_level === 'Needs Attention' ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#b91c1c', background: '#fef2f2', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
                          <FaExclamationTriangle style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span>System flagged patient as <strong>{reportData.risk_level}</strong> based on recent AI chat interactions and GAD-7.</span>
                        </div>
                      ) : (
                        <p style={{ color: '#3b82f6', fontSize: '13px', margin: 0 }}>No severe risk signals detected in the last 48 hours.</p>
                      )}
                    </div>

                    <div>
                      <h4 style={{ color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Recent Emotions</h4>
                      {reportData?.emotion_timeline?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {reportData.emotion_timeline.slice(-8).map((e, i) => (
                            <span key={i} style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 500 }}>
                              {e.emotion}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>No notable emotions logged recently.</p>
                      )}
                    </div>
                  </div>
                )
              ) : (
                // Past Notes History Panel
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pastNotes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No past session notes found.</div>
                  ) : (
                    pastNotes.map(note => (
                      <div key={note.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{new Date(note.createdAt).toLocaleDateString()}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: note.status === 'Improving' ? '#dcfce7' : note.status === 'Worsening' ? '#fee2e2' : '#f1f5f9', color: note.status === 'Improving' ? '#166534' : note.status === 'Worsening' ? '#991b1b' : '#475569' }}>
                            {note.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>Summary</p>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.5 }}>{note.session_summary}</p>
                        
                        <p style={{ fontSize: '13px', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>Recommendations</p>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{note.recommendations}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Notes Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto' }}>
            <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Write Session Note</h3>
                <button 
                  onClick={handleAutoGenerate}
                  disabled={isGenerating || loadingContext || !reportData?.chat_history?.length}
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: (isGenerating || loadingContext || !reportData?.chat_history?.length) ? 0.6 : 1 }}
                >
                  <FaMagic /> {isGenerating ? 'Analyzing AI Chats...' : 'Auto-Generate Draft'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Form Group */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ background: '#f1f5f9', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session Summary</label>
                  </div>
                  <textarea 
                    value={summary} onChange={e => setSummary(e.target.value)}
                    placeholder="Brief overview of the session..."
                    style={{ width: '100%', minHeight: '100px', padding: '16px 20px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', color: '#334155', lineHeight: 1.6 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ background: '#f1f5f9', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Issues</label>
                    </div>
                    <textarea 
                      value={keyPoints} onChange={e => setKeyPoints(e.target.value)}
                      placeholder="- Point 1&#10;- Point 2"
                      style={{ width: '100%', minHeight: '120px', padding: '16px 20px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', color: '#334155', lineHeight: 1.6 }}
                    />
                  </div>
                  <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ background: '#f1f5f9', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observations (Tone/Behavior)</label>
                    </div>
                    <textarea 
                      value={observations} onChange={e => setObservations(e.target.value)}
                      placeholder="Patient appeared..."
                      style={{ width: '100%', minHeight: '120px', padding: '16px 20px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', color: '#334155', lineHeight: 1.6 }}
                    />
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ background: '#f1f5f9', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommendations / Next Steps</label>
                  </div>
                  <textarea 
                    value={recommendations} onChange={e => setRecommendations(e.target.value)}
                    placeholder="Suggested interventions..."
                    style={{ width: '100%', minHeight: '100px', padding: '16px 20px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', color: '#334155', lineHeight: 1.6 }}
                  />
                </div>

                {/* Status & Save */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Patient Status:</label>
                    <select 
                      value={status} onChange={e => setStatus(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Improving">Improving 📈</option>
                      <option value="Stable">Stable ⚖️</option>
                      <option value="Worsening">Worsening 📉</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {saveSuccess && <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><FaCheckCircle /> Saved successfully!</span>}
                    <button 
                      onClick={handleSaveNote}
                      disabled={isSaving || (!summary.trim() && !keyPoints.trim())}
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 32px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: (isSaving || (!summary.trim() && !keyPoints.trim())) ? 0.6 : 1, boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                    >
                      <FaSave /> {isSaving ? 'Saving...' : 'Save Session Note'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AdvancedSessionNotesModal;
