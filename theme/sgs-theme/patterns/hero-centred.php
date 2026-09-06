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

<!-- wp:sgs/hero {"variant":"standard","alignment":"centre","minHeight":{"desktop":"520px"},"templateLock":"contentOnly"} -->
	<!-- wp:sgs/heading {"content":"Your Compelling Headline Goes Here","level":"h1","className":"sgs-hero__headline","fx":"split-reveal","fxTrigger":"load","fxStart":"top 85%","fxDuration":0.5,"fxStagger":0.02,"fxEase":"power1.out","fxSplit":"words"} /-->

	<!-- wp:sgs/text {"text":"A brief supporting statement that explains your value proposition and encourages visitors to take action.","className":"sgs-hero__subheadline"} /-->

	<!-- wp:sgs/multi-button {"justifyContent":{"desktop":"center"}} -->
		<!-- wp:sgs/button {"label":"Get Started","url":"#","inheritStyle":"primary"} /-->
		<!-- wp:sgs/button {"label":"Learn More","url":"#","inheritStyle":"outline"} /-->
	<!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/hero -->
