Invoke /autopilot before doing anything else.

TRACK: Spec 38A, Track L close-out. Live fixtures and standing probes for the effects Track L built on 2026-10-15 (M5.12, M5.13, M5.14, M5.15). Single session; any other S4 tracks still running are peers in the serial queue.

CONTEXT: Spec 38A (`.claude/specs/38A-SGS-MOTION-MODEL.md`) puts all motion in one block attribute, `sgsMotion`. Build plan: `.claude/plans/2026-10-12-spec38a-motion-build.md`. On 2026-10-15 Track L built and pushed (all live on sandybrown since Track I's deploy): scroll progress (f2dea7ac8, plus per-axis scale terms in dd5abde72), the shared loop control `src/shared/effects/loop-control.js` with ambient float (53c07b1ac), Tier G and particle parameters (857c1dbc8, 7b125799b), the hover and icon mappers (fe0ba9fbb), and Ken Burns, SVG loop, Lottie layers, the logo draw and the shared marquee (ae3923568; `background`/`svg-bg` parts d7c01b79a). Every loop runs through `loop-control.js::animateLoop` (WAAPI), never CSS keyframes. Each FR's status line names what is still open; those open clauses are this session's work.

GATE CHECK FIRST: `curl -s -o /dev/null -w "%{http_code}" https://sandybrown-nightingale-600381.hostingersite.com/?p=5229` must return 200. A 403 is the host's edge rate protection (all sessions share one IP): wait, never hammer it, and run live probes one at a time.

READ FIRST
- Spec 38A FR-38A-36, 37, 44 and 52 status lines (their Open clauses are the acceptance cases), §5.4's rows for ambient-float, ken-burns, svg-loop, lottie and marquee, and §13.2.
- `.claude/rules/motion-qa.md` (fixture pages are never deleted or repurposed; a probe joins PROBES only with a stable fixture and a negative control).
- `plugins/sgs-blocks/scripts/motion-qa/probe-scroll-progress.mjs` and `tests/fixtures/motion/pages/scroll-progress.json` (page 5250, a standing deploy probe since 4885fbca6): the model for every new fixture and probe in this session.

TASKS (in order)
1. Fixtures authored directly with `sgsMotion` layers (no migration sweep needed), each built with `scripts/wp-build-page.js --create page` and titled `[GATE — DO NOT DELETE] …`, plus a probe with negative controls, sampled in Chromium and Firefox:
   - FR-38A-37: the Indus `floatIt` (translateY −12px, periods 2.8 to 5s, alternate, ease-in-out, stored phases) sampled at three times; the pause button works (only when pause control is on); focus pauses; nothing moves under reduced motion.
   - FR-38A-52: a Ken Burns zoom-out-once from 108% over 20s, an SVG pulse, a Lottie on scroll, and a logo draw on load, each playing its stored values; a loop over 5s has a working pause control; nothing moves under reduced motion.
   - FR-38A-44: the three drafts' marquees within 2% of the draft: Indus 45px/s slowing to 0.15x on hover with a 5% edge fade; Mama's full loop in 24s, pausing on hover and on touch; Eye Care's 64s loop pausing on hover on desktop and its 30s ticker running only on mobile.
2. Update the FR status lines, `motion-units-landed.json`, `.claude/rules/motion-qa.md`'s fixture table and the build plan; /qc-council on the session's work; /handoff (git rm this prompt file).

GUARDRAILS
- Serial queue: before any build, reseed, deploy or burst of live probes, ListAgents, message every active peer and wait for replies. `npm run build`'s prebuild reseeds the shared DB from the working-tree schema, so build with `run-gates.py --tier fast`, then `npx wp-scripts build --experimental-modules --webpack-copy-php`, then `npm run postbuild`. Any `supports.sgs.elements` change runs `--tier full` before pushing.
- Shared worktree: commit through a private index built from HEAD plus only your changes (exact text replacements in contiguous regions, never a marker-matched hunk), re-sync the shared index for your paths afterwards, never stash, and verify the branch in the same command.
- No inline `style=""`, no legacy fallback (R-31-14), no new direct import of `generated-motion-defs.json`. A motion-only part declares `"prefix": ""` beside `clusters: []`.

OPEN ITEMS NOT IN THIS SESSION (recorded in the spec and the build plan): `bgLottie` and `bgLottieLoop` have no mapper (an M6.5 prerequisite); until the M6.5 sweep migrates stored marquee settings, existing brand-strip and trust-bar marquees render as static rows (Bean, 2026-10-15: no early sweep; they wait for M6.5); M6.6 must move block-owned default hovers into `sgsMotion` defaults before deleting the old rules.
