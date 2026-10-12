# Spec 32 section ledger (plan task B4)

Date: 2026-10-11. Source: `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` (spec_version 2.0, 1,052 lines, read in full). Inputs: plan `.claude/plans/2026-10-10-claude-design-handover-standard.md` Task B4; council `.claude/reports/2026-10-10-handover-council/R4-needs-and-specs.md` Part 2 (checked against the current spec, see the note below); Spec 48A `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md`.

Bean's decision (plan, "Decisions"): Spec 32 becomes framework only (styling contract, token vocabulary, the `theme-snapshot.json` format). Its cloning-only parts (Part D, the extractor, §12.5-12.7) move to Spec 48. Dated material is cut (§0a, §8, §11, §12.3, §13.3, FR-26-A5). FR-26-D3's shadow names are corrected. FR-33-n IDs keep their numbers in Spec 48.

Verdicts: **KEEP** (stays in slim Spec 32), **MOVE-48** (goes to Spec 48), **CUT** (dropped; where the text holds a current rule, the rule is carried to the named place). "Split" rows record which half goes where; the ID itself lives in one place.

**R4 Part 2 check.** R4's table covers every one of the spec's 66 headings and blocks; no section is missing. Its classes hold, with three differences: (1) R4 classes FR-33-11, FR-33-13 (namespace) and FR-33-20 as FORMAT, which conflicts with Bean's "Part D moves" (open decisions O1-O3); (2) R4 did not catch that FR-32-11's own text contradicts §6.2(b) and the code (correction C2); (3) R4 counted hits, not files. The counts below are files, from today's grep.

Citation command (all counts in table 2): `git grep -n -o -E "FR-(32|33|26)-[A-Z]?[0-9]+[a-z]?" -- ':!.claude/archive' ':!.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md'` "Live" excludes `reports/`, `.claude/reports/`, `.claude/memory/`, `.claude/backups/` and any `archive/` path.

---

## 1. Sections in document order

