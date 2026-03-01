/**
 * Trust Bar block — deprecations.
 *
 * v2: Captures the static save output before the block was converted to
 *     server-side rendering via render.php.
 * v1: Pre-static-save era — block inserted with empty innerHTML.
 */
import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Check whether a value string represents a number (view.js logic).
 *
 * @param {string} val The value to test.
 * @return {boolean} True if numeric.
 */
function isNumeric( val ) {
	if ( ! val ) {
		return false;
	}
	const cleaned = val.replace( /[,\s]/g, '' );
	return ! isNaN( cleaned ) && cleaned.length > 0;
}

/**
 * Parse a display value like "5,000" into a plain integer.
 *
 * @param {string} val The display value.
 * @return {number} The parsed integer.
 */
function parseDisplayNumber( val ) {
	return parseInt( val.replace( /[,\s]/g, '' ), 10 );
}

// v2 — static save function that existed before render.php conversion.
const v2 = {
	attributes: {
		items: {
			type:    'array',
			default: [
				{ value: '5,000', suffix: '+', label: 'Businesses Served', animated: true },
				{ value: '60', suffix: '+', label: 'Years Experience', animated: true },
				{ value: 'Next-Day', suffix: '', label: 'Delivery Available', animated: false },
			],
		},
		animated:     { type: 'boolean', default: true },
		valueColour:  { type: 'string' },
		labelColour:  { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save( { attributes } ) {
		const { items, animated, valueColour, labelColour, labelFontSize } = attributes;

		const blockProps = useBlockProps.save( { className: 'sgs-trust-bar' } );

		const valueStyle = { color: colourVar( valueColour ) || undefined };
		const labelStyle = {
			color:    colourVar( labelColour ) || undefined,
			fontSize: fontSizeVar( labelFontSize ) || undefined,
		};

		return (
			<div { ...blockProps }>
				{ items.map( ( item, index ) => {
					const shouldAnimate =
						animated && item.animated !== false && isNumeric( item.value );

					const dataAttrs = {};
					if ( shouldAnimate ) {
						dataAttrs[ 'data-target' ]    = parseDisplayNumber( item.value );
						dataAttrs[ 'data-separator' ] = 'true';
						if ( item.suffix ) {
							dataAttrs[ 'data-suffix' ] = item.suffix;
						}
					}

					return (
						<div key={ index } className="sgs-trust-bar__item">
							<span className="sgs-trust-bar__value" style={ valueStyle } { ...dataAttrs }>
								{ item.value }
								{ item.suffix }
							</span>
							<span className="sgs-trust-bar__label" style={ labelStyle }>
								{ item.label }
							</span>
						</div>
					);
				} ) }
			</div>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

// v1 — block inserted with empty innerHTML before static save existed.
const v1 = {
	attributes: {
		items: {
			type:    'array',
			default: [
				{ value: '5,000', suffix: '+', label: 'Businesses Served', animated: true },
				{ value: '60', suffix: '+', label: 'Years Experience', animated: true },
				{ value: 'Next-Day', suffix: '', label: 'Delivery Available', animated: false },
			],
		},
		animated:      { type: 'boolean', default: true },
		valueColour:   { type: 'string' },
		labelColour:   { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v2, v1 ];
