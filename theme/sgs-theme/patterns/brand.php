<?php
/**
 * Title: Brand Story
 * Slug: sgs/brand
 * Categories: sgs
 * Description: Two-column brand story section — label, heading, body and CTA on one side, image on the other. Replaces the retired sgs/heritage-strip block (2026-05-16, P-PHASE8-1).
 *
 * @package SGS\Theme
 */

?>
<!-- wp:sgs/container {"layout":"grid","columns":2,"gridTemplateColumns":"1fr 1fr","columnsMobile":1,"gap":"60","className":"sgs-brand"} -->

	<!-- wp:sgs/container {"layout":"stack","gap":"24","className":"sgs-brand__content"} -->

		<!-- wp:sgs/label {"text":"Our story","tag":"span","variantStyle":"plain","className":"sgs-brand__label"} /-->

		<!-- wp:core/heading {"level":2,"className":"sgs-brand__headline"} -->
		<h2 class="wp-block-heading sgs-brand__headline">A story that started with a friend</h2>
		<!-- /wp:core/heading -->

		<!-- wp:core/paragraph {"className":"sgs-brand__body"} -->
		<p class="sgs-brand__body">Replace this body copy with your brand's origin story. Two to four sentences works well — speak directly to the reader, name the people involved, and end on what makes your offer different.</p>
		<!-- /wp:core/paragraph -->

		<!-- wp:sgs/button {"text":"Learn more","url":"#","variantStyle":"primary","className":"sgs-brand__cta"} /-->

	<!-- /wp:sgs/container -->

	<!-- wp:core/image {"className":"sgs-brand__image"} -->
	<figure class="wp-block-image sgs-brand__image"><img src="" alt="" /></figure>
	<!-- /wp:core/image -->

<!-- /wp:sgs/container -->
