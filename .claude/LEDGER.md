---
doc_type: state
project: small-giants-wp
last_updated: 2026-07-30
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where things stand (2026-07-31, close of the motion Wave C build session).** Three tracks are
live and independent — pick one, they do not block each other.

**What changed for you today — the motion "toy box" is BUILT and on the test site, but NOT yet
checked with eyes.** Six premium effects now exist: draggable carousels with momentum, a
brand-new drag-the-divider before/after image comparison block, SVG logos that draw themselves
(replacing an old library — one dependency gone), shape-morphing, scrambling text, and a
scroll-scrubbed image sequence with a tool that turns a video into the frames it needs. **None of
it needed a new library** — they all came free inside the animation engine we already had, which
also kills the "needs a paid membership" blocker that parked SVG morphing for months.

**Two honest limits, both deliberate:**
1. **Built ≠ verified.** Nothing has been watched moving in a browser yet. A safety gate is
   correctly refusing to let the block changes be committed until real before/after screenshots
   exist. I did not switch that gate off — doing so would also have switched off five unrelated
   ones that were passing.
2. **One planned effect cannot be built as written.** "Grids that re-shuffle smoothly when
   filtered" assumed a link between the filter box and the card grid that does not exist in the
   code. You asked for it to stay live as a design question rather than be shelved.

**Still waiting, none built:** header stacking on mobile (D420, still a visible defect on every
header) · drawer architecture gate (D421) · the two motion design gates above.

---

## ⭐ CURRENT FRONTS

> **Standing caveat (motion Wave A evidence):** probes are committed, their JSON output is not —
> `reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md` holds transcribed readings.
> Re-runnable, not reproducible.

### Track 3 — Spec 38 motion: **A + B CLOSED** · **WAVE C BUILT + DEPLOYED 2026-07-31, NOT VERIFIED (D426)**

`specs/38-SGS-MOTION-SYSTEM.md` is `active`. A: D414–D417. B: Lenis + page transitions (D422/D424).
**C: built, gate-green, deployed to sandybrown — browser verification NOT run.** Evidence:
`reports/2026-07-31-motion-waveC-deploy-verification.md` (it states its own gaps up front).
Commits `88c2be1a` (shared infra) + `a06bba92` (evidence). Block commits are **still blocked by the
visual-diff gate, correctly** — `--no-verify` was NOT used and must not be.

**Shipped in C:** Draggable roster (gallery + testimonial-slider) · NET-NEW `sgs/before-after` ·
DrawSVG + **Vivus retired** (D408 discharged; `animationStyle` enum byte-identical, no
`deprecated.js`) · ScrambleText · NET-NEW `sgs/image-sequence` + `scripts/image-sequence-prep.py`.
**MorphSVG + MotionPath are RUNTIME-ONLY** — no client-reachable control (see gates below).

**NO NEW LIBRARY — Tier H closed list (§1.2a) untouched.** All six plugins ship inside the
installed gsap 3.15.0 (Webflow acquisition freed the Club set); verified as real implementations,
not membership stubs. **Parking P-10's deferral premise is dead.**

**⛔ FR-38-12 (Flip) CANNOT BE BUILT AS SPECIFIED — premise verified FALSE.** `sgs/filter-search`
is `ancestor`-locked to a WooCommerce filter and narrows CHIP OPTIONS, emits no event;
`sgs/card-grid` has no `view.js` and filters server-side. No client re-layout exists to animate.
**Bean ruled: NOT parked — live design gate + research point.**

**Carried from B (do NOT resurrect):** D407/§4.2 SUPERSEDED, build items CANCELLED · Tier H =
Lenis alone · touch smoothing REJECTED on a real phone · transitions gate the opt-in itself.

⚠ Parked, not ours: `P-MOTION-CANARY-CONTAINERS-INVALID-IN-EDITOR` ·
`P-FX-PANEL-UNGUARDED-BY-EVERY-CONTROL-GATE` · `/sgs-update` Stage 11 mega-* warnings.
⚠ Stale DB row (Wave B residue, inert): `fx_effects.scroll-smoother` still says tier G /
ScrollSmoother; D422 made it Tier H / Lenis. Nothing reads it for that purpose.

