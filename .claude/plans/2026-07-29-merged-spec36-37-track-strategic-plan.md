---
doc_type: strategic-plan
project: small-giants-wp
spec_id: 36+37 (merged execution track)
date: 2026-07-29
status: ACTIVE
scope_source: reports/2026-07-28-spec36-37-remaining-work-inventory.md
architecture: plans/archive/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md (SIGNED, DP1–DP7)
supersedes: plans/2026-07-22-spec36-37-parallel-execution-plan.md (parallel model rejected by DP1);
  plans/2026-07-28-B3-header-footer-style-preset-library-design-gate.md (subsumed — §7 answers in gate §0)
---

# Strategic plan — the merged nav/header/footer track (Specs 36 + 37, one execution thread)

## Plain-English summary (read this first)

**What this is.** One roadmap for finishing the whole navigation system — headers, footers, menus,
the slide-out menu drawer, and everything that lives inside them — built as ONE track so every
piece matches its counterparts. It ends with the proof Bean asked for: directly cloning the
reference sites 100%, starting with studionamma, to prove the system can build anything without
cheats or hardcoding.

**Why one track.** The drawer clones were rejected partly because they were judged without their
headers. Mechanically the drawer hangs off the header (anchor height, burger placement, colour
inheritance) — building them separately is what produced the failure.

**The shape:** 5 waves. Verify what's already deployed (1) → build the missing capabilities,
including the drawer's move to its own edit screen (2) → polish the operator experience (3) →
clone the references as the final proof (4) → teach the cloning pipeline to do headers/footers
automatically (5).

**Done means:** every reference on the clone roster (§ Clone roster below — 10 clones; resn + Warm
excluded by name) cloned faithfully with zero hardcoding, Bean's eye signed off per clone, every
preset extracted, and the clone walker consuming the proven system.

## Clone roster (the definitive list — Gate 5 counts against THIS, not a loose "12")

Bean's decision 1 says "all 12"; the gate's DP6 names 7 pairs and excludes resn (WebGL,
reference-only), with Warm cut per Bean's Q1. Reconciled roster: **10 clones** = studionamma
(first) · buck · dogstudio · fantasy · lamalama · lusion · wearecollins · **Away · ButcherBox ·
rabbit.tech** (owed a teardown first, W4-a). **Excluded with reason (the other 2 of the 12): resn
(WebGL — outside the vanilla/Tier-G boundary; stays a reference) · Warm (Bean cut it, gate §0
Q1).** Gate 5 = **10/10**. If Bean wants resn attempted, that is a Spec 38 Tier-G decision, taken
explicitly — never a silent scope change. **This roster is a Bean-visible restatement of
"all 12" → confirm at Gate 1 if the exclusions are wrong.**

---

## Phase 1 — Scope

- **Goal (one sentence):** every remaining FR in Specs 36+37 shipped or mapped to a named stage,
  proven by the roster clone gate (§ Clone roster — 10 clones), under the signed gate's DP1–DP7
  architecture.
- **Business context:** SGS's competitive headline is "AI website-builder that clones anything
  faithfully". Nav/header/footer is the last major surface without that proof. Wave 4's clones are
  directly reusable as the B3 client-facing preset library — client-build velocity.
- **Constraints:** no version bumps / deprecations pre-production (D293) · shared worktree, commit
  by exact path · Spec 37 §1.2 both-specs-same-commit rule · Spec 35 `resolveTier()` is an external
  dependency (NOT built; grep=0) · nothing renders differently until the studionamma gate (gate §4.3).
- **Success criteria (measurable):** per-wave gates below; final = FR-37-23 acceptance (live FRs +
  never-overflow both sites + no inline + Bean's eye) + 10/10 roster clones accepted.
- **Scope boundary (explicitly NOT included):**
  - Spec 36 Phase 3 (inventory B4): block-menu support, Nav Health, AI-builds-nav, conditional
    menus, WC category mega, RTL, import/export → **named stage: Spec 36 Phase 3, after this track**.
  - Inventory A4 "deliberately NOT built" list (per-row sticky, D4 warning, 44px floor, preview
    link, hand-typed ratio) → dead, do not resurrect.
  - FR-37-36 custom React picker → optional extension, only if native modal proves insufficient.
  - Floating UI stays in the Customiser (Bean decision 2, inventory) — the "floating header mode"
    unit below is the header-block pill mode, not a Customiser move.
  - Motion Spec 38 Waves B/C → separate track, own prompts.
- **Calibration:** estimates anchored to this project's actuals (Wave-A motion: spec'd
  multi-commit wave ≈ 1 session; FR-36-9a notice ≈ ½ session; drawer variant build ≈ 2 sessions).
  Estimates quoted LOW per `~/.claude/rules/time-estimates.md`; ADHD-taxed number in brackets.

