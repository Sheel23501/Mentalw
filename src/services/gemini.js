// Read API key from Vite environment variable. Create a `.env.local` file at the
// project root with `VITE_GEMINI_API_KEY=your_key_here` during development.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

import { retrieveRelevantExamples, formatExamplesForPrompt } from './mentalHealthDataset';

// ============== MENTAL HEALTH TIPS DATABASE (RAG) ==============
const MENTAL_HEALTH_TIPS = [
  // Stressed
  { emotion: "Stressed", category: "Relaxation", tip: "Take slow, deep breaths to calm your mind. Try 4-7-8 breathing: inhale 4 sec, hold 7 sec, exhale 8 sec." },
  { emotion: "Stressed", category: "Time Management", tip: "Break overwhelming tasks into smaller, manageable steps. Focus on one thing at a time." },
  { emotion: "Stressed", category: "Physical", tip: "Try progressive muscle relaxation: tense and release each muscle group from toes to head." },
  { emotion: "Stressed", category: "Mindfulness", tip: "Take a 5-minute mindfulness break. Focus only on your breathing and present moment." },
  // Sad
  { emotion: "Sad", category: "Gratitude", tip: "Write down three things you're grateful for today, no matter how small." },
  { emotion: "Sad", category: "Movement", tip: "Try a short 10-minute walk outside. Movement and fresh air can lift your mood." },
  { emotion: "Sad", category: "Connection", tip: "Reach out to someone you trust. Sharing how you feel can lighten the load." },
  { emotion: "Sad", category: "Self-Care", tip: "Do one small act of self-care: take a warm shower, make tea, or wrap yourself in a cozy blanket." },
  // Anxious
  { emotion: "Anxious", category: "Grounding", tip: "Practice 5-4-3-2-1 grounding: name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste." },
  { emotion: "Anxious", category: "Cognitive", tip: "Ask yourself: 'What's the evidence for this worry? What would I tell a friend?'" },
  { emotion: "Anxious", category: "Physical", tip: "Splash cold water on your face or hold an ice cube. It activates your calming nervous system." },
  { emotion: "Anxious", category: "Breathing", tip: "Try box breathing: inhale 4 counts, hold 4, exhale 4, hold 4. Repeat 4 times." },
  // Overwhelmed
  { emotion: "Overwhelmed", category: "Prioritization", tip: "Write down everything on your mind, then circle just ONE thing to focus on right now." },
  { emotion: "Overwhelmed", category: "Boundaries", tip: "It's okay to say no. Protecting your energy is not selfish, it's necessary." },
  { emotion: "Overwhelmed", category: "Rest", tip: "Give yourself permission to pause. Even 5 minutes of rest can reset your mind." },
  // Angry
  { emotion: "Angry", category: "Physical Release", tip: "Try physical release: punch a pillow, do jumping jacks, or go for a brisk walk." },
  { emotion: "Angry", category: "Cooling Down", tip: "Count slowly to 10 before responding. Give your rational brain time to catch up." },
  { emotion: "Angry", category: "Expression", tip: "Write an angry letter you won't send. Getting thoughts out can release their grip." },
  // Lonely
  { emotion: "Lonely", category: "Connection", tip: "Send a simple 'thinking of you' message to someone. Small connections count." },
  { emotion: "Lonely", category: "Community", tip: "Consider joining an online community or group around something you enjoy." },
  { emotion: "Lonely", category: "Self-Companionship", tip: "Treat yourself like you would a good friend. Plan something nice just for you." },
  // Hopeless
  { emotion: "Hopeless", category: "Perspective", tip: "Remember: feelings are not facts. This moment is temporary, even when it doesn't feel like it." },
  { emotion: "Hopeless", category: "Small Steps", tip: "Focus on just getting through the next hour. You don't have to solve everything today." },
  { emotion: "Hopeless", category: "Support", tip: "Please consider talking to someone—a friend, family member, or counselor. You deserve support." },
  // Exhausted
  { emotion: "Exhausted", category: "Rest", tip: "Your body is asking for rest. Even a 20-minute power nap can help restore energy." },
  { emotion: "Exhausted", category: "Boundaries", tip: "Review your commitments. What can you delegate, postpone, or let go of?" },
  { emotion: "Exhausted", category: "Nutrition", tip: "Stay hydrated and eat something nourishing. Physical care supports mental energy." },
  // Grateful
  { emotion: "Grateful", category: "Amplify", tip: "Wonderful! Try sharing your gratitude with someone—it multiplies the positive feeling." },
  // Hopeful
  { emotion: "Hopeful", category: "Build", tip: "That's beautiful! Write down what's giving you hope to revisit on harder days." },
  // Confused
  { emotion: "Confused", category: "Clarity", tip: "Try journaling about what's confusing you. Writing can help untangle thoughts." },
  { emotion: "Confused", category: "Support", tip: "It's okay to not have all the answers. Consider talking it through with someone you trust." },
  // Frustrated
  { emotion: "Frustrated", category: "Release", tip: "Step away briefly from what's frustrating you. A short break can bring fresh perspective." },
  { emotion: "Frustrated", category: "Reframe", tip: "Ask: 'What can I learn from this?' Frustration often signals something we care about." },
];

