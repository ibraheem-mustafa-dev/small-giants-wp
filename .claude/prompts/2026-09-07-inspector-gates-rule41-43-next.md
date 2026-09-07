---
doc_type: prompt
title: Inspector gates — rule 41 grouping/order debt
created: 2026-09-07
governs: plugins/sgs-blocks/scripts/inspector-scan/rules/41-co2-element-grouping-order.js
retention: delete once consumed
---

# Inspector gates — rule 41 grouping/order debt

Invoke `/autopilot` first. Check `ListAgents` and `git status` — this tree runs many concurrent
sessions on `main`.

**This file replaces `2026-09-04-spec32-35-gates-next-session.md`, deleted 2026-09-07.** Rule 43
closed that night, so the old Task 3 is gone; the counts moved; and one figure in it was
unreproducible. Corrections are folded in below.

## First action

`node plugins/sgs-blocks/scripts/inspector-scan/run.js --json`, then count by `kind`. Under two
minutes, no dependencies. Every number below is a 2026-09-07 measurement and this tree moves
hourly.

## Ground truth, measured 2026-09-07

| Kind | Count | State |
|---|---|---|
| `co2-scattered-element` (rule 41) | **11** | Open — Task 1 |
| `dom-order-vs-declared-order` (rule 41) | **17** | Open — Task 2 |
| `colour-only-state-indicator` (rule 43) | **5** | Open — Task 3 |
| `ambiguous-state-property` (rule 43) | **0** | **Closed 2026-09-07** (`eebb06187`) |

**Rule 43's ambiguous kind is done — do not reopen it.** All 8 findings were false positives.
Three shapes, each now handled by a principled branch with a self-test fixture that fails
without it:

- **Sanctioned 2-state border colour.** `buybox`, `product-card` and `product-search` change
  only `border-left-color` on an active state, over a base of `border-left: 3px solid
  transparent`. A bar appears; nothing is merely recoloured. Bean ruled this is the framework's
  own mechanism — `SgsBorderControl`'s 2-state colour picker exists for exactly this, so a
  client using the supported control would have tripped the rule every time. The fix strips the
  trigger token from the state selector, finds the base rule, and checks for a reserved
  non-zero border width.
- **Suppression rules.** `tabs`' two `box-shadow: none` declarations hide a no-JS fallback once
  JS positions the indicator. A rule that removes a visual is not an indicator.
- **Non-control surfaces.** `modal`'s `::backdrop { opacity }` is not a control state.

`tabs`' inset underline bars were reclassified rather than silenced: an inset shadow with a
non-zero offset draws a shape; a zero-offset blur-driven glow stays ambiguous.

## Task 1 — rule 41: 11 scattered-element findings

Blocks: `card-grid`, `gallery`, `hero`, `nav-menu` **×3**, `option-picker`, `product-card` ×2,
`tabs`, `trustpilot-reviews`.

**Read the rule's header comment first** (`rules/41-co2-element-grouping-order.js`, lines 1-107).
It carries Bean's settled 2026-08-27 ruling — not open for re-litigation — plus the
shared-colour-panel exemption added in `c330f2a6b`.

**Each finding needs its own read.** This is genuine three-or-more-location scattering, not the
mechanical "move a row" shape. Applying that shape blindly is what caused D970: a batch moved
colour controls out of the shared `SgsColourPanel` into bespoke per-element mounts, contradicting
a rule documented in `plugins/sgs-blocks/CLAUDE.md` six days earlier. It was reverted the same
night, and the detector — not the blocks — was corrected. **Read
`plugins/sgs-blocks/CLAUDE.md`'s "Colour controls" section in full before touching any
colour-adjacent finding.**

Seven of the eleven blocks D970 "fixed" were not closing the finding they targeted — they traded
one rule-41 violation for a `dom-order-vs-declared-order` one. Confirm which kind you are
actually closing.

This is a bounded batch, not a reach-zero task. Fix what fits; report an honest before/after.

## Task 2 — rule 41: 17 DOM-order findings

Blocks: `business-info`, `card-grid`, `hero`, `modal`, `nav-drawer`, `nav-menu`, `post-grid` ×3,
`pricing-table`, `process-steps`, `product-card`, `social-icons`, `star-rating`, `team-member`,
`testimonial`, `text`.

