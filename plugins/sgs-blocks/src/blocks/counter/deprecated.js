/**
 * Counter block — deprecations.
 *
 * v2: Captures the static save output before the block was converted to
 *     server-side rendering via render.php.
 * v1: Blocks created before save.js was active — stored innerHTML is empty.
 *     save: () => null matches any stored innerHTML including empty string.
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Format a number with thousand separators (en-GB locale).
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

// v2 — static save function that existed before render.php conversion.
const v2 = {
	attributes: {
		number:        { type: 'number', default: 0 },
		prefix:        { type: 'string', default: '' },
		suffix:        { type: 'string', default: '' },
		label:         { type: 'string', source: 'html', selector: '.sgs-counter__label' },
		duration:      { type: 'number', default: 2000 },
		separator:     { type: 'boolean', default: true },
		numberColour:  { type: 'string' },
		labelColour:   { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align:   false,
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, link: true },
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

		const numberStyle = { color: colourVar( numberColour ) || undefined };
		const labelStyle  = {
			color:    colourVar( labelColour ) || undefined,
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
	},
	migrate( attributes ) {
		return attributes;
	},
};

// v1 — blocks created before save.js was active (stored innerHTML is empty).
const v1 = {
	attributes: {
		number:        { type: 'number', default: 0 },
		prefix:        { type: 'string', default: '' },
		suffix:        { type: 'string', default: '' },
		label:         { type: 'string', source: 'html', selector: '.sgs-counter__label', default: '' },
		duration:      { type: 'number', default: 2000 },
		separator:     { type: 'boolean', default: true },
		numberColour:  { type: 'string', default: '' },
		labelColour:   { type: 'string', default: '' },
		labelFontSize: { type: 'string', default: '' },
	},
	supports: {
		align:   false,
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		border:  { color: true, radius: true, style: true, width: true },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

export default [ v2, v1 ];
