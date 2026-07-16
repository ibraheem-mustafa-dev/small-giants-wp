<?php
/**
 * Title: CTA — Centred
 * Slug: sgs/cta-centred
 * Categories: sgs
 * Description: Centred call-to-action with accent background, heading, and two buttons.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"accent-light","layout":{"type":"constrained","contentSize":"700px"}} -->
<div class="wp-block-group alignfull has-accent-light-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/heading {"content":"Start Your Journey Today","textAlign":"center","fontSize":"xx-large"} /-->

	<!-- wp:sgs/text {"text":"Join hundreds of satisfied clients who have transformed their businesses with our help.","textAlign":"center","textColour":"text-muted","fontSize":"medium"} /-->

	<!-- wp:sgs/multi-button {"justifyContent":"center","style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
		<!-- wp:sgs/button {"label":"Book a Consultation","inheritStyle":"primary","style":{"border":{"radius":"8px"}}} /-->
		<!-- wp:sgs/button {"label":"View Our Work","inheritStyle":"outline","style":{"border":{"radius":"8px"}}} /-->
	<!-- /wp:sgs/multi-button -->

</div>
<!-- /wp:group -->
