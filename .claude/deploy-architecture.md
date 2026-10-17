# Deploy architecture

How a change gets from `main` to a live site, which file does which job, how the speed mechanisms work, and how to add to each part without breaking the others. The commands to run live in `.claude/dev-setup.md` "Deployment process" and the `/wp-sgs-deploy` skill; this page is the map behind them. Stale-prone numbers are marked with the date they were measured.

## The one rule

`python plugins/sgs-blocks/scripts/build-deploy.py` is the only deploy path. It builds, gates, ships, verifies, purges caches and rotates a `.bak`. Never hand-roll `tar`, `scp` or `rm -rf` on a server, and never use `--allow-dirty` or `--skip-verify` to get past a red result: a skipped check is a check that did not run.

## Where the time goes (measured 2026-10-17, canary, 75b80ffb3, before the speed-ups)

A canary deploy took 1333s: the fast gate tier 206s (inside `npm run build`), the full gate tier 345s, the live motion QA 735s, everything else about 47s. A deploy to a non-canary target (no live motion QA) took 631s. After the speed-ups on a clean tree: fast tier 69s and full tier 132s (4 gates at a time, longest first), and the live motion QA runs a smoke set of about 242s unless the full set is required, which gives roughly 9 to 10 minutes on the canary and 5 to 6 minutes elsewhere; a full motion QA adds about 8 minutes. Every deploy now prints these numbers itself (see Stage timings), so trust the latest `[time]` table over this paragraph.

## Module map

All files are in `plugins/sgs-blocks/scripts/`. One job per file; the command file stays small.

| File | Job |
|---|---|
| `build-deploy.py` | The command: flags, `main()` (the stage order), `build_and_gate()`, `step_gate_full()`. Keep it a thin sequencer; new logic goes in a module. |
| `deploy_common.py` | `TARGETS` (every deploy site), paths, run ID, tar and dirty-gate rules, `log()`, `err()`, `run()`, SSH and composer helpers. Scripts that need `TARGETS` or the SSH helpers import this. |
| `deploy_guards.py` | Checks before anything ships: scoped dirty-file gate, client `theme.json` payload and guard, ownership marker, stored-content (old-shape) audit, the isolation decision. |
| `deploy_ship.py` | `npm run build`, packaging, upload, remote extract with `.bak` rotation, local cleanup, and `run_isolated()` (the throwaway git worktree at `HEAD`). |
| `deploy_verify.py` | After the files land: cache purge, `theme.json` and payload checks, the smoke test, the live motion probes (`step_motion_qa`), the scoped-selector audit. |
| `deploy_cache.py` | Remembers a commit that already built and passed `gate:full`; also the machine-wide packaging lock. |
| `deploy_multi.py` | `--target a,b` or `all`: one build and gate, then every site at once. |
| `deploy_timing.py` | Per-stage seconds, the summary table, the history file. |
| `deploy_qa_tier.py` | Chooses the motion QA tier (smoke or full) and keeps the last-full-pass record. |
| `deploy_selftest.py` | `build-deploy.py --self-test`: numbered cases, each proven red on a planted fault. |
| `run-gates.py`, `gates.json` | The gate runner and its roster (see Gate tiers). |
| `run-motion-gates.py` | Runs every motion gate it finds by filename glob (see the glob warning below). |
| `motion-qa/run-live-probes.mjs`, `probe-scheduler.mjs`, `full-tier-paths.json` | The live motion QA runner, its scheduler and the list of paths that force the full set. |

## Stage order

`main()` runs these in order; each is wrapped in `deploy_timing.timed()` or `stage()` and appears in the timing table under the name shown.

1. Isolation: `run_isolated()` creates a worktree at `HEAD` and re-runs the script from it, so a concurrent session's uncommitted files cannot reach the deploy. `--no-isolate` and `--payload` deploys run from the shared checkout instead.
2. `oldshape-audit`: reads stored post content from the target and refuses a deploy whose schemas would strand or delete it.
3. `build`: `npm run build`, whose `prebuild` runs the generators then the fast gate tier (so fast-gate time is inside this stage), or a restore from the deploy cache.
4. `gate-full`: `npm run gate:full` (the full gate tier), skipped and logged as `gate-full (cached)` when this commit and framework DB already passed.
5. `deploy-ownership`, `theme-json-guard`: refuse to overwrite a newer deploy by another session (`--takeover` overrides) and ship the target client's own `theme.json`.
6. `package`, `scp`, `remote-extract`, `deploy-marker`, `local-cleanup`.
7. `purge-caches`, `verify-theme-json`, `verify`, `verify-payload`: caches purged, then the live site is fetched and the deployed `block.json` files are checksummed against the payload.
8. `motion-qa`: live probes against the canary, canary target only.
9. `scoped-selector-audit`: only when `--audit-scoped-page` is given.
10. The timing summary, then `[DONE] sgs-deploy completed in <N>s`. Prove a deploy by the host's marker (`ssh hd "cat ~/.sgs-deploy-marker-<target>.json"`), never by an exit code.

