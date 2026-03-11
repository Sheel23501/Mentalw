# TruCare 3

Lightweight React + Vite frontend with AI/chat, emotion detection, and realtime features (Twilio / WebRTC). This repo contains the single-page frontend app plus a small Node server used for local development and integrations.

## Key Features
- AI-powered chat assistant (Gemini/OpenAI integration).
- Emotion detection model and utilities (in `cv/`).
- Real-time video/audio via WebRTC and Twilio helpers.
- Firebase auth and Firestore integration for persistence.

## Quick Start

Requirements

- Node.js 18+ and npm
- Python 3.8+ (only if you use `voice_api/` or `cv/` scripts)

Install

```bash
npm install
```

Run (development)

```bash
npm run dev
# or
node server.js   # starts the simple Node integration server if needed
```

Build

```bash
npm run build
```

Environment

Create a `.env` (or use your platform) with keys required by services used in `src/config/firebase.js`, `src/services/twilio.js`, and any OpenAI/Gemini keys stored in `src/chatbot/openai.js` or `src/services/gemini.js`.

Common env names (examples)

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `TWILIO_API_KEY`
- `OPENAI_API_KEY` or `GEMINI_API_KEY`

## Project Structure (high level)

- `src/` — React app (Vite)
	- `chatbot/` — chat UI and OpenAI/Gemini client
	- `components/` — UI components and dashboard
	- `config/` — `firebase.js`
	- `services/` — wrappers for Twilio, Firestore, WebRTC, etc.
- `cv/` — computer-vision model and scripts
- `voice_api/` — Python voice assistant / API examples
- `public/` — static public assets
- `server.js` — small Node helper server used during development

Where to look

- App entry: `src/main.jsx` and `src/App.jsx`.
- Chat UI: `src/chatbot/ChatBot.jsx` and `src/chatbot/openai.js`.
- Firebase config: `src/config/firebase.js`.
- WebRTC + Twilio helpers: `src/services/webrtc.js` and `src/services/twilio.js`.

## Notes & Tips

- This repo uses Vite + React + Tailwind CSS (see `vite.config.js` and `tailwind.config.js`).
- If you run into auth issues, check `src/contexts/AuthContext.jsx` and your Firebase project settings.
- The `cv/face_model.h5` is a pre-trained model; do not commit heavy model updates to git.

## Contributing

Open issues or pull requests with clear descriptions. Include reproduction steps for bugs and environment settings if relevant.

## License

Specify your project's license here.

