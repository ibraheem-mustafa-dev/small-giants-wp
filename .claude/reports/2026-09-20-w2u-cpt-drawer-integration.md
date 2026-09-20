---
doc_type: report
project: small-giants-wp
date: 2026-09-20
unit: W2-u — mega-menu + drawer same-page integration probe on the CPT-rendered drawer
commit: e25041a37 (deployed HEAD; nothing was built or deployed for this run)
verdict: PASS on focus containment, ESC interplay, focus return and scroll lock, across both modalities at 375 and 1440. Two behaviours reported as MEASURED rather than graded (see "Findings"). One assertion NOT RUN with its reason.
---

# W2-u — mega + drawer, same page, live

The plan row this closes: *"Re-run the mega + drawer same-page integration probe
(focus traps, ESC interplay, non-modal branch) on the CPT-rendered drawer."*

`.claude/reports/visual-diff/nav-drawer-2026-09-10.md` recorded focus/ESC
interplay as verified **"by reading"** and left the non-modal branch
**not live-exercised**. Both gaps are closed here: every row below was produced by
real `page.keyboard` presses and real `document.activeElement` reads in a live
Chromium against the canary, never by an attribute read alone and never by reading
source.

All fetches carried `?cb=<epoch>`; every one returned `x-hcdn-cache-status: MISS`.
No build, no deploy, no WordPress option changed.

## Fixtures (created for this run — all prefixed `[QA] W2-u`)

| id | slug | what it carries |
|---|---|---|
| **3693** | `qa-w2u-mega-plus-cpt-drawer` | mega bar **+ the site's ACTIVE `sgs_drawer` CPT drawer (3593)** — the CPT-rendered subject the plan row names |
| **3694** | `qa-w2u-nonmodal-drawer` | mega bar + an in-content drawer with `modality:"non-modal"`, default (full-screen) anchor |
| **3699** | `qa-w2u-nonmodal-partial-drawer` | mega bar + `modality:"non-modal"` with `anchor:{desktop:trigger,tablet:trigger,mobile:trigger}` + `panelSize` — the only shape that has an "outside" to click |

Also present from the Gate 2 re-run: **3692** `qa-w2u-gate2-block-path-drawer`,
**3695** `qa-w2u-gate2-negative-control`. **Tell me which of 3692–3699 to keep and
which to trash** — none of them overwrote anything; every one was created new
after a slug lookup that returned empty.

### Two design choices in the fixtures, and why

1. **Two `sgs/nav-bar-menu` blocks per page.** A single bar cannot give both
   surfaces at both widths: `collapsePoint:99999` (burger always reachable, needed
   at 1440) also collapses the horizontal list, which hides the mega trigger
   (measured: mega trigger `0×0` at both widths on the first attempt). So bar 1 is
   `{ref:115, collapsePoint:99999}` — burger only, on a menu with no mega item —
   and bar 2 is `{ref:100, collapsePoint:1, showBurger:false}` — never collapses,
   carries the "Brands" `sgs_mega_menu` item. Measured result: burger `44×44` and
   mega trigger `93×44` at **both** 375 and 1440, **1** dialog, **1** mega panel,
   **0** duplicate element ids.
2. **The non-modal branch is exercised on a block-rendered drawer, not the CPT
   one.** `modality` is a per-drawer attribute and the site has exactly one Active
   drawer; making the CPT drawer non-modal means writing the site-wide
   `sgs_active_drawer_cpt_id` option (or editing post 3593), which would change
   what every other session sees on the canary. The render path and the
   interactivity store are shared, so the branch under test is the same code; the
   difference is only which post supplies the block. **Stated, not hidden.**

## Results — the CPT-rendered drawer (page 3693, `modality:modal`)

Command, per width:
`node scripts/nav-qa/w2u-probe.mjs qa-w2u-mega-plus-cpt-drawer <375|1440> content` (run from `plugins/sgs-blocks`; usage `[SGS_QA_BASE=<site url>] node scripts/nav-qa/w2u-probe.mjs <page-slug> <width> <content|header>`)

