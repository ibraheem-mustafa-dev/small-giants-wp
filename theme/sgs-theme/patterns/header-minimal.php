<?php
/**
 * Title: Header — Minimal (Logo + Navigation)
 * Slug: sgs/header-minimal
 * Categories: sgs-headers
 * Block Types: core/template-part/header
 * Description: Clean minimal header with logo and navigation only. No top bar.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"}}},"backgroundColor":"surface","layout":{"type":"default"},"metadata":{"name":"Minimal Header"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">

	<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"bottom":{"color":"var:preset|color|surface-alt","width":"1px"}}},"layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"},"metadata":{"name":"Navigation Bar"}} -->
	<div class="wp-block-group" style="border-bottom-color:var(--wp--preset--color--surface-alt);border-bottom-width:1px;padding-top:var(--wp--preset--spacing--30);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--30);padding-left:var(--wp--preset--spacing--40)">

		<!-- wp:site-logo {"width":250,"shouldSyncIcon":true} /-->

		<!-- wp:navigation {"textColor":"text","layout":{"type":"flex","justifyContent":"right"},"style":{"typography":{"fontWeight":"600"},"spacing":{"blockGap":"var:preset|spacing|40"}},"fontSize":"medium"} /-->

	</div>
	<!-- /wp:group -->

</div>
<!-- /wp:group -->
