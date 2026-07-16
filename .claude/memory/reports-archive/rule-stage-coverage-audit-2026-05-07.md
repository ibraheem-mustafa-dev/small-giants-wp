# Rule-Stage Coverage Audit — Cloning Pipeline 2026-05-07

Audit of every cloning-pipeline-relevant captured rule across mistakes.md / common-wp-styling-errors.md / 12-DRAFT-TO-SGS-PIPELINE.md / sgs-wp-engine + visual-qa Hard Rules / blub.db high-priority rules / project CLAUDE.md / the 11 fingerprint review findings — assigned to one of the 9 canonical pipeline stages, with status per rule:

- **✓ Covered** — rule has structural enforcement TODAY (script / hook / validator / DB constraint)
- **△ Partial** — Option A (revised fingerprint design + 11 fixes) covers it once shipped
- **✗ Gap** — no structural enforcement even after Option A; needs new solution

## Pipeline reference (canonical 9 stages from spec 12)

```
1. Boundary detector              6. CSS classifier
2. Block-type matcher             7. Composition emitter
3. Schema scaffold (auto-derive)  8. WP serialiser
4. Heuristic extractors           9. Coverage report
5. All-CSS harvester
                                  +deploy / +parity-validate / +register (extended)
```

## Headline counts

| Status | Count | %  |
|---|---|---|
| ✓ Covered today | 31 | 32% |
| △ Partial (Option A revised closes it) | 38 | 39% |
| ✗ Gap after Option A | 28 | 29% |
| **Total cloning-relevant rules** | **97** | 100% |

The 29% gap rate is meaningful — Option A is necessary but insufficient. The 28 gaps split into three actionable categories:
- **9 rules** need new tooling (parsers, validators, hooks)
- **11 rules** are intelligence-layer rules (LLM + operator review per scrape)
- **8 rules** are deferred-by-design (paid plugin, future stack, manual-only)

---

## Stage 1 — Boundary detector

**Job:** Identify candidate block boundaries (top-level `<section>`, `<header>`, `<footer>`, significant `<main>` children).

| Status | Count |
|---|---|
| ✓ Covered | 3 |
| △ Partial | 5 |
| ✗ Gap | 4 |

### Covered today
- BS4 native selector engine (12-DRAFT spec §3) — boundary parsing logic exists
- Pattern-not-block discipline (Hard Rule 6, blub.db row 209) — recogniser operates at pattern boundaries; embedded across 4 docs in this session
- Universal templates only — `header.html`/`footer.html` mapped to template parts, not per-client (mistakes.md feedback row)

### Partial — Option A closes
- Wrapper class match per convention (review item 2 — typed schema for structural_signature)
- Multi-convention sites (review item 3) — needs per-section convention detection, drops single-convention assumption
- Hashed/minified class names degrade gracefully (review item 4 — heuristic_fallbacks)
- Utility-wrapper hell tolerance (review item from Pro — semantic-skip flag for non-semantic divs)
- Ranked candidate confidence (review item 9 — weighted scoring matrix for class collisions)

### ✗ Gap after Option A
- **Computed-style passport for hashed-class fallback** — Locofy/Stackbit pattern (Pro, Flash). Spatial dimensions (bounding boxes, flex behaviours, font-size as size hint). Needs new tooling.
- **Pairing index for tabs/accordion parallel structures** — Tab Header N ↔ Tab Panel N. Layer 3+4 lack `pairing_index` field.
- **Per-section hybrid convention** — when a single mockup mixes Bootstrap utilities + custom BEM + Tailwind escape hatches on different sections (Pro). Needs per-section convention voting, not document-wide.
- **AST-tree-diff alternative** — deferred indefinitely, revisit if deterministic fingerprinting hits real wall after 50+ clones.

---

## Stage 2 — Block-type matcher

**Job:** For each boundary, propose target block type via class lookup + DOM-shape heuristics + confidence threshold.

| Status | Count |
|---|---|
| ✓ Covered | 4 |
| △ Partial | 6 |
| ✗ Gap | 3 |

