import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { pm25ToAqi, type ForecastPoint } from '@vaayuvision/shared';

interface Props {
  point: ForecastPoint;
  simulatedPoint?: ForecastPoint | null;
}

interface HourRow {
  hour: string;
  aqi: number;
  pm25: number;
  simAqi?: number;
}

/**
 * Physical diurnal profile of PM2.5 across 24 hours:
 * - Morning rush + shallow boundary layer (07:00–10:00)
 * - Afternoon solar heating lifts the boundary layer (13:00–16:00 -> cleanest window)
 * - Evening traffic + nocturnal inversion + Diwali firecracker burst (19:00–01:00 -> peak hazard)
 */
function buildHourlyProfile(p: ForecastPoint, simP?: ForecastPoint | null): HourRow[] {
  const isDiwaliPeak = p.daysFromDiwali === 0 || p.daysFromDiwali === -1;
  const isPostDiwaliMorning = p.daysFromDiwali === 1;

  const rawMultipliers = Array.from({ length: 24 }, (_, hr) => {
    const morningRush = 0.18 * Math.exp(-(((hr - 8.5) / 2.2) ** 2));
    const afternoonVentilation = -0.32 * Math.exp(-(((hr - 14.5) / 2.8) ** 2));
    const eveningInversion = 0.22 * Math.exp(-(((hr - 21) / 3.5) ** 2));
    const nightCarry = hr <= 5 ? 0.15 * Math.exp(-((hr / 3.5) ** 2)) : 0;

    let fireworkBurst = 0;
    if (isDiwaliPeak && hr >= 18) {
      fireworkBurst = 0.85 * Math.exp(-(((hr - 21.5) / 2.3) ** 2));
    } else if (isPostDiwaliMorning && hr <= 6) {
      fireworkBurst = 0.55 * Math.exp(-(((hr - 1.0) / 3.0) ** 2));
    }
    return Math.max(0.45, 1 + morningRush + afternoonVentilation + eveningInversion + nightCarry + fireworkBurst);
  });

  // Normalize so the 24-hour mean equals the daily predicted PM2.5
  const meanMult = rawMultipliers.reduce((a, b) => a + b, 0) / 24;
  return rawMultipliers.map((m, hr) => {
    const norm = m / meanMult;
    const pm25 = Math.round(p.pm25 * norm * 10) / 10;
    const simPm25 = simP ? Math.round(simP.pm25 * norm * 10) / 10 : undefined;
    return {
      hour: `${String(hr).padStart(2, '0')}:00`,
      pm25,
      aqi: pm25ToAqi(pm25),
      simAqi: simPm25 !== undefined ? pm25ToAqi(simPm25) : undefined,
    };
  });
}

export function HourlyChart({ point, simulatedPoint }: Props) {
  const rows = buildHourlyProfile(point, simulatedPoint);
  const cleanest = [...rows].sort((a, b) => a.aqi - b.aqi)[0];
  const worst = [...rows].sort((a, b) => b.aqi - a.aqi)[0];

  return (
    <div className="chart">
      <div className="intraday-summary">
        <span className="intraday-tag safe">
          Best Outdoor Window: <strong>13:00–16:00</strong> (AQI ~{cleanest.aqi})
        </span>
        <span className="intraday-tag hazard">
          Peak Exposure Hour: <strong>{worst.hour}</strong> (AQI {worst.aqi} · {worst.pm25} µg/m³)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={215}>
        <ComposedChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(147, 197, 253, 0.14)" strokeDasharray="3 3" />
          <XAxis dataKey="hour" stroke="#b6ccf0" fontSize={11} interval={2} />
          <YAxis stroke="#b6ccf0" fontSize={11} domain={[0, 500]} />
          <Tooltip
            contentStyle={{
              background: 'linear-gradient(145deg, #0d1b3a, #081024)',
              border: '1px solid rgba(96, 165, 250, 0.4)',
              borderRadius: 12,
            }}
            formatter={(v, name) => [v, name]}
          />
          <ReferenceArea x1="13:00" x2="16:00" fill="#34d399" fillOpacity={0.1} />
          <ReferenceArea x1="19:00" x2="23:00" fill="#f87171" fillOpacity={0.1} />
          {[100, 200, 300, 400].map((y) => (
            <ReferenceLine key={y} y={y} stroke="rgba(147, 197, 253, 0.16)" strokeDasharray="2 4" />
          ))}
          <Area dataKey="aqi" name="Hourly AQI" stroke="#60a5fa" fill="#3b82f6" fillOpacity={0.24} strokeWidth={2.2} />
          {simulatedPoint ? (
            <Line dataKey="simAqi" name="After AI Action Plan" stroke="#34d399" dot={false} strokeWidth={2.5} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
