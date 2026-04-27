/**
 * Counter block deprecations.
 *
 * v2 — Pre-accessibility pass. Number had aria-live="polite", no sr-only
 *      span, label paragraph had no aria-hidden. Migrates to current
 *      v3 structure which uses aria-hidden on visible elements and a
 *      screen-reader-only span for the full accessible text.
 * v1 — Initial version: save returned null (blocks created via WP-CLI
 *      have empty innerHTML). Any stored HTML matches null.
 */

import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

function formatNumber( num, separator ) {
	if ( separator ) {
		return num.toLocaleString( 'en-GB' );
	}
	return String( num );
}

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
		align: false,
		anchor: true,
		html: false,
		color: { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { color: true, radius: true, style: true, width: true },
		interactivity: true,
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
					aria-live="polite"
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
		// label was stored as source:html — keep the value as-is.
		return attributes;
	},
};

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
		align: false,
		anchor: true,
		html: false,
		color: { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		border: { color: true, radius: true, style: true, width: true },
	},
	save: () => null,
	migrate: ( attributes ) => attributes,
};

export default [ v2, v1 ];
