---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-10
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**The clone-fidelity closeout track is fully done, including a second pass of smaller fixes
found after the main closeout.** Today shipped 18 real defects/gaps fixed and verified live (14
from the main closeout + 4 more found afterwards), the cloning pipeline's own section-finder
bug fixed (it was missing sections nested more than one level deep), plus a design doc
(not yet actioned) on how to widen the pipeline beyond SGS-BEM drafts. Header/footer remains
the next track — nothing changed there today; it's still waiting on your pick from the handoff
prompt.

**What's shipped (full list, in order):**
1. Testimonial star colour, font-loading bug + security hole, 4 footer bugs, heading-font leak,
   hero text centring, trust-bar background + pack-size pill typography, product-card border
   regression, brand image sizing, quote block's italic default flip, hero hover-zoom
   (rebuilt as reusable shared capability) — the 11-defect main closeout, `decisions.md` D1015.
2. One of those (product-card title font) was found wrong and corrected the same session — a
   self-catch, not assumed correct. Also in D1015.
3. Independent 3-viewport visual verification (3 design-reviewer agents, real screenshots +
   interaction checks) confirmed page-body fidelity is genuinely excellent and confirmed the
   header/footer gap.
4. Parity-tool scope correction: excludes header/footer/nav chrome from scoring (a separate
   system) and gates CSS properties on whether they can actually apply. Regression-lock fixtures
   added same day. Commit `0aa4b25f1`.
