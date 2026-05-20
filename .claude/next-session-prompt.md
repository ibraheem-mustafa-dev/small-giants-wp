---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-21-phase-1-closure-G1-G5-F5
generated: 2026-05-20
prior_session: small-giants-wp-2026-05-20-phase-1-spec16-rewrite-plus-phase-2-future-capabilities
primary_goal: "Full Phase 1 closure: ship G1-G5 + F5 in one focused session via 4-wave parallel/sequential subagent orchestration. End-state: 1440 average pixel-diff ≤ 5%, 768 ≤ 8%, 375 ≤ 10%. ONLY after G1-G5 land, run operator-driven P2.ii promotion on residual gap-candidates."
---

# Phase 1 closure — G1-G5 + F5 (4-wave parallel/sequential)

A 3-rater "honest-path" council (Sonnet × 3) at 2026-05-20 close confirmed that operator-driven attribute promotion is a band-aid that closes the last 5-10% of pixel-diff. The dominant 50-85% per-section gap is **structural** — cv2 emit shape, CSS-lookup scope bug, slot-resolver text-only limitation, measurement contamination, per-block DOM-shape mismatches. Full synthesis at `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md`.

Bean approved Phase 1 closure in one focused session using parallel subagent waves + /delegate routing + /qc panels.

Invoke `/autopilot` before doing anything else.

## READ FIRST — gated before any work starts

The previous session shipped 15 commits + a 3-rater honest-path council that discovered the real pixel-diff path. You MUST read these in order before dispatching ANY subagent or writing ANY code, otherwise you will work blind to context that fundamentally shapes every fix:

### Priority 1 — Council findings (MANDATORY, ~10 min)

1. **`reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md`** — THE foundational document. The 5 root causes (G1-G5) + F5 + their fix shapes + the "operator-promotion is band-aid" finding. If you only read ONE doc, read this.
2. **`reports/2026-05-20-pipeline-root-gap-council/real-path-rater-A.md`** — Visible-eyeball diagnosis via Playwright. Per-section visual evidence of what's actually broken (hero CTAs missing, trust-bar icons missing, social-proof carousel-vs-grid mismatch).
3. **`reports/2026-05-20-pipeline-root-gap-council/real-path-rater-B.md`** — Structural DOM diff per section. Mockup vs render class-name and shape mismatches.
4. **`reports/2026-05-20-pipeline-root-gap-council/real-path-rater-C.md`** — Pipeline output forensics. Where in stage-3/4/4.5 the data is missing or wrong + per-section best-vs-worst comparison.

### Priority 2 — Session state + binding rules (MANDATORY, ~5 min)

