import { useState } from 'react';
import { aqiCategory, aqiColor, pm25ToAqi, type NeighborhoodForecast } from '@vaayuvision/shared';
import { formatDate } from '../format';

interface Props {
  baselineForecasts: NeighborhoodForecast[];
  activeForecasts: NeighborhoodForecast[];
  isSimActive: boolean;
  dayIndex: number;
  onSelectWard: (id: string) => void;
}

type KpiDialog = 'city' | 'hotspot' | 'cleanest' | null;

export function CityKpiBar({
  baselineForecasts,
  activeForecasts,
  isSimActive,
  dayIndex,
  onSelectWard,
}: Props) {
  const [dialog, setDialog] = useState<KpiDialog>(null);

  const rows = activeForecasts
    .map((f, idx) => ({
      n: f.neighborhood,
      p: f.points[dayIndex],
      baseP: baselineForecasts[idx]?.points[dayIndex],
    }))
    .filter((r) => r.p && r.baseP);

  if (!rows.length) return null;

  const avgPm25 = rows.reduce((s, r) => s + r.p.pm25, 0) / rows.length;
  const baseAvgPm25 = rows.reduce((s, r) => s + r.baseP.pm25, 0) / rows.length;
  const cityAqi = pm25ToAqi(avgPm25);
  const baseCityAqi = pm25ToAqi(baseAvgPm25);
  const cityCat = aqiCategory(cityAqi);

  const sorted = [...rows].sort((a, b) => b.p.aqi - a.p.aqi);
  const worst = sorted[0];
  const median = sorted[Math.floor(sorted.length / 2)];
  const cleanest = sorted[sorted.length - 1];
  const sample = worst.p;

  return (
    <div className="kpi-section">
      <section className="kpi-bar">
        <div
          className="kpi-card clickable"
          onClick={() => {
            onSelectWard(median.n.id);
            setDialog('city');
          }}
        >
          <div className="kpi-top">
            <span className="muted small">Patiala Average · {formatDate(sample.date)}</span>
            <span className="kpi-pill" style={{ background: aqiColor(cityAqi), color: '#1a120e' }}>
              {cityCat}
            </span>
          </div>
          <div className="kpi-main">
            <strong style={{ color: aqiColor(cityAqi) }}>AQI {cityAqi}</strong>
            <span className="muted small">({avgPm25.toFixed(0)} µg/m³)</span>
          </div>
          <span className="small muted">
            {isSimActive && baseCityAqi > cityAqi
              ? `Improved from AQI ${baseCityAqi} · Click to open dialog`
              : 'Click to open city summary dialog →'}
          </span>
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => {
            onSelectWard(worst.n.id);
            setDialog('hotspot');
          }}
        >
          <div className="kpi-top">
            <span className="muted small">Highest Pollution Area</span>
            <span className="kpi-pill" style={{ background: aqiColor(worst.p.aqi), color: '#1a120e' }}>
              AQI {worst.p.aqi}
            </span>
          </div>
          <div className="kpi-main">
            <strong>{worst.n.name}</strong>
          </div>
          <span className="small muted">Click to view top hotspots in dialog →</span>
        </div>

        <div
          className="kpi-card clickable"
          onClick={() => {
            onSelectWard(cleanest.n.id);
            setDialog('cleanest');
          }}
        >
          <div className="kpi-top">
            <span className="muted small">Cleanest Green Area</span>
            <span className="kpi-pill" style={{ background: aqiColor(cleanest.p.aqi), color: '#1a120e' }}>
              AQI {cleanest.p.aqi}
            </span>
          </div>
          <div className="kpi-main">
            <strong>{cleanest.n.name}</strong>
          </div>
          <span className="small muted">Click to view cleanest areas in dialog →</span>
        </div>
      </section>

      {dialog && (
        <div className="pref-modal-backdrop" onClick={() => setDialog(null)} role="dialog" aria-modal="true">
          <div className="pref-modal detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pref-modal-header">
              <div>
                <span className="pref-kicker">PATIALA SNAPSHOT · {formatDate(sample.date, true).toUpperCase()}</span>
                <h2>
                  {dialog === 'city' && 'Patiala City-Wide Air Quality Summary'}
                  {dialog === 'hotspot' && 'Highest-Pollution Areas Today'}
                  {dialog === 'cleanest' && 'Cleanest Green Areas Today'}
                </h2>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setDialog(null)}>
                Close ✕
              </button>
            </div>

            {dialog === 'city' && (
              <div className="dialog-body">
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">12-AREA AVERAGE AQI</span>
                    <strong style={{ color: aqiColor(cityAqi) }}>
                      AQI {cityAqi} ({cityCat})
                    </strong>
                    <span className="small muted">Average PM2.5: {avgPm25.toFixed(1)} µg/m³</span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">WEATHER &amp; CROP FIRES</span>
                    <strong>
                      Wind {sample.weather.windSpeed.toFixed(1)} m/s · {sample.fireCount} Fires
                    </strong>
                    <span className="small muted">
                      Humidity {Math.round(sample.weather.humidity)}% · Temp {sample.weather.tempC.toFixed(1)} °C
                    </span>
                  </div>
                </div>
              </div>
            )}

            {dialog === 'hotspot' && (
              <div className="dialog-body">
                <div className="dialog-grid-2">
                  {sorted.slice(0, 4).map((r, i) => (
                    <div
                      key={r.n.id}
                      className="dialog-stat-card clickable"
                      onClick={() => {
                        onSelectWard(r.n.id);
                        setDialog(null);
                      }}
                    >
                      <span className="dataset-tag">#{i + 1} HOTSPOT · {r.n.zone.toUpperCase()}</span>
                      <strong style={{ color: aqiColor(r.p.aqi) }}>
                        {r.n.name} · AQI {r.p.aqi}
                      </strong>
                      <span className="small muted">PM2.5 {r.p.pm25} µg/m³ · Click to select on map</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dialog === 'cleanest' && (
              <div className="dialog-body">
                <div className="dialog-grid-2">
                  {[...sorted].reverse().slice(0, 4).map((r, i) => (
                    <div
                      key={r.n.id}
                      className="dialog-stat-card clickable"
                      onClick={() => {
                        onSelectWard(r.n.id);
                        setDialog(null);
                      }}
                    >
                      <span className="dataset-tag">#{i + 1} CLEANEST · {r.n.zone.toUpperCase()}</span>
                      <strong style={{ color: aqiColor(r.p.aqi) }}>
                        {r.n.name} · AQI {r.p.aqi}
                      </strong>
                      <span className="small muted">PM2.5 {r.p.pm25} µg/m³ · Click to select on map</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
