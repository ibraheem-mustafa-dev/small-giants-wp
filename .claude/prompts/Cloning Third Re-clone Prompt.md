Invoke /autopilot before doing anything else.

Context: SGS is a WordPress block framework; its cloning system (Spec 48, code in `scripts/computed-route/`, `scripts/parity/`, `scripts/local-wp/`) turns a client's Claude Design draft into a working SGS site. The root-cause fix pass is finished: every cause RC1 to RC17 in `.claude/reports/2026-10-29-clone-homepage-root-causes.md` is fixed and merged to `main` (the tracks and their commits: `.claude/plans/2026-10-29-clone-root-cause-fixes.md`, its "Progress" section), the route suite on `main` fails only its 5 known baseline tests, and fresh intakes of all three clients ran on the fixed route (2026-10-30, `905d3d7ae`). This session finishes the job: the low-confidence picks, Bean's review batch, the snapshots and default paint, the third full re-clone, the push and the checks.

What cloning means (Bean, binding): a draft is a Claude Design handoff folder (`sites/<client>/handoff/`: `.dc.html` code and logic, `tokens/*.css`, `surfaces.json`, `animations.json`, `MANIFEST.json`), never WordPress markup. Cloning places the correct working SGS, WordPress or WooCommerce block for each draft part, carrying its content, CSS and motion as the draft declares them; a static copy where a working block exists is a route bug. Every fix is universal, never keyed on one draft's words or names; a newly reported symptom is root-caused before it becomes work (memory `plan-items-are-root-causes-not-symptoms`). Confirm a fix by the result matching its goal on the real artefact.

Read first: the plan's "Progress" section (state, calibration done, the open questions for Bean); `.claude/LEDGER.md`; `.claude/plans/2026-10-23-cloning-tool-completion.md` Phase 2 (the re-clone steps); `scripts/computed-route/prompts/skeleton-finaliser.md` (how to make the picks). Grep Spec 48 to the section a step touches; never read it whole.

## Machine rules (2026-10-30)

