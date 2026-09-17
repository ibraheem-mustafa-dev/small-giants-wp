---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-17
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THREE OPEN FRONTS, ALL BUILT-BUT-NOT-LIVE-TRUSTED: Front C (Spec 44, classless GROUP
recognition), Front D (Mama's/Indus header-footer builder cleanup), and Front E (Spec 45,
classless FIELD resolution).** Fronts C and E are BOTH now fully built (all 4 tiers/units
each) but neither is proven to do anything useful on a real draft yet — see below. Two things
need Bean directly, not a subagent: the drawer-burger click retest, and Spec 42/43 Phase 3's
precondition (real WooCommerce catalogue data). Everything else that used to lead this file —
the nav-menu split, Spec 41/36 doc rewrites, Spec 42/43 Phases 0-2, and the choice-flow
visual/UX pass — is FULLY DONE, DEPLOYED, LIVE-VERIFIED. See "Prior work (closed)" for
pointers; it isn't repeated here.

**Spec 44 (classless GROUP recognition) — all 4 units shipped this session (D1084/D1088),
council re-verification deferred to NEXT session per Bean's explicit instruction.** Built,
reviewed (Approved, zero fix cycles across all 4 units), tested, fully inert (both new flags
default off, zero-deletion diff, confirmed no behaviour change for any client). **Live-measured
and honest: running the whole thing over all 35 real classless groups in the actual Eye Care
draft produces 35 no-matches, 0 diversions** — two disclosed, fully diagnosed reasons, both
parked (`P-SPEC44-SEEDER-NOT-WIRED`, `P-SPEC44-DRAFT-CAPABILITY-DETECTOR-MISSING`). The second
one matters most: the spec's OWN flagship worked example (buybox vs product-card) is provably
unreachable without a draft-side "capability" detector that doesn't exist anywhere — not a
tuning gap, a missing mechanism. The deferred council pass should weigh this directly. Full
detail: D1088, Front C below.

**Spec 45 (classless FIELD resolution) — all 4 tiers shipped, D1084/D1087.** Given a draft
field + a resolved parent block, decides which real attribute it becomes — built, reviewed,
empirically validated (`/qc-council` on the historically-fragile Tier 3, `/qc-inline` on Tiers
2/4). Standalone and fixture-driven by design — still has no live pipeline input, because Spec
44 (above), even now built, doesn't yet produce real matches on real data for it to consume.
See Front E below and D1087 for full detail.

**Two process incidents this session, both self-caught, both logged, no data lost either
time:** (1) a dispatched subagent used `git stash` on this shared worktree — 3rd recurrence of
an already-banned pattern (`mistakes.md` + `feedback_no_git_stash_in_subagents.md`); (2) the
controller's own earlier DB-orphan cleanup silently replaced a real live `accepts_allowed_blocks`
value with a stale seeder default via a delete-then-reinsert cycle — caught when a later task's
tests failed on it, fixed as a reproducible correction
(`delete-then-reinsert-seeder-can-silently-replace-real-data-with-stale-default`).

**Nav-menu border-census re-dispatch (D1085) — DONE.** The re-dispatched fix landed
(`5e54a599a`): the detector's delegation blind spot is fixed (both blocks now classify
`PRIVATE_DONE`), and the `submenuLink*` attributes turned out NOT to be dead — they were
already painted via a shared CSS include the original check hadn't looked at; the real gap
was a missing editor control, now wired up. `P-NAV-MENU-BORDER-CENSUS-DELEGATED` archived.

**`nav-bar-menu` item separator fixed (D1086, 2026-09-17) — DONE.** Bean-reported: the FR-41-37
between-item divider was flush against one item's edge (not centred in the gap), read as
hover-only (resting colour ~1.1:1 contrast against the real header bg), and its "both sides,
none on the outer edge" topology looked wrong as a symptom of the same mis-positioning. Fixed
with a centred `::before` pseudo (`calc(<gap>/-2)`) + a higher-contrast default colour
(`text-muted`, ~5.8:1). Live-verified + deployed (`1e40e6d6e`). This ALSO produces the first
real visual-diff report either split block has ever had — see State Snapshot below, one
residual narrowed, one still open.

## Prior work (closed / parked) — pointer only, full narrative in memory or decisions.md

