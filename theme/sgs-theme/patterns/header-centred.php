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
 * Description: Logo centred above navigation, navigation centred below. Elegant and balanced — suits hospitality, wellness, and lifestyle brands. Starter template for the sgs_header CPT (Spec 37 FR-37-8) — built on sgs/site-header with the standard nav-menu + nav-drawer pair (Spec 36).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColor":"surface"} -->

<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--40)","bottom":"var(--wp--preset--spacing--20)"}}} -->
<!-- wp:sgs/responsive-logo {"width":220,"linkToHome":true} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"bottom","justifyContent":"center","padding":{"desktop":{"top":"var(--wp--preset--spacing--20)","bottom":"var(--wp--preset--spacing--20)"}},"style":{"border":{"top":{"color":"var:preset|color|surface-alt","width":"1px"}}}} -->
<!-- wp:sgs/nav-menu {"ref":0,"itemColour":"text","gap":"32px"} /-->
<!-- /wp:sgs/site-header-row -->

<!-- /wp:sgs/site-header -->

<!-- wp:sgs/nav-drawer -->
<!-- wp:sgs/nav-menu {"ref":0} /-->
<!-- wp:sgs/responsive-logo {"width":140,"linkToHome":true} /-->
<!-- /wp:sgs/nav-drawer -->