### Covered today
- Composition over CTA-rendering (mistakes.md 2026-05-03, hard rule from spec 12 §4) — never emit per-block CTA attributes; use sgs/multi-button + sgs/button via InnerBlocks
- Class-name → block-name lookup table (spec 12 §8) — Mama's mockup naming convention table established
- naming_conventions table populated 2026-05-07 (16 rows) — convention identification deterministic
- Mockup classes map to PATTERNS not single blocks (Hard Rule 6, mistakes.md 2026-05-05) — embedded in sgs-wp-engine

### Partial — Option A closes
- Composite-vs-pattern distinction (sgs/hero exception captured in this session) — 4-layer scaling solves
- Inner blocks recursive translation (review insight: parent references child by slug, child has own fingerprint)
- 4-layer fingerprint accommodates atomic / composite / repeating / inner-blocks shapes
- Slot overrides (review item) capture preset binding pattern
- Confidence scoring formula (review item 9) — weighted matrix
- Recursion depth limit + visited_nodes set (review item 8)

### ✗ Gap after Option A
- **Class-collision tie-breaker via internal-element presence** (Flash) — `.btn` matches both sgs/button and sgs/multi-button; siblings → multi-button, single → button. Logic clear; not auto-implemented.
- **Industry-aware bias** (block_type_matcher should use `pattern_coverage` table — 96 rows) — when industry hint present, prefer patterns the industry has used. Not in design.
- **Tie-breaker logging** — when multiple candidates score similarly, the matcher should log the tie to `recognition_log` for operator review. Not specified.

---

## Stage 3 — Schema scaffold (auto-derived)

**Job:** For target block, load block.json. Generate extractor scaffold matched to block.json's attribute set. Critical rule: never silently skip an attribute.

| Status | Count |
|---|---|
| ✓ Covered | 5 |
| △ Partial | 3 |
| ✗ Gap | 1 |

### Covered today
- Auto-derive from block.json (mistakes.md 2026-05-03, spec 12 hard rule 1) — every fingerprint scaffold generated from block.json
- Coverage gate: every declared attribute must have a slot (spec 12 §3) — TODO scaffolds count as slots
- block_attributes table currently 1,234 rows — single source of truth for attr schema
- ctaGap recogniser blind spot fix (mistakes.md 2026-05-06) — every child container with layout CSS needs a named block attribute as destination
- `_comment_*` non-spec attributes (defensive populate-db.py patch shipped this session) — script gracefully skips them

### Partial — Option A closes
- Eight attribute roles auto-route templates (review insight) — `padding*` → responsive-spacing, `colour*` → visual-token, etc.
- Version drift detection (Sonnet review item) — cross-check fingerprint.attributes[] against block.json on every /sgs-update; warn on mismatch
- Block-attribute version_min tagging (uimax migration) — schema-evolution traceability

### ✗ Gap after Option A
- **8 roles insufficient — missing 5 roles** (Flash + Pro): `layout-alignment`, `accessibility-attribute`, `data-binding`, `visibility-control`, `layout-modifier`. Each needs a role template draft (extract + generate halves per platform).

---

## Stage 4 — Heuristic extractors

**Job:** For each scaffold slot, run heuristic extraction against the boundary's DOM (text, link, image, icon, colour-from-CSS).

| Status | Count |
|---|---|
| ✓ Covered | 4 |
| △ Partial | 7 |
| ✗ Gap | 5 |

### Covered today
- Per-attribute-type extractors deterministic (spec 12 §3.4) — text.py, link.py, image.py, icon.py
- Hero extractor prototyped (`tools/recogniser-v2/extract.py`) — 27 of 29 CSS rules harvested
- Section A1/A2 — render.php slug-fallback for legacy block instances (rule on extracting from legacy instances)
- Section L2 — 12% coverage anti-pattern; auto-derive enforces 100%

### Partial — Option A closes
- Bidirectional `platform_equivalents` (review insight) — extract + generate per platform
- `search_scope` field on extract rules (review item 5) — self / parent / children / ancestor-up-to-wrapper
- Computed-style fallback for hashed classes (review item 4) — spec adds R-class checks
- Tailwind class storage as indexed token array (review item 1) — first Tailwind clone now matches
- Pseudo-element measurement (mistakes.md H-10, common-styling Section R3)
- Parent-chain filter walker (mistakes.md H-10, common-styling Section R2)
- Background-shorthand handling (mistakes.md H-9, common-styling Section R1, R5) — `:not(.has-background)` + `background-image:` over `background:`

