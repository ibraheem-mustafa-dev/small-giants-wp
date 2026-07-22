<?php
/**
 * Title: SGS Header — Search Icon
 * Slug: sgs/header-search-icon
 * Block Types: core/template-part/header
 * Categories: sgs-headers
 * Keywords: header, search, icon, shop, product, woocommerce, compact
 * Viewport Width: 1440
 * Inserter: true
 * Description: SGS header with a compact search icon in the nav row that expands the search field on click. Space-saving — best when the nav row is tight. Includes cart.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColor":"surface","headerSticky":true,"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"space-between"} -->
<!-- wp:sgs/responsive-logo {"width":180,"linkToHome":true} /-->

<!-- wp:sgs/nav-menu {"ref":0,"itemColour":"text","gap":"28px"} /-->

<!-- wp:sgs/container {"className":"sgs-header-icons","layout":"flex","flexWrap":"nowrap"} -->
<!-- wp:sgs/product-search {"displayMode":"icon","buttonLabel":"Search products"} /-->

<!-- wp:sgs/cart /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/site-header-row -->
<!-- /wp:sgs/site-header -->

<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu {"ref":0} /-->
<!-- wp:sgs/responsive-logo {"width":140,"linkToHome":true} /-->
<!-- /wp:sgs/nav-drawer -->
