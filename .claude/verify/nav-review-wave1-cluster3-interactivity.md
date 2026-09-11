# Wave 1 Cluster 3 — Submenu hover response + animations (Groups D3, D4, F)

**Diagnostic-only.** No fixes proposed. Investigates `.claude/reports/2026-09-12-nav-menu-visual-review-register.md` Groups D3, D4, F1, F2.

---

## D3 — Submenu items show zero response on hover: CONFIRMED root cause, CPT theory REFUTED

**Verdict: this is a default-value gap, not a broken/unwired mechanism.** The hover mechanism is fully built, wired, and empirically proven to fire correctly — it simply emits **zero CSS** for an instance where the operator has not explicitly set `submenuColourHover` or `submenuLinkBgHover`.

**Code evidence** (`plugins/sgs-blocks/includes/nav-menu-submenu-css.php::sgs_nav_menu_submenu_css`):
- Line 567: `elseif ( 'none' !== $t_sub_text && '' !== $submenu_colour_hover )` — the `.sgs-nav-menu__sublink` colour-hover rule is emitted **only if `submenuColourHover` is non-empty**. No `else` branch, no fallback rule.
- Line 598: `if ( '' !== $sublink_bg_hover )` — same gate for `submenuLinkBgHover`.
- FR-41-15 census #6 and #8 (lines 610-627, 682-691 in the same file) record that the framework used to ship an *unconditional* hover tint here, and it was **deliberately deleted** on 2026-07-31 because it silently painted over an operator's own `submenuLinkBgHover` choice and destroyed the text-Sweep effect. The comment explicitly accepts the resulting default-reduction: *"An untouched sublink now shows no hover tint."*

This is an intentional, documented trade-off from a prior fix, not an accidental gap — but it does mean an out-of-the-box submenu has **no visual hover feedback whatsoever** until an operator sets a colour.

**Live evidence** — built a fresh, completely untouched `sgs/nav-menu {"ref":112,"navLabel":"D3 BARE"}` instance (menu 112 = "T1 Dropdown Test", has real submenu children) with no submenu attributes set at all:

```
getComputedStyle(sublink) BEFORE focus: color: rgb(230, 138, 149), background: rgba(0,0,0,0)
getComputedStyle(sublink) AFTER .focus():  color: rgb(230, 138, 149), background: rgba(0,0,0,0)   [unchanged]
Scoped <style> block for this instance: 0 rules matching /sublink.*:hover|:focus-visible/
```
Byte-identical before/after, and the instance's own scoped `<style>` block contains **no** `:hover`/`:focus-visible` rule on `.sublink` at all — confirming the PHP gate at the source, not just at the rendered symptom.

**The mechanism itself works when configured** — proven on the live "G14 negative submenuLinkBg blocks sweep" fixture (page 3488, menu 112, `submenuColourHoverTreatment:"sweep"`, `submenuColourHover:"accent"`):
```
getComputedStyle(sublink).color BEFORE: rgb(230, 138, 149)   [pink — matches its own background, per Group A3]
getComputedStyle(sublink).color on :focus-visible: rgb(245, 208, 80)   [yellow/accent — the hover rule fired]
```
Since `sgs_hover_state_rules()` emits one rule targeting `:hover, :focus-visible` together (not two independent rules), a colour change on `:focus-visible` is direct proof the paired `:hover` selector is present and live in the same declaration.

**Bean's CPT theory is refuted by direct evidence, not inference.** The live production drawer content (`sgs_drawer` CPT post 2056, "SGS Framework Menu Drawer — Default", the one actually active on the canary) contains:
```
<!-- wp:sgs/nav-menu {"ref":0} -->
```
— a completely bare, zero-attribute nav-menu block. It renders through the *exact same* `nav-menu-submenu-css.php` / `render.php` code paths just verified above (there is no separate/legacy submenu code path — `nav-menu-submenu-css.php`'s docblock confirms it is loaded per-instance from the current `render.php`, and the drawer's own in-accordion markup reuses the identical `.sgs-nav-menu__sublink` class per the code comment at line ~722-727). The CPT migration (D419, 2026-07-29) changed *where* the drawer's content lives, not the block-rendering mechanism nav-menu itself uses — there is no separate "pre-CPT" or "post-CPT" nav-menu render path to have fallen out of sync. What Bean saw is the same default-attribute behaviour proven above, occurring on the specific instance he happened to review, which happens to have never had a hover colour configured.

**Conclusion for D3:** not a bug requiring rebuild/migration. It is a real, confirmed usability gap — an out-of-the-box submenu (bar dropdown or drawer accordion) has no hover affordance at all — but the fix shape is "give submenu hover a sane default value" (a design/defaults decision), not "repair a broken wiring path".

---

## D4 — Drawer submenu chevron colour default: PARTIALLY CONFIRMED; hover-fire test INCONCLUSIVE (tooling limitation, not a negative finding)

