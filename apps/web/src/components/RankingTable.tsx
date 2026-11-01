import { useState } from 'react';
import { aqiColor, type NeighborhoodForecast } from '@vaayuvision/shared';

interface Props {
  forecasts: NeighborhoodForecast[];
  baselineForecasts: NeighborhoodForecast[];
  isSimActive: boolean;
  dayIndex: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RankingTable({
  forecasts,
  baselineForecasts,
  isSimActive,
  dayIndex,
  selectedId,
  onSelect,
}: Props) {
  const [compareId, setCompareId] = useState<string>('baradari-gardens');

  const rows = forecasts
    .map((f, idx) => ({
      n: f.neighborhood,
      p: f.points[dayIndex],
      baseP: baselineForecasts[idx]?.points[dayIndex],
    }))
    .filter((r) => r.p && r.baseP)
    .sort((a, b) => b.p.aqi - a.p.aqi);

  const selectedRow = rows.find((r) => r.n.id === selectedId) ?? rows[0];
  const compareRow = rows.find((r) => r.n.id === compareId) ?? rows[rows.length - 1];

  return (
    <div>
      {selectedRow && compareRow && (
        <div className="compare-box">
          <div className="compare-head">
            <strong>Area-vs-Area Comparison</strong>
            <select
              className="compare-select"
              value={compareRow.n.id}
              onChange={(e) => setCompareId(e.target.value)}
              aria-label="Compare neighborhood"
            >
              {forecasts.map((f) => (
                <option key={f.neighborhood.id} value={f.neighborhood.id}>
                  vs. {f.neighborhood.name}
                </option>
              ))}
            </select>
          </div>
          <div className="compare-grid">
            <div className="compare-col">
              <span className="muted small">{selectedRow.n.name}</span>
              <strong style={{ color: aqiColor(selectedRow.p.aqi) }}>
                AQI {selectedRow.p.aqi} ({selectedRow.p.pm25} µg/m³)
              </strong>
              <span className="small muted">Traffic {selectedRow.p.trafficIndex.toFixed(2)}×</span>
            </div>
            <div className="compare-vs">
              <span className={selectedRow.p.pm25 >= compareRow.p.pm25 ? 'up-text' : 'down-text'}>
                {selectedRow.p.pm25 >= compareRow.p.pm25 ? '+' : ''}
                {Math.round(selectedRow.p.pm25 - compareRow.p.pm25)} µg/m³
              </span>
              <span className="muted small">PM2.5 diff</span>
            </div>
            <div className="compare-col right">
              <span className="muted small">{compareRow.n.name}</span>
              <strong style={{ color: aqiColor(compareRow.p.aqi) }}>
                AQI {compareRow.p.aqi} ({compareRow.p.pm25} µg/m³)
              </strong>
              <span className="small muted">Traffic {compareRow.p.trafficIndex.toFixed(2)}×</span>
            </div>
          </div>
        </div>
      )}

      <h3>Patiala Neighborhood Hotspot Ranking</h3>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Neighborhood</th>
            <th>AQI</th>
            <th>PM2.5</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ n, p, baseP }, i) => {
            const saved = Math.round(baseP.pm25 - p.pm25);
            return (
              <tr key={n.id} className={n.id === selectedId ? 'selected' : ''} onClick={() => onSelect(n.id)}>
                <td>{i + 1}</td>
                <td>
                  {n.name} <span className="muted small">({n.zone})</span>
                </td>
                <td>
                  <strong className="table-aqi-num">{p.aqi}</strong>
                </td>
                <td>
                  {p.pm25}{' '}
                  {isSimActive && saved > 0 ? <span className="down-text small">(−{saved})</span> : null}
                </td>
                <td>
                  <span
                    className="soft-aqi-badge compact"
                    style={{
                      background: `${aqiColor(p.aqi)}20`,
                      borderColor: `${aqiColor(p.aqi)}55`,
                    }}
                  >
                    <span className="status-dot" style={{ background: aqiColor(p.aqi) }} />
                    <span>{p.category}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