| # | Check | Method | Measured (1440 / 375) | Negative control | Verdict |
|---|---|---|---|---|---|
| 1 | Baseline: drawer shut, mega collapsed | read `dialog.open`, `:modal`, `aria-expanded`, `getComputedStyle` after load | `dialog.open=false`, `:modal=false`, mega `aria-expanded=false`, panel `display:none` `0×0`, `openDialogCount=0`, `body.overflow=visible` | This row IS the control for every "opened" row | **PASS** |
| 2 | NEGATIVE CONTROL — Tab from the burger with the drawer CLOSED leaves the dialog | `page.keyboard.press("Tab")` ×12 from the burger, reading `document.activeElement` each press | **12/12** landed outside the dialog (`a.sgs-nav-bar-menu__link «Home»` → `button …__mega-trigger «Brands»` → `button …__subtoggle «Recipes»`) | Self — exists to falsify rows 5 and 6 | **PASS** |
| 3 | Drawer opens by KEYBOARD | `locator(burger).focus(); keyboard.press("Enter")` | `dialog.open=true`, `:modal=true`, rect `1440×900` / `375×900`, `openDialogCount=1` | Row 1 | **PASS** |
| 4 | `aria-modal` is NOT set (FR-36-6 binding rule) | `dialog.getAttribute("aria-modal")` with the drawer open | `null` at both widths | The same read returns a string for `data-sgs-nav-modality` on the same element, so a `null` is a real absence, not a broken read | **PASS** |
| 5 | Focus MOVES INTO the drawer on open | `document.activeElement` after Enter; `dialog.contains(activeElement)` | `button.sgs-nav-drawer__close`, `inDialog=true`, `isBurger=false` | Row 1 measured `activeElement = body` while closed | **PASS** |
| 6 | Tab CYCLES forward and stays trapped | `keyboard.press("Tab")` ×25 with the drawer open | **25/25 inside the dialog**, **7 distinct elements**, 0 in an `[inert]` subtree, 0 escapes — at both widths | Row 2 escaped 12/12, so "contained" is measured, not constant. "7 distinct" rules out a stuck focus reading as containment | **PASS** |
| 7 | Shift+Tab CYCLES backward and stays trapped | `keyboard.press("Shift+Tab")` ×25 | **25/25 inside**, **7 distinct**, 0 escapes — both widths | Same as row 6 | **PASS** |
| 8 | Background inertness under `modal` | `document.querySelectorAll("[inert]").length`; `burger.closest("[inert]")` | `[inert] elements = 0`, `burgerInert=false`, `megaTriggerInert=false` | Baseline also 0 | **MEASURED** — correct for `showModal()`: containment comes from the top layer, not the `inert` attribute. Compare the non-modal table below (15) |
| 9 | ESC closes AND returns focus to the burger | `keyboard.press("Escape")`; read `dialog.open` + `document.activeElement` | before: `activeElement=button.sgs-nav-drawer__close`, `isBurger=false`; after: `dialog.open=false`, `activeElement=button.sgs-nav-bar-menu__burger`, `isBurger=true` | Focus was **not** already on the burger before ESC, so the return is a real move, not a no-op | **PASS** |
| 10 | Body scroll lock engages on open, releases on close | `getComputedStyle(body).{overflow,position}` + `documentElement.overflow`, read closed → open → closed | closed `visible/static/visible` → OPEN `visible/**fixed**/visible` with `body.style.top="0px"` → closed `visible/static/visible` | The two closed reads are the control: an inert lock would show three identical triples | **PASS** |
| 11 | Mega opens by KEYBOARD | `locator(mega-trigger).focus(); keyboard.press("Enter")` | `aria-expanded` `false → true`; panel `display:none 0×0 → display:block h=1242` (1440) / `h=1212` (375) | The "before" read on the same selector | **PASS** |
| 12 | A desktop mega is NOT modal | `openDialogCount` + `getComputedStyle(body)` with only the mega open | `openDialogCount=0`, `body.overflow=visible`, `body.position=static` | Row 10 shows the same reads DO change when a modal surface opens | **PASS** |
| 13 | The mega survives focus moving to the burger | open mega by keyboard, then `.focus()` the burger **without** pressing Enter | `aria-expanded` still `true`, panel still `h=1242` / `1212` | Row 1 (collapsed baseline) | **PASS** — this separates "closed on focusout" from "closed on drawer open", which row 14 then attributes |
| 14 | Mega-then-drawer: exactly ONE open dialog, no double-open | press Enter on the burger with the mega open; count open dialogs and visible mega panels | `dialog.open=true`, `openDialogCount=1`, `visibleMegaPanels=0`, **`megaExpanded=false`** | Row 13 immediately before: mega was expanded with 0 dialogs | **PASS** |
| 15 | ESC closes only the top-most surface; no focus loss | one `keyboard.press("Escape")` | `dialog.open=false`, `activeElement=button.sgs-nav-bar-menu__burger`, `activeIsBody=false`, `visibleMegaPanels=0` | Measured against row 14's state one key press earlier | **PASS** |
| 16 | A second ESC resolves the remaining surface | second `keyboard.press("Escape")` | `dialog.open=false`, `megaExpanded=false`, `visibleMegaPanels=0` | Row 15 recorded the state after the first ESC | **MEASURED** — there is nothing left for the second ESC to close, because opening the drawer already dismissed the mega (row 14) |
| 17 | Drawer-then-mega: can the background mega trigger take focus while the drawer is open? | drawer open by keyboard, then `el.focus()` on the mega trigger; read `document.activeElement` | **modal:** focus stays `button.sgs-nav-drawer__close`, `activeInDialog=true` — the top layer refused it | The same element focuses successfully when the drawer is closed (row 11 drives it by keyboard), so the refusal is caused by the open drawer | **MEASURED — correct for `modal`** |
| 18 | Outside click / click-away | measure the open panel rect against the viewport before attempting any click | panel rect `1440×900` at 1440 and `375×900` at 375 — the panel **covers the viewport**, so no point outside it exists | n/a | **NOT RUN** — no outside area exists for a full-screen anchor. `store.js` documents the full-screen anchor as unaffected BY CONSTRUCTION. Exercised properly on fixture 3699 below |

