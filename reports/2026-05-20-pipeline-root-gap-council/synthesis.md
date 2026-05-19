# Council Synthesis — Pipeline Root Gaps

**Date:** 2026-05-20
**Raters:** Sonnet (rater-sonnet.md), Haiku (rater-haiku.md), Gemini Flash (rater-gemini-flash.md), Opus (rater-opus.md). Cerebras stalled in queue (known free-tier behaviour); will be folded in if it returns.
**Verification:** Every cross-rater citation grep-confirmed by Opus per the verify-Gemini-claims-by-grep binding rule. Live HTML curled for variation-activation check.

## Headline finding

The pipeline is structurally sound. Stages 1-9 run cleanly. The dominant root gap is **Stage 10 deploys block markup to page 144 but does not activate the matching style variation**. The live page renders with default theme tokens (1200px wide-size, default colours, default fonts) instead of the client variation tokens. None of the work Stage 0.7 does (lifting mockup CSS into `theme/sgs-theme/styles/mamas-munches.css`) reaches the rendered page because WordPress never loads that CSS — the activation gate at `theme/sgs-theme/functions.php:171, 227` requires the `active_theme_style` theme_mod to be set, and Stage 10 (`plugins/sgs-blocks/scripts/orchestrator/upload_and_patch.py`) never sets it.

Plain English: the pipeline writes the right client-specific styles to disk, deploys them to the server, patches the page with the right block markup, but then forgets to flip the switch that says "use the mamas-munches styling for this site". So WordPress shows you the framework defaults. Pixel-diff measures "framework defaults vs polished mockup" and reports 99% — which is roughly correct.

## Confirmed root gaps (≥2 raters + Opus grep-verification)

### R1 — Stage 10 does not activate the style variation (CRITICAL, confidence 0.98)
- **Class:** orchestration
- **Evidence (grep-confirmed):**
  - `plugins/sgs-blocks/scripts/orchestrator/upload_and_patch.py` — zero matches for `variation|active_theme_style|theme_mod`.
  - Live HTML from `https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/` — `--wp--style--global--wide-size: 1200px` (base theme) instead of 1280px (`theme/sgs-theme/styles/mamas-munches.json:205`).
  - `mamas-munches.css` is NOT linked anywhere in the live page head — only appears in URL slugs.
- **Universal fix:** When `--deploy-target` is passed AND the run was driven by a client mockup, Stage 10 sets `active_theme_style` theme_mod to the client slug BEFORE patching the page. Idempotent. ~30 LOC in `upload_and_patch.py`. WP REST endpoint OR `wp option set theme_mods_sgs-theme`.
- **Adversarial caveat (Opus):** Setting `active_theme_style` site-wide would break OTHER client canaries on the same WP install. Architecture decision needed: per-page variation override (new `_sgs_page_variation` post meta resolved at render time) OR per-client WP site. Recommend `/strategic-plan` evaluates before shipping.
- **Expected pixel-diff impact:** 30-50 points down (99% → 50-70%) on complex sections.

### R2 — Dead CSS selectors: mockup classes don't match render.php output (HIGH, confidence 0.95)
- **Class:** converter + DB
- **Evidence (grep-confirmed):**
  - Mockup: `sites/mamas-munches/mockups/homepage/index.html:271` — `.sgs-hero__sub { ... }`
  - Render: `plugins/sgs-blocks/src/blocks/hero/render.php:768` — `<p class="sgs-hero__subheadline"...`
  - Sonnet enumerated 51 of 62 inner-element selectors (82%) across hero / trust-bar / featured-product / brand.
- **Universal fix (Path B — pipeline-side, council prefers over making Bean rewrite all his mockups):** Add a `block_element_synonyms` DB table mapping mockup short-forms (`__sub`, `__badge`) to render.php canonical names (`__subheadline`, `__item`). Seeded one-time by grepping every `render.php` for `sgs-{block}__X` literals. Stage 0.6 (new) runs a deterministic class-name reconciler that rewrites mockup CSS class names to canonical render names before Stage 0.7's verbatim CSS lift.
- **Cross-pattern impact:** Every block with composite children. Once R1 unlocks CSS loading, this becomes the next dominant gap.
- **Expected pixel-diff impact:** After R1, another 20-30 points down.

