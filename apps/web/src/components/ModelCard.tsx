import { useState } from 'react';
import type { ModelInfo } from '@vaayuvision/shared';
import { formatDate } from '../format';

type EngineTab = 'pipeline' | 'weights' | 'validation';

const PIPELINE_STEPS = [
  {
    step: 'STAGE 01',
    title: 'Multi-Dataset Ingestion & 22-Feature Engineering',
    formula: 'x_t ∈ ℝ²² across 8 physical driver groups',
    detail:
      'Merges CPCB/PPCB PM2.5 lags (lag1, lag2, 7d rolling mean), NASA VIIRS Malwa fire counts ln(1 + fires/50), IMD/ERA5 inverse mixing height (500 / H_mix), wind speed, RH, rain washout, Patiala corridor traffic, and Gaussian Diwali kernels (D-3 pre-build, D=0 peak, D+2 post-tail).',
  },
  {
    step: 'STAGE 02',
    title: 'Standardized Log-Space L2 Ridge Solver',
    formula: 'ŷ_t = ln(PM2.5_t) = β₀ + z_tᵀ w,   min_w ‖y − Zw‖₂² + λ‖w‖₂²  (λ = 8.0)',
    detail:
      'Atmospheric pollutant concentrations follow log-normal multiplicative physics (inversions multiply surface emissions). Training in log-space with Z-score standardization and L2 regularization prevents collinearity between Diwali night and winter boundary-layer collapse.',
  },
  {
    step: 'STAGE 03',
    title: '21-Day Recursive Autoregressive Rollout & 80% CI',
    formula: 'PM2.5_{t+h} = exp(ŷ_{t+h} + ½ σ_res²),   σ_h = σ_res · √(1 + 0.18 h)',
    detail:
      'For horizon h = 1…21 days, each day’s predicted PM2.5 feeds recursively into the next day’s lag1, lag2, and roll7 memory features. Smearing bias correction converts log-predictions to µg/m³, and horizon-scaled residuals yield calibrated 10th–90th percentile (80% CI) bands.',
  },
  {
    step: 'STAGE 04',
    title: 'Exact Per-Feature Causal Driver Attribution',
    formula: 'Impact_g(%) = (exp(∑_{j∈g} w_j z_{t,j}) − 1) × 100%',
    detail:
      'Because the standardized linear predictor is additive in log-space, every daily AQI forecast is decomposed exactly into 8 human-readable physical drivers (Diwali Fireworks, Boundary-Layer Inversion, Malwa Stubble Fires, Recent Memory, Traffic, etc.).',
  },
];

export function ModelCard({ model }: { model: ModelInfo }) {
  const [tab, setTab] = useState<EngineTab>('pipeline');
  const ev = model.evaluation;
  const gain = ev ? (1 - ev.mae / ev.persistenceMae) * 100 : 0;
  const diwaliGain = ev ? (1 - ev.diwaliWindowMae / ev.diwaliWindowPersistenceMae) * 100 : 0;
  const maxW = Math.max(...model.features.map((f) => Math.abs(f.weight)));

  return (
    <div className="model-engine-card">
      <div className="model-engine-head">
        <div>
          <span className="dataset-tag">EXPLAINABLE AI ARCHITECTURE · 22 ENGINEERED FEATURES</span>
          <h3>How VaayuVision’s Prediction Engine Works</h3>
          <p className="muted small">
            {model.algorithm} · Trained on <strong>{model.trainRows.toLocaleString()}</strong> Patiala area-days (σ_log ={' '}
            {model.residualStdLog.toFixed(3)})
          </p>
        </div>
      </div>

      <div className="engine-tabs" role="tablist" aria-label="AI Engine Inspector Tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pipeline'}
          className={`tab-btn ${tab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setTab('pipeline')}
        >
          1. Prediction Architecture
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'validation'}
          className={`tab-btn ${tab === 'validation' ? 'active' : ''}`}
          onClick={() => setTab('validation')}
        >
          2. Holdout Accuracy ({ev ? `R² ${ev.r2.toFixed(2)}` : 'Backtest'})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'weights'}
          className={`tab-btn ${tab === 'weights' ? 'active' : ''}`}
          onClick={() => setTab('weights')}
        >
          3. Learned Feature Weights ({model.features.length})
        </button>
      </div>

      {tab === 'pipeline' && (
        <div className="pipeline-stack">
          {PIPELINE_STEPS.map((s) => (
            <div key={s.step} className="pipeline-step-card">
              <div className="pipeline-step-top">
                <span className="pipeline-badge">{s.step}</span>
                <strong>{s.title}</strong>
              </div>
              <code className="pipeline-formula">{s.formula}</code>
              <p className="small muted" style={{ margin: 0 }}>
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === 'validation' && (
        <div className="validation-pane">
          {ev ? (
            <>
              <p className="muted small" style={{ marginTop: 0 }}>
                Out-of-sample time-based holdout across the complete Diwali season ({formatDate(ev.from, true)} –{' '}
                {formatDate(ev.to, true)} · <strong>{ev.rows}</strong> area-days) benchmarked against a naive
                persistence baseline (PM2.5_t = PM2.5_t-1):
              </p>
              <div className="metrics">
                <Metric
                  label="Overall MAE (µg/m³)"
                  value={ev.mae.toFixed(1)}
                  sub={`vs. ${ev.persistenceMae.toFixed(1)} persistence (−${gain.toFixed(0)}% error)`}
                />
                <Metric
                  label="Overall RMSE (µg/m³)"
                  value={ev.rmse.toFixed(1)}
                  sub={`vs. ${ev.persistenceRmse.toFixed(1)} persistence`}
                />
                <Metric
                  label="Variance Explained (R²)"
                  value={ev.r2.toFixed(2)}
                  sub="Out-of-sample log-normal fit"
                />
                <Metric
                  label="Diwali ±3d Spike MAE"
                  value={ev.diwaliWindowMae.toFixed(1)}
                  sub={`${diwaliGain.toFixed(0)}% more accurate than persistence`}
                />
              </div>
              <div className="validation-note">
                <strong>Why Persistence Fails on Diwali:</strong> A naive persistence model predicts tomorrow will look
                like today—missing the sudden Diwali night firework surge by &gt;75 µg/m³ and over-predicting the
                post-Diwali morning decay. VaayuVision’s Gaussian festival kernels + boundary-layer coupling cut Diwali
                window error by <strong>{diwaliGain.toFixed(0)}%</strong>.
              </div>
            </>
          ) : (
            <p className="muted">No completed season available for evaluation yet.</p>
          )}
        </div>
      )}

      {tab === 'weights' && (
        <div className="weights-pane">
          <p className="muted small" style={{ marginTop: 0 }}>
            Standardized L2 Ridge coefficients (<strong>w_j</strong> in log-PM2.5 space). Orange bars increase particulate
            concentration; green bars drive dispersion or wet-deposition washout:
          </p>
          <ul className="features">
            {model.features.slice(0, 12).map((f) => (
              <li key={f.key} className="feature-weight-row">
                <span className="feature-weight-label">
                  <strong>{f.label}</strong> <span className="muted small">({f.group})</span>
                </span>
                <span className="bar-wrap">
                  <span
                    className={`bar ${f.weight >= 0 ? 'up' : 'down'}`}
                    style={{ width: `${(Math.abs(f.weight) / maxW) * 100}%` }}
                  />
                </span>
                <span className={`small ${f.weight >= 0 ? 'up-text' : 'down-text'}`}>
                  {f.weight >= 0 ? '+' : ''}
                  {f.weight.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="metric">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      <span className="small muted">{sub}</span>
    </div>
  );
}
