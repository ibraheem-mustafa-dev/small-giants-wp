<?php
/**
 * Title: Centred statement
 * Slug: sgs/drawer-centred-statement
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: An opaque full-screen panel with a large centred link list and the business phone number and email underneath, both read from Business Details. Reference: a real-site centred-statement drawer.
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
<!-- wp:sgs/nav-drawer {"drawerBg":"footer-bg","drawerAlign":"center","closeStyle":{"desktop":"separate-x"}} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":{"desktop":"4px"},"itemFontSize":{"desktop":56,"mobile":36}} /-->
<!-- wp:sgs/business-info {"displayType":"phone"} /-->
<!-- wp:sgs/business-info {"displayType":"email"} /-->
<!-- /wp:sgs/nav-drawer -->
