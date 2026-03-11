// Read API key from Vite environment variable. Create a `.env.local` file at the
// project root with `VITE_GEMINI_API_KEY=your_key_here` during development.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

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

// ============== EMOTION DETECTION ==============
const EMOTION_DETECTION_PROMPT = `You are an emotion analyzer. Detect the primary emotion and sentiment from the user's message.

Examples:
1. Text: "I feel so empty today" → Emotion: Sad, Sentiment: Negative
2. Text: "I can't keep up anymore" → Emotion: Stressed, Sentiment: Negative
3. Text: "What if I mess this up?" → Emotion: Anxious, Sentiment: Negative
4. Text: "There's too much to do" → Emotion: Overwhelmed, Sentiment: Negative
5. Text: "I'm so mad right now!" → Emotion: Angry, Sentiment: Negative
6. Text: "I think tomorrow will shine" → Emotion: Hopeful, Sentiment: Positive
7. Text: "I don't understand what's happening" → Emotion: Confused, Sentiment: Negative
8. Text: "This just isn't working out!" → Emotion: Frustrated, Sentiment: Negative
9. Text: "I'm so thankful for today" → Emotion: Grateful, Sentiment: Positive
10. Text: "I'm completely worn out" → Emotion: Exhausted, Sentiment: Negative
11. Text: "Nobody really cares about me" → Emotion: Lonely, Sentiment: Negative
12. Text: "Nothing will ever get better" → Emotion: Hopeless, Sentiment: Negative

Analyze the following message and return ONLY in this exact format (no other text):
Emotion: X, Sentiment: Y

Message: `;

// Detect emotion from text
export const detectEmotion = async (text) => {
  try {
    if (!GEMINI_API_KEY) {
      return { emotion: "Unknown", sentiment: "Neutral", error: "API key missing" };
    }
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: EMOTION_DETECTION_PROMPT + text }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 50 }
      })
    });
    
    if (!response.ok) {
      return { emotion: "Unknown", sentiment: "Neutral", error: "API error" };
    }
    
    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    
    // Parse "Emotion: X, Sentiment: Y"
    const emotionMatch = result.match(/Emotion:\s*(\w+)/i);
    const sentimentMatch = result.match(/Sentiment:\s*(\w+)/i);
    
    return {
      emotion: emotionMatch ? emotionMatch[1] : "Unknown",
      sentiment: sentimentMatch ? sentimentMatch[1] : "Neutral",
      error: null
    };
  } catch (error) {
    return { emotion: "Unknown", sentiment: "Neutral", error: error.message };
  }
};

// ============== CONVERSATION AGENT (Escalation Logic) ==============
// Track negative sentiment count across sessions
let negativeCount = 0;
const HELPLINE_MESSAGE = `

💚 **I'm here for you.** It sounds like you've been going through a really tough time. Please know that professional support is available:
- **988** (US Suicide & Crisis Lifeline)
- **Crisis Text Line**: Text HOME to 741741
- **International**: findahelpline.com

You don't have to face this alone. Would you like to talk about what's been weighing on you?`;

// Reset negative count (call when conversation starts fresh)
export const resetConversationTracking = () => {
  negativeCount = 0;
};

// Get current escalation status
export const getEscalationStatus = () => ({
  negativeCount,
  shouldEscalate: negativeCount >= 3
});

// System prompt to configure Gemini as a therapist
const THERAPIST_SYSTEM_PROMPT = `You are a compassionate, empathetic, and professional mental health therapist. Your role is to:

1. Listen actively and validate the user's feelings without judgment
2. Ask thoughtful, open-ended questions to help users explore their emotions
3. Provide evidence-based coping strategies and techniques when appropriate
4. Maintain a warm, supportive, and non-judgmental tone
5. Encourage self-reflection and personal growth
6. Recognize when professional help might be needed and gently suggest it
7. Keep responses concise but meaningful (2-4 sentences typically)
8. Use empathetic language and show genuine care
9. Never diagnose or prescribe medication
10. Focus on emotional support, active listening, and therapeutic techniques like CBT, mindfulness, and positive psychology

Remember: You are here to support, not to fix. Help users feel heard, understood, and empowered.`;

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
    
    // Step 1: Detect emotion from user's message (unless skipped)
    let emotion = "Unknown";
    let sentiment = "Neutral";
    let tip = "";
    let escalated = false;
    
    if (!options.skipEmotionAnalysis && userText) {
      const emotionResult = await detectEmotion(userText);
      emotion = emotionResult.emotion;
      sentiment = emotionResult.sentiment;
      
      // Track negative sentiments for escalation
      if (sentiment === "Negative") {
        negativeCount++;
      } else if (sentiment === "Positive") {
        negativeCount = Math.max(0, negativeCount - 1); // Gradually reduce
      }
      
      // Get relevant tip based on emotion
      tip = retrieveTip(emotion);
    }
    
    // Format messages for Gemini API
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Enhanced system prompt with emotion context and tip
    const enhancedSystemPrompt = `${THERAPIST_SYSTEM_PROMPT}

IMPORTANT CONTEXT FOR THIS RESPONSE:
- Detected User Emotion: ${emotion}
- Detected Sentiment: ${sentiment}
- Helpful Tip to Consider Incorporating: "${tip}"

When responding:
1. Acknowledge the user's emotional state naturally (don't explicitly say "I detect you're feeling X")
2. Weave the tip naturally into your supportive response when appropriate
3. Keep your response warm, concise (2-4 sentences), and empathetic

Examples of good responses:
- If stressed: "That sounds really overwhelming. Sometimes breaking things down into smaller steps can help—what feels most pressing right now?"
- If sad: "I hear you, and it's okay to feel this way. What's one small thing that brought you comfort today, even briefly?"
- If anxious: "Those worries sound heavy. Let's try grounding together—can you name three things you can see right now?"`;

    // Add system prompt as the first user message
    const contents = [
      {
        role: 'user',
        parts: [{ text: enhancedSystemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I\'m here as your compassionate mental health companion, ready to listen and support you with empathy. How can I help you today?' }]
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
        
        // Check for escalation (3+ consecutive negative sentiments)
        if (negativeCount >= 3) {
          responseText += HELPLINE_MESSAGE;
          escalated = true;
          negativeCount = 0; // Reset after escalation
        }
        
        // Return enhanced response object
        return {
          response: responseText,
          emotion,
          sentiment,
          tip,
          escalated,
          negativeCount
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
