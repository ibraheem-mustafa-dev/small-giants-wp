<?php
/**
 * Title: Split zone serif
 * Slug: sgs/drawer-split-zone-serif
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, featured
 * Description: A full-screen dark panel: a serif link list plus tertiary links and a newsletter prompt on the left, and a repeatable promo-card rail alongside. Reference: a real-site split-zone drawer.
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
<!-- wp:sgs/nav-drawer {"drawerBg":"footer-bg","drawerAlign":"left","closeStyle":"separate-x"} -->
<!-- wp:sgs/nav-drawer-menu {"ref":0,"gap":"4px"} /-->
<!-- wp:sgs/icon-list /-->
<!-- wp:sgs/text {"text":"Sign up for occasional news."} /-->
<!-- wp:sgs/social-icons /-->
<!-- wp:sgs/card-grid /-->
<!-- /wp:sgs/nav-drawer -->
