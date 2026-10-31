import type {
  DailyObservation,
  DiwaliOutlook,
  Meta,
  ModelInfo,
  NeighborhoodForecast,
  NeighborhoodSummary,
} from '@airsense/shared';

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
};
