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

<!-- wp:sgs/container {"tagName":"div","backgroundColour":"primary-dark","contentWidth":{"desktop":"800px"},"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"},"templateLock":"contentOnly"} -->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":{"desktop":"65% 35%","mobile":"1fr"},"alignItems":"center","gap":{"desktop":"var:preset|spacing|40"}} -->

		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}","flexWrap":"wrap"} -->
			<!-- wp:sgs/heading {"content":"Ready to Transform Your Business?","textColour":"surface","fontSize":{"desktop":"x-large"},"fx":"split-reveal","fxStart":"top 70%","fxDuration":0.8,"fxStagger":0.05,"fxSplit":"words"} /-->
			<!-- wp:sgs/text {"text":"Get a free consultation and discover how we can help you grow.","textColour":"text-inverse"} /-->
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}"} -->
			<!-- wp:sgs/multi-button {"justifyContent":{"desktop":"flex-end"}} -->
				<!-- wp:sgs/button {"label":"Get Started Today","colourBackground":"accent","inheritStyle":"custom","colourText":"text","style":{"border":{"radius":"8px"}}} /-->
			<!-- /wp:sgs/multi-button -->
		<!-- /wp:sgs/container -->

	<!-- /wp:sgs/container -->

<!-- /wp:sgs/container -->
