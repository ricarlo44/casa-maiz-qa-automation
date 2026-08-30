# Casa Maíz QA automation

TypeScript API/contract tests and Playwright browser tests for the public
Payload CMS and the published Casa Maíz web consumer. This is the "separate
API and web automation repository" for the QA technical assessment; the
React Native component/integration and mobile end-to-end work lives in the
`payload-mobile-consumer` fork (see that repository's README).

## Why one Playwright config, two projects

Both the API checks and the browser checks are read-only, order-independent,
and need the same reporting/tracing/CI story, so they run under a single
`playwright.config.ts` with two isolated **projects**: `api` (HTTP only, no
browser) and `web` (Chromium against the published site). They never share a
browser context or mutable state, each can be run alone
(`npm run test:api` / `npm run test:web`), and they produce one combined
report -- this satisfies "keep the browser project isolated from the API
project" without paying for a second test framework (e.g. Vitest) in a
3-4 day assessment. `src/contracts/*` (zod schemas, the cache-boundary rule,
the media-URL resolver) is shared between both projects and deliberately
mirrors logic in the mobile app, see "Contract reuse" below.

## Setup

```bash
npm ci
cp .env.example .env   # optional; defaults already point at the public targets
npx playwright install chromium
```

Requires Node.js 20.6+ (uses the built-in `process.loadEnvFile`) -- tested
with Node 24. No secrets are involved: both targets are public and
unauthenticated, `.env` only overrides base URLs/delivery-context defaults.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `CMS_URL` | `https://payload-cms-poc-seven.vercel.app` | Public content API base URL |
| `WEBSITE_URL` | `https://payload-website-consumer.vercel.app` | Casa Maíz web consumer under test |
| `CMS_MARKET` | `MX` | Default `market` query parameter |
| `CMS_AUDIENCE` | `guest` | Default `audience` query parameter |
| `CMS_APP_VERSION` | `2.4.0` | Default `appVersion` query parameter |

`platform` is not configured globally -- tests request `ios`/`android`
explicitly per Part 2.2's requirement to validate both.

## Running the suite

```bash
npm run typecheck   # tsc --noEmit
npm run test:api    # API/contract tests only
npm run test:web    # Playwright browser tests only
npm test            # both projects
npm run report      # open the last HTML report
```

Reports and artifacts:

- `playwright-report/` -- HTML report (`npm run report` to open)
- `test-results/results.json` -- machine-readable JSON report
- `test-results/<test>/` -- trace, screenshot, and video **only for failed
  tests** (`trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`,
  `video: 'retain-on-failure'`); open a trace with
  `npx playwright show-trace test-results/<test>/trace.zip`

All of the above are gitignored; nothing generated is committed.

### Expect one failing test today

`npm run test:web` currently reports **one failing test**:
`tests/web/accessibility.spec.ts` -- this is the reported defect (see
[`DEFECT_REPORT.md`](./DEFECT_REPORT.md)), not a broken test, and the run
correctly exits non-zero because of it. Every other test in both projects
passes. See "Known-failure handling policy" below for why this one is left
red while three other known issues are not.

## Risk model

Highest-impact risks this suite targets, and why each sits at its layer:

| Risk | Layer | Why here |
| --- | --- | --- |
| A contract change silently breaks every client (breaking major bump, or a required field disappearing) | API | Cheapest, fastest place to catch it; no UI needed to prove the JSON shape changed |
| `platform`/`market`/`audience`/`appVersion` targeting diverges from the published OpenAPI contract | API | The contract itself is the source of truth; a browser can only observe the *consequence*, not the parameter contract |
| Stale/cached content served past its `nextChangeAt` boundary | API (boundary logic) + shared with mobile's own cache tests | The rule is pure logic (a timestamp comparison) -- fastest and most deterministic as a unit-style check with fixed clocks, not a live timing-dependent E2E wait |
| A CMS block ships without a usable `blockType`, breaking a client's block registry | API | Structural, content-agnostic; does not require rendering anything |
| The published site fails to load, navigate, or degrades unsafely when media is unavailable | Web E2E | Only observable by actually loading the page in a real browser engine |
| The site is unusable/unreadable for low-vision users | Web E2E (axe) | Requires real rendered color/contrast computation, not obtainable from a JSON response |
| Absolute vs. relative Payload media URLs both resolve correctly | API (unit, on the shared resolver) | The transformation is pure logic; today's live data only exercises the absolute-URL branch, so the relative-URL branch is verified directly rather than skipped |

## Contract reuse across mobile and web

`src/contracts/cache.ts` and `src/contracts/media.ts` are small, deliberate
ports of two rules from `payload-mobile-consumer`:

- `isWithinCacheWindow` mirrors `src/api/cache.ts`'s `isCachedEnvelopeValid`
  -- cached content is valid *strictly before* `nextChangeAt`, expired at or
  after it.
- `resolveMediaURL` mirrors `src/api/content.ts`'s `absoluteMediaURL` --
  absolute URLs pass through, relative Payload paths resolve against the CMS
  origin.

Porting the rule (not the code) keeps this repository free of any dependency
on the mobile app's source tree (explicitly out of scope: "do not duplicate
the mobile application into the automation repository"), while still
verifying the two platforms agree on what the contract actually means at
these two specific, previously-tricky boundaries.

## Known-failure handling policy (Part 2.4)

Three discrepancies between the published OpenAPI contract and the live
API's runtime behavior are known and already reported (see
`DEFECT_REPORT.md`, "Known deviations"): `market`/`audience` constraint
enforcement, `appVersion` required-ness, and the media-file error shape.
Each has a **strict, unweakened assertion** -- it asserts what the contract
actually promises -- marked with Playwright's `test.fail()`:

```ts
test.fail(true, 'DEFECT (see DEFECT_REPORT.md): ...');
test('market is documented as a required const "MX" but ...', async ({ request }) => {
  const response = await getContent(request, 'bootstrap', { market: 'US' });
  expect(response.status()).toBe(400); // still asserts the correct behavior
});
```

This is deliberate, not a weakened test:

- the assertion is never loosened to match the buggy behavior;
- the failure is preserved and visible in the report (Playwright records it
  as an "expected failure", distinct from a pass);
- a normal `npm test` run is not blocked by defects that are already filed,
  so the suite stays useful as a regression gate for *everything else*;
- if the API is ever fixed to match its own contract, the test flips to an
  **unexpected pass** -- a loud signal (the run goes red) to come back and
  delete the `test.fail()` marker, rather than a silent, unnoticed fix.

The one exception is the newly-discovered accessibility defect
(`tests/web/accessibility.spec.ts`): it is **left as a plain, unmarked
failing test** on purpose, because it is this submission's primary reported
defect -- "a reproducible defect with an automated failing test" is meant to
be visible by just running the suite, not opted into.

## Design choices and trade-offs

- **Playwright's own `request` fixture** for API calls, not a separate HTTP
  client -- one less dependency, and API calls get the same
  trace/report/retry-free story as browser tests for free.
- **`zod` with `.passthrough()` everywhere** -- schemas validate the fields
  this suite actually depends on and stop there. `.passthrough()` is what
  makes Part 2.1's requirement concrete: an envelope with an extra,
  never-seen-before field must still parse; only a missing required field or
  an incompatible major version should fail.
- **`@axe-core/playwright`** for the accessibility scan -- an
  industry-standard automated WCAG ruleset instead of hand-rolling contrast
  math; paired with one explicit, code-level check (every image has
  non-empty `alt`) that axe does not directly express in this suite's terms.
- **Selectors**: role + accessible name (`getByRole`) for interactive
  elements, and `a[href="..."]` for navigation destinations. The site has no
  `data-testid` attributes, and one accented label ("MENÚ") turned out to
  fail Playwright's exact accessible-name match during exploration (a
  Unicode-normalization mismatch between the source text and the rendered
  DOM) -- worth knowing about if you add more nav-link assertions; the
  fixed navigation links here route around it with `href` instead of chasing
  the accented string.
- **No page-object layer.** The suite is small enough that one shared helper
  (`src/web/notice.ts`, dismissing the initial CMS alert) covers the only
  real duplication across web specs; a full page-object hierarchy would add
  indirection without reducing any actual maintenance cost here.
- **`fullyParallel: true`, capped at 4 local workers.** Every test builds
  its own query/state and asserts nothing about ordering or about other
  tests, so parallel execution is safe; the worker cap is a courtesy to the
  shared public CMS/website, not a correctness requirement.
- **Chromium only**, per the assessment's required scope. The suite would
  extend to Firefox/WebKit by adding projects with `devices['Desktop
  Firefox']` / `devices['Desktop Safari']` under the existing `web` test
  directory -- the specs themselves are not Chromium-specific (no
  browser-specific APIs are used), so this is a config-only change, not a
  rewrite.