- The C: drive is full (about 1 GB free). Start every command that runs node, npm, python, a build, a test, a calibration, an intake or a browser with the temp folder on B: (Git Bash: `TMP='B:\sgs-tmp' TEMP='B:\sgs-tmp' <command>`; PowerShell: `$env:TEMP='B:\sgs-tmp'; $env:TMP='B:\sgs-tmp';` first). Calibration's per-site lock lives in the temp folder, so every calibration run must use B:. Check free space (`df -h /c`) before long runs.
- One calibration at a time (the machine has 32 GB; one run peaks near 6 GB). Stop a background node run by its Windows PIDs found with `wmic process where "name='node.exe'" get ProcessId,CommandLine`, never `taskkill //PID $!` (Git Bash's `$!` is not a Windows PID; memory `windows-shell-gotchas`).
- Never type `git stash`, even to list. Explicit pathspecs; a merge commit needs `[batch-ok:<reason>]` after checking the staged index. Never link or junction `node_modules` or `cache/` into a worktree; before any `git worktree remove`, `Get-ChildItem -Recurse -Force -Attributes ReparsePoint <worktree>` must print nothing.
- Under load, some browser tests in the route suite time out (`fill-entrance`, `motion-sample`, `fill-declared-write`); rerun a failing file alone before treating it as real.

## Steps

1. **The low-confidence picks (you make them, Bean's ruling 2026-10-29: the agent running the clone makes them and brings the open points to Bean; there is no separate finaliser agent).** `sites/<client>/build/intake/finalise-request.json` is written for each client: Indus 18 rows on 11 surfaces, Mama's 182 on 21, Eye Care 115 on 17 (large files: read them by surface with `node -e`, never whole). Follow `skeleton-finaliser.md`, write `finalise-picks.json`, apply with `node scripts/computed-route/intake.mjs --apply-picks <client>`. A pick you cannot decide from the code and the draft goes to Bean's batch with its evidence.
2. **Bean's review batch, one message.** From each client's `build/intake/review.md`: the rows the intake changed (Indus 61, Mama's 11, Eye Care 63), the palette-role rows (Eye Care's marks were reset by the 2026-10-29 intake; a brand registry colour such as `--wa-*` gets no palette slot, Spec 48 FR-48-31 and memory `brand-colours-are-block-owned-not-palette`), the page-map rows, the picks you could not decide, and the open questions listed in the plan's Progress section (Eye Care's "Pay now"/"£0" labels; the framework gaps "pick up to 3", the per-cookie price, the logo hover bounce and speed-up, per-width hero SVGs; the timeline `textColourHoverGradient` reading). Every question self-contained, with options and a recommendation. Then `intake.mjs --apply-review <client>` (careful: it writes intake.json's page-map proposal, memory `apply-review-replaces-the-regenerated-page-map`).
3. **Snapshots.** Re-extract each client's theme snapshot from its confirmed palette marks (`python plugins/sgs-blocks/scripts/theme-extractor/extract.py --client <slug> --draft "<entry .dc.html>" --intake sites/<slug>/build/intake/intake.json --merge-onto sites/<slug>/theme-snapshot.json --out sites/<slug>/theme-snapshot.json`; Eye Care's is stale against its 2026-10-28 draft), check the snapshot gates, commit.
4. **Deploy and mirrors.** The plugin on the test sites predates the whole fix pass: deploy with `python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test,mamas-test,eye-care-clone-test` (queue lines in `.claude/queue.md`), push each snapshot with `push-theme-snapshot.py`, then on the mirrors (WSL: `wsl -d Ubuntu -u root -- bash -lc 'service mariadb start; service apache2 start'`) run `sync-build.sh all`; delete Eye Care's stale `page-my-account` template 178 and Mama's hollow flow post 159; deal with the gift-card scaffold template 346 and the cash-on-delivery setting on mamas-test.
5. **Calibration.** Slot maps are current for every block the 2026-10-29 proposals placed (calibrated 2026-10-30 after the merges; product-card and cart on local-mamas). Measure each client's default paint on its own mirror once its snapshot is final (`node scripts/computed-route/calibrate.mjs --site local-<client> --client <slug> --blocks <list>`, no `--slot-map-only`), one run at a time. The site run refuses a surface whose blocks lack a current slot map and prints the exact command.
6. **Third full re-clone** (mirror route, completion plan Phase 2), per client with queue lines: mirror refresh, `reset-login.mjs`, `sync-build.sh`; `site-build.mjs --site local-<client>` (dry run, then `--apply`; it now reconciles a catalogue product to its record, so Mama's product 257 drops its 24 old variations); `manifest.mjs --apply`; `site-run.mjs` (0 failed stages; the built-equals-reviewed, calibration and saved-inventory freshness checks must pass); `push-to-remote.sh` (`--dry-run` first; it refuses a different `sgs-blocks` build and ends with `site-check.mjs`); `census-all.mjs --check`.
7. **Check against the draft** on each test site at 375/768/1440: site-check, census, `/vision-audit` on Mama's and Eye Care, and Bean's reported symptoms as the goal check (homepage content, Eye Care links, the hero frame, list icons and slider count, the Instagram hover, the mega menus against the hand-built references, the footer and its open-status wave, the trade application form, the logos' motion, the About background SVG, the Our Story timeline and its family and certification pictures and bullets, Mama's configurator steps with their prices, Mama's FAQ accordion and time-of-day greeting). List every remaining difference by root cause for Bean; a new symptom is root-caused before anything else.
8. `/qc-council` on the session's work, `/handoff`, and delete this prompt file.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | first, before anything else |
| `/sgs-wp-engine` | every WordPress, block, deploy and site step |
| `/systematic-debugging` | any failure or unexpected result: prove the cause before a fix |
| `/qc-inline` | checking each step's result against its goal |
| `/vision-audit`, `/visual-qa` | step 7 |
| `/wp-sgs-deploy` | step 4's deploy |
| `/sgs-db` | DB questions (read-only; `sgs-update-v2.py` is the only writer) |
| `/delegate`, `/dispatching-parallel-agents` | only for independent fix work a check uncovers (the API credits were out on 2026-10-29; use the Agent tool) |
| `/qc-council`, `/handoff` | step 8 |

## Tools

| Tool | Use |
|---|---|
| Playwright MCP / Chrome DevTools MCP | live pages at 375/768/1440, computed styles, real clicks (Lenis smooth scrolling defeats elementFromPoint probes) |
| `ssh hd` | read-only checks and WP-CLI on the test sites (credentials in `.claude/secrets/<site>.env`) |
| WSL mirrors `local-indus`, `local-mamas`, `local-eye-care` | the build and calibration targets (`calibration-targets.json`) |
| `scripts/computed-route/README.md` | every route module and command |

Done when the third re-clone has 0 failed stages on all three clients, is pushed to their test sites, and site-check, census and the vision audits have run, with every remaining difference listed by cause for Bean.
