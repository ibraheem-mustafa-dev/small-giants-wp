# adaptive-nav `<dialog>` drawer — build design (Task 1)

**Date:** 2026-07-14 · branch `main` · D-ceiling **D336** · Bean-approved direction (rebuild, not port)

## Ground truth (verified this session, not assumed)

| Fact | Source |
|---|---|
| `sgs/adaptive-nav`: layout KIND, `wraps_block=sgs/container`, `parent:["sgs/site-header-row"]`, **`allowedBlocks:["sgs/mega-menu"]`**, 23 declared attrs (48 registered), v0.1.0, `viewScriptModule` | block.json + `/sgs-db` |
| `sgs/mega-menu` is `parent:["sgs/adaptive-nav"]` — reciprocal lock | mega-menu/block.json:20 |
| adaptive-nav renders ONLY `<nav><ul>` (render.php:74-80); appends `$content` into the `<ul>` (render.php:61) | render.php |
| adaptive-nav has **ZERO** coupling to the drawer — no include/call/id/event | full-file read |
| adaptive-nav emits a **global** rule making the separate toggle visible (render.php:219-220); toggle's own reveal rule was deleted (mobile-nav-toggle/style.css:13-20) | both files |
| 3 patterns place the toggle **without** adaptive-nav → burger `display:none` at every viewport → drawer unreachable | header-search-{icon,bar-below,bar-above}.php |
| Drawer today: `popover="manual"` + hand-rolled focus trap + `inert` on `.wp-site-blocks` + imperative re-parent to `<body>` | mobile-nav/view.js:22-36, 50, 70-88, 381-415 |
| **Backdrop-dismiss NOT implemented** on the live popover path (only in the legacy fallback) → FR-S9-5 criterion failing today | mobile-nav/view.js:461-464 |
| `aria-modal="true"` + `role="dialog"` are **static** — present while closed (hides the page from AT permanently) | mobile-nav/render.php:255-258; live DOM |
| Drawer socials read legacy `sgs_social_*`; phone/email read `sgs_phone`/`sgs_email` — NOT Site Info | renderer:933-934, 982, 1020-1032 |
| mobile-nav = 84 attrs, toggle = 9 → **93 attrs pruned** on delete | `/sgs-db` |

## Live baseline — the "nothing lost" reference (captured 2026-07-14)

| | Indus (palestine-lives) | Mama's (sandybrown) |
|---|---|---|
| Drawer bg | teal `rgb(7,106,142)` (= `primary-dark` token) | pink `rgb(197,106,122)` |
| Zones rendered | header · menu · custom-content · trust-zone | same 4 |
| Nav | 7 links, dividers, chevrons on 4 submenus | 5 links |
| Contact | `amir@indusfoodsltd.com` (a **placed business-info block** in InnerBlocks) | — |
| Socials | 4 coloured (LinkedIn/Facebook/Instagram/Google→`--star`, from the **legacy** store) | 1 |
| D323 reachability | **18/18** | **10/10** |
| Scroll lock / bg freeze | ✅ / ✅ | ✅ / ✅ |

> `drawerBg` renders per-client from the `primary-dark` token — the `#075e80` in style.css:39 is only a **fallback literal** (R-31-1 debt). The **picker** is dead (`--sgs-mn-bg`: 0 uses). Correcting my own earlier overstatement.

## THE design decision — one InnerBlocks slot, two destinations

WordPress gives a block **one** InnerBlocks area. adaptive-nav's is already `sgs/mega-menu`. But STOP-NO-ALLOWLIST requires the drawer to accept **any** block, and the baseline proves the drawer holds a placed `business-info` (the Indus email).

**Chosen: route by block name at render time via `$block->inner_blocks`.**

```php
$mega_html = ''; $drawer_inner = '';
foreach ( $block->inner_blocks as $inner ) {
    if ( 'sgs/mega-menu' === $inner->name ) { $mega_html   .= $inner->render(); }
    else                                    { $drawer_inner .= $inner->render(); }
}
```
- `allowedBlocks` **removed** from block.json (STOP-NO-ALLOWLIST); mega-menu stays reachable via its `parent` lock.
- Stops using `$content` (render.php:61) to avoid double-render.
- Non-mega children become the **drawer drop-zone** → this also unblocks `P-DRAWER-MOVABLE-OVERFLOW-DROPZONE` (D326, deferred) and is the fold-target the row-fold research needs.

**Rejected — child slot block (`sgs/nav-drawer`)**: cleaner editor (mirrors `site-header`/`site-header-row`), but a new block + registration + DB seed, and re-introduces a placeable part. Revisit if the editor list proves confusing (Task 3 will tell us).

## The drawer

**Primitive: native `<dialog>` + `showModal()`.** Free: focus trap, ESC, `::backdrop`, top-layer, background inert, focus restore. **Kills D323 by construction** — *"Modal `<dialog>`s generated with `showModal()` escape inertness… No other element can"* (MDN). No re-parent hack, no `inert` authoring, no `.wp-site-blocks` coupling. Top-layer promotion also means it renders correctly from inside the header part (no clipping).

