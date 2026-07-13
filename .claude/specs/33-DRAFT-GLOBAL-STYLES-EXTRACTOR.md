---
doc_type: spec
spec_id: 33
spec_version: 1.1.1
project: small-giants-wp
thread: header-footer-setup-pipeline (Part 1 of 2)
title: "Universal Draft Global-Styles / Token Extractor"
created: 2026-07-13
last_verified: 2026-07-13 (D322 — ALL 13 FRs shipped + live-proven on Mama's page 8; component-CSS migrated out of the snapshot; focus-visible + buttons + rule-9 verified clean; header/footer/nav design-gate cross-reference added same day, no FR change)
status: COMPLETE (v1.1.1 — Part 1 done: all 13 FRs shipped + live-verified. Deferred: other-5-client rollout behind per-client reclone (FR-33-11); Part 2 = header/footer clone, now emitting `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav` per the 2026-07-13 header/footer/nav design-gate)
status_history:
  - 2026-07-13 — v0.1.0 authored (corpus-grounded, 10 FRs).
  - 2026-07-13 — v0.2.0 after a 6-persona /adversarial-council (Cynic/Spec-Lawyer/Ship-PM/Extraction-Correctness/Support-Realist/Systems-Integration; all C-band, GO-conditional). Applied every convergent must-fix. Bean-directed shape: keep the COMPLETE spine (all DECLARED value types in v1 — colour/typography/spacing/radius/shadow/buttons/layout), because the cost/risk is the DERIVATION mechanism, not the breadth of value types. The declared-vs-derived line is the trust boundary: declared (Pass A) auto-applies after computed-validation; derived (Pass B) is PROVISIONAL/advisory, never auto-pushed to a live theme. Fixed the FR-33-1 precedence contradiction that would have re-shipped D303; defined the role-inference rule table; pinned ΔE + determinism; reuse-by-composition (freeze the live hex-only helper); added provenance trace + golden fixtures + deploy-safety gates + bootstrap-ordering + forward contracts. All 4 open questions RESOLVED into FRs.
  - 2026-07-13 — v1.0.0 (D318): BUILT + live-proven on Mama's. Hybrid Node(measure.js)+Python(extract) at `plugins/sgs-blocks/scripts/theme-extractor/`. SHIPPED: FR-33-1 (provenance + computed-wins), FR-33-2 (role rule-table + ΔE alpha-axis dedup), FR-33-3 (base from rendered `<p>` + mode-heading-lh + rem-vs-real-root — D303 killed), FR-33-4 (declared spine: colour/typography/buttons(open-bag rest+hover)/contentSize/clamp-verbatim), FR-33-7 (trace + goldens + schema-validate), FR-33-8 (determinism, byte-identical), FR-33-9 (conservation/gap-log), FR-33-10 (composed `build_draft_root_token_map`, frozen hex helper unchanged), FR-33-11 (push-theme-snapshot `--backup`/`--rollback`/drift-warn). 16 tests green; proven live on sandybrown page 8 (base 16px, heading 1.2, buttons faithful — caught+fixed a transparent→black alpha-drop bug via live measurement). FOLLOW-UP: FR-33-5 (Pass B advisory), FR-33-6 (dark-theme safety), FR-33-12 (orchestrator fail-closed ordering gate), FR-33-13 (header/footer namespace + colour-var parking re-point); migrate the transitional component `styles.css` out of the snapshot.
  - 2026-07-13 — v1.1.0 (D320/D321/D322): the FOLLOW-UP set SHIPPED — Part 1 COMPLETE (13/13 FRs). **FR-33-12 (D320):** orchestrator fail-closed freshness gate — reads the `_sgsExtractor.draft_css_sha256` EMBEDDED in the canonical `theme-snapshot.json` (a code-review caught the first design tying it to the generated file, not the file the converter reads) + shared `scripts/shared_utils.py` single-source hash. **FR-33-5 (D321):** Pass B advisory derivation (`derive.py`) — token-less draft → derived palette by usage-context role (never frequency), `_source:derived`+confidence+`advisory:true`, translucent skipped, nothing-usable→baseline+skip; `push-theme-snapshot` strips advisory unless `--include-advisory`. **FR-33-6 (D321):** dark-theme/preview-shell safety (`extract._theme_background` + `measure.js` marker-path capture — a qc-council forensics rater caught that markers carried no path) — widest content-containing ancestor, dark discarded only on a positive shell signal, legit dark kept. **FR-33-13 (D322):** `settings.custom.header`/`.footer` reserved + reconciliation note (Spec 17 uses Customiser/JS-var, not this namespace — Part 2 decides) + `build_draft_root_token_map` parking re-point; the transitional component `styles.css` MIGRATED out of the Mama's snapshot (focus-visible → theme `utilities.css`; dead is-style/hero-cta/page-hack rules dropped; product-card client vars kept); button now consumes the open-bag `hover-transform` token (FR-33-4 render-side closure). 26 tests green; deployed + live-verified clean on sandybrown page 8.
  - 2026-07-13 — v1.2.0 (D325, Bean-directed): FR-33-14 ADDED + BUILT — Tier-1 business-DATA auto-fill companion to the global-STYLES extraction. `scripts/sync-business-info.py` extracts high-confidence machine-signal fields (email `mailto:` / phone `tel:` / socials known-domain / copyright `©`) from the draft and fill-if-empty-writes them to the Site Info store via the NEW capability-gated `POST /sgs/v1/site-info`; wired to run automatically at the Part-1 deploy moment in `orchestrator/upload_and_patch.py` (same `--client`+push gating as the theme-snapshot push, non-fatal). Tier 2 (tagline/address/hours — semantic guesses) DEFERRED to a review flow (parallels FR-33-5). Standalone live-proven on sandybrown; pipeline wiring static-verified.
  - 2026-07-13 — v1.1.1 (post-D322, no FR change, additive): the header/footer/nav design-gate (`.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`, Bean-approved) named the concrete Part-2 emit target and a new consumer relationship for Part 1's output. **Consumer link (new):** `sgs/site-header`, `sgs/site-footer`, and `sgs/adaptive-nav` — the specialised container blocks the design-gate approved for inside the header/footer template parts — default their colours/typography/spacing from the SAME `theme-snapshot.json` this spec generates (global-styles consumer, no new extraction surface; see design-gate §4b). **Part 2 emit target (concrete):** Part 2 (draft header/footer → WP) now emits these three named blocks, not `core/group` — this spec's role stays unchanged (it still only produces the token source Part 2 and the new blocks read). **FR-33-13 linkage (noted, not resolved):** the reserved `settings.custom.header`/`.footer` namespace is one candidate source for the new blocks' header-specific settings; the design-gate leaves the tokenise-vs-Customiser choice as a Part 2 design-gate item (§15 Q1 area) — not decided here. No FR text changed; this is a forward-reference update only.
references:
  - 26-SGS-GLOBAL-STYLES-AND-THEMING.md (the theming MODEL this FEEDS; FR-26-C derived-globals = a FORWARD CONTRACT, inert until Spec 26 Phase 3)
  - 17-HEADER-FOOTER-ARCHITECTURE.md (Part 2 sibling — the header/footer converter, built AFTER this; reserves the header/footer token namespace, FR-33-13)
  - .claude/plans/2026-07-13-header-footer-nav-system-design-gate.md (Bean-approved 2026-07-13 — names Part 2's concrete emit target as `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav`, and makes those blocks a consumer of this spec's `theme-snapshot.json` for global-style defaults, §4b)
  - 31-UNIVERSAL-CLONING-PIPELINE.md (the block pipeline; §3.A token-snap ΔE reused; the converter reads the snapshot this generates → bootstrap ordering FR-33-12)
  - ../parking.md P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE (the parked idea this formalises)
  - ../parking.md P-DRAFT-CSSVAR-COLOUR-RESOLUTION + P-DRAFT-CSSVAR-SEED-READD (consume this extractor's token map, FR-33-13)
corpus_basis: sites/{mamas-munches,indus-foods,_dogfood} authored draft mockups (8 files, 3 design systems) — full union inventory in §Appendix A
supersedes: none
absorbed_by: none
---

# Spec 33 — Universal Draft Global-Styles / Token Extractor

> **Part 1 of the 2-part header/footer setup pipeline** (Bean-directed 2026-07-13). Part 1 (this spec)
> = extract the draft's GLOBAL design tokens + base styles into the site's theme so every block
> inherits the correct base BY CONSTRUCTION. Part 2 (Spec 17) = clone the draft header/footer into
> SGS template parts. Part 1 first: prerequisite for Part 2 AND for every body clone (the converter
> reads the snapshot this generates — FR-33-12), fixes the D303 drift class, lower-risk, and unblocks
> two parked colour-var bugs.
>
> **Part 2's emit target is now concrete (2026-07-13 header/footer/nav design-gate, Bean-approved):**
> Part 2 clones a draft's header/footer rows onto the new specialised container blocks
> `sgs/site-header`, `sgs/site-footer`, and `sgs/adaptive-nav` (`.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`)
> — NOT `core/group`. Those blocks also become a downstream CONSUMER of this spec's output: every
> element/setting on them defaults its colours/typography/spacing from the `theme-snapshot.json` Part 1
> generates (the design-gate's §4b "global defaults + Site Info access" requirement), so a client's
> brand tokens flow through Part 1 into header/footer/nav with no re-entry. This does not change any
> FR in this spec — Part 1 still only produces the token source; it is read by the same
> `push-theme-snapshot.py` deploy path plus, now, by the new blocks' default-resolution at render time.

> **⛔ THE ONE RULE THAT MAKES THIS WORK (read before any FR).** This spec exists to kill D303 — a
> block inheriting the WRONG base because something trusted a DECLARED value over the RENDERED one.
> So the iron law here is: **the emitted VALUE is always the COMPUTED value on a real rendered node,
> never a raw source declaration** (the project `measurement-vs-eye` rule). A source `:root`/base
> declaration is only ever used for the token's NAME/ROLE vocabulary, never as the value to ship.
> Any FR that emits a declared value without computed-validation is a D303 re-offence.

## Problem

A clone run today READS a hand-maintained `theme-snapshot.json`; nothing GENERATES it from the draft.
That is the drift source: all 6 client snapshots carry a fabricated `h1: 1.15` line-height +
`-0.022em`/`-0.015em` letter-spacing that **no draft ever declared** (the real Mama's draft says
`h1,h2,h3{line-height:1.2}`, zero letter-spacing). Because the theme base ≠ the draft base, every
cloned block inherits the wrong base — the D303 "brand quote renders 16→18px" bug is exactly this (a
`<p>` with no explicit font-size inherits the theme base 18px, not the draft base 16px).

## Solution overview

A **universal, draft-agnostic extractor** reads a draft and emits a **generated `theme-snapshot.json`**
(structured theme.json v3 slots — NOT a raw-CSS blob), which the EXISTING `push-theme-snapshot.py`
deploys to `theme.json` + `wp_global_styles`. It runs once per site, as the opening step of the
header/footer setup pipeline AND as a hard prerequisite of any body clone (FR-33-12).

**The complete spine — one build, all value types, tiered by TRUST (not split by value type).** v1
extracts EVERY value type the draft declares (colour, typography, type-scale, spacing, radius, shadow,
buttons, layout) — breadth is cheap once the `<head>` is parsed. The trust boundary is provenance, not
value type:

- **DECLARED (Pass A):** parse the draft's `<head>` `:root` + base/preset rules (via `tinycss2`, not
  regex) → resolve each token's ROLE + VALUE, **validate the value against the COMPUTED value on a
  real rendered node**, then auto-apply. Trustworthy. Serves all 3 corpus design systems.
- **DERIVED (Pass B):** for values the draft does NOT declare (recover a palette/spacing scale by
  usage-context clustering) → emit as **PROVISIONAL/advisory**, confidence-scored, **never
  auto-pushed to a live theme** without human confirmation (FR-33-5). A draft with nothing usable →
  the framework baseline UNCHANGED + a loud logged skip (never a silent guessed theme).

**Classification is by ROLE inferred from USAGE-CONTEXT (which CSS property, on which selector role),
never by token NAME and never by raw frequency** — the corpus proves names are unreliable (same hex
`#2E7D4F` is `--success` and `--green`), and raw frequency INVERTS a palette (the most frequent colour
is body-text/border-grey, not the brand primary). Frequency ranks only WITHIN a role bucket.

**Output maps onto slots the SGS theme already has** (§Appendix B). Colours dedupe at **ΔE≤1
(CIEDE2000, sRGB→Lab), alpha as a separate axis**. Fluid `clamp()` is preserved **verbatim as the
size value** (never recomputed via WP's fluid formula — that changes the curve). `rem` is resolved
against the draft's **actual computed `documentElement` font-size**, never a hardcoded 16px.

**Out of scope (the NOT list):**
- NOT the header/footer converter (Part 2 / Spec 17) — but reserves its token namespace now (FR-33-13).
  Part 2's concrete emit target (`sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav`, per the
  2026-07-13 header/footer/nav design-gate) is named here for cross-reference only; building those
  blocks, and deciding whether their header-specific settings live in the reserved
  `settings.custom.header`/`.footer` namespace or a Customiser/JS-var channel, is a Part 2 decision
  (design-gate §15 open-decisions area), not resolved by this spec.
- NOT the Spec 26 FR-26-C derived-globals post-pass — that is a FORWARD CONTRACT, inert until Spec 26
  Phase 3 (FR-33-13); this spec must not build a half-merge against unbuilt code.
- NOT a new theming/deploy channel — feeds the EXISTING `theme-snapshot.json` → `push-theme-snapshot.py`.
- NOT a per-client special case — one universal extractor, no `if client==` branch (blub.db 269 / R-31-9).

## Functional requirements

### FR-33-1 — Provenance-tiered extraction; COMPUTED value wins, declared wins only the name
Every emitted token MUST carry a `_source` provenance (`declared` | `derived`). The emitted VALUE MUST
be the COMPUTED value read on a representative rendered node, NEVER a raw source declaration — a
`:root`/base declaration supplies only the token's NAME/ROLE vocabulary. Where a declared value and
the computed value disagree beyond ΔE≤1 (or a length delta), the computed value wins and the
divergence is written to the reconciliation log. A `:root` token that is declared but has ZERO
computed usage (a dead token) MUST be gap-logged, NOT emitted. `declared` tokens (validated) auto-apply;
`derived` tokens are advisory (FR-33-5).
**Done when:** a fixture where `:root{--primary:#c00}` but the rendered CTA computes `#b00` emits
`#b00` (computed) + logs the delta; a declared-but-unused `:root` token is gap-logged, not in the
palette; every emitted token has a `_source` field.

### FR-33-2 — Role by usage-context (a defined rule table), + ΔE dedup fully specified
Colour/token ROLE MUST be inferred by a **priority-ordered rule table keyed on (CSS property × selector
role × within-role frequency)**, never by token name and never by cross-role raw frequency. Minimum
table (extend in build, but this is the contract):
| Signal | Candidate role |
|---|---|
| `background`/`background-color` on `body`/`html`/`.section`/large-area ancestor, high L* | `surface` / `surface-alt` |
| `color` on body text / `p` / base, low L* | `text` / `text-muted` |
| high-chroma value on `.btn`/`.cta`/`a`/`a:hover` `background` | `primary` / `accent` |
| `border-color` / thin-border usage | `border-subtle` |
| value on a `.success`/`.error`/status selector | `success` / `error` |
| **no confident (≥ threshold) role match** | **raw-hex `custom-<name>` — NEVER force a slug** |
Each mapping carries a **confidence score**; below the floor → `custom` (conservation, FR-33-9), never a
mis-slugged guess. Colours dedupe at **ΔE≤1 (CIEDE2000, sRGB→Lab); ALPHA is a separate axis (never
dedup across alpha)**; on a merge the **`declared` token beats `derived`; among equals, first
source-order wins**; the loser's name is logged as an ALIAS (not silently vanished).
**Done when:** Mama's role-named + Indus literal-colour-named + dogfood tokens each map to correct
roles via the table (not names); `success=#2E7D4F` lands `success` whether named `--success` or
`--green`; a colour used as BOTH border and heading resolves by the higher-priority property or falls
to `custom` with a logged ambiguity; `rgba(x,1)` and `rgba(x,0.1)` do NOT dedup.

### FR-33-3 — Base body/heading typography from COMPUTED nodes (the drift-killer)
The theme base (`styles.typography` + `styles.color`) MUST be the COMPUTED font-family/size/
line-height/colour/background read on a **representative rendered `<p>` in the main content flow** —
the cascade result of `html` + `body` + any content wrapper — NOT the `body{}` selector's declared
value (reading `body{}` when a wrapper overrides it re-creates D303). `rem` values MUST resolve against
the draft's actual computed `documentElement` font-size (never assume 16px). Font FAMILIES: `body` ←
the base rule; `heading` ← `h1`→`h2`→`h3` (first present); `display` ← an explicit `--font-display`
token or the heading family, else omitted (never synthesised from nothing). Emit the FULL fallback
STACK (`Fraunces, Georgia, serif`) AND ensure the primary family is actually loaded — deploy the
`@font-face`/Google-fonts link into the theme (an extracted-but-unloaded family renders as fallback).
A value the draft NEVER declared (e.g. the fabricated `1.15`/letter-spacing) MUST NOT be synthesised
into the output.
**Done when:** re-cloning Mama's with the generated snapshot renders the brand quote at the draft base
**16px** (D303 gone), heading line-height **1.2** (not 1.15), letter-spacing absent; a fixture with
`html{font-size:62.5%}` resolves rem correctly (not ×1.6 wrong); the heading font actually loads.

### FR-33-4 — Complete DECLARED value-type coverage (the full spine, all in v1)
Pass A MUST extract EVERY value type the draft DECLARES, into its theme slot (§Appendix B): colour
palette (FR-33-2); typography families + sizes + weights + line-heights + letter-spacing
(`fontFamilies`/`fontSizes`/`styles.elements.{h1..h6,link}`); spacing tokens →
`settings.spacing.spacingSizes`; radius → `settings.custom.borderRadius`; shadow →
`settings.shadow.presets`; buttons → `settings.custom.buttonPresets.{primary,secondary,outline}`;
`contentSize`/`wideSize` from `.container`/`.section` `max-width` OR a `--content-width`/`--measure`
token (scan BEYOND `:root`). A `clamp()`/`calc()`/`min()` value is emitted **verbatim as the size
string** (theme.json accepts it), never recomputed. Button presets are an **OPEN property bag** — the
DIFF between rest-state and `:hover`-state declarations, verbatim (NOT an "idiom A vs B" enum), so a
hover that changes colour AND transform is captured whole; `!important` stripped, value kept.
**Done when:** dogfood spacing tokens + Mama's `.container` contentSize + button `border-radius:10px`
+ both hover shapes (Mama's colour-invert, Indus transform-lift) each land in the correct slot with
no `!important`; a declared `clamp()` size is emitted verbatim.

### FR-33-5 — Pass B derivation is PROVISIONAL/advisory (never auto-live); token-less → baseline+skip
For values the draft does NOT declare, Pass B MAY derive them (usage-context role clustering per
FR-33-2, computed-value read) BUT its output MUST be tagged `_source: derived` + a confidence score
and MUST NOT be pushed to the live `wp_global_styles` without explicit human confirmation (the
snapshot marks derived slots `advisory`; `push-theme-snapshot.py` gates them). Because Pass B is
advisory, its promotion thresholds are NOT a precision-critical calibration — use a **relative share
within a role bucket** (not an absolute count, which is authoring-density-dependent) and hold the
token-less Spectra scrape as VALIDATION, not calibration data. A draft where BOTH passes recover
nothing usable MUST emit the framework baseline UNCHANGED + a loud logged skip — NEVER a silent
guessed theme, NEVER a partial-deploy. Parser failure / malformed CSS → HALT with a clear error, do
not proceed to deploy.
**Done when:** a token-less synthetic draft's derived palette is marked `advisory` + does not deploy
to live without confirmation; a draft with nothing usable emits the baseline + a logged skip (not an
empty/guessed theme); Pass B never inverts a palette (role from context, FR-33-2).

### FR-33-6 — Dark-theme / preview-shell safety (never silent-discard a real background)
The theme background MUST be taken from the COMPUTED background of the **widest block-level ancestor
that actually CONTAINS the main content flow** (the common ancestor of the headings/paragraphs), NOT
from `<body>` blindly. A dark `<body>` background is NEVER auto-discarded by darkness alone — a
preview shell is identified only by a POSITIVE structural signal (a `.viewport-switcher`/`.device-frame`
/ known review-harness DOM class or marker); if the signal is ambiguous, the background is
gap-logged for one-glance confirmation, never silently dropped (a legit dark-branded site must survive).
**Done when:** the Claude-App-Design dark preview shell (`body{background:#2a2a2a}` + a review-harness
wrapper) is ignored via the positive signal; a synthetic legit dark-theme draft (`body` dark, no
harness wrapper) KEEPS its dark background (not discarded).

### FR-33-7 — Provenance trace + golden fixtures + schema validation ("correct" = a diff, not an opinion)
The extractor MUST emit a `theme-extract-trace.json`: one row per emitted token — `_source` pass,
source selector + property, role-inference reason, ΔE-snap target + distance, confidence. Every FR
"Done when" that says "correct" MUST be a DIFF against a checked-in `expected/<draft>.snapshot.json`
golden per corpus draft (not an adjective). The emitted `theme-snapshot.json` MUST be validated against
theme.json v3's schema BEFORE handoff to `push-theme-snapshot.py` (a malformed emit must fail here,
not at the REST push).
**Done when:** running on any corpus draft produces a trace explaining every token's origin; each
corpus draft has an `expected/*.snapshot.json` the output is diffed against; a deliberately malformed
emit is caught by the schema check pre-deploy.

### FR-33-8 — Determinism / idempotence (re-run → byte-identical)
Re-running the extractor on an UNCHANGED draft MUST produce a BYTE-IDENTICAL snapshot. All clustering/
promotion/dedup MUST use a total deterministic order (sort by `frequency-within-role desc`,
`first-appearance byte-offset asc`, `canonical-hex asc`; ΔE-cluster canonical = lowest first-offset).
Without this, git diffs + the FR-33-11 diff-approve review are meaningless and drift is reintroduced by
the very tool built to kill it.
**Done when:** the extractor runs twice on an unchanged draft → byte-identical output (a hard test).

### FR-33-9 — Conservation (extract-to-slot OR gap-log; no silent drops; picker not flooded)
Every global declaration MUST be extracted-to-a-slot OR logged as a gap-candidate — never silently
dropped (mirrors the block pipeline's `attribute_gap_candidates`). Intra-palette ΔE merges log the
loser as an alias (FR-33-2). Role-bearing/named colours → the palette; sub-threshold DECORATIVE
one-offs (a shadow-rgba used once) → the trace/gap-log, NOT the client's colour picker (don't flood
the palette with 30 junk swatches). Dead `:root` tokens → gap-log (FR-33-1).
**Done when:** every draft `:root`/base declaration appears in the snapshot OR the gap-log; a
once-used decorative rgba is in the trace, not the palette; a grep finds no client literal.

### FR-33-10 — Reuse by COMPOSITION, not by widening the live helper
The extractor MUST add a NEW `build_draft_root_token_map()` (hex + non-hex + `var()`-chain resolution +
fallback handling). The EXISTING `converter/services/styling_helpers.py::build_draft_root_colour_map`
(hex-only, feeding the LIVE converter's exact-hex snap + the D307 `_theme_palette_slugs()` guard) MUST
stay BYTE-IDENTICAL — widening its return would feed the converter unresolvable entries and risk
re-opening the D306/D307 ghost-border bug. A golden asserts the hex-only map's output is unchanged for
the Mama's draft.
**Done when:** `build_draft_root_colour_map`'s output is byte-identical for Mama's (golden guard); the
extractor consumes the new composed token map; no converter regression.

### FR-33-11 — Deploy safety: prove on Mama's; backup + rollback; diff-approve; drift-detect
v1 proves on **Mama's ONLY** (it carries the D303 bug + is the canary). The other 5 client snapshots
are DEFERRED, each behind its own re-clone + a per-client visual/computed-parity (Stage 11.6) pass —
NO snapshot-only push of a regenerated palette to a client whose pages aren't re-cloned in the same
change. Before every `wp_global_styles` push, the pusher MUST fetch-and-back-up the CURRENT live
payload to a timestamped file + document a one-command `--rollback`. Before overwrite, it MUST diff the
live payload against the LAST-DEPLOYED snapshot and WARN if the live layer was hand-edited in the Site
Editor since (else silent clobber of an operator tweak). Each client push is `--dry-run` diff → human
go/no-go → `--yes` (SAFE_TARGETS enforced).
**Done when:** Mama's regenerates + passes the FR-33-3 reclone + Bean's eye BEFORE any other client;
a `--rollback` restores the prior live payload; a hand-edited live layer triggers a warning pre-push.

### FR-33-12 — Bootstrap ordering (extractor is a hard prerequisite of ANY block clone)
Because the converter token-snaps draft colours against the theme palette this extractor GENERATES
(`styling_helpers._load_theme_palette_map` → `configure_colour_resolution_from_run`, Spec 31 §3.A),
the extractor MUST run + validate for the current draft BEFORE any block conversion for that client.
The `/sgs-clone` orchestrator MUST fail-closed if `theme-snapshot.json` was not produced/validated by
the extractor for the current draft hash (reuse the existing `(client_slug, hash(css))` key as the
freshness check). This changes the whole-pipeline run order — state it.
**Done when:** a `/sgs-clone` run with a stale/absent generated snapshot fails-closed with a clear
message; a run after a fresh extraction proceeds.

### FR-33-13 — Forward contracts (Spec 26 acyclicity + Part 2 namespace + colour-var reuse)
- **Spec 26 merge = FORWARD CONTRACT, inert until Spec 26 Phase 3.** This spec MUST NOT build a
  half-merge. Acyclicity is fixed NOW: Spec 33 OWNS declared `settings.*` tokens (write-once per
  draft); Spec 26 FR-26-C, WHEN built, may only FILL slots absent from Part 1's output and writes to
  the variation DELTA layer (`styles.elements.*`/`buttonPresets.*`), NEVER back into Part 1's snapshot
  nor into the palette the converter snaps against (prevents the theme→converter→theme oscillation).
- **Part 2 namespace reserved NOW:** Part 1 owns GLOBAL/base + generic presets only; header/footer
  COMPONENT tokens (sticky/scrolled header bg, header height, logo max-height, nav-link hover,
  mobile-nav breakpoint) are Part 2's, in a reserved `settings.custom.header`/`.footer` namespace —
  declared now so Part 2 does not force a Part 1 re-spec (Bean Q6).
  **2026-07-13 update:** Part 2's owner is now concretely `sgs/site-header`/`sgs/site-footer`/
  `sgs/adaptive-nav` (header/footer/nav design-gate). Those blocks' GLOBAL defaults (brand colour/
  typography/spacing) come from Part 1's `theme-snapshot.json` output directly — that linkage needs
  no namespace decision, it is the existing global-styles consumption every block already gets.
  Whether the blocks' HEADER-SPECIFIC settings (sticky bg, header height, etc.) land in this reserved
  `settings.custom.header`/`.footer` namespace, or a Customiser/JS-var channel as Spec 17 currently
  uses, is still an open Part 2 design-gate item — noted here, not decided.
- The new `build_draft_root_token_map()` is exposed as a service the parked `P-DRAFT-CSSVAR-*` entries
  consume (stop re-parsing `:root`).
**Done when:** the snapshot reserves the header/footer namespace; FR-33-10's token map is a callable
service; a note re-points the colour-var parking entries.

### FR-33-14 — Business-data auto-fill companion (Tier 1) — BUILT + LIVE (D325, Bean-directed 2026-07-13)

**Behaviour:** alongside the global-STYLES extraction+push this spec owns, Part 1 also auto-fills the
site's **business DATA** (the `Sgs_Site_Info` store — email/phone/socials/copyright/…) from the draft,
so a cloned site's header/footer render real contact details with no manual re-entry. Runs
AUTOMATICALLY as part of the Part-1 pipeline at the same deploy moment as the theme-snapshot push
(`scripts/orchestrator/upload_and_patch.py`, gated by `--client` + the same `--push-theme-snapshot`
opt-in), via `scripts/sync-business-info.py`. NON-FATAL by design (business data is nice-to-have; a
failure never blocks a deploy).

**Tier boundary (the trust line, mirrors FR-33-1's declared-vs-derived split):**
- **Tier 1 (BUILT, auto-applied):** ONLY high-confidence machine-signal fields — email (`mailto:`),
  phone (`tel:`), socials (an `<a href>` to a known social domain; `#` placeholders skipped),
  copyright (the `©` line). Extracted by regex on the raw draft (the fields survive as literal text
  even inside JS template strings). Written **fill-if-empty** (never overwrites an operator's value).
- **Tier 2 (DEFERRED, review-not-auto-write):** semantic guesses — tagline, address, opening hours —
  are NOT auto-written; they need an operator-confirm/suggestions flow (parallels FR-33-5's advisory
  Pass B). OPEN.

**Write channel:** the NEW capability-gated `POST /wp-json/sgs/v1/site-info`
(`includes/class-sgs-site-info-rest.php`, `edit_theme_options`) — key-allowlisted to
`Sgs_Site_Info::known_keys()`, per-key sanitised via `Sgs_Site_Info::set()`, fill-if-empty default;
dispositions written/unchanged/skipped_existing/skipped_invalid/skipped_empty/failed. This is the ONLY
remote write path into the Site Info store (reads stay server-side + escaped). Consumed on the render
side by the `sgs/business-info` block (per-type inserter variations) + `Org_Website_Schema`
(`sameAs`/`contactPoint`).

**Acceptance (met live on sandybrown):** the Mama's draft yields email + copyright (socials are `#`
placeholders → skipped; phone/hours/address absent → not touched); fill-if-empty skips an existing
value; a forced write persists the full copyright string. **Standalone script live-proven end-to-end;
the upload_and_patch wiring is static-verified (draft glob resolves the Mama's mockup) — a full-pipeline
integration run is pending a real `/sgs-clone` run.**
**Depends on:** FR-33-11 (push moment / creds), Spec 17 FR-S9-3 (business-info block consumer), FR-S4-3 (Site Info store).

## Test strategy (holistic)

| FR | Static / structural | Behavioural (real run) | Cross-check | Regression guard |
|----|---------------------|------------------------|-------------|------------------|
| FR-33-1 | every token has `_source`; grep: no raw-declaration emit for values | fixture declared≠computed → computed wins + logged | vs golden | dead-token → gap-log |
| FR-33-2 | role table present; ΔE=CIEDE2000; alpha-axis asserted | 3 systems → roles by table not name | vs the 3 verbatim token sets | rgba alpha not deduped; ambiguous → custom |
| FR-33-3 | rem resolves vs computed root; no fabricated values | reclone Mama's → quote 16px, lh 1.2, font loads | vs live computed-style | 62.5%-root fixture; D303 guard |
| FR-33-4 | clamp verbatim; `!important` stripped; hover = open bag | all declared types + both hover shapes land | vs §App A §D | fixture per value type |
| FR-33-5 | derived tagged `advisory`; relative-share threshold | token-less → advisory + no auto-live; nothing usable → baseline+skip | vs Pass-B-inverts-palette | parser-fail → halt |
| FR-33-6 | positive preview signal required | dark shell ignored; legit dark theme KEPT | vs the shell fixture | legit-dark-theme fixture |
| FR-33-7 | trace row per token; schema-validate pre-push | every draft → trace + golden diff | vs `expected/*.json` | malformed emit caught |
| FR-33-8 | deterministic sort keys | run twice → byte-identical | git diff clean | idempotence hard gate |
| FR-33-9 | grep no client literal; decorative→trace | every decl → slot or gap | conservation count | picker-not-flooded fixture |
| FR-33-10 | hex-map byte-identical golden | extractor uses composed map | vs converter output | no converter regression |
| FR-33-11 | backup-before-write + `--rollback`; diff-approve | Mama's only; rollback restores; drift warns | vs live payload | other-5 deferred behind reclone |
| FR-33-12 | orchestrator fail-closed gate | stale snapshot → fail; fresh → proceed | vs `(client,hash)` key | — |
| FR-33-13 | header/footer namespace reserved; token map = service | — | vs Spec 26/17 | colour-var entries re-pointed |

## Open questions — RESOLVED (baked into the FRs above; recorded here for the audit trail)
1. **Full snapshot vs Spec-26 delta → FULL now** (matches the deploy path; delta is a clean downstream transform diffing the full output against baseline, not an extractor re-plumb). FR-33-4/7.
2. **Token-less / Spectra fallback vs skip → advisory Pass B + baseline-on-empty** (never a silent guess; Pass B output is provisional/gated). FR-33-5.
3. **Extra colours beyond the 16 slugs → named raw-hex custom entries, two-tier** (real colours → custom palette entry; decorative one-offs → trace, not the picker). FR-33-2/9.
4. **Frequency thresholds → not precision-critical (Pass B advisory-gated); role by usage-context not raw frequency; relative-share within a role, not absolute count; validate on held-out drafts.** FR-33-2/5/8.

## Appendix A — Corpus union inventory (the acceptance coverage set)
Full empirical inventory of every global declared default/preset/variable across the real draft corpus
(`sites/{mamas-munches,indus-foods,_dogfood}`, 8 authored mockups, 3 design systems), captured
2026-07-13. The extractor's acceptance = correctly handling every row (via a golden per draft, FR-33-7).
KEY COVERAGE ANCHORS:
- **Colour roles + naming range (two philosophies):** role-named (`--primary`/`--surface-*`/`--text*`,
  Mama's+dogfood) vs literal-colour-named (`--navy`/`--gold`/`--green`/`--white`, Indus). Same role,
  different name (success `#2E7D4F` = `--success`/`--green`). Intra-brand drift (`--border` vs
  `--border-subtle`; `--accent-dark`/`--cookie-brown` present/absent across Mama's 4 files). One-offs
  `--cookie-brown`/`--whatsapp`/`--red`. Value types: 6-hex, `rgba()`, `var()`-ref, `clamp()` token,
  gradient (in rules).
- **Typography:** Fraunces+Inter (Mama's, px), DM Serif Display+DM Sans (Indus, **rem**), system-ui+
  Georgia (dogfood, **clamp**). 7/8 hardcode the family (no `--font` token → synthesise from base
  rules). 0/8 tokenise sizes/lh/tracking (derive from base+heading+preset). Unit variety (px vs rem;
  px vs em tracking). Three font-loading mechanisms (`<link>`, `@import`, system/none).
- **Base elements carrying globals:** `*` (reset, 3 shapes — normalise), `html`, `body`, `h1–h4`, `p`,
  `img`, `a`.
- **Presets:** `.container`/`.section` (contentSize 1200–1280), `.sgs-button--*`/`.btn-*` (2 hover
  shapes — colour-invert vs transform-lift), `.sgs-section-heading__label`/`.section-label` (eyebrow),
  skip-link, focus-visible, reduced-motion.
- **15 edge cases** (FR-33-4/5/6 coverage): two naming philosophies; intra-brand drift (union);
  un-tokenised typography (synthesise); zero type/radius/shadow tokens (derive, advisory); `:root`
  CSS-function value (`clamp()`); three reset shapes (normalise); three font-loading mechanisms; the
  dark PREVIEW-SHELL trap (FR-33-6); unit variety (unit-aware, rem-root-resolved); `!important` (strip);
  ad-hoc per-page colours (union); content-width outside `:root` (scan beyond); token-less Spectra
  scrape (Pass-B advisory or baseline-skip).

## Appendix B — Target theme.json slots (SGS theme baseline, verified) + WP fluid facts
`theme/sgs-theme/theme.json` provides: `settings.color.palette` (16 named slugs, raw hex OK);
`settings.typography.fontFamilies` (body/heading/display/dm-sans + fontFace) + `fontSizes` (7-step,
fluid) + `fluid`; `settings.spacing.spacingSizes` (8-step `10`–`80`); `settings.shadow.presets`
(sm/md/lg/glow); `settings.custom.{buttonPresets(primary/secondary/outline — each: background/text/
border/border-width/border-radius/padding/font-size/font-weight/min-height/hover-*), borderRadius
(small/medium/large/pill), transition/duration/easing, focus-ring}`; `settings.layout.{contentSize
1200, wideSize 1400}`; `styles.typography` (base body); `styles.elements.{h1..h6, heading, link,
button}`. **NEW namespace this spec reserves:** `settings.custom.header`/`.footer` (Part 2, FR-33-13; Part 2's
concrete owner is `sgs/site-header`/`sgs/site-footer`/`sgs/adaptive-nav` per the 2026-07-13
header/footer/nav design-gate — those blocks' GLOBAL colour/typography/spacing defaults read the
`settings.color.palette`/`settings.typography.*`/`settings.spacing.*` slots above directly; whether
their header-specific settings use this reserved namespace is still open, see FR-33-13).
Deploy: `push-theme-snapshot.py` → disk `theme.json` + `POST /wp/v2/global-styles/{id}` (wp_global_styles;
overwrites the operator layer — FR-33-11 backup/diff/rollback guards this).
**WP fluid typography:** `settings.typography.fluid:true` auto-computes `clamp()` from a size; per-size
`fluid:{min,max}` gives explicit control. **BUT a draft's authored `clamp()` MUST be emitted verbatim as
the `size` string (theme.json accepts it)** — routing it through WP's fluid formula recomputes a
different curve (FR-33-4). Reserve `fluid:{min,max}` only for sizes the draft did NOT already clamp.