Full narrative for every entry below moved to `memory/session-2026-09-17.md` (this session's
LEDGER-rotate snapshot) + the named D-numbers in `decisions.md` — read those, not a summary here.

- **`sgs/nav-bar-menu` item separator fix (D1086)** — deployed + live-verified (`1e40e6d6e`).
- **`sgs/choice-flow` Phase 2b visual/UX pass (D1083)** — deployed + live-verified (`f56c82dc2`).
- **Nav-menu split (D1059/D1060), all 8 steps** — deployed (`1376084dd`), live-verified. One
  residual open — see State Snapshot.
- **Ward End Eye Care Spec 42/43 Phases 0-2** (D1072, D1082) — done; Phase 3 blocked on real
  WooCommerce catalogue data (Bean-only task, below).
- **Ward End Eye Care Tasks 1/2/4/5** — fully closed (D1067/D1069/D1070).
- **Clone-fidelity closeout + R8 motion + BEM-recognition** — closed/shipped
  (`memory/session-2026-09-11-prior-work-closed.md`). Mama's branded header/footer authoring
  READY — `.claude/prompts/2026-09-10-header-footer-implementation.md`.
- **Universal-pipeline converter wiring** (D1071/D1073/D1075) — shipped; live continuation is
  Front C (Spec 44).

## Blockers

**None.**

## THE FRONT — what to pick up next

The nav-menu split and the Spec 42/43 council track are both CLOSED — see "Prior work" above
for pointers. Three genuinely open fronts remain: C, D, and E (below), plus the two Bean-only
tasks below.

### Front D — Mama's/Indus header-footer builder cleanup (2026-09-17)

Bean flagged the current generic (unbranded) header/footer as messy before Mama's/Indus branded
content authoring starts (his stated priority order: Mama's, then Indus, then Ward End Eye Care).
Six issues raised; **5 fixed this session, 1 still open + Bean says more related issues are
coming next session — do not treat this front as closed.**

**Fixed (uncommitted at session end — verify `git status` before assuming landed):**
- Architecture confusion (outer `sgs/site-header`/`sgs/site-footer` vs each row block) — answered,
  not a code change: outer block owns whole-bar styling (background/sticky/outer padding/overall
  content width); each row independently owns its own padding/contentWidth/layout. By design.
- Footer's 80px top padding (theme spacing preset 70) — reduced to preset 50 (32px):
  `theme/sgs-theme/patterns/framework-footer-default.php`.
- Footer bottom-bar double-spacing stack (32px margin-top + 24px padding stacking in the same
  direction) — margin-top removed, padding kept, same file.
- Header logo/top-strip icons rendering outside the content-width band — root cause: the outer
  `sgs/site-header` never set `contentWidth`, defaulting to `site-header-row`'s block.json default
  of "full" (edge-to-edge). Fixed by adding `"contentWidth":{"desktop":"normal"}` to the outer
  `sgs/site-header` block, matching how `sgs/site-footer` already does it. Same pattern file.
- Icon-size inconsistency in the header's top strip (phone/email icons 16px vs. socials icon
  24px) — `sgs/business-info`'s socials icon rule used a separate `1.5em` SVG size where every
  other displayType uses `1em`. Unified to `1em`:
  `plugins/sgs-blocks/src/blocks/business-info/style.css` `.sgs-business-socials__link svg`.
- Column-shape-picker duplication on `site-footer-row` (a raw "Custom column template" textbox
  coexisting with the proper FR-37-42 visual picker, both writing the same
  `gridTemplateColumns` attribute) — passed the existing `enableColumnShapePicker` flag to its
  `ContainerWrapperControls` call, same fix pattern `sgs/container` already uses correctly.
  **Correction to the prior session's summary:** `site-header-row` does NOT mount
  `ContainerWrapperControls`/`LayoutPanel` at all — it builds its own single ToolsPanel with only
  the picker, no raw duplicate — so it never had this bug; no header-row change was needed.

