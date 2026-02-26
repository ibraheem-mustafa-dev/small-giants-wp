<?php
/**
 * Title: About — Our Story
 * Slug: sgs/about-story
 * Categories: sgs
 * Description: About section with image left and story text right.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- wp:column {"width":"45%"} -->
		<div class="wp-block-column" style="flex-basis:45%">
			<!-- wp:image {"sizeSlug":"large","style":{"border":{"radius":"16px"}}} -->
			<figure class="wp-block-image size-large" style="border-radius:16px"><img src="https://placehold.co/500x600/0F7E80/FFFFFF?text=About+Image" alt="About us"/></figure>
			<!-- /wp:image -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"center","width":"55%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:55%">
			<!-- wp:paragraph {"textColor":"primary","fontSize":"small","style":{"typography":{"textTransform":"uppercase","letterSpacing":"0.1em","fontWeight":"700"}}} -->
			<p class="has-primary-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;text-transform:uppercase">About Us</p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"fontSize":"xx-large"} -->
			<h2 class="wp-block-heading has-xx-large-font-size">Our Story Begins With a Simple Belief</h2>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-muted","fontSize":"medium"} -->
			<p class="has-text-muted-color has-text-color has-medium-font-size">We started with a passion for excellence and a commitment to delivering outstanding results. Over the years, we have grown into a trusted partner for businesses seeking to make a lasting impact.</p>
			<!-- /wp:paragraph -->
			<!-- wp:paragraph {"textColor":"text-muted","fontSize":"medium"} -->
			<p class="has-text-muted-color has-text-color has-medium-font-size">Our team brings together diverse expertise and a shared dedication to quality, innovation, and client success.</p>
			<!-- /wp:paragraph -->
			<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} -->
			<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--30)">
				<!-- wp:button {"backgroundColor":"primary","textColor":"surface","style":{"border":{"radius":"8px"}}} -->
				<div class="wp-block-button"><a class="wp-block-button__link has-surface-color has-primary-background-color has-text-color has-background wp-element-button" style="border-radius:8px">Learn More About Us</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
