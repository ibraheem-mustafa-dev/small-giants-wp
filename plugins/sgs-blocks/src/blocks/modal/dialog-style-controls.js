/**
 * Modal — dialog size/border/shadow controls plus the close-button style
 * toggle (Eye Care size-guide parity, 2026-09-28). Extracted out of edit.js,
 * which is already over the framework's 250-line JS file limit — new logic
 * goes in a new file rather than growing it further (same pattern as
 * anchor-open-controls.js in this block).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	SgsBorderControl,
	SgsLengthControl,
	ShadowControl,
	shadowAttrKeys,
} from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

// Split-scalar pair (dialogWidth stores the raw number as a string,
// dialogWidthUnit the unit) — same private per-file helper shape every other
// customWidth adopter (sgs/heading, sgs/text, sgs/button) carries.
function composeUnit( num, unit ) {
	if ( '' === num || null === num || undefined === num ) {
		return '';
	}
	return `${ num }${ unit || 'px' }`;
}

function parseUnit( raw, currentUnit ) {
	if ( ! raw ) {
		return { num: '', unit: currentUnit };
	}
	const match = /^(-?\d*\.?\d+)\s*([a-z%]*)$/i.exec( String( raw ).trim() );
	if ( ! match ) {
		return { num: '', unit: currentUnit };
	}
	return { num: match[ 1 ], unit: match[ 2 ] || currentUnit };
}

const DIALOG_WIDTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
	{ value: 'vw', label: 'vw' },
];

/**
 * Custom dialog width + border (width/style/colour), both block-private —
 * Shape B, same shape `SgsBorderControl` gives every other adopter
 * (sgs/accordion is the oracle). Sits under `InspectorControls group="styles"`
 * alongside the Backdrop panel, matching where every other SgsBorderControl
 * mount lives.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block editor setAttributes.
 * @return {JSX.Element} The panel body.
 */
export function DialogSizeBorderControls( { attributes, setAttributes } ) {
	const { dialogWidth, dialogWidthUnit, borderWidth, borderStyle, borderColour, borderColourGradient } = attributes;

	return (
		<>
			<SgsLengthControl
				label={ __( 'Custom width', 'sgs-blocks' ) }
				help={ __(
					'Overrides Max width (Modal Settings panel) when set. Leave blank to keep the preset width.',
					'sgs-blocks'
				) }
				value={ composeUnit( dialogWidth, dialogWidthUnit ) }
				units={ DIALOG_WIDTH_UNITS }
				onChange={ ( raw ) => {
					const { num, unit } = parseUnit( raw, dialogWidthUnit || 'px' );
					setAttributes( {
						dialogWidth: '' === num ? '' : String( num ),
						dialogWidthUnit: unit,
					} );
				} }
				presets={ false }
			/>
			<SgsBorderControl
				widthValues={ borderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
				styleValue={ borderStyle }
				onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourValue={ borderColour }
				onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
				colourGradientValue={ borderColourGradient }
				onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
				colourLinked
			/>
		</>
	);
}

/**
 * Dialog shadow — the shared layered `ShadowControl` (install-in-one-call
 * form via `shadowAttrKeys()`), matching sgs/mega-panel and sgs/nav-drawer's
 * own panel shadow. No hover sibling (the dialog panel has no hover-shaped
 * interaction, same reasoning as modalBackground/borderColour above).
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block editor setAttributes.
 * @return {JSX.Element} The control.
 */
export function DialogShadowControl( { attributes, setAttributes } ) {
	return (
		<ShadowControl
			label={ __( 'Dialog shadow', 'sgs-blocks' ) }
			attributes={ attributes }
			setAttributes={ setAttributes }
			attrNames={ shadowAttrKeys( 'dialogShadow' ) }
		/>
	);
}

/**
 * Close button style — 'icon' (default, the existing round SVG button) or
 * 'glyph' (a plain "×" text character, no background disc). Both keep the
 * same accessible name and 44px touch target (render.php/style.css).
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block editor setAttributes.
 * @return {JSX.Element} The control.
 */
export function CloseStyleControl( { attributes, setAttributes } ) {
	return (
		<ToggleGroupControl
			label={ __( 'Close button style', 'sgs-blocks' ) }
			value={ attributes.closeStyle }
			onChange={ ( val ) => setAttributes( { closeStyle: val || 'icon' } ) }
			isBlock
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			<ToggleGroupControlOption value="icon" label={ __( 'Icon', 'sgs-blocks' ) } />
			<ToggleGroupControlOption value="glyph" label={ __( 'Glyph (×)', 'sgs-blocks' ) } />
		</ToggleGroupControl>
	);
}
