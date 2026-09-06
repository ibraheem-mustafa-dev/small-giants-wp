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

<!-- wp:sgs/container {"tagName":"div","contentWidth":{"desktop":"normal"},"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"},"templateLock":"contentOnly"} -->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":{"desktop":"45% 55%","mobile":"1fr"},"gap":{"desktop":"var:preset|spacing|60"}} -->
		<!-- wp:sgs/container -->
			<!-- wp:sgs/media {"imageUrl":"https://placehold.co/500x600/0A5B5D/FFFFFF?text=About+Image","imageAlt":"About us","borderRadius":{"topLeft":"16px","topRight":"16px","bottomLeft":"16px","bottomRight":"16px"}} /-->
		<!-- /wp:sgs/container -->
		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}","flexWrap":"wrap"} -->
			<!-- wp:sgs/text {"text":"About Us","textColour":"primary","fontSize":{"desktop":"small"},"fontWeight":"700","textTransform":"uppercase","letterSpacing":{"desktop":0.1},"letterSpacingUnit":"em"} /-->
			<!-- wp:sgs/heading {"content":"We've Been Building Exceptional Experiences Since 2010","fontSize":{"desktop":"xx-large"}} /-->
			<!-- wp:sgs/text {"text":"Our team of dedicated professionals brings together decades of experience to deliver outstanding results for every client. We believe in quality, transparency, and building lasting relationships.","textColour":"text-muted"} /-->
			<!-- wp:sgs/text {"text":"From small businesses to enterprise organisations, we tailor our approach to meet your unique needs and goals.","textColour":"text-muted"} /-->
			<!-- wp:sgs/multi-button {"margin":{"top":"var:preset|spacing|30"}} -->
				<!-- wp:sgs/button {"label":"Our Story","inheritStyle":"primary","borderRadius":{"desktop":"8px"}} /-->
			<!-- /wp:sgs/multi-button -->
		<!-- /wp:sgs/container -->
	<!-- /wp:sgs/container -->

<!-- /wp:sgs/container -->
