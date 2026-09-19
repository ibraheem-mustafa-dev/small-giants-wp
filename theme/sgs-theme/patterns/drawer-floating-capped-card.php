<?php
/**
 * Title: Floating capped card
 * Slug: sgs/drawer-floating-capped-card
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: A small blurred card pinned near the trigger, capped at a comfortable reading width, with the menu and the business phone number beneath it. Not a full-viewport panel. Reference: a real-site corner-panel drawer.
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
<!-- wp:sgs/nav-drawer {"anchor":{"desktop":"trigger"},"panelSize":{"desktop":"438px"},"surfaceOpacity":0.85,"surfaceBlur":"4px","closeStyle":"text-swap","drawerAlign":"left","drawerBg":"surface"} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":"4px"} /-->
<!-- wp:sgs/business-info {"displayType":"phone"} /-->
<!-- /wp:sgs/nav-drawer -->
