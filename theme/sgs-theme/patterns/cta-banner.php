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

<!-- wp:sgs/container {"tagName":"div","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"primary-dark","contentWidth":"800px"} -->
<div class="wp-block-group alignfull has-primary-dark-background-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--70);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"65% 35%","gridTemplateColumnsMobile":"1fr","verticalAlign":"center","gap":"var:preset|spacing|40"} -->
	<div class="wp-block-columns are-vertically-aligned-center">

		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:65%">
			<!-- wp:sgs/heading {"content":"Ready to Transform Your Business?","textColour":"surface","fontSize":"x-large"} /-->
			<!-- wp:sgs/text {"text":"Get a free consultation and discover how we can help you grow.","textColour":"text-inverse"} /-->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:35%">
			<!-- wp:sgs/multi-button {"justifyContent":"flex-end"} -->
				<!-- wp:sgs/button {"label":"Get Started Today","colourBackground":"accent","inheritStyle":"custom","colourText":"text","style":{"border":{"radius":"8px"}}} /-->
			<!-- /wp:sgs/multi-button -->
		</div>
		<!-- /wp:sgs/container -->

	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
