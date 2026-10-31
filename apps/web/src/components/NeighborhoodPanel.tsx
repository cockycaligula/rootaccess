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
  const [chartTab, setChartTab] = useState<'trend' | 'hourly'>('trend');
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [copied, setCopied] = useState(false);

  const { neighborhood: n, points } = forecast;
  const baseP = points[dayIndex];
  const simP = simulatedPoints?.[dayIndex] ?? null;
  const activeP = simP ?? baseP;
  if (!baseP || !activeP) return null;

  const advisoryText = [
    `VAAYUVISION PATIALA — AREA AIR QUALITY & HEALTH BULLETIN`,
    `Area: ${n.name} (${n.zone} Patiala) | Date: ${formatDate(activeP.date, true)}`,
    `Forecast AQI: ${activeP.aqi} (${activeP.category}) | 24h PM2.5: ${activeP.pm25} µg/m³ (80% CI: ${baseP.pm25Low}–${baseP.pm25High} µg/m³)`,
    `Meteorology: Wind ${activeP.weather.windSpeed.toFixed(1)} m/s | Mixing Height ${Math.round(activeP.weather.mixingHeightM)} m | RH ${Math.round(activeP.weather.humidity)}% | Upwind Malwa Fires: ${activeP.fireCount}`,
    `Primary Drivers: ${activeP.drivers.map((d) => `${d.label} (${d.impactPct >= 0 ? '+' : ''}${d.impactPct.toFixed(0)}%)`).join(', ')}`,
    `Recommended Action (Campuses / Schools / Citizens): ${AQI_ADVICE[activeP.category]} Best outdoor window: 13:00–16:00 IST. Avoid outdoor exertion between 19:00–01:00 IST.`,
    `Municipal / PPCB Action: ${activeP.aqi > 300 ? 'Deploy mechanized water sprinkling on primary corridors, restrict heavy vehicles in market zones, and issue N95 advisory for schools & OPDs.' : 'Maintain standard monitoring and dust-suppression protocols.'}`,
  ].join('\n');

  const copyAdvisory = () => {
    navigator.clipboard.writeText(advisoryText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>{n.name}</h2>
          <span className="muted">
            {n.zone} · Patiala · {formatDate(activeP.date, true)}
          </span>
        </div>
        <div className="panel-head-right">
          <button type="button" className="btn-secondary" onClick={() => setShowAdvisory((v) => !v)}>
            {showAdvisory ? 'Hide Area Bulletin' : 'Generate Area Advisory'}
          </button>
          <div className="aqi-big" style={{ background: aqiColor(activeP.aqi) }}>
            <span className="aqi-value">{activeP.aqi}</span>
            <span className="aqi-cat">{activeP.category}</span>
          </div>
        </div>
      </div>

      <p className="advice">
        PM2.5 ≈ <strong>{activeP.pm25}</strong> µg/m³
        {simP && simP.pm25 < baseP.pm25 ? (
          <span className="down-text"> (down from {baseP.pm25} µg/m³ baseline)</span>
        ) : (
          <span> (80% range {baseP.pm25Low}–{baseP.pm25High})</span>
        )}
        . {AQI_ADVICE[activeP.category]}
      </p>

      {showAdvisory && (
        <div className="advisory-box">
          <div className="advisory-head">
            <strong>Official Area Advisory Bulletin · {n.name}</strong>
            <div className="advisory-actions">
              <button type="button" className="btn-secondary" onClick={copyAdvisory}>
                {copied ? 'Copied to Clipboard' : 'Copy Text'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => window.print()}>
                Print / Save PDF
              </button>
            </div>
          </div>
          <pre className="advisory-pre">{advisoryText}</pre>
        </div>
      )}

      <div className="telemetry-strip">
        <div className="telemetry-tile">
          <span className="muted small">Wind Speed</span>
          <strong>{activeP.weather.windSpeed.toFixed(1)} m/s</strong>
          <span className="small muted">{activeP.weather.windSpeed < 1.6 ? 'Calm (Stagnant)' : 'Dispersive'}</span>
        </div>
        <div className="telemetry-tile">
          <span className="muted small">Mixing Height</span>
          <strong>{Math.round(activeP.weather.mixingHeightM)} m</strong>
          <span className="small muted">{activeP.weather.mixingHeightM < 450 ? 'Inversion Trap' : 'Normal PBL'}</span>
        </div>
        <div className="telemetry-tile">
          <span className="muted small">Humidity & Rain</span>
          <strong>{Math.round(activeP.weather.humidity)}% RH</strong>
          <span className="small muted">{activeP.weather.rainMm > 0.5 ? `${activeP.weather.rainMm.toFixed(1)} mm rain` : `${activeP.weather.tempC.toFixed(1)} °C`}</span>
        </div>
        <div className="telemetry-tile">
          <span className="muted small">Traffic Index</span>
          <strong>{activeP.trafficIndex.toFixed(2)}×</strong>
          <span className="small muted">{activeP.trafficIndex > 1.15 ? 'Festive Surge' : 'Typical Flow'}</span>
        </div>
        <div className="telemetry-tile">
          <span className="muted small">Malwa Fires</span>
          <strong>{activeP.fireCount}</strong>
          <span className="small muted">Upwind VIIRS count</span>
        </div>
      </div>

      <div className="chart-tabs">
        <button
          type="button"
          className={`tab-btn ${chartTab === 'trend' ? 'active' : ''}`}
          onClick={() => setChartTab('trend')}
        >
          21-Day Forecast Trend
        </button>
        <button
          type="button"
          className={`tab-btn ${chartTab === 'hourly' ? 'active' : ''}`}
          onClick={() => setChartTab('hourly')}
        >
          24-Hour Intraday Profile ({formatDate(activeP.date)})
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
              <span className="small">{ph.category} · peak {ph.peakAqi}</span>
              <span className="muted small">{ph.source}</span>
            </div>
          ))}
        </div>
      )}

      <h3>Why? Top causal drivers for this day</h3>
      <ul className="drivers">
        {activeP.drivers.map((d) => (
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
