<?php
/**
 * Title: Hero — Centred
 * Slug: sgs/hero-centred
 * Categories: sgs
 * Description: Full-width centred hero with heading, subheading, and two CTA buttons. Uses the SGS Hero block.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:sgs/hero {"variant":"standard","alignment":"centre","minHeight":"520px"} -->
	<!-- wp:sgs/heading {"content":"Your Compelling Headline Goes Here","level":"h1","className":"sgs-hero__headline"} /-->

	<!-- wp:sgs/text {"text":"A brief supporting statement that explains your value proposition and encourages visitors to take action.","className":"sgs-hero__subheadline"} /-->

	<!-- wp:sgs/multi-button {"justifyContent":"center"} -->
		<!-- wp:sgs/button {"label":"Get Started","url":"#","inheritStyle":"primary"} /-->
		<!-- wp:sgs/button {"label":"Learn More","url":"#","inheritStyle":"outline"} /-->
	<!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/hero -->
