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

<!-- wp:sgs/container {"tagName":"div","backgroundColour":"surface-alt","contentWidth":{"desktop":"600px"},"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"},"flexWrap":"wrap","templateLock":"contentOnly"} -->

	<!-- wp:sgs/heading {"content":"Let’s Start a Conversation","textAlign":"center","fontSize":{"desktop":"xx-large"}} /-->

	<!-- wp:sgs/text {"text":"Ready to discuss your project? Reach out and we’ll respond within one working day.","textAlign":"center","textColour":"text-muted","fontSize":{"desktop":"medium"}} /-->

	<!-- wp:sgs/multi-button {"justifyContent":{"desktop":"center"},"margin":{"top":"var:preset|spacing|40"}} -->
		<!-- wp:sgs/button {"label":"Email Us","inheritStyle":"primary","style":{"border":{"radius":"8px"}},"metadata":{"bindings":{"url":{"source":"sgs/site-info","args":{"key":"email"}}}}} /-->
		<!-- wp:sgs/button {"label":"Call Us","inheritStyle":"outline","style":{"border":{"radius":"8px"}},"metadata":{"bindings":{"url":{"source":"sgs/site-info","args":{"key":"phone"}}}}} /-->
	<!-- /wp:sgs/multi-button -->

<!-- /wp:sgs/container -->
