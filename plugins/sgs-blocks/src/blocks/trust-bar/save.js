import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Check whether a value string represents a number.
 * Strips commas and whitespace before testing.
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

export default function Save( { attributes } ) {
	const {
		items,
		animated,
		valueColour,
		labelColour,
		labelFontSize,
	} = attributes;

	const blockProps = useBlockProps.save( { className: 'sgs-trust-bar' } );

	const valueStyle = {
		color: colourVar( valueColour ) || undefined,
	};

	const labelStyle = {
		color: colourVar( labelColour ) || undefined,
		fontSize: fontSizeVar( labelFontSize ) || undefined,
	};

	return (
		<div { ...blockProps }>
			{ items.map( ( item, index ) => {
				const shouldAnimate =
					animated && item.animated !== false && isNumeric( item.value );

				const dataAttrs = {};
				if ( shouldAnimate ) {
					dataAttrs[ 'data-target' ] = parseDisplayNumber(
						item.value
					);
					dataAttrs[ 'data-separator' ] = 'true';
					if ( item.suffix ) {
						dataAttrs[ 'data-suffix' ] = item.suffix;
					}
				}

				return (
					<div key={ index } className="sgs-trust-bar__item">
						<span
							className="sgs-trust-bar__value"
							style={ valueStyle }
							{ ...dataAttrs }
						>
							{ item.value }
							{ item.suffix }
						</span>
						<span
							className="sgs-trust-bar__label"
							style={ labelStyle }
						>
							{ item.label }
						</span>
					</div>
				);
			} ) }
		</div>
	);
}
