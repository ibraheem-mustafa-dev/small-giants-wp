Invoke /autopilot before doing anything else.

TRACK: Eye Care Birmingham (LEDGER Front F) through the Spec 48 intake. The Indus review (Track 1) is paused until Spec 38A is finished, so this track runs on its own.

CONTEXT (plain English)
- Eye Care is built by hand and live on eye-care-test (https://darkcyan-grouse-898606.hostingersite.com, credentials .claude/secrets/eye-care-test.env): the finished site is the cloning pipeline's answer key. Bean's rulings live in the fix register .claude/plans/2026-10-02-eye-care-fix-register.md (most rows proven or closed; about two dozen still open with Status "Solve" or "To …", read the counts live) and in 90 accepted divergences in sites/eye-care-ward-end/build/qa/divergences.json (intended differences from the draft). The old Spec 47 pipeline's false positives were triaged there and in sites/eye-care-ward-end/build/qa/triage/*.json.
- Spec 48's intake (scripts/computed-route/intake.mjs) reads a Claude Design export and proposes the block tree; for Indus, Bean's review decisions became framework-wide "standing rules" (scripts/computed-route/lib/skeleton-rules.mjs, data/skeleton-decisions.json `rules`), measured by `node scripts/computed-route/check-approved.mjs <client>` against sites/<client>/build/intake/approved-decisions.json. Eye Care has a Spec 48 handoff folder (sites/eye-care-ward-end/handoff/, 52 surface records) but intake has never run on it.
- Goal: use Eye Care's already-ruled evidence to harden the matching logic, sort the remaining gaps into framework upgrades versus matching-logic fixes, and close the site.

READ FIRST
- .claude/LEDGER.md Front F; .claude/specs/48-CLONING-SYSTEM.md FR-48-6 and FR-48-17; scripts/computed-route/README.md (intake.mjs modes, check-approved.mjs, skeleton-rerun.mjs).
- .claude/plans/2026-10-05-eye-care-functionality-backlog.md row CR13; the fix register's row CR23; .claude/specs/48-CLONING-SYSTEM.md §5.4 Res 33 to 52 (the route defects found on Eye Care).
- B5 (.claude/prompts/2026-10-11-eye-care-draft-mirror.md, editing the Eye Care draft to mirror the live site) is not done as of 2026-10-17, so intake reads the export as Claude Design produced it; divergences.json holds the deliberate differences.

TASKS, IN ORDER
1. Diagnose CR13 first (inline, ~30 min): spacing presets render as pixels framework-wide. includes/helpers-css-safety.php::sgs_css_length_value_preset_slugs reads `slug` at the top level of wp_get_global_settings(array('spacing','spacingSizes')), which WordPress returns grouped by origin, so every bare-number preset ("20") renders as px in 79 caller files since 8ae3efffa (2026-09-08). Establish which meaning each writer intended (Solve and Fill; diff Eye Care's tree files' bare-number spacing values against the draft), then present Bean the fix with its measured effect on Eye Care (before/after at 375/768/1440). Fix only with his go; PHPUnit case on the real origin-grouped shape.
2. Run intake on Eye Care (Opus subagent or inline; ~15 min of setup, then a long background run): `node scripts/computed-route/intake.mjs eye-care-ward-end --record`, then `--finalise` (agent with prompts/skeleton-finaliser.md) and `--apply-picks`. Work in a clean worktree off origin/main (create one under C:\wt\ with its own `npm ci` in scripts/computed-route).
3. Build sites/eye-care-ward-end/build/intake/approved-decisions.json (Sonnet subagent; ~20 min): from the fix register's decided rows, divergences.json and the hand-built trees (sites/eye-care-ward-end/build/*.tree.json, the live pages), in the same shape as the Indus file (category3 rows with rowId verified against review.md, approvedBlock, beanQuote or source). Spot-check 10 rows yourself.
4. Measure and classify (inline judgement, ~1 h): `node scripts/computed-route/check-approved.mjs eye-care-ward-end` and `--no-built`. For every mismatch decide: matching-logic fix (the rules misread something already ruled: fix it as a standing rule with a MUST FAIL test, keeping Indus at `check-approved.mjs indus-foods` exit 0) or framework upgrade (a block or control is missing: record it in the backlog with its evidence). Reuse already-triaged false positives as negative fixtures. Recount register row CR23's 72 unreachable-setting gaps (`.claude/reports/2026-10-07-route/canvas-register-crosscheck.json`, category GAP) against today's block.json files, drop those since built, and carry the rest as missing-feature rows.
5. Close the register's open rows (delegate WP work to wp-sgs-developer; ~1 to 2 h), each verified live at 375/768/1440.

Pull origin/main before each change to lib/skeleton-rules.mjs or data/skeleton-decisions.json, and message any active peer (ListAgents, SendMessage) before a reseed or deploy (serial queue).

QC: /qc-council before /handoff.

GUARDRAILS
- `node --test "scripts/computed-route/tests/*.test.mjs"`: only the 3 known lint.test.mjs brand failures; `check-approved.mjs indus-foods` stays exit 0 after any rule change.
- `python plugins/sgs-blocks/scripts/run-gates.py --tier fast` passes. Deploys only via build-deploy.py through the serial queue, proven by the host marker. Never edit sites/*/handoff/. DB read-only outside the seeder; after any reseed run seed_reference_data.py and generate-attr-role-map.py.