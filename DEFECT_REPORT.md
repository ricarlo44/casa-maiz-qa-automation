# Defect report

## Title

Brand "tomato" text/background combinations fail WCAG 2.1 AA color contrast
(3.63:1 and 2.97:1 against a 4.5:1 requirement), on shared web and mobile
design tokens.

## Severity: Medium-High

Rationale: this hits primary conversion surfaces -- the home page's main
reservation call-to-action, the seasonal promotion rail (copy + CTA), the
brand mark, and every menu item's price -- not a peripheral element. Low-vision
and many normal-vision users under typical lighting will struggle to read
this text. It is also a WCAG 2.1 AA / EN 301 549 conformance gap (axe tags:
`wcag2aa`, `wcag143`, `EN-9.1.4.3`), which is a compliance exposure, not only
a cosmetic one. It is not Critical because the content remains present in the
DOM and technically operable (not a hard blocker to task completion).

## Affected platform, layer, or user journey

- **Web** (`payload-website-consumer`, Chromium, home page `/`): 7 distinct
  `color-contrast` violations across 9 elements:
  - `.vertical-mark` -- brand mark ("COCINA DE FUEGO · DESDE 2026")
  - `.dish-card span` (x3) -- menu item prices ("$220", "$185", "$340")
  - `.promo .eyebrow`, `.promo p`, `.promo a[href="/reservas"]` -- seasonal
    promotion copy and its CTA
  - `.final-cta p`, `.final-cta a[href="/reservas"]` -- the page's main
    reservation call-to-action
- **Likely also mobile** (`payload-mobile-consumer`): `src/theme/tokens.ts`
  defines the identical hex values (`tomato: '#EF4938'`, `white: '#FFFDF7'`,
  `blueSoft: '#DFE7F5'`) used by the web app, and the same
  white-text-on-tomato pairing recurs in the mobile components that share
  this token: `SharedBlocks.tsx` (CTA and form submit buttons),
  `ContentBlocks.tsx` (`CTABlock`), and `OperationalGate.tsx` (the "Update
  now" button). This was not independently measured on-device -- rendered
  color contrast is not observable through RNTL/jsdom -- but is flagged here
  because the root cause (the token itself) is shared, so a token-level fix
  should be applied to both platforms, and a visual/contrast check on device
  is recommended follow-up (see "Which important risks remain untested" in
  the mobile README).

## Preconditions

None. Reproduces on a clean, unauthenticated load of the public home page.

## Reproduction command

```bash
cd casa-maiz-qa-automation
npm ci
npx playwright install chromium
npm run test:web -- tests/web/accessibility.spec.ts
```

## Expected result

`npx axe-core` reports zero `serious`/`critical` WCAG 2 A/AA violations on
the home page (the test asserts the filtered violations array is empty).

## Actual result

7 `color-contrast` violations (`impact: serious`) across 9 nodes, all pairing
`#EF4938` (tomato) with either `#FFFDF7` (white/cream text on a tomato
background, 3.63:1) or `#DFE7F5` (tomato text on a soft-blue background,
2.97:1) -- both below the 4.5:1 threshold required for normal-size text.

## Automated evidence

`tests/web/accessibility.spec.ts` -- `home has no serious or critical
automated accessibility violations`. This test is intentionally left
**failing** (not marked as a known deviation) because it is the primary,
newly-discovered defect this report describes: `npm run test:web` will show
one red test until this is fixed. Every other test in both projects passes.
The Playwright HTML report and trace for this test enumerate all 9 nodes with
exact selectors, colors, font sizes/weights, and measured ratios.

## Likely technical cause / investigation direction

The `tomato` (`#EF4938`) brand accent is used directly as a background for
white/cream text and as a foreground on the soft-blue surface in several
independent components, without a contrast-checked variant for either use.
Recommended fix is at the design-token level, not per component: introduce a
darkened `tomato` variant for use as background-under-white-text (or a
guaranteed-dark text color for use over the current `tomato`), since
`src/theme/tokens.ts` in the mobile repository defines the exact same hex
values consumed by the web app -- a token-level fix keeps both platforms in
sync in one change instead of patching each occurrence separately.

---

## Known deviations (secondary findings, tracked but not blocking)

These are real, reproducible discrepancies between the published OpenAPI
contract and the live API's runtime behavior, found while building the API
test suite (Part 2.4 and 2.6). Each has a strict, unweakened assertion in the
suite, marked with Playwright's `test.fail()` so it stays visible in the
report without blocking every future run on an already-filed issue -- see
"Known-failure handling policy" in this repository's README for the full
reasoning.

1. **`market` and `audience` are documented as required `const` values
   (`"MX"` / `"guest"`) but the runtime silently accepts any value or omits
   them entirely instead of returning `400`.**
   Evidence: `tests/api/context-validation.spec.ts`.
2. **`appVersion` is documented as `required` but omitting it entirely
   returns `200`, not `400`** (while a *malformed* `appVersion` correctly
   returns `400` -- the format check exists, the presence check does not).
   Evidence: `tests/api/context-validation.spec.ts`.
3. **A missing media file leaks a non-contract error.** `GET
   /api/media/file/{filename}` unconditionally `307`-redirects to CloudFront
   regardless of whether the file exists; for a missing file this surfaces
   CloudFront's own `403 AccessDenied` XML body instead of the API's
   documented `404` JSON `APIError`. A client that trusts the OpenAPI
   contract (parses JSON, checks for `404`) will mishandle this response.
   Evidence: `tests/api/errors-and-media.spec.ts`.
