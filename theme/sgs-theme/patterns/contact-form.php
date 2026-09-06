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

<!-- wp:sgs/container {"tagName":"div","backgroundColour":"surface","contentWidth":{"desktop":"normal"},"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"},"flexWrap":"wrap","templateLock":"contentOnly"} -->

	<!-- wp:sgs/heading {"content":"Get in Touch","textAlign":"center","fontSize":{"desktop":"xx-large"},"margin":{"bottom":"var:preset|spacing|60"}} /-->

	<!-- wp:sgs/container {"layout":"grid","gridTemplateColumns":{"desktop":"60% 40%","mobile":"1fr"},"gap":{"desktop":"var:preset|spacing|60"}} -->

		<!-- wp:sgs/container {"flexWrap":"wrap"} -->
			<!-- wp:sgs/text {"text":"Fill in the form below and we’ll get back to you within 24 hours.","textColour":"text-muted","fontSize":{"desktop":"medium"}} /-->
			<!-- wp:sgs/container {"tagName":"div","backgroundColour":"surface-alt","padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"},"borderRadius":{"desktop":"12px"}} -->
				<!-- wp:sgs/text {"text":"[Insert your contact form block or shortcode here]","textColour":"text-muted"} /-->
			<!-- /wp:sgs/container -->
		<!-- /wp:sgs/container -->

		<!-- wp:sgs/container {"sgsCustomCss":"&selector{align-self:center;}","flexWrap":"wrap"} -->
			<!-- wp:sgs/heading {"content":"Contact Details","level":"h3","fontSize":{"desktop":"large"}} /-->
			<!-- wp:sgs/text {"text":"placeholder — replaced at render","textColour":"text-muted","metadata":{"bindings":{"text":{"source":"sgs/site-info","args":{"key":"email"}}}}} /-->
			<!-- wp:sgs/text {"text":"placeholder — replaced at render","textColour":"text-muted","metadata":{"bindings":{"text":{"source":"sgs/site-info","args":{"key":"phone"}}}}} /-->
			<!-- wp:sgs/text {"text":"placeholder — replaced at render","textColour":"text-muted","metadata":{"bindings":{"text":{"source":"sgs/site-info","args":{"key":"address"}}}}} /-->
			<!-- wp:sgs/heading {"content":"Opening Hours","level":"h3","fontSize":{"desktop":"large"},"margin":{"top":"var:preset|spacing|40"}} /-->
			<!-- wp:sgs/text {"text":"placeholder — replaced at render","textColour":"text-muted","metadata":{"bindings":{"text":{"source":"sgs/site-info","args":{"key":"opening_hours.mon"}}}}} /-->
		<!-- /wp:sgs/container -->

	<!-- /wp:sgs/container -->

<!-- /wp:sgs/container -->
