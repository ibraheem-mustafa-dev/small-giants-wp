<?php
/**
 * Title: Solid brand panel
 * Slug: sgs/drawer-solid-brand-light
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: A full-screen brand-coloured panel, a right-weighted uppercase link list, and a footer row of copyright + social links. Reference: a real-site solid-brand-fill drawer.
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
<!-- wp:sgs/nav-drawer {"drawerBg":"primary","drawerAlign":"right","closeStyle":{"desktop":"separate-x"}} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":{"desktop":"4px"},"itemFontWeight":"100"} /-->
<!-- wp:sgs/social-icons {"source":"site-info"} /-->
<!-- wp:sgs/business-info {"displayType":"copyright"} /-->
<!-- /wp:sgs/nav-drawer -->
