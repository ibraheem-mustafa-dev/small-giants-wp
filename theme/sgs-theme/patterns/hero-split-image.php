<?php
/**
 * Title: Hero — Split Image
 * Slug: sgs-theme/hero-split-image
 * Categories: sgs-content
 * Keywords: hero, split, image, header, banner
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"},"margin":{"top":"0","bottom":"0"}}},"backgroundColor":"surface","layout":{"type":"default"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background">

	<!-- wp:columns {"align":"full","isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"left":"0","top":"0"}}}} -->
	<div class="wp-block-columns alignfull is-layout-flex">

		<!-- wp:column {"width":"50%","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|60","right":"var:preset|spacing|60"}}}} -->
		<div class="wp-block-column" style="flex-basis:50%;padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--60)">

			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase">Your Industry · Your Brand</p>
			<!-- /wp:paragraph -->

			<!-- wp:heading {"level":1,"fontSize":"hero"} -->
			<h1 class="wp-block-heading has-hero-font-size">Delivering Excellence That Drives Results</h1>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"textColor":"text-muted","fontSize":"large","style":{"spacing":{"margin":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|60"}}}} -->
			<p class="has-text-muted-color has-text-color has-large-font-size" style="margin-top:var(--wp--preset--spacing--40);margin-bottom:var(--wp--preset--spacing--60)">We partner with ambitious businesses to create outstanding experiences. From strategy through delivery, we are your dedicated growth partner.</p>
			<!-- /wp:paragraph -->

			<!-- wp:buttons {"style":{"spacing":{"blockGap":"var:preset|spacing|30"}}} -->
			<div class="wp-block-buttons">
				<!-- wp:button {"className":"is-style-fill"} -->
				<div class="wp-block-button is-style-fill"><a class="wp-block-button__link wp-element-button" href="#">Get Started Today</a></div>
				<!-- /wp:button -->
				<!-- wp:button {"className":"is-style-outline"} -->
				<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="#">Learn More</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->

			<!-- wp:spacer {"height":"var:preset|spacing|50"} -->
			<div style="height:var(--wp--preset--spacing--50)" aria-hidden="true" class="wp-block-spacer"></div>
			<!-- /wp:spacer -->

			<!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"var:preset|spacing|40"}}}} -->
			<div class="wp-block-columns">
				<!-- wp:column -->
				<div class="wp-block-column">
					<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"0"}}}} -->
					<p style="margin-bottom:0"><strong>✓ Free consultation</strong></p>
					<!-- /wp:paragraph -->
				</div>
				<!-- /wp:column -->
				<!-- wp:column -->
				<div class="wp-block-column">
					<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"0"}}}} -->
					<p style="margin-bottom:0"><strong>✓ No long-term contracts</strong></p>
					<!-- /wp:paragraph -->
				</div>
				<!-- /wp:column -->
			</div>
			<!-- /wp:columns -->

		</div>
		<!-- /wp:column -->

		<!-- wp:column {"width":"50%","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"}}}} -->
		<div class="wp-block-column" style="flex-basis:50%">
			<!-- wp:image {"sizeSlug":"full","linkDestination":"none","style":{"dimensions":{"minHeight":"100%"}},"className":"hero-split-img"} -->
			<figure class="wp-block-image size-full hero-split-img"><img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80" alt="A professional team collaborating in a modern office environment" style="min-height:100%;object-fit:cover;width:100%"/></figure>
			<!-- /wp:image -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
