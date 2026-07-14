<?php
/**
 * Title: SGS Header — Search Bar (above menu)
 * Slug: sgs/header-search-bar-above
 * Block Types: core/template-part/header
 * Categories: sgs-headers
 * Keywords: header, search, shop, product, woocommerce, bar
 * Viewport Width: 1440
 * Inserter: true
 * Description: SGS header with a full product-search bar in its own row above the logo/menu row. Best for shops where search is a primary action. Includes cart.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColor":"surface","headerSticky":true,"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
<!-- wp:sgs/site-header-row {"rowSlot":"top","justifyContent":"center","backgroundColor":"surface-alt","maxWidth":{"desktop":"640px"},"padding":{"desktop":"20px"}} -->
<!-- wp:sgs/product-search {"displayMode":"inline","placeholder":"Search products…"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"space-between"} -->
<!-- wp:sgs/responsive-logo {"width":180,"linkToHome":true} /-->

<!-- wp:sgs/adaptive-nav {"linkColour":"text","gap":{"desktop":"28px"}} /-->

<!-- wp:sgs/container {"className":"sgs-header-icons","layout":"flex","flexWrap":"nowrap"} -->
<!-- wp:sgs/cart /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/site-header-row -->
<!-- /wp:sgs/site-header -->
