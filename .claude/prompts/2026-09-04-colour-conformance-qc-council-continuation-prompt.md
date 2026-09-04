---
doc_type: prompt
title: Dispatch prompt — colour conformance, post-qc-council continuation
created: 2026-09-04
governs: .claude/plans/2026-09-03-golden-colour-staged-rollout.md
retention: delete once consumed
---

# Session start: colour conformance — genuinely-hard rows + live verification

Read `c:\Users\Bean\Projects\small-giants-wp\CLAUDE.md` in full, then
`.claude/plans/2026-09-03-golden-colour-staged-rollout.md` in full — it is the live spec.
Read its **"qc-council audit + fix.js repair — 2026-09-04 (session 9)"** section (near the
end, before "Standing rules") first — it's the most recent, most load-bearing update and
corrects a claim the plan carried since Phase 2.

## What the prior session (session 9) actually did

Ran a 5-persona `/qc-council` audit of every colour-gradient refusal reason against the real
helper files and `fix.js`'s own source — not another round of hand-fixing rows. Two real
findings:

1. **Rule 31 was wrongly suspected of a detector bug** (the "14 rows whose attr name is
   itself a hover attr" claim) — audited and **falsified**. Rule 31 already has the correct
   exemption; don't re-open this.
2. **`fix.js` itself had 3 real bugs**, not the render code — fixed this session (commit
   `0727f440b`), self-test-covered. Applying the fixed tool closed 10 rows mechanically in
   one `--fix --apply` run, then 3 parallel subagents closed 9 more well-evidenced trivial
   rows (`product-card` ×4, `process-steps`+`google-reviews` ×4, `nav-menu.itemBg`).

`survey.js` CONFORMANT moved 85 → 101 across the whole session (all commits: `16a7a7e0d`,
`10e08548a`, `0727f440b`, `61c533b5b`, `f296aec10`, `3de7bb370`).

## ⚠ Do this FIRST — nothing below is live-verified yet

`scripts/qa/check-colour-gradient-roundtrip.js` already exists (built session 8, 15/15
self-test, fail-closed with negative controls — modelled on `check-border-roundtrip.js`).
Deploy (`python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`) and run it
against **at least one row per mechanism from today's batch** before trusting any of them
closed:
- A text-only direct-paint row (`product-card.titleColour` — the "new rule wins by source
  order over the old custom-property mechanism" claim needs a real browser check, not just
  the reasoning-by-analogy it shipped with).
- A row whose background already lives on a separate `::before`/`::after` layer
  (`nav-menu.itemColour` or `pricing-table.ctaColour`).
- A hover-only addition on a block with no editor-canvas preview (`process-steps.titleColour`
  or `testimonial.summaryColour`) — confirm the hover genuinely fires live, since the editor
  gate was raised specifically because canvas preview can't prove it.

Per R-31-13, Bean's own eye on the canary is co-authoritative alongside the probe — don't
close on the script alone.

## Then: re-derive the current worklist fresh — every number above is already stale

```bash
cd plugins/sgs-blocks
node scripts/colour-codemod/survey.js
node scripts/colour-codemod/fix.js --fix          # dry run, writes nothing
node scripts/colour-codemod/classify-gradient-path-deferred.js
```

Multiple sessions have been working this same backlog concurrently — the exact row lists in
the plan doc's session-9 section are one generation behind by the time you read this. Re-run
before trusting any of it.

## What's genuinely left (per the qc-council audit's category 4 — "real, undesigned work")

Roughly 25-28 rows, not the whole remaining backlog — the qc-council synthesis (this
session's earlier conversation, not written to a doc — see the session-9 plan section for the
categorised counts) found most of what's left needs one of:

- **Custom-property architecture rework** (`mega-panel`'s `color-mix()` derivations,
  `brand-strip.tileBackgroundColour`, `social-icons`, `form.progressBarColour`,
  `post-grid.cardBgColour`) — needs render.php **and** style.css changes, real design.
- **One bespoke pattern needing new design**: `option-picker`'s multi-variant `--sgs-op-*`
  system — documented in `plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" section as
  not gradient-capable without new work.
- **One mechanism outside the SGS helper family entirely**: `cta-section.backgroundColour`
  (WP-native colour-support classes, not `sgs_colour_value()`).
- **Loop/dynamic-key shapes genuinely too complex for safe pattern-matching**:
  `post-grid.titleColour`/`.excerptColour`/`.metaColour`/`.readMoreColour` (value resolved
  inside a `foreach` over dynamic array keys — `fix.js`'s own docblock already disclaims this
  shape, don't extend the matcher to guess here).
- **`sgs/quote.attributionColour`** — correctly self-refused this session
  (`multiple-destructure-blocks-ambiguous`); needs a human to pick which of quote.js's several
  `= attributes;` blocks is the right one, or a smarter AST rule (find the block whose
  enclosing function is the `Edit` component, not just "contains the base ident").

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/qc-council` | If more refusal-reason clusters need auditing before dispatch (the pattern worked well this session — 5 parallel investigators, each with real file:line evidence, found genuine bugs a single pass would have missed) |
| `/dispatching-parallel-agents` | For any well-evidenced, disjoint-file trivial batch (same pattern as session 9's point-2 dispatch — worked cleanly, 3 agents, 9/9 correctly-scoped rows, one correct self-refusal) |
| `/visual-qa` | Live verification step above |
| `/handoff` | Session close |

## Tools

| Tool | Use for |
|---|---|
| `node scripts/colour-codemod/survey.js` / `fix.js --fix` / `classify-gradient-path-deferred.js` | Re-derive current state — never trust a cached number from this or any prompt |
| `node scripts/colour-codemod/fix.js --self-test` | Run before AND after any further `fix.js` edits — 15 assertions, catches regressions |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` | Check element attrMap / css_property before assuming a mechanism |
| `scripts/qa/check-colour-gradient-roundtrip.js` | The live-verification probe named above |
| `npm run gate:fast` | After every batch — 88 gates, ~65s |

## Hand back, don't improvise, if:

- A row's refusal reason doesn't match what the actual code shows when you read it — that's
  either a real gap or another tool bug; don't force a fix either way without evidence.
- `git status` shows uncommitted work in your target paths you didn't write — this tree has
  had 3+ concurrent sessions active on the same day; check before editing, and never run a
  bare `git commit` without `-- <explicit paths>` (a repo hook enforces this, but check first
  anyway).
- You're about to touch `fix.js` itself again — re-run `--self-test` before AND after, and
  don't remove the `multiple-destructure-blocks-ambiguous` / `multiple-hover-sinks-ambiguous`
  refuse-rather-than-guess guards to force a row through.
