<?php
/**
 * Title: Hero — Video Background
 * Slug: sgs/hero-video-background
 * Categories: sgs
 * Description: Full-width hero with video background, overlay, and centred text.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:cover {"url":"","dimRatio":70,"overlayColor":"primary-dark","minHeight":600,"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
<div class="wp-block-cover alignfull" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40);min-height:600px"><span aria-hidden="true" class="wp-block-cover__background has-primary-dark-background-color has-background-dim-70 has-background-dim"></span><div class="wp-block-cover__inner-container">

	<!-- wp:group {"layout":{"type":"constrained","contentSize":"700px"}} -->
	<div class="wp-block-group">
		<!-- wp:heading {"textAlign":"center","level":1,"textColor":"surface","fontSize":"hero"} -->
		<h1 class="wp-block-heading has-text-align-center has-surface-color has-text-color has-hero-font-size">Watch Your Business Grow</h1>
		<!-- /wp:heading -->
		<!-- wp:paragraph {"align":"center","textColor":"text-inverse","fontSize":"large"} -->
		<p class="has-text-align-center has-text-inverse-color has-text-color has-large-font-size">Replace the cover block's background with a video URL to create a stunning video hero section.</p>
		<!-- /wp:paragraph -->
		<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
		<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
			<!-- wp:button {"backgroundColor":"accent","textColor":"text","style":{"border":{"radius":"8px"}}} -->
			<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-accent-background-color has-background wp-element-button" style="border-radius:8px">Watch Demo</a></div>
			<!-- /wp:button -->
		</div>
		<!-- /wp:buttons -->
	</div>
	<!-- /wp:group -->

</div></div>
<!-- /wp:cover -->
