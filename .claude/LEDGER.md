---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-04 (colour-conformance session 11 + concurrent Spec 32/35 gates session)
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Multiple sessions share one `main`
concurrently, every session — treat this as the norm, not the exception; session 11 alone
coordinated live with 3 peer sessions mid-flight, including twice reverting its own in-progress
work to unblock two live-incident deploys from a peer.

**Sessions 8-10 (prior, compressed — full narrative in `memory/session-2026-09-04*.md`):**
road-to-uniform's 9 items fully closed; the colour-conformance track ran a `/qc-council` audit
that found `fix.js`'s own bugs were the real blocker for a large slice of the backlog (3 bugs
fixed, 25 rows mechanically closed); `fix.js` itself was hardened (a live PHP-corruption risk +
a touch-safe-hover doctrine violation, caught by a full-branch review no per-task round could
catch); first-ever real `--apply` run shipped + deployed + live-verified.

**Session 11 (this one) — closed the `sgs_text_decls()` gradient bug at its ROOT, not just its
7 known instances, then ran a `/qc-council` pass that closed 4 more rows and cleanly scoped the
remaining 8.** Verified session 10's dispatched fix (pricing-table/nav-menu) had ALREADY landed
via a concurrent session before duplicating it — caught by reading the ledger/plan doc first, as
directed. Found `sgs_text_decls()` (the shared PHP primitive 7+ blocks call for text-gradient
rows) always built a bare `color:` declaration even for a resolved GRADIENT string — invalid CSS,
silently dropped, despite every caller already having the mandatory `@supports` companion rule
(which alone can't fix a wrong primary declaration). Fixed 7 blocks by hand
(`a65d06927`/`c8fdb0cc7`), then hardened the PRIMITIVE ITSELF in place
(`da2b54583`) — byte-identical for every flat-colour caller, structurally closes this defect
class for every future caller too, not just the 7 found this session. Deployed + live-verified
by a peer session (`small-giants-wp-bd`) via real Playwright gradient probes, 7/7 PASS with
clean negative controls.

Then ran `/qc-council` on 2 more proposed fix-shapes for the 12 `gradient-path-deferred` rows
`fix.js` refuses to touch — both proposals were WRONG as stated (no shared helper fits 6
divergent blocks; no native colour support was actually enabled on the 2 "native retirement"
targets) but each surfaced a smaller, real, evidence-backed fix underneath. Closed 4 more rows
(`nav-menu.featuredColour` `fb06b593d`, `process-steps.background+textColour` `a3e6a8a7f`,
`button.colourText` `0376109be`). Dispatched 4 read-only precedent-search agents for the
remaining 8 — found working precedent for 6 of them (SVG-fill-gradient, ancestor-hover-gradient,
2 dynamic-loop shapes), confirmed NO precedent exists anywhere for the other 4 (genuine new
architecture, flagged for a design gate). Full detail + exact fix-shapes:
`.claude/prompts/2026-09-04-colour-conformance-remaining-8-hard-rows.md` (fresh this session,
supersedes + deletes the session-11 continuation prompt, consumed).

**A separate, concurrent session (`small-giants-wp-90`) ran a Spec 32/35 gates-closure track
in parallel with colour-conformance session 11** — different scope, same tree, coordinated live
via cross-session messaging throughout (verified file ownership via `git log`/`git diff` before
ever acting on a peer's claim, per this project's own hardened discipline). Built the Spec 32
CSS-injection blob-sanitisation gate, 3 new Spec 35 inspector anti-pattern detectors (rules
42/43/44), closed 19 of the original 61 rule-41 element-grouping findings across 15 blocks, and
root-caused + fixed 2 live-breaking bugs on `sgs/post-grid` found during live verification (a
namespace fatal + a REST endpoint crash) — both deployed same night. Also root-caused and fixed
3 D812 control-shape findings (`hero.justifyItems`/`modal.triggerStyle`/`trustpilot-reviews.theme`)
via 3 parallel investigation subagents, independently fact-checked against source before
applying (caught one agent's wrong import-path claim and one missing dead-code deletion before
committing). Full detail: `.claude/prompts/2026-09-04-spec32-35-gates-next-session.md`.

**Canary:** sandybrown-nightingale-600381.hostingersite.com; no live client sites yet.

## State Snapshot

- **Branch:** `main`. 3+ peer sessions (`small-giants-wp-90`, `small-giants-wp-bd`, plus others
  seen via `ListAgents`) were committing concurrently throughout session 11 — the project's
  stated norm. Path-scope every commit; re-check `git status`/branch immediately before each
  commit; never `git stash`/`git checkout --` a file you didn't write without checking who owns
  it first (session 11 reverted its OWN two dispatched agents' uncommitted work twice — once for
  a live production fatal error, once for a lower-priority peer fix — both times confirming
  ownership and notifying the affected agent before reverting).
- **Build:** green — `npm run gate:fast` 89/89 on every commit this session.
- **Session 11 commits (all on `main`):** `a65d06927` (7-block `sgs_text_decls` fix),
  `c8fdb0cc7` (forgot-to-commit FIXTURES entries), `da2b54583` (hardened the primitive itself +
  `sgs_text_states_css()`), `fb06b593d` (nav-menu.featuredColour), `a3e6a8a7f`
  (process-steps background+text), `0376109be` (button.colourText), `a39ee3e4c` + `2acfcc5da`
  (plan-doc write-ups), `e4b3f8456` (new prompt + delete old one). Peer commits interleaved
  throughout (pricing-table hover fix, rule-41 CO2 panel consolidation, 2 post-grid bugfixes
  including one live production fatal error) — not this session's work, see their own sessions.
- **Spec 32/35 gates session commits (`small-giants-wp-90`, all on `main`, interleaved with the
  above):** `be6103869` (Spec 32 CSS-injection blob-sanitisation gate), `0ebfe205b` (Spec 35
  rules 42/43/44), `49d7b1c14`+`9ad892ab8` (rule-41 round 1, 8 blocks), `e4fd4ad90` (spec
  close-out doc), `64396ecee` (root-caused the enum-control-shape detector's window-heuristic
  bug and baselined `timeline.datePosition` as a documented workaround — root cause identified,
  not yet fixed at this commit), `da6e3fd82` (the actual detector fix — closest-mark-wins
  tie-break + regression test — which also unmasked 3 real D812 findings the bug had been
  hiding), `86a8ea627`
  (post-grid fatal namespace bug, deployed), `b8088d274` (post-grid REST uid crash, deployed),
  `ba5dc407f`/`fee0631b8`/`c7f25aa75` (the 3 D812 control-shape fixes: hero.justifyItems,
  modal.triggerStyle, trustpilot-reviews.theme). 2 deploys to sandybrown, both live-verified.
- **Live fronts:** `31-golden-colour-control` — down to the 8 rows named above (from 241 at
  session 8). Everything else in this track's original scope unchanged from session 10.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.
  Closed-track narrative lives in `memory/session-2026-09-04-tracks-history-sweep.md`, not here.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

**Two independent open threads exist right now — pick one, don't try to run both inline.** This
section details the colour-conformance track (below). The Spec 32/35 gates track has its own
full orchestration doc: `.claude/prompts/2026-09-04-spec32-35-gates-next-session.md` — lower
urgency (no live incidents, ~27 rule-41 blocks + 1 deploy + verify queued, all low-risk), pick it
up if the colour track is already claimed by another live session (`ListAgents` first).

You are picking up the colour-conformance track's final stretch — 8 rows confirmed genuinely
hard, 6 of them now have a working precedent found by dedicated investigation, none of it
guessed at. The full spec for every row lives in
`.claude/prompts/2026-09-04-colour-conformance-remaining-8-hard-rows.md` — **read it in full**
before dispatching anything; this section is the orchestration plan, that file is the ground
truth.

## Task 1 — Groups 1-3 (6 rows with working precedent, disjoint files)

**What:** close `google-reviews.starColour`/`star-rating.{starColour,emptyColour}` (SVG fill
gradient), `process-steps.numberColourHover` (ancestor-hover gradient), and
`post-grid.{cardBgColour,categoryBadgeColour}` (dynamic loop colour) — each has a proven
precedent in the codebase to model on, named with exact `file:line` in the prompt doc above.
**Why:** closes 6 of the remaining 8 rows in the colour-conformance backlog with LOW design
risk — each is a proven-pattern reuse, not new architecture.
**Estimated time:** ~15-20 min per group (mechanical, pattern-copy work, not design).

**Orchestration:**
- Execution: delegated (3 parallel subagents, one per group — disjoint files, safe to
  parallelize via `/dispatching-parallel-agents`)
- Model: sonnet via `/delegate` (mechanical-but-nontrivial code, not pure boilerplate)
- Brief per agent: read the prompt doc's Group 1/2/3 section for exact file:line citations and
  the proposed fix; each agent implements ONE group only
- Context needed: the prompt doc IS the cold-context brief — point each agent at it directly
- Depends on: none
- Parallel with: each other (3 groups, 3 disjoint file sets)
- /qc gate after: `npm run gate:fast` + `check-text-gradient-companion.js --check` +
  `check-element-manifest-conformance.js --check` per agent, before each commits

**Acceptance:** all 3 groups' `block.json`/`render.php`/`edit.js` changes committed
(path-scoped, on `main`), gates green, `survey.js` CONFORMANT count moved up by the number of
rows actually closed (verify, don't assume all 6 land cleanly — `nav-menu.featuredColour` this
session found a real partial-limitation mid-fix, expect the same discipline here).

## Task 2 — Group 4 (4 rows, CONFIRMED no precedent, needs a design gate first)

**What:** `tabs.tabTextColour`, `brand-strip.itemTextColourHover`, `mega-panel.iconColour`,
`option-picker.pillTextColour` — all four paint via a bespoke `--sgs-<block>-*` custom-property
chain with NO existing gradient-capable precedent anywhere in the tree (checked exhaustively
this session, not assumed).
**Why:** closes the LAST 4 rows in this specific backlog, but is genuine new architecture — the
prompt doc names one candidate mechanism (a 2nd gradient-carrying custom property + cascade
fallback) as an UNVERIFIED proposal only.
**Estimated time:** design pass ~20-30 min; build time unknown until design lands.

**Orchestration:**
- Execution: inline main thread for the design pass (do NOT dispatch a subagent to invent
  architecture blind)
- Model: opus (main agent) for the design decision; sonnet subagents for implementation once
  designed
- Brief: run `/qc-council` or `/brainstorming` design-mode on the proposed mechanism in the
  prompt doc's Group 4 section BEFORE writing any code — verify it doesn't paint a visible seam
  when only one of the two properties is set, verify `background-clip:text` +
  `background-image:none` degrades safely
- Depends on: none (independent of Task 1)
- Parallel with: Task 1 (different files entirely)
- /qc gate after: the design-gate result itself is the gate — do not let a subagent implement
  an undesigned mechanism

**Acceptance:** either a validated mechanism ships across all 4 blocks (path-scoped commits,
gates green, live-verified), OR the design gate returns NO-GO with a clear reason and the row
gets parked with a named blocker — never a silent skip.

## Dependency graph

```
Task 1 (3 parallel subagents — Groups 1/2/3)     Task 2 (inline design gate — Group 4)
  ↓ gate:fast + companion + manifest checks         ↓ /qc-council or /brainstorming
  commit each group                                 ↓ (only if GO) sonnet subagents implement
                                                      ↓ gate:fast + companion + manifest checks
                                                      commit
  Both independent — no ordering requirement between Task 1 and Task 2.
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — any change that should be live-verified needs a real deploy +
  cache purge BEFORE running any probe against the canary. Coordinate deploy timing with
  whichever peer session is active (`ListAgents` first) — this tree runs 3+ concurrent sessions
  routinely and a deploy race can clobber another session's `.bak` rollback.
- **A gate's own scope is not the whole defect** — `check-text-gradient-companion.js` only
  checks the companion rule is PRESENT, not that the primary emission is correct. All 7 blocks
  fixed this session had the companion and still shipped broken. Read the actual emitted
  declaration, not just whether a check passed.
- **Revert fast for a live incident, never force a commit through under time pressure** — session
  11's two agents both had their uncommitted work reverted mid-flight for peer deploys; both
  redid the work cleanly from a fresh HEAD with no data loss. Reverting fast and redoing beats
  racing a commit past a blocking gate.
- **Fix-shapes are hypotheses, not specs** (`council-fix-shapes-are-hypotheses-not-specs`) — run
  `/qc-council` before dispatching any NEW architectural proposal, especially for Task 2's
  Group 4. Both of session 11's own council proposals were wrong as stated; the council process
  is what caught it before any subagent wasted a build cycle.
- Path-scoped commits only, re-check branch + `git status` immediately before every commit.
- `npm run gate:fast` (89 gates) after every change; read the full output.
- Never `phpcbf` — realign phpcs warnings by hand.

## ▶ ROAD-TO-UNIFORM RECONCILIATION — FULLY CLOSED, all 9 items, qc-council-audited.

All 9 items closed (2026-08-25). Full detail + commits:
`.claude/plans/archive/2026-08-25-road-to-uniform-then-spec-39.md`. 2 residual gaps found by
that closure's own qc-council audit remain open, NOT part of the 9: (1) Spec 32 §5
CSS-injection sanitisation has no gate — `borderStyle`/`textTransform` free-text attrs need
`[^a-zA-Z-]` filtering before CSS concatenation, 9 unaudited `render.php` files named in
`memory/session-2026-08-25*.md`; (2) `text/edit.js`'s "Font" `ToolsPanelItem` has a no-op
individual reset (`hasValue={() => true}`, `onDeselect={() => {}}`) — small, one block.

⚠ **`git stash@{0}` (26 files, base `7a2c68b05`) is STILL UNRESOLVED** — flagged at 3+ prior
sessions' SessionStart hooks, now 24+ hours old. Contains real uncommitted work across
`hero`/`button`/`before-after`/`brand-strip`/`buybox`/`cta-section`/`heading`/`icon-list`/`icon`/
`info-box`/`mega-panel`/`nav-drawer`/`quote`/`site-footer(-row)`/`site-header(-row)`/
`testimonial(-slider)`/`trust-bar`/`GradientCapableColourControl.js`/the generative-background
shader files/`utils/index.js`/`parking.md`. **Whoever owns "session 6" should reconcile this**
(`git stash show -p stash@{0} > backup.patch` first, then apply file-by-file, checking each
against what's since landed on `main` — several of these blocks have been touched by other
sessions since). Do NOT `git stash drop`/`clear` until reconciled.

⚠ **Concurrent occupancy on `main` is the norm** — path-scope every commit, re-check
`git status`/branch and the decisions.md D-ceiling immediately before each write, message the
other active session (`ListAgents`) rather than guessing or forcing `--allow-dirty`/`git stash`
when a dirty-tree gate blocks you.

## ▶ UNIFORMITY SWEEP TRACK — CLOSED bar one detector. Detail: D918/D919/D922/D924/D930/D933.

`01-tab-group` and `21-render-without-control` both closed to zero. Nothing else open — see
COLOUR TRACK for `31-golden-colour-control`.

## ▶ SPEC 32/35 GATES TRACK — 2026-09-04, run concurrently with colour session 11. Detail + full next-session orchestration: `.claude/prompts/2026-09-04-spec32-35-gates-next-session.md`.

**Closed this session:** Spec 32 §5 CSS-injection blob-sanitisation gate (keyword-filter side
verified already covered by CHECK B + existing allowlists — zero gap; the real gap, blob-level
`wp_strip_all_tags()`, closed via `check-style-blob-sanitisation.py`, advisory-wired). 3 new Spec
35 inspector detector rules — `42-no-op-reset-controls` (0 live findings), `43-colour-only-state-indicator`
(22→12, 10 real fixes across 3 UI-shape patterns, rest confirmed false positives), `44-help-text-not-described`
(3→0, all 3 shared components fixed + live-verified). Rule-41 element-grouping: 61→42 (19 closed
across 15 blocks, 2 rounds).

**Root-caused + fixed, not part of the original scope, found via live post-deploy verification:**
`sgs/post-grid` had 2 separate live-breaking bugs — a namespace fatal
(`SGS_Media_Element` called unqualified inside `SGS\Blocks`, `86a8ea627`) and a REST pagination
endpoint crash (`sanitize_html_class` wired directly as a REST `sanitize_callback`, which WP
always calls with 3 args the function can't take, `b8088d274`). Both deployed and
live-confirmed fixed same night.

**Root-caused + fixed, surfaced by the detector-bug fix:** fixing `check-enum-control-shape.py`'s
window-heuristic bug (it could misattribute a finding to the WRONG nearby same-type control —
this is what produced the original `timeline.datePosition` false positive) unmasked 3 previously
-hidden real D812 findings. All 3 fixed via parallel root-cause investigation + independent
fact-check against source (caught one agent's wrong import-path claim, one missing dead-code
deletion) — `ba5dc407f`/`fee0631b8`/`c7f25aa75`.

**Still open:** ~27 blocks remain on the rule-41 backlog (list in the prompt doc); rule 43 has 1
pending recheck (a fix applied but not yet re-verified live); the 3 D812 fixes above are
committed but NOT yet deployed/live-verified (blocked twice tonight by other sessions' WIP in
`before-after`/`cart`/`gallery` — low-risk editor-only change, safe to leave queued); live
Playwright verification of the 8 rule-41 blocks from round 1 got a partial pass (a stuck browser
dialog blocked most of it, later cleared and rerun — 15 of 15 blocks confirmed PASS across both
rounds by the second pass). 23 of 45 baseline/exemption files across the whole gate corpus carry
real debt (~555 entries total) — not this track's job to clear, but worth knowing for anyone
picking a next gate to work.

## ▶ COLOUR TRACK — session 11: sgs_text_decls() root-caused + hardened, 4 more rows closed, 8 handed off with precedent. Detail: `.claude/plans/2026-09-03-golden-colour-staged-rollout.md` + `.claude/prompts/2026-09-04-colour-conformance-remaining-8-hard-rows.md`.

Sessions 7-10 closed the hover-guard, built the contrast guard, hardened `fix.js`, shipped the
first real `--apply` run. Session 11 (this one) is fully recorded in the Human Summary above and
the plan doc's own session-11 close-out section — do not duplicate that narrative here.

**Still open, carried forward:** hover-guard's 11 pre-existing UNRESOLVED cross-file cases
(optional, session 7); `SgsBorderControl`'s 44-caller contrast wiring (plumbing built, no
callers wired); `sgs/quote.attributionColourHover` (BUILT-BUT-SELF-REFUSED — `fix.js` correctly
declines, `quote.js` has multiple ambiguous destructure blocks, needs a human pick — NOT
attempted this session, a different agent's task got reverted for a live incident and was never
redispatched); `product-card.tagTextColour` (a DIFFERENT, more specific refusal —
`normal-state-value-not-a-plain-identifier`); `sgs_text_states_css()` (built session 11, NOT
yet adopted by any of the 9 already-fixed blocks — a follow-up consolidation, not urgent); the
~25-28 genuinely-hard custom-property-architecture rows outside the 8 named this session
(`mega-panel`'s OTHER rows, `social-icons`, `form.progressBarColour`, `product-card`'s 4
title/desc/price rows, `tabs`' OTHER 2 rows); `option-picker`'s bespoke `--sgs-op-*` pattern
(documented not-gradient-capable, part of Group 4 above); `cta-section.backgroundColour`
(WP-native mechanism, not SGS helpers); `post-grid`'s OTHER loop/dynamic-key rows
(`.titleColour`/`.excerptColour`/`.metaColour`/`.readMoreColour`).

## ▶ MOTION TRACK (A closed+live; B closed).

Two separate tracks, never re-merge. Full account: `memory/session-2026-09-04-tracks-history-sweep.md`.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (D725/D726, D731-D733)

One item survives, PARKED, owned by nobody: sticky sidebar + band-replacement model
(`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL) — RE-MEASURE first.

## ▶ CLIENT-CONTROLS TRACK — CLOSED 2026-09-02 (D904-D913, D915/D916, PR #36)

All 16 media atoms adopted by all six in-scope blocks. Narrative:
`memory/session-2026-09-02-client-controls-track.md`.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative: `memory/session-2026-08-22-editor-errors-track.md`. Nothing pending.

## ▶ SPEC-35 CAPABILITY-ROUTING TRACK — CLOSED 2026-09-04 (prior session), all four items

Plan archived: `.claude/plans/archive/spec-35-capability-routing-doctrine.md`. All four items
closed, deployed, live-verified. Commits: `a314fdc47`/`335a0885a`/`ef051e39c`/`0fbfb51d2`/
`94485dad5`.
