# Fact-check of QS-A-tasks.md

Paths: spec = `.claude/specs/49-SGS-MEDIA-SYSTEM.md`, reports = `.claude/reports/2026-11-09-media-controls/` (both under `E:/sgs-tmp/wt-media`).

## Gap 1 evidence (atoms, PHP twins, CSS, generator)

| What | Spec 49 says | Exists in `plugins/sgs-blocks/`? |
|---|---|---|
| `includes/media/atoms/*.php` | §6.1: "The existing media atoms are extended, not replaced ... and a PHP twin (`includes/media/atoms/*.php`)". §6.9: "The media atoms, their registry, generator and parity gates / Extend". WP-2b: "Each atom's PHP twin printing real properties". §8.2 does not list them. | Yes, 15 files (box-shape.php ... video-behaviour.php) |
| `assets/css/media-element.css` | Zero matches in the spec. WP-2a names only "`media-base`, `-overlay`, `-video.css`". | Yes |
| `assets/css/media-atoms/*.css` | Zero matches for the path. Only `scripts/generate-media-attributes.mjs` (C8) appears ("`_generated: "media-atoms"`"). | Yes, 16 files incl. `_base.css` |
| `scripts/generate-media-stylesheet.mjs` | Zero matches in the spec. | Yes |
| `SGS_Media_Element` | §6.9 "Extend / The one renderer (§7)"; FR-49-7 "`SGS_Media_Element` extended"; WP-2a. | Yes (`includes/class-sgs-media-element.php`) |

Quotes: T3 (`T3-shared-php-css-data.md`) §1 table: "replace | 3 | CSS: `media-element.css`, `media-atoms/*` (16 files counted once), generators" and "delete | 31 | 15 atom PHP twins, 9 other PHP, 2 generators ...". T3 §2.1 row for `class-sgs-media-element.php::SGS_Media_Element`: "Delete." T3 atoms row: "Delete all 15". AT §5 preamble (`AT-atom-block-matrix.md`): "Spec 49 section 8.2 deletes `includes/media/atoms/*`, `SGS_Media_Element`, all `sgs_media_element_*` and `media-element-attrs-register.php`."

## Table

