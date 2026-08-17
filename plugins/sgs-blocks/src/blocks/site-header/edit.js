import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from 'react';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	PanelBody,
	SelectControl,
	Notice,
	BoxControl,
} from '@wordpress/components';
// No-inline migration (2026-08-05, D-pending): sgs/site-header no longer uses
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
import { ResponsiveTriStateControl, ResponsiveBoxControl, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { resolveTier } from '../../utils/responsive';

/**
 * Does a tri-state {desktop,tablet,mobile} behaviour object resolve 'on' at
 * ANY tier? Mirrors render.php's `sgs_resolve_on_tiers( $raw, 'on', 'off' )`
 * on the JS side, via the same shared `resolveTier()` cascade
 * (ResponsiveTriStateControl and the PHP resolver both already depend on the
 * identical inherit semantics — this just asks the question across all three
 * tiers instead of one).
 *
 * @param {Object} raw Tri-state value, e.g. `attributes.headerSticky`.
 * @return {boolean}
 */
function isOnAtAnyTier( raw ) {
	return [ 'desktop', 'tablet', 'mobile' ].some(
		( tier ) => resolveTier( raw, tier, 'off' ).value === 'on'
	);
}

// FR-37-28 — Layout preset (Centred / Split / Minimal). A preset is a
// convenience action that WRITES the block's EXISTING layout attributes
// (contentWidth + the native spacing.padding style attr) to a documented
// value set — it is never a new stored shape. No preset-name attribute is
// stored; the active preset (if any) is DERIVED from the current attribute
// values each render, so a hand-edited combination correctly shows no
// preset selected rather than lying about which preset produced it.
//
// Attrs available on sgs/site-header itself only (no row/nav-menu attrs —
// those live on sgs/site-header-row and are out of this block's scope):
//   contentWidth — 'normal' | 'wide' | 'full' | literal (content-band cap)
//   style.spacing.padding — native WP spacing support (top/right/bottom/left)
//
// Each preset ALSO re-aligns the primary (middle) row. The header's
// horizontal logo/nav alignment lives on the middle row's justifyContent,
// NOT on the container — so a preset that only set container width/padding
// couldn't actually re-align (the FR-37-28 depth gap). The Edit component
// looks up the middle row (rowSlot:'middle') and the preset writes its
// justifyContent (see PRESET_JUSTIFY) alongside the container attrs.
//
// Centred — content band capped to 'normal' (~1200px), default padding,
//   middle row centred (justifyContent:'center') so the logo/nav cluster
//   sits as a centred group.
// Split   — content band uncapped ('full', the block default), middle row
//   spread edge-to-edge (justifyContent:'space-between'): logo left,
//   nav/icons right. This is the fresh-insert default.
// Minimal — content band capped to 'normal', padding reduced to a slimmer
//   bar height, middle row still edge-to-edge — a stripped-back header.
const MINIMAL_PADDING = { top: '8px', right: '16px', bottom: '8px', left: '16px' };

// Middle-row justifyContent each preset writes (the alignment half of the
// preset). '' would render flex-start; these are the three deliberate looks.
const PRESET_JUSTIFY = {
	centred: 'center',
	split: 'space-between',
	minimal: 'space-between',
};

function paddingMatches( padding, target ) {
	if ( ! padding ) {
		return false;
	}
	return [ 'top', 'right', 'bottom', 'left' ].every(
		( side ) => padding[ side ] === target[ side ]
	);
}

/**
 * Derive which layout preset (if any) the CURRENT attribute values match.
 * Returns '' when the combination doesn't match a known preset exactly
 * (a hand-tuned/custom combination) — no preset button shows selected.
 *
 * A preset only shows selected when BOTH the container attrs AND the middle
 * row's alignment match it — so a hand-tuned combination (e.g. the right band
 * width but a manually re-aligned row) correctly shows no preset selected.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} rowJustify The middle row's justifyContent ('' if no middle row).
 * @return {string} 'centred' | 'split' | 'minimal' | ''
 */
function getActiveLayoutPreset( attributes, rowJustify = '' ) {
	const { contentWidth = 'full', style } = attributes;
	const padding = style?.spacing?.padding;

	if ( contentWidth === 'full' && ! padding && rowJustify === 'space-between' ) {
		return 'split';
	}
	if ( contentWidth === 'normal' ) {
		if (
			paddingMatches( padding, MINIMAL_PADDING ) &&
			rowJustify === 'space-between'
		) {
			return 'minimal';
		}
		if ( ! padding && rowJustify === 'center' ) {
			return 'centred';
		}
	}
	return '';
}

/**
 * Apply a layout preset by writing to existing attributes only: the
 * container's contentWidth + style.spacing.padding, AND the middle row's
 * justifyContent (the alignment half — see PRESET_JUSTIFY). Never a new
 * stored shape.
 *
 * @param {string}   value                 'centred' | 'split' | 'minimal'
 * @param {Object}   attributes            Current block attributes.
 * @param {Function} setAttributes         Block editor setAttributes.
 * @param {string}   [middleRowClientId]   clientId of the rowSlot:'middle' row, if any.
 * @param {Function} [updateBlockAttributes] core/block-editor updateBlockAttributes dispatch.
 */
function applyLayoutPreset(
	value,
	attributes,
	setAttributes,
	middleRowClientId,
	updateBlockAttributes
) {
	const { style = {} } = attributes;
	const { spacing = {}, ...restStyle } = style;
	const { padding, ...restSpacing } = spacing;
	const hasRestSpacing = Object.keys( restSpacing ).length > 0;

	if ( value === 'split' ) {
		// Split has no padding override — clear one if present so the
		// preset detector reads back 'split' cleanly.
		setAttributes( {
			contentWidth: 'full',
			style: {
				...restStyle,
				...( hasRestSpacing ? { spacing: restSpacing } : {} ),
			},
		} );
	} else if ( value === 'centred' ) {
		setAttributes( {
			contentWidth: 'normal',
			style: {
				...restStyle,
				...( hasRestSpacing ? { spacing: restSpacing } : {} ),
			},
		} );
	} else if ( value === 'minimal' ) {
		setAttributes( {
			contentWidth: 'normal',
			style: {
				...restStyle,
				spacing: {
					...restSpacing,
					padding: MINIMAL_PADDING,
				},
			},
		} );
	} else {
		return;
	}

	// Re-align the primary (middle) row to match the preset. This is what
	// makes Centred actually centre the logo/nav cluster (and Split/Minimal
	// spread it edge-to-edge) rather than only changing the band width.
	// No-op if the header has no middle row.
	if ( middleRowClientId && updateBlockAttributes ) {
		updateBlockAttributes( middleRowClientId, {
			justifyContent: PRESET_JUSTIFY[ value ],
		} );
	}
}

const CONTRAST_SAFE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Scrim overlay', 'sgs-blocks' ), value: 'scrim' },
	{
		label: __( 'Text shadow (not WCAG-safe)', 'sgs-blocks' ),
		value: 'shadow',
	},
	{ label: __( 'Force solid', 'sgs-blocks' ), value: 'force-solid' },
];

