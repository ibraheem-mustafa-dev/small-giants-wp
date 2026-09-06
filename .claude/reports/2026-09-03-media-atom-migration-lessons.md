# Media-atom migration — what made verification expensive, and how to fix it

**Written 2026-09-03.** Covers the `37-media-no-handroll` session (commits `c1a395ec5`,
`7de8f0ff8`, `a47cc502a`). Written because the next big detector item — `31-golden-colour-
control`, 277 findings — is the same shape of work at a larger scale, and this session's
verification cost roughly 75% of an Opus session's context window. That cost is avoidable.

## Problem

Verifying this session's work — 17 blocks, migrated by ~12 independently-dispatched agents —
took far longer than dispatching it. Not because the agents did bad work (they mostly didn't;
several caught real bugs the brief itself had missed). The cost came from re-deriving,
per block, facts a smarter dispatch would have already known.

## Effect

Three separate 30–60 minute chunks of this session went to work that a better-briefed first
pass would have skipped entirely:

1. **Re-discovering "does a control already exist?" per block.** Three separate agents
   independently found a pre-existing (differently-named) control on their assigned block and
   had to reason from scratch about how to bridge onto it. This is a checkable fact, not a
   judgement call — `grep`ing each block's `edit.js` for an existing fit/crop control before
   writing the brief would have told the dispatcher this upfront, and the brief could have
   named the bridge target directly instead of asking each agent to discover it.
2. **Re-verifying "is this actually dead code?" per finding.** `info-box`'s flagged rule turned
   out to target a class nothing renders. This needed one grep to establish before dispatch;
   instead it cost a full agent investigation cycle to discover mid-flight.
3. **A shared-mechanism finding treated as N per-block findings.** The 7-block
   `backgroundOverlay*` findings were ONE function (`class-sgs-container-wrapper.php`) shared
   by all 7 blocks — not 7 independent problems. This wasn't checked before the item was
   scoped, so the plan assumed 7x the actual dispatch unit.

## Solution — do this before dispatching `31-golden-colour-control`

**Run one grounding pass BEFORE writing any dispatch prompt, covering the whole finding set at
once, not per-block:**

1. **Query the DB for the real shape of the backlog**, not the detector's own count. For
   `31-golden-colour-control`: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql
   "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes WHERE
   css_property='color'"` (or whatever the rule actually checks) — the SGS-DB query, not the
   detector's own text output, is the ground truth for what's shared vs. per-block.
2. **For every block in the finding set, grep for an existing control before writing the
   brief** — `grep -l "colour\|Colour" src/blocks/*/edit.js` scoped to the flagged blocks.
   Blocks with a hit go in one dispatch batch (bridge-only briefs); blocks with no hit go in a
   different batch (real-control briefs). Don't discover this split mid-dispatch.
3. **Check whether findings cluster around a shared function**, the way the overlay findings
   did. `grep -rn` the render-side helper name across the flagged blocks' `render.php` files —
   if more than one block calls the same function, that's one dispatch unit, not many.
4. **Write ONE detailed brief per genuinely-distinct pattern, not one generic template reused
   17 times.** This session's briefs were close to identical across blocks with very different
   actual situations (some had zero existing control, some had one under another name, some had
   dead CSS) — the identical brief worked, but only because each agent independently re-derived
   which situation it was in. Splitting the dispatch into pattern-based batches (bridge-only /
   new-control / dead-code / shared-function) up front removes that re-derivation cost from
   every single agent, not just the dispatcher.
5. **Reserve `/qc-council` for after the batches land, not per-block.** It earned its place
   this session (caught 2 real bugs across 17 blocks in one pass) — running it once at the end
   over everything is far cheaper than running verification per-block as each agent reports.

## Estimated saving

Rough, not measured: steps 1–3 above are maybe 15–20 minutes of investigation, once, up front.
Skipping them cost roughly 3× that in re-derivation scattered across a dozen agent dispatches
plus the verification pass. For 277 findings (vs. this session's ~90), the same ratio of
avoidable cost scales up, not down — worth doing the grounding pass first.

## What worked and should repeat

- **Per-batch verification against the real diff and the real detector**, never trusting a
  self-report — this caught the two real bugs `/qc-council` found, and is not the expensive
  part; keep it.
- **Explicit "check for an existing control first" instruction in the brief** — this is what
  let agents catch the pre-existing-control cases at all, even at the cost described above.
  Keep the instruction; the fix is doing the check once centrally instead of N times
  independently.
- **`/qc-council` as a single pass over the whole landed diff**, with distinct rater personas
  (regression hunt, shared-mechanism safety, detector blind-spot, cross-agent consistency) —
  cheap relative to what it caught, and should be standard practice on any multi-agent
  detector-backlog session touching a shared file.
