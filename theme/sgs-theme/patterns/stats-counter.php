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

<!-- wp:sgs/container {"tagName":"div","backgroundColour":"primary-dark","contentWidth":{"desktop":"normal"},"fx":"scrub","fxStart":"top 85%","fxEnd":"top center","fxScrub":0.3,"fxEase":"power1.out","padding":{"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70","left":"var:preset|spacing|40","right":"var:preset|spacing|40"},"templateLock":"contentOnly"} -->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":{"desktop":"1fr 1fr 1fr 1fr","mobile":"1fr"}} -->

		<!-- wp:sgs/container -->
			<!-- wp:sgs/counter {"number":150,"suffix":"+","label":"Projects Completed","numberColour":"surface","labelColour":"text-inverse"} /-->
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
			<!-- wp:sgs/counter {"number":98,"suffix":"%","label":"Client Satisfaction","numberColour":"surface","labelColour":"text-inverse"} /-->
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
			<!-- wp:sgs/counter {"number":10,"suffix":"+","label":"Years Experience","numberColour":"surface","labelColour":"text-inverse"} /-->
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container -->
			<!-- wp:sgs/counter {"number":24,"suffix":"/7","label":"Support Available","numberColour":"surface","labelColour":"text-inverse"} /-->
		<!-- /wp:sgs/container -->

	<!-- /wp:sgs/container -->

<!-- /wp:sgs/container -->
