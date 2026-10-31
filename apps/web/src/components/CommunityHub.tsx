import { useEffect, useState } from 'react';
import type { CommunityFeed, Neighborhood, ReportIssueType } from '@vaayuvision/shared';
import { api } from '../api';

interface Props {
  neighborhoods: Neighborhood[];
  selectedId: string;
  onSelectWard: (id: string) => void;
}

const ISSUE_LABELS: Record<ReportIssueType, string> = {
  firecrackers: 'Firecracker Bursting',
  stubble_smoke: 'Malwa Stubble Smoke Plume',
  traffic_fumes: 'Bazaar / Corridor Traffic Fumes',
  industrial_dust: 'Industrial / Construction Dust',
  waste_burning: 'Open Waste / Biomass Burning',
};

export function CommunityHub({ neighborhoods, selectedId, onSelectWard }: Props) {
  const [feed, setFeed] = useState<CommunityFeed | null>(null);
  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);

  // Report form state
  const [issueType, setIssueType] = useState<ReportIssueType>('firecrackers');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('high');
  const [note, setNote] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [repSaved, setRepSaved] = useState(false);

  // Subscription form state
  const [contact, setContact] = useState('');
  const [organization, setOrganization] = useState('');
  const [thresholdAqi, setThresholdAqi] = useState(300);
  const [subSaved, setSubSaved] = useState(false);

  const selectedWard = neighborhoods.find((n) => n.id === selectedId) ?? neighborhoods[0];
  const byId = new Map(neighborhoods.map((n) => [n.id, n.name]));

  const refresh = () => {
    api
      .community(filterSelectedOnly ? selectedId : undefined)
      .then(setFeed)
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, [selectedId, filterSelectedOnly]);

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    await api.createReport({
      neighborhoodId: selectedId,
      issueType,
      severity,
      note: note.trim(),
      reporterName: reporterName.trim() || 'Patiala Resident',
    });
    setNote('');
    setRepSaved(true);
    window.setTimeout(() => setRepSaved(false), 2500);
    refresh();
  };

  const submitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    await api.createSubscription({
      neighborhoodId: selectedId,
      contact: contact.trim(),
      organization: organization.trim() || 'Patiala Resident',
      thresholdAqi,
    });
    setContact('');
    setSubSaved(true);
    window.setTimeout(() => setSubSaved(false), 2500);
    refresh();
  };

  return (
    <div className="community-hub">
      <div className="community-header">
        <div>
          <h3>Community Crowd-Reporting &amp; Early-Warning Subscriptions · {selectedWard?.name}</h3>
          <p className="muted small">
            Backed by Supabase Postgres (`citizen_reports` &amp; `alert_subscriptions`) with automatic local fallback.
          </p>
        </div>
        <div className="community-badges">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFilterSelectedOnly((v) => !v)}
          >
            {filterSelectedOnly ? `Showing: ${selectedWard?.name} Only` : 'Showing: All 12 Patiala Areas'}
          </button>
          <span className={`storage-badge ${feed?.storageMode === 'supabase-cloud' ? 'cloud' : 'fallback'}`}>
            {feed?.storageMode === 'supabase-cloud'
              ? 'Supabase Cloud Connected'
              : 'Supabase Ready (Local Store Active)'}
          </span>
        </div>
      </div>

      <div className="community-grid">
        <div className="community-col">
          <h4>Report Hyper-Local Pollution Incident in {selectedWard?.name}</h4>
          <form className="community-form" onSubmit={submitReport}>
            <div className="form-row">
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as ReportIssueType)}
                className="form-input"
              >
                {(Object.keys(ISSUE_LABELS) as ReportIssueType[]).map((k) => (
                  <option key={k} value={k}>
                    {ISSUE_LABELS[k]}
                  </option>
                ))}
              </select>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as 'low' | 'medium' | 'high')}
                className="form-input"
              >
                <option value="high">Severity: High</option>
                <option value="medium">Severity: Medium</option>
                <option value="low">Severity: Low</option>
              </select>
              <input
                type="text"
                placeholder="Your name / campus club (optional)"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder={`Describe smoke, firecrackers, or dust observed in ${selectedWard?.name}...`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-input grow"
                required
              />
              <button type="submit" className="btn">
                {repSaved ? 'Report Saved' : 'Submit Report'}
              </button>
            </div>
          </form>

          <div className="report-list">
            {(feed?.reports ?? []).slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="report-item clickable"
                onClick={() => onSelectWard(r.neighborhoodId)}
              >
                <div className="report-top">
                  <strong>{byId.get(r.neighborhoodId) ?? r.neighborhoodId}</strong>
                  <span className={`sev-pill sev-${r.severity}`}>
                    {ISSUE_LABELS[r.issueType]} · {r.severity.toUpperCase()}
                  </span>
                </div>
                <p className="small">{r.note}</p>
                <span className="muted small">Reported by {r.reporterName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="community-col">
          <h4>Subscribe to Early-Warning AQI Alerts for {selectedWard?.name}</h4>
          <form className="community-form" onSubmit={submitSubscription}>
            <div className="form-row">
              <input
                type="text"
                placeholder="School, Hospital, Campus, or Resident Name"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="form-input"
              />
              <select
                value={thresholdAqi}
                onChange={(e) => setThresholdAqi(Number(e.target.value))}
                className="form-input"
              >
                <option value={200}>Alert when AQI &gt; 200 (Poor)</option>
                <option value={300}>Alert when AQI &gt; 300 (Very Poor)</option>
                <option value={400}>Alert when AQI &gt; 400 (Severe)</option>
              </select>
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder="Email or WhatsApp number (e.g. health@thapar.edu)"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="form-input grow"
                required
              />
              <button type="submit" className="btn">
                {subSaved ? 'Subscribed' : 'Subscribe Area Alert'}
              </button>
            </div>
          </form>

          <div className="report-list">
            <div className="muted small">
              Active institutional &amp; citizen alert subscriptions ({feed?.subscriptionsCount ?? 0} registered):
            </div>
            {(feed?.recentSubscriptions ?? []).map((s) => (
              <div
                key={s.id}
                className="report-item clickable"
                onClick={() => onSelectWard(s.neighborhoodId)}
              >
                <div className="report-top">
                  <strong>{s.organization}</strong>
                  <span className="sev-pill sev-medium">
                    {byId.get(s.neighborhoodId) ?? s.neighborhoodId} · AQI &gt; {s.thresholdAqi}
                  </span>
                </div>
                <span className="muted small">Endpoint: {s.contact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
