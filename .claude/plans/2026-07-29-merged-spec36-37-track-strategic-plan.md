---
doc_type: strategic-plan
project: small-giants-wp
spec_id: 36+37 (merged execution track)
status: ACTIVE
scope_source: reports/2026-07-28-spec36-37-remaining-work-inventory.md
architecture: plans/archive/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md (SIGNED, DP1–DP7)
---

# Strategic plan — the merged nav/header/footer track (Specs 36 + 37, one execution thread)

## Plain-English summary (read this first)

**What this is.** One roadmap for finishing the whole navigation system — headers, footers, menus,
the slide-out menu drawer, and everything that lives inside them — built as ONE track so every
piece matches its counterparts. It ends with the proof: directly cloning the reference sites 100%,
starting with studionamma, to show the system can build anything without cheats or hardcoding.

**Why one track.** The drawer hangs off the header mechanically (anchor height, burger placement,
colour inheritance), so the drawer and its header are built and judged together.

**The nav blocks.** `sgs/nav-bar-menu` (the bar), `sgs/nav-drawer-menu` (the drawer's link list) and
`sgs/nav-drawer` (the drawer panel), all under `plugins/sgs-blocks/src/blocks/<slug>/`. The drawer
itself lives in the `sgs_drawer` custom post type. `sgs/nav-drawer-menu` has no visual-diff report
yet.

**The shape:** 5 waves. Verify what is deployed (1, CLOSED) → build the missing capabilities,
including the drawer's own edit screen (2, in progress) → polish the operator experience (3,
partial) → clone the references as the final proof (4, not started) → teach the cloning pipeline to
do headers/footers automatically (5, not started).

**Done means:** every reference on the clone roster (§ Clone roster — 10 clones) cloned faithfully
with zero hardcoding, Bean's eye signed off per clone, every preset extracted, and the clone walker
consuming the proven system.

## Clone roster (the definitive list — Gate 5 counts against THIS)

**10 clones** = studionamma (first) · buck · dogstudio · fantasy · lamalama · lusion ·
wearecollins · **Away · ButcherBox · rabbit.tech** (these three are owed a teardown first, W4-a).
**resn** (WebGL) is a reference only, and becomes the 11th clone if its effects prove reachable
inside the vanilla/Tier-G boundary — decided at the W4-a teardown. **Warm** is not on the roster.
Gate 5 = **10/10** (11/11 if resn joins).

---

## Phase 1 — Scope

- **Goal (one sentence):** every remaining FR in Specs 36+37 shipped or mapped to a named stage,
  proven by the roster clone gate (§ Clone roster), under the signed gate's DP1–DP7 architecture.
- **Business context:** SGS's competitive headline is "AI website-builder that clones anything
  faithfully". Nav/header/footer is the last major surface without that proof. Wave 4's clones are
  directly reusable as the client-facing preset library — client-build velocity.
- **Constraints:** no version bumps or deprecations pre-production · shared worktree, commit by
  exact path · Spec 37 §1.2 both-specs-same-commit rule · nothing renders differently until the
  studionamma gate (gate §4.3).
- **Success criteria (measurable):** per-wave gates below; final = FR-37-23 acceptance (live FRs +
  never-overflow on every live site + no inline + Bean's eye) + 10/10 roster clones accepted.
- **Scope boundary (explicitly NOT included):**
  - Spec 36 Phase 3 (inventory B4): block-menu support, Nav Health, AI-builds-nav, conditional
    menus, WC category mega, RTL, import/export → **named stage: Spec 36 Phase 3, after this track**.
  - Inventory A4 "deliberately NOT built" list (per-row sticky, D4 warning, 44px floor, preview
    link, hand-typed ratio) → not built by design.
  - FR-37-36 custom React picker → optional extension, only if the native modal proves insufficient.
  - Floating UI stays in the Customiser — the "floating header mode" unit below is the
    header-block pill mode, not a Customiser move.
  - Motion Spec 38 Waves B/C → separate track, own prompts.
- **Calibration:** estimates anchored to this project's actuals (spec'd multi-commit wave ≈ 1
  session; FR-36-9a notice ≈ ½ session; drawer variant build ≈ 2 sessions). Estimates quoted LOW
  per `~/.claude/rules/time-estimates.md`; ADHD-taxed number in brackets.

---

## Phase 2 — Waves, units, dependencies