| # | Section | Verdict | Reason | FR / rule IDs defined |
|---|---|---|---|---|
| 1 | Front matter (`spec_id`, `references`, `absorbs: [26, 33]`) | KEEP (rewrite) | Bump the version; drop Spec 47 and the archived plans from `references`; `absorbs` becomes `[26]` (33 now lives in Spec 48) | none |
| 2 | Migration-method banner ("MORE THAN 3 BLOCKS?") | CUT | Repeats root `CLAUDE.md` "Build the detector first" | none |
| 3 | One-liner and sibling-spec note (Spec 35) | KEEP | Framework purpose; reword "auto-generated from the theme snapshot" so it covers hand-built snapshots | none |
| 4 | Document map | KEEP (rewrite) | Part D leaves; Parts A-C remain | none |
| 5 | §0a Status | CUT | Points at §8's dated measurements; the gates in §11b are the status | none |
| 6 | §0 Problem statement | KEEP | No-inline and shared-contract rationale; reword "driven by a cloning pipeline" to be neutral | none |
| 7 | §1 Who this is for | KEEP | "The cloning pipeline" row becomes a one-line pointer to Spec 48 | none |
| 8 | §2 Goals and non-goals | KEEP | Goal 4 ("pipeline populates tokens") becomes "tokens are filled by the Spec 48 extractor or by hand" | none |
| 9 | §3 Hard constraints, rows 1-5 | KEEP | Owner rules every block obeys; the DEFAULT-vs-HARDCODE test is cited by `plugins/sgs-blocks/CLAUDE.md` and `nav-bar-menu/render.php` as "Spec 32 §3" | none (cites Spec 11 D24) |
| 10 | §3 last row ("Pipeline extracts tokens from the draft; never asking Bean for values") | MOVE-48 | A cloning rule; false for the six hand-built snapshots; conflicts with intake approach B (correction C12) | none |
| 11 | §4 Component Contract | KEEP | BEM classes, token consumption, stylesheet states, canonical hover emitter; trim the stale block list (C10) | FR-32-1, FR-32-2, FR-32-3 |
| 12 | §4 Override Strategy | KEEP | Scoped per-instance values; per-item positional rules | FR-32-4, FR-32-4a |
| 13 | §4 Design Token Specification | KEEP | Where `{component}Presets` live and the framework fallback; applies to every client | FR-32-5, FR-32-6 |
| 14 | §4 Pipeline Contract: FR-32-7 | MOVE-48 | The extractor's job; its "Done when" assumes an SGS-BEM draft (C9) | FR-32-7 |
| 15 | §4 Pipeline Contract: FR-32-8 | KEEP (split) | Framework half (a block renders its preset as the variant class, no inline) stays as FR-32-8; route half (route sets the class, a naked link stays naked) becomes a new Spec 48 FR (O4) | FR-32-8 |
| 16 | §4 Naming Convention | KEEP | `{component}Presets` role vocabulary | FR-32-9 |
| 17 | §4 CSS Output Consolidation | KEEP (correct) | Collector and output modes; text contradicts code and §6.2(b) (C2) | FR-32-11 |
| 18 | §4 Residual CSS channel | KEEP | `sgsCustomCss` bound, fold, specificity, normalise; "editor user or cloning route applies the bound" stays as a cross-reference | FR-32-13 (cites Spec 35 D2) |
| 19 | §5 Non-functional (performance, editor parity, viewport gotcha, security, accessibility) | KEEP (correct) | Binding on every block; cited as "Spec 32 §5" by `check-style-blob-sanitisation.py`; "consolidated footer `<style>`" is stale (C2) | none |
| 20 | §6 Architecture (flow diagram, key decisions) | KEEP (rewrite top) | Block half is framework; diagram top ("draft .sgs-button--primary … FR-32-7 extractor") becomes "snapshot (Spec 48 extractor or hand-built)" | none (cites Spec 11 D24) |
| 21 | §6.1 intro (no-inline rules, box-family, box-flat audit, grid-item box controls, colour alpha, two-constraint paragraph) | KEEP | Framework box-object contract; most-cited part of the spec | none |
| 22 | §6.1 mega-panel blockquote | CUT | One-block migration remark | none |
| 23 | §6.1(a) Named-object shape | KEEP | Storage shape | none |
| 24 | §6.1(a1) Shared shorthand builders | KEEP | Helper contract; cited by Spec 47 (moving to 48) | none |
| 25 | §6.1(a2) Length sanitisation | KEEP | Helper contract | none |
| 26 | §6.1(b) Base serialises scoped | KEEP | Cited by `check-id-scoped-emits.js`, `button/render.php`, `custom-css.php`, `survey-native-supports.py` | none |
| 27 | §6.1(c) Family roster | KEEP | DB-authoritative box families; cited by `check-box-flat.py`, `box-flat-baseline.json`, `label/render.php`, `timeline/render.php` | none |
| 28 | §6.1(d) Pipeline extraction + block consumption | KEEP (split) | Consumption half (BoxControl in `edit.js`, render reads the object) stays as FR-32-10; the route's cross-declaration accumulator half becomes a new Spec 48 FR (O4) | FR-32-10 |
| 29 | §6.1(e) Per-instance override channel | KEEP | Framework rule | none |
| 30 | §6.1(f) Border defaults | KEEP | Current rule (Bean, 2026-10-05); drop the date from the heading | none |
| 31 | §6.2 intro, Problem paragraph, "Status: BUILT" line | KEEP (trim) | Keep the problem and mechanism; cut the "Status: BUILT" line and the archived-plan pointer | (FR-32-11 detail) |
| 32 | §6.2(a) The collector | KEEP | Cited by Spec 35A and `class-sgs-css-registry.php`; drop "(BUILT)" | none (cites R-31-9) |
| 33 | §6.2(b) Head placement and output modes | KEEP | Matches the code (C2 is the fix for FR-32-11, not this section) | none |
| 34 | §6.2(c) What does NOT change | KEEP | Generation versus relocation boundary | none |
| 35 | §6.2(d) Output shape (canary) | CUT | Point-in-time canary measurement; fold the expected shape (one head `<link>` or `<style>`, 0 body `<style>`) into FR-32-11's "Done when" | none |
| 36 | §6.3 Grid-item defaults cascade | KEEP | Cited by 12 live files | FR-32-12 |
| 37 | §7 Data model | KEEP | `buttonPresets` JSON shape and var derivation; format used by hand-built snapshots | none |
| 38 | §8 Acceptance criteria | CUT | Dated measurements on canary page 2502; each FR keeps its own "Done when" | none (verified FR-32-1/2/3/5/6/8) |
| 39 | §10 Button styling model | KEEP (trim) | Current rule; strip the decision history (D283, D270/D271/D293, "Bean-approved") to the rule itself | none (cites Spec 11 Decision 22) |
| 40 | §11 Design questions answered | CUT | Answered questions; the three answers are current rules and are carried into §10 and FR-32-4 (O7) | none |
| 41 | §11b Enforcement surface (gate roster) | KEEP | All 8 gates exist (checked by `ls`); each names Spec 32 in its docstring | none |
| 42 | §12.0 Why this section exists | KEEP | Palette-role rationale | none |
| 43 | §12.1 Three-bucket rule | KEEP | Framework colour-role rule | none |
| 44 | §12.2 Full palette semantics (no `text-secondary`, slot table) | KEEP (trim) | The 21-slug roster; all 21 hex values match `theme/sgs-theme/theme.json`; drop the client name in the `footer-bg` row | none |
| 45 | §12.3 Current usage by bucket | CUT | Point-in-time call-site list; keep only the grep command, moved into §12.1 | none |
| 46 | §12.4 Deliberate blend pattern | KEEP | Framework rule | none |
| 47 | §12.5 Client palette audit | MOVE-48 | Audit of client snapshots; claim (b) is false today (C6); cited by `check-palette-slug-refs.py` | none |
| 48 | §12.6 Client colour changes | MOVE-48 | Client-value policy and the not-built extractor `border` guard | none |
| 49 | §12.7 Verification method + extractor proof | MOVE-48 (split) | Extractor guard (`palette.py::_synthesise_surface_alt`) moves; the computed-style verification line is general (O8) | none (cites "rule 4a", FR-33-2) |
| 50 | Part B / §13 headings | KEEP | Global styles and theming | none |
| 51 | §13.1 The model | KEEP | WordPress layer merge model | none |
| 52 | §13.2 Per-client source of truth | KEEP (correct) | Cited by `.claude/wp-sgs-cli.md`; its sentence "the extractor overlays the base palette (FR-33-16)" becomes a pointer to Spec 48 | none |
| 53 | §13.3 Hard constraints | CUT | Restates `framework-principles.md` and root `CLAUDE.md` | none (cites R-31-1, R-31-9, R-31-14) |
| 54 | §13.4 Group A: FR-26-A3, FR-26-A4 | KEEP | Push mechanics for every client | FR-26-A3, FR-26-A4 |
| 55 | §13.4 Group A: FR-26-A5 | CUT | A rationale, not a requirement ("no future session builds…"); no live code cites it | FR-26-A5 |
| 56 | §13.4 Group B | KEEP | Raw values, overridable defaults, merged-value reads; B2 is a pointer to Spec 35 (O9) | FR-26-B1, B2, B3, B4, B6 |
| 57 | §13.4 Group D | KEEP (correct D3) | REST write and preset-array strip; D3's shadow names and "no slug overlaps" are wrong (C1) | FR-26-D2, FR-26-D3 |
| 58 | §13.5 Flow | KEEP | Push flow diagram | none |
| 59 | §14.1 What it is | KEEP (correct) | "The extractor (Part D) writes it" is false for 6 of 9 snapshots (C5) | none |
| 60 | §14.2 Target `theme.json` slots | KEEP | The vocabulary a snapshot fills; gains the FR-33-19 "how applied" paragraph and the FR-33-18 runtime paragraph (O3) | none |
| 61 | §14.3 `settings.custom` keys | KEEP | Format; keeps the reserved `header`/`footer` row without the FR-33-13 ID (O2) | none |
| 62 | §14.4 Deployment | KEEP | `prepare_deploy_snapshot`, disk, REST, safety; used by every client push | none |
| 63 | §15.1 Purpose and the iron law | MOVE-48 (correct) | Extractor; the iron law contradicts Spec 48A (C3) | none (cites R-31-9, R-47-7) |
| 64 | §15.2 The process | MOVE-48 | Extractor steps; steps 7-8 become pointers to Spec 32 §14.4 and FR-33-14 | none |
| 65 | §15.3 Requirements FR-33-1 to FR-33-20 | MOVE-48 (see table 2 for O1-O3 exceptions) | Extractor requirements | FR-33-1 … FR-33-20 |
| 66 | §15.4 Known limits | MOVE-48 (correct) | Extractor limits; the README bullet contradicts Spec 48A (C4) | none |

