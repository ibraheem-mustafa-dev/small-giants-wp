---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-14
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Ward End Eye Care 5-task session + Spec 42/43 architecture — DONE, 2026-09-14 (D1056/D1063/D1065),
a separate parallel track from the nav-menu work below.** All 5 tasks from
`.claude/prompts/2026-09-14-modal-cpt-form-frame-card-checkout-upgrade.md` shipped and pushed:
Task 1 `sgs_modal` CPT + per-trigger picker (commit `ce9ccb46c`); Task 2 fixed a real bug where
`sgs/form-field-hidden`'s conditional-visibility attributes were declared but never wired up
(commit `ad2914dd8`); Task 4 extended `sgs/product-card` with Frame Card's missing fields —
swatch row, rating, brand overlay, saving badge — as a new style variation, Mama's Munches'
look untouched (commit `0a93cbec9`); Task 5 built real `cart.html`/`checkout.html`/
`order-confirmation.html` templates wrapping WooCommerce's own blocks (commits `76ea52ab9`,
`ef6ac7af2`, fixed-forward by a sibling session in `b5a529e02` for a core-blocks gate miss).

**Task 3 (the form/pricing architecture) went through two full `/research-council` runs plus a
6-persona `/adversarial-council` pre-mortem, and the design changed twice on real evidence —
this is the one part of this track still spec-only, no code shipped.** Spec 42
(`sgs_form` CPT) v1.0.0's pricing mechanism was found unbuildable by the adversarial council
(no stable tile ID, a money-type mismatch against the live schema, revision-pinning resting on
a WordPress mechanism this project's own `build-deploy.py` already excludes from its integrity
gate). Rather than repair it, the pricing work moved in full to a NEW spec — **Spec 43,
`sgs/choice-flow`** — after Bean corrected the premise: the real eyewear lens flow is
`sgs/option-picker`'s tile-pricing mechanism used inside a step wizard, not a form-pricing
feature, and the SAME block also replaces Mama's Munches' cramped inline variation picker with
a sequential full-screen `sgs_modal` flow. Spec 43's purchase path now calls Spec 27's
**already-shipped** secure `/sgs/v1/cart/add-item` proxy directly instead of inventing new
pricing security. **Spec 42 v2.0.0 / Spec 43 v1.1.0 are both fully reconciled against each
other and against the adversarial council's findings** — see `specs/42-*.md` and
`specs/43-*.md`, and D1056/D1063/D1065 for the full decision trail. **Next step, per Bean's own
direction: a FRESH adversarial-council pass on Spec 42+43 TOGETHER as one solution, after
context is compacted, before implementation planning starts.** No code for Spec 42/43 has been
written yet — both are design-only. One real, disclosed, unresolved gap affects both: the
cloning pipeline (`sgs-clone-orchestrator.py`) cannot create a new CPT post at all, only target
an existing page — so a cloned draft with a form/flow will still emit inline content today,
breaching the "every form/flow is CPT-backed" mandate for anything built via `/sgs-clone`
(FR-42-10/FR-43-14).

**Spec 41 nav-menu: Waves A+B+C (steps 1-23) DONE, deployed, and live-verified.** Wave C's
live-verification sweep found+fixed 4 defects (D1038). Bean's ~26-point live review (D1039)
was root-caused and shipped — large majority of the register, plus ~1.5 days of follow-on
work: underline/separator split (FR-41-37, `ced102333`), smart-contrast opt-in
(`cce38999d`), hover-gradient toggle (`08d0df5af`), hover-sweep angle generalisation +
drawer `listColumns` fix (`af8f9759a`), sticky-header dropdown reparent-to-body
(`92002dcae`). A `/qc-council` pass found+fixed 2 regressions from that reparent
(ancestor-current/focus highlight, `e62ce1bf2`; submenu colour default, `d9f90b875`). Full
narrative: `decisions.md` D1038-D1048, this file's own memory snapshot.

**Both previously-open decision items resolved and shipped (2026-09-14):** drawer-logo
colour attributes on `sgs/responsive-logo` mirroring `sgs/brand-strip`, commit `46fbdb5a0`
(D1045); click-outside-to-close for touch, commit `6f7dc3867` (D1046); a third defect found
+fixed same session — duplicate hidden "Open menu" burger, commit `ab9e5f893` (D1047).
Everything else previously
listed here as open (L1 burger→drawer typography mirror, the drawerRef collision bug, and
current-page state-hierarchy propagation) has also since shipped.

**Wave C steps 25 and 26 — the plan's last two open items — are now CLOSED (D1048).** 7
ungated-paint findings fixed + 4 oversized files split (`87c4302c2`, zero visual diff by
construction); `check-ungated-paint-rules.py` flipped WARN→HARD-FAIL scoped to `sgs/nav-menu`
(`85ff36489`). Step 25's sign-off was conversational (Bean's direct live-testing sign-off),
not the plan's originally-specified formal merged-report artefact. Plan fully archived to
`plans/archive/phase-nav-menu-colour-state.md`.

