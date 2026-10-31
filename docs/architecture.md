# Architecture

## Request / data flow

```mermaid
sequenceDiagram
  participant U as Browser (React)
  participant A as Express API
  participant S as PredictionService
  participant D as AirQualityDataSource
  participant M as Ridge model

  Note over A,S: On startup
  A->>S: init()
  S->>D: observations() for each neighborhood
  S->>M: evaluate(): train before last Diwali season, score that season
  S->>M: train(): fit on all observed data
  loop each neighborhood
    S->>D: conditionsForecast(date) for the next 21 days
    S->>M: predict recursively, plus intervals and drivers
  end
  Note over U,A: At runtime
  U->>A: GET /api/meta, /api/model, /api/forecast
  U->>A: GET /api/neighborhoods/:id/history, /outlook
  A-->>U: JSON (shared TypeScript types)
```

## Modules

```mermaid
classDiagram
  class AirQualityDataSource {
    <<interface>>
    +name
    +neighborhoods() Neighborhood[]
    +observations(id) DailyObservation[]
    +conditionsForecast(id, date, issuedOn) DayConditions
  }
  class SyntheticDataSource
  class OpenAQDataSource {
    <<planned>>
  }
  AirQualityDataSource <|.. SyntheticDataSource
  AirQualityDataSource <|.. OpenAQDataSource

  class RidgeRegression {
    +fit(X, y)
    +predict(x)
    +contributions(x)
  }
  class PredictionService {
    +init()
    +meta()
    +model()
    +forecast(id)
    +outlook(id)
  }
  PredictionService --> AirQualityDataSource
  PredictionService --> RidgeRegression
```

## Model design decisions

| Decision | Why |
|---|---|
| Predict `log(PM2.5)` and convert to AQI afterwards | AQI is piecewise-linear and saturates at 500. PM2.5 is what physics and sensors produce, and the log handles Diwali spikes. |
| Linear model with engineered features | Trains in under 1 s and every prediction is explainable. That matters for public advisories and for judges. The feature pipeline can be reused by GBMs later. |
| Neighborhood target encoding (baseline, Diwali uplift) | Captures hyper-local behaviour such as cracker intensity without one-hot explosion, and generalises to new wards once they have history. |
| Recursive forecasting | Persistence is the strongest single signal. Recursion propagates the Diwali spike into the following days. |
| Time-based holdout on the last Diwali season | Random splits leak the future. We report a persistence baseline and a Diwali ±3-day window, which is where naive models fail. |

## Scaling path

- Data ingestion: cron jobs pull CPCB/OpenAQ data hourly into Postgres + TimescaleDB, and the data source reads from the DB.
- Model: retrain nightly. Serve the latest forecasts from cache (Redis) so the API stays stateless and horizontally scalable.
- Spatial: interpolate station forecasts to a ward-level grid (IDW or kriging) for full city coverage.