5. **`.claude/handoff.md`** — Last session digest: 15 commits, what shipped, what didn't, OUTCOME ACHIEVED vs CODE SHIPPED labels.
6. **`.claude/state.md`** — current_phase + current_subphase_step + blockers. The session-entry orientation.
7. **`.claude/CLAUDE.md`** — Project rules + 7 binding methodology rules (especially #5 strict-exact-match, #6 promotion-is-band-aid, #7 css-scope-prefix-audit added this session).
8. **`.claude/mistakes.md`** 2026-05-20 section — 5 fresh lessons that bear directly on this session's work.

### Priority 3 — Architectural context (MANDATORY before Wave 2, ~10 min)

9. **`.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §13 + §14** — Phase 1 implementation status table + the canonical list of 5 known gaps blocking ≤ 1% pixel-diff target. §14 is the spec-side view of G1-G5; cross-references the rater reports.
10. **`.claude/specs/common-wp-styling-errors.md` §U + §V + §W** — three new error patterns captured this session:
    - §U: CSS scope-prefix breaks internal CSS lookup (G2 explanation)
    - §V: Self-closing block emission breaks InnerBlocks rendering (G1 explanation)
    - §W: Pixel-diff measurement contamination by WP chrome (G4 explanation)
11. **`.claude/cloning-pipeline-flow.md` 2026-05-20 section** — annotated changes to every pipeline stage from this session. Cross-reference when touching any stage script.

### Priority 4 — Live artefact evidence (MANDATORY before Wave 1, ~5 min)

12. **Latest pipeline run dir** at `pipeline-state/<latest>/` (find via `ls -t pipeline-state/ | head -1`). Read:
    - `extract.json` — per-section emitted block_markup + extracted_attributes + token_resolutions + essence_matches
    - `css-d1-assignments.json` — D1 sidecar (the new artefact from Spec 16 §FR6 router)
    - `leftover-buckets.json` — gap classification by section + slot + reason (binding rule blub.db row 254)
    - `summary.log` — Stage 9c per-severity counters
13. **Pixel-diff baseline matrices** at `reports/2026-05-20-pipeline-root-gap-council/pixel-diff/` (current state) + `pixel-diff-post-C/` (baseline to recover to as a minimum). Compare per-cell deltas to know which cells changed when your fixes land.

### Priority 5 — Live page eyes-on (MANDATORY for G1 / G4 verification, ~2 min)

14. Open the canary page in Playwright: `https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/`. Eyes-on Hero section (CTAs invisible — that's the G1 symptom) + Brand section (notice WP admin bar + sgs-header at top of frame — that's the G4 contamination).

### Reading-gate verification

Before invoking your first /delegate subagent, you should be able to answer:
- What are the 5 structural gaps (G1-G5) + F5? In your own words.
- Why is operator-promotion (P2.ii CLI) NOT the primary pixel-diff path?
- Where in cv2's code does the `.page-id-N` scope break the CSS lookup?
- Which 6 cells regressed at session end + which one was a brand new regression (vs cells we recovered)?

If you can't, RE-READ before proceeding. Reading is cheaper than rework.

## Skills to invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST — live skill routing + ADHD support |
| `/systematic-debugging` | Per-G fix: hypothesis → evidence → minimal repro → fix |
| `/delegate` | Pick model per subagent (Sonnet for code; Haiku for fast triangulation; Gemini Flash for cold review with verify-by-grep) |
| `/dispatching-parallel-agents` | Wave 1 (G4 + G2 parallel) + Wave 3 (G5 per-block + F5 parallel) |
| `/qc` | Multi-rater panel BEFORE every commit (binding rule blub.db row 255) |
| `/qc-inline` | Self-check during implementation; run pipeline + grep artefacts |
| `/sgs-wp-engine` | Block-development context for G1 / G3 / G5 block.json + render.php work |
| `/wp-blocks` | Schema queries for block_attributes table |
| `/wp-block-development` | block.json schema work for G3 + G5 |
| `/library-docs` | If WP InnerBlocks / Block Variations conventions need reference |
| `/handoff` | At session close |

## Tools

| Tool | What for |
|------|----------|
| `mcp__plugin_playwright_playwright__browser_*` | Eyes-on visual verification per wave + per section |
| `scripts/pixel-diff.py --selector .sgs-{section}` | Per-section cropped pixel-diff (binding rule blub.db row 256) |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration (binding rule blub.db row 272) |
| `python reports/2026-05-20-pipeline-root-gap-council/run-pixel-diff-matrix.py` | 21-cell measurement |
| `python plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py list --top 10` | Wave 4 only — promotion candidates |
| `pipeline-state/<run>/leftover-buckets.json` | Read BEFORE any pixel-diff conjecture (binding rule blub.db row 254) |
| `pipeline-state/<run>/css-d1-assignments.json` | D1 sidecar — verify G2/G3 lifts are firing |

## Wave 1 — G4 + G2 (parallel, ~1hr wall-clock)

Independent surgical changes. Run as 2 parallel Sonnet subagents.

### G4 — Measurement decontamination

**Goal:** strip WP admin bar + sgs-header from section screenshots so pixel-diff measures the section content alone.

**Files:** `scripts/pixel-diff.py` only.

**Fix shape:** Playwright `addInitScript` or post-navigate `evaluate` removes `#wpadminbar` + `.sgs-header` + any fixed-position chrome before `el.screenshot()`. ~30 LOC. Re-run the 21-cell matrix on POST-C baseline → all 21 cells should drop ~10-20pp uniformly because the chrome contamination is consistent across measurements.

**Validation:** Re-run pixel-diff on the post-Phase-2-final state. Trust-bar 1440 (~31.7%) should drop to ~5-15% because trust-bar's bespoke content is small relative to the chrome inflation. If trust-bar drops below 5%, G4 is fully working.

### G2 — Strip `.page-id-N` scope in cv2 CSS lookup

**Goal:** cv2's `_collect_css_decls_for_element` matches scoped variation CSS rules so Stage 3 + Stage 4 have full CSS context.

**Files:** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` only. Specifically `_collect_css_decls_for_element` (around line 2176).

**Fix shape:** Before selector matching, strip `.page-id-\d+\s+` from each rule's selector. Regex `re.sub(r"^\.page-id-\d+\s+", "", selector)`. One-line fix + 2-3 tests in `test_css_router.py` or `test_convert.py`.

**Validation:** Re-run pipeline. `pipeline-state/<run>/extract.json` for hero section should show `variation_css_rules > 0` (was 0). D1 lift count climbs. Stage 3 leftover-buckets `extraction_failed` count drops for hero + trust-bar.

**/qc gate:** Wave 1 panel (Sonnet + Haiku) on both commits before push.

## Wave 2 — G1 then G3 (sequential, ~5hrs)

### G1 — Hero InnerBlocks emit

**Goal:** cv2 emits OPEN `<!-- wp:sgs/hero -->...<!-- /wp:sgs/hero -->` with nested `wp:sgs/multi-button` + `wp:sgs/button` InnerBlocks for CTAs. Self-closing block currently produces empty `<div class="sgs-hero__ctas"></div>` on the rendered page.

**Files:**
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — hero composite emit path (search for `sgs/hero` + the `self_closing` flag in `emit_wp_block`)
- Possibly `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` if hero takes a special composite-element path

**Fix shape:** When emitting `wp:sgs/hero`, build the InnerBlocks child markup from the lifted `ctaPrimary*` + `ctaSecondary*` attrs. Map to `<!-- wp:sgs/multi-button --><!-- wp:sgs/button {"text":"Shop Zookies","url":"/shop/"} /--><!-- wp:sgs/button {"text":"Try 3 for £5","url":"/product/trial-pack/"} /--><!-- /wp:sgs/multi-button -->`. Set `self_closing=False`. Legacy ctaPrimary*/ctaSecondary* attrs stay for deprecated.js migration.

**Validation:** Live pipeline run. extract.json hero section's `block_markup` contains `<!-- wp:sgs/multi-button -->`. Live page 144 hero shows the 2 CTA buttons. Hero 1440 pixel-diff drops ~30-50pp.

**/qc-inline:** Open page 144 in Playwright. Screenshot the hero section. Eyeball — are the 2 CTAs visible? If yes, ship.

### G3 — Stage 3 visual-slot CSS mapping

**Goal:** Stage 3 slot resolver maps CSS declarations to visual/structural slots (backgroundImage, overlayColour, minHeight, ctaPrimaryColour, alignment) — not only text-content slots.

**Files:**
- `plugins/sgs-blocks/scripts/orchestrator/slot_list.py` — Stage 3 entry
- Possibly extends `db_lookup.py` if new slot-role → CSS-property mappings are needed

**Fix shape:** For each slot in the role-template DB:
- If slot is text-content: existing behaviour (search descendants for text)
- If slot is colour / dimension / image / structural: call cv2's `_collect_css_decls_for_element` for the section's BEM-rooted selector + match the slot's expected CSS property via `property_suffixes` table
- Return the lifted value with metadata for the Stage 4 cv2 walker to consume

Per Spec 16 §FR6 D1 — this is the canonical typed-attr-lift path; we just need slot_list to use it for visual slots not only text slots.

**Validation:** Hero section's `extraction_failed` count drops from ~142 to <30. Spot-check 5 sample slots: `headlineColour`, `backgroundColor` (or backgroundMedia), `minHeight`, `overlayColour`, `alignment` — all populated. Hero 1440 pixel-diff drops to ≤ 15% combined with G1.

**/qc panel:** Sonnet primary + Haiku triangulation. Spec-compliance audit against §FR6 D1 mechanic.

## Wave 3 — G5 (parallel × 3-5) + F5 (parallel, ~3hrs)

### G5 — Per-block DOM-shape fixes

3-5 parallel Sonnet subagents, one per affected block. No file overlap:

**G5.1 — sgs/brand-strip render.php**
- Mockup uses `<blockquote class="sgs-brand__body">` with `<p>` + `<footer>` children
- Render emits `<section class="sgs-brand__body">` with `<p>` only
- Fix: emit `<blockquote>` + add `<footer>` child for the attribution slot. Add deprecation entry for old shape.

**G5.2 — sgs/testimonial-slider Block Style Variation**
- Mockup is 3-column static grid; render is single-card carousel
- Fix: add `displayMode: 'grid'` block style variation via P2.iii infrastructure that shipped this session (`includes/variations/`). When grid mode selected, render.php emits a CSS-grid layout instead of carousel JS

**G5.3 — sgs/trust-bar render.php**
- Mockup uses `__badge` + `__text` classes; render emits `__item` + `__label`. Mockup uses inline SVG; render expects Lucide slug strings
- Fix: emit `__item` AND `__badge` (alias for backwards-compat); same for `__label`/`__text`. Add `showItemIcons: false` default OR add inline-SVG mode

Each commit: /qc panel + pixel-diff per-section re-measure.

### F5 — D1 media-field responsive variant flow

**Goal:** D1 reader emits responsive-variant attrs (`headlineFontSizeMobile`, `paddingDesktop`, etc.) when D1 media-context matches breakpoint.

**Files:** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — `_load_d1_assignments` reader.

**Fix shape:** Map media-condition strings to breakpoint slugs (mobile = 375 / tablet = 768 / desktop = 1440 per SGS convention). When D1 entry has `media: "@media (max-width: 767px)"`, route value to `<attr>Mobile` variant. Block.json schema check: if variant attr doesn't exist on this block, fallback to gap-candidate.

**Validation:** Hero 375 mobile drops back below post-C baseline (73.2%). Social-proof 768 drops back below 74.6%.

## Wave 4 — Integration + final measurement + promotion (~1hr)

1. Run full pipeline. Re-measure 21-cell matrix.
2. Acceptance: 1440 average ≤ 5%, 768 ≤ 8%, 375 ≤ 10%.
3. THEN run P2.ii promotion CLI on residual highest-confidence gap candidates (3-5 promotions). Re-measure. Expect another 1-5pp drop per affected section.
4. Document final state in `reports/2026-05-21-phase-1-closure/`.

## Methodology guardrails (binding)

- **Multi-rater /qc panel before every commit** touching converter/pipeline/SGS block logic (blub.db row 255)
- **Per-section cropped pixel-diff** is closure unit (blub.db row 256)
- **Schema enumeration before "missing X" claims** (blub.db row 272)
- **Header/footer/nav are template parts, not blocks** (blub.db row 274) — P2.0 + P2.i defence-in-depth shipped
- **Read `leftover-buckets.json` before pixel-diff conjecture** (blub.db row 254)
- **Universal-extraction principle** — fix universal primitives, never per-section patches (G5 is per-block but per-block fixes apply universally across all clones of that block, not Mama-specific)
- **No `git stash`/reset/checkout--/restore/clean** in subagents
- **No `Co-Authored-By:`** in commits
- **Always merge to main** (squash + delete branch + checkout main + pull)
- **Verify-rendered-output**: after each wave, eyes-on Playwright screenshot of the live page before claiming a fix landed

## Acceptance criteria (whole session)

- G1-G5 + F5 all shipped + pushed
- 21-cell pixel-diff matrix: 1440 average ≤ 5%, 768 ≤ 8%, 375 ≤ 10%
- Each wave's commits passed multi-rater /qc panel
- P2.ii promotion CLI run on residual gap candidates (3-5 promotions)
- `/handoff` at close

## Key files for per-wave reference (already required by the READ FIRST gate)

The READ FIRST section at the top of this prompt is exhaustive — these are the same files re-summarised for quick mid-session lookup:

- **G1 (hero InnerBlocks):** `convert.py` hero emit path + `render.php:770` ($content slot) + `real-path-rater-A.md` Playwright evidence
- **G2 (scope strip):** `convert.py:_collect_css_decls_for_element` + `css_router.py:write_variation_css` (where `.page-id-N` is added) + `specs/common-wp-styling-errors.md §U`
- **G3 (visual-slot CSS mapping):** `slot_list.py` + `db_lookup.py:css_property_suffixes` + `specs/16 §FR6 D1 mechanic`
- **G4 (measurement decontamination):** `scripts/pixel-diff.py` + `specs/common-wp-styling-errors.md §W`
- **G5 (per-block DOM-shape):** per-block `render.php` + mockup HTML at `sites/mamas-munches/mockups/homepage/index.html` + `real-path-rater-B.md` per-section diffs
- **F5 (D1 media-field flow):** `convert.py:_load_d1_assignments` + `css_router.py` D1 sidecar writer