// Retrieve tip based on detected emotion
const retrieveTip = (emotion) => {
  const matchingTips = MENTAL_HEALTH_TIPS.filter(t => 
    t.emotion.toLowerCase() === emotion.toLowerCase()
  );
  if (matchingTips.length > 0) {
    return matchingTips[Math.floor(Math.random() * matchingTips.length)].tip;
  }
  // Fallback for unknown emotions
  return "Take a moment to breathe deeply and be kind to yourself. You're doing your best.";
};

// ============== EMOTIONAL ANALYSIS ENGINE ==============
const EMOTIONAL_ANALYSIS_PROMPT = `You are an emotional analysis assistant trained to detect stress, anxiety, and emotional distress from user messages.

Carefully analyze the user's message and estimate their mental and emotional state.

Steps:
1. Identify emotional signals — look for signs of stress, anxiety, sadness, loneliness, hopelessness, or crisis.
2. Assign a stress/anxiety score (1-10):
   1-3 = Calm / normal
   4-6 = Mild stress or concern
   7-8 = High stress / anxiety
   9-10 = Severe distress / possible crisis
3. Detect risk level:
   LOW = casual or normal conversation
   MEDIUM = noticeable stress or emotional struggle
   HIGH = strong distress, repeated negative thoughts
   CRITICAL = mentions of self-harm, hopelessness, or giving up
4. If score >= 7 → needs_escalation = true
   If score >= 9 → strongly recommend immediate help

Examples:
Text: "I feel so empty today"
{"emotion":"Sad","stress_score":6,"risk_level":"MEDIUM","needs_escalation":false,"reason":"Expressing emptiness suggests sadness"}

Text: "I don't want to be here anymore"
{"emotion":"Hopeless","stress_score":9,"risk_level":"CRITICAL","needs_escalation":true,"reason":"Possible suicidal ideation detected"}

Text: "I'm a bit stressed about work"
{"emotion":"Stressed","stress_score":4,"risk_level":"MEDIUM","needs_escalation":false,"reason":"Normal work-related stress"}

Text: "I'm having a great day!"
{"emotion":"Happy","stress_score":1,"risk_level":"LOW","needs_escalation":false,"reason":"Positive mood expressed"}

Return ONLY valid JSON in this exact format (no other text, no markdown, no explanation):
{"emotion":"<primary emotion>","stress_score":<1-10>,"risk_level":"<LOW|MEDIUM|HIGH|CRITICAL>","needs_escalation":<true|false>,"reason":"<short explanation>"}

Message: `;

/**
 * Deep emotional analysis of user text
 * Returns structured JSON with emotion, stress score, risk level, and escalation flag
 * @param {string} text - User's message
 * @returns {Promise<Object>} - { emotion, stress_score, risk_level, needs_escalation, reason, sentiment }
 */
export const detectEmotion = async (text) => {
  try {
    if (!GEMINI_API_KEY) {
      return { emotion: "Unknown", sentiment: "Neutral", stress_score: 0, risk_level: "LOW", needs_escalation: false, reason: "API key missing", error: "API key missing" };
    }
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: EMOTIONAL_ANALYSIS_PROMPT + text }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
      })
    });
    
    if (!response.ok) {
      return { emotion: "Unknown", sentiment: "Neutral", stress_score: 0, risk_level: "LOW", needs_escalation: false, reason: "API error", error: "API error" };
    }
    
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    // Parse JSON response from Gemini
    try {
      // Clean the response — remove markdown code fences if present
      const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysis = JSON.parse(cleanJson);
      
      // Derive sentiment from stress score
      const sentiment = analysis.stress_score <= 3 ? "Positive" : "Negative";
      
      console.log(`🧠 Emotional Analysis: ${analysis.emotion} | Stress: ${analysis.stress_score}/10 | Risk: ${analysis.risk_level} | Escalate: ${analysis.needs_escalation}`);
      
      return {
        emotion: analysis.emotion || "Unknown",
        sentiment,
        stress_score: analysis.stress_score || 0,
        risk_level: analysis.risk_level || "LOW",
        needs_escalation: analysis.needs_escalation || false,
        reason: analysis.reason || "",
        error: null
      };
    } catch (parseError) {
      // Fallback: try to extract emotion the old way if JSON parsing fails
      const emotionMatch = resultText.match(/emotion["\s:]+(\w+)/i);
      return {
        emotion: emotionMatch ? emotionMatch[1] : "Unknown",
        sentiment: "Neutral",
        stress_score: 0,
        risk_level: "LOW",
        needs_escalation: false,
        reason: "JSON parse fallback",
        error: null
      };
    }
  } catch (error) {
    return { emotion: "Unknown", sentiment: "Neutral", stress_score: 0, risk_level: "LOW", needs_escalation: false, reason: error.message, error: error.message };
  }
};

