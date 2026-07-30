<?php
/**
 * Title: Start from Scratch — Blank Menu Drawer
 * Slug: sgs/drawer-scratch
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Description: An empty slide-out menu panel containing just the navigation menu — the starting point for building a menu drawer from scratch. Add a logo, a call-to-action or contact details alongside the menu; whatever you put in here is what visitors see when they tap the burger button.
 *
 * @package SGS\Theme
 */

?>

<?php
/*
 * W2-a. This pattern is what makes WordPress's NATIVE "Choose a pattern" starter
 * modal fire on a new Menu drawer. The mechanism is entirely core: the modal
 * appears on an EMPTY post, and offers every pattern scoped `Block Types:
 * core/post-content` + `Post Types: sgs_drawer`. That is why the CPT deliberately
 * registers with NO `template` arg — a seed would make the post non-empty and the
 * picker would never appear (FR-37-7, the same decision taken for headers and
 * footers on 2026-07-24).
 *
 * `{"ref":0}` is the LOCATION lookup, not a menu id. A baked id is the D338
 * silent-coercion class: it would point at one site's menu and resolve to nothing
 * on every other install, with no error. Zero is how every existing pattern spells
 * "use whichever menu is assigned to this location" — keep it.
 *
 * The 7 richer starter looks are W2-c, next session. This card is the minimum that
 * makes the picker usable, not the whole set.
 */
?>
<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu {"ref":0} /-->
<!-- /wp:sgs/nav-drawer -->