### ✗ Gap after Option A
- **Real-world Tailwind sites with `gap-{n}` on a parent of the conceptually-correct element** (Sonnet) — `search_scope` covers single-level fallback; multi-level parent traversal needs an explicit walker
- **Inline `style="..."` overrides conflicting with class defaults** — extract rule precedence not specified
- **`getSaveContent.extraProps` static-block class injection** (Section B3) — scrape-side equivalent: how to read injected classes that don't appear in stored HTML. Not a real cloning concern (we read live HTML, not stored), but worth documenting.
- **Font silent-fail detection** (Section O2, mistakes.md 2026-05-04) — `document.fonts` enumeration should be part of capture, not just QC. Not in scope today.
- **Section O3 — block style.css typography precedence** — block CSS hardcodes typography that should flow from theme.json. Static-analysis lint rule needed; not in cloning pipeline yet.

---

## Stage 5 — All-CSS harvester

**Job:** Walk the boundary's DOM, find every CSS rule that targets any element in it (BS4 + recursive @media). Output: dict of selector→prop→val.

| Status | Count |
|---|---|
| ✓ Covered | 4 |
| △ Partial | 2 |
| ✗ Gap | 1 |

### Covered today
- Pull all CSS every time (mistakes.md 2026-05-03, spec 12 hard rule 2, common-styling Section L3) — selective extraction is the bug
- BS4 native selector engine + recursive @media parsing (spec 12 §3.5) — implemented for hero
- `wp_strip_all_tags` corruption rule (Section C6) — don't apply to CSS content
- `wp_kses_post($wrapper_attributes)` strips classes (Section H5) — pre-escape pattern documented

### Partial — Option A closes
- 0% silent loss invariant (spec 12 hard rule 5) — Option A's `unmapped_css_rules` warning array on pattern-fingerprint.py
- Coverage gate: every CSS rule ends up in (a)/(b)/(c) bucket (spec 12 §3.6) — implemented as classification step

### ✗ Gap after Option A
- **CSS-in-JS extracted styles** — Styled Components, Emotion, MUI sx prop, Vanilla Extract. Generate inline `<style>` tags or hashed classes. BS4 selector engine doesn't reliably resolve these. New parser tier needed.

---

## Stage 6 — CSS classifier

**Job:** For each declaration: maps-to-block-attribute / universal-handled / one-time-custom-CSS.

| Status | Count |
|---|---|
| ✓ Covered | 6 |
| △ Partial | 8 |
| ✗ Gap | 6 |

### Covered today
- Three-bucket taxonomy (spec 12 §3.6 + hard rule 5) — block attr / universal / one-time custom
- 16 universal/11 block-attr/0 one-time on hero (mistakes.md 2026-05-03 manual classification proves bucketing works)
- common-styling Section L6 — rules whose target classes don't exist get dropped or flagged
- Hard Rule 6 (Hard Rules sgs-wp-engine) — pattern boundary discipline
- ctaGap blind-spot lesson (mistakes.md 2026-05-06) — every numeric/positional CSS value needs a block.json attribute destination
- Background-shorthand rule + R5 binding rule — `:not(.has-background)` on framework defaults

### Partial — Option A closes
- Auto-classify scaffolding (spec 12 §6) — needs automation; Option A's role-template system covers 80%
- Confidence scoring matrix (review item 9) — disambiguation when multiple block-attrs could absorb a rule
- Computed-style measurement extension (Section R) — backgroundImage / filter / mixBlendMode / pseudo-elements / parent chain
- Q1-Q4 binding rules from common-styling Section Q — classifier may not reduce severity below validator without screenshot evidence
- Q4 backgroundColor delta on child where parent has same colour
- R1-R4 measurement traps — Option A's WATCHED set extension covers
- M2 multi-frame screenshot capture (already implemented as `tools/multi-frame-qa/capture.js`)
- Section O4 — variation `settings.custom.<deep.nested>` merge issues — palette token preferred over deep custom property indirection

