<?php
/**
 * Title: SGS Framework Header — Default
 * Slug: sgs/framework-header-default
 * Block Types: core/template-part/header
 * Categories: sgs-headers
 * Keywords: header, sgs, framework, default, logo, navigation
 * Viewport Width: 1440
 * Inserter: true
 * Description: Minimal default SGS header — logo + primary nav + cart + mobile-nav drawer, built on the never-overflow sgs/site-header block (3 rows, intrinsic reflow).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/site-header {"align":"full","backgroundColor":"surface","style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
<!-- wp:sgs/site-header-row {"rowSlot":"top"} -->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"middle","justifyContent":"space-between"} -->
<!-- wp:site-logo {"width":180,"shouldSyncIcon":true} /-->

<!-- wp:navigation {"textColor":"text","layout":{"type":"flex","justifyContent":"right"},"style":{"typography":{"fontWeight":"600"},"spacing":{"blockGap":"var:preset|spacing|40"}},"fontSize":"medium"} /-->

<!-- wp:sgs/mobile-nav-toggle /-->

<!-- wp:woocommerce/mini-cart {"hasHiddenPrice":true,"iconColorValue":"var(--wp--preset--color--text, #3A2E26)","productCountColorValue":"var(--wp--preset--color--text, #3A2E26)","cartIcon":"bag","style":{"typography":{"fontSize":"var(--wp--preset--font-size--small)"}}} /-->
<!-- /wp:sgs/site-header-row -->

<!-- wp:sgs/site-header-row {"rowSlot":"bottom"} -->
<!-- /wp:sgs/site-header-row -->
<!-- /wp:sgs/site-header -->

<!-- wp:sgs/mobile-nav {"variant":"overlay"} /-->
