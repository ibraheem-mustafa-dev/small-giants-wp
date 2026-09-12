# E1 re-investigation — parent-hover loss when pointer enters its own submenu

**Scope:** Group E1 of `.claude/reports/2026-09-12-nav-menu-visual-review-register.md`,
re-opened after Bean's direct correction that he tested on the EXISTING scratch pages
(3487/3488), desktop, mouse, both bar and drawer, and it fails there. Diagnostic only — no
fix built.

**Verdict up front: REPRODUCED, live, on the BAR fork, on real named fixtures on both
scratch pages — with an exact mechanism, not a guess. The DRAWER fork could not be tested
this pass because of a separate, newly-discovered bug that blocks the drawer from opening
under Playwright automation at all (see "Drawer fork" section — this is a genuine
verification gap, not a "works fine" claim).**

---

## 1. Why the previous pass missed it

The Wave 1 cluster-2 agent (`.claude/verify/nav-review-wave1-cluster2-hierarchy.md`) tested
exactly TWO configurations: `itemBorderHoverTreatment:'swap'` (G7-BAR, explicit
`itemBorderColourHover:"#ff0000"`) and `itemBgHoverTreatment:'highlight'` (a JS-driven
sliding pill). Both of those ARE fixed — I independently re-confirmed both hold correctly
(see §3). But those two fixtures are exactly the ones with an EXPLICIT, block-attribute-
configured hover colour. The previous pass never tested a fixture that relies on the
site's AMBIENT/default anchor-hover colour instead of an explicit `itemColourHover`/
`itemBorderColourHover` — and that is precisely the configuration that is broken. Testing
only the "fixed" configurations and generalising to "the mechanism works" was the gap.

## 2. Reproduction — method

Standalone `chromium.launch()` Node/Playwright script (not the shared MCP browser, to avoid
the contention the previous pass already documented), on the LIVE pages:

- `https://sandybrown-nightingale-600381.hostingersite.com/spec41-step22-qa/` (post 3488)
- `https://sandybrown-nightingale-600381.hostingersite.com/step23-gate-spec41-nav-menu-interaction-gates/` (post 3487)

For every `nav[aria-label]` instance with a bar dropdown on both pages, a real stepped
`page.mouse.move()` (12 steps, ~35ms apart — the same technique the original G7 gate and
the Wave 1 re-check both used, not `.hover()` teleport): move onto the parent link, read
computed `border-bottom-color`/`color`, wait for the panel to open, then step the pointer
across the gap into the open submenu panel, sampling at every step, then read the settled
in-panel value.

## 3. Result — split exactly along "explicit attribute" vs "ambient default"

