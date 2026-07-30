---
doc_type: session
project: small-giants-wp
date: 2026-07-30
track: merged Spec 36+37 nav/header/footer
outcome: Wave 1 CLOSED — all six units live-verified; three defects found and fixed
---

# Session 2026-07-30 — merged 36+37 track, Wave 1 (fixture & verification wave)

Executes `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Wave 1 closed in one
session against a plan estimate of 3.75h LOW.

## What Wave 1 actually found

The plan's own first action was already stale: it said "open canary mega panel 1745 and confirm it
is still EMPTY". It was **populated** (1,402 chars, 2 link groups + featured aside) and the whole
Gate-3 fixture already existed as page 1842. Nothing to build; the wave was pure verification.

### W1-a — composed-nav fixture (PASS, 10/10 + 6/6)

Live on page 1842 at 1440px: mega opens by hover (after the 300ms intent delay), by click/tap, and
by keyboard (Enter); closes on mouse-leave (170ms grace) and on Escape, with focus returned to the
trigger; Tab enters the panel. Drawer on the same page still opens at 390px with 13 focusables —
no regression.

**The recursion test was not testable with the existing fixture** — panel 1745 contains no
nav-menu, so no cycle exists. Built a dedicated one (new posts only; 1842 untouched): menu 110 →
panel 2040 → `sgs/nav-menu{ref:110}`. Renders HTTP 200, no PHP fatal, no JS errors, ONE mega
trigger, panel nesting depth 0, and the inner occurrence degrades to a plain `<a>` (FR-36-9a).
The guard in `includes/helpers-mega-render.php:55-85` (static `$sgs_mega_rendering` +
`SGS_MEGA_MAX_DEPTH`) holds under a real cycle.

### W1-b — mega motion (PASS; clears D396's "NOT live-verified")

D396 recorded the motion as unverified *because panel 1745 was empty*. With it populated:

- **Stagger fires.** Per-child `--sgs-stagger-delay` = `0ms / 28ms / 56ms` (exactly
  `min(i*28, 320)`), opacity 0 after one frame → `[0.80, 0.72, 0.61]` mid-flight → `[1,1,1]`.
  Negative control: no panel lacking `data-stagger` has delays written.
- **Indicator.** `transition-property: transform, width, opacity` — the D396 fix (animate width,
  not `scaleX` on a 1px radius box) held. `position:absolute; pointer-events:none` confirms it is
  out of flow, which is why animating width is safe. Tracks hover (x 0→170, w 68.8→83.9) AND
  keyboard focus.
- **Reduced motion** shows content instantly, no hidden flash.
- **2 new variants + dark scheme** verified on new page 2050 (panels 2044/2046/2048 built from the
  shipped patterns, so the fixture proves the STARTER, not a hand-written approximation). Dark
  paints `rgb(20,20,25)` with `rgb(243,242,238)` text vs the light cream — genuinely dark, not just
  an attribute.

### W1-c/d/e/f

- **Cart:** 3 displayModes render and are structurally distinct (link: 1 link / flyout: +panel /
  drawer: +`<dialog>`). Store API add-item works (201).
- **Search:** 3 modes render, each with a no-JS fallback form carrying `post_type=product`, all
  with `role=combobox`. REST returns `{results:[{id,title,permalink,thumbnail}]}` — **the
  price-absence finding is now confirmed from live returned data**, not just source reading.
  Note `q` is required and 1-char queries are rejected by design (400).
- **Social:** manual icons render with accessible names ("Follow us on Facebook"), 44px targets;
  `colourMode` theme `rgb(107,92,80)` vs brand `rgb(24,119,242)`; `source=site-info` pulls the one
  configured network. Empty `icons` → renders nothing (`render.php:84` early return) — correct
  fail-empty, my first fixture was simply under-specified.
- **Business-info:** 7 of 8 types produce content; `hours` emits nothing on the frontend when
  opening hours are unset (`render.php:195` — editor shows a placeholder instead). By design.
- **Starter picker (FR-37-7 arm): DONE.** Fires on a new `sgs_mega_menu` post with all 5 mega
  patterns listed.

## Three defects found and fixed

1. **`7e11e60c` — the axe harness could never test the mega at all.** After clicking the trigger it
   parks the pointer at (2,2) to avoid a phantom `:hover` reading — correct for a `<dialog>`, fatal
   for a hover-bridge panel, whose leave-bridge + 170ms grace closes it before axe runs. Every mega
   run therefore ended VACUOUS, and the guard was right. Added `--open-via keyboard`. Proven, not
   inferred: click-then-hold leaves it open 1120x499 / 7 focusables; click-then-move closes it.
2. **`72004a5e` (+ honest visual-diff report `ced233a2`) — `sgs/card-grid` dropped bare-URL media.**
   `block.json` declares `items[].media` as `{"type":"string"}`, both mega starter patterns follow
   that, and `sgs_render_media()` returns `''` for a non-array (`helpers-media.php:168`) — leaving
   an empty `.sgs-card-grid__image-wrap`. 8 images lost across the two shipped patterns; the editor
   writes the OBJECT form, which is why it survived every gate. Fixed at the point of use so the
   documented shape works for patterns AND any future converter/clone emitter. 0→4 and 1→5 after.
3. **`e2d4f101` — LiteSpeed served personalised REST from cache.** See below; the largest finding.

## The cache finding (largest)

`GET /wp-json/wc/store/v1/cart` was a LiteSpeed cache HIT returning a stale empty cart, so
`sgs/cart`'s badge was pinned at 0 in every mode. **A second, worse instance:**
`/sgs/v1/product-search` was also cached (req 1 miss, req 2+ HIT) — bypassing its per-IP rate limit
and fail-closed draft-product visibility filter, because a cached response never wakes PHP.

**Cause proven by discriminator, not inference.** Two candidates existed (stale cache vs. the guest
session not persisting). In ONE session, an instant after `add-item` returned `201 items_count:3`:
`/cart` (HIT) said `items_count 0`; `/cart/items` (MISS) said 1 item, qty 3, "Mamas Munches
Zookies". Session healthy, cached read blind.

**Mechanism** (via `/research-check`, 2 Sonnet agents, converged): LSCWP emits its own
`X-Litespeed-Cache-Control`, which per LiteSpeed's developer docs OVERRIDES the standard
`Cache-Control` when both are present. Both endpoints already sent a correct `no-store`. WP's
`nocache_headers()` does not help — WooCommerce already merges those into Store API responses.
LSCWP *does* honour `DONOTCACHEPAGE`, but WooCommerce never defines it on REST — the documented
gap, per LiteSpeed staff on the "WC Store API cart is cached" wordpress.org thread. LSCWP's Woo
integration auto-excludes the cart/checkout/my-account **pages**, not the Store API **routes**.

**Fixed in code, not site config** (`includes/class-litespeed-compat.php`): `rest_pre_dispatch`
fires `do_action('litespeed_control_set_nocache')` — LSCWP's documented API, a silent no-op off
LiteSpeed — plus `DONOTCACHEPAGE`, for the `/wc/store` and `/sgs/v1` prefixes. The per-site "Do Not
Cache URI" entry is what LiteSpeed support recommends and it *did* work, but it does not travel
with the plugin: every new client site would silently ship a broken badge and an unguarded search
endpoint. Rejected: disabling `cache-rest` globally (per-site again; community reports show it did
not fix the staleness anyway) and ESI (needs Enterprise/QUIC.cloud, unsupported on OpenLiteSpeed).

**Negative-controlled:** site `cache-exc` was EMPTIED before the final measurement, so only the code
could be responsible. Both prefixes then reported `no-cache` across 3 consecutive requests while the
homepage still cached `miss → hit → hit`. With the panel entry, the badge was also observed tracking
`0 → 2 → 0` across all three displayModes.

## My own errors this session — recorded so none is inherited

Five times a probe or a claim of mine was wrong before the code was:

1. **Stagger "dead"** — I read the wrong node (`initStagger` targets
   `:scope > .sgs-mega-panel__content > *`, I read the content wrapper's own children → 1 node).
2. **Stagger delays "(unset)"** — I sampled synchronously after `.click()`, before the
   MutationObserver microtask ran.
3. **Indicator "doesn't track"** — I dispatched non-bubbling `mouseenter`; `nav-indicator.js`
   delegates `mouseover`/`focusin` on the bar.
4. **Dark scheme "doesn't paint dark"** — my luminance parser read `color(srgb 0-1)` floats as
   0–255, scoring a near-white cream as luminance 0.00.
5. **"A purge does not clear the cache"** — FALSE. The purge works; my test loaded the fixture page
   first and the cart block's own on-load fetch re-filled the cache before my probe ran.

Also corrected: I initially called the cross-visitor cart leak "not demonstrated / theoretical". It
is **understated** — the mechanism is documented to have caused real leaks behind other shared
caches (`woocommerce/woocommerce` #30329, #26359). Not reproduced on our stack, but more than
theoretical.

**Operational damage + recovery:** `git worktree remove --force` recursed through a `node_modules`
junction and emptied the real shared directory (962 packages → 0). `npm ci` restored it in 50s; no
repo file was at risk. Teardown order is now: unlink the junction FIRST, then remove the worktree.
Captured as `feedback_unlink_junction_before_removing_a_worktree`.

## Bean decisions taken this session

- **`P-MAMAS-PRIMARY-CONTRAST` ACCEPTED** — "the content is still distinguishable with those colours
  even though they fail WCAG". The 6 axe violations the newly-working harness surfaced on the
  Gate-3 mega are knowingly accepted. Report and cite the ruling; never suppress them in the
  harness. Entry moved OPEN → DEFERRED.
- **Clone roster = 10, or 11 if resn's FX prove reachable** with Tier V + the full GSAP set being
  built. Conditional — assess during W4-a's teardown, do not decide early.
- **"Fix their seeder myself"** — became unnecessary: the motion track shipped `4596f36f` at 00:06
  while I was investigating, adding both `fx_effects` rows to the seeder. Writing my own would have
  collided with theirs.

## Canary fixtures created (do not assume clean)

Pages 2042 (recursion), 2050 (variants + dark), 2051 (cart), 2052 (B2 set), 2053 (social).
Menus 110, 111. Mega panels 2040, 2044, 2046, 2048.

## Commits

`7e11e60c` axe `--open-via keyboard` · `72004a5e` card-grid media string shape · `ced233a2` honest
visual-diff report + Bean's contrast ruling · `46297bb2` cache entry filed · `e2d4f101` LiteSpeed
compat · `19cda733` cache entry archived as RESOLVED.
