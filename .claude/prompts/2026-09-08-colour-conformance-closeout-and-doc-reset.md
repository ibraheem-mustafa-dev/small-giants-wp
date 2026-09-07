---
doc_type: prompt
title: Colour-conformance closeout + doc reset
created: 2026-09-07
governs: the last 10 colour migrations, then the Spec 32/35 doc close-out
retention: delete once consumed
---

# Colour-conformance closeout + doc reset

Invoke `/autopilot` first. Read `plugins/sgs-blocks/CLAUDE.md` in full. Check `ListAgents` and
`git status` — this tree runs many concurrent sessions on `main`.

## Skills that earned their place on 2026-09-07 — use them, they are not optional garnish

| Skill | Why |
|---|---|
| `/dispatching-parallel-agents` | **The workhorse.** 6 disjoint-file groups landed in the time one sequential pass would have taken. Split by FILE, never by attribute — two agents on one file lost an edit (see "Known traps"). |
| `/delegate` | Route every branch. Haiku handled all mechanical block work; the one task it lost was a 5,020-line detector script — size, not difficulty, is the routing signal. |
| `/sgs-db` + `/wp-blocks` | Ground every "is this attribute visual?" claim in `block_attributes`, never in naming intuition. A `css_property IS NULL` guess held for 7 sampled rows and was wrong for `fxStart`/`transitionDuration`. |
| `/systematic-debugging` | Three real bugs on 2026-09-07 passed every gate and were caught only by reading diffs. |
| `/qc-council` | Required at the end of Wave D. |

## What just closed (do not redo)

TEXT surface: **29 → 0**. Editor controls, render, and editor-canvas preview all wired.
`check-editor-render-parity.js` CHECK A baseline is **empty** — 31 accepted-debt entries genuinely
closed. Commits `6d8073d2f`, `b33eaee1f`, merge `dc364e953`. Detail: LEDGER Track A.

## Wave A — the last 10 migrations

Measured 2026-09-07 (`node classify-end-shape.js --json`, filter `currentComplete: false`).
**Re-derive from a fresh run before starting** — the census moves.

| Block.attr | Current shape | End shape |
|---|---|---|
| `audio.spectrumColour` | bare-custom-property | fill-custom-property-gradient |
| `cta-section.borderColourHover` | unknown | border-base-hover |
| `filter-search.inputBorderColour` | unknown | border-base-hover |
| `filter-search.focusRingColour` | unknown | border-base-hover |
| `mega-aside.asideBorderColour` | unknown | border-base-hover |
| `product-search.inputBorderColour` | bare-custom-property | border-base-hover |
| `product-search.focusRingColour` | bare-custom-property | border-base-hover |
| `product-search.listboxBackgroundColour` | bare-custom-property | fill-custom-property-gradient |
| `product-search.resultHoverBackgroundColour` | bare-custom-property | fill-custom-property-gradient |
| `product-search.matchHighlightColour` | bare-custom-property | fill-custom-property-gradient |

Five are on `sgs/product-search` — one agent owns that whole file. The other five are disjoint;
parallelise them.

**Helpers (registry: `plugins/sgs-blocks/CLAUDE.md` "Colour EMISSION helpers"):**
`sgs_border_states_css()` for border rows, `sgs_custom_property_gradient_decls()` for
custom-property fills. **Not** the text trio — that is a different mechanism, and picking a helper
by proximity to a neighbouring attribute is exactly what produced two bugs on 2026-09-07.

**Codemods before hand-edits.** `.claude/THE-MIGRATION-METHOD.md` binds at this size: check for an
existing `scripts/migrate-*.py` or `colour-codemod/` script that already covers these two shapes
before touching a block by hand, and extend it rather than hand-editing six blocks. If you build
one, it ships as the full triad — `--survey` (census) / `--fix` (parameterised, `--apply` to
write) / `--check` (the gate) — plus a `--self-test` with a negative control. Two shapes across
six blocks is exactly the band where a codemod pays for itself; a hand-edit here is a judgement
call you should state, not a default.

Each row needs all three layers or it is not done: render.php emission, the `SgsColourPanel` row
(`gradientCapable` + `gradientValue`/`onGradientChange`), and an editor-canvas preview. Verify
with `classify-end-shape.js`, `check-editor-render-parity.js`, and `npm run build`.

## Wave B — fact-check three plan docs