---

## Phase 2 — Waves, units, dependencies

**Legend:** each unit = `[ID] name — files/surface · output · est (taxed) · critical-path?`

### Wave 1 — Fixture & verification wave (nothing here touched by the CPT move — runs first)

| ID | Unit | Surface | Output | Est (taxed) | CP |
|---|---|---|---|---|---|
| W1-a | Gate 3 composed-nav fixture | canary: populate mega panel 1745, attach menu 100, nav-menu on a page | live open by hover/tap/keyboard; axe on OPEN panel (guarded harness); recursion test; drawer no-regression | 1h (2h) | YES |
| W1-b | Mega motion live-verify (D396) | same fixture as W1-a | stagger/indicator/dark/2-variants proven live; R-31-13 eye | 30m (1h) | YES |
| W1-c | Mini-cart exercise (36-19) | cart block on canary page; Store-API | flyout/drawer modes + add/qty/remove + empty state verified | 45m (1.5h) | no |
| W1-d | Search exercise (36-20) | canary page | 3 display modes live; **price-data finding logged as its own dispatch** (REST says no price — ever) | 30m (1h) | no |
| W1-e | Social + business-info + notices exercise (36-21/23/12) | editor session on canary | deployed controls exercised; heading-less mega notice (NOT this wave — mapped to the named stage "Spec 36 Phase 3" unless a W2 mega-CPT editor surface lands, in which case exercise it there) | 45m (1.5h) | no |
| W1-f | Mega starters picker verify (FR-37-7 arm) | mega CPT new-post screen | picker fires with the 3 D379 starters → FR line flipped to done | 15m (30m) | no |

**TEST (critical path W1-a/b):** Happy = panel opens on all 3 input modes, axe 0 on OPEN. Edge =
keyboard-only full traverse; nested nav-menu recursion. Fail = harness exits VACUOUS on closed
panel (negative control). Integration = drawer on same page unaffected.

### Wave 2 — Capability wave (gate DP2–DP5 + inventory A2/B3 build items)

