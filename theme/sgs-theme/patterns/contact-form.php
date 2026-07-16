<?php
/**
 * Title: Contact — Form & Info
 * Slug: sgs/contact-form
 * Categories: sgs
 * Description: Two-column contact section with form left and contact details right.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/heading {"content":"Get in Touch","textAlign":"center","fontSize":"xx-large","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|60"}}}} /-->

	<!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":{"left":"var:preset|spacing|60"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- wp:column {"width":"60%"} -->
		<div class="wp-block-column" style="flex-basis:60%">
			<!-- wp:sgs/text {"text":"Fill in the form below and we’ll get back to you within 24 hours.","textColour":"text-muted","fontSize":"medium"} /-->
			<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"border":{"radius":"12px"}},"backgroundColor":"surface-alt"} -->
			<div class="wp-block-group has-surface-alt-background-color has-background" style="border-radius:12px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
				<!-- wp:sgs/text {"text":"[Insert your contact form block or shortcode here]","textColour":"text-muted"} /-->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"center","width":"40%"} -->
		<div class="wp-block-column is-vertically-aligned-center" style="flex-basis:40%">
			<!-- wp:sgs/heading {"content":"Contact Details","level":"h3","fontSize":"large"} /-->
			<!-- wp:paragraph {"textColor":"text-muted","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"email"}}}}} -->
			<p class="has-text-muted-color has-text-color">placeholder — replaced at render</p>
			<!-- /wp:paragraph -->
			<!-- wp:paragraph {"textColor":"text-muted","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"phone"}}}}} -->
			<p class="has-text-muted-color has-text-color">placeholder — replaced at render</p>
			<!-- /wp:paragraph -->
			<!-- wp:paragraph {"textColor":"text-muted","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"address"}}}}} -->
			<p class="has-text-muted-color has-text-color">placeholder — replaced at render</p>
			<!-- /wp:paragraph -->
			<!-- wp:sgs/heading {"content":"Opening Hours","level":"h3","fontSize":"large","style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} /-->
			<!-- wp:paragraph {"textColor":"text-muted","metadata":{"bindings":{"content":{"source":"sgs/site-info","args":{"key":"opening_hours.mon"}}}}} -->
			<p class="has-text-muted-color has-text-color">placeholder — replaced at render</p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