Read each in full and decide per open item: genuinely open, silently closed, or superseded.
Verify against the code and the census — **never against the doc's own claim**.

- `.claude/plans/2026-09-05-colour-conformance-shape-batch-triad.md`
- `.claude/plans/phase-colour-conformance.md` (known stale: points at a deleted prompt file)
- `.claude/plans/2026-09-03-golden-colour-staged-rollout.md`

Report the three verdicts before starting Wave C. If real work is found, it belongs in Wave A's
shape, not buried in a doc pass.

## Wave C — cleanup (only once Waves A + B confirm complete)

1. Archive the three plan docs above to `.claude/plans/archive/`.
2. Archive `.claude/plans/archive/block-migration-DONE-checklist.md`.
3. Delete the now-closed colour-conformance entries from `.claude/parking.md`
   (move to `memory/parking-archive.md` verbatim + completion date — the archive-on-resolve rule).
4. Wipe `.claude/LEDGER.md` back to project essentials plus: migrations complete, **Spec 32 and
   Spec 35 complete**, and next steps — Spec 36-37 work, Mama's Munches go-live, and the cloning-
   pipeline rework.

## Wave D — the deep doc pass

1. **Spec 32 + Spec 35** — read both; update to state completion. Check for claims the 2026-09-07
   work falsified.
2. **`CLAUDE.md`** — clean up. Cached counts and rosters drift; cut them to pointers.
3. **`.claude/plans/spec-39-seed-requirements.md`** — review for the cloning-pipeline rework.
   Name the gaps, especially anything the Spec 32/35 conformance work changed.

   **Bean's bar for that rework — record it, do not soften it:** the pipeline should match
   **modern AI-design standards and Awwwards-level output** — motion effects and the other
   high-craft touches that were never in it before — and it should use **at least the full
   potential of the theme's existing functionality**, which today it does not. Concretely that
   means: clone **motion/animation**, not just colour/typography; lean on the block standards and
   the upgraded DB to produce a **cleaner, better routing setup** in the routing logic. Judge the
   spec against that bar and say plainly where it falls short.
4. **`.claude/architecture.md`** — rewrite from scratch. It is 48KB and years stale.
5. **`.claude/goals.md`** — review and refresh.
6. Finish with **`/qc-council`** on the doc set.

## Wave E — prove it

Run every gate and checking script, the full `/sgs-update` pipeline, `npm run build`,
`build-deploy.py --target sandybrown`, then commit and push.

Collect every violation and sort into two piles: **true blockers** to the theme going live and to
starting the cloning-pipeline rebuild, and everything else. Name the blockers explicitly.

## Known traps (all cost real time on 2026-09-07)

- **Two agents, one file — an edit gets lost.** A concurrent pair both wrote
  `editor-render-parity-baseline.json`; the later write silently reverted the earlier one. Split
  parallel work by file.
- **A crashed agent leaves partial edits.** One died mid-fix having already written an inconsistent
  baseline. `git checkout --` those specific files and re-dispatch; do not build on the wreckage.
- **A green gate is not a working feature.** `accordion-item`'s missing `usesContext` keys, the
  timeline wrong-helper bugs, and an unregistered `css:color-link-gradient` vocabulary key all
  passed every gate. Read the diffs.
- **A detector that flags correct usage is a detector bug.** Fix the detector, not the instance —
  that is how 23 baseline entries collapsed into one structural rule.
- **Verify a subagent's claim before believing it.** One reported a fix whose helper never matched
  the target element. Another reported removing a baseline entry that was still there.

## Standing constraints

- **No PRs, no stashes** (D983). Commit to `main`, path-scoped, no globs. Integrate after every
  completed task.
- Pre-existing and **not yours to fix** unless you are already in those files: `sgs/breadcrumbs`
  (3 element-manifest orphans), `sgs/product-faq.backgroundColourHover` (DB routing anomaly).
  Disclose with `[gates-ok:…]`.
- `build-deploy.py --dry-run` is **not dry** — it ships for real and only skips the gates.
- Spec 32: no block renders an inline `style=` property declaration.
- No version bumps, no deprecations — pre-production (D293).
- Never add a `parking.md` entry without asking Bean first.

## Hand back if

- Wave B finds substantial open work — that changes the shape of the session; say so before
  grinding through it.
- The architecture rewrite needs decisions only Bean can make.
- Wave E surfaces a true go-live blocker.