**Still genuinely open:** only the drawer-burger click-reliability issue (Task A below) —
the duplicate-burger fix (D1047) is a separate proven defect, NOT proven to be this issue's
root cause. Everything else this paragraph used to list (ESC retest, file-size drift, STOP
S4 entry) is now closed — see Tasks B/C/D below.

**Prior track (clone-fidelity closeout + R8 motion) is fully done** — see "Prior work (closed)"
below for the record; not the front any more.

## Prior work (closed) — pointer only, full narrative in memory

**Clone-fidelity closeout + R8 motion:** fully closed, swept to
`.claude/memory/session-2026-09-11-prior-work-closed.md`. Still open, carried forward: R1's
real 17-attribute conversion (`reports/2026-09-10-r1-rescoped-worklist.md`); the
`tier_object_base()` 67-attribute over-match (needs fix-or-park); header/footer (paused behind
R8); trust-bar pill padding (minor).

**BEM-recognition — Q1 Tier 1+2 SHIPPED (D1053/D1054).** Still open: the Mama's Munches PRODUCT
draft's non-BEM hard-halt needs a fresh `/sgs-clone` to confirm Tier 1/2 actually fixes it;
Tier 0's own "measure first" gate remains deliberately skipped (D1053).

**Universal-pipeline upgrade (Claude Design `.dc.html`) — Piece 1+2 SHIPPED (D1057/D1058),
outcome PARTIAL.** `sc_var_classifier.py` + `draft-responsive-probe.js` both work standalone;
`<sc-for>`/`<sc-if>` do not survive rendering and the two tools are not yet linked — the
converter-consumable mechanism doesn't exist yet.

## Blockers

**None.**

## THE FRONT — what to pick up next

**Two independent fronts exist right now — pick the one the session is actually continuing.**

### Front 1 — Spec 42/43 (form CPT + choice-flow), owned by the Ward End Eye Care track
Next step is explicitly Bean-directed: compact the session, then run a FRESH
`/adversarial-council` on Spec 42 + Spec 43 **together as one solution** (not separately —
they were already reconciled against each other once, but never pre-mortemed as a combined
whole). Resolve every valid point the fresh council raises, THEN `/strategic-plan` the actual
build — sequencing matters (Spec 42 §11 / Spec 43's shared CPT-lifecycle contract should land
before either CPT goes live). Read `specs/42-SGS-FORM-CPT-AND-PRICING.md` and
`specs/43-SGS-CHOICE-FLOW.md` in full first — both are dense, reconciled documents, not a
quick skim. FR-42-0 (the fail-open `requireLogin` security bug) is independently ship-ready and
does not need to wait for any of this — fix it whenever convenient regardless of sequencing.

### Front 2 — Spec 41 nav-menu, superseded or withdrawn
**Spec 41 nav-menu — the whole plan (Waves A/B/C, all steps) is now DONE, superseded or
withdrawn.** Steps 25 and 26, the last two open items, closed 2026-09-14 (D1048). The plan is
archived: `plans/archive/phase-nav-menu-colour-state.md`'s "Execution Progress Log" has the full
step history if needed, but the real front now is the post-review fix register below, plus the
few genuinely-open items in the Human Summary above (drawer-burger click reliability, the ESC
bubble-path retest, and the two small doc/file-size loose ends).

