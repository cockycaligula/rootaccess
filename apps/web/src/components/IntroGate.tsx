import { useEffect, useState } from 'react';
import { aqiColor, type Meta, type NeighborhoodForecast } from '@vaayuvision/shared';
import { formatDate } from '../format';

interface Props {
  meta: Meta;
  forecasts: NeighborhoodForecast[];
  onEnter: () => void;
}

export function IntroGate({ meta, forecasts, onEnter }: Props) {
  const [exiting, setExiting] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  const diwaliIdx = Math.max(0, forecasts[0]?.points.findIndex((p) => p.daysFromDiwali === 0) ?? 0);
  const worstOnDiwali = [...forecasts].sort(
    (a, b) => (b.points[diwaliIdx]?.pm25 ?? 0) - (a.points[diwaliIdx]?.pm25 ?? 0),
  )[0];
  const peakPoint = worstOnDiwali?.points[diwaliIdx];

  const triggerEnter = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      onEnter();
    }, 680);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerEnter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exiting]);

  return (
    <div
      className={`intro-gate ${exiting ? 'gate-exit' : ''}`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouse({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <div className="shutter shutter-top" />
      <div className="shutter shutter-bottom" />

      <div
        className="gate-spotlight"
        style={{
          background: `radial-gradient(620px circle at ${mouse.x}% ${mouse.y}%, rgba(244, 162, 97, 0.18), rgba(231, 111, 81, 0.08) 45%, transparent 72%)`,
        }}
      />

      <div className="gate-content">
        <div className="gate-topbar">
          <span className="gate-mono">VaayuVision · Patiala, Punjab</span>
          <span className="gate-mono">Diwali Air Quality &amp; Health Guide</span>
        </div>

        <div className="gate-center">
          <div className="gate-kicker">
            <span className="gate-dot" />
            PERSONALIZED AIR QUALITY &amp; HEALTH ADVISOR
          </div>

          <h1 className="gate-title">
            <span className="gate-title-outline">VAAYU</span>
            <span className="gate-title-solid">VISION</span>
          </h1>

          <p className="gate-sub">
            Clear, area-level air quality predictions and personalized health guidance across 12 Patiala neighborhoods — before, during, and after Diwali.
          </p>

          {peakPoint && worstOnDiwali && (
            <div className="gate-telemetry-strip">
              <div className="gate-tel-item">
                <span className="gate-mono">Diwali Peak ({formatDate(meta.diwaliDate)})</span>
                <strong style={{ color: aqiColor(peakPoint.aqi) }}>AQI {peakPoint.aqi}</strong>
              </div>
              <div className="gate-tel-divider" />
              <div className="gate-tel-item">
                <span className="gate-mono">Peak Area</span>
                <strong>{worstOnDiwali.neighborhood.name}</strong>
              </div>
              <div className="gate-tel-divider" />
              <div className="gate-tel-item">
                <span className="gate-mono">Forecast Window</span>
                <strong>21 Days</strong>
              </div>
            </div>
          )}

          <div className="gate-action-area">
            <button type="button" className="gate-enter-btn" onClick={triggerEnter}>
              <span className="gate-enter-text">Get Started &amp; Enter Health Info</span>
              <span className="gate-enter-arrow">→</span>
            </button>
          </div>
        </div>

        <div className="gate-bottombar">
          <span className="gate-mono">12 Patiala Areas</span>
          <span className="gate-mono">Before · During · After Diwali</span>
          <span className="gate-mono">AI Health &amp; Hotspot Insights</span>
        </div>
      </div>
    </div>
  );
}
