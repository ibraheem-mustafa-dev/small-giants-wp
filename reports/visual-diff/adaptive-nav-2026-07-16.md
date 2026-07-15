# adaptive-nav — Spec 34 disclosure drawer, live verification (2026-07-16)

verdict: PASS
first_paint_capture_passed: true

**Change:** Bean's approved header-visible disclosure model (Spec 34 FR-34-1/2/3) replacing
the `showModal()` drawer. Built by an Opus workstream (presentation + toggle), integrated
inline (InnerBlocks container model, context wiring, dead-code removal, clip-path reveal).

## Live (sandybrown, 375px, full cache clear incl. Hostinger CDN) — Gate B: ALL PASS

| FR-34-1/2/3 criterion | measured |
|---|---|
| header row stays INTERACTIVE while open (**the whole design**) | **toggle reachable** via `elementFromPoint` at its centre while the drawer is open |
| drawer starts at the header's bottom edge | drawer top **143** = header bottom **143** |
| drawer full-bleed | width **360** = layout viewport **360** |
| drawer reaches viewport bottom | bottom **800** = viewport **800** |
| scrim never covers the header | scrim top **143** = header bottom |
| background frozen | hero link resolves inside `[inert]` |
| non-modal | `:modal` = **false**; `aria-modal` = **null** (never set) |
| re-parented to `<body>` | drawer **and** scrim = direct children of `<body>` |
| `position` computes `fixed` | **yes** — the qc-council's #1 catch, fix holds |
| toggle target | **44×44** in both states |
| no horizontal overflow | `scrollWidth <= clientWidth` |
| axe-core (open drawer) | **0 violations** |
| menu renders (`sgs/nav-menu` child) | **6 links**, inherited via context |

## Three bugs found live and fixed (none visible to any static check)

1. **`--sgs-header-height` was never a measurement.** The FR-S9-9 publisher
   (`src/header-behaviours/view.js`) was **never compiled**: `webpack.config.js` only added
   `extensions/index` + `plugins/product-variation-sets/index` as non-block entries, and
   wp-scripts auto-discovers `src/blocks/*` only. So `build/header-behaviours/view.js` never
   existed; the deploy tar excludes `src/`; `class-sgs-header-behaviours.php::enqueue_assets()`
   found NEITHER path on the server and hit its silent `return`. The var fell back to
   `utilities.css`'s static **80px** while the real header measured **143px**.
   **This falsified a qc-council "CLEAN" finding** (Rater B: "publishes unconditionally…
   works regardless of header mode") — the rater verified the CODE publishes, not that the
   script LOADS. Fixed by adding the entry to **both** branches of the entry function
   (introspected `cfg.entry()` to prove which branch is live rather than infer — my first
   inference, "extensions emits ⇒ promise branch", was wrong: both branches contain it).
   **Blast radius beyond this drawer:** `scroll-padding-top` (WCAG 2.4.11 anchor offset) has
   been using 80px-that-was-never-measured on every deployed site.
2. **UA `dialog { width: fit-content; height: fit-content }` beat the insets.** Removing the
   old explicit width/height left nothing to override the UA rule: the drawer rendered
   **285px wide** (content width) and **426px tall** instead of filling its insets. Fixed
   with explicit `width: auto; height: auto` (load-bearing, commented as such).
3. **Focused link at 1.48:1** — see `nav-menu-2026-07-16.md`; theme.json's global `a:hover`
   (0,1,1) beat the block's resting rule (0,1,0).

**A measurement I got wrong and corrected:** "drawer not full width" was **my test**, not the
CSS — a `position:fixed` element sizes to the LAYOUT viewport (360px, excludes the 15px
scrollbar) while `window.innerWidth` includes it. Assertion corrected to
`documentElement.clientWidth`.

## Integration decisions (mine, at Gate A/Step 3)

- **clip-path reveal replaces the translateY slide** (WS-A raised the conflict; its
  suggestion was better than the spec's literal wording): with `top` anchored to the header
  and the drawer at z-index 99991, a `translateY(-100%)` start paints the panel OVER the
  header for the whole 250ms — fighting the design's core promise. `clip-path: inset(0 0
  100% 0)` → `inset(0)` keeps the box still and wipes down; it cannot touch the header at
  any frame. Direction remains Bean's-eye per Spec 34 §6 Q1.
- **`drawerBg` re-keyed** to the ancestry-independent `.{uid}.sgs-adaptive-nav__drawer`
  (WS-A) — a descendant-of-root selector dies once the drawer re-parents to `<body>`. My
  dispatch prompt said "keep drawerBg untouched"; that instruction was wrong and the agent
  was right to flag it.
- **Dead code deleted:** the `render_drawer_*` cluster (~325 lines) from
  `class-sgs-adaptive-nav-renderer.php` (single caller removed) + `setupDrawerAccordions()`
  from view.js (nav-menu owns the accordion JS — duplicates would double-toggle). Anchored
  by asserted line-boundary checks; an off-by-one tripped the assertion and wrote nothing.

## First-paint (M1)

Static: `animation-fill-mode:both` = 0, non-zero `animation-delay` = 0 (the drawer uses
`transition`, not `animation`). The one `transition-duration: !important` is the
`prefers-reduced-motion` kill-switch — baselined with 9 sibling precedents, reason recorded
in the cheat-gate baseline commit.

## Open / not covered

- **Gate C** (still to run): 768 + 1440 sweeps; ESC + focus-return + Tab-wrap; the
  elementFromPoint sweep vs the 10/10 baseline; the frame sweep (anchor constant); the
  late-CSS A/B; two-default-nav-menu collision; short-viewport 50dvh floor; logged-in
  `#wpadminbar` probe; **Bean's screenshot sign-off (R-31-13)**.
- **Not fixed, parked** (`P-CALL-BUTTON-CONTRAST`): the header's D331 "Call" button renders
  cream on pink = **2.24:1**, a live WCAG failure found by this sweep. Pre-existing,
  NOT drawer-related, deliberately not scope-crept into a drawer rebuild.
