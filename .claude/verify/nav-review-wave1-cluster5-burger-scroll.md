# Wave 1 investigation — Groups J, K, L (burger typography, drawer close scroll-jank, burger↔close parity)

**Diagnostic only. No fixes proposed or implemented.** Investigated against
`sandybrown-nightingale-600381.hostingersite.com` live (homepage burger +
`/spec41-step22-qa/` scratch page) and the repo at HEAD (`main`,
`6d10ce314`).

---

## Group J — burger typography defaults are all wrong

**Root cause (single mechanism explains J1, J2 and J3): the burger label has
NO typography wiring anywhere — no CSS rule, no block attribute — so the
browser's User-Agent `<button>` default stylesheet renders it uncontested.**

### Evidence

1. **Schema-level absence.** `plugins/sgs-blocks/src/blocks/nav-menu/block.json`'s
   `burger` element (`properties.burger`, ~line 184) declares only:
   `css:width` → `burgerSize`, `css:height` → `burgerSize`, `css:color` →
   `burgerColour`, `css:color-gradient` → `burgerColourGradient`,
   `css:background-color` → `burgerBg`, `css:background-image` →
   `burgerBgGradient`, plus hover siblings for colour/background. **There is
   no `burgerFontSize`, `burgerFontFamily`, or `burgerTextTransform`
   attribute anywhere in the file** (`grep -n "burger"` on the whole file
   returns every burger-prefixed attribute that exists — none are
   typography).
2. **CSS-level absence.** `sgs_nav_menu_trigger_css()`
   (`plugins/sgs-blocks/includes/nav-menu-trigger-css.php`) — the function
   that builds the burger's entire scoped `<style>` fragment — only emits
   colour, background and size (`width`/`height`/`min-width`/`min-height`)
   declarations. It never touches `font-size`, `font-family`, or
   `text-transform`. `plugins/sgs-blocks/src/blocks/nav-menu/style.css`
   (the block's static structural stylesheet) also contains zero
   `font-family`/`font-size`/`text-transform` declarations anywhere in the
   file (confirmed by grep — no matches).
3. **Live computed-style confirmation** (`/spec41-step22-qa/` scratch page,
   3 burger fixtures on the page, all identical):
   ```
   .sgs-nav-menu__burger-text  → font-size: 13.3333px, font-family: Arial, text-transform: none
   parent <button>             → font-size: 13.3333px, font-family: Arial
   .sgs-nav-menu__link-text (an ordinary nav item) → font-size: 16px, font-family: "Inter, sans-serif"
   <p> / <body>                → font-size: 16px, font-family: "Inter, sans-serif"
   ```
   `13.3333px` / `Arial` is Chrome's literal UA-stylesheet default for an
   unstyled `<button>` element (`font: 400 13.3333px Arial` in Chromium's
   `html.css`) — not an inherited value from any ancestor, not a themed
   fallback. It is smaller than both the theme's base body copy (16px) and
   the nav item link text (16px), confirming **J1**.
4. **Font pair confirmation** — `sites/mamas-munches/theme-snapshot.json`
   declares the canary's real font presets: body = `Inter, sans-serif`
   (`fontFamily`, line 189), heading = `Fraunces, serif` (line 206). Neither
   name appears anywhere near the burger's CSS path. The live-measured
   `Arial` is the browser default winning by default, not a misconfigured
   theme token — confirming **J2**'s described symptom and its cause.
5. **J3** — `text-transform: none` computed live, and no
   `text-transform` declaration exists for `.sgs-nav-menu__burger-text` in
   any stylesheet. Note precisely: the STORED default label is `"Menu"`
   (`block.json::triggerLabel.default`, mixed/sentence case, not literally
   lowercase) — the browser never applies a case transform on its own, so
   whatever case the operator types is what renders verbatim. Bean's
   "renders lowercase" complaint reads correctly as "renders un-transformed
   / not forced to ALL CAPS", which is confirmed: zero `text-transform` rule
   exists to enforce the conventional burger-label uppercase treatment.

**Conclusion: J1, J2, J3 are one root cause, not three.** The `burger`
element's manifest entry in `block.json` and its CSS builder
(`nav-menu-trigger-css.php::sgs_nav_menu_trigger_css`) were built for
colour/background/size only; the FR-41-12 text-mode work
(`sgs_nav_menu_burger_toggle_markup()` in `nav-menu-markup.php`) added the
`.sgs-nav-menu__burger-text` markup span but no typography attribute or CSS
rule was ever added to style it, at any point in the Spec 41 build.

---

## Group K — drawer close scrolls the page (severe UX regression)

**Root cause confirmed by live frame-by-frame measurement + code: the
site's global `scroll-behavior: smooth` (`theme/sgs-theme/assets/css/core-blocks-critical.css::82`,
`html { scroll-behavior: smooth; }`) turns the scroll-lock restore's plain
`window.scrollTo()` call into a ~350ms ANIMATED scroll instead of an instant
one, and `unlockScroll()` never overrides or accounts for it.**

