import {
  AQI_ADVICE,
  aqiColor,
  type DailyObservation,
  type DiwaliOutlook,
  type ForecastPoint,
  type NeighborhoodForecast,
} from '@airsense/shared';
import { formatDate } from '../format';
import { TrendChart } from './TrendChart';

interface Props {
  forecast: NeighborhoodForecast;
  simulatedPoints?: ForecastPoint[] | null;
  history: DailyObservation[];
  outlook: DiwaliOutlook | null;
  dayIndex: number;
  diwaliDate: string;
}

const PHASE_TITLES = { before: 'Before (−7…−1d)', during: 'During (Diwali + next day)', after: 'After (+2…+7d)' };

export function NeighborhoodPanel({ forecast, simulatedPoints, history, outlook, dayIndex, diwaliDate }: Props) {
  const { neighborhood: n, points } = forecast;
  const p = points[dayIndex];
  if (!p) return null;
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>{n.name}</h2>
          <span className="muted">
            {n.zone} · Patiala · {formatDate(p.date, true)}
          </span>
        </div>
        <div className="aqi-big" style={{ background: aqiColor(p.aqi) }}>
          <span className="aqi-value">{p.aqi}</span>
          <span className="aqi-cat">{p.category}</span>
        </div>
      </div>
      <p className="advice">
        PM2.5 ≈ <strong>{p.pm25}</strong> µg/m³ (80% range {p.pm25Low}–{p.pm25High}). {AQI_ADVICE[p.category]}
      </p>

      <TrendChart
        history={history}
        points={points}
        simulatedPoints={simulatedPoints}
        selectedDate={p.date}
        diwaliDate={diwaliDate}
      />

      {outlook && (
        <div className="outlook">
          {outlook.phases.map((ph) => (
            <div key={ph.phase} className="outlook-card" style={{ borderColor: aqiColor(ph.avgAqi) }}>
              <span className="muted small">{PHASE_TITLES[ph.phase]}</span>
              <strong style={{ color: aqiColor(ph.avgAqi) }}>AQI {ph.avgAqi}</strong>
              <span className="small">{ph.category} · peak {ph.peakAqi}</span>
              <span className="muted small">{ph.source}</span>
            </div>
          ))}
        </div>
      )}

      <h3>Why? Top drivers for this day</h3>
      <ul className="drivers">
        {p.drivers.map((d) => (
          <li key={d.key}>
            <span>{d.label}</span>
            <span className="bar-wrap">
              <span
                className={`bar ${d.impactPct >= 0 ? 'up' : 'down'}`}
                style={{ width: `${Math.min(100, Math.abs(d.impactPct) / 2)}%` }}
              />
            </span>
            <span className={d.impactPct >= 0 ? 'up-text' : 'down-text'}>
              {d.impactPct >= 0 ? '+' : ''}
              {d.impactPct.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">Impact vs. average conditions, from the model's per-feature contributions.</p>
    </div>
  );
}
