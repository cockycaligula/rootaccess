import { useEffect, useState } from 'react';
import { aqiColor, type Meta, type NeighborhoodForecast } from '@vaayuvision/shared';
import { formatDate } from '../format';

interface Props {
  meta: Meta;
  forecasts: NeighborhoodForecast[];
  onEnter: () => void;
}

export function IntroGate({ meta, forecasts, onEnter }: Props) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  // Find Diwali peak across Patiala
  const diwaliIdx = Math.max(0, forecasts[0]?.points.findIndex((p) => p.daysFromDiwali === 0) ?? 0);
  const worstOnDiwali = [...forecasts].sort(
    (a, b) => (b.points[diwaliIdx]?.pm25 ?? 0) - (a.points[diwaliIdx]?.pm25 ?? 0),
  )[0];
  const peakPoint = worstOnDiwali?.points[diwaliIdx];

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1350;
    const tick = (now: number) => {
      const p = Math.min(100, Math.round(((now - start) / duration) * 100));
      setProgress(p);
      if (p < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        setReady(true);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const triggerEnter = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      onEnter();
    }, 820);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && ready) {
        e.preventDefault();
        triggerEnter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, exiting]);

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
      {/* Shutter panels that slide apart on exit */}
      <div className="shutter shutter-top" />
      <div className="shutter shutter-bottom" />

      {/* Interactive cursor spotlight + topographic contour SVG */}
      <div
        className="gate-spotlight"
        style={{
          background: `radial-gradient(600px circle at ${mouse.x}% ${mouse.y}%, rgba(255, 179, 71, 0.13), rgba(124, 156, 255, 0.06) 40%, transparent 70%)`,
        }}
      />
      <svg className="gate-topo" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1">
          <path d="M-100,180 C320,90 540,310 920,210 C1180,140 1350,260 1560,170" />
          <path d="M-100,320 C280,210 610,430 980,310 C1210,235 1380,380 1560,290" />
          <path d="M-100,470 C240,360 660,570 1040,430 C1260,350 1390,510 1560,420" />
          <path d="M-100,620 C300,520 700,710 1090,560 C1300,480 1410,640 1560,560" />
          <path d="M-100,760 C350,670 740,830 1140,700 C1330,630 1430,770 1560,700" />
          <circle cx="720" cy="450" r="220" stroke="rgba(255, 179, 71, 0.07)" strokeDasharray="4 8" />
          <circle cx="720" cy="450" r="360" stroke="rgba(124, 156, 255, 0.06)" />
          <circle cx="720" cy="450" r="510" stroke="rgba(255, 255, 255, 0.04)" />
        </g>
      </svg>

      <div className="gate-content">
        <div className="gate-topbar">
          <span className="gate-mono">SYS // VAAYUVISION.PATIALA.v2</span>
          <span className="gate-mono">COORDS // 30.3398° N, 76.3869° E</span>
          <span className="gate-mono">STATUS // {ready ? 'TELEMETRY LOCKED' : `CALIBRATING ${progress}%`}</span>
        </div>

        <div className="gate-center">
          <div className="gate-kicker">
            <span className="gate-dot" />
            NEIGHBORHOOD-LEVEL DIWALI AIR QUALITY INTELLIGENCE · PATIALA, PUNJAB
          </div>

          <h1 className="gate-title">
            <span className="gate-title-outline">VAAYU</span>
            <span className="gate-title-solid">VISION</span>
          </h1>

          <p className="gate-sub">
            21-day recursive PM2.5 &amp; CPCB AQI forecasting across 12 Patiala sectors — modeling Diwali firecracker
            uplift, Malwa paddy-stubble plumes, and winter boundary-layer inversions.
          </p>

          {peakPoint && worstOnDiwali && (
            <div className="gate-telemetry-strip">
              <div className="gate-tel-item">
                <span className="gate-mono">UPCOMING DIWALI PEAK ({formatDate(meta.diwaliDate).toUpperCase()})</span>
                <strong style={{ color: aqiColor(peakPoint.aqi) }}>
                  AQI {peakPoint.aqi} · {peakPoint.pm25} µg/m³
                </strong>
              </div>
              <div className="gate-tel-divider" />
              <div className="gate-tel-item">
                <span className="gate-mono">PRIMARY HOTSPOT SECTOR</span>
                <strong>{worstOnDiwali.neighborhood.name}</strong>
              </div>
              <div className="gate-tel-divider" />
              <div className="gate-tel-item">
                <span className="gate-mono">FORECAST HORIZON</span>
                <strong>{meta.horizonDays} DAYS · 80% CI</strong>
              </div>
            </div>
          )}

          <div className="gate-action-area">
            {!ready ? (
              <div className="gate-loader-bar">
                <div className="gate-loader-fill" style={{ width: `${progress}%` }} />
              </div>
            ) : (
              <button type="button" className="gate-enter-btn" onClick={triggerEnter}>
                <span className="gate-enter-text">ENTER COMMAND CENTER</span>
                <span className="gate-enter-arrow">→</span>
              </button>
            )}
            <span className="gate-mono gate-hint">
              {ready ? 'PRESS [ENTER] OR CLICK TO UNLOCK LIVE TELEMETRY' : `TRAINING L2 RIDGE MODEL ON 21,084 WARD-DAYS... ${progress}%`}
            </span>
          </div>
        </div>

        <div className="gate-bottombar">
          <span className="gate-mono">12 PATIALA SECTORS</span>
          <span className="gate-mono">BEFORE · DURING · AFTER DIWALI</span>
          <span className="gate-mono">EXPLAINABLE AI + COUNTERFACTUAL POLICY ENGINE</span>
        </div>
      </div>
    </div>
  );
}
