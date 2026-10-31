import type {
  AlertSubscription,
  AssistantChatRequest,
  AssistantChatResponse,
  CitizenReport,
  CommunityFeed,
  DailyObservation,
  DiwaliOutlook,
  InterventionScenario,
  Meta,
  ModelInfo,
  NeighborhoodForecast,
  NeighborhoodSummary,
  ReportIssueType,
  SimulationResult,
} from '@vaayuvision/shared';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => get<Meta>('/meta'),
  model: () => get<ModelInfo>('/model'),
  neighborhoods: () => get<NeighborhoodSummary[]>('/neighborhoods'),
  forecasts: () => get<NeighborhoodForecast[]>('/forecast'),
  history: (id: string, days = 45) => get<DailyObservation[]>(`/neighborhoods/${id}/history?days=${days}`),
  outlook: (id: string) => get<DiwaliOutlook>(`/neighborhoods/${id}/outlook`),
  simulate: (id: string, s: InterventionScenario) =>
    get<SimulationResult>(
      `/simulate/${id}?fireworks=${s.fireworksReductionPct}&traffic=${s.trafficReductionPct}&stubble=${s.stubbleReductionPct}&rain=${s.artificialRain ? 1 : 0}`,
    ),
  simulateAll: (s: InterventionScenario) =>
    get<NeighborhoodForecast[]>(
      `/simulate?fireworks=${s.fireworksReductionPct}&traffic=${s.trafficReductionPct}&stubble=${s.stubbleReductionPct}&rain=${s.artificialRain ? 1 : 0}`,
    ),
  community: (neighborhoodId?: string) =>
    get<CommunityFeed>(`/community${neighborhoodId ? `?neighborhoodId=${encodeURIComponent(neighborhoodId)}` : ''}`),
  createReport: (input: {
    neighborhoodId: string;
    issueType: ReportIssueType;
    severity: 'low' | 'medium' | 'high';
    note: string;
    reporterName: string;
  }) => post<CitizenReport>('/community/reports', input),
  createSubscription: (input: {
    neighborhoodId: string;
    contact: string;
    organization: string;
    thresholdAqi: number;
  }) => post<AlertSubscription>('/community/subscriptions', input),
  assistantChat: (req: AssistantChatRequest) => post<AssistantChatResponse>('/assistant/chat', req),
};
