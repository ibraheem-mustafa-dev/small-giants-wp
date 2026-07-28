> ARCHIVED 2026-07-28 — in-file status: COMPLETE 2026-07-26.

---
doc_type: plan
topic: header-footer-per-row-identity
date: 2026-07-25
status: COMPLETE 2026-07-26 — Phase 1 (D386-ancestor commits `a3a200aa`), Phase 2 (`59de5434` +
  `d54c316d` + `36461b85`), and SIDE TRACK A (`5716f7b7` D391 + `494e5d50` D392) all shipped and
  live-verified. Only SIDE TRACK B remains, and it is independent deal-winner work, not plumbing:
  B1 RUN (verdict FAIL, findings parked as `P-HEADER-SIMPLICITY-FINDINGS`), B2 partly addressed by
  the "Show me the shrunk size" editor toggle, B3 preset library NOT started (highest client-facing
  ROI of anything left here). Canonical record of what shipped = Spec 37 FR-37-37/38/39/40.
design: .claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md
review: risk + hidden-decisions discharged by the 6-persona adversarial council (2026-07-25) — see design doc §2 must-fixes; no separate research pre-gate needed (council resolved the unknowns)
---

# Phase Plan — Header/Footer Per-Row Identity (Option 1: keep the shared engine)

**USP:** each header/footer row becomes its own independently-behaving strip — a real
competitive edge over Kadence/Astra for a non-coder — built on the engine that already works,
so it ships in days with zero drift risk.

**Plan label:** `[PLAN: sonnet]` — settled design (council-hardened), implementation-heavy, clear
requirements. Architectural sub-decisions (the sticky mini-design) are the only `inline` steps.

**Docscore:** self-assessed B+ (all steps have Action/Files/Outcome/Test/On-Fail; the design it
executes was council-gated). Not routed to the docscore subagent — proportionate to small scope.

**Aggregate cost estimate:** small — P1 ≈ one build+deploy cycle; P2 ≈ one more. Deal-winners are
independent and cheap.

**Phase success criteria (done when):**
- [x] **P1 SHIPPED + LIVE-VERIFIED 2026-07-26 (commit a3a200aa).** Each header/footer row carries its
      OWN `rowTransparent` + `rowHideOnScroll` (device-tier, inherit-upward), independent of the
      header-level D376 path. Live-verified on the sandybrown canary (active Proof Header 1570,
      chrome-devtools): at desktop, the top row HIDES on scroll (translateY, `is-row-hidden`) while
      the logo row goes transparent→solid (`is-row-transparent-active`+`is-row-scrolled`) — each row
      does ONLY its own behaviour, both reset on scroll-up. Code-review tier-gating fix verified:
      a desktop-only transparent row is `is-row-transparent-active` at desktop, NOT at mobile.
      D376 header-level path intact (`--sgs-header-height`=252px still published). 5/5 deploy files
      md5-matched local↔server. Proof Header reverted to clean afterward (0 behaviour rows).
