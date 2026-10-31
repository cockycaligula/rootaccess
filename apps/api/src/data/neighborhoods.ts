import type { Neighborhood } from '@airsense/shared';

/**
 * Hidden "ground truth" characteristics used only by the synthetic simulator.
 * The model never sees these; it must learn them from the data.
 */
export interface NeighborhoodProfile extends Neighborhood {
  base: number; // typical annual PM2.5 level
  traffic: number; // relative traffic load
  fireworks: number; // relative firecracker intensity on Diwali
  stubbleExposure: number; // exposure to upwind crop-residue smoke
}

export const DELHI_NEIGHBORHOODS: NeighborhoodProfile[] = [
  { id: 'anand-vihar', name: 'Anand Vihar', zone: 'East', lat: 28.6469, lng: 77.3164, base: 105, traffic: 1.25, fireworks: 1.0, stubbleExposure: 0.85 },
  { id: 'ito', name: 'ITO', zone: 'Central', lat: 28.6289, lng: 77.241, base: 92, traffic: 1.3, fireworks: 0.8, stubbleExposure: 0.8 },
  { id: 'rk-puram', name: 'R.K. Puram', zone: 'South', lat: 28.566, lng: 77.1767, base: 82, traffic: 1.0, fireworks: 1.1, stubbleExposure: 0.75 },
  { id: 'punjabi-bagh', name: 'Punjabi Bagh', zone: 'West', lat: 28.6683, lng: 77.1167, base: 90, traffic: 1.1, fireworks: 1.35, stubbleExposure: 0.95 },
  { id: 'dwarka', name: 'Dwarka Sec-8', zone: 'South West', lat: 28.571, lng: 77.0719, base: 80, traffic: 0.9, fireworks: 0.9, stubbleExposure: 0.9 },
  { id: 'rohini', name: 'Rohini', zone: 'North West', lat: 28.7325, lng: 77.1199, base: 92, traffic: 1.0, fireworks: 1.2, stubbleExposure: 1.0 },
  { id: 'okhla', name: 'Okhla Phase-2', zone: 'South East', lat: 28.5308, lng: 77.2713, base: 95, traffic: 1.05, fireworks: 0.9, stubbleExposure: 0.8 },
  { id: 'lodhi-road', name: 'Lodhi Road', zone: 'Central', lat: 28.5918, lng: 77.2273, base: 68, traffic: 0.85, fireworks: 0.7, stubbleExposure: 0.7 },
  { id: 'jahangirpuri', name: 'Jahangirpuri', zone: 'North', lat: 28.7328, lng: 77.1706, base: 108, traffic: 1.15, fireworks: 1.1, stubbleExposure: 1.05 },
  { id: 'mundka', name: 'Mundka', zone: 'West', lat: 28.6823, lng: 77.0303, base: 104, traffic: 1.1, fireworks: 1.0, stubbleExposure: 1.1 },
  { id: 'chandni-chowk', name: 'Chandni Chowk', zone: 'Old Delhi', lat: 28.6562, lng: 77.23, base: 98, traffic: 1.2, fireworks: 1.25, stubbleExposure: 0.85 },
  { id: 'najafgarh', name: 'Najafgarh', zone: 'South West', lat: 28.57, lng: 76.9339, base: 78, traffic: 0.8, fireworks: 0.85, stubbleExposure: 1.1 },
];