### R3 — Stage 9 over-reports `extraction_failed` against the wrong baseline (HIGH for diagnostic credibility, confidence 0.85)
- **Class:** orchestration + measurement
- **Evidence (cross-rater consensus):**
  - Stage 3 finds 186 slots; cv2 extracts 386 attrs; Stage 9 reports 1097 `extraction_failed`.
  - Sonnet: 941 of 1097 are `cv2_emitted_dynamic` blocks with `canonical_slot=NULL` in the DB. sgs/text alone: 491.
  - Haiku: Stage 9 scans the full 1755-row `block_attributes` table; every block-attribute slot WITHOUT a value gets bucketed as failed — even when no CSS rule was expected to set it (e.g. `boxShadow` on a paragraph with no shadow in the mockup).
- **Universal fix:** (a) Stage 9 only counts `extraction_failed` for slots WHERE Stage 0.7's lifted CSS has a corresponding declaration; (b) populate canonical_slot on the NULL rows; (c) split the bucket into `mockup_expected_but_not_lifted` (real gap) vs `block_attribute_unset` (intentional default).
- **Cross-pattern impact:** Doesn't move pixel-diff but unblocks every future council from chasing phantom gaps.

## Secondary findings (worth noting but not top-3)

### R4 — `font-family` missing from cv2 `_CORE_BLOCK_STYLE_MAP` (Sonnet, confidence 0.88)
Branded typography (Fraunces for pricing, specific Inter weights) never reaches block attrs. Once R1 is fixed, font-family becomes the next typography gap. Estimated ~50 LOC in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` plus a font-loading orchestration tail.

### R5 — Media sideload remains in dry-run (Gemini Flash, confidence 0.85)
`pipeline-state/.../media-sideload-manifest.json` is dry-run by default. Hero block's `backgroundImage` lifts empty value → placeholder renders → ~99% diff on image-heavy sections. Stage 4i needs a `--live` flag or auto-promote when `--deploy-target` is passed.

### R6 — slot_synonyms gaps for composite element-modifier tokens (db_lookup_miss telemetry, confidence 0.7)
`price-row`, `price-note`, `card-tag`, `text` don't resolve to any canonical_slot. 5 events in trace. 3-row DB seed closes it.

## Refuted hypotheses

- **Smoking gun #1 (`css_decl_skipped: no_sgs_bem_class_on_node` as primary cause)** — REFUTED. Only 2 trace events. Real-world drift expresses as dead CSS selectors (R2), not as walker-stage events. The Opus pre-analysis over-weighted converter-walker events.
- **Pre-analysis's overall framing** — Opus pre-analysis assumed converter gaps were primary. Council corrected this to environment / orchestration gaps as primary (R1). Important lesson: the pipeline can run cleanly AND emit the right artefacts AND still render wrong if the deploy step doesn't activate the matching environment.

## Fix sequencing (binding for Task 4)

1. **R1 first** — dependency root. Until variation activates, every other fix is invisible to pixel-diff. Re-measure pixel-diff matrix after R1 to confirm the predicted 30-50pt drop.
2. **R2 second** — dead CSS reconciliation. Re-measure.
3. **R5 third** — media sideload live mode. Re-measure (esp. hero, brand).
4. **R3 fourth** — diagnostic credibility. Doesn't move pixel-diff.
5. **R4/R6** — incremental gains after R1-R3 unmask them.

## What this means for next session

- The framework deploy + cv2 universal-extraction work shipped 2026-05-19 was correct and necessary. The gap was elsewhere — at the seam between Stage 10 deploy and WordPress's variation-activation gate.
- Bean's binding rule (universal-extraction-no-per-block-legacy) is unviolated: all proposed fixes are universal pipeline-level changes, not per-section patches.
- Bean's binding rule (read leftover-buckets before conjecturing) was followed; the leftover-buckets data IS evidence — just not for the gap we expected. It pointed to converter gaps but the dominant gap is one stage further downstream.
- The 5-rater council format worked. Sonnet did deep code reading (164k tokens), Haiku triangulated efficiently, Gemini Flash brought the environment-side angle Sonnet+Haiku missed, Opus verified citations + synthesised. Cerebras stalled — not a critical loss.
