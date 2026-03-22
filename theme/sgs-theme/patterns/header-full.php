<?php
/**
 * Title: Header — Full (Top Bar + Navigation)
 * Slug: sgs/header-full
 * Categories: sgs-headers
 * Block Types: core/template-part/header
 * Description: Full header with contact top bar (phone, email, socials), logo, navigation, and mobile drawer. Contact info auto-populates from Settings > Business Details.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"}}},"backgroundColor":"surface","layout":{"type":"default"},"metadata":{"name":"Site Header"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">

	<!-- Top Bar -->
	<!-- wp:group {"style":{"spacing":{"padding":{"top":"8px","bottom":"8px","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"primary","layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"},"metadata":{"name":"Top Bar"},"className":"sgs-header-top-bar"} -->
	<div class="wp-block-group sgs-header-top-bar has-primary-background-color has-background" style="padding-top:8px;padding-right:var(--wp--preset--spacing--40);padding-bottom:8px;padding-left:var(--wp--preset--spacing--40)">

		<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap"},"style":{"spacing":{"blockGap":"var:preset|spacing|40"}}} -->
		<div class="wp-block-group" style="gap:var(--wp--preset--spacing--40)">
			<!-- wp:sgs/business-info {"type":"phone","textColor":"surface","fontSize":"medium","style":{"typography":{"fontWeight":"600"}}} /-->
			<!-- wp:sgs/business-info {"type":"email","textColor":"surface","fontSize":"medium","style":{"typography":{"fontWeight":"600"}}} /-->
		</div>
		<!-- /wp:group -->

		<!-- wp:sgs/business-info {"type":"socials"} /-->

	</div>
	<!-- /wp:group -->

	<!-- Main Navigation -->
	<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"bottom":{"color":"var:preset|color|surface-alt","width":"1px"}}},"layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"},"metadata":{"name":"Main Navigation"}} -->
	<div class="wp-block-group" style="border-bottom-color:var(--wp--preset--color--surface-alt);border-bottom-width:1px;padding-top:var(--wp--preset--spacing--30);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--30);padding-left:var(--wp--preset--spacing--40)">

		<!-- wp:site-logo {"width":300,"shouldSyncIcon":true} /-->

		<!-- wp:navigation {"textColor":"text","layout":{"type":"flex","justifyContent":"right"},"style":{"typography":{"fontWeight":"600"},"spacing":{"blockGap":"var:preset|spacing|40"}},"fontSize":"medium"} /-->

	</div>
	<!-- /wp:group -->

</div>
<!-- /wp:group -->
