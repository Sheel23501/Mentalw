import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SessionNotes = ({ doctorId, patientId, sessionId, sessionDate }) => {
  const [noteContent, setNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      setFeedback('');
      try {
        const noteRef = doc(db, `users/${doctorId}/patients/${patientId}/notes/${sessionId}`);
        const noteSnap = await getDoc(noteRef);
        if (noteSnap.exists()) {
          setNoteContent(noteSnap.data().noteContent || '');
        } else {
          setNoteContent('');
        }
      } catch (err) {
        setFeedback('Error loading note.');
      }
      setLoading(false);
    };
    if (doctorId && patientId && sessionId) fetchNote();
  }, [doctorId, patientId, sessionId]);

  const handleSave = async () => {
    setSaving(true);
    setFeedback('');
    try {
      const noteRef = doc(db, `users/${doctorId}/patients/${patientId}/notes/${sessionId}`);
      await setDoc(noteRef, {
        noteContent,
        timestamp: new Date().toISOString(),
        ...(sessionDate ? { sessionDate } : {}),
      }, { merge: true });
      setFeedback('Saved!');
    } catch (err) {
      setFeedback('Error saving note.');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 mt-6 flex flex-col w-full max-w-xl">
      <h3 className="text-lg font-semibold mb-2 text-gray-800">Session Notes</h3>
      <textarea
        className="w-full min-h-[120px] border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 resize-y mb-3"
        value={noteContent}
        onChange={e => setNoteContent(e.target.value)}
        placeholder="Write your session notes here..."
        disabled={loading || saving}
      />
      <button
        className="self-end bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
        onClick={handleSave}
        disabled={saving || loading || !noteContent.trim()}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      {feedback && <div className={`mt-2 text-sm ${feedback === 'Saved!' ? 'text-green-600' : 'text-red-500'}`}>{feedback}</div>}
    </div>
  );
};

export default SessionNotes; 