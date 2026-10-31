import type { ForecastPoint } from '@airsense/shared';
import { formatDate, phaseLabel } from '../format';

interface Props {
  dates: string[];
  points: ForecastPoint[];
  index: number;
  onChange: (i: number) => void;
}

export function DaySlider({ dates, points, index, onChange }: Props) {
  const p = points[index];
  const diwaliIdx = points.findIndex((pt) => pt.daysFromDiwali === 0);
  return (
    <div className="day-slider">
      <div className="day-slider-top">
        <div>
          <strong>{formatDate(dates[index], true)}</strong>
          <span className="muted"> · {index === 0 ? 'Today' : `+${index} days`}</span>
          {p && phaseLabel(p.daysFromDiwali) && <span className={`chip phase-${p.phase}`}>{phaseLabel(p.daysFromDiwali)}</span>}
        </div>
        {diwaliIdx >= 0 && (
          <button className="btn" onClick={() => onChange(diwaliIdx)}>
            Jump to Diwali night
          </button>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={dates.length - 1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Forecast day"
      />
    </div>
  );
}
