<?php
/**
 * Title: Features — Icon Grid
 * Slug: sgs/services-features
 * Categories: sgs
 * Description: Four-column feature grid with numbered items.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"primary-dark","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-primary-dark-background-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--70);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/heading {"content":"Why Choose Us","textAlign":"center","textColour":"surface","fontSize":"xx-large"} /-->

	<!-- wp:columns {"align":"wide","style":{"spacing":{"margin":{"top":"var:preset|spacing|50"},"blockGap":{"left":"var:preset|spacing|40"}}}} -->
	<div class="wp-block-columns alignwide" style="margin-top:var(--wp--preset--spacing--50)">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:sgs/heading {"content":"01","level":"h3","textColour":"accent-light","fontSize":"hero"} /-->
			<!-- wp:sgs/heading {"content":"Fast Delivery","level":"h4","textColour":"surface","fontSize":"large"} /-->
			<!-- wp:sgs/text {"text":"We deliver projects on time, every time. No excuses.","textColour":"text-inverse","fontSize":"small"} /-->
		</div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:sgs/heading {"content":"02","level":"h3","textColour":"accent-light","fontSize":"hero"} /-->
			<!-- wp:sgs/heading {"content":"Expert Team","level":"h4","textColour":"surface","fontSize":"large"} /-->
			<!-- wp:sgs/text {"text":"Our specialists bring years of industry experience.","textColour":"text-inverse","fontSize":"small"} /-->
		</div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:sgs/heading {"content":"03","level":"h3","textColour":"accent-light","fontSize":"hero"} /-->
			<!-- wp:sgs/heading {"content":"24/7 Support","level":"h4","textColour":"surface","fontSize":"large"} /-->
			<!-- wp:sgs/text {"text":"Round-the-clock support when you need it most.","textColour":"text-inverse","fontSize":"small"} /-->
		</div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:sgs/heading {"content":"04","level":"h3","textColour":"accent-light","fontSize":"hero"} /-->
			<!-- wp:sgs/heading {"content":"Best Value","level":"h4","textColour":"surface","fontSize":"large"} /-->
			<!-- wp:sgs/text {"text":"Premium quality at competitive prices.","textColour":"text-inverse","fontSize":"small"} /-->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
