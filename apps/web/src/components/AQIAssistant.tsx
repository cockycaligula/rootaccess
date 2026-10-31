import { useEffect, useRef, useState } from 'react';
import {
  aqiColor,
  type AssistantChatMessage,
  type ForecastPoint,
  type Neighborhood,
} from '@vaayuvision/shared';
import { api } from '../api';
import { buildPollutantMetrics, useUserPreferences } from '../context/UserPreferencesContext';

interface Props {
  neighborhood: Neighborhood;
  point: ForecastPoint;
}

const QUICK_CHIPS = [
  'Is it safe outside for me right now?',
  'Best time for ventilation today',
  "Log today's symptoms",
  'Can I go for a run?',
  'Should I wear a mask today?',
];

const SYMPTOM_OPTIONS = [
  'Mild dry cough / throat irritation',
  'Wheezing or shortness of breath',
  'Sneezing / nasal congestion',
  'Watery or burning eyes',
  'Headache / fatigue after going outside',
];

/** Render basic **bold** and line breaks cleanly without external markdown libraries. */
function renderFormattedText(text: string) {
  return text.split('\n\n').map((para, pIdx) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={pIdx} className="chat-para">
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

export function AQIAssistant({ neighborhood, point }: Props) {
  const { profile, onboarded, openModal } = useUserPreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSymptomPicker, setShowSymptomPicker] = useState(false);
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const [lastSystemPrompt, setLastSystemPrompt] = useState<string>('');
  const [safetyBadge, setSafetyBadge] = useState<'safe' | 'caution' | 'high-risk' | 'critical'>('caution');
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const metrics = buildPollutantMetrics(neighborhood, point);
  const displayName = profile.name.trim();
  const greetingText = displayName
    ? `Hi ${displayName}! How can I help you navigate today's air quality in ${neighborhood.name}?`
    : `Hi there! How can I help you navigate today's air quality in ${neighborhood.name}?`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen, showSymptomPicker]);

  const sendQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;
    const userMsg: AssistantChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    setShowSymptomPicker(false);

    try {
      const res = await api.assistantChat({
        message: trimmed,
        profile,
        context: metrics,
        history: messages.slice(-6),
      });
      setLastSystemPrompt(res.systemPromptUsed);
      setSafetyBadge(res.safetyLevel);
      setMessages([
        ...nextHistory,
        {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages([
        ...nextHistory,
        {
          role: 'assistant',
          content: `Currently in **${metrics.wardName}**, AQI is **${metrics.aqi} (${metrics.category})** with **PM2.5 ${metrics.pm25} µg/m³**, **PM10 ${metrics.pm10} µg/m³**, and **NO₂ ${metrics.no2} µg/m³**. Please limit prolonged outdoor exposure and wear an N95 mask if AQI exceeds 150.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chip: string) => {
    if (chip === "Log today's symptoms") {
      setShowSymptomPicker((v) => !v);
      return;
    }
    sendQuery(chip);
  };

  return (
    <div className="aqi-assistant-root">
      {isOpen && (
        <aside className="aqi-chat-window" aria-label="VaayuVision AI Health Advisor">
          <div className="aqi-chat-header">
            <div className="aqi-chat-title-row">
              <div>
                <div className="aqi-chat-badge-row">
                  <span className="aqi-live-dot" style={{ background: aqiColor(metrics.aqi) }} />
                  <strong>VaayuVision AI Health Advisor</strong>
                  <span className={`safety-pill safety-${safetyBadge}`}>{safetyBadge.toUpperCase()}</span>
                </div>
                <span className="muted small">
                  {metrics.wardName} · AQI {metrics.aqi} · PM2.5 {metrics.pm25} · PM10 {metrics.pm10} · NO₂ {metrics.no2} µg/m³
                </span>
              </div>
              <div className="aqi-chat-header-btns">
                <button type="button" className="chat-mini-btn" onClick={openModal}>
                  {profile.conditions.length || displayName ? 'Edit Profile' : 'Setup Profile'}
                </button>
                <button
                  type="button"
                  className="chat-mini-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Health Advisor"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="aqi-profile-bar">
              <div className="aqi-profile-pills">
                <span className="profile-tag">
                  User: <strong>{displayName || 'Guest (Safe Mode)'}</strong>
                </span>
                {profile.conditions.length > 0 ? (
                  profile.conditions.map((c) => (
                    <span key={c} className="cond-pill">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="cond-pill muted-pill">
                    No conditions selected ·{' '}
                    <button type="button" className="inline-link-btn" onClick={openModal}>
                      Personalize
                    </button>
                  </span>
                )}
              </div>
              {lastSystemPrompt && (
                <button
                  type="button"
                  className="prompt-inspect-btn"
                  onClick={() => setShowPromptInspector((v) => !v)}
                >
                  {showPromptInspector ? 'Hide Context Prompt' : 'Inspect Prompt'}
                </button>
              )}
            </div>

            {showPromptInspector && lastSystemPrompt && (
              <pre className="prompt-inspector-pre">{lastSystemPrompt}</pre>
            )}
          </div>

          <div className="aqi-chat-messages" ref={scrollRef}>
            <div className="chat-bubble assistant">
              <div className="chat-role">AI Health Advisor</div>
              <p className="chat-para">
                <strong>{greetingText}</strong>
              </p>
              <p className="chat-para muted small">
                Live telemetry injected for <strong>{metrics.wardName}</strong> ({metrics.date}):{' '}
                <strong>PM2.5 {metrics.pm25} µg/m³</strong> · <strong>PM10 {metrics.pm10} µg/m³</strong> ·{' '}
                <strong>NO₂ {metrics.no2} µg/m³</strong>.
                {!onboarded && !profile.conditions.length
                  ? ' Click "Setup Profile" above to tailor thresholds to Asthma, COPD, Rhinitis, Cardiovascular, or Eye/Skin sensitivity.'
                  : ''}
              </p>
            </div>

            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble ${m.role}`}>
                <div className="chat-role">{m.role === 'user' ? displayName || 'You' : 'AI Health Advisor'}</div>
                {renderFormattedText(m.content)}
              </div>
            ))}

            {showSymptomPicker && (
              <div className="chat-bubble assistant symptom-picker-box">
                <div className="chat-role">Log Today&apos;s Symptoms ({metrics.wardName} · AQI {metrics.aqi})</div>
                <p className="chat-para small">Select what you are experiencing right now to log and analyze:</p>
                <div className="symptom-pills">
                  {SYMPTOM_OPTIONS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      className="chip-btn"
                      onClick={() => sendQuery(`Log today's symptoms: I am experiencing ${sym.toLowerCase()} today.`)}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="chat-bubble assistant">
                <span className="muted small">Analyzing {metrics.wardName} PM2.5 / PM10 / NO₂ against your profile…</span>
              </div>
            )}
          </div>

          <div className="aqi-chat-chips">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className="chip-btn"
                onClick={() => handleChipClick(chip)}
                disabled={loading}
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            className="aqi-chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              sendQuery(input);
            }}
          >
            <input
              type="text"
              className="form-input grow"
              placeholder="Ask e.g. Can I go for a run? Should I wear a mask?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>

          <div className="aqi-chat-disclaimer">
            Medical Disclaimer: VaayuVision AI provides environmental air-quality risk insights based on CPCB/WHO guidelines, not formal medical diagnoses. Consult a physician for clinical care.
          </div>
        </aside>
      )}

      <button
        type="button"
        className="aqi-fab"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle AI Health Advisor Chatbot"
      >
        <span className="aqi-fab-dot" style={{ background: aqiColor(metrics.aqi) }} />
        <span className="aqi-fab-text">
          {isOpen
            ? 'Close Health AI'
            : displayName
              ? `Hi ${displayName} · Health AI`
              : 'AI Health Advisor'}
        </span>
        <span className="aqi-fab-aqi">AQI {metrics.aqi}</span>
      </button>
    </div>
  );
}
