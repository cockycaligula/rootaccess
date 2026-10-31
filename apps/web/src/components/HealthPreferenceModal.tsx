import { useEffect, useState } from 'react';
import { HEALTH_CONDITIONS, type HealthCondition } from '@vaayuvision/shared';
import { useUserPreferences } from '../context/UserPreferencesContext';

const CONDITION_DESCRIPTIONS: Record<HealthCondition, string> = {
  Asthma: 'Stricter safe-air limits & inhaler / N95 mask alerts.',
  'Chronic Obstructive Pulmonary Disease (COPD)': 'Indoor air-filtration & breathing protection alerts.',
  'Allergic Rhinitis / Hay Fever': 'Protection from dust, pollen & crop-smoke irritation.',
  'Cardiovascular Disease': 'Safer outdoor exercise & heart-friendly air thresholds.',
  'Sensitive Skin/Eyes': 'Eye & skin protection during evening smoke spikes.',
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
    <div className="pref-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true" aria-label="Your Health Profile">
      <div className="pref-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pref-modal-header">
          <div>
            <span className="pref-kicker">WELCOME TO VAAYUVISION</span>
            <h2>Tell Us About You &amp; Your Health</h2>
            <p className="muted small">
              Enter your name and select any health sensitivities so we can personalize your air-quality advice and safety alerts.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pref-form">
          <label className="pref-field">
            <span className="pref-label">Your Name</span>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your name (e.g., Rohan)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </label>

          <div className="pref-field">
            <span className="pref-label">Select Any Health Conditions or Sensitivities</span>
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
            <span>Pre-fill my choices next time</span>
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
              Continue as Guest
            </button>
            <button type="submit" className="btn">
              Continue to Dashboard →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
