<?php
/**
 * Title: SGS Framework Header — Default
 * Slug: sgs/framework-header-default
 * Block Types: core/template-part/header
 * Categories: sgs-headers
 * Keywords: header, sgs, framework, default, logo, navigation
 * Viewport Width: 1440
 * Inserter: true
 * Description: Default SGS header on the never-overflow sgs/site-header block, using the standard per-device pattern (FR-S9-8). Desktop: a top utility strip (phone/email/social) + logo + primary nav + cart. At ≤1024 the utility strip is hidden and a prominent "Call" button appears; nav collapses into the drawer, which also carries the email + social links (place-then-toggle, no magic primitive).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColor":"surface","headerSticky":true,"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
<!-- wp:sgs/site-header-row {"rowSlot":"top","justifyContent":"flex-end"} -->
<!-- wp:sgs/business-info {"displayType":"phone","labelCollapse":"all","iconColour":"primary","sgsHideOnMobile":true,"sgsHideOnTablet":true} /-->

<!-- wp:sgs/business-info {"displayType":"email","labelCollapse":"all","iconColour":"primary","sgsHideOnMobile":true,"sgsHideOnTablet":true} /-->

<!-- wp:sgs/business-info {"displayType":"socials","iconColour":"primary","sgsHideOnMobile":true,"sgsHideOnTablet":true} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"space-between"} -->
<!-- wp:sgs/responsive-logo {"width":180,"linkToHome":true} /-->

<!-- wp:sgs/nav-menu {"ref":0,"itemColour":"text","gap":"28px"} /-->

<!-- wp:sgs/container {"className":"sgs-header-icons","layout":"flex","flexWrap":"nowrap"} -->
<!-- wp:sgs/cart /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"bottom","justifyContent":"center"} -->
<!-- wp:sgs/business-info {"displayType":"phone","className":"is-style-button","sgsHideOnDesktop":true} /-->
<!-- /wp:sgs/site-header-row -->
<!-- /wp:sgs/site-header -->

<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu {"ref":0} /-->
<!-- wp:sgs/responsive-logo {"width":140,"linkToHome":true} /-->
<!-- /wp:sgs/nav-drawer -->
