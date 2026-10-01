/**
 * Gap colour: the shared editor pieces for a grid or flex layout's gap colour.
 * The render side is `includes/helpers-gap-rule.php`.
 *
 *   - `gapColourRow( { attributes, setAttributes } )` returns the fillRow for
 *     `gapColour`, to add to the block's SgsColourPanel `rows` while its layout
 *     is grid or flex;
 *   - `gapColourPreview( gapValue, gapColour )` returns the canvas style for the
 *     lines (CSS gap decorations), each as wide as its own gap.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import fillRow from './colour-variants/fillRow';
import { colourVar } from '../utils';

/**
 * The gap colour row for the block's SgsColourPanel.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Object} A fillRow descriptor.
 */
export function gapColourRow( { attributes, setAttributes } ) {
	return fillRow( {
		key: 'gapColour',
		label: __( 'Gap colour', 'sgs-blocks' ),
		attrs: { base: 'gapColour' },
		attributes,
		setAttributes,
	} );
}

/**
 * One axis of a resolved gap value (`<row> <column>`, or one length for both).
 * A value holding a function (`var(…)`, `calc(…)`) is used whole.
 *
 * @param {string} value Resolved gap CSS value.
 * @param {string} axis  'row' or 'column'.
 * @return {string} The axis width, or ''.
 */
const gapAxis = ( value, axis ) => {
	const v = String( value || '' ).trim();
	if ( ! v || v.includes( '(' ) ) {
		return v;
	}
	const parts = v.split( /\s+/ );
	return 'column' === axis && parts[ 1 ] ? parts[ 1 ] : parts[ 0 ];
};

/**
 * Canvas style for the gap lines.
 *
 * @param {string} gapValue  The gap's resolved CSS value for the previewed device.
 * @param {string} gapColour The `gapColour` attribute (slug or CSS colour).
 * @return {Object} Style properties to spread into the grid/flex element's style.
 */
export function gapColourPreview( gapValue, gapColour ) {
	const colour = gapColour ? colourVar( gapColour ) : '';
	const row = gapAxis( gapValue, 'row' );
	if ( ! colour || ! row ) {
		return {};
	}
	return {
		columnRule: `${ gapAxis( gapValue, 'column' ) } solid ${ colour }`,
		rowRule: `${ row } solid ${ colour }`,
	};
}
