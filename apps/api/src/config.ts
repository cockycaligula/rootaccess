import { toISODate } from '@vaayuvision/shared';

/** Central runtime configuration (overridable through environment variables). */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  /** "Today" for the system. Override with VAAYUVISION_TODAY=YYYY-MM-DD to replay any season. */
  today: process.env.VAAYUVISION_TODAY ?? toISODate(new Date()),
  /** Forecast horizon in days (long enough to cover the post-Diwali window). */
  horizonDays: Number(process.env.VAAYUVISION_HORIZON ?? 21),
  seed: Number(process.env.VAAYUVISION_SEED ?? 42),
  historyStart: '2022-01-01',
  ridgeLambda: 1.0,
};
