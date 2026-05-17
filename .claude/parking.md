---
doc_type: parking
project: small-giants-wp
last_updated: 2026-05-19
---

# Parking — deferred work with named triggers

## Opened 2026-05-17 (architecture fix surfaced at session close)

### P-USE-PAGES-NOT-POSTS — Pipeline target should be WP PAGES, not POSTS (FOUNDATION, ~30 min) — **CLOSED 2026-05-18**

**Resolution:** Page 131 (`/cv2-output-mamas-munches/`) created via REST; page 132 (`/mockup-baseline-mamas-munches/`) created as baseline sibling. `reports/brand-walkdown-2026-05-19/upload_and_patch.py` rewritten with `argparse` — accepts `--target page|post` + `--target-id <N>`, defaults to `--target page --target-id 131`. Convention documented in root `CLAUDE.md` under "Site Migration". Pushed yesterday's `extract.patched.json` block_markup to page 131; rendered HTML confirms `<main class="...is-layout-flow...">` (no 800px cap) vs post 65 which still renders `is-layout-constrained`. Architectural existence proof matches hero-clone-poc. Captured 2026-05-18.

**Bean's question 2026-05-17:** "Why are you using post templates for pages anyway?"

**Honest answer:** historical inertia. Posts 65 + 66 were created early in the project as test surfaces with slugs `spec16-p7-converter-v2-output-2026-05-15` + `spec16-p7-mockup-baseline-2026-05-15`. The handoff said "Post 65 (cv2 output)" — I just kept pushing there. The `reports/brand-walkdown-2026-05-19/upload_and_patch.py` script hardcodes `/wp/v2/posts/65`.

**Why it's wrong:** SGS framework clones *websites*. Websites are PAGES (homepage as static front-page, plus sub-pages) — never blog POSTS. The WP `single.html` template was designed for blog-post content reading: `.entry-content { max-width: 800px }`, `is-layout-constrained` main wrapper, no `alignfull` defaults. None of that applies to landing pages.

**The fix:**

1. Create a new WP page `/cv2-output-mamas-munches/` (or repurpose hero-clone-poc URL pattern)
2. Update `upload_and_patch.py`: change `posts/65` → `pages/{new-id}` (REST endpoint `/wp-json/wp/v2/pages/{id}`)
3. Update mockup-baseline post 66 similarly → page 66
4. Add a CLI flag `--target page|post` to upload_and_patch.py (page default)
5. Document the pages-not-posts convention in CLAUDE.md so future sessions don't inherit the wrong pattern
6. Optionally: parking P-PIPELINE-REGISTER-TO-WP-STAGE — promote the `upload_and_patch.py` one-shot into a proper orchestrator stage with `--target` flag built-in

**Trigger:** START OF NEXT SESSION — this is the foundation under P-WP-ALIGNMENT-WIDTH-SYSTEM. With pages, much of the alignment-width work simplifies because `page.html` already gives sections more room.

Captured 2026-05-17 at session close.

---

### P-WP-ALIGNMENT-WIDTH-SYSTEM — Per-mockup theme content widths + per-block alignment selectors (PRIORITY, after P-USE-PAGES-NOT-POSTS) (~2-3 hrs)

