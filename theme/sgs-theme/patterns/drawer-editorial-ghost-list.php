<?php
/**
 * Title: Editorial ghost list
 * Slug: sgs/drawer-editorial-ghost-list
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: A full-screen panel over the dimmed page, a plain left-aligned link list and a row of the business social links, read from Business Details. Reference: a real-site full-viewport editorial drawer.
 *
 * @package SGS\Theme
 */

?>

<?php
/*
 * A starting look for `sgs_drawer` posts: the drawer geometry and panel treatment
 * are block attributes, so every value stays editable in the inspector.
 *
 * `{"ref":0}` is the LOCATION lookup, not a menu id: a baked id would point at one
 * site's menu and resolve to nothing on every other install, with no error. Zero
 * means "use whichever menu is assigned to this location" — keep it.
 */
?>
<!-- wp:sgs/nav-drawer {"surfaceOpacity":0.55,"closeStyle":"separate-x","drawerAlign":"left"} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":"4px","itemFontSize":{"desktop":45,"mobile":32},"itemFontWeight":"200"} /-->
<!-- wp:sgs/social-icons {"source":"site-info"} /-->
<!-- /wp:sgs/nav-drawer -->