**Instances with an EXPLICIT `itemBorderColourHover`/`itemColourHover` set — hold correctly
(FR-41-13's fix is genuinely working for these):**

| Fixture | uid | On-link colour | Settled in-panel colour | Result |
|---|---|---|---|---|
| G7BAR | `3de3d209` | `rgb(255,0,0)` | `rgb(255,0,0)` | PERSISTS |
| G10A | `8056ece7` | `rgb(0,255,0)` | `rgb(0,255,0)` | PERSISTS |

**Instances with NO explicit hover colour attribute set — the parent's colour REVERTS the
instant the pointer leaves the literal `<a>`, exactly as Bean described:**

| Fixture | Page | uid | On-link colour | Settled in-panel colour | Result |
|---|---|---|---|---|---|
| G14 Submenu Neg | step22 (3488) | `0f6116a0` | `rgb(138,81,86)` | `rgb(58,46,38)` (= base) | **REVERTS** |
| G19b | step23 (3487) | `58df09f4` | `rgb(106,67,67)` | `rgb(58,46,38)` (= base) | **REVERTS** |
| G19c | step23 (3487) | `e0535ce7` | `rgb(106,67,67)` | `rgb(58,46,38)` (= base) | **REVERTS** |
| G19d | step23 (3487) | `69563c99` | `rgb(106,67,67)` | `rgb(58,46,38)` (= base) | **REVERTS** |
| G20SET | step23 (3487) | `6d577126` | `rgb(106,67,67)` | `rgb(58,46,38)` (= base) | **REVERTS** |
| G20UNSET | step23 (3487) | `354d064c` | `rgb(106,67,67)` | `rgb(58,46,38)` (= base) | **REVERTS** |

Six separate named fixtures, on both scratch pages, all reproduce the exact symptom Bean
described. This is not a 2-frame gap-transit flicker — the gap-traversal samples show the
colour holding at the hover value for the first 5-7 of 10 steps, then dropping and staying
at base for the remainder, including the fully-settled in-panel reading.

## 4. Root cause — exact mechanism, file:symbol, why it fails

Traced with `browser.evaluate()` walking `document.styleSheets` for every rule matching the
G19b link while it is genuinely `:hover`ed:

```
:root :where(a:where(:not(.wp-element-button)):hover) { color: var(--wp--preset--color--primary-dark); }
```

This is **WordPress core's own generated output of `theme.json`'s
`styles.elements.link.:hover.color`** — a SITE-WIDE, ambient hover rule for every `<a>` that
isn't a button, wrapped entirely in `:where()`, which gives it **zero CSS specificity**
(0,0,0). It has nothing to do with `sgs/nav-menu`'s own block or `nav-menu-css.php`.

For G19b/G19c/G19d/G20SET/G20UNSET (and G14 Submenu Neg on the other page), confirmed via
the aggregated CSS bundle
(`wp-content/uploads/sgs-css/sgs-3537-233a2f9d57322469a2bf01d5c84c08c4.css`) that **no
per-uid `.sgs-nav-menu__link{color:...}` rule of any specificity exists at all** for these
instances — they are deliberately unset/negative-control fixtures ("colours unset",
"negative control", "font-size tiers... unset"). With no competing higher-specificity rule,
the zero-specificity ambient theme rule above is the ONLY thing painting a colour on hover.
And because `.sgs-nav-menu__link{border-width:0 0 3px 0;border-style:solid;}` never declares
an explicit `border-color`, `border-bottom-color` defaults to `currentColor` per the CSS
spec — so it tracks whatever `color` resolves to, including this ambient rule.

By contrast, G7BAR/G10A DO have an explicit `itemBorderColourHover` set, which
`nav-menu-css.php` emits as a real per-uid declaration:
```
.sgs-nav-menu-3de3d209 .sgs-nav-menu__link:hover{border-color:#ff0000ff;}
```
— genuinely non-`:where()`-wrapped, specificity (0,2,1), which is what FR-41-13's rescue
selector targets and successfully keeps alive via the wrapper's own `:hover`:
```
.sgs-nav-menu-3de3d209 .sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link{border-color:#ff0000ff}
```

**`nav-menu-css.php`'s FR-41-13 rescue block (`$item_hover_decls`) only ever knows about the
block's OWN configured attributes** (`itemColourHover`, `itemBorderColourHover`,
`itemBgHoverTreatment`, etc.) — confirmed by grepping the same aggregated CSS: for
G19b/G20SET/etc. **no `:hover`/`:has()` rescue selector is emitted for their uid at all**,
only the base `.sgs-nav-menu__submenu-root{position:relative;display:flex;align-items:center;}`
rule. There is nothing in `nav-menu-css.php` that is even aware the ambient WordPress
`:root :where(a:hover)` global-styles rule exists, let alone a rescue counterpart for it.

