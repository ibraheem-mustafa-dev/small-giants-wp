<?php
/**
 * Title: Split zone serif
 * Slug: sgs/drawer-split-zone-serif
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: A full-screen dark panel with a serif link list, the business social links and the phone number and email beneath it, all read from Business Details. Reference: a real-site split-zone drawer.
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
<!-- wp:sgs/nav-drawer {"drawerBg":"footer-bg","drawerAlign":"left","closeStyle":{"desktop":"separate-x"}} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":{"desktop":"4px"}} /-->
<!-- wp:sgs/social-icons {"source":"site-info"} /-->
<!-- wp:sgs/business-info {"displayType":"phone"} /-->
<!-- wp:sgs/business-info {"displayType":"email"} /-->
<!-- /wp:sgs/nav-drawer -->
