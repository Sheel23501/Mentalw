import React, { useState, useEffect } from 'react';
import { getChatReportsForPatient } from '../services/firestore';
import { FaTimes } from 'react-icons/fa';

const PatientHistory = ({ patient, onClose }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (patient?.id) {
      setLoading(true);
      getChatReportsForPatient(patient.id)
        .then(data => {
          setReports(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch reports:", err);
          setReports([]);
          setLoading(false);
        });
    }
  }, [patient]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };
  
  if (!patient) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-0 z-50 sm:p-4">
      <div className="bg-white rounded-none w-full h-full shadow-2xl flex flex-col relative sm:rounded-3xl sm:max-w-3xl sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-4">
            <img
              src={patient.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.displayName || 'P')}&background=E5E7EB&color=374151`}
              alt={patient.displayName || 'Patient'}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{patient.displayName || 'Unknown Patient'}</h3>
              <p className="text-sm text-gray-500">Chat History</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <span className="sr-only">Close</span>
            <FaTimes className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-white p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-10">Loading history...</div>
          ) : reports.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No chat history found for this patient.</div>
          ) : (
            <ul className="space-y-4">
              {reports.map(report => (
                <li key={report.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition cursor-pointer" onClick={() => setSelectedReport(report)}>
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-gray-800">Chat Session</p>
                    <p className="text-sm text-gray-500">{formatTimestamp(report.createdAt)}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{report.messages.length} messages</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Report Detail Modal */}
      {selectedReport && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
               <div className="flex justify-between items-center p-4 border-b">
                  <h4 className="font-semibold text-lg">Chat Transcript - {formatTimestamp(selectedReport.createdAt)}</h4>
                  <button onClick={() => setSelectedReport(null)} className="text-gray-500 hover:text-gray-800">
                     <FaTimes />
                  </button>
               </div>
               <div className="p-6 overflow-y-auto">
                 <div className="prose prose-sm max-w-none">
                    {selectedReport.messages.map(msg => (
                      <div key={msg.id || msg.timestamp} className="mb-3">
                        <p className="font-bold">
                          {msg.senderName || (msg.senderRole === 'doctor' ? 'Doctor' : 'Patient')}
                          <span className="text-xs font-normal text-gray-500 ml-2">
                             {formatTimestamp(msg.timestamp)}
                          </span>
                        </p>
                        <p>{msg.text}</p>
                      </div>
                    ))}
                 </div>
               </div>
               <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button
                        onClick={() => setSelectedReport(null)}
                        className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default PatientHistory; 