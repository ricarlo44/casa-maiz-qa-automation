import { config } from '../config/env';

/**
 * Override values for the four required delivery-context query parameters.
 * A value of `null` deliberately OMITS that parameter from the request (used
 * to test the OpenAPI "required" constraints); `undefined`/absent keys fall
 * back to the configured default.
 */
export type QueryOverrides = {
  platform?: string | null;
  market?: string | null;
  audience?: string | null;
  appVersion?: string | null;
};

const defaults: Record<keyof QueryOverrides, string> = {
  platform: 'ios',
  market: config.market,
  audience: config.audience,
  appVersion: config.appVersion,
};

export const buildQuery = (overrides: QueryOverrides = {}): URLSearchParams => {
  const params = new URLSearchParams();
  (Object.keys(defaults) as Array<keyof QueryOverrides>).forEach(key => {
    const value = key in overrides ? overrides[key] : defaults[key];
    if (value === null || value === undefined) return;
    params.set(key, value);
  });
  return params;
};
