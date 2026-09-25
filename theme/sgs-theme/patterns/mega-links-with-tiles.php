<?php
/**
 * Title: Mega: link columns with image tiles
 * Slug: sgs/mega-links-with-tiles
 * Categories: sgs
 * Block Types: core/post-content
 * Post Types: sgs_mega_menu
 * Description: A full-width panel with link columns on the left and a row of image tiles on the right, each tile an image, a short line and a pill button. Built from container grids, so the column count, the tile count and every gap stay editable. Set the menu bar's "Mega panels open from" to Full width for a band the width of the page. Reference: a real-site storefront mega panel with callout tiles.
 *
 * @package SGS\Theme
 */

?>
<?php
/*
 * Layout, not a preset: the outer container is a two-track grid (the link columns
 * take the free space, the tiles take their own width); the link columns and the
 * tiles are each their own grid container, so a third tile is one duplicate.
 */
?>
<!-- wp:sgs/container {"layout":"grid","tagName":"div","gridTemplateColumns":{"desktop":"1fr minmax(0, 560px)","mobile":"1fr"},"gap":{"desktop":"32px"},"padding":{"desktop":{"top":"32px","right":"45px","bottom":"16px","left":"45px"}}} -->
<!-- wp:sgs/container {"layout":"grid","tagName":"div","columns":{"desktop":3,"tablet":3,"mobile":1},"gap":{"desktop":"10px"}} -->
<!-- wp:sgs/container {"layout":"stack","tagName":"div"} -->
<!-- wp:sgs/heading {"content":"Shop by size","level":"h3"} /-->

<!-- wp:sgs/icon-list {"items":[{"iconSource":"lucide","iconName":"chevron-right","text":"Carry-on","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Medium","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Large","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Trunk","url":"#"}]} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"layout":"stack","tagName":"div"} -->
<!-- wp:sgs/heading {"content":"Shop by style","level":"h3"} /-->

<!-- wp:sgs/icon-list {"items":[{"iconSource":"lucide","iconName":"chevron-right","text":"Hardside","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Softside","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Aluminium","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Kids","url":"#"}]} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"layout":"stack","tagName":"div"} -->
<!-- wp:sgs/heading {"content":"Featured","level":"h3"} /-->

<!-- wp:sgs/icon-list {"items":[{"iconSource":"lucide","iconName":"chevron-right","text":"New arrivals","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Best sellers","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Gift ideas","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Sale","url":"#"}]} /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"layout":"grid","tagName":"div","columns":{"desktop":2,"tablet":2,"mobile":2},"gap":{"desktop":"16px"}} -->
<!-- wp:sgs/container {"layout":"stack","tagName":"div","gap":{"desktop":"12px"}} -->
<!-- wp:sgs/media {"aspectRatio":"4 / 5"} /-->

<!-- wp:sgs/text {"text":"Featured collection"} /-->

<!-- wp:sgs/button {"label":"Shop now","url":"#","borderRadius":{"desktop":{"topLeft":"80px","topRight":"80px","bottomRight":"80px","bottomLeft":"80px"}}} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"layout":"stack","tagName":"div","gap":{"desktop":"12px"}} -->
<!-- wp:sgs/media {"aspectRatio":"4 / 5"} /-->

<!-- wp:sgs/text {"text":"New this season"} /-->

<!-- wp:sgs/button {"label":"Shop now","url":"#","borderRadius":{"desktop":{"topLeft":"80px","topRight":"80px","bottomRight":"80px","bottomLeft":"80px"}}} /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/container -->
