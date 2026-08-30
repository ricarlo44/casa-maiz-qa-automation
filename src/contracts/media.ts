/**
 * Mirrors the mobile client's absoluteMediaURL helper (payload-mobile-consumer
 * src/api/content.ts): a URL that already carries a scheme is left untouched;
 * a relative Payload media path is resolved against the CMS origin.
 */
export const resolveMediaURL = (cmsUrl: string, url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${cmsUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
