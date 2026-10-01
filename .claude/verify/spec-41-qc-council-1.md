---
doc_type: verify
spec_id: 41
gate: QA-1 / qc-council #1
plan: .claude/plans/phase-nav-menu-colour-state.md (step 2)
date: 2026-09-11
verdict: GO
---

# QA-1 / qc-council #1 — Spec 41 nav-menu colour/state plan, steps 3–19

**Verdict: GO.** Steps 3–19 as currently written may be dispatched. No step is an unproven
hypothesis; every step cites a spec FR or an owner ruling with a runnable test. All three
named pressure-tests resolve in the plan's favour, confirming the defaults it already chose.

**Disclosure on method:** this run did not use the full 9-stage multi-persona council with
parallel independently-modelled raters voting to a certainty score. It ran as three
Sonnet-model sub-agents dispatched in parallel for the three named pressure-tests
(empirical, tool-verified, not opinion), plus a single inline reviewer (me) reading the
plan's steps 3–19 in full, cross-checking each step's Action/Files/Test blocks against the
live tree, and independently re-verifying one sub-agent's claim by hand where it looked
overstated (see pressure-test (a) below). This is a lighter-weight version of Stage 1–5 than
the full canonical-personas structure — flagged per this task's own instruction to disclose
rather than silently skip the multi-rater shape.

---

## Per-step table, steps 3–19

Legend: **Grounded** = cites a spec FR/owner ruling and carries a runnable
baseline+validation+commit-gate already in the plan's own Test/On-Fail blocks. **Hypothesis**
= fix-shape asserted without a spec citation or without a runnable check.

| Step | Predicted outcome | Baseline command | Validation command | Commit gate | Status |
|---|---|---|---|---|---|
| 3 `SgsBorderControl.showColour` | Existing mounts render byte-identical; `showColour={false}` drops the swatch, keeps `BorderStyleControl` | `grep -rln "<SgsBorderControl" src/` pre-change | same grep + rendered-output diff post-change | G1(d): zero delta on ≥3 mounts | Grounded (FR-41-33) |
| 4 `fx-magnet.css` custom prop | Computed `transition` unchanged | `getComputedStyle` on live magnet element pre-change | same, post-change | G1(e): computed value byte-identical | Grounded (FR-41-31) |
| 5 `SgsColourPanel` heading | Rows without `heading` render byte-identical | render diff on ≥3 callers pre-change | same post-change | G1(a): zero delta | Grounded (FR-41-16) |
| 6 3rd-state PHP emitters | 122 call sites emit byte-identical CSS with 4th param defaulted | `grep -c "sgs_emit_state_colour_css("` = 122, capture output | re-run harness against all 122 shapes | G1(b): zero delta | Grounded (FR-41-3) |
| 6a `suppress_edges` param | Existing `sgs_border_states_css()` callers byte-identical; new key changes only non-resting rules | pre-change harness capture | post-change harness, diff | G1(c): zero delta for callers passing no key | Grounded (owner ruling 1, FR-41-8 v0.4.7) |
| 7 `edit.js` split | ≥7 files, each ≤250 lines; `colourRows` state counts identical pre/post | `node inspector-scan/run.js --check` pre-split | same post-split | Identical per-row state counts (owner ruling 3 atomicity test) | Grounded, and directly dependent on pressure-test (b) — CONFIRMED below |
| 8 `render.php` split | Exactly 4 PHP files, ≤300 code lines each; emitted CSS byte-identical | fixture-attribute CSS capture pre-split | same post-split, diff | Empty diff + `php -l` clean | Grounded, and directly dependent on pressure-test (a) — CONFIRMED below |
| 9 `block.json` rewrite | Every §8.4 attribute present by name; zero deleted-attribute references; no state-map collisions | `python -m json.tool` + attribute grep pre-change | same post-change + G4 distinctness check | Council GO (step 10) + zero deleted-name hits | Grounded (Spec 41 §8) — highest blast radius, correctly gated by QA-5 immediately after |
| 10 QA-5 council #2 | Manifest + reseeded DB agree | DB query pre-reseed | DB query post-reseed | G4/G11/G12 pass | Gate step, not a fix-shape |
| 11 `check-ungated-paint-rules.py` | `--survey` finds all 11 censused rules; `--self-test` fails census #4/#6/#8 and passes cleaned copies | run against pre-fix tree | run `--self-test` | Both directions must fail/pass correctly | Grounded (FR-41-35, reuses FR-41-15 scan) |
| 12 QA-3 | Zero delta on G1(a)-(e) + split parity | (see steps 3-8) | (see steps 3-8) | All five G1 proofs + both split-parity checks pass | Gate step |
| 13 `colourRows` rebuild | Colour panel renders §9.6 table exactly, 3 states + treatment selector per row | `node inspector-scan/run.js --check` before | same after | resolves a state count for every row, ≥2, no upper bound | Grounded (§9.6) — genuinely new behaviour, goal-shaped validation (rendered output matches table), acceptable per Stage 5's goal-shaped form |
| 14 panel rebuild | All §9 panels present, no dead/duplicate controls, `showHover` on `targets` entries | `check-dead-controls.js`, `check-duplicate-controls.js`, `check-empty-inspector-containers.js` pre-existing baselines (0 findings on this block) | same post-change | all four checks pass | Grounded (§9 table) |
| 14a nav-drawer close button | `closeStyle` enum gains `icon-and-text` in both JSON and PHP allowlist; colour attrs untouched | `git diff` on `toggleCloseColour*` pre-change (empty) | same post-change (must stay empty) | both enum lists agree; DB reseed shows both new attrs | Grounded (FR-41-12), scope-match table already verified against real files in the plan itself |
| 15 CSS-emission rewrite | All new attributes emit; resolved (not stored) treatment gates every downstream rule | fixture CSS capture pre-change (n/a — new emission) | `hover-guard/check.js`, `audit-inline-styling.js --check` | both gates pass; sweep-CSS emitted only when predicate true | Grounded (7 FRs cited, each with its own Fail-case test) — largest step but every rule traces to a spec citation, not invented |
| 16 census execution | Zero CENSUSED rows remain on both PHP and CSS surfaces | step 1's re-verified baseline (18 statements) | re-run same scan post-change | `check-ungated-paint-rules.py --survey` reports zero | Grounded (FR-41-15 fate table), explicit two-surface trap named in the step itself |
| 16a QA-7 council #3 | Every DELETE has a two-surface proof; every KEEP has a stated reason | census scan pre-review | census scan post-review | zero censused rows + council GO | Gate step |
| 17 `style.css` companions | Magnet transition, reduced-motion, keyframes — no regression to the reduced-motion rescue | rule audit pre-change | `!important` precedence check post-change | reduced-motion rule still wins under `reduce` | Grounded (FR-41-10/25/31) |
| 18 parent-stays-hovered | 4 rules (mouse+keyboard × bar+drawer fork) | none exist today (new behaviour) | manual DOM interaction + selector-scope check | `:hover`/`:focus-visible` routed through the correct helper, `>` combinator present | Grounded (FR-41-13 verbatim selectors) |
| 19 migration notice | `register_post_meta` on post+page; dismiss deletes record | none exist today (new mechanism) | REST/WP-CLI round-trip of the meta key | dismissal removes persistence; fresh block shows no notice | Grounded (FR-41-34), directly dependent on pressure-test (c) — CONFIRMED below |

