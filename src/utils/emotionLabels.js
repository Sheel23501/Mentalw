// Map model labels to human-friendly names
// Extend as needed for your chosen model
const LABEL_MAP = {
  joy: 'happy',
  happy: 'happy',
  sadness: 'sad',
  sad: 'sad',
  anger: 'angry',
  angry: 'angry',
  fear: 'fear',
  surprise: 'surprised',
  neutral: 'neutral',
  no_emotion: 'neutral',
  // FER2013 order per model card:
  // 0 Angry, 1 Disgust, 2 Fear, 3 Happy, 4 Sad, 5 Surprise, 6 Neutral
  LABEL_0: 'angry',
  LABEL_1: 'disgust',
  LABEL_2: 'fear',
  LABEL_3: 'happy',
  LABEL_4: 'sad',
  LABEL_5: 'surprised',
  LABEL_6: 'neutral',
};

export function toFriendlyLabel(label) {
  if (!label || typeof label !== 'string') return 'unknown';
  const key = label.toLowerCase();
  return LABEL_MAP[key] || label;
}

export function aggregateLabels(results) {
  // results: [{ emotion, score }]
  const tally = {};
  for (const r of results) {
    const key = toFriendlyLabel(r.emotion);
    if (!tally[key]) tally[key] = { sum: 0, count: 0 };
    tally[key].sum += (r.score || 0);
    tally[key].count += 1;
  }
  let best = { emotion: 'unknown', score: 0 };
  for (const [label, { sum, count }] of Object.entries(tally)) {
    const avg = sum / count;
    if (avg > best.score) best = { emotion: label, score: avg };
  }
  return best;
}
