# Next session — Spec 36 Nav, WAVE 4 (Gate-1 acceptance)

Invoke `/autopilot` before doing anything else.

## Plain-English state (read first)
The new navigation is **built, deployed, and live on the sandybrown canary**. Waves 0–3 are done and on `main` (up to `d3bfa24b`). This session is **Wave 4 — the Gate-1 acceptance sweep + Bean's visual sign-off**, the last step before Phase 1 closes.

**Single source of truth for status = `.claude/LEDGER.md`** (nav section: "WAVE 3 DONE" + "NEXT = WAVE 4"). Read it first.

## What's already done (verified)
- **Waves 0–2:** `sgs/nav-menu` (flat classic-menu bar + burger→drawer via the shared `store('sgs/nav')`) + `sgs/nav-drawer` (full-screen `<dialog>` modal, × undeletable chrome, FR-34-5 drawer settings). Gate 2 all green + 3-rater `/qc-council`; drawer is content-KIND block-private (D294; Bean-approved).
- **Wave 3:** Track-1 (Spec 35) merged into `main`; `/sgs-update` ran (db-consistency 0 violations after the `is_section_root` fix); deployed to sandybrown (plugin + theme); **header re-authored** (`parts/header.html`) — legacy `sgs/adaptive-nav` dropped, `sgs/nav-menu` (ref=1467 "Primary Menu") + `sgs/nav-drawer` live. Verified: new nav renders, interactivity island present, adaptive-nav gone, no PHP errors. adaptive-nav stays registered (dormant) for rollback.

## THIS SESSION — Wave 4 / Gate-1 (needs Bean live)
Run the pre-registered exit gate on the canary (`https://sandybrown-nightingale-600381.hostingersite.com/`), cache-cleared FIRST:
1. **Run `plugins/sgs-blocks/scripts/nav-qa/`** — `axe-run.mjs` = 0 on the OPEN drawer; `elementfrompoint-sweep.mjs`; `crawl-assert.mjs` (bar links in pre-JS HTML); `logical-props-lint.py`; plus `wp-perf-gate` (JS<50KB/CSS<100KB, no CLS).
2. **Interactive check (Playwright):** burger opens the full-screen drawer; ESC closes + focus returns to the burger; Tab contained; 375/768/1440 + a non-default collapse-N sweep; `prefers-reduced-motion` + `forced-colors`. The **D340 scrollbar-bounce test is MANUAL** (real windowed desktop browser).
3. **Bean's eye (R-31-13):** cropped before/after desktop-bar + open-mobile-drawer pair. Design sign-off → then close Phase 1 in the LEDGER + `/handoff`.

## Known refinements to fold in at Gate-1 (editor / content)
- Menu 1467 links "Gift Ideas" → `/gifts/` but the mockup + the created page is `/gift-ideas/`; and "Our Story" has a submenu (flattened in Phase-1). Confirm the live bar's 14 `nav-menu__link` count is bar+drawer (no duplication).
- 5 mockup pages exist as menu targets (Shop=13, Our Story=1525, Send to Ward=1526, Gift Ideas=1527, FAQs=1528).

## ⚠ Architectural follow-up (before FR-36-1 is "done")
`class-sgs-nav-menu-source.php::blocks_from_ref()` only resolves **`wp_navigation` posts + page-list fallback** — it does NOT implement **classic-menu** resolution via `wp_get_nav_menu_items()`. So Spec 36 FR-36-1's "classic menus PRIMARY" is **NOT built** (a classic `nav_menu` term ref won't render). Close this + add the FR-36-13 `<dialog>`-exception note to spec 36 (now on `main` post-merge).

## Guardrails
- **No shared worktree / co-active tracks now** — Track 1 merged + `feat/brand-strip-inspector-rebuild` deleted on origin; work directly on `main`. (Track C `feat/core-block-migration` is a separate branch — leave it.)
- Bean rulings: converter/clone DEPRIORITISED until whole header+footer+nav done; featured-item = block attribute.
- Cache-clear (LiteSpeed + Hostinger CDN) before ANY measurement. Desktop browser for the D340 bounce test. Verify LIVE, not the emit.