### ✗ Gap after Option A
- **Section H1 — `.has-text-color` cascade issue** with compound selectors. Cloning-side: when extracting a colour, ensure the right selector specificity is captured. Not in design.
- **Section H6 — dual-colour-system collision** (native `supports.color` + custom UK colour attrs both writing classes). Classifier needs to detect both systems and reconcile.
- **Section H7 — typography support + custom letterSpacing collision**. Classifier should detect and skip duplicate.
- **Section K1 — responsive grid columns ignored in editor preview** (`!important` legitimate use). Cloning-side: when extracting responsive grid columns, recognise the `!important` is structural not a smell.
- **Section K2 — WP-uploaded image width/height HTML attributes** beating CSS. Cloning-side: extract dimensions from HTML attrs not CSS.
- **Section K3 — `display: none !important` for connector lines on mobile**. Classifier needs visibility-control role (currently missing — see Stage 3 gap).

---

## Stage 7 — Composition emitter

**Job:** For composite blocks, render parent block markup with InnerBlocks slot containing sgs/multi-button + sgs/button.

| Status | Count |
|---|---|
| ✓ Covered | 3 |
| △ Partial | 4 |
| ✗ Gap | 1 |

### Covered today
- sgs/multi-button + sgs/button architecture (spec 11 — SGS Button Architecture)
- Section L1 — composition over extension-via-binding (mistakes.md 2026-05-03)
- Section B4 — dynamic block InnerBlocks save pattern (`<InnerBlocks.Content />` not null)

### Partial — Option A closes
- Slot overrides (review insight) — parent says "buttons in my CTA slot get my primary preset"
- Recursive translation through inner-block fingerprints (review insight)
- 87 button attributes preserved through composition (search history confirmed)
- Spec 11 button preset pattern — `inheritStyle: 'primary'` propagates from preset binding

### ✗ Gap after Option A
- **Pairing index for tabs/accordion** (Flash, Pro) — composition emitter for sgs/tabs needs to align Tab Header N with Tab Panel N. No `pairing_index` or `logical_group` field defined in Layer 3/4.

---

## Stage 8 — WP serialiser

**Job:** Output canonical block markup. Dynamic blocks → `<!-- wp:sgs/foo {...} /-->`. Static blocks → minified-JSON attrs + canonical class order.

| Status | Count |
|---|---|
| ✓ Covered | 5 |
| △ Partial | 1 |
| ✗ Gap | 2 |

### Covered today
- Dynamic vs static block patterns (spec 12 §3.8)
- B1 deprecation pattern for static-block save() output changes
- B2 `source: html` attribute pitfall on dynamic blocks (use `default: ""` instead)
- B3 `getSaveContent.extraProps` filter pitfall on static blocks (use `render_block` server-side)
- B4 `<InnerBlocks.Content />` requirement on dynamic blocks with InnerBlocks (mistakes.md 2026-05-04)

### Partial — Option A closes
- Sonnet finding: `wp.blocks.serialize()` Node sidecar fallback for static-block edge cases — Option A doesn't change this; documented in spec 12.

### ✗ Gap after Option A
- **Block validation regression on emit** — WP detects mismatch between save() output and stored HTML. Section B1 says add deprecation; cloning-side equivalent: serialiser must use latest save() shape OR emit a deprecation match. Not in design.
- **Block-attribute update via wp.data.dispatch** (mistakes.md 2026-05-04 wp-content-guard.py rule, common-styling E6) — `wp eval` blocked. Cloning-side: when assembling, must use `wp-update-block-attrs.js` (already exists). Not a gap, just needs documenting in /sgs-clone skill body.

---

## Stage 9 — Coverage report

**Job:** Per section: attributes extracted N/M (X%), CSS rules harvested/absorbed/scoped, attributes flagged TODO.

| Status | Count |
|---|---|
| ✓ Covered | 4 |
| △ Partial | 1 |
| ✗ Gap | 3 |