**TL;DR:** Even after switching to pages, mockups author sections at non-WP-aligned widths (Mama's brand at `max-width: 1000px`) which need a per-mockup `contentSize`/`wideSize` AND a sgs/container `widthMode` selector to map cleanly to WP-native alignment. Hero-clone-poc at https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/ proves the alignfull mechanism works on a PAGE. This work is downstream of P-USE-PAGES-NOT-POSTS but still needed for true mockup fidelity.

**Live evidence (2026-05-17):**

Post 65 (post template, `single.html`):
- `.entry-content { max-width: 800px }` parent → caps every section to 800
- Brand declares `max-width: 1000px` inline → SGS theme caps at 800
- Hero declares `max-width: 100%` → 800 (filled to parent)

Hero-clone-poc (page template, `page.html`):
- `.entry-content { max-width: none }` parent → no cap
- Hero has `alignfull` class → renders 1440 (full viewport)
- ALSO main wrapper is `is-layout-flow` (vs `is-layout-constrained` on post)

Raw mockup file:// (no WP template):
- Sections fill body at viewport width (1440)
- Brand has its own `max-width: 1000px` → 1000
- All other sections: 1440 (no max-width)

**Bean's proposed proper solution (2026-05-17):**

Two layers, both within WordPress block-theme conventions:

1. **Per-mockup theme content widths.** Each client's `theme/sgs-theme/styles/{client}.json` (style variation) declares its own `settings.layout.contentSize` + `wideSize` derived from the mockup CSS. The cloning pipeline reads the mockup's section widths and writes the matching contentSize/wideSize per-client (and per-viewport — mobile/tablet/desktop). Possible in WP — theme.json supports `settings.layout` per style variation. Also possible to expose in Customiser/Site Editor as Bean has done on other websites.

2. **sgs/container width selector.** Add a new attr `widthMode` enum: `"default" | "wide" | "full" | "custom"` × per-viewport (`widthModeMobile`, `widthModeTablet`, `widthModeDesktop`). Plus `customWidth + customWidthUnit` (already exists). When `widthMode="full"` the block emits `alignfull` class (escapes content-area via WP's standard mechanism). When `widthMode="wide"` emits `alignwide`. When `"custom"` emits inline `max-width: {customWidth}{customWidthUnit}`. When `"default"` no override — inherits theme contentSize.

**Reference: WP block-theme alignment system**

How WP block-theme handles widths:
- `theme.json:settings.layout.contentSize` (e.g. 800px) — default content width
- `theme.json:settings.layout.wideSize` (e.g. 1200px) — `alignwide` width
- `alignfull` = full viewport via negative margin escape from `.entry-content`
- Blocks declare `supports.align: ["wide", "full"]` in block.json to allow these modes
- Site Editor exposes a global Layout panel for setting these widths
- Customiser-side: requires either Site Editor (block themes) OR custom Customiser controls writing to theme mods

**Implementation plan (next session):**

A. **Discovery + reference reading** (~30 min)
   - Read `~/.agents/skills/wp-block-development/SKILL.md` for `supports.align` semantics
   - Read `~/.agents/skills/wp-block-themes/SKILL.md` for theme.json contentSize/wideSize patterns
   - Read `~/.agents/skills/wp-wpcli-and-ops/SKILL.md` for theme.json reload commands
   - Read existing `theme/sgs-theme/theme.json` to see current contentSize/wideSize
   - Read existing `theme/sgs-theme/styles/mamas-munches.json` to see if it overrides layout
   - Check hero block.json for current `supports.align` declaration — that's what made hero-clone-poc work

B. **Per-client contentSize/wideSize lift** (~1.5 hrs)
   - Modify `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` Stage 0.5 or 0.7 (CSS-lift): detect the LARGEST max-width value declared on top-level sections in the mockup CSS → set as `wideSize` candidate. Detect the SMALLEST (or most-frequent) → `contentSize` candidate.
   - Add a stage that writes these values into `theme/sgs-theme/styles/{client}.json` under `settings.layout.contentSize` / `wideSize` (per-viewport variants if mockup CSS has them).
   - Bonus: emit `mobile`/`tablet`/`desktop` variants by reading mockup's `@media` query overrides.

C. **sgs/container widthMode attr + render** (~1 hr)
   - Add `widthMode` (enum default/wide/full/custom) × per-viewport to sgs/container/block.json
   - In sgs/container/render.php: read widthMode attrs → emit appropriate WP alignment class (`alignfull`, `alignwide`) + responsive `<style>` block for per-viewport switching
   - In `theme/sgs-theme/theme.json` confirm `supports.align: ["wide","full"]` is declared at the container level (or in block.json)

D. **Converter wiring** (~30 min)
   - When `_lift_root_supports_to_style` lifts a section's max-width:
     - If max-width == theme.wideSize → emit `widthMode: "wide"`
     - If max-width == theme.contentSize → emit `widthMode: "default"`
     - If max-width is between or exotic → emit `widthMode: "custom"` + `customWidth/Unit` (current behaviour)
     - If max-width: none / 100vw / `var(--site-max)` etc. → emit `widthMode: "full"`

E. **Verification** (~30 min)
   - Re-run pipeline on Mama's mockup
   - Re-update post 65 (still on single.html template — KEEP the constraint to test the alignfull escape)
   - Re-measure brand pixel-diff vs file:// raw mockup
   - Expected: ≤5% on at least one viewport (mockup brand at 1000 + WP-aligned width matched)
   - Bonus: change post 65 to use a PAGE template (or set its custom field to use page.html via _wp_page_template meta) — should drop diff further if page template's wider content-area is closer to mockup's body width

F. **Backwards-compat audit** (~30 min)
   - Existing sgs/container instances without widthMode default to "default" (current behaviour) — should be backwards-compat
   - Verify on palestine-lives.org (production) doesn't regress

**Reading list for next session (load these in order):**
1. `https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/` — view-source comparison shows the alignfull pattern that worked
2. `theme/sgs-theme/theme.json` — current contentSize/wideSize values
3. `theme/sgs-theme/styles/mamas-munches.json` — does style variation override layout?
4. `plugins/sgs-blocks/src/blocks/hero/block.json` — find `supports.align` declaration that lets hero use alignfull
5. `plugins/sgs-blocks/src/blocks/container/block.json` — current container schema, no align support yet
6. `plugins/sgs-blocks/src/blocks/container/render.php` — current width handling via `sgs-container--width-{wide|content|full}` class
7. `~/.agents/skills/wp-block-themes/SKILL.md` — `theme.json` layout configuration
8. `~/.agents/skills/wp-block-development/SKILL.md` — `supports.align` block.json semantics + alignment behaviour
9. `~/.agents/skills/wp-wpcli-and-ops/SKILL.md` — theme.json reload + cache purge commands
10. `.claude/parking.md` THIS ENTRY (P-WP-ALIGNMENT-WIDTH-SYSTEM)
11. WordPress official docs (https://developer.wordpress.org/themes/global-settings-and-styles/settings/layout/) on theme.json layout settings
12. WordPress Block API reference for `supports.align`: https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/#align

**Why this is the right architectural call:**
- Aligns with WP-native conventions — no custom hacks; uses standard alignment system
- Per-client theme widths via style variations (already proven on Bean's other sites)
- Operator gets familiar Site Editor + Customiser controls for content widths
- Future clients with different design widths each get their own contentSize/wideSize without code changes
- sgs/container's widthMode selector composes with existing widthMode-by-class — backwards-compat preserved
- Fully testable via pixel-diff against file:// mockup with parent context now matching

**Trigger:** Next session — this is the #1 priority that unblocks brand pixel-diff and similar cross-client cloning fidelity. All other Phase 9 work is downstream of this.

Captured 2026-05-17 at session close. Bean's directive: "I think the proper solution is probably to change the default website max content width for each website based on the mockup … sgs/containers should be able to choose to their own content width either, default, custom or full and make it customisable for mobile, tablet and desktop like the rest of our setup. Lets check what they actually allow for /wp-blocks"

## Opened 2026-05-17 (4-rater /qc panel residual findings, parked)

### P-HEADING-DEFAULTS-NORMALISE-FOR-SERIF — `headlineLetterSpacing: -0.01em` default not universal (~20 min)

**What:** Rater 1 finding. sgs/heading render.php fallback default `headlineLetterSpacing: -0.01em` actively hurts readability on loose serif faces (DM Serif Display, Playfair). Sans-serif display (Inter, Montserrat) benefits from -0.01 tracking; serifs don't.

**Approach:** Change default to empty string in render.php (no inline style emitted unless explicitly set). Same audit for `headlineLineHeight: 1.2` etc. — defaults should be `null`/empty so theme/inherited values win. Per-attribute audit + update.

**Trigger:** First serif-typography client OR when adding a non-Inter style variation.

### P-MULTI-CLASS-BEM-PRIMARY-DISAMBIG — Multi-class section needs primary-block selection (~45 min)

**What:** Rater 4 finding. A section like `<section class="sgs-brand sgs-section sgs-section--alt">` collects all three as className. `_lift_root_supports_to_style` merges CSS from all three. If `.sgs-section { padding: 0 }` and `.sgs-brand { padding: 64px 20px }` both apply, last-key-wins ordering is non-deterministic.

**Approach:** Pick the first SGS-BEM-shape class (not modifier, not utility) as canonical primary. Remaining classes become additional className for variation selection. Add unit test for multi-class disambiguation.

### P-BORDER-STYLE-ENUM-PARITY — sgs/heading vs sgs/quote borderStyle enum mismatch (~5 min)

**What:** Rater 4 finding. quote allows `["none","solid","dashed","dotted","double"]`. heading only allows 4 (no "double"). Setting `borderStyle: double` on heading silently downgrades to `none`.

**Approach:** Standardise to the 5-value set across heading + text + quote + future. One-line edit in each block.json.

### P-VOTER-IMPORT-ASSERT-UX — Voter assert fires at import time, no helpful error (~10 min)

**What:** Rater 4 finding. `_REGISTERED = _registered_block_slug_roots()` followed by `assert not _collision` runs at module import. Collision → `AssertionError` at import = stage-3 pipeline crash without useful operator message.

**Approach:** Move the check to a function called by the orchestrator with explicit error logging + soft-failure (warning, not fatal).

### P-PIXEL-DIFF-LAZY-LOAD-DYNAMIC-WAIT — Replace 1200ms hardcoded wait (~15 min)

**What:** Rater 3 finding. `page.wait_for_timeout(1200)` works on local but is arbitrary; could undercount on slow networks.

**Approach:** Use `page.wait_for_function("() => Array.from(document.querySelectorAll('img[loading=lazy]')).every(img => img.complete)")` before screenshot.

### P-WP-AUTOP-INTERACTION — Audit how WP `wpautop` interacts with sgs/text emission (~30 min)

**What:** Rater 4 theoretical risk. WP's `wpautop` filter wraps bare text in `<p>` — if sgs/text emits `<p>` content, double-wrap risk.

**Approach:** Test scenario; if real, add `wpautop` opt-out in block render.

### P-CSS-IMPORTANT-STRIP — Strip `!important` from CSS values before regex match (~10 min)

**What:** Rater 4 theoretical. `display: grid !important` doesn't equal `"grid"` after `.strip()` → css_driven_container branch skips entirely.

**Approach:** Strip `!important` (and whitespace) from values before equality checks in `_detect_grid_container_from_css`.

### P-WP-UNIQUE-ID-CACHE-COLLISION — Anchor scoping under fragment cache (~30 min)

**What:** Rater 4 theoretical. `wp_unique_id()` is per-request sequential. Fragment cache combining requests could mismatch scoped `<style>` ID with rendered element ID.

**Approach:** Use content-derived hash (e.g. `md5` of block JSON) for scoped IDs instead of sequential counter. Stable across cache fragments.

### P-HEADING-TRANSITION-ATTRS — Add transitionDuration + transitionEasing attrs to sgs/heading hover (~15 min)

**What:** Rater 4 finding (partially false — attrs don't exist today). sgs/heading hover transition is hardcoded `300ms ease`. Non-configurable; should expose attrs for parity with hover-controls extension.

**Approach:** Add `transitionDuration` (number, default 300) + `transitionEasing` (string, default "ease") to block.json. Render.php reads them. Same for sgs/text + sgs/quote.

## Opened 2026-05-17 (/qc-inline findings on session changes)

### P-WRAPPER-ATTR-LEADING-SPACE-AUDIT — Sweep `<element<?php echo` across all dynamic blocks (~45 min)

**What:** sgs/heading rendered malformed HTML `<divstyle="..."` when WP's block-supports filter injected a style attr via regex without leading space. Fixed today via explicit space: `<div <?php echo $wrapper_attrs; ?>>`. The same pattern likely exists in other dynamic blocks (sgs/info-box, sgs/feature-grid, sgs/testimonial, sgs/card-grid, sgs/container, sgs/hero, sgs/button, sgs/cta-section, sgs/media, sgs/text) — any wrapper tag rendered as `<tag<?php echo $wrapper_attrs; ?>>` without explicit leading space is at risk when block-supports adds inline-style attrs.

**Approach:** grep for `<\w+<\?php echo \\\$wrapper_attrs` across all `plugins/sgs-blocks/src/blocks/*/render.php`. For each match, insert a literal space before the `<?php` opener.

**Trigger:** Next time a dynamic block adds WP-native `supports.spacing` / `supports.color` AND the converter emits it. Or any time someone reports a section that renders shorter than expected on the frontend (could be premature `</tag>` close from malformed parent).

Captured 2026-05-17 from /qc-inline finding 1 (HIGH).

### P-FR1-PLUS-GRID-DOUBLE-LIFT-REGRESSION — Add regression scenario for FR1 + grid container interaction (~30 min)

**What:** `_lift_root_supports_to_style` for sgs/container is now called from BOTH the FR1 block-root path (line ~1956) AND the css_driven_container path (line ~2422). A node that's BOTH a block root AND has display:grid would route through both branches. The lift uses `_set_in` with never-overwrite semantics → theoretically idempotent, but never exercised end-to-end.

**Approach:** craft a synthetic mockup snippet where a sgs/X-rooted block also has `display: grid` in its mockup CSS. Run through converter. Assert `attrs["style"]` doesn't get clobbered by the second pass.

**Trigger:** When a real client mockup hits this dual-pattern OR before shipping any further root-supports work.

Captured 2026-05-17 from /qc-inline finding 4 (LOW).

## Opened 2026-05-17 (Bean's design call from brand walkdown)

### P-SGS-QUOTE-BLOCK — Build `sgs/quote` block for blockquote + attribution patterns (~2-3 hrs)

**Bean's directive 2026-05-17:** "Option A for the block quote." Current converter routes `<blockquote class="sgs-brand__body">` to `sgs/container` (losing the blockquote tag/italic inheritance) and the inner `<footer>` attribution to `sgs/text` with `tag: "p"` (losing the footer semantic + the mockup CSS rule `blockquote footer { color: var(--primary) }` no longer matches).

**Solution:** new composite `sgs/quote` block that holds:
- Quote body paragraphs (rendered inside `<blockquote>` for italic inheritance)
- Attribution string + colour + spacing (rendered inside `<footer>` inside the blockquote, matching HTML5 spec)

**Attrs (~30 spec'd):**
- `body` (string OR repeated paragraphs array)
- `attribution` (string)
- `attributionColour`, `attributionFontSize`, `attributionFontWeight`, `attributionFontStyle` + viewports + Unit
- `attributionMarginTop` + viewports + Unit
- Body styling: `bodyColour`, `bodyFontSize`, `bodyLineHeight`, `bodyFontStyle` (default "italic"), `bodyMarginBottom` (between paragraphs)
- Wrapper: `backgroundColour`, `borderRadius`, `padding` (4 sides × 3 viewports + Unit), `borderLeft` accent
- `variantStyle`: enum "default"|"pullquote"|"testimonial"
- WP supports: className, anchor

**Converter integration:** detect `<blockquote>` with SGS-BEM class → emit `sgs/quote` with body + attribution lifted from inner `<p>` × N + `<footer>`. Replaces current sgs/container + sgs/text-x4 routing for blockquote subtrees.

**Trigger:** Next session OR when another client mockup uses a blockquote pattern.

Captured 2026-05-17 from brand walkdown design discussion.

## Opened 2026-05-17 (post-Path-B measurement deep-dive)

### P-MEASUREMENT-CONTEXT-PARITY — Pixel-diff baseline has 30%+ wrapper-context noise floor

**What:** Brand pixel diff stayed at ~36/13/39% across multiple variations even after universal lift + Path B (sgs/media + sgs/text) + naked-img figure removal + real image upload. Root cause is NOT converter quality — it's wrapper-context noise in the measurement.

**Evidence (2026-05-17):** `.sgs-brand` crop dimensions at 1440 viewport:
- post 66 (mockup baseline): 780 × 791
- post 65 (SGS converter output): 1000 × 705

Different DOM wrapper contexts: post 66 is plain mockup HTML inside WP content area; post 65 has SGS sgs/container parent applying its own padding/max-width. The 30%+ floor cannot be closed without rendering both sides in identical contexts.

**Approach options:**
1. **Standalone-page renderer** — both mockup and converter output rendered as bare HTML pages (no WP theme chrome), pixel-diff between those. New infrastructure (~2-4 hrs).
2. **Identical-wrapper mode** — modify post 66 to wrap mockup HTML in the same SGS-container DOM as post 65. Brittle; depends on the section-shape Bean is cloning. (~1 hr).
3. **Reduced-noise selector** — pixel-diff a finer-grained selector (e.g. just `.sgs-brand__image` element) rather than the whole section. Eliminates wrapper noise but loses cross-element context.

**Trigger:** Next brand+hero walkdown session OR when Bean reviews the 2026-05-17 close.

Captured: 2026-05-17.

### P-IMAGE-UPLOAD-INTO-PIPELINE — Promote upload_and_patch.py into the orchestrator (~30 min)

**What:** The 2026-05-17 session built `reports/brand-walkdown-2026-05-19/upload_and_patch.py` as a one-shot fix to upload mockup images + patch block_markup. The orchestrator's stage-4i media-sideload runs in `--dry-run` mode by default; live upload is never triggered through the canonical pipeline.

**Approach:** Add `--upload-media` flag to `sgs-clone-orchestrator.py`. When set:
- Pass `upload=True` to `sideload_batch`
- Add a post-sideload "URL rewrite" step that maps relative paths in `extract.json:block_markup` to the uploaded WP attachment URLs
- Save patched extract as authoritative for post-deploy `register_to_wp`

**Trigger:** Any client deploy or live-data run where the converter must produce a working page.

Captured: 2026-05-17.

## Opened 2026-05-19 (brand walkdown — universal core-block CSS lift session)

### P-CORE-STYLE-MAP-DB-MIGRATION — Migrate `_CORE_BLOCK_STYLE_MAP` to DB-driven lookup (~1.5 hrs)

**What:** The new `_lift_core_block_style()` helper in `convert.py` (commit landing 2026-05-19) uses a 26-entry module-level dict `_CORE_BLOCK_STYLE_MAP` mapping CSS properties to WP core-block `style.*` paths. This is data, not logic — should live in the canonical sgs-framework.db, not inline.

**Why DB-first:** Binding rule blub.db row 260 (2026-05-17) — hardcoded lookup dicts must check DB first. The existing `property_suffixes` (117 rows) covers the SGS-flat-attr mapping (`color → colour`, `font-size → fontSize`, etc.). Core-block style paths (`color → ["color","text"]`, `font-size → ["typography","fontSize"]`) are a parallel but distinct mapping. Either: (a) add a new column to property_suffixes (`core_block_style_path`, JSON-encoded), OR (b) add a new sibling table `core_block_style_paths` (css_property, style_path JSON, kind, image_only bool).

**Trigger:** Next converter iteration touching core-block lift OR a `/sgs-update` refresh that should propagate to both maps OR rater feedback on subsequent commits flags the duplicate.

**Approach:**
1. Schema migration adding `core_block_style_paths` table (CSV-seeded for idempotency)
2. New `db_lookup.core_block_style_path_for(css_prop)` returning `(path, kind, image_only)`
3. Replace module-level `_CORE_BLOCK_STYLE_MAP` with lazy DB call (lru_cache on first use)
4. Mark Bean's row-260 lesson satisfied

Captured: 2026-05-19 by QC rater 2 (Haiku DB-schema lens).

### P-COVERAGE-METRIC-CORE-STYLE — Extend `attribute_coverage` to count core-block nested style paths (~30 min)

**What:** `scripts/pixel-diff.py compute_attribute_coverage` does suffix-anchored match on SGS-flat-attr keys (`headlineFontSize`, `image.url`, etc.). The new universal-lift helper emits nested `style.color.text`, `style.typography.fontSize`, `image.style.scale` etc. — the coverage matcher doesn't recognise these paths as covering CSS rules.

**Evidence:** 2026-05-19 brand walkdown: post-lift extract has +4 new nested style objects (image.style, heading.style, paragraph.style, button.style). Coverage% still reads 18.75% — unchanged from pre-lift baseline. The lift IS happening (verified in extract.json); the metric is blind to it.

**Approach:** Add a second matcher to `compute_attribute_coverage` that walks nested `*.style` dicts and matches each leaf's path tail (e.g. `style.color.text` covers `color` rules, `style.typography.fontSize` covers `font-size`, `style.dimensions.maxHeight` covers `max-height`). Reuse `_CORE_BLOCK_STYLE_MAP` from convert.py as the ground truth.

**Trigger:** Next session's brand+hero re-measurement OR before any handoff that claims coverage% as evidence.

Captured: 2026-05-19 inline during brand walkdown.

### P-CHILD-CSS-LIFT — Universal child-block CSS lift (CLOSED via this session's commit, partial coverage)

**What:** Per-element CSS rules targeting BEM-element children (`.sgs-brand__image`, `.sgs-brand__headline`, `.sgs-brand__body`) weren't being lifted into emitted core/* child blocks. Walker emitted core/image/heading/paragraph with only HTML-attribute data (url, alt, level, anchor), dropping every per-class CSS declaration.

**Closed via:** Sonnet subagent commit `99b344d7` (merged 2026-05-19) — new `_lift_core_block_style()` helper applied to atomic_image / atomic_heading / atomic_paragraph branches + (rater 1 fix) atomic_text_fallback branch.

**Remaining caveats:**
- Coverage% metric doesn't count nested style paths yet → P-COVERAGE-METRIC-CORE-STYLE above
- `tag-only selectors` (e.g. `blockquote p { font-size }`) aren't lifted by class-matched lookup. Would need a parallel tag-matched lookup. Park as P-TAG-SELECTOR-LIFT for next session.
- Pixel-diff requires redeploy + re-screenshot to verify visible improvement — current 31% pixel diff on brand unchanged because post 65 hasn't been redeployed with new converter output. Park as P-PHASE9-REDEPLOY-BASELINE.

### P-PARENT-QUALIFIED-TAG-LIFT — Smarter SGS-class guard allowing parent-qualified tag selectors (~45-60 min)

**What:** The 2026-05-19 commit's `_lift_core_block_style` SGS-class guard rejects lift on any node without an `sgs-` class. This correctly blocks the tag-blast-radius bug (rater 3 finding: `p { color: #333 }` corrupting every paragraph globally). However, it ALSO rejects parent-qualified tag selectors like `.sgs-brand__body p { font-size }` — the inner `<p>` has no SGS class but the matching selector IS class-qualified via the ancestor.

**Evidence:** Post-fix shakeout 2026-05-19 shows -1 attr per non-canary section vs subagent's permissive run (brand 40 vs 41, featured-product 53 vs 54, ingredients 28 vs 29, gift 43 vs 44, social-proof 17 vs 18). The lost attr per section is the parent-qualified tag-selector lift.

**Approach:** Modify `_collect_css_decls_for_element` (or add a sibling fn) to RETURN the matched selectors alongside declarations. Then in `_lift_core_block_style`, after collecting decls, filter to only those whose matched selector has at least one `.sgs-*` class token anywhere in the selector chain. This allows `.sgs-brand__body p` (has ancestor sgs class) while rejecting bare `p` (no sgs class anywhere).

**Trigger:** Next session's brand+hero re-measurement when the -1 attr/section gap proves to bite OR P-COVERAGE-METRIC-CORE-STYLE shipping reveals which specific rules are lost.

Captured: 2026-05-19 post-fix verification.

### P-TAG-SELECTOR-LIFT — Lift CSS from tag-only selectors targeting atomic children (~30-45 min)

**What:** `_lift_core_block_style` reads CSS via `_collect_css_decls_for_element` which matches by class + parent-qualified class selectors. Pure tag selectors (`blockquote p`, `blockquote footer`, `h1, h2, h3 { font-family }`, `img { max-width }`, `a { color }`) aren't picked up because the node's classes don't match.

**Why this matters for brand:** mockup CSS has 5 tag-only rules that affect brand subtree visibility:
- `*, *::before, *::after { box-sizing; margin; padding }`
- `h1, h2, h3 { font-family; line-height }`
- `img { max-width; display }`
- `a { color; text-decoration }`
- `blockquote { font-style }` + `blockquote p { ... }` + `blockquote footer { ... }`

After universal-class filter (the 5 above are universal → don't count), the blockquote-children rules are still missing. They drop brand's effective coverage by 3 rules (blockquote, blockquote p, blockquote footer).

**Approach:** Add a second pass in `_lift_core_block_style` that queries CSS rules for selectors matching the node's tag name + ancestor chain. Limit ancestor chain to 3 levels to avoid combinatorial blowup. Reuse mapping infrastructure.

**Trigger:** Next walkdown where blockquote / tag-styled content is visible OR P-COVERAGE-METRIC-CORE-STYLE shows tag-selector residual.

### P-PHASE9-REDEPLOY-BASELINE — Refresh sandybrown post 65 with post-lift converter output (~20 min)

**What:** Pixel-diff baseline (post 65 at sandybrown-nightingale-600381.hostingersite.com) was last refreshed 2026-05-17. The 2026-05-19 commit adds new `style.*` attrs into emitted block markup. Until post 65 is redeployed with the new markup, pixel-diff% won't reflect the visible improvement.

**Approach:** Re-run `/sgs-clone` full-page mode → take new extract.json's block_markup for the brand section → update WP post 65 via REST or wp-admin → take fresh screenshots. Standard redeploy workflow.

**Trigger:** Next session's brand+hero re-measurement.

## Opened 2026-05-18 (QC inline on pre-work)

### P-COVERAGE-SCOPE-FILTER — Add `selector_scope` field to expected-rules baseline (~30 min)

**What:** Coverage% currently treats every CSS rule in `expected-rules-<boundary>.jsonl` as a candidate for SGS-attr matching. Universal selectors (`*, *::before, *::after`), generic-tag selectors (`h1, h2, h3`, `img`, `a`), and pseudo-only-state selectors (`:hover` against generic tags) have no SGS-attr equivalent by design. Including them in the denominator deflates coverage% on every section. Real impact: brand reads 18.75% coverage today (dry-run 2026-05-18); with universal filter applied it would read ~30%. The qualitative verdict ("real debugging needed") doesn't change — but the metric will be more accurate.

**Approach:** Add `selector_scope` field to each baseline row. Values: `universal` (matches `*`, `:root`, `html`, `body`), `tag_generic` (bare tag selectors with no class), `block_scoped` (matches `.sgs-*`). Coverage computation reports `block_scoped` only; the other two surface as separate non-counted lines. Cross-block attr aggregation (rules targeting nested blocks should compare against the child's attrs) is a harder second-order refinement — park separately.

**Trigger:** Bean asks "coverage% feels low" OR cross-cutting batch in a future session OR raters at next session's council debate cite metric noise as a problem.

## CLOSED 2026-05-17 (10-commit session)

- **P-PHASE9-4** — Block-root styling lift via WP native supports ✓ **DONE** via commit `90692106`. New `_lift_root_supports_to_style()` in convert.py reads block-root CSS, queries `db.block_supports_for(slug)`, emits `style.spacing/border/color/typography` attrs only when the block declares native WP support. Universal — wired into all 3 emission paths. +3 attrs/section avg across 7 sections.
- **P-PHASE8-NEW-4** — CSS-lift media-query support ✓ **DONE** via commit `20ef1d66`. Root cause was the `parse_css` regex bug — 0/13 @media blocks captured because `[^{}]+` couldn't span the whitespace between sibling rules. Brace-balanced scanner replacement now captures 13/13. Hero `headlineFontSizeDesktop` now correctly 58 (was 34 from base-CSS only).
- **P-PHASE8-NEW-3** — Hero 768px height delta ✓ **DONE** via commit `2f075073`. Architectural mismatch closed: mockup migrated from dual-variant pattern (`--mobile` + `--desktop` siblings) to single-grid responsive matching SGS hero block DOM 1:1. Height delta: -267px → +85px.
- **P-PHASE8-NEW-2** — Stage 4 pattern routing ✓ **DONE (REFRAMED)** via commit `df3a6cbf`. Original framing abandoned (theme patterns don't carry per-instance overrides). Real fix: walker preserves SGS-BEM grouping wrappers as nested sgs/container, matching pattern's structural composition while keeping mockup content.
- **P-PHASE8-NEW-1** — Recogniser stale heritage-strip references ✓ **DONE** via commit `e34618f9`. Voter `RETIRED_BLOCK_REMAP` dict + iteration-order safety + disjoint-keys assertion + mockup migration to `sgs-brand*` + unit test.
- **DB-first refactor** ✓ **DONE** via commit `168fd2ca`. `_CSS_PROP_TO_SUFFIX` + `_BREAKPOINT_SUFFIXES` removed; `db_lookup.py` gains `css_property_suffixes()` + `breakpoint_suffix_rules()`. Property_suffixes seeded with 18 per-side longhand rows via idempotent migration. Blub.db row 260 (DB-first rule) + Rule 11 HARD-GATE in `/sgs-clone` SKILL.md.

## QC-PANEL FOLLOW-UPS (parked 2026-05-17, non-blocking robustness)

### P-PHASE9-5 — Empty-DB defensive assertion (Adversarial A1)

**What:** `db_lookup.css_property_suffixes()` returns `[]` silently if the `property_suffixes` table is empty or DB file is missing (sqlite3 auto-creates an empty file on connect). The lifter then extracts zero CSS-driven attrs across the entire pipeline with no error raised.

**Approach:** Add `assert len(rows) > 0` at module load. Or fail-fast with a clear `RuntimeError` message naming the canonical DB path + `/sgs-update` recovery command. ~5 line fix.

### P-PHASE9-6 — RETIRED_BLOCK_REMAP future-block-registration guard (Adversarial C1)

**What:** `RETIRED_BLOCK_REMAP = {"heritage-strip": "brand"}` silently locks pattern routing even if `sgs/brand` is later registered as a real block. The remap fires unconditionally; Tier 2 always picks the pattern over the block.

**Approach:** Add a module-load assertion that no `RETIRED_BLOCK_REMAP` value collides with a currently-registered block slug (via `db.registered_block_slugs()`). Or invert the priority: check `block_exists()` first, only remap when the block is actually gone.

### P-PHASE9-7 — Watch list for SGS-BEM grouping-wrapper preservation (Adversarial B3)

**What:** The walker fix (commit `df3a6cbf`) now preserves any sgs/container wrapper with a BEM `__element`. Previously these were dropped. Future patterns receiving SGS-BEM `__element` wrappers may need explicit nesting tolerance — if a pattern PHP file doesn't expect a nested container at a given slot, the wrapper introduces unexpected DOM.

**Approach:** When new patterns are authored, audit them for assumptions about whether `__content` / `__media` / etc. wrappers exist. Add a pattern-level test that validates structural conformance.

### P-PHASE9-8 — Inline thin DB-lookup wrappers (Fresh-eyes nit)

**What:** `convert.py:_css_prop_to_suffix()` and `_breakpoint_suffixes()` are thin wrappers (`return db.css_property_suffixes()`, `return db.breakpoint_suffix_rules()`) with no transformation. Pointless indirection.

**Approach:** Inline the calls at the 3 call sites; drop the wrapper functions. ~10 lines removed.

### P-PHASE9-9 — Rename `_kind_for` → `_value_kind_for_suffix` (Fresh-eyes nit)

**What:** `db_lookup._kind_for(suffix, role)` is opaque on cold read. A new dev has to read the body to learn "kind" means convert.py's value-conversion kind (colour / number_px / string / etc.).

**Approach:** Rename to `_value_kind_for_suffix()`. Update the 1 call site.

## CLOSED 2026-05-16 (previous session)

- **P-PHASE8-1** — Heritage-strip as Brand Story PATTERN ✓ **DONE** in commit `9a32a164`. Block deleted, `theme/sgs-theme/patterns/brand.php` created. Hardcoded lift guards removed from convert.py.
- **P-PHASE8-2** — Per-block render.php audits (round 1+2) ✓ **DONE** for the 10 cv2-eligible blocks (commits `7a2a777d` + `9a32a164`). Static → dynamic conversion. WP file-render wrapper echo-style discovered. Extension-hook wiring (animation/responsive-visibility/image-controls) deferred → P-PHASE9-1.
- **P-PHASE8-3** — Hyperspecific `if block_slug == "sgs/hero":` / `if block_slug == "sgs/heritage-strip":` guards ✓ **PARTIAL** — heritage-strip guard removed with the block. sgs/hero guard remains (sgs/hero lift code is still hero-specific) — re-park as P-PHASE9-2.
- **P-PHASE8-11** — `severity_totals` dashboard ✓ **DONE** in commit `d859da4c`.
- **P-PHASE8-12** — Wrong-block-type plausibility check ✓ **DONE** in commit `d859da4c` with depth-aware section-root parsing.
- **P-PHASE8-13** — Populate `block_attributes.role` via slot_synonyms.role ✓ **DONE** in commit `d859da4c`. Migration script + assign-canonical.py second-pass propagation with property-suffix guard.
- **P-PHASE8-17** — Convert remaining 7 static SGS blocks to dynamic ✓ **DONE** in commit `9a32a164` (parallel agent dispatch).

### P-PHASE8-NEW-2 — Stage 4 converter doesn't honour pattern: routing ✓ **REFRAMED + CLOSED 2026-05-17**

**Original framing:** Stage 4 ignores `pattern_ref` and emits sgs/container instead of `<!-- wp:pattern -->`.

**Reframe after deeper investigation:** Theme patterns in WordPress don't carry per-instance overrides — a bare `wp:pattern` reference renders the pattern's PLACEHOLDER text, not Mama's actual content. Universal pattern-attr-mapping is a multi-day infrastructure design, not a 30-min fix. The PRACTICAL fix turned out to be different: the walker was unwrapping authored SGS-BEM grouping wrappers (`<div class="sgs-brand__content">`) via the unnamed-wrapper PASS-THROUGH, losing the pattern's structural contract.

**Closed via commit `df3a6cbf`:** walker now preserves any `sgs/container` target with a BEM `__element` as a nested `sgs/container` with className preserved. Brand section now emits 2-col grid + nested __content stack + __image right column matching brand.php structure. Pixel-diff: 99.6% → 12.9% at tablet (87pp improvement).

### P-PHASE8-NEW-3 — Hero 768px viewport selector height mismatch (NEW 2026-05-17)

**What:** Hero pixel-diff at 768px tablet = 99.9% (mockup 693px tall, SGS 426px tall — 267px delta). Other viewports (1440 = 70%, 375 = 80%) are normal. Tablet-only height collapse.

**Trigger:** Before per-section pixel-diff for hero can close OR when an SGS client needs reliable tablet hero rendering.

**Approach:** DOM inspect at 768px to identify which element shrinks (likely image object-fit or column-ratio difference). `@media (max-width:767px)` cutoff means 768 uses desktop layout — so the 2-col grid is in play. Mockup vs SGS column-width ratios may differ. Check `splitColumnRatio` attr and `.sgs-hero__split-image` rendering. ~30-45 min.

### P-PHASE8-NEW-4 — CSS-lift media-query support (NEW 2026-05-17)

**What:** Walker's CSS-driven container detection reads ONLY base CSS rules — `@media (min-width:768px)` overrides of `grid-template-columns` are ignored. Net for brand section: `columnsMobile:2` when mockup intends 1-col stack on mobile (mobile base CSS has `grid-template-columns: 1fr`, desktop media-query overrides to `1fr 1fr`).

**Trigger:** Any responsive grid container where mobile and desktop columns differ. Affects every clone.

**Approach:** Extend `_detect_grid_container_from_css()` to read media-query nested rules and emit `columnsMobile`/`columnsTablet`/`columns` based on viewport breakpoints. Map standard breakpoints (768/1024 px) to columnsTablet/columns; everything else stays columnsMobile. ~1-2 hours.

### P-PHASE9-3 — Per-instance lift fidelity sweep (renamed from generic "lift gaps", NEW 2026-05-17)

**What:** 538 extraction_failed entries on Mama's latest run dominated by config-attrs at defaults (textColour, padding, hoverEffect, transitionDuration) — these are intentionally unset, not real gaps. Real high-impact gaps:
- Ingredients section (147 entries): info-box children — emoji/icon, heading, description per item not lifting at full fidelity
- Gift section (106 entries): same info-box family
- Hero (151 entries): mix of CSS-lift styling + image attrs

Pixel-diff confirms: ingredients/gift sit at 30-62% across viewports — lift fidelity is the bottleneck once structural composition is right.

**Trigger:** When pixel-diff closure on ingredients/gift becomes priority OR when adding a new client with info-box-heavy layouts.

**Approach:** (a) Add a `_HIGH_IMPACT_ROLES` filter in leftover-bucket-router to distinguish noise (default-OK config) from real content gaps. (b) Per-section sweep — identify the 5-10 attrs that actually visually matter per block type. (c) Improve `_lift_bem_child_array()` BEM-walker to handle info-box per-item icon/emoji content (currently lifts heading + description but not media). Open-ended; ~2-4 hours per section.

### P-PHASE9-4 — Block-root styling lift via WP native supports (NEW 2026-05-17, HIGH IMPACT)

**What:** The mockup CSS authors styling at the BLOCK ROOT (e.g. `.sgs-info-box { padding: 22px 16px; border-radius: 12px; border: 1px solid var(--border); background: white; }`). The converter's `_lift_styling_attrs` only runs at SLOT-ELEMENT level (heading, description) — never at block root. Net: every block with native WP `supports: { spacing, border, color }` ships without its root styling. The mockup's authored padding/border/background never lands on the block, so the rendered output uses block defaults.

Affects EVERY block using WP supports: container, hero, info-box, brand-pattern container, card-grid, feature-grid, label, button, testimonial, gallery, etc. Cross-section impact — this is one of the highest-leverage script flaws.

**Discovered 2026-05-17** during pixel-diff hero/info-box analysis. The mockup explicitly sets `.sgs-info-box { background: white; border-radius: 12px; padding: 22px 16px; ... }` but the converter emits info-box blocks with empty `style` attr.

**Trigger:** When closing pixel-diff on info-box / card-grid / hero / brand sections OR when any client mockup styles block roots (universally true).

**Approach:**
1. New function `_lift_root_supports_to_style(node, block_slug, schema, attrs, css_rules)` — reads block-root CSS, maps CSS props to WP native `style` attribute object:
   - `padding-*` → `style.spacing.padding.{top,right,bottom,left}`
   - `margin-*` → `style.spacing.margin.{top,right,bottom,left}`
   - `border-*` → `style.border.{width,radius,style,color}`
   - `background-color` / `color` → `style.color.{background,text}`
   - `gap` → `style.spacing.blockGap`
2. Invoke at every block emission point (FR1 path, composite-element fast path, atomic-text path).
3. Validate against WordPress block.json supports declaration — only emit `style` properties the block declares support for (e.g. don't emit `style.border` on a block with `supports.border = false`).
4. Schema lookup: the `block.json` `supports` object declares what `style` properties are allowed.

~2-3 hours including FR1 + composite-element wiring + validation gate + unit tests.

### P-PHASE9-1 — Per-block extension hook wiring sweep

**What:** The 9 newly-dynamic blocks (trust-bar, label, certification-bar, counter, divider, heading, notice-banner, process-steps, tab) don't yet wire `animation` / `responsive-visibility` / `image-controls` extension hooks into their render.php. Existing already-dynamic blocks deferred this too — broader sweep needed. (Heritage-strip is NOT in this list — it was retired as a block in this session; lives as `theme/sgs-theme/patterns/brand.php`.)

**Trigger:** When a client mockup uses one of these blocks with animation/visibility controls AND it doesn't render OR when a cohesive cleanup sweep is opened.

**Approach:** Identify the existing dynamic blocks that DO wire extensions correctly (likely sgs/hero, sgs/product-card) and copy the wiring pattern across all dynamic blocks. ~2-3 hours.

### P-PHASE9-2 — sgs/hero hardcoded lift cleanup

**What:** `lift_subtree_into_block_attrs` still has `if block_slug == "sgs/hero":` block at line ~1037 with hardcoded splitImage / splitImageMobile / variant logic. Heritage-strip's equivalent was removed when the block retired; hero's remains as the last hyperspecific block_slug guard.

**Trigger:** Need a non-Mama's hero shape OR cohesive refactor.

**Approach:** Refactor to BEM-modifier-driven generic lift via DB-backed `block_image_slots` table (subagent 5's 2026-05-15 design). ~70-80 lines + DB seed.

## New 2026-05-16 — Phase 8 in-flight backlog

### P-PHASE8-16 — Spec 16 invariant: cv2-eligible blocks must be dynamic

**What:** Multi-rater /qc panel (architecture lens) on the 2026-05-16 render.php audit fix recommended codifying as a Spec 16 FR: every block that cv2 may emit via self-closing block comment MUST have a `render.php` registered via `"render": "file:./render.php"` in `block.json`. Static blocks (save.js only, no render.php) silently produce empty HTML when cv2 emits them as self-closing comments — caught for trust-bar + label on Mama's. 7 other static blocks (certification-bar, counter, divider, heading, notice-banner, process-steps, tab) would hit the same bug if cv2 starts emitting them.

**Trigger:** Next cv2 extension that gains the ability to emit one of those 7 static blocks (currently not in the emit set on Mama's), OR a fresh-eyes adversarial test surfaces it.

**Approach:** (1) Add an FR-NEW to Spec 16 stating the invariant. (2) Add a cv2 pre-flight gate: walk the emit candidate set from `db.standalone_block_for()` + block-root lookups + INNER_BLOCK_PATTERNS, hard-reject the run if any candidate block has no `render.php` file in its src/. Implement in `convert_page.py` / orchestrator init. ~25 lines.

### P-PHASE8-17 — Convert remaining 7 static SGS blocks to dynamic

**What:** certification-bar, counter, divider, heading, notice-banner, process-steps, tab — all currently static (no render.php). Add render.php for each as a PHP port of save.js. Required before cv2 can safely emit them.

**Trigger:** P-PHASE8-16's pre-flight gate is wired AND any of these blocks needs to enter the cv2 emit set.

**Approach:** Mirror the 2026-05-16 trust-bar + label pattern: write render.php, add `"render": "file:./render.php"` to block.json, remove any `"source": "html"` on attrs (gotcha #3 from CLAUDE.md), keep save.js as-is for editor block validation. ~30-60 min per block depending on save.js complexity.

### P-PHASE8-14 — Section-collapses-into-leaf-block guard

**What:** Multi-rater /qc panel (fresh-eyes lens) flagged an adversarial scenario: a section whose class accidentally matches a leaf-level block name (e.g. `<section class="sgs-product-card">` rather than `<section class="sgs-products"><div class="sgs-product-card">…</div>…</section>`). Stage 2 matches the registered `sgs/product-card` at confidence 1.0. The block-root fast path fires at the section root. `lift_subtree_into_block_attrs` collapses the entire multi-component section into a single product-card block with whatever the first descendant's attrs were. No bucket captures this — silent collapse.

**Trigger:** Real client mockup hits the pattern, OR Phase 8 closure work uses an adversarial test to demonstrate the gap.

**Approach:** Add a new check `route_section_complexity_mismatch` (or extend `route_wrong_block_type`): when Stage 2 matches a registered LEAF block (no InnerBlocks slot in block.json) at confidence ≥ threshold AND the section DOM contains > N child elements OR descendant depth > D, emit `structural_mismatch_or_orphan` with `source="section_collapsed_into_leaf_block"` and severity `high`. Need to read block.json `supports` to determine "is this a leaf vs composite block". ~25 lines + DB lookup.

### P-PHASE8-15 — severity_totals key in orchestrator router-failure fallback

**What:** Multi-rater /qc panel (ecosystem lens) noted the orchestrator's bucket-router subprocess-fail fallback initialiser hardcodes `{"leftover_buckets": {}, "totals": {}, "total_count": 0}` — no `severity_totals` key. If the router subprocess fails (non-zero exit) AND a downstream consumer eventually reads `severity_totals`, it'll throw KeyError. No consumer reads it yet, but future operator-review HTML / handoff regen may.

**Trigger:** First downstream consumer of `severity_totals` is wired in.

**Approach:** Add `"severity_totals": {}` to the fallback init dict at `sgs-clone-orchestrator.py:1606`. 1 line.

### P-PHASE8-11 — Severity totals dashboard in leftover-buckets.json

**What:** Multi-rater /qc panel (architecture lens) on the 2026-05-16 bucket-router upgrade flagged that `gap_level_totals` collapses all `structural` buckets (`unrecognised_section` severity=high, `cv2_handled_no_top_level_match` severity=low, `chrome_skipped` severity=info) under the same `structural` count. An operator reading `gap_level_totals.structural = 5` can't tell whether 5 are blocking or noise.

**Trigger:** Next bucket-router pass, OR operator-review dashboard work surfaces the gap.

**Approach:** Add a `severity_totals` dict in parallel to `gap_level_totals` — keys: `info / low / medium / high`. Counts derived from the existing `severity` field already on each bucket item. ~4 lines.

### P-PHASE8-12 — Wrong-block-type detection in cv2-handled sections

**What:** Multi-rater /qc panel (architecture lens) flagged that `route_structural_mismatch` now skips ALL cv2-handled sections to avoid double-bucketing. But a cv2-handled section that emits e.g. `sgs/product-card` when the mockup clearly shows a hero section is a wrong-block-type error that silently vanishes from `structural_mismatch_or_orphan`.

**Trigger:** Phase 8 finds a section where cv2 emits a plausibly-wrong block, OR adversarial mockup testing surfaces this.

**Approach:** Cross-reference emitted slugs against `match.ranked_candidates` — if cv2 emitted a block that wasn't in the top-3 candidates AND the candidate-confidence delta is large, flag as wrong-block-type. ~15 lines.

### P-PHASE8-13 — Populate block_attributes.role column via /sgs-update

**What:** The 2026-05-16 bucket-router upgrade filters cv2_emitted_dynamic by `role IN ('text-content', 'content', 'select-from-enum')` to keep the signal meaningful. Currently most rows have role=NULL — the filter conservatively keeps them. Once /sgs-update Stage 4 (canonical pass) populates `block_attributes.role` properly, the filter will cut more noise. Today's Mama's run: 286 cv2_emitted entries; expected after role population: ~80-120.

**Trigger:** Next /sgs-update Stage 4 enhancement pass.

**Approach:** Extend `behavioural-analyser/assign-canonical.py` to also infer role from output_signature + attr_type combinations. ~20 lines.

### P-PHASE8-9 — Slot-synonym expansion: tile / panel / feature / module / item

**What:** The 2026-05-16 walker fix added `card → sgs/info-box` via `slot_synonyms.standalone_block`. Multi-rater /qc panel (fresh-eyes lens) recommended also registering the four next-most-common BEM element names that map to info-box compositions in real-world client mockups: `tile`, `panel`, `feature`, `module`, `item`.

**Trigger:** Next client onboarding hits one of these element names AND surfaces as an unmatched gap in `pipeline-state/<run>/leftover-buckets.json`, OR Phase 8 closure work touches a section with these names.

**Approach:** INSERT rows into `slot_synonyms` (sgs-framework.db) with `canonical_slot` = one of the names, `standalone_block` = `sgs/info-box`. Mirror as aliases on the existing `card` row if structurally equivalent. ~5 min per synonym.

### P-PHASE8-10 — Standalone-block column validation on walker startup

**What:** Multi-rater /qc panel (architecture lens) raised a deferred concern: a bad row in `slot_synonyms.standalone_block` (e.g. `text → sgs/paragraph`, `media → sgs/image`) would route every leaf-text element through the composite path, conflicting with `ATOMIC_TAG_MAP`. No load-time validation today.

**Trigger:** Next time someone proposes adding a synonym for a tag covered by `ATOMIC_TAG_MAP`, OR the converter exhibits unexpected routing under DB extension.

**Approach:** In `db_lookup._slot_to_standalone_block()`, reject any row where the standalone_block matches a value in `ATOMIC_TAG_MAP.values()`. Emit stderr warning + drop the row from the map. ~10 lines.

## New 2026-05-15 — Phase 8 backlog (after Spec 16 Phase 7 architectural close)

### P-PHASE8-1 — Heritage-strip as Brand Story PATTERN (Bean's 2026-05-15 redirect)

**What:** Retire the `sgs/heritage-strip` block entirely. Replace with a registered pattern composing `sgs/container` (2-col grid) + `core/heading` + `core/paragraph` + `sgs/quote` (or sgs/testimonial-slider for the author bit) + `sgs/button`. Image goes in the right column.

**Trigger:** Phase 8 section-by-section closure work reaches the heritage section, OR a new client needs the Brand Story composition.

**Approach:**
- Register pattern at `theme/sgs-theme/patterns/brand-story.php` with placeholder content
- Update Spec 16 §Phase-4 + framework block-build-status table to remove heritage-strip
- Migrate existing posts using sgs/heritage-strip via WP-CLI block-recovery (or accept they stay on the deprecated block until manually re-laid)
- Update converter — remove the `if block_slug == "sgs/heritage-strip":` guard at line 1016 (it's currently dead code since the CSS-driven path catches the section)

**Spec ref:** Bean's 2026-05-15 redirect in conversation; capture in Spec 16 v0.3.

### P-PHASE8-2 — Per-block render.php audits

**What:** Many lifted styling attrs aren't honoured by block render.php. The converter lifts `headlineFontSizeTablet` correctly but the block's render.php doesn't emit a `@media (min-width:768px) { .sgs-Xxx__headline { font-size:N }}` rule for it. Audit 6-8 blocks (hero, product-card, info-box, heritage-strip, testimonial-slider, feature-grid, card-grid, cta-section).

**Trigger:** Phase 8 section-by-section closure — each section's per-section diff above 1% drives an audit of its block's render.php.

**Approach:** for each block:
1. List all *Tablet / *Mobile / *Desktop variant attrs in block.json
2. Confirm render.php emits matching media-query CSS for each
3. Confirm CSS uses `:not([style*="<prop>"])` fallback pattern per SGS standard

**Effort:** ~30 min per block × 6-8 = 3-4 hours.

### P-PHASE8-3 — Remove hyperspecific block_slug guards in `lift_subtree_into_block_attrs`

**What:** `if block_slug == "sgs/hero":` at line 1016 and `if block_slug == "sgs/heritage-strip":` at line 1048 are pre-existing technical debt the multi-model QC panel surfaced as "in scope of NEEDS-REFACTOR but not new". Refactor to BEM-modifier-driven generic lift via a DB-backed `block_image_slots` table (subagent 5's 2026-05-15 design).

**Trigger:** Either Phase 8 closure work hits a non-Mama's hero, OR the heritage-strip pattern refactor (P-PHASE8-1) makes the heritage guard dead code.

**Approach:** see 2026-05-15 subagent 5 report in conversation transcript. ~70-80 lines + DB seed.

### P-PHASE8-4 — `convert_page.py` line 198 still hardcodes `extracted_attributes: {}`

**What:** During the 2026-05-15 styling-lift work, the implementer fixed `convert_section()` in `__init__.py` to populate extracted_attributes via brace-depth extraction. The parallel `convert_page.py` function still has the hardcoded empty dict. If the orchestrator routes through convert_page.py instead of convert_section, Stage 9 sees empty extracted_attributes.

**Trigger:** Next session start (Phase 8 will run convert_page.py at orchestrator invocation; surface this as one of the first investigations).

**Approach:** apply the same brace-depth extractor logic. ~15 lines.

### P-PHASE8-5 — Pack-size pills not rendering on featured-product cards

**What:** Lift code in `_extract_attr_value` and the lift_subtree loop correctly emits `packSizes` array in the converter's WP block markup for Zookies card. Render.php has `if ( ! $is_trial && ! empty( $pack_sizes ) )` gate. Pills don't render visibly on the deployed page. Audit the `$is_trial` computation — likely the variantStyle being lifted as "standard" doesn't quite match what render.php expects.

**Trigger:** Phase 8 section-by-section closure hits `.sgs-featured-product`.

**Approach:** open `plugins/sgs-blocks/src/blocks/product-card/render.php`, trace `$is_trial`, confirm the variantStyle enum mapping. ~15 min.

### P-PHASE8-6 — Section-internal nav mapping

**What:** `<nav>` is in `SKIP_TOP_LEVEL_TAGS` so the top-level header skip works. But nested navs (inside non-header sections) currently pass-through their children as bare `<a>` tags that render as `<p>Shop</p><p>About</p>…` paragraphs. Map nested `<nav>` to `core/navigation` or `sgs/mega-menu`.

**Trigger:** Phase 8 work hits a section with nested nav, OR a new client mockup needs section-internal navigation.

**Approach:** add `<nav>` to ATOMIC_TAG_MAP routing to `core/navigation` with a child-link lifting helper. ~30 lines.

### P-PHASE8-7 — `_BREAKPOINT_SUFFIXES` non-standard breakpoint silent-drop

**What:** The styling-lifter's `_BREAKPOINT_SUFFIXES` table covers 5 industry-standard breakpoints (min-width 768/1024/1280, max-width 767/640). Non-standard breakpoints (e.g. `min-width: 900px` or `min-width: 576px`) are silently ignored — the responsive attr family doesn't get lifted.

**Trigger:** Phase 8 work hits a mockup with non-standard breakpoints, OR a CC/QC reviewer flags this gap.

**Approach:** add a stderr warning when a media-query selector matches a known class but the breakpoint isn't in the table. Long-term: read breakpoints from theme.json or a new config rather than a hardcoded set. ~30 min.

### P-PHASE8-8 — Spec 16 v0.3 — closure gate revision

**What:** Spec 16 §Phase 4 currently says "≤ 1% pixel diff" without specifying per-section vs full-page. 2026-05-15 work proved per-section cropped diff is the honest measurement. Spec needs revision to define:
- Closure unit = section (cropped via `--selector .sgs-X`)
- Threshold = ≤ 1% across 375 / 768 / 1440 viewports per section
- Page-level closure = ALL sections close
- Methodology rule: read leftover-buckets.json BEFORE any pixel-diff conjecture

**Trigger:** First Phase 8 session (this is a 30-min doc update, do it early).

**Approach:** edit `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §Phase 4 closure-gate definition.

## New 2026-05-14 — Phase 6 v2 deferrals

### P-S15-ROLE-TEMPLATES-MIGRATE — Migrate role-templates.json into property_suffixes DB table (~2 hr)

**What:** `tools/recogniser-v2/data/role-templates.json` carries 20 role definitions + cross-platform extraction recipes. Spec 15 §6 Stage 4 + FR2 marks this TO-MIGRATE in Phase 1 - migration was deferred and never completed. The file is currently functioning (read by extract.py at load_role_templates() line 227) but accumulates silent drift versus the DB (every Spec 15 Phase 3/3.5 pass updates the DB but the JSON file might be stale).

**Trigger:** Post-Phase-6 doc-hygiene sweep, OR when an extract.py regression surfaces that traces to JSON-vs-DB divergence, whichever comes first.

**Approach:**
- Write migration script `plugins/sgs-blocks/scripts/migrate-role-templates-to-db.py` that walks role-templates.json + INSERTs/UPDATEs the matching property_suffixes rows
- Update extract.py.load_role_templates() to read from DB instead of file (or retain JSON as fallback during transition)
- Verify byte-parity per-role between JSON values and migrated DB values
- Add the `role-templates-vs-property-suffixes-check.py` drift-check hook (see docs-registry section 7)
- Delete role-templates.json after operator approval

**Spec ref:** Spec 15 §6 Stage 4 + FR2 + Appendix E ("role-templates.json TO-MIGRATE Phase 1").

**Why parked until after Phase 6:** Phase 6 closes the pixel-parity gate via integration work (wiring 14 modules + generalising extract.py CSS-consumption). Adding the role-templates migration to Phase 6 risks the working Stage 4 dispatch path for no parity-gate benefit. Cleaner to land Phase 6 first, then sweep this migration as a focused mini-phase.

**Mitigation while parked:** the new drift-check hook `role-templates-vs-property-suffixes-check.py` (added to docs-registry section 7 as a future hook) would surface drift if built. For now, drift is implicit risk.



Items here have a clear next-step but aren't urgent. Each entry: the work, the trigger to resume, the spec, and rough effort. Resolved items are kept as one-line summaries (no ORIGINAL retention to keep the file scannable).

## New 2026-05-12 (evening) — Spec 15 Phase 4.5 follow-ups

### P-S15-STYLEVAR-GEN — Auto-generate style variations from uimax font_pairings + colour palettes (~60-90 min)

**What:** uimax has 57 font_pairings + 269 colour palettes + UX reasoning rows curated by industry / mood / product type. Build a generator that picks a `font_pairing` + a `palette` from uimax, emits a complete `theme/sgs-theme/styles/<slug>.json` style variation. Used to bulk-create 20+ "starter looks" (e.g. `restaurant-warm`, `legal-conservative`, `tech-minimal`) so new clients pick a starting point rather than starting from blank.

**Trigger (primary, added 2026-05-12 operator framing):** Step 1 of the draft-design process for every new client — generate 3-5 candidate style variations from uimax pairings appropriate to the client's industry/mood, then test draft designs against each. Pick the favoured one to anchor the rest of the work. This converts uimax pairings from a passive reference into an active part of the pipeline.

**Trigger (secondary):** When the operator wants a richer style-variation library OR as a one-off "seed 20 starter looks" task.

**Approach:**
- Script at `plugins/sgs-blocks/scripts/build-style-variations.py`
- Query uimax for a `font_pairings` row + matching `colors` palette row (joined on industry/mood)
- Emit JSON matching the schema of existing variations (`mamas-munches.json` etc.)
- One row pair = one variation. Idempotent on slug.
- Optional: pull recommended typography sizes + UX rule defaults from uimax `ux_guidelines` for the variation's `styles.elements.h1/h2/p` defaults.

**Spec ref:** Not in any spec — captured from operator request 2026-05-12. Sits **after Phase 6** per operator framing 2026-05-12 (cross-platform output extension lands first; the pickers + generator are the operator-facing layer that builds on top).

**Why parked until after Phase 6:** Phase 4.5 ships token-discovery infrastructure (single-draft → single-variation flow). Phase 5 is E2E clone. Phase 6 is cross-platform output. The style-variation generator becomes meaningful when all three are in place — at that point, "pick a style → drop a draft → clone to SGS → optionally emit to other platforms" is a coherent pipeline. Doing the generator earlier would build it before its consumers exist.

### P-S15-PAIRINGS-PICKER — Site Editor SlotFill panel for browsing uimax pairings (~4-6 hr)

**What:** A "Browse Pairings" custom panel inside the WordPress Site Editor's Styles section. Operator browses font_pairings + colour palettes from uimax via REST endpoint backed by the uimax DB. Preview live in the editor; "Apply" writes the selected pair to the active style variation.

**Trigger:** After P-S15-STYLEVAR-GEN ships AND operator has 20+ starter looks to validate the picker UX. Don't build the picker before there's content worth picking.

**Approach:**
- Register a SlotFill via `@wordpress/edit-site` (or `wp.plugins.registerPlugin` if SlotFill API doesn't fit).
- REST endpoint `sgs-blocks/v1/uimax/pairings` reading from the uimax DB.
- Preview component renders font samples + palette swatches.
- Apply writes to `wp_global_styles` via `core/edit-site` data store.

**Spec ref:** Not in any spec yet. Phase 6+ feature.

**Why parked:** Phase 4.5 scope is convention + token discovery. Custom Site Editor UI is a separate cycle of work with its own QA gates.

## New 2026-05-12 — Spec 15 Phase 1 QC panel deferrals

### P-S15-F3 — Decide root-level structural attr handling (~30 min in Phase 2)

**What:** 1023 of 1343 `block_attributes` rows (76.2%) legitimately have `canonical_slot = NULL` because the v1 slot vocabulary is content-identity only. Phase 2 drift validator must rule on: (a) accept NULL as the canonical state for structural attrs, or (b) add a `__root__` pseudo-slot for schema uniformity, or (c) extend slot vocab with structural canonicals (`container`, `wrapper`, `inner`).

**Trigger:** Phase 2 Step 2.3 (drift validator). The validator's behaviour spec must commit to one of the three options before it can flag violations.

**Spec ref:** `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` §11 Phase 1 success criteria (updated 2026-05-12).

**Effort:** ~30 min inline architectural call once Phase 2 Step 2.3 begins.

### P-S15-F4 — Lift output_signature coverage above 90% (~60-90 min in Phase 2)

**What:** Static analyser at 74.1% (995/1343). The 300 NULL attrs are design-shape CSS values that flow through PHP interpolation rather than `esc_*()` calls. Lifting coverage requires a small PHP-AST-light pass (e.g. detect `style=" ... {$attrs['X']} ..."` interpolations or array-keyed style maps).

**Trigger:** Phase 2 Step 2.4 (gap detection). Either accept 74.1% as ceiling and surface the rest as gap candidates, or invest 60-90 min to lift coverage.

**Spec ref:** §11 + §5.3 signature schema. Decision needed: extend the analyser, or accept the gap.

**Effort:** 60-90 min if pursued (Sonnet dispatch + tests).

## New 2026-05-11

### P-RECOG-V3 — Consolidate recogniser scripts to tools/recogniser-v3/ (20-30 min)

**What:** Move the active pipeline code into a single canonical location:
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` -> `tools/recogniser-v3/orchestrator.py`
- `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` -> `tools/recogniser-v3/voter.py`
- `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` -> `tools/recogniser-v3/confidence_matrix.py` (underscore so importable normally)
- `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` -> `tools/recogniser-v3/leftover_bucket_router.py`
- `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py` -> `tools/recogniser-v3/review_renderer.py`
- `tools/recogniser-v2/extract.py` -> `tools/recogniser-v3/extract.py`

Also write `tools/recogniser-v3/README.md` with pipeline diagram + Spec 12 link.

**Trigger:** After Commit A (orchestrator multi-section patches) lands. Two-commit sequence: Commit B does the move, Commit C deletes `tools/recogniser/` and `tools/recogniser-v2/` once a clean orchestrator run confirms nothing else references them.

**Spec:** All path references in orchestrator (VOTER_SCRIPT, MATRIX_SCRIPT, ROUTER_SCRIPT, REVIEW_SCRIPT, extract.py path) need updating. Skill bodies that mention these paths need updating (/sgs-clone). Spec 12 file inventory section needs refresh. state.md current_step needs path update.

**Effort:** 20-30 min including a smoke-test rerun.

### P-EXTRACT-GENERALISE — extract.py beyond hero (Phase 8 critical-path blocker; was misframed as Phase 9)

**What:** `tools/recogniser-v2/extract.py` currently has hardcoded attribute mappings only for sgs/hero. On the 2026-05-11 multi-section orchestrator run, 8 of 9 sections produced empty `attributes` for this reason. **Phase 8 CANNOT ship a meaningful Mama's clone without this work** -- a deploy with 8 empty sections isn't a clone.

**Reframe (2026-05-11):** Bean caught the misframing. Earlier docs put this as "Phase 9 backlog, no fixed trigger". The honest read: extract.py generalisation IS THE remaining Phase 8 work. Until it lands, the orchestrator produces structurally valid block markup with empty inner content. Phase 8 visual parity validation + live deploy + eyes-on review all depend on this.

**Spec:** Extend `extract.py` in-place (don't build a separate slot-filler.py -- previous planning's misdirection). Needs:
- Convention-driven extractors that match SGS-BEM `__element--modifier` selectors against block.json attribute names (already have Stage 3 schema)
- Per-attribute-type strategies: text from RichText / src from `<img>` / colour from computed style / spacing from CSS custom properties / icon name from SVG / link href from `<a>`
- Playwright cascade resolution for CSS-driven attributes (already in extract.py for hero; generalise the pattern)
- Role-templates catalogue defining selector-strategy + value-extractor + fallback-strategy per attribute type
- Per-platform translation rules for the lingua-franca conversion (Spec 13) when source class names aren't SGS-BEM

**Recommended sequence:** Do a 4-model peer review of the architecture FIRST (per the 2026-05-08 pattern that caught 11 fixes before the first real clone), then build. Estimated 4-6 hours focused + 30 min peer review.

**Trigger:** Next active session that can commit to a 4-6 hour focused window. This unblocks Phase 8 visual parity + deploy + eyes-on review.


## New 2026-05-10 — Phase 6 + audit follow-through

### P-MM-1 — Create 4 gap-candidate patterns for Mama's homepage

**What:** Four mockup sections have no matching pattern yet: `featured-product`, `products` (4× `sgs/product-card` grid), `gift-section` (3 cards: 1 trial + 2 gifts), `social-proof` (containing `sgs/testimonial-slider` + trustpilot bar). Each needs a pattern file under `theme/sgs-theme/patterns/` following the same shape as `ingredients-section.php` and `header-mamas-munches.php`.

**Trigger:** Phase 8 starts. Patterns get created inline as `/sgs-clone` Stage 7 (composition emit) surfaces them — per the "make new blocks inline, never defer with placeholder" rule.

**Spec:** TRUTH-SPEC at `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` documents the slot bindings for each. The renamed mockup HTML at `sites/mamas-munches/mockups/homepage/index.html` is the visual source of truth.

**Effort:** ~10-15 min per pattern (use ingredients-section.php as scaffold; replace inner blocks per slot table).

### P-MM-2 — Decide on sgs/section-heading block

**What:** Mama's mockup has cross-section utility classes `.sgs-section-heading__label`, `.sgs-section-heading__intro`, `.sgs-section-heading__sub` appearing inside 4 different parent sections. Currently a CSS-only convention. Decide whether to formalise as a dedicated `sgs/section-heading` block so the recogniser can match it as a real block, or leave as a utility convention.

**Trigger:** Phase 8 — if the recogniser flags these classes as orphan elements during Stage 6 (CSS classify), promote to a block. Otherwise stay as utility.

**Effort:** ~30-45 min if creating the block (block.json + edit.js + save.js + render.php + style.css). Zero if leaving as utility.

### P-MM-3 — Add cart element to header-mamas-munches pattern

**What:** Current `theme/sgs-theme/patterns/header-mamas-munches.php` uses `core/site-logo` + `core/navigation` + `sgs/mobile-nav-toggle` + `sgs/mobile-nav`. The renamed mockup has cart button + cart badge that the pattern doesn't model. Structural drift between mockup and pattern.

**Trigger:** Phase 8 live-deploy parity check. The cart element needs an SGS block or a core block addition to the pattern.

**Spec:** TRUTH-SPEC documents `.sgs-header__cart` + `.sgs-header__cart-badge` slots. There is no SGS cart block currently — likely a `sgs/cart-link` or similar to create.

**Effort:** ~20-30 min (extend the pattern + new block if needed).

### P-OPS-1 — Skill-type classifier in sgs-skillscore v3

**What:** 24 of 45 Phase 4 surfaces sit below 90% on skillscore because the validator grades commands, agents, mini-skills, and discipline references against full-skill criteria. A `--type` flag or auto-detection (command files in `~/.claude/commands/`, agent files in `~/.claude/agents/`, mini-skills via `user-invocable: false` frontmatter) would lift these scores out of rubric-mismatch baseline.

**Trigger:** Bean explicitly opens scope for a skillscore upgrade, or a pattern emerges where rubric-mismatch is masking a real regression. Not urgent.

**Spec:** Add `type` field detection to `sgs-skillscore.py validate`. Type tiers: full-skill (current rubric), command (CLI shortcut — relaxed), agent (identity file — different criteria), mini-skill (sub-skill routed via parent — minimal rubric), reference (discipline doc — minimal rubric).

**Effort:** ~60-90 min (rubric design + implementation + re-grade all 45 Phase 4 surfaces as regression check).

### P-PH8-1 — Hero parity test file scaffold

**What:** Phase 6 Step 6 specified running `python -m pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py::test_hero_filled_slots_match_baseline_count -v` as a sanity check. The test file doesn't exist yet — Phase 8 deliverable.

**Trigger:** Phase 8 starts. The test verifies that `/sgs-clone`'s slot-filler produces ≥50 attributes on the hero section matching `plugins/sgs-blocks/scripts/recogniser/tests/fixtures/hero-baseline.json` (50-attr baseline).

**Spec:** Test file location is the canonical path. Pytest collects from project root. Baseline fixture already exists at `fixtures/hero-baseline.json` (per Phase 6 plan entry-context list — verify before referencing).

**Effort:** ~30-45 min.

---

## Resolved 2026-05-10
- **P-12** block_compositions seed → 36 rows seeded into sgs-framework.db; seed script at `plugins/sgs-blocks/scripts/uimax-tools/seed-block-compositions.py` is idempotent (re-run preserves count). QC PASS.
- **P-13** uimax-write-validator integration → validator script confirmed already enforcing rows 211 + 213; 5/5 `/uimax-*` skills mandate validator calls; new `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` Python helper provides atomic validate-then-write. QC PASS.
- **P-15** `/sgs-update` Stage 3+4 → REWRITTEN late-session per Bean's catch: DB is now canonical, CSVs are regenerated mirrors. New `regenerate-csvs` subcommand on `~/.agents/skills/ui-ux-pro-max/scripts/update-db.py` mirrors all 46 DB tables → CSV. `sgs-update-uimax-sync.py` Stage 3 writes SGS blocks to uimax DB via `uimax_write.py` validate chain (skip-if-exists preserves existing Rosetta Stone), then subprocess-calls `update-db.py regenerate-csvs`. Round-trip safe (regen → compile-sqlite → regen) verified by `/qc` 5/5 PASS. Closes the silent-data-loss vector across all uimax tables.
- **P-4** Trustpilot scrape (Mama's Munches) → 4/4 reviews captured to `sites/mamas-munches/research/trustpilot-reviews.json`. QC PASS.

## Resolved 2026-05-11
- **P-TP-SYNC** → Trustpilot review sync infrastructure shipped. 4 classes under `plugins/sgs-blocks/includes/trustpilot/` (Trustpilot_Sync, Trustpilot_REST, Trustpilot_Cron, Trustpilot_Settings), admin JS at `assets/admin/trustpilot-sync.js`. Settings -> SGS Trustpilot Sync page with Browserless creds (AES-256-CBC encrypted at rest), weekly/daily WP-cron (`sgs_trustpilot_sync_event`), Sync-now button via `POST /wp-json/sgs/v1/trustpilot-sync`. JSON-LD parser harvests standalone Review entities from `@graph` (Trustpilot's reference pattern). Browserless `/content` uses `?token=` not Bearer (HTTP 500 on Bearer — captured as lesson, blub.db row 238). Telegram alerts dropped — settings page activity log + last_sync_status is the operator failure surface. End-to-end proven on sandybrown: 4 Mama's reviews captured (TrustScore 4.0 "Great"), smoke-test-2 page flipped to `dataSource: synced` and renders the live reviews. Commit `06df2807`. Visual diff at `reports/visual-diff/trustpilot-sync-2026-05-11.md`.
- **P-Trustpilot block** → `sgs/trustpilot-reviews` block shipped at `plugins/sgs-blocks/src/blocks/trustpilot-reviews/`. Looping carousel, white pill header, theme-inherited typography, hover scale + theme-primary-coloured border, clickable Trustpilot logo, Schema.org JSON-LD, inline + synced + placeholder data sources. Live on sandybrown at /trustpilot-smoke-test-2/. Commit `c6bd4980`. Visual diff report at `reports/visual-diff/trustpilot-reviews-2026-05-11.md`.
- **P-Orchestrator multi-section walker** → Voter `auto_detect_sections` walks into `<main>`; stage 4-8 loops per-boundary in `--auto-section` mode. End-to-end run on Mama's: 9 sections processed, 212 slots scaffolded, 213 leftover entries persisted to recognition_log. Patches uncommitted but tested -- pending Commit A.
- **P-Style.css enqueue gap (systemic)** → wp-scripts emits `style-index.css` but `register_block_type_from_metadata` looks for `style.css`. New `plugins/sgs-blocks/scripts/copy-built-styles.js` postbuild step copies for all 48 blocks (96 files copied first run). Wired in `package.json`. Resolves the silent CSS-not-enqueued issue affecting every SGS block since the build pipeline was set up.
- **P-image-controls.php namespace fatal** → Line 45 `WP_Block_Type_Registry` was resolving as `SGS\Blocks\WP_Block_Type_Registry`. Added leading backslash. Was fatalling on every block render the first time `inject_image_controls` fired (silent until I created a draft on sandybrown today).
- **Dashboard `/api/learning` POST UPDATE bug** → Subagent D applied COALESCE-based patch to `~/.openclaw/workspace/tools/blub-dashboard-v2/src/app/api/learning/route.ts`; `/rebuild-dashboard` ran (PID 64452 → 16720); patch active; row 69 modernisation re-POSTed and confirmed; test row 219 archived.

---

## Active items (cloning pipeline focus)

### P-11-M9 — REOPENED 2026-05-09 (false-claim ship, milestone never actually validated)

**Status as of 2026-05-09 (this session):** The M9 milestone was claimed shipped by the previous session but was NOT actually validated. The orchestrator extension code shipped (commit dcb185b). The 6521-file foundation committed. But the multi-section orchestrator NEVER RAN on the live site. The wp-sgs-developer subagent was given a brief that contained a fallback ("hero-only deploy is acceptable") and took it; only the M8 hero markup was redeployed to the homepage post. Operator never opened the live URL before claiming success. Live result: hero+footer only, debug WordPress nav, empty footer fields, hero not a clean clone of post 29. Lesson captured as `dont-delegate-the-test-of-unproven-work` (blub.db row 221). M9 must be redone fresh — see next session prompt.

**Critical reframe for the redo:** The end goal is the PIPELINE, not the homepage. The homepage being a perfect clone is the OUTCOME of a working pipeline. When discrepancies are found in the next session, the fix is to identify the failing pipeline component and fix it, then rerun — NEVER patch the artefact directly. Manual SQL edits to fix the WordPress nav menu, manual content fills for the footer, hand-edited block markup are all forbidden. If the pipeline cannot produce a clean clone, the pipeline is incomplete and that is what gets fixed.

**Captured:** 2026-05-09 (M7-M10 session close), reopened 2026-05-09

**Status update 2026-05-09 session:** M7 + M8 COMPLETE.
- M7: 6 sibling skills shipped via /lifecycle Mode A, all >=B grade. Skill scoreboard at evaluation-history.json. Rubric files all carry `bean_signoff: confirmed_via_m7_brief_2026-05-08`.
- M8: minimal orchestrator at plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py. Hero smoke at 100% PoC parity (50/50 attrs match manual baseline). Visual-diff report at reports/visual-diff/hero-2026-05-09.md.
- M9: deferred to next session (this entry).
- M10: handoff + narrow commit (M7/M8 artefacts only) shipped this session. Foundation commit blocked.

**What's left (M9 only):**
- Multi-section orchestrator extension to walk all 9 sections of Mama's homepage in one run (the current orchestrator is single-section)
- Live deploy OVERWRITING the sandybrown homepage (Bean instruction 2026-05-09 — deploy target is the live homepage post, not a sibling post). Snapshot existing `post_content` first for rollback. Post 29 stays preserved as manual hero PoC reference.
- Multi-frame Playwright capture at 0/200/500/1000/3000 ms across 375/768/1440 viewports
- mockup-parity-validator.js per section
- screenshot-diff-helper.js per Q1-Q4 delta flagged
- 13 remaining block visual-diff reports written to reports/visual-diff/<block>-<date>.md (button, container, data-display, icon, icon-block, icon-list, media, mega-menu, mobile-nav, notice-banner, post-grid, process-steps, trust-bar, whatsapp-cta)
- Pre-commit STOP GATE unblocks once all 14 visual-diff reports present (hero + 13 listed)
- 690-file foundation commit lands (currently uncommitted on main since 2026-05-08)
- Bucket-2 session unblocks for Tasks 10-12 dogfood loop

**Source docs (still relevant for M7-M10):**
- `.claude/handoff.md` — 2026-05-08 mega-session digest (M1-M6 completed work + framework state)
- `.claude/reports/rule-stage-coverage-audit-2026-05-07.md` — 97 rules audited; Top-5 closed in Wave 4
- `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md` — 11 review findings; critical fixes 5/5 PASS
- `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` — canonical 9-stage pipeline spec
- `.claude/specs/cloning-skill-salvage-matrix-2026-05-05.md` REVISIONS section
- `.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md` REVISIONS section

**Canonical next-session-prompt:** `.claude/next-session-prompt.md` — full M7-M10 task brief with skills/MCP/agents tables.

**Effort:** ~3 hours wall-time remaining (M7 sequential + M8/M9 main-thread + M10 close).

**Resume trigger:** when Bean has a focused window for the M7-M10 build session.

---

### P-12 — `block_compositions` table seed for existing 36 patterns

**Captured:** 2026-05-08

**What:** sgs-db `block_compositions` table is currently empty (0 rows). The schema exists; the cloning pipeline will populate it for new patterns. But the existing 36 patterns in `theme/sgs-theme/patterns/` and `plugins/sgs-blocks/patterns/` need their composition data seeded too — otherwise existing patterns are invisible to the recogniser's pattern-vs-block-composition queries.

**Method:** Walk each existing pattern .php file, parse the block markup (recursive parser per CLAUDE.md gotcha), extract block_slugs JSON list, INSERT one row per pattern.

**Effort:** ~30 min Cerebras script + my QC.

**Resume trigger:** alongside P-11 (cloning-skill build) — runs as part of Milestone 1.

---

### P-13 — Validator on uimax writes (no-licensing + Rosetta Stone discipline)

**Captured:** 2026-05-08 (audit finding from Stage +Register)

**What:** Two captured rules — `no-licensing-talk-in-sgs-cloning-context` (blub.db row 211) and `uimax-is-the-rosetta-stone-of-design` (blub.db row 213) — are embedded in skill bodies and the project CLAUDE.md, but no automated validator on uimax writes prevents reintroduction. New `/uimax-*` tools could still write rows that violate either rule.

**Spec:** Pre-write hook in each `/uimax-*` command that:
1. Greps the row payload for licensing-related keywords (`license`, `provenance_license`, `IP-firewall`) → reject + surface row 211
2. For artefact-shaped rows (patterns / components / animations / naming_conventions), validates `equivalent_implementations` is populated with at minimum `sgs_block` (or explicit `null` + gap-candidate flag) → reject otherwise + surface row 213

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** During P-11 Milestone 6 (recognition_log + operator UI) — same surface area.

---


### P-15 — `/sgs-update` Stage 3+4 (uimax sync extension)

**Captured:** 2026-05-08

**What:** `/sgs-update` currently mirrors block.json files into sgs-db. The audit identified two missing stages:
- Stage 3 — Mirror sgs-db blocks → uimax `component_libraries` (one row per SGS block, populated as part of P-11 anyway but the auto-sync is the durable mechanism)
- Stage 4 — Scan uimax `animations.is_gap_candidate=1` rows; if an SGS block has an attribute matching the gap, surface a "gap candidate ready to close" report for operator review

**Why separate from P-11:** Bean may want this independently of the full cloning-skill build, e.g. for solving the "uimax stays stale every block change" problem before full Option A ships.

**Effort:** ~25 min Sonnet + my QC.

**Resume trigger:** Either P-11 Milestone 1 OR a smaller dedicated 30-min session if Bean wants the sync gap fixed before the full build.

---

### P-9 — Bucket 2 new blocks + timeline rework

**Captured:** 2026-05-07

**What:** Three new SGS blocks + one rework of an existing block:

| Item | Source | Effort |
|---|---|---|
| `sgs/empty-state` block | gap candidate `empty-state-float` from animation gap audit | 25-40 min |
| `sgs/toggle` block | gap candidate `toggle-slide` from animation gap audit | 40-60 min |
| `sgs/testimonial-slider` block | gap candidate `swipe-to-dismiss` from animation gap audit | 90-120 min |
| `sgs/timeline` rework | Bean 2026-05-07: "design / lack of variety / animations are pretty awful" | 60-120 min |

Total estimate: 3.5-5.5 hrs.

**Strategic dogfood opportunity:** if `/sgs-clone` is shipped + stable when this session runs, design the static layers as HTML/CSS mockups first, then run `/sgs-clone` on each as a real-world stress test. Manually layer the interactive concerns (slider gestures, toggle state) on top.

**Specialised next-session-prompt:** `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md`.

**Resume trigger:** After P-11 ships.

---

### P-10 — `svg-morph` animation gap candidate (DEFERRED INDEFINITELY)

**Captured:** 2026-05-07

**Why deferred:** Requires GSAP MorphSVGPlugin — paid Club GSAP library. Misaligned with SGS open-source default.

**Resume trigger:** Only if a paid client specifically needs SVG morphing AND they're willing to fund Club GSAP licensing. Otherwise leave the uimax `animations` row flagged `is_gap_candidate=1` with a note pointing here.

**Alternative path:** Anime.js morphing helpers, custom SMIL fallbacks, hand-coded path interpolation. None match GSAP MorphSVG's polish but all are licence-free.

---

## Active items (framework / SGS surface)


### P-2 — Phase 2.5 / G2.5 deferred work

See `.claude/plans/phase-2-rubrics-universe.md` G2.5 section. Triggered by Phase 2 G2 gate close + tooling spec finalisation.

- Track 2 optimiser passes (4 skills): /extract, /harden, /ethics-gate, /interactivity-capture
- Structural debt content fixes (3 agents): design-reviewer, seo-auditor, sgs-extraction
- seo-technical content fixes (3 A-grade rubric gaps + ai-crawler-management opportunity)
- 9 deletion-bound migration notes (Phase 4 design-brain DB schema dependency)

---

### P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** Subagent attempt blocked by Trustpilot anti-bot. Inline Playwright not yet tried.

**Trigger to resume:** Mid-design-clone session, when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

---

### P-17 — Shared universal icon picker component (framework-wide upgrade)

**Captured:** 2026-05-08 (during sgs/icon-list expansion review)

**What:** Every SGS block that exposes an icon picker control hardcodes its own ~8-item dropdown. Meanwhile the framework actually supports a much richer icon universe: **Lucide (1,963 SVG icons)** + **emojis treated as icons** (uimax `icon_libraries` has 12 emoji families flagged `is_emoji=1` with full Rosetta Stone equivalents) + any **other icon sets installed** (Heroicons, Phosphor, Tabler, Font Awesome — registerable via a future `sgs_register_icon_set` hook). Operators editing `sgs/icon-list`, `sgs/icon`, `sgs/icon-block`, `sgs/info-box`, `sgs/process-steps`, `sgs/multi-button`, `sgs/whatsapp-cta`, `sgs/notice-banner`, `sgs/trust-bar`, etc. all see different tiny dropdowns and never reach any of the broader universe.

**Why this matters strategically:** every clone we do that uses an icon-rich design (services pages, feature grids, process steps, food/restaurant menus) currently risks the operator picking "the closest of 8" instead of "the right icon out of thousands". Recogniser quality also suffers — it can't propose accurate icon mappings if the editor can't render them. Branded emoji-as-marker is a real client request (food sites, lifestyle brands, kids/education sites) that SGS structurally supports today but no operator can actually reach via the UI.

**Spec — universal `<IconPicker>` component (NOT lucide-specific):**

1. **New shared component:** `plugins/sgs-blocks/src/components/IconPicker.js`
   - **Source-agnostic interface** — accepts a `value` shaped as `{ source: 'lucide' | 'emoji' | 'heroicons' | '<custom>', value: '<icon-id-or-glyph>' }` and emits the same shape via `onChange`
   - **Source switcher tabs** at top: Lucide / Emoji / [other registered sets] / Recent / Favourites
   - **Search field** (debounced ~150ms) — searches across the active source by name + tag list. Cross-source search optional (toggle: "Search all sources").
   - **Virtual-scrolling grid** (`react-window` or equivalent) — only renders visible cells. Critical for Lucide (1,963 icons) and the emoji set (~3,500 standard Unicode emojis).
   - **Category sidebar per source:**
     - Lucide: commerce / food / transport / nature / interface / arrows / weather / health / etc.
     - Emoji: smileys / animals / food / activities / travel / objects / symbols / flags
     - Other sets: whatever taxonomy the set declares
   - **Favourites** — pinned icons saved per-site in `wp_options` (max 36, mixed sources).
   - **Recently used** — last 16 used in this editor session (sessionStorage).
   - **Selected preview** at the top with the source label so operator knows what's picked.
   - **Keyboard navigation** (arrow keys + Enter) and 44×44 touch targets per WCAG.

2. **Icon-set registry** (PHP + JS):
   - PHP-side: `sgs_register_icon_set( $args )` — params: `slug`, `label`, `icons` (array of `{id, name, tags, category, svg_or_glyph}`), `kind` (`'svg'` / `'emoji'` / `'font-icon'`)
   - JS-side: `wp.hooks.applyFilters('sgs.icon-picker.sources', defaultSources)` — third-party plugins can extend
   - Built-in registrations:
     - `lucide` (kind=svg) — sourced from existing `includes/lucide-icons.php` (regenerated with tag/category metadata if missing)
     - `emoji-keycap`, `emoji-people`, `emoji-food`, etc. (12 families, kind=emoji) — sourced from uimax `icon_libraries WHERE is_emoji=1`
     - Future: heroicons / phosphor / tabler — opt-in installs

3. **Render-side handling** — the `value` shape carries `source` so the renderer knows whether to:
   - For `source: 'lucide'` → output inline SVG via `sgs_get_lucide_icon()` (existing path)
   - For `source: 'emoji'` → output the glyph directly (needs `aria-label` from the icon's name for screen readers)
   - For `source: '<custom>'` → look up the registered renderer for that set
   
   Render helper: new `sgs_render_icon( $value )` in `includes/render-helpers.php` that switches on source and returns the right HTML.

4. **Migration path** — every block currently exposing an icon-picker control:
   - `sgs/icon-list` (single icon + per-item icon + pattern entries)
   - `sgs/icon`
   - `sgs/icon-block`
   - `sgs/info-box`
   - `sgs/process-steps`
   - `sgs/multi-button` (icon-before-label / icon-after-label)
   - `sgs/whatsapp-cta` (icon override)
   - `sgs/notice-banner` (state icon)
   - `sgs/trust-bar` (per-item icon)
   - `sgs/social-icons` (already partially solves this for social platforms — keep as-is OR fold in)
   - any block that hardcodes its own icon dropdown
   
   Replace each block's bespoke dropdown with `<IconPicker value={...} onChange={...} />`. **Schema change:** existing string-typed icon attributes (e.g. `icon: 'check'`) need migration to the object shape (`{ source: 'lucide', value: 'check' }`). Each migration carries a deprecation that maps old string values to the lucide source. ~15-20 min per block including build verification + deprecation.

5. **Lucide registry expansion** — `includes/lucide-icons.php` is auto-generated. If the current file doesn't carry tag/category metadata, regenerate with metadata included. Confirm the generator script during work.

6. **Emoji registry** — already in uimax. Build a one-time importer that pulls `uimax.icon_libraries WHERE is_emoji=1` plus the standard Unicode emoji set into a JSON manifest at `includes/emoji-icons.json` for the picker to consume offline.

7. **Performance budget** — virtual-scrolling means only rendered cells eat DOM. The full Lucide SVG payload should NOT be loaded on editor mount; lazy-fetch chunks (e.g. by category) on demand. Emoji glyphs are essentially free (single Unicode characters). Render `<svg>` inline only for visible Lucide cells (~20-40 × ~1KB each = ~30KB DOM at any time).

**Effort:** ~3-4 hrs for the shared component + source-registry + emoji import + Lucide metadata regen. ~15-20 minutes per migrated block × ~10 blocks = ~3-4 hrs migration including deprecations. Total **~6-8 hrs realistic** (revised up from initial 4-6 estimate to reflect the broader scope).

**Resume trigger:** standalone session (not a blocker for any active path). Could run before bucket-2 (so the 3 new bucket-2 blocks land using IconPicker from day one) or after bucket-2 (so existing blocks get the upgrade once and bucket-2 ships without it).

**Why this slipped:** original sgs/icon-list spec asked for 8 icons; nobody widened the universe since. Caught 2026-05-08 when the icon-list expansion subagent reported "Editor icon library limited to 8 editor presets" as a known limitation. Bean immediately surfaced the broader missing-functionality (emoji-as-icons + other registered sets) — captured fully here in this revised entry.

---

### P-19 — Broader saved-defaults system audit + WP-native migration

**Captured:** 2026-05-08 (during icon-list 3-mode design review)

**What:** SGS has a saved-defaults system (`includes/class-block-defaults.php` + `withSaveAsDefault` HOC + the 2026-05-08 unified slot-aware routes added by Fixes-1+2) that lets operators save block-attribute snapshots as site-wide defaults. Bean's insight 2026-05-08: this DUPLICATES WordPress's native Site Editor → Styles → Blocks panel (`wp_global_styles` overlay on theme.json) for visual styling, and the use cases the SGS system covered are mostly handled better by WP-native mechanisms.

The icon-list refactor (2026-05-08) removes saved-defaults usage from icon-list specifically and replaces it with a sessionStorage `useLastUsedAttributes` hook + 5 block patterns. The broader system stays in place because OTHER blocks may still use `withSaveAsDefault` — auditing + migrating each is out of scope for the icon-list refactor.

**Spec:**

1. **Audit (~30 min):**
   - Grep `plugins/sgs-blocks/src/blocks/` for `withSaveAsDefault` usage — list every consumer
   - Grep for `<BlockDefaultsPanel>` direct usage — should be 0 after icon-list refactor
   - For each consumer, classify what's being saved:
     - **Visual only** (colour, typography, spacing, border) → migrate to native WP Site Editor → Styles → Blocks panel; delete saved-defaults usage
     - **Structural** (mode, type, behaviour switches) → replace with `useLastUsedAttributes` sessionStorage hook + canonical block patterns
     - **Mixed** → split: visual goes native, structural goes sessionStorage + patterns

2. **Per-block migration (~10-20 min each):** remove HOC wrap; for visual no further action; for structural, import `useLastUsedAttributes` + register 3-5 patterns; add deprecation if attribute schema changed.

3. **Once all consumers migrated:**
   - Delete `withSaveAsDefault` HOC from `extensions/block-defaults.js`
   - Delete `<BlockDefaultsPanel>` shared component
   - Delete the slot-aware REST routes (`/block-defaults/{block}?slot=...`)
   - Delete the legacy single-slot routes (`/defaults` body-param + `/defaults/{block}` orphan)
   - Drop `class-block-defaults.php` entirely (or keep as a stub for one release cycle if read-time fallback needed)

4. **Documentation:** update CLAUDE.md to capture the model — visual styling = WP Global Styles, structural starting-state = block patterns, per-operator memory = sessionStorage, per-instance customisation = inspector. Project-wide design principle so new blocks don't reintroduce parallel saved-defaults infrastructure.

**Effort:** Audit ~30 min. Per-block migration ~10-20 min × N consumers. Cleanup ~30 min. Total likely 3-6 hours depending on N.

**Resume trigger:** framework polish pass; not blocking any active work; could fold into bucket-2 or its own session.

**Why this matters:** every parallel system the framework maintains is ongoing maintenance cost. WordPress Global Styles is well-understood by operators (it's where they already go) and well-maintained by core. Centralising on it reduces SGS surface area and makes the framework feel native to WordPress rather than "yet another plugin with its own conventions."

---

---


## Resolved items (kept as one-line audit trail)

- **~~P-17 — Universal IconPicker component~~** — COMPLETED 2026-05-08. Source-agnostic `<IconPicker>` shipped (Lucide + emoji + extensible via `sgs_register_icon_set` PHP hook + `sgs.icon-picker.sources` JS filter). 9 blocks migrated via P-17b/c (icon-list, icon, icon-block, info-box, process-steps, button, whatsapp-cta, notice-banner, trust-bar). `sgs_render_icon($value)` PHP helper added.
- **~~P-18 — Nested sub-points for sgs/icon-list~~** — COMPLETED 2026-05-08. Tree-shaped items[] with recursive render, MAX_DEPTH=4, `subMode='inherit'` auto-derives sub-marker from parent (parent ordered numbers → children ordered letters). Indent/outdent buttons + Add sub-item action. v6 deprecation chain wraps existing flat data.
- **~~P-19 — Saved-defaults system audit + WP-native migration~~** — COMPLETED 2026-05-08. System fully retired (was global filter, not per-block). Deleted `extensions/block-defaults.js`, `class-block-defaults.php`, `block-defaults.php`. CLAUDE.md (project + plugin) embeds the four-channel canonical model: Visual = WP Global Styles / Structural = block patterns / Per-operator memory = sessionStorage / Per-instance = inspector. 25 new structural patterns added across 8 high-leverage blocks.

- **~~P-6 — Image controls block extension~~** — COMPLETED 2026-05-08. New extension at `plugins/sgs-blocks/src/blocks/extensions/image-controls.{js,php}` + extensions.css extension. 7 blocks opted in via `supports.sgs.imageControls: true` (decorative-image / gallery / card-grid / hero / info-box / team-member / testimonial). Webpack clean. Project CLAUDE.md updated with Image controls discipline rule.
- **~~P-8 — Reduced-motion rules audit~~** — COMPLETED 2026-05-08. 8 redundant rules removed across 4 files (1 bonus file surfaced). 1 rule kept (header-modes scroll-driven shrink animation — `animation-timeline: scroll()` ignores duration; `animation: none` is the only valid suppression).
- **~~P-14 — `block-name-search-blindspot` grep wrapper~~** — COMPLETED 2026-05-08. `scripts/sgs-block-grep.py` with TRIPLE-term search: literal heading + parenthetical-stripped form + slug-form `sgs/<derived>` (the actual hit-finder for SGS source). Three Haiku-introduced bugs fixed inline: docstring unicode-escape, brace-glob at arg level, Windows-path drive-letter parser collision. Final test: "Hero Block" → 80 hits (71 via slug); "Icon Block (single icon)" → 43 hits.
- **~~P-16 — Embed `diagnose-blub-db-locks-not-park-on-timeout` rule into `/autopilot` + `/handoff`~~** — COMPLETED 2026-05-08. Embedded in BOTH targets per parking entry intent: (a) `~/.claude/skills/autopilot/references/correction-capture.md` Failure handling — full HARD GATE diagnostic sequence + unicode-substitution fallback (row 199); (b) `~/.claude/commands/handoff.md` — Persistence-failure HARD GATE banner at top of Pre-Handoff Gates pointing back to autopilot's diagnostic sequence so /handoff Gate 4 dashboard sync calls inherit the rule.
- **~~P-1 — `/gap-analysis` SKILL.md edits~~** — COMPLETED 2026-04-30. All 4 A-grade edits landed. Skillscore held at 92%.
- **~~P-3~~** — (slot reserved, never used)
- **~~P-5 — `sgs/feature-grid` block~~** — COMPLETED 2026-05-04. Built with auto-flex / fixed-columns layout modes; ingredients pattern uses fixed-columns (4/2/1).
- **~~P-7 — sgs/icon vs sgs/icon-block duplicate cleanup~~** — COMPLETED 2026-05-04. sgs/icon canonical; icon-block hidden via `supports.inserter: false` + deprecated.js for back-compat.
- **~~Old P-9 — Recogniser-v2 generalisation beyond hero~~** — SUPERSEDED 2026-05-08 by P-11 (rule-stage coverage audit + revised Option A path). The work folds into the comprehensive cloning-skill build session.
- **~~H-1 — Hero block inspector reorganise by element~~** — RESOLVED 2026-05-05. 21 panels → 10 element-grouped panels.
- **~~H-2 — `imagePadding` vs `mediaPadding` redundancy~~** — RESOLVED 2026-05-05. Inspector labels clarified ("inner padding" vs "outer wrapper padding") with HelpText. Folded into H-1's element-grouped layout.
- **~~H-3 — Video-everywhere-image feature~~** — RESOLVED 2026-05-05. Shared `MediaPicker.js` + `sgs_render_media()` PHP helper. 9 of 11 blocks migrated; 2 NO-OP. Recipe at `tools/qc-prevention/media-slot-migration.md`.
- **~~H-4 — Brand-source pink shade vs mockup brief~~** — RESOLVED 2026-05-05. Built `scripts/brand-palette-sampler.py` (PIL k-means + ΔE 2000). Finding: `--surface-pink #F5C2C8` is designer-invented (no brand anchor); brand uses `#E68A95` primary pink + warm peach/tan family. Bean approved adding warm tones.
- **~~H-5 — Classifier human-eye gate~~** — RESOLVED 2026-05-05. `screenshot-diff-helper.js` (560 lines) + `requires_screenshot_review` flag in `mockup-parity-validator.js` + Hard Rule 10 baked into visual-qa SKILL.md.
- **~~H-6 — replaceBlock helper packaged~~** — RESOLVED 2026-05-05. `scripts/wp-update-block-attrs.js` (385 lines).
- **~~H-7 — Full-bleed pattern replacement~~** — RESOLVED 2026-05-05. Viewport-aware `var(--viewport-width, 100vw)` calc-based margins + JS measurement helper. Wave 6 deploy verified PASS.
- **~~H-8 — Hero ctaGap attribute + recogniser blind spot~~** — RESOLVED 2026-05-06. 4 attrs added (ctaGap + responsive variants). v5 deprecation. Recogniser fix folded into Section R prevention scripts.
- **~~H-9 — Background shorthand audit~~** — RESOLVED 2026-05-06. 3 of 15 matches required fixing (cta-section + post-grid). `css-pattern-audit.js` extended.
- **~~H-10 — Cascade Section R defects into prevention scripts~~** — RESOLVED 2026-05-06. Background shorthand audit, pseudo-element measurement, parent-chain filter walker — all shipped.

---

## Cross-platform emit pathway (deferred until M9 production-stable)

The Rosetta Stone discipline (Hard Rule 7) + SGS-prefixed BEM convention (Spec 13) make cross-platform output structurally feasible. The parking entries below capture the work without committing to it now. Trigger condition for ALL three: M9 production-stable + at least 3 successful clones banked + a client/market opportunity that justifies the per-platform engineering pass.

### P-CP-1 — `/sgs-emit` (cross-platform component emitter)

**What it does:** Read a `/sgs-clone` result (composition + filled slots + recognised SGS blocks) and emit equivalent component code for non-WP platforms. Targets in priority order: React (web SPA), React Native (mobile), Flutter (mobile), SwiftUI (iOS native), Web Components (framework-agnostic). Emit pathway uses `role-templates.json` direction:generate entries plus uimax `equivalent_implementations` payloads to map SGS blocks to platform-idiomatic components.

**Trigger:** Vague — client request for non-WP platform. Specific named use cases as recognition aids: Bean & Tub mobile app (RN); Indus Foods mobile reskin (RN or Flutter); any SGS Studio v2 mobile component. Soak ~3 months after M9 production-stable.

**Effort estimate:** ~8-12 hours initial scaffold + ~4-6 hours per platform target for first smoke test.

**Source materials:**
- uimax `stack_*` tables (Angular, Astro, Flutter, HTML/Tailwind, Jetpack Compose, Laravel, Next.js, Nuxt, React, React Native, shadcn, Svelte, SwiftUI, Three.js, Vue — 49–60 rows each)
- `role-templates.json` direction:generate entries (post-Phase 4)
- uimax `equivalent_implementations` payloads on every artefact (Rosetta Stone)
- Spec 13 (`.claude/specs/13-DRAFT-NAMING-CONVENTION.md`) — SGS-BEM is what makes cross-platform structural alignment feasible at all

**Dependencies:** M9 production-stable (so the clone pipeline is reliable before we extend it); ≥3 successful clones banked (test data); Phase 4 propagation complete (so `/sgs-clone` body honours Spec 13 lingua-franca rule).

### P-CP-2 — Style translation (theme.json → React/Flutter/SwiftUI styles)

**What it does:** Read `theme.json` palette + spacing + typography tokens (or uimax `design_tokens` table directly) and emit equivalent style objects for: React (CSS-in-JS objects, styled-components ThemeProvider props, Tailwind config), Flutter (`ThemeData` + per-component overrides), SwiftUI (custom modifier extensions on `View`), Web Components (CSS custom property block). Honours DTCG token format already in uimax.

**Trigger:** Vague — P-CP-1 in flight OR client request for style-only port (e.g. design system migration). Specific named: HelpingDoctors EHR app theme port from web to mobile.

**Effort estimate:** ~6-8 hours per target platform.

**Source materials:**
- uimax `design_tokens` table — 5,164 DTCG-format rows as of 2026-05-10
- Rosetta Stone payloads on token rows
- `theme.json` v3 (per-client style variations in `theme/sgs-theme/styles/`)

**Dependencies:** Not strictly required after P-CP-1 but synergistic — emit + translate ship together for full app-component parity. Deferred until M9 production-stable.

### P-CP-3 — Animation translation (uimax animations → React-spring / Flutter / SwiftUI)

**What it does:** Translate CSS keyframe animations captured in uimax `animations` table to: React-spring config (`useSpring` calls + `config` objects), Flutter `AnimationController` + `Tween` setups, SwiftUI `.animation()` and `withAnimation { }` form. Reads via `equivalent_implementations` Rosetta Stone payloads on each animation row.

**Trigger:** Vague — P-CP-1 + P-CP-2 in flight, animation-rich app port requested. Specific named: Bean & Tub mobile splash/transitions; HelpingDoctors EHR loading states.

**Effort estimate:** ~4-6 hours per platform target.

**Source materials:**
- uimax `animations` table — 63 rows (post 2026-05-10 5-column migration: `is_gap_candidate`, `gap_reason`, `sgs_block`, `sgs_animation_attribute`, `equivalent_implementations`)
- Rosetta Stone payloads on animation rows

**Dependencies:** `animations` table needs ≥30 cross-platform-mapped rows (current 63 rows, but mapping coverage to verify before emit work begins). M9 will surface more animations via `/uimax-scrape-animation` runs. Cross-link to P-CP-1 and P-CP-2.

---

## Retired (spec 14 FR18, 2026-05-11)

Navigation aid: when a future session greps for these script names, this entry points back to the decisions log.

- `heuristic-fallback-builder.py` — RETIRED. Function absorbed by Layer 2 role-templates per-attribute strategies (spec 14 FR2). See `.claude/decisions.md` 2026-05-11 entry.
- `computed-style-passport.py` — RETIRED. Replaced by Playwright runtime probe in spec 14 FR3. See `.claude/decisions.md` 2026-05-11 entry.

NOT retired (built per spec 14 — listed here so future greps don't mistakenly retire them):

- `recursion-guard.py` — built in P2 as ~50-LOC standalone module. Original "RETIRE" framing was a fabrication caught by Bean 2026-05-11; reverted to BUILD.
- `critical-fix-verification.py` — built in P10 as ~45-min lightweight acceptance harness (5 canonical-mutation-boundary checks).

## Planned blocks — design intent captured 2026-05-11

These blocks were registered in sgs-framework.db on 2026-05-08 with the wrong status (`built` instead of `planned`) and zero implementation. They are NOT ghost rows — they're future features Bean wants. Restored 2026-05-11 with `status='planned'`.

### sgs/media (planned)

Single content block for placing an image OR video with Schema.org markup and alt text.

- Supports image (Media Library + external URL) and video (local upload + embed code + external URL).
- Schema.org: emits `ImageObject` for images, `VideoObject` (with `thumbnailUrl`, `uploadDate`, `duration`, `contentUrl`) for videos.
- Alt text + caption + credit fields.
- Replaces ad-hoc `<img>` + `<video>` placement across multiple existing blocks (hero, gallery, decorative-image) — over time those would consume `sgs/media` as an inner block.

### sgs/data-display (planned, parent container)

Parent block + sub-block roster for data visualisation. Same parent/child pattern as `core/buttons` → `core/button`.

- Data source on PARENT: choose between internal source (WP custom post type, ACF repeater, REST endpoint, CSV upload) or external (URL to JSON / CSV).
- Each sub-block selects which subset of the parent's data to render + per-sub-block styling.

**Sub-block roster (to be split out):**

| Slug | Type |
|---|---|
| `sgs/data-table-basic` | Basic data table |
| `sgs/data-table-comparison` | Comparison / feature matrix |
| `sgs/data-table-pricing` | (NOTE: `sgs/pricing-table` already exists — decide if this merges or stays separate) |
| `sgs/chart-bar` | Bar chart |
| `sgs/chart-column` | Column chart |
| `sgs/chart-line` | Line chart |
| `sgs/chart-area` | Area chart |
| `sgs/chart-pie` | Pie chart |
| `sgs/chart-donut` | Donut chart |
| `sgs/chart-scatter` | Scatter plot |
| `sgs/chart-bubble` | Bubble chart |
| `sgs/chart-radar` | Radar / spider chart |
| `sgs/chart-radial-bar` | Radial bar |
| `sgs/chart-treemap` | Treemap |
| `sgs/chart-heatmap` | Heatmap |
| `sgs/chart-candlestick` | Candlestick (finance) |
| `sgs/chart-boxplot` | Box plot |
| `sgs/chart-funnel` | Funnel |
| `sgs/chart-waterfall` | Waterfall |
| `sgs/chart-gauge` | Gauge |
| `sgs/chart-sankey` | Sankey diagram |
| `sgs/chart-sparkline` | Sparkline (inline mini chart) |

Bean said "all 20+ chart types" — list above is the typical taxonomy, pruned to the most useful. Confirm before building.

**Open questions before implementation can start:**

1. **Chart library** — likely Vega-Lite (the uimax DB already has 626 Vega-Lite chart templates, which aligns with Bean's "20+ chart types" comment). Chart.js / Apache ECharts / Recharts are alternatives. Vega-Lite is the strongest pick: declarative, theme-able, accessible.
2. **Internal data sources** — preferred mechanism? Custom post type, ACF repeater, REST endpoint, or CSV upload? Probably need all four with adapters.
3. **Table vs pricing-table** — does `sgs/pricing-table` (already built) become a sub-block of `sgs/data-display`, or stay separate as a special-case block?
4. **Schema.org for charts** — emit `Dataset` markup on parent + `MeasureValue` per data point? (Important for SEO.)

These blocks remain `status='planned'` in sgs-framework.db until implementation begins. They appear in the Layer 3 catalogue with `block_json_path: null` and a `block-json-missing` gap entry — that's correct, the catalogue accurately reflects "registered but not built".

### Process correction captured

Lesson logged for autopilot/episodic memory: **Don't delete DB rows based on a "ghost row" verdict without first asking the operator.** Zero references in commits/handoffs/specs is necessary but NOT sufficient evidence — the operator may be holding the design intent in their head with no written trail yet. Future "ghost row" investigations must surface to operator with the deletion proposal before executing.

---

## 2026-05-14 parked items (Spec 16 session)

### P-S16-1: sgs/label `source: "html"` selector breadth
Source binding selector on text attr is `.wp-block-sgs-label` (the root). If save.js is ever modified to wrap content in a child element, round-trip break. Revisit when adding sgs/heading composite block (Phase 2) — same RichText shape, same potential trap.
Source: Sonnet QC 2026-05-14

### P-S16-2: `attr(data-X)` CSS responsive font-size pattern is systemic
Used in sgs/label + sgs/hero + sgs/info-box. Near-zero browser support for `attr()` outside `content:`. Switch all three to inline CSS custom properties at save time in a future cleanup pass.
Source: Sonnet QC 2026-05-14

### P-S16-3: variantStyle enum hardcoded in converter
`["standard","trial","gift"]` hardcoded in convert.py:lift_subtree_into_block_attrs. Move to live DB read via block_attributes.enum_values when wiring as Phase 3.

### P-S16-4: Pre-emit JSON serialisation validation
Source text with newlines / unescaped quotes / control chars could break the JSON serialisation in block markup. Currently no pre-emit validator. Add in Phase 3.
Source: Gemini Flash QC 2026-05-14

### P-S16-5: Nested block-roots edge case (block inside block)
sgs-product-card inside sgs-featured-product would trigger lift_subtree on the outer block but its descendant walk would consume the inner block's slots into outer attrs. Add recursion guard in Phase 3.
Source: Sonnet QC architectural review 2026-05-14

### P-S16-6: Indus Foods + helping-doctors converter validation
Spec 16 §9 item 7 (closure criterion): run converter on second client without code changes. Indus Foods and helping-doctors mockups exist but haven't been tested yet. Schedule after Mama's Phase 4 closes.

