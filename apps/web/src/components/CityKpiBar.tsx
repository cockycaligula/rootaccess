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

type InspectTab = 'city' | 'hotspot' | 'cleanest' | 'meteo' | null;

export function CityKpiBar({
  baselineForecasts,
  activeForecasts,
  isSimActive,
  dayIndex,
  onSelectWard,
}: Props) {
  const [activeTab, setActiveTab] = useState<InspectTab>(null);

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
  const agriBelt = rows.find((r) => r.n.id === 'sanaur-road') ?? worst;
  const sample = worst.p;

  const dispersionState =
    sample.weather.mixingHeightM < 450 || sample.weather.windSpeed < 1.5
      ? 'Severe Trapping (Low Inversion)'
      : sample.weather.mixingHeightM < 750
        ? 'Moderate Dispersion'
        : 'Good Ventilation';

  const ventilationIndex = Math.round(sample.weather.windSpeed * sample.weather.mixingHeightM);
  const severeCount = rows.filter((r) => r.p.aqi > 400).length;
  const veryPoorCount = rows.filter((r) => r.p.aqi > 300 && r.p.aqi <= 400).length;
  const moderateOrBetterCount = rows.filter((r) => r.p.aqi <= 300).length;

  const handleCardClick = (tab: Exclude<InspectTab, null>, wardId: string) => {
    onSelectWard(wardId);
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  return (
    <div className="kpi-section">
      <section className="kpi-bar">
        <div
          className={`kpi-card clickable ${activeTab === 'city' ? 'active-kpi' : ''}`}
          onClick={() => handleCardClick('city', median.n.id)}
        >
          <div className="kpi-top">
            <span className="muted small">PATIALA CITY MEAN · {formatDate(sample.date).toUpperCase()}</span>
            <span className="kpi-pill" style={{ background: aqiColor(cityAqi), color: '#111' }}>
              {cityCat}
            </span>
          </div>
          <div className="kpi-main">
            <strong style={{ color: aqiColor(cityAqi) }}>AQI {cityAqi}</strong>
            <span className="muted small">({avgPm25.toFixed(1)} µg/m³ PM2.5)</span>
          </div>
          <span className="small muted">
            {isSimActive && baseCityAqi > cityAqi
              ? `Policy: down from AQI ${baseCityAqi} (−${Math.round(baseAvgPm25 - avgPm25)} µg/m³) · Click to inspect`
              : '12-ward Patiala mean · Click to inspect'}
          </span>
        </div>

        <div
          className={`kpi-card clickable ${activeTab === 'hotspot' ? 'active-kpi' : ''}`}
          onClick={() => handleCardClick('hotspot', worst.n.id)}
        >
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

        <div
          className={`kpi-card clickable ${activeTab === 'cleanest' ? 'active-kpi' : ''}`}
          onClick={() => handleCardClick('cleanest', cleanest.n.id)}
        >
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
            {cleanest.n.zone} · {Math.round(worst.p.pm25 - cleanest.p.pm25)} µg/m³ cleaner · Click to inspect
          </span>
        </div>

        <div
          className={`kpi-card clickable ${activeTab === 'meteo' ? 'active-kpi' : ''}`}
          onClick={() => handleCardClick('meteo', agriBelt.n.id)}
        >
          <div className="kpi-top">
            <span className="muted small">MALWA FIRES & BOUNDARY LAYER</span>
            <span className="kpi-pill neutral">{sample.fireCount} fires</span>
          </div>
          <div className="kpi-main">
            <strong>{dispersionState}</strong>
          </div>
          <span className="small muted">
            Wind {sample.weather.windSpeed.toFixed(1)} m/s · PBL {Math.round(sample.weather.mixingHeightM)} m · Click to inspect
          </span>
        </div>
      </section>

      {activeTab && (
        <div className="kpi-inspector">
          <div className="kpi-inspector-head">
            <strong>
              {activeTab === 'city' && `Patiala City-Wide Air Quality Breakdown · ${formatDate(sample.date, true)}`}
              {activeTab === 'hotspot' && `Top 3 High-Risk Pollution Hotspots in Patiala · ${formatDate(sample.date, true)}`}
              {activeTab === 'cleanest' && `Top 3 Cleanest Refuge & Campus Zones in Patiala · ${formatDate(sample.date, true)}`}
              {activeTab === 'meteo' && `Patiala Meteorology, Boundary-Layer Inversion & Malwa Fire Transport · ${formatDate(sample.date, true)}`}
            </strong>
            <button type="button" className="btn-secondary" onClick={() => setActiveTab(null)}>
              Close
            </button>
          </div>

          {activeTab === 'city' && (
            <div className="kpi-inspector-grid">
              <div className="kpi-stat">
                <span className="muted small">12-Ward Mean PM2.5</span>
                <strong>{avgPm25.toFixed(1)} µg/m³ (AQI {cityAqi})</strong>
                <span className="small muted">Range: {cleanest.p.pm25} – {worst.p.pm25} µg/m³ across Patiala</span>
              </div>
              <div className="kpi-stat">
                <span className="muted small">Severe Wards (AQI &gt; 400)</span>
                <strong className="up-text">{severeCount} of 12 wards</strong>
                <span className="small muted">Very Poor (301–400): {veryPoorCount} wards</span>
              </div>
              <div className="kpi-stat">
                <span className="muted small">Moderate / Poor Wards (≤ 300)</span>
                <strong className="down-text">{moderateOrBetterCount} of 12 wards</strong>
                <span className="small muted">Median ward: {median.n.name} (AQI {median.p.aqi})</span>
              </div>
              <div className="kpi-stat">
                <span className="muted small">City-Wide Advisory</span>
                <strong>{cityAqi > 300 ? 'High Respiratory Alert' : 'Moderate Precaution'}</strong>
                <span className="small muted">Selected {median.n.name} on map</span>
              </div>
            </div>
          )}

          {activeTab === 'hotspot' && (
            <div className="kpi-inspector-grid">
              {sorted.slice(0, 3).map((r, i) => (
                <div
                  key={r.n.id}
                  className="kpi-stat clickable"
                  onClick={() => onSelectWard(r.n.id)}
                >
                  <span className="muted small">#{i + 1} Hotspot · {r.n.zone}</span>
                  <strong style={{ color: aqiColor(r.p.aqi) }}>
                    {r.n.name} · AQI {r.p.aqi}
                  </strong>
                  <span className="small muted">
                    PM2.5 {r.p.pm25} µg/m³ · Top driver: {r.p.drivers[0]?.label ?? 'Stagnation'}
                  </span>
                </div>
              ))}
              <div className="kpi-stat">
                <span className="muted small">Recommended Municipal Action</span>
                <strong>Priority Smog-Gun &amp; Traffic Curb</strong>
                <span className="small muted">Route water sprinklers &amp; restrict heavy vehicles in {worst.n.name}</span>
              </div>
            </div>
          )}

          {activeTab === 'cleanest' && (
            <div className="kpi-inspector-grid">
              {[...sorted].reverse().slice(0, 3).map((r, i) => (
                <div
                  key={r.n.id}
                  className="kpi-stat clickable"
                  onClick={() => onSelectWard(r.n.id)}
                >
                  <span className="muted small">#{i + 1} Cleanest · {r.n.zone}</span>
                  <strong style={{ color: aqiColor(r.p.aqi) }}>
                    {r.n.name} · AQI {r.p.aqi}
                  </strong>
                  <span className="small muted">
                    PM2.5 {r.p.pm25} µg/m³ · {Math.round(worst.p.pm25 - r.p.pm25)} µg/m³ below hotspot
                  </span>
                </div>
              ))}
              <div className="kpi-stat">
                <span className="muted small">Why Green Buffers Stay Cleaner</span>
                <strong>Canopy Dry Deposition + Lower Traffic</strong>
                <span className="small muted">Best outdoor exercise window: 13:00–16:00 IST</span>
              </div>
            </div>
          )}

          {activeTab === 'meteo' && (
            <div className="kpi-inspector-grid">
              <div className="kpi-stat">
                <span className="muted small">Planetary Boundary Layer (PBL)</span>
                <strong>{Math.round(sample.weather.mixingHeightM)} m height</strong>
                <span className="small muted">
                  {sample.weather.mixingHeightM < 450
                    ? 'Shallow inversion traps surface particulates'
                    : 'Adequate vertical mixing volume'}
                </span>
              </div>
              <div className="kpi-stat">
                <span className="muted small">Surface Wind &amp; Ventilation</span>
                <strong>{sample.weather.windSpeed.toFixed(1)} m/s ({ventilationIndex} m²/s)</strong>
                <span className="small muted">
                  {ventilationIndex < 1000 ? 'Below 1,000 m²/s stagnation threshold' : 'Active horizontal flushing'}
                </span>
              </div>
              <div className="kpi-stat">
                <span className="muted small">Upwind Malwa Paddy Fires</span>
                <strong className="up-text">{sample.fireCount} VIIRS fire detections</strong>
                <span className="small muted">Highest exposure: {agriBelt.n.name} (AQI {agriBelt.p.aqi})</span>
              </div>
              <div className="kpi-stat">
                <span className="muted small">Moisture &amp; Wet Washout</span>
                <strong>{Math.round(sample.weather.humidity)}% RH · {sample.weather.tempC.toFixed(1)} °C</strong>
                <span className="small muted">
                  {sample.weather.rainMm > 0.5 ? `Precipitation washout: ${sample.weather.rainMm.toFixed(1)} mm` : 'No rain washout forecasted'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
