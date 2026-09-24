<?php
/**
 * Title: Two-column editorial
 * Slug: sgs/drawer-two-column-editorial
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: A full-screen light panel with a large two-column link grid that merges to one column on smaller devices, and the business email beneath it. Reference: a real-site 2-column editorial drawer.
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
<!-- wp:sgs/nav-drawer {"drawerBg":"surface","closeStyle":{"desktop":"text-swap"}} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":{"desktop":"4px"},"itemFontSize":{"desktop":64,"mobile":40},"listColumns":{"desktop":2,"mobile":1}} /-->
<!-- wp:sgs/business-info {"displayType":"email"} /-->
<!-- /wp:sgs/nav-drawer -->
