import { z } from 'zod';

/**
 * The mobile contract's major version this suite is built against (see
 * OpenAPI info.version "1.1" and ContentEnvelope.contractVersion const "1.1").
 * A response is treated as compatible when it shares this major version --
 * additive minor bumps (1.2, 1.3, ...) must not break the client, only a
 * major bump (2.0) should. This mirrors real semantic-versioning tolerance
 * and is exercised in tests/api/contract-envelope.spec.ts without needing a
 * live "2.0" response, which the CMS obviously cannot produce on demand.
 */
export const SUPPORTED_CONTRACT_MAJOR = 1;

export const isSupportedContractVersion = (version: string): boolean => {
  const match = /^(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return false;
  return Number(match[1]) === SUPPORTED_CONTRACT_MAJOR;
};

// `.passthrough()` on every object schema is deliberate: it lets additive,
// undocumented-but-harmless fields flow through unrejected (per Part 2.1 --
// "detects an incompatible contract without rejecting harmless additive
// fields"), while the required keys below still fail fast if the server
// stops sending something the client depends on.

export const deliveryContextSchema = z
  .object({
    authenticationState: z.enum(['authenticated', 'guest']),
    now: z.string().min(1),
    platform: z.enum(['web', 'ios', 'android']),
    appVersion: z.string().optional(),
    market: z.string().optional(),
    store: z.string().optional(),
  })
  .passthrough();

export const envelopeSchema = z
  .object({
    contractVersion: z.string(),
    data: z.unknown(),
    nextChangeAt: z.string().optional(),
    preview: z.boolean().optional(),
    resolvedContext: deliveryContextSchema.optional(),
  })
  .passthrough();

export const mediaSchema = z
  .object({
    id: z.string(),
    url: z.string().nullish(),
    alt: z.string().nullish(),
    mimeType: z.string().nullish(),
    width: z.number().nullish(),
    height: z.number().nullish(),
  })
  .passthrough();

export const destinationSchema = z
  .object({
    key: z.string().optional(),
    label: z.string().optional(),
    path: z.string(),
    supportedPlatforms: z.array(z.string()).optional(),
  })
  .passthrough();

export const navigationItemSchema = z
  .object({
    destination: destinationSchema.nullable(),
    highlighted: z.boolean().optional(),
    icon: z.string().optional(),
    label: z.string(),
  })
  .passthrough();

export const navigationSchema = z
  .object({
    id: z.string().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
    items: z.array(navigationItemSchema).optional(),
  })
  .passthrough()
  .nullable();

export const promotionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
  })
  .passthrough();

export const alertActionSchema = z
  .object({ href: z.string(), label: z.string() })
  .passthrough();

export const alertSchema = z
  .object({
    actions: z.array(alertActionSchema),
    dismissible: z.boolean(),
    id: z.string(),
    placement: z.enum(['topBar', 'modal']),
    priority: z.number(),
    revision: z.union([z.number(), z.string()]),
    title: z.string(),
    message: z.string().optional(),
    pageSlugs: z.array(z.string()).optional(),
  })
  .passthrough();

export const bootstrapDataSchema = z
  .object({
    alerts: z.array(alertSchema),
    experience: z.unknown().nullable().optional(),
    featureFlags: z.record(z.string(), z.boolean()),
    navigation: navigationSchema.optional(),
    operationalControls: z.unknown().nullable().optional(),
    promotions: z.array(promotionSchema),
  })
  .passthrough();

// Every layout block must expose a non-empty blockType (Part 2.3): the shape
// beyond that is intentionally not modeled field-by-field, since new block
// types are expected to appear over time and this suite must not overfit to
// the block union that exists today.
export const blockSchema = z
  .object({
    blockType: z.string().min(1),
  })
  .passthrough();

export const pageSchema = z
  .object({
    id: z.string(),
    indexable: z.boolean(),
    layout: z.array(blockSchema),
    slug: z.string(),
    title: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const legalContentSchema = z
  .object({
    title: z.string(),
    legalVersion: z.string().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

export const apiErrorSchema = z
  .object({
    error: z.string().optional(),
    errors: z
      .array(
        z
          .object({
            message: z.string().optional(),
            name: z.string().optional(),
            path: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();