// `templateMode` (grid-section/card-grid presets) was removed from block.json —
// this block already restricts children to exactly `sgs/site-header-row` below,
// a more specific structural rule that a generic preset would only conflict
// with. See sgs/site-header-row for the block that actually wires templateMode.
const ALLOWED_BLOCKS = [ 'sgs/site-header-row' ];

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

// Three fixed rows. The middle row is pre-filled to match the current site
// header (logo + navigation + cart) so content parity holds on first insert.
// The mobile burger + drawer are owned entirely by sgs/nav-menu + sgs/nav-drawer
// (Spec 36 rebuild, FR-37-21 — sgs/adaptive-nav retired) — no separate toggle
// block. Top and bottom rows start empty and emit zero output until an
// operator adds elements (Spec 37 §3.4 empty-row-zero-output, verified FR-37-9).
const TEMPLATE = [
	[ 'sgs/site-header-row', { rowSlot: 'top' } ],
	[
		'sgs/site-header-row',
		{ rowSlot: 'middle', justifyContent: 'space-between' },
		[
			// Logo (left). SGS per-breakpoint logo block (falls back to the site
			// custom_logo when no per-breakpoint images set). Draft: logo | nav | icons.
			[ 'sgs/responsive-logo', { width: 180, linkToHome: true } ],
			// Primary nav (centre on desktop; hidden <768 → lives in the drawer).
			// sgs/nav-menu — matches the live header part / sgs_header CPT so a
			// fresh insert doesn't re-arm the WooCommerce mini-cart/customer-account
			// auto-injection that WC hooks onto core/navigation via Block Hooks
			// (FR-37-21: was sgs/adaptive-nav, now retired).
			[
				'sgs/nav-menu',
				{
					itemColour: 'text',
					gap: '28px',
				},
			],
			// Icons cluster (right): cart. Grouped so the row has exactly 3 flex
			// children → logo-left / nav-centre / icons-right. (The burger is no
			// longer listed here: sgs/nav-menu renders its own toggle, and opens
			// sgs/nav-drawer — a TEMPLATE entry for a deleted block would make
			// every FRESH header insert render an invalid-content placeholder.)
			//
			// sgs/container, NOT core/group: the DB (`blocks.replaces`) records
			// sgs/container as the replacement for core/group|core/columns|core/column,
			// and a replaced core block must never be used. Flat `layout`/`flexWrap`
			// strings are sgs/container's own attrs — NOT core/group's nested
			// `layout:{type,flexWrap}` object, which sgs/container does not read.
			[
				'sgs/container',
				{
					className: 'sgs-header-icons',
					layout: 'flex',
					flexWrap: 'nowrap',
				},
				[
					[ 'sgs/cart', {} ],
				],
			],
		],
	],
	[ 'sgs/site-header-row', { rowSlot: 'bottom' } ],
];

