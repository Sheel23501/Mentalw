import React, { useState, useEffect } from 'react';
import { FaBrain, FaExclamationTriangle, FaChartLine, FaComments, FaHistory, FaLightbulb, FaTimes, FaVideo } from 'react-icons/fa';
import { generatePreSessionBriefing } from '../../services/gemini';
import { getComprehensivePatientData } from '../../services/firestore';

const PreSessionBriefing = ({ open, onClose, patient, onJoinCall }) => {
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !patient?.id) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const loadBriefing = async () => {
      try {
        console.log('🔍 Fetching patient data for briefing...');
        const patientData = await getComprehensivePatientData(patient.id);
        
        console.log('🧠 Generating AI briefing...');
        const aiBriefing = await generatePreSessionBriefing(patientData);
        
        if (mounted) {
          setBriefing(aiBriefing);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load briefing:', err);
        if (mounted) {
          setError('Could not generate pre-session briefing. You can still proceed to the call.');
          setLoading(false);
        }
      }
    };

    loadBriefing();

    return () => { mounted = false; };
  }, [open, patient]);

  if (!open) return null;

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '16px'
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#94a3b8',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const textStyle = {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: 1.6,
    margin: 0
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(12px)',
      animation: 'briefingFadeIn 0.3s ease'
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: '28px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '85vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <FaTimes />
        </button>

        {/* Header */}
        <div style={{
          padding: '32px 40px 24px',
          background: 'linear-gradient(to bottom, rgba(56, 189, 248, 0.1), transparent)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 16px -4px rgba(56, 189, 248, 0.4)'
          }}>
            <FaBrain style={{ color: 'white', fontSize: '32px' }} />
          </div>
          <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 800, margin: 0 }}>Pre-Session Intelligence</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            Clinical briefing for session with <strong>{patient?.displayName || 'Patient'}</strong>
          </p>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '0 40px 40px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(56, 189, 248, 0.2)',
                borderTopColor: '#38bdf8',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'briefingSpin 1s linear infinite'
              }} />
              <p style={{ color: '#94a3b8', fontSize: '15px' }}>Synthesizing patient history...</p>
            </div>
          ) : error ? (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '32px', marginBottom: '12px' }} />
              <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
            </div>
          ) : (
            <div style={{ animation: 'briefingSlideUp 0.4s ease' }}>
              {/* Trajectory Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '999px',
                background: briefing?.overall_trajectory === 'Improving' ? '#065f46' : briefing?.overall_trajectory === 'Declining' ? '#991b1b' : '#334155',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                <FaChartLine /> Overall Trajectory: {briefing?.overall_trajectory}
              </div>

              <div style={cardStyle}>
                <label style={labelStyle}><FaHistory /> Since Last Session</label>
                <p style={textStyle}>{briefing?.since_last_session}</p>
              </div>

              <div style={cardStyle}>
                <label style={labelStyle}><FaBrain /> Emotional Patterns</label>
                <p style={textStyle}>{briefing?.emotional_patterns}</p>
              </div>

              {briefing?.risk_alerts && briefing.risk_alerts !== 'No active risk alerts' && (
                <div style={{ ...cardStyle, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <label style={{ ...labelStyle, color: '#f87171' }}><FaExclamationTriangle /> Risk Alerts</label>
                  <p style={{ ...textStyle, color: '#fca5a5', fontWeight: 600 }}>{briefing?.risk_alerts}</p>
                </div>
              )}

              <div style={cardStyle}>
                <label style={labelStyle}><FaComments /> AI Chat Highlights</label>
                <p style={textStyle}>{briefing?.ai_chat_highlights}</p>
              </div>

              <div style={{ ...cardStyle, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <label style={{ ...labelStyle, color: '#38bdf8' }}><FaLightbulb /> Recommended Focus</label>
                <p style={{ ...textStyle, color: '#bae6fd', fontWeight: 600 }}>{briefing?.recommended_focus}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '24px 40px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '16px'
        }}>
          <button 
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Review Later
          </button>
          <button 
            onClick={onJoinCall}
            style={{
              flex: 2,
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
              border: 'none',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <FaVideo /> Join Session Now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes briefingFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes briefingSpin { to { transform: rotate(360deg); } }
        @keyframes briefingSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PreSessionBriefing;