**Bean's live review + fix register (full history already in the Human Summary above and
`decisions.md` — not repeated here):** intake doc
`.claude/reports/2026-09-12-nav-menu-visual-review-register.md`, itself stale against later
commits per the Human Summary's own note. Genuinely open now: the intermittent drawer-burger
click-reliability issue (needs Bean's live retest — Task A below), the D1044 ESC bubble-path
retest (inconclusive), residual file-size drift on `ColourRowExtras.js`/`edit.js` (owner-ruled
acceptable, D1048), and the STOP-CATALOGUE S4 entry step 27 named but never added (now added,
see Task D).

## Next-session orchestration plan

### Ward End Eye Care track (Front 1) — orchestration for the next session

**What:** run `/adversarial-council` on Spec 42 + Spec 43 together (a single combined
pre-mortem, not two separate ones — they've already been reconciled pairwise, the gap is a
holistic view of the merged solution). Resolve every valid finding — fix in the specs directly
for anything cheap/clear, escalate to Bean only for genuine policy calls (mirroring how the
first adversarial-council pass on Spec 42 alone was handled). Then `/strategic-plan` the real
build, sequenced per Spec 42 §11.
**Why:** Bean's own explicit instruction — the combined pre-mortem is a genuinely different
question from two separate ones, since the reconciliation itself (pricing moving from 42 to 43,
the shared CPT-lifecycle contract, the shared cloning-pipeline gap) is new surface a
per-spec-alone council never saw.
**Orchestration:** 6-persona parallel dispatch (Cynic/Competitor/Spec-Lawyer/Ship-PM/Abuse/
Support-Realist — same roster as the first pass), fact-check every finding against the real
code before accepting it (do not relay unverified claims), synthesise with convergence-
weighting, present GO/NO-GO to Bean before `/strategic-plan`.
**Depends on:** none — specs are complete and reconciled. **Acceptance:** a GO decision (or a
NO-GO with a named, resolvable fix list) reached and confirmed with Bean before any code is
written for either CPT.
**Also queued, independent of the above:** FR-42-0 (fail-open `requireLogin` bug,
`class-form-rest-submission.php::handle_submit`) — ship whenever convenient, no dependency.

### Nav-menu track (Front 2) — state recap (updated 2026-09-14, D1049)
Three of the four cleanup items are now closed. Only Task A remains, and it needs Bean
specifically — no further orchestration possible.

### Task A — Bean retests the drawer-burger click issue (STILL OPEN)
**What:** confirm live whether the intermittent click-miss (2/3 real clicks failed to open the
drawer in automated testing) still occurs now the duplicate-burger fix (D1047) has shipped.
**Why:** D1047 is a proven, separate defect fix — NOT proven to be this issue's root cause.
**Orchestration:** inline, no subagent — this needs Bean's own hands on a real device/browser,
not another Playwright run (automated testing already hit its ceiling here).
**Depends on:** none. **Acceptance:** Bean reports pass/fail; if fail, dispatch a fresh
`/systematic-debugging` investigation with his exact repro steps (browser, device, close path used).

### Tasks B/C/D — all CLOSED, no action needed
B: real-keyboard ESC/mega-disclosure retest, clean on 5 configs (D1044). C: file-size drift on
`ColourRowExtras.js`/`edit.js`, both an accepted owner ruling. D: `colourRows` atomicity
STOP-CATALOGUE E25 added (D1049), 280→281 STOPs confirmed by `handoff-preflight.py --check`.

### Remaining
Only Task A needs anyone's attention, and it needs Bean, not a subagent. No dependency graph
needed — one item, no orchestration left to plan.

**Also surfaced, not actioned:** `decisions.md`, Spec 36, and Spec 41 all scored below the
project's normal doc-quality bar (docscore run earlier this session) — pre-existing size/
structure debt, not caused by anything shipped in the nav-menu track. Worth a dedicated cleanup
session if Bean wants one; not urgent, not blocking anything.

### Methodology guardrails
See "Methodology guardrails (carried forward — all still true)" above — unchanged, still binding.
Add one from this session: **a subagent given a deploy/gate-sweep/long-verification brief must be
told explicitly to run it synchronously, not backgrounded** — recurred 6x in one session
(`feedback_subagent_backgrounding_causes_premature_completion_claim.md`); its own "completed"
status plus "I'll wait for X" language means check `git status` before trusting it.

**Process note:** every multi-agent brief on this shared worktree must state explicitly "if
the deploy gate blocks on a file outside your scope, STOP and report back — never add it to
your own payload." Full lesson:
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
- **D-ceiling:** **D1066** — verify with
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
| BEM-recognition + template-detection brainstorm — Q1 Tier 0/1/2 + Q2 Tier 1 all SHIPPED (D1034/D1035/D1037/D1053/D1054); Tier 0's own real-source measurement + the Mama's Munches PRODUCT draft re-run are STILL open; Tier 3 (both questions) deliberately out of scope. **Claude Design addendum (D1057/D1058) also SHIPPED, see its own bullet above.** | `plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` (✅ SHIPPED markers + addendum); research: `.../2026-09-14-webflow-vs-tailwind-class-detection.md`, `.../2026-09-14-claude-design-sc-for-variable-naming.md` |
| R8 motion-recognition design (settled, references only) | `plans/archive/2026-09-10-r8-motion-recognition-brainstorm.md` |
| R8 execution plan (DONE, archived — reference only) | `plans/archive/phase-r8-motion-recognition.md` |
| **Spec 41 nav-menu colour/state — THE FRONT. Whole plan (Waves A/B/C, all steps) DONE/superseded/withdrawn, archived 2026-09-14; the post-review fix register (see "THE FRONT" above) is the real front, not the plan's own step count** | `.claude/reports/2026-09-12-nav-menu-visual-review-register.md` (intake — stale against the latest commits, see "THE FRONT"); `plans/archive/phase-nav-menu-colour-state.md`'s "Execution Progress Log" is ALSO stale (last updated 2026-09-11, predates the register work); spec: `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` |
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
| **Form CPT — spec-only, next combined-council step is Front 1 above** | `specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.0.0 — pricing retired to Spec 43) |
| **Choice-flow (quiz/configurator/variation-picker, one block) — spec-only** | `specs/43-SGS-CHOICE-FLOW.md` (v1.1.0 — reuses Spec 27's secure add-to-cart proxy) |
| Ward End Eye Care draft audit + CPT inventory (grounding for the whole 5-task session) | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| Research trail for the 42/43 architecture (superseded interim conclusion kept for the record) | `.claude/memory/research/2026-09-14-sgs-form-cpt-and-tile-pricing-architecture.md`, `.../2026-09-14-sgs-choice-flow-architecture.md` (global CC memory) |
