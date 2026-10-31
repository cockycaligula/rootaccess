import { useState } from 'react';
import {
  AQI_ADVICE,
  aqiColor,
  type DailyObservation,
  type DiwaliOutlook,
  type ForecastPoint,
  type NeighborhoodForecast,
} from '@vaayuvision/shared';
import { formatDate } from '../format';
import { TrendChart } from './TrendChart';
import { HourlyChart } from './HourlyChart';
import { useUserPreferences } from '../context/UserPreferencesContext';

interface Props {
  forecast: NeighborhoodForecast;
  simulatedPoints?: ForecastPoint[] | null;
  history: DailyObservation[];
  outlook: DiwaliOutlook | null;
  dayIndex: number;
  diwaliDate: string;
}

const PHASE_TITLES = { before: 'Before Diwali', during: 'During Diwali', after: 'After Diwali' };

export function NeighborhoodPanel({ forecast, simulatedPoints, history, outlook, dayIndex, diwaliDate }: Props) {
  const [chartTab, setChartTab] = useState<'trend' | 'hourly'>('trend');
  const [showDetails, setShowDetails] = useState(false);
  const { profile, openModal } = useUserPreferences();

  const { neighborhood: n, points } = forecast;
  const baseP = points[dayIndex];
  const simP = simulatedPoints?.[dayIndex] ?? null;
  const activeP = simP ?? baseP;
  if (!baseP || !activeP) return null;

  const userName = profile.name.trim();

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>{n.name}</h2>
          <span className="muted">
            {n.zone} · {formatDate(activeP.date, true)}
          </span>
        </div>
        <div className="panel-head-right">
          <div className="aqi-big" style={{ background: aqiColor(activeP.aqi) }}>
            <span className="aqi-value">{activeP.aqi}</span>
            <span className="aqi-cat">{activeP.category}</span>
          </div>
        </div>
      </div>

      <div className="personal-advice-card">
        <div className="personal-advice-top">
          <strong>
            {userName ? `Health Guidance for ${userName}` : 'Health & Safety Guidance'}
            {profile.conditions.length > 0 ? ` (${profile.conditions.join(', ')})` : ''}
          </strong>
          <button type="button" className="inline-link-btn" onClick={openModal}>
            Update Medical Info
          </button>
        </div>
        <p className="advice" style={{ margin: 0 }}>
          PM2.5 is <strong>{activeP.pm25} µg/m³</strong>
          {simP && simP.pm25 < baseP.pm25 ? (
            <span className="down-text"> (reduced from {baseP.pm25} µg/m³)</span>
          ) : null}
          . {AQI_ADVICE[activeP.category]}{' '}
          {profile.conditions.length > 0 && activeP.aqi > 120
            ? 'Because of your selected health sensitivities, wear an N95 mask outdoors and prefer the 1:00 PM – 4:00 PM window.'
            : 'Best time for fresh air outdoors is 1:00 PM – 4:00 PM.'}
        </p>
      </div>

      <div className="chart-tabs">
        <button
          type="button"
          className={`tab-btn ${chartTab === 'trend' ? 'active' : ''}`}
          onClick={() => setChartTab('trend')}
        >
          21-Day Forecast
        </button>
        <button
          type="button"
          className={`tab-btn ${chartTab === 'hourly' ? 'active' : ''}`}
          onClick={() => setChartTab('hourly')}
        >
          24-Hour Best Time ({formatDate(activeP.date)})
        </button>
      </div>

      {chartTab === 'trend' ? (
        <TrendChart
          history={history}
          points={points}
          simulatedPoints={simulatedPoints}
          selectedDate={activeP.date}
          diwaliDate={diwaliDate}
        />
      ) : (
        <HourlyChart point={baseP} simulatedPoint={simP} />
      )}

      {outlook && (
        <div className="outlook">
          {outlook.phases.map((ph) => (
            <div key={ph.phase} className="outlook-card" style={{ borderColor: aqiColor(ph.avgAqi) }}>
              <span className="muted small">{PHASE_TITLES[ph.phase]}</span>
              <strong style={{ color: aqiColor(ph.avgAqi) }}>AQI {ph.avgAqi}</strong>
              <span className="small muted">{ph.category}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button type="button" className="btn-secondary" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? 'Hide Weather & Pollution Causes' : 'Show Weather & Pollution Causes'}
        </button>
      </div>

      {showDetails && (
        <div className="collapsible-details">
          <div className="telemetry-strip">
            <div className="telemetry-tile">
              <span className="muted small">Wind</span>
              <strong>{activeP.weather.windSpeed.toFixed(1)} m/s</strong>
            </div>
            <div className="telemetry-tile">
              <span className="muted small">Humidity</span>
              <strong>{Math.round(activeP.weather.humidity)}%</strong>
            </div>
            <div className="telemetry-tile">
              <span className="muted small">Temp</span>
              <strong>{activeP.weather.tempC.toFixed(1)} °C</strong>
            </div>
            <div className="telemetry-tile">
              <span className="muted small">Traffic</span>
              <strong>{activeP.trafficIndex.toFixed(1)}×</strong>
            </div>
            <div className="telemetry-tile">
              <span className="muted small">Crop Fires</span>
              <strong>{activeP.fireCount}</strong>
            </div>
          </div>

          <h3>Main Pollution Contributors Today</h3>
          <ul className="drivers">
            {activeP.drivers.slice(0, 4).map((d) => (
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
        </div>
      )}
    </div>
  );
}
