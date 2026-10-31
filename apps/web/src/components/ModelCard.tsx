import { useState } from 'react';
import type { ModelInfo } from '@vaayuvision/shared';

type ModelDialog = 'sources' | 'how' | 'accuracy' | null;

export function ModelCard({ model }: { model: ModelInfo }) {
  const [dialog, setDialog] = useState<ModelDialog>(null);
  const ev = model.evaluation;
  const diwaliGain = ev ? (1 - ev.diwaliWindowMae / ev.diwaliWindowPersistenceMae) * 100 : 0;
  const maxW = Math.max(...model.features.map((f) => Math.abs(f.weight)));

  return (
    <div className="model-engine-card">
      <div className="model-engine-head">
        <span className="section-kicker">AI MODEL &amp; METHODOLOGY</span>
        <h3>AI Prediction Engine</h3>
      </div>

      {/* Clean Clickable Cards — No Long Text on Main Page */}
      <div className="pipeline-stack">
        <button type="button" className="hub-action-card" onClick={() => setDialog('sources')}>
          <span className="dataset-tag">1. DATA SOURCES</span>
          <strong>5 Environmental &amp; Traffic Datasets</strong>
          <span className="muted small">Click to open →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setDialog('how')}>
          <span className="dataset-tag">2. HOW AI PREDICTS</span>
          <strong>Neighborhood Prediction Pipeline</strong>
          <span className="muted small">Click to open →</span>
        </button>

        <button type="button" className="hub-action-card" onClick={() => setDialog('accuracy')}>
          <span className="dataset-tag">3. MODEL ACCURACY</span>
          <strong>
            Validation Score ({ev ? `R² ${ev.r2.toFixed(2)}` : 'Verified'}) &amp; Top Factors
          </strong>
          <span className="muted small">Click to open →</span>
        </button>
      </div>

      {dialog && (
        <div className="pref-modal-backdrop" onClick={() => setDialog(null)} role="dialog" aria-modal="true">
          <div className="pref-modal detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pref-modal-header">
              <div>
                <span className="pref-kicker">VAAYUVISION AI ENGINE</span>
                <h2>
                  {dialog === 'sources' && '5 Datasets Used by Our AI'}
                  {dialog === 'how' && 'How Our AI Prediction Model Works'}
                  {dialog === 'accuracy' && 'Model Accuracy & Key Pollution Drivers'}
                </h2>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setDialog(null)}>
                Close ✕
              </button>
            </div>

            {dialog === 'sources' && (
              <div className="dialog-body">
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">1. CPCB &amp; PPCB AIR SENSORS</span>
                    <strong>PM2.5, PM10 &amp; AQI Archive</strong>
                    <span className="small muted">21,084 area-days across 12 Patiala neighborhoods.</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">2. NASA VIIRS CROP FIRES</span>
                    <strong>Upwind Malwa Stubble Plumes</strong>
                    <span className="small muted">375m satellite thermal fire counts across Sangrur &amp; Patiala.</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">3. IMD WEATHER &amp; WIND</span>
                    <strong>Wind Speed, Humidity &amp; Mixing Height</strong>
                    <span className="small muted">Tracks cold night temperature inversions that trap smoke.</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">4. TRAFFIC &amp; DIWALI ARCHIVE</span>
                    <strong>Corridor Vehicles/Hr &amp; Cracker Intensity</strong>
                    <span className="small muted">Bazaar traffic congestion and festival firework uplift.</span>
                  </div>
                </div>
              </div>
            )}

            {dialog === 'how' && (
              <div className="dialog-body">
                <div className="pipeline-stack">
                  <div className="pipeline-step-card">
                    <strong>Step 1: Neighborhood Feature Fusion (22 Variables)</strong>
                    <span className="small muted">
                      Combines recent PM2.5 memory, wind speed, boundary-layer height, crop fires, road traffic, and festival timing.
                    </span>
                  </div>
                  <div className="pipeline-step-card">
                    <strong>Step 2: Log-Space L2 Ridge Regression</strong>
                    <span className="small muted">
                      Trained on {model.trainRows.toLocaleString()} Patiala area-days to model multiplicative smoke trapping during winter inversions.
                    </span>
                  </div>
                  <div className="pipeline-step-card">
                    <strong>Step 3: Personalized Health Thresholds</strong>
                    <span className="small muted">
                      Matches predicted PM2.5, PM10, and NO₂ against your health conditions (Asthma, COPD, Allergies, Heart, Eyes/Skin).
                    </span>
                  </div>
                </div>
              </div>
            )}

            {dialog === 'accuracy' && ev && (
              <div className="dialog-body">
                <div className="metrics">
                  <div className="metric">
                    <span className="muted small">Accuracy (R²)</span>
                    <strong>{ev.r2.toFixed(2)}</strong>
                    <span className="small muted">Out-of-sample</span>
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
                    <span className="muted small">Variables</span>
                    <strong>{model.features.length}</strong>
                    <span className="small muted">Engineered features</span>
                  </div>
                </div>

                <h3>Most Influential Factors</h3>
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
        </div>
      )}
    </div>
  );
}
