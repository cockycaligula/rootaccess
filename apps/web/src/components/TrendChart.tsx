import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyObservation, ForecastPoint } from '@vaayuvision/shared';
import { formatDate } from '../format';

interface Props {
  history: DailyObservation[];
  points: ForecastPoint[];
  simulatedPoints?: ForecastPoint[] | null;
  selectedDate: string;
  diwaliDate: string;
}

interface Row {
  date: string;
  observed?: number;
  forecast?: number;
  simulated?: number;
  band?: [number, number];
}

export function TrendChart({ history, points, simulatedPoints, selectedDate, diwaliDate }: Props) {
  const data: Row[] = history.map((h) => ({ date: h.date, observed: h.aqi }));
  // Connect the observed line to the forecast line.
  if (data.length && points.length) {
    data[data.length - 1].forecast = data[data.length - 1].observed;
    if (simulatedPoints?.length) data[data.length - 1].simulated = data[data.length - 1].observed;
  }
  points.forEach((p, i) => {
    data.push({
      date: p.date,
      forecast: p.aqi,
      simulated: simulatedPoints?.[i]?.aqi,
      band: [p.aqiLow, p.aqiHigh],
    });
  });

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#2a3140" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} stroke="#8b95a7" fontSize={11} minTickGap={24} />
          <YAxis stroke="#8b95a7" fontSize={11} domain={[0, 500]} />
          <Tooltip
            contentStyle={{ background: '#151a23', border: '1px solid #2a3140' }}
            labelFormatter={(d) => formatDate(String(d), true)}
            formatter={(v, name) => [Array.isArray(v) ? `${v[0]}–${v[1]}` : v, name]}
          />
          {[100, 200, 300, 400].map((y) => (
            <ReferenceLine key={y} y={y} stroke="#3a4252" strokeDasharray="2 4" />
          ))}
          <ReferenceLine x={diwaliDate} stroke="#ffb347" label={{ value: 'Diwali', fill: '#ffb347', fontSize: 11, position: 'top' }} />
          <ReferenceLine x={selectedDate} stroke="#ffffff" strokeOpacity={0.5} />
          <Area dataKey="band" name="80% range" stroke="none" fill="#7c9cff" fillOpacity={0.2} />
          <Line dataKey="observed" name="Observed AQI" stroke="#e2e8f0" dot={false} strokeWidth={2} />
          <Line dataKey="forecast" name="Baseline Forecast" stroke="#7c9cff" dot={false} strokeWidth={2} strokeDasharray="5 3" />
          {simulatedPoints?.length ? (
            <Line dataKey="simulated" name="With Policy Intervention" stroke="#4fb38a" dot={false} strokeWidth={2.5} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
