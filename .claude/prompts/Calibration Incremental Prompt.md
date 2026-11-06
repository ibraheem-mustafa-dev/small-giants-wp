Invoke /autopilot before doing anything else.

CONTEXT: Calibration measures what every block setting paints, so the clone tools can turn a draft's CSS into settings. Adding one setting to a block today re-measures the whole block, because a slot map is keyed by the block's build hash. On 2026-11-06 a 14-block run on local-indus took over 50 minutes and was stopped at 8 of 14: `form` and `form-field-tiles` took 21 minutes between them, `container` and `button` 9, `process-steps` 4, `icon-list` 2, `business-info` 3, and `mega-panel` was still running after 11. Two blocks were also refused over `textAlign` settings. Goal: a block that gains a few settings is calibrated in about a minute, safely, without trusting stale measurements. Lower cost per framework wave, for every client.

THE 2026-11-01 SPEED WORK IS NOT THE GAP: `393664301` (a paint-only block builds only its default and paint-state instances) and `fa62f7924` (queued pages are re-planned once a reading shows how many elements an instance draws) are on main and work. They do not help a run where settings are due.

READ FIRST, from a fresh worktree (below):
- `scripts/computed-route/calibrate.mjs`: `calibrateBlock`, `dueOutputs`, the skip logic near `slotMapSkip` and `paintSkip`, the refusal near `slotMapWriteDecision`.
- `scripts/computed-route/lib/cache.mjs`: `slotMapSkip`, `paintSkip`, `dueOutputs`, `slotMapWriteDecision`, `parseAllowLoss`.
- `scripts/computed-route/lib/calibrate-instances.mjs::planInstances`, `scripts/computed-route/lib/calibrate-chunk.mjs`, `scripts/computed-route/lib/deploy-hash.mjs` (what `slotKey` hashes).
- `.claude/specs/48-CLONING-SYSTEM.md` and Spec 47's FR-47-2 (calibration); `.claude/rules/cloning-pipeline.md`; `.claude/rules/framework-principles.md`.
- `.claude/dev-setup.md` "Disk and runs".
- Auto memory: `calibrate-on-the-local-mirror-not-the-test-site`, `a-dead-calibration-is-a-marker-or-declaration-gap`, `time-a-slow-step-before-naming-its-cause`, `worktree-gotchas`, `a-reading-that-differs-between-sites-is-a-framework-bug`.

TASKS, in order: 0. Time it first (~10 min). Per block and per stage, on one small and one large block: how long the editor build, the page load, the reads and the writing take. Add a timing line to the run's output if there is none. Name the real bottleneck from those numbers before designing anything. Say whether reads could run in parallel safely, or whether the mirror's page size is the limit.
1. Design with /brainstorming (~15 min), then show Bean a menu. This is a shared mechanism, so Bean approves before you build (cloning rule "Design-gate shared-mechanism changes"). The candidate to test against the numbers: incremental calibration.
   - Work out which settings are new or changed by comparing the block's declared attributes in the framework DB with the settings in its existing slot map.
   - Plan only those instances, plus each variant's default and a small sample of existing settings as a canary.
   - Merge the new rows into the existing slot map.
   - The hard part is the safety rule: a block's build hash changing means its render or CSS may have changed, so an old row could be false. If the canary differs from the old map, or a default paint moved, fall back to a full measurement of that block automatically and say so. It must be impossible for a stale row to pass silently. Offer the full option space: incremental, parallel page reads, smaller pages, and any combination. Give each its measured saving and its risk.
2. Build what Bean picks. Keep `--recalibrate` as the full measurement. Tests with a negative control: a changed default paint must force a full run; a removed attribute must leave the map. Files under the size limits; `calibrate.mjs` is 448 lines, so split rather than grow it.
3. The `textAlign` refusal. `sgs/form` and `sgs/button` were refused on 2026-11-06 because the new slot map drops `textAlign` settings the old one reaches: for form `fileButtonTextAlign`, `filePromptTextAlign`, `navButtonTextAlign`, `stepLabelTextAlign`, `stepNumberTextAlign`, `submitTextAlign`, `tileIconTextAlign`, `tileLabelTextAlign`; for button `textAlign`. The candidates are `cache/form.refused.json` and `cache/button.refused.json`; `post-grid.refused.json` also exists. Prove the cause by comparing the old and new readings: a real regression in those settings, a fixture no longer exercising them, or a read-list change. Fix the cause. Do not use `--allow-loss` as the fix.
4. Prove it on local-indus, one block at a time: add a throwaway attribute to a copy of a small block's measurement, or use the next real new setting, and report before and after minutes. Update Spec 48, `scripts/computed-route/README.md` and `.claude/dev-setup.md` with current truth, then /qc-council on the diff, then /handoff.

Done = a block gaining a setting calibrates in about a minute with the safety fallback proven by a failing-then-passing test; the `textAlign` refusals explained and fixed; the docs current.

SKILLS, and when:
- /autopilot first; /brainstorming for task 1; /systematic-debugging for task 3; /sgs-wp-engine for any block or mirror question; /sgs-db for framework DB questions; /delegate and /subagent-prompt before any dispatch; /qc-council before /handoff; /handoff to close.

TOOLS:

| Tool | Use |
|---|---|
| `sgs-framework.db` via /sgs-db, opened read-only | declared attributes for the new-settings comparison |
| Playwright (already in `scripts/computed-route/node_modules`) | the reads calibration already does; nothing new |
| Context7 | Playwright or Web Animations questions, only if needed |
| ListAgents | check live peers before a run; message them around any publish |

GUARDRAILS:
- Work in a fresh worktree: `git worktree add --detach E:/sgs-tmp/wt-calib origin/main`, with its own `npm ci` in `scripts/computed-route`.
- `scripts/computed-route/cache` in the shared checkout is a junction to `E:\sgs-route-cache`. Never junction it into a worktree; copy it, and copy results back deliberately. Before removing a worktree, check it holds no links.
- A worktree has no secrets. Set `SGS_SECRETS_ROOT=C:\Users\Bean\Projects\small-giants-wp`: it reads them in place. Never copy `.claude/secrets`.
- Calibrate on `local-*` mirrors only, never a Hostinger site. One client at a time. `TMP` and `TEMP` set to `E:\sgs-tmp`.
- Check no other session is on the mirror before a run. If the Indus or Mama's stream is live, use `local-sandybrown`. Calibration writes only its own calibration page; a stopped run can leave blocks on it, so finish with a completed run, which empties it. Before any push of that mirror, it must be empty.
- This machine has `pwsh`, not `powershell`. Build from PowerShell.
- Never run the clone route for a stream's client. Kill by PID only. Never type git stash, never worktree prune. Commit straight to main with explicit paths.