**Row counts: KEEP 48 (2 of them split), MOVE-48 9 (1 split), CUT 9. Total 66.**

---

## 2. Every FR ID

Section names under "Destination" are the current Spec 32 numbers, which the rewrite should keep for cited sections (O6).

### 2a. Defined in Spec 32

| ID | Current section | Verdict | Destination | Files citing (all / live) | Examples (live first) |
|---|---|---|---|---|---|
| FR-32-1 | §4 Component Contract | KEEP | Spec 32 §4 Component contract | 23 / 11 | `.claude/catalogues/tooling.md`; `assets/js/customiser-button-presets-preview.js`; `includes/class-button-presets-customiser.php` |
| FR-32-2 | §4 Component Contract | KEEP | Spec 32 §4 | 6 / 4 | `.claude/specs/02-SGS-BLOCKS.md`; `scripts/check-palette-slug-refs.py`; `src/blocks/button/render.php` |
| FR-32-3 | §4 Component Contract | KEEP | Spec 32 §4 | 1 / 0 | R4 report only |
| FR-32-4 | §4 Override Strategy | KEEP | Spec 32 §4 Override strategy | 79 / 41 | `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`; `.claude/specs/35A-…`; `customiser-button-presets-preview.js` |
| FR-32-4a | §4 Override Strategy | KEEP | Spec 32 §4 | 6 / 2 | `includes/class-sgs-container-wrapper.php`; `src/blocks/card-grid/render.php` |
| FR-32-5 | §4 Design Token Specification | KEEP | Spec 32 §4 Token specification | 5 / 2 | `src/blocks/diagram-dimension/style.css`; `src/blocks/measured-diagram/render.php` |
| FR-32-6 | §4 Design Token Specification | KEEP | Spec 32 §4 | 5 / 1 | `src/blocks/trust-bar/render.php` |
| FR-32-7 | §4 Pipeline Contract | MOVE-48 | Spec 48 (extractor: component presets from the draft) | 1 / 0 | R4 report only |
| FR-32-8 | §4 Pipeline Contract | KEEP (split, O4) | Spec 32 §4 (framework half); route half → new Spec 48 FR | 1 / 0 | R4 report only |
| FR-32-9 | §4 Naming Convention | KEEP | Spec 32 §4 Naming | 6 / 3 | `.claude/catalogues/tooling.md`; `.claude/specs/02-SGS-BLOCKS.md`; `scripts/check-preset-token-naming.py` |
| FR-32-10 | §6.1(d) | KEEP (split, O4) | Spec 32 §6.1(d) (consumption half); extraction half → new Spec 48 FR | 2 / 0 | `.claude/plans/archive/2026-07-09-no-inline-styling-design-gate.md`; R4 |
| FR-32-11 | §4 CSS Output Consolidation (+ §6.2) | KEEP (correct, C2) | Spec 32 §4 + §6.2 | 24 / 17 | `assets/css/extensions.css`; `assets/css/fx-motion-path.css`; `assets/css/fx-shape-routes.css` |
| FR-32-12 | §6.3 | KEEP | Spec 32 §6.3 | 16 / 12 | `.claude/rules/block-editor-controls.md`; `includes/class-sgs-container-wrapper.php`; `includes/helpers-grid-item.php` |
| FR-32-13 | §4 Residual CSS channel | KEEP | Spec 32 §4 Residual CSS | 7 / 5 | `.claude/rules/cloning-pipeline.md`; `.claude/specs/README.md`; `includes/class-sgs-css-registry.php` |
| FR-26-A3 | §13.4 Group A | KEEP | Spec 32 §13.4 Group A | 1 / 0 | R4 only |
| FR-26-A4 | §13.4 Group A | KEEP | Spec 32 §13.4 Group A | 1 / 0 | R4 only |
| FR-26-A5 | §13.4 Group A | CUT | Rationale, not a requirement. Its one fact (no WP-CLI or Ability writes global styles, so the REST endpoint is the surface) folds into FR-26-A3 as one sentence. No code cites it; only the plan names it (as "cut") | 2 / 1 | `.claude/plans/2026-10-10-claude-design-handover-standard.md` |
| FR-26-B1 | §13.4 Group B | KEEP | Spec 32 §13.4 Group B | 1 / 0 | R4 only |
| FR-26-B2 | §13.4 Group B | KEEP (pointer, O9) | Spec 32 §13.4 Group B, one line pointing at Spec 35 | 1 / 0 | R4 only |
| FR-26-B3 | §13.4 Group B | KEEP | Spec 32 §13.4 Group B | 1 / 0 | R4 only |
| FR-26-B4 | §13.4 Group B | KEEP (NOT BUILT) | Spec 32 §13.4 Group B | 1 / 0 | R4 only |
| FR-26-B6 | §13.4 Group B | KEEP (PARTLY BUILT) | Spec 32 §13.4 Group B | 1 / 0 | R4 only |
| FR-26-D2 | §13.4 Group D | KEEP | Spec 32 §13.4 Group D | 4 / 2 | `includes/class-button-presets-customiser.php`; `scripts/push-theme-snapshot.py` |
| FR-26-D3 | §13.4 Group D | KEEP (correct, C1) | Spec 32 §13.4 Group D | 2 / 1 | the plan |
| FR-33-1 | §15.3 | MOVE-48 (correct, C3) | Spec 48 | 14 / 9 | `.claude/catalogues/tooling.md`; `theme-extractor/declared_reconcile.py`; `theme-extractor/extract.py` |
| FR-33-2 | §15.3 | MOVE-48 (correct, C3, C8) | Spec 48 | 7 / 4 | `.claude/catalogues/tooling.md`; `theme-extractor/colour.py`; `theme-extractor/roles.py` |
| FR-33-3 | §15.3 | MOVE-48 | Spec 48 | 11 / 7 | `.claude/catalogues/tooling.md`; `theme-extractor/extract.py`; `theme-extractor/measure.js` |
| FR-33-4 | §15.3 | MOVE-48 | Spec 48 | 12 / 8 | `.claude/specs/01-SGS-THEME.md`; `theme-extractor/extract.py`; `theme-extractor/measure.js` |
| FR-33-5 | §15.3 | MOVE-48 | Spec 48 | 11 / 7 | `.claude/catalogues/tooling.md`; `.claude/plans/2026-10-04-spec47-full-coverage.md`; `.claude/specs/47-…` |
| FR-33-6 | §15.3 | MOVE-48 | Spec 48 | 8 / 5 | `theme-extractor/declared_reconcile.py`; `extract.py`; `measure.js` |
| FR-33-7 | §15.3 | MOVE-48 (correct status, C7) | Spec 48 | 5 / 3 | `.claude/catalogues/tooling.md`; `theme-extractor/schema_validate.py`; `tests/test_extractor.py` |
| FR-33-8 | §15.3 | MOVE-48 | Spec 48 | 5 / 3 | `theme-extractor/colour.py`; `tests/test_extractor.py`; `token_map.py` |
| FR-33-9 | §15.3 | MOVE-48 | Spec 48 | 6 / 4 | `theme-extractor/derive.py`; `palette.py`; `roles.py` |
| FR-33-10 | §15.3 | MOVE-48 | Spec 48 | 3 / 1 | `theme-extractor/token_map.py` |
| FR-33-11 | §15.3 | **O1** (recommend KEEP in Spec 32 §14.4) | Spec 32 §14.4 Deployment; its first sentence (no snapshot-only push of a regenerated palette without a re-clone) → Spec 48 | 6 / 3 | `scripts/push-theme-snapshot.py`; `theme-extractor/extract.py`; `tests/test_extractor.py` |
| FR-33-12 | §15.3 | MOVE-48 (correct, C4) | Spec 48 | 7 / 3 | `scripts/shared_utils.py`; `theme-extractor/extract.py`; `tests/test_freshness_source_hash.py` |
| FR-33-13 | §15.3 | MOVE-48 (O2) | Spec 48; the format fact (reserved empty `settings.custom.header`/`.footer`) stays as the §14.3 row without the ID | 4 / 1 | `theme-extractor/extract.py` |
| FR-33-14 | §15.3 | MOVE-48 | Spec 48 (business-data auto-fill) | 8 / 5 | `.claude/catalogues/tooling.md`; `scripts/business_info/__init__.py`; `scripts/sync-business-info.py` |
| FR-33-15 | §15.3 | MOVE-48 (correct, C4) | Spec 48 | 4 / 0 | `.claude/plans/archive/2026-09-19-front-f-spec33-upgrade.md`; `.claude/reports/2026-09-20-spec33-qc-council.md` |
| FR-33-16 | §15.3 | MOVE-48 | Spec 48 | 1 / 0 | R4 only (also cited inside Spec 32 §13.2, §14.2, §14.3) |
| FR-33-17 | §15.3 | MOVE-48 | Spec 48 | 4 / 0 | archived plan; 2026-09-20 council report |
| FR-33-18 | §15.3 | MOVE-48 (O3) | Spec 48; the `Google_Fonts_Self_Host` runtime paragraph stays in Spec 32 §14.2 | 9 / 7 | `.claude/catalogues/tooling.md`; `includes/class-google-fonts-self-host.php`; `theme-extractor/extract.py` |
| FR-33-19 | §15.3 | MOVE-48 (O3) | Spec 48; the "How the value is applied" paragraph (`SGS_Container_Wrapper` `contentWidth`) stays in Spec 32 §14.2 | 8 / 6 | `.claude/catalogues/tooling.md`; `theme-extractor/extract.py`; `layout-census.js` |
| FR-33-20 | §15.3 | **O1** (recommend KEEP in Spec 32 §14.4) | Spec 32 §14 (dark palette opt-in, derived at push for any client) | 4 / 1 | `.claude/specs/37-HEADER-FOOTER-BUILDER.md` |

