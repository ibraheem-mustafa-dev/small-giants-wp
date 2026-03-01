<?php
/**
 * Title: Gallery — Masonry Grid
 * Slug: sgs-theme/gallery-masonry
 * Categories: sgs-content
 * Keywords: gallery, masonry, images, portfolio, photos, grid
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:paragraph {"align":"center","textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
	<p class="has-text-align-center has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase">Our Portfolio</p>
	<!-- /wp:paragraph -->

	<!-- wp:heading {"textAlign":"center","fontSize":"xx-large","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
	<h2 class="wp-block-heading has-text-align-center has-xx-large-font-size" style="margin-bottom:var(--wp--preset--spacing--20)">Work We're Proud Of</h2>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"align":"center","textColor":"text-muted","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|60"}}}} -->
	<p class="has-text-align-center has-text-muted-color has-text-color" style="margin-bottom:var(--wp--preset--spacing--60)">A selection of projects that showcase our range, creativity, and dedication to delivering exceptional results for our clients.</p>
	<!-- /wp:paragraph -->

	<!-- wp:gallery {"columns":3,"imageCrop":true,"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|20","top":"var:preset|spacing|20"}}},"linkTo":"none"} -->
	<figure class="wp-block-gallery alignwide has-nested-images columns-3 is-cropped">

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80" alt="A modern office interior with clean lines and natural light" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80" alt="A team meeting in a light-filled conference room" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=600&q=80" alt="Close-up of design materials including colour swatches and printed layouts" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=600&q=80" alt="A commercial building facade with contemporary architecture" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80" alt="Someone working on a laptop computer showing web design work" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80" alt="A presentation being delivered in front of a live audience" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80" alt="Data analytics dashboard displayed on a large monitor" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80" alt="A smartphone showing a polished mobile application interface" /></figure>
		<!-- /wp:image -->

		<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
		<figure class="wp-block-image size-large"><img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80" alt="A pair of people collaborating over printed brand guidelines" /></figure>
		<!-- /wp:image -->

	</figure>
	<!-- /wp:gallery -->

	<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"margin":{"top":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--60)">
		<!-- wp:button -->
		<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">View Full Portfolio</a></div>
		<!-- /wp:button -->
	</div>
	<!-- /wp:buttons -->

</div>
<!-- /wp:group -->