**Still open — Issue 3, deliberately NOT fixed this session (Bean's own instruction: document,
don't research/fix yet):**
- **Cart pushes the burger menu inward on mobile, poorly architected.** Root mechanism confirmed
  live (Playwright, 390px viewport): `framework-header-default.php`'s middle row places
  `sgs/nav-bar-menu` (which renders the burger toggle at mobile widths) BEFORE the
  `sgs/cart`-wrapping container in markup order, so the burger lands mid-row instead of being the
  right-most element. Needs a proper "action cluster" architecture (icons grouped together,
  burger always last/right-most) — genuine research task per Bean's request, not a quick reorder.
  Not started.
- **Bean has additional related header/footer issues to raise next session** — do not assume this
  front is closed just because the 5 fixes above landed. Read this section fresh before declaring
  Front D done.

**Not yet done after the fixes above:** rebuild + deploy (`build-deploy.py --target sandybrown`),
live Playwright re-verification of all 5 fixes, then continue to Mama's real content authoring
per `.claude/prompts/2026-09-10-header-footer-implementation.md`.

### Front C — Universal-pipeline classless recognition (D1071/D1073/D1074/D1075/D1077/D1078/D1081/D1084/D1088)

**Spec 44 v2.3.1 is now BUILT — all 4 units, reviewed Approved, zero fix cycles — but
NOT YET re-verified by a council pass since v2.2.0 → v2.3.0, and Bean's explicit instruction
is that this re-verification happens NEXT session, before anything here is trusted or wired
live.** `recogniser/render_repeater_seeder.py` (Unit 1, table+seeder) →
`render_repeater_recogniser.py` (Unit 2, Stage A) → `array_schema_eliminator.py` (Unit 3,
Stage B) → `classless_trust_gate.py` + `classless_draft_adapter.py` (Unit 4, FR-44-1 trust
gate + §7 audit log/review surface + orchestrator wiring behind `--classless-match`/
`--classless-auto-complete`, both default off). Full build narrative: D1088.

**Next priority: the deferred `/adversarial-council` pass, and it has real material to
weigh, not just a rubber-stamp.** Live-measured this session: the built pipeline correctly
diverts NOTHING on the real Eye Care draft today (35/35 no-match) — safe, but also proves
nothing yet, for two disclosed reasons: `P-SPEC44-SEEDER-NOT-WIRED` (the table has 0 live
rows, seeder not called from `/sgs-update` by design) and, more importantly,
`P-SPEC44-DRAFT-CAPABILITY-DETECTOR-MISSING` — the spec's OWN flagship worked example
(buybox vs product-card) cannot be resolved from real draft markup because no code anywhere
derives the "parent capability" signal (§4.3 Step 0 (ii)) that's the only thing separating
the pair. The council pass should decide whether that detector gets designed before wiring
the seeder, or whether the seeder ships first and the flagship case stays unreached a while
longer. A third parked item, lower priority: `P-SPEC44-STAGE-B-VALUE-EXTRACTION-MISSING`
(Stage B identifies fields but never extracts their values — deliberately never
auto-completes as a result).

Separate named tracks, unaffected by this session's build: responsiveness work (already
designed, `plans/archive/2026-09-14-connect-sc-var-identity-to-responsive-values.md`);
rule-table extension (Tailwind/shadcn/Webflow/Elementor/Divi — locate its plan next
session); one-off classless content (deferred, no composite to check against).

Standing rule from this front: narrow by parent context before leaf-structural match — lesson
`C:/Users/Bean/.claude/memory/learning/2026-09-15-narrow-by-parent-context-before-leaf-structural-match.md`.

### Tasks — need Bean directly, not a subagent
- **Drawer-burger click retest.** Confirm live whether the intermittent click-miss (2/3 real
  clicks failed to open the drawer in automated testing) still occurs now the duplicate-burger
  fix (D1047) has shipped. If it still fails, dispatch a fresh `/systematic-debugging`
  investigation with Bean's exact repro steps.
- **Spec 42/43 Phase 3 precondition.** Real WooCommerce attribute/variation catalogue data must
  exist before Phase 3 (priced WC-variation steps) can be built — a WooCommerce-admin
  catalogue-setup task, not block-engine work.

### Methodology guardrails
See "Methodology guardrails (carried forward — all still true)" below — unchanged, still
binding. **Add from this session (full text moved to `memory/session-2026-09-17.md`, one-liners
here):**
- git-hygiene dispatch prompts must name `git stash` explicitly every time — 3rd recurrence
  this session (`feedback_no_git_stash_in_subagents.md`).
