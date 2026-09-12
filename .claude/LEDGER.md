---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-12
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Spec 41 nav-menu: Waves A+B+C (steps 1-23) DONE, deployed, and live-verified.** Wave C's
own live-verification sweep (Steps 22/23) found + fixed 4 real defects same-session (D1038).
Then Bean did a full hands-on review of the live result and reported ~26 issues in one
message — colour defaults, a hover-state regression, submenu interactivity, the dropdown
chevron's architecture, burger typography/scroll, and several missing test configurations.

**That review is now fully processed: root-caused, solution-designed, and ~18 fixes are
shipped, committed, and live on the canary** (D1039, full detail in
`.claude/reports/2026-09-12-nav-menu-visual-review-register.md`). Three of Bean's own points
needed a second or third investigation pass before landing on the right answer — worth
knowing this rebuild's verification is genuinely thorough, not just "looked green once."

**Four items are deliberately NOT built yet — they need Bean's decision, not more
investigation:** mirroring the burger fix onto the drawer's close button (low-risk, just
ran out of session time); a real architectural bug where an unnamed nav-drawer silently
opens the wrong (site-global) drawer; a framework-wide (335 call-site) silent-failure mode
where a renamed/deleted palette colour vanishes with no warning; and Bean's own new
requirement that the current-page state should visually bubble up to a top-level parent
item (a genuinely new feature, not a bug). See "THE FRONT" below for exactly what to do
with each.

**Prior track (clone-fidelity closeout + R8 motion) is fully done** — see "Prior work (closed)"
below for the record; not the front any more.

## Prior work (closed) — clone-fidelity closeout + R8 motion recognition

**Fully closed, swept to `.claude/memory/session-2026-09-11-prior-work-closed.md` for the full
narrative (11-defect closeout D1015, R1/R9/R10 D1018, R8 motion recognition D1021-D1026/D1032
7/13 real-world coverage).** Still genuinely open from that track, carried forward: R1's real
17-attribute conversion (measured, not built — `reports/2026-09-10-r1-rescoped-worklist.md`);
the `tier_object_base()` 67-attribute over-match (latent, needs fix-or-park decision); the
Mama's Munches PRODUCT draft's non-BEM hard-halt (needs the BEM-recognition brainstorming
decision); header/footer (paused behind R8, unchanged); trust-bar pill padding gap (minor).


## Blockers

**None.**

## THE FRONT — what to pick up next

