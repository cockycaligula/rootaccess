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
  const cleanest = sorted[sorted.length - 1];
  const sample = worst.p;

  const dispersionState =
    sample.weather.mixingHeightM < 450 || sample.weather.windSpeed < 1.5
      ? 'Severe Trapping (Low Inversion)'
      : sample.weather.mixingHeightM < 750
        ? 'Moderate Dispersion'
        : 'Good Ventilation';

  return (
    <section className="kpi-bar">
      <div className="kpi-card">
        <div className="kpi-top">
          <span className="muted small">PATIALA CITY MEAN · {formatDate(sample.date).toUpperCase()}</span>
          <span className="kpi-pill" style={{ background: aqiColor(cityAqi), color: '#111' }}>
            {cityCat}
          </span>
        </div>
        <div className="kpi-main">
          <strong style={{ color: aqiColor(cityAqi) }}>AQI {cityAqi}</strong>
          <span className="muted small">({ avgPm25.toFixed(1) } µg/m³ PM2.5)</span>
        </div>
        <span className="small muted">
          {isSimActive && baseCityAqi > cityAqi
            ? `Policy active: down from AQI ${baseCityAqi} (−${Math.round(baseAvgPm25 - avgPm25)} µg/m³)`
            : '12-ward mean across Patiala municipal & campus zones'}
        </span>
      </div>

      <div className="kpi-card clickable" onClick={() => onSelectWard(worst.n.id)}>
        <div className="kpi-top">
          <span className="muted small">HIGHEST-RISK HOTSPOT</span>
          <span className="kpi-pill" style={{ background: aqiColor(worst.p.aqi), color: '#111' }}>
            AQI {worst.p.aqi}
          </span>
        </div>
        <div className="kpi-main">
          <strong>{worst.n.name}</strong>
        </div>
        <span className="small muted">
          {worst.n.zone} · PM2.5 {worst.p.pm25} µg/m³ · Click to inspect
        </span>
      </div>

      <div className="kpi-card clickable" onClick={() => onSelectWard(cleanest.n.id)}>
        <div className="kpi-top">
          <span className="muted small">CLEANEST REFUGE ZONE</span>
          <span className="kpi-pill" style={{ background: aqiColor(cleanest.p.aqi), color: '#111' }}>
            AQI {cleanest.p.aqi}
          </span>
        </div>
        <div className="kpi-main">
          <strong>{cleanest.n.name}</strong>
        </div>
        <span className="small muted">
          {cleanest.n.zone} · {Math.round(worst.p.pm25 - cleanest.p.pm25)} µg/m³ cleaner than hotspot
        </span>
      </div>

      <div className="kpi-card">
        <div className="kpi-top">
          <span className="muted small">MALWA FIRES & BOUNDARY LAYER</span>
          <span className="kpi-pill neutral">{sample.fireCount} fires</span>
        </div>
        <div className="kpi-main">
          <strong>{dispersionState}</strong>
        </div>
        <span className="small muted">
          Wind {sample.weather.windSpeed.toFixed(1)} m/s · Mixing height {Math.round(sample.weather.mixingHeightM)} m · RH {Math.round(sample.weather.humidity)}%
        </span>
      </div>
    </section>
  );
}
