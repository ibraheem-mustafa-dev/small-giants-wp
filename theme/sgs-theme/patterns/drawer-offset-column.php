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

<!-- wp:sgs/social-icons -->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"whatsapp","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.whatsapp"}}}}} /-->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"facebook","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.facebook"}}}}} /-->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"instagram","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.instagram"}}}}} /-->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"x","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.twitter"}}}}} /-->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"linkedin","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.linkedin"}}}}} /-->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"youtube","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.youtube"}}}}} /-->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"tiktok","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.tiktok"}}}}} /-->
<!-- wp:sgs/icon {"iconSource":"brand","brandName":"google","metadata":{"bindings":{"linkUrl":{"source":"sgs/site-info","args":{"key":"socials.google"}}}}} /-->
<!-- /wp:sgs/social-icons -->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/nav-drawer -->
