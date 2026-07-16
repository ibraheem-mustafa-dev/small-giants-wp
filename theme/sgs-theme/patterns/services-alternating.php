<?php
/**
 * Title: Services — Alternating Rows
 * Slug: sgs/services-alternating
 * Categories: sgs
 * Description: Services section with alternating image/text rows.
 *
 * @package SGS\Theme
 */
?>

<!-- wp:sgs/container {"tagName":"div","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","contentWidth":"normal"} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/heading {"content":"How We Help You Succeed","textAlign":"center","fontSize":"xx-large","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|60"}}}} /-->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"50% 50%","gridTemplateColumnsMobile":"1fr","align":"wide","gap":"var:preset|spacing|60","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns alignwide" style="margin-bottom:var(--wp--preset--spacing--60)">
		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%">
			<!-- wp:sgs/heading {"content":"Strategy & Planning","level":"h3","fontSize":"x-large"} /-->
			<!-- wp:sgs/text {"text":"We begin every project with a thorough understanding of your goals, audience, and market. Our strategic approach ensures every decision is purposeful.","textColour":"text-muted","fontSize":"medium"} /-->
		</div>
		<!-- /wp:sgs/container -->
		<!-- wp:sgs/container -->
		<div class="wp-block-column" style="flex-basis:50%">
			<!-- wp:sgs/media {"imageUrl":"https://placehold.co/600x400/0F7E80/FFFFFF?text=Strategy","imageAlt":"Strategy and planning","style":{"border":{"radius":"12px"}}} /-->
		</div>
		<!-- /wp:sgs/container -->
	</div>
	<!-- /wp:sgs/container -->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":"50% 50%","gridTemplateColumnsMobile":"1fr","align":"wide","gap":"var:preset|spacing|60"} -->
	<div class="wp-block-columns alignwide">
		<!-- wp:sgs/container -->
		<div class="wp-block-column" style="flex-basis:50%">
			<!-- wp:sgs/media {"imageUrl":"https://placehold.co/600x400/F87A1F/FFFFFF?text=Execution","imageAlt":"Execution and delivery","style":{"border":{"radius":"12px"}}} /-->
		</div>
		<!-- /wp:sgs/container -->
		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:50%">
			<!-- wp:sgs/heading {"content":"Execution & Delivery","level":"h3","fontSize":"x-large"} /-->
			<!-- wp:sgs/text {"text":"Our expert team brings your vision to life with precision and care. We deliver on time, every time, without compromising on quality.","textColour":"text-muted","fontSize":"medium"} /-->
		</div>
		<!-- /wp:sgs/container -->
	</div>
	<!-- /wp:sgs/container -->

</div>
<!-- /wp:sgs/container -->