export default function Edit( { attributes, setAttributes, clientId, name } ) {
	const blockProps = useBlockProps( { className: 'sgs-site-header' } );
	const refEl = useRef( null );

	// FR-37-28 depth: the header's logo/nav alignment lives on the primary
	// (middle) row, not the container. Look it up so a layout preset can
	// re-align it. Re-runs when the middle row's justifyContent changes, so
	// the active-preset indicator stays honest against manual row edits.
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const middleRow = useSelect(
		( select ) => {
			const inner = select( blockEditorStore ).getBlocks( clientId );
			return (
				inner.find(
					( b ) =>
						b.name === 'sgs/site-header-row' &&
						b.attributes?.rowSlot === 'middle'
				) || null
			);
		},
		[ clientId ]
	);
	const middleRowClientId = middleRow?.clientId;
	const middleRowJustify = middleRow?.attributes?.justifyContent ?? '';

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
	// pattern: measured on the canary, 7/8 header and 8/8 footer starters were
	// corrupted — and it DESTROYED content, not just added it (the search-bar
	// starter lost its search bar; the centred footer lost its copyright line).
	// It also fired on every re-open, so an insert-only patch would not have held.
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
		// Fixed three rows: operators can't add, remove, or reorder rows, but can
		// fully edit the elements inside each row (the rows set their own
		// templateLock:false for their content). Note: 'insert' only blocks
		// add/remove — it still permits dragging rows into a different order,
		// so 'all' is required here.
		templateLock: 'all',
		orientation: 'vertical',
	} );

	const {
		headerSticky,
		headerTransparent,
		headerShrink,
		headerHideOnScroll,
		contrastSafe,
		style,
	} = attributes;

	// P-HEADER-SIMPLICITY-FINDINGS finding 2 follow-up (2026-08-13, Bean's
	// design note): Shrink on scroll is CONCEPTUALLY a sub-behaviour of
	// Sticky on scroll, not an independent toggle. Proven, not assumed:
	// render.php's shrink animation (`animation-timeline:
	// scroll(root block); animation-range: 0 200px`, render.php:238) and its
	// legacy `.is-header-shrunk` fallback both key off document scrollY —
	// NEITHER checks headerSticky. But a header that is not sticky/fixed
	// scrolls out of the viewport in normal document flow well before that
	// 200px range completes (the header's own rendered height is ~97px,
	// measured live on the sandybrown canary), and view.js's
	// `initScrollBehaviours()` toggles `is-header-shrunk` purely off
	// `window.scrollY > 50` (view.js:285) with no visibility/pinned check —
	// so a non-sticky header's shrink animation runs mostly (or entirely)
	// off-screen. The effect is real in code but invisible to the visitor
	// without Sticky, which is exactly Bean's framing. Hiding the control
	// until Sticky is on (rather than a flat ToolsPanel "+" disclosure
	// alongside it) stops a client enabling a setting that visibly does
	// nothing. Precedent for this shape: sgs/button's `edit.js` conditionally
	// renders its "Collapse label to icon" ToolsPanelItem on
	// `iconPosition !== 'only'` — same pattern, copied here.
	const isStickyOn = isOnAtAnyTier( headerSticky );

	// Contrast safety over hero is similarly a sub-behaviour, but of
	// TRANSPARENT, not Sticky — confirmed in
	// includes/class-sgs-header-behaviours.php:234-239, which auto-upgrades
	// `contrastSafe` from 'none' to 'scrim' whenever Transparent resolves on
	// at the desktop tier (a WCAG 1.4.3 safety net for exactly this
	// combination). The control only has a decision to make once Transparent
	// is on; hidden otherwise for the same reason Shrink is hidden until
	// Sticky is on.
	const isTransparentOn = isOnAtAnyTier( headerTransparent );

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
				{ /* P-HEADER-SIMPLICITY-FINDINGS finding 2 (2026-08-12): the Settings
				     tab previously always-showed 3 full panels here (Header width,
				     Padding & margin, Background) plus 4 more in "Header behaviour"
				     below — 7 default-visible controls against a target of 2.
				     "Header width" is the one layout choice most clients touch
				     (contained vs full-bleed), so it stays a plain always-visible
				     panel. Padding & margin (fine-tuning spacing) and Background
				     (image/video/SVG/overlay — a rich, situational panel) move
				     behind a ToolsPanel "+ Add" disclosure — still one click away,
				     never removed, just not shown until asked for. */ }
				<PanelBody title={ __( 'Header width', 'sgs-blocks' ) }>
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

				<ToolsPanel
					label={ __( 'Advanced layout', 'sgs-blocks' ) }
					resetAll={ () => {
						setAttributes( {
							style: {
								...attributes.style,
								spacing: {
									...attributes.style?.spacing,
									padding: undefined,
									margin: undefined,
								},
							},
							paddingTablet: {},
							paddingMobile: {},
							marginTablet: {},
							marginMobile: {},
							backgroundImage: undefined,
							backgroundImageTablet: undefined,
							backgroundImageMobile: undefined,
							backgroundOverlayColour: undefined,
							backgroundAttachment: 'scroll',
							backgroundPosition: 'center center',
							backgroundRepeat: 'no-repeat',
							backgroundSize: 'cover',
							bgVideo: undefined,
							bgVideoTablet: undefined,
							bgVideoMobile: undefined,
							bgParallax: false,
							bgKenBurns: false,
							bgAnimationDuration: 20,
							bgSvgContent: '',
							bgSvgPosition: 'background',
							bgSvgAnimation: 'none',
							bgSvgAnimationSpeed: 'medium',
							bgSvgOpacity: 100,
							bgSvgMinHeight: '',
							bgSvgTextShadow: false,
							// String since the D636 collapse (837f7c97) — this reset
							// wrote a boolean into a string attr plus three attrs
							// that no longer exist (WP discards both silently). D643.
							overlayGradient: '',
						} );
					} }
				>
					{ /* Responsive spacing (padding + margin) — box-object interface
					     contract (.claude/plans/2026-07-09-box-object-interface-contract.md
					     §5). Base tier writes to the WP-native style.spacing object (also
					     visible in the Styles > Dimensions panel); tablet/mobile write to
					     the paddingTablet/paddingMobile and marginTablet/marginMobile
					     object attrs read by the wrapper's @media tiers. */ }
					<ToolsPanelItem
						label={ __( 'Padding & margin', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( attributes.style?.spacing?.padding ?? {} ).length > 0 ||
							Object.keys( attributes.style?.spacing?.margin ?? {} ).length > 0 ||
							Object.keys( attributes.paddingTablet ?? {} ).length > 0 ||
							Object.keys( attributes.paddingMobile ?? {} ).length > 0 ||
							Object.keys( attributes.marginTablet ?? {} ).length > 0 ||
							Object.keys( attributes.marginMobile ?? {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( {
								style: {
									...attributes.style,
									spacing: {
										...attributes.style?.spacing,
										padding: undefined,
										margin: undefined,
									},
								},
								paddingTablet: {},
								paddingMobile: {},
								marginTablet: {},
								marginMobile: {},
							} )
						}
					>
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
					</ToolsPanelItem>

					{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
					     {desktop,tablet,mobile}, each tier itself a {top,right,bottom,left}
					     box (Spec 35 box-shaped pass, 2026-08-11). It therefore uses
					     ResponsiveOverride, which reads and writes the object, NOT the
					     flat-sibling ResponsiveBoxControl. Mirrors container's own
					     implementation. */ }
					<ToolsPanelItem
						label={ __( 'Band padding', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( attributes.contentBandPadding ?? {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { contentBandPadding: {} } )
						}
					>
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
					</ToolsPanelItem>

				</ToolsPanel>
			</InspectorControls>

			<InspectorControls group="settings">
				<ToolsPanel
					label={ __( 'Header behaviour', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							headerSticky: {},
							headerTransparent: {},
							headerShrink: {},
							headerHideOnScroll: {},
							contrastSafe: 'none',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( headerSticky || {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { headerSticky: {} } )
						}
						isShownByDefault
					>
						<ResponsiveTriStateControl
							label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
							help={ __(
								'Pins the header to the top of the viewport while the visitor scrolls.',
								'sgs-blocks'
							) }
							value={ headerSticky }
							onChange={ ( value ) =>
								setAttributes( { headerSticky: value } )
							}
							defaultValue="off"
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __(
							'Transparent until scrolled',
							'sgs-blocks'
						) }
						hasValue={ () =>
							Object.keys( headerTransparent || {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { headerTransparent: {} } )
						}
					>
						<ResponsiveTriStateControl
							label={ __(
								'Transparent until scrolled',
								'sgs-blocks'
							) }
							help={ __(
								'Header starts see-through over a hero image, then becomes solid once the visitor scrolls. A contrast-safe scrim is applied automatically over the hero so text stays readable — change it below if you need a different look.',
								'sgs-blocks'
							) }
							value={ headerTransparent }
							onChange={ ( value ) =>
								setAttributes( { headerTransparent: value } )
							}
							defaultValue="off"
						/>
					</ToolsPanelItem>

					{ /* Conditionally rendered, not just disclosure-hidden — see the
					     isStickyOn docblock above. Only appears once Sticky on
					     scroll is on at some tier; a non-sticky header cannot show
					     a meaningful shrink. */ }
					{ isStickyOn && (
						<ToolsPanelItem
							label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
							hasValue={ () =>
								Object.keys( headerShrink || {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( { headerShrink: {} } )
							}
						>
							<ResponsiveTriStateControl
								label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
								help={ __(
									'Reduces the header height as the visitor scrolls down the page. Only visible while the header is pinned via Sticky on scroll — a header that scrolls away normally never stays on screen long enough to shrink.',
									'sgs-blocks'
								) }
								value={ headerShrink }
								onChange={ ( value ) =>
									setAttributes( { headerShrink: value } )
								}
								defaultValue="off"
							/>
						</ToolsPanelItem>
					) }

					<ToolsPanelItem
						label={ __( 'Hide on scroll', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( headerHideOnScroll || {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { headerHideOnScroll: {} } )
						}
					>
						<ResponsiveTriStateControl
							label={ __( 'Hide on scroll', 'sgs-blocks' ) }
							help={ __(
								'Header slides off the top of the screen once the visitor scrolls down, and slides back in as soon as they scroll up.',
								'sgs-blocks'
							) }
							value={ headerHideOnScroll }
							onChange={ ( value ) =>
								setAttributes( { headerHideOnScroll: value } )
							}
							defaultValue="off"
						/>
					</ToolsPanelItem>

					{ /* Conditionally rendered — see the isTransparentOn docblock
					     above. A non-transparent header already has a solid resting
					     background (nothing to protect contrast against), and
					     class-sgs-header-behaviours.php auto-upgrades this to
					     'scrim' the moment Transparent switches on, so the control
					     has nothing to decide until then. */ }
					{ isTransparentOn && (
						<ToolsPanelItem
							label={ __(
								'Contrast safety over hero',
								'sgs-blocks'
							) }
							hasValue={ () => contrastSafe !== 'none' }
							onDeselect={ () =>
								setAttributes( { contrastSafe: 'none' } )
							}
						>
							<SelectControl
								label={ __(
									'Contrast safety over hero',
									'sgs-blocks'
								) }
								value={ contrastSafe || 'none' }
								options={ CONTRAST_SAFE_OPTIONS }
								onChange={ ( value ) =>
									setAttributes( { contrastSafe: value } )
								}
								help={ __(
									'Keeps header text readable when it sits over a hero image (used with Transparent until scrolled).',
									'sgs-blocks'
								) }
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					) }
				</ToolsPanel>
			</InspectorControls>

			{ /* Styles tab — FR-37-28 layout preset. Simple (default-visible)
			     control: writes contentWidth + style.spacing.padding, the
			     block's own existing attrs, never a new stored shape. */ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Layout', 'sgs-blocks' ) }
					resetAll={ () =>
						applyLayoutPreset(
							'split',
							attributes,
							setAttributes,
							middleRowClientId,
							updateBlockAttributes
						)
					}
				>
					<ToolsPanelItem
						label={ __( 'Layout preset', 'sgs-blocks' ) }
						hasValue={ () =>
							getActiveLayoutPreset( attributes, middleRowJustify ) !==
							'split'
						}
						onDeselect={ () =>
							applyLayoutPreset(
								'split',
								attributes,
								setAttributes,
								middleRowClientId,
								updateBlockAttributes
							)
						}
						isShownByDefault
					>
						<ToggleGroupControl
							label={ __( 'Layout preset', 'sgs-blocks' ) }
							value={ getActiveLayoutPreset(
								attributes,
								middleRowJustify
							) }
							onChange={ ( value ) =>
								applyLayoutPreset(
									value,
									attributes,
									setAttributes,
									middleRowClientId,
									updateBlockAttributes
								)
							}
							help={ __(
								'Sets the header content-band width, padding and logo/nav alignment in one step. Selecting a preset overwrites those values — fine-tune afterwards in the panels above (or the middle row for alignment).',
								'sgs-blocks'
							) }
							isBlock
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						>
							<ToggleGroupControlOption
								value="centred"
								label={ __( 'Centred', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="split"
								label={ __( 'Split', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="minimal"
								label={ __( 'Minimal', 'sgs-blocks' ) }
							/>
						</ToggleGroupControl>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			{ /* Editor canvas renders as <header> to match the frontend banner
			     landmark (FR-37-13 fix B; P-HEADER-EDITOR-TAG-PARITY). */ }
			<header ref={ refEl } { ...innerBlocksProps } />
		</>
	);
}
