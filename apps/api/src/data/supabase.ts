import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  AlertSubscription,
  CitizenReport,
  CommunityFeed,
  ReportIssueType,
} from '@vaayuvision/shared';

/** Load .env from repo root or cwd if present (zero external dependencies). */
function loadDotEnv(): void {
  for (const rel of ['.env', '../../.env']) {
    const p = path.resolve(process.cwd(), rel);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadDotEnv();

interface DbReportRow {
  id: string;
  neighborhood_id: string;
  issue_type: ReportIssueType;
  severity: 'low' | 'medium' | 'high';
  note: string;
  reporter_name: string;
  created_at: string;
}

interface DbSubRow {
  id: string;
  neighborhood_id: string;
  contact: string;
  organization: string;
  threshold_aqi: number;
  created_at: string;
}

export class SupabaseCommunityStore {
  private readonly url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  private readonly key = process.env.SUPABASE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

  private localReports: CitizenReport[] = [
    {
      id: 'rep-1',
      neighborhoodId: 'adalat-bazar',
      issueType: 'firecrackers',
      severity: 'high',
      note: 'Heavy late-evening firecracker bursting near Qila Mubarak chowk trapping smoke in narrow lanes.',
      reporterName: 'Market Association',
      createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    },
    {
      id: 'rep-2',
      neighborhoodId: 'sanaur-road',
      issueType: 'stubble_smoke',
      severity: 'high',
      note: 'Thick paddy-stubble smoke plume drifting in from southern agricultural fields after 6 PM.',
      reporterName: 'Sanaur Corridor Monitor',
      createdAt: new Date(Date.now() - 110 * 60_000).toISOString(),
    },
    {
      id: 'rep-3',
      neighborhoodId: 'thapar-prem-nagar',
      issueType: 'stubble_smoke',
      severity: 'medium',
      note: 'Evening haze and crop-residue smell across Bhadson Road & Prem Nagar student housing.',
      reporterName: 'Campus Eco Club',
      createdAt: new Date(Date.now() - 190 * 60_000).toISOString(),
    },
    {
      id: 'rep-4',
      neighborhoodId: 'focal-point',
      issueType: 'industrial_dust',
      severity: 'medium',
      note: 'Industrial boiler exhaust and resuspended road dust along Focal Point main corridor.',
      reporterName: 'Focal Point Welfare',
      createdAt: new Date(Date.now() - 320 * 60_000).toISOString(),
    },
  ];

  private localSubscriptions: AlertSubscription[] = [
    {
      id: 'sub-1',
      neighborhoodId: 'thapar-prem-nagar',
      contact: 'healthcenter@thapar.edu',
      organization: 'TIET Campus Health Center',
      thresholdAqi: 300,
      createdAt: new Date(Date.now() - 3600_000 * 12).toISOString(),
    },
    {
      id: 'sub-2',
      neighborhoodId: 'adalat-bazar',
      contact: 'pulmonology@rajindrahospital.org',
      organization: 'Rajindra Hospital Respiratory OPD',
      thresholdAqi: 350,
      createdAt: new Date(Date.now() - 3600_000 * 24).toISOString(),
    },
    {
      id: 'sub-3',
      neighborhoodId: 'punjabi-uni',
      contact: 'sports-directorate@pbi.ac.in',
      organization: 'Punjabi University Athletics',
      thresholdAqi: 250,
      createdAt: new Date(Date.now() - 3600_000 * 36).toISOString(),
    },
  ];

  get isCloudConfigured(): boolean {
    return Boolean(this.url && this.key && !this.url.includes('your-project-id'));
  }

  private headers(): Record<string, string> {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  async getFeed(neighborhoodId?: string): Promise<CommunityFeed> {
    if (this.isCloudConfigured) {
      try {
        const filter = neighborhoodId ? `&neighborhood_id=eq.${encodeURIComponent(neighborhoodId)}` : '';
        const [repRes, subRes] = await Promise.all([
          fetch(`${this.url}/rest/v1/citizen_reports?select=*&order=created_at.desc&limit=20${filter}`, {
            headers: this.headers(),
          }),
          fetch(`${this.url}/rest/v1/alert_subscriptions?select=*&order=created_at.desc&limit=20${filter}`, {
            headers: this.headers(),
          }),
        ]);
        if (repRes.ok && subRes.ok) {
          const repRows = (await repRes.json()) as DbReportRow[];
          const subRows = (await subRes.json()) as DbSubRow[];
          return {
            storageMode: 'supabase-cloud',
            reports: repRows.map((r) => ({
              id: r.id,
              neighborhoodId: r.neighborhood_id,
              issueType: r.issue_type,
              severity: r.severity,
              note: r.note,
              reporterName: r.reporter_name,
              createdAt: r.created_at,
            })),
            subscriptionsCount: subRows.length,
            recentSubscriptions: subRows.slice(0, 6).map((s) => ({
              id: s.id,
              neighborhoodId: s.neighborhood_id,
              contact: s.contact,
              organization: s.organization,
              thresholdAqi: s.threshold_aqi,
              createdAt: s.created_at,
            })),
          };
        }
      } catch {
        // Fall through to local store if offline
      }
    }

    const reports = neighborhoodId
      ? this.localReports.filter((r) => r.neighborhoodId === neighborhoodId)
      : this.localReports;
    const subs = neighborhoodId
      ? this.localSubscriptions.filter((s) => s.neighborhoodId === neighborhoodId)
      : this.localSubscriptions;

    return {
      storageMode: 'local-fallback',
      reports: reports.slice(0, 20),
      subscriptionsCount: subs.length,
      recentSubscriptions: subs.slice(0, 6),
    };
  }

  async addReport(input: {
    neighborhoodId: string;
    issueType: ReportIssueType;
    severity: 'low' | 'medium' | 'high';
    note: string;
    reporterName: string;
  }): Promise<CitizenReport> {
    if (this.isCloudConfigured) {
      try {
        const res = await fetch(`${this.url}/rest/v1/citizen_reports`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            neighborhood_id: input.neighborhoodId,
            issue_type: input.issueType,
            severity: input.severity,
            note: input.note,
            reporter_name: input.reporterName,
          }),
        });
        if (res.ok) {
          const [r] = (await res.json()) as DbReportRow[];
          if (r) {
            return {
              id: r.id,
              neighborhoodId: r.neighborhood_id,
              issueType: r.issue_type,
              severity: r.severity,
              note: r.note,
              reporterName: r.reporter_name,
              createdAt: r.created_at,
            };
          }
        }
      } catch {
        // Fall through to local store
      }
    }

    const report: CitizenReport = {
      id: `rep-${Date.now()}`,
      neighborhoodId: input.neighborhoodId,
      issueType: input.issueType,
      severity: input.severity,
      note: input.note,
      reporterName: input.reporterName || 'Patiala Resident',
      createdAt: new Date().toISOString(),
    };
    this.localReports.unshift(report);
    return report;
  }

  async addSubscription(input: {
    neighborhoodId: string;
    contact: string;
    organization: string;
    thresholdAqi: number;
  }): Promise<AlertSubscription> {
    if (this.isCloudConfigured) {
      try {
        const res = await fetch(`${this.url}/rest/v1/alert_subscriptions`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            neighborhood_id: input.neighborhoodId,
            contact: input.contact,
            organization: input.organization,
            threshold_aqi: input.thresholdAqi,
          }),
        });
        if (res.ok) {
          const [s] = (await res.json()) as DbSubRow[];
          if (s) {
            return {
              id: s.id,
              neighborhoodId: s.neighborhood_id,
              contact: s.contact,
              organization: s.organization,
              thresholdAqi: s.threshold_aqi,
              createdAt: s.created_at,
            };
          }
        }
      } catch {
        // Fall through to local store
      }
    }

    const sub: AlertSubscription = {
      id: `sub-${Date.now()}`,
      neighborhoodId: input.neighborhoodId,
      contact: input.contact,
      organization: input.organization || 'Patiala Citizen',
      thresholdAqi: input.thresholdAqi,
      createdAt: new Date().toISOString(),
    };
    this.localSubscriptions.unshift(sub);
    return sub;
  }
}
