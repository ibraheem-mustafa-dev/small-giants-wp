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

<!-- wp:sgs/container {"tagName":"div","align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface-alt","contentWidth":"600px"} -->
<div class="wp-block-group alignfull has-surface-alt-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:sgs/heading {"content":"Let’s Start a Conversation","textAlign":"center","fontSize":"xx-large"} /-->

	<!-- wp:sgs/text {"text":"Ready to discuss your project? Reach out and we’ll respond within one working day.","textAlign":"center","textColour":"text-muted","fontSize":"medium"} /-->

	<!-- wp:sgs/multi-button {"justifyContent":"center","style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
		<!-- wp:sgs/button {"label":"Email Us","inheritStyle":"primary","style":{"border":{"radius":"8px"}},"metadata":{"bindings":{"url":{"source":"sgs/site-info","args":{"key":"email"}}}}} /-->
		<!-- wp:sgs/button {"label":"Call Us","inheritStyle":"outline","style":{"border":{"radius":"8px"}},"metadata":{"bindings":{"url":{"source":"sgs/site-info","args":{"key":"phone"}}}}} /-->
	<!-- /wp:sgs/multi-button -->

</div>
<!-- /wp:sgs/container -->
