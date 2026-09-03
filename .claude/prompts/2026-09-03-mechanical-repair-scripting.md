# Mechanical repair scripting — exploration

**Written 2026-09-03.** Supersedes `2026-09-03-golden-colour-continuation.md`, deleted in the
same commit. Invoke `/autopilot` first.

## First action

Invoke `/autopilot`, then `/brainstorming explore` (topic: mechanical repair scripting, see
below). Do not read further into this file to find a build task — there isn't one. This is an
exploration prompt.

## Mandatory READING

1. The "What actually happened today" section below, in full — it's the evidence base, not
   background colour.
2. `.claude/LEDGER.md`'s "▶ COLOUR TRACK" section — current state of everything this prompt
   references.
3. `plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" section (added this session) —
   needed context for any shape involving colour/gradient emission.

## Tool bindings

| Need | Tool |
|---|---|
| Re-check a colour-conformance row's real state | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` against `sgs-framework.db` |
| Re-run the existing scripted repair (read-only) | `node plugins/sgs-blocks/scripts/colour-codemod/fix.js --fix` (dry run, no `--apply`) |
| Re-check the text-gradient backlog count | `node plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` (or re-run the manifest query documented in D928) |
| Live-verify any shape's actual rendered CSS | Deploy to sandybrown canary + read `uploads/sgs-css/`, never raw page HTML |

## Start in `/brainstorming explore` mode — not design

Bean's explicit instruction: open with `/brainstorming explore` and stay there. Do not converge
on a scripting approach until an exit phrase is given. The frustration behind this session:
*"the inefficiencies and awful lack of progress made in full opus and sonnet sessions is just
absurd"* — hand-fixing recognisable defect shapes one at a time, across many agent dispatches,
took a full session. The open question worth exploring, not yet answered: **given a defect
shape is now recognised, what turns that recognition into a scripted, batchable repair — and
where does that stop being safe?**

## What actually happened today — read this before exploring, it's the evidence base

A colour-hover/gradient migration across 5-7 blocks (`google-reviews`, `modal`, `form`,
`pricing-table`, `option-picker`, `card-grid`, `brand-strip`, `post-grid`) plus a DB-writer bug
fix, landed across these commits (most-recent-first):

- `2ad141986` — ran `scripts/colour-codemod/fix.js --fix --apply` (the ONE existing scripted
  repair in this codebase for a recognised colour-conformance shape). It passed `php -l`, JSON
  validation, and the full 86-gate build chain. **Live DOM verification then found 3 of its 6
  applied rows were actually broken** — a selector collision (two attrs both writing into one
  shared decls array), a missing-OR-condition in a gate (`if ($flat)` should have been
  `if ($flat || $gradient)`, so a gradient-only value emitted zero CSS), and a mis-inserted block
  (one attribute's handling landed inside a completely unrelated element's code path). None of
  these were caught by the tool's own self-test, by static linting, or by the full gate chain —
  only a real deploy + reading the actual lifted CSS caught them.
- `9f2851150` — a genuine DB-writer bug (found via `/qc-council`, two independent raters,
  cross-checked against a working comparator block before any fix was proposed): a reset-list
  omission that let a stale `css_state` value survive every `/sgs-update` reseed indefinitely.
- `72a9fb7ec`, `edda94356`, `bcc7c04e0`, `23d7ea1d7` — the manual, per-block hover/gradient
  migration work itself, plus follow-on element-manifest declarations needed to satisfy a
  zero-tolerance gate (`check-hover-state-classification.py`) that showed up only after the DB
  writer bug was fixed.
- `991fe78ae` — a new "Colour EMISSION helpers" reference section in
  `plugins/sgs-blocks/CLAUDE.md`, written specifically because this session spent most of its
  length hand-deriving which shared PHP helper to call before discovering several already existed
  and already did the job.

**The load-bearing fact for the exploration:** `fix.js` already IS a scripted repair for a
recognised shape (colour-conformance rows), built with the project's own survey→fix→check→
self-test triad discipline — and it still shipped 3 real defects today, caught only by live
verification. Any answer to "should we script more of these" has to reckon with that, not route
around it.

## Candidate defect shapes this session actually recognised (the exploration's raw material)

Don't treat this as a work queue — it's the set of "shapes" the user is asking whether scripting
would help with. Explore what's actually true about each before assuming any answer:

