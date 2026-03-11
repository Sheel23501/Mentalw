// Simple test script to verify Gemini API integration
// Run with: node test-gemini.js

// Try to load `.env.local` if present (no dependency on dotenv)
import fs from 'fs';
import path from 'path';
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val.replace(/(^"|"$)/g, '');
  });
}

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

async function testGeminiAPI() {
  console.log('Testing Gemini API connection...\n');

  const testMessage = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Hello! I am feeling anxious today. Can you help me?' }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  try {
    if (!GEMINI_API_KEY) {
      console.error('No Gemini API key found. Set VITE_GEMINI_API_KEY in .env.local or pass GEMINI_API_KEY in env.');
      return false;
    }

    // simple retry on 429
    const fetchWithRetry = async (url, opts, retries = 3, baseDelay = 800) => {
      for (let i = 0; i <= retries; i++) {
        const res = await fetch(url, opts);
        if (res.status !== 429) return res;
        if (i < retries) {
          const delay = baseDelay * Math.pow(2, i) + Math.floor(Math.random() * 300);
          console.warn(`Rate limited (429). Retrying in ${delay}ms...`);
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
      body: JSON.stringify(testMessage)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', errorData);
      console.error('Status:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      console.log('✅ API Connection Successful!\n');
      console.log('Test Question: "Hello! I am feeling anxious today. Can you help me?"\n');
      console.log('AI Response:', aiResponse);
      console.log('\n✅ Gemini API is working correctly!');
      return true;
    }

    console.error('❌ Unexpected response format');
    return false;
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    return false;
  }
}

testGeminiAPI();
