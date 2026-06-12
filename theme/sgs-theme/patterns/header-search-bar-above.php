<?php
/**
 * Title: SGS Header — Search Bar (above menu)
 * Slug: sgs/header-search-bar-above
 * Block Types: core/template-part/header
 * Categories: sgs-headers
 * Keywords: header, search, shop, product, woocommerce, bar
 * Viewport Width: 1440
 * Inserter: true
 * Description: SGS header with a full product-search bar in its own row above the logo/menu row. Best for shops where search is a primary action. Includes mini-cart.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"}}},"backgroundColor":"surface","layout":{"type":"default"},"metadata":{"name":"Site Header"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">

	<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|20","bottom":"var:preset|spacing|20","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface-alt","layout":{"type":"constrained","contentSize":"640px"},"metadata":{"name":"Header Search Row"}} -->
	<div class="wp-block-group has-surface-alt-background-color has-background" style="padding-top:var(--wp--preset--spacing--20);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--20);padding-left:var(--wp--preset--spacing--40)">
		<!-- wp:sgs/product-search {"displayMode":"inline","placeholder":"Search products…"} /-->
	</div>
	<!-- /wp:group -->

	<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"bottom":{"color":"var:preset|color|surface-alt","width":"1px"}}},"layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"},"metadata":{"name":"Main Navigation"}} -->
	<div class="wp-block-group" style="border-bottom-color:var(--wp--preset--color--surface-alt);border-bottom-width:1px;padding-top:var(--wp--preset--spacing--30);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--30);padding-left:var(--wp--preset--spacing--40)">

		<!-- wp:site-logo {"width":240,"shouldSyncIcon":true} /-->

		<!-- wp:group {"className":"sgs-header-actions","layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"right"},"metadata":{"name":"Navigation and CTA"}} -->
		<div class="wp-block-group sgs-header-actions">

			<!-- wp:sgs/mobile-nav-toggle /-->

			<!-- wp:navigation {"textColor":"text","layout":{"type":"flex","justifyContent":"right"},"style":{"typography":{"fontWeight":"600"},"spacing":{"blockGap":"var:preset|spacing|40"}},"fontSize":"medium"} /-->

			<!-- wp:woocommerce/mini-cart {"hasHiddenPrice":true,"priceColorValue":"","iconColorValue":"var(--wp--preset--color--text, #3A2E26)","productCountColorValue":"var(--wp--preset--color--text, #3A2E26)","cartIcon":"bag","style":{"typography":{"fontSize":"var(--wp--preset--font-size--small)"}}} /-->

		</div>
		<!-- /wp:group -->

	</div>
	<!-- /wp:group -->

	<!-- wp:sgs/mobile-nav {"variant":"overlay"} /-->

</div>
<!-- /wp:group -->