44 IDs defined: 14 FR-32, 10 FR-26, 20 FR-33. With the recommended options: KEEP 25 (14 FR-32 minus FR-32-7, plus 9 FR-26, plus FR-33-11 and FR-33-20), MOVE-48 18, CUT 1 (FR-26-A5). FR-33-11 and FR-33-20 move to Spec 48 if Bean takes the literal "Part D moves" reading (O1), giving KEEP 23, MOVE-48 20.

No ID that code still cites is CUT. FR-26-A5's only live citer is the plan, which names it as cut.

Not defined and cited nowhere live (checked with `git grep -n -E "FR-26-(A1|A2|B5|C[0-9]|D1)\b"`, 0 lines): FR-26-A1, A2, B5, C*, D1. The proof script should not expect them.

### 2b. Referenced only (defined elsewhere)

| ID | Where Spec 32 cites it | Defined in | Destination of the citing text |
|---|---|---|---|
| FR-37-10 | FR-33-14 "Depends on" | Spec 37 `#### FR-37-10` | Spec 48 (with FR-33-14) |
| FR-37-11 | FR-33-14 "Depends on" | Spec 37 `#### FR-37-11` | Spec 48 |
| FR-37-15 | FR-33-13 | Spec 37 `#### FR-37-15` | Spec 48 |
| FR-37-16 | FR-33-13 | Spec 37 `#### FR-37-16` | Spec 48 |

