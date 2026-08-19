import { __, sprintf } from '@wordpress/i18n';
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
	Button,
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
	SHADOW_OPTIONS,
} from '../container/components/ContainerWrapperControls';
import { ResponsiveTriStateControl, ResponsiveBoxControl, ResponsiveOverride, SgsColourPanel, BOX_UNITS, normaliseResponsiveBox } from '../../components';
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

// Human labels for the three device tiers, used by the contrast advisory below
// so it can name exactly which tiers carry the risk rather than warning once
// for the whole block. 'Phone' (not 'Mobile') matches the wording the global
// device toggle already shows the client.
const TIER_LABELS = {
	desktop: __( 'Desktop', 'sgs-blocks' ),
	tablet: __( 'Tablet', 'sgs-blocks' ),
	mobile: __( 'Phone', 'sgs-blocks' ),
};

// value -> label, derived from the options table above so the two can never
// drift apart.
const CONTRAST_SAFE_LABELS = CONTRAST_SAFE_OPTIONS.reduce(
	( acc, opt ) => ( { ...acc, [ opt.value ]: opt.label } ),
	{}
);

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
		backgroundColour,
		backgroundColourGradient,
		backgroundColourScrolled,
		backgroundColourScrolledGradient,
		textColour,
		textColourScrolled,
		headerTransparentDirection,
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
	// TRANSPARENT, not Sticky: a header with a solid resting background has no
	// hero showing through to protect against, so the control has nothing to
	// decide until Transparent is on. Hidden otherwise, for the same reason
	// Shrink is hidden until Sticky is on.
	//
	// ⚑ This comment used to cite class-sgs-header-behaviours.php's silent
	// 'none' -> 'scrim' auto-upgrade as the justification. That upgrade was
	// REMOVED (2026-08-19) — see the advisory immediately below, which replaced
	// it. The control's visibility rule is unchanged; only its reason is.
	const isTransparentOn = isOnAtAnyTier( headerTransparent );

	// WCAG 1.4.3 ADVISORY (2026-08-19). Until this change the PHP resolver
	// SILENTLY rewrote a client's explicit 'none' to 'scrim' whenever
	// Transparent resolved on (class-sgs-header-behaviours.php). The header was
	// protected, but the client's own choice was discarded with nothing shown
	// to say so — which breached the locked project rule that operator
	// accessibility failures are NOTICES, never enforcement. The rewrite is
	// gone; this advisory replaces it. We state the risk, offer the fix as one
	// click, and then honour whatever the client decides. Precedent: WordPress
	// core's own ContrastChecker warns and never enforces.
	//
	// Evaluated PER TIER, not once for the block: contrastSafe is a per-device
	// object now, so a header transparent on desktop but solid on phone carries
	// the risk on exactly one tier and should say exactly that.
	const unprotectedTiers = [ 'desktop', 'tablet', 'mobile' ].filter(
		( tier ) =>
			resolveTier( headerTransparent, tier, 'off' ).value === 'on' &&
			resolveTier( contrastSafe, tier, 'none' ).value === 'none'
	);

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
			{ /* COLOUR — mounted FIRST because WordPress concatenates same-group
			     InspectorControls Fills in mount order, and this panel is pinned
			     to the top of the block's inspector by standing rule.

			     Migrated off WordPress's native colour supports 2026-08-19. The
			     header was one of only three blocks showing core's colour UI with
			     no SGS panel, while sgs/site-header-row carried the SAME two
			     colours as SGS attributes — one concept, two mechanisms, two
			     levels. block.json keeps `supports.color` DECLARED (a gate reads
			     the key as a pipeline contract signal) with every sub-flag false,
			     so core renders no panel of its own and there is exactly one
			     colour home per block.

			     Labels say "Header …" against the row block's "Row …" so the two
			     levels read as different scopes rather than duplicates: this
			     colours the whole bar, a row colours one band inside it. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: __( 'Header background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'At rest', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) =>
									setAttributes( { backgroundColour: val ?? '' } ),
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										backgroundColourGradient: val ?? '',
									} ),
								linked: true,
							},
							{
								// `scrolled` is a REAL state, not a notional one:
								// view.js toggles `.is-header-scrolled` on the
								// header element and render.php paints against it.
								// Structurally identical to `current`
								// ([aria-current]) — a class toggled at runtime,
								// painted by CSS.
								key: 'scrolled',
								label: __( 'Once scrolled', 'sgs-blocks' ),
								value: backgroundColourScrolled,
								onChange: ( val ) =>
									setAttributes( {
										backgroundColourScrolled: val ?? '',
									} ),
								gradientValue: backgroundColourScrolledGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										backgroundColourScrolledGradient: val ?? '',
									} ),
							},
						],
					},
					{
						key: 'text',
						label: __( 'Header text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'At rest', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'scrolled',
								label: __( 'Once scrolled', 'sgs-blocks' ),
								value: textColourScrolled,
								onChange: ( val ) =>
									setAttributes( { textColourScrolled: val ?? '' } ),
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

				{ /* SHADOW — mounted 2026-08-19. The `shadow` attribute was already
				     declared AND already honoured by SGS_Container_Wrapper, but no
				     control had ever been mounted, so no client could reach it: a
				     working feature that was invisible. Reuses sgs/container's own
				     SHADOW_OPTIONS rather than a second list, so the header offers
				     exactly the same shadow vocabulary as every other wrapper. */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ attributes.shadow || '' }
						options={ SHADOW_OPTIONS }
						onChange={ ( val ) => setAttributes( { shadow: val } ) }
						help={ __(
							'Casts a shadow beneath the header, lifting it off the page content below.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
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
							contrastSafe: {},
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
								'Header starts see-through over a hero image, then becomes solid once the visitor scrolls. Set “Contrast safety over hero” below so text stays readable over the image.',
								'sgs-blocks'
							) }
							value={ headerTransparent }
							onChange={ ( value ) =>
								setAttributes( { headerTransparent: value } )
							}
							defaultValue="off"
						/>

						{ unprotectedTiers.length > 0 && (
							<Notice
								status="warning"
								isDismissible={ false }
								className="sgs-contrast-notice"
							>
								<p style={ { margin: '0 0 8px' } }>
									{ sprintf(
										/* translators: %s: a list of device tiers, e.g. "Desktop, Phone". */
										__(
											'On %s this header is see-through with no contrast protection, so text over a hero image may be hard to read. Nothing has been changed for you — this is a suggestion, not a rule.',
											'sgs-blocks'
										),
										unprotectedTiers
											.map( ( t ) => TIER_LABELS[ t ] )
											.join( ', ' )
									) }
								</p>
								<Button
									variant="secondary"
									size="small"
									onClick={ () => {
										const next = { ...( contrastSafe || {} ) };
										unprotectedTiers.forEach( ( t ) => {
											next[ t ] = 'scrim';
										} );
										setAttributes( { contrastSafe: next } );
									} }
								>
									{ __( 'Apply contrast scrim', 'sgs-blocks' ) }
								</Button>
							</Notice>
						) }
					</ToolsPanelItem>

					{ /* WHICH STATE IS WHICH (2026-08-19). The transparent
					     behaviour always had two states — see-through at rest,
					     solid once scrolled — but the order was hardcoded, so a
					     client who wanted colour at the top and transparency
					     further down had no way to say so. This adds no new CSS
					     mechanism; it swaps which of the two existing rules
					     carries the transparency. Shown only once Transparent is
					     on, for the same reason the contrast control is: with it
					     off there is no pair to order. */ }
					{ isTransparentOn && (
						<ToolsPanelItem
							label={ __( 'Which way round', 'sgs-blocks' ) }
							hasValue={ () =>
								!! headerTransparentDirection &&
								'transparent-first' !== headerTransparentDirection
							}
							onDeselect={ () =>
								setAttributes( {
									headerTransparentDirection:
										'transparent-first',
								} )
							}
						>
							<SelectControl
								label={ __( 'Which way round', 'sgs-blocks' ) }
								value={
									headerTransparentDirection ||
									'transparent-first'
								}
								options={ [
									{
										label: __(
											'See-through at the top, solid once scrolled',
											'sgs-blocks'
										),
										value: 'transparent-first',
									},
									{
										label: __(
											'Solid at the top, see-through once scrolled',
											'sgs-blocks'
										),
										value: 'solid-first',
									},
								] }
								onChange={ ( value ) =>
									setAttributes( {
										headerTransparentDirection: value,
									} )
								}
								help={ __(
									'Set the colours for each state in the Colour panel, under “Header background”.',
									'sgs-blocks'
								) }
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					) }

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
							hasValue={ () =>
								Object.keys( contrastSafe || {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( { contrastSafe: {} } )
							}
						>
							{ /* PER-DEVICE (2026-08-19). This was the ONLY one of the
							     five header behaviours still stored flat, which made
							     "scrim over the desktop hero, nothing on phone" —
							     the common case — unexpressible.

							     It uses <ResponsiveOverride> and NOT the
							     <ResponsiveTriStateControl> its four siblings use,
							     because those are on/off booleans and this is a
							     FOUR-value enum. The tri-state control renders an
							     on/off ToggleGroupControl; pointing it at this
							     attribute would store values it cannot display and
							     silently flatten the client's choice. Matching the
							     control primitive to the STORAGE shape is the rule
							     here, not matching the neighbouring control. */ }
							<ResponsiveOverride
								value={ contrastSafe }
								onChange={ ( obj ) =>
									setAttributes( { contrastSafe: obj } )
								}
							>
								{ ( {
									tier,
									ownValue,
									effectiveValue,
									setOwnValue,
								} ) => (
									<SelectControl
										label={ __(
											'Contrast safety over hero',
											'sgs-blocks'
										) }
										value={
											tier === 'desktop'
												? ownValue || 'none'
												: ownValue || ''
										}
										options={
											tier === 'desktop'
												? CONTRAST_SAFE_OPTIONS
												: [
														{
															label: sprintf(
																/* translators: %s: the setting inherited from the wider device, e.g. "Scrim overlay". */
																__(
																	'— same as wider screens (%s) —',
																	'sgs-blocks'
																),
																CONTRAST_SAFE_LABELS[
																	effectiveValue
																] ||
																	CONTRAST_SAFE_LABELS.none
															),
															value: '',
														},
														...CONTRAST_SAFE_OPTIONS,
													]
										}
										onChange={ ( value ) =>
											setOwnValue( value || undefined )
										}
										help={ __(
											'Keeps header text readable when it sits over a hero image. Used with Transparent until scrolled.',
											'sgs-blocks'
										) }
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
								) }
							</ResponsiveOverride>
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