### Evidence — live measurement

Test: scrolled to `y=726` on the live homepage, opened the drawer via the
real burger, then closed it via the real × close button while polling
`window.scrollY` on every `requestAnimationFrame` tick:

```
scroll before open:           726
scroll immediately after open:  0   ← expected (see mechanism below, not a bug)
--- close button clicked ---
t=0   → t=219ms:  y stays at 0        ← drawer's own 0.2s exit animation is
                                          still playing; body is still
                                          visually covered by the drawer, so
                                          this is NOT visible to the user
t=253ms:          y = 0               ← exit animation just finished;
                                          unlockScroll() has just run
t=267ms → t=590ms: y climbs
   0 → 1 → 3 → 8 → 16 → 44 → 68 → 149 → 280 → 344 → 396 → 439 → 475 → 505
   → 531 → 553 → 573 → 590 → 606 → 620 → 632 → 643 → 653 → 662 → 670 → 684
   → 690 → 696 → 701 → 705 → 709 (still rising, trending to 726)
```
This is a textbook CSS ease-out scroll curve over roughly 330-400ms — not an
instant jump — and it happens AFTER the drawer has fully closed (the body is
now the only thing on screen), so the climb from `y=0` up to `y=726` is
exactly what the user sees and describes as "jumps to the top, then
auto-scrolls back down to where I was."

### Evidence — code

1. **The scroll-lock/-restore pair**
   (`plugins/sgs-blocks/src/shared/nav-interactivity/store.js`):
   - `lockScroll()` (~line 137) saves `window.scrollY`, then sets
     `document.body.style.position = 'fixed'; top = -${y}px` — this is why
     `window.scrollY` reads `0` the instant the drawer opens: the body's
     native scroll position genuinely goes to 0, but the negative `top`
     offset visually compensates so nothing appears to move. This half is
     correct and not implicated in the bug.
   - `unlockScroll()` (~line 166) resets `position`/`top`/`left`/`right`/`width`
     to `''`, THEN calls `window.scrollTo( 0, parseInt( stored, 10 ) || 0 )`
     with no `behavior` option — plain native `scrollTo`.
   - The function's own docblock states the two steps run "in the SAME
     synchronous task (avoids the one-frame jump a deferred `scrollTo`
     would cause)" — true for the specific hazard it names (a scrollTo
     deferred to a later microtask/frame), but it does not hold once
     `scroll-behavior: smooth` is active: `scrollTo()` under that CSS rule
     does not resolve synchronously regardless of which task calls it — it
     always kicks off a multi-frame animation. The docblock's stated
     mitigation and the actual live behaviour diverge for this reason.
   - `unlockScroll()` is invoked from the single `close`-event handler
     `onNativeClose` (~line 773), itself registered once per `openDrawerFor()`
     call — so this is the ONE code path responsible for the restore, not a
     duplicate/competing one.
2. **The global CSS driver.** `theme/sgs-theme/assets/css/core-blocks-critical.css`:
   ```css
   /* line 69-78 */
   @media (prefers-reduced-motion: reduce) {
       *, *::before, *::after {
           ...
           scroll-behavior: auto !important;
       }
   }
   /* line 80-84 */
   html {
       scroll-behavior: smooth;
       scroll-padding-top: 5rem;
   }
   ```
   Under ordinary (non-reduced-motion) conditions — the conditions of the
   live test above — `scroll-behavior: smooth` is active on `<html>` and is
   NOT overridden anywhere in the nav-drawer's own CSS or JS. This exact
   hazard ("`window.scrollTo()` is therefore ANIMATED [under this site's
   `scroll-behavior: smooth`], and any read [immediately after] ...") is
   already independently documented multiple times elsewhere in this
   codebase for OTHER features — `reports/visual-diff/timeline-2026-08-30.md:269`,
   several `plugins/sgs-blocks/scripts/motion-qa/probe-*.mjs` scripts, and
   `.claude/reports/2026-07-30-horizontal-panel-travel-and-reduced-motion.md` —
   all of which independently arrived at "force `scroll-behavior: auto` for
   the duration of a scripted/programmatic scroll on this site." The
   nav-drawer's `unlockScroll()` is the one call site in the nav rebuild
   that does this restore and was not built with that established,
   previously-diagnosed site-wide hazard in mind.

