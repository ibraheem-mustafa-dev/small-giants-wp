import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from 'react';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	ToggleControl,
	SelectControl,
	Notice,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import {
	WidthPanel,
	ResponsiveSpacingPanel,
} from '../container/components/ContainerWrapperControls';

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
// Centred — content band capped to 'normal' (~1200px), default padding.
//   The header cluster (logo/nav/icons, laid out by the middle row's own
//   space-between) sits inside a centred, constrained band.
// Split   — content band uncapped ('full', the block default). Logo pins
//   left, nav/icons pin right, spread edge-to-edge — matches the middle
//   row's built-in justifyContent:'space-between'.
// Minimal — content band capped to 'normal' AND padding reduced to a
//   slimmer bar height, for a stripped-back header.
const MINIMAL_PADDING = { top: '8px', right: '16px', bottom: '8px', left: '16px' };

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
 * @param {Object} attributes Block attributes.
 * @return {string} 'centred' | 'split' | 'minimal' | ''
 */
function getActiveLayoutPreset( attributes ) {
	const { contentWidth = 'full', style } = attributes;
	const padding = style?.spacing?.padding;

	if ( contentWidth === 'full' && ! padding ) {
		return 'split';
	}
	if ( contentWidth === 'normal' ) {
		if ( paddingMatches( padding, MINIMAL_PADDING ) ) {
			return 'minimal';
		}
		if ( ! padding ) {
			return 'centred';
		}
	}
	return '';
}

/**
 * Apply a layout preset by writing to the block's existing attributes only.
 *
 * @param {string}   value         'centred' | 'split' | 'minimal'
 * @param {Object}   attributes    Current block attributes.
 * @param {Function} setAttributes Block editor setAttributes.
 */
function applyLayoutPreset( value, attributes, setAttributes ) {
	const { style = {} } = attributes;
	const { spacing = {}, ...restStyle } = style;
	const { padding, ...restSpacing } = spacing;

	if ( value === 'split' ) {
		// Split has no padding override — clear one if present so the
		// preset detector reads back 'split' cleanly.
		const hasRestSpacing = Object.keys( restSpacing ).length > 0;
		setAttributes( {
			contentWidth: 'full',
			style: {
				...restStyle,
				...( hasRestSpacing ? { spacing: restSpacing } : {} ),
			},
		} );
		return;
	}

	if ( value === 'centred' ) {
		const hasRestSpacing = Object.keys( restSpacing ).length > 0;
		setAttributes( {
			contentWidth: 'normal',
			style: {
				...restStyle,
				...( hasRestSpacing ? { spacing: restSpacing } : {} ),
			},
		} );
		return;
	}

	if ( value === 'minimal' ) {
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
// operator adds elements (FR-S9-2 empty-row-zero-output).
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

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( { className: 'sgs-site-header' } );
	const refEl = useRef( null );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: TEMPLATE,
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
				<PanelBody title={ __( 'Header width', 'sgs-blocks' ) }>
					<WidthPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>
				<ResponsiveSpacingPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<InspectorControls group="settings">
				<ToolsPanel
					label={ __( 'Header behaviour', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							headerSticky: false,
							headerTransparent: false,
							headerShrink: false,
							headerHideOnScroll: false,
							contrastSafe: 'none',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
						hasValue={ () => headerSticky !== false }
						onDeselect={ () =>
							setAttributes( { headerSticky: false } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
							checked={ !! headerSticky }
							onChange={ ( value ) =>
								setAttributes( { headerSticky: value } )
							}
							help={ __(
								'Pins the header to the top of the viewport while the visitor scrolls.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __(
							'Transparent until scrolled',
							'sgs-blocks'
						) }
						hasValue={ () => headerTransparent !== false }
						onDeselect={ () =>
							setAttributes( { headerTransparent: false } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __(
								'Transparent until scrolled',
								'sgs-blocks'
							) }
							checked={ !! headerTransparent }
							onChange={ ( value ) =>
								setAttributes( { headerTransparent: value } )
							}
							help={ __(
								'Header starts see-through over a hero image, then becomes solid once the visitor scrolls. A contrast-safe scrim is applied automatically over the hero so text stays readable — change it below if you need a different look.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
						hasValue={ () => headerShrink !== false }
						onDeselect={ () =>
							setAttributes( { headerShrink: false } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
							checked={ !! headerShrink }
							onChange={ ( value ) =>
								setAttributes( { headerShrink: value } )
							}
							help={ __(
								'Reduces the header height as the visitor scrolls down the page.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Hide on scroll', 'sgs-blocks' ) }
						hasValue={ () => headerHideOnScroll !== false }
						onDeselect={ () =>
							setAttributes( { headerHideOnScroll: false } )
						}
					>
						<ToggleControl
							label={ __( 'Hide on scroll', 'sgs-blocks' ) }
							checked={ !! headerHideOnScroll }
							onChange={ ( value ) =>
								setAttributes( { headerHideOnScroll: value } )
							}
							help={ __(
								'Header slides off the top of the screen once the visitor scrolls down, and slides back in as soon as they scroll up.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __(
							'Contrast safety over hero',
							'sgs-blocks'
						) }
						hasValue={ () => contrastSafe !== 'none' }
						onDeselect={ () =>
							setAttributes( { contrastSafe: 'none' } )
						}
						isShownByDefault
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
				</ToolsPanel>
			</InspectorControls>

			{ /* Styles tab — FR-37-28 layout preset. Simple (default-visible)
			     control: writes contentWidth + style.spacing.padding, the
			     block's own existing attrs, never a new stored shape. */ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Layout', 'sgs-blocks' ) }
					resetAll={ () =>
						applyLayoutPreset( 'split', attributes, setAttributes )
					}
				>
					<ToolsPanelItem
						label={ __( 'Layout preset', 'sgs-blocks' ) }
						hasValue={ () =>
							getActiveLayoutPreset( attributes ) !== 'split'
						}
						onDeselect={ () =>
							applyLayoutPreset( 'split', attributes, setAttributes )
						}
						isShownByDefault
					>
						<ToggleGroupControl
							label={ __( 'Layout preset', 'sgs-blocks' ) }
							value={ getActiveLayoutPreset( attributes ) }
							onChange={ ( value ) =>
								applyLayoutPreset( value, attributes, setAttributes )
							}
							help={ __(
								'Sets the header content-band width and padding in one step. Selecting a preset overwrites those values — fine-tune afterwards in the panels above.',
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
