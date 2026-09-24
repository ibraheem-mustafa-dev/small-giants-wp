<?php
/**
 * Title: Anchored card stack
 * Slug: sgs/drawer-anchored-card-stack
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: A narrow top-right panel with the menu and the business phone number and email stacked beneath it, both read from Business Details. Reference: a real-site anchored-dropdown drawer.
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
<!-- wp:sgs/nav-drawer {"anchor":{"desktop":"trigger","tablet":"full-screen"},"panelSize":{"desktop":"310px"},"closeStyle":{"desktop":"text-swap"},"drawerAlign":"left"} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":{"desktop":"4px"}} /-->
<!-- wp:sgs/business-info {"displayType":"phone"} /-->
<!-- wp:sgs/business-info {"displayType":"email"} /-->
<!-- /wp:sgs/nav-drawer -->
