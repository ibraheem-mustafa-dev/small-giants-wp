<?php
/**
 * Title: Offset column with footer row
 * Slug: sgs/drawer-offset-column
 * Categories: sgs-drawers
 * Block Types: core/post-content
 * Post Types: sgs_drawer
 * Keywords: drawer, menu, panel, editorial
 * Description: A full-screen panel whose menu starts just left of centre and whose contact and social row sits along the bottom from just right of centre; both move to the left edge on mobile. Each part is its own container with a per-device start inset. Reference: a real-site studio drawer on an eight-column grid.
 *
 * @package SGS\Theme
 */

?>
<?php
/*
 * The menu and the footer row are separate containers, each with its own
 * per-device start inset, so they line up independently (a single padding on the
 * drawer body would move both together).
 *
 * The menu block carries no `ref`: 0, the default, means "use whichever menu is
 * assigned to this location" rather than one site's menu id.
 */
?>
<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/container {"layout":"stack","tagName":"div","padding":{"desktop":{"left":"44.7vw"},"tablet":{"left":"42.4vw"},"mobile":{"left":"0px"}}} -->
<!-- wp:sgs/nav-drawer-menu {"itemFontSize":{"desktop":56,"mobile":36}} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"layout":"flex","tagName":"div","gap":{"desktop":"24px"},"padding":{"desktop":{"left":"50.7vw"},"tablet":{"left":"51.3vw"},"mobile":{"left":"0px"}}} -->
<!-- wp:sgs/business-info {"displayType":"email"} /-->

<!-- wp:sgs/business-info /-->

<!-- wp:sgs/social-icons /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/nav-drawer -->
