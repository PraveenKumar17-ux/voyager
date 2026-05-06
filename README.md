# Voyager

AI travel planner with an Express backend and Gemini-powered itinerary generation.

## Local run

1. Copy `.env.example` to `.env`
2. Set your real `GEMINI_API_KEY`
3. Run:

```cmd
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Render

This project is ready for Render as a Node web service.

### Option 1: `render.yaml`

1. Push this folder to GitHub.
2. In Render, create a new Web Service from the repo.
3. Render will detect `render.yaml`.
4. Set the secret environment variable:

`GEMINI_API_KEY`

### Option 2: Manual Render setup

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Environment variables:

- `GEMINI_API_KEY` = your real Gemini API key
- `GEMINI_MODELS` = `gemini-3-flash-preview,gemini-2.5-flash`
- `GEMINI_TIMEOUT_MS` = `12000`

## Notes

- `PORT` is provided automatically by Render.
- `.env` is ignored by git, so your local key will not be pushed.
- If Gemini is slow or temporarily unavailable, the backend falls back to a sample itinerary instead of failing the request.
