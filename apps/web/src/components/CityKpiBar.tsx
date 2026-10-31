import { useState } from 'react';
import { aqiColor, type NeighborhoodForecast } from '@vaayuvision/shared';
import { buildPollutantMetrics } from '../context/UserPreferencesContext';

interface Props {
  baselineForecasts: NeighborhoodForecast[];
  activeForecasts: NeighborhoodForecast[];
  dayIndex: number;
  gpsCoords: { lat: number; lng: number; live: boolean };
  onSelectWard: (id: string) => void;
}

type InspectModal = 'best' | 'worst' | null;

/** Haversine distance in kilometers between two GPS coordinates. */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GOOD_REASONS: Record<string, string[]> = {
  'baradari-gardens': [
    'Dense heritage botanical canopy absorbs fine particulates (PM2.5 & PM10) via natural dry deposition.',
    'Low vehicle traffic (~820 vehicles/hr) keeps nitrogen dioxide (NO₂) exhaust minimal.',
    'Strict green-buffer zone prevents heavy firecracker and industrial smoke accumulation.',
    'Open park geometry allows stronger wind flow to flush out evening air stagnation.',
  ],
  'punjabi-uni': [
    'Large institutional green campus acts as a natural buffer against city traffic fumes.',
    'Low internal vehicle density (~980 vehicles/hr) and wide tree-lined avenues.',
    'Minimal firecracker activity (0.75× index) compared to dense commercial markets.',
    'Higher afternoon boundary-layer ventilation keeps surface air fresh.',
  ],
};

const BAD_REASONS: Record<string, string[]> = {
  'adalat-bazar': [
    'Narrow Old-City bazaar street canyons trap smoke and prevent wind from dispersing pollutants.',
    'Heavy festive shopper & two-wheeler congestion (~2,300 vehicles/hr) releases high NO₂ and soot.',
    'Highest firecracker bursting intensity in Patiala (1.35× index) spikes evening PM2.5.',
    'Low night-time mixing height traps commercial and residential emissions near ground level.',
  ],
  'focal-point': [
    'Continuous industrial foundry emissions and heavy diesel freight trucks (~2,100/hr).',
    'High resuspended road dust drives severe coarse PM10 and fine PM2.5 concentrations.',
    'Direct northeast exposure to upwind Malwa paddy-stubble smoke plumes (1.05× index).',
    'Evening temperature inversion traps industrial exhaust close to the surface.',
  ],
  tripuri: [
    'High-density residential rooftop firecracker bursting (1.30× index) during festival nights.',
    'Heavy market corridor congestion (~1,950 vehicles/hr) along Tripuri Main Road.',
    'Direct inflow of northern Sirhind bypass agricultural crop-residue smoke.',
    'Slow morning wind speeds delay dispersion of overnight smoke buildup.',
  ],
};