## Mechanisms

**Isolation.** The worktree at `HEAD` links `node_modules`, `vendor` and `scripts/computed-route/node_modules` from the shared checkout. A stopped deploy leaks its `sgs-deploy-wt-*` worktree; remove it with `git worktree remove --force <path>`.

**Deploy cache.** After `gate:full` passes, the build and every generated file are stored in `~/.cache/sgs-deploy/<key>/`, keyed on the commit's tree hash plus the framework DB's sha256. A repeat deploy of the same commit restores them and skips both steps. Only isolated runs use it. `--no-cache` forces a rebuild.

**Multi-site.** `deploy_multi.py` builds and gates once, then starts one child deploy per site from the same worktree with `--built-by-parent`. Only the canary child runs the live motion probes.

**Gate tiers.** `gates.json` holds one record per gate: `{id, cmd, tier, tier_reason, added_D, added_commit, budget_ms, order}`; `run-gates.py::load_gates` refuses a record with no valid tier, and a `generator` record whose `cmd` contains `--check`. Tiers: `fast` (every build, run by `prebuild` after the generators), `full` (pre-deploy, run by `step_gate_full()`), `generator` (never run in parallel; they must run in order and a failure must stop the build). `run-gates.py --tier fast|full|all --jobs N` runs gates N at a time, submitted longest `budget_ms` first, with results printed in roster order and every gate always run. `package.json` passes `--jobs 4` for `gate:fast`, `gate:full`, `gate:all` and `prebuild`. `--assert-wired` proves the deploy still calls the full tier. `--time` measures every gate serially and rewrites `budget_ms`; rerun it when gates are added, because the schedule is only as good as the budgets. Serial and parallel runs were compared on one clean tree on 2026-10-17 and returned identical verdicts.

**Motion gates are discovered by filename.** `run-motion-gates.py` runs every `check-motion-*.py` (with `--check` and `--self-test`), `migrate-motion-*.py` (`--check`) and `migrate-easing-*.js` in the scripts folder, and it is part of the full tier. A new script with one of those names becomes a live gate the moment it is committed. If it must stay red until a sweep, baseline it in `scripts/data/motion-gate-allowlist.json` in the same commit (entries `{gate, pattern, reason, delete_in_unit}`; an entry fails once its unit is recorded in `motion-units-landed.json`). Run `python plugins/sgs-blocks/scripts/run-motion-gates.py` before committing such a script. (On 2026-10-17 `check-motion-literals.py` skipped this and failed `gate:full` for two hours.)

**Live motion QA tiers.** `npm run qa:motion` runs the probes in `run-live-probes.mjs` against the canary after the deploy. Each probe lists the tiers that run it. Smoke is every probe except `probe-marquee.mjs` and `probe-looping-media.mjs` (6 of 8 probes, about 242s; the two full-only probes take about 494s of the 735s serial total). `--motion-qa-tier auto` (the default) picks full when there is no recorded full pass, the record is over 24 hours old (`max_age_hours` in `full-tier-paths.json`), the recorded commit is unreachable, or any file changed since that commit (including uncommitted files the run ships) matches a glob in `full-tier-paths.json`; otherwise smoke. The record is `~/.sgs-motion-qa-full.json` (override with `SGS_MOTION_QA_FULL_FILE`), written only after a full run passes on committed code with the verify step run. `--motion-qa-tier smoke|full` overrides the choice; `--skip-motion-qa` skips the step and leaves the probes unrun. `--motion-qa-parallel N` and `run-live-probes.mjs --parallel N` exist but must stay at 1 on the Hostinger canary: four at a time on 2026-10-17 made two probes fail on non-200 responses and the CDN then answered 403 to every request for about seven minutes. Probes take turns on the canary by message with other sessions for the same reason (`.claude/rules/motion-qa.md`).