**Markup (adaptive-nav render.php):**
```
<nav class="sgs-adaptive-nav__nav" aria-label="{navigationLabel}">   ← unchanged desktop bar
  <ul class="sgs-adaptive-nav__list"> … mega panels … </ul>
</nav>
<button class="sgs-adaptive-nav__toggle" aria-expanded="false"        ← OWN burger (replaces the separate block)
        aria-controls="{uid}-drawer" aria-label="{menuButtonLabel}">
<dialog id="{uid}-drawer" class="sgs-adaptive-nav__drawer">
  <div  class="sgs-adaptive-nav__drawer-head">   logo + close (44px)
  <ul   class="sgs-adaptive-nav__drawer-menu">   SAME SGS_Nav_Menu_Source → accordion submenus
  <div  class="sgs-adaptive-nav__drawer-content">{$drawer_inner}</div>   ← InnerBlocks, no allowlist
  <ul   class="sgs-adaptive-nav__drawer-socials"> from Site Info ONLY (Task 2)
</dialog>
```

**Hand-write (`showModal()` does NOT give these):**
- backdrop click-to-close (**new** — fixes the failing FR-S9-5 criterion)
- scroll lock: fixed-body + `scrollY` save/restore + `overscroll-behavior:contain` (iOS Safari ignores `overflow:hidden` on body)
- `closedby="any"` as progressive enhancement only — **no Safari support**

**ARIA:** no static `aria-modal`/`role` — `showModal()` confers modality. Toggle `aria-expanded` flips on open/close. (Fixes the always-on `aria-modal` that hides the page from AT today.)

**Focus on open:** into the dialog (`showModal()` default) — correct for a *modal*. The WP a11y team's "don't move focus" ruling covers non-modal disclosures, so no conflict with FR-S9-5.