| ID | Verdict | Evidence (quote + location) | Note |
|---|---|---|---|
| R1 Rule: writing-clearly skill, no bloat (Partly) | VALID | `wc -c` spec = 86102 bytes; brief: "Load /writing-clearly-and-concisely and apply it to everything written for Bean and to the spec: short, exact, no bloat" | Loading cannot be checked from files; length claim true. |
| R2 Do not build until approval (Done) | VALID (evidence exists) | Spec header: `status: draft`; v0.5 "awaiting Bean's approval" | |
| R3 Sonnet subagents write files (Done) | VALID (evidence exists) | Reports T1 to T11, C1 to C5, Q1 to Q3, A1 to A4, AT all in folder | |
| R4 Scrutinise existing code (Partly) | VALID | T10 Counts: "Not run, no fixture: 30"; T10 table has 28 rows reading "not run: no fixture" | Count is 28 table rows / 28 named entries, stated as 30 (see 1d(ii) row). Gap is real either way. |
| 1a every block found by grep and DB (Partly) | PARTLY VALID | T1 §0: "`grep -rn BackgroundPanel plugins/sgs-blocks/src --include=*.js` ... plus DB query"; T2 Part A: "every `block.json` in the worktree (374 files; 100 are real blocks) ... a name filter on attributes ... a per-block grep of `render.php`". DB query for media-named attrs (`image/video/media/svg/bgVideo/poster/photo/avatar/thumb/embed`) over the 27 blocks in my broad query that T1/T2 never name returned `(no results)` | Claim that no all-blocks grep/DB method is cited is wrong: T1+T2 together cite one and cover every media-bearing block. True only that the spec itself has no DB-derived master list. |
| 1a what it has today (Partly) | VALID | `P-proposal.md` "What changes for each block" has columns "Blocks / What changes / Specialised controls that stay" | No "today" column in proposal. |
| 1a exactly what changes (Partly) | VALID | Proposal row: "Team, testimonial, before-after, ... measured diagram \| Adopt the system with only the settings each needs" | Quote matches claim. |
| 1a end shape (Partly) | VALID | Same proposal table has no attributes/markup; spec §8, §13 hold attributes | Not independently checked per block in §13. |
| 1a specialised controls with reason (Partly) | VALID | Proposal column "Specialised controls that stay" lists names only | No reason column. |
| 1a / 1e merge per-block detail into spec (Partly) | VALID | Same evidence as above; T1/T2 hold "today" | |
| 1b shared files of every kind (Partly) | VALID | Proposal "What happens to shared files": four rows Keep / Rework / Extend / Delete with categories. Spec §8.2 lists selected names | |
| 1b keep/rework/replace/delete per file (Partly) | VALID | T3 §1 gives per-file verdict counts; proposal has category rows only | |
| 1b consistency (Not done, conflict) | PARTLY VALID | Spec §6.1 "extended, not replaced"; §6.9 "`SGS_Media_Element` / Extend"; T3 §1 "delete ... 15 atom PHP twins ... 2 generators", T3 §2.1 "Delete."; AT §5 "Spec 49 section 8.2 deletes `includes/media/atoms/*`" | The conflict between T3 and the spec is real, as is the spec's silence on `media-element.css`, `media-atoms/*.css` and `generate-media-stylesheet.mjs` (grep: 0 matches each). But QS-A's wording that AT reports what the spec does is itself false: spec §8.2 does NOT list `includes/media/atoms/*` or `SGS_Media_Element` (its list is `sgs_tier_media_render ... includes/image-controls.php ...`). AT mis-cites §8.2; the spec is self-consistent (keep/extend twins, WP-2b "Each atom's PHP twin printing real properties"). QS-A's statement "spec ... disagree" should read: T3 and AT disagree with the spec. |
| 1b DB tables (Partly) | VALID | Spec §8.1 "no new DB column" (line ~405: "`css_element` carries the node names ... no new DB column") | |
| 1c research from all named sources (Partly) | VALID | T5 header "Not verified"; T6 columns "Elementor / Bricks / Webflow / Framer ... Not verified" | |
| 1c "/gh-research" (Not verifiable) | VALID | `grep -i gh-research` across the folder: only the brief and QS-A mention it; `F-github.md` exists | |
| 1c reason, "what SGS already has" (Partly) | VALID | Spec §9.3 columns "Control \| Kinds \| Condition"; proposal Controls columns "Setting \| Control \| Modelled on". T5 columns include "Why", "What SGS already has", "Not verified" | |
| 1c state what could not be verified (Partly) | VALID | Proposal Controls table has no "Not verified" column; T5/T6 do | Proposal has a closing "where a proven model exists and where it does not" paragraph, which partly covers it. |
| 1c favour non-technical (Done) | VALID (evidence exists) | T5 header: "Recommended ... what a non-technical client will find most obvious" | |
| 1d(i) target first, per media type (Partly) | VALID | T7 §1 rows are per effect, not per media type (Entrance, Parallax, ..., "Embedded video"); T7 "Not verified" present | Thin Framer/Bricks reading not rechecked. |
| 1d(i) all builders covered (Partly) | NOT VERIFIED | Did not re-read T7 "Sources read" in full | |
| 1d(ii) audit and run (Partly) | VALID | T10 Counts: "Works: 32 ... Partly works: 3 ... UNANSWERED: 1 ... Not run, no fixture: 30" | Half-not-run claim is true. |
| 1d(ii) count 28 vs 32 | PARTLY VALID | T10 Counts "Works: 32 (...)" but the parenthesised list holds 28 names; settled: proposal's 28 is correct | QS-A's "one is wrong" is right, but the wrong one is T10's 32 (a slip), not the proposal. Also T10's "no fixture: 30" has only 28 table rows and 28 named entries. |
| 1d(iii) gap table (Partly) | PARTLY VALID | Spec §10.5 has 12 rows; brief: "marked built and good, built but needs rework, or missing" | Count 12 and the vocabulary point are true. But claim "scroll transforms, text effects, cursor effects ... have no row" is partly wrong: §10.5 row "Follow pointer, magnet, sheen, glare, ripple, cursor field" covers cursor effects; T7 has no text-effects target row at all. T7 targets with no §10.5 row: Scroll transform (opacity/blur/scale/rotate), 3D tilt, Click effects/Lottie, Fixed-attachment background (4 of 17 T7 rows; Hover lift, Entrance, Image hover zoom, Grey, Sticky, Horizontal scroll, SVG animation, Embedded video, Background video, Marquee, Float, Ken Burns, Parallax map to rows). |
| 1d(iv) general effects to add (Partly) | NOT VERIFIED | Did not audit §10.1 / §10.4 for a "general effects" list | |
| 1d(iv) how panels fit (Done) | VALID (evidence exists) | Spec §10.1 "How the panels fit" exists (heading under §10.1 in grep) | Not re-read. |
| 1e merge into spec (Partly) | VALID | See 1a/1b/1c rows | |
| 1e proposal has five parts (Partly) | VALID | `P-proposal.md`: "What changes for each block", "What happens to shared files", "Controls", "Motion", Cut list line 55 | |
| 1e tell Bean what you cut (Done) | VALID (evidence exists) | `P-proposal.md` line 55: "Cut: uploaded mask shapes, a different media type per device, tile `space` and `round` ..." | |
| 1e councils run (Partly) | VALID | `grep -il "council\|NO-GO"` over folder: only `P-proposal.md` (a pointer: "C councils, Q browser and code proofs"), `QS-A`, `T9`. Spec `status_history` v0.5 never mentions councils. No file synthesises C1 to C5 or Q1 to Q3 into findings, changes made, verdict | Individual C/Q files exist; no synthesis file exists. (R1 to R5 are earlier-version reviews, not a synthesis.) |
| 1e read spec in full, v0.3/v0.4 changes (Partly) | PARTLY VALID | Q1 header "Spec 49 v0.5 sections 7.1, 7.2, 7.4"; Q3 row "§7.5 `icon-shapes.json` extends without breaking readers \| FAIL as written" | Claim "§7.5 and §7.9 get no dedicated rater among Q1 to Q3" is wrong for §7.5 (Q3 tests it). §7.9 not checked. |
| 1e approval question (Not done in files) | VALID | `grep -i approv P-proposal.md`: only line 1 title "the proposal for Bean's approval"; no question | Matches settled note that it was asked in chat. |
| Ruling: per-device files stay (Done) | VALID (evidence exists) | Proposal text per QS-A; not re-opened | |
| Ruling: atoms per atom (Partly) | PARTLY VALID | Spec §6.2 table has verdicts Extend/Fold/Keep/New for each atom, none "Delete" except via fold | "Delete verdict never used" true (Fold only). AT/T3 disagreement: see 1b row. "Whether atoms work across all blocks mostly unknown" not rechecked; spec §6.1 claims "no atom fails on any block that declares it (AT: 20 blocks, 51 element-and-atom rows, run in code and on live pages)", which QS-A does not address. |
| Ruling: Hover/Entrance library (Done) | VALID (evidence exists) | Spec §10.5 first row: "Hover library (31 presets) and Entrance library (80 presets), with Fine-tune" | |
| Ruling: mask shapes first release (Partly) | VALID | Brief ruling: "Mask shapes ship in the first release." Spec Non-goals: "uploaded mask shapes"; `T-merge-decisions.md`: "Uploading a mask shape \| Deferred" | The reading (preset shapes only) is told to Bean in the proposal Cut list, so "state the reading" is already met in the proposal. |
| Ruling: archetype models (Done) | VALID (evidence exists) | `A1` to `A4` present | |
| Opening scope: cut/defer (Done) | VALID (evidence exists) | `T-merge-decisions.md` "Cut or simplified" | |
| Rulings final (Done) | VALID (evidence exists) | Spec `status_history` v0.3: "circle is a shape, duotone and Lottie left out, videos play on phones" | |
| Dropped 1 (grep and DB) | PARTLY VALID | As 1a row: T1 §0 and T2 Part A cite grep/DB; no media-bearing block missing | Mega-panel is covered: spec line ~576 puts "mega panel cards" under fixed thumbnails, not slots. |
| Dropped 2 (end shape narrowed) | VALID | See 1a end shape | |
| Dropped 3 (1c columns dropped from spec/proposal) | VALID | See 1c rows | |
| Dropped 4 (run them, 30 of 66 rows) | PARTLY VALID | T9 line 77: "60 rows"; T10 Counts 32+3+1+30 = 66 | "66" is T10's tally; T9 inventory is 60 rows. 28 table rows, not 30, read "not run: no fixture". |
| Dropped 5 (gap table narrowed) | PARTLY VALID | See 1d(iii) | |
| Dropped 6 (approval question) | VALID | See 1e | |
| Dropped 7 (mask shapes presets only) | VALID | See ruling row | |
| Gap 1 (atoms/twins conflict) | PARTLY VALID | See Gap 1 evidence table and 1b row | Real conflict between T3 and the spec, and the spec is silent on atom CSS, `media-element.css` and the stylesheet generator. Wrong detail: AT §5's claim that §8.2 deletes atoms/SGS_Media_Element is a mis-citation, so the spec does not "disagree with itself"; "Must be settled" stands. |
| Gap 2 (1a per-block detail only in T1/T2) | VALID | Proposal block table (9 rows, no "today"/"end shape"); T1/T2 hold detail | |
| Gap 3 (1c columns) | VALID | See 1c row | |
| Gap 4 (30 never run; gap table; 28 vs 32) | PARTLY VALID | See 1d rows | 28 vs 32: the 32 is the slip; 30 vs 28 table rows; gap table 12 rows is true; some "no row" examples are wrong. |
| Gap 5 (no approval question; no council synthesis; "in full" asserted) | VALID | See 1e rows | "In full" is not evidenced, as stated. |

## Summary

- VALID: 29 (incl. Done rows whose evidence exists); PARTLY VALID: 11; WRONG: 0; NOT VERIFIED: 2.
- PARTLY VALID: 1a block-grep claim and Dropped 1 (T1+T2 do cite grep/DB, no block missed); 1b consistency and Gap 1 (AT mis-cites §8.2; spec itself says extend); 1d count row (the 32 is the slip); 1d(iii) and Gap 4 (cursor effects have a §10.5 row; 4 T7 targets truly lack one); Dropped 4 (28 rows not 30); 1e "in full" row (§7.5 is tested by Q3); atoms ruling row.
- NOT VERIFIED: 1d(i) all builders, 1d(iv) general effects list.
