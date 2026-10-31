import React, { createContext, useContext, useState } from 'react';
import {
  HEALTH_CONDITIONS,
  type ForecastPoint,
  type HealthCondition,
  type Neighborhood,
  type PollutantMetrics,
  type UserHealthProfile,
} from '@vaayuvision/shared';

const STORAGE_KEY = 'vaayuvision_health_profile_v1';

interface StoredPreferences {
  name: string;
  conditions: HealthCondition[];
  rememberInStorage: boolean;
}

interface UserPreferencesContextValue {
  profile: UserHealthProfile;
  rememberInStorage: boolean;
  onboarded: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  savePreferences: (next: { name: string; conditions: HealthCondition[]; remember: boolean }) => void;
  skipOnboarding: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

function loadStoredPreferences(): StoredPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { name: '', conditions: [], rememberInStorage: true };
    }
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    const validSet = new Set<string>(HEALTH_CONDITIONS);
    const conditions = Array.isArray(parsed.conditions)
      ? (parsed.conditions.filter((c): c is HealthCondition => typeof c === 'string' && validSet.has(c)) as HealthCondition[])
      : [];
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      conditions,
      rememberInStorage: parsed.rememberInStorage ?? true,
    };
  } catch {
    return { name: '', conditions: [], rememberInStorage: true };
  }
}

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const initial = loadStoredPreferences();
  const [name, setName] = useState(initial.name);
  const [conditions, setConditions] = useState<HealthCondition[]>(initial.conditions);
  const [rememberInStorage, setRememberInStorage] = useState(initial.rememberInStorage);
  // Always start with onboarded = false on each visit so the app prompts for user input & medical info every time
  const [onboarded, setOnboarded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const savePreferences = (next: { name: string; conditions: HealthCondition[]; remember: boolean }) => {
    const cleanName = next.name.trim();
    setName(cleanName);
    setConditions(next.conditions);
    setRememberInStorage(next.remember);
    setOnboarded(true);
    setIsModalOpen(false);
    try {
      if (next.remember) {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            name: cleanName,
            conditions: next.conditions,
            rememberInStorage: true,
          }),
        );
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const skipOnboarding = () => {
    setOnboarded(true);
    setIsModalOpen(false);
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        profile: { name, conditions },
        rememberInStorage,
        onboarded,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
        savePreferences,
        skipOnboarding,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return ctx;
}

export function buildPollutantMetrics(neighborhood: Neighborhood, p: ForecastPoint): PollutantMetrics {
  const dustFactor = p.weather.rainMm > 1 ? 1.28 : 1.58 + Math.min(0.25, p.fireCount / 4000);
  const pm10 = Math.round(p.pm25 * dustFactor * 10) / 10;

  const stagnationBoost = Math.sqrt(550 / Math.max(200, p.weather.mixingHeightM));
  const diwaliBoost = p.daysFromDiwali === 0 || p.daysFromDiwali === 1 ? 1.35 : 1.0;
  const no2 = Math.round(28 * p.trafficIndex * stagnationBoost * diwaliBoost * 10) / 10;

  return {
    wardId: neighborhood.id,
    wardName: neighborhood.name,
    zone: neighborhood.zone,
    date: p.date,
    aqi: p.aqi,
    category: p.category,
    pm25: p.pm25,
    pm10,
    no2,
    windSpeed: p.weather.windSpeed,
    mixingHeightM: p.weather.mixingHeightM,
    humidity: p.weather.humidity,
    daysFromDiwali: p.daysFromDiwali,
  };
}
