<?php
/**
 * Title: Ingredients Section
 * Slug: sgs/ingredients-section
 * Categories: sgs
 * Description: A title + intro text + 4-ingredient feature grid + disclaimer notice. Designed for product or recipe pages.
 * Keywords: ingredients, features, food, product, recipe
 * Inserter: true
 *
 * @package SGS\Theme
 */

?>
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">

	<!-- wp:heading {"textAlign":"center","level":2} -->
	<h2 class="wp-block-heading has-text-align-center">What's inside</h2>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"align":"center"} -->
	<p class="has-text-align-center">Honest ingredients, no shortcuts. Every batch is made with care.</p>
	<!-- /wp:paragraph -->

	<!-- wp:sgs/feature-grid {"layoutMode":"fixed-columns","columnsDesktop":4,"columnsTablet":2,"columnsMobile":1} -->
	<div class="wp-block-sgs-feature-grid sgs-feature-grid sgs-feature-grid--fixed-columns">

		<!-- wp:sgs/info-box {"showMedia":true,"showTitle":true,"showText":true,"showButton":false,"mediaType":"emoji","mediaEmoji":"(grain)","heading":"Wholegrain oats","description":"Slow-roasted for natural sweetness."} /-->

		<!-- wp:sgs/info-box {"showMedia":true,"showTitle":true,"showText":true,"showButton":false,"mediaType":"emoji","mediaEmoji":"(honey)","heading":"British honey","description":"Sourced from local apiaries."} /-->

		<!-- wp:sgs/info-box {"showMedia":true,"showTitle":true,"showText":true,"showButton":false,"mediaType":"emoji","mediaEmoji":"(coconut)","heading":"Coconut oil","description":"Cold-pressed for richer flavour."} /-->

		<!-- wp:sgs/info-box {"showMedia":true,"showTitle":true,"showText":true,"showButton":false,"mediaType":"emoji","mediaEmoji":"(seeds)","heading":"Mixed seeds","description":"Pumpkin, sunflower, flax for crunch."} /-->

	</div>
	<!-- /wp:sgs/feature-grid -->

	<!-- wp:sgs/notice-banner {"variant":"info","icon":"info","text":"We make nourishing food. We do not make medical claims. Always check with your GP if you have specific dietary needs."} /-->

</div>
<!-- /wp:group -->