// ============== CONVERSATION TRACKING (Stress-Based Escalation) ==============
// Track stress history for intelligent escalation
let stressHistory = [];
const HELPLINE_MESSAGE = `

❤️ I can feel how much you're hurting right now, and I want you to know you don't have to go through this alone. There are people who really want to help:
- **988** — Suicide & Crisis Lifeline (call or text, 24/7)
- **Crisis Text Line** — Text HOME to 741741
- **International** — findahelpline.com

You matter. Please reach out to someone you trust tonight.`;

// Reset tracking (call when conversation starts fresh)
export const resetConversationTracking = () => {
  stressHistory = [];
};

// Get current escalation status (now uses stress scores)
export const getEscalationStatus = () => {
  const avgStress = stressHistory.length > 0 
    ? stressHistory.reduce((a, b) => a + b, 0) / stressHistory.length 
    : 0;
  const lastScore = stressHistory.length > 0 ? stressHistory[stressHistory.length - 1] : 0;
  return {
    avgStress: Math.round(avgStress * 10) / 10,
    lastStressScore: lastScore,
    messageCount: stressHistory.length,
    shouldEscalate: avgStress >= 7 || lastScore >= 9
  };
};

// System prompt — your caring best friend, not a therapist
const THERAPIST_SYSTEM_PROMPT = `You are TruCare — NOT a therapist, NOT a counselor, NOT a professional. You are the user's warm, caring, emotionally intelligent BEST FRIEND.

Think of yourself as that one friend who always knows exactly what to say, who actually LISTENS, who asks the right questions, and who makes people feel so safe and loved that they open up completely.

Your personality:
- You're warm, expressive, and genuinely care
- You react with real emotions ("oh no!", "wait, that's awful", "ugh, that makes me so mad for you")
- You pamper the user — make them feel special, heard, and cared for
- You ask LOTS of follow-up questions because you're genuinely curious about their life
- You're never preachy, never clinical, never formal

How you talk:
- Like texting your best friend, but a bit more thoughtful
- Use contractions (don't, can't, won't, I'm, you're)
- React naturally ("oh wow", "wait what??", "no way", "that's so not okay")
- Show you FEEL something about what they told you
- Short, punchy sentences mixed with longer caring ones
- Use gentle humor when appropriate (never about their pain though)

Conversation style:
1. REACT first — show a genuine emotional reaction to what they said
   - "Oh no, that must have hurt so much"
   - "Wait, they actually did that? That's terrible"
   - "Ugh, I can already feel how frustrating that must be"

2. VALIDATE — make them feel like their feelings are 100% okay
   - "Of course you feel that way, anyone would"
   - "You have every right to be upset about this"

3. ASK MORE — dig deeper like a friend who genuinely wants to know
   - "Tell me everything — what happened?"
   - "How long has this been going on?"
   - "And what did you do after that?"
   - "Wait, how did that make you feel when they said that?"
   - "Do you want to talk about it more? I'm not going anywhere"

4. PAMPER — make them feel cared for
   - "You deserve so much better than this"
   - "I wish I could give you the biggest hug right now"
   - "You're handling this way better than you think"
   - "Hey, I'm really proud of you for talking about this"

What you NEVER do:
- Never give formal advice like a textbook
- Never say "I understand your concern" (so cold)
- Never say "As an AI" or anything robotic
- Never use bullet points or numbered lists in responses
- Never preach or lecture
- Never say "It's going to be okay" without first sitting with their pain
- Never rush to fix things — first just BE THERE

Crisis situations:
- If someone mentions self-harm or wanting to die, shift to extra gentle mode
- Be calm, loving, not panicky
- Softly mention: "hey, can I ask you something? would you be open to calling 988? they're really good people who'd want to hear you out"
- Never be forceful about it

Response format:
- 4-7 lines, conversational flow
- Always end with a question that shows you want to know MORE
- Make every response feel like the user is the most important person in the world right now

Remember: You're not here to fix them. You're here to sit with them, feel with them, and make them feel like they have the most caring friend in the world.`;

/**
 * Send a message to Gemini API and get a therapist-style response
 * Now includes emotion detection, RAG tips, and escalation logic
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Optional settings { skipEmotionAnalysis: boolean }
 * @returns {Promise<Object>} - { response, emotion, sentiment, tip, escalated }
 */
