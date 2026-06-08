# Wave-1 Fact-Finding: Binding-error live REST trace (FP-F + SP-G)

**Report type:** WAVE-1 FACTS ONLY — no root-cause narrative, no solution, no clustering. Resolves the two "blocked-with-reason: needs live request trace" items from sections 4 (Featured-product) and 7 (Social Proof).
**Date:** 2026-06-08
**Method:** Live REST trace against the canary `https://sandybrown-nightingale-600381.hostingersite.com` (WP 7.0). App-password Basic auth for direct REST; Playwright editor session (logged in as `Claude`) to capture the EXACT request `ServerSideRender` fires. A throwaway draft page (id 892) was created via `POST /wp/v2/pages` with both blocks in bound mode, opened in the editor, network captured, then deleted (`DELETE /wp/v2/pages/892?force=true` → 200). `post_content` was NOT modified by WP-CLI/PHP (page created through the allowed REST route).
**Sources verified:** live editor network capture (requests #673 + #674), live REST replay (curl-equivalent Python), `product-card/block.json`, `product-card/edit.js`, `trustpilot-reviews/block.json`, `trustpilot-reviews/edit.js`, the three JS extensions, the three PHP includes, and WP-core source on the server (`class-wp-rest-block-renderer-controller.php`, `rest-api.php`).

> **Correction to the two prior section docs.** `04b-featured-product-architecture.md` (FP-F) stated product-card's editor "calls `wc/v3/products` and the entity store — neither would trigger an attributes error" and listed three plugin-side emitters (`block-defaults.php:144`, `class-product-authoring.php:319`, `class-product-provisioning-args.php:221`) as candidates. **The live trace refutes all three** — none of them fires. The real path is `ServerSideRender` → `GET /wp/v2/block-renderer/sgs/product-card`. `07b-social-proof.md` (SP-G) correctly identified the WP-core `rest_validate_value_from_schema` path but left the failing attribute "BLOCKED". Both are now pinned.

---

## FP-F — Error origin for "Invalid parameter(s): attributes" (product-card bound to a product)

### Issue (verbatim)
"tried binding the [product-card] block to both of the product pages... got 'Error loading block: Invalid parameter(s): attributes'. This happened for both posts... and... all 3 variant styles."

### CLONE / LIVE facts (the failing endpoint + request + JSON error response)

**Failing endpoint (HTTP 400):**
`GET /wp-json/wp/v2/block-renderer/sgs/product-card?context=edit&attributes[...]&post_id=892&_locale=user`

This is the request fired by `<ServerSideRender block="sgs/product-card" attributes={attributes} />` in `product-card/edit.js:464-467`, which runs **only when `isBound`** (`sourceMode !== 'typed'` — `edit.js:267,462`). Confirmed live as captured editor request **#673**, status **[400]**, `duration: 147ms`, `mimeType: application/json`, request header `x-wp-nonce: 931894550d`.

**Exact JSON error response (quoted verbatim from the live response body):**
```json
{"code":"rest_invalid_param","message":"Invalid parameter(s): attributes","data":{"status":400,"params":{"attributes":"sgsAnimation is not a valid property of Object."},"details":{"attributes":{"code":"rest_additional_properties_forbidden","message":"sgsAnimation is not a valid property of Object.","data":null}}}}
```

**Which attribute fails validation:** `sgsAnimation` — error code `rest_additional_properties_forbidden`. It is the FIRST attribute in the editor's payload that is not a registered server-side property of `sgs/product-card`. The editor request sends the full `sgs*` extension family that product-card does not declare in block.json, e.g. (quoted from the captured request query string):
`attributes[sgsAnimation]=none&attributes[sgsAnimationDelay]=0&attributes[sgsAnimationDuration]=medium&attributes[sgsAnimationEasing]=default&attributes[sgsHideOnMobile]=false&...&attributes[sgsHoverScale]=0&...&attributes[sgsHeightDesktop]=0&...`

**Reproduction control (proves the mechanism, not an artefact):** the same endpoint with ONLY the bound attrs (`sourceMode=wc-product&productId=540`) returns **200** and renders the live configurator. The 400 appears only once the `sgs*` extension attributes are included — i.e. the editor's real payload. (An earlier mid-trace test that injected `style`/`metadata` as JSON *strings* produced a different error — `rest_invalid_type` "[style] is not of type object" — that was an artefact of string-serialising an object in the test, NOT the real editor path. The real editor serialises objects as nested brackets, which validate fine.)

### DB / SCHEMA facts (the attribute schema that rejected it)

- `product-card/block.json` (`src/blocks/product-card/block.json`, attributes block lines 38-176) registers **zero** `sgs*` extension attributes — `grep -c "sgsAnimation" = 0`. Its only `sgs` token is the `supports.sgs.imageControls` key (line 22). So `$block->get_attributes()` for `sgs/product-card` contains none of `sgsAnimation`, `sgsAnimationDelay`, the `sgsHideOn*` family, the `sgsHover*` family, etc.
- The validation schema the block-renderer builds uses `'properties' => $block->get_attributes()` with `'additionalProperties' => false` (see WP-core refs). With product-card declaring no `sgs*` attrs, the first `sgs*` key the editor sends (`sgsAnimation`) is the first rejected property.

### SPEC / DOC refs
- Not a spec-defined behaviour — this is a REST schema-validation error path. Governing block reference: `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` product-card entry (attribute list matches block.json; no `sgs*` extension attrs listed). Block customisation standard (`plugins/sgs-blocks/CLAUDE.md` → "Extensions (4 built)": Animation / Responsive Visibility / Hover State Controls) documents these as universal editor extensions.

### PIPELINE / CODE-LOCATION facts (exact file:line that emits/validates it)

**WP-core validator (where "Invalid parameter(s): attributes" + `rest_additional_properties_forbidden` are emitted) — server WP 7.0, webroot `domains/sandybrown-nightingale-600381.hostingersite.com/public_html`:**
- `wp-includes/rest-api/endpoints/class-wp-rest-block-renderer-controller.php:67-68` — builds the validation schema: `'properties' => $block->get_attributes(),` / `'additionalProperties' => false,`
- `wp-includes/rest-api/endpoints/class-wp-rest-block-renderer-controller.php:71` — `return rest_validate_value_from_schema( $value, $schema );` (the `attributes` arg `validate_callback`). (A second identical schema block at lines 83-84 covers the POST route.)
- `wp-includes/rest-api.php:2421-2423` — emits the error: code `'rest_additional_properties_forbidden'`, message `sprintf( __( '%1$s is not a valid property of Object.' ), $property )`.
- The "Invalid parameter(s): attributes" wrapper string is WP-core's `rest_invalid_param` aggregation (not present anywhere in the SGS plugin source — confirmed earlier: zero matches in `plugins/sgs-blocks/src/`). The "Error loading block:" prefix Bean sees is the `@wordpress/server-side-render` component's error-state wrapper around that message.

**Where the offending attribute is INJECTED into the editor block (client-side only, not server-registered):**
- `src/blocks/extensions/animation.js:118-119` — `addFilter( 'blocks.registerBlockType', ... )` adds the animation attrs to (filtered) blocks in the editor; `animation.js:95` adds `sgsAnimation: { type: 'string', default: ... ?? 'none' }`.
- `src/blocks/extensions/responsive-visibility.js:75` (+ `:68` `sgsHideOnMobile`) and `src/blocks/extensions/hover-effects.js:138` (+ `:159` `sgsHoverScale`) add the rest of the `sgs*` family the same way.

**Where the PHP side handles these attrs (render-time ONLY — does NOT add them to the block schema):**
- `includes/animation-attributes.php:23` — `add_filter( 'render_block', ... )` only (reads `$attrs['sgsAnimation']` etc. at output time, line 73-82). No `register_block_type_args`.
- `includes/device-visibility.php:56` — `add_filter( 'render_block', ... )` only.
- `includes/hover-effects.php:33` — `add_filter( 'render_block', ... )` only.
- None of the three registers the `sgs*` attributes into the block type, so they are absent from `$block->get_attributes()` for any block that does not declare them in its own block.json.

---

## SP-G — Error origin for "Invalid parameter(s): attributes" (trustpilot-reviews)

### Issue (verbatim)
"...However similar to the product-card block when set to take content from a specific product it gives this error message: 'Error loading block: Invalid parameter(s): attributes'. This is a routing and block error."

### CLONE / LIVE facts (the failing endpoint + request + JSON error response)

**Failing endpoint (HTTP 400):**
`GET /wp-json/wp/v2/block-renderer/sgs/trustpilot-reviews?context=edit&attributes[...]&post_id=892&_locale=user`

Fired by `<ServerSideRender block="sgs/trustpilot-reviews" attributes={attributes} />` in `trustpilot-reviews/edit.js:401-404` — this block renders through `ServerSideRender` **unconditionally** (no bound/typed branch). Confirmed live as captured editor request **#674**, status **[400]**. (Note: `sgs/trustpilot-reviews` has **no** product-binding mode at all — `dataSource` enum is `inline|synced|placeholder`, block.json lines 51-59. Bean's "when set to take content from a specific product" is a behavioural analogy to the product-card error, not an actual product-bind; the error is the same class but reproduces on the plain block as soon as the editor renders it with the extension attrs present.)

**Exact JSON error response (quoted verbatim from the live response body):**
```json
{"code":"rest_invalid_param","message":"Invalid parameter(s): attributes","data":{"status":400,"params":{"attributes":"sgsAnimationDelay is not a valid property of Object."},"details":{"attributes":{"code":"rest_additional_properties_forbidden","message":"sgsAnimationDelay is not a valid property of Object.","data":null}}}}
```

**Which attribute fails validation:** `sgsAnimationDelay` — code `rest_additional_properties_forbidden`. The failing property differs from FP-F's (`sgsAnimation`) for one reason only: trustpilot-reviews **does** declare `sgsAnimation` (+ `sgsAnimationDuration`, `sgsAnimationEasing`) in its block.json, so the validator accepts those and trips on the next unknown one — `sgsAnimationDelay` — which trustpilot's block.json does **not** declare. Quoted from the captured request: `...&attributes[sgsAnimation]=fade-up&attributes[sgsAnimationDuration]=medium&attributes[sgsAnimationEasing]=ease-out&...&attributes[sgsAnimationDelay]=0&attributes[sgsHideOnMobile]=false&...`

**Reproduction control:** the same endpoint with no `sgs*` attrs (defaults / inline reviews) returns **200** and renders the JSON-LD + carousel. The 400 appears only with the editor's full `sgs*` payload.

### DB / SCHEMA facts (the attribute schema that rejected it)

- `trustpilot-reviews/block.json` (`src/blocks/trustpilot-reviews/block.json`) **declares** `sgsAnimation` (lines 164-167, default `"fade-up"`), `sgsAnimationDuration` (168-171), `sgsAnimationEasing` (172-175), and `staggerDelay` (176-179) — but **NOT** `sgsAnimationDelay`, and none of the `sgsHideOn*` / `sgsHover*` / `sgsCondition*` / `sgsClick*` / `sgsParallax*` family. Hence `$block->get_attributes()` for `sgs/trustpilot-reviews` is missing `sgsAnimationDelay` (and the rest of the editor-injected family).
- Validation schema: same `'properties' => $block->get_attributes()` + `'additionalProperties' => false`.
- (SP-G's separate routing facts — converter emitted `sgs/testimonial-slider`, no slot maps to `sgs/trustpilot-reviews`, `has_inner_blocks` values — are already fact-complete in `07b-social-proof.md` and are not re-derived here; this entry only resolves the binding-error sub-item.)

### SPEC / DOC refs
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` `sgs/trustpilot-reviews` entry (lines 2656-2736): `dataSource` enum `inline/synced/placeholder`; no product/CPT binding mode — confirms there is no "bind to product" path on this block.

### PIPELINE / CODE-LOCATION facts (exact file:line that emits/validates it)

- Same WP-core emitter/validator as FP-F: `class-wp-rest-block-renderer-controller.php:67-68,71` (schema with `additionalProperties => false`) and `rest-api.php:2421-2423` (`rest_additional_properties_forbidden` message). Server WP 7.0.
- Editor injector of the offending attr: `src/blocks/extensions/animation.js:96` — `sgsAnimationDelay: { type: 'string', default: ... ?? '0' }`, added via the `addFilter( 'blocks.registerBlockType', ... )` at `animation.js:118-119`.
- PHP side reads `$attrs['sgsAnimationDelay']` at render time only — `includes/animation-attributes.php:80` — under the `render_block` filter (`:23`); not registered into the block schema.
- `ServerSideRender` call site: `src/blocks/trustpilot-reviews/edit.js:401-404`.

---

## Do FP-F and SP-G share the same cause?

**Yes — identical mechanism.** Both: the editor injects the universal `sgs*` extension attribute family (animation / responsive-visibility / hover) into the block via client-side `addFilter('blocks.registerBlockType')`; `ServerSideRender` sends the full attribute set to `GET /wp/v2/block-renderer/<block>?context=edit`; WP-core builds a validation schema `properties = $block->get_attributes()` with `additionalProperties:false` (`class-wp-rest-block-renderer-controller.php:67-71`); the first editor-sent attribute absent from that block's server-registered schema is rejected with `rest_additional_properties_forbidden` (`rest-api.php:2421-2423`), surfaced as "Invalid parameter(s): attributes". The PHP extension includes hook `render_block` only and never register the attrs server-side. The two blocks report **different** first-failing property names (`sgsAnimation` vs `sgsAnimationDelay`) solely because their block.json files register different subsets of the `sgs*` family, so the validator trips at a different point in the same payload.

**Factual contrast (not a fix):** the 10 blocks that DO declare `sgsAnimation` in block.json (`card-grid, gallery, google-reviews, info-box, post-grid, pricing-table, process-steps, team-member, testimonial, trustpilot-reviews`) only partially declare the family — full immunity would require every editor-injected `sgs*` attr to be server-registered for that block. (Why the registration is partial, and how to close it, is Wave-2 root-cause + solution.)

---

## Blast-radius scan — which blocks are affected (added 2026-06-08)

The error can only occur for a block that **(a)** previews via the `@wordpress/server-side-render` component in its `edit.js` (only that path POSTs/GETs attributes to `/wp/v2/block-renderer/<block>` for validation) **AND (b)** has ≥1 editor-injected `sgs*` extension attribute absent from its server-side block.json. Static/`save.js` blocks and InnerBlocks-preview blocks never call block-renderer, so they cannot hit this regardless of unregistered attrs.

**Step 1 — blocks using `ServerSideRender` (`grep -rl ServerSideRender src/blocks/*/edit.js`):** `business-info`, `content-collection`, `post-grid`, `product-card`, `trustpilot-reviews` (5 candidates).

**Step 2 — live editor capture (test pages 892 + 893, opened in the real editor, network captured, both pages then deleted):**

| Block | SSR actually fired? | block.json `sgs*` attrs registered | Live block-renderer result | First failing attr |
|-------|--------------------|-----------------------------------|---------------------------|--------------------|
| `sgs/product-card` (bound) | Yes (req #673) | none | **400** | `sgsAnimation` |
| `sgs/trustpilot-reviews` | Yes (req #674) | `sgsAnimation`, `sgsAnimationDuration`, `sgsAnimationEasing` | **400** | `sgsAnimationDelay` |
| `sgs/business-info` | Yes (req #673, pg 893) | none | **400** | `sgsAnimation` |
| `sgs/content-collection` | Yes (req #674, pg 893) | none | **400** | `sgsAnimation` |
| `sgs/post-grid` | **No** — edit.js previews "via useEntityRecords (no ServerSideRender round-trips)" (`post-grid/edit.js:4` comment; the only `ServerSideRender` token in the file is that comment) | `sgsAnimation`, `sgsAnimationDuration`, `sgsAnimationEasing` | **no call made** (not affected on default load) | n/a |

**Affected (confirmed live, HTTP 400): 4 blocks** — `product-card` (bound mode only; typed mode uses InnerBlocks, no SSR), `trustpilot-reviews`, `business-info`, `content-collection`. Every other SGS/core block either does not use the SSR component or registers the `sgs*` family it needs (the 10 block.json files that declare `sgsAnimation` — `card-grid, gallery, google-reviews, info-box, post-grid, pricing-table, process-steps, team-member, testimonial, trustpilot-reviews` — are not SSR-preview blocks except trustpilot, so their partial registration is currently inert).

**Latent note (fact, not a prediction of failure):** `post-grid` registers only `sgsAnimation/Duration/Easing` (missing `sgsAnimationDelay` + the visibility/hover family). It does not trip the error today because it never invokes the SSR component — but its block.json is in the same partial-registration state as `trustpilot-reviews`. If any future post-grid mode renders via `ServerSideRender`, it would 400 on the same class of attr.

---

## Fix — BUILT + VERIFIED on canary (2026-06-08)

> Bean approved building the universal + drift-proofed fix. Done and live-verified on the canary (not yet committed to git, not yet on production).

**What shipped (canary):**
- `plugins/sgs-blocks/scripts/generate-extension-attributes.js` — scans `src/blocks/extensions/*.js` (the single source of truth) for every `sgs*: { ... type ... }` definition and emits `includes/extension-attributes.generated.php` (46 attributes). Wired into `package.json` `prebuild` + `prestart` (WRITE mode), so **every build regenerates the list from the JS and cannot ship a stale list** — this is the actual drift protection. A `--check` mode (exit 1 on drift) exists for a future pre-commit hook / CI but is **not yet wired into any automated step** (corrected after qc-council 2026-06-08; earlier wording overstated this as a live "CI guard"). The match regex was hardened post-council to be quote-style- and key-order-independent so a `prettier` change can't silently drop attributes.
- `plugins/sgs-blocks/includes/extension-attributes.generated.php` — the generated attribute→type map (auto-generated; do not hand-edit).
- `plugins/sgs-blocks/includes/extension-attrs-rest-register.php` — a `register_block_type_args` filter that merges the generated schema into **every block that supports `className`** (mirrors the JS extensions' own targeting; existing block.json attributes always win). No per-block scope, no hardcoded list (R-22-9 universal; no-hardcoded-dicts compliant).
- `plugins/sgs-blocks/sgs-blocks.php` — requires the new include.

**Live verification (canary, after deploy + OPcache reset):**
| Block | Before | After |
|-------|--------|-------|
| `sgs/product-card` (bound) | 400 `sgsAnimation` | **200** (REST replay + live editor req #694) |
| `sgs/trustpilot-reviews` | 400 `sgsAnimationDelay` | **200** |
| `sgs/business-info` | 400 `sgsAnimation` | **200** (REST replay + live editor req #691) |
| `sgs/content-collection` | 400 `sgsAnimation` | **200** |
| Drift guard `--check` | n/a | exit 0, "46 attributes, up to date" |

Editor-level confirmation for the two headline cases (business-info + product-card-bound): block-renderer request returns 200, **0 console errors** (was 2), block renders with no "Error loading block" banner.

**QC-council verdict (2026-06-08, 3 cross-model raters):** `validated-shipped`. Rater A (regression): SAFE — filter only ADDS schema keys, cannot regress any 200→400; all `sgs*` name-collisions with block.json attrs are same-type and `array_merge` lets the block's own definition win. Rater B (false-200): SOUND — independently re-rendered all 4 with the full 46-attr payload and confirmed REAL output (live £9.99 / 16-pill bound configurator, Trustpilot JSON-LD, etc.), not empty shells. Rater C (completeness/drift): GAPS-FOUND (low) — affected set complete (4 blocks); caught two FUTURE-drift gaps now closed/corrected: regex hardened (above) + the "CI guard" overclaim corrected (above). Council notes (latent, no current trigger): `custom-css.js` has no className guard, so a future `className:false` SSR block would still 400 on `sgsCustomCss` — drop the PHP className guard if that ever ships.

**Outstanding (not done here):** git commit (path-scoped, awaiting Bean's go), production deploy (palestine-lives.org), a one-line decisions.md entry, and an OPTIONAL structural follow-up — wire `generate-extension-attributes.js --check` into a pre-commit hook / CI so a JS-only edit deployed without `npm run build` can't reintroduce the 400 (Rule-10 structural enforcement). No regression risk to non-SSR blocks (extra registered attrs are inert unless the editor sends them).

---

### Confidence record (pre-build, retained)

**Fix shape (high confidence ~90-95%):** register the same `sgs*` attribute schema the three JS extensions add (`animation.js`, `responsive-visibility.js`, `hover-effects.js`) **server-side**, via a PHP `register_block_type_args` (or `block_type_metadata_settings`) filter targeting the same block set the JS targets (blocks that support `className`). This is the documented WordPress remedy for this exact symptom (Gutenberg issues #22773 + #16850; WP Trac #45882): attributes added through a JS `blocks.registerBlockType` filter MUST be mirrored in the server-registered attribute schema, or `ServerSideRender` fails validation with "Invalid parameter(s): attributes".

**Why confidence is high — a natural experiment already proves the direction:** `trustpilot-reviews` registers `sgsAnimation` server-side and the validator **accepted** it (it passed `sgsAnimation` and only tripped on the *next* unregistered attr, `sgsAnimationDelay`). So "register the attr server-side → block-renderer accepts it" is already observed live, not theorised.

**Why not 100% yet:** (1) the fix is not built or deployed, so the end-to-end "200 after fix" has not been re-traced on these 4 blocks; (2) the PHP schema must match the JS attribute **types/defaults exactly** and target the **same block set**, or some attrs stay unregistered and the error just moves to the next one; (3) the three PHP includes currently hook `render_block` only — the fix adds a *new* registration hook, which is a shared-mechanism change (R-22-9 universal + Rule 7 design-gate territory). Final confidence reaches 100% only after building the registration and re-running this exact trace to confirm all 4 blocks return 200.

---

## Coverage checklist

| Item | Status |
|------|--------|
| FP-F: failing endpoint (live, 400) | fact-complete — `GET /wp/v2/block-renderer/sgs/product-card?context=edit` (editor req #673) |
| FP-F: exact JSON error response (quoted) | fact-complete — `sgsAnimation is not a valid property of Object.` / `rest_additional_properties_forbidden` |
| FP-F: which attribute fails | fact-complete — `sgsAnimation` (first unregistered `sgs*` attr) |
| FP-F: schema that rejects it | fact-complete — product-card block.json registers 0 `sgs*` attrs; validator `additionalProperties:false` |
| FP-F: WP-core file:line | fact-complete — controller `:67-71`; rest-api.php `:2421-2423` |
| FP-F: editor injector + PHP render-only handler file:line | fact-complete — animation.js `:95,118-119`; animation-attributes.php `:23` render_block-only |
| FP-F: prior-doc 3 candidate emitters | fact-complete — REFUTED live (none fire) |
| SP-G: failing endpoint (live, 400) | fact-complete — `GET /wp/v2/block-renderer/sgs/trustpilot-reviews?context=edit` (editor req #674) |
| SP-G: exact JSON error response (quoted) | fact-complete — `sgsAnimationDelay is not a valid property of Object.` |
| SP-G: which attribute fails + why different from FP-F | fact-complete — `sgsAnimationDelay`; trustpilot declares `sgsAnimation` but not `sgsAnimationDelay` |
| SP-G: schema that rejects it | fact-complete — trustpilot block.json declares `sgsAnimation/Duration/Easing` only |
| SP-G: WP-core + injector file:line | fact-complete — same WP-core refs; animation.js `:96` |
| FP-F vs SP-G same cause? | fact-complete — YES, identical mechanism; different first-failing prop due to differing block.json subsets |
