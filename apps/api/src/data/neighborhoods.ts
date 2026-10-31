import type { Neighborhood } from '@airsense/shared';

/**
 * Hidden "ground truth" characteristics used only by the synthetic simulator.
 * The model never sees these; it must learn them from the data.
 */
export interface NeighborhoodProfile extends Neighborhood {
  base: number; // typical annual PM2.5 level
  traffic: number; // relative traffic load
  fireworks: number; // relative firecracker intensity on Diwali
  stubbleExposure: number; // exposure to surrounding Malwa paddy-stubble smoke
}

export const PATIALA_NEIGHBORHOODS: NeighborhoodProfile[] = [
  { id: 'adalat-bazar', name: 'Adalat Bazar & Qila Mubarak', zone: 'Old City', lat: 30.3265, lng: 76.398, base: 98, traffic: 1.25, fireworks: 1.35, stubbleExposure: 0.95 },
  { id: 'tripuri', name: 'Tripuri Town', zone: 'North', lat: 30.362, lng: 76.394, base: 94, traffic: 1.1, fireworks: 1.3, stubbleExposure: 1.0 },
  { id: 'focal-point', name: 'Focal Point Industrial', zone: 'North East', lat: 30.371, lng: 76.418, base: 104, traffic: 1.2, fireworks: 1.0, stubbleExposure: 1.05 },
  { id: 'leela-bhawan', name: 'Leela Bhawan Market', zone: 'Central', lat: 30.3385, lng: 76.3845, base: 90, traffic: 1.3, fireworks: 1.15, stubbleExposure: 0.9 },
  { id: 'bus-stand', name: 'ISBT & Rajpura Road', zone: 'East Central', lat: 30.3375, lng: 76.404, base: 96, traffic: 1.3, fireworks: 1.0, stubbleExposure: 0.95 },
  { id: 'model-town', name: 'Model Town', zone: 'Central West', lat: 30.3465, lng: 76.3765, base: 82, traffic: 1.0, fireworks: 1.2, stubbleExposure: 0.9 },
  { id: 'urban-estate', name: 'Urban Estate Phase-2', zone: 'East', lat: 30.335, lng: 76.432, base: 84, traffic: 1.0, fireworks: 1.15, stubbleExposure: 1.0 },
  { id: 'thapar-prem-nagar', name: 'Thapar / Prem Nagar', zone: 'North West', lat: 30.354, lng: 76.3685, base: 78, traffic: 0.95, fireworks: 0.9, stubbleExposure: 0.95 },
  { id: 'ranjit-nagar', name: 'Ranjit Nagar & Bhadson Rd', zone: 'North West', lat: 30.366, lng: 76.374, base: 88, traffic: 1.05, fireworks: 1.1, stubbleExposure: 1.05 },
  { id: 'sanaur-road', name: 'Sanaur Road Agri-Belt', zone: 'South', lat: 30.305, lng: 76.412, base: 92, traffic: 0.85, fireworks: 0.95, stubbleExposure: 1.2 },
  { id: 'punjabi-uni', name: 'Punjabi University', zone: 'East Campus', lat: 30.3585, lng: 76.447, base: 72, traffic: 0.85, fireworks: 0.75, stubbleExposure: 0.9 },
  { id: 'baradari-gardens', name: 'Baradari Gardens', zone: 'Central Green', lat: 30.337, lng: 76.392, base: 66, traffic: 0.8, fireworks: 0.7, stubbleExposure: 0.8 },
];

export const DELHI_NEIGHBORHOODS = PATIALA_NEIGHBORHOODS;
