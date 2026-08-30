export type CachedEnvelope = { nextChangeAt?: string };

/**
 * Mirrors the mobile client's cache-validity rule (payload-mobile-consumer
 * src/api/cache.ts: isCachedEnvelopeValid): cached content is valid strictly
 * before nextChangeAt and must be treated as expired at or after that
 * boundary. Content without a nextChangeAt has no known expiry.
 */
export const isWithinCacheWindow = (
  envelope: CachedEnvelope,
  now: number = Date.now(),
): boolean => !envelope.nextChangeAt || now < new Date(envelope.nextChangeAt).getTime();

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export const isValidNextChangeAt = (value: string): boolean =>
  ISO_DATE_TIME.test(value) && !Number.isNaN(new Date(value).getTime());
