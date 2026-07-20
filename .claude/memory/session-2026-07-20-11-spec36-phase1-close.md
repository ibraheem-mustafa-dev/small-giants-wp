---
doc_type: session-archive
project: small-giants-wp
date: 2026-07-20
title: "Spec 36 Phase 1 — Waves 0-4 + FR-36-1 close-out (full narrative, swept from LEDGER)"
note: "Swept from LEDGER.md at the 2026-07-20 handoff once Phase 1 CLOSED. The LEDGER now carries a compressed summary and points here. Verbatim — do not re-edit."
---

# Spec 36 Phase 1 — full Wave 0-4 narrative (archived from LEDGER 2026-07-20)

- **WAVES 0–3 DONE + on main** (`eaa4310e`, `f9c381f2`, `1ed828f0`, `5672b4c6`, `e6c10428`, `b41352fc`).
  Built: the shared `store('sgs/nav')` (D323 body-reparent + D340 scroll-lock ported verbatim, the two
  old focus-traps MERGED, API contract published); **`sgs/nav-menu`** (flat bar + burger→drawer, menu
  picker, collapse-point N, featured checklist, configurable `navLabel`, client-side `aria-current`);
  **`sgs/nav-drawer`** (full-screen `<dialog showModal>`, × undeletable chrome, FR-34-5 drawer settings)
  — **content-KIND block-private**, since a `<dialog>` cannot be hosted by `SGS_Container_Wrapper` (D294,
  Bean-approved); `scripts/nav-qa/` Gate-1 tooling; cart `role=status`; responsive-logo fixes. Track-1
  (Spec 35) was merged FIRST so the deploy shipped a complete plugin; `/sgs-update` ran (db-consistency
  0 violations after dropping `is_section_root`); deployed to sandybrown; **header re-authored** in
  `parts/header.html` (the version-controlled block-theme part, NOT the DB) — legacy `sgs/adaptive-nav`
  dropped for `sgs/nav-menu` (ref=1467) + `sgs/nav-drawer`, with adaptive-nav left registered but dormant
  for rollback. Gotchas captured: a new block needs a `seed-composition-roles.py` entry for the F6 gate;
  a nested nav-menu rendered a self-closing burger. Full narrative: `memory/session-2026-07-20*.md`.
- **WAVE 4 COMPLETE (2026-07-20) — machine-green + Bean-signed. Detail:** Cache purged, then ran the
  `scripts/nav-qa/` suite live. **GREEN:** axe on the OPEN drawer (375, scoped) = **0 violations**; crawl-assert PASS
  (5 bar + 5 drawer + logo present with JS off — **the "14 links" worry is ANSWERED: bar+drawer copies, not
  duplication**); burger-opens / ESC-closes / focus-returns-to-burger / Tab-contained all pass at 375; bar renders
  768+1440. logical-props-lint = 5 WARN (nudge only, nav-drawer `left/right` → logical props).
  **ONE REAL NAV BLOCKER FOUND + FIXED + LIVE-VERIFIED (D351, `cc3ec56d`+`45970282`, pushed):** the featured
  "Send to Ward" item rendered accent-gold on cream at **1.35:1**. Root cause was NOT a contrast-policy gap —
  `sgs/nav-menu` had **no `featuredBg` attribute at all**, so the converter had nowhere to put the draft's pill fill
  (`background:var(--primary)` + `color:var(--text)`) and silently dropped it. Added `featuredBg` (default `''` =
  label form unchanged); pill foreground routed through the existing `sgs_wcag_preferred_text_colour_for_bg` helper
  so no palette can regress below AA. Draft pairing = 5.28:1 PASS — **the fidelity fix and the a11y fix were one fix.**
  Deployed + re-measured: all 5 predictions (committed BEFORE the deploy ran) held exactly; drawer axe still 0, no
  regression. Report `reports/visual-diff/nav-menu-2026-07-20.md` — **PASS for the RESTING state only.**
  *(Bean caught my first diagnosis — I began designing a contrast fallback instead of reading the draft. Lesson in D351.)*
  **⚠ Then it silently REGRESSED and Bean caught that too:** at 01:36 UTC a **co-active session's deploy overwrote the
  canary** with a build lacking the commit (measured: live md5 `ffdb6129…`/15,865 B vs local `738c4558…`/17,462 B,
  `featured_bg_hex`=0 server-side). Redeployed; server md5 now matches local exactly, pill correct at 768+1440.
  **`build-deploy.py`'s verify leg did NOT catch this** — it asserts only HTTP 200 + generic SGS markers, which pass on
  any working page including one running old code (`P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC` + `P-CANARY-SHARED-DEPLOY-RACE`).
  **On a shared canary, treat "deployed + verified" as perishable — checksum the deployed file against local.**
  **STILL DIVERGENT (Bean-deferred): HOVER.** Draft = pill + `inset 0 -2px 0 accent`, no underline; live adds an
  underline from §4c's fallback branch. NOT fixed here — hover is being reworked at block level separately
  (`P-NAV-FEATURED-HOVER-DRAFT-PARITY`). The featured item is draft-faithful at REST, not on hover.
