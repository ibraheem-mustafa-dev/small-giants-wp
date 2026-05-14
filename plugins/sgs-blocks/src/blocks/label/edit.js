import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const TAG_OPTIONS = [
	{ label: __( 'span (inline)', 'sgs-blocks' ), value: 'span' },
	{ label: __( 'p (paragraph)', 'sgs-blocks' ), value: 'p' },
	{ label: __( 'div (block)', 'sgs-blocks' ), value: 'div' },
];

const VARIANT_OPTIONS = [
	{
		label: __( 'Plain — eyebrow text, no background', 'sgs-blocks' ),
		value: 'plain',
	},
	{
		label: __( 'Pill fill — full-width rounded background', 'sgs-blocks' ),
		value: 'pill-fill',
	},
	{
		label: __( 'Pill wrap — content-width rounded background', 'sgs-blocks' ),
		value: 'pill-wrap',
	},
];

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

const FONT_WEIGHT_OPTIONS = [
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
];

const UNIT_OPTIONS_EM = [
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
	{ label: 'px', value: 'px' },
];

const UNIT_OPTIONS_PX = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

/**
 * Build the inline style object for the label element.
 * CSS custom properties are used so style.css rules
 * can reference --sgs-label-* vars in pill variants.
 */
function buildStyle( attributes ) {
	const {
		textColour,
		backgroundColour,
		fontFamily,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		textDecoration,
		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft,
		borderRadius,
		variantStyle,
	} = attributes;

	const style = {
		'--sgs-label-colour': colourVar( textColour ) || undefined,
		'--sgs-label-bg': colourVar( backgroundColour ) || undefined,
		'--sgs-label-font-size': fontSize
			? `${ fontSize }${ fontSizeUnit }`
			: undefined,
		'--sgs-label-font-weight': fontWeight || undefined,
		'--sgs-label-line-height': lineHeight
			? `${ lineHeight }${ lineHeightUnit }`
			: undefined,
		'--sgs-label-letter-spacing': letterSpacing
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		'--sgs-label-text-transform': textTransform || undefined,
		'--sgs-label-text-decoration': textDecoration || undefined,
		'--sgs-label-border-radius': `${ borderRadius }px`,
	};

	if ( variantStyle !== 'plain' ) {
		style[ '--sgs-label-padding' ] =
			`${ paddingTop }px ${ paddingRight }px ${ paddingBottom }px ${ paddingLeft }px`;
	}

	if ( fontFamily ) {
		style[ '--sgs-label-font-family' ] = fontFamily;
	}

	// Remove undefined values so the DOM stays clean.
	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		text,
		tag,
		variantStyle,
		textColour,
		backgroundColour,
		fontSize,
		fontSizeUnit,
		fontSizeTablet,
		fontSizeMobile,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		textDecoration,
		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft,
		borderRadius,
	} = attributes;

	const classNames = [
		'wp-block-sgs-label',
		`is-style-${ variantStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( {
		className: classNames,
		style: buildStyle( attributes ),
	} );

	const isPill = variantStyle !== 'plain';

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Label Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Style variant', 'sgs-blocks' ) }
						value={ variantStyle }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variantStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'HTML tag', 'sgs-blocks' ) }
						value={ tag }
						options={ TAG_OPTIONS }
						onChange={ ( val ) => setAttributes( { tag: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Colour', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) =>
							setAttributes( { textColour: val } )
						}
					/>
					{ isPill && (
						<DesignTokenPicker
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ backgroundColour }
							onChange={ ( val ) =>
								setAttributes( { backgroundColour: val } )
							}
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Font size (desktop)', 'sgs-blocks' ) }
							value={ fontSize }
							onChange={ ( val ) =>
								setAttributes( { fontSize: val } )
							}
							min={ 8 }
							max={ 48 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ fontSizeUnit }
							options={ UNIT_OPTIONS_PX }
							onChange={ ( val ) =>
								setAttributes( { fontSizeUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
					</div>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Font size (tablet)', 'sgs-blocks' ) }
							value={ fontSizeTablet || '' }
							onChange={ ( val ) =>
								setAttributes( { fontSizeTablet: val } )
							}
							min={ 8 }
							max={ 48 }
							step={ 1 }
							__nextHasNoMarginBottom
							allowReset
						/>
						<RangeControl
							label={ __( 'Font size (mobile)', 'sgs-blocks' ) }
							value={ fontSizeMobile || '' }
							onChange={ ( val ) =>
								setAttributes( { fontSizeMobile: val } )
							}
							min={ 8 }
							max={ 48 }
							step={ 1 }
							__nextHasNoMarginBottom
							allowReset
						/>
					</div>
					<SelectControl
						label={ __( 'Font weight', 'sgs-blocks' ) }
						value={ fontWeight }
						options={ FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { fontWeight: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Text transform', 'sgs-blocks' ) }
						value={ textTransform }
						options={ TEXT_TRANSFORM_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textTransform: val } )
						}
						__nextHasNoMarginBottom
					/>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Line height', 'sgs-blocks' ) }
							value={ lineHeight }
							onChange={ ( val ) =>
								setAttributes( { lineHeight: val } )
							}
							min={ 0.8 }
							max={ 3 }
							step={ 0.05 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ lineHeightUnit }
							options={ UNIT_OPTIONS_EM }
							onChange={ ( val ) =>
								setAttributes( { lineHeightUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
					</div>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Letter spacing', 'sgs-blocks' ) }
							value={ letterSpacing }
							onChange={ ( val ) =>
								setAttributes( { letterSpacing: val } )
							}
							min={ -0.1 }
							max={ 0.5 }
							step={ 0.01 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ letterSpacingUnit }
							options={ UNIT_OPTIONS_EM }
							onChange={ ( val ) =>
								setAttributes( { letterSpacingUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
					</div>
					<TextControl
						label={ __( 'Text decoration', 'sgs-blocks' ) }
						value={ textDecoration }
						onChange={ ( val ) =>
							setAttributes( { textDecoration: val } )
						}
						placeholder={ __( 'none', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ isPill && (
					<PanelBody
						title={ __( 'Pill Shape', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<RangeControl
							label={ __( 'Border radius (px)', 'sgs-blocks' ) }
							value={ borderRadius }
							onChange={ ( val ) =>
								setAttributes( { borderRadius: val } )
							}
							min={ 0 }
							max={ 50 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Padding top (px)', 'sgs-blocks' ) }
							value={ paddingTop }
							onChange={ ( val ) =>
								setAttributes( { paddingTop: val } )
							}
							min={ 0 }
							max={ 40 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Padding right (px)', 'sgs-blocks' ) }
							value={ paddingRight }
							onChange={ ( val ) =>
								setAttributes( { paddingRight: val } )
							}
							min={ 0 }
							max={ 60 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Padding bottom (px)', 'sgs-blocks' ) }
							value={ paddingBottom }
							onChange={ ( val ) =>
								setAttributes( { paddingBottom: val } )
							}
							min={ 0 }
							max={ 40 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Padding left (px)', 'sgs-blocks' ) }
							value={ paddingLeft }
							onChange={ ( val ) =>
								setAttributes( { paddingLeft: val } )
							}
							min={ 0 }
							max={ 60 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }
			</InspectorControls>

			<RichText
				{ ...blockProps }
				tagName={ tag }
				value={ text }
				onChange={ ( val ) => setAttributes( { text: val } ) }
				placeholder={ __(
					'Label text…',
					'sgs-blocks'
				) }
				allowedFormats={ [] }
			/>
		</>
	);
}