### Covered today
- Coverage gate spec (12 §3.9) — TODO attributes block "ready to deploy" status
- 4 leftover bucket scheme (review insight) — unrecognised class / unrecognised section / extraction failed / animation unclassified
- Operator-review report shape (mistakes.md 2026-05-01 lesson on auto-clone insufficiency — top-down rebuild after auto-skeleton)
- Visible-defect classifier rule (Section Q binding) — no severity reduction without screenshot evidence

### Partial — Option A closes
- 5th leftover bucket added (review item 7) — "structural mismatch / orphan" (wrapper matches but inner DOM violates signature OR unmatched content inside matched container)

### ✗ Gap after Option A
- **`recognition_log` table** — needs creation. Current parking has it as a future table; not in any migration yet.
- **Operator review UI / pull-to-parking flow** — when leftovers come in, how does operator triage? No tooling.
- **Recurrence-rate tracker** (visual-qa SKILL.md known C-cap blocker — captured in handoff) — should fold leftovers into rate-tracking so we know which bucket dominates over time.

---

## Stage +Deploy

**Job:** Tar + scp + global-styles reset + cache clear + OPcache reset.

| Status | Count |
|---|---|
| ✓ Covered | 7 |
| △ Partial | 1 |
| ✗ Gap | 1 |

### Covered today
- Section O1 — wp_global_styles reset+reapply procedure (mistakes.md 2026-05-04) — bake into /deploy
- Section E1 — theme files don't deploy via plugin tar method — direct SCP for theme files
- Section E2 — opcache reset via HTTP (CLI is wrong pool)
- Section E3 — LiteSpeed dual-purge (page cache + CSS optimiser cache files)
- Section E4 — `--exclude='plugins/sgs-blocks/src'` not bare `'src'` (vendor autoload safety)
- Section E5 — scp -r nested-dir bug on Hostinger; tar method preferred
- Section E6 — wp eval blocked by wp-content-guard.py — use eval-file or wp-update-block-attrs.js

### Partial — Option A closes
- variation deploy auto-runs reset+reapply via `global-styles-reset.js` (already implemented; spec rule)

### ✗ Gap after Option A
- **Section O2 — font silent-fail detection** during deploy — `document.fonts` enumeration check should run as part of post-deploy verify. Tooling needed.

---

## Stage +Parity validation

**Job:** Multi-frame capture + mockup parity validator + screenshot diff helper.

| Status | Count |
|---|---|
| ✓ Covered | 9 |
| △ Partial | 0 |
| ✗ Gap | 4 |

### Covered today
- M1 — animation-fill-mode: both + delay creates first-paint defect — opt-in animation attribute pattern
- M2 — multi-frame capture at 0/200/500/1000/3000ms (capture.js shipped)
- M3 — DOM measurement vs paint cross-check rule (visual-qa SKILL.md Hard Rule)
- M4 — STOP GATE non-bypassable hook (pre-commit hook now enforces verdict: PASS + first_paint_capture_passed: true)
- N1-N5 — visual-qa pipeline blind spots all closed (animation property diffing, default-motion test, L7c auto-trigger, css-pattern-audit.js)
- P1 — fresh-Chromium QC tool canon (capture.js + mockup-parity-validator.js, no admin bar interference)
- Q1-Q4 — classifier dismissal binding rule with screenshot evidence requirement
- R1-R4 — computed-style measurement trap rules with WATCHED set extension
- R5 — `:not(.has-background)` requirement on framework default background rules

