# qc-council — Spec 34 + build plan (pre-dispatch gate), 2026-07-15

**Artefacts:** `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` +
`.claude/plans/2026-07-15-spec34-build-plan.md` (both committed at D341 before review).
**Raters:** 3 × Sonnet (cross-model vs the Opus author): A spec-lawyer · B code-path
tracer · C accessibility adversary. All given file:line fact-check duty + the
Hidden-Decisions duty (folded per the plan's recorded deviation).

## Verdicts

| Rater | Verdict | Headline |
|---|---|---|
| A (spec-lawyer) | GO-WITH-MUST-FIX | specificity war unaddressed; FR-S9-5 amended in 1 of its 2 duplicate bullets; focus wording self-contradictory; "zero stored instances" asserted not measured |
| B (code-path) | GO-WITH-MUST-FIX | same specificity war (independent discovery, file:line); existing header pattern carries drawer children ⇒ template never seeds the menu ⇒ flagship drawer ships with ZERO nav links; extraction target file mispointed |
| C (a11y adversary) | GO-WITH-MUST-FIX | no top-layer escape ⇒ transformed-ancestor hazard (re-parent mandate); `::backdrop` click idiom dies with `.show()`; hardcoded toggle-wrap fights the live header row; wpadminbar unspecified; icons lack aria-hidden; zoom floor missing |

Certainty: 3/3 convergent GO-WITH-MUST-FIX; the top finding independently triangulated
by ALL THREE raters from different evidence (A: the spec text; B: `container/style.css`
child rule + the block's own comment; C: containing-block semantics). Proceed.

## Synthesis → dispositions (every finding fact-checked before amending — STOP-COUNCIL)

**MUST-FIX, confirmed + amended into the docs:**
1. **Geometry loses the cascade without top-layer** (A#1+B#1+C#1) → FR-34-1 now MANDATES
   re-parent drawer+scrim to `<body>` at first open (the proven D323 pattern, now
   load-bearing for CSS too) + a `position === 'fixed'`-while-open regression probe.
   Fact-checked: `.sgs-container` rules confirmed in `container/style.css`; the
   adaptive-nav style.css comment that documents the clash-masked-by-showModal read live.
2. **Flagship drawer would ship menu-less** (B#2) → Dispatch-E must insert
   `<!-- wp:sgs/nav-menu /-->` into `parts/header.html` + `framework-header-default.php`.
   Fact-checked: header.html L13–16 carries business-info + social-icons children today.
3. **Scrim click ≠ `::backdrop`** (C#2) → FR-34-1 + Dispatch-A: real element, own listener.
4. **Focus containment redefinition was self-contradictory** (A#2+C#3) → Spec 34 §3
   rewritten (containment emergent from the freeze; boundary = {live header row + drawer});
   Spec 17's focus bullet amended with a pointer.
5. **FR-S9-5's duplicate background bullet unamended** (A#3) → both bullets + the (a)/(b)
   criterion now carry the header-exception pointer in Spec 17.
6. **"Zero stored instances" unmeasured** (A#4) → MEASURED: `wp db query` on both live
   sites, publish+draft, all 6 attr names — zero rows. Recorded in Spec 34 §6.
7. **nav-menu uid collision** (C#6) → FR-34-4: md5+anchor uid mandated + a
   two-default-instances test.
8. **Icons not aria-hidden / swap mechanism unpinned** (C#5) → FR-34-2: both icons
   `aria-hidden="true" focusable="false"`, swap pinned to `display:none`.
9. **Freeze walk ambiguity + `#wpadminbar`** (A/B/C convergent) → FR-34-1 names the exact
   walk; wpadminbar EXCLUDED (stays live); logged-in probe added to Gate C.
10. **Zoom/short-viewport floor** (C#8) → top offset capped `min(…, 50dvh)`; short-viewport
    probe added to Gate C.

**SHOULD-FIX, adopted:** Dispatch-B repointed to `class-sgs-adaptive-nav-renderer.php`
(B-SF3, fact-checked: `render_drawer_*` at L328–640); copy-not-reuse decision stated
(renderer hardcodes drawer BEM classes); Step 3 deletes the dead `render_drawer_*`
methods + `setupDrawerAccordions()` (B-SF4 + C-SF duplicate-listener hazard); document-
level ESC + explicit `toggle.focus()` on all close paths (C#7 + Safari note); explicit
z-index pair 99990/99991 below wpadminbar (C-SF); inert browser floor + degradation
stated (C-SF); Spec 17 guardrail gains the removal-licence clause (A-SF) + the stale
`drawerHeadBg`/`drawerWidth` worked example corrected (B-SF5); FR-S9-4's stale
"Opens sgs/mobile-nav" line → Dispatch-E (B-SF6); FR-S4-5 linter added to Dispatch-E
self-test (A-SF); empty-container zero-output claim demoted from assumption to a Gate B
probe (B-WP); hybrid-pattern semantics note added so implementers don't collapse the
drawer into the mega-panel's pure-disclosure idiom (C-SF); `drawerGap`/`drawerPadding`
vs future FR-S9-6 shape-compat constraint recorded in Spec 34 §6 (A-SF).

**Noted, not adopted:** aria-live-in-frozen-content silencing = accepted consequence,
recorded in FR-34-1; D4 (pinned header) stays a Bean-visible flagged default;
`-webkit-overflow-scrolling: touch` already present on the drawer.

**USP line:** caught pre-dispatch: 1 guaranteed geometry regression (the bug this spec
exists to kill, reborn), 1 flagship menu-less drawer ship, 1 dead close path, and 7
a11y-contract gaps — ~2 full build-verify-rework waves saved.
