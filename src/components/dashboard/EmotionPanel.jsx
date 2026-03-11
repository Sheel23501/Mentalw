import { useState } from 'react';
import { useEmotionMonitor } from '../../utils/useEmotionMonitor';
import { toFriendlyLabel } from '../../utils/emotionLabels';

export default function EmotionPanel() {
  const [emotion, setEmotion] = useState(null);
  const [details, setDetails] = useState([]);

  useEmotionMonitor({
    enabled: true,
    intervalMs: 15000,
    onResult: (res) => {
      const friendly = toFriendlyLabel(res?.aggregated?.emotion || 'unknown');
      setEmotion(friendly);
      setDetails(res?.results || []);
    },
  });

  return (
    <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Patient Emotion (every 15s):</span>
        <span style={{ padding: '2px 8px', borderRadius: 999, background: '#f3f4f6' }}>{emotion || 'Analyzing...'}</span>
      </div>
      {details.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Frames analyzed: {details.length}</div>
      )}
    </div>
  );
}