---
doc_type: prompt
title: Tier-object migration — Phase 3 remainder
created: 2026-09-07
governs: plugins/sgs-blocks/includes/media/atoms/, plugins/sgs-blocks/scripts/migrate-border-radius-render.py
retention: delete once consumed
---

# Tier-object migration — Phase 3 remainder

Invoke `/autopilot` first. Check `ListAgents` and `git status` — this tree runs many
concurrent sessions on `main`.

**This file replaces `2026-09-06-tier-object-phase-3-remaining-work.md`, deleted 2026-09-07.**
That version cited two commit SHAs that exist but sit on no branch, stated a pytest baseline
that no longer holds, and scheduled work another session is already doing. Every correction is
folded in below.

## First action

Read `.claude/memory/sdd-progress.md` — under a minute, no dependencies. Two entries there
record work this track's docs do not: the border-radius plan's Task 1 (merged, branch since
deleted) and the 2026-09-07 live verification. Deferred work on this project hides in that
ledger, not only in prompts and plans.

## Ground truth, verified 2026-09-07

**Groups 0 and 1 shipped and reached `main`.** All 32 blocks carry an owned tier-object
`padding`/`margin`; none declares `supports.spacing`. Verified by parsing all 83 block.json,
not by sampling.

⚠ **Cite `9636f0129` and `4fc89797e`, never `65f7abf02`/`c4d9cc6d8`.** The latter pair exists
as git objects but sits on no branch — a rebase rewrote them. `git cat-file -e` says they
exist, so a casual check passes; only `git merge-base --is-ancestor <sha> main` distinguishes
"exists" from "is in your history".

**Group 0's fix is live-verified.** Canary page 3355 carries a container with only padding set
— no gap, no maxWidth, the exact shape that rendered nothing before `abf301700`. It emits:

```css
.sgs-container-0039b425{padding-top:37px;padding-right:23px;padding-bottom:37px;padding-left:23px;}
```

Two traps that each produce a false pass:
- **Padding emits as longhand.** Grepping `padding:37px` finds nothing and reads as clean.
  Match `padding-top`.
- **`sgs/text` declares no `content` attribute.** WordPress silently discards it (D338) and the
  block never renders. Build probe markup from the block's own `block.json`, never from memory.

**Page 3355 is the canary's probe page.** Reuse it. Its absence is why these claims sat
unverifiable through two earlier passes.

## Priority 1 — finish the live check (3 of 4 parts remain)

The deploy happened 2026-09-07 (349s, all gates green, both cache layers purged) and Group 0's
base case is proven above. Three checks remain. **Skip the pre-fix negative control — Bean ruled
it irrelevant 2026-09-07; confirming the current behaviour is the whole requirement.**

1. **`sgs/accordion`** — reads `attributes.padding` directly. Set padding and margin at desktop,
   tablet and mobile independently. Confirm three distinct `@media` rules matching each tier.
2. **`sgs/button`** — destructures padding into a local variable. Same three-tier check. This is
   a genuinely different code path from accordion; the codemod's author found five real regex
   bugs across these two shapes, so proving one proves nothing about the other.
3. **`sgs/table-of-contents`** — check the **editor canvas**, not the frontend. It took a hand
   edit because `buildRootPreviewStyle()` read `style?.spacing` with no `attributes` parameter.
   A frontend check cannot detect that regression.

Nothing above needs a deploy. Add blocks to page 3355 or make a second probe page.

## Priority 2 — mediaPadding shared atom (2 blocks)

`includes/media/atoms/media-padding.php`'s `sgs_media_atom_media_padding_css()` hand-reads three
flat keys (`Padding`/`PaddingTablet`/`PaddingMobile`) and never normalises them — Group 0's bug
shape exactly. Its JS twin `src/components/media/atoms/media-padding.js` writes the same flat
trio. `box_family='mediaPadding'` in the DB confirms the attribute is meant to be tier-capable.
Affects `sgs/hero` and `sgs/media` only.

Fix: PHP reads through `sgs_responsive_normalise_object($attributes[$attr] ?? null, true)`,
matching Group 0. JS swaps `<ResponsiveBoxControl>` for `<ResponsiveOverride>` + `SgsBoxControl`,
writing via `patchTier()`. block.json folds the flat trio into one owned tier object per prefix.

**Check `migrate-box-control-wiring.py`'s `POST_REDIRECT` and `LEGACY` matchers before writing
anything by hand.** The media-atom naming convention (`mediaStoredAttrName()`) may need that
regex adapted rather than reinvented. Two blocks is small enough to hand-verify.

## Priority 3 — border-radius: one block left, plus a compliance gate

**Most of this shipped while the old prompt still listed it as pending.**
`.claude/plans/2026-09-06-border-radius-render-fix.md` Task 1 ("Fix the 4 blocks + extend the
guard gate") is merged to `main` as `5bb246df4` + `fab4f92ac`. Its branch was deleted after
merge, so it leaves no trace in `git branch`; the SDD ledger
(`.claude/memory/sdd-progress.md`) is where that history lives.

Verified by parsing block.json 2026-09-07:

| Block | State | Action |
|---|---|---|
| `accordion`, `container`, `product-card`, `icon-list` | Declare tier-object `borderRadius`; no flat siblings | **Done.** Task 1 fixed these |
| `whatsapp-cta` | Declares `borderRadiusTablet`, does **not** declare `borderRadius`. Its `render.php:147-148` reads the flat siblings — those reads are LIVE and correct for its current schema | **The only block left.** It is unmigrated, not broken — migrate it, don't "fix" it |
| `label`, `mega-panel` | Single flat scalar by design (Spec 32 §6.1(c), not a 4-corner family) | **Out of scope.** Reclassify as `NOT_APPLICABLE` so they stop reading as unfinished |
| `media` | Radius belongs to the `box-shape` atom | See "Deliberately not in this prompt" |

⚠ **`--survey` cannot tell you what is left.** Run today it returns `UNCLEAR` for 46 of 51
blocks — including all four already fixed. It does not discriminate, so never treat a block's
`UNCLEAR` as evidence of pending work. Check `block.json` for whether `borderRadius` is declared
and `borderRadiusTablet` is not; that is the real signal. Fixing the classifier so `--survey`
means something is worthwhile in its own right.

**Also outstanding: that plan's Task 2 ("Live verify + deploy").** The deploy half happened
2026-09-07. The live verification did not.

**Then the compliance gate — but settle one question first.** Before building a new gate, check
whether `check-box-family-guard.py` already covers this. Its docstring claims it handles "any
newly-added per-device box attribute… keyed off `box_family`… including 4-corner box families:
border-radius." If that holds, extend it; a second overlapping gate is unfalsifiable — you could
never tell which one caught a regression.

If a new gate is genuinely needed: mirror the baseline-diff pattern (stable dedup key,
hash-verified baseline, fail only on NEW findings), key off the `box_family` DB column, never a
name regex, and ship with an empty baseline. **Wire it into `scripts/gates.json` in the same
commit that creates it.** This project has built gates and left them unwired three times
(D338, D493, D643). Confirm with `npm run gate:list`.

## Priority 4 — media-atom migration, pilot first

Pilot `splitMediaObjectPosition` on `sgs/hero` — one consumer, lowest blast radius — through the
full chain before generalising:

1. Fold the three flat strings in block.json into one `{desktop,tablet,mobile}` object.
2. `focal-point.control.js`: replace the three-key `mediaStoredAttrName()` read/write with
   `attributes[baseKey]?.[tier]` and `patchTier()`.
3. Fix the render.php read.
4. Add a fixture to `sgs-update-v2.py`'s `_self_test_is_responsive`. The heuristic has been
   wrong twice in this project's history — never trust it by analogy.
5. Confirm `check_flat_tier_regression.py` stays quiet on the mid-migration state.
6. Live-check the canary: a real `@media` rule for the migrated tier, plus a desktop-only
   control confirming no spurious tablet rule appears.

Generalise only once that property is fully green, to `thumbnail`, the six video-toggle
booleans, `splitMediaType`, and `splitMediaWidth`.

`splitMediaPadding` and `splitMediaBorderRadius` on `sgs/hero` are already tier-object — verified,
do not re-migrate. `mediaPadding` is Priority 2 and is **not** done, despite an earlier note
claiming otherwise.

**After generalising,** extract the four duplicated inherit-cascade implementations
(`BooleanResponsiveControl.resolveEffective()`, `focal-point.control.js`'s
`resolveInheritedPosition()`, `object-fit.control.js`'s `resolveInheritedFit()`,
`MediaOverlayControls.js`'s `resolveInheritedOpacity()`) into one shared resolver — exported this
time.

## Deliberately not in this prompt

**Box-shape border-radius (the old Priority 4).** Another session owns
`box-shape.control.js`, `box-shape.php`, `box-shape.css` and `MediaBoxShapeControls.js`. It
committed `e76586a9e` (hover/gradient border) to those files on 2026-09-07 while this track was
being audited. **Ask that session what landed before scheduling any radius work there.** Its
scope differs from the old Priority 4's, so the work may still be needed — or may now be folded
in. Do not open those files on a guess.

**Stale-comment cleanup.** Done — `05d8b6aa0`, comment-only across 22 blocks.

## Corrections to carry

- The old prompt claimed `migrate-box-control-wiring.py` carries self-test fixtures for two
  regex bugs. **It has no `--self-test` mode at all**, despite its docstring advertising one.
  The claim has no evidence trail. `redirect-native-spacing-reads.py`'s fixtures are real.
- The old pytest baseline ("2 pre-existing failures in `test_variant_detect.py` /
  `test_array_content.py`") no longer holds. Re-measure before treating any failure as expected.
- `ContainerWrapperControls` never touched padding or margin. The component actually deleted was
  `ResponsiveSpacingPanel`, retired in `0e6209e6d` on 2026-08-10.

## Guardrails

- **A codemod's `--check` passing does not prove its output is correct.** This migration's own
  history contains five real regex bugs that passed self-checks. Read a sample of the files it
  touched.
- **D983 (2026-09-07): no PRs, no stashes, integrate after every task.** Commit to `main`,
  path-scoped.
- **Never `git stash`. Never `git checkout --` a file.** Both have destroyed peer work here.
- **Path-scope every commit** — the gate refuses a bare `git commit`, and a `*/render.php` glob
  once swept another session's half-finished edit onto `main`. No globs.
- Re-check `git branch --show-current` in the same command as the commit.
- **Never fabricate a live-verification pass against a stale target.** Deploy first, or say so.
- **Never add a parking.md entry without asking Bean first.** Every time.
- Spec 32: no block renders an inline `style=` property declaration.
- No version bumps, no deprecations — pre-production (D293).

## Tools

| Tool | Use |
|---|---|
| `migrate-border-radius-render.py --survey` | Current Pattern A/B/UNCLEAR split |
| `check-box-family-guard.py --check` | Box-family conformance; read its docstring before building a second gate |
| `migrate-box-control-wiring.py --check --property padding` | Confirms no flat-trio blocks remain |
| `node scripts/inspector-scan/run.js --json` | Finding census; take a baseline before editing |
| `sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE box_family=..."` | DB ground truth before any "missing X" claim |
| `build-deploy.py --target sandybrown --blocks-only` | The one deploy path |

## Skills and agents

| Route to | When |
|---|---|
| `/autopilot` | First, always |
| `wp-sgs-developer` | All block work |
| `/systematic-debugging` | Any regression — cause before fix |
| `/dispatching-parallel-agents` | Priorities 2 and 3 touch disjoint files and can run together |
| `/sgs-db` + `/wp-blocks` | Schema ground truth |

## Hand back if

- The box-shape session's answer shows the old Priority 4 overlaps live work.
- `check-box-family-guard.py` turns out to cover Priority 3's gate — that is a scope decision,
  not a licence to build a second gate anyway.
- The `--survey` split differs sharply from Priority 3's table. Re-verify before assuming a
  regression.