**Why it fails, precisely:** the wrapper element (`.sgs-nav-menu__submenu-root`)'s OWN
`:hover` state correctly persists the whole time the pointer is inside the open panel — this
part of FR-41-13 genuinely works, confirmed by `rootHover:true` holding throughout every
gap-traversal step in the data above. But the ambient theme rule is keyed on the LITERAL
`<a>` element's own `:hover` pseudo-class (`a:where(...):hover`), not on any ancestor. The
instant the pointer physically leaves the `<a>` box — even while remaining inside the
wrapper `<div class="sgs-nav-menu__submenu-root">` — the `<a>` genuinely, correctly (per
real CSS `:hover` semantics) stops matching `:hover`, the ambient rule stops applying, and
since it was the ONLY thing painting a colour, the element reverts to its base `color`
(and, via `currentColor`, its base `border-bottom-color`) the moment that happens. This is
exactly what the six fixtures above measure.

## 5. Why the previous "not reproduced" verdict and this one don't actually conflict

Both are true simultaneously, for different reasons:

- **FR-41-13's actual rescue mechanism (the `:has()`/`:hover` selectors nav-menu-css.php
  emits for EXPLICITLY-configured hover attributes) is genuinely fixed and working** — the
  G7BAR/G10A re-confirmation in this pass agrees with Wave 1's finding on that narrow point.
- **But any nav-menu instance that has NOT been given an explicit `itemColourHover`/
  `itemBorderColourHover` — which includes the majority of untouched/default instances,
  since that is the DEFAULT unconfigured state — has its ONLY visible hover colour supplied
  by WordPress's own ambient `theme.json` link-hover style, and that ambient rule has zero
  rescue coverage.** From a visitor's (or Bean's) point of view this looks identical to "the
  parent's hover colour disappears when I move into its dropdown" — because it does — even
  though the underlying code path is completely different from the one FR-41-13 patched.

This means Bean's report is correct and reproduces, but the CAUSE is not "FR-41-13
regressed" — FR-41-13's own patched code path still holds. The cause is a **second, separate,
previously-undiscovered gap**: the rescue mechanism has no coverage at all for the ambient
WordPress theme-level anchor-hover default, which is what the majority of real-world
untouched nav-menu instances (including, most likely, whichever specific items Bean actually
hovered while reviewing) are relying on for their only visible hover feedback.

## 6. Real header ("Primary") nav — checked, does NOT reproduce, but for an unrelated reason

The site's actual production header nav (`aria-label="Primary"`, uid `4ff13fb0`) was also
tested. Its border/colour do **not** change on hover at all (`rgb(58,46,38)` before, during,
and after — completely static). This is because `4ff13fb0` DOES have an explicit per-uid
base rule, `.sgs-nav-menu-4ff13fb0 .sgs-nav-menu__link{color:var(--wp--preset--color--text);}`
— a (0,2,0)-specificity declaration that permanently outranks the ambient (0,0,0)
`:where(a:hover)` rule regardless of hover state, so the ambient rule can never paint through
on this instance at all. In other words: the real header nav doesn't show the "revert" bug,
but only because it currently shows **no hover colour signal whatsoever** on its top-level
items — a different, already-flagged gap (Group D3/"no default hover signal" theme from the
original register). If Bean was specifically testing the live header nav rather than one of
the named scratch fixtures, what he'd have seen there is "no hover colour to lose", not "hover
colour reverting" — worth clarifying with him which page/instance he was actually looking at,
since both are real, live, distinct problems.

## 7. Drawer fork — genuinely untested, blocked by a separate bug (not "confirmed working")

Attempted to open the real production drawer (`#sgs-nav-drawer`, a native `<dialog>`,
`data-sgs-nav-modality="modal"`) via the real header burger, at a 390px mobile viewport, to
test the drawer's own accordion-row hover persistence per FR-41-13's drawer-specific
selector (`.sgs-nav-menu__accordion-row:hover > .sgs-nav-menu__link`).