**Legend:** each unit = `[ID] name — surface · output · est (taxed) · critical-path?`. Status words:
DONE · PARTIAL · NOT DONE.

### Wave 1 — Fixture & verification wave — CLOSED

All six units are live-verified: the Gate 3 composed-nav fixture (fixture page 1842; mega panel
1745 populated), mega motion, mini-cart (`displayMode` link/flyout/drawer), search (4 modes), the
social / business-info / notices controls, and the mega starters picker. The fixtures stay on the
canary for later waves.

**Residuals carried forward (not blocking Wave 2):**
1. axe on the Gate-3 mega panel reports 6 primary-colour contrast violations on the Mama's palette,
   accepted by owner ruling (the colours are the client's brand; content stays distinguishable).
2. Bean's-eye (R-31-13) sign-off on the mega motion is not yet recorded — book it with the next
   live URL.
3. The cart/search screenshot set is not captured (numeric probes only).

### Wave 2 — Capability wave (gate DP2–DP5 + inventory A2/B3 build items)

| ID | Unit | Status | What is built / what remains | Est (taxed) | CP |
|---|---|---|---|---|---|
| W2-i | **DP7 harness fixes** — `plugins/sgs-blocks/scripts/nav-qa/` capture + contrast + fidelity scripts | PARTIAL | Built: the shared `nav-qa/lib/openness-guard.mjs` (exit 3 = VACUOUS) used by four scripts; contrast walks every text element; `--self-test` in five scripts; `labels-<site>.json` for 7 reference sites. Open: `--self-test` on `sweep-drawer-variants.mjs`, `shoot-drawer-pairs.mjs`, `elementfrompoint-sweep.mjs`; the content/label count-fidelity check does not exist; `labels-<site>.json` for Away, ButcherBox, rabbit.tech (after W4-a). Must precede any Wave-4 evidence | 2h (4h) | YES |
| W2-a | **Drawer CPT** `sgs_drawer` (DP2) | DONE | CPT, Active model, revisions, seed by menu LOCATION lookup, admin "Menu drawer" | — | YES |
| **GATE 2** | OPEN-state computed-parity, default CPT drawer vs default drawer, property-identical | passed once; re-run owed | Evidence: `reports/2026-07-30-w2a-gate2-drawer-cpt.md`. Re-run fresh after W2-b/c/d complete (harness `--open-via keyboard`, negative control) | — | YES |
| W2-b | `drawerRef` → post picker (DP2) | PARTIAL | Built: `nav-bar-menu/block.json::drawerRef` is a post-ID `number`; the picker; the dangling-post notice (FR-36-9a). `nav-drawer/block.json::drawerRef` stays an element-id string. Open (FR-37-43): create-inline — "create a new `sgs_drawer` post from the picker" (`nav-bar-menu/useDrawerNotice.js::addDrawer` inserts a sibling `sgs/nav-drawer` block, seeded with `sgs/nav-drawer-menu`, instead) | 1h (2h) | YES |
| W2-c | Drawer starter looks: 7 real starter patterns | PARTIAL | Built: seven `sgs_drawer` patterns (`theme/sgs-theme/patterns/drawer-*.php`, keyword `featured`), seeded as published Menu drawer posts marked `_sgs_starter_slug` (`Sgs_Starter_Library_Seeder`), a "Framework look" label and view in the list, and the starter-look control (featured-else-all rule, owned settings, "Keep my blocks" toggle). `nav-drawer` declares no `variantPreset` and registers no block variations (`git grep -n variantPreset -- plugins/sgs-blocks/src` returns nothing). Open: the Gate 2 re-run only (`nav-qa` harness, `--open-via keyboard`, negative control) | 10m (30m) | YES |
| W2-d | Migration + seed (DP2) | DONE | Header starter patterns embed no drawer; the per-site seed (FR-37-48). No stored string `drawerRef` exists on any live site, so no re-type sweep is needed (`wp db query "SELECT COUNT(*) FROM wp_posts WHERE post_content LIKE '%\"drawerRef\":\"%'"` returns 0 on the canary, the Indus test site and the Eye Care test site) | — | YES |
| W2-r | **Spec 36 + Spec 37 same-commit statement of the drawer model** (Spec 37 §1.2) | DONE | Both specs state the drawer as a `sgs_drawer` post, the picker, the seed, and the seven looks as starter patterns (Spec 36 FR-36-9a, Spec 37 FR-37-43) | — | YES |
| W2-e | **DP4 trigger controls** | DONE | Six attrs on `nav-bar-menu/block.json`: `triggerMode`, `triggerLabel`, `triggerIcon`, `triggerMagnetEnabled`, `triggerMagnetRadius`, `triggerMagnetStrength`. Open-state sync via the global `store('sgs/nav')` (trigger and drawer are separate DOM trees; context-scoped state silently no-ops) | — | YES |
| W2-f | **FR-37-42 column-shape picker** | DONE; live/eye verification owed | Site-header row inspector writes `gridTemplateColumns` incl. `1fr auto 1fr` | — | YES |
| W2-g | Icon-list contrast on dark drawer surfaces | DONE | ≥ 4.5:1 on all drawer variants | — | YES |
| W2-h | Drawer align centres the menu | DONE | `centred-statement` centres | — | YES |
| W2-j | FR-37-15 behaviours → scoped `#uid` CSS | DONE | Scoped emission via `sgs_emit_tier_rules()`; no body classes | — | no |
| W2-k | FR-37-16 container attrs flat → object | DONE | `site-header` / `site-footer` padding, margin, maxWidth, contentWidth, minHeight, contentBandPadding are objects | — | no |
| W2-l | 36-22 logo source resolution | NOT DONE | `responsive-logo/render.php` reads only `custom_logo`. Build: Site Info `logo` key as the middle tier (FR-36-22) — key + control + sanitiser + tier-2 read | 45m (1.5h) | no |
| W2-m | 36-8 modes (b) priority+More, (c) bottom-tab-bar | NOT DONE | No attribute, no code. Resolve the overlap with parked `P-FLOATING-UI-BOTTOM-BARS` (Spec 18) first | 2h (4h) | no |
| W2-n | Scroll-state shadow on the pinned header | NOT DONE | `shadow*` attrs exist; no scrolled-state attribute; `is-header-scrolled` is toggled in `src/header-behaviours/view.js` | 30m (1h) | no |
| W2-o | Payment-logo SVG set | NOT DONE | No payment-brand SVGs in the repo | 30m (1h) | no |
| W2-p | "Floating" header pill mode (design-gate signed: pill persists at mobile) | NOT DONE | Depends on the header-offset primitive (`--sgs-header-height` is published; confirm it is complete before starting). No design doc on disk yet — write it first | 3h (6h) | no |
| W2-q | `resolveTier()` cascade | DONE | FR-37-14 built and live-verified | — | no |
| W2-s | 36-24 lint-gate half | DONE | `plugins/sgs-blocks/scripts/lint-responsive-controls.py` in the prebuild gates (`--check` + `--self-test` pass); checks bespoke per-device controls, not per-tier drift | — | no |
| W2-t | Doc closure sweep | DONE | Parking entries archived on resolve | — | no |
| W2-u | **W1 re-verification on the CPT path** (wave exit) | NOT DONE | Re-run the mega + drawer same-page integration probe (focus traps, ESC interplay, non-modal branch) on the CPT-rendered drawer. Do after W2-c | 30m (1h) | YES |

**Net Wave 2:** DONE a, d, e, f (live/eye verification owed), g, h, j, k, q, r, s, t · PARTIAL b, c, i ·
NOT DONE l, m, n, o, p, u.

**TEST (critical path):** Happy = default drawer post renders property-identical to the default
drawer (the DP-signed bar; gate §4.3). Edge = deleted/draft drawer post → FR-36-9a notice;
multi-header page override. Fail = DP7 harness negative controls (closed panel → VACUOUS; label
mismatch → FAIL). Integration = header patterns render without an embedded drawer; the burger opens
the site-wide Active drawer; a per-burger override wins.

### Wave 3 — Polish wave

| ID | Unit | Status | Output | Est (taxed) | CP |
|---|---|---|---|---|---|
| W3-a | FR-37-27 Simple-surface (hide nothing) | SETTLED | ≤3 controls is a default, not a ceiling; nothing to reorder. Live figures come from `node plugins/sgs-blocks/scripts/check-simple-surface-cap.js` (advisory, warn-only) — quote its output, never a cached number | — | no |
| W3-b | Simplicity findings 2+3 (`P-HEADER-SIMPLICITY-FINDINGS`) | PARTIAL | Finding 3 (settings ordering) settled. **Finding 2 (canvas-click selection) is open** | 1h (2h) | no |
| W3-c | FR-37-6 per-site CPTs authored + set-active on every live site | UNVERIFIED | Every live site renders header + footer from its CPTs: the sandybrown canary and the Indus test site (`lavender-dinosaur-183533.hostingersite.com`, deploy target `indus-test`). Both serve `sgs/site-header` + `sgs/site-footer` markup (curl-checked); CPT sourcing per site not yet proven | 45m (1.5h) | YES |
| W3-d | FR-37-26 blind-tester arm | NOT DONE | Bean-run, screen-recorded non-coder session; the authoritative half of the FAIL verdict. The automated proxy covers the Starter-Look control only and does not replace it | Bean session (schedule) | no |
| W3-e | FR-37-18 inspector conformance (Spec 35A Part L) | PARTIAL | The conformance script's gap counts are raw upper bounds, not a workload; triage before acting | 1h (2h) | no |

### Wave 4 — PROOF GATE: the reference clones (DP6 as sequenced) — not started

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W4-a | Teardown the 3 unmeasured refs (Away, ButcherBox, rabbit.tech); decide resn (10 vs 11) | measured FINDINGS entries; 12/12 measured (9/12 today) | 1h (2h) | YES |
| W4-a2 | **Substitution policy signed BEFORE W4-b** | one-page policy Bean agrees: licensed font → named nearest match recorded in the DP5 homes table; copyrighted imagery → same-crop placeholder; neither counts as a capability gap | 15m (30m) + Bean | YES |
| W4-b | **studionamma 100% clone** — header + drawer + footer; content, imagery, colours, typography, motion, positioning, mobile (CTA→drawer stresses DP4/DP5) | per-property DP5 homes table reviewed at gate; DP7-clean harness evidence; **Bean's eye (R-31-13)** | 2 sessions (3) — the floor, incl. one expected loop-back | YES |
| W4-c | Remaining roster clones (buck, dogstudio, fantasy, lamalama, lusion, wearecollins, Away, ButcherBox, rabbit.tech; resn if admitted) — only after W4-b ACCEPTED | accepted clones; every capability gap = defect filed against waves 1–3, never a trimmed reference. **Termination rule: a gap classified Tier-G motion / WebGL routes to the Spec 38 track (named stage) or a Bean trim/exclude decision — it never loops back silently** | 5 sessions (8) | YES |
| W4-d | Preset extraction | each accepted clone → header preset + footer preset + drawer starter; invented fills: Utility commerce, Overlay hero-contrast, Directory footer | 1h/clone (2h) | no |
| W4-e | Starter-set narrowing | drop `centred/minimal/full`; keep `scratch` + 3 search variants | 30m (1h) | no |
| W4-f | Contrast on all 8 client palettes per preset — **automated**: extend the DP7 contrast sweep to iterate `theme-snapshot.json` palettes (harness extension counted here) | palette sweep passes, machine evidence | 1.5h (3h) | no |

**TEST (critical path):** Happy = computed-parity vs reference + Bean's eye per clone. Edge =
mobile drawer parity; content-role migrations. Fail = DP7 harness mismatch fails the build.
Integration = presets restyle under each client's theme-snapshot tokens (DP5 home #3).

### Wave 5 — Spec 33 Part 2: the header/footer clone walker — not started

| ID | Unit | Output | Est (taxed) | CP |
|---|---|---|---|---|
| W5-a | FR-37-22 emittable-by-construction + header/footer clone walker ("Spec 33 Part 2") | pipeline clones header/footer through the walker; the roster clones become regression fixtures — includes authoring + review of the Spec 33 Part 2 section itself (Spec 33 holds Part 1 only; a spec must exist before the walker is built). `section_passes.py::SKIP_TOP_LEVEL_TAGS` still skips header/footer/nav | 2.5 sessions (5) | YES |
| W5-b | FR-37-23 final acceptance | live FRs + never-overflow on every live site + no inline + Bean's eye | ½ session (1) | YES |
| W5-c | 36-18 Indus branded-header cutover (cloning output) + 36-25 structured-data-once + 36-26a discoverability verify | branded Indus header via the pipeline; schema emitted once; contract verified — includes one client feedback round on the branded Indus header | 1.5 sessions (3) | no |

### Dependency graph + critical path

```
W2-i (remainder) FIRST — harness honesty; Gate 2's re-run and every Wave-4 capture depend on it
W2-b remainder                                (create-inline)
W2-c                            (built; the Gate 2 re-run is its only remaining step)
Gate 2 re-run after W2-b/c/d
W2-u wave exit                  (re-run the integration probe on the CPT path, after W2-c)

Wave 3 after the Wave 2 CP set (polish on final surfaces)
W4-a anytime; W4-a2 (substitution policy, Bean) before W4-b
W4-b REQUIRES: W2-i..u CP set + W2-f live verified + Gate 2/3 passed
W4-c after W4-b ACCEPTED (Bean)   ← the one deliberate serialisation
W5-a after W4 complete
```

CRITICAL PATH: W2-i → W2-b → W2-d → W2-r → W2-c → Gate 2 re-run → W2-u → W4-a2 → W4-b → Bean's eye
→ W4-c → W5-a → W5-b.

**Parallel opportunities:** W2-l/n/o parallel to the CPT chain · the design-gate for W2-p is
raised at wave start so Bean-approval latency overlaps build · W3-b/e parallel · W4-c's clones
parallelise AFTER the W4-b acceptance (never before — each clone is judged whole, with its header).
**Bean-gated bottlenecks (W4-a2, Gate 4, W3-d, the mega-motion eye check) get BOOKED at the
preceding wave's close with the evidence pack pre-built — an external ping (Telegram), not an
in-session reminder (Rule 7: in-session reminders die).**

### Tooling

`/sgs-wp-engine`, `/wp-block-development`, `/delegate`, `/qc`, `/qc-inline`, `/gap-analysis`,
`/visual-qa`, `/sgs-db`, `/wp-blocks` — all in the session skill roster. Playwright MCP live.
`plugins/sgs-blocks/scripts/nav-qa/` harness scripts exist (LEDGER re-runnable assets).
`build-deploy.py` = the ONE deploy path (`--target sandybrown` or `--target indus-test`).
`wp-sgs-developer` + `design-reviewer` + `code-reviewer` agents registered.

---

## Phase 3 — Risk & effort

**Conversion: 1 session = 5 focused hours.** Remaining effort by wave (LOW hours, from the unit
tables): Wave 2 open units per the table above · Wave 3 ≈ 3.5h + Bean session · Wave 4 ≈ 48h
(≈ 9.5 sessions; W4-d is 1h × 10 clones) · Wave 5 ≈ 22h (≈ 4.5 sessions). The clone waves are the
biggest single driver: pattern-authoring and clone work runs 2–4× optimistic on this project.
Schedule risk: a W4-b loop-back blocks W4-c entirely — the serialisation is deliberate but must be
visible.

### Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| CPT move breaks the property-identical bar | High — gate §4.3 blocks everything downstream | Gate 2 = computed-parity default-vs-default, re-run after W2-b/c/d complete |
| studionamma clone exposes missing capabilities late | High — is the point of the gate | Gate rule: every gap = defect filed against waves 1–3 and FIXED, never a trimmed reference; expect one loop-back cycle in the estimate |
| Harness false-passes (a check that passes vacuously) | High — Bean trust | W2-i ships negative controls (`--self-test` style) BEFORE any Wave-4 evidence is captured |
| Gate 2 parity measured on a CLOSED drawer would be vacuous | High | Gate 2 parity is OPEN-state via the guarded harness, with negative control |
| Unbounded loop-back on WebGL/motion-heavy references | High | W4-c termination rule — Tier-G/WebGL gaps route to Spec 38 or a Bean trim decision |
| Rollback after destructive attr cuts is multi-commit on a shared worktree | Medium | Gate 2 re-run on the drawer after `variantPreset` is gone |
| Licensed fonts/imagery read as capability defects | Medium | W4-a2 substitution policy signed by Bean before W4-b |
| Specs drift from the drawer CPT model | Medium | W2-r same-commit statement in both specs |
| Shared worktree collision with a co-active track | Medium | Commit exact paths; never `git add -A`; branch re-check in the commit command |
| Editor-killing crash past green gates | Medium | After any edit.js / shared-component change: deploy + OPEN the real editor before closing the unit. Every block name used in editor code must be a registered block (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`, `sgs/nav-drawer`): `createBlock` does not check the slug and an unregistered one inserts a dead `core/missing` placeholder |
| Store-API price data unavailable for search (36-20) | Low | Logged as its own dispatch, not silently absorbed |

---

## Phase 4 — Milestone gates

```
GATE 1: Fixture wave clean — CLOSED
Six Wave 1 units live-verified. Residuals (accepted mega contrast violations, Bean's-eye on mega
motion, cart/search screenshot set) are listed under Wave 1.

GATE 2: CPT cutover proven
AFTER: W2-i + W2-a  · PASS: OPEN-state computed-parity property-identical via the DP7-fixed
harness, negative control run · STATE: passed once (`reports/2026-07-30-w2a-gate2-drawer-cpt.md`);
re-run owed after W2-b/c/d complete · TYPE: auto-gate + code-review

GATE 3: Capability wave complete
AFTER: W2-e..p  · PASS: both open drawer defects live-verified fixed; DP7 harness self-tests
pass; FR-37-42 writes correct grids incl. 1fr auto 1fr; Gate 3 is passable on the CP set
(W2-i..u) alone — W2-j/k/l/m/n/o/p/s may trail into Wave-3 time without blocking it
TYPE: auto + /qc multi-rater

GATE 4: studionamma accepted   ← THE go/no-go
AFTER: W4-b  · PASS: Bean's eye + DP5 homes table reviewed + DP7-clean evidence
FAIL: capability gaps → loop back to waves 1–3, re-present only after DP7 evidence
TYPE: go/no-go (Bean)  · READINESS: computed at the time; do not pre-assert
· The Bean session is BOOKED at Wave 3 close with the evidence pack pre-built (external ping, not
in-session)

GATE 5: Track acceptance
AFTER: W4-c..f + W5  · PASS: FR-37-23 in full; 10/10 accepted (11/11 if resn joins); presets
extracted; starter-set narrowing done; walker regression fixtures green
TYPE: go/no-go (Bean)  · READINESS: computed at the time from the 4-component formula — do not
pre-assert
```

Stop-loss: any gate <50 → surface pivot-vs-park with two ranked paths; log in parking.md.

---

## Phase 5.3 — Per-phase handoff blocks

```
[Wave 2 — handoff]  Trigger: /phase-planner scope="W2 capability wave (remaining units)"
  Entry: this plan · gate DP2–DP5+DP7 (READ IN FULL) · header CPT registration code (the family
  pattern to mirror) · nav-bar-menu/block.json::drawerRef · nav-drawer/block.json::drawerRef ·
  reports/2026-07-30-w2a-gate2-drawer-cpt.md
  Label hint: PLAN opus (shared-mechanism design-gate inside: floating mode)

[Wave 3 — handoff]  Trigger: /phase-planner scope="W3 polish"  · Label: sonnet

[Wave 4 — handoff]  Trigger: /phase-planner scope="W4 studionamma clone" (then per-clone)
  Entry: teardown FINDINGS.md · drawer-code-extraction jsons · DP5/DP7 · R-31-13
  Label hint: PLAN opus + design-reviewer agent per clone

[Wave 5 — handoff]  Trigger: /phase-planner scope="Spec 33 Part 2 walker"
  Entry: Spec 31 (FULL read — cloning session rule) · Spec 33 · this plan's W4 outputs
  Label hint: PLAN opus (cloning-pipeline surface — R-31 rules apply)
```

## Standing decisions

1. **Drawer fixes land ON the CPT path** — a defect that is CSS-only (path-independent) is fixed
   immediately.
2. **The mega "heading-less panel notice" (36-12 residue)** waits on the mega CPT editor surface.
3. **Per-burger override precedence:** picker value beats the site-wide Active drawer; an empty
   picker = Active. No third "inherit" state.
4. **W4-b evidence pack is fixed in advance:** computed-parity JSON + DP7 captures + homes table +
   labels fidelity output. Bean judges from the pack + live URL — no ad-hoc evidence shapes.
5. **Design-gate latency is scheduled work:** the W2-p design-gate is raised at wave start;
   estimates include it.
6. **`labels-<site>.json` for the three unmeasured refs is generated inside W2-i** after W4-a.
7. **Clone roster:** see § Clone roster; Gate 5 counts against it.

## First action (≤5 min, zero dependencies)

Re-run Gate 2 with the `--open-via keyboard` harness against the seeded default drawer.

## References

Inventory (scope) · signed gate (architecture) · teardown run `20260728-112649-7bc4a8` ·
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (drawer-variant exit-gate evidence) ·
Spec 36 · Spec 37 §4/§5 · `reports/2026-09-17-header-footer-cpt-issue-register.md`.