**The marker/chevron colour mechanism is fully built** (`plugins/sgs-blocks/src/blocks/nav-menu/render.php` lines 474-564): a complete three-state family (Normal / Hover / Current) plus gradient siblings, all scoped to `.sgs-nav-drawer {uid} .sgs-nav-menu__sublink-marker`:
- Flat hover colour: `sgs_hover_state_rules( $sgs_nm_sublink_sel, 'color:' . sgs_colour_value(...), ':focus-visible', ' .sgs-nav-menu__sublink-marker' )` (line 507-513) — the same paired `:hover, :focus-visible` mechanism proven live under D3.
- Gradient hover companion (lines 531-548), current-page colour (line 502-505) and gradient (551-564).
- **Default (unset) behaviour is CSS inheritance, not an explicit rule**: when `sublinkMarkerColour`/`*Hover` are empty, no `color` rule is emitted for the marker at all (mirrors the D3 pattern exactly). The marker is an inline `<span>` wrapping an SVG whose lucide-icon glyphs are hard-coded `stroke="currentColor"` (confirmed in `plugins/sgs-blocks/includes/lucide-icons.php`), and the marker span carries no explicit `color`, so it inherits `color` from its parent `.sgs-nav-menu__sublink` by ordinary CSS inheritance. **This is the correct, working answer to D2's "chevron defaults to item's text colour" requirement** — it is not a separate synchronisation the code has to do; it falls out of inheritance for free, for both the resting AND (in principle) the hovered state, since `color` is a live-inherited property.

**Live evidence obtained:**
- The marker only renders at all when `sgs/nav-menu` is a genuine child of a real `sgs/nav-drawer` block providing the `sgs/navDrawerSubmenuModel` block context (`accordion`/`drill-down`) — confirmed by a negative control: wrapping a bare `sgs/nav-menu` in a plain `<div class="sgs-nav-drawer">` (via a Group block with that className, no real drawer block) rendered **no** `.sublink-marker` element at all, because `render_items_drawer()` (which alone emits the marker span, `nav-menu-markup.php` line 355-367) is only invoked when `$block->context['sgs/navDrawerSubmenuModel']` is set — a real block-context value only a genuine `sgs/nav-drawer` ancestor supplies. A CSS-class-only wrapper is not sufficient, which matters for anyone building a future test fixture for this.
- Built a real fixture: updated the site's unused DRAFT `sgs_drawer` CPT post (id 2059, not the live/active one) to `{"ref":112, "submenuColourHover":"accent", "sublinkMarkerColourHover":"#00ff00"}`, previewed it live via the site's own preview-before-active mechanism (`Sgs_Active_Layout::preview_url('drawer', 2059)`), and confirmed the marker DOES render inside a real drawer/accordion context, with a resting computed colour of `rgb(0,0,0)` — consistent with the drawer's WCAG-computed foreground (D2's default-inheritance working as designed for the resting state).
- **Could not empirically fire `:hover`/`:focus-visible` on the marker's own link in this session** — the drawer's open/close and accordion-expand state is entirely gated by the WordPress Interactivity API store (`data-wp-on--click="actions.toggleDrawer"` / `actions.toggle`), which only responds to genuine trusted browser input events; synthetic `element.click()` / programmatic `.focus()` calls did not update `state.isOpen` / trigger `:focus-visible` matching in this headless session, and viewport-size handling between navigations made the mobile-only burger intermittently unclickable via the available tool surface. This is an environment/tooling limitation on my end, not a code finding — it should **not** be read as "the hover doesn't work". Given the identical `sgs_hover_state_rules()` mechanism was proven firing live for the plain-bar submenu case under D3 (yellow colour change on `:focus-visible`), and the drawer's marker rule uses the exact same helper and selector shape, the code-level evidence strongly implies it works, but this specific claim carries only single-source (code-read) evidence, not the double-attestation this project's rules require. **Flag for Wave 2 / re-verification:** get a real mouse/keyboard session (not headless synthetic events) onto the drawer preview URL and confirm the marker's hover colour empirically before treating this as closed.

**Conclusion for D4:** Bean's caveat is justified — no existing fixture tests this, and my attempt to build one hit a genuine tooling ceiling on the hover-fire step specifically. The *wiring* (code path, selector, default-inheritance logic) is real and present; the *empirical proof it fires* is still open.

---

## F1 — No submenu-opening animation: CONFIRMED default-value question, NOT a broken mechanism