## Results — the non-modal branch

Commands:
`node scripts/nav-qa/w2u-probe.mjs qa-w2u-nonmodal-drawer 1440 content` ·
`… qa-w2u-nonmodal-drawer 375 header` ·
`… qa-w2u-nonmodal-partial-drawer <1440|375> content`

The contract (`store.js`, FR-36-6): `.show()` instead of `showModal()`; **no**
hand-rolled Tab trap; `freezeBackground()` sets `inert` + `aria-hidden` on every
body/`.wp-site-blocks` child **except the trigger's own row**, so containment is
**emergent** and the legal Tab set is `{drawer + live trigger row}`; ESC is
hand-rolled with `stopPropagation()`; focus return and scroll lock identical to
modal; `aria-modal` must never be added.

| # | Check | Method | Measured | Negative control | Verdict |
|---|---|---|---|---|---|
| 19 | The branch is genuinely taken | `dialog.matches(":modal")` with the drawer open | **`:modal=false`** on 3694 and 3699; `data-sgs-nav-modality="non-modal"` in the served HTML | The modal table row 3 measured `:modal=true` on the same read | **PASS** |
| 20 | `aria-modal` still absent under non-modal | `getAttribute("aria-modal")` | `null` | As modal row 4 | **PASS** |
| 21 | Focus moves into the drawer on open | `document.activeElement` | `button.sgs-nav-drawer__close`, `inDialog=true` | Baseline `body` | **PASS** |
| 22 | Selective freeze really fires | `document.querySelectorAll("[inert]").length` + `closest("[inert]")` on burger and mega trigger | **3694 @375 via the HEADER burger: `[inert] = 15`, `burgerInert=false`, `megaTriggerInert=true`, `mainInert=true`.** Baseline (closed) = 0 | The closed baseline (0) and the modal table row 8 (0 with the drawer OPEN) are both controls: 15 is attributable to the non-modal open | **PASS** |
| 23 | Tab containment is the {drawer + live row} cycle, not a trap | `keyboard.press("Tab")` ×25, then a 14-press sequence dump | **0/25 landed in an `[inert]` subtree.** 23/25 in the legal set; 10 distinct elements (375/header). The dumped cycle: drawer links ×5 → logo → **`body` (one document wrap stop)** → header logo → **burger** → cart → drawer close → drawer links … i.e. it wraps cleanly through the live header row and back into the drawer | Closed-drawer walk escaped 12/12 into frozen content. **0 inert hits** is the real escape test and it is falsifiable: the same counter reports non-zero if the freeze ever inerts the trigger's row | **PASS against the non-modal contract** |
| 24 | ESC closes and returns focus to the burger | `keyboard.press("Escape")` | `dialog.open=false`, `activeElement=button.sgs-nav-bar-menu__burger` | Focus was on the close button immediately before | **PASS** (all four non-modal configurations) |
| 25 | Scroll lock behaves as modal does | as modal row 10 | closed `visible/static/visible` → OPEN `visible/fixed/visible`, `body.style.top="0px"` → closed `visible/static/visible` | Two closed reads either side | **PASS** |
| 26 | Mega + drawer interplay under non-modal | as modal rows 13–16 | Identical: mega survives focusing the burger; opening the drawer gives `openDialogCount=1`, `megaExpanded=false`, `visibleMegaPanels=0`; ESC closes the drawer with `activeIsBody=false` | Same controls as the modal table | **PASS** |
| 27 | Drawer-then-mega under non-modal | `el.focus()` on the mega trigger with the drawer open | **3694 @375 via the HEADER burger:** focus refused, stays `button.sgs-nav-drawer__close` (`megaTriggerInert=true`). **3694/3699 @1440 via the CONTENT burger:** focus **succeeds** on `button …__mega-trigger «Brands»` (`megaTriggerInert=false`) | The closed-drawer case focuses it successfully in both configurations | **MEASURED — and the difference is explained, see Finding B** |
| 28 | **Outside click closes the panel** (fixture 3699, partial-width) | `page.mouse.click` at a point derived from the measured rect: `x=64,y=238` (1440) and `x=64,y=322` (375), both outside the panel rect | `dialog.open=false`, `activeElement=button.sgs-nav-bar-menu__burger` — it closes **and** returns focus | Row 29 | **PASS** |
| 29 | NEGATIVE CONTROL — a click INSIDE the panel does NOT close it | `page.mouse.click` at the centre of the panel-rect ∩ viewport: `x=23,y=686` (1440), `x=23,y=771` (375) | `dialog.open=true` | Self — pairs with row 28 | **PASS** |
| 30 | The scrim exists only for a partial-width anchor | `document.querySelectorAll(".sgs-nav-drawer__scrim").length` after load at 1440 | 3692 (modal, full-screen) **0** · 3694 (non-modal, full-screen) **0** · 3699 (non-modal, trigger anchor) **1** (`data-sgs-nav-scrim="sgs-nav-drawer"`) | The middle row falsifies "non-modal ⇒ scrim" | **PASS** |

