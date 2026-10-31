import { aqiColor, type InterventionScenario, type SimulationResult } from '@vaayuvision/shared';

interface Props {
  neighborhoodName: string;
  scenario: InterventionScenario;
  onChange: (next: InterventionScenario) => void;
  result: SimulationResult | null;
}

const BASELINE: InterventionScenario = {
  fireworksReductionPct: 0,
  trafficReductionPct: 0,
  stubbleReductionPct: 0,
  artificialRain: false,
};

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
            Adjust the sliders below to simulate pollution-control measures in Patiala and see how the 21-day forecast responds.
          </p>
        </div>
        {isActive && (
          <button className="btn-secondary" onClick={() => onChange(BASELINE)}>
            Reset Sliders
          </button>
        )}
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
          <span className="muted small">Green-cracker enforcement & community shows</span>
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
          <span className="muted small">Bazaar vehicle restrictions & heavy truck diversions</span>
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
          <span className="muted small">Upwind crop-residue management in Patiala / Sangrur</span>
        </label>

        <label className="sim-toggle">
          <input
            type="checkbox"
            checked={scenario.artificialRain}
            onChange={(e) => onChange({ ...scenario, artificialRain: e.target.checked })}
          />
          <div>
            <strong>Water Sprinkling / Smog-Gun Misting</strong>
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
            <span className="small down-text">Simulated curve shown in green on chart</span>
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