**Motion:** 250ms decelerate in / 200ms accelerate out; `prefers-reduced-motion` → instant. Not client-configurable. Use `@starting-style` + `transition-behavior:allow-discrete` (never `display:none`→`flex`, which cannot transition — core's mistake).

**No swipe** (NN/g: undiscoverable; conflicts with VoiceOver/TalkBack).

## Business data — Task 2 folds in

Drawer socials/phone/email read **`sgs_site_info` only**, via `use SGS\Blocks\Sgs_Site_Info;` (the missing `use` is what took both sites down today — D336). Legacy `sgs_social_*` / `sgs_phone` / `sgs_email` reads die with mobile-nav. Empty → renders nothing.

## Collapse tier (unchanged contract, internalised)

`collapseTier` (mobile/tablet/desktop/custom) stays. The emitted rules now target adaptive-nav's **own** toggle (scoped to `$root_sel`), NOT a foreign global `.sgs-site-header .sgs-mobile-nav-toggle` selector. Removes the cross-block reach-in AND fixes the 3 broken search patterns by construction.

## Build order

1. block.json — drop `allowedBlocks`; add drawer attrs (`menuButtonLabel`, `drawerLabel`, `showDrawerSocials`, `drawerSide`); **no version bump** (D293)
2. `class-sgs-adaptive-nav-renderer.php` — add drawer-menu + socials-from-Site-Info renderers
3. render.php — toggle + `<dialog>` + inner-block routing + scoped collapse rules
4. view.js — showModal/close, backdrop, scroll lock, aria-expanded, accordion
5. style.css — drawer visuals reproducing the baseline exactly (token-driven, no client literal)
6. edit.js — inspector + drawer InnerBlocks
7. header.html + framework-header-default.php — swap; **byte-identical** (§S1)
8. 3 search patterns — swap toggle→adaptive-nav
9. Delete mobile-nav + mobile-nav-toggle (+ patterns + inserter-scope + renderer)
10. `/sgs-update` reseed (93 attrs pruned)
11. Live-verify BOTH clients

## qc-council verdict (2026-07-14, 2 cross-model raters): **GO-WITH-FIXES**

Both raters independently returned GO-WITH-FIXES. Must-fixes below are BINDING on the build.

### Fact-checked before accepting (council findings are hypotheses — R-31-7)

| Council claim | Verified? | Result |
|---|---|---|
| **Live site may render from a DB `wp_template_part`, making the file swap a silent no-op + block-deleted placeholders on 2 live clients** | **CHECKED both sites** | **FALSE here — safe.** Neither site has a part named `header` → `get_header_content()` falls through to the FILE. Mama's has **zero** parts; Indus has 3 (`header-sticky`/`-transparent`/`-shrink`, IDs 198-200) — all contain **zero `sgs/*` blocks** (verified), i.e. genuinely inert D330 leftovers. **The file swap WILL take effect. No Site-Editor DB migration needed.** |
| `save.js` needs `<InnerBlocks.Content />` | Verified | **Already correct** — adaptive-nav/save.js already does exactly this. No action. |
| adaptive-nav uid = `md5($attributes)` (my design doc said so) | Verified | **My doc was WRONG.** adaptive-nav's own uid is `wp_unique_id('sgs-anav-')` (render.php:46) — a per-request counter. The md5+STOP-NO-KSORT scheme lives inside `SGS_Container_Wrapper`. New attrs change the wrapper's internal hash; self-consistent for a dynamic block → non-breaking. (Latent: adaptive-nav was NOT in D334's uid-determinism fix.) |

### Verified blast radius (grep, not assumed)

**Theme (9):** `parts/header.html` · `patterns/framework-header-default.php` · `patterns/header-search-{icon,bar-below,bar-above}.php` · `assets/css/core-blocks.css` · `assets/css/woocommerce.css` · `functions.php` · `README.md`
**Plugin:** `src/blocks/mobile-nav/` · `src/blocks/mobile-nav-toggle/` · `includes/class-mobile-nav-renderer.php` · `includes/mobile-nav-patterns.php` · `includes/mobile-nav-inserter-scope.php` · `includes/class-sgs-blocks.php:51` (require) · `src/blocks/site-header/edit.js:66` (TEMPLATE) · `src/blocks/site-header-row/block.json:52` (allowedBlocks) · conformance fixtures `sgs-mobile-nav.html`/`.golden.json`/`SKIPPED.md:27` · `tests/golden/static-block-snapshots/mobile-nav.json`+`_manifest.json`

### MUST-FIX (binding)

**A11y / platform (rater 1):**
1. **`drawerLabel` → `aria-label` on the `<dialog>`** — the markup sketch left it unlabelled (WCAG 4.1.2).
2. **Set `autofocus` explicitly** on the intended first-focus target. `showModal()`'s default is "first `[autofocus]` descendant, else the dialog itself" — **NOT** "first focusable". With `allowedBlocks` removed, any dropped block carrying `autofocus` would silently steal focus.
3. **Guard the `transform` landmine.** `assets/css/header-behaviours.css:129-136` (`hide-on-scroll-down`, dormant) applies `transform:translateY(-100%)` + `will-change:transform` to an adaptive-nav ANCESTOR. **Top-layer escapes clipping but NOT an ancestor's transform containing-block** — that would trap the dialog and defeat the by-construction claim. Add a documented constraint/gate; never let transform/filter/contain/will-change land on an adaptive-nav ancestor.
4. **`aria-current`** — FR-S9-5:774 literally requires it. Recommend **amending the spec** instead (it's semantically wrong for a toggle; `aria-expanded` + class IS the APG disclosure pattern). Bean's call.
5. **`transition-property` must include `overlay`** (not just `display`), both `allow-discrete`, or the close transition is cut short.
6. **Amend FR-S9-5:767** ("drawer is a direct child of `<body>` at open time") → intent-based (elementFromPoint reachability + inert-escape). As literally worded, this design FAILS its own spec despite satisfying the intent by a better mechanism.

**WP / blast radius (rater 2):**
7. **`site-header/edit.js:66` — remove `['sgs/mobile-nav-toggle', {}]` from TEMPLATE in the SAME commit as the deletion.** Day-1 break: every fresh `sgs/site-header` insert would instantiate a deleted block.
8. `site-header-row/block.json:52` — drop `"sgs/mobile-nav-toggle"` from `allowedBlocks`.
9. `class-sgs-blocks.php:51` — remove the `require_once` for `mobile-nav-inserter-scope.php` **atomically** with deleting the file (else fatal on plugin load).
10. **The 3 search patterns are a mini header-restructure, not a toggle swap** — they use `core/navigation` + a standalone toggle inside a flat `core/group` (no `site-header-row`). Swapping them to `sgs/adaptive-nav` **also closes a second WooCommerce Block-Hooks injection leak** (WC anchors to `core/navigation`, D324).
11. Remove/re-baseline the conformance + static-snapshot fixtures for mobile-nav.
12. Live-check `sgsHideOnMobile/Tablet` still resolves on adaptive-nav (D331 leading-`<style>` first-tag bug class is already latent here).

**Should-fix:** park the child-slot-block editor decision with a concrete revisit trigger (Task 3); confirm the FR-S9-6 uid golden doesn't snapshot a literal wrapper hash; add canary-first + "revert if D323 count drops below baseline (18/18 Indus, 10/10 Mama's)" to Verify; add a **VoiceOver+Safari** pass (axe-core cannot catch modality bugs).

## Gates

`check-dead-controls.js` (every attr must render) · `check-control-ux.js` (no responsive family without a switcher — single enums only) · `audit-inline-styling.js` (zero inline; scoped `<style>` only) · uid = `md5($attributes)`, **no ksort** · STOP-67 visual-diff report · deploy via the D336-hardened `build-deploy.py` (canary first).

## Verify (live, both clients, after full cache clear + CDN)

`elementFromPoint` on every drawer control returns itself (the exact D323 test — baseline 18/18 Indus, 10/10 Mama's) · Tab cycles inside · ESC closes + focus returns to the burger · **backdrop click closes (NEW)** · scroll locked + restored · background inert · axe-core 0 violations open-drawer · 44px targets · `aria-modal` absent while closed · visual match vs the captured baselines · the 3 search patterns' burger now visible.
