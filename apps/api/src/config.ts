import { toISODate } from '@airsense/shared';

/** Central runtime configuration (overridable through environment variables). */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  /** "Today" for the system. Override with AIRSENSE_TODAY=YYYY-MM-DD to replay any season. */
  today: process.env.AIRSENSE_TODAY ?? toISODate(new Date()),
  /** Forecast horizon in days (long enough to cover the post-Diwali window). */
  horizonDays: Number(process.env.AIRSENSE_HORIZON ?? 21),
  seed: Number(process.env.AIRSENSE_SEED ?? 42),
  historyStart: '2022-01-01',
  ridgeLambda: 1.0,
};