| ID | Unit | Surface | Output | Est (taxed) | CP |
|---|---|---|---|---|---|
| W2-i | **DP7 harness fixes — FIRST in the wave** | `nav-qa/` capture + contrast + fidelity scripts (+ generate any missing `labels-<site>.json` — counted here) | capture asserts OPEN else VACUOUS; contrast walks EVERY text element; content check fails on count/label mismatch, right-site keyed; negative controls prove each check can fail | 2h (4h) | YES |
| W2-a | **Drawer CPT** `sgs_drawer` (DP2) | new CPT registration (mirror the header/footer CPT family class), Active model, revisions; seed step resolves the menu by LOCATION lookup at seed time — never a baked menu ID; admin "Menu drawer" | CPT + renderer live alongside the untouched block path (nothing destructive yet); drawer renders once per page site-footer-adjacent | 3h (6h) | YES |
| **GATE 2 fires HERE** | **OPEN-state computed-parity** (via the fixed W2-i harness): default CPT drawer vs pre-CPT default, drawer OPEN, property-identical (D403 bar) | — | pass before ANY destructive step; fail = fix W2-a, block path still fully intact (clean rollback point) | — | YES |
| W2-b | `drawerRef` → post picker (DP2) | `nav-menu/render.php:325` + edit.js | post-ID picker "Which menu drawer does this burger open?" + Create-inline; FR-36-9a warning re-pointed at deleted/draft post | 1h (2h) | YES |
| W2-c | `variantPreset` → 7 starter patterns (DP2) | kill variantPreset attr + registerBlockVariations; author 7 REAL starter patterns (same work-class as the rejected 7-variant build — estimate reflects that); native CPT picker (≥2 patterns, no template seed) | presets become content; `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` dissolves | 1 session (2) | YES |
| W2-d | Migration sweep + seed (DP2) | 8 header starter patterns drop embedded drawer **+ WP-CLI sweep of ALL stored nav-menu instances** (header CPT posts, canary fixture pages, BOTH live sites) re-typing `drawerRef`, count-verified before/after; seeded drawer opened + eyeballed on both sites | hard cut, no deprecated.js (D293); no stored burger goes silently dead (D338 coercion class) | 1.5h (3h) | YES |
| W2-r | **Spec 36+37 amendments, SAME COMMIT as W2-a..d** (gate §4.2 / Spec 37 §1.2) | both spec docs | drawer-CPT ownership in 37's CPT family sections; 36 keeps behaviour/a11y; variantPreset + DOM-id drawerRef marked retired in both | 30m (1h) | YES |
| W2-e | **DP4 trigger controls** | nav-menu block.json + edit.js + view module | `triggerStyle/Label/Symbol/OpenStyle/OpenLabel` attrs + open-state morph sync (promotes `P-DRAWER-BURGER-MORPH-SYNC`). **Design note: GLOBAL `store('sgs/nav')` state, never Interactivity-API context** — trigger (header subtree) and drawer (footer-adjacent subtree) are separate DOM trees; context-scoped state silently no-ops. Two-burger fixture in the Gate 3 test | 2h (4h) | YES |
| W2-f | **FR-37-42 column-shape picker** | site-header row inspector | visual grid-shape picker incl. `1fr auto 1fr`; writes existing `gridTemplateColumns` | 1.5h (3h) | YES |
| W2-g | Fix `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` | icon-list colour inheritance on dark drawer surfaces | contrast ≥ 4.5:1 on all drawer variants; full-element contrast sweep passes (DP7-2) | 45m (1.5h) | YES |
| W2-h | Fix `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` | drawer align class emission + nav-menu text-align interplay | `centred-statement` actually centres; live-verified | 45m (1.5h) | YES |
| W2-j | FR-37-15 behaviours → scoped `#uid` CSS | shared behaviour layer — **design-gate FIRST and counted (~1h Bean-review latency; run both design-gates early so approval overlaps build)** | no body classes; scoped emission | 2.5h (5h) | no |
| W2-k | FR-37-16 container attrs flat→object | header/footer containers (rows already done) | clean reshape pre-live, no migration | 1h (2h) | no |
| W2-l | 36-22 logo source resolution | responsive-logo | deliberate single source (align with Site Info vs `custom_logo`); defect closed | 45m (1.5h) | no |
| W2-m | 36-8 modes (b) priority+More, (c) bottom-tab-bar | nav-menu responsive modes | operator-choosable modes live | 2h (4h) | no |
| W2-n | Scroll-state shadow on pinned header | behaviour layer state classes (exist) | shadow on scrolled state (Island Creek teardown gap 2) | 30m (1h) | no |
| W2-o | Payment-logo SVG set | icon set | brand payment SVGs available (teardown gap 4) | 30m (1h) | no |
| W2-p | "Floating" header pill mode | header block, design-gate first (counted, as W2-j) | Troubadour-style pill using `--sgs-header-height` primitive | 3h (6h) | no |
| W2-q | Spec 35 D4 `resolveTier()` cascade — **honesty rule: take it in this wave OR the dependent FRs (37-14, 36-24 cascade half, 37-18, 37-24) map to the named "Spec 35 D4" stage and Gate 5 lists them as such. No third state.** | Spec 35 surface | unblocks the tri-state family | 3h (6h) | no |
| W2-s | **36-24 lint-gate half** (buildable NOW — only the cascade half is Spec-35-blocked) | `lint-responsive-controls`-style prebuild guard | per-tier settings drift caught during the exact window W2-k reshapes tier attrs | 45m (1.5h) | no |
| W2-t | **Doc closure sweep** (end of wave) | parking.md archive-on-resolve (≥3 P-entries dissolve here) + decisions.md D-entries | docs closed the moment the event fires, not at handoff | 45m (1.5h) | no |
| W2-u | **W1 re-verification on the CPT path** (wave exit) | re-run the W1-a integration probe (mega + drawer same page, focus traps) on the CPT-rendered drawer | Gate 1 evidence not stale by Gate 3; the composite proven on the SHIPPING path | 30m (1h) | YES |

**TEST (critical path W2-a..i):** Happy = default drawer post renders property-identical to the
pre-CPT default (the D403 bar; gate §4.3). Edge = deleted/draft drawer post → FR-36-9a notice;
multi-header page override. Fail = DP7 harness negative controls (closed panel → VACUOUS; label
mismatch → FAIL). Integration = 8 header patterns render without embedded drawer; burger opens the
site-wide Active drawer; per-burger override wins.

