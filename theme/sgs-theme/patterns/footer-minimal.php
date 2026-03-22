<?php
/**
 * Title: Footer — Minimal
 * Slug: sgs/footer-minimal
 * Categories: sgs-footers
 * Block Types: core/template-part/footer
 * Description: Single-row minimal footer with copyright and social icons. Content auto-populates from Settings > Business Details.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"footer-bg","layout":{"type":"constrained","wideSize":"1200px"},"metadata":{"name":"Minimal Footer"}} -->
<div class="wp-block-group has-footer-bg-background-color has-background" style="padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:group {"align":"wide","layout":{"type":"flex","justifyContent":"space-between","flexWrap":"wrap"},"style":{"spacing":{"blockGap":"var:preset|spacing|30"}}} -->
	<div class="wp-block-group alignwide">

		<!-- wp:sgs/business-info {"type":"copyright","textColor":"text-inverse","fontSize":"small"} /-->

		<!-- wp:sgs/business-info {"type":"socials"} /-->

	</div>
	<!-- /wp:group -->

</div>
<!-- /wp:group -->
