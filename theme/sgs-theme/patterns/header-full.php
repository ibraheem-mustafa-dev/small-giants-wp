<?php
/**
 * Title: Header — Full (Top Bar + Navigation)
 * Slug: sgs/header-full
 * Categories: sgs-headers
 * Block Types: core/post-content
 * Post Types: sgs_header
 * Description: Full header with contact top bar (phone, email, socials), logo, navigation, and mobile menu. Contact info auto-populates from Settings > Business Details. Sticky on scroll, with the contact bar hiding on scroll down to reclaim space (navigation stays visible). Starter template for the sgs_header CPT (Spec 37 FR-37-8) — built on sgs/site-header with sgs/nav-bar-menu (Spec 36), whose burger opens the site's active menu panel by default (SGS admin menu -> Menu Panels — Spec 37 FR-37-49/W2-b).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColour":"surface","headerSticky":{"desktop":"on"}} -->

<!-- wp:sgs/site-header-row {"rowSlot":"top","justifyContent":"space-between","backgroundColour":"primary","padding":{"desktop":{"top":"8px","bottom":"8px"}},"rowHideOnScroll":{"desktop":"on"}} -->
<!-- wp:sgs/business-info {"displayType":"phone","textColour":"surface","fontSize":{"desktop":"regular"}} /-->
<!-- wp:sgs/business-info {"displayType":"email","textColour":"surface","fontSize":{"desktop":"regular"}} /-->
<!-- wp:sgs/business-info {"displayType":"socials","iconColour":"surface"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"borderWidth":{"bottom":"1px"},"borderStyle":"solid","borderColour":"surface-alt","rowSlot":"middle","justifyContent":"space-between","padding":{"desktop":{"top":"var(--wp--preset--spacing--30)","bottom":"var(--wp--preset--spacing--30)"}}} -->
<!-- wp:sgs/responsive-logo {"width":300,"linkToHome":true} /-->
<!-- wp:sgs/nav-bar-menu {"ref":0,"itemColour":"text","gap":"28px"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- /wp:sgs/site-header -->
