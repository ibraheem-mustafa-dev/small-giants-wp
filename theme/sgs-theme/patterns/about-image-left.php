<?php
/**
 * Title: About — Image Left
 * Slug: sgs/about-image-left
 * Categories: sgs
 * Description: About section with image left, text right.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:sgs/container {"tagName":"div","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"contentWidth":"normal"} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--70);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"45% 55%","gridTemplateColumnsMobile":"1fr","align":"wide","gap":"var:preset|spacing|60"} -->
	<div class="wp-block-columns alignwide">
		<!-- wp:sgs/container -->
		<div class="wp-block-column" style="flex-basis:45%">
			<!-- wp:sgs/media {"imageUrl":"https://placehold.co/500x600/0A5B5D/FFFFFF?text=About+Image","imageAlt":"About us","style":{"border":{"radius":"16px"}}} /-->
		</div>
		<!-- /wp:sgs/container -->
		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:55%">
			<!-- wp:sgs/text {"text":"About Us","textColour":"primary","fontSize":"small","fontWeight":"700","textTransform":"uppercase","letterSpacing":0.1,"letterSpacingUnit":"em"} /-->
			<!-- wp:sgs/heading {"content":"We've Been Building Exceptional Experiences Since 2010","fontSize":"xx-large"} /-->
			<!-- wp:sgs/text {"text":"Our team of dedicated professionals brings together decades of experience to deliver outstanding results for every client. We believe in quality, transparency, and building lasting relationships.","textColour":"text-muted"} /-->
			<!-- wp:sgs/text {"text":"From small businesses to enterprise organisations, we tailor our approach to meet your unique needs and goals.","textColour":"text-muted"} /-->
			<!-- wp:sgs/multi-button {"style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} -->
				<!-- wp:sgs/button {"label":"Our Story","inheritStyle":"primary","style":{"border":{"radius":"8px"}}} /-->
			<!-- /wp:sgs/multi-button -->
		</div>
		<!-- /wp:sgs/container -->
	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
