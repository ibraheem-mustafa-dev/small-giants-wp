import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

/**
 * Format a number with thousand separators for display in the editor.
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

export default function Edit( { attributes, setAttributes } ) {
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

	const blockProps = useBlockProps( { className: 'sgs-counter' } );

	const numberStyle = {
		color: colourVar( numberColour ) || undefined,
	};

	const labelStyle = {
		color: colourVar( labelColour ) || undefined,
		fontSize: fontSizeVar( labelFontSize ) || undefined,
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Counter Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Target number', 'sgs-blocks' ) }
						value={ String( number ) }
						onChange={ ( val ) => {
							const parsed = parseInt( val, 10 );
							setAttributes( {
								number: isNaN( parsed ) ? 0 : parsed,
							} );
						} }
						type="number"
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Prefix', 'sgs-blocks' ) }
						value={ prefix }
						onChange={ ( val ) =>
							setAttributes( { prefix: val } )
						}
						placeholder={ __( 'e.g. £', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Suffix', 'sgs-blocks' ) }
						value={ suffix }
						onChange={ ( val ) =>
							setAttributes( { suffix: val } )
						}
						placeholder={ __( 'e.g. +, %, M', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Thousand separator', 'sgs-blocks' ) }
						checked={ separator }
						onChange={ ( val ) =>
							setAttributes( { separator: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __(
							'Animation duration (ms)',
							'sgs-blocks'
						) }
						value={ duration }
						onChange={ ( val ) =>
							setAttributes( { duration: val } )
						}
						min={ 500 }
						max={ 5000 }
						step={ 100 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Number colour', 'sgs-blocks' ) }
						value={ numberColour }
						onChange={ ( val ) =>
							setAttributes( { numberColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Label colour', 'sgs-blocks' ) }
						value={ labelColour }
						onChange={ ( val ) =>
							setAttributes( { labelColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Label font size', 'sgs-blocks' ) }
						value={ labelFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { labelFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<span
					className="sgs-counter__number"
					style={ numberStyle }
				>
					{ prefix }
					{ formatNumber( number, separator ) }
					{ suffix }
				</span>
				<RichText
					tagName="p"
					className="sgs-counter__label"
					value={ label }
					onChange={ ( val ) =>
						setAttributes( { label: val } )
					}
					placeholder={ __( 'Label text…', 'sgs-blocks' ) }
					style={ labelStyle }
				/>
			</div>
		</>
	);
}
