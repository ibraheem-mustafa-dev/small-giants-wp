---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-14
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Spec 41 nav-menu: Waves A+B+C (steps 1-23) DONE, deployed, and live-verified.** Wave C's
own live-verification sweep (Steps 22/23) found + fixed 4 real defects same-session (D1038).
Then Bean did a full hands-on review of the live result and reported ~26 issues in one
message (D1039) — root-caused, solution-designed, and shipped: the large majority of that
register, PLUS a further ~1.5 days of follow-on work not yet written into the register file
itself — a terminology/architecture redesign splitting "underline" from "separator" (FR-41-37),
flipping the smart-contrast auto-fix to opt-in by default, a hover-gradient toggle for item
text, generalising the hover-sweep effect to any angle, fixing the drawer's `listColumns`
reading order, and a same-day sticky-header dropdown-stacking fix (dropdown now reparents to
`<body>` on open so it can't be clipped by a sticky header's own stacking context). A
`/qc-council` diagnostic pass on top of all this found and fixed 2 further regressions
(ancestor-current + keyboard-focus highlight lost during the body-reparent; submenu colours
defaulting off a runtime contrast check instead of a fixed per-state default).

**Both previously-open decision items have now been resolved and shipped (2026-09-14):**
Bean picked colour attributes directly on `sgs/responsive-logo` (not a reintroduced head-row
wrapper) for the drawer-logo colour work — `backgroundColour`/`backgroundColourGradient`/
`backgroundColourHover`/`backgroundColourHoverGradient` added, mirroring `sgs/brand-strip`,
commit `46fbdb5a0` (D1045), live-verified, parking entry archived. Click-outside-to-close for
touch devices was approved and built directly — a document-level click listener in
`mega-disclosure.js` now closes an open dropdown/mega panel on an outside tap, commit
`6f7dc3867` (D1046). A third, previously-unrecorded defect was also found and fixed same
session: `sgs/nav-menu`'s drawer re-render pass was emitting a hidden duplicate "Open menu"
burger; gated to the real header/bar pass only, commit `ab9e5f893` (D1047), live-verified
exactly one such element exists at both mobile and desktop widths. Everything else previously
listed here as open (L1 burger→drawer typography mirror, the drawerRef collision bug, and
current-page state-hierarchy propagation) has also since shipped.

**Still genuinely open — do not treat as closed:** Wave C's own steps 25 (Bean's formal
3-viewport visual sign-off, per the plan's own pass condition) and 26 (flip a WARN gate to
HARD — re-confirmed unsafe twice today, `sgs/nav-menu` itself still carries 7 ungated-paint
findings) have NOT been done. Live testing today also surfaced a real, reproducible-but-
intermittent click-reliability issue on the drawer's own burger button (2 of 3 real clicks
failed to open the drawer in one test session) — the duplicate-burger fix above is a genuine,
separate defect fix and is NOT proven to be the root cause of this intermittent issue; Bean
needs to retest live and report back whether the freeze/unresponsive behaviour still occurs.
The D1044 ESC/mega-disclosure bubble-path retest triggered an unexpected page navigation when
tested via a synthetic keydown dispatch — still flagged inconclusive, not confirmed safe,
needs a follow-up session with real keyboard input. File-size drift on `ColourRowExtras.js`,
`edit.js`, `nav-menu-css.php` and `nav-menu-submenu-css.php` (all over their caps) is also
still unaddressed.

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
was the intake doc.** The large majority of its ~26 points are now root-caused and shipped —
including all four items this LEDGER previously listed as "deliberately not built" (L1 burger→
drawer close-button typography mirror, `7c0d11a50`; G6 `drawerRef` collision auto-rename,
`74121a5f1`; the orphaned-palette-slug `currentColor` fallback, `7c0d11a50`; E2 state-hierarchy
propagation, `daa87be8d`) — plus a further ~1.5 days of follow-on work the register file itself
does not yet describe: a terminology/architecture redesign splitting "underline" from
"separator" (`ced102333`, FR-41-37), the smart-contrast auto-fix flipped to opt-in
(`cce38999d`), a hover-gradient toggle for item text (`08d0df5af`), the hover-sweep effect
generalised to any angle + the drawer `listColumns` reading-order fix (`af8f9759a`), and a
same-day fix for a sticky-header dropdown-stacking bug — the dropdown now reparents to
`<body>` on open (`92002dcae`) so a sticky header's own stacking context can't clip it, with two
regressions this reparent introduced (ancestor-current/keyboard-focus highlight lost,
`e62ce1bf2`; submenu colours defaulting off a runtime check instead of a fixed per-state
default, `d9f90b875`) caught by a same-session `/qc-council` diagnostic pass and fixed same-day.
**The register file has not been re-read/updated against this later work — check it against
git log before trusting its own "not yet built" list.**

**Both previously-open decision items shipped 2026-09-14 (see Human Summary above for
detail; D1045/D1046/D1047).** Genuinely open now: Wave C steps 25/26 (formal sign-off + WARN→
HARD gate flip), the intermittent drawer-burger click-reliability issue (needs Bean's live
retest), the D1044 ESC bubble-path retest (inconclusive, needs real-keyboard follow-up), and
file-size drift on `ColourRowExtras.js`/`edit.js`/`nav-menu-css.php`/
`nav-menu-submenu-css.php`.

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
- **D-ceiling:** **D1047** — verify with
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
| **Spec 41 nav-menu colour/state — THE FRONT. Waves A/B/C (steps 1-23) done; the post-review fix register (see "THE FRONT" above) is now the real front, not the plan's own step count** | `.claude/reports/2026-09-12-nav-menu-visual-review-register.md` (intake — stale against the latest commits, see "THE FRONT"); `plans/phase-nav-menu-colour-state.md`'s "Execution Progress Log" is ALSO stale (last updated 2026-09-11, predates the register work); spec: `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` |
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
