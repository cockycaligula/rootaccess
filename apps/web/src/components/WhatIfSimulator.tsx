import { aqiColor, type InterventionScenario, type SimulationResult } from '@vaayuvision/shared';

interface Props {
  neighborhoodName: string;
  scenario: InterventionScenario;
  onChange: (next: InterventionScenario) => void;
  result: SimulationResult | null;
}

const PRESETS: Array<{ label: string; value: InterventionScenario }> = [
  {
    label: 'Reset (Baseline)',
    value: { fireworksReductionPct: 0, trafficReductionPct: 0, stubbleReductionPct: 0, artificialRain: false },
  },
  {
    label: 'Green Crackers (60%)',
    value: { fireworksReductionPct: 60, trafficReductionPct: 0, stubbleReductionPct: 0, artificialRain: false },
  },
  {
    label: 'GRAP-IV + Odd-Even',
    value: { fireworksReductionPct: 50, trafficReductionPct: 35, stubbleReductionPct: 40, artificialRain: false },
  },
  {
    label: 'Full Clean-Air Action + Cloud Seeding',
    value: { fireworksReductionPct: 80, trafficReductionPct: 45, stubbleReductionPct: 70, artificialRain: true },
  },
];

export function WhatIfSimulator({ neighborhoodName, scenario, onChange, result }: Props) {
  const isActive =
    scenario.fireworksReductionPct > 0 ||
    scenario.trafficReductionPct > 0 ||
    scenario.stubbleReductionPct > 0 ||
    scenario.artificialRain;

  return (
    <div className="simulator">
      <div className="sim-header">
        <div>
          <h3>What-If Policy Simulator · {neighborhoodName}</h3>
          <p className="muted small">
            Simulate interventions in Patiala before Diwali and see how the recursive 21-day forecast responds in real time.
          </p>
        </div>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button key={p.label} className="btn-secondary" onClick={() => onChange(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sim-controls">
        <label className="sim-slider">
          <div className="sim-label-row">
            <span>Firecracker Reduction</span>
            <strong>{scenario.fireworksReductionPct}%</strong>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={scenario.fireworksReductionPct}
            onChange={(e) => onChange({ ...scenario, fireworksReductionPct: Number(e.target.value) })}
          />
          <span className="muted small">Community laser shows / green-cracker enforcement</span>
        </label>

        <label className="sim-slider">
          <div className="sim-label-row">
            <span>Traffic & Bazaar Curbs</span>
            <strong>{scenario.trafficReductionPct}%</strong>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={scenario.trafficReductionPct}
            onChange={(e) => onChange({ ...scenario, trafficReductionPct: Number(e.target.value) })}
          />
          <span className="muted small">Bazaar vehicle restrictions, commercial truck ban</span>
        </label>

        <label className="sim-slider">
          <div className="sim-label-row">
            <span>Malwa Stubble Smoke Control</span>
            <strong>{scenario.stubbleReductionPct}%</strong>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={scenario.stubbleReductionPct}
            onChange={(e) => onChange({ ...scenario, stubbleReductionPct: Number(e.target.value) })}
          />
          <span className="muted small">Upwind Pusa bio-decomposer & happy-seeder adoption</span>
        </label>

        <label className="sim-toggle">
          <input
            type="checkbox"
            checked={scenario.artificialRain}
            onChange={(e) => onChange({ ...scenario, artificialRain: e.target.checked })}
          />
          <div>
            <strong>Artificial Rain / Smog-Gun Misting</strong>
            <div className="muted small">Wet deposition washout across Diwali ±1 day</div>
          </div>
        </label>
      </div>

      {result && isActive && (
        <div className="sim-impact">
          <div className="metric">
            <span className="muted small">Diwali Peak AQI</span>
            <strong>
              <span style={{ color: aqiColor(result.diwaliPeakBaselineAqi) }}>{result.diwaliPeakBaselineAqi}</span>
              {' → '}
              <span style={{ color: aqiColor(result.diwaliPeakSimulatedAqi) }}>{result.diwaliPeakSimulatedAqi}</span>
            </strong>
            <span className="small down-text">Selected curve shown in green on chart</span>
          </div>
          <div className="metric">
            <span className="muted small">Diwali Peak PM2.5 Saved</span>
            <strong className="down-text">−{result.diwaliPeakPm25Saved} µg/m³</strong>
            <span className="small">Peak particulate load avoided</span>
          </div>
          <div className="metric">
            <span className="muted small">21-Day Avg PM2.5 Reduction</span>
            <strong className="down-text">−{result.avgPm25SavedPct}%</strong>
            <span className="small">Includes post-Diwali carryover benefit</span>
          </div>
        </div>
      )}
    </div>
  );
}
