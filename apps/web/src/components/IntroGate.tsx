import { useEffect, useState } from 'react';
import { aqiColor, type NeighborhoodForecast } from '@vaayuvision/shared';

interface Props {
  gpsForecast: NeighborhoodForecast;
  gpsCoords: { lat: number; lng: number; live: boolean };
  onEnter: () => void;
}

export function IntroGate({ gpsForecast, gpsCoords, onEnter }: Props) {
  const [exiting, setExiting] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  // Current day's AQI data (index 0 = today's live AQI, not Diwali peak)
  const currentPoint = gpsForecast.points[0];

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
          background: `radial-gradient(720px circle at ${mouse.x}% ${mouse.y}%, rgba(96, 165, 250, 0.28), rgba(37, 99, 235, 0.14) 45%, transparent 72%)`,
        }}
      />

      <div className="gate-content">
        <div className="gate-topbar">
          <span className="gate-mono">Patiala, Punjab</span>
          <span className="gate-mono">
            {gpsCoords.live ? 'Live GPS Location Active' : 'GPS Area: Patiala'} · {gpsCoords.lat.toFixed(4)}° N,{' '}
            {gpsCoords.lng.toFixed(4)}° E
          </span>
        </div>

        <div className="gate-center">
          {/* Clean Blue Geometric Emblem + Refined Brand Mark */}
          <div className="brand-hero">
            <div className="brand-emblem" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="58" height="58" fill="none">
                <circle cx="32" cy="32" r="28" stroke="url(#blueGrad)" strokeWidth="2" strokeOpacity="0.45" />
                <circle cx="32" cy="32" r="20" stroke="url(#blueGrad)" strokeWidth="2" strokeOpacity="0.75" />
                <path
                  d="M16 34C22 26 28 26 32 32C36 38 42 38 48 30"
                  stroke="url(#blueGrad)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M20 41C25 35 30 35 34 39C38 43 42 42 46 37"
                  stroke="#60a5fa"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeOpacity="0.85"
                />
                <circle cx="32" cy="21" r="4" fill="#60a5fa" />
                <defs>
                  <linearGradient id="blueGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#bfdbfe" />
                    <stop offset="0.5" stopColor="#60a5fa" />
                    <stop offset="1" stopColor="#2563eb" />
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
            Live air quality &amp; health guidance for your current GPS location using neighborhood traffic, firecracker, and weather data.
          </p>

          {currentPoint && (
            <div className="gate-telemetry-strip">
              <div className="gate-tel-item">
                <span className="gate-mono">Current GPS Area ({gpsCoords.lat.toFixed(3)}°N, {gpsCoords.lng.toFixed(3)}°E)</span>
                <strong>{gpsForecast.neighborhood.name}</strong>
              </div>
              <div className="gate-tel-divider" />
              <div className="gate-tel-item">
                <span className="gate-mono">Current Live AQI</span>
                <strong style={{ color: aqiColor(currentPoint.aqi) }}>
                  AQI {currentPoint.aqi} ({currentPoint.category}) · {currentPoint.pm25} µg/m³
                </strong>
              </div>
            </div>
          )}

          <div className="gate-action-area">
            <button type="button" className="gate-enter-btn" onClick={triggerEnter}>
              <span className="gate-enter-text">Enter &amp; Personalize Health Guide</span>
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
