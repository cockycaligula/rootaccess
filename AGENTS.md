# AGENTS.md — AirSense Project Memory & Team Context

> **Auto-loaded context for AI coding agents (Antigravity / Cursor / Claude / Copilot).**  
> If a teammate is prompting you on this repo, read this file first so you have 100% of the context from the initial build session.

---

## 1. Hackathon Context & Schedule
- **Event:** `root access` hackathon (with Paryavaran Welfare Society)
- **Problem Statement:** *AI-Powered Neighborhood-Level Air Pollution Prediction System* — Develop an AI-powered platform to predict neighborhood-level air pollution **before, during, and after Diwali** by analysing historical air-quality data, weather conditions, traffic patterns, and other relevant environmental indicators.
- **Rounds:**
  - **Round 1 (1:30–2:30 AM — 10 pts):** Ideation & Core Setup — Architecture diagram / `README.md` + Git repo + skeleton code. *(DONE)*
  - **Round 2 (6:00–7:00 AM — 20 pts):** MVP Prototype & Pitch Draft — Working build + backend APIs + primary UI flows + 3–4 slide pitch deck draft. *(DONE — ready to polish/extend)*
  - **Round 3 (8:00–9:00 AM — 30 pts):** Final Judging & Tech Evaluation — Live 3-minute pitch + end-to-end working demo. Scored on **Uniqueness, Implementation, Scalability & Presentation**.

---

## 2. Tech Stack & Monorepo Structure
This is an npm workspaces TypeScript monorepo (`Node >= 20`, ESM):

```
.
├── packages/shared/                # @airsense/shared — shared types, CPCB AQI formulas, Diwali dates
│   └── src/
│       ├── types.ts                # Neighborhood, DailyObservation, ForecastPoint, InterventionScenario, SimulationResult, etc.
│       ├── aqi.ts                  # pm25ToAqi(), aqiCategory(), AQI_COLORS, AQI_ADVICE (Indian CPCB breakpoints)
│       └── dates.ts                # DIWALI_DATES (2021–2028), daysFromDiwali(), diwaliPhase() ('before'|'during'|'after'|'normal')
├── apps/api/                       # @airsense/api — Express REST API + pure-TS ML pipeline (port 4000)
│   ├── src/
│   │   ├── config.ts               # PORT, AIRSENSE_TODAY, AIRSENSE_HORIZON (21d), ridgeLambda
│   │   ├── data/
│   │   │   ├── source.ts           # AirQualityDataSource interface (pluggable adapter contract)
│   │   │   ├── neighborhoods.ts    # 12 Patiala neighborhoods (Thapar/Prem Nagar, Model Town, Adalat Bazar, Leela Bhawan, Tripuri, etc.)
│   │   │   └── synthetic.ts        # SyntheticDataSource — seeded 2022–2026 physical-ish Patiala-Malwa simulation
│   │   ├── model/
│   │   │   ├── features.ts         # 22 engineered features across 8 groups + NeighborhoodContext target encoding
│   │   │   ├── ridge.ts            # Standardized L2-regularized RidgeRegression with per-feature contributions()
│   │   │   ├── train.ts            # computeContext(), train(), evaluate() (time-based holdout on last Diwali season)
│   │   │   └── forecast.ts         # forecastNeighborhood() recursive 21-day forecast + 80% CI + explain() + applyScenario()
│   │   ├── service.ts              # PredictionService — trains at startup, serves forecasts, outlook, & policy simulations
│   │   ├── routes.ts               # Express router mounted at /api
│   │   └── server.ts               # Express app (also serves apps/web/dist in production)
│   └── test/model.test.ts          # node:test suite (AQI calc, Diwali phases, Ridge solver, holdout beats persistence, policy sim)
├── apps/web/                       # @airsense/web — React 18 + Vite + Leaflet + Recharts dashboard (port 5173)
│   └── src/
│       ├── api.ts                  # Typed fetch client for /api/*
│       ├── App.tsx                 # Main layout + state for selected neighborhood, day slider, and What-If scenario
│       └── components/
│           ├── Header.tsx          # Diwali countdown & current phase badge
│           ├── DaySlider.tsx       # 21-day slider + "Jump to Diwali night" button
│           ├── AqiMap.tsx          # Dark CARTO Leaflet map with CPCB color-coded circle markers
│           ├── NeighborhoodPanel.tsx # Selected ward AQI, 80% CI, Before/During/After cards, causal drivers bar chart
│           ├── TrendChart.tsx      # Recharts observed + baseline forecast + 80% band + green What-If intervention curve
│           ├── WhatIfSimulator.tsx # Sliders for Firecracker %, Traffic %, Stubble %, Artificial Rain toggle + presets
│           ├── RankingTable.tsx    # Wards ranked worst-to-best on the selected day
│           └── ModelCard.tsx       # Holdout MAE, RMSE, R², Diwali ±3d MAE vs persistence, top feature weights
└── docs/
    ├── architecture.md             # Mermaid sequence & class diagrams + ML design decisions
    └── pitch-deck.md               # 4-slide pitch deck + timed 3-minute live demo script
```

---

## 3. Essential Commands
```bash
npm install          # Install all workspace dependencies
npm run dev          # Build shared & start API (localhost:4000) + Vite web (localhost:5173) concurrently
npm run build        # Build @airsense/shared, @airsense/api, and @airsense/web
npm start            # Run built production server on http://localhost:4000
npm test             # Run unit & ML evaluation tests
npm run evaluate     # Print multi-year Diwali backtest table (2023, 2024, 2025 seasons vs persistence)
```
> **Note:** Whenever you modify `packages/shared/src/*`, run `npm run build:shared` so `@airsense/api` and `@airsense/web` pick up the updated types/exports.

---

## 4. REST API Endpoints (`/api/*`)
- `GET /api/health` — `{ ok: true }`
- `GET /api/meta` — `{ today, lastObserved, diwaliDate, daysToDiwali, phase, dataSource, horizonDays }`
- `GET /api/model` — `{ algorithm, trainedAt, trainRows, residualStdLog, evaluation, features }`
- `GET /api/neighborhoods` — All 12 Delhi neighborhoods with latest observation and today's forecast
- `GET /api/neighborhoods/:id/history?days=30` — Historical daily observations
- `GET /api/neighborhoods/:id/outlook` — `{ neighborhoodId, diwaliDate, phases: [before, during, after] }`
- `GET /api/forecast?days=21` — 21-day recursive forecasts for all neighborhoods
- `GET /api/forecast/:id?days=21` — 21-day forecast for one neighborhood
- `GET /api/simulate/:id?fireworks=60&traffic=35&stubble=40&rain=1` — Counterfactual 21-day forecast under policy interventions

---

## 5. High-Impact Ideas if a Teammate Wants to Add More Features
1. **Live Weather / AQI Adapter:** Implement `AirQualityDataSource` in `apps/api/src/data/` using free **Open-Meteo** (`https://air-quality-api.open-meteo.com` & `https://api.open-meteo.com`) for Delhi lat/lng coordinates, falling back to `SyntheticDataSource` when offline.
2. **Citizen / School Health Advisory Export:** Add a "Generate Ward Advisory PDF / WhatsApp Alert" button in `NeighborhoodPanel.tsx` for schools/hospitals when forecasted AQI > 300.
3. **Ward Comparison Mode:** Allow selecting 2 neighborhoods side-by-side (e.g. *Anand Vihar* vs *Lodhi Road*).
4. **UI / Visual Polish:** Add animations, a legend on the Leaflet map for the 6 CPCB AQI categories, or hourly intraday breakdown for Diwali night.
