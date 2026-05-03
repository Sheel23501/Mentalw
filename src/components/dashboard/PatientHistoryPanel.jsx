import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaChartLine, FaBrain, FaComments, FaVideo, FaEdit, FaExclamationTriangle } from 'react-icons/fa';
import { getFullPatientHistory } from '../../services/firestore';
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
  const [selectedTranscript, setSelectedTranscript] = useState(null);

  useEffect(() => {
    if (!open || !patient?.id) return;

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const fullHistory = await getFullPatientHistory(patient.id);
        if (!isMounted) return;
        setHistory(fullHistory);

        // Generate the 1-line overview
        const aiOverview = await generatePatientOverview(fullHistory);
        if (isMounted) setOverview(aiOverview);
      } catch (err) {
        console.error("Failed to load patient history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [open, patient]);

  if (!open) return null;

  const tabs = [
    { id: 'summary', label: 'Summary', icon: <FaUser /> },
    { id: 'gad7', label: 'GAD-7 Timeline', icon: <FaChartLine /> },
    { id: 'emotions', label: 'Emotions', icon: <FaBrain /> },
    { id: 'aichats', label: 'AI Chat Logs', icon: <FaComments /> },
    { id: 'transcripts', label: 'Video Sessions', icon: <FaVideo /> },
    { id: 'notes', label: 'Doctor Notes', icon: <FaEdit /> },
  ];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="animate-spin mb-4"><FaBrain size={40} className="text-emerald-600" /></div>
          <p className="font-medium">Aggregating comprehensive patient history...</p>
        </div>
      );
    }

    if (!history) {
      return <div className="p-8 text-center text-red-500">Failed to load patient history.</div>;
    }

    switch (activeTab) {
      case 'summary':
        return (
          <div className="p-6 space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-teal-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-teal-800 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <FaBrain /> AI Clinical Overview
              </h3>
              <p className="text-teal-900 text-lg font-medium">
                {overview || "Analyzing..."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">Latest GAD-7</h4>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-5xl font-black text-gray-800">{history.gad7?.current_score ?? '--'}</span>
                  <span className="text-xl font-bold text-gray-400 pb-1">/ 21</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold ${history.gad7?.current_severity === 'Severe' ? 'bg-red-100 text-red-700' : history.gad7?.current_severity === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {history.gad7?.current_severity || 'Unknown'}
                  </span>
                  <span className="px-3 py-1 rounded-lg text-sm font-bold bg-gray-100 text-gray-600">
                    Trend: {history.gad7?.trend === 'improving' ? '📉 Improving' : history.gad7?.trend === 'worsening' ? '📈 Worsening' : '⚖️ Stable'}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">Risk Profile</h4>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-4 py-2 rounded-xl text-base font-bold flex items-center gap-2 ${history.risk_level === 'High Risk' ? 'bg-red-100 text-red-700 border border-red-200' : history.risk_level === 'Needs Attention' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                    {history.risk_level !== 'Low' && <FaExclamationTriangle />}
                    {history.risk_level}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>{history.escalations?.length || 0}</strong> past escalation events</p>
                  <p><strong>{history.session_notes?.length || 0}</strong> doctor sessions completed</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'gad7':
        const chartData = history.gad7?.history?.map(h => ({
          date: new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          score: h.score
        })) || [];

        return (
          <div className="p-6 h-full flex flex-col animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800 mb-6">GAD-7 Assessment Timeline</h3>
            {chartData.length > 0 ? (
              <div className="flex-1 min-h-[300px] bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 21]} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                    />
                    <ReferenceLine y={15} stroke="#fca5a5" strokeDasharray="3 3" label={{ position: 'top', value: 'Severe (15+)', fill: '#ef4444', fontSize: 11 }} />
                    <ReferenceLine y={10} stroke="#fcd34d" strokeDasharray="3 3" label={{ position: 'top', value: 'Moderate (10+)', fill: '#f59e0b', fontSize: 11 }} />
                    <ReferenceLine y={5} stroke="#86efac" strokeDasharray="3 3" label={{ position: 'top', value: 'Mild (5+)', fill: '#10b981', fontSize: 11 }} />
                    <Line type="monotone" dataKey="score" stroke="#059669" strokeWidth={3} dot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">No GAD-7 history available.</div>
            )}
          </div>
        );

      case 'emotions':
        return (
          <div className="p-6 h-full flex flex-col animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Long-term Emotion Timeline</h3>
            {history.emotions?.length > 0 ? (
              <div className="flex flex-wrap gap-3 overflow-y-auto pb-6">
                {history.emotions.slice(-50).map((e, idx) => (
                  <div key={idx} className="flex flex-col items-center bg-white border border-gray-100 p-3 rounded-xl shadow-sm min-w-[90px]">
                    <div className="text-[10px] text-gray-400 mb-2 font-medium">
                      {new Date(e.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div 
                      className="w-5 h-5 rounded-full mb-2"
                      style={{ 
                        background: getEmotionColor(e.emotion),
                        boxShadow: `0 0 0 4px ${getEmotionColor(e.emotion)}33`
                      }} 
                      title={e.message}
                    />
                    <div className="text-xs font-bold text-gray-700 capitalize">
                      {e.emotion}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">No emotion data logged yet.</div>
            )}
          </div>
        );

      case 'aichats':
        return (
          <div className="p-6 h-full flex flex-col animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800 mb-6">AI Chat Interactions</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-4">
              {history.ai_chat_logs?.length > 0 ? (
                history.ai_chat_logs.slice(-50).map((log, idx) => (
                  <div key={idx} className={`flex flex-col ${log.senderType === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] p-4 rounded-2xl ${log.senderType === 'user' ? 'bg-emerald-50 text-emerald-900 rounded-br-sm' : 'bg-gray-50 text-gray-800 rounded-bl-sm border border-gray-100'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          {log.senderType === 'user' ? 'Patient' : 'AI'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{log.messageText}</p>
                      {log.senderType === 'user' && log.emotionLabel && log.emotionLabel !== 'neutral' && (
                        <div className="mt-2 text-[10px] font-bold px-2 py-1 rounded-full inline-block" style={{ color: getEmotionColor(log.emotionLabel), background: `${getEmotionColor(log.emotionLabel)}22` }}>
                          {log.emotionLabel}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-12">No AI chat history available.</div>
              )}
            </div>
          </div>
        );

      case 'transcripts':
        return (
          <div className="p-6 h-full flex flex-col animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Video Call Transcripts</h3>
            {history.transcripts?.length > 0 ? (
              <div className="space-y-4 overflow-y-auto pr-2">
                {history.transcripts.map(transcript => (
                  <div 
                    key={transcript.id} 
                    onClick={() => setSelectedTranscript(transcript)}
                    className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <FaVideo className="text-emerald-600" /> Session Transcript
                      </h4>
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                        {new Date(transcript.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 flex items-center gap-4">
                      <span>⏱️ {Math.floor(transcript.duration_seconds / 60)}m {transcript.duration_seconds % 60}s</span>
                      <span>📝 {transcript.transcript?.split(' ').length || 0} words</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">No video call transcripts available.</div>
            )}

            {/* Transcript Detail Modal */}
            {selectedTranscript && (
              <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <FaVideo className="text-emerald-600" /> Transcript Details
                    </h3>
                    <button onClick={() => setSelectedTranscript(null)} className="text-gray-400 hover:text-gray-800 transition">
                      <FaTimes size={20} />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 bg-white">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Raw Transcript</h4>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {selectedTranscript.transcript || 'Transcript is empty.'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="p-6 h-full flex flex-col animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Doctor Session Notes</h3>
            {history.session_notes?.length > 0 ? (
              <div className="space-y-4 overflow-y-auto pr-2">
                {history.session_notes.map(note => (
                  <div key={note.id} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {new Date(note.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${note.status === 'Improving' ? 'bg-green-100 text-green-700' : note.status === 'Worsening' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {note.status}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-bold text-gray-800 mb-1">Session Summary</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{note.session_summary || 'N/A'}</p>
                      </div>
                      
                      {note.key_points && (
                        <div>
                          <h5 className="text-sm font-bold text-gray-800 mb-1">Key Issues</h5>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{note.key_points}</p>
                        </div>
                      )}
                      
                      {note.observations && (
                        <div>
                          <h5 className="text-sm font-bold text-gray-800 mb-1">Observations</h5>
                          <p className="text-sm text-gray-600 leading-relaxed">{note.observations}</p>
                        </div>
                      )}
                      
                      {note.recommendations && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <h5 className="text-sm font-bold text-emerald-800 mb-1">Recommendations</h5>
                          <p className="text-sm text-emerald-900 leading-relaxed">{note.recommendations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">No session notes recorded yet.</div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-[1200px] h-[85vh] rounded-[32px] shadow-2xl flex overflow-hidden border border-white/20">
        
        {/* Left Sidebar - Navigation */}
        <div className="w-[280px] bg-gradient-to-b from-[#1e3a2f] to-[#2d4a3e] text-white flex flex-col">
          <div className="p-8 pb-6 border-b border-white/10">
            <h2 className="text-2xl font-black tracking-tight mb-2">Patient History</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {patient?.displayName?.charAt(0) || 'P'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold truncate text-white/90">{patient?.displayName || patient?.email || 'Unknown Patient'}</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-white/15 text-white shadow-inner' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }`}
              >
                <span className={`text-lg ${activeTab === tab.id ? 'text-emerald-400' : ''}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col bg-[#f8fafc] relative">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white text-gray-400 hover:text-gray-800 hover:bg-gray-100 flex items-center justify-center shadow-sm transition z-10"
          >
            <FaTimes />
          </button>
          
          <div className="flex-1 overflow-hidden">
            {renderTabContent()}
          </div>
        </div>

      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PatientHistoryPanel;
