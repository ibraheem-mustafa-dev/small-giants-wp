# Gap analysis: handoff data register (2026-10-21)

Target: `.claude/reports/2026-10-21-handoff-data-register.md` (small-giants-wp). Type: custom (evidence register feeding a design). Grade: B (3.5/5).

Research: external "design to code handoff extraction structured data inventory completeness criteria", "data catalog field inventory provenance lineage consumer mapping best practice", "Figma design tokens to code pipeline deterministic extraction versus AI inference" (thin; Figma2Code 2026 frames design-to-code as deterministic extraction first, inference only where the source is silent). Internal: project memories `ai-producer-files-need-a-schema-not-a-description`, `agent-verdicts-need-a-citation-gate`, `enumerate-a-vocabulary-mechanically-before-designing-on-it`; no past evaluation of this target. Baseline: a register is good when it is exhaustive against a fixed list, reconciled against counts, every claim cited with the command that proved it, and every row actionable per consumer.

Mechanical check: 108 rows over 10 sections, 0 column mismatches; 23 AI-agent cells are "—"; 2 commands cited; 0 "highest-value" lists; older exports mentioned once; no per-stage index.

| Criterion | Score | Evidence |
|---|---|---|
| Coverage of the folder map and Spec 48A | 4.0 | every folder-map file has a section; the older Eye Care exports (v2 folder, SGS Gap Handoff) that wave A's first pass inventoried are absent |
| Column completeness | 3.5 | all columns present; 23 "—" AI-agent cells, several with a real use (type scale, radii, opening hours, decision keys) |
| Accuracy | 4.2 | 20 claims re-checked across both waves, all true; only 2 carry the command that proved them (project rule: a verified claim carries its command) |
| Actionability for the design | 2.8 | the agents' ranked "highest-value unused" lists were dropped in the merge; no per-stage view; discrepancies scattered across sections |
| AI-agent use depth | 3.3 | evidence and rule-mining uses named in most rows, no consolidated list of rule candidates |

6-lens: end-result pass (feeds the readers' design); cross-context pass (committed file); durable pass; automation pass (a dated report; Spec 48A §3 holds the living register); ADHD fail-risk (204 lines of tables with no top summary) and values alignment partial (no statement of the outcomes the gaps block) — both fixed by recommendation 1.

## Recommendations (all C+ ; bulk path ~20 min)

1. (A) Add a top "What the register says" section: the highest-value unused items from every agent, each with the outcome it blocks today (20 Indus mega-panel skeleton rows; 7 header differences; Mama's manifest blocked by one entry rule; Mama's marquees and Eye's 1060 nav), ranked. Fixes actionability and lens 5/6.
2. (A) Add a per-stage index: for each stage, the register items it could read and today does not (skeleton, Fill values, Fill states and behaviour, site build, snapshot, Solve, review). The design reads this directly.
3. (B) Add a "Discrepancies to resolve" list: census counts (49 vs 40 animate calls, 29 vs 13 timers), README counts, Eye "80 toggling sc-ifs" (97), `norm()` treating `0.01ms` and `.01ms` differently, 20 vs 19 image slots, `pseudo_rules` 103 vs 102.
4. (B) Add the older Eye Care exports: the 40-file brand logo set, `image-slot.js` sidecar and stock prefill, the gap map's 114 graded rows; what Claude Design can produce beyond what we ask.
5. (B) Fill or justify the 23 "—" AI-agent cells (write "none: <reason>" where there is none).
6. (C) Add a "How checked" line per section with the commands that proved its "Checked" claims.

S-grade: not screened in. QC: assumption check run inline (each recommendation's premise verified by grep: 0 highest-value lists, 1 older-export mention, 2 commands, 0 stage index); the /qc-council stage was not run (session fan-out budget spent on the 13 analysis agents) — flagged for Bean.

## Spec checks (added at Bean's request, running)

7. Spec to register: every process step in Spec 48 and 48A that names an input has a register row, or is listed as a NONE (a data kind the register missed, or a source outside the handoff).
8. Better fit: for each such step, a handoff file or construct that states the fact more directly than the source the spec names, and whether it should replace the spec's source, cross-check it, or be ignored.

Two read-only agents, split at FR-48-37 (the second also covers Spec 48A). Main-thread checks: Indus `tokens/typography.css` `body{font-size:var(--fs-body);line-height:var(--lh-body)}` with `--fs-body:19px;--lh-body:1.55`; Eye manifest 1060 reason "Full nav no longer fits beside the wordmark…"; Indus has 2 `<iframe>`; Mama's `mmMarquee 24s linear infinite` (Home) and `32s` (footer); `lib/intake-ast-eval.mjs` holds no `eval`, `new Function` or `vm` (a static interpreter over the syntax tree, so the agent's "logic run in Node" flag is false; FR-48-24's wording should say static tree evaluation is allowed).

Register misses (inside the handoff): Google Maps `<iframe>` embeds (Indus 2); URL query state (Mama's `location.search`: `tab`, `order`, `occasion`, `id`); reduced-motion `@media` in six drafts' `<style>`; form `autocomplete`, `accept` and `<select>` options; shop filter facets; a rating badge and cart trigger row (FR-48-6 rule 5). Outside the handoff by design: calibration, the framework DB, the theme snapshot, the live site, Bean's decisions, `PROMPT.txt`, pinned dependencies, a raster site icon, form destination and recipient; constructs the spec names that no export has (consent, spam protection, search, newsletter, booking, dark mode, `<details>`, `<dialog>`, popover).

Spec-internal conflicts: FR-48-7 and FR-48-6 rule 1 read `animations.json` as input where §9 says Claude Design's inventories are cross-checks; FR-48-33 reads the README's placeholder tier where §2 and §9 say the README is not an input; §3.4 step 3 decides spacing "not the draft's CSS" against R-47-4; FR-48-29 reads `data-props` by raw-text scan against R-47-4.

Better-fit sources (replace the spec's source): body size and line height from `tokens/typography.css` (FR-33-3); Eye 1060 kept, a threshold snaps to a tier only when its stated reason is a device class (FR-48-50); radii, shadows, gaps, gutters and section padding from `tokens/spacing.css` (FR-33-4, FR-32-18); palette from `tokens/*.css`, not the README (FR-33-15); declared `clamp()` and `R.*` expressions instead of fitting the render (FR-48-44); menu labels from `_menus` (FR-48-55); a marquee from the declared `animation` value, render confirming (FR-48-6 rule 1); prop variants from `propsMeta` (FR-48-29); `required` and `aria-*` from the template's attributes (FR-48-6); manifest states from `state_keys`, not name words (§2 `statesOf`); placeholders from the draft's own placeholder text (FR-48-33); skeleton nesting from the annotated template's parent chain (§3.4); the desktop tier from the `v()` or `R.*` desktop value (FR-48-74); binding groups keyed by the hole path (FR-48-41); per-width motion scope from `animations.json` `breakpoints` (FR-48-47, -79); a recorded parent from `surfaces.json` `parent` (FR-48-37); screen names from `data-screen-label` (FR-48-84). Cross-checks (the spec's source stays): spacing owner, state map diff, page map membership, palette role aliases, motion parameters, behaviour triggers, Eye `repeatedGroups` counts, `closed_by`, `time_dependent`, `unresolved`.
