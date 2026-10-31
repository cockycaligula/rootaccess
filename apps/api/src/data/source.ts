import type { DailyObservation, DayConditions, Neighborhood } from '@vaayuvision/shared';

/**
 * Abstraction over where air-quality, weather and traffic data come from.
 *
 * The MVP ships a seeded synthetic source. Real adapters (CPCB / OpenAQ for PM2.5,
 * Open-Meteo for weather, TomTom/Google for traffic, NASA FIRMS for fire counts)
 * implement this same interface, so the model and API don't change.
 */
export interface AirQualityDataSource {
  readonly name: string;
  neighborhoods(): Neighborhood[];
  /** Daily observations, oldest first, up to and including `lastObserved`. */
  observations(neighborhoodId: string): DailyObservation[];
  /** Forecast exogenous conditions (weather, traffic, fires) for `date`, as issued on `issuedOn`. */
  conditionsForecast(neighborhoodId: string, date: string, issuedOn: string): DayConditions;
}
