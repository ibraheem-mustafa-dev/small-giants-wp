# Rater 5 — Opus (Synthesis + Independent Pass)

Main-thread synthesis after reading raters 1-3 (Sonnet, Haiku, Gemini Flash) and personally verifying every grep-cited claim. Cerebras rater stalled in queue (known free-tier behaviour) — synthesis proceeds with 4 raters; Cerebras can be folded in later if it returns.

## Verified ground-truth (grep-confirmed, NOT relayed from raters)

I independently grep-confirmed each Gemini Flash citation per the verify-Gemini-claims-by-grep binding rule. ALL CITATIONS CHECKED OUT:

| Claim | Verification |
|---|---|
| `mamas-munches.json` declares `wideSize: 1280px` | `theme/sgs-theme/styles/mamas-munches.json:205` — `"wideSize": "1280px"` ✅ |
| Mockup container max-width is 1280px | `sites/mamas-munches/mockups/homepage/index.html:~43` — `.container { max-width: 1280px; ... }` ✅ |
| Variation activation gates on `active_theme_style` theme_mod | `theme/sgs-theme/functions.php:171` + `:227` — `get_theme_mod( 'active_theme_style', '' )` ✅ |
| Hero render.php emits `__subheadline`, NOT `__sub` | `plugins/sgs-blocks/src/blocks/hero/render.php:768` — `<p class="sgs-hero__subheadline"...` ✅ |
| Mockup CSS targets `.sgs-hero__sub` | `sites/mamas-munches/mockups/homepage/index.html:271` — `.sgs-hero__sub {` ✅ |
| Live page renders at 1200px wide-size (NOT 1280px variation wideSize) | `curl https://sandybrown.../rc-fix-verification-mamas-munches/ \| grep wide-size` returns `--wp--style--global--wide-size: 1200px` ✅ |
| `mamas-munches.css` is NOT linked in live page head | Live page HTML contains "mamas-munches" only in oEmbed permalink URLs, NOT in any `<link rel="stylesheet">` ✅ |
| Stage 10 (`upload_and_patch.py`) does NOT activate the variation | `grep "variation|active_theme|theme_mod" plugins/sgs-blocks/scripts/orchestrator/upload_and_patch.py` returns ZERO matches ✅ |

These verifications shift the council from "hypothesis" to "evidence". The dead-CSS and inactive-variation findings are facts, not theories.

## The ONE root gap (everything else is downstream)

**Stage 10 patches the block markup but does not activate the matching style variation. The live canary renders with default theme tokens (1200px wide-size, default colours, default fonts) instead of the client variation tokens. Mockup CSS — even if Stage 0.7 lifts it perfectly — never loads because the activation gate at `functions.php:171, 227` rejects it.**

