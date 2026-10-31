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
    }, 620);
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
          <span className="gate-mono">Patiala, Punjab</span>
          <span className="gate-mono">AI Air Quality &amp; Health Guide</span>
        </div>

        <div className="gate-center">
          {/* Clean Warm Geometric Emblem + Refined Brand Mark */}
          <div className="brand-hero">
            <div className="brand-emblem" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="58" height="58" fill="none">
                <circle cx="32" cy="32" r="28" stroke="url(#warmGrad)" strokeWidth="2" strokeOpacity="0.45" />
                <circle cx="32" cy="32" r="20" stroke="url(#warmGrad)" strokeWidth="2" strokeOpacity="0.75" />
                <path
                  d="M16 34C22 26 28 26 32 32C36 38 42 38 48 30"
                  stroke="url(#warmGrad)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M20 41C25 35 30 35 34 39C38 43 42 42 46 37"
                  stroke="#f4a261"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeOpacity="0.8"
                />
                <circle cx="32" cy="21" r="4" fill="#f4a261" />
                <defs>
                  <linearGradient id="warmGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f8d49d" />
                    <stop offset="0.5" stopColor="#f4a261" />
                    <stop offset="1" stopColor="#e76f51" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="brand-kicker">PATIALA NEIGHBORHOOD AIR INTELLIGENCE</div>
            <h1 className="brand-wordmark">
              Vaayu<span>Vision</span>
            </h1>
          </div>

          <p className="gate-sub">
            AI-powered air quality predictions using neighborhood traffic, firecracker, and weather data — personalized to your health profile.
          </p>

          {peakPoint && worstOnDiwali && (
            <div className="gate-telemetry-strip">
              <div className="gate-tel-item">
                <span className="gate-mono">Diwali Peak ({formatDate(meta.diwaliDate)})</span>
                <strong style={{ color: aqiColor(peakPoint.aqi) }}>AQI {peakPoint.aqi}</strong>
              </div>
              <div className="gate-tel-divider" />
              <div className="gate-tel-item">
                <span className="gate-mono">Hotspot Area</span>
                <strong>{worstOnDiwali.neighborhood.name}</strong>
              </div>
              <div className="gate-tel-divider" />
              <div className="gate-tel-item">
                <span className="gate-mono">AI Forecast</span>
                <strong>21 Days</strong>
              </div>
            </div>
          )}

          <div className="gate-action-area">
            <button type="button" className="gate-enter-btn" onClick={triggerEnter}>
              <span className="gate-enter-text">Enter &amp; Personalize Your Forecast</span>
              <span className="gate-enter-arrow">→</span>
            </button>
          </div>
        </div>

        <div className="gate-bottombar">
          <span className="gate-mono">12 Patiala Areas</span>
          <span className="gate-mono">Traffic · Firecrackers · Weather · Crop Smoke</span>
          <span className="gate-mono">Personalized AI Health Advisor</span>
        </div>
      </div>
    </div>
  );
}
