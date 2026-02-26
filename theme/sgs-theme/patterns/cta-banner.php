<?php
/**
 * Title: CTA — Banner
 * Slug: sgs/cta-banner
 * Categories: sgs
 * Description: Full-width call-to-action banner with dark background.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"primary-dark","layout":{"type":"constrained","contentSize":"800px"}} -->
<div class="wp-block-group alignfull has-primary-dark-background-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--70);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"verticalAlignment":"center","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|40"}}}} -->
	<div class="wp-block-columns are-vertically-aligned-center">

		<!-- wp:column {"verticalAlignment":"center","width":"65%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:65%">
			<!-- wp:heading {"textColor":"surface","fontSize":"x-large"} -->
			<h2 class="wp-block-heading has-surface-color has-text-color has-x-large-font-size">Ready to Transform Your Business?</h2>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-inverse"} -->
			<p class="has-text-inverse-color has-text-color">Get a free consultation and discover how we can help you grow.</p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"center","width":"35%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:35%">
			<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"right"}} -->
			<div class="wp-block-buttons">
				<!-- wp:button {"backgroundColor":"accent","textColor":"text","style":{"border":{"radius":"8px"}}} -->
				<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-accent-background-color has-background wp-element-button" style="border-radius:8px">Get Started Today</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