---

## 3. Rule and decision IDs

Spec 32 **defines no rule IDs**. `git grep -n -E "\bR-3[23]-[0-9]" -- ':!.claude/archive'` returns 0 lines. It cites these:

| Cited ID | Where in Spec 32 | Defined in | Destination |
|---|---|---|---|
| R-31-1 (DB-first) | §13.3 | `.claude/rules/framework-principles.md` | CUT with §13.3 (it already binds via the rule file) |
| R-31-9 (universal mechanism) | §6.2(a); §13.3; §15.1 | `framework-principles.md` | Spec 32 §6.2(a) KEEP; Spec 48 (with §15.1); §13.3 copy CUT |
| R-31-14 (no legacy fallback) | §13.3 | `framework-principles.md` | CUT with §13.3 |
| R-47-7 (tokens before literals) | §15.1; FR-33-12; FR-33-13 | Spec 47 table (`**R-47-7 Tokens before literals**`) | Spec 48 must carry R-47-7 or name its successor, since all three citers move there |
| "rule 4a" (computed, content-keyed verification) | §12.7 heading | No live definition: root `CLAUDE.md` "Verify the rendered output, not a metric" states it; the "rule 4a" label survives only in `.claude/memory/state-archive.md` and dated reports | Spec 48 (with §12.7); write the rule out, do not cite "rule 4a" (O8) |
| Spec 11 Decision 24 (`D24`) | §3 row 5; §6 key decisions | Spec 11 `**Decision 24:**` | Spec 32 §3, §6 KEEP |
| Spec 11 Decision 22 | §10 | Spec 11 `**Decision 22:**` | Spec 32 §10 KEEP |
| D283, D270, D271, D293 | §10 | `.claude/archive/decisions.md` | CUT (history); §10 states the rule itself |
| Spec 35 D2 (device lock 768/1024) | FR-32-13 | Spec 35 `**D2.**` | Spec 32 §4 KEEP |
| Spec 02 "Composite wrapper rule" | §6.1 intro; §11 row 1; §11b; §6.3 | Spec 02 | Spec 32 KEEP |
| `P-NO-INLINE-GATE-COVERAGE-GAPS` (parked item) | §6.2(a) injector note | LEDGER / plan parking | Spec 32 §6.2(a) KEEP |

