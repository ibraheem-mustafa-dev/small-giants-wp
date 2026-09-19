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
 * Offered for `sgs_drawer` posts (`Block Types: core/post-content` + `Post Types:
 * sgs_drawer`).
 *
 * `{"ref":0}` is the LOCATION lookup, not a menu id: a baked id would point at one
 * site's menu and resolve to nothing on every other install, with no error. Zero
 * means "use whichever menu is assigned to this location" — keep it.
 */
?>
<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-drawer-menu {"ref":0} /-->
<!-- /wp:sgs/nav-drawer -->
