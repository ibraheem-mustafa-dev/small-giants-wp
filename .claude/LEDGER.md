---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-09-17
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**THREE OPEN FRONTS: Front C (Spec 44, classless GROUP recognition, built but NOT
live-trusted), Front D (Mama's/Indus header-footer builder cleanup, mixed — 5 fixes DEPLOYED
and LIVE-VERIFIED, a further architecture redesign DESIGNED but not yet built), and Front E
(Spec 45, classless FIELD resolution, built but NOT live-trusted).** Front C is fully built
(all 4 tiers) but not proven useful on a real draft yet — see below. Two things need Bean
directly, not a subagent: the drawer-burger click retest, and Spec 42/43 Phase 3's
precondition (real WooCommerce catalogue data). Everything else that used to lead this file —
the nav-menu split, Spec 41/36 doc rewrites, Spec 42/43 Phases 0-2, and the choice-flow
visual/UX pass — is FULLY DONE, DEPLOYED, LIVE-VERIFIED. See "Prior work (closed)" for
pointers; it isn't repeated here.

**Spec 44 (classless GROUP recognition) — council re-verified 2026-09-17: NO-GO on
auto-complete.** All 4 units built (D1088), the seeder-not-wired bug fixed live (D1089, 54
rows/14 blocks now real), a general render-time block-composition fact built (D1090). Seven
independent reviewers then read the real code + live DB and found `--classless-auto-complete`
unsafe: FR-44-1(b)'s "forced human review" is satisfied by the pipeline's own log write, not
an actual human — confirmed by three reviewers independently, and by directly running the
code. Both rollout flags stay OFF. Concrete, scoped fixes exist (a real approval step, a
match-diversity floor, re-measure now the table has real data) — next session's build list.
Full detail: Front C below.

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
content authoring starts. Two waves of work this session — full trail:
`.claude/reports/2026-09-17-header-footer-cpt-issue-register.md`, decisions.md D1091/D1092.

**Wave 1 — 5 visual/admin fixes, ALL COMMITTED, DEPLOYED, LIVE-VERIFIED** (real browser
interaction, not self-reported — see the register for exactly how each was tested):
- **E** — click-through-link bug in the CPT editor (a real click on a menu link now selects the
  block instead of navigating). Census found 9 affected blocks, not the 3 first suspected.
  `b92c515f1`.
- **F** — empty header/footer row showed a large, undismissable placeholder. Dismiss control
  added, falls back to WordPress's own plain appender. `9e28c661d`.
- **J** — `sgs/cart` was wrapped in a redundant container in 3 of 4 header patterns; removed
  (1 genuine 2-icon grouping correctly left alone). `4c8b57014`.
- **B** — the separate "Header Rules"/"Footer Rules" admin pages merged into the Advanced
  Header/Footer CPT list screens (one screen, not two). `d5ede2422`.
- **D3** — a "Used by" column + a default-flag added to the CPT list tables, scoped correctly
  after a same-day correction (a duplicate mechanism was built then removed once found to
  overlap the existing "Active" pointer). `689a00e70` + `ddd43e33b`.

**Wave 2 — architecture redesign for the admin/CPT structure (C/D1/D2/G/H), DESIGNED, NOT BUILT.**
Investigating deeper admin/architecture complaints (empty CPT lists, `sgs/nav-drawer` addable as
an unbounded sibling block, and WordPress's native starter picker locking child-block editing
behind an "Edit pattern" click on every preset) found one shared root cause. Design written into
Spec 37 v1.2.0 as FR-37-46 through FR-37-49, then ran through a 6-persona `/adversarial-council`
(D1092): NO-GO on the first write-up, fixed the same session, and Bean approved the corrected
version. **Two items remain before implementation starts:** a verification spike on the
underlying WP mechanism (see FR-37-46), and a scoping pass on FR-37-49's drawer post-picker
(W2-b has no UI shape yet).

**Still open, deliberately not started (Bean's own instruction: document, don't fix yet):**
- **Cart pushes the burger menu inward on mobile, poorly architected.** Root mechanism confirmed
  live (Playwright, 390px viewport): `framework-header-default.php`'s middle row places
  `sgs/nav-bar-menu` (which renders the burger toggle at mobile widths) BEFORE the
  `sgs/cart`-wrapping container in markup order, so the burger lands mid-row instead of being the
  right-most element. Needs a proper "action cluster" architecture (icons grouped together,
  burger always last/right-most) — genuine research task, not a quick reorder.

**Next session — Wave 2 build, 6 tasks in order, full orchestration plan (per-task model/brief/
dependencies/acceptance) at `.claude/plans/2026-09-17-front-d-wave-2-orchestration.md`:**
1. Scope FR-37-49's W2-b (drawer post-picker — no UI shape yet, this wave's first blocker).
2. Verification spike for FR-37-46 (confirm the WP mechanism actually works as designed).
3. Build FR-37-46 (template-lock the 3 CPTs) — depends on Task 2.
4. Build FR-37-48 (auto-seed one post per CPT) — independent, parallel with Task 3.
5. Build FR-37-47 (starter-preset control) — depends on Task 3.
6. Build FR-37-49 (drawer post-picker + drop embedded drawer, W2-b then W2-d) — depends on
   Tasks 1 and 3, run last (highest risk).

### Front C — Universal-pipeline classless recognition (D1071/D1073/D1074/D1075/D1077/D1078/D1081/D1084/D1088/D1089/D1090)

**Council re-verified 2026-09-17 (7 personas): NO-GO on `--classless-auto-complete`.**
Root cause, found by 3 of 7 independently: FR-44-1(b)'s "forced human review once" is
satisfied by the PIPELINE'S OWN log row, not a real human approval — no `approved` field
exists anywhere. Also found: the flagship buybox-vs-product-card signal is inert against
the live DB (§3.1's repetition check can never fire); a thin 3-label match can
false-auto-complete as an empty block (the project's known empty-section-false-win shape);
last session's "35/0" safety number is void (measured before the seeder held real data).
`--classless-match` alone: conditional/sandbox-only, not client-safe yet. Fixes are
concrete, not vague — a real approval step, a match-diversity floor, re-measure post-fix.
D1089 (same session) fixed the seeder-not-wired bug the council's own fact-checker
confirmed live (54 rows/14 blocks). D1090: `block_render_composition` (Spec 31 §13.9) —
a block composing ANOTHER block via `render_block()` at render time, e.g. `sgs/buybox` →
`sgs/option-picker` — built + seeded + wired, consumer side parked
(`P-SPEC44-RENDER-COMPOSITION-CONSUMER`). Scope note from this session: `sgs/buybox`
itself is arguably the WRONG flagship example for a page-agnostic mechanism — it's
inherently product-page-specific and belongs to a future specialised template/CPT
pipeline, not general classless recognition; worth revisiting Spec 44's own worked
example next pass. `P-SPEC44-STAGE-B-VALUE-EXTRACTION-MISSING` still open, unchanged.

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
  D1090 — re-check, don't trust a cached number here).
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
| **Classless GROUP recognition — Spec 44, council-verified NO-GO on auto-complete 2026-09-17** | `specs/44-CLASSLESS-REPEATER-RECOGNITION.md` (v2.3.1); `decisions.md` D1088/D1089/D1090; Front C above; `plugins/sgs-blocks/scripts/recogniser/render_repeater_recogniser.py` + `array_schema_eliminator.py` + `classless_trust_gate.py` |
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