### Wave 3 — Polish wave

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W3-a | FR-37-27 Simple-surface reorder (hide nothing) | deliberate ordering pass | 45m (1.5h) | no |
| W3-b | Simplicity findings 2+3 (`P-HEADER-SIMPLICITY-FINDINGS`) | canvas-click selection + settings ordering fixed | 1h (2h) | no |
| W3-c | FR-37-6 per-site CPTs authored + set-active on BOTH live sites | both sites render header+footer from CPTs (kills GENERIC proof headers #1570/#1571/#360) | 45m (1.5h) | YES |
| W3-d | FR-37-26 blind-tester arm | Bean-run, screen-recorded non-coder session; the authoritative half of the FAIL verdict | Bean session (schedule) | no |
| W3-e | FR-37-18 inspector conformance (Part L) | runs with Spec 35 work if W2-q landed, else maps to Spec 35 stage | 1h (2h) | no |

### Wave 4 — PROOF GATE: the reference clones (Bean decision 1; DP6 as re-sequenced)

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W4-a | Teardown the 3 unmeasured refs (Away, ButcherBox, rabbit.tech) | measured FINDINGS entries; 12/12 measured | 1h (2h) | YES |
| W4-a2 | **Substitution policy signed BEFORE W4-b** | one-page policy Bean agrees: licensed font → named nearest match recorded in the DP5 homes table; copyrighted imagery → same-crop placeholder; neither counts as a capability gap | W4-b judged against an agreed bar, no churn on licensing walls | 15m (30m) + Bean | YES |
| W4-b | **studionamma 100% clone** — header + drawer + footer; content, imagery, colours, typography, motion, positioning, mobile (CTA→drawer migration stresses DP4/DP5) | per-property DP5 homes table reviewed at gate; DP7-clean harness evidence; **Bean's eye (R-31-13)** | 2 sessions (3) — the floor, incl. one expected loop-back; the only comparable prior (drawer variants) ran 2 sessions and FAILED the eye | YES |
| W4-c | Remaining 9 clones (buck, dogstudio, fantasy, lamalama, lusion, wearecollins, Away, ButcherBox, rabbit.tech) — only after W4-b ACCEPTED | 9 accepted clones; every capability gap = defect filed against waves 1–3, never a trimmed reference. **Termination rule: a gap classified Tier-G motion / WebGL routes to the Spec 38 track (named stage) or a Bean trim/exclude decision — it never loops back silently** (dogstudio/lusion/fantasy are motion-heavy; this rule is what stops an infinite fix-the-framework loop) | 5 sessions (8) | YES |
| W4-d | Preset extraction (B3) | each accepted clone → header preset + footer preset + drawer starter; invented fills: Utility commerce, Overlay hero-contrast, Directory footer; Warm cut; resn excluded (WebGL) | 1h/clone (2h) | no |
| W4-e | Q3 starter retirement | retire `centred/minimal/full`; keep `scratch` + 3 search variants | 30m (1h) | no |
| W4-f | Contrast on all 8 client palettes per preset — **automated**: extend the DP7 contrast sweep to iterate `theme-snapshot.json` palettes (harness extension counted here; a manual 56-combination sweep is not a 45m job) | palette sweep passes, machine evidence | 1.5h (3h) | no |

**TEST (critical path):** Happy = computed-parity vs reference + Bean's eye per clone. Edge =
mobile drawer parity; content-role migrations. Fail = DP7 harness mismatch fails the build.
Integration = presets restyle under each client's theme-snapshot tokens (DP5 home #3).

### Wave 5 — Spec 33 Part 2: the header/footer clone walker

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W5-a | FR-37-22 emittable-by-construction + header/footer clone walker ("Spec 33 Part 2") | pipeline clones header/footer through the walker; the 12 refs become regression fixtures — includes authoring + review of the Spec 33 Part 2 spec section itself (a spec must exist before the walker is built) | 2.5 sessions (5) | YES |
| W5-b | FR-37-23 final acceptance | live FRs + never-overflow both sites + no inline + Bean's eye | ½ session (1) | YES |
| W5-c | 36-18 Indus branded-header cutover (cloning output) + 36-25 structured-data-once + 36-26a discoverability verify | branded Indus header via the pipeline; schema emitted once; contract verified — includes one client feedback round on the branded Indus header | 1.5 sessions (3) | no |

### Dependency graph + critical path

```
W1-a → W1-b                    (same fixture; verification only)
W1-c/d/e/f                     independent, parallelisable with W1-a

W2-i FIRST (harness honesty — Gate 2's parity evidence depends on it)
W2-i → W2-a → GATE 2 (open-state parity) → W2-b → W2-d → W2-r
W2-a → W2-c                    (patterns need the CPT picker; W2-c after Gate 2)
W2-e independent of CPT chain  (block-side; global store sync)
W2-g/h after Gate 2            (fix on the CPT-rendered drawer)
W2-u wave exit                 (re-run W1 integration probe on the CPT path)
W2-q ⇢ FR-37-14 / 36-24 cascade half / 37-18 / 37-24  (take it OR map them to the "Spec 35 D4" stage — no third state)

Wave 3 after Wave 2 CP set (polish on final surfaces)
W4-a anytime; W4-a2 (substitution policy, Bean) before W4-b
W4-b REQUIRES: W2-i..u CP set + W2-f + W1 clean + Gate 2/3 passed
W4-c after W4-b ACCEPTED (Bean)   ← the one deliberate serialisation
W5-a after W4 complete

CRITICAL PATH: W2-i → W2-a → GATE 2 → W2-b → W2-d → W2-r → (W2-c, W2-g, W2-h) → W2-u → W4-a2 → W4-b → Bean's eye → W4-c → W5-a → W5-b
(W2-e and W2-f are CP-required for W4-b but FLOAT beside the CPT chain — they gate Wave 4, not each other)
```

**Parallel opportunities:** Wave 1 units fan out across agents in one session · W2-e/f run parallel
to the CPT chain · the two design-gates (W2-j, W2-p) are RAISED at wave start so Bean-approval
latency overlaps build · W3-a/b/e parallel · W4-c's 9 clones parallelise AFTER the W4-b acceptance
(never before — seven parallel half-clones caused the 2026-07-29 rejection). **Bean-gated
bottlenecks (W4-a2, Gate 4, W3-d) get BOOKED at the preceding wave's close with the evidence pack
pre-built — an external ping (Telegram), not an in-session reminder (Rule 7: in-session reminders
die).**

### Tooling check (verified this session)

`/sgs-wp-engine`, `/wp-block-development`, `/delegate`, `/qc`, `/qc-inline`, `/gap-analysis`,
`/visual-qa`, `/sgs-db`, `/wp-blocks` — all in the session skill roster. Playwright MCP live.
`plugins/sgs-blocks/scripts/nav-qa/` harness scripts exist (LEDGER re-runnable assets).
`build-deploy.py` = the ONE deploy path. `wp-sgs-developer` + `design-reviewer` + `code-reviewer`
agents registered. **Gap: none.**

---

## Phase 3 — Risk & effort (assessed; see Risk register below)

**Conversion: 1 session = 5 focused hours.** Arithmetic sums of the unit tables (LOW hours):
Wave 1 ≈ 3.75h · Wave 2 ≈ 36h (≈ 7 sessions) · Wave 3 ≈ 3.5h + Bean session · Wave 4 ≈ 48h
(≈ 9.5 sessions; W4-d is 1h × 10 clones) · Wave 5 ≈ 22h (≈ 4.5 sessions). **Summed unit time
LOW ≈ 22–23 sessions.** The wall-clock forecast is **18–22 sessions**: parallel dispatch (Wave 1
fan-out, W2-e/f beside the CPT chain, W4-c's 9 clones concurrent post-acceptance) compresses below
the serial sum, while the taxed figures absorb loop-backs and design-gate latency — the two
effects roughly cancel. (PERT-recalibrated 2026-07-29: the original 10–14 headline was
optimistic; the rejected 7-variant drawer build is direct evidence that pattern-authoring and
clone work runs 2–4× optimistic here.) Biggest single driver: the clone waves. Schedule risk: a
W4-b loop-back blocks W4-c entirely — the serialisation is deliberate but must be visible.

### Risk register (top items; full pre-mortem folded in from assessment)

| Risk | Impact | Mitigation |
|---|---|---|
| CPT move breaks the "renders property-identical" bar (D403) | High — gate §4.3 blocks everything downstream | W2-a..d gate = computed-parity default-vs-default BEFORE patterns migrate; rollback = the block path still exists until W2-d |
| Spec 35 `resolveTier()` never lands → FR-37-14/36-24 orphaned | Medium | Soft dependency by design; W2-q is capacity-optional; deferral maps to the Spec 35 stage (STOP-29-clean) |
| studionamma clone exposes missing capabilities late | High — is the point of the gate | Gate rule: every gap = defect filed against waves 1–3 and FIXED, never a trimmed reference; expect one loop-back cycle in the estimate |
| Harness false-passes recur (the D411 failure class) | High — Bean trust | W2-i ships negative controls (`--self-test` style) BEFORE any Wave-4 evidence is captured; DP7 gates re-present |
| Shared worktree collision with co-active track | Medium | Commit exact paths; never `git add -A`; branch re-check in the commit command |
| Editor-killing crash past green gates (D388 class) | Medium | After any edit.js/shared-component change: deploy + OPEN the real editor before closing the unit |
| Store-API price data unavailable for search (36-20) | Low | Already known; logged as its own dispatch, not silently absorbed |
| Gate 2 parity measured on a CLOSED drawer would be vacuous | High — the D411 false-pass class | RESOLVED IN-PLAN: W2-i runs FIRST; Gate 2 parity is OPEN-state via the fixed harness, with negative control |
| Stored nav-menu instances outside the pattern migration go silently dead (D338 coercion) | High | RESOLVED IN-PLAN: W2-d sweeps ALL stored instances, count-verified; Gate 2 integration test includes a live-site burger |
| Unbounded loop-back on WebGL/motion-heavy references | High | RESOLVED IN-PLAN: W4-c termination rule — Tier-G/WebGL gaps route to Spec 38 or a Bean trim decision |
| Rollback after destructive attr cuts is multi-commit on a shared worktree | Medium | RESOLVED IN-PLAN: Gate 2 parity sits between W2-a and W2-b; nothing destructive lands before it passes |
| Licensed fonts/imagery read as capability defects | Medium | RESOLVED IN-PLAN: W4-a2 substitution policy signed by Bean before W4-b |
| Specs go stale on the CPT move (spec-is-the-system) | Medium | RESOLVED IN-PLAN: W2-r same-commit amendments |

---

## Phase 4 — Milestone gates

```
GATE 1: Fixture wave clean
AFTER: W1-a..f  · PASS: Gate 3 axe-OPEN 0 violations (guarded), mega motion R-31-13 signed,
B2 set exercised with evidence  · FAIL: any vacuous harness result → stop, fix harness first
TYPE: auto-gate (except W1-b eye = review)  · READINESS: 90 (deps met · risks mitigated ·
calibrated · first action <5 min: "open panel 1745 in the editor")

GATE 2: CPT cutover proven
AFTER: W2-i + W2-a  · PASS: OPEN-state computed-parity property-identical (D403 bar) via the
DP7-fixed harness, negative control run; only then W2-b/c/d (destructive steps) proceed
FAIL: parity diff → fix W2-a; block path fully intact (clean rollback)  · TYPE: auto-gate +
code-review  · READINESS: 85 (new-machinery risk)

GATE 3: Capability wave complete
AFTER: W2-e..p (+q if taken)  · PASS: both open drawer defects live-verified fixed; DP7 harness
self-tests pass; FR-37-42 writes correct grids incl. 1fr auto 1fr; Gate 3 is passable on the CP
set (W2-i..u) alone — W2-j/k/l/m/n/o/p/q/s may trail into Wave-3 time without blocking it
TYPE: auto + /qc multi-rater  · READINESS: 85

GATE 4: studionamma accepted   ← THE go/no-go
AFTER: W4-b  · PASS: Bean's eye + DP5 homes table reviewed + DP7-clean evidence
FAIL: capability gaps → loop back to waves 1–3, re-present only after DP7 evidence
TYPE: go/no-go (Bean)  · READINESS: computed at the time; do not pre-assert
· The Bean session is BOOKED at Wave 3 close with the evidence pack pre-built (external ping, not
in-session)

GATE 5: Track acceptance
AFTER: W4-c..f + W5  · PASS: FR-37-23 in full; 10/10 accepted (the fixed clone roster; resn + Warm
named exclusions); presets extracted; Q3 retirement done; walker regression fixtures green
TYPE: go/no-go (Bean)  · READINESS: computed at the time from the 4-component formula — do not
pre-assert; any dependent FR deferred under the W2-q honesty rule is LISTED here by its named stage
```

Stop-loss: any gate <50 → surface pivot-vs-park with two ranked paths; log in parking.md.

---

## Phase 5.3 — Per-phase handoff blocks

```
[Wave 1 — handoff]  Trigger: /phase-planner scope="W1 fixture wave"
  Entry: this plan · LEDGER fixtures list (panel 1745, menu 100, pages roster) · specs 36 §8
  Label hint: PLAN sonnet (mechanical fixture work, well-specced)

[Wave 2 — handoff]  Trigger: /phase-planner scope="W2 capability wave" (split: CPT chain / block-side / harness)
  Entry: this plan · gate DP2–DP5+DP7 (READ IN FULL) · header CPT registration code (the family
  pattern to mirror) · nav-menu/render.php:325 · D377/D393/D403
  Label hint: PLAN opus (shared-mechanism design-gates inside: FR-37-15, floating mode)

[Wave 3 — handoff]  Trigger: /phase-planner scope="W3 polish"  · Label: sonnet

[Wave 4 — handoff]  Trigger: /phase-planner scope="W4 studionamma clone" (then per-clone)
  Entry: teardown FINDINGS.md · drawer-code-extraction jsons · DP5/DP7 · R-31-13
  Label hint: PLAN opus + design-reviewer agent per clone

[Wave 5 — handoff]  Trigger: /phase-planner scope="Spec 33 Part 2 walker"
  Entry: Spec 31 (FULL read — cloning session rule) · Spec 33 · this plan's W4 outputs
  Label hint: PLAN opus (cloning-pipeline surface — R-31 rules apply)
```

## Pre-emptive decisions (Hidden-Decisions pass)

1. **W2-g/h fix ON the CPT path** — the block-path fixtures are being rebuilt anyway; fixing the
   dying path twice is waste. If a defect is CSS-only (path-independent), fix immediately.
2. **The mega "heading-less panel notice" (36-12 residue)** waits on the mega CPT editor surface —
   map to W2 mega-adjacent work, not W1; do not force it into the fixture wave.
3. **FR-37-18/24 deferral wording:** if W2-q is not taken, these map to "Spec 35 D4 stage" by name.
4. **Per-burger override precedence:** picker value beats site-wide Active; empty picker = Active.
   Ship as the documented default; do not invent a third "inherit" state pre-Spec-35.
5. **W4-b evidence pack fixed in advance:** computed-parity JSON + DP7 captures + homes table +
   labels fidelity output. Bean judges from the pack + live URL — no ad-hoc evidence shapes.
6. **W2-q honesty rule:** it is either taken in Wave 2 or its four dependent FRs appear at Gate 5
   as "mapped to the Spec 35 D4 stage" — a deferral with a name, never an orphan.
7. **Design-gate latency is scheduled work:** W2-j/W2-p design-gates are raised at wave start;
   estimates include them.
8. **`labels-<site>.json` generation is inside W2-i**, not assumed to exist.
9. **Clone roster is fixed at 10** (see Clone roster section); Gate 5 counts 10/10; resn + Warm
   are the two named exclusions of Bean's "12".

## First action (≤5 min, zero dependencies)

Open the canary editor on mega panel 1745 and confirm it is still EMPTY (fixture roster check) —
the entry point of W1-a. Canary = sandybrown-nightingale-600381.hostingersite.com; browser login
credentials in `.claude/secrets/sandybrown.env` (`WP_USER_SANDYBROWN`/`WP_PWD_SANDYBROWN`) —
self-contained, no LEDGER hop needed.

## Review provenance (2026-07-29)

Peer-reviewed per the strategic-plan protocol: risk pre-mortem (Opus agent, 14 findings — all
High/Medium items resolved in-plan or registered above) · PERT effort calibration (Sonnet agent —
W2-c/W4-b/W4-c re-estimated, total re-quoted 18–22 taxed sessions) · cold-executor hidden-work
review (Haiku agent — design-gate latency, labels files, doc-closure, spec-authoring, client
feedback round all now counted). One planned fourth reviewer failed on an API limit; its ground
(cold-execution ambiguity) was covered by the hidden-work reviewer.

## References

Inventory (scope) · signed gate (architecture) · teardown run `20260728-112649-7bc4a8` ·
D376–D412 · `reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (rejected-state ground
truth) · Spec 36 §8 · Spec 37 §4/§5 · `memory/session-2026-07-29-task5-drawer-rejection.md`.