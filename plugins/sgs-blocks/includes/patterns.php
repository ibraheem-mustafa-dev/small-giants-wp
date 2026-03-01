<?php
/**
 * Block Patterns — SGS Starter Sections
 *
 * Registers a curated library of pre-built page sections using SGS Blocks.
 * Each pattern is inserted from the editor's Patterns panel, under the
 * "SGS Starter Sections" category.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the sgs-patterns category and all patterns.
 * Hooked to `init` so that block pattern infrastructure is ready.
 */
add_action( 'init', 'sgs_register_block_patterns' );

function sgs_register_block_patterns(): void {

	// ── Pattern category ─────────────────────────────────────────────────────
	register_block_pattern_category(
		'sgs-patterns',
		[ 'label' => __( 'SGS Starter Sections', 'sgs-blocks' ) ]
	);

	// ── a) Hero Section ───────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/hero-section',
		[
			'title'      => __( 'Hero Section', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Full-width hero with headline, sub-headline, dual CTAs, and breadcrumbs below.', 'sgs-blocks' ),
			'content'    => '<!-- wp:sgs/hero {"variant":"standard","headline":"Trusted by Businesses Across the UK","subHeadline":"Award-winning digital solutions that drive real results — from discovery to launch and beyond.","alignment":"center","ctaPrimaryText":"Get a Free Quote","ctaPrimaryUrl":"/contact","ctaPrimaryStyle":"accent","ctaSecondaryText":"See Our Work","ctaSecondaryUrl":"/portfolio","ctaSecondaryStyle":"outline"} /-->

<!-- wp:sgs/breadcrumbs {"separator":"/"} /-->',
		]
	);

	// ── b) CTA Section ────────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/cta-section',
		[
			'title'      => __( 'CTA Section', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Bold call-to-action banner with heading, supporting text, and two buttons.', 'sgs-blocks' ),
			'content'    => '<!-- wp:sgs/cta-section {"alignment":"center","backgroundColour":"primary"} -->
<!-- wp:heading {"level":2,"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Ready to Grow Your Business?</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Join over 500 companies who trust us to deliver quality, on time and on budget. Let\'s talk about what we can build together.</p>
<!-- /wp:paragraph -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"className":"is-style-fill"} -->
<div class="wp-block-button is-style-fill"><a class="wp-block-button__link wp-element-button" href="/contact">Start Your Project</a></div>
<!-- /wp:button -->

<!-- wp:button {"className":"is-style-outline"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="/about">Learn More</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
<!-- /wp:sgs/cta-section -->',
		]
	);

	// ── c) Testimonials Row ───────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/testimonials-row',
		[
			'title'      => __( 'Testimonials Row', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Three customer testimonial cards in a responsive columns layout.', 'sgs-blocks' ),
			'content'    => '<!-- wp:columns {"isStackedOnMobile":true} -->
<div class="wp-block-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/testimonial {"name":"Sarah Mitchell","role":"Marketing Director, Apex Solutions","quote":"The team delivered our new website ahead of schedule and the results speak for themselves — our enquiries doubled within the first month.","rating":5} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/testimonial {"name":"James Okafor","role":"CEO, NorthEdge Consulting","quote":"Professional, communicative, and genuinely skilled. They understood our brand instantly and translated it into a site we\'re proud to show clients.","rating":5} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/testimonial {"name":"Priya Nair","role":"Head of Operations, Clearwater Group","quote":"From the initial brief to the final handover, every step was smooth. Our team adopted the new platform with zero friction.","rating":5} /-->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->',
		]
	);

	// ── d) Pricing Comparison ─────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/pricing-comparison',
		[
			'title'      => __( 'Pricing Comparison', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Three pricing plans — Basic, Pro, and Enterprise — displayed side by side.', 'sgs-blocks' ),
			'content'    => '<!-- wp:sgs/pricing-table {"columns":3,"plans":[{"title":"Starter","price":"£29","period":"per month","features":["Up to 5 users","10 GB storage","Email support","Basic reporting","API access"],"ctaText":"Get Started","ctaUrl":"/signup","popular":false},{"title":"Professional","price":"£79","period":"per month","features":["Up to 25 users","50 GB storage","Priority support","Advanced analytics","Custom integrations","Team dashboard"],"ctaText":"Start Free Trial","ctaUrl":"/signup","popular":true},{"title":"Enterprise","price":"Custom","period":"","features":["Unlimited users","Unlimited storage","Dedicated account manager","SLA guarantee","SSO & SAML","On-premise option"],"ctaText":"Contact Sales","ctaUrl":"/contact","popular":false}]} /-->',
		]
	);

	// ── e) Contact Section ────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/contact-section',
		[
			'title'      => __( 'Contact Section', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'A full contact form with name, email, phone, message, and GDPR consent fields.', 'sgs-blocks' ),
			'content'    => '<!-- wp:heading {"level":2,"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Get in Touch</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">Have a question or want to work with us? Fill in the form below and we\'ll be in touch within one business day.</p>
<!-- /wp:paragraph -->

<!-- wp:sgs/form {"submitLabel":"Send Message","successMessage":"Thank you! We\'ll be in touch shortly."} -->
<!-- wp:sgs/form-field-text {"label":"Full Name","placeholder":"e.g. Jane Smith","required":true} /-->
<!-- wp:sgs/form-field-email {"label":"Email Address","placeholder":"jane@company.com","required":true} /-->
<!-- wp:sgs/form-field-phone {"label":"Phone Number","placeholder":"+44 7700 900000","required":false} /-->
<!-- wp:sgs/form-field-textarea {"label":"Your Message","placeholder":"Tell us a bit about your project or enquiry...","required":true,"rows":5} /-->
<!-- wp:sgs/form-field-consent {"label":"I agree to the privacy policy and consent to being contacted about my enquiry.","required":true} /-->
<!-- /wp:sgs/form -->',
		]
	);

	// ── f) Team Grid ──────────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/team-grid',
		[
			'title'      => __( 'Team Grid', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'A 2×2 grid showcasing four team members.', 'sgs-blocks' ),
			'content'    => '<!-- wp:heading {"level":2,"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Meet the Team</h2>
<!-- /wp:heading -->

<!-- wp:columns {"isStackedOnMobile":true} -->
<div class="wp-block-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/team-member {"name":"Alex Turner","role":"Founder & Creative Director","bio":"Alex leads the studio\'s creative vision with 12 years of brand and digital experience across finance, retail, and hospitality sectors."} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/team-member {"name":"Fatima Hassan","role":"Head of Strategy","bio":"Fatima shapes every client engagement from discovery to delivery, ensuring projects stay aligned with business objectives."} /-->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->

<!-- wp:columns {"isStackedOnMobile":true} -->
<div class="wp-block-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/team-member {"name":"Daniel Park","role":"Lead Developer","bio":"Daniel architects the technical solutions behind our builds, specialising in WordPress, performance, and accessibility."} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/team-member {"name":"Chloe Davies","role":"UX Designer","bio":"Chloe crafts the interfaces our users love — combining research, wireframing, and prototyping to create intuitive digital experiences."} /-->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->',
		]
	);

	// ── g) Trust Strip ────────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/trust-strip',
		[
			'title'      => __( 'Trust Strip', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Trust bar with social proof stats stacked above a brand logo strip.', 'sgs-blocks' ),
			'content'    => '<!-- wp:sgs/trust-bar {"items":[{"number":"500+","label":"Clients Served"},{"number":"98%","label":"Satisfaction Rate"},{"number":"12","label":"Years in Business"},{"number":"£12M+","label":"Revenue Generated"}]} /-->

<!-- wp:sgs/brand-strip {"label":"Trusted by leading brands","speed":40} /-->',
		]
	);

	// ── h) FAQ Section ────────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/faq-section',
		[
			'title'      => __( 'FAQ Section', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Accordion FAQ with five pre-filled questions and answers.', 'sgs-blocks' ),
			'content'    => '<!-- wp:heading {"level":2,"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Frequently Asked Questions</h2>
<!-- /wp:heading -->

<!-- wp:sgs/accordion -->
<!-- wp:sgs/accordion-item {"title":"How long does a typical project take?"} -->
<!-- wp:paragraph -->
<p>Project timelines vary depending on scope and complexity. A standard brochure website typically takes 6–8 weeks from kick-off to launch. Larger e-commerce or web application projects may take 12–16 weeks. We\'ll provide a detailed timeline during the proposal stage.</p>
<!-- /wp:paragraph -->
<!-- /wp:sgs/accordion-item -->

<!-- wp:sgs/accordion-item {"title":"What is included in your website packages?"} -->
<!-- wp:paragraph -->
<p>All our website packages include design, development, mobile optimisation, basic SEO setup, security hardening, and a 30-day post-launch support period. Content migration and copywriting can be added as optional extras.</p>
<!-- /wp:paragraph -->
<!-- /wp:sgs/accordion-item -->

<!-- wp:sgs/accordion-item {"title":"Do you provide ongoing support after launch?"} -->
<!-- wp:paragraph -->
<p>Yes — we offer monthly care plans that cover hosting, software updates, security monitoring, uptime checks, and a set number of development hours for changes and enhancements. Plans start from £99 per month.</p>
<!-- /wp:paragraph -->
<!-- /wp:sgs/accordion-item -->

<!-- wp:sgs/accordion-item {"title":"Can you work with our existing branding?"} -->
<!-- wp:paragraph -->
<p>Absolutely. We regularly work within established brand guidelines, translating logos, typefaces, colour palettes, and tone of voice into polished digital experiences. We can also help evolve your brand if required.</p>
<!-- /wp:paragraph -->
<!-- /wp:sgs/accordion-item -->

<!-- wp:sgs/accordion-item {"title":"How do we get started?"} -->
<!-- wp:paragraph -->
<p>Simply fill in our contact form or book a free 30-minute discovery call. We\'ll ask about your goals, timeline, and budget, then send you a tailored proposal within 48 hours.</p>
<!-- /wp:paragraph -->
<!-- /wp:sgs/accordion-item -->
<!-- /wp:sgs/accordion -->',
		]
	);

	// ── i) Process Flow ───────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/process-flow',
		[
			'title'      => __( 'Process Flow', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Four-step process section showing how you work with clients.', 'sgs-blocks' ),
			'content'    => '<!-- wp:heading {"level":2,"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">How We Work</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center">A clear, collaborative process — so you always know what\'s happening and why.</p>
<!-- /wp:paragraph -->

<!-- wp:sgs/process-steps {"steps":[{"number":"01","title":"Discovery","description":"We start with a deep-dive session to understand your business, audience, competitors, and goals. This shapes everything that follows."},{"number":"02","title":"Strategy & Design","description":"Our designers craft wireframes and visual concepts aligned to your brand. You review, feedback, and sign off before a single line of code is written."},{"number":"03","title":"Build & Test","description":"Our developers bring the approved designs to life — building a fast, accessible, and secure website tested across all major browsers and devices."},{"number":"04","title":"Launch & Grow","description":"We handle deployment, DNS migration, and post-launch monitoring. Then we stay with you — optimising, updating, and helping you grow."}]} /-->',
		]
	);

	// ── j) Feature Grid ──────────────────────────────────────────────────────
	register_block_pattern(
		'sgs-blocks/feature-grid',
		[
			'title'      => __( 'Feature Grid', 'sgs-blocks' ),
			'categories' => [ 'sgs-patterns' ],
			'description' => __( 'Three info-box cards with icons highlighting key service features.', 'sgs-blocks' ),
			'content'    => '<!-- wp:heading {"level":2,"textAlign":"center"} -->
<h2 class="wp-block-heading has-text-align-center">Why Choose Us</h2>
<!-- /wp:heading -->

<!-- wp:columns {"isStackedOnMobile":true} -->
<div class="wp-block-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"title":"Lightning Fast","icon":"zap","description":"Every site we build is performance-optimised from the ground up — targeting Core Web Vitals scores in the top 10% for your industry."} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"title":"Accessibility First","icon":"eye","description":"We design and build to WCAG 2.1 AA standards as standard, ensuring your site is usable by everyone and compliant with UK legislation."} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"title":"Built to Scale","icon":"trending-up","description":"Whether you\'re launching a startup or expanding an enterprise, our architecture scales with you — no painful rebuilds as you grow."} /-->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->',
		]
	);
}
