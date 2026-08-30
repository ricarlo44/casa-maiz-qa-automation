// Loads .env if present. Both targets are public and read-only, so there are
// no secrets to protect here -- this only makes the base URLs configurable.
try {
  process.loadEnvFile();
} catch {
  // No .env file present; environment variables or defaults below apply.
}

const trimmedEnv = (name: string, fallback: string): string =>
  process.env[name]?.trim() || fallback;

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const config = {
  cmsUrl: stripTrailingSlash(
    trimmedEnv('CMS_URL', 'https://payload-cms-poc-seven.vercel.app'),
  ),
  websiteUrl: stripTrailingSlash(
    trimmedEnv('WEBSITE_URL', 'https://payload-website-consumer.vercel.app'),
  ),
  market: trimmedEnv('CMS_MARKET', 'MX'),
  audience: trimmedEnv('CMS_AUDIENCE', 'guest'),
  appVersion: trimmedEnv('CMS_APP_VERSION', '2.4.0'),
} as const;
