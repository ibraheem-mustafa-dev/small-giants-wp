# Investigation: nav-menu hover-colour full-page vs isolated `do_blocks()` mismatch

**Date:** 2026-09-13
**Trigger:** an aside from another agent during M2 (chevron-hover propagation) verification — not a confirmed repro, flagged for follow-up only.
**Method:** systematic-debugging (Iron Law — no fix without proven cause). Investigation only, no code changes.

## Claim under test

"The resolved hover colour on a genuine front-end render doesn't match the explicit `itemColourHover` attribute value (falls back to the 'accent' default) even though isolated `do_blocks()`/`render_block()` calls on identical content resolve correctly."

## Step 1 — Reproduction attempt

Checked the only live canary (sandybrown-nightingale-600381.hostingersite.com) for a real instance to test against:

- `wp post list --post_type=wp_template_part` → exactly one template part, `Header` (post 2671).
- `wp post get 2671 --field=post_content` → exactly **one** `wp:sgs/nav-menu` block on the whole site:
  `wp:sgs/nav-menu {"gap":"28px","itemColour":"text"}`
- `itemColourHover` is **absent** from this instance's stored attrs (i.e. it is running on the FR-41-36 default path, `'accent'`, per `nav-menu-css.php::sgs_nav_menu_item_state_css()` lines 269-283 — see below), not an explicit non-default value.
- No second `sgs/nav-menu` instance (drawer/footer) exists as a separately-stored block on this site — the "page has two instances" scenario the render.php docblock warns about (`function_exists()` guard comment, `render.php` top-of-file) is a real *possible* page shape but is **not the current canary's shape**.

**Result: NOT REPRODUCED.** There is currently no live instance on the canary with an explicit, non-default `itemColourHover` to test a genuine front-end render against an isolated `do_blocks()` call. Per the brief's own instruction ("if you can't reproduce the discrepancy at all, say so clearly"), this is reported as unconfirmed rather than assumed real. Editing live content to manufacture a repro was out of scope for a read-only investigation and was not done.

## Step 2 — Static/mechanism trace (code-level, since live repro wasn't available)

Traced every candidate path-dependent mechanism named in the brief:

**(a) Hooks/filters fired before resolution — none found that touch colour resolution.**
`sgs_nav_menu_resolved_treatments()` (`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_menu_resolved_treatments`) is a pure function: it reads `$attributes` (merged with `WP_Block_Type_Registry::get_instance()->get_registered('sgs/nav-menu')->attributes[...]['default']` for anything absent), evaluates `sgs_nav_menu_sweep_eligible()`, and returns a plain array. No filter/hook fires between "attribute arrives" and "treatment resolved" in either render path — this function is called directly from `render.php` line 809, not hooked.

**(b) Repeated-instance state leak — no `static` state exists anywhere in the colour path.**
Grepped every `static $var` / persistent state across `render.php`, `nav-menu-css.php`, `nav-menu-markup.php`, `nav-menu-treatments.php`, `nav-menu-submenu-css.php`, `nav-menu-trigger-css.php`. Found only:
- Two `static function(...)` closures in `nav-menu-css.php` (`$sgs_nm_hex`, `$smart_fg`, lines 180/291) — these are `static` in the OOP-binding sense (no `$this`), re-created fresh on every call, not persistent state.
- `sgs_css_is_writable()` in `class-sgs-css-registry.php` (line 322-330) caches a boolean (`$writable`) across the request — this governs whether the consolidated-CSS *file* write is attempted, entirely unrelated to which colour value is computed.
- No `static` variable anywhere caches a resolved colour, a resolved treatment, or an attribute value across block instances.

The `class-sgs-css-registry.php` collector (`sgs_lift_block_css` / `sgs_collect_css`) dedupes by `md5()` of the **finished CSS string**, and since every rule is scoped to `.{uid}` (a per-instance selector), two instances with different attributes produce different CSS strings and different hash keys — this collector cannot make one instance's resolved colour leak into another's.