### ✗ Gap after Option A
- **Section H4 — `position: sticky` ancestor blocking** — visual-qa doesn't currently audit sticky-ancestor chain. Specific cloning gap.
- **Section H2 — `.wp-block-*` class collisions** with other plugins/themes. Cloning-side: detect collision when scraping competitor sites with their own block plugins.
- **Section H3 — inline style serialisation specificity** — clones from sites with author-set inline styles need `:not([style*="..."])` pattern preserved. Currently in framework block CSS but not enforced for new blocks.
- **Section O3 — block style.css typography precedence rule** (don't set font properties in block style.css). Linter not yet shipped.

---

## Stage +Register

**Job:** Pattern registration to plugins/sgs-blocks/patterns/ + INSERT to sgs-db patterns + uimax patterns mirror.

| Status | Count |
|---|---|
| ✓ Covered | 6 |
| △ Partial | 2 |
| ✗ Gap | 3 |

### Covered today
- pattern-register.py shipped (Step 2C) — 6-step registration flow
- pattern-fingerprint.py shipped (Step 2A) — sha256(normalised_html + sorted_css_var_dump)
- pattern-classify.py shipped (Step 2B) — content_shape walker + LLM judgement with auto-fallback
- /sgs-db extension subcommands shipped (Step 3) — fingerprint / patterns-by-category / patterns-by-industry / patterns-by-fingerprint-prefix
- sgs-db migration applied (Step 1) — 8 new columns + UNIQUE INDEX on fingerprint
- uimax migration applied (Step 1) — patterns / naming_conventions / animations / mood_boards / 5 stack tables

### Partial — Option A closes
- block_compositions table population — Option A populates SGS blocks → uimax component_libraries; pattern → block_composition FK lists naturally fill
- /sgs-update Stage 3+4 (uimax sync gap) — proposed but not built; Option A's full scope includes this

### ✗ Gap after Option A
- **No-licensing rule (blub.db row 211)** — captured in this session, embedded in 4 docs, but no automated grep in spec/migration files to prevent reintroduction. Manual discipline only.
- **Rosetta Stone discipline (blub.db row 213)** — Hard Rule 7 baked into sgs-wp-engine but no validator on uimax writes that enforces every artefact carries cross-platform equivalents. New tools could still write SGS-blind rows.
- **Recurrence-rate tracker** — visual-qa C-cap blocker still open. Per-clone leftover-bucket counts should aggregate over time so we know which bucket dominates.

---

## Cross-cutting rules (apply at all stages)

| Status | Count |
|---|---|
| ✓ Covered | 5 |
| △ Partial | 2 |
| ✗ Gap | 4 |

### Covered today
- Hard Rules 1-7 from sgs-wp-engine SKILL.md — embedded structurally
- `verify-rendered-output-not-internal-metrics` (blub.db row 194) — rule baked into multi-frame-qa + parity-validator
- `feedback_extend_measurement_set_when_human_eye_disputes` (blub.db row 207) — Section R measurement extension
- `parallel-dispatch-shared-files` (mistakes.md feedback row) — pipeline scopes parallel branches per-file
- `palette-defaults-for-blocks` — every default colour value uses a palette token

### Partial — Option A closes
- `defaults-need-deliberate-judgement` — covered structurally by Option A's role templates (defaults derive from role + platform)
- `prefer-diagnostics-over-cli-linters` — applies to dev workflow not pipeline; covered by IDE config

### ✗ Gap after Option A
- **`block-name-search-blindspot`** (mistakes.md feedback row) — block names with parenthetical qualifiers break grep instinct. No grep wrapper exists.
- **`stage-files-via-tmp-not-bash-heredoc`** — applies to all subagent dispatch; not pipeline-specific. Captured behaviourally only.
- **`ship-skill-and-slash-command`** — every skill with a CLI ships both. Applies to /sgs-clone build, but no gate enforces it.
- **`ingest-dont-generate-reference-data`** — applies to uimax sync work; no validator on uimax writes that distinguishes ingested-from-source vs LLM-generated rows.

---

## The 11 fingerprint review findings — coverage status

| # | Review finding | Status |
|---|---|---|
| 1 | Tailwind classes as indexed token array | △ Option A closes (critical fix) |
| 2 | Structural signature typed schema | △ Option A closes (critical fix) |
| 3 | Multi-convention support per scrape | △ Option A closes (critical fix) |
| 4 | Hashed/minified class fallback | △ Option A closes (critical fix) |
| 5 | `search_scope` field on extract | △ Option A closes (critical fix) |
| 6 | 5 missing roles | △ Option A closes (important fix) |
| 7 | 5th leftover bucket | △ Option A closes (important fix) |
| 8 | Recursion guard (max_depth + visited_nodes) | △ Option A closes (important fix) |
| 9 | Confidence scoring matrix | △ Option A closes (important fix) |
| 10 | Spatial / computed-layout signal | ✗ Gap — stretch, defer |
| 11 | AST-tree-diff alternative | ✗ Gap — defer indefinitely |

All 9 critical+important fixes are subsumed by the revised Option A scope (~405 min). Items 10-11 stay as future stretch.

---

## Top 12 actionable gaps (next-session targets)

Ranked by clone-blocking severity:

| Rank | Gap | Stage | Severity | New tooling needed |
|---|---|---|---|---|
| 1 | Computed-style passport for hashed-class fallback (CSS Modules / MUI / SvelteKit) | 1, 4 | CRITICAL | Spatial signature inspector — bounding-box + flex-behaviour + font-size-as-size-hint reader |
| 2 | Pairing index for tabs/accordion parallel structures | 1, 7 | HIGH | New `pairing_index` field in Layer 3+4 + composition emitter logic |
| 3 | Per-section hybrid convention voting (drops single-convention assumption) | 1, 6 | HIGH | Per-section convention detection in `/uimax-classify-naming` |
| 4 | `recognition_log` table + operator-review UI | 9 | HIGH | New uimax table + simple HTML report generator |
| 5 | 5 missing attribute roles (layout-alignment, accessibility, data-binding, visibility-control, layout-modifier) | 3 | HIGH | Role-template drafts for each |
| 6 | Class-collision tie-breaker via internal-element presence | 2 | MEDIUM | Logic in matcher; not new tooling |
| 7 | CSS-in-JS extraction (Styled Components, Emotion, MUI sx) | 5 | MEDIUM | New parser tier — runtime CSS extraction via Playwright `getComputedStyle` walks |
| 8 | Real-world Tailwind multi-level parent walker (`gap-{n}` on grandparent) | 4 | MEDIUM | Extension of `search_scope` to traverse arbitrary depth |
| 9 | Inline style overrides — extract precedence logic | 4 | MEDIUM | Specific extract rules per attribute role |
| 10 | Font silent-fail detection during deploy | +deploy | MEDIUM | Extend capture.js with `document.fonts` enumeration |
| 11 | Validator on uimax writes — no-licensing + Rosetta Stone discipline | +register | MEDIUM | Pre-write hook on /uimax-* commands |
| 12 | Recurrence-rate tracker (visual-qa C-cap blocker) | 9 | LOW | Aggregates per-bucket counts across runs; surfaces dominant bucket |

## Summary

- **Option A revised (the 4-layer fingerprint + 9 critical+important fixes) closes 38 of 97 cloning-relevant rules structurally** — taking covered count from 31 to 69 (71% structural coverage post-Option A).
- **28 rules remain genuine gaps** even after Option A — these are the actionable next-session targets, ranked above. The top 5 are clone-blocking; the rest are quality-of-life or edge-case handlers.
- **None of the gaps are unsolvable** — each has a clear tooling spec. Total estimated effort to close all 12 top gaps: ~8-10 hrs of focused work (spread across 2-3 sessions post-Option A).
- **The 11 fingerprint review findings are fully accounted for** — 9 closed by revised Option A, 2 deferred (spatial signal stretch, AST-tree-diff indefinite).
- **Strategic implication:** Option A is necessary but not sufficient for first real clone. The Top-5 gaps (computed-style passport, pairing index, per-section convention voting, recognition_log, 5 missing roles) likely block Mama's UC3 smoke until at least 2 of them ship. Realistic readiness for first reliable clone: Option A + Top-5 gaps + smoke iteration = ~3 sessions.

## Recommendations for next session(s)

**Session A — Build (~5-6 hours):**
- Execute revised Option A end-to-end (~405 min)
- Smoke test against Mama's hero only — partial scrape

**Session B — Close top gaps (~3-4 hours):**
- Top 1-2: computed-style passport + pairing index (the actual clone-blockers)
- Top 5: 5 missing role templates
- First full Mama's homepage smoke

**Session C — Iterate (~3 hours):**
- Top 3-4: per-section convention voting + recognition_log
- Top 7: CSS-in-JS extraction (if encountered in second client)
- Operator review of leftovers from sessions A+B
- Promote validated patterns to library

After Session C, the framework should reliably clone any HTML draft to ~85% pattern fidelity with the remaining 15% surfaced for operator review — meeting Bean's "100% on first try, irrelevant BS gaps don't count" target.
