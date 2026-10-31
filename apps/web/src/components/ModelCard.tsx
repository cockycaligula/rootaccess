import { useState } from 'react';
import type { ModelInfo } from '@vaayuvision/shared';

export function ModelCard({ model }: { model: ModelInfo }) {
  const [showTech, setShowTech] = useState(false);
  const ev = model.evaluation;
  const diwaliGain = ev ? (1 - ev.diwaliWindowMae / ev.diwaliWindowPersistenceMae) * 100 : 0;
  const maxW = Math.max(...model.features.map((f) => Math.abs(f.weight)));

  return (
    <div className="model-engine-card">
      <div className="model-engine-head">
        <div>
          <h3>How Our AI Prediction Works</h3>
          <p className="muted small">
            Trained on {model.trainRows.toLocaleString()} days of Patiala air-quality, weather, traffic, and crop-fire records.
          </p>
        </div>
      </div>

      <div className="pipeline-stack">
        <div className="pipeline-step-card">
          <strong>1. Combines 5 Local Data Sources</strong>
          <p className="small muted" style={{ margin: 0 }}>
            Merges CPCB/PPCB air sensors, NASA crop-fire satellite data, IMD wind &amp; humidity, Patiala road traffic, and past Diwali trends.
          </p>
        </div>
        <div className="pipeline-step-card">
          <strong>2. Predicts 21 Days Ahead (Before, During &amp; After Diwali)</strong>
          <p className="small muted" style={{ margin: 0 }}>
            Forecasts daily and hourly air quality for all 12 Patiala areas so you know the safest hours to step outside.
          </p>
        </div>
        <div className="pipeline-step-card">
          <strong>3. Personalizes Advice to Your Health Profile</strong>
          <p className="small muted" style={{ margin: 0 }}>
            Adjusts safe outdoor thresholds automatically based on your medical conditions (Asthma, COPD, Allergies, Heart, or Eye sensitivity).
          </p>
        </div>
      </div>

      <div>
        <button type="button" className="btn-secondary" onClick={() => setShowTech((v) => !v)}>
          {showTech ? 'Hide Technical Metrics' : 'Show Technical Accuracy & Weights'}
        </button>
      </div>

      {showTech && ev && (
        <div className="validation-pane">
          <div className="metrics">
            <div className="metric">
              <span className="muted small">Accuracy (R²)</span>
              <strong>{ev.r2.toFixed(2)}</strong>
              <span className="small muted">Holdout validation</span>
            </div>
            <div className="metric">
              <span className="muted small">Avg Error (MAE)</span>
              <strong>{ev.mae.toFixed(1)}</strong>
              <span className="small muted">µg/m³ PM2.5</span>
            </div>
            <div className="metric">
              <span className="muted small">Diwali Spike Gain</span>
              <strong>+{diwaliGain.toFixed(0)}%</strong>
              <span className="small muted">vs. baseline</span>
            </div>
            <div className="metric">
              <span className="muted small">Features Used</span>
              <strong>{model.features.length}</strong>
              <span className="small muted">Physical variables</span>
            </div>
          </div>

          <ul className="features">
            {model.features.slice(0, 6).map((f) => (
              <li key={f.key}>
                <span>{f.label}</span>
                <span className="bar-wrap">
                  <span
                    className={`bar ${f.weight >= 0 ? 'up' : 'down'}`}
                    style={{ width: `${(Math.abs(f.weight) / maxW) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
