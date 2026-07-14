<?php
/**
 * Title: SGS Framework Header — Default
 * Slug: sgs/framework-header-default
 * Block Types: core/template-part/header
 * Categories: sgs-headers
 * Keywords: header, sgs, framework, default, logo, navigation
 * Viewport Width: 1440
 * Inserter: true
 * Description: Minimal default SGS header — logo + primary nav + cart + mobile-nav drawer, built on the never-overflow sgs/site-header block. Nav collapses into the drawer below 768px (designed collapse, not a wrap).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColor":"surface","headerSticky":true,"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
<!-- wp:sgs/site-header-row {"rowSlot":"top","justifyContent":"flex-end"} -->
<!-- wp:sgs/business-info {"displayType":"phone","textColour":"text","iconColour":"primary","fontSize":"small"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"space-between"} -->
<!-- wp:sgs/responsive-logo {"width":180,"linkToHome":true} /-->

<!-- wp:sgs/adaptive-nav {"linkColour":"text","gap":{"desktop":"28px"}} /-->

<!-- wp:group {"className":"sgs-header-icons","layout":{"type":"flex","flexWrap":"nowrap"}} -->
<div class="wp-block-group sgs-header-icons">
	<!-- wp:sgs/cart /-->

	<!-- wp:sgs/mobile-nav-toggle /-->
</div>
<!-- /wp:group -->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"bottom"} -->
<!-- /wp:sgs/site-header-row -->
<!-- /wp:sgs/site-header -->

<!-- wp:sgs/mobile-nav {"variant":"overlay"} /-->
