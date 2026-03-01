<?php
/**
 * Title: FAQ — Accordion
 * Slug: sgs-theme/faq-accordion
 * Categories: sgs-content
 * Keywords: faq, accordion, questions, answers, support, help
 *
 * @package SGS\Theme
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}},"backgroundColor":"surface-alt","layout":{"type":"constrained","wideSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-alt-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--80);padding-left:var(--wp--preset--spacing--40)">

	<!-- wp:columns {"align":"wide","isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"left":"var:preset|spacing|70"}}}} -->
	<div class="wp-block-columns alignwide">

		<!-- Left: Intro -->
		<!-- wp:column {"width":"35%","style":{"spacing":{"padding":{"right":"var:preset|spacing|30"}}}} -->
		<div class="wp-block-column" style="flex-basis:35%;padding-right:var(--wp--preset--spacing--30)">

			<!-- wp:paragraph {"textColor":"accent","fontSize":"small","style":{"typography":{"fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
			<p class="has-accent-color has-text-color has-small-font-size" style="font-weight:700;letter-spacing:0.1em;margin-bottom:var(--wp--preset--spacing--20);text-transform:uppercase">FAQs</p>
			<!-- /wp:paragraph -->

			<!-- wp:heading {"level":2,"fontSize":"xx-large","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
			<h2 class="wp-block-heading has-xx-large-font-size" style="margin-bottom:var(--wp--preset--spacing--30)">Frequently Asked Questions</h2>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"textColor":"text-muted","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|50"}}}} -->
			<p class="has-text-muted-color has-text-color" style="margin-bottom:var(--wp--preset--spacing--50)">Can't find the answer you're looking for? Our team is happy to help — just get in touch and we'll respond within one business day.</p>
			<!-- /wp:paragraph -->

			<!-- wp:buttons -->
			<div class="wp-block-buttons">
				<!-- wp:button {"className":"is-style-outline"} -->
				<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="#">Contact Support</a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->

		</div>
		<!-- /wp:column -->

		<!-- Right: Accordion Items -->
		<!-- wp:column {"width":"65%"} -->
		<div class="wp-block-column" style="flex-basis:65%">

			<!-- wp:details {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"border":{"radius":"12px","width":"1px","color":"var:preset|color|border-subtle"}},"backgroundColor":"surface"} -->
			<details class="wp-block-details has-surface-background-color has-background" style="border-radius:12px;border:1px solid var(--wp--preset--color--border-subtle);margin-bottom:var(--wp--preset--spacing--20)">
				<summary style="padding:var(--wp--preset--spacing--40);font-weight:600;cursor:pointer">How long does a typical project take from start to finish?</summary>
				<!-- wp:paragraph {"style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
				<p style="padding-top:0;padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40)">Project timelines vary based on scope and complexity. A standard 5-page website typically takes 4–6 weeks from kickoff to launch. Larger, custom projects can take 3–6 months. We always provide a detailed timeline at the start of the project so you know exactly what to expect.</p>
				<!-- /wp:paragraph -->
			</details>
			<!-- /wp:details -->

			<!-- wp:details {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"border":{"radius":"12px","width":"1px","color":"var:preset|color|border-subtle"}},"backgroundColor":"surface"} -->
			<details class="wp-block-details has-surface-background-color has-background" style="border-radius:12px;border:1px solid var(--wp--preset--color--border-subtle);margin-bottom:var(--wp--preset--spacing--20)">
				<summary style="padding:var(--wp--preset--spacing--40);font-weight:600;cursor:pointer">Do you offer ongoing support and maintenance after launch?</summary>
				<!-- wp:paragraph {"style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
				<p style="padding-top:0;padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40)">Yes, absolutely. We offer a range of monthly support and maintenance packages, starting from basic security updates and backups through to full-service managed hosting, content updates, performance monitoring, and strategic growth consultancy.</p>
				<!-- /wp:paragraph -->
			</details>
			<!-- /wp:details -->

			<!-- wp:details {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"border":{"radius":"12px","width":"1px","color":"var:preset|color|border-subtle"}},"backgroundColor":"surface"} -->
			<details class="wp-block-details has-surface-background-color has-background" style="border-radius:12px;border:1px solid var(--wp--preset--color--border-subtle);margin-bottom:var(--wp--preset--spacing--20)">
				<summary style="padding:var(--wp--preset--spacing--40);font-weight:600;cursor:pointer">What information do you need to get started?</summary>
				<!-- wp:paragraph {"style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
				<p style="padding-top:0;padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40)">To get started, we'll need a brief overview of your business, your goals, any existing brand assets (logo, colours, fonts), examples of sites you admire, and your budget range. Our discovery questionnaire guides you through everything, and we'll schedule a kick-off call to fill in any gaps.</p>
				<!-- /wp:paragraph -->
			</details>
			<!-- /wp:details -->

			<!-- wp:details {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"border":{"radius":"12px","width":"1px","color":"var:preset|color|border-subtle"}},"backgroundColor":"surface"} -->
			<details class="wp-block-details has-surface-background-color has-background" style="border-radius:12px;border:1px solid var(--wp--preset--color--border-subtle);margin-bottom:var(--wp--preset--spacing--20)">
				<summary style="padding:var(--wp--preset--spacing--40);font-weight:600;cursor:pointer">Can I update the website myself once it's built?</summary>
				<!-- wp:paragraph {"style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
				<p style="padding-top:0;padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40)">Yes — all our websites are built on WordPress and are fully self-editable. We include a training session covering how to update pages, add blog posts, manage images, and handle common tasks. Most clients can confidently manage their site after a single 60-minute session.</p>
				<!-- /wp:paragraph -->
			</details>
			<!-- /wp:details -->

			<!-- wp:details {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}},"border":{"radius":"12px","width":"1px","color":"var:preset|color|border-subtle"}},"backgroundColor":"surface"} -->
			<details class="wp-block-details has-surface-background-color has-background" style="border-radius:12px;border:1px solid var(--wp--preset--color--border-subtle);margin-bottom:var(--wp--preset--spacing--20)">
				<summary style="padding:var(--wp--preset--spacing--40);font-weight:600;cursor:pointer">What payment terms do you offer?</summary>
				<!-- wp:paragraph {"style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
				<p style="padding-top:0;padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40)">For project work we typically invoice in three stages: 30% deposit upon project start, 40% at the midpoint review, and 30% upon final sign-off before launch. For ongoing monthly retainers, payment is taken in advance at the beginning of each month. We accept bank transfer and all major credit cards.</p>
				<!-- /wp:paragraph -->
			</details>
			<!-- /wp:details -->

			<!-- wp:details {"style":{"border":{"radius":"12px","width":"1px","color":"var:preset|color|border-subtle"}},"backgroundColor":"surface"} -->
			<details class="wp-block-details has-surface-background-color has-background" style="border-radius:12px;border:1px solid var(--wp--preset--color--border-subtle)">
				<summary style="padding:var(--wp--preset--spacing--40);font-weight:600;cursor:pointer">Do you work with clients outside the UK?</summary>
				<!-- wp:paragraph {"style":{"spacing":{"padding":{"top":"0","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}}}} -->
				<p style="padding-top:0;padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40)">Absolutely. While our team is based in the UK, we work with clients across Europe, North America, the Middle East, and beyond. All our project management and collaboration tools are remote-friendly, and we're used to working across time zones.</p>
				<!-- /wp:paragraph -->
			</details>
			<!-- /wp:details -->

		</div>
		<!-- /wp:column -->

	</div>
	<!-- /wp:columns -->

</div>
<!-- /wp:group -->