- [~] **P2 PARTIAL — shipped + live-verified 2026-07-26 (commit `59de5434`), one open decision.**
      - **P2-S2 shrink-hides-a-chosen-element: DONE + LIVE-PROVEN.** Chosen child `display:none`
        while its row is shrunk; sibling row unaffected; resets on scroll-up. Guardrail proven
        SERVER-SIDE: with `rowShrinkHideTarget` pointed at the logo, the server emitted no
        `data-sgs-row-shrink-hide` and no hide rule at all while still emitting
        `data-sgs-row-shrink="desktop"`. Guardrail is declarative (`supports.sgs.headerEssential`
        on responsive-logo / nav-menu / cart, verified live in the block registry), NOT a
        hardcoded list. Picker also excludes children lacking `supports.anchor` (11 blocks incl.
        sgs/product-search — WP would silently discard the id). 6/6 deploy files md5-matched.
      - **P2-S1 shrink: FIXED + LIVE-PROVEN (commit `d54c316d`).** The first ship set an
        ABSOLUTE shrunk `padding-block` in the shared stylesheet; at (0,3,0) it out-specified
        each row's own `.sgs-container-<uid>` rule (0,1,0), forcing every row to the same size
        — an unpadded row measured 0px at rest → **4px "shrunk"**: it GREW.
        **Fix:** the absolute rule is DELETED; the shrunk value is emitted PER INSTANCE as
        `calc(<that row's own padding> / 2)` per tier by the new shared `sgs_row_shrink_css()`
        (`includes/helpers-row-behaviour.php`), which calls the existing public
        `sgs_emit_responsive_css()` engine — the same helper `mega-panel`/`nav-drawer` already
        call directly. Proportional by construction, so growth is impossible. Ratio 0.5
        (Bean-decided; it was previously an undeclared number).
        **Live-proven on the canary at 1440 / 768 / mobile:** padded row 48px → **24px**
        (exactly half) with left/right held at 30px (no horizontal jolt); unpadded row
        **0 → 0** (was 0 → 4px). Assertion used = computed padding shrunk ≤ resting, the check
        that did not exist when the defect shipped. 4/4 deploy files md5-matched. Canary reverted.
        **Option 1 (shared-wrapper custom property) was REJECTED** by a 5-persona adversarial
        council: only **2 of 29** wrapper-using blocks pass `responsive_model => 'object'`, so
        its "every block benefits" claim was false (verified). Do not re-open without new evidence.
        **Operator UX:** shrink toggle stays visible + enabled; a warning `Notice` fires when
        shrink is on and the row has no padding. NOT hidden/disabled (undiscoverable).
        **Recorded as NOT done:** no 44px touch-target floor; shrink on a NON-STICKY row is
        invisible and reflows content (no warning/gate); no editor preview
        (`header-behaviours.css` is not enqueued in admin); `assets/css/` is covered by no gate,
        so only a ⛔ comment guards the deleted rule's return.
- [x] **P2-S3 footer parity — VERIFIED LIVE 2026-07-26.** Measured on the ACTIVE footer
      (CPT **1654**; note the obvious-looking "Proof Footer" 1571 is NOT active —
      `sgs_active_footer_cpt_id`=1654, and testing 1571 first produced a false negative):
      top row **60px → 30px** on scroll, left/right held at 20px, sibling `columns` and
      `bottom` rows completely unaffected.
- [x] **P2 follow-ups (the five items recorded as NOT done) — ALL CLOSED 2026-07-26**
      (`36461b85` + `786c1525` + `d1788d61`; report
      `reports/visual-diff/row-behaviour-guardrails-2026-07-26.md`):
      1. **Gate BUILT** — `scripts/check-shared-css-state-rules.js`, appended to `prebuild`.
         Nothing scanned `assets/css/` before (`check-hardcoded-render-defaults.js` walks
         `src/blocks/*` only), which is why the literal that caused the defect sat unscanned.
         Flags a SIZE property set to a fixed literal on a state-only selector when nothing
         in the same file sets that property's RESTING value on the base selector. Does NOT
         fire on the legitimate both-ends `body.sgs-header-behaviour-shrink` pattern; strips
         comments. Proven by regression injection, re-run independently: clean 0/exit 0 →
         bad rule reinserted, caught at the right line/exit 1 → restored, `git diff` empty.
         Baseline starts EMPTY, requires a `reason` per entry.
      2. **44px floor — NOT BUILT, deliberately.** Measured live: row 48→24px, all 5
         interactive children byte-identical in size, nav items held 44px. A row's padding
         sits OUTSIDE its children so halving it cannot change a child's height; children
         carry their own minimums (`nav-menu/style.css:43,83`). A floor would defend against
         an impossible failure.
      3. Footer parity — see above.
      4. **Non-sticky warning BUILT** — a scroll effect on a row inside an unpinned header
         fires as the row leaves the screen and only nudges page content. Reads
         `headerSticky` from the `sgs/site-header` ancestor. Tri-state: `true`=no warning,
         `false`=warn, `null` (footer row)=no warning. All 5 states verified live.
      5. **Editor preview BUILT** — the row preview now shows its own padding (it showed
         none before), plus a "Show me the shrunk size" toggle using the same 0.5 ratio.
         Verified live: canvas 48→24→48px across off/on/off, siblings unaffected.
         NOT the full B2 preview-scroll feature, which remains separate.
      **⚠ The first deploy of this batch KILLED the block editor** — two crashes
      (`useState is not defined`, then a TDZ `Cannot access 'f' before initialization`)
      while webpack + dead-controls + the new gate were ALL green. Only opening the real
      editor found them. Treat "build green" as zero evidence for editor-surface changes.
