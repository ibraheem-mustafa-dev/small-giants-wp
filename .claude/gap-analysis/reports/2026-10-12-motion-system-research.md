# Gap analysis: SGS motion system research report, revision 2 (12 Oct 2026)

Target: `scratchpad/motion-research-report-v2.md` (session 6b32316d). Target type: research. Role: independent judge at the research-council HARD GATE (delivery needs >= C, 2.5). QC status: `qc_pending: true` (the parent runs Step 7.75 /qc-council).

Owner rulings applied (no gap below contradicts them): GSAP licensing out of scope; hover effects and reveals CSS and plain JS first, GSAP only for Tier G; colour and shadow hover VALUES out of scope; every element stores its own delay, nothing computes delays in the browser (sibling-index() rightly rejected); the separate CSS-first systems scan is not counted as a gap.

**Verdict in one line:** passes the gate at **C (3.25/5)**. What it covers (entrance stagger, delays, browser support, decisions, packaging) is careful and mostly verified against the repo. The problem is what it leaves out. Measured against the Phase 0 design target in `.claude/plans/2026-10-12-clone-coverage-foundation.md` (step 0.2), it leaves out motion fx, the separate hover panel, the hover-side migration and the motion tokens that already exist. One claim about the repo is wrong: it says `settings.custom` holds shadow entries only.

## 1. Context Loaded

| Source | Status | Key findings |
|--------|--------|-------------|
| Corrections file | Read | 7 corrections, none for target_type research. The general lesson applied: an evaluator's flagged issues can be wrong (gemini-analyzer, D to C), so every gap below was checked against the repo |
| Strategic objectives | Read | revenue-sgs (critical): SGS builds earn client revenue; quality-pipeline (high); autonomy-claude (high); adhd-accessibility |
| Evaluation history | Read | 21 entries, 0 of type research, so no drift baseline for this type. Last scores are not identical (3.3, 4.29, 4.15, 1.84, 3.86), so the identical-score warning does not fire |
| Council material | Read | v1 report, four council reviews plus Haiku cross-reads, the Council Head's revision brief (Head scores before revision: Accuracy 7, Completeness 5, Practicality 5, Clarity 4) |
| Governing plan | Read | `.claude/plans/2026-10-12-clone-coverage-foundation.md` Phase 0, step 0.2: one standardised panel per motion type (hover, entrance and reveal, motion fx); modular controls per variable; the same controls define site-wide tokens; container orchestration with stagger and an order; the redesign owns hover effects, entrance, fx and per-hover timing, and folds in `shadowLiftOnHover` (22 blocks) and `sgsHoverShadow` (8 blocks) |

## 2. Criteria Scored

