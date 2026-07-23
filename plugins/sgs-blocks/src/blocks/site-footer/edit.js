import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from 'react';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, Notice } from '@wordpress/components';
import {
	WidthPanel,
	ResponsiveSpacingPanel,
} from '../container/components/ContainerWrapperControls';

const ALLOWED_BLOCKS = [ 'sgs/site-footer-row' ];

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
// per-field bindings — FR-S9-10 / FR-S4-5). Generic link labels are not personal data.
const TEMPLATE = [
	[ 'sgs/site-footer-row', { rowSlot: 'top', layout: 'flex' } ],
	[
		'sgs/site-footer-row',
		{
			rowSlot: 'columns',
			layout: 'grid',
			// Columns are an operator-set COUNT (Spec 37 §3.3, Bean-locked): the
			// shared wrapper reads columns/columnsTablet/columnsMobile as flat
			// integers (class-sgs-container-wrapper.php:149-154) and stacks to 1
			// on mobile. No gridTemplateColumns object is seeded — an object here
			// would flip $object_grid true (:138) and suppress the count path.
			// A per-device custom template stays available as an advanced
			// override (set gridTemplateColumns explicitly), never the default.
			columns: 3,
			columnsTablet: 3,
			columnsMobile: 1,
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

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( { className: 'sgs-site-footer' } );
	const refEl = useRef( null );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: TEMPLATE,
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
				</PanelBody>
				<ResponsiveSpacingPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div ref={ refEl } { ...innerBlocksProps } />
		</>
	);
}