- `DEPLOYED-BUT-BROKEN` can be a local cert-store problem, not a real outage — check `openssl
  s_client` before trusting the probe.
- A brand-new block.json needs a `block_composition` row manually seeded — `--stage 1` only
  UPDATES, never INSERTs.
- Same-file parallel doc edits are safe via isolated worktrees + sequential patch apply.
- Deleting a block's source directory produces real, attributable spec-drift — not pre-existing
  debt to wave through.
- A spec claiming a mechanism is "BUILT + LANDED" is a claim, not proof — verify against the
  actual code (D1074).
- A safety check comparing group members only against EACH OTHER can't catch a mistake shared by
  every member (D1074).
- A `git status`-derived pathspec commit can still sweep another session's file, both directions
  (D1076) — cross-check scope, don't trust `git status` alone.
- Don't rewrite a doc citation from inference alone — verify live.
- A colour/style choice modelled on an external reference is a claim to verify against the real
  source BEFORE building, not after Bean asks.
- A census script that string-searches one file is blind to shared-file delegation.
- A block adopting a shared helper for the first time may be missing the `require_once` for it.
- An unset/empty CSS colour attribute is not "transparent" — the browser's UA stylesheet fills
  the gap; needs an explicit fallback.
- A colour that's technically always painted can still read as hover-only if its resting
  contrast against the REAL background is near-zero (D1086) — measure contrast, not just
  presence.
- A "port to a new axis" bug hides in the CSS geometry, not the attribute wiring (D1086).

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
- ⛔ **Never `git stash` on this shared worktree, even briefly** — `git worktree add` or
  `git show <sha>:<path>` instead.
- ⛔ **A subagent cleaning up its own scratch server can nuke the wrong process.** Kill by PID,
  never by name (`taskkill /F /IM python.exe` kills every Python process on the shared machine).
- ⛔ **A single sub-agent's unverified summary line can be wrong even when its other findings are
  solid.** Contradiction between independent checks means verify directly, never silently pick
  a side.
- **A completeness error is invisible to every correctness gate.**
- **A pre-commit gate can fail SILENTLY** after ~250 lines — never `--no-verify`; use the scoped
  `SGS_VISUAL_GATE_SKIP`/`SGS_INSPECTOR_GATE_SKIP`/`SGS_F5_SKIP` + `*_REASON`.
