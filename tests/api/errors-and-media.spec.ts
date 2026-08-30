import { expect, test } from '@playwright/test';

import { getContent, mediaFileUrl } from '../../src/api/client';
import { apiErrorSchema } from '../../src/contracts/schemas';
import { resolveMediaURL } from '../../src/contracts/media';
import { config } from '../../src/config/env';

test.describe('errors: 404 page', () => {
  test('an unknown page slug is a safe 404 with the documented APIError shape', async ({ request }) => {
    const response = await getContent(request, 'pages/does-not-exist-page');
    expect(response.status()).toBe(404);

    const error = apiErrorSchema.parse(await response.json());
    expect(error.error).toBeTruthy();
  });
});

test.describe('media URL contract', () => {
  test('an absolute media URL is passed through unchanged', () => {
    const absolute = 'https://cdn.example.com/image-hero.webp';
    expect(resolveMediaURL(config.cmsUrl, absolute)).toBe(absolute);
  });

  test('a relative Payload media path is resolved against the CMS origin', () => {
    // Not exercised by live bootstrap/page data today (every media URL
    // currently observed from the CMS is already absolute), so the relative
    // branch of the client's own resolver is verified directly here instead
    // of depending on the CMS happening to serve a relative path.
    expect(resolveMediaURL(config.cmsUrl, '/media/image-hero.webp')).toBe(
      `${config.cmsUrl}/media/image-hero.webp`,
    );
  });

  test('a missing media reference resolves to undefined, not a broken URL', () => {
    expect(resolveMediaURL(config.cmsUrl, undefined)).toBeUndefined();
    expect(resolveMediaURL(config.cmsUrl, null)).toBeUndefined();
  });
});

test.describe('media file: reported defect', () => {
  test.fail(
    true,
    'DEFECT (see DEFECT_REPORT.md): a missing media file 307-redirects to the CDN ' +
      'unconditionally and surfaces a raw CloudFront 403 AccessDenied XML body instead ' +
      'of the documented 404 APIError JSON.',
  );
  test('a missing media file returns the documented 404 APIError JSON', async ({ request }) => {
    const response = await request.get(mediaFileUrl('does-not-exist-qa-probe.jpg'));

    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
    const error = apiErrorSchema.parse(await response.json());
    expect(error.error).toBeTruthy();
  });
});
