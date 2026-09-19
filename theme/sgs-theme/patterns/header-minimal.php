<?php
/**
 * Title: SGS Framework Header — Minimal
 * Slug: sgs/framework-header-minimal
 * Block Types: core/post-content
 * Post Types: sgs_header
 * Categories: sgs-headers
 * Keywords: header, sgs, framework, minimal, compact, landing
 * Viewport Width: 1440
 * Inserter: true
 * Description: Compact header — logo left, primary navigation right, no top utility bar. Best for landing pages. Transparent at rest so it sits over a hero image, becoming solid once the visitor scrolls. Starter template for the sgs_header CPT, built on sgs/site-header with sgs/nav-bar-menu. Its burger opens the menu drawer picked in its own drawer setting, or the site's active menu drawer by default (SGS admin menu -> Menu drawers).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColour":"surface","headerTransparent":{"desktop":"on"}} -->

<!-- wp:sgs/site-header-row {"borderWidth":{"bottom":"1px"},"borderStyle":"solid","borderColour":"surface-alt","rowSlot":"middle","justifyContent":"space-between","padding":{"desktop":{"top":"var(--wp--preset--spacing--30)","bottom":"var(--wp--preset--spacing--30)"}},"rowTransparent":{"desktop":"on"}} -->
<!-- wp:sgs/responsive-logo {"width":250,"linkToHome":true} /-->
<!-- wp:sgs/nav-bar-menu {"ref":0,"itemColour":"text","gap":"28px"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- /wp:sgs/site-header -->
