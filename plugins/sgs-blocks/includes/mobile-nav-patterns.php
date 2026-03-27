<?php
/**
 * Block patterns for the sgs/mobile-nav block.
 *
 * Registers 6 preset configurations as native WordPress block patterns so they
 * appear in the block inserter pattern library. Replaces the JS TemplateSelector
 * component, which used a custom card grid inside the inspector panel.
 *
 * Each pattern is a single self-closing sgs/mobile-nav block comment with the
 * relevant attributes serialised as JSON. WordPress inserts this as a configured
 * block with no inner content.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register all mobile-nav block patterns and the sgs-navigation category.
 *
 * Hooked to 'init' from sgs-blocks.php.
 *
 * @return void
 */
function sgs_register_mobile_nav_patterns(): void {

	// Register the pattern category if not already present.
	register_block_pattern_category(
		'sgs-navigation',
		array(
			'label' => __( 'SGS Navigation', 'sgs-blocks' ),
		)
	);

	$patterns = array(

		// 1. Default: full-screen overlay, accent CTA, social icons, no logo.
		'mobile-nav-default'       => array(
			'title'       => __( 'Mobile Nav: Default', 'sgs-blocks' ),
			'description' => __( 'Full-screen overlay drawer with accent CTA and social icons.', 'sgs-blocks' ),
			'content'     => '<!-- wp:sgs/mobile-nav '
				. '{"variant":"overlay","showCta":true,"showSocials":true,'
				. '"showLogo":false,"showTagline":false,"animationPreset":"spring"}'
				. ' /-->',
		),

		// 2. E-commerce: slide-right, search, account tray, WhatsApp, icon+text contacts.
		'mobile-nav-ecommerce'     => array(
			'title'       => __( 'Mobile Nav: E-commerce', 'sgs-blocks' ),
			'description' => __( 'Slide-right drawer with search, account tray, and WhatsApp shortcut.', 'sgs-blocks' ),
			'content'     => '<!-- wp:sgs/mobile-nav '
				. '{"variant":"slide-right","showCta":true,"ctaText":"Shop Now","ctaStyle":"filled",'
				. '"showSearch":true,"showAccountTray":true,"showWhatsApp":true,'
				. '"contactDisplayMode":"icon-text","showSocials":false,"animationPreset":"snappy"}'
				. ' /-->',
		),

		// 3. Restaurant: bottom sheet, logo, WhatsApp, booking CTA, ghost secondary.
		'mobile-nav-restaurant'    => array(
			'title'       => __( 'Mobile Nav: Restaurant', 'sgs-blocks' ),
			'description' => __( 'Bottom sheet drawer with logo, booking CTA, and call button.', 'sgs-blocks' ),
			'content'     => '<!-- wp:sgs/mobile-nav '
				. '{"variant":"bottom-sheet","showLogo":true,"logoMaxWidth":140,'
				. '"showCta":true,"ctaText":"Book a Table","ctaStyle":"filled",'
				. '"showSecondaryCta":true,"secondaryCtaText":"Call Us","secondaryCtaStyle":"ghost",'
				. '"showWhatsApp":true,"showTagline":true,"taglineText":"Open 7 days a week",'
				. '"drawerPosition":"space-between","animationPreset":"smooth"}'
				. ' /-->',
		),

		// 4. B2B Trade: overlay, trade CTA, call secondary, icon+text contacts, account tray.
		'mobile-nav-b2b-trade'     => array(
			'title'       => __( 'Mobile Nav: B2B Trade', 'sgs-blocks' ),
			'description' => __( 'Overlay drawer with trade account CTA, call shortcut, and account tray.', 'sgs-blocks' ),
			'content'     => '<!-- wp:sgs/mobile-nav '
				. '{"variant":"overlay","showCta":true,"ctaText":"Apply for Account",'
				. '"ctaUrl":"/apply-for-trade-account/","ctaStyle":"filled",'
				. '"showSecondaryCta":true,"secondaryCtaText":"Call Us","secondaryCtaStyle":"outline",'
				. '"contactDisplayMode":"icon-text","showAccountTray":true,'
				. '"showSocials":false,"animationPreset":"spring"}'
				. ' /-->',
		),

		// 5. Minimal: slide-left, no CTA, no socials, plain close, reduced stagger.
		'mobile-nav-minimal'       => array(
			'title'       => __( 'Mobile Nav: Minimal', 'sgs-blocks' ),
			'description' => __( 'Slide-left drawer with no CTA or social links. Clean and fast.', 'sgs-blocks' ),
			'content'     => '<!-- wp:sgs/mobile-nav '
				. '{"variant":"slide-left","showCta":false,"showSocials":false,'
				. '"showTagline":false,"showContactShortcuts":false,'
				. '"closeButtonStyle":"plain","staggerDelay":10,"animationPreset":"snappy"}'
				. ' /-->',
		),

		// 6. Brand Forward: overlay, large logo, centre-aligned, filled CTA, tagline.
		'mobile-nav-brand-forward' => array(
			'title'       => __( 'Mobile Nav: Brand Forward', 'sgs-blocks' ),
			'description' => __( 'Overlay drawer with large logo, centre alignment, and brand tagline.', 'sgs-blocks' ),
			'content'     => '<!-- wp:sgs/mobile-nav '
				. '{"variant":"overlay","showLogo":true,"logoMaxWidth":180,'
				. '"showCta":true,"ctaStyle":"filled","showSocials":true,'
				. '"showTagline":true,"drawerPosition":"centre","animationPreset":"smooth"}'
				. ' /-->',
		),

	);

	foreach ( $patterns as $name => $pattern ) {
		register_block_pattern(
			'sgs/' . $name,
			array_merge(
				$pattern,
				array(
					'categories' => array( 'sgs-navigation' ),
					'blockTypes' => array( 'sgs/mobile-nav' ),
					'inserter'   => true,
				)
			)
		);
	}
}
add_action( 'init', 'sgs_register_mobile_nav_patterns' );