- [x] **The sticky mini-design is written + signed off before any per-row sticky ships — and the
      build it gated is now COMPLETE (2026-07-26, D391 `5716f7b7` + D392 `494e5d50`).**
      The design (`plans/2026-07-26-per-row-sticky-mini-design.md`) answered the question by
      **rejecting per-row sticky outright** on the short-parent trap: a row made `position:sticky`
      inside a ~250px `<header>` unpins the moment scroll passes the header's height. So no
      per-row sticky ever shipped, and the criterion above is satisfied in the strongest sense.
      **What shipped instead:** sticky stays HEADER-level, and a row that should disappear while
      the header is pinned COLLAPSES out of flow (height→0) rather than translating — measured
      gap **0.00 unrounded** at all three tiers, with the non-pinned path byte-identical
      `translateY(-100%)` and no inline height ever written. Plus the D3 scroll-padding defect
      fixed (publisher gated on MEASURED pinning, explicit `0px` otherwise) and a
      sticky-breaking-ancestor guard. Evidence:
      `reports/visual-diff/scroll-padding-pinned-gate-2026-07-26.md` +
      `reports/visual-diff/row-collapse-when-pinned-2026-07-26.md`.
      **The D2 multi-row offset chain was deliberately NOT built** — under one sticky element
      there is nothing to chain; the research is banked for Spec 18.
- [x] The operator-simplicity test (proxy arm) has been run + recorded against the current header
      — 2026-07-26, verdict FAIL, `reports/fr-37-26-simplicity-test/2026-07-26-operator-simplicity-test.md`.
      Blind-tester arm still pending.

