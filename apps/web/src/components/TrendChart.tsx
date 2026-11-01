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
      <ResponsiveContainer width="100%" height={235}>
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(147, 197, 253, 0.14)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} stroke="#b6ccf0" fontSize={11} minTickGap={24} />
          <YAxis stroke="#b6ccf0" fontSize={11} domain={[0, 500]} />
          <Tooltip
            contentStyle={{
              background: 'linear-gradient(145deg, #0d1b3a, #081024)',
              border: '1px solid rgba(96, 165, 250, 0.4)',
              borderRadius: 12,
            }}
            labelFormatter={(d) => formatDate(String(d), true)}
            formatter={(v, name) => [Array.isArray(v) ? `${v[0]}–${v[1]}` : v, name]}
          />
          {[100, 200, 300, 400].map((y) => (
            <ReferenceLine key={y} y={y} stroke="rgba(147, 197, 253, 0.16)" strokeDasharray="2 4" />
          ))}
          <ReferenceLine
            x={diwaliDate}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Diwali', fill: '#fbbf24', fontSize: 11, position: 'top' }}
          />
          <ReferenceLine
            x={selectedDate}
            stroke="#93c5fd"
            strokeWidth={2}
            label={{ value: 'Active Day', fill: '#93c5fd', fontSize: 10, position: 'insideTopRight' }}
          />
          <Area dataKey="band" name="80% range" stroke="none" fill="#3b82f6" fillOpacity={0.22} />
          <Line dataKey="observed" name="Past 30d Observed AQI" stroke="#e2e8f0" dot={false} strokeWidth={2} />
          <Line dataKey="forecast" name="21d Timelapse Forecast" stroke="#60a5fa" dot={false} strokeWidth={2.5} strokeDasharray="5 3" />
          {simulatedPoints?.length ? (
            <Line dataKey="simulated" name="After AI Action Plan" stroke="#34d399" dot={false} strokeWidth={2.5} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
