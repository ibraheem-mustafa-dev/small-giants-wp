<?php
/**
 * Title: Features — Alternating Rows
 * Slug: sgs-theme/features-alternating
 * Categories: sgs-content
 * Keywords: features, alternating, zigzag, image, text, services
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- Row 1: Image Left, Text Right -->
	<!-- wp:columns {"align":"wide","isStackedOnMobile":true,"verticalAlignment":"center","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|70"},"margin":{"bottom":"var:preset|spacing|80"}}}} -->
	<div class="wp-block-columns alignwide are-vertically-aligned-center" style="margin-bottom:var(--wp--preset--spacing--80)">

		<!-- wp:column {"verticalAlignment":"center","width":"50%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%">
			<!-- wp:image {"sizeSlug":"large","linkDestination":"none","style":{"border":{"radius":"16px"}}} -->
			<figure class="wp-block-image size-large" style="border-radius:16px"><img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=700&q=80" alt="A team working collaboratively around a table with laptops and documents" style="border-radius:16px"/></figure>
			<!-- /wp:image -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"center","width":"50%","style":{"spacing":{"padding":{"left":"var:preset|spacing|40"}}}} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%;padding-left:var(--wp--preset--spacing--40)">
			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase">Step 01</p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":2,"fontSize":"xx-large"} -->
			<h2 class="wp-block-heading has-xx-large-font-size">Strategic Planning That Sets You Apart</h2>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-muted"} -->
			<p class="has-text-muted-color has-text-color">We start by deeply understanding your business, your market, and your customers. Through workshops, research, and collaborative ideation, we develop a roadmap that aligns your goals with measurable outcomes.</p>
			<!-- /wp:paragraph -->
			<!-- wp:list {"textColor":"text-muted","fontSize":"small","style":{"spacing":{"padding":{"left":"var:preset|spacing|40"}}}} -->
			<ul class="has-text-muted-color has-text-color has-small-font-size" style="padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:list-item --><li>Comprehensive market analysis</li><!-- /wp:list-item -->
				<!-- wp:list-item --><li>Competitor landscape mapping</li><!-- /wp:list-item -->
				<!-- wp:list-item --><li>Clear KPI definition</li><!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
			<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
			<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
				<!-- wp:button -->
				<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">Find Out More</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

	<!-- Row 2: Text Left, Image Right -->
	<!-- wp:columns {"align":"wide","isStackedOnMobile":true,"verticalAlignment":"center","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|70"},"margin":{"bottom":"var:preset|spacing|80"}}}} -->
	<div class="wp-block-columns alignwide are-vertically-aligned-center" style="margin-bottom:var(--wp--preset--spacing--80)">

		<!-- wp:column {"verticalAlignment":"center","width":"50%","style":{"spacing":{"padding":{"right":"var:preset|spacing|40"}}}} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%;padding-right:var(--wp--preset--spacing--40)">
			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase">Step 02</p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":2,"fontSize":"xx-large"} -->
			<h2 class="wp-block-heading has-xx-large-font-size">Design & Build With Purpose</h2>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-muted"} -->
			<p class="has-text-muted-color has-text-color">Our designers and developers work in close collaboration to craft experiences that are as beautiful as they are effective. Every pixel is intentional; every interaction is deliberate.</p>
			<!-- /wp:paragraph -->
			<!-- wp:list {"textColor":"text-muted","fontSize":"small","style":{"spacing":{"padding":{"left":"var:preset|spacing|40"}}}} -->
			<ul class="has-text-muted-color has-text-color has-small-font-size" style="padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:list-item --><li>User experience (UX) design</li><!-- /wp:list-item -->
				<!-- wp:list-item --><li>Rapid prototyping and user testing</li><!-- /wp:list-item -->
				<!-- wp:list-item --><li>Accessible, standards-compliant build</li><!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
			<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
			<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
				<!-- wp:button -->
				<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">Our Process</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"center","width":"50%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%">
			<!-- wp:image {"sizeSlug":"large","linkDestination":"none","style":{"border":{"radius":"16px"}}} -->
			<figure class="wp-block-image size-large" style="border-radius:16px"><img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=700&q=80" alt="A designer reviewing wireframes and mockups on a computer screen" style="border-radius:16px"/></figure>
			<!-- /wp:image -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

	<!-- Row 3: Image Left, Text Right -->
	<!-- wp:columns {"align":"wide","isStackedOnMobile":true,"verticalAlignment":"center","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|70"}}}} -->
	<div class="wp-block-columns alignwide are-vertically-aligned-center">

		<!-- wp:column {"verticalAlignment":"center","width":"50%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%">
			<!-- wp:image {"sizeSlug":"large","linkDestination":"none","style":{"border":{"radius":"16px"}}} -->
			<figure class="wp-block-image size-large" style="border-radius:16px"><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&q=80" alt="A graph showing upward growth in business performance metrics" style="border-radius:16px"/></figure>
			<!-- /wp:image -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"center","width":"50%","style":{"spacing":{"padding":{"left":"var:preset|spacing|40"}}}} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%;padding-left:var(--wp--preset--spacing--40)">
			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase">Step 03</p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":2,"fontSize":"xx-large"} -->
			<h2 class="wp-block-heading has-xx-large-font-size">Launch, Measure &amp; Optimise</h2>
			<!-- /wp:heading -->
			<!-- wp:paragraph {"textColor":"text-muted"} -->
			<p class="has-text-muted-color has-text-color">We don't just hand over the keys and walk away. We monitor performance, gather insights, and continuously refine your digital presence to ensure you are always improving.</p>
			<!-- /wp:paragraph -->
			<!-- wp:list {"textColor":"text-muted","fontSize":"small","style":{"spacing":{"padding":{"left":"var:preset|spacing|40"}}}} -->
			<ul class="has-text-muted-color has-text-color has-small-font-size" style="padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:list-item --><li>Performance monitoring and reporting</li><!-- /wp:list-item -->
				<!-- wp:list-item --><li>A/B testing and conversion optimisation</li><!-- /wp:list-item -->
				<!-- wp:list-item --><li>Ongoing technical support</li><!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
			<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
			<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
				<!-- wp:button -->
				<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">View Results</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
