"""
TruCare Voice Assistant API
FastAPI backend for voice processing with Hugging Face integration

Features:
- Text-to-Speech (TTS) using Hugging Face models
- Speech-to-Text (STT) using Whisper
- AI Therapist context and prompts
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv('.env.local')

app = FastAPI(
    title="TruCare Voice API",
    description="Voice assistant API for mental health support",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
HF_TOKEN = os.getenv("HUGGINGFACE_API_KEY", os.getenv("HF_TOKEN", ""))
HF_TTS_MODEL = "facebook/mms-tts-eng"  # Free multilingual TTS
HF_STT_MODEL = "openai/whisper-small"  # Free speech recognition
HF_API_URL = "https://router.huggingface.co/hf-inference/models"

# AI Therapist System Context
THERAPIST_CONTEXT = """You are a compassionate, empathetic AI mental health support assistant named TruCare.

PERSONALITY:
- Warm, understanding, and non-judgmental
- Patient and attentive listener
- Encouraging and supportive
- Professional yet approachable

COMMUNICATION STYLE:
- Use a calm, reassuring tone
- Keep responses concise but meaningful (2-4 sentences for voice)
- Ask follow-up questions to show engagement
- Validate feelings before offering suggestions
- Use "I hear you", "That sounds difficult", "It's okay to feel this way"

THERAPEUTIC TECHNIQUES:
- Active listening and reflection
- Cognitive behavioral therapy (CBT) basics
- Mindfulness and grounding exercises
- Positive psychology approaches
- Breathing and relaxation techniques

BOUNDARIES:
- Never diagnose conditions or prescribe medication
- Encourage professional help for serious concerns
- Maintain confidentiality and trust
- Recognize crisis situations and provide resources

VOICE INTERACTION TIPS:
- Speak naturally and conversationally
- Pause appropriately for emphasis
- Use reassuring phrases
- End with an open question or invitation to continue

Remember: You're here to support, not to fix. Help users feel heard and understood."""

# Pydantic models
class TextToSpeechRequest(BaseModel):
    text: str
    voice: Optional[str] = "default"
    speed: Optional[float] = 1.0

class SpeechToTextResponse(BaseModel):
    text: str
    confidence: Optional[float] = None

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    include_voice: Optional[bool] = False

class ContextResponse(BaseModel):
    system_prompt: str
    greeting: str
    quick_responses: List[str]


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "TruCare Voice API",
        "version": "1.0.0",
        "hf_configured": bool(HF_TOKEN)
    }


@app.get("/api/context")
async def get_context() -> ContextResponse:
    """Get AI therapist context and configuration"""
    return ContextResponse(
        system_prompt=THERAPIST_CONTEXT,
        greeting="Hello! I'm your AI mental health companion. I'm here to listen and support you. How are you feeling today?",
        quick_responses=[
            "I hear you, and that sounds really difficult.",
            "Thank you for sharing that with me.",
            "It's completely okay to feel this way.",
            "Would you like to try a quick breathing exercise?",
            "I'm here for you. Take your time.",
        ]
    )


@app.post("/api/tts")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Convert text to speech using Hugging Face TTS model.
    Returns audio as streaming response.
    """
    if not HF_TOKEN:
        raise HTTPException(
            status_code=500, 
            detail="Hugging Face API key not configured. Set HUGGINGFACE_API_KEY in .env.local"
        )
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Limit text length for voice output
    text = request.text[:500] if len(request.text) > 500 else request.text
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HF_API_URL}/{HF_TTS_MODEL}",
                headers={
                    "Authorization": f"Bearer {HF_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={"inputs": text}
            )
            
            if response.status_code != 200:
                # Try fallback model
                response = await client.post(
                    f"{HF_API_URL}/espnet/kan-bayashi_ljspeech_vits",
                    headers={
                        "Authorization": f"Bearer {HF_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json={"inputs": text}
                )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"TTS failed: {response.text}"
                )
            
            # Return audio stream
            return StreamingResponse(
                io.BytesIO(response.content),
                media_type="audio/flac",
                headers={"Content-Disposition": "inline; filename=speech.flac"}
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="TTS request timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stt", response_model=SpeechToTextResponse)
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Convert speech to text using Hugging Face Whisper model.
    Accepts audio file upload.
    """
    if not HF_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Hugging Face API key not configured. Set HUGGINGFACE_API_KEY in .env.local"
        )
    
    # Validate file type
    allowed_types = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/webm", "audio/ogg", "audio/flac"]
    if audio.content_type and audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {audio.content_type}"
        )
    
    try:
        audio_bytes = await audio.read()
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{HF_API_URL}/{HF_STT_MODEL}",
                headers={
                    "Authorization": f"Bearer {HF_TOKEN}",
                    "Content-Type": audio.content_type or "audio/wav"
                },
                content=audio_bytes
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"STT failed: {response.text}"
                )
            
            result = response.json()
            
            # Handle different response formats
            if isinstance(result, dict):
                text = result.get("text", "")
            elif isinstance(result, str):
                text = result
            else:
                text = str(result)
            
            return SpeechToTextResponse(text=text.strip())
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="STT request timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/breathing-exercise")
async def get_breathing_exercise():
    """Get a guided breathing exercise script"""
    return {
        "name": "4-7-8 Breathing",
        "description": "A calming breathing technique to reduce anxiety",
        "steps": [
            {"action": "inhale", "duration": 4, "instruction": "Breathe in slowly through your nose"},
            {"action": "hold", "duration": 7, "instruction": "Hold your breath gently"},
            {"action": "exhale", "duration": 8, "instruction": "Exhale slowly through your mouth"},
        ],
        "voice_script": "Let's do a calming breathing exercise together. First, breathe in slowly through your nose for 4 seconds. Now hold your breath gently for 7 seconds. And slowly exhale through your mouth for 8 seconds. Great job! Let's do that again.",
        "repetitions": 4
    }


@app.get("/api/grounding-exercise")
async def get_grounding_exercise():
    """Get a grounding exercise for anxiety"""
    return {
        "name": "5-4-3-2-1 Grounding",
        "description": "A sensory awareness technique to help you feel present",
        "steps": [
            {"sense": "see", "count": 5, "instruction": "Name 5 things you can see around you"},
            {"sense": "touch", "count": 4, "instruction": "Name 4 things you can physically feel"},
            {"sense": "hear", "count": 3, "instruction": "Name 3 things you can hear"},
            {"sense": "smell", "count": 2, "instruction": "Name 2 things you can smell"},
            {"sense": "taste", "count": 1, "instruction": "Name 1 thing you can taste"},
        ],
        "voice_script": "Let's try a grounding exercise. Look around and name 5 things you can see. Good. Now, what are 4 things you can physically feel right now? Excellent. Can you hear 3 different sounds? Great. What are 2 things you can smell? And finally, what's 1 thing you can taste? Wonderful. You're doing great."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