- **Run builds synchronously, never backgrounded.**
- **A new `block.json` attribute needs `sgs-update-v2.py --stage 1` immediately** — and a
  brand-new BLOCK also needs its `block_composition` row hand-seeded (see "Add from this
  session" above).
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
- **Multiple sessions routinely hold uncommitted work in this checkout.** Check `git diff` before
  attributing an unfamiliar change. **The LEDGER itself is one of the files sessions race on** —
  read it fresh immediately before replacing it, every time; a sibling session's legitimate
  "replace, not append" write can revert your own recent update if you write from stale context.
- **A schema default erases the difference between "absent" and "chosen".** WP substitutes it
  before render.php runs. If a pipeline relies on absence meaning something, the default must be
  the absent-shaped value (D1005).
- **Bean's eye beats the parity tool.** Treat its output as a hypothesis, never a verdict.
- **A fidelity dimension must never score a native block's own semantic choices as defects.**
  Tag identity, and by extension any other CONVERT-not-mirror decision, is informational
  context, never a percentage (D1013).
- **A fixed-length text-anchor window degrades on long/differently-composed ancestors.**
- **When subagent dispatch hits a rate limit, don't retry blind — do the work inline instead.**
- **A block.json description can be wrong and unchecked for months.** Treat a spec/description
  as a claim to verify, not ground truth, even when it's already in the codebase.
- **A pipeline-level fix (converter/DB) doesn't retroactively fix an already-cloned page.**
- **A walker-level detector bug can hide behind a downstream failure for a long time.** A
  detector passing on every drill so far is not proof it generalises.
- **"Reported broken in an earlier session" is not the same claim as "broken now."** Re-verify
  live before rebuilding a mechanism that already works.
- **A computed-style read right after forcing a state (`:hover`, `aria-current`) can capture the
  pre-transition value.** Disable transitions for measurement, or wait for `transitionend` — but
  check the measurement MECHANISM first: a pure server-side PHP-render text-diff tool (no
  browser involved at all) cannot have this defect regardless of what it tests.

## State Snapshot

- **Branch:** `main`. **Do not trust a SHA written here** — run `git rev-parse --short HEAD`.
  150+ sessions share this tree.
- **D-ceiling:** verify fresh with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` (was
  D1088 — re-check, don't trust a cached number here).
- **Canary:** sandybrown, WP 7.1. Production homepage page **2742**. Fresh-clone verification
  page **3448** for cloning-pipeline work.
- **`nav-bar-menu` now has one real visual-diff report** (`reports/visual-diff/nav-bar-menu-2026-09-17.md`,
  D1086) — but it is SCOPED to the item-separator fix only, not a full re-verification of the
  original split. **`nav-drawer-menu` still has NO visual-diff report at all** — deliberately
  scoped-bypassed on commit `782281040` (`SGS_VISUAL_GATE_SKIP=gallery mega-panel nav-bar-menu
  nav-drawer nav-drawer-menu`) because `build/` was stale post-Step-2-deletion at the time; the
  block now builds clean (Step 5) — still owed before Step 6 lands, or fold it into Step 6's own
  verification pass.
- **Parity figures — STALE the moment a new commit lands on the tool; re-run before quoting.**
  Last full run (page 3448): STRUCTURE 93% (324/348), LAYOUT 75% (579/773), PAINT+TYPE 89%
  (1260/1412), CONTENT 100% (234/234). Re-run
  `node plugins/sgs-blocks/scripts/parity/computed-parity.js --draft <mockup> --clone <url>`
  fresh; check `sites/mamas-munches/accepted-differences.md` for recorded exceptions first.

## Pointers

| For | Read |
|---|---|
| **Nav-menu split — ALL 8 STEPS DONE; only gap is a missing visual-diff report** | `C:\Users\Bean\.claude\plans\our-new-draft-from-enchanted-karp.md` (user-level plan file, not under the project's own .claude/plans/); `decisions.md` D1059/D1060/D1076; `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md` |
| Ward End Eye Care draft audit + CPT inventory (grounding for the whole eye-care session) | `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` |
| **Classless repeater recognition — start here** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (v2.3.0, DESIGNED not built); `decisions.md` D1081 (3-round trail); Front C above |
| **Classless GROUP recognition — Spec 44, all 4 units BUILT + inert, council re-verify next session** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (v2.3.1); `decisions.md` D1088; Front C above; `plugins/sgs-blocks/scripts/recogniser/render_repeater_recogniser.py` + `array_schema_eliminator.py` + `classless_trust_gate.py` |
| **Classless FIELD resolution — Spec 45, all 4 tiers BUILT, still no real input (Spec 44 built but inert)** | `specs/45-CLASSLESS-FIELD-RESOLUTION.md` (v1.6.0); `decisions.md` D1084/D1087; Front E above; `plugins/sgs-blocks/scripts/recogniser/classless_field_resolver.py` |
| **Form CPT + choice-flow — council-closed, Phase 0 ready to execute (D1072)** | `specs/42-SGS-FORM-CPT-AND-PRICING.md` (v2.1.0) + `specs/43-SGS-CHOICE-FLOW.md` (v1.2.0) + `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` |
| Spec 41 nav-menu colour/state (Waves A-C DONE/archived; citations fixed this session) | `specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`; `plans/archive/phase-nav-menu-colour-state.md` |
| Header/footer spec + stalled strategic plan | `specs/37-HEADER-FOOTER-BUILDER.md`; `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` |
| Mama's branded header/footer authoring — R8 shipped, ready not paused | `.claude/prompts/2026-09-10-header-footer-implementation.md` |
| BEM-recognition + template-detection (Tier 0/1/2 shipped; Tier 3 out of scope) — ARCHIVED | `plans/archive/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` |
| Per-draft accepted design differences | `sites/mamas-munches/accepted-differences.md` |
| Cloning pipeline spec + binding rules | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Styling/token contract | `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| Inspector UX standard | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| System architecture | `architecture.md` |
| Goals + exit criteria | `goals.md` |
| Structural defences (STOP catalogue + ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour + border helper registries | `plugins/sgs-blocks/CLAUDE.md` |
