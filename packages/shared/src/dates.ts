import type { DiwaliPhase } from './types.js';

/** Lakshmi Puja (main Diwali night) dates. */
export const DIWALI_DATES: Record<number, string> = {
  2021: '2021-11-04',
  2022: '2022-10-24',
  2023: '2023-11-12',
  2024: '2024-10-31',
  2025: '2025-10-20',
  2026: '2026-11-08',
  2027: '2027-10-29',
  2028: '2028-10-17',
};

/** Number of days on each side of Diwali that count as before / after. */
export const PHASE_WINDOW_DAYS = 14;

export const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

export const parseISODate = (s: string): Date => new Date(`${s}T00:00:00Z`);

export function addDays(date: string, n: number): string {
  const d = parseISODate(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

/** a - b, in whole days. */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

export function dayOfYear(date: string): number {
  return diffDays(date, `${date.slice(0, 4)}-01-01`) + 1;
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Signed offset (in days) from the nearest Diwali. Large number if none is known. */
export function daysFromDiwali(date: string): number {
  const y = Number(date.slice(0, 4));
  let best = 9999;
  for (const yy of [y - 1, y, y + 1]) {
    const d = DIWALI_DATES[yy];
    if (!d) continue;
    const off = diffDays(date, d);
    if (Math.abs(off) < Math.abs(best)) best = off;
  }
  return best;
}

export function diwaliPhase(offset: number): DiwaliPhase {
  if (offset >= -PHASE_WINDOW_DAYS && offset <= -1) return 'before';
  if (offset === 0 || offset === 1) return 'during';
  if (offset >= 2 && offset <= PHASE_WINDOW_DAYS) return 'after';
  return 'normal';
}

/** The Diwali season that is "current" for a given day: the next one, or the one that just passed. */
export function currentDiwali(today: string): string {
  const dates = Object.values(DIWALI_DATES).sort();
  return dates.find((d) => diffDays(today, d) <= PHASE_WINDOW_DAYS) ?? dates[dates.length - 1];
}