**(c) Object cache / transients — none exist in this path.**
No `wp_cache_get/set`, `get_transient/set_transient`, or `wp_options` read specific to per-item resolved treatments/colours anywhere in `nav-menu-treatments.php` or `nav-menu-css.php`. The only options read in the whole nav-menu CSS chain are the CSS-output-mode/epoch options in `class-sgs-css-registry.php`, which govern *where* the consolidated CSS is placed (file vs inline `<style>`), not its *content*.

**(d) Attribute-resolution order / wrong source — checked, found no divergence.**
`itemColourHover`'s schema (`block.json` line 447-450) is `{"type":"string","default":""}` — a plain string with no `enum`, so it is not subject to the documented `blockjson-enum-coerces-invalid-to-default` WP-core gotcha (that fires only for `enum`-typed or object-typed attributes; this project's own memory file records exactly that class of bug elsewhere, but it requires an `enum` or object schema, which this attribute does not have). `WP_Block`'s attribute-default-fill runs identically whether the block is instantiated via a full-page `parse_blocks()` → `render_block()` walk or via a script calling `do_blocks()`/`render_block()` directly — both paths go through the same `WP_Block` constructor and the same registered `WP_Block_Type_Registry` entry, which is populated once at `init` regardless of which entry point triggered `init`.

## What WOULD produce "explicit value looks discarded" (a live-verifiable alternative, not yet ruled in or out)

Not path-dependent, but worth naming since it is the one mechanism in this exact file that legitimately **overrides** an explicit `itemColourHover` with a different value under specific conditions, and could be mistaken for "falls back to accent":

`nav-menu-css.php::sgs_nav_menu_item_state_css()` lines 285-302 — when `itemSmartContrast` is true (the default: `! isset(...) || true`), `$item_colour_hover` is **overwritten** by `$smart_fg($item_bg_hover_hex, $item_colour_hover)`, which runs `sgs_wcag_preferred_text_colour_for_bg()` and can discard the operator's explicit colour in favour of a WCAG-safe binary (black/white) if it fails AA against the resolved hover background. This fires **identically** on both a full front-end render and an isolated `do_blocks()` call (it depends only on `$attributes`, not render context), so it does NOT explain a full-page-vs-isolated divergence — but it IS a real, code-proven case where an explicitly-set `itemColourHover` renders as something other than what was typed, which may be what was actually observed and mis-described as "falls back to accent."

## Conclusion

- **Reproduced:** No — no qualifying live instance exists on the canary to test.
- **Proven mechanism for a full-page-vs-isolated-render divergence:** None found. Every candidate (hook/filter ordering, static/global state, repeated-instance leakage, object cache/transients, attribute-resolution/coercion order) was traced and ruled out at the code level for this specific attribute and this specific function chain.
- **Recommendation:** Treat the original aside as unconfirmed. If it recurs, capture the exact page URL + exact stored `itemColourHover` value + a screenshot of the live computed CSS at the time it's seen, before further investigation — a live repro is required to make further tracing productive, per the "prove the cause" rule.

## Citations

- `plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_menu_resolved_treatments`
- `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_menu_item_state_css` (FR-41-36 default, lines 269-283; smart-contrast override, lines 285-302)
- `plugins/sgs-blocks/includes/class-sgs-css-registry.php::sgs_collect_css` / `sgs_lift_block_css`
- `plugins/sgs-blocks/src/blocks/nav-menu/render.php` (top-of-file `function_exists()` guard comment re: two instances per page; line 809 `sgs_nav_menu_resolved_treatments()` call site)
- `plugins/sgs-blocks/src/blocks/nav-menu/block.json::itemColourHover` (schema: plain string, no enum)
- Live evidence: `wp post get 2671 --field=post_content` on sandybrown-nightingale-600381.hostingersite.com, 2026-09-13
