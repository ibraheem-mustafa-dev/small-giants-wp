# Handoff brief: template-rework stream, session of 2026-11-19

This is Step 1 of the handoff for one session. You are the worker: run Steps 2 to 9 of `C:/Users/Bean/.claude/commands/handoff.md` from this brief, in the worktree `E:\sgs-tmp\wt-tr-templates` (branch `feature/tr-templates`, clean, at `origin/main`). Commit there with explicit paths and do not push. Do not work in the shared checkout `C:\Users\Bean\Projects\small-giants-wp`: it holds other sessions' uncommitted files.

## What the session was for

The cloning route (`scripts/computed-route`, the pipeline that turns a client's Claude Design draft into a WordPress site) could not clone the "special surfaces": the shop's templates (basket, checkout, account, order confirmation, 404, search, product page, shop listing) and the forms, modals and flows. Mama's Munches had them rebuilt by hand. The goal is that a shop draft's special surfaces are cloned from blank with no hand edit and no hand-written CSS, before Bean designs two new sites for 2026-11-28. Governing plan: `.claude/plans/2026-11-18-template-rework.md`. It was kept current during the session and its Task 7 Status and "First action" hold the full state: do not rewrite them, only check them.

## Tasks and outcomes

| Task (plan) | Intended outcome | Result |
|---|---|---|
| Orient and claim scope | Know who is live and what each owns | Done |
| Plan every special surface | Each surface of Spec 48 §16.1 has a task with a measurable done-when | Done: Task 10 added, Task 7's done-when widened |
| Task 4: the route writes the shop look settings that exist | On Mama's draft each written value equals the hand-set value or is listed with both | Done, three rounds: `part-look.mjs` on `main` |
| Task 7: shop templates and order confirmation from blank | One lab run builds the eight surfaces with no hand edit; pairs shown to Bean with what differs | Code shipped, outcome not yet hit: all eight built from blank on a lab copy and photographed, none passes Bean's eye; gaps are in the plan's Task 7 Status |
| Task 10: forms, modals and flows | The done-when in the plan | Offline half on `main`; the live lab check has not been run |

## Commits on `main` from this session

Landed by this session: `23e3965a4`, `7999aaaf4`, `bd77c5857`, `163400139`, `d06b9ab6b`, `91148d1d5`, `342e16f91` to `b9489ebbd` (nine), `965a7505a` to `2e30a91c6` (four), `8c752132e`, `760cc1f11`, `ca7ec2d9a`, `bf099bc07`, `85364c7fc`, `74fb131d2`, `c66e6ace4`, `5cba39642`, `bed20000d`, `63358fca3`, `8c22bc002`, `32a828a2c`, `02d02989c`, `e418d20c2`, `1b1a82e9c`.

Landed for this session by the general cloning session (find the hashes with `git log origin/main --since=2026-11-19 --format='%h %s' -- scripts/computed-route` and the subjects): the forms, modals and flows work (13 commits, subjects naming openers, `sc-if`, `flowProductId`, flow links, the site check of modals), the product page and shop sorting builders (9 commits, `template-piece-buybox`, `-product-field`, `-shop-sort`, `template-pieces-context`), the order confirmation stack (13 commits, `skeleton-data-branches`, `fill-data-branches`, the order confirmation's wiring), and the checkout shell (6 commits, `template-piece-woo-layout`, `template-piece-frame`, `template-frame`, `region-stand-in`).

## Findings (including ones that changed no file)

- Spec 48 `.claude/specs/48-CLONING-SYSTEM.md` Status lines are now stale and need bringing to current truth, each from the plan's Task 4, 7 and 10 Status and the lab findings, never from memory: FR-48-95 (openers, modals, flows: page map `opens`, opener buttons and the modal frame, the site check; not built: form prefill, the drawer and mega-menu size-guide links, the bag drawer's link), FR-48-100 (forms: `successMessage`, required copy, `sc-if` fields, `flowProductId` built; live check not run), FR-48-96 (product page: one `sgs/buybox`, bound title and description, the gift block; order confirmation built from the draft with the data-branch reader; `sameNode` and the Eye Care confirmation still open), FR-48-99 (shop sorting and results count built in place; the rest open), FR-48-87 (part-look writes the look settings; the checkout and basket shell; the account block's signed-out card and form words; the walker's pairing still not built), FR-48-56 (a page that draws its own top bar gets a `<template>-header` part and no footer; the 404 and search ruling is already written there). Keep each Status factual and cite code by symbol, never by line.
- `LEDGER.md` needs this stream's front updated (status only): find the front that points at `.claude/plans/2026-11-18-template-rework.md`.
- Bean's rulings this session, already recorded in the plan and FR-48-56: every draft draws its own 404 page, and a search results page only when the site has search.
- A fault of this stream's own, recorded in the plan as the first thing to fix: the walk's absent-root check (`scripts/computed-route/lib/site-check-openers.mjs`) fails every template surface in a live run.
- Plugin fault found and recorded in the plan's Task 3: the Cart's item-card look crushes each line while the table header shows.
- No `/code-review` ran on this session's commits. Each helper's work was checked against its files, its tests rerun on `main` and its mutation lists rerun or spot-checked. Do not run a review; the next session's prompt carries it as a task.
- Nothing was deployed anywhere. Every live run was on scratch copies (`local-mediatest-trlab` 8121, `local-mediatest-partlook` 8120, `local-mediatest-partlook3` 8123). The live shop and the mirrors were not written.
- `scripts/computed-route/README.md` lacks index rows for the new part-look and template-piece files (the route's README lint reports them). That file belongs to the general cloning session; the patch for the part-look rows is `E:\sgs-tmp\template-rework\part-look\part-look-readme.patch`. Do not edit the README; make sure the plan says this (add one line to Task 4's Status if it does not).

## State

- Branch `main`, HEAD `1b1a82e9c` when this brief was written (the worktree may be a commit or two behind `origin/main`: `git fetch origin` and rebase first).
- Tests: every suite of this stream passes on `main` (`node scripts/computed-route/tools/run-tests.mjs tests/template-piece-*.test.mjs tests/template-pieces*.test.mjs tests/part-look-*.test.mjs`); the route's full suite has about 20 files that fail on `main` for reasons that predate this work.
- Uncommitted: none of this session's. The lab worktree `E:\sgs-tmp\wt-tr-lab` holds run outputs on purpose and is kept.

## Docs already known to need changing

1. `.claude/specs/48-CLONING-SYSTEM.md`: the six Status lines above.
2. `LEDGER.md`: this stream's front.
3. `.claude/plans/2026-11-18-template-rework.md`: check only; add the README line if missing.
4. `.claude/reports/2026-11-18-template-rework/lab-findings.md` and `lab-run-checklist.md`: current; check only.

Used prompt files: this brief (delete it in your commit). The session was started from a pasted prompt, not a file.

Preflight: `python .claude/hooks/handoff-preflight.py --check`. Markdown is never hard-wrapped (`python scripts/check-md-wrap.py --write <file>` fixes it). `LEDGER.md` stays at or under 24,576 bytes and is edited only in this stream's front.