| Criterion | Score (0-5) | Grade | Weight | Evidence (one sentence minimum) | Floor applied? |
|-----------|-------------|-------|--------|--------------------------------|----------------|
| source_quality | 4.0 | B | 1.0 | 38 sources graded by tier (T1 to T4); Firefox and sibling-index() support re-checked against MDN browser-compat-data with a date; vendor figures and anecdotes are labelled. Some entries have no URL or date (S8, S11, S12, S21, S29) | No |
| coverage_breadth | 2.5 | C | 1.2 | Covers entrance and stagger well. Misses most of step 0.2's scope: 0 mentions of fx, cursor, magnet, parallax, `shadowLift` or `sgsHover`, Tier H or Tier W, `fx_effects`, `animation_tokens` or FR-48 (grep counts on the report) | No |
| evidence_strength | 3.0 | C | 1.2 | Repo claims checked and true: `staggerOffset`, `DEFAULT_STAGGER_MAX = 7`, the `animation-stagger.php` attributes, `sgs-entrance-pending` in the 3 named files, `_card_index`, `$scoped_css`, FR-32-4, FR-32-4a and the FR-38-7 wording. False: "settings.custom exists with shadow entries only". `theme/sgs-theme/theme.json` `settings.custom` holds `duration`, `easing`, `transition` and `entrance`. Stale: "97 of 98" (now 97 of 97) | Yes (custom floor: a wrong repo fact that a recommendation rests on caps the score at 3.0) |
| actionability | 3.0 | C | 1.3 | All six decisions give options with benefits, drawbacks and a recommendation; there is a panel mock, a migration sweep and an editor acceptance test. But an engineer following it would build one effect and one trigger per element (Bean wants a panel per motion type), a new token set beside the existing one, and a storage object with no mapping to the DB | No |
| bias_detection | 4.0 | B | 1.0 | Has a counter-evidence section and low-confidence labels; vendor marketing (Motion's comparison) and the 480MB anecdote are downgraded correctly; unverified claims are marked | No |

**Overall score:** (4.0 + 3.0 + 3.6 + 3.9 + 4.0) / 5.7 = **3.25** / **Grade: C**

## 3. Persona Evaluation

| Persona | Priority criteria | Weighted score | Grade | Categorical failure? |
|---------|-------------------|----------------|-------|---------------------|
| Bean (non-coder owner who decides from it) | actionability 1.5x, coverage 1.3x | 3.23 | C | No. The decisions are self-contained. But there is no decision about the existing tokens or the per-type panels, because the report never sees them |
| Spec 38 rewrite engineer or agent | evidence_strength 1.5x, coverage 1.5x | 3.21 | C | No categorical fail. The wrong token claim would lead to a second token set unless it is caught |

**Divergences (>1.0 delta):** None (delta 0.02).

## 4. Full Gap Register

| # | Gap | Grade | Value of filling it |
|---|-----|-------|-------------------|
| 1 | The 22 special effects SGS already has never appear: the "fx" effects such as the cursor field, magnetic pull, parallax, path drawing, scroll scrubbing and split text (`fx_effects` table, 22 rows). Bean's target is one standard panel per motion type, and "motion fx" is one of the three. The report designs only entrances and hovers | A | The Spec 38 rewrite covers all three motion types, so the fx effects get the same "each element stores its own values" model rather than staying a separate preset world |
| 2 | The panel mock gives an element one Effect and one Trigger. A card that fades in on scroll AND lifts on hover cannot be expressed. Bean asked for one panel per motion type (hover, entrance and reveal, fx), each set on its own | A | Clients and the cloning tool can give an element an entrance and a hover effect together, which most real drafts do |
| 3 | The report says the theme has no motion tokens ("shadow entries only") and proposes new ones with new names. In fact the theme already has motion tokens (durations instant/fast/medium/slow/extra-slow, five easings including a spring, transition presets and entrance defaults), used in about 125 places, including the entrance script `animation-observer.js`. The framework database also holds 8 entrance presets (`animation_tokens`). The report has no plan to keep, rename or migrate them | A | Avoids building a second token system beside the first and gives the engineer a rename sweep instead of a surprise. It also corrects the only false repo claim in the report |
| 4 | The report stores motion settings as one combined block setting described by "one JSON Schema". It never says how that maps onto the framework database the cloning tool and calibration read: per-property rows with a CSS property, a hover state and a device tier in `block_attributes`, plus `fx_effects` and `animation_tokens`. The project rule is that framework facts live in the database (R-31-1) | B | The new storage shape stays readable by the cloner and the gates. Without the mapping, Phase 1's coverage test cannot see the motion settings |
| 5 | The current-mechanism section covers entrance stagger only. The hover side the redesign must replace is missing: hover timing is one duration and easing per block today (`sgsHoverDuration` and `sgsHoverEasing` on 8 blocks, `bgHoverZoomDuration` on 7), and the plan folds in `shadowLiftOnHover` (22 blocks) and `sgsHoverShadow` (8 blocks) | B | The migration sweep covers every motion setting being replaced, not just stagger, so no old control survives beside the new panel |
| 6 | Decision D2 (what Firefox shows for scroll-linked effects) leaves out two things already in the repo. The timeline progress line (FR-38-35) already chose one script driver on every browser, with no native scroll-timeline branch. The parallax and media motion styles already use CSS scroll timelines behind a support check | B | Bean gets the full set of options, including the one the framework already uses, and the rewrite does not end up with two Firefox strategies |
| 7 | The report's new performance ladder (CSS, the in-view observer, WAAPI, Motion mini, GSAP) is not mapped onto Spec 38's existing four tiers (V, G, H, W), which the `fx_effects` table also uses | B | One vocabulary in the rewritten spec and the database, rather than two tier systems that drift |
| 8 | The report lives only in a temporary session folder (the scratchpad under AppData\Local\Temp). The next session, which writes the Spec 38 rewrite, may not be able to find it | B | The research survives the session and the spec rewrite can cite it |
| 9 | Under the new CSS-transition model, an entrance and a hover effect both drive the element's movement and its single transition list, so they can fight: the hover cannot move a card still held by its entrance, or one timing overwrites the other. Today's script avoids this by not holding the end state (`fill: 'backwards'` in `animation-observer.js`). The report does not carry that safeguard forward (partial: the conflict is inferred from the design, not reproduced) | C | Hover lifts work on cards that have entered, and each motion keeps its own timing |
| 10 | Bean asked for the container helper to set an order (for example row first, left to right). The ordering choices (from start, end, centre, row or column first) appear only in an appendix of other tools' vocabulary, not in the helper's specified controls | C | The cloning tool can reproduce drafts whose stagger runs column-first or from the centre |
| 11 | No rule limits hover motion to devices that can hover. On phones a tap can leave a card stuck in its lifted state | C | No stuck hover states on touch screens across every client site |
| 12 | The cloning section does not link to the cloning spec's motion requirements (FR-48-47 entrances, FR-48-77 effect recognition) or to the finding that 16 of 22 fx effects have no recogniser | C | The Spec 38 and Spec 48 rewrites line up, so recognisers target the new model |
| 13 | The decisions are numbered D5, D2, D3, D4, D6 (D1 was voided), and there is no ranked summary table, which the User Advocate review asked for | D | Easier to scan; no outcome changes |
| 14 | "97 of 98 blocks declare elements" is stale (97 of 97 now), and the project rule says counts belong in the database, not in documents | D | Minor accuracy; the conclusion stands |
| 15 | "Core has no state model for hover" is left unverified although it could be checked in minutes | D | The SGS model is chosen either way, so this changes nothing |
| 16 | Some bibliography entries lack a URL or date (S8, S11, S12, S21, S29) | D | Traceability only |

Backlog note (Hard Rule 5): the target is a research report with no `references/backlog.md`. The B and C gaps (4 to 12) should be carried into the Spec 38 rewrite plan for Phase 0.3, which the parent session owns. This run edits no repo file other than this report.

## 5. Recommendations (ALL, with impact rating)

| # | Recommendation | Fixes gap # | Impact | Effort |
|---|---------------|-------------|--------|--------|
| 1 | Add a section listing each of the 22 `fx_effects` rows, saying which motion type it belongs to and which of its parameters become stored per-element values | 1 | HIGH | MED (20 min) |
| 2 | Redraw the panel mock as three panels (Hover, Entrance and reveal, Effects), each with its own effect, values and timing; allow one of each per element | 2 | HIGH | LOW (10 min) |
| 3 | Correct section 6. List the existing `settings.custom` motion tokens and the `animation_tokens` rows. Add an owner decision: keep the existing names, or rename them with a sweep of about 125 uses | 3 | HIGH | LOW (10 min) |
| 4 | Add a storage-to-database paragraph: how each motion value becomes rows with a CSS property, hover state and device tier, and how presets seed from the database | 4 | MED | MED (15 min) |
| 5 | Extend section 3 with the hover settings being replaced (`sgsHoverDuration`/`Easing`, `bgHoverZoom*`, `shadowLiftOnHover`, `sgsHoverShadow`) and add them to the migration sweep | 5 | MED | LOW (10 min) |
| 6 | Add "one script driver on every browser (timeline precedent, FR-38-35)" as a D2 option and say how the existing CSS parallax fits | 6 | MED | LOW (5 min) |
| 7 | Add a small table mapping each ladder row to Tier V, G, H or W | 7 | MED | LOW (5 min) |
| 8 | Copy the final report to `.claude/reports/2026-10-12-motion-system-research.md` and point the plan's step 0.2 at it | 8 | MED | LOW (2 min) |
| 9 | Add a composition rule: an entrance animates the separate `translate` and `opacity` properties and never holds its end state; hover uses `scale` or its own property with its own transition timing | 9 | MED | LOW (10 min) |
| 10 | Move the helper's order choices (start, end, centre, row-first, column-first) into section 2's Fine-tune list | 10 | LOW | LOW (5 min) |
| 11 | Add the rule that hover motion sits inside `@media (hover: hover) and (pointer: fine)` | 11 | LOW | LOW (2 min) |
| 12 | Cite FR-48-47 and FR-48-77 and the 16-of-22 gap in section 7 | 12 | LOW | LOW (5 min) |
| 13 | Renumber the decisions D1 to D6 and add a one-line ranked table | 13 | LOW | LOW (2 min) |
| 14 | Replace the count with "all blocks declare elements (DB query)" | 14 | LOW | LOW (1 min) |
| 15 | Check the core hover state model or drop the claim | 15 | LOW | LOW (5 min) |
| 16 | Fill in the missing URLs and dates | 16 | LOW | LOW (5 min) |

Bulk-fix path: recommendations 1 to 12 in one pass, about 100 minutes; 13 to 16 add 13 minutes.

## 6. Research Findings

| Search query | Source | Finding |
|-------------|--------|---------|
| Local repo: `theme/sgs-theme/theme.json` settings.custom | Read | Existing motion tokens: duration, easing, transition, entrance; about 125 `--wp--custom--{duration,easing,transition,entrance}` uses in src, assets and the theme |
| Local repo: sgs-framework.db (read-only) | sqlite | `fx_effects` 22 rows across tiers G, V, W and H; `animation_tokens` 8 presets; hover timing attributes per block; `shadowLiftOnHover` on 22 blocks; 1,035 object-typed attributes carry a CSS property, so object storage is routable but needs mapping |
| Local repo: Spec 38, Spec 32, entrance scripts | grep and read | FR-38-7, FR-32-4 and FR-32-4a quoted correctly (FR-32-4a names "per-item stagger index"); FR-38-35 uses one script driver everywhere; `animation-observer.js` uses `fill: 'backwards'`; `extensions.css` parallax uses `@supports (animation-timeline: scroll())` |
| "@starting-style page load transition initial render behaviour LCP" | search.py (searxng) | web.dev LCP article: LCP counts the render time of the largest visible element, which supports the report's "no opacity-0 entrance on the LCP element" rule |
| "animation-fill-mode forwards overrides hover transform after entrance animation" | search.py | Codrops animation-fill-mode: fill applies animation values outside the animation's run, so a held end state beats normal declarations such as `:hover` (gap 9) |
| "MDN individual transform properties translate rotate scale" | search.py (MDN) | MDN transform-box: `translate`, `scale` and `rotate` are separate properties, which allows the split in recommendation 9 |
| Two further queries (hover composition, touch hover) | search.py | Returned off-topic results (dictionary pages); no usable finding |
| Workspace memory | grep | `a-held-animation-end-state-makes-a-containing-block.md`: a held translate makes the element the containing block of absolute children, a second reason not to hold entrance end states; `gsap-licensing-is-settled.md` confirms the licensing ruling |
| Past evaluations | ls and grep | No prior gap-analysis of a research target or of motion |

## 7. S-Grade Opportunity Hunting

### 7A. Current S-Grade Screen

| Category | Criterion | Hit? | Evidence |
|----------|-----------|------|----------|
| Functional | USP | No | The report itself notes that no public Gutenberg plugin has stored per-element delays written by a cloner. That is the design's USP, not the report's |
| Functional | Innovative | No | A sound synthesis, not a new technique |
| Functional | Cross-system | No | It touches cloning, but the coverage gaps limit that |
| Impact | Competitive moat | No | Not until it is built |
| Impact | Revenue/time | No | Indirect |
| Impact | Marketing showpiece | No | A research document |

**Current verdict:** Not a candidate.

### 7B. S-Grade Opportunities (from research)

| Opportunity | S-grade criteria hit | Showpiece? | Effort | Description |
|-------------|---------------------|------------|--------|-------------|
| Generated motion inventory | cross_system, revenue_time | LOW | 15 min | Make the spec's starting table a database query (every motion setting, token and fx effect), so the rewrite and Phase 1's coverage test share one list and nothing gets left out again |
| "Clones motion exactly" demo | marketing_showpiece, competitive_moat | HIGH | after build | A side-by-side page showing a Claude Design draft's staggered reveal and the SGS clone with identical timings, possible because every delay is stored per element |

## 8. Human Summary

```
Target: SGS motion system research report, revision 2
Grade: C (3.25/5), passes the >= C delivery gate
Strongest: source_quality and bias_detection, 4.0
Weakest: coverage_breadth, 2.5
Gaps found: 16 (F:0 D:4 C:4 B:5 A:3)
S-grade: Not awarded
Research: Done (6 external queries, 4 useful; repo, DB and memory loaded)
Persona divergence: None
```

The report is solid on what it covers. Before the Spec 38 rewrite starts, three things need adding: the fx effects, separate hover and entrance panels, and the motion tokens that already exist. The token claim is the only factual error found.
