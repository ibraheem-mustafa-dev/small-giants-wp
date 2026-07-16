<?php
/**
 * Title: Contact — Minimal
 * Slug: sgs/contact-minimal
 * Categories: sgs
 * Description: Centred contact section with heading, paragraph, and call-to-action buttons.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface-alt","layout":{"type":"constrained","contentSize":"600px"}} -->
<div class="wp-block-group alignfull has-surface-alt-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/heading {"content":"Let’s Start a Conversation","textAlign":"center","fontSize":"xx-large"} /-->

	<!-- wp:sgs/text {"text":"Ready to discuss your project? Reach out and we’ll respond within one working day.","textAlign":"center","textColour":"text-muted","fontSize":"medium"} /-->

	<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
	<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
		<!-- wp:button {"backgroundColor":"primary","textColor":"surface","style":{"border":{"radius":"8px"}},"metadata":{"bindings":{"url":{"source":"sgs/site-info","args":{"key":"email"}}}}} -->
		<div class="wp-block-button"><a class="wp-block-button__link has-surface-color has-primary-background-color has-text-color has-background wp-element-button" style="border-radius:8px">Email Us</a></div>
		<!-- /wp:button -->
		<!-- wp:button {"className":"is-style-outline","style":{"border":{"radius":"8px"}},"metadata":{"bindings":{"url":{"source":"sgs/site-info","args":{"key":"phone"}}}}} -->
		<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" style="border-radius:8px">Call Us</a></div>
		<!-- /wp:button -->
	</div>
	<!-- /wp:buttons -->

</div>
<!-- /wp:group -->
