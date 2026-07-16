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
		<!-- wp:sgs/heading {"content":"Watch Your Business Grow","textAlign":"center","level":"h1","textColour":"surface","fontSize":"hero"} /-->
		<!-- wp:sgs/text {"text":"Replace the cover block's background with a video URL to create a stunning video hero section.","textAlign":"center","textColour":"text-inverse","fontSize":"large"} /-->
		<!-- wp:sgs/multi-button {"justifyContent":"center","style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
			<!-- wp:sgs/button {"label":"Watch Demo","colourBackground":"accent","inheritStyle":"custom","colourText":"text","style":{"border":{"radius":"8px"}}} /-->
		<!-- /wp:sgs/multi-button -->
	</div>
	<!-- /wp:group -->

</div></div>
<!-- /wp:cover -->
