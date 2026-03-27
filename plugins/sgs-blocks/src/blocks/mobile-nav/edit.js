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
import { DesignTokenPicker } from '../../components';
import ColoursPanel from './ColoursPanel';
import NavigationPanel from './NavigationPanel';
import AnimationPanel from './AnimationPanel';

// ── Allowed inner blocks — no forms or layout blocks that break the drawer ──
const ALLOWED_BLOCKS = [
	'core/paragraph',
	'core/heading',
	'core/image',
	'core/buttons',
	'core/button',
	'sgs/info-box',
	'sgs/notice-banner',
	'sgs/whatsapp-cta',
	'sgs/icon-list',
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

export default function Edit( { attributes, setAttributes } ) {
	const {
		// Layout
		variant,
		breakpoint,
		drawerWidth,
		drawerMaxWidth,
		drawerPosition,
		// Header
		showLogo,
		logoMaxWidth,
		closeButtonSize,
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
		showTagline,
		taglineText,
		// Colours (existing tokens passed to picker)
		accentColour,
		dividerColour,
		// Advanced
		enableSwipe,
		showSearch,
		showAccountTray,
		desktopHamburger,
	} = attributes;

	const isSlideVariant = variant === 'slide-left' || variant === 'slide-right';

	const blockProps = useBlockProps( { className: 'sgs-mobile-nav-editor' } );

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
							<RangeControl
								label={ __( 'Drawer Width (%)', 'sgs-blocks' ) }
								help={ __( 'Percentage of viewport width. Slide variants only.', 'sgs-blocks' ) }
								value={ drawerWidth }
								min={ 60 }
								max={ 100 }
								step={ 5 }
								onChange={ ( value ) => setAttributes( { drawerWidth: value } ) }
							/>
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
						<NumberControl
							label={ __( 'Logo Max Width (px)', 'sgs-blocks' ) }
							value={ logoMaxWidth }
							min={ 60 }
							max={ 300 }
							step={ 10 }
							onChange={ ( value ) =>
								setAttributes( { logoMaxWidth: parseInt( value, 10 ) || 120 } )
							}
						/>
					) }
					<NumberControl
						label={ __( 'Close Button Size (px)', 'sgs-blocks' ) }
						help={ __( 'Minimum 44px required for WCAG touch target compliance.', 'sgs-blocks' ) }
						value={ closeButtonSize }
						min={ 44 }
						max={ 80 }
						step={ 2 }
						onChange={ ( value ) =>
							setAttributes( { closeButtonSize: Math.max( 44, parseInt( value, 10 ) || 48 ) } )
						}
					/>
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
							<TextControl
								label={ __( 'CTA Icon (Lucide slug)', 'sgs-blocks' ) }
								help={ __( 'e.g. arrow-right, star, shopping-cart', 'sgs-blocks' ) }
								value={ ctaIcon }
								placeholder="arrow-right"
								onChange={ ( value ) => setAttributes( { ctaIcon: value } ) }
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
							<TextControl
								label={ __( 'Secondary CTA Icon (Lucide slug)', 'sgs-blocks' ) }
								value={ secondaryCtaIcon }
								placeholder="phone"
								onChange={ ( value ) => setAttributes( { secondaryCtaIcon: value } ) }
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
						help={ __( 'Number from Business Details → WhatsApp.', 'sgs-blocks' ) }
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
							<NumberControl
								label={ __( 'Icon Size (px)', 'sgs-blocks' ) }
								help={ __( 'Minimum 44px for WCAG touch targets.', 'sgs-blocks' ) }
								value={ socialIconSize }
								min={ 44 }
								max={ 80 }
								step={ 2 }
								onChange={ ( value ) =>
									setAttributes( { socialIconSize: Math.max( 44, parseInt( value, 10 ) || 44 ) } )
								}
							/>
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

			{ /* ── Editor placeholder ────────────────────────────────────────── */ }
			<div { ...blockProps }>
				<div className="sgs-mobile-nav-editor__card">
					<div className="sgs-mobile-nav-editor__icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path
								d="M3 6h18M3 12h18M3 18h18"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</div>
					<div className="sgs-mobile-nav-editor__info">
						<strong>
							{ __( 'Mobile Navigation', 'sgs-blocks' ) }
						</strong>
						<span className="sgs-mobile-nav-editor__variant">
							{ VARIANT_OPTIONS.find( ( o ) => o.value === variant )?.label || variant }
						</span>
						<span className="sgs-mobile-nav-editor__note">
							{ __( 'Menu items read automatically from header navigation.', 'sgs-blocks' ) }
						</span>
					</div>
				</div>

				{ /* Custom content zone — drop blocks here to add promo content to the drawer */ }
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
