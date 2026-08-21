import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from 'react';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { PanelBody, Notice, SelectControl, BoxControl } from '@wordpress/components';
// No-inline migration (2026-08-05, D-pending): sgs/site-footer no longer uses
// <ContainerWrapperControls>'s ResponsiveSpacingPanel — its flat
// paddingTopTablet/…/marginLeftMobile attrs are LEGACY and became dead
// controls once paddingTablet/paddingMobile/marginTablet/marginMobile became
// box OBJECT attrs read by class-sgs-container-wrapper.php (matches
// sgs/container's + sgs/cta-section's own edit.js, which took the same
// approach). Roll this block's own "Padding & margin" panel below using
// ResponsiveBoxControl bound to the object attrs.
import {
	WidthPanel,
	BackgroundPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';
import { ResponsiveBoxControl, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsColourPanel } from '../../components';

const ALLOWED_BLOCKS = [ 'sgs/site-footer-row' ];

/**
 * ⛔ `templateMode` (the container-family allowed-children preset) was
 * declared in block.json but REMOVED (was never wired): this block's
 * allowedBlocks is ALREADY fixed to a single type — `sgs/site-footer-row` —
 * at the block.json level, enforced alongside a structural 3-row TEMPLATE
 * under `templateLock: 'all'` (see the seed-once guard below). Both
 * templateMode presets (grid-section/card-grid) list content blocks like
 * heading/text/button/info-box that this block can never accept anyway, so
 * neither preset could ever do anything. Same shape as physics-canvas: no
 * room for a variable content-type restriction on a block already locked to
 * one child type. Do not re-add templateMode here.
 */

/**
 * Compute WCAG 2.1 relative luminance from an sRGB hex, RGB, or CSS variable colour.
 * Mirrors the PHP sgs_wcag_relative_luminance() algorithm.
 *
 * @param {string} hex Colour: '#f3e5ab', 'rgb(243,229,171)', or 'var(--wp--preset--color--primary)'
 * @param {HTMLElement} refEl Reference element for computing CSS variables (optional)
 * @return {number} Relative luminance in [0.0, 1.0], or -1.0 on failure
 */
function calculateRelativeLuminance( hex, refEl = null ) {
	// Handle CSS variables: resolve via computed style on a probe element
	if ( /^var\(/i.test( hex ) ) {
		if ( ! refEl ) return -1.0;
		const probe = document.createElement( 'div' );
		probe.style.color = hex;
		refEl.appendChild( probe );
		const resolved = getComputedStyle( probe ).color;
		refEl.removeChild( probe );
		hex = resolved;
	}

	// Handle rgb() or rgba() — extract the numeric channels
	const rgbMatch = hex.match( /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/ );
	if ( rgbMatch ) {
		const r = parseInt( rgbMatch[ 1 ], 10 ) / 255.0;
		const g = parseInt( rgbMatch[ 2 ], 10 ) / 255.0;
		const b = parseInt( rgbMatch[ 3 ], 10 ) / 255.0;

		const linearise = ( c ) =>
			c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );

		return 0.2126 * linearise( r ) + 0.7152 * linearise( g ) + 0.0722 * linearise( b );
	}

	// Handle hex: normalise, expand shorthand, parse
	hex = hex.replace( /^#/, '' ).toUpperCase();
	if ( hex.length === 3 ) {
		hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ];
	}
	if ( hex.length !== 6 || ! /^[0-9A-F]+$/.test( hex ) ) {
		return -1.0;
	}

	const r = parseInt( hex.substr( 0, 2 ), 16 ) / 255.0;
	const g = parseInt( hex.substr( 2, 2 ), 16 ) / 255.0;
	const b = parseInt( hex.substr( 4, 2 ), 16 ) / 255.0;

	const linearise = ( c ) =>
		c <= 0.03928 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 );

	return 0.2126 * linearise( r ) + 0.7152 * linearise( g ) + 0.0722 * linearise( b );
}

/**
 * Calculate WCAG 2.1 contrast ratio between two luminance values.
 *
 * @param {number} l1 Luminance of first colour
 * @param {number} l2 Luminance of second colour
 * @return {number} Contrast ratio, or -1 on invalid input
 */
function calculateContrastRatio( l1, l2 ) {
	if ( l1 < 0 || l2 < 0 ) return -1;
	const lighter = Math.max( l1, l2 );
	const darker = Math.min( l1, l2 );
	return ( lighter + 0.05 ) / ( darker + 0.05 );
}

/**
 * Determine if contrast meets WCAG 2.1 AA thresholds.
 *
 * @param {number} ratio Contrast ratio
 * @param {boolean} isLargeText True if text is 18px+ or 14px+ bold
 * @return {boolean} True if contrast meets AA standard
 */
