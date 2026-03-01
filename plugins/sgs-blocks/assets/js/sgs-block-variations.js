/**
 * SGS Block Variations
 *
 * Registers block variations for SGS Blocks — giving editors quick-start
 * presets for card-grid, hero, form, testimonial-slider, and pricing-table.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

const { registerBlockVariation } = wp.blocks;

// ── card-grid ──────────────────────────────────────────────────────────────

registerBlockVariation( 'sgs/card-grid', {
	name:        '2-column-cards',
	title:       '2 Column Cards',
	description: 'Card grid with 2 columns per row.',
	icon:        'grid-view',
	attributes:  {
		columns:       2,
		columnsMobile: 1,
	},
} );

registerBlockVariation( 'sgs/card-grid', {
	name:        '3-column-cards',
	title:       '3 Column Cards',
	description: 'Card grid with 3 columns per row (default).',
	icon:        'grid-view',
	isDefault:   true,
	attributes:  {
		columns:       3,
		columnsMobile: 1,
	},
} );

registerBlockVariation( 'sgs/card-grid', {
	name:        '4-column-cards',
	title:       '4 Column Cards',
	description: 'Card grid with 4 columns per row.',
	icon:        'grid-view',
	attributes:  {
		columns:       4,
		columnsMobile: 2,
	},
} );

// ── hero ──────────────────────────────────────────────────────────────────

registerBlockVariation( 'sgs/hero', {
	name:        'hero-with-cta',
	title:       'Hero with CTA Button',
	description: 'Standard hero with pre-filled primary and secondary CTA buttons.',
	icon:        'cover-image',
	attributes:  {
		variant:            'standard',
		alignment:          'left',
		ctaPrimaryText:     'Get Started',
		ctaPrimaryUrl:      '/contact',
		ctaPrimaryStyle:    'accent',
		ctaSecondaryText:   'Learn More',
		ctaSecondaryUrl:    '/about',
		ctaSecondaryStyle:  'outline',
	},
} );

registerBlockVariation( 'sgs/hero', {
	name:        'hero-video-background',
	title:       'Hero with Video Background',
	description: 'Hero with a looping video background and overlay.',
	icon:        'format-video',
	attributes:  {
		variant:        'video',
		alignment:      'center',
		overlayOpacity: 55,
	},
} );

registerBlockVariation( 'sgs/hero', {
	name:        'hero-minimal',
	title:       'Hero Minimal (text only)',
	description: 'Simple text-only hero — no background image or video.',
	icon:        'text',
	attributes:  {
		variant:   'standard',
		alignment: 'center',
	},
} );

// ── form ──────────────────────────────────────────────────────────────────

registerBlockVariation( 'sgs/form', {
	name:        'contact-form',
	title:       'Contact Form',
	description: 'Pre-populated contact form with name, email, phone, message, and consent.',
	icon:        'email',
	attributes:  {
		submitLabel:    'Send Message',
		successMessage: 'Thank you! We\'ll be in touch shortly.',
		storeSubmissions: true,
		honeypot:       true,
	},
	innerBlocks: [
		[ 'sgs/form-field-text',     { label: 'Full Name',       placeholder: 'e.g. Jane Smith',        required: true  } ],
		[ 'sgs/form-field-email',    { label: 'Email Address',   placeholder: 'jane@company.com',       required: true  } ],
		[ 'sgs/form-field-phone',    { label: 'Phone Number',    placeholder: '+44 7700 900000',        required: false } ],
		[ 'sgs/form-field-textarea', { label: 'Your Message',    placeholder: 'How can we help you?',   required: true, rows: 5 } ],
		[ 'sgs/form-field-consent',  { label: 'I agree to the privacy policy and consent to being contacted about my enquiry.', required: true } ],
	],
} );

registerBlockVariation( 'sgs/form', {
	name:        'newsletter-signup',
	title:       'Newsletter Signup',
	description: 'Simple newsletter signup with email and consent.',
	icon:        'megaphone',
	attributes:  {
		submitLabel:    'Subscribe',
		successMessage: 'You\'re subscribed! Check your inbox for a confirmation email.',
		storeSubmissions: true,
		honeypot:       true,
	},
	innerBlocks: [
		[ 'sgs/form-field-text',    { label: 'First Name',     placeholder: 'Your first name',      required: true  } ],
		[ 'sgs/form-field-email',   { label: 'Email Address',  placeholder: 'your@email.com',       required: true  } ],
		[ 'sgs/form-field-consent', { label: 'I\'d like to receive marketing emails and can unsubscribe at any time.', required: true } ],
	],
} );

registerBlockVariation( 'sgs/form', {
	name:        'quote-request',
	title:       'Quote Request',
	description: 'Quote request form with project details, budget, and timeline.',
	icon:        'clipboard',
	attributes:  {
		submitLabel:    'Request My Quote',
		successMessage: 'Thank you for your quote request! We\'ll send a proposal within 48 hours.',
		storeSubmissions: true,
		honeypot:       true,
	},
	innerBlocks: [
		[ 'sgs/form-field-text',     { label: 'Company Name',       placeholder: 'Your company name',         required: true  } ],
		[ 'sgs/form-field-text',     { label: 'Contact Name',       placeholder: 'Your full name',            required: true  } ],
		[ 'sgs/form-field-email',    { label: 'Email Address',      placeholder: 'contact@company.com',       required: true  } ],
		[ 'sgs/form-field-phone',    { label: 'Phone Number',       placeholder: '+44 7700 900000',           required: false } ],
		[ 'sgs/form-field-textarea', { label: 'Project Description', placeholder: 'Describe your project requirements, goals, and any key features needed.', required: true, rows: 5 } ],
		[ 'sgs/form-field-consent',  { label: 'I agree to the privacy policy and consent to being contacted about this quote.', required: true } ],
	],
} );

// ── testimonial-slider ────────────────────────────────────────────────────

registerBlockVariation( 'sgs/testimonial-slider', {
	name:        '3-testimonials',
	title:       '3 Testimonials',
	description: 'Testimonial slider pre-loaded with 3 testimonial cards.',
	icon:        'format-quote',
	isDefault:   true,
	attributes:  {
		slidesVisible: 1,
		showDots:      true,
		showArrows:    true,
		autoplay:      false,
		testimonials:  [
			{
				quote:  'Working with this team was an absolute pleasure. They understood our brand from day one and delivered a website that exceeded every expectation.',
				name:   'Sarah Mitchell',
				role:   'Marketing Director, Apex Solutions',
				rating: 5,
			},
			{
				quote:  'Professional, communicative, and genuinely talented. Our new site launched on time, on budget, and our conversion rate increased by 40% within 60 days.',
				name:   'James Okafor',
				role:   'CEO, NorthEdge Consulting',
				rating: 5,
			},
			{
				quote:  'The level of detail in both the design and the build was exceptional. Our team adopted the platform instantly — even the non-technical staff.',
				name:   'Priya Nair',
				role:   'Head of Operations, Clearwater Group',
				rating: 5,
			},
		],
	},
} );

registerBlockVariation( 'sgs/testimonial-slider', {
	name:        '5-testimonials',
	title:       '5 Testimonials',
	description: 'Testimonial slider pre-loaded with 5 testimonial cards.',
	icon:        'format-quote',
	attributes:  {
		slidesVisible: 1,
		showDots:      true,
		showArrows:    true,
		autoplay:      true,
		autoplaySpeed: 5000,
		testimonials:  [
			{
				quote:  'Working with this team was an absolute pleasure. They understood our brand from day one and delivered a website that exceeded every expectation.',
				name:   'Sarah Mitchell',
				role:   'Marketing Director, Apex Solutions',
				rating: 5,
			},
			{
				quote:  'Professional, communicative, and genuinely talented. Our new site launched on time, on budget, and our conversion rate increased by 40%.',
				name:   'James Okafor',
				role:   'CEO, NorthEdge Consulting',
				rating: 5,
			},
			{
				quote:  'The level of detail in both the design and the build was exceptional. Our team adopted the platform instantly — even the non-technical staff.',
				name:   'Priya Nair',
				role:   'Head of Operations, Clearwater Group',
				rating: 5,
			},
			{
				quote:  'From first call to final handover, every stage was smooth. The new site has completely transformed how we present ourselves to clients.',
				name:   'Tom Blackwell',
				role:   'Director, Blackwell & Associates',
				rating: 5,
			},
			{
				quote:  'We\'ve worked with several agencies over the years, but none have matched this level of quality and reliability. They\'re now our go-to partner.',
				name:   'Aisha Kamara',
				role:   'Founder, Roots & Routes',
				rating: 5,
			},
		],
	},
} );

// ── pricing-table ─────────────────────────────────────────────────────────

registerBlockVariation( 'sgs/pricing-table', {
	name:        'basic-pro-enterprise',
	title:       'Basic / Pro / Enterprise',
	description: 'Three-tier pricing layout with Starter, Professional, and Enterprise plans.',
	icon:        'money-alt',
	isDefault:   true,
	attributes:  {
		columns: 3,
		plans: [
			{
				title:    'Starter',
				price:    '£29',
				period:   'per month',
				features: [
					'Up to 5 users',
					'10 GB storage',
					'Email support',
					'Basic reporting',
					'API access',
				],
				ctaText: 'Get Started',
				ctaUrl:  '/signup',
				popular: false,
			},
			{
				title:    'Professional',
				price:    '£79',
				period:   'per month',
				features: [
					'Up to 25 users',
					'50 GB storage',
					'Priority support',
					'Advanced analytics',
					'Custom integrations',
					'Team dashboard',
				],
				ctaText: 'Start Free Trial',
				ctaUrl:  '/signup',
				popular: true,
			},
			{
				title:    'Enterprise',
				price:    'Custom',
				period:   '',
				features: [
					'Unlimited users',
					'Unlimited storage',
					'Dedicated account manager',
					'SLA guarantee',
					'SSO & SAML',
					'On-premise option',
				],
				ctaText: 'Contact Sales',
				ctaUrl:  '/contact',
				popular: false,
			},
		],
	},
} );