- **WAVE 4 — occlusion sweep + perf DONE (2026-07-20).**
  **(c) elementFromPoint sweep: `probes.mamas.json` AUTHORED + PASSING — TOTAL 20/20, including exactly 10/10 at 375,
  the Spec 36 §8 Mama's baseline.** Written against the LIVE DOM, not the block source (the shipped
  `probes.example.json` was Wave-0 placeholders whose selectors match 0 elements). Proves: the header row hit-tests
  to the drawer's close control, all 5 drawer links + the logo return themselves at their own centres, the close
  returns itself, and mid/low page are unreachable behind the modal; 5/5 bar links reachable at both 768 and 1440.
  ⚠ **Selector trap documented in the file:** there are TWO `.sgs-nav-menu__bar` instances (header + the drawer's
  copy) — a bare selector silently probes whichever is first in the DOM; every probe is scoped `.sgs-site-header`
  or `.sgs-nav-drawer`.
  **(d) Perf: CLS PASSES (0.0000 at 375, 0.0144 at 1440, budget <0.1). Page CSS/JS budget FAILS but NOT because of
  the nav** — CSS 371.2KB vs 100KB, JS 84.0KB vs 50KB; nav share is only 17.3KB JS + ~0 separate CSS. Dominated by
  WooCommerce (118.3KB CSS — WC alone exceeds the whole CSS budget), the theme's `woocommerce.css` (46.5KB),
  core-blocks CSS (47.9KB) and jQuery (28.8KB, pulled by WC not by SGS code). **Cheap nav-adjacent win found:
  `mega-menu-panels.css` (13.1KB) loads although Phase 1 ships no mega menu.** Logged `P-CANARY-PAGE-WEIGHT-BUDGET`
  — **do NOT block Gate-1 on it** (nav is not the cause, CLS passes).
- **WAVE 4 — Bean's eye (R-31-13) PASSED 2026-07-20** on both the desktop bar and the open mobile drawer.
- **WAVE 4 — drawer open-animation direction control SHIPPED (`31209f58`, live-verified).** Bean could not judge
  the D340 bounce test because the drawer entered with a VERTICAL nudge while the bounce is a HORIZONTAL geometry
  shift — the entry animation masked the axis under test (the old drawer slid in from the right, which is why the
  bounce was visible then). The entry animation was a hardcoded `translateY(-8px)` regardless of `edge` (and `edge`
  is geometry, not motion). Added **`animateFrom`**: `auto` (default — emits NO class, existing sites unchanged) |
  `fade` | `right` | `left` | `top` | `bottom`, with a plain-language inspector control. **Every directional rule
  sits INSIDE the `prefers-reduced-motion: no-preference` block, so reduced-motion users see no movement whichever
  value is chosen — PROVEN by emulation, not asserted** (`reduce` → `animation-name:none`, `transform:none`, drawer
  still opens). Header set to `animateFrom:right`. 3/3 predictions held; axe still 0; no regression. Report
  `reports/visual-diff/nav-drawer-2026-07-20.md` PASS. Deploy **checksum-verified** local↔server this time.