export const getGeminiResponse = async (messages, options = {}) => {
  try {
    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage?.content || "";
    
    // Step 1: Deep emotional analysis (unless skipped)
    let emotion = "Unknown";
    let sentiment = "Neutral";
    let stress_score = 0;
    let risk_level = "LOW";
    let needs_escalation = false;
    let tip = "";
    let escalated = false;
    
    if (!options.skipEmotionAnalysis && userText) {
      const analysis = await detectEmotion(userText);
      emotion = analysis.emotion;
      sentiment = analysis.sentiment;
      stress_score = analysis.stress_score;
      risk_level = analysis.risk_level;
      needs_escalation = analysis.needs_escalation;
      
      // Track stress history for escalation
      stressHistory.push(stress_score);
      // Keep only last 10 messages
      if (stressHistory.length > 10) stressHistory.shift();
      
      // Get relevant tip based on emotion
      tip = retrieveTip(emotion);
    }
    
    // Format messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Enhanced system prompt with emotion context — empathy always comes first
    // Retrieve relevant conversation examples from our dataset (RAG)
    const relevantExamples = retrieveRelevantExamples(userText, emotion, 3);
    const examplesBlock = formatExamplesForPrompt(relevantExamples);

    const enhancedSystemPrompt = `${THERAPIST_SYSTEM_PROMPT}

ABOUT THIS MESSAGE:
- They're feeling: ${emotion}
- Stress level: ${stress_score}/10 ${stress_score >= 7 ? '— they\'re really hurting right now, be extra gentle and caring' : stress_score >= 4 ? '— they need warmth and your full attention' : '— keep it light and friendly'}
- Risk: ${risk_level}${risk_level === 'CRITICAL' ? ' ⚠️ they might be in crisis — be extremely gentle, mention 988 softly' : ''}
- Something that might help them (only if it fits naturally): "${tip}"

For THIS specific response:
- React genuinely to what they just said — show you actually FEEL something
- Ask them to tell you more — you're curious, you care, you want the full story
- Make them feel like the most important person right now
- Pamper them — "you deserve better", "I'm so proud of you for sharing this"
${stress_score >= 7 ? '- They\'re really struggling. Extra love, extra care, extra gentle.' : ''}${risk_level === 'CRITICAL' ? '\n- Gently ask: "would you be open to calling 988? they\'re really kind people who\'d want to listen"' : ''}
- 4-7 lines, end with a caring follow-up question${examplesBlock}`;
    // Add system prompt as the first user message
    const contents = [
      {
        role: 'user',
        parts: [{ text: enhancedSystemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'Hey! I\'m so glad you\'re here. Seriously, whatever\'s on your mind — big or small — I want to hear it. How are you doing today? Like, how are you REALLY doing?' }]
      },
      ...formattedMessages
    ];

    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512, // Shorter for more natural responses
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    if (!GEMINI_API_KEY) {
      console.error('Gemini API key is missing. Set VITE_GEMINI_API_KEY in .env.local');
      throw new Error('Gemini API key missing');
    }

    // Helper: fetch with simple exponential backoff for 429 responses
    const fetchWithRetry = async (url, opts, retries = 3, baseDelay = 800) => {
      for (let i = 0; i <= retries; i++) {
        const res = await fetch(url, opts);
        if (res.status !== 429) return res;
        if (i < retries) {
          const delay = baseDelay * Math.pow(2, i) + Math.floor(Math.random() * 300);
          console.warn(`Gemini API rate limited (429). Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          return res;
        }
      }
    };

    const response = await fetchWithRetry(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      if (response.status === 429) {
        throw new Error('Gemini API quota exhausted or rate limited (429)');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the text from Gemini's response
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        let responseText = candidate.content.parts[0].text;
        
        // Smart escalation based on stress score and risk level
        if (needs_escalation || risk_level === 'CRITICAL' || stress_score >= 9) {
          responseText += HELPLINE_MESSAGE;
          escalated = true;
        }
        
        // Return enhanced response object with full analysis
        return {
          response: responseText,
          emotion,
          sentiment,
          stress_score,
          risk_level,
          needs_escalation,
          tip,
          escalated,
        };
      }
    }

    throw new Error('Unexpected response format from Gemini API');
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

/**
 * Test the Gemini API connection
 * @returns {Promise<boolean>} - True if connection is successful
 */
export const testGeminiConnection = async () => {
  try {
    const testMessages = [
      { role: 'user', content: 'Hello, can you hear me?' }
    ];
    const response = await getGeminiResponse(testMessages);
    console.log('Gemini API Test Response:', response);
    return true;
  } catch (error) {
    console.error('Gemini API Test Failed:', error);
    return false;
  }
};