**Stage timings.** Each stage prints `[time] <name> <seconds>s`; a slowest-first table with percentages precedes `[DONE]`; each real deploy appends one JSON line (`when`, `commit`, `target`, `scope`, `total_s`, `stages`, `dry_run`) to `~/.sgs-deploy-timings.jsonl` (override with `SGS_DEPLOY_TIMINGS_FILE`). The fast gate tier is inside `build`. A multi-site run writes one line from the parent and one per child. The live probe runner prints each probe's seconds and a closing table.

**Guards.** The scoped dirty-file gate (refuses uncommitted deploy-relevant files unless declared with `--payload`), the ownership check, the `theme.json` guard, the old-shape audit, the 45 MB tarball size guard (the log's last line then says only `tar-failed (exit 2)`), and the post-deploy verify. Each has a case in `--self-test`.

## How to add to it

- **Before optimising anything,** read the latest `[time]` table in the deploy log or the last lines of `~/.sgs-deploy-timings.jsonl`; the self-test cases for the timing, motion QA flags and tier choice are 19, 20 and 21 in `deploy_selftest.py`.
- **A deploy stage.** Write a `step_*` function in the module that matches its job (`deploy_guards` before shipping, `deploy_ship` for shipping, `deploy_verify` after), return `0` or a non-zero exit code, call it from `build-deploy.py::main()` through `timed("<stage-name>", step_fn, ...)`, and add a `--self-test` case with a planted fault. Keep `build-deploy.py` under about 500 lines by putting logic in the module.
- **A flag.** Add it in `build-deploy.py::parse_args`, thread it to the step, and give it a self-test case that proves the default leaves the old behaviour byte-identical.
- **A deploy target.** Add an entry to `TARGETS` in `deploy_common.py` (`host`, `wp_content`, `explicit_opt_in_required`, `client`), create its secrets file under `.claude/secrets/`, make sure `sites/<client>/theme-snapshot.json` exists, and run `--self-test` (case 16 proves every target's client snapshot prepares). SSH is shared: every target lives on one Hostinger account behind the `hd` alias (`SSH_ALIAS` in `deploy_common.py`), so a site on a different account needs the SSH helpers extended first. The live motion probes stay canary-only.
- **A gate.** Add a record to `gates.json` (`tier` `fast` unless it is slow or needs a build, then `full`), run `python plugins/sgs-blocks/scripts/run-gates.py --only <id>`, then `--time` to set its budget. A gate that writes files must write only to temp folders or have exactly one writer, because gates run side by side. A new `check-motion-*.py` also needs the glob check above.
- **A motion probe.** Put it in `scripts/motion-qa/`, give it a stable fixture page (add the page ID to `.claude/rules/motion-qa.md` and `CLAUDE.md`'s fixture list) and a negative control that must come out red, add it to `REAL_PROBES` in `run-live-probes.mjs` (`PROBES` is derived from it) with its `tiers` (both `smoke` and `full` unless it is slow and narrow) and `serial: true` if its timing tolerance is tight, since a serial probe never runs alongside another in parallel mode (the two full-only probes set it), and if it tests code that smoke would not otherwise exercise add that code's paths to `full-tier-paths.json`. Time it in a serial run first; a probe over about a minute belongs in the full tier only. To test the runner without the canary, point `SGS_MOTION_QA_PROBES_JSON` at a JSON file of stub probes (`node plugins/sgs-blocks/scripts/motion-qa/run-live-probes.selftest.mjs` does this); never leave it set during a real deploy.
- **A path that forces the full motion QA.** Add a repo-relative glob (`**` supported) to `full-tier-paths.json`. Derive it from source a full-only probe actually exercises, and add a case for it in `deploy_qa_tier.py::self_test`.

## Known limits and next speed-ups (2026-10-17)

- The marquee probe is 367s, mostly fixed waits (a 2s settle after each of about 32 page opens, repeated re-measurement in its reduced-motion pass and 1s measurement windows). Trimming those while keeping the 2% rate judge could save about 100s on full runs; it needs a live canary to verify and a negative-control check, so it is not done yet.
- The full gate tier's wall clock equals its slowest gate, `run-motion-gates` (about 135s), which runs about 40 scripts one after another; threading them four at a time could save about 20 to 30s.
- A gate result is not cached per input hash: `check-render-undefined-vars` and `check-dead-api-calls` read whole-tree inputs that are not declared, so a stale pass would be worse than the time saved.
- The oldshape audit (a read of every stored post over SSH) has no timing of its own until it appears in the first `[time]` table.
