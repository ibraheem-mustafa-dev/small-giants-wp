<?php
/**
 * Title: Contact — Split Form & Info
 * Slug: sgs-theme/contact-split
 * Categories: sgs-content
 * Keywords: contact, form, split, map, information, get in touch
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"left":"var:preset|spacing|70"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- Left: Contact Form -->
		<!-- wp:column {"width":"55%"} -->
		<div class="wp-block-column" style="flex-basis:55%">

			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase">Get in Touch</p>
			<!-- /wp:paragraph -->

			<!-- wp:heading {"level":2,"fontSize":"xx-large","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<h2 class="wp-block-heading has-xx-large-font-size" style="margin-bottom:var(--wp--preset--spacing--20)">Let's Start a Conversation</h2>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"textColor":"text-muted","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|50"}}}} -->
			<p class="has-text-muted-color has-text-color" style="margin-bottom:var(--wp--preset--spacing--50)">Whether you have a project in mind or just want to explore what's possible, we'd love to hear from you. Fill in the form and we'll be in touch within one business day.</p>
			<!-- /wp:paragraph -->

			<!-- Contact Form — replace with your preferred form plugin shortcode -->
			<!-- wp:html -->
			<div class="sgs-contact-form-placeholder" style="background:var(--wp--preset--color--surface-alt);border-radius:12px;padding:var(--wp--preset--spacing--50)">
				<p style="color:var(--wp--preset--color--text-muted);font-size:var(--wp--preset--font-size--small);text-align:center;margin:0">
					<strong>Contact Form Placeholder</strong><br>
					Replace this block with your preferred contact form plugin<br>
					(e.g. WPForms, Contact Form 7, Gravity Forms)
				</p>
			</div>
			<!-- /wp:html -->

		</div>
		<!-- /wp:column -->

		<!-- Right: Contact Information -->
		<!-- wp:column {"width":"45%"} -->
		<div class="wp-block-column" style="flex-basis:45%">

			<!-- wp:spacer {"height":"var:preset|spacing|70"} -->
			<div style="height:var(--wp--preset--spacing--70)" aria-hidden="true" class="wp-block-spacer"></div>
			<!-- /wp:spacer -->

			<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}},"border":{"radius":"16px"}},"backgroundColor":"primary","layout":{"type":"constrained"}} -->
			<div class="wp-block-group has-primary-background-color has-background" style="border-radius:16px;padding:var(--wp--preset--spacing--50)">

				<!-- wp:heading {"level":3,"textColor":"text-inverse","fontSize":"large","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}}} -->
				<h3 class="wp-block-heading has-text-inverse-color has-text-color has-large-font-size" style="margin-bottom:var(--wp--preset--spacing--40)">Contact Information</h3>
				<!-- /wp:heading -->

				<!-- Address -->
				<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|20","margin":{"bottom":"var:preset|spacing|40"}}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"top"}} -->
				<div class="wp-block-group" style="margin-bottom:var(--wp--preset--spacing--40)">
					<!-- wp:paragraph {"textColor":"accent","fontSize":"large","style":{"spacing":{"margin":{"bottom":"0"}}}} -->
					<p class="has-accent-color has-text-color has-large-font-size" style="margin-bottom:0">📍</p>
					<!-- /wp:paragraph -->
					<!-- wp:group {"layout":{"type":"constrained"}} -->
					<div class="wp-block-group">
						<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
						<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:600;margin-bottom:var(--wp--preset--spacing--10)">Our Office</p>
						<!-- /wp:paragraph -->
						<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"small","style":{"spacing":{"margin":{"top":"0"}}}} -->
						<p class="has-text-inverse-color has-text-color has-small-font-size" style="margin-top:0">1 Digital Quarter<br>London, EC2A 4DP<br>United Kingdom</p>
						<!-- /wp:paragraph -->
					</div>
					<!-- /wp:group -->
				</div>
				<!-- /wp:group -->

				<!-- Phone -->
				<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|20","margin":{"bottom":"var:preset|spacing|40"}}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"top"}} -->
				<div class="wp-block-group" style="margin-bottom:var(--wp--preset--spacing--40)">
					<!-- wp:paragraph {"textColor":"accent","fontSize":"large","style":{"spacing":{"margin":{"bottom":"0"}}}} -->
					<p class="has-accent-color has-text-color has-large-font-size" style="margin-bottom:0">📞</p>
					<!-- /wp:paragraph -->
					<!-- wp:group {"layout":{"type":"constrained"}} -->
					<div class="wp-block-group">
						<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
						<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:600;margin-bottom:var(--wp--preset--spacing--10)">Phone</p>
						<!-- /wp:paragraph -->
						<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"small","style":{"spacing":{"margin":{"top":"0"}}}} -->
						<p class="has-text-inverse-color has-text-color has-small-font-size" style="margin-top:0"><a href="tel:+442012345678" style="color:inherit;text-decoration:none">+44 (0)20 1234 5678</a><br>Mon–Fri, 9am–6pm GMT</p>
						<!-- /wp:paragraph -->
					</div>
					<!-- /wp:group -->
				</div>
				<!-- /wp:group -->

				<!-- Email -->
				<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|20","margin":{"bottom":"var:preset|spacing|50"}}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"top"}} -->
				<div class="wp-block-group" style="margin-bottom:var(--wp--preset--spacing--50)">
					<!-- wp:paragraph {"textColor":"accent","fontSize":"large","style":{"spacing":{"margin":{"bottom":"0"}}}} -->
					<p class="has-accent-color has-text-color has-large-font-size" style="margin-bottom:0">✉️</p>
					<!-- /wp:paragraph -->
					<!-- wp:group {"layout":{"type":"constrained"}} -->
					<div class="wp-block-group">
						<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
						<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:600;margin-bottom:var(--wp--preset--spacing--10)">Email</p>
						<!-- /wp:paragraph -->
						<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"small","style":{"spacing":{"margin":{"top":"0"}}}} -->
						<p class="has-text-inverse-color has-text-color has-small-font-size" style="margin-top:0"><a href="mailto:hello@example.com" style="color:inherit;text-decoration:none">hello@example.com</a><br>We respond within 24 hours</p>
						<!-- /wp:paragraph -->
					</div>
					<!-- /wp:group -->
				</div>
				<!-- /wp:group -->

				<!-- wp:separator {"style":{"color":{"background":"rgba(255,255,255,0.2)"},"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}}} -->
				<hr class="wp-block-separator has-text-color has-alpha-channel-opacity" style="background:rgba(255,255,255,0.2);margin-bottom:var(--wp--preset--spacing--40)"/>
				<!-- /wp:separator -->

				<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
				<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:600;margin-bottom:var(--wp--preset--spacing--20)">Follow Us</p>
				<!-- /wp:paragraph -->

				<!-- wp:paragraph {"textColor":"text-inverse","fontSize":"large"} -->
				<p class="has-text-inverse-color has-text-color has-large-font-size"><a href="#" style="color:inherit;text-decoration:none;margin-right:16px" aria-label="LinkedIn">💼</a><a href="#" style="color:inherit;text-decoration:none;margin-right:16px" aria-label="Twitter/X">𝕏</a><a href="#" style="color:inherit;text-decoration:none;margin-right:16px" aria-label="Instagram">📸</a><a href="#" style="color:inherit;text-decoration:none" aria-label="Facebook">📘</a></p>
				<!-- /wp:paragraph -->

			</div>
			<!-- /wp:group -->

		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