## Findings

**A. The mega and the drawer are never co-open — the drawer's open dismisses the
mega.** Measured at both widths and both modalities: with the mega expanded
(`aria-expanded=true`, panel `h≈1242`), pressing Enter on the burger yields
`dialog.open=true`, `openDialogCount=1`, `megaExpanded=false`,
`visibleMegaPanels=0`. Row 13 proves this is caused by the drawer OPEN and not by
focus merely leaving the bar (the mega survives `.focus()` on the burger). This is
a sound "no double-open" outcome, but it means the plan row's *"ESC closes only the
top-most surface"* scenario **cannot be reached in the mega→drawer direction** —
there is only ever one surface open by the time ESC is pressed. The reverse
direction (drawer→mega) is blocked too: under `modal` the top layer refuses focus
to the mega trigger, and under non-modal with a HEADER trigger `freezeBackground()`
inerts it. **Recommendation:** record in Spec 36 that the two surfaces are mutually
exclusive by design, so a future probe does not go looking for a two-surface ESC
stack that the product deliberately cannot produce.

**B. A drawer whose trigger lives in the page CONTENT leaves `main` live under
non-modal.** `freezeBackground()` skips any body/`.wp-site-blocks` child that
`contains(toggle)`. With the burger in the header that is the header row (correct:
`[inert]=15`, `main` inert, mega trigger inert). With the burger inside
`.entry-content` the skipped child is `main` itself, so the **whole page body stays
focusable** while the drawer is open (`megaTriggerInert=false`, `mainInert=false`,
and row 27's focus attempt succeeds). On the canary today every real burger is in
the header, so this is not a live defect — but it is a real property of the
mechanism and it is worth a guard or a documented constraint before anyone ships a
non-modal drawer opened from an in-content trigger.

**C. Observation for the owner's eye, not a verdict.** The trigger-anchored drawer
on fixture 3699 renders with a **negative left edge**: rect `x=-376,y=475,w=420`
at 1440 and `x=-256,y=643,w=300` at 375 — most of the panel is off-viewport. The
geometry comes from `--sgs-drawer-trigger-top/right` computed from the trigger's
rect, and the fixture's burger sits at the left of a full-width bar low in the
page. Whether that is correct anchoring behaviour or a clamp that is missing is a
design question, outside this probe's scope. It is flagged because it **silently
made an earlier pass of the inside-click control vacuous** (the click landed at
`x=-166`, off-screen, so nothing was clicked and the dialog "stayed open"); the
probe now intersects the rect with the viewport and emits NOT RUN when the
intersection is unclickable.

**D. Not a product finding — a probe trap now documented.** The mega panel
**reparents to `<body>`** when it opens, exactly as the drawer does. A
content-scoped panel selector matches before the open and `null` after it, which
reads as "the mega failed to open" on a mega that opened perfectly. Resolve the
panel by the trigger's `aria-controls` id. Written into the nav-qa README.

## What this does NOT claim

- **No visual fidelity claim.** Nothing here says the drawer or the mega *looks*
  right; that is Bean's eye (R-31-13).
- **The mega panel measured `w≈50, h≈1242` once reparented** on these two-bar
  fixtures. That number is recorded as context for the height/visibility reads, not
  asserted as correct layout; it needs its own look.
- **axe was not run** in this pass — this probe is keyboard, focus and state only.
  `axe-run.mjs` remains the accessibility gate.
