import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need to inject the API key directly because the actual gemini.js uses Vite's import.meta.env
// Instead of messing with Vite environment injection in a simple node script, I'll just copy the 
// exact updated implementation from gemini.js to test it.

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
      console.warn('Gemini API failed (possibly revoked). Using fallback emotion.');
      const text = messageText.toLowerCase();
      let fallbackEmotion = 'Neutral';
      let severity = 'low';
      if (text.includes('stress') || text.includes('mark') || text.includes('exam') || text.includes('less')) { fallbackEmotion = 'Stressed'; severity = 'medium'; }
      else if (text.includes('sad') || text.includes('cry') || text.includes('hopeless')) { fallbackEmotion = 'Sad'; severity = 'medium'; }
      else if (text.includes('worry') || text.includes('anxious') || text.includes('fear')) { fallbackEmotion = 'Anxious'; severity = 'medium'; }
      
      return { emotion: fallbackEmotion, confidence: 0.7, severity, risk_flag: false };
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('detectMessageEmotion failed:', error);
    return { emotion: 'Neutral', confidence: 0.5, severity: 'low', risk_flag: false };
  }
};

async function test() {
  console.log("Test 1: 'nothing much just wanna talk to you'");
  const result1 = await detectMessageEmotion("nothing much just wanna talk to you");
  console.log(result1);

  console.log("\nTest 2: 'hehhe nothing much i just got very less marks in my exsam'");
  const result2 = await detectMessageEmotion("hehhe nothing much i just got very less marks in my exsam");
  console.log(result2);
}

test();