function meetsWCAG_AA( ratio, isLargeText = false ) {
	if ( ratio < 0 ) return false;
	return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

// Three rows matching the draft `.mm-footer`: an optional top strip (CTA /
// newsletter, empty by default → zero output), a columns grid (brand + link
// groups, collapsing to 1 column below 768), and a centred bottom bar. Every
// business-data field (tagline/socials/copyright) uses the sgs/business-info
// block, which reads live from Business Details (no hardcoded client data, no
// per-field bindings — Spec 37 FR-37-17 / §3.7, FR-S4-5). Generic link labels are not personal data.
const TEMPLATE = [
	[ 'sgs/site-footer-row', { rowSlot: 'top', layout: 'flex' } ],
	[
		'sgs/site-footer-row',
		{
			rowSlot: 'columns',
			layout: 'grid',
			// Columns are an operator-set COUNT (Spec 37 §3.3, Bean-locked): the
			// shared wrapper reads columns as a TIER OBJECT (Spec 35 pass 4,
			// class-sgs-container-wrapper.php) and stacks to the mobile tier's
			// count below 768. No gridTemplateColumns object is seeded — an
			// object there would flip $object_grid true and suppress the count
			// path. A per-device custom template stays available as an advanced
			// override (set gridTemplateColumns explicitly), never the default.
			// ⛔ Do NOT seed columns/columnsTablet/columnsMobile as flat siblings
			// here — sgs/site-footer-row's block.json no longer declares them
			// (Spec 35 pass 4), so WordPress would silently discard the seed
			// (D338/D563 bug class).
			columns: { desktop: 3, tablet: 3, mobile: 1 },
			// gap is a {desktop,tablet,mobile} object attr — a flat string would
			// be coerced to the block.json default at render (D328).
			gap: { desktop: '48px', mobile: '32px' },
		},
		[
			// Column 1 — brand: logo + tagline + socials from Business Details.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__brand', layout: { type: 'constrained' } },
				[
					[ 'sgs/responsive-logo', { width: 160, linkToHome: true } ],
					[ 'sgs/business-info', { displayType: 'description' } ],
					[ 'sgs/business-info', { displayType: 'socials' } ],
				],
			],
			// Column 2 — Shop links.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'sgs/heading', { level: 2 } ],
						[
							'sgs/text',
							{},
						],
				],
			],
			// Column 3 — Legal links.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'sgs/heading', { level: 2 } ],
						[
							'sgs/text',
							{},
						],
				],
			],
		],
	],
	[
		'sgs/site-footer-row',
		// Shapes here are NOT free-form — they mirror framework-footer-default.php's
		// bottom row exactly, because site-footer-row declares gap/padding/margin as
		// OBJECT attrs. A flat value (gap:'8px') or a missing tier (padding:{top})
		// is silently COERCED to the block.json default at render — no error, no test
		// failure, just the wrong spacing (D328). `border` is a SUPPORT, not an attr,
		// so it must live under `style`, or WP discards it as an unknown attribute.
		{
			rowSlot: 'bottom',
			layout: 'flex',
			justifyContent: 'center',
			gap: { desktop: '8px' },
			padding: {
				desktop: {
					top: 'var(--wp--preset--spacing--40)',
					bottom: 'var(--wp--preset--spacing--40)',
				},
			},
			margin: { desktop: { top: 'var(--wp--preset--spacing--50)' } },
			style: { border: { top: { color: 'var:preset|color|accent', width: '1px' } } },
		},
		[
			[ 'sgs/business-info', { displayType: 'copyright' } ],
		],
	],
];

