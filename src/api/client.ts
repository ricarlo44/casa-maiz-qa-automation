import type { APIRequestContext } from '@playwright/test';

import { config } from '../config/env';
import { buildQuery, type QueryOverrides } from './query';

export const contentUrl = (path: string, overrides: QueryOverrides = {}): string => {
  const query = buildQuery(overrides);
  const suffix = query.toString();
  return `${config.cmsUrl}/api/content/v1/${path}${suffix ? `?${suffix}` : ''}`;
};

export const getContent = (
  request: APIRequestContext,
  path: string,
  overrides: QueryOverrides = {},
) => request.get(contentUrl(path, overrides));

export const mediaFileUrl = (filename: string): string =>
  `${config.cmsUrl}/api/media/file/${encodeURIComponent(filename)}`;
