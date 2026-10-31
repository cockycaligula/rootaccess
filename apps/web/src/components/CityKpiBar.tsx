import { aqiCategory, aqiColor, pm25ToAqi, type NeighborhoodForecast } from '@vaayuvision/shared';
import { formatDate } from '../format';

interface Props {
  baselineForecasts: NeighborhoodForecast[];
  activeForecasts: NeighborhoodForecast[];
  isSimActive: boolean;
  dayIndex: number;
  onSelectWard: (id: string) => void;
}

export function CityKpiBar({
  baselineForecasts,
  activeForecasts,
  isSimActive,
  dayIndex,
  onSelectWard,
}: Props) {
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
      <section className="kpi-bar three-col">
        <div className="kpi-card clickable" onClick={() => onSelectWard(median.n.id)}>
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
              ? `Improved from AQI ${baseCityAqi}`
              : 'Across all 12 Patiala areas'}
          </span>
        </div>

        <div className="kpi-card clickable" onClick={() => onSelectWard(worst.n.id)}>
          <div className="kpi-top">
            <span className="muted small">Highest Pollution Area</span>
            <span className="kpi-pill" style={{ background: aqiColor(worst.p.aqi), color: '#1a120e' }}>
              AQI {worst.p.aqi}
            </span>
          </div>
          <div className="kpi-main">
            <strong>{worst.n.name}</strong>
          </div>
          <span className="small muted">Click to view on map</span>
        </div>

        <div className="kpi-card clickable" onClick={() => onSelectWard(cleanest.n.id)}>
          <div className="kpi-top">
            <span className="muted small">Cleanest Green Area</span>
            <span className="kpi-pill" style={{ background: aqiColor(cleanest.p.aqi), color: '#1a120e' }}>
              AQI {cleanest.p.aqi}
            </span>
          </div>
          <div className="kpi-main">
            <strong>{cleanest.n.name}</strong>
          </div>
          <span className="small muted">Best spot for outdoor walks</span>
        </div>
      </section>
    </div>
  );
}
