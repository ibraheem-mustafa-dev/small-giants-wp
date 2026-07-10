---
doc_type: next-session-prompt
project: small-giants-wp
track: INTEGRATION — serial LAND session (run AFTER the edit tracks close)
model: single integration session on main (Opus orchestrator)
generated: 2026-07-10
---

# INTEGRATION — no-inline rollout: merge, seed, deploy ONCE, harness-LAND all, close

Invoke `/autopilot` first. You are the SINGLE serial LAND session of the split-edit/serial-land
rollout (`.claude/plans/2026-07-10-no-inline-parallel-rollout.md` = the MASTER plan). The parallel
EDIT tracks (A–E) migrated their disjoint block sets on their own branches, files-only, and each
wrote a report. Your job: merge them all, seed the DB centrally ONCE, deploy ONCE, and prove EVERY
block LANDED — then close the rollout. This is serial by design: LANDED verification needs the block
deployed to the ONE canary, and `build-deploy` ships the whole plugin, so two sessions verifying at
once would clobber each other.

## ⛔ PREREQUISITE
Every edit track's branch is committed AND its report written. Confirm: `git branch --list 'feat/no-inline-track-*'`
+ each `reports/no-inline-track-*-report.md` exists. If a track is incomplete, land the ready ones and note
the rest.

## ⛔ MANDATORY READING GATE (read IN FULL)
1. The MASTER plan `.claude/plans/2026-07-10-no-inline-parallel-rollout.md` (§INTEGRATION spec).
2. `.claude/plans/block-migration-DONE-checklist.md` + `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`.
3. `.claude/decisions.md` head (D294–D298) + `.claude/parking.md` (`P-F3-NAV-MISTAG-GATE`).
4. Spec 31 IN FULL + Spec 32 §6.1. The Wave-2 manifests (`no-inline-wave2*.json`) = the harness recipe reference.

## THE INTEGRATION SEQUENCE (serial, on `main`)
1. **Verify branch/D-ceiling/tree** (`git branch --show-current` = main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`).
2. **Merge every track branch** into `main` (block dirs disjoint → clean merge; resolve incidental conflicts). Read each track's report as you merge. `git worktree remove` + `git branch -d` each when merged.
3. **Add ALL `box_family` seeds centrally** in `scripts/sgs-update-v2.py` — from every track report, ONE edit, same dict shape as the D298 Wave-2 batches. (The edit tracks never touched this file.)
4. **F3 baseline edits centrally** — for each F3 row a track drained, delete it from `scripts/hardcoded-render-defaults-baseline.json` AFTER confirming the literal is gone from render (a `var(--x, <literal>)` fallback still counts — see D298); for MIS-TAGGED rows, leave baselined + note under `P-F3-NAV-MISTAG-GATE`.
5. **Build once** (`npm run build`, prebuild gates) + **re-run the manual gates yourself (STOP-16):** `cd plugins/sgs-blocks/scripts && python check-box-family-guard.py --check` (0), `python -m pytest converter/tests -q --import-mode=importlib` (all pass). Fix any JS/PHP error a track missed.
6. **Deploy once:** `python scripts/build-deploy.py --target sandybrown --skip-build --blocks-only --allow-dirty` → `python scripts/sgs-update-v2.py --stage 1` (seeds + support drift) + `--stage 10` (prune orphans, STOP-66) → OPcache reset (HTTP `<?php opcache_reset()` → curl → rm) + LiteSpeed (Hostinger MCP `hosting_clearWebsiteCacheV1`, user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`).
7. **LAND every migrated block** through harness manifests (`node scripts/no-inline-land-verify.js <manifest>`): craft asymmetric instances at 375/768/1440 (padding `{5,17,9,23}` + tiers, radius corners where box families apply), + the render dependencies (ToC needs a heading; array blocks one item; navs/singletons their root selector — see the Wave-2 + reconcile manifests). Zero-inline + computed box must pass for each. For colour/typography-only blocks, also live-curl the scoped rule (see the reconcile manifest pattern). Fix + redeploy any FAIL.
8. **Per block:** write `reports/visual-diff/<block>-<date>.md` at repo ROOT (`verdict: PASS` + `first_paint_capture_passed: true` — the pre-commit visual-diff gate REQUIRES a per-block report per changed block, dated today). Commit path-scoped (`git commit -- <paths>`; if the gate blocks on a non-visual-only change use `--no-verify` ONLY when justified).
9. **Task 4 — close the rollout:** wire `audit-inline-styling.js --check` (0 inline) + `check-box-family-guard.py --check` into `package.json prebuild` as ZERO-TOLERANCE; **fix `P-F3-NAV-MISTAG-GATE`** (the hardcoded-defaults gate's attr↔property precision + var()-fallback counting); reconcile Spec 31/32 + CLAUDE.md to "rollout complete"; update `decisions.md`/`state.md`/`next-session-prompt.md`; `/handoff`; push.

## ⛔ STOPs
- **STOP-16** — re-run every gate + the suite yourself; a track's "green locally" is a hypothesis until re-verified here.
- **STOP-21/43/44** — emit-green ≠ LANDED; deploy + purge before measure; a schema-valid attr can be a render no-op — verify LIVE computed style.
- **STOP-66** — after any attr-shape change, `/sgs-update --stage 10` prunes orphans before re-clone.
- **STOP-67** — the pre-commit gate needs a per-block visual-diff report (repo ROOT) with `verdict: PASS` + `first_paint_capture_passed: true`.
- **Path-scoped commits** — two threads share `main`; always `git commit -- <explicit paths>`, never `git add -A` / bare commit.

## Skills / tools
| /handoff /capture-lesson | session close | | /qc-council | any composite / shared change (blub-255) |
| Playwright / chrome-devtools + `no-inline-land-verify.js` | LANDED at 375/768/1440 | | Hostinger MCP `hosting_clearWebsiteCacheV1` | LiteSpeed purge |
| `sgs-db.py` (READ) + `sgs-update-v2.py` (--stage 1/10) | DB seed/prune | | REST app-pwd `.claude/secrets/sandybrown.env` | harness auth on page 1356 |

## DONE = rollout COMPLETE
Every styling-support block emits zero inline CSS (audit-inline-styling clean), the 2 gates wired zero-tolerance,
`P-F3-NAV-MISTAG-GATE` fixed, Spec 31/32 + CLAUDE.md say "rollout complete", docs reconciled, pushed.
