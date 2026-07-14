/**
 * SGS Mobile Navigation — editor component.
 *
 * Shows 8 inspector panels for the mobile navigation drawer.
 * An InnerBlocks area lets clients add custom content to the drawer
 * (promo banners, opening hours, notice banners, etc.).
 * The actual drawer renders on the frontend via render.php.
 * Template presets are registered as block patterns (PHP), not in the editor.
 *
 * Panel helpers:
 *   NavigationPanel — Panel 4 (font sizes, weights, dividers)
 *   ColoursPanel    — Panel 6 (17 colour token pickers, grouped)
 *   AnimationPanel  — Panel 7 (preset picker, stagger, backdrop)
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, InnerBlocks } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	TextControl,
	RangeControl,
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';
import { DesignTokenPicker, IconPicker, ResponsiveControl, ResponsiveBoxControl } from '../../components';
import ColoursPanel from './ColoursPanel';
import NavigationPanel from './NavigationPanel';
import AnimationPanel from './AnimationPanel';

// ── Allowed inner blocks — no forms or layout blocks that break the drawer ──
// sgs/business-info is included so contact/social items (FR-S9-8 move-to-drawer)
// can be PLACED here to render exclusively inside the drawer at the collapsed
// tier, while the header copy is hidden via per-tier visibility — the spec's
// place-then-toggle model, no magic "move" primitive.
const ALLOWED_BLOCKS = [
	'sgs/text',
	'sgs/heading',
	'sgs/media',
	'sgs/multi-button',
	'sgs/button',
	'sgs/info-box',
	'sgs/notice-banner',
	'sgs/whatsapp-cta',
	'sgs/icon-list',
	'sgs/business-info',
	'sgs/social-icons',
];

// ── Select options ──────────────────────────────────────────────────────────
const VARIANT_OPTIONS = [
	{ label: __( 'Full-Screen Overlay', 'sgs-blocks' ), value: 'overlay' },
	{ label: __( 'Slide from Left', 'sgs-blocks' ), value: 'slide-left' },
	{ label: __( 'Slide from Right', 'sgs-blocks' ), value: 'slide-right' },
	{ label: __( 'Bottom Sheet', 'sgs-blocks' ), value: 'bottom-sheet' },
];

const DRAWER_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
	{ label: __( 'Space Between', 'sgs-blocks' ), value: 'space-between' },
];

const CLOSE_BUTTON_STYLE_OPTIONS = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Square (8px radius)', 'sgs-blocks' ), value: 'square' },
	{ label: __( 'Plain (no background)', 'sgs-blocks' ), value: 'plain' },
];

const CTA_STYLE_OPTIONS = [
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
	{ label: __( 'Ghost', 'sgs-blocks' ), value: 'ghost' },
];

const CONTACT_DISPLAY_OPTIONS = [
	{ label: __( 'Icon Only', 'sgs-blocks' ), value: 'icon-only' },
	{ label: __( 'Icon + Text', 'sgs-blocks' ), value: 'icon-text' },
	{ label: __( 'Hidden', 'sgs-blocks' ), value: 'hidden' },
];

const SOCIAL_STYLE_OPTIONS = [
	{ label: __( 'Coloured Circles', 'sgs-blocks' ), value: 'coloured' },
	{ label: __( 'Plain Icons', 'sgs-blocks' ), value: 'plain' },
	{ label: __( 'Outline Circles', 'sgs-blocks' ), value: 'outline' },
];

// ── Fixed nav-line widths — no Math.random() to prevent re-render churn ──
const NAV_LINE_WIDTHS = [ '70%', '55%', '80%', '45%', '60%' ];

export default function Edit( { attributes, setAttributes } ) {
	const {
		// Layout
		variant,
		breakpoint,
		drawerWidth,
		drawerWidthMobile,
		drawerWidthTablet,
		drawerMaxWidth,
		drawerPosition,
		// Header
		showLogo,
		logoMaxWidth,
		logoMaxWidthMobile,
		logoMaxWidthTablet,
		closeButtonSize,
		closeButtonSizeMobile,
		closeButtonSizeTablet,
		closeButtonStyle,
		// CTA
		showCta,
		ctaText,
		ctaUrl,
		ctaIcon,
		ctaStyle,
		showSecondaryCta,
		secondaryCtaText,
		secondaryCtaUrl,
		secondaryCtaIcon,
		secondaryCtaStyle,
		contactDisplayMode,
		showWhatsApp,
		// Social & Trust
		showSocials,
		socialStyle,
		socialIconSize,
		socialIconSizeMobile,
		socialIconSizeTablet,
		showTagline,
		taglineText,
		// Colours (tokens passed to picker + used in preview)
		accentColour,
		dividerColour,
		drawerBg,
		// Advanced
		enableSwipe,
		showSearch,
		showAccountTray,
		desktopHamburger,
	} = attributes;


	const isSlideVariant = variant === 'slide-left' || variant === 'slide-right';

	const blockProps = useBlockProps( { className: 'sgs-mobile-nav-editor' } );

	// ── Preview colour helpers ────────────────────────────────────────────────
	// Resolve a token slug to a CSS var reference for use in inline styles.
	const tokenVar = ( slug, fallback ) =>
		slug ? `var(--wp--preset--color--${ slug }, ${ fallback })` : fallback;

	const drawerBgColour = tokenVar( drawerBg || 'primary-dark', '#075e80' );
	const accentCssVar   = tokenVar( accentColour || 'accent', '#f87a1f' );

	// CTA inline styles driven by ctaStyle attribute.
	const ctaPreviewStyle = {
		padding: '10px 20px',
		borderRadius: '50px',
		textAlign: 'center',
		fontWeight: '600',
		fontSize: '14px',
		cursor: 'default',
		background:
			ctaStyle === 'filled' ? accentCssVar : 'transparent',
		border:
			ctaStyle === 'outline'
				? `2px solid ${ accentCssVar }`
				: ctaStyle === 'ghost'
				? 'none'
				: 'none',
		color: ctaStyle === 'filled' ? '#fff' : accentCssVar,
	};

	// Close button border-radius driven by closeButtonStyle attribute.
	const closeButtonRadius =
		closeButtonStyle === 'circle'
			? '50%'
			: closeButtonStyle === 'square'
			? '8px'
			: '0';

	const closeButtonBg =
		closeButtonStyle === 'plain' ? 'transparent' : 'rgba(255,255,255,0.15)';

	return (
		<>
			<InspectorControls>

				{ /* ── Panel 1: Layout (initially open) ── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Drawer Style', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( value ) => setAttributes( { variant: value } ) }
					/>
					<NumberControl
						label={ __( 'Breakpoint (px)', 'sgs-blocks' ) }
						help={ __( 'Drawer shows below this viewport width.', 'sgs-blocks' ) }
						value={ breakpoint }
						min={ 480 }
						max={ 1440 }
						step={ 1 }
						onChange={ ( value ) =>
							setAttributes( { breakpoint: parseInt( value, 10 ) || 1024 } )
						}
					/>
					{ isSlideVariant && (
						<>
							<ResponsiveControl label={ __( 'Drawer Width (%)', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrMap = {
										desktop: 'drawerWidth',
										tablet:  'drawerWidthTablet',
										mobile:  'drawerWidthMobile',
									};
									const attr = attrMap[ breakpoint ];
									const val = breakpoint === 'desktop'
										? drawerWidth
										: ( attributes[ attr ] === '' ? 60 : parseInt( attributes[ attr ], 10 ) );
									return (
										<RangeControl
											help={ breakpoint === 'desktop'
												? __( 'Percentage of viewport width. Slide variants only.', 'sgs-blocks' )
												: __( 'Override for this breakpoint. Set to 60 to use base value.', 'sgs-blocks' ) }
											value={ val }
											min={ 60 }
											max={ 100 }
											step={ 5 }
											onChange={ ( value ) => {
												if ( breakpoint === 'desktop' ) {
													setAttributes( { drawerWidth: value } );
												} else {
													setAttributes( { [ attr ]: value === 60 ? '' : String( value ) } );
												}
											} }
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
							<NumberControl
								label={ __( 'Max Width (px)', 'sgs-blocks' ) }
								help={ __( 'Prevents the drawer exceeding this width on large viewports.', 'sgs-blocks' ) }
								value={ drawerMaxWidth }
								min={ 240 }
								max={ 800 }
								step={ 10 }
								onChange={ ( value ) =>
									setAttributes( { drawerMaxWidth: parseInt( value, 10 ) || 400 } )
								}
							/>
						</>
					) }
					<SelectControl
						label={ __( 'Content Alignment', 'sgs-blocks' ) }
						help={ __( 'How content zones are distributed vertically inside the drawer.', 'sgs-blocks' ) }
						value={ drawerPosition }
						options={ DRAWER_POSITION_OPTIONS }
						onChange={ ( value ) => setAttributes( { drawerPosition: value } ) }
					/>
					{ /* Drawer inner padding — WP-native style.spacing.padding base tier
					     (skip-serialised, rendered scoped in render.php) + SGS
					     paddingTablet/paddingMobile object tiers. */ }
					<ResponsiveBoxControl
						label={ __( 'Drawer Padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, padding: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'paddingTablet' : 'paddingMobile' ]: next,
								} );
							}
						} }
					/>
				</PanelBody>

				{ /* ── Panel 2: Header (initially open) ── */ }
				<PanelBody title={ __( 'Header', 'sgs-blocks' ) } initialOpen={ true }>
					<ToggleControl
						label={ __( 'Show Logo', 'sgs-blocks' ) }
						help={ __( 'Falls back to site name text if no logo is set.', 'sgs-blocks' ) }
						checked={ showLogo }
						onChange={ ( value ) => setAttributes( { showLogo: value } ) }
					/>
					{ showLogo && (
						<>
							<ResponsiveControl label={ __( 'Logo Max Width (px)', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrMap = {
										desktop: 'logoMaxWidth',
										tablet:  'logoMaxWidthTablet',
										mobile:  'logoMaxWidthMobile',
									};
									const attr = attrMap[ breakpoint ];
									return (
										<NumberControl
											help={ breakpoint !== 'desktop'
												? __( 'Leave blank to use base value.', 'sgs-blocks' )
												: undefined }
											value={ breakpoint === 'desktop' ? logoMaxWidth : attributes[ attr ] }
											min={ breakpoint === 'desktop' ? 60 : 40 }
											max={ 300 }
											step={ 10 }
											placeholder={ breakpoint !== 'desktop' ? '—' : undefined }
											onChange={ ( value ) => {
												if ( breakpoint === 'desktop' ) {
													setAttributes( { logoMaxWidth: parseInt( value, 10 ) || 120 } );
												} else {
													setAttributes( { [ attr ]: value === undefined || value === '' ? '' : String( parseInt( value, 10 ) || '' ) } );
												}
											} }
										/>
									);
								} }
							</ResponsiveControl>
						</>
					) }
					<ResponsiveControl label={ __( 'Close Button Size (px)', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'closeButtonSize',
								tablet:  'closeButtonSizeTablet',
								mobile:  'closeButtonSizeMobile',
							};
							const attr = attrMap[ breakpoint ];
							return (
								<NumberControl
									help={ breakpoint === 'desktop'
										? __( 'Minimum 44px required for WCAG touch target compliance.', 'sgs-blocks' )
										: __( 'Leave blank to use base value.', 'sgs-blocks' ) }
									value={ breakpoint === 'desktop' ? closeButtonSize : attributes[ attr ] }
									min={ 44 }
									max={ 80 }
									step={ 2 }
									placeholder={ breakpoint !== 'desktop' ? '—' : undefined }
									onChange={ ( value ) => {
										if ( breakpoint === 'desktop' ) {
											setAttributes( { closeButtonSize: Math.max( 44, parseInt( value, 10 ) || 48 ) } );
										} else {
											setAttributes( { [ attr ]: value === undefined || value === '' ? '' : String( Math.max( 44, parseInt( value, 10 ) || 44 ) ) } );
										}
									} }
								/>
							);
						} }
					</ResponsiveControl>
					<SelectControl
						label={ __( 'Close Button Style', 'sgs-blocks' ) }
						value={ closeButtonStyle }
						options={ CLOSE_BUTTON_STYLE_OPTIONS }
						onChange={ ( value ) => setAttributes( { closeButtonStyle: value } ) }
					/>
				</PanelBody>

				{ /* ── Panel 3: Call to Action (collapsed) ── */ }
				<PanelBody
					title={ __( 'Call to Action', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show Primary CTA', 'sgs-blocks' ) }
						checked={ showCta }
						onChange={ ( value ) => setAttributes( { showCta: value } ) }
					/>
					{ showCta && (
						<>
							<TextControl
								label={ __( 'CTA Text', 'sgs-blocks' ) }
								value={ ctaText }
								placeholder={ __( 'Apply Now', 'sgs-blocks' ) }
								onChange={ ( value ) => setAttributes( { ctaText: value } ) }
							/>
							<TextControl
								label={ __( 'CTA URL', 'sgs-blocks' ) }
								value={ ctaUrl }
								placeholder="/apply-for-trade-account/"
								onChange={ ( value ) => setAttributes( { ctaUrl: value } ) }
							/>
							<IconPicker
								label={ __( 'CTA Icon', 'sgs-blocks' ) }
								value={ ctaIcon ? { source: 'lucide', name: ctaIcon } : null }
								onChange={ ( val ) => setAttributes( { ctaIcon: val ? val.name : '' } ) }
							/>
							<SelectControl
								label={ __( 'CTA Style', 'sgs-blocks' ) }
								value={ ctaStyle }
								options={ CTA_STYLE_OPTIONS }
								onChange={ ( value ) => setAttributes( { ctaStyle: value } ) }
							/>
						</>
					) }
					<ToggleControl
						label={ __( 'Show Secondary CTA', 'sgs-blocks' ) }
						checked={ showSecondaryCta }
						onChange={ ( value ) => setAttributes( { showSecondaryCta: value } ) }
					/>
					{ showSecondaryCta && (
						<>
							<TextControl
								label={ __( 'Secondary CTA Text', 'sgs-blocks' ) }
								value={ secondaryCtaText }
								placeholder={ __( 'Call Us', 'sgs-blocks' ) }
								onChange={ ( value ) => setAttributes( { secondaryCtaText: value } ) }
							/>
							<TextControl
								label={ __( 'Secondary CTA URL', 'sgs-blocks' ) }
								value={ secondaryCtaUrl }
								placeholder="tel:+441234567890"
								onChange={ ( value ) => setAttributes( { secondaryCtaUrl: value } ) }
							/>
							<IconPicker
								label={ __( 'Secondary CTA Icon', 'sgs-blocks' ) }
								value={ secondaryCtaIcon ? { source: 'lucide', name: secondaryCtaIcon } : null }
								onChange={ ( val ) => setAttributes( { secondaryCtaIcon: val ? val.name : '' } ) }
							/>
							<SelectControl
								label={ __( 'Secondary CTA Style', 'sgs-blocks' ) }
								value={ secondaryCtaStyle }
								options={ CTA_STYLE_OPTIONS }
								onChange={ ( value ) => setAttributes( { secondaryCtaStyle: value } ) }
							/>
						</>
					) }
					<SelectControl
						label={ __( 'Contact Shortcuts Display', 'sgs-blocks' ) }
						help={ __( 'Phone and email from Business Details settings.', 'sgs-blocks' ) }
						value={ contactDisplayMode }
						options={ CONTACT_DISPLAY_OPTIONS }
						onChange={ ( value ) => setAttributes( { contactDisplayMode: value } ) }
					/>
					<ToggleControl
						label={ __( 'Show WhatsApp Button', 'sgs-blocks' ) }
						help={ __( 'Number from Business Details \u2192 WhatsApp.', 'sgs-blocks' ) }
						checked={ showWhatsApp }
						onChange={ ( value ) => setAttributes( { showWhatsApp: value } ) }
					/>
				</PanelBody>

				{ /* ── Panel 4: Navigation (collapsed) ── */ }
				<PanelBody
					title={ __( 'Navigation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<NavigationPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>

				{ /* ── Panel 5: Social & Trust (collapsed) ── */ }
				<PanelBody
					title={ __( 'Social & Trust', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show Social Links', 'sgs-blocks' ) }
						help={ __( 'URLs from Business Details settings.', 'sgs-blocks' ) }
						checked={ showSocials }
						onChange={ ( value ) => setAttributes( { showSocials: value } ) }
					/>
					{ showSocials && (
						<>
							<SelectControl
								label={ __( 'Icon Style', 'sgs-blocks' ) }
								value={ socialStyle }
								options={ SOCIAL_STYLE_OPTIONS }
								onChange={ ( value ) => setAttributes( { socialStyle: value } ) }
							/>
							<ResponsiveControl label={ __( 'Icon Size (px)', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrMap = {
										desktop: 'socialIconSize',
										tablet:  'socialIconSizeTablet',
										mobile:  'socialIconSizeMobile',
									};
									const attr = attrMap[ breakpoint ];
									return (
										<NumberControl
											help={ breakpoint === 'desktop'
												? __( 'Minimum 44px for WCAG touch targets.', 'sgs-blocks' )
												: __( 'Leave blank to use base value.', 'sgs-blocks' ) }
											value={ breakpoint === 'desktop' ? socialIconSize : attributes[ attr ] }
											min={ 44 }
											max={ 80 }
											step={ 2 }
											placeholder={ breakpoint !== 'desktop' ? '—' : undefined }
											onChange={ ( value ) => {
												if ( breakpoint === 'desktop' ) {
													setAttributes( { socialIconSize: Math.max( 44, parseInt( value, 10 ) || 44 ) } );
												} else {
													setAttributes( { [ attr ]: value === undefined || value === '' ? '' : String( Math.max( 44, parseInt( value, 10 ) || 44 ) ) } );
												}
											} }
										/>
									);
								} }
							</ResponsiveControl>
						</>
					) }
					<ToggleControl
						label={ __( 'Show Trust Tagline', 'sgs-blocks' ) }
						help={ __( 'Short text below social icons. Falls back to the site tagline.', 'sgs-blocks' ) }
						checked={ showTagline }
						onChange={ ( value ) => setAttributes( { showTagline: value } ) }
					/>
					{ showTagline && (
						<TextControl
							label={ __( 'Tagline Text', 'sgs-blocks' ) }
							value={ taglineText }
							placeholder={ __( 'Trusted since 1962', 'sgs-blocks' ) }
							onChange={ ( value ) => setAttributes( { taglineText: value } ) }
						/>
					) }
				</PanelBody>

				{ /* ── Panel 6: Colours (collapsed) ── */ }
				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Accent Colour', 'sgs-blocks' ) }
						value={ accentColour }
						onChange={ ( value ) => setAttributes( { accentColour: value ?? 'primary' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Divider Colour', 'sgs-blocks' ) }
						value={ dividerColour }
						onChange={ ( value ) => setAttributes( { dividerColour: value ?? 'surface-alt' } ) }
					/>
					<ColoursPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>

				{ /* ── Panel 7: Animation (collapsed) ── */ }
				<PanelBody
					title={ __( 'Animation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<AnimationPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>

				{ /* ── Panel 8: Advanced (collapsed) ── */ }
				<PanelBody
					title={ __( 'Advanced', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Swipe to Close', 'sgs-blocks' ) }
						help={ __( 'Allows users to swipe the drawer closed on touch devices.', 'sgs-blocks' ) }
						checked={ enableSwipe }
						onChange={ ( value ) => setAttributes( { enableSwipe: value } ) }
					/>
					<ToggleControl
						label={ __( 'Search Bar', 'sgs-blocks' ) }
						checked={ showSearch }
						onChange={ ( value ) => setAttributes( { showSearch: value } ) }
					/>
					<ToggleControl
						label={ __( 'Account Tray (B2B)', 'sgs-blocks' ) }
						help={ __( 'Shows a greeting and account link for logged-in users.', 'sgs-blocks' ) }
						checked={ showAccountTray }
						onChange={ ( value ) => setAttributes( { showAccountTray: value } ) }
					/>
					<ToggleControl
						label={ __( 'Desktop Hamburger Mode', 'sgs-blocks' ) }
						help={ __( 'Show the hamburger menu on all screen sizes, replacing the desktop navigation bar.', 'sgs-blocks' ) }
						checked={ desktopHamburger }
						onChange={ ( value ) => setAttributes( { desktopHamburger: value } ) }
					/>
				</PanelBody>

			</InspectorControls>

			{ /* ── Editor canvas ───────────────────────────────────────────────── */ }
			<div { ...blockProps }>

				{ /* ── Drawer preview mockup ── */ }
				<div
					className="sgs-mobile-nav-preview"
					style={ {
						background: drawerBgColour,
						color: 'white',
						borderRadius: '12px',
						padding: '20px',
						minHeight: '300px',
						display: 'flex',
						flexDirection: 'column',
						gap: '16px',
						maxWidth: '320px',
					} }
					aria-hidden="true"
				>
					{ /* Zone 1: Header — logo placeholder + close button */ }
					<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
						{ showLogo && (
							<div
								style={ {
									width: ( logoMaxWidth || 120 ) + 'px',
									maxWidth: '160px',
									height: '24px',
									background: 'rgba(255,255,255,0.25)',
									borderRadius: '4px',
								} }
							/>
						) }
						<div
							style={ {
								width: ( closeButtonSize || 48 ) + 'px',
								height: ( closeButtonSize || 48 ) + 'px',
								borderRadius: closeButtonRadius,
								background: closeButtonBg,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: '0',
								marginLeft: 'auto',
							} }
						>
							<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
								<path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
							</svg>
						</div>
					</div>

					{ /* Zone 2: CTA */ }
					{ showCta && (
						<div style={ ctaPreviewStyle }>
							{ ctaText || __( 'Apply Now', 'sgs-blocks' ) }
						</div>
					) }

					{ /* Zone 3: Nav lines */ }
					<div style={ { flex: '1', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' } }>
						{ NAV_LINE_WIDTHS.map( ( width, i ) => (
							<div
								key={ i }
								style={ {
									height: '16px',
									background: 'rgba(255,255,255,0.18)',
									borderRadius: '4px',
									width,
								} }
							/>
						) ) }
					</div>

					{ /* Zone 4: Social icon circles */ }
					{ showSocials && (
						<div style={ { display: 'flex', gap: '8px', justifyContent: 'center', paddingTop: '4px' } }>
							{ [ 0, 1, 2, 3 ].map( ( i ) => (
								<div
									key={ i }
									style={ {
										width: '32px',
										height: '32px',
										borderRadius: '50%',
										background: 'rgba(255,255,255,0.2)',
									} }
								/>
							) ) }
						</div>
					) }
				</div>

				{ /* ── Custom content zone — drop blocks here to add promo content to the drawer ── */ }
				<div className="sgs-mobile-nav-editor__inner">
					<p className="sgs-mobile-nav-editor__inner-label">
						{ __( 'Custom drawer content (optional)', 'sgs-blocks' ) }
					</p>
					<InnerBlocks
						allowedBlocks={ ALLOWED_BLOCKS }
						orientation="vertical"
						renderAppender={ InnerBlocks.ButtonBlockAppender }
					/>
				</div>
			</div>
		</>
	);
}