**Spec 41 nav-menu Waves A/B/C (steps 1-23) are DONE.** Steps 24 (withdrawn, D1036) and 25
(Bean's formal sign-off) remain in the original plan but are superseded by the live review
below, which is a more thorough real-world check than step 25 would have been in isolation.
Plan: `plans/phase-nav-menu-colour-state.md`'s "Execution Progress Log" has the full step
history if needed, but the real front now is the post-review fix register, not the plan.

**Bean's live review + fix register — `.claude/reports/2026-09-12-nav-menu-visual-review-register.md`
is the single source of truth for this.** ~18 real defects found, root-caused (some needed 2-3
investigation passes to get right — read the register's "Wave 1.5" section before assuming a
verdict is final), solution-designed, and shipped same-session. Commits: `fc98d531a`,
`44c661bfa`, `10670bf82`, `8f9b25c1d`, `154ef2f54`, `e73c91dff`.

**Four items deliberately NOT built — pick up next, in this order:**
1. **L1 — mirror the burger typography fix onto the nav-drawer close button.** Lowest risk,
   proposal already written (`.claude/reports/2026-09-12-nav-menu-wave2-cluster4-burger-solutions.md`
   §L1), same mechanical pattern as the already-shipped burger fix. Just dispatch it.
2. **G6 — `nav-drawer`'s `drawerRef` defaults to an unscoped literal**, so any drawer without
   an explicit unique ref silently opens the site's GLOBAL header drawer instead of its own.
   Real architectural bug, not something Bean originally reported — found testing mega-menus
   in a drawer. Proposal exists (`...cluster5-architecture-solutions.md` §G6) but needs Bean's
   sign-off on the collision-detection approach before building.
3. **Orphaned palette slug** — `sgs_colour_value()` (framework-wide, 335 call sites, 73 files)
   silently renders transparent if a client's chosen colour is later renamed/deleted from the
   palette. Proposal exists (same doc, §orphaned-slug) but needs Bean's sign-off before
   touching a helper this widely shared.
4. **E2 — state-hierarchy propagation.** Bean's own new requirement: the current-page's state
   should visually bubble up to its top-level parent item so a visitor can tell which menu
   contains the current page without hovering. Genuinely new feature, real prior art already
   identified (FR-41-13's `:has()` pattern extends directly), but needs Bean's decision on
   the propagated-state visual treatment before any code is written.

**Process note for whoever dispatches multi-agent work next:** two implementation agents this
session each bundled a DIFFERENT sibling's uncommitted work into their own deploy `--payload`
instead of stopping and reporting back. No harm resulted, but every future multi-agent brief
on this shared worktree must state explicitly: "if the deploy gate blocks on a file outside
your scope, STOP and report back — never add it to your own payload." Full lesson:
`C:/Users/Bean/.claude/memory/learning/2026-09-12-payload-must-not-bundle-a-siblings-unsigned-off-work.md`.

Five shared framework components were safely extended earlier in this phase (D1028); a
shared-worktree commit-corruption incident was caught and fixed (D1029).

**Prior track (R8 motion cloning + header/footer)** — see "Prior work (closed)" above for the
full record + remaining loose ends (R1, `tier_object_base()`, BEM-recognition decision,
trust-bar padding). Header/footer is still paused behind this phase — read
`.claude/prompts/2026-09-10-header-footer-implementation.md` in full when picked back up.

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
- **D-ceiling:** **D1032** — verify with
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
| **A separate, parallel track — header/footer/mega-panel motion + Indus branded content, updated 2026-09-11 (this is NOT the stale 2026-09-10 snapshot — re-read it fresh)** | `.claude/prompts/2026-09-10-header-footer-implementation.md` — motion capability (cursor-field/particle-trail/grid-dot/flowing-gradient/surface-treatment/scroll-reveal) shipped on `site-header-row`/`site-footer-row`/mega-panel; Indus Brands mega-menu content recovered into a real test post; two real bugs found+fixed en route (`sgs/card-grid` + `sgs/brand-strip` image-picker schema/UI mismatch silently wiping the live frontend list — D1027, D1031); confirmed no separate cloning pipeline or separate WP site is needed for per-client branded content — the shared canary hosts it directly via `push-theme-snapshot.py` + the active-header/footer option. A real path exists to build Indus's full header/footer/mega-panel next, no infrastructure blocker. |
| Today's full fix detail (main closeout) | `decisions.md` D1015 (also D1013, D1014 for the measurement-tool repair that preceded it) |
| Second-pass fixes (hover-zoom, trust-bar border, section-boundary detector, hero split-media) | commits `ae604c09a`, `56e51a7dd`, `d216ca7cd`, `4b6072757`, `ec3fcabfd` — no separate D-number, see this LEDGER's Human Summary |
| BEM-recognition + template-detection brainstorm (NOT yet actioned) | `plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` |
| R8 motion-recognition design (settled, references only) | `plans/archive/2026-09-10-r8-motion-recognition-brainstorm.md` |
| R8 execution plan (DONE, archived — reference only) | `plans/archive/phase-r8-motion-recognition.md` |
| **Spec 41 nav-menu colour/state — THE FRONT, Waves A+B closed (17/27 steps)** | `plans/phase-nav-menu-colour-state.md` — read "Execution Progress Log" first (spec: `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`) |
| Header/footer spec | `specs/37-HEADER-FOOTER-BUILDER.md` |
| Header/footer stalled strategic plan | `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Tier-migration requirements (DONE, archived — R1/R8/R9/R10 all shipped, D1018/D1032/D1033; nothing load-bearing left uncaptured — verified against Spec 31 before archiving) | `plans/archive/cloning-pipeline-tier-migration-requirements.md` |
| BEM layer-aware matching design (DONE, verified + archived — D1017) | `plans/archive/2026-09-08-parity-tool-bem-layer-aware-matching-design.md` |
| Measurement-integrity phase (DONE, archived — D1016) | `plans/archive/phase-measurement-integrity.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