- **WAVE 4 — D340 BOUNCE TEST PASSED (Bean, manual, 2026-07-20): "100% fixed. Totally not there anymore."**
  Established by Bean in a real windowed desktop browser — the ONLY instrument that can observe it. ⚠ The harness
  cannot and must not claim this: headless Chromium reports `innerWidth - clientWidth = 0` (overlay scrollbars), so
  the store's classic-scrollbar guard never fires. D340's fix (`store.js` pins the root scrollbar track while
  locked) is now VERIFIED.
- **WAVE 4 — drawer EXIT animation fixed (live-verified).** Bean caught it straight after: the drawer "just goes"
  on close instead of reversing. **A real bug PREDATING the animateFrom work** — the original vertical exit
  keyframes were equally dead. Cause (read from source): `runClose()` added `.is-closing` then called
  `dialog.close()` in the SAME tick; `close()` removes `[open]` → `<dialog>` is `display:none` immediately → the
  browser never painted a frame of `.is-closing`. Fix: animate, then close on `animationend` (target-checked;
  fail-safe timeout reads the REAL computed `animationDuration`, so a stuck-open drawer is impossible). **Native
  ESC bypassed `runClose` entirely** on a modal `<dialog>` — now routed through the same path, so ×/ESC/scrim
  behave identically. ⚠ **SHARED-STORE change** (`store('sgs/nav')`, consumed by nav-drawer + nav-menu); the
  native `close` event remains the single teardown point and is untouched. Verified across 4 routes × reduced-motion;
  exit now reverses entry (`slide-in-right`→`slide-out-right`), reduce still closes instantly. **No regression:
  axe 0, sweep still 20/20, ESC/focus/Tab all pass.**
- **FR-36-1 CLASSIC-MENU RESOLVER — BUILT + LIVE-VERIFIED (D352, `4a4c220a`, pushed, 2026-07-20).** The nav
  could only read block menus; Spec 36 makes CLASSIC menus (*Appearance → Menus*) primary, so a classic menu
  rendered nothing. Resolver now goes CLASSIC-FIRST then `wp_navigation` (**Bean's ruling**: keep the single
  numeric `ref`, let classic win the id tie — no new attr, no reshape), normalising classic items into the same
  block-shaped array so `flatten()`/drawer/edit.js needed ZERO changes. FR-36-1's missing fallback order
  (theme location → latest classic → latest block menu) also implemented. Editor picker now lists classic
  menus (they were unpickable) and disables a block menu whose id clashes. Deploy **checksum-matched**
  local↔server. ⚠ **First acceptance run was VACUOUS and was caught**: the 5 labels asserted also come from the
  header's block menu, so it would have passed with the feature absent — redone with a `ClassicOnlyMarker`
  present on the classic page and ABSENT on the homepage (negative control). 6 real `<a href>` in pre-JS HTML,
  child item correctly flattened out, `/gift-ideas/` vs header's `/gifts/` proves distinct sources. No
  regression: homepage crawl 5/5, drawer axe **0**, sweep **20/20**. Spec 36 FR-36-13 also corrected (it
  wrongly said nav-drawer keeps `SGS_Container_Wrapper`) + `<dialog>`-exception documented.
  **Test fixtures left on the canary for inspection — say the word and I'll remove:** classic menu term **94**
  ("SGS Classic Test Menu", assigned to no location so it cannot affect the header) + page **1548**
  `/fr-36-1-classic-menu-test/`.
