import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { saveUserMood } from '../../services/firestore';
import { getTodayDate } from '../../utils/helpers';

const MOODS = [
  { emoji: '😄', label: 'Happy' },
  { emoji: '🙂', label: 'Okay' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Angry' },
];

const MoodTracker = () => {
  const { currentUser } = useAuth();
  const [selectedMood, setSelectedMood] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleMoodSelect = async (mood) => {
    if (!currentUser) return;
    setSaving(true);
    setFeedback('');
    setSelectedMood(mood);
    try {
      await saveUserMood(currentUser.uid, getTodayDate(), mood.label);
      setFeedback(`Mood logged: ${mood.label} ${mood.emoji}`);
    } catch (err) {
      setFeedback('Error saving mood. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8 flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">How are you feeling today?</h2>
      <div className="flex space-x-4 my-4">
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            className={`text-3xl focus:outline-none transition-transform transform hover:scale-125 ${selectedMood?.label === mood.label ? 'ring-2 ring-green-400' : ''}`}
            onClick={() => handleMoodSelect(mood)}
            disabled={saving}
            aria-label={mood.label}
          >
            {mood.emoji}
          </button>
        ))}
      </div>
      {feedback && <div className="text-green-600 font-medium mt-2">{feedback}</div>}
      {!feedback && <div className="text-gray-500 text-sm">Tap an emoji to log your mood for today.</div>}
    </div>
  );
};

export default MoodTracker; 