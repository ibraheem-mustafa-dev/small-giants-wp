<?php
/**
 * Title: Hero — Centred
 * Slug: sgs/hero-centred
 * Categories: sgs
 * Description: Full-width centred hero with heading, subheading, and two CTA buttons.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"primary-dark","layout":{"type":"constrained","contentSize":"700px"}} -->
<div class="wp-block-group alignfull has-primary-dark-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:heading {"textAlign":"center","level":1,"textColor":"surface","fontSize":"hero"} -->
	<h1 class="wp-block-heading has-text-align-center has-surface-color has-text-color has-hero-font-size">Your Compelling Headline Goes Here</h1>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"align":"center","textColor":"text-inverse","fontSize":"large"} -->
	<p class="has-text-align-center has-text-inverse-color has-text-color has-large-font-size">A brief supporting statement that explains your value proposition and encourages visitors to take action.</p>
	<!-- /wp:paragraph -->

	<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
	<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
		<!-- wp:button {"backgroundColor":"accent","textColor":"text","style":{"border":{"radius":"8px"}}} -->
		<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-accent-background-color has-background wp-element-button" style="border-radius:8px">Get Started</a></div>
		<!-- /wp:button -->
		<!-- wp:button {"className":"is-style-outline","style":{"border":{"radius":"8px"}}} -->
		<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" style="border-radius:8px">Learn More</a></div>
		<!-- /wp:button -->
	</div>
	<!-- /wp:buttons -->

</div>
<!-- /wp:group -->
