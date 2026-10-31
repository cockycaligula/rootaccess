# VayuVision Hyper Local AQI Prediction & Intervention

> **Team:** Prompt and Pray | **Target:** Patiala, Punjab
> **root access hackathon: Problem statement:** *AI-Powered Neighborhood-Level Air Pollution Prediction System.*
> Predict neighborhood-level air pollution **before, during, and after Diwali** using historical air-quality data, weather conditions, traffic patterns, and other environmental indicators.

AirSense forecasts daily **PM2.5 and Indian AQI for specific Patiala neighborhoods up to 21 days ahead**. By isolating the baseline agricultural smoke (Parali burning) from localized Diwali firework emissions and traffic, it provides a **before / during / after Diwali outlook** and explains **why** the air will degrade using Explainable AI.

![react](https://img.shields.io/badge/React-18-61dafb) ![typescript](https://img.shields.io/badge/TypeScript-5-blue) ![python](https://img.shields.io/badge/Python-3.10-blue) ![fastapi](https://img.shields.io/badge/FastAPI-0.103-009688) ![ml](https://img.shields.io/badge/XGBoost_%2B_MLP-Ensemble-orange)

---

## ✨ Features

| | |
|---|---|
| 🗺️ **Micro-Climate Map** | Interactive Leaflet map of Patiala neighborhoods, color-coded by the CPCB AQI scale. A day slider and *Jump to Diwali night* button let you move through the forecast. |
| 📈 **Forecast + Uncertainty** | 30 days of observed AQI plus a 21-day recursive forecast with an 80% prediction band that widens with lead time. |
| 🪔 **Diwali Phase Outlook** | Average and peak AQI for **Before (−7…−1d)**, **During (Diwali + next day)**, and **After (+2…+7d)**. |
| 🌾 **Parali Tracking** | Integration of NASA FIRMS (Fire Radiative Power) and wind trajectories to calculate baseline agricultural smoke drifting into the city from the Malwa region. |
| 🧠 **Explainable AI (XAI)** | Each prediction breaks down the drivers: *Diwali fireworks (+180%)*, *Stubble smoke (+35%)*, *Low wind/mixing (+40%)*. |
| 🏆 **Ranking & Health** | Ranks neighborhoods from worst to best to help plan interventions, combined with CPCB category-specific health guidance for every forecast. |
| 🚨 **Vulnerable Alerts** | SMS / WhatsApp advisory triggers designed to warn registered respiratory patients 12 hours before a forecasted hyper-local peak. |
| 🎛️ **What-If Simulator** | Interactive toggles to see how interventions (e.g., "50% traffic reduction" or "Green crackers only") would alter the forecasted AQI curve. |

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph Sources["Data Sources (Pluggable Adapters)"]
    AQ["Air quality<br/>CPCB (PM2.5)"]
    WX["Weather<br/>Open-Meteo<br/>(wind, mixing height)"]
    TR["Traffic<br/>Google Maps API<br/>(live routing)"]
    FR["Farm fires<br/>NASA FIRMS<br/>(fire counts/FRP)"]
    CAL["Calendar<br/>(Diwali phase flags)"]
  end

  subgraph API["apps/api - Python + FastAPI"]
    DS["Data Ingestion Adapters"]
    FE["Feature Engineering<br/>(Traffic Index, Upwind Math, Lags)"]
    ML["Log-Space Ensemble<br/>XGBoost + MLP"]
    EV["Time-based evaluation<br/>vs persistence baseline"]
    XAI["SHAP Explainer<br/>(Driver Attribution)"]
    REST["FastAPI REST API /api/*"]
  end

  subgraph WEB["apps/web - React + Vite + TS"]
    MAP["Leaflet Spatial Map"]
    CH["Recharts Trend & Band"]
    OUT["Phase Outlook & Metrics"]
    SIM["What-If Simulator"]
  end

  AQ & WX & TR & FR & CAL --> DS --> FE --> ML --> REST
  ML --> EV --> REST
  ML --> XAI --> REST
  REST --> MAP & CH & OUT & SIM
