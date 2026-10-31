import { aqiColor, type NeighborhoodForecast } from '@vaayuvision/shared';

interface Props {
  forecasts: NeighborhoodForecast[];
  dayIndex: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RankingTable({ forecasts, dayIndex, selectedId, onSelect }: Props) {
  const rows = forecasts
    .map((f) => ({ n: f.neighborhood, p: f.points[dayIndex] }))
    .filter((r) => r.p)
    .sort((a, b) => b.p.aqi - a.p.aqi);
  return (
    <div>
      <h3>Neighborhood ranking</h3>
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
          {rows.map(({ n, p }, i) => (
            <tr key={n.id} className={n.id === selectedId ? 'selected' : ''} onClick={() => onSelect(n.id)}>
              <td>{i + 1}</td>
              <td>{n.name}</td>
              <td>
                <span className="dot" style={{ background: aqiColor(p.aqi) }} />
                {p.aqi}
              </td>
              <td>{p.pm25}</td>
              <td>{p.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