**Section citations that must still resolve after the rewrite.** Command: `git grep -n -o -E "Spec 32[^.;,)]{0,4}(§ ?[0-9]+[0-9.a-z()]*|Part [A-D])"`, excluding reports, memory, backups and archive.

| Cited | Live files | Action |
|---|---|---|
| Spec 32 §3 | `plugins/sgs-blocks/CLAUDE.md`; `src/blocks/nav-bar-menu/render.php` | Keep §3 numbered |
| Spec 32 §5 | `scripts/check-style-blob-sanitisation.py` | Keep §5 |
| Spec 32 §6.1, (a1), (b), (c) | about 14 files, e.g. `includes/helpers-box.php`, `helpers-tokens.php`, `check-id-scoped-emits.js`, `custom-css.php`, `check-box-flat.py`, Spec 47 | Keep §6.1 lettering |
| Spec 32 §6.2, (a), (b) | `class-sgs-css-registry.php`, `class-css-output-settings.php`, `sgs-blocks.php`, Spec 35A | Keep §6.2 lettering |
| Spec 32 §12.5 | `scripts/check-palette-slug-refs.py` (historical note on `border-subtle`) | §12.5 moves: repoint to Spec 48 |
| Spec 32 §13.2 | `.claude/wp-sgs-cli.md` | Keep §13.2 |
| Spec 32 §14 | Spec 47 (moving to 48) | Keep §14 |
| Spec 32 Part B | Spec 01, Spec 27 | Keep "Part B" |
| Spec 32 Part C | 8 files incl. root `CLAUDE.md`, Specs 00, 01, 02, 11 | Keep "Part C" |
| Spec 32 Part D | `.claude/specs/01-SGS-THEME.md`; `includes/class-google-fonts-self-host.php`; `theme/sgs-theme/assets/css/type-scale.css`; the plan | Part D leaves: repoint all four to Spec 48 |

---

## 4. Corrections found

Each item gives the evidence command and the output line.

**C1. FR-26-D3 shadow names are wrong, and the "no slug overlaps" claim is false.** D3 says SGS ships `subtle`, `raised`, `floating`, `glow` and that they coexist with WordPress's shadows "because no slug overlaps".
- `python -c "import json;t=json.load(open('theme/sgs-theme/theme.json'));print([p['slug'] for p in t['settings']['shadow']['presets']])"` → `['whisper', 'soft', 'lifted', 'floating', 'crisp', 'long', 'outline', 'grounded', 'glow', 'pressed', 'hard', 'diffuse']`
- WordPress core defaults on the canary (WP 7.1), `grep slug wp-includes/theme.json` over SSH, shadow block → `natural`, `deep`, `sharp`, `outlined`, `crisp`. **`crisp` now collides.**
- The same theme.json read → `settings.shadow` = `{'defaultPresets': False}`. D3 never mentions this flag, but it governs whether core's shadows appear in the picker. Whether "both shadow sets stay" (Bean, 2026-08-07) still holds in the editor is not verified (O10).
- 8 of 9 client snapshots carry the same 12 framework names. `sites/mamas-munches` carries its own 7: `['hard', 'hard-sm', 'hard-lift', 'hard-lg', 'soft', 'diffuse', 'pressed']`.

**C2. FR-32-11's text contradicts §6.2(b) and the code.** FR-32-11 says: a fallback "inline footer `<style>`", a filter choosing `file` or `inline`, "`save_post` invalidates the pointer", and a filename `/uploads/sgs-css/<content-hash>.css`. §5 Security also says "consolidated footer `<style>`".
- `plugins/sgs-blocks/includes/class-sgs-css-registry.php:178` → `return \in_array( $mode, array( 'head', 'inline' ), true ) ? 'head' : 'file';`, with line 177 `// 'inline' is a legacy alias for 'head'.`
- line 147 → `matching link/style) — there is NO pointer, NO cold/warm transition, and NO`
- line 228 → `$url = sgs_css_write_file( 'sgs-' . sgs_css_epoch() . '-' . \md5( $css ), $css );`
- Fix: FR-32-11 states the `file` (default) and `head` modes, head placement, the epoch-prefixed hashed filename and epoch bumps instead of a pointer, matching §6.2(b).