**Conclusion: K1 is proven, not inferred.** Two independent evidence
sources agree: (a) the live frame-by-frame `scrollY` trace shows a genuine
~350ms eased climb, not an instant jump, landing exactly where Bean
describes it (drawer closes → page appears at top → animates back down);
(b) the code shows the one plausible cause — `unlockScroll()`'s bare
`window.scrollTo()` colliding with the site's own pre-existing, previously
diagnosed-elsewhere `scroll-behavior: smooth` driver, with no override
applied at this specific call site.

---

## Group L — burger fixes must mirror onto the drawer's close button

**Factual finding: PARTIALLY shared plumbing, not "essentially the same
mechanism" across the board. Colour and icon-resolution ARE genuinely
shared; sizing and (most importantly for this wave) typography are NOT.**

### What IS genuinely shared

1. **Icon glyph resolution — identical call, both sites.** The close
   button's glyph is resolved via
   `sgs_nav_menu_icon_markup( $attributes['closeIcon'] ?? null, [...] )`
   (`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::737`), with an
   explicit code comment confirming intent: *"Resolved through the SAME
   source-aware resolver sgs/icon and sgs/nav-menu's trigger both use --
   never a bespoke lookup, and never a second hand-parsed call to
   `sgs_get_lucide_icon()`."* The burger's icon goes through the same
   function (referenced from `nav-menu-markup.php`'s
   `sgs_nav_menu_burger_toggle_markup()` caller in `render.php`). This is
   one real shared function, not a parallel reimplementation.
2. **Colour mechanism — same helper calls, different files.** Both the
   burger (`nav-menu-trigger-css.php::sgs_nav_menu_trigger_css`) and the
   close button (`nav-drawer/render.php::368-381`) build their colour CSS
   using the identical sequence of shared helpers: `sgs_resolve_text_colour_or_gradient()`
   → `sgs_text_colour_decl()` / `sgs_text_colour_gradient_fallback_rule()`
   for the base colour, and `sgs_hover_state_rules( $sel, 'color:...',
   ':focus-visible' )` for the hover state. The generated CSS shape is
   structurally identical. This is genuinely the same mechanism, just
   inlined at two different call sites rather than factored into one
   shared function both call — so a bug in the SHARED HELPER would fix
   both automatically; a bug in how one call site USES the helper would
   need manual mirroring.

### What is NOT shared

3. **Size / touch-target — burger is attribute-driven, close button is
   hardcoded.** The burger's 44px sizing is driven by the `burgerSize`
   attribute inside `sgs_nav_menu_trigger_css()` (width/height/min-width/
   min-height all computed from the attribute value). The close button has
   **no equivalent `closeSize` attribute at all** — its 44px minimum is a
   static rule in `nav-drawer/style.css::120-138`
   (`.sgs-nav-drawer__close { min-width: 44px; min-height: 44px; ... }`),
   never touched by any PHP-built scoped `<style>`.
4. **Typography — burger has none; close button has a DIFFERENT, also
   hardcoded, treatment.** This is the direct answer to whether a burger
   typography fix "just mirrors" onto the close button: **it does not,
   because the close button already carries its own separate, static
   typography rule that the burger has never had.**
   `plugins/sgs-blocks/src/blocks/nav-drawer/style.css::355-363` (`--close-text-swap`)
   and `::372-380` (`--close-icon-and-text`) both hardcode:
   ```css
   font-size: 14px;
   font-weight: 600;
   text-transform: uppercase;
   letter-spacing: 0.05em;
   ```
   directly in the stylesheet — not attribute-driven, not reading any
   `close*` typography attribute (none exists), and not reading the
   theme's Inter/Fraunces tokens either. So today: the burger renders
   Arial/13.3px/no-transform (pure UA default, confirmed live above) while
   the close button — in its two text-bearing modes — already renders
   14px/600-weight/UPPERCASE (whatever font-family it inherits from its
   ancestor, likely Inter via normal cascade, since it has no explicit
   `font-family` override of its own). These are two distinct, independently
   hardcoded states, not one shared mechanism with two consumers.

**Conclusion for L: a burger colour or icon fix built by editing the shared
helper functions will very likely need NO separate mirroring step for the
close button (same helper, same call shape) — but a burger typography fix
will need an EXPLICIT, separate, manual change to the close button's
`nav-drawer/style.css` hardcoded rules, because the close button is not
reading from an absent mechanism (the way the burger is) — it already has
its own different one.** This is a factual finding about current code
shape, not a recommendation on which shape either surface should end up in.