- **✅ SPEC 36 PHASE 1 IS CLOSED (2026-07-20).** Gate-1 machine-green + Bean-signed; FR-36-1 built + live-verified
  (D352); the post-build roster deferrals worked through. **Roster close-out detail:**
  - **`no-header-footer-block.py`** — NO CHANGE NEEDED, and this was proven by EXECUTING the hook, not by
    re-reading its regex: `nav-menu`/`nav-drawer`/`site-header` → exit 0 (allowed), `nav`/`header` → exit 2
    (blocked). The regex needs `nav` followed by a separator or end-of-string, so `nav-menu` never matched.
    Spec 17 FR-S9-1's roster + acceptance list updated to say so with the fixture results inline.
  - **Spec 00 §2.1** — refreshed. It still named `sgs/mobile-nav` as a live block; that block was DELETED at
    D336/Task 1 on 2026-07-14, so the roster had been stale for six days. Now names `sgs/nav-menu` +
    `sgs/nav-drawer` and marks `adaptive-nav` reference-only.
  - **Spec 29 / container roster** — `/sgs-update` **Stage 11 was failing (exit 1)** and closing this fixed it.
    The detector was RIGHT and the hardcoded expectation was stale: `sgs/nav-menu` + `sgs/brand-strip` (LAYOUT)
    and `sgs/nav-drawer` (CONTENT) were all detected-but-unexpected. Added with rationale; validator now exits 0.
    ⚠ Its mirror dry-run reports **259 attr additions + 20 support changes across 15 blocks** — NOT applied
    (`--apply` withheld): that is shared-wrapper capability propagation, design-gate territory (Rule 7), and
    unrelated to nav. Logged as its own decision to make, not silently skipped.
  - **DB attribute drift — FIXED.** `/sgs-update` registered **30 new attrs**. `sgs/nav-menu` had only 2 of its
    9 `featured*` attrs in the DB (D351's `featuredBg` and Track 1's 4 hover attrs had never been registered);
    all 9 present now, `sgs/nav-drawer` at 11. Site is WP **7.0.2** (docs elsewhere still say 7.0.1).
  - **⛔ "Retire the adaptive-nav / mega-menu / mobile-nav DB rows" — NOT ACTIONABLE, and doing it would be
    WRONG.** Checked rather than executed: `mobile-nav` is ALREADY gone from both `src/` and the DB (no-op —
    already done); `adaptive-nav` still has `src/` and MUST stay registered as the FR-36-18 rollback path until
    the Indus header is re-authored; `mega-menu` still has `src/` and is **Phase-2 scope** (the mega CPT +
    native attach), not superseded work. `/sgs-update` Stage 10 prunes by src-orphaning, so it correctly
    deleted 0 blocks. **This deferral was written on an assumption that does not hold — it should be struck,
    not carried forward.** Real trigger: the FR-36-18 Indus cutover (adaptive-nav) and Phase 2 (mega-menu).
- **WAVE 4 COMPLETE — Gate-1 is machine-green + Bean-signed.** Remaining before Phase 1 closes: featured hover parity
  (now largely absorbed by Track 1's hover work — RECHECK before re-opening). Content refinements for the editor:
  menu 1467 uses `/gifts/` (mockup wants `/gift-ideas/`, page exists) + an "Our Story" submenu (flattened in Phase-1).
- **NOT nav, recorded so it isn't re-flagged as a nav regression** (all present before the fix): 2 page contrast
  fails (button #c56a7a/white 3.67:1, Trustpilot #00b67a/white 2.63:1) + a **duplicate `<main>` landmark** (3 axe
  rules) — live-DOM probe traced the inner one to a `core/group` in the PAGE content, so it belongs to the queued
  core→SGS migration (product-queue task A), not to nav.
- **2 new gate findings logged, neither bypassed silently:** `P-AUDIT-COLOUR-ROLE-KEYED` (the uniformity audit's
  supports.color check is NAME-keyed with a permanent false-positive class — re-key it on the Spec 35 element
  manifest, which already has `isWrapper`+`attrMap`; 1/79 blocks seeded so it lands incrementally) and
  `P-VISUAL-GATE-ORDERING` (the visual-diff commit gate wants live proof, but proof needs deploy and deploy needs
  a clean tree — circular; best fix = split pre-commit "report exists + BEFORE captured" from a post-deploy AFTER
  check wired into `build-deploy.py`'s verify leg).
  **Architectural follow-up — CLOSED 2026-07-20 (D352):** the classic-menu resolver is built + live-verified
  (see the FR-36-1 entry above). Bean rulings still standing: converter/clone DEPRIORITISED until the whole
  header+footer+nav is done; featured-item = a block attribute.
Handoff: `next-session-prompt-nav-rework-P2.5.md`.