**C3. The extractor's iron law and role-by-usage rule contradict Spec 48A.** §15.1 says "the emitted VALUE is always the COMPUTED value … a source `:root` or base declaration is used only for the token's NAME and ROLE vocabulary". FR-33-2 says role comes from usage context.
- Spec 48A §1: "The draft's code is the primary source. Rendering and measuring supplement it only for what code cannot state".
- Spec 48A file-reader table: "`tokens/*.css` | the theme extractor builds the brand palette from the declared tokens; every other colour stays a one-off hex literal | Spec 48".
- The plan's B4 seed requirement says the same ("instead of guessing roles from usage").
- The extractor reads no token file: `git grep -n -E "tokens/|colors\.css" -- plugins/sgs-blocks/scripts/theme-extractor` → 0 lines; `shared_utils.py::extract_css` docstring → "Concatenate every inline ``<style>`` block (SGS drafts are single-file inline CSS)."
- Both client exports carry the token files: `ls sites/*/handoff/tokens` → `colors.css spacing.css typography.css` (indus-foods, mamas-munches-redesign).
- Effect: FR-33-1, FR-33-2, FR-33-5 and §15.1 are rewritten in Spec 48, not copied.

**C4. FR-33-15, FR-33-12 and §15.4 treat the README as a design input. Spec 48A says it is not.**
- Spec 48A table: "`README.md` | Bean and agents (human guide to the design; not a cloning input, which reads the code)".
- FR-33-15 reads "a README token table beside the draft". FR-33-12's `draft_source_sha256` hashes "the script and the README". §15.4: "A README and the script can disagree". The README part of all three is rewritten in Spec 48.

**C5. §14.1 says every snapshot is written by the extractor. 6 of 9 are not.**
- `python -c "import json,glob;[print(f,'_sgsExtractor' in json.load(open(f,encoding='utf-8'))) for f in sorted(glob.glob('sites/*/theme-snapshot.json'))]"` → True for eye-care-ward-end, indus-foods, mamas-munches-redesign; False for helping-doctors, mamas-munches, sgs-construction, sgs-healthcare, sgs-mosque, sgs-professional.
- §14.1 becomes "written by the Spec 48 extractor for a cloned client, or by hand / from a starter".

**C6. §12.5(b) "No client is missing any framework slug, enforced by `check-palette-slug-refs.py`" is false.**
- Missing-slug check against the 21 framework slugs → `sites\mamas-munches\theme-snapshot.json 25 missing: ['accent-light', 'border-light']`. The other 8 miss none.
- The script checks slug references in code, not client palette coverage: `python plugins/sgs-blocks/scripts/check-palette-slug-refs.py` → `Files scanned: 674   distinct slugs referenced: 25   known slugs: 40`.
- Goes to Spec 48 with §12.5, stated as it is.

**C7. FR-33-7's status line is stale.** It says three golden-comparison tests fail on the Mama's golden.
- `python -m pytest tests/test_extractor.py -q` (from `theme-extractor/`) → `28 passed in 6.04s`.
- `python -m pytest tests -q` → `1 failed, 265 passed`; the failure is `tests\test_font_face_weights.py::test_bakery_fraunces_face_equals_the_committed_snapshot` (`'Fraunces' … '300 900'` != `'Young Serif' … '400'`). It probably compares against `sites/mamas-munches/theme-snapshot.json`, which today's commit 6b4b8c19e culled around; not verified.
- Spec 48 gives FR-33-7 a current status.

**C8. The extractor's slug vocabulary uses `border-subtle`; the framework slug is `border`.**
- `palette.py::BASELINE_SLUGS` comment → "The theme's 16 named palette slugs"; its list includes `"border-subtle"`; `_NAME_ALIASES = {"border": "border-subtle"}`. `roles.py:86` maps border usage to `"border-subtle"`. FR-33-2's table says `border-subtle`.
- Framework theme.json has 21 slugs including `border` and no `border-subtle`. All 9 snapshots carry `border` (none carries `border-subtle`), so a later stage renames it. Where that happens was not traced.
- Spec 48 uses `border` and the 21-slug roster.

**C9. FR-32-7, FR-32-8, FR-32-10 and the §6 diagram assume SGS-BEM drafts.** Their "Done when" lines start from a draft carrying `.sgs-button--primary`. Claude Design exports do not: `grep -rl sgs-button sites/*/handoff --include=*.html | wc -l` → 0 for indus-foods and mamas-munches-redesign. The route halves are rewritten in Spec 48 against `.dc.html` drafts.

