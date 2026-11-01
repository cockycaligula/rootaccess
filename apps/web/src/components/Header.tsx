import { useEffect, useState } from 'react';
import type { ForecastPoint, Meta } from '@vaayuvision/shared';
import { formatDate, phaseLabel } from '../format';
import { useUserPreferences } from '../context/UserPreferencesContext';

export type ViewStage = 'radar' | 'simulator' | 'matrix' | 'community' | 'all';

const STAGES: Array<{ id: ViewStage; code: string; label: string }> = [
  { id: 'radar', code: '01', label: 'Map & Forecast' },
  { id: 'simulator', code: '02', label: 'AI Hotspot Insights' },
  { id: 'matrix', code: '03', label: 'Area Comparison & AI' },
  { id: 'community', code: '04', label: 'Community Alerts' },
];

const PHASE_TEXT: Record<Meta['phase'], string> = {
  normal: 'Regular season',
  before: 'Pre-Diwali build-up',
  during: 'Diwali Peak',
  after: 'Post-Diwali recovery',
};

interface Props {
  meta: Meta;
  stage: ViewStage;
  onStageChange: (stage: ViewStage) => void;
  dates: string[];
  points: ForecastPoint[];
  dayIndex: number;
  onDayChange: (index: number) => void;
  onLockGate?: () => void;
  drawerOpen?: boolean;
  onToggleDrawer?: () => void;
}

export function Header({
  meta,
  stage,
  onStageChange,
  dates,
  points,
  dayIndex,
  onDayChange,
  onLockGate,
  drawerOpen,
  onToggleDrawer,
}: Props) {
  const { profile, openModal } = useUserPreferences();
  const [playing, setPlaying] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  const p = points[dayIndex];
  const diwaliIdx = points.findIndex((pt) => pt.daysFromDiwali === 0);

  useEffect(() => {
    if (!playing || !dates.length) return;
    const timer = window.setInterval(() => {
      onDayChange((dayIndex + 1) % dates.length);
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing, dayIndex, dates.length, onDayChange]);

  const countdown =
    meta.daysToDiwali > 0
      ? `Diwali in ${meta.daysToDiwali}d`
      : meta.daysToDiwali === 0
        ? 'Diwali Today'
        : `${-meta.daysToDiwali}d post-Diwali`;

  const profileLabel = profile.name
    ? `${profile.name}${profile.conditions.length ? ` (${profile.conditions.length})` : ''}`
    : profile.conditions.length
      ? `Health Profile (${profile.conditions.length})`
      : 'Health Profile';

  return (
    <header className="command-dock" aria-label="Unified Command Dock">
      {/* Top Row: Brand + Numbered Section Segmented Bar + Status & Profile Pills */}
      <div className="dock-row-main">
        <div className="dock-brand">
          <div className="dock-brand-mark" aria-hidden="true">
            <span className="dock-brand-dot" />
          </div>
          <div className="dock-brand-text">
            <span className="dock-brand-title">VaayuVision</span>
            <span className="dock-brand-sub">Patiala Air Intelligence</span>
          </div>
          <span className={`dock-status-pill phase-${meta.phase}`}>
            <span className="status-dot-mini" />
            {PHASE_TEXT[meta.phase]} · {countdown}
          </span>
        </div>

        <nav className="dock-nav-segments" aria-label="Dashboard Sections">
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`dock-segment-btn ${stage === s.id ? 'active' : ''}`}
              onClick={() => onStageChange(s.id)}
            >
              <span className="dock-segment-code">{s.code}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="dock-actions">
          {onToggleDrawer && (
            <button
              type="button"
              className={`dock-btn accent ${drawerOpen ? 'active' : ''}`}
              onClick={onToggleDrawer}
            >
              {drawerOpen ? 'Close Deep Dive ✕' : 'Inspect Area ▸'}
            </button>
          )}
          <button type="button" className="dock-btn" onClick={openModal}>
            {profileLabel}
          </button>
          {onLockGate && (
            <button type="button" className="dock-btn" onClick={onLockGate}>
              Intro
            </button>
          )}
          <button
            type="button"
            className={`dock-btn icon-toggle ${timelineExpanded ? 'active' : ''}`}
            onClick={() => setTimelineExpanded((v) => !v)}
            title={timelineExpanded ? 'Collapse Timeline Controls' : 'Expand Timeline Controls'}
          >
            {timelineExpanded ? 'Hide Timeline ▲' : '21d Timeline ▼'}
          </button>
        </div>
      </div>

      {/* Bottom Row: Integrated 21-Day Timeline Scrubber & Playback Controls */}
      {timelineExpanded && dates.length > 0 && (
        <div className="dock-row-timeline">
          <div className="timeline-date-readout">
            <strong className="timeline-date-text">{formatDate(dates[dayIndex], true)}</strong>
            <span className="timeline-offset-tag">
              {dayIndex === 0 ? 'Live Today' : `+${dayIndex}d Forecast`}
            </span>
            {p && phaseLabel(p.daysFromDiwali) && (
              <span className={`dock-status-pill phase-${p.phase}`}>
                {phaseLabel(p.daysFromDiwali)}
              </span>
            )}
          </div>

          <div className="timeline-scrubber-wrap">
            <input
              type="range"
              className="dock-range-slider"
              min={0}
              max={dates.length - 1}
              value={dayIndex}
              onChange={(e) => {
                setPlaying(false);
                onDayChange(Number(e.target.value));
              }}
              aria-label="21-day forecast timeline"
            />
          </div>

          <div className="timeline-btn-cluster">
            <button
              type="button"
              className={`dock-btn ${playing ? 'active-play' : ''}`}
              onClick={() => setPlaying((v) => !v)}
            >
              {playing ? '⏸ Pause Timelapse' : '▶ Play 21d Timelapse'}
            </button>
            {dayIndex !== 0 && (
              <button
                type="button"
                className="dock-btn"
                onClick={() => {
                  setPlaying(false);
                  onDayChange(0);
                }}
              >
                Today
              </button>
            )}
            {diwaliIdx >= 0 && (
              <button
                type="button"
                className={`dock-btn accent ${dayIndex === diwaliIdx ? 'active' : ''}`}
                onClick={() => {
                  setPlaying(false);
                  onDayChange(diwaliIdx);
                }}
              >
                Jump to Diwali Night
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