export function CityKpiBar({
  baselineForecasts,
  activeForecasts,
  dayIndex,
  gpsCoords,
  onSelectWard,
}: Props) {
  const [modal, setModal] = useState<InspectModal>(null);

  const rows = activeForecasts
    .map((f, idx) => {
      const dist = distanceKm(gpsCoords.lat, gpsCoords.lng, f.neighborhood.lat, f.neighborhood.lng);
      return {
        n: f.neighborhood,
        p: f.points[dayIndex] ?? f.points[0],
        baseP: baselineForecasts[idx]?.points[dayIndex] ?? baselineForecasts[idx]?.points[0],
        distKm: dist,
      };
    })
    .filter((r) => r.p && r.baseP && r.distKm <= 50);

  if (!rows.length) return null;

  const sortedByWorst = [...rows].sort((a, b) => b.p.aqi - a.p.aqi);
  const worst = sortedByWorst[0];
  const best = sortedByWorst[sortedByWorst.length - 1];

  const bestMetrics = buildPollutantMetrics(best.n, best.p);
  const worstMetrics = buildPollutantMetrics(worst.n, worst.p);

  const whyGoodList = GOOD_REASONS[best.n.id] ?? [
    `Lower traffic congestion (${best.p.trafficIndex.toFixed(2)}×) reduces vehicular NO₂ (${bestMetrics.no2} µg/m³).`,
    `Higher green cover and open layout allow better wind dispersion (${best.p.weather.windSpeed.toFixed(1)} m/s).`,
    `${Math.round(worst.p.pm25 - best.p.pm25)} µg/m³ lower PM2.5 particulate load than the worst hotspot.`,
    `Lower local firecracker and industrial emission density within 50 km of your GPS.`,
  ];

  const whyBadList = BAD_REASONS[worst.n.id] ?? [
    `High traffic congestion (${worst.p.trafficIndex.toFixed(2)}×) and vehicular NO₂ exhaust (${worstMetrics.no2} µg/m³).`,
    `Upwind Malwa crop-fire smoke (${worst.p.fireCount} fires) combines with local festival emissions.`,
    `Shallow mixing height (${Math.round(worst.p.weather.mixingHeightM)} m) traps particulates near the ground.`,
    `PM2.5 is ${worst.p.pm25} µg/m³ (${Math.round(worst.p.pm25 - best.p.pm25)} µg/m³ higher than ${best.n.name}).`,
  ];

  return (
    <div className="kpi-section">
      <div className="section-label-row">
        <span className="section-kicker">SECTION 01 · 50 KM GPS RADIUS SCAN</span>
        <span className="muted small">
          Your GPS: {gpsCoords.lat.toFixed(3)}°N, {gpsCoords.lng.toFixed(3)}°E · Click either card to see why
        </span>
      </div>

      {/* Only Best and Worst Area Cards — Clean & Clickable */}
      <section className="kpi-bar two-col">
        <button
          type="button"
          className="kpi-card clickable best-card"
          onClick={() => {
            onSelectWard(best.n.id);
            setModal('best');
          }}
        >
          <div className="kpi-top">
            <span className="dataset-tag" style={{ color: '#74c69d' }}>
              BEST AQI WITHIN 50 KM ({best.distKm.toFixed(1)} KM AWAY)
            </span>
            <span className="kpi-pill" style={{ background: aqiColor(best.p.aqi), color: '#18100c' }}>
              AQI {best.p.aqi} · {best.p.category}
            </span>
          </div>
          <div className="kpi-main">
            <strong>{best.n.name}</strong>
          </div>
          <span className="small muted">Click to see why it is good →</span>
        </button>

        <button
          type="button"
          className="kpi-card clickable worst-card"
          onClick={() => {
            onSelectWard(worst.n.id);
            setModal('worst');
          }}
        >
          <div className="kpi-top">
            <span className="dataset-tag" style={{ color: '#ff9b80' }}>
              WORST AQI WITHIN 50 KM ({worst.distKm.toFixed(1)} KM AWAY)
            </span>
            <span className="kpi-pill" style={{ background: aqiColor(worst.p.aqi), color: '#18100c' }}>
              AQI {worst.p.aqi} · {worst.p.category}
            </span>
          </div>
          <div className="kpi-main">
            <strong>{worst.n.name}</strong>
          </div>
          <span className="small muted">Click to see why it is bad →</span>
        </button>
      </section>

      {/* Dialog Box Explaining Why It Is Good / Why It Is Bad */}
      {modal && (
        <div className="pref-modal-backdrop" onClick={() => setModal(null)} role="dialog" aria-modal="true">
          <div className="pref-modal detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pref-modal-header">
              <div>
                <span className="pref-kicker">
                  {modal === 'best'
                    ? `BEST AQI WITHIN 50 KM · ${best.distKm.toFixed(1)} KM FROM YOUR GPS`
                    : `WORST AQI WITHIN 50 KM · ${worst.distKm.toFixed(1)} KM FROM YOUR GPS`}
                </span>
                <h2>
                  {modal === 'best'
                    ? `Why ${best.n.name} Has Good Air Quality (AQI ${best.p.aqi})`
                    : `Why ${worst.n.name} Has Bad Air Quality (AQI ${worst.p.aqi})`}
                </h2>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
                Close ✕
              </button>
            </div>

            {modal === 'best' && (
              <div className="dialog-body">
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag" style={{ color: '#74c69d' }}>CURRENT AIR QUALITY</span>
                    <strong style={{ color: aqiColor(best.p.aqi), fontSize: '1.25rem' }}>
                      AQI {best.p.aqi} ({best.p.category})
                    </strong>
                    <span className="small muted">
                      PM2.5: {bestMetrics.pm25} µg/m³ · PM10: {bestMetrics.pm10} µg/m³ · NO₂: {bestMetrics.no2} µg/m³
                    </span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">DISTANCE FROM YOUR GPS</span>
                    <strong>{best.distKm.toFixed(1)} km away (Within 50 km radius)</strong>
                    <span className="small muted">
                      {Math.round(worst.p.pm25 - best.p.pm25)} µg/m³ cleaner than {worst.n.name}
                    </span>
                  </div>
                </div>

                <h3>Why It Is Good:</h3>
                <ul className="reason-list good-list">
                  {whyGoodList.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {modal === 'worst' && (
              <div className="dialog-body">
                <div className="dialog-grid-2">
                  <div className="dialog-stat-card">
                    <span className="dataset-tag" style={{ color: '#ff9b80' }}>CURRENT AIR QUALITY</span>
                    <strong style={{ color: aqiColor(worst.p.aqi), fontSize: '1.25rem' }}>
                      AQI {worst.p.aqi} ({worst.p.category})
                    </strong>
                    <span className="small muted">
                      PM2.5: {worstMetrics.pm25} µg/m³ · PM10: {worstMetrics.pm10} µg/m³ · NO₂: {worstMetrics.no2} µg/m³
                    </span>
                  </div>
                  <div className="dialog-stat-card">
                    <span className="dataset-tag">DISTANCE FROM YOUR GPS</span>
                    <strong>{worst.distKm.toFixed(1)} km away (Within 50 km radius)</strong>
                    <span className="small muted">
                      Zone: {worst.n.zone} · Traffic: {worst.p.trafficIndex.toFixed(2)}×
                    </span>
                  </div>
                </div>

                <h3>Why It Is Bad:</h3>
                <ul className="reason-list bad-list">
                  {whyBadList.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
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