export default function Edit( { attributes, setAttributes, clientId, name } ) {
	const blockProps = useBlockProps( { className: 'sgs-site-footer' } );
	const refEl = useRef( null );

	// SGS-owned colour (D294/D684 pattern, mirrors sgs/site-header's already-
	// migrated shape) — supports.color sub-flags are false so WordPress
	// generates no native colour UI; these two attribute pairs (background +
	// text, each with a gradient sibling and a hover state) are the ONLY
	// colour surface for this block now.
	const {
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
	} = attributes;

	// ⛔ Seed the three rows ONLY into a genuinely EMPTY container.
	//
	// WP core re-applies a block's template on EVERY mount when templateLock is
	// 'all' or 'contentOnly' — NOT only when the block is empty. Verified against
	// WP 7.0.2 source, wp-includes/js/dist/block-editor.js (useInnerBlockTemplateSync):
	//     shouldApplyTemplate = currentInnerBlocks.length === 0
	//         || templateLock === 'all' || templateLock === 'contentOnly'
	// and synchronizeBlocksWithTemplate (wp-includes/js/dist/blocks.js) then matches
	// existing rows by ARRAY POSITION alone — `blocks[index]` with a name-only
	// compare. `rowSlot` is never consulted, so row 1 is treated as "the top row"
	// whatever it actually is.
	//
	// Passing TEMPLATE unconditionally therefore overwrote every inserted starter
	// pattern: measured on the canary, 8/8 footer starters were corrupted (the
	// framework default included) — and it DESTROYED content, not just added it:
	// footer-centred's bottom row lost its copyright line, replaced by this
	// TEMPLATE's three empty link columns. It also fired on every re-open, so an
	// insert-only patch would not have held.
	//
	// Withholding the template is a true no-op in core — synchronizeBlocksWithTemplate
	// opens with `if (!template) return blocks;` — so the row LOCK below is
	// untouched: templateLock still governs add / remove / reorder.
	//
	// Latched on first render so the template's identity never changes mid-life.
	const innerBlockCount = useSelect(
		( select ) => select( blockEditorStore ).getBlocks( clientId ).length,
		[ clientId ]
	);
	const seedTemplateRef = useRef( null );
	if ( seedTemplateRef.current === null ) {
		seedTemplateRef.current = innerBlockCount === 0;
	}

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: seedTemplateRef.current ? TEMPLATE : undefined,
		// Fixed rows: operators can't add, remove, or reorder rows, but can fully
		// edit the elements inside each row (the rows set their own
		// templateLock:false). Note: 'insert' only blocks add/remove — it still
		// permits dragging rows into a different order, so 'all' is required here.
		templateLock: 'all',
		orientation: 'vertical',
	} );

	const { style } = attributes;

	// Check contrast ratio on attribute changes
	const [ contrastNotice, setContrastNotice ] = useState( null );

	useEffect( () => {
		if ( ! style?.color?.background || ! style?.color?.text ) {
			setContrastNotice( null );
			return;
		}

		const bgLuminance = calculateRelativeLuminance(
			style.color.background,
			refEl.current
		);
		const textLuminance = calculateRelativeLuminance(
			style.color.text,
			refEl.current
		);

		const ratio = calculateContrastRatio( bgLuminance, textLuminance );

		// Check both normal text (4.5:1) and large text (3:1) — use the stricter threshold
		if ( ! meetsWCAG_AA( ratio, false ) ) {
			setContrastNotice(
				__( 'This text colour may be hard to read on this background. Consider adjusting the colour for better readability.', 'sgs-blocks' )
			);
		} else {
			setContrastNotice( null );
		}
	}, [ style?.color?.background, style?.color?.text ] );

	return (
		<>
			{ /* D294/D684 — ONE grouped, SGS-OWNED colour panel, rendered FIRST
			     (before any other same-group InspectorControls Fill) so it sits
			     at the top of the Styles tab. Replaces the native supports.color
			     UI (now fully disabled — supports.color sub-flags are false). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) => setAttributes( { textColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>

			{ /* Background renders in the STYLES tab, not Settings (standardised
			     2026-08-16, Bean-ruled). Same shared panel, same tab, on every
			     wrapper block — it used to land in Settings here and in Styles on
			     cta-section/hero, so the client found it in a different place
			     depending on which block they had selected. Appearance sits with
			     colour, which D621/D622 already placed in Styles. */ }
			<InspectorControls group="styles">
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />
			</InspectorControls>

			<InspectorControls>
				{ contrastNotice && (
					<Notice
						status="warning"
						isDismissible={ false }
						className="sgs-contrast-notice"
					>
						{ contrastNotice }
					</Notice>
				) }
				<PanelBody title={ __( 'Footer width', 'sgs-blocks' ) }>
					<WidthPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveOverride
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								label={ __( 'Min height', 'sgs-blocks' ) }
								value={ ownValue || '' }
								options={ MIN_HEIGHT_OPTIONS }
								onChange={ ( val ) => setOwnValue( val || undefined ) }
								help={ tier === 'desktop'
									? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
									: undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* Responsive spacing (padding + margin) — box-object interface
				     contract (.claude/plans/2026-07-09-box-object-interface-contract.md
				     §5). Base tier writes to the WP-native style.spacing object (also
				     visible in the Styles > Dimensions panel); tablet/mobile write to
				     the paddingTablet/paddingMobile and marginTablet/marginMobile
				     object attrs read by the wrapper's @media tiers. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
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
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, margin: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'marginTablet' : 'marginMobile' ]: next,
								} );
							}
						} }
					/>
				</PanelBody>

				{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
				     {desktop,tablet,mobile}, each tier itself a {top,right,bottom,left}
				     box (Spec 35 box-shaped pass, 2026-08-11). It therefore uses
				     ResponsiveOverride, which reads and writes the object, NOT the
				     flat-sibling ResponsiveBoxControl. Mirrors container's own
				     implementation. */ }
				<PanelBody title={ __( 'Band padding', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.contentBandPadding }
						onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<BoxControl
								label={ __( 'Band padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								splitOnAxis={ false }
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			<div ref={ refEl } { ...innerBlocksProps } />
		</>
	);
}
