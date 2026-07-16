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
			<!-- wp:sgs/media {"imageUrl":"https://placehold.co/500x600/0F7E80/FFFFFF?text=About+Image","imageAlt":"About us","style":{"border":{"radius":"16px"}}} /-->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"center","width":"55%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:55%">
			<!-- wp:sgs/text {"text":"About Us","textColour":"primary","fontSize":"small","textTransform":"uppercase","letterSpacing":0.1,"letterSpacingUnit":"em","fontWeight":"700"} /-->
			<!-- wp:sgs/heading {"content":"Our Story Begins With a Simple Belief","fontSize":"xx-large"} /-->
			<!-- wp:sgs/text {"text":"We started with a passion for excellence and a commitment to delivering outstanding results. Over the years, we have grown into a trusted partner for businesses seeking to make a lasting impact.","textColour":"text-muted","fontSize":"medium"} /-->
			<!-- wp:sgs/text {"text":"Our team brings together diverse expertise and a shared dedication to quality, innovation, and client success.","textColour":"text-muted","fontSize":"medium"} /-->
			<!-- wp:sgs/multi-button {"style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} -->
				<!-- wp:sgs/button {"label":"Learn More About Us","inheritStyle":"primary","style":{"border":{"radius":"8px"}}} /-->
			<!-- /wp:sgs/multi-button -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
