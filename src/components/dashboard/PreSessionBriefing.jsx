import React, { useState, useEffect } from 'react';
import { FaTimes, FaBrain, FaExclamationTriangle, FaArrowUp, FaArrowDown, FaMinus, FaRobot, FaCalendarAlt } from 'react-icons/fa';
import { getFullPatientHistory } from '../../services/firestore';
import { generatePreSessionBriefing } from '../../services/gemini';

const PreSessionBriefing = ({ open, onClose, patient }) => {
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !patient?.id) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    const fetchAndGenerate = async () => {
      try {
        const fullHistory = await getFullPatientHistory(patient.id);
        if (!isMounted) return;

        const generatedBriefing = await generatePreSessionBriefing(fullHistory);
        if (isMounted) {
          if (generatedBriefing) {
            setBriefing(generatedBriefing);
          } else {
            setError('Failed to generate AI briefing.');
          }
        }
      } catch (err) {
        console.error("Briefing error:", err);
        if (isMounted) setError("Failed to load patient history.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAndGenerate();

    return () => {
      isMounted = false;
    };
  }, [open, patient]);

  if (!open) return null;

  const renderTrendIcon = (trend) => {
    const t = trend?.toLowerCase() || '';
    if (t.includes('improv')) return <span className="flex items-center gap-1 text-green-600 bg-green-100 px-3 py-1 rounded-full"><FaArrowUp className="text-xs" /> Improving</span>;
    if (t.includes('deteriorat') || t.includes('worsen')) return <span className="flex items-center gap-1 text-red-600 bg-red-100 px-3 py-1 rounded-full"><FaArrowDown className="text-xs" /> Deteriorating</span>;
    return <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1 rounded-full"><FaMinus className="text-xs" /> Stable</span>;
  };

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-800 p-6 flex justify-between items-start text-white">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FaBrain className="text-emerald-300 text-xl" />
              <h2 className="text-xl font-bold tracking-tight">AI Pre-Session Briefing</h2>
            </div>
            <p className="text-emerald-100/80 text-sm font-medium ml-8">
              {patient?.displayName || patient?.email || 'Unknown Patient'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 bg-slate-50 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-800">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
              <p className="font-bold text-lg animate-pulse">Analyzing history & generating briefing...</p>
              <p className="text-sm text-emerald-600/70 mt-2">This takes just a moment.</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 text-center">
              <FaExclamationTriangle className="mx-auto text-3xl mb-3 opacity-80" />
              <p className="font-bold">{error}</p>
            </div>
          ) : briefing ? (
            <div className="space-y-6">
              
              {/* Highlight / Suggested Focus */}
              <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-md border border-emerald-500">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-200 mb-2">Suggested Focus</h3>
                <p className="font-medium text-lg leading-snug">{briefing.suggested_focus}</p>
              </div>

              {/* Status and Trend Row */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm min-w-[200px]">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FaCalendarAlt /> Since Last Session
                  </h3>
                  <div className="font-bold text-sm mt-3">
                    {renderTrendIcon(briefing.changes_since_last)}
                  </div>
                  <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                    {briefing.since_last_session}
                  </p>
                </div>
              </div>

              {/* Grid for Emotions and AI Chats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Emotional Patterns</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {briefing.emotional_patterns}
                  </p>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FaRobot /> AI Discussions
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {briefing.ai_discussions}
                  </p>
                </div>
              </div>

              {/* Risk Alerts */}
              {briefing.risk_alerts && !briefing.risk_alerts.toLowerCase().includes('no active') && (
                <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    <FaExclamationTriangle />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Risk Alert</h3>
                    <p className="text-sm text-red-900 font-medium leading-relaxed">
                      {briefing.risk_alerts}
                    </p>
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
          >
            Ready for Session
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default PreSessionBriefing;
