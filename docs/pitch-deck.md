# 🪔 AirSense — 4-Slide Pitch Deck & 3-Minute Live Demo Script

> **Hackathon:** root access · Paryavaran Welfare Society  
> **Problem Statement:** AI-Powered Neighborhood-Level Air Pollution Prediction System (Before, During, and After Diwali)

---

## Slide 1 — The Problem: Why Existing AQI Tools Fail During Diwali

- **City-wide averages hide hyper-local danger:** On Diwali night, Punjabi Bagh or Anand Vihar can exceed **750+ µg/m³ PM2.5**, while Lodhi Road sits at half that level. Citizens and hospitals need **neighborhood-level** forecasts, not a single city number.
- **Black-box forecasts break on festival spikes:** Standard time-series models assume tomorrow looks like today (*persistence*), completely missing both the sudden **Diwali fireworks surge** and how **low boundary-layer mixing height + calm winds** trap that smoke for 5–7 days afterward.
- **No actionable "Why" or "What-If":** Authorities enforcing GRAP-IV, Odd-Even, or smog-gun deployments have no way to test how much a policy will actually reduce AQI in a specific ward *before* Diwali arrives.

---

## Slide 2 — Our Solution: AirSense

- **21-Day Neighborhood-Level Forecast:** Predicts daily **PM2.5 and CPCB AQI** with **80% prediction intervals** across 12 Delhi neighborhoods covering the full **Before (−7d) · During (Diwali +1d) · After (+7d)** lifecycle.
- **Explainable Causal Drivers:** Every single day's forecast is decomposed into human-readable drivers (*Diwali fireworks & festivities*, *Wind & boundary-layer stagnation*, *Upwind farm-fire smoke*, *Festive traffic load*, *Moisture/washout*).
- **Interactive What-If Policy Simulator:** Authorities and citizens can dial **Firecracker reduction %**, **Traffic curbs (Odd-Even)**, **Upwind stubble control**, and **Artificial rain / misting** to see the counterfactual 21-day AQI curve update in real time.

---

## Slide 3 — System Architecture & AI Validation

- **22-Feature Physics-Informed ML Pipeline (`@airsense/api`):**
  - Predicts `log(PM2.5)` using L2-regularized regression (`RidgeRegression`) with **autoregressive lags** (1d, 2d, 7d mean), **meteorology** (`log(wind)`, `log(mixingHeight)`, humidity, rain washout), **upwind fire × calm-wind interactions**, and **neighborhood target-encoding** (`computeContext` learns each locality's baseline and historical Diwali firecracker uplift).
  - **Recursive Multi-Day Forecaster:** Each predicted day feeds the next day's lag features, naturally propagating how a Diwali spike decays (or lingers under stagnant wind) over the post-Diwali week.
- **Honest Time-Based Backtest (2023–2025 Diwali Seasons):**
  - Beats the persistence baseline across every historical Diwali season (**MAE 20.6 vs 27.1 µg/m³**, $R^2 = 0.935$).
  - Inside the critical **Diwali ±3-day window**, reduces prediction error by **>50%** (**25.3 vs 66.3 µg/m³**).
- **Pluggable Data Architecture:** Built on `AirQualityDataSource` so live **CPCB / OpenAQ**, **Open-Meteo**, **NASA FIRMS**, and **TomTom Traffic** adapters drop in with zero model or UI changes.

---

## Slide 4 — Impact, Scalability & Roadmap

- **Who Uses AirSense:**
  - **Citizens, Schools & Hospitals:** Hyper-local health advisories and N95 / indoor-air alerts days before the spike hits their specific ward.
  - **Municipal & Pollution Control Boards (DPCC / CAQM):** Rank hotspots on any future day to pre-position smog guns, enforce targeted traffic diversions, and simulate policy ROI.
- **Scalability Path:**
  - Hourly resolution for Diwali night + spatial kriging/IDW interpolation to cover unmonitored wards across all of India.
  - Automated WhatsApp/SMS early-warning alerts when a neighborhood's forecasted 80% upper bound crosses AQI 300 (*Very Poor*) or 400 (*Severe*).

---

## 🎤 3-Minute Live Demo Flow (Round 2 & Grand Finale)

1. **[0:00 – 0:35] Hook & Map Tour:**
   - Open `http://localhost:5173`. Point out the **Pre-Diwali countdown badge** in the header and the **12 Delhi neighborhoods** on the dark Leaflet map.
   - Click **"Jump to Diwali night"** above the slider — watch the map markers flare deep red (*Severe*) and show the neighborhood ranking table on the bottom left.
2. **[0:35 – 1:30] Hyper-Local Forecast, Phases & Explainable AI:**
   - Click **Punjabi Bagh** (or **Anand Vihar**). Show the **Observed + 21-Day Forecast chart** with its 80% confidence band peaking on Diwali and decaying over the post-Diwali week.
   - Point to the **Before / During / After Diwali Outlook cards** and the **Why? Top drivers** bars showing exact percentage contributions from *Diwali fireworks*, *Stagnation (wind & mixing height)*, and *Stubble burning*.
3. **[1:30 – 2:25] Live What-If Policy Simulator (The "Wow" Moment):**
   - Scroll to the **What-If Policy Simulator**. Click the **"GRAP-IV + Odd-Even"** preset, then **"Full Clean-Air Action + Cloud Seeding"** (or drag the Firecracker & Stubble sliders).
   - Point back to the chart: a **green counterfactual curve** appears immediately, showing Diwali Peak PM2.5 dropping by **>150 µg/m³** and how cutting the Diwali night spike also speeds up post-Diwali recovery.
4. **[2:25 – 3:00] Honest ML Evaluation & Close:**
   - Point to the **Model Performance card** on the bottom right: highlight the time-based holdout MAE, $R^2$, and the **>50% error reduction during the Diwali ±3d window** over persistence.
