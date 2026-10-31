import type { Meta } from '@airsense/shared';
import { formatDate } from '../format';

const PHASE_TEXT: Record<Meta['phase'], string> = {
  normal: 'Regular season',
  before: 'Pre-Diwali build-up',
  during: 'Diwali',
  after: 'Post-Diwali recovery',
};

export function Header({ meta }: { meta: Meta }) {
  const countdown =
    meta.daysToDiwali > 0
      ? `Diwali in ${meta.daysToDiwali} day${meta.daysToDiwali === 1 ? '' : 's'}`
      : meta.daysToDiwali === 0
        ? 'Diwali is today'
        : `${-meta.daysToDiwali} days since Diwali`;
  return (
    <header className="header">
      <div>
        <h1>
          <span className="logo">🪔</span> AirSense <span className="muted">· Diwali Air Quality Forecast</span>
        </h1>
        <p className="muted">AI-powered, neighborhood-level PM2.5 / AQI prediction for Patiala, Punjab</p>
      </div>
      <div className="header-right">
        <span className={`phase-badge phase-${meta.phase}`}>{PHASE_TEXT[meta.phase]}</span>
        <div className="countdown">
          <strong>{countdown}</strong>
          <span className="muted">{formatDate(meta.diwaliDate, true)}</span>
        </div>
      </div>
    </header>
  );
}