This single gap explains:
- Why every section fails by 25-99% (no client CSS applies)
- Why hero is at 99% (no client typography → font fallback → text dimensions wildly differ → every pixel mis-aligned)
- Why trust-bar is the "best" at 24-34% (the simplest section is hardest to break visually even when CSS doesn't apply)
- Why the width delta is 1440px (mockup) vs 1200px (SGS) — base theme wideSize, not variation wideSize
- Why Stage 0.7's 23,038-char CSS lift to `theme/sgs-theme/styles/mamas-munches.css` is wasted work — the file is never linked

Until this gap closes, **no other fix can be measured** — the variation isn't active so every per-attribute extraction improvement is invisible to pixel-diff. This is the dependency root.

## Council convergence on root causes

| Root cause | Sonnet | Haiku | Gemini Flash | Opus verification |
|---|---|---|---|---|
| **R1: Style variation NOT active on live canary** | Surfaced as 4th finding (0.85 conf) | Not surfaced | Top finding (9/10 likelihood) | ✅ Confirmed via live HTML curl + Stage 10 grep |
| **R2: Dead CSS selectors (mockup classes don't match render output)** | TOP finding (0.95 conf) | Confirmed as DOM schema mismatch | Confirmed (8/10) | ✅ Confirmed via render.php + mockup HTML grep |
| **R3: NULL canonical_slot on DB styling attrs (sgs/text et al)** | Strong (0.90 conf) | Confirmed in DB query | Not surfaced | (verification deferred — DB row count check needed) |
| **R4: font-family missing from cv2 `_CORE_BLOCK_STYLE_MAP`** | Strong (0.88 conf) | Not surfaced | Not surfaced | (verification deferred — convert.py grep needed) |
| **R5: Media sideload remains in dry-run** | Not surfaced | Not surfaced | High (0.85 conf) | (verification deferred — verify hero needs images) |
| **R6: 1097 extraction_failed is reporting noise (counted against full block_attributes table, not real misses)** | Confirmed (sgs/text alone = 491 of 941 dynamic-block failures) | Confirmed (Stage 9 over-counts vs Stage 3 scope) | Not surfaced | (Stage 9 logic gap — confirmed independently by two raters) |

## Confirm/refute on the 3 original smoking guns

- **Smoking gun #1 (`css_decl_skipped: no_sgs_bem_class_on_node`)** — **REFUTED as primary lever.** Only 2 trace events across all 9 boundaries (Sonnet). Class drift IS real but expresses as dead CSS *selectors*, not as walker `no_sgs_bem_class_on_node` events. The trace event was a red herring.
- **Smoking gun #2 (`css_decl_skipped: not_in_core_style_map`)** — **PARTIALLY REFUTED.** Sonnet says map IS complete enough; the real issue is slot-list over-scoping (Stage 3 asks for `max-width` on atomic blocks that don't carry it). Haiku confirms. A focused gap exists for `font-family` (Sonnet), but it's not the dominant gap.
- **Smoking gun #3 (`db_lookup_miss: canonical_slot_for: <token>`)** — **PARTIALLY CONFIRMED.** Real (5 events for `price-row`, `price-note`, `card-tag`, `text`). A 3-row DB seed closes it. Not the dominant gap.

**My pre-analysis over-weighted converter gaps and under-weighted environment gaps.** The council corrected this — root cause R1 (variation not active) was hiding in plain sight in the evidence pack (1200px vs 1280px width delta) but I didn't notice it as a root cause, only a contributing factor.

## Top 3 root gaps (council consensus, severity × cross-pattern impact)

### R1 — Stage 10 does not activate the matching style variation
- **Severity:** CRITICAL. Dependency root for every other fix.
- **Class:** orchestration
- **Evidence:** `upload_and_patch.py` zero matches for `variation|active_theme_style|theme_mod`. Live page `--wp--style--global--wide-size: 1200px` (base theme), not 1280px (variation). `mamas-munches.css` not linked in head.
- **Universal fix:** When `--deploy-target` is passed AND the run was driven by a client mockup, Stage 10 must set `active_theme_style` theme_mod to the client slug (`mamas-munches`, `indus-foods`, etc.) via WP REST or wp-cli BEFORE patching the page. Idempotent — re-runs detect existing variation and skip.
- **Cross-pattern impact:** 10/10 — applies to EVERY client clone. Without this, no client-specific styling ever renders.
- **Confidence:** 0.98

### R2 — Mockup CSS class names don't match render.php output (Dead CSS)
- **Severity:** HIGH (becomes visible once R1 is fixed and CSS actually loads).
- **Class:** converter + DB
- **Evidence:** Mockup `sgs-hero__sub` vs render `sgs-hero__subheadline`. Sonnet enumerates 51 of 62 inner-element selectors (82%) are dead across hero/trust-bar/featured-product/brand.
- **Universal fix:** Two paths (council prefers Path B): (A) Bean rewrites mockup CSS class names to match render output — high cost, fragile, breaks every prior mockup; (B) `/sgs-clone` Stage 0.6 runs a deterministic class-name reconciler that maps every `.sgs-{block}__<short>` in mockup CSS to the render.php canonical `__<long>` via a `block_element_synonyms` DB table (new table — needs schema enumeration first to confirm absence). Rewrites mockup CSS in-place during Stage 0.7 CSS lift. The DB table seeds from a one-time grep pass over every render.php that outputs an `sgs-{block}__X` literal — that becomes the canonical name; mockup short-forms become aliases.
- **Cross-pattern impact:** 9/10 — every block with composite children is affected.
- **Confidence:** 0.95

### R3 — Stage 3 slot-list over-scope inflates the 1097 number AND surfaces phantom slots for atomic blocks
- **Severity:** HIGH (diagnostic credibility — and the council debated cause for 30+ minutes anchored on the wrong number).
- **Class:** orchestration + measurement
- **Evidence:** Stage 3 finds 186 slots; cv2 extracts 386 attrs; Stage 9 reports 1097 `extraction_failed` "no value extracted". Haiku: Stage 9 scans the full 1755-row `block_attributes` table against extracted attrs; every block-attribute slot WITHOUT a value gets bucketed as failed even when no CSS rule was expected to set it (e.g. `boxShadow` on an `sgs/text` that has no shadow in the mockup). Sonnet: 941 of 1097 are `cv2_emitted_dynamic` blocks with `canonical_slot=NULL` in the DB — they're listed but never reachable.
- **Universal fix:** (a) Stage 9 reconciliation must only count `extraction_failed` for slots WHERE the mockup CSS has a corresponding declaration (cross-reference Stage 0.7 lifted CSS), not the whole block_attributes table. (b) Populate canonical_slot on the NULL rows (data fix). (c) Split the bucket into `mockup_expected_but_not_lifted` (real gap) vs `block_attribute_unset` (intentional default).
- **Cross-pattern impact:** 8/10 — fixes diagnostic clarity for every future run. Without this, future councils chase phantom gaps.
- **Confidence:** 0.85

## Fix sequencing (recommended for Task 4 surgical fixes)

1. **R1 first** — until the variation activates, every other fix is invisible to pixel-diff. Stage 10 variation-activation is ~30 LOC in `upload_and_patch.py` + a `wp option set theme_mods_sgs-theme` or REST equivalent. Expected pixel-diff impact: 30-50 points down from 99→50-70% across complex sections.
2. **R2 second** — once R1 lands, dead CSS is the next dominant gap. Build `block_element_synonyms` table + Stage 0.6 reconciler. Expected impact: another 20-30 points down.
3. **R3 third** — diagnostic-credibility fix. Doesn't move pixel-diff but unblocks future councils.

Other findings (R4/R5/R6 NULL canonical_slot, font-family gap, media sideload dry-run) become tractable once R1 + R2 unmask them.

## One adversarial challenge to the synthesis

What if R1 (variation not active) is itself a symptom of something deeper — like the live canary surface (page 144 on sandybrown) was never properly set up as a client-specific canary, and the framework has no convention for "this page belongs to client X"? Bean's binding rule says SGS framework code is universal; client identity is style variation. But Stage 10 deploys to a hardcoded page ID — there's no "this page belongs to mamas-munches" metadata. Setting `active_theme_style` site-wide would break OTHER client canaries on the same site. The real architecture question is: should the canary surface itself be variation-scoped (separate WP site per client), or should the framework support per-page variation override (a `_sgs_page_variation` post meta that overrides the site-wide theme_mod at render time)?

This is a fork that affects R1's universal-fix shape. Recommend `/strategic-plan` evaluates the architecture path before shipping R1 as a quick fix.
