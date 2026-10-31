import { useEffect, useState } from 'react';
import { HEALTH_CONDITIONS, type HealthCondition } from '@vaayuvision/shared';
import { useUserPreferences } from '../context/UserPreferencesContext';

const CONDITION_DESCRIPTIONS: Record<HealthCondition, string> = {
  Asthma: 'Tighter PM2.5 (<=35 µg/m³) & NO2 thresholds; rescue inhaler & N95 alerts.',
  'Chronic Obstructive Pulmonary Disease (COPD)': 'Strict indoor HEPA & SpO2 monitoring guidance when AQI > 90.',
  'Allergic Rhinitis / Hay Fever': 'Coarse PM10 & Malwa crop-ash protection, nasal rinse & window-sealing alerts.',
  'Cardiovascular Disease': 'Ultrafine PM2.5 & traffic NO2 vascular strain limits for outdoor cardio.',
  'Sensitive Skin/Eyes': 'Ocular tear-film & skin barrier protection during smoke and inversion spikes.',
};

export function HealthPreferenceModal() {
  const { profile, rememberInStorage, isModalOpen, closeModal, savePreferences, skipOnboarding } =
    useUserPreferences();

  const [nameInput, setNameInput] = useState(profile.name);
  const [selected, setSelected] = useState<HealthCondition[]>(profile.conditions);
  const [remember, setRemember] = useState(rememberInStorage);

  useEffect(() => {
    if (isModalOpen) {
      setNameInput(profile.name);
      setSelected(profile.conditions);
      setRemember(rememberInStorage);
    }
  }, [isModalOpen, profile.name, profile.conditions, rememberInStorage]);

  if (!isModalOpen) return null;

  const toggleCondition = (c: HealthCondition) => {
    setSelected((prev) => (prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePreferences({ name: nameInput, conditions: selected, remember });
  };

  return (
    <div className="pref-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true" aria-label="Health Profile Setup">
      <div className="pref-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pref-modal-header">
          <div>
            <span className="pref-kicker">PERSONALIZED CLINICAL THRESHOLDS</span>
            <h2>Health Profile &amp; Airborne Sensitivity Setup</h2>
            <p className="muted small">
              Tailors VaayuVision AI recommendations (outdoor running, N95 masks, ventilation windows) to your respiratory &amp; cardiovascular profile.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={closeModal}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pref-form">
          <label className="pref-field">
            <span className="pref-label">Your Name (optional)</span>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Rohan"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={50}
            />
          </label>

          <div className="pref-field">
            <span className="pref-label">Pre-Existing Airborne Health Conditions (Select all that apply)</span>
            <div className="pref-conditions-grid">
              {HEALTH_CONDITIONS.map((cond) => {
                const active = selected.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    className={`pref-cond-card ${active ? 'selected' : ''}`}
                    onClick={() => toggleCondition(cond)}
                    aria-pressed={active}
                  >
                    <div className="pref-cond-top">
                      <strong>{cond}</strong>
                      <span className="pref-check">{active ? 'Selected' : 'Select'}</span>
                    </div>
                    <span className="muted small">{CONDITION_DESCRIPTIONS[cond]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="pref-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Save my health preferences in this browser (localStorage) so I don&apos;t have to re-enter them</span>
          </label>

          <div className="pref-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSelected([]);
                skipOnboarding();
              }}
            >
              Skip (Use Generic Safe Mode)
            </button>
            <button type="submit" className="btn">
              Save Health Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
