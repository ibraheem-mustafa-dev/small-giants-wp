<?php
/**
 * Title: Header — Centred Logo
 * Slug: sgs/header-centred
 * Categories: sgs-headers
 * Block Types: core/template-part/header
 * Description: Logo centred above, navigation centred below. Elegant and balanced.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"}}},"backgroundColor":"surface","layout":{"type":"default"},"metadata":{"name":"Centred Header"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">

	<!-- Logo Row -->
	<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|20","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"layout":{"type":"flex","justifyContent":"center"},"metadata":{"name":"Logo Row"}} -->
	<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--20);padding-left:var(--wp--preset--spacing--40)">

		<!-- wp:site-logo {"width":250,"shouldSyncIcon":true} /-->

	</div>
	<!-- /wp:group -->

	<!-- Navigation Row -->
	<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|20","bottom":"var:preset|spacing|20","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"top":{"color":"var:preset|color|surface-alt","width":"1px"},"bottom":{"color":"var:preset|color|surface-alt","width":"1px"}}},"layout":{"type":"flex","justifyContent":"center"},"metadata":{"name":"Navigation Row"}} -->
	<div class="wp-block-group" style="border-top-color:var(--wp--preset--color--surface-alt);border-top-width:1px;border-bottom-color:var(--wp--preset--color--surface-alt);border-bottom-width:1px;padding-top:var(--wp--preset--spacing--20);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--20);padding-left:var(--wp--preset--spacing--40)">

		<!-- wp:navigation {"textColor":"text","layout":{"type":"flex","justifyContent":"center"},"style":{"typography":{"fontWeight":"600"},"spacing":{"blockGap":"var:preset|spacing|50"}},"fontSize":"medium"} /-->

	</div>
	<!-- /wp:group -->

</div>
<!-- /wp:group -->
