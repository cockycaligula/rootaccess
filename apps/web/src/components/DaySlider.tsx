import { useEffect, useState } from 'react';
import type { ForecastPoint } from '@vaayuvision/shared';
import { formatDate, phaseLabel } from '../format';

interface Props {
  dates: string[];
  points: ForecastPoint[];
  index: number;
  onChange: (i: number) => void;
}

export function DaySlider({ dates, points, index, onChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const p = points[index];
  const diwaliIdx = points.findIndex((pt) => pt.daysFromDiwali === 0);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      onChange((index + 1) % dates.length);
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing, index, dates.length, onChange]);

  return (
    <div className="day-slider">
      <div className="day-slider-top">
        <div>
          <strong>{formatDate(dates[index], true)}</strong>
          <span className="muted"> · {index === 0 ? 'Today' : `+${index} days`}</span>
          {p && phaseLabel(p.daysFromDiwali) && <span className={`chip phase-${p.phase}`}>{phaseLabel(p.daysFromDiwali)}</span>}
        </div>
        <div className="slider-actions">
          <button
            type="button"
            className={`btn-secondary ${playing ? 'active-play' : ''}`}
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? 'Pause Timelapse' : 'Play 21d Timelapse'}
          </button>
          {index !== 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPlaying(false);
                onChange(0);
              }}
            >
              Today
            </button>
          )}
          {diwaliIdx >= 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPlaying(false);
                onChange(diwaliIdx);
              }}
            >
              Jump to Diwali night
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={dates.length - 1}
        value={index}
        onChange={(e) => {
          setPlaying(false);
          onChange(Number(e.target.value));
        }}
        aria-label="Forecast day"
      />
    </div>
  );
}