A block's panels mount in a DOM order that does not match `block.json`'s declared
`elements[*].order`. No shared mechanism fixes these. Each is a per-block judgement: reorder the
JSX, or correct the declared `order` when the current visual order is the intended one.

Lower priority than Task 1. `sgs/text`'s finding (Background panel vs Drop cap) is pre-existing
and unrelated to the 2026-09-07 colour-panel move.

## Task 3 — rule 43: the 5 real findings

Blocks: `accordion` ×2 (lines 119, 144), `form` (379), `product-faq` (99),
`table-of-contents` (166).

These are genuine — a state shown by colour alone. The established fix pattern still applies:
DISCLOSURE / PAGINATION-SELECTION / LINK-TAB-FILTER, adding a non-colour differentiator
alongside the colour change.

**Live-verify every fix.** A real bug from this rule (`93dacf0d4`) was found only because
someone checked the canary: a table-of-contents underline at specificity (0,1,0) was losing to a
generic link-underline reset at (0,2,2). Static checks cannot see that.

## Dropped from the old prompt

**"23 of 45 baseline/exemption files carry ~555 entries of debt."** This does not reproduce.
A narrow reading (`inspector-scan/baselines/` alone) gives 10 files, 1 non-empty, 9 entries; the
broadest reading gives 46 files, 24 non-empty, ~1,404 entries. Neither lands near the claim. If
the baseline-debt question matters, recompute it with an explicit file glob stated in the doc.
A number nobody can reproduce is not actionable.

## Corrections to carry

- The old prompt listed `nav-menu` ×2 under Task 1. It is **×3**.
- Task 1 was 10, now 11. Task 2 was 16, now 17.
- The old Task 3 counted 13 findings across two kinds. Only 5 remain.
- The old prompt's history section is accurate: the Spec 32 CSS-injection gate
  (`be6103869`), the three Spec 35 detector rules (`0ebfe205b`), the D812 control-shape fixes
  (`ba5dc407f`, `fee0631b8`, `c7f25aa75`) and the two post-grid bugs (`86a8ea627`, `b8088d274`)
  all shipped. One caveat: it describes the D812 trio as "deployed and live-verified", and no
  evidence of the live check was found. Treat that as asserted, not proven.

## Guardrails

- **Read the governing CLAUDE.md or spec section before building any shared mechanism.** D970 is
  the incident. A documented rule binds whether it is a day old or a year old.
- **Colour lives as ONE ROW inside the shared `SgsColourPanel`**, rendered first
  (D609/D618/D622). Never a bespoke per-element colour mount.
- **A detector fix needs a fixture that fails without it.** Rule 43's four new fixtures each
  passed that test; the harness meta-check proves the suite can still fail. A branch with no
  failing control is unfalsifiable.
- **Never edit a baseline to make a number go down.** Fix the logic.
- **D983 (2026-09-07): no PRs, no stashes, integrate after every task.** Commit to `main`,
  path-scoped.
- **Never `git stash`. Never `git checkout --` a file.** Both have destroyed peer work here.
- **Path-scope every commit.** No globs — a `*/render.php` glob once swept another session's
  half-finished edit onto `main`.
- **Never fabricate a live-verification pass against a stale target.**
- **Never add a parking.md entry without asking Bean first.** Every time.

## Tools

| Tool | Use |
|---|---|
| `inspector-scan/run.js --json` | Current counts, filterable by `kind` |
| `inspector-scan/run.js --self-test` | Fixture suite; the harness meta-check proves it can fail |
| `placement-reach.py --json` | Element/attrMap ownership before and after a rule-41 fix |
| `npm run check:dead-controls` | Net-new dead controls |
| `build-deploy.py --target sandybrown --blocks-only` | The one deploy path, for Task 3's live check |

## Skills and agents

| Route to | When |
|---|---|
| `/autopilot` | First, always |
| `wp-sgs-developer` | All block work |
| `/systematic-debugging` | Any regression — cause before fix |
| `/dispatching-parallel-agents` | Splitting Task 1 or 2 into disjoint-block batches |
| `/sgs-db` + `/wp-blocks` | Schema ground truth before any "missing X" claim |

## Hand back if

- A finding's correct grouping is a design question rather than a mechanical move — that is
  Bean's call, and guessing it is what D970 did.
- The counts have moved sharply. Re-verify before assuming a regression.