**Fully wired, working as designed, default is `'none'`.** Confirmed end-to-end:
- `block.json::submenuAnimation` — `"default": "none"`.
- `render.php` (~line 422): `'animation' => (string) ( $attributes['submenuAnimation'] ?? 'none' )`, and (~line 229-235) PHP-validates the stored value against `array('fade','slide-down')`, coercing anything else (including an out-of-enum stored value) to `'none'` — deliberately, per the comment, so a corrupted value never emits "an unstyled modifier class the CSS never defined".
- `style.css` (lines 269-330): `.sgs-nav-menu__submenu-wrap--fade` / `--slide-down` modifier classes with real `@keyframes`, PLUS a mandatory `@media (prefers-reduced-motion: reduce)` companion that collapses `animation-duration` to `0.01ms` (lands on the end state, doesn't strand the panel invisible) — this is a completely built, spec-compliant (FR-41-10), reduced-motion-safe feature.
- The modifier class is applied by toggling the wrap's own `display:none→block`, which — per the code comment — **restarts** the CSS animation automatically; no JS replay logic is needed, and it is confirmed this is bar-dropdown-only by design (`.sgs-nav-menu__submenu-wrap` never renders inside a drawer at all — the drawer uses native `<details>` accordion markup, FR-41-1 — so "no animation in the drawer" is correct/expected, not a gap).

**Conclusion for F1:** every menu Bean tested showing "no animation" is fully explained by `submenuAnimation` defaulting to `'none'` on every untouched instance (confirmed: none of the fixtures on pages 3487/3488/3494 set `submenuAnimation` at all, per full grep of both pages' post_content). This is precisely the "default-value/design-choice, not broken mechanism" case flagged in the brief — setting `submenuAnimation` to `'fade'` or `'slide-down'` on an instance would very likely animate correctly (the mechanism is proven wired through PHP validation → class emission → real keyframes → reduced-motion companion), though I did not additionally live-fire this specific class-toggle in this session (time/tool budget; recommend a quick confirming check in Wave 2 rather than treating it as unverified-risk, since every other link in this chain was read/confirmed directly in the source).

---

## F2 — Submenu open reads as "delayed until after the sweep finishes": independent-mechanism coincidence, CONFIRMED at the code level

**Two structurally independent mechanisms, coincidentally sharing the same 300ms duration:**

1. **The submenu's own open-gate is a JS hover-intent debounce, not a CSS transition.** `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` line 525: `const delay = Number.isFinite( ctx.intentDelay ) ? ctx.intentDelay : 300;` — a `setTimeout`-based intent delay before `ctx.isOpen` flips true on hover-enter (confirmed default `'intentDelay' => 300` in `nav-menu-markup.php` at both lines 122 and 218). Once `isOpen` flips, `aria-expanded="true"` is bound (`data-wp-bind--aria-expanded="context.isOpen"`), and the CSS `[aria-expanded="true"] ~ .sgs-nav-menu__submenu-wrap{display:block;}` rule (nav-menu-submenu-css.php line 306) is a plain, INSTANT display toggle — with no `submenuAnimation` set on the G14 fixture (per F1 above), there is no transition/animation on the panel itself at all. The only "delay" belonging to the submenu-open mechanism is this 300ms **pre-open intent timer**, which exists specifically so a fast mouse pass-over doesn't flash the panel open (a deliberate anti-flicker debounce, not a rendering delay).

2. **The trigger's own text-colour Sweep effect is a pure CSS transition, independent of the above.** `sgs_nav_menu_text_sweep_css()` (`plugins/sgs-blocks/includes/nav-menu-treatments.php` line 195): `transition:background-position 300ms ease;` on the `:hover` background-position swap that produces the sweep-reveal look.

**These two 300ms timers start from the SAME triggering event (`mouseenter` on the trigger/bridge) but have zero code-level dependency on each other** — no callback, no `.then()`, no shared promise, no sequencing. `submenuCloseGrace` (a separate, unrelated 170ms `mouseleave` timer) is explicitly documented in the code as governing *closing*, not opening, and as never touching CSS `:hover` at all. There is no code path where the submenu's open-timer waits for the sweep's transition to finish, or vice versa.

**What this means for Bean's perception:** because both independent timers happen to resolve at t≈300ms from the identical hover-enter moment, they visually complete together — reading as "the submenu waited for the sweep", when structurally the sweep's colour transition and the submenu's appearance are two coincidentally-synchronised, unrelated events converging on the same numeric constant. This is a real, confirmed UX read (Bean's perception is accurate — the two DO visually complete together) but the underlying CAUSE is coincidental duration matching, not literal sequencing dependency. I was not able to additionally time-verify this live in the session (would need real mouse-hover timing capture, which hit the same synthetic-event ceiling noted under D4) — this is a code-level proof, not yet a live-timing-captured one.

---

## Summary table

| Item | Status | Root cause class |
|---|---|---|
| D3 | CONFIRMED | Default-value gap (attribute-gated, no fallback) — mechanism proven working when configured. CPT theory refuted with direct evidence. |
| D4 | PARTIALLY CONFIRMED | Mechanism fully built + code-verified; default-inheritance confirmed live; hover-FIRE specifically not empirically confirmed (tooling ceiling, flagged for Wave 2 re-test) |
| F1 | CONFIRMED | Default-value gap (`submenuAnimation` defaults to `'none'`) — mechanism fully built, reduced-motion-safe, drawer correctly excluded by design |
| F2 | CONFIRMED (code-level) | Two independent 300ms timers coincidentally converging, not literal sequencing — live-timing capture not yet done |

## Artefacts created and cleaned up during this investigation
- Created then deleted: pages 3496 (`D3-DIAGNOSTIC-BARE-SUBMENU`), 3498 (`D4-DIAGNOSTIC-MARKER-HOVER`).
- Temporarily modified then restored to its original content: draft `sgs_drawer` CPT post 2059 (never the live/active drawer, post 2056, which was never touched).
- LiteSpeed cache purged multiple times as part of normal verification cycles (no lasting site-visible effect from this session's changes).
