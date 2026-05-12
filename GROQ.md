# GROQ.md

This file provides guidance when working with code in this repository.

## Project Overview

Full-stack healthcare application for health tracking and AI-powered consultations. Built with Node.js/Express backend and a Vite + Alpine.js + Tailwind CSS frontend. AI is powered by **Groq** using the `groq-sdk` package.

## Commands

### Backend (`Backend/`)
```bash
npm run dev          # Start dev server with nodemon (port 8000)
```
No build, test, or lint scripts are configured for the backend.

### Frontend (`Frontend/`)
```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Architecture

### Backend (`Backend/src/`)

**Stack**: Express 5 + MongoDB (Mongoose) + JWT auth + Cloudinary file uploads + Groq AI

**Structure**: Model-Controller-Route pattern
- `models/` — Mongoose schemas with business logic methods, pre/post hooks, and static query helpers
- `controllers/` — Request handlers (`user.controller.js`, `consult.consultation.js`)
- `routes/` — Express route definitions (`userRoutes.js`, `consultRoutes.js`)
- `middlewares/` — Multer (memory storage) for file uploads, `auth.middleware.js` for JWT verification
- `utils/` — `asyncHandler` (wraps async routes), `ApiError`/`ApiResponse` (standardized error/response classes), `cloudinary.js` (upload helper)
- `services/` — `aiService.js` (Groq AI integration), `buildAIPrompt.js` (prompt builders)
- `db/` — MongoDB connection setup

**Entry points**: `server.js` loads env and connects to MongoDB, `app.js` configures Express middleware and mounts routes.

**Routes mounted**:
- `/api/v1/users` — user registration, login, profile, password
- `/api/v1/consultations` — create, message, history, archive, complete, rate

**Two core models**:
- **User** — Patient/doctor/admin roles, health data (blood group, allergies, medications), daily activity tracking (steps, water intake), notification preferences, mood check-ins. Auto-hashes password and calculates age from DOB via pre-save hooks.
- **Consultation** — Symptom tracking, AI chat history, diagnosis, prescriptions, follow-ups, severity/urgency auto-detection. Has static methods for analytics (getUserStats, getCommonSymptoms).

**Auth flow**: JWT-based with access and refresh tokens generated from User model methods. `verifyJWT` middleware protects consultation routes.

### AI Integration (`Backend/src/services/aiService.js`)

**Provider**: Groq (`groq-sdk`)
**Default model**: `llama-3.1-8b-instant`
**Vision model**: `meta-llama/llama-4-scout-17b-16e-instruct` (used for symptom image analysis)
**API key env var**: `GROQ_API_KEY`

**Exported functions**:
- `getGroqResponse(messages, options)` — single call, returns text
- `getGroqResponseWithRetry(messages, maxRetries, options)` — retries up to 3x with exponential backoff
- `getGroqResponseWithSystem(systemPrompt, userMessage, options)` — passes system prompt as `{ role: 'system' }` message
- `getGroqResponseWithTimeout(messages, timeoutMs, options)` — races against a timeout
- `streamGroqResponse(messages, onChunk)` — streams response chunks via callback
- `analyzeImage(imageBuffer)` — vision model for medical symptom images
- `checkAIServiceHealth()` — health check ping
- `batchGroqRequests(requestsArray)` — sequential batch processing
- `buildConversationHistory(consultation)` — maps chatHistory to Groq message format
- `buildSystemContext()` — returns the medical AI system prompt
- `validateMedicalResponse(response)` — checks for unsafe/emergency patterns
- `formatAIResponse(response)` — cleans up whitespace
- `estimateTokens(text)` — rough token estimate (chars / 4)
- `logAIInteraction(userId, prompt, response, metadata)` — logs interaction summary
- `sanitizeForLogging(text)` — redacts SSN, email, long numbers

**Groq API format** (OpenAI-compatible):
```js
groq.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '...' }],
  temperature: 0.7
})
// Response: response.choices[0].message.content
```

**Streaming format**:
```js
groq.chat.completions.create({ ..., stream: true })
// chunk.choices[0]?.delta?.content
```

### Frontend (`Frontend/`)

**Stack**: Vite 7 + Alpine.js + Tailwind CSS (vanilla JS pages, no framework)
**Vite proxy**: `/api` → `http://localhost:8000`

**Pages**: Home, Login, Register, Dashboard, Profile, Settings, Consultation (`Frontend/*.html` + `Frontend/js/pages/*.js`)
**Auth**: JWT token stored in `localStorage` under key `token`
**Theme**: Dark/light mode via `dark` class on `document.documentElement`, persisted in `localStorage` under key `theme`

## Environment

Backend requires a `.env` file in `Backend/` with:
- `PORT`, `MONGODB_URI`, `CORS_ORIGIN`
- `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`
- `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Known Issues

- Cloudinary credentials in `.env` appear to be placeholders — image uploads will fail until replaced with real values
- No test framework is set up in either backend or frontend