**Entry context (read before starting):**
- `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — the approved design + the 9 must-fixes (load-bearing)
- `plugins/sgs-blocks/src/blocks/site-header-row/` + `site-footer-row/` (block.json + edit.js + render.php) — where per-row attrs land
- `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php` + `assets/css/header-behaviours.css` + `src/header-behaviours/view.js` (⚠ note: `src/header-behaviours/`, NOT `src/blocks/` — webpack entry is hardcoded to this path; a wrong path silently serves stale `src/` on the live site) — the behaviour layer to extend from header-level to per-row
- `.claude/specs/37-HEADER-FOOTER-BUILDER.md` §Behaviours (FR-37-13/14) — current header-level behaviour mechanism

**References:**
- Design doc §2 (must-fixes 1–9) — the council's binding constraints
- Deploy: `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` from an ISOLATED worktree (shared-tree churn)
- Global rules: no inline style (Spec 32), device tiers 768/1024, DB-first (no hardcoded dicts), no version bumps/deprecations

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| cli | npm run build / build-deploy.py | P1-S4, P2-S3, deploy gates |
| mcp | chrome-devtools (or wp-sgs-developer agent) | live-verify gates |
| skill | /qc-council | before each deploy on the behaviour surface |
| db | sgs-db.py (roles/slots) | P2-S2 guardrail |

---

## PHASE 1 — Per-row transparent + hide-on-scroll (ships to canary first)

Step P1-S1 — Declare per-row behaviour attributes
  Model:   sonnet
  Action:  Add `rowTransparent` + `rowHideOnScroll` (device-tier object shape `{desktop,tablet,mobile}`, matching the row's existing attrs) to `site-header-row/block.json` and `site-footer-row/block.json`. No flat suffixed attrs (must-fix 7).
  Files:   src/blocks/site-header-row/block.json, src/blocks/site-footer-row/block.json
  Inputs:  design §1, must-fix 7
  Outcome: both row blocks declare the two attrs; `npm run build` passes the dead-attr + shape gates.
  **Per-tier boolean semantic (define it — QC caught this was unspecified):** a null tier
  INHERITS the tier above (mobile ← tablet ← desktop); an explicit `false` means "off here".
  Default desktop = false (off).
  Exec:    SEQUENTIAL
  Marker:  SESSION-START
  Time:    10 min
  Tooling: Edit, npm run build
  On-Fail: revert block.json; WP silently discards undeclared attrs, so a build-green but non-emitting attr = check the gate output.
  Cold-Entry: the two block.json files + design §1
  Test:
    Happy: build passes; attrs present in the compiled block metadata.
    Edge: mobile tier unset → resolves to the tablet value, or desktop if tablet also unset (the inheritance rule above).
    Fail: undeclared-attr gate — if it fires, the attr name/shape is wrong.
    Integration: standalone (no render yet).

Step P1-S2 — Emit per-row behaviour hooks (render + scoped CSS/JS), keyed on the row uid class
  Model:   sonnet
  Action:  In `site-header-row/render.php` (+ footer-row), emit the row's uid class + a data-attr the behaviour JS reads (render.php already computes `$uid` + reads `$attributes` — no need to touch `class-sgs-header-behaviours.php`). **⚠ This is NOT a selector extension (QC re-scope): today `view.js` reads ONE flag-set off `document.body` and toggles one body state-class. Per-row needs a NEW parallel path — scan the DOM for N rows each carrying their own data-attr, and toggle a state class on EACH row independently.** Add the matching per-row rules to `header-behaviours.css`. Do NOT touch the shared wrapper.
  Files:   src/blocks/site-header-row/render.php, src/blocks/site-footer-row/render.php, assets/css/header-behaviours.css, src/header-behaviours/view.js
  Inputs:  P1-S1 attrs; must-fix 1 (note: sticky excluded from P1, so no conflict yet)
  Outcome: a row with rowHideOnScroll=on emits the class + JS wires an independent per-row scroll state; a sibling row without it is unaffected.
  Exec:    SEQUENTIAL
  Deps:    P1-S1
  Time:    45 min (a new per-row iteration path in view.js, not a one-line tweak)
  Tooling: Edit
  On-Fail: the behaviour JS targets a class no row emits → nothing happens silently (the D375 dead-selector trap). Verify the emitted class matches the JS selector on the live DOM.
  Test:
    Happy: scroll the canary → the row with hide-on-scroll translates away; a sibling row without it stays.
    Edge: two rows, one hide-on-scroll one not → independent.
    Fail: class mismatch → row doesn't react (check live DOM, not the emit).
    Integration: existing header-level behaviours still work (don't regress the D376 ship).

Step P1-S3 — Per-row inspector controls
  Model:   sonnet
  Action:  Add the two controls to `site-header-row/edit.js` (+ footer-row) inspector, device-tier, in an Advanced ToolsPanel (keep the Simple surface ≤3 per FR-37-27). No inline style.
  Files:   src/blocks/site-header-row/edit.js, src/blocks/site-footer-row/edit.js
  Inputs:  P1-S1
  Outcome: operator can toggle transparent/hide-on-scroll per row in the editor.
  Exec:    SEQUENTIAL
  Deps:    P1-S1
  Time:    20 min
  Tooling: Edit
  On-Fail: control with no backing attr → dead-control gate fires.
  Test:
    Happy: toggle in editor → attr writes (read saved post_content).
    Edge: device-tier switch writes to the right tier.
    Fail: dead-control gate.
    Integration: doesn't duplicate a header-level control (HC2).

QA Gate — P1 build + deploy + LIVE verify
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    P1-S1..S3
  Check:   `/qc-council` on the behaviour surface → build → deploy to sandybrown from an ISOLATED worktree → chrome-devtools (or wp-sgs-developer): scroll the canary, confirm per-row transparent + hide-on-scroll behave INDEPENDENTLY per row; confirm header-level behaviours (D376) NOT regressed; md5 the changed files local↔server.
  Pass:    two rows behave independently on the live page; existing behaviours intact; md5 match.
  Fail:    roll back via the .bak rotation; diagnose on the live DOM, not the emit.
  Marker:  QA

---

## PHASE 2 — Per-row shrink + shrink-hides-element + footer parity

Step P2-S1 — Per-row shrink (padding/height)
  Model:   sonnet
  Action:  Add `rowShrink` (device-tier) + emit the shrink CSS (row padding/height reduce on the scrolled state), transition `transform`/`opacity` only (never filter/box-shadow — motion-perf rule). Reuse the header height-publisher.
  Files:   site-header-row/{block.json,render.php,edit.js}, site-footer-row/ same, header-behaviours.css, view.js
  Inputs:  design §1, must-fix 6 (no hover), must-fix 8 (height var)
  Outcome: a row visibly shrinks on scroll, eased not jumpy.
  Exec:    SEQUENTIAL
  Time:    30 min
  Tooling: Edit
  On-Fail: abrupt jump = missing transition; re-check header-behaviours.css.
  Test: Happy: scroll → row height reduces smoothly. Edge: shrink + transparent compose. Fail: no transition = jump. Integration: doesn't break never-overflow.

Step P2-S2 — Shrink-hides-a-chosen-element (stable id + DB-role guardrail)
  Model:   inline (architectural — the reference + guardrail model)
  Action:  Add a stable per-child id (set at insert, stored in the child's own attrs) — NEVER clientId (must-fix 3). The shrink control offers a picker of the row's children EXCLUDING any whose DB role is logo/nav/cart (must-fix 4, no hardcoded list). **⚠ FIRST verify (QC caught this): the `roles`/`slots` tables were built for the CLONING pipeline (BEM-class → block-slug). Confirm via `/sgs-db` that a slug→role REVERSE lookup actually works before coding the filter; if it doesn't, use `block_capabilities` or add the lookup — do NOT fall back to a hardcoded 3-name list (R-31-1).** Orphaned reference (element deleted) = shrink acts as nothing chosen, no error. Add an always-visible "reset shrink" action. Server-side backstop re-checks the role on render.
  Files:   site-header-row/{block.json,edit.js,render.php}, includes/ helper for the role check
  Inputs:  must-fix 3 + 4; DB roles/slots tables
  Outcome: operator picks a non-critical element to hide on shrink; logo/nav/cart never offered; deleting the element doesn't error.
  Exec:    SEQUENTIAL
  Deps:    P2-S1
  Time:    45 min
  Tooling: Edit, sgs-db.py (role lookup)
  On-Fail: if the picker offers logo/nav/cart → the role query is wrong; if clientId leaks in → copy/paste breaks it.
  Test: Happy: pick phone number → hides on shrink. Edge: delete the chosen element → no error, shrink ignores it. Fail: attempt to hide cart → not in the list AND server backstop refuses. Integration: DB-first, no hardcoded dict.

Step P2-S3 — Footer parity verify
  Model:   sonnet
  Action:  Confirm footer rows inherit the same behaviours (same block mechanism); live-verify a footer bottom row.
  Files:   (verification; footer-row already shares the mechanism)
  Outcome: footer per-row behaviours work identically.
  Exec:    SEQUENTIAL
  Deps:    P2-S1,S2
  Time:    15 min
  Test: Happy: footer bottom row shrinks independently. Edge: footer has no sticky-to-bottom oddity. Fail: mechanism diverges. Integration: header+footer share one code path.

QA Gate — P2 build + deploy + LIVE verify (as P1 gate) — Marker: QA

---

## SIDE TRACK A — ✅ CLOSED 2026-07-26. Design signed off (D389) AND the build shipped (D391/D392).

**Outcome, so nobody re-runs this:** SA-1 concluded that per-row `position: sticky` must NOT be
built (short-parent trap). Sticky stays HEADER-level; rows COLLAPSE instead. Must-fix 1 is
therefore resolved by removing the conflict rather than arbitrating it — with one sticky element
there is no per-row sticky↔hide-on-scroll collision to make mutually exclusive. Must-fix 2's
offset chain is explicitly NOT to be built (nothing to chain); its research is banked for Spec 18.
Must-fix 8's scroll-padding turned out to be a LIVE BUG, not just a thing to confirm — it was
applied unconditionally, reserving the full header height on non-sticky pages — and is now fixed.
Canonical record: **Spec 37 FR-37-40**. This step is historical.

Step SA-1 — Design the per-row sticky model `[DONE — see the outcome above]`
  Model:   inline (architectural)
  Action:  Resolve must-fix 1 (sticky ↔ hide-on-scroll: a transformed ancestor breaks position:sticky — make them mutually exclusive per row in v1, OR lift the sticky row out of the transform) + must-fix 2 (multiple sticky rows = auto-offset chain via the height-publisher + named z-index scale) + must-fix 8 (scroll-padding-top — NOTE per QC this is ALREADY live at `header-behaviours.css:26-28` via `--sgs-header-height`; SA-1 CONFIRMS it holds under multiple dynamically-sized sticky rows, it does not build it from scratch). Write it into the design doc + a new FR in Spec 37. Get Bean sign-off.
  Files:   design doc, .claude/specs/37-HEADER-FOOTER-BUILDER.md
  Outcome: a written, signed-off sticky model. THEN it becomes a normal build step.
  Marker:  HANDOFF (needs Bean sign-off before build)

---

## SIDE TRACK B — Deal-winners (sequence AHEAD of / alongside the plumbing — council's steer)

- **B1 — Operator-simplicity test (run FIRST, cheap).** Can a non-coder set up a header in a few
  minutes without opening Advanced? Run against TODAY's header (7 controls vs ≤3). Record pass/fail.
  A fail is a finding (trim the Simple surface), not a reason to re-run. `[SESSION-START]`, ~30 min.
- **B2 — "Preview scroll behaviour" button.** A control that opens the live frontend pre-scrolled +
  at mobile width, so the client SEES sticky/shrunk/hidden/mobile before publishing. Biggest
  ticket-prevention. Independent of P1/P2.
- **B3 — Preset library.** Ready-made styled header/footer designs in the existing native picker
  (the mechanism already works). High-ROI, low cost. Independent.

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Sticky ↔ hide-on-scroll on the same row.
  - **Options:** [A] mutually exclusive per row (v1) / [B] lift the sticky row out of the transformed ancestor / [C] defer per-row sticky entirely.
  - **Recommendation:** A for v1 (simplest, safe), revisit B if a client needs both.
  - **Why:** a transformed ancestor provably breaks `position:sticky` (codebase already documents it for the drawer); mutual exclusion sidesteps it with zero risk.
  - **Cost of wrong choice:** a sticky row silently stops sticking when hide-on-scroll is also on — the D338 "looks right, renders wrong" trap.
  - **Who decides:** Bean (in SA-1 sign-off).

- **Decision:** Order — plumbing (P1/P2) vs deal-winners (B1–B3) first.
  - **Options:** [A] B1 (simplicity test) first, then P1 / [B] P1 first / [C] parallel.
  - **Recommendation:** B1 first (it's ~30 min and tells us if the current control surface already needs trimming before we add more), then P1.
  - **Why:** council converged that client-facing wins outrank internal plumbing; B1 is the cheapest and most informative.
  - **Cost of wrong choice:** build per-row controls onto an already-overloaded surface.
  - **Who decides:** Bean.

### Pre-emptive decisions (discharged by the adversarial council, not a separate reviewer pass)

- Reference the shrink-hidden element by stable id, not clientId — **decided** (must-fix 3).
- Guardrail via DB role lookup, not a hardcoded logo/nav/cart list — **decided** (must-fix 4).
- Per-row hover NOT built in v1 — **decided** (must-fix 6).
- Effect set CLOSED for v1 (transparent/hide-on-scroll/shrink/sticky) — **decided** (must-fix 5).
- Wrapper stays; if a capability is missing, add it to the wrapper, don't fork — **decided** (design §4).