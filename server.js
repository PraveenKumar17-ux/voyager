require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = parseModelList(
  process.env.GEMINI_MODELS || 'gemini-2.5-flash'
);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 12000;

// ✅ Only one genAI declaration using environment variable
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(GEMINI_API_KEY)
  });
});

app.post('/generate', async (req, res) => {
  try {
    const payload = normalizeTripRequest(req.body);

    if (!payload.destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    if (!payload.days) {
      return res.status(400).json({ error: 'Trip duration is required' });
    }

    if (!genAI) {
      return res.json(buildMockItinerary(payload));
    }

    const { text } = await generateWithFallback(payload);

    try {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (error) {
      console.error('INVALID JSON FROM GEMINI:');
      console.error(text);
      return res.json(
        buildMockItinerary(payload, 'Gemini returned an invalid response, so a fallback itinerary was generated.')
      );
    }
  } catch (error) {
    console.error('GEMINI ERROR:', error);
    return res.json(
      buildMockItinerary(payloadFromError(req.body), `Gemini is temporarily unavailable (${error.status || 'request failed'}), so a fallback itinerary was generated.`)
    );
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function normalizeTripRequest(body = {}) {
  const rawDays = Number(body.days);

  return {
    destination: String(body.destination || '').trim(),
    fromCity: String(body.fromCity || '').trim(),
    days: Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 0,
    budget: String(body.budget || '').trim(),
    interests: String(body.interests || 'General sightseeing').trim(),
    accommodation: String(body.accommodation || '').trim(),
    pace: String(body.pace || '').trim(),
    travellers: String(body.travellers || '1').trim(),
    specialRequests: String(body.specialRequests || '').trim()
  };
}

function buildPrompt(payload) {
  return `
Plan a ${payload.days}-day trip to ${payload.destination} for ${payload.travellers} traveller(s).
Departure city: ${payload.fromCity || 'Not specified'}
Budget: Rs ${payload.budget || 'Flexible'}
Interests: ${payload.interests}
Accommodation preference: ${payload.accommodation || 'Flexible'}
Travel pace: ${payload.pace || 'Balanced'}
Special requests: ${payload.specialRequests || 'None'}

Return ONLY valid JSON in this shape:
{
  "title": "",
  "summary": "",
  "estimatedCosts": {
    "flight": "",
    "hotel": "",
    "transport": "",
    "total": ""
  },
  "days": [
    {
      "day": 1,
      "title": "",
      "theme": "",
      "activities": [],
      "meals": {
        "breakfast": "",
        "lunch": "",
        "dinner": ""
      },
      "tips": ""
    }
  ],
  "packingList": [],
  "importantNotes": []
}
  `.trim();
}

function buildMockItinerary(payload, note) {
  const dayCount = Math.min(Math.max(payload.days, 1), 14);
  const budgetLabel = payload.budget || 'Flexible';
  const activities = payload.interests
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    title: `${dayCount} Day ${payload.destination} Escape`,
    summary: `Sample itinerary for ${payload.destination} generated because no Gemini API key is configured on the server yet.`,
    estimatedCosts: {
      flight: payload.fromCity ? `Check fares from ${payload.fromCity}` : 'Check outbound fares',
      hotel: `${budgetLabel} hotel plan`,
      transport: 'Local cab, metro, and transfer estimate',
      total: `Planned around budget tier ${budgetLabel}`
    },
    days: Array.from({ length: dayCount }, (_value, index) => ({
      day: index + 1,
      title: index === 0 ? `Arrival in ${payload.destination}` : `Explore ${payload.destination}`,
      theme: activities[index % (activities.length || 1)] || 'Flexible exploration',
      activities: buildMockActivities(payload, index),
      meals: {
        breakfast: 'Hotel breakfast or local cafe',
        lunch: 'Popular regional restaurant',
        dinner: 'Relaxed dinner near your stay'
      },
      tips: payload.pace
        ? `Keep the pace ${payload.pace.toLowerCase()} and leave buffer time for transfers.`
        : 'Keep one flexible hour in the afternoon for local discoveries.'
    })),
    packingList: [
      'Government ID / passport',
      'Phone charger and power bank',
      'Comfortable walking shoes',
      'Weather-appropriate clothing'
    ],
    importantNotes: [
      note || 'Replace this sample itinerary by setting GEMINI_API_KEY for live AI planning.',
      payload.specialRequests || 'Double-check attraction timings before booking.'
    ]
  };
}

function buildMockActivities(payload, index) {
  const base = [
    `Visit a signature attraction in ${payload.destination}`,
    'Keep time for a local food stop',
    'Add an evening walk or scenic viewpoint'
  ];

  if (index === 0) {
    return [
      `Arrive from ${payload.fromCity || 'your departure city'} and check in`,
      `Settle into your ${payload.accommodation || 'preferred'} stay`,
      ...base.slice(1)
    ];
  }

  return base;
}

function payloadFromError(body) {
  return normalizeTripRequest(body);
}

async function generateWithFallback(payload) {
  let lastError;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await promiseWithTimeout(
        model.generateContent(buildPrompt(payload)),
        GEMINI_TIMEOUT_MS,
        `Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`
      );
      let text = result.response.text();
      text = text.replace(/```json|```/g, '').trim();

      return { modelName, text };
    } catch (error) {
      lastError = error;
      console.error(`GEMINI ERROR [${modelName}]:`, error);
    }
  }

  throw lastError || new Error('No Gemini models configured');
}

function parseModelList(value) {
  return String(value || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

function promiseWithTimeout(promise, timeoutMs, message) {
  let timer;

  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]);
}
