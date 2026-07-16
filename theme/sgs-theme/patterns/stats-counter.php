<?php
/**
 * Title: Stats - Counter Section
 * Slug: sgs/stats-counter
 * Categories: sgs
 * Description: Four-column statistics section using the SGS Counter block for animated number counting.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:sgs/container {"tagName":"div","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"primary-dark","contentWidth":"normal"} -->
<div class="wp-block-group alignfull has-primary-dark-background-color has-background" style="padding-top:var(--wp--preset--spacing--70);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--70);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"1fr 1fr 1fr 1fr","gridTemplateColumnsMobile":"1fr","align":"wide"} -->
	<div class="wp-block-columns alignwide">

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/counter {"number":150,"suffix":"+","label":"Projects Completed","numberColour":"surface","labelColour":"text-inverse"} /-->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/counter {"number":98,"suffix":"%","label":"Client Satisfaction","numberColour":"surface","labelColour":"text-inverse"} /-->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/counter {"number":10,"suffix":"+","label":"Years Experience","numberColour":"surface","labelColour":"text-inverse"} /-->
		</div>
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
		<div class="wp-block-column">
			<!-- wp:sgs/counter {"number":24,"suffix":"/7","label":"Support Available","numberColour":"surface","labelColour":"text-inverse"} /-->
		</div>
		<!-- /wp:sgs/container -->

	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