### Tracks 2 + 2b MERGE (Bean, 2026-07-29) — ONE nav/header/footer track; **STRATEGIC PLAN LANDED (D413)**

**⭐ THE PLAN: `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`** — 5 waves (fixtures →
capabilities incl. drawer CPT → polish → 10-clone proof gate → Spec 33 Part 2 walker), peer-reviewed,
gap-graded B. Criteria: `verify/merged-spec36-37-track.md`. **Wave 1 CLOSED; Wave 2 in progress
(W2-i + W2-a done).** Effort forecast 18–22 taxed sessions.

**The SIGNED gate that produced it:**
`plans/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md`. Binding locks: merged 36/37
EXECUTION (§1.2 cross-amend couples the two specs) · drawer → CPT (`variantPreset` dies, 7 looks
become starter patterns, `drawerRef` becomes a post picker) · nav-menu stays a BLOCK with a
controllable burger trigger (DP4) · per-property controllability contract (DP5) · DP7 harness
honesty gates any re-present. **Bean-signed: admin name "Menu drawer" · site-wide Active default +
per-burger override · studionamma first. DP6 — cloning is the FINAL PROOF GATE (wave 4), NOT the
opening task.**

**Header-track inputs shipped 2026-07-28 (D412):** FR-36-9a(2) notice live (`6ddb9f48`) ·
**FR-37-42** column-shape picker APPROVED not built (`7ff5a184` — needs `1fr auto 1fr`; a
faithful-header-clone prerequisite) · teardowns 9/12
(`~/.claude/pipeline-state/sgs-discover/20260728-112649-7bc4a8/FINDINGS.md`; Away/ButcherBox/
rabbit.tech owed = W4-a; Lama Lama sticky by Bean's eye — probe-unmeasured ≠ non-sticky) · **SCOPE
SOURCE: `reports/2026-07-28-spec36-37-remaining-work-inventory.md`** · floating UI STAYS in the
Customiser.

Header residue: FR-37-26 FAIL verdict deliberately STANDS (blind-tester arm);
`P-HEADER-SIMPLICITY-FINDINGS` OPEN (findings 2 + 3).

### Track 2 — Spec 36 nav: TASK 5 ⛔ REJECTED BY BEAN 2026-07-29; W2-a CPT SHIPPED 2026-07-30

**Bean rejected the pairs: "night and day" — R-31-13, the eye is co-authoritative and it overrode a
21/21 mechanical pass. Do NOT re-present these; every variant needs real work first.** Narrative:
`memory/session-2026-07-29-task5-drawer-rejection.md` · **D411** ·
`reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (read its CORRECTION box first). **Still
binding: a CPT changes where a drawer LIVES, not how faithfully it PAINTS** — W2-a (D419) proved the
mechanism, not the look.

**Two defects PROVEN LIVE, both OPEN, fixes scheduled W2-g/W2-h** (details in their parking
entries): `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` (6 elements at **1:1** contrast on the 2
dark-`footer-bg` variants — Bean's "arrows with no labels"; **now harness-detectable**, D418) ·
`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` (no align class, so `centred-statement` renders left).

**Rework scope:** parking `P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`. **The capture script must assert
the panel is OPEN before it shoots** — enforced since D418 on BOTH sides with a non-zero exit; an
unassertable reference returns UNVERIFIED.

**Standing warnings (do not lose these):** **every scoped drawer/mega axe result from before
2026-07-29 proves nothing — re-run it** (no openness guard existed; a CLOSED drawer returned
`0 violations` identically to an open one). **axe can NEVER measure contrast inside an open
`<dialog>`** — use `checkRestContrast()` in `sweep-drawer-variants.mjs` (D418). Two further harness
bugs manufactured false results, both fixed. **F1 `listColumns` `grid-auto-flow:row` is UNDECIDED**
(Bean's rows-of-2 counter stands; no ground truth — the reference capture failed). **F2** at 375px
the theme header is `position:absolute`, 251px tall, showing the DESKTOP logo over content.
**F3** `sgs/social-icons` has no Vimeo/Dribbble slug.

**Re-runnable assets:** `plugins/sgs-blocks/scripts/nav-qa/` — all guarded + self-testing since
D418; **read its `README.md` §1b/§1c before trusting or extending any of them.** Canary fixtures:
pages 1892/1897/1903/1907/1914/1922/1926, multi-instance 1930, anchor probes 1932; menus 102-109.

Parked follow-ons: `P-DRAWER-BURGER-MORPH-SYNC` · `P-DRAWER-TRIGGER-ANCHOR-JS` ·
`P-DRAWER-VARIANT-CONTENT-GENERICISE` · `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` ·
`P-NAV-MENU-LISTCOLUMNS-READING-ORDER` · `P-NAV-DRAWER-DUPLICATE-DEFAULT-REF` ·
`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` · `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`. None is GSAP.

> **⭐ Track-1's open work is NOT in the NEXT SESSION section any more** — that section now holds
> motion Wave C (2026-07-31). Track 1's remaining items live in the Track 1b / 1c cells directly
> below, and the four-task plan they came from is recorded in **D425** plus
> `reports/2026-07-30-track1-verification-audit.md` (which records three findings as WITHDRAWN —
> do not re-raise them). Read that report before calling any Track-1 item done.

### Track 1b — Spec 35: component layer + Part-K gate complete; **editor verification CLOSED 2026-07-30**

Components + the fail-closed gate are done (D400/D402/D405). **The editor gap is CLOSED (D425)** —
22 wave blocks opened in the real block editor, inspector rendering 7–23 panels each, zero crashes;
D372's BoxControl check discharged. Evidence:
`reports/2026-07-30-spec35-editor-canvas-verification.md`. Still open: Part I's 2 items (Spacing token, Dynamic content),
Part-L rollout at 4–32%, and T1 parity (**157 gaps / 23 blocks in scope** — the old 140/22 is
stale). Register: `reports/2026-07-30-track1-verification-audit.md`.

### Track 1c — Spec 31 converter completion

Completion wave + declarative CSS-routing shipped (D372/D373); the three "NEXT" items this cell
once carried were all already done. **The real open item is PROOF, not build** — `batch-report.json`
now reads WRITTEN-not-LANDED 0 but **33 UNVERIFIED**, and §5 defines completion as ZERO UNVERIFIED
(the "logged with a reason" escape covers GAP cells only). Triage = next session Task 1. Plan:
`plans/2026-07-22-spec31-completion-to-100.md`.

---

## Standing constraints (carry forward — these are rules, not history)

- **Per-row `position:sticky` is REJECTED** on the short-parent trap (D389). Sticky stays
  HEADER-level; a hidden row COLLAPSES to height 0 (gap measured 0.00 at all 3 tiers). The D4
  multi-sticky warning and the sticky↔hide-on-scroll exclusion were deliberately **NOT built** (both
  specified against the rejected model — do not "finish the job"). **Footer rows get NO sticky** —
  that is Spec 18 Floating UI (D390).
- **No absolute size value in a shared state-only stylesheet** (D386's GROW bug), gated by
  `check-shared-css-state-rules.js`.
- **After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor** (D388 —
  two editor-killing crashes shipped past ALL-GREEN gates).
- **A scoped axe run on a CLOSED surface passes vacuously** — guard openness or the run proves
  nothing. Any earlier drawer-axe claim from that harness proves nothing.
- **A pattern verified by its METADATA is not verified by its CHILDREN** (D377 retro-invalidated).
  Anything else banked on metadata-only evidence deserves a second look.
- **`templateLock:'all'`/`'contentOnly'` re-applies the template on EVERY mount, matching children by
  ARRAY POSITION** (D393) — pass the template only into a genuinely empty container.
- **The D343 phantom border was never caused by shadows-as-borders.** Cause: WP core's
  `html :where([style*="border-width"])` substring-matching a custom property *named*
  `--sgs-tile-border-width`. Fix (shipped) = name width vars `--*-thickness`. Do not re-propagate the
  wrong diagnosis.
- **The no-login shareable preview link is DROPPED, not deferred** (Bean 2026-07-27) — a client who
  should see work-in-progress has an account or is shown a test site. Do not re-open it.
- **`<footer>` is generic** — the canary page has 5, four of them quote/testimonial attributions.
  The site footer is the LAST one, `<footer class="wp-block-template-part">`. **Key assertions on the
  CLASS**, never a naive regex.
- **Two durability caveats (setup-simplification track):** `~/.agents` is NOT a git repo, so the
  skillscore script + 5 grafted skills + `nextjs-testing` are LIVE but UNVERSIONED (recovery =
  per-file `.bak-2026-07-17-*`); the `lifecycle-gate-stop.py` unwire is local but NOT committed to
  the `~/.claude` repo.

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. ⚠ **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. **Commit by EXACT PATH, never `git add -A`; never touch their uncommitted files**
  (`STOP-CO-ACTIVE-TRACK-ETIQUETTE-ON-A-SHARED-WORKTREE`).
- **Verify every session, no cached line is authoritative:**
  - `git log -1 --stat` + `git status` + `git branch --show-current` (re-check branch in the SAME
    command as any commit)
  - D-ceiling: `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  - Framework counts: `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are never in prose
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each cloning
  session; its Appendix D is the stage index, Appendix C the run-artefact inventory). Nav =
  `specs/36-SGS-NAVIGATION-SYSTEM.md`; header/footer = `specs/37-HEADER-FOOTER-BUILDER.md`. Full
  roster + the DEAD-never-cite list: **`specs/README.md`** (the ONE roster).
- **Sites:** dev = palestine-lives.org (Indus). staging/canary =
  sandybrown-nightingale-600381.hostingersite.com. Both **WP 7.0.2** (verified 2026-07-20 by
  `wp core version` over SSH on both).
- **Fixtures left on the canary (do not assume they are clean):** mega page 1762, panel 1745, menu
  100, item 1746; header CPT 1570, footer CPT 1654.
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) · two
  unnamed `<main>` landmarks · `minmax()` guard absent · both sites GENERIC proof headers
  (sandybrown #1570/#1571; palestine-lives #360) · FR-37-36.

---

## Product queue (the website-builder work)

**LIVE backlog, split out 2026-07-30 to keep this file under its cap — not archived:**
**`plans/strategy/product-queue.md`**. Holds the Indus core→SGS migration (A/B/C), the four
sequenced header/footer goals, and the Track B reconciliation. Reconcile before acting — some of
it is already live.

**Standing programmes (pointers only):** no-inline — the SUPPORTS migration is complete, but
**11 inline FR-32 sites across 9 blocks were found 2026-07-30** (10 fixed-not-committed, 1 still
live: `cta-section:333`) — the old "COMPLETE bar 5 block-fixes" line is SUPERSEDED by
`reports/2026-07-30-track1-verification-audit.md` · Spec 30 COMPLETE (D220) · L1–L4 DONE
(D290). Parked, not ours: `P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Spec roster + DEAD-never-cite list | `specs/README.md` (the ONE roster) |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` (the ONE path) |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored operator cheat-sheet) |

## Blockers

**None.** Known-open items are the Product queue + `parking.md`.

---

## NEXT SESSION — finish verifying motion Wave C, then its two design gates

**Read FIRST:** **D426** + `reports/2026-07-31-motion-waveC-deploy-verification.md` (it states
what it does NOT prove, at the top — trust that list). Spec 38 IN FULL before any motion edit.

**You are the SGS framework engineer.** Wave C is BUILT, gate-green and DEPLOYED to sandybrown;
what remains is proving it works and closing two design questions Bean owns. The uncommitted block
work is on disk and building green — do not rebuild it, verify it.

#### Task 1 — Browser verification (unblocks every remaining commit)
**What:** capture real first-paint evidence for `gallery`, `testimonial-slider`,
`responsive-logo`, `before-after`, `image-sequence`, and watch each effect's named observable
signal move: drag `transform` follows the pointer then decays (momentum); `stroke-dashoffset`
animates then rests fully drawn; scramble settles to the ORIGINAL string; canvas frame index
tracks scroll.
**Why:** the pre-commit visual-diff gate requires `reports/visual-diff/<block>-<date>.md` with
`verdict: PASS` + `first_paint_capture_passed: true`. It is the only thing blocking the commits.
**⛔ NEVER `--no-verify`** — it also discards gitleaks, wp-* pre-merge, cheat-gate, F5 and F6, all
passing. **NEVER fabricate a PASS** (`visual-diff-gate-editor-only-honest-report`).
**Estimated:** 45 min. **Orchestration:** INLINE, Opus (judging motion is eye-work).
**Also cover, same pass:** (a) **two instances of each NEW block on ONE page** — the per-render
fatal class; `before-after`'s image helper is a closure precisely for this and it is UNPROVEN;
(b) **open the REAL editor** (D388: two editor-killing crashes have shipped past all-green gates);
(c) reduced-motion arms — **each needs a negative control**, or "it didn't animate" proves nothing.
**Acceptance:** every block has an honest report; every effect recorded moving; "cannot tell" =
FAIL, extend the measurement.

#### Task 2 — Commit the remaining Wave C work
**What:** commit by EXACT PATH in the wave's split (draggable / before-after / SVG+scramble /
image-sequence / derived generated+baselines). **Depends on:** Task 1.
**Estimated:** 15 min. **Orchestration:** INLINE.
**⛔ Shared worktree:** the co-active track holds uncommitted `includes/lucide-icons.php` — never
`git add -A`; a hook enforces the pathspec. `git branch --show-current` in the same command.
**/qc gate:** `/qc-council` before any commit touching SGS-block render logic.

#### Task 3 — DESIGN GATE: Flip (FR-38-12), Bean-owned
**What:** research + present options; do NOT build. Its premise is verified false (D426).
**Brief:** the only real client-side re-filtering here is WooCommerce's Product Filter → Product
Collection. Establish whether that re-renders client-side (Interactivity API router region) before
proposing anything; animating a CORE block's re-render is a different blast radius and needs its
own gate. **Estimated:** 30 min research. **Orchestration:** delegated · sonnet · single agent for
the research; decision INLINE with Bean. **Acceptance:** Bean picks from a ranked menu.

#### Task 4 — DESIGN GATE: morph + motion-path control surface, Bean-owned
**What:** both engines work but no client can reach them — the agents invented
`data-sgs-fx-morph-target` / `-motion-path-target`, which exist in no §11.2 grammar, no
`block_attributes` row and no control. **Why it is a gate, not a task:** §7 requires an
ASSET-GATED picker with authoring guidance; a CSS-selector textbox is unusable by a
tech-illiterate client. Adding params has precedent (`fxSplit`/`fxMask` in `FX_ATTR_MAP`), so the
mechanism is cheap — the UX is the decision. **Also decide** whether `draw` joins the fx picker
via a data-driven exclusion in the qualifying-blocks GENERATOR (it is withheld today because
`sgs/responsive-logo` would get two controls for one capability). **Estimated:** 30 min.
**Acceptance:** Bean signs a shape; amend Spec 38 §11.2 SAME session (spec is the system).

#### Dependency graph

```
Task 1 (INLINE, Opus) ──► Task 2 (commit; /qc-council first)
Task 3 (sonnet research ─► Bean)  ┐ both independent of 1+2,
Task 4 (INLINE ─► Bean)           ┘ but each ends with BEAN, not with code
```

#### Methodology guardrails (do not skip)

- **Deploy before measure** — the canary is shared and races; confirm build identity by md5 AT
  THE MOMENT OF CAPTURE.
- **A checksum across a git boundary on Windows is not a measurement** — CRLF vs LF gave three
  false "foreign file" hits this session (STOP-A-A-CHECKSUM-ACROSS-A-GIT-BOUNDARY, D426).
- **Negative control or the test is vacuous** — especially for every "it correctly did NOT
  animate" claim.
- **Verify BOTH surfaces** — editor canvas and frontend.
- **Outcome vs completion** — code shipped is not outcome achieved; map deferrals to a named spec
  STAGE, never "out of scope" (STOP-29).
- **`python .claude/hooks/handoff-preflight.py --check` must pass before a handoff completes.**

Full structural defences (109 STOP entries + pre-flight ritual): **`.claude/STOP-CATALOGUE.md`**.
