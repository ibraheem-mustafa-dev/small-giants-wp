/**
 * Counter block deprecations.
 *
 * v4 — Pre-Wave-1 colour defaults. Save output had the accessibility pass
 *      (sr-only span, aria-hidden on visible elements) but no inline colour
 *      styles, no icon placeholder, and no sgs-counter--accent-stroke class.
 *      Wave 1 added numberColour (default: "primary") and labelColour
 *      (default: "text-muted"), causing save() to emit inline style attrs.
 * v3 — catch-all null for blocks before icon/accentStroke attributes.
 * v2 — Pre-accessibility pass. Number had aria-live="polite", no sr-only
 *      span, label paragraph had no aria-hidden.
 * v1 — Initial version: save returned null.
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

/**
 * v4 — Pre-Wave-1 colour defaults.
 *
 * Covers posts saved after the accessibility pass but before Wave 1 added
 * default values for numberColour ("primary") and labelColour ("text-muted").
 * Those defaults mean save() now always emits inline colour styles; existing
 * posts have no such styles in their stored HTML.
 *
 * Also covers posts saved before the icon placeholder and accentStroke class
 * were introduced — both are absent from stored HTML in this era.
 *
 * Migrate supplies the new Wave-1 defaults so the block upgrades cleanly.
 */
const v4 = {
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

		// Colour styles are only emitted when the attribute has a value —
		// matching the behaviour before default values were set in block.json.
		const numberStyle = {
			color: colourVar( numberColour ) || undefined,
		};

		const labelStyle = {
			color: colourVar( labelColour ) || undefined,
			fontSize: fontSizeVar( labelFontSize ) || undefined,
		};

		const formattedNumber = formatNumber( number, separator );
		const fullText = `${ prefix || '' }${ formattedNumber }${ suffix || '' } ${ label }`;

		return (
			<div { ...blockProps }>
				<span className="sgs-sr-only">{ fullText }</span>
				<span
					className="sgs-counter__number"
					style={ numberStyle }
					data-target={ number }
					data-duration={ duration }
					data-separator={ separator ? 'true' : 'false' }
					data-prefix={ prefix || undefined }
					data-suffix={ suffix || undefined }
					aria-hidden="true"
				>
					{ prefix }
					{ formattedNumber }
					{ suffix }
				</span>
				<RichText.Content
					tagName="p"
					className="sgs-counter__label"
					value={ label }
					style={ labelStyle }
					aria-hidden="true"
				/>
			</div>
		);
	},
	migrate( attributes ) {
		return {
			...attributes,
			numberColour: attributes.numberColour || 'primary',
			labelColour:  attributes.labelColour  || 'text-muted',
			icon:         '',
			accentStroke: false,
		};
	},
};

/**
 * v3 — catch-all null for blocks before icon/accentStroke attributes were added.
 *      Allows the block editor to upgrade stored content without validation errors.
 */
const v3 = {
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
	save: () => null,
	migrate: ( attributes ) => ( { ...attributes, icon: '', accentStroke: false } ),
};

export default [ v4, v3, v2, v1 ];
