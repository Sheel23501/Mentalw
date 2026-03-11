# TruCare Voice API

FastAPI backend for voice assistant functionality.

## Features

- 🗣️ **Text-to-Speech (TTS)** - Convert AI responses to speech using Hugging Face models
- 🎤 **Speech-to-Text (STT)** - Transcribe voice input using Whisper
- 🧘 **Therapeutic Exercises** - Breathing and grounding exercises with voice scripts
- 🎭 **AI Therapist Context** - Comprehensive system prompts for mental health support

## Setup

### 1. Create Virtual Environment

```bash
cd voice_api
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Make sure your `.env.local` file in the project root has:

```env
HUGGINGFACE_API_KEY=hf_your_token_here
```

### 4. Run the Server

```bash
python main.py
# Or with uvicorn directly:
uvicorn main:app --reload --port 8000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/context` | GET | Get AI therapist context and configuration |
| `/api/tts` | POST | Convert text to speech |
| `/api/stt` | POST | Convert speech to text |
| `/api/breathing-exercise` | GET | Get guided breathing exercise |
| `/api/grounding-exercise` | GET | Get grounding exercise |

## Usage with Frontend

The frontend uses **Browser Web Speech API** by default (free, works immediately in Chrome/Edge).

The FastAPI backend is optional and provides:
- Higher quality TTS via Hugging Face
- Server-side speech processing
- Therapeutic exercise content

## Browser Voice Support

| Browser | TTS | STT |
|---------|-----|-----|
| Chrome | ✅ | ✅ |
| Edge | ✅ | ✅ |
| Safari | ✅ | ⚠️ Limited |
| Firefox | ✅ | ❌ |

## Development

```bash
# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# API docs available at:
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```
