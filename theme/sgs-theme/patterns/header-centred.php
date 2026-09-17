<?php
/**
 * Title: SGS Framework Header — Centred
 * Slug: sgs/framework-header-centred
 * Block Types: core/post-content
 * Post Types: sgs_header
 * Categories: sgs-headers
 * Keywords: header, sgs, framework, centred, centered, logo, balanced, elegant
 * Viewport Width: 1440
 * Inserter: true
 * Description: Logo centred above navigation, navigation centred below. Elegant and balanced — suits hospitality, wellness, and lifestyle brands. Sticky on scroll, with the logo row compacting slightly for a refined feel. Starter template for the sgs_header CPT (Spec 37 FR-37-8) — built on sgs/site-header with sgs/nav-bar-menu (Spec 36), whose burger opens the site's active menu panel by default (SGS admin menu -> Menu Panels — Spec 37 FR-37-49/W2-b).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColour":"surface","headerSticky":{"desktop":"on"}} -->

<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--20)"}},"rowShrink":{"desktop":"on"}} -->
<!-- wp:sgs/responsive-logo {"width":220,"linkToHome":true} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"borderWidth":{"top":"1px"},"borderStyle":"solid","borderColour":"surface-alt","rowSlot":"bottom","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--20)","bottom":"var(--wp--preset--spacing--20)"}}} -->
<!-- wp:sgs/nav-bar-menu {"ref":0,"itemColour":"text","gap":"32px"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- /wp:sgs/site-header -->