**C10. FR-32-3's list of blocks using the hover helper is stale.** It names 7 blocks. `git grep -l "sgs_emit_state_colour_css(" -- 'plugins/sgs-blocks/src/blocks/*/render.php'` → 17: buybox, container, form, google-rating-badge, hero, icon-list, info-box, notice-banner, post-grid, pricing-table, process-steps, product-card, site-footer, team-member, testimonial-slider, testimonial, trust-bar. Replace the list with the grep command.

**C11. The front matter cites Spec 47 and `absorbs: [26, 33]`; FR-32-8, FR-32-10 and §15.1 cite "Spec 47".** Spec 47 is being retired into Spec 48 (plan B4). Every "Spec 47" pointer in the kept text becomes Spec 48.

**C12. §3's last row ("never asking Bean for values") conflicts with intake.** The plan's intake (approach B) builds a structured file "Bean confirms once", and Spec 48A FR-48A-9 has Bean confirm the page map. This row moves to Spec 48 (row 10) and is reworded there.

Checked and correct (no change): all 21 §12.2 hex values match `theme/sgs-theme/theme.json`; all 8 §11b gate files and the helper and gate files named in §6.1 exist; `_USER_LAYER_PRESET_STRIP` holds `spacingSizes`, `shadow.presets` and `typography.fontSizes` as FR-26-D3 says; `SAFE_TARGETS` exists in `push-theme-snapshot.py`; only `container` declares `gridItem*` attributes (§6.3); no computed-route file reads a freshness key (`git grep -i -E "draft_source_sha256|draft_css_sha256|freshness" -- scripts/computed-route` → 0 lines), so FR-33-12's "not built" status holds.

---

## 5. Open decisions for Bean

**O1. Where the snapshot-push requirements FR-33-11 and FR-33-20 live.** Both sit in Part D, which Bean said moves. But both run at push time for every client, including the 6 hand-built ones. FR-33-11 covers backup, rollback, drift warning, advisory restore and Font Library carry-over in `push-theme-snapshot.py`. FR-33-20 is the dark palette derived in `prepare_deploy_snapshot`.
- (a) Keep both IDs in Spec 32 §14.4/§14. The format spec owns everything that ships a snapshot. FR-33-11's first sentence (no snapshot-only push of a regenerated palette without a re-clone) goes to Spec 48.
- (b) Move both to Spec 48 and have §14.4 cite them. A hand-built client's push safety is then documented in the cloning spec.
- **Recommend (a).** It matches "the theme-snapshot.json format stays framework". Code citers (`push-theme-snapshot.py` cites FR-33-11 nine times) keep their IDs either way.

**O2. FR-33-13 split.** It mixes the reserved `settings.custom.header`/`.footer` namespace (format) with extractor acyclicity and the token-map service (cloning). **Recommend:** move the ID to Spec 48. §14.3's existing table row keeps the reserved-namespace fact without the ID. Its only live citer is `extract.py`.

**O3. Framework paragraphs inside FR-33-18 and FR-33-19.** FR-33-18's "Runtime companion" (`Google_Fonts_Self_Host` serves any snapshot entry with `google: true`) and FR-33-19's "How the value is applied" (`SGS_Container_Wrapper` resolves `contentWidth` to the global content and wide sizes) are framework behaviour. **Recommend:** both IDs move to Spec 48. The two paragraphs go into Spec 32 §14.2 without the IDs. `class-google-fonts-self-host.php`'s cite becomes "Spec 48 FR-33-18 / Spec 32 §14.2".

**O4. FR-32-8 and FR-32-10: one ID, two owners.** Each holds a framework half and a cloning-route half. **Recommend:** keep both IDs in Spec 32 with the framework half only. The route halves become new Spec 48 FRs that cite them. No code cites either ID, so nothing breaks.

**O5. FR-32-7: keep a stub or move it.** **Recommend:** move it to Spec 48 whole. Slim Spec 32 says in one line that `{component}Presets` are filled by the Spec 48 extractor for a cloned client or by hand otherwise. No code cites it.

**O6. Section numbering in the rewrite.** "Fresh rewrite" could renumber. About 25 live files cite §3, §5, §6.1(a1)/(b)/(c), §6.2(a)/(b), §13.2, §14 and Parts B/C (section 3 above). **Recommend:** keep those numbers and part letters, gaps allowed, as Part A did when Specs 26 and 33 were merged in. Repoint only the four "Part D" and one "§12.5" citers.

**O7. §11's three answered questions.** Bean listed §11 for cutting. The answers are still current rules: product-card's CTA reuses `buttonPresets` (no `cardPresets`); per-instance override vars are block-scoped (`--sgs-btn-*` and so on); the outline hover border falls back to `primary`. **Recommend:** cut §11 and carry each answer as one line into §10 or FR-32-4.

**O8. §12.7's verification line.** "Verify a colour-role change by computed style, not a source diff" is general. Root `CLAUDE.md` already says it ("Verify the rendered output, not a metric"). **Recommend:** keep one sentence at the end of §12.4 and move the extractor guard to Spec 48. Drop the "rule 4a" label, which has no live definition.

**O9. FR-26-B2 is only a pointer to Spec 35.** **Recommend:** keep it as a one-line pointer so the ID still resolves. The hover-label detail stays marked "not re-verified".

**O10. Shadow sets (follows from C1).** Bean ruled on 2026-08-07 that SGS's and WordPress's shadows both stay. Two facts have changed since: SGS now has 12 presets, one of which (`crisp`) shares a slug with WordPress; and the framework sets `shadow.defaultPresets: false`. **Recommend:** before rewriting D3, open the editor's shadow picker on the canary and record what it offers. D3 then states that, and Bean confirms whether the ruling stands.

---

## 6. Not verified

- What the editor's shadow picker shows with `defaultPresets: false`, and which `crisp` wins (O10). Not opened.
- Where `border-subtle` becomes `border` between extraction and the written snapshot (C8). Not traced.
- Which file `test_bakery_fraunces_face_equals_the_committed_snapshot` compares against (C7).
- Which generator writes `.claude/catalogues/tooling.md`. It cites FR-32-1/9 and FR-33-1/2/3/5/7/14/18/19, so it is regenerated rather than hand-edited when the IDs' homes change.
- `r4-cites-byfile.txt` was not diffed line by line. Table 2 uses today's grep, which counts files where R4 counted hits.
