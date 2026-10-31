# 🪔 AirSense: Neighborhood-Level Diwali Air Quality Prediction

> **root access hackathon: Problem statement:** *AI-Powered Neighborhood-Level Air Pollution Prediction System.*
> Predict neighborhood-level air pollution **before, during and after Diwali** using historical air-quality data,
> weather conditions, traffic patterns and other environmental indicators.

AirSense forecasts daily **PM2.5 and Indian AQI for each Patiala neighborhood up to 21 days ahead**. It shows
a **before / during / after Diwali outlook** and explains **why** each day's air will be bad (fireworks,
stagnant air, Malwa paddy-stubble smoke, traffic and so on).

![stack](https://img.shields.io/badge/TypeScript-5-blue) ![node](https://img.shields.io/badge/Node-22-green) ![react](https://img.shields.io/badge/React-18-61dafb)

---

## ✨ Features

| | |
|---|---|
| 🗺️ **Neighborhood map** | Interactive Leaflet map of 12 Patiala neighborhoods (Thapar/Prem Nagar, Model Town, Adalat Bazar, Leela Bhawan, Urban Estate, Tripuri, Focal Point, Baradari Gardens, etc.), color-coded by the CPCB AQI scale. A day slider and a *Jump to Diwali night* button let you move through the forecast. |
| 📈 **Forecast + uncertainty** | 30 days of observed AQI plus a 21-day forecast with an 80% prediction band that widens with lead time. |
| 🪔 **Diwali phase outlook** | Average and peak AQI for **Before (−7…−1d)**, **During (Diwali + next day)** and **After (+2…+7d)**. It mixes observed and forecast days. |
| 🧠 **Explainable AI** | Each prediction is broken down into drivers such as *Diwali fireworks +180%*, *Low wind/mixing +40%* and *Stubble smoke +35%*. |
| 🏆 **Ranking** | Ranks neighborhoods from worst to best for any day, to help plan targeted interventions (water sprinkling, traffic diversion, advisories). |
| 🧪 **What-if policy simulator** | Interactive sliders for **firecracker reduction %**, **traffic curbs (Odd-Even)**, **upwind stubble control**, and **artificial rain / misting**, plotting the counterfactual 21-day AQI curve in real time. |
| ✅ **Honest evaluation** | A time-based holdout on the last full Diwali season, compared against a persistence baseline. This includes a separate score for the Diwali ±3-day window. |
| 🩺 **Health advice** | CPCB category-specific guidance for every forecast. |

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph Sources["Data sources (pluggable adapters)"]
    AQ["Air quality<br/>CPCB / OpenAQ<br/>(PM2.5 per station)"]
    WX["Weather<br/>Open-Meteo / IMD<br/>(wind, mixing height, RH, rain)"]
    TR["Traffic<br/>TomTom / Google<br/>(congestion index)"]
    FR["Farm fires<br/>NASA FIRMS<br/>(fire counts)"]
    CAL["Festival calendar<br/>(Diwali dates)"]
  end

  subgraph API["apps/api - Node + Express + TypeScript"]
    DS["AirQualityDataSource<br/>interface"]
    FE["Feature engineering<br/>lags, stagnation, fires,<br/>Diwali calendar, local context"]
    ML["Ridge regression<br/>on log PM2.5"]
    EV["Time-based evaluation<br/>vs persistence baseline"]
    FC["Recursive 21-day forecaster<br/>+ prediction intervals<br/>+ driver attribution"]
    REST["REST API /api/*"]
  end

  subgraph WEB["apps/web - React + Vite + TypeScript"]
    MAP["Leaflet AQI map"]
    CH["Recharts trend + band"]
    OUT["Before / During / After cards"]
    XAI["Drivers + model metrics"]
  end

  AQ & WX & TR & FR & CAL --> DS --> FE --> ML --> FC --> REST
  ML --> EV --> REST
  REST --> MAP & CH & OUT & XAI
  SH["packages/shared<br/>types, AQI calc, Diwali calendar"] -.-> API & WEB
```

More detail on the model and data flow is in [docs/architecture.md](docs/architecture.md), and the 4-slide pitch deck + 3-minute demo flow is in [docs/pitch-deck.md](docs/pitch-deck.md).

## 🧠 How the model works

1. **Target:** next-day `log(PM2.5)` per neighborhood. Working in log space handles the heavy-tailed Diwali spikes and gives multiplicative, explainable effects.
2. **Features (22):**
   - **Persistence:** PM2.5 yesterday, two days ago and the 7-day mean.
   - **Meteorology:** wind speed, boundary-layer mixing height, humidity, rain and temperature.
   - **Traffic:** a congestion index, including the pre-Diwali shopping surge and the Diwali-night lull.
   - **Stubble burning:** upwind fire counts, plus fires × calm-wind.
   - **Season:** day-of-year sine and cosine.
   - **Diwali calendar:** pre-festive week, eve, night, day after and +2 days.
   - **Neighborhood context, learned from history:** baseline pollution level and the **historical Diwali uplift** for that neighborhood. Some localities burst far more crackers than others.
   - **Interactions:** Diwali night × local uplift and Diwali night × low wind.
3. **Algorithm:** ridge regression on standardised features, implemented from scratch in TypeScript with no ML dependencies. It's fast (trains in under 1 s) and fully interpretable.
4. **Forecasting:** recursive multi-day forecasting. Each predicted day feeds the next day's lag features, and weather and traffic come from forecasts. Prediction intervals come from holdout residuals and widen with lead time.
5. **Explainability:** contribution = coefficient × z-score. These are summed into 8 driver groups and reported as the % change in PM2.5 against average conditions.

## 🚀 Quick start

```bash
# Requires Node ≥ 20
npm install
npm run dev        # API → http://localhost:4000/api, dashboard → http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check & build shared + api + web
npm start          # serve API + built dashboard on http://localhost:4000
npm test           # unit + model sanity tests
npm run evaluate   # backtest every past Diwali season vs persistence
AIRSENSE_TODAY=2025-10-12 npm run dev   # replay any date (e.g. last year's Diwali)
```

## 🔌 REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/meta` | Today, the upcoming Diwali date, the countdown and the current phase |
| GET | `/api/neighborhoods` | All neighborhoods with their latest observation and today's forecast |
| GET | `/api/neighborhoods/:id/history?days=60` | Observed daily PM2.5/AQI, weather, traffic and fires |
| GET | `/api/neighborhoods/:id/outlook` | Before / during / after Diwali summary |
| GET | `/api/forecast?days=21` | Forecasts for every neighborhood |
| GET | `/api/forecast/:id` | Forecast for one neighborhood, with drivers and intervals |
| GET | `/api/simulate/:id?fireworks=60&traffic=35&stubble=40&rain=1` | Counterfactual 21-day forecast under policy interventions |
| GET | `/api/model` | Algorithm, holdout metrics and feature weights |

## 📁 Repository layout

```
.
├── apps/
│   ├── api/                 # Express API + ML pipeline
│   │   ├── src/data/        # AirQualityDataSource interface, synthetic simulator, neighborhoods
│   │   ├── src/model/       # features, ridge regression, training/evaluation, forecaster
│   │   ├── src/service.ts   # trains at startup, caches forecasts, Diwali outlook
│   │   └── test/            # node:test unit + model sanity tests
│   └── web/                 # React + Vite dashboard (Leaflet map, Recharts)
├── packages/shared/         # shared types, CPCB AQI conversion, Diwali calendar
└── docs/architecture.md
```

## 📊 Data

> [!NOTE]
> The MVP runs offline on a **seeded synthetic simulation** of Delhi NCR (2022 to today). It models seasonality,
> wind and mixing-height stagnation, rain washout, traffic (weekday effects and the festive surge), stubble-fire smoke and
> neighborhood-specific Diwali fireworks spikes. The model never sees the simulator's hidden parameters; it has to learn them.
> Real feeds plug in by implementing `AirQualityDataSource` (see `apps/api/src/data/source.ts`).

Planned real sources: **CPCB CAAQMS / OpenAQ** (PM2.5), **Open-Meteo** (historical and forecast weather, including boundary-layer height),
**NASA FIRMS** (fire counts), and **TomTom Traffic Index** (congestion).



## 👥 Team

_Add team members here._