5. **Second pass, found after the main closeout:**
   - Hover-zoom (`hoverSpillScale`) investigated further — the CSS was actually already working
     live (an earlier session's "broken" report was never explained, flagged not resolved) — and
     the hardcoded `scale(1.05)` was deduplicated to reuse the existing hover-scale token
     mechanism. Commits `ae604c09a`, `56e51a7dd`.
   - Trust-bar badge circle border was an unconditional hardcoded CSS fallback with no editor
     control — added `iconCircleBorderWidth`/`iconCircleBorderStyle`/`iconCircleBorderColour`
     following the existing box-family pattern, live-verified via `getComputedStyle`. Commit
     `d216ca7cd`.
   - Cloning pipeline's section-boundary detector fixed — it only recursed one level into
     `<main>`/`<article>` for `<section>` children, missing sections nested deeper past inert
     wrapper divs. Verified on the Mama's Munches product draft (found 8 sections, was 6) with a
     homepage negative control (byte-identical, no regression). Commit `4b6072757`.
     File: `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py`.
   - Hero split-media image not filling its column at tablet width — proven CSS-specificity bug
     (a shared media-atom rule tied with and beat the hero's own height rule on load order),
     fixed with a higher-specificity scoped rule in `render.php`, live-verified at 7 breakpoints
     (375-1440px). Commit `ec3fcabfd`.
6. Two plan docs re-verified against real live evidence (not their own claimed status) and
   archived: `2026-09-08-parity-tool-bem-layer-aware-matching-design.md` (D1017, commit
   `1ab1abea6`) and `phase-measurement-integrity.md` (D1016, commit `80c6442c0`).
7. **New design doc produced, NOT yet actioned** — awaiting your pick from its menu:
   `plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`. Researches widening
   HTML-draft recognition beyond the current BEM-only rule (found an existing conversion step
   whose output is computed but never wired into the accept/reject gate — a near-free small fix)
   and detecting template/archive-shaped pages to take structural shortcuts. Ranked menus only.
8. Informational research note (no build): Anthropic's "Claude Design" tool needs no special
   pipeline support — its static-HTML export is treated like any other non-BEM source. Filed at
   `C:\Users\Bean\.claude\memory\research\2026-09-10-claude-design-sgs-pipeline-compatibility.md`.
9. **Third pass, same day — tier-migration doc's 3 open design questions settled + R1/R9/R10
   shipped (D1018):**
   - New DB column `block_attributes.tier_shape` — promotes an existing but buried discriminator
     (flat-sibling / tier-object / box-only) into a proper DB-derived column, matching the
     `box_family` pattern. Independently gap-checked by a separate agent (5/6 held up; one
     disclosed process gap — an unfindable `/qc-council` transcript, not a defect). Commit
     `58642349d`.
   - **R1 rescoped and found 96% already done** — the old 105-families/41-blocks estimate was
     stale. Real remaining work: 17 attributes across 9 blocks (not yet built). Report:
     `reports/2026-09-10-r1-rescoped-worklist.md`, commit `feefcb7a3`.
   - **R9 capability-coverage inventory run** — confirmed motion as the biggest gap, found and
     fixed a new one (`align-content`/`justify-items`, commit `23cd8322f`). Report:
     `reports/2026-09-10-capability-coverage-inventory.md`, commit `09e223a81`.
   - **R10 colour root cause found and fixed** — not a broken colour system, a diagnostic
     classifier blind to shared-file CSS. Unresolved count 253→233. Commit `f6085e72b` (root
     cause), `b9ea6047f` (fix).
   - Both fixes independently re-verified via inline `/qc-inline` (direct code read + live
     self-test run + live DB query, not agent self-report) — held up, 92/100, shipped. Full
     detail + the disclosed `/qc-council`-unavailable process note: `decisions.md` D1018.

**What's still genuinely open:**
- **R8 (motion/animation cloning from raw CSS) — SHIPPED, council-fixed, AND WIRED 2026-09-11.**
  All 14 steps + 4 QA gates of `plans/phase-r8-motion-recognition.md` executed and closed (D1021)
  — a 4-rater `/qc-council` sweep found and fixed a BLOCKER that would have made the whole phase
  a silent no-op plus 5 more real bugs (D1022) — then a design `/qc-council` validated exactly
  where to wire all 8 modules into the real pipeline, built both streams (each checked by its own
  `/qc-inline` subagent reviewer before acceptance), and they are now LIVE in `assembly.py`
  (Tier 1/2/3, new step 3a1b) and a new `stage_neg1_motion_probe()` pre-flight stage in
  `sgs-clone-orchestrator.py` (Tier 4a/4c/4d) (D1023). **One real, disclosed, non-blocking gap
  remains open:** `fxTrigger` can currently only resolve to `'load'` in the live pipeline — the
  wiring's snippet-builder reuses an existing helper that deliberately excludes `:hover`-scoped
  CSS, so Tier 2's hover/scroll branches are correct and tested in isolation but unreachable from
  a real clone today. Fails safe (never fabricates a wrong trigger), not built this session —
  needs its own scoped look. Real-world Tier 1+2 coverage: 5/13 (~38%) after 2 fix rounds against
  a genuine 0/13 measurement — modest, not strong, and disclosed as such. Full detail:
  `decisions.md` D1021 + D1022 + D1023, `reports/2026-09-11-r8-tier1-2-coverage-measurement.md`,
  `reports/2026-09-11-r8-tag-heuer-full-verification.md`. Header/footer is next (see below).
  One minor doc-accuracy item for next touch: the plan's own QA-gate pytest command collects zero
  of this phase's files (keyword collision), not a code defect.
- **R1 is NOT done** — corrected 2026-09-10 later same day (was miswritten as "done" here and in
  `decisions.md` D1018 in the same breath as listing its own open work; Bean caught it). Only
  R1's MEASUREMENT is done (96% already correct); the real remaining 17-attribute conversion has
  not been built — verified via `git log` showing zero converter commits touching it since
  `reports/2026-09-10-r1-rescoped-worklist.md` landed.
- A latent bug flagged, not fixed: an older predicate (`tier_object_base()`) over-matches 67
  unrelated attributes the new `tier_shape` column correctly excludes — hasn't caused a live
  problem yet (confirmed via `sgs/gallery.padding`). Needs a decision: fix now or park.
- The Mama's Munches PRODUCT draft (not the homepage) still cannot fully clone — its sections
  are now correctly found, but every section hard-halts at the next stage because its classes
  aren't SGS-BEM. Needs either a draft rewrite or the Tier 0 gate-wiring fix from the
  brainstorming doc — your call, not made yet.
- Header/footer — still paused behind R8 per today's focus; nothing changed here today.
- Trust-bar pill padding gap (7px 13px draft vs 8px 16px live) — still open, minor.

## Blockers

**None.**

## THE FRONT — what to pick up next

**R8 (motion cloning from raw CSS) SHIPPED 2026-09-11 — header/footer is next.** Full sequence
completed end to end: `/brainstorming` → `/qc-council` (4 raters) → `/research-buddies` →
Bean-directed Tier 4c/4d addendum (D1019) → `/phase-planner` (14-step plan, docscore A/95%) →
full execution (`/subagent-driven-development`-style dispatch, every step independently verified)
→ closing `/qc` pass on the plan doc itself (3 accuracy fixes) → live TAG Heuer verification
(Step 14). All commits on `main`, pushed. Design doc: `plans/2026-09-10-r8-motion-recognition-brainstorm.md`.
Execution record: `plans/phase-r8-motion-recognition.md` + `decisions.md` D1021.

**Header/footer implementation is paused, not dropped** — still next after R8. Read
`.claude/prompts/2026-09-10-header-footer-implementation.md` in full when picked back up — it has
the evidence, the root cause, Spec 37's real status, and the one open question to ask Bean before
starting (hand-author this one client's content now, vs. build the Spec 33 Part 2 clone pipeline
first).

**Other loose ends** (lower priority, not blocking):
- R1's remaining 17-attribute conversion (rescoped today, not yet built) —
  `reports/2026-09-10-r1-rescoped-worklist.md`.
- The `tier_object_base()` latent-bug flag (67 over-matched attrs, not yet triggered) — needs a
  fix-now-or-park decision.
- Pick a direction from `plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`
  before attempting the Mama's Munches product-draft clone again — it will hard-halt on
  non-BEM classes otherwise.
- A test clone of a second draft page (Bean's own next step, to test the pipeline's claimed
  universality) — the product draft was the first attempt; it needs the BEM-recognition
  decision above before it can proceed further.
- Trust-bar pill padding (7px 13px draft vs 8px 16px live) — real gap, not urgent.
- A heading-structure oddity found on the verification page only (two `<h1>` elements) — likely
  a test-page artefact; check on production page 2742 before treating as real.

## Methodology guardrails (carried forward — all still true)

- ⛔ **`git grep` only, never `grep -r`** — stale worktrees inflate counts massively.
- ⛔ **Never pipe a population-defining survey through `head -N`.** Count first (`| wc -l`).
- ⛔ **`$?` after a pipe reads the LAST command's status.** Redirect first.
- ⛔ **`git grep -c` with an explicit path prints `path:count`, not a bare integer.**
- ⛔ **Python `shell=True` on Windows is cmd.exe, not bash.**
- ⛔ **A regex `\b` after a slug matches inside a hyphenated sibling.**
- ⛔ **A name-mention is not a usage.** Real call-detection, not string match.
- ⛔ **A subagent must never mutate a repo file as a test fixture.**
- ⛔ **Metadata is not evidence.** Filename, line count, grep-hit count — open the file.
- ⛔ **A subagent cleaning up its own scratch server can nuke the wrong process.** One agent this
  session ran `taskkill /F /IM python.exe` (by NAME, not PID) while tearing down a local test
  server — kills every Python process on the shared machine, not just its own. Always kill by
  specific PID.
- ⛔ **A single sub-agent's unverified summary line can be wrong even when its other findings are
  solid.** One design-reviewer agent got the footer content claim backwards while correctly
  verifying 6 other sections with real measurements — caught only because two OTHER independent
  agents disagreed and a direct HTML fetch settled it. Contradiction between independent checks
  means verify directly, never silently pick a side.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately.**
- **Commit straight to `main`; never a PR, never a stash; integrate after every task.**
- **`build-deploy.py --dry-run` is NOT dry** — it builds, packages, SCPs and installs for real.
- **`build-deploy.py` isolates by DEFAULT** (D993) and does NOT abort on dirty files it is not
  shipping. A dirty shared checkout is not a reason to hold a deploy.
- **A Playwright MCP browser profile is SHARED across sessions.** If locked, report
  COULDN'T-TEST or use `chrome-devtools-mcp` — never kill the lock-holder.
- **A commit flushes the WHOLE index, not just your pathspec.** Verify with
  `git diff --cached --name-only` first. `--amend` is worse — it once swept 89 staged files.
- **A raw detector count is an UPPER BOUND, not a workload.**
- **A gate that can never go green is a defect in the gate.**
- **An exact-name exemption set must never become a pattern.**
- **At least THREE sessions hold uncommitted work in this checkout.** Check `git diff` before
  attributing an unfamiliar change.
- **A schema default erases the difference between "absent" and "chosen".** WP substitutes it
  before render.php runs. If a pipeline relies on absence meaning something, the default must be
  the absent-shaped value (D1005).
- **Bean's eye beats the parity tool.** It scored clean on real defects and flagged several that
  render correctly. Treat its output as a hypothesis, never a verdict.
- **A fidelity dimension must never score a native block's own semantic choices as defects.**
  Tag identity, and by extension any other CONVERT-not-mirror decision, is informational
  context, never a percentage (D1013).
- **A fixed-length text-anchor window degrades on long/differently-composed ancestors.** A
  "missing element" finding on a SECTION-level anchor needs a live content comparison before
  it's trusted.
- **When subagent dispatch hits a rate limit, don't retry blind — do the work inline instead.**
  Direct tool calls in the main thread aren't subject to the same per-model subagent quota.
- **A block.json description can be wrong and unchecked for months.** The product-card title
  font-family bug traced to a description written 2026-08-27 that was never verified against
  the actual draft CSS — treat a spec/description as a claim to verify, not ground truth, even
  when it's already in the codebase.
- **A pipeline-level fix (converter/DB) doesn't retroactively fix an already-cloned page** — it
  needs a matching content-sync applied to the live page's stored attributes, or the fix is
  correct-but-invisible until the next full re-clone.
- **A walker-level detector bug can hide behind a downstream failure for a long time.** The
  section-boundary detector's one-level-deep recursion bug was invisible on drafts that happened
  to nest sections shallowly; it only surfaced once a differently-structured draft (nested past
  an inert wrapper div) was tried. A detector passing on every drill so far is not proof it
  generalises — test on a structurally different input before trusting it.
- **"CSS reported broken in an earlier session" is not the same claim as "CSS is broken now."**
  Re-verify live before rebuilding a mechanism that already works — the hover-zoom investigation
  found the effect was actually firing correctly; the earlier report's cause was never explained
  and is flagged, not resolved.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** **D1020** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Canary:** sandybrown, WP 7.1. Fresh-clone verification page **3448**
  (`/fresh-clone-verification-mamas-munches-homepage-re-clone/`) — this session's fix target.
  Production homepage: page **2742**.
- **Parity — figures are STALE the moment a new commit lands on the tool itself; re-run before
  quoting.** Last full run (page 3448, post all today's fixes): STRUCTURE 93% (324/348), LAYOUT
  75% (579/773), PAINT+TYPE 89% (1260/1412), CONTENT 100% (234/234). These numbers UNDERSTATE
  real progress — they're dominated by hundreds of properties unrelated to what got fixed. Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh, and check `sites/mamas-munches/accepted-differences.md` for any recorded exception to
  subtract by hand before reporting a number to Bean.

## Pointers

| For | Read |
|---|---|
| **The front — header/footer implementation** | `.claude/prompts/2026-09-10-header-footer-implementation.md` |
| Today's full fix detail (main closeout) | `decisions.md` D1015 (also D1013, D1014 for the measurement-tool repair that preceded it) |
| Second-pass fixes (hover-zoom, trust-bar border, section-boundary detector, hero split-media) | commits `ae604c09a`, `56e51a7dd`, `d216ca7cd`, `4b6072757`, `ec3fcabfd` — no separate D-number, see this LEDGER's Human Summary |
| BEM-recognition + template-detection brainstorm (NOT yet actioned) | `plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` |
| R8 motion-recognition design (settled, references only) | `plans/2026-09-10-r8-motion-recognition-brainstorm.md` |
| **R8 execution plan (start here to build — Step 1 is SESSION-START)** | `plans/phase-r8-motion-recognition.md` |
| **Spec 41 nav-menu colour/state — BUILD PLAN, ready to execute, blocked on 7 owner decisions (KJC-7 is a real spec-vs-code gap)** | `plans/phase-nav-menu-colour-state.md` (spec: `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` v0.4.6) |
| Header/footer spec | `specs/37-HEADER-FOOTER-BUILDER.md` |
| Header/footer stalled strategic plan | `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Tier-migration plan (R9/R10 done, R1 rescoped with 17 attrs still open — D1018; R8 is the front) | `plans/cloning-pipeline-tier-migration-requirements.md` |
| BEM layer-aware matching design (DONE, verified + archived — D1017) | `plans/archive/2026-09-08-parity-tool-bem-layer-aware-matching-design.md` |
| Measurement-integrity phase (DONE, archived — D1016) | `plans/archive/phase-measurement-integrity.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
