import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Format a number with thousand separators.
 *
 * @param {number}  num       The number to format.
 * @param {boolean} separator Whether to add thousand separators.
 * @return {string} Formatted number string.
 */
function formatNumber( num, separator ) {
	if ( separator ) {
		return num.toLocaleString( 'en-GB' );
	}
	return String( num );
}

export default function Save( { attributes } ) {
	const {
		number,
		prefix,
		suffix,
		label,
		duration,
		separator,
		numberColour,
		labelColour,
		labelFontSize,
	} = attributes;

	const blockProps = useBlockProps.save( { className: 'sgs-counter' } );

	const numberStyle = {
		color: colourVar( numberColour ) || undefined,
	};

	const labelStyle = {
		color: colourVar( labelColour ) || undefined,
		fontSize: fontSizeVar( labelFontSize ) || undefined,
	};

	return (
		<div { ...blockProps }>
			<span
				className="sgs-counter__number"
				style={ numberStyle }
				data-target={ number }
				data-duration={ duration }
				data-separator={ separator ? 'true' : 'false' }
				data-prefix={ prefix || undefined }
				data-suffix={ suffix || undefined }
			>
				{ prefix }
				{ formatNumber( number, separator ) }
				{ suffix }
			</span>
			<RichText.Content
				tagName="p"
				className="sgs-counter__label"
				value={ label }
				style={ labelStyle }
			/>
		</div>
	);
}
