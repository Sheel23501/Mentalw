import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

export const detectMessageEmotion = async (messageText) => {
  if (!GEMINI_API_KEY || !messageText?.trim()) return null;

  const prompt = `You are a clinical emotion classifier for a mental health platform.
Analyze this SINGLE patient message and classify the emotion.

Message: "${messageText}"

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "emotion": "<one of: Anxious, Sad, Stressed, Angry, Overwhelmed, Hopeless, Fearful, Lonely, Frustrated, Confused, Calm, Hopeful, Grateful, Neutral>",
  "confidence": <number 0.0 to 1.0>,
  "severity": "<low | medium | high>",
  "risk_flag": <boolean - true ONLY if message contains self-harm or suicidal ideation>
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 }
      })
    });

    if (!response.ok) {
      console.log('Response not ok:', await response.text());
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('detectMessageEmotion failed:', error);
    return null;
  }
};

async function test() {
  const result = await detectMessageEmotion("nothing much just wanna talk to you");
  console.log(result);
}

test();
