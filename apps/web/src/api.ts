import type {
  DailyObservation,
  DiwaliOutlook,
  InterventionScenario,
  Meta,
  ModelInfo,
  NeighborhoodForecast,
  NeighborhoodSummary,
  SimulationResult,
} from '@vaayuvision/shared';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
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
};
