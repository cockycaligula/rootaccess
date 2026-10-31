import type { ModelInfo } from '@vaayuvision/shared';
import { formatDate } from '../format';

export function ModelCard({ model }: { model: ModelInfo }) {
  const ev = model.evaluation;
  const gain = ev ? (1 - ev.mae / ev.persistenceMae) * 100 : 0;
  const diwaliGain = ev ? (1 - ev.diwaliWindowMae / ev.diwaliWindowPersistenceMae) * 100 : 0;
  const maxW = Math.max(...model.features.map((f) => Math.abs(f.weight)));
  return (
    <div>
      <h3>Model performance</h3>
      <p className="muted small">{model.algorithm}</p>
      {ev ? (
        <>
          <p className="muted small">
            Holdout: {formatDate(ev.from)} – {formatDate(ev.to)} · {ev.rows} neighborhood-days · one-day-ahead
          </p>
          <div className="metrics">
            <Metric label="MAE (µg/m³)" value={ev.mae.toFixed(1)} sub={`persistence ${ev.persistenceMae.toFixed(1)}`} />
            <Metric label="RMSE (µg/m³)" value={ev.rmse.toFixed(1)} sub={`persistence ${ev.persistenceRmse.toFixed(1)}`} />
            <Metric label="R²" value={ev.r2.toFixed(2)} sub={`${gain.toFixed(0)}% lower MAE`} />
            <Metric
              label="Diwali ±3d MAE"
              value={ev.diwaliWindowMae.toFixed(1)}
              sub={`${diwaliGain.toFixed(0)}% better than persistence`}
            />
          </div>
        </>
      ) : (
        <p className="muted">No completed season available for evaluation yet.</p>
      )}
      <h3>Most influential features</h3>
      <ul className="features">
        {model.features.slice(0, 8).map((f) => (
          <li key={f.key}>
            <span>{f.label}</span>
            <span className="bar-wrap">
              <span className={`bar ${f.weight >= 0 ? 'up' : 'down'}`} style={{ width: `${(Math.abs(f.weight) / maxW) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">Trained on {model.trainRows.toLocaleString()} neighborhood-days.</p>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="metric">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      <span className="small">{sub}</span>
    </div>
  );
}