**No step in 3–19 is a bare hypothesis.** Every one traces to a spec FR or an already-ruled
Hidden Decision, and every one carries a runnable Happy/Edge/Fail/Integration test in the
plan itself, which is the plan's own internal Stage-5-equivalent validation. The plan has
already been through one `/qc` pass (78→92) and one prior `/qc-council` fold-in per its own
"QC + council closure" section — this council's job was to pressure-test the three named
open questions and the two step-6a/step-7 dependencies, which is what follows.

---

## Pressure-test (a): does the `includes/` require pattern ship and survive two instances?

**Commands run (by sub-agent + direct follow-up verification):**

```
grep -n "copy-php\|CopyWebpackPlugin" webpack.config.js                        → no matches
grep -n "includes/" plugins/sgs-blocks/sgs-blocks.php                          → ~90 explicit require_once lines
grep -n require plugins/sgs-blocks/src/blocks/product-card/render.php         → dirname(__DIR__,3).'/includes/...' (live precedent)
grep -n "function_exists\|class_exists" includes/product-card-builtin-render.php,
     includes/class-sgs-container-wrapper.php                                  → both guard every declaration
```

Follow-up (run directly, because the sub-agent's first pass over-generalised — see below):

```
grep -n "require_once" plugins/sgs-blocks/sgs-blocks.php                       → product-card-builtin-render.php NOT in this list
grep -n "render-helpers|helpers-tokens|helpers-colour-variants|helpers-hover-state" \
     plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes/*.php       → traced the real load chain
```

**Answer: YES on all three sub-questions**, with one correction to the sub-agent's own
diagnostic (fact-checked per this project's `prove-the-cause-before-fix` rule):

1. **`--webpack-copy-php` is irrelevant to whether `includes/*.php` ships** — it only copies
   each block's own `render.php` into `build/`. The `includes/` directory is not a build
   artefact at all; it ships as plain plugin PHP. The real question is whether it's *loaded*.
   There are **two different categories of `includes/` file** in this codebase, and the
   sub-agent's first answer conflated them:
   - **Shared, framework-wide helpers** (`helpers-tokens.php`, `helpers-colour-variants.php`,
     `helpers-hover-state.php`) ARE loaded globally at plugin bootstrap, via
     `render-helpers.php`, which is required by `hover-effects.php`
     (`includes/hover-effects.php:226`), which IS in `sgs-blocks.php`'s bootstrap list
     (line 93).
   - **Per-block private includes files** (`product-card-builtin-render.php`, and the new
     `nav-menu-css.php` / `nav-menu-markup.php` / `nav-menu-submenu-css.php` this plan
     creates) are **NOT** in `sgs-blocks.php`'s bootstrap list at all. They are loaded
     on-demand, per-instance, from their own block's `render.php` — exactly the pattern
     step 8 proposes. This is the correct, established, working mechanism; no addition to
     `sgs-blocks.php`'s loader is needed. The sub-agent's initial claim that "the whole
     includes/ directory ships as-is, loaded once by sgs-blocks.php" was **wrong for this
     category of file** — verified false by grep (`product-card-builtin-render.php` is
     absent from the ~90-line bootstrap list).
2. **`dirname(__DIR__,3)` path arithmetic is correct in both trees.** `src/blocks/nav-menu/`
   and (post-build) `build/blocks/nav-menu/` sit at the same folder depth relative to the
   plugin root, and `product-card`'s identical live call proves it empirically, not just
   theoretically.
3. **Survives a second instance on one page: YES.** `require_once` is path-idempotent, and
   the precedent files additionally guard every function/class declaration with
   `function_exists()`/`class_exists()`. Step 8's prompt already mandates this guard
   explicitly and names the exact fatal it prevents.

**No plan-file fix needed.** Step 8 as written matches the verified-correct mechanism.

---

## Pressure-test (b): does splitting `edit.js` put `colourRows` out of rule 31's reach?

**Commands run (direct):**

```
grep -n "31-golden-colour-control\|edit.js\|src/components" scripts/inspector-scan/run.js
  → line 45-50: comment history "src/components/*.js is the ONE corpus no rule could reach"
                COMPONENTS_DIR = path.resolve(__dirname,'..','..','src','components')
  → line 256:   const editFile = path.join( BLOCKS_DIR, entry.tail, 'edit.js' );
  → line 257:   if ( ! fs.existsSync( editFile ) ) continue;
```

**Answer: YES — moving `colourRows` to a block-folder sibling module WOULD break the
detector.** The corpus is hardcoded to exactly two things: each block's own `edit.js` (built
from `BLOCKS_DIR + entry.tail + 'edit.js'`, a fixed filename, not a glob) and the single
fixed `COMPONENTS_DIR` (`src/components/`). There is no third path. A sub-module living
beside `edit.js` in the same block folder (e.g. `ColourControls.js`) is in neither corpus —
an imported `colourRows` would resolve to nothing and every row would silently score zero
states while the editor renders correctly. This is exactly the D738 "code improved, gate
went blind" failure the plan already names.

This **confirms owner ruling 3 empirically** (previously a static read; now proven against
the real `run.js` source, not inferred). Steps 7, 13 and 14 are all written consistently
with this: step 7's prompt explicitly forbids moving `colourRows` out of `edit.js` and
requires a before/after `inspector-scan/run.js --check` diff showing identical per-row state
counts; step 13 restates the same constraint and the same test; step 14 explicitly repeats
the prohibition a third time. **No plan-file fix needed.**

---

## Pressure-test (c): is `register_post_meta` on `post`/`page` reachable from `useEntityProp`?

**Commands run (by sub-agent):**

```
grep -rn "register_post_meta" plugins/sgs-blocks/ theme/ --include=*.php
  → class-configurator-meta.php (product_variation, product)
  → class-sgs-template-part-meta.php (wp_template_part)
  → none target post or page
grep -rn "useEntityProp" plugins/sgs-blocks/src/ --include=*.js
  → exactly one usage: product-variation-sets/index.js, postType = sgs_product
```

**Answer: YES, reachable — this is standard WordPress core-data/REST behaviour, independent
of post type.** There is no structural reason `post`/`page` would behave differently from
the plugin's existing `sgs_product`-family registrations, provided `show_in_rest` is set
truthy on the registration (both `post` and `page` already expose `show_in_rest => true` by
core default at the post-type level). The only registrations in this plugin that are NOT
REST-reachable (`product`, `wp_template_part`) are ones that deliberately set
`show_in_rest => false` — a chosen config, not a `post`/`page` limitation.

The one real gap is exactly what step 19's own prompt already discloses: **the IDIOM is
precedented (the `useEntityProp('postType', postType, 'meta')` shape, copied from
`product-variation-sets`), the REGISTRATION on `post`/`page` specifically is not** — this is
new work, correctly scoped as such, not a hidden risk. **No plan-file fix needed.**

---

## Overall verdict: GO

Steps 3–19 may be dispatched as currently written. All three named pressure-tests confirm
the plan's own chosen defaults (owner rulings 1–7) rather than contradicting them. The one
finding worth carrying forward (not a plan-file defect, just a fact for the record): the
`includes/` bootstrap-loading distinction between shared helpers and per-block private
files, documented above under pressure-test (a), in case a future step's author assumes
`sgs-blocks.php`'s loader needs a new line — it does not, for this category of file.

No NO-GO items. No plan-file revision required before dispatching steps 3–19.
