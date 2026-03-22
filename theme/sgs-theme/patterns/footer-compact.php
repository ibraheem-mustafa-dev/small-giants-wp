<?php
/**
 * Title: Footer — Compact (2-Column)
 * Slug: sgs/footer-compact
 * Categories: sgs-footers
 * Block Types: core/template-part/footer
 * Description: Two-column footer with logo and description on the left, contact and socials on the right. Content auto-populates from Settings > Business Details.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"0","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"footer-bg","layout":{"type":"constrained","wideSize":"1200px"},"metadata":{"name":"Compact Footer"}} -->
<div class="wp-block-group has-footer-bg-background-color has-background" style="padding-top:var(--wp--preset--spacing--60);padding-right:var(--wp--preset--spacing--40);padding-bottom:0;padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- Column 1: Logo + Description -->
		<!-- wp:column {"width":"55%"} -->
		<div class="wp-block-column" style="flex-basis:55%">
			<!-- wp:site-logo {"width":200,"shouldSyncIcon":true,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/business-info {"type":"description","textColor":"text-inverse","fontSize":"small"} /-->
		</div>
		<!-- /wp:column -->

		<!-- Column 2: Contact + Socials -->
		<!-- wp:column {"width":"45%"} -->
		<div class="wp-block-column" style="flex-basis:45%">
			<!-- wp:heading {"level":3,"textColor":"surface","fontSize":"medium","style":{"typography":{"fontWeight":"700"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<h3 class="wp-block-heading has-surface-color has-text-color has-medium-font-size" style="font-weight:700;margin-bottom:var(--wp--preset--spacing--20)">Get In Touch</h3>
			<!-- /wp:heading -->

			<!-- wp:sgs/business-info {"type":"phone","textColor":"text-inverse","fontSize":"small"} /-->
			<!-- wp:sgs/business-info {"type":"email","textColor":"text-inverse","fontSize":"small"} /-->
			<!-- wp:sgs/business-info {"type":"address","textColor":"text-inverse","fontSize":"small","style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} /-->

			<!-- wp:sgs/business-info {"type":"socials","style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} /-->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

	<!-- Copyright Bar -->
	<!-- wp:group {"align":"wide","layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40"},"margin":{"top":"var:preset|spacing|50"}},"border":{"top":{"color":"var:preset|color|border-subtle","width":"1px"}}}} -->
	<div class="wp-block-group alignwide" style="border-top-color:var(--wp--preset--color--border-subtle);border-top-width:1px;margin-top:var(--wp--preset--spacing--50);padding-top:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40)">

		<!-- wp:sgs/business-info {"type":"copyright","textColor":"text-inverse","fontSize":"small"} /-->

	</div>
	<!-- /wp:group -->

</div>
<!-- /wp:group -->