1. **Motion-only `:hover` rules missing the touch-hover guard** — 76 rules across 25 blocks,
   confirmed via direct grep earlier this session (`transform`-only 54, `opacity`-only 9,
   `opacity+transform` 6, `filter`-only 6, `filter+opacity` 1), zero currently guarded. Nothing
   built yet — no script exists for this one at all.
2. **The pre-existing colour-codemod backlog** — `scripts/colour-codemod/survey.js` reports 252
   rows across 65 blocks; `fix.js`'s real accepted scope (proven today, not assumed) is a small
   fraction of the 40 rows survey calls "AUTOFIXABLE" — and even within that narrow scope, 3 of
   6 applied fixes were wrong. What does that imply about widening this tool's scope versus
   fixing its verification story first?
3. **Missing `supports.sgs.elements` manifest declarations** — the exact shape fixed by hand today
   on `brand-strip`, `post-grid`, `google-reviews`, `modal`, `form`, `card-grid`,
   `pricing-table`. Each fix was: read the block's rendered selector, add an `attrMap`/
   `states.hover.attrMap` entry, re-run `/sgs-update` Stage 1, re-check the gate. Mechanically
   uniform on the surface — but pricing-table's `priceColourHover` fix (today, this same session)
   proves the INSERTION POINT can be wrong in a way no schema-level check would catch, only a
   live DOM read.
4. **The gate-omission pattern** (`if ($flat)` missing `|| $gradient`) — found twice today
   (`form`, `modal`), fixed identically both times. A genuinely narrow, greppable AST shape
   (a conditional gating a `sgs_background_paint_decl()`/similar call, only checking one of its
   two arguments) — worth asking in exploration whether this specific shape is safe to script,
   separate from the broader colour-codemod question.
5. **The 43-element text-colour-gradient backlog** — `textSharesElementWithBackground()` already
   exists as a live, adopted detector (`scripts/inspector-scan/rules/31-golden-colour-control.js:163`)
   for exactly this shape. Detection already scripted; the FIX (moving a background paint to a
   `::after` layer via `sgs_block_background_layer_css()`) has never been automated or even
   hand-built more than once.

## Questions worth exploring (starting points, not an agenda)

- What made `fix.js`'s 3 wrong rows wrong, structurally — was it a shape the tool's own model
  can't represent (like the selector-collision, which needed knowing that two attrs target
  DIFFERENT rendered elements despite sharing a naming pattern), or a shape it could represent
  but didn't check?
- Is "verify live" itself scriptable — i.e. is the EXPENSIVE part today the fixing or the
  verifying, and would a smaller investment in automated live-DOM verification (deploy a probe
  page, read the lifted CSS, assert per-shape) change the economics more than a bigger, riskier
  auto-fixer would?
- Do shapes 1 and 4 above (motion-hover-guard, gate-omission) actually share a common
  detector/fixer architecture with the existing colour-codemod triad, or is each shape's fixer
  fundamentally bespoke regardless of how "recognised" the shape feels?
- Given `/qc-council` was invoked once today specifically to stop a fix-shape from being trusted
  before it was measured — does a scripted-repair proposal belong in front of `/qc-council` as a
  gate, structurally, before any dispatch happens? (This may be where exploration mode wants to
  exit toward design.)

## Standing rules (carried forward, still binding)

- `.claude/CLAUDE.md`'s 7 rules — CONVERT don't mirror, no cheats, universal mechanisms,
  no skipping, verify on the real homepage, responsive values in attributes not inline CSS,
  design-gate high-blast-radius changes.
- `THE-MIGRATION-METHOD.md` — more than 3 blocks means build the detector first. This session's
  manual per-block hover/gradient work (7+ blocks) is itself a candidate example of when that
  rule should have fired earlier and didn't.
- Path-scoped commits only, branch re-checked in the same command. The shared working tree had
  a second, fully concurrent session running the entire time today — expect the same next time,
  and re-verify file ownership before every commit.
- `~/.claude/rules/prove-the-cause-before-fix.md` — a recognised SHAPE is not a proven CAUSE for
  every instance of it. Today's pricing-table misrouting is the concrete counter-example: same
  shape (fix.js autofix output), different, unpredicted failure mode from card-grid's.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/brainstorming` | Start here — `explore` mode, per Bean's explicit instruction |
| `/qc-council` | If exploration converges on a scripted-repair proposal — validate before building |
| `/systematic-debugging` | If a specific shape's fixer needs root-causing before scripting |
| `/handoff` | Session close |