**Finding:** clicking the burger (both via `page.mouse.click()` at real coordinates and via
`page.click()`) correctly flips `aria-expanded="true"` on the burger and sets the
Interactivity-API context's `isOpen` to `true` (confirmed — this part of the open/close
wiring runs correctly), but the dialog's own native `open` property stays `false` and
`getComputedStyle(dialog).display` stays `"none"` — **the dialog visually never opens**, so
there is nothing to hover inside. Calling `drawer.showModal()` directly via
`page.evaluate()` on the same element, immediately afterward, DOES open it successfully
(`open:true`) — so the dialog itself is not broken; something about the code path from
`toggleDrawer()` → `openDrawerFor()` → `drawer.showModal()`
(`plugins/sgs-blocks/src/shared/nav-interactivity/store.js::openDrawerFor`, the
`if (useModal) { drawer.showModal(); ... }` branch) does not have the same effect when
invoked from within the real click handler as when invoked as a bare script call.

This was NOT root-caused further — it is a genuinely separate, real, newly-discovered issue
(not asked for in this brief, and not chased past the point of blocking this task), and it
means: **no drawer-fork hover reproduction was possible this pass, on either the bar-paired
production drawer or the ad-hoc G7DRAWER scratch fixture** (the latter was already reported
untestable in Wave 1 for a different reason — no working burger pairing at all). This is the
same gap the original G7 gate and the Wave 1 re-check both hit — three consecutive
investigation passes, three different specific blockers, zero successful live drawer-hover
tests to date.

**What this does NOT tell us:** whether Bean's report on the drawer specifically reproduces
or not. It might behave identically to the bar fork (same ambient-rule gap, since the
drawer's own accordion-row rescue selector has the exact same "only covers explicitly-
configured attributes" limitation by design) — or it might not. This needs either (a) a real
device/real-browser manual test, or (b) fixing the automation-only drawer-open blocker first
so headless Playwright can reach it.

## 8. What this means for Wave 2 (not designed here, scoping note only)

The real, confirmed gap is: **FR-41-13's rescue mechanism needs to also cover the case where
an item's hover colour comes from the ambient WordPress theme.json link-hover default rather
than an explicit nav-menu block attribute.** Two shapes worth weighing later (not decided
here): (a) nav-menu-css.php could detect the "no explicit hover colour configured" case and
emit its OWN explicit rescue-target rule sourced from the same
`--wp--preset--color--primary-dark` token the ambient rule uses, so there is always something
concrete for the existing `:hover`/`:has()` wrapper selectors to rescue; or (b) a parallel
ancestor-scoped selector could be added purely for the ambient case
(`.sgs-nav-menu__submenu-root:hover a.sgs-nav-menu__link{color:var(--wp--preset--color--primary-dark)}`).
Both are hypotheses, not specs (per CLAUDE.md R-31-7) — needs its own design pass.

## Files referenced (reads only, no product code changed)

- `plugins/sgs-blocks/includes/nav-menu-css.php` — FR-41-13 rescue block, `$item_hover_decls`,
  confirmed scoped only to explicitly-configured attributes; no awareness of ambient
  theme.json link-hover styles.
- `plugins/sgs-blocks/src/shared/nav-interactivity/store.js::openDrawerFor`,
  `::toggleDrawer` — drawer open/close action chain; the `drawer.showModal()` call site that
  behaves differently under simulated-click vs direct-script invocation.
- Live aggregated CSS: `wp-content/uploads/sgs-css/sgs-3537-233a2f9d57322469a2bf01d5c84c08c4.css`
  (step23 page) — confirmed absence of any per-uid rescue/colour rule for G19b/c/d, G20SET/UNSET.
- `.claude/verify/nav-review-wave1-cluster2-hierarchy.md` — prior pass, re-confirmed its
  G7BAR/highlight-pill findings still hold; explains the coverage gap that caused it to miss
  this.
- `.claude/verify/spec-41-gates-interaction.md` G7 section — original bug + stepped-mouse-move
  method reused here.

## Scratch artefacts

No new scratch fixtures added — the existing named fixtures (G14 Submenu Neg on 3488;
G19b/c/d, G20SET/UNSET on 3487) were sufficient to reproduce and diagnose. No temporary
Playwright scripts were left in the repo (all cleaned up from `plugins/sgs-blocks/` after use).
