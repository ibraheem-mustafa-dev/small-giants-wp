import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	RadioControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

// ─── Option sets ─────────────────────────────────────────────────────────────

const HEADING_ROLE_OPTIONS = [
	{ label: __( 'Heading', 'sgs-blocks' ), value: 'heading' },
	{ label: __( 'Subheading', 'sgs-blocks' ), value: 'subheading' },
];

const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'H1', 'sgs-blocks' ), value: 'h1' },
	{ label: __( 'H2 (default)', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'H3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'H4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'H5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'H6', 'sgs-blocks' ), value: 'h6' },
];

const SUB_TAG_OPTIONS = [
	{ label: __( 'p (paragraph)', 'sgs-blocks' ), value: 'p' },
	{ label: __( 'div (block)', 'sgs-blocks' ), value: 'div' },
];

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

const FONT_STYLE_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Italic', 'sgs-blocks' ), value: 'italic' },
];

const TEXT_DECORATION_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Line-through', 'sgs-blocks' ), value: 'line-through' },
];

const TEXT_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
];

const FONT_WEIGHT_OPTIONS = [
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
	{ label: __( 'Extra-bold (800)', 'sgs-blocks' ), value: '800' },
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

// ─── Inline style builder ─────────────────────────────────────────────────────

function buildTextStyle( attributes ) {
	const {
		textColour,
		fontFamily,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		fontStyle,
		textDecoration,
	} = attributes;

	const style = {
		color: colourVar( textColour ) || undefined,
		fontSize: fontSize ? `${ fontSize }${ fontSizeUnit }` : undefined,
		fontWeight: fontWeight || undefined,
		lineHeight: lineHeight ? `${ lineHeight }${ lineHeightUnit }` : undefined,
		letterSpacing: ( letterSpacing !== null && letterSpacing !== undefined )
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		textTransform: textTransform || undefined,
		fontFamily: fontFamily || undefined,
		fontStyle: fontStyle || undefined,
		textDecoration: textDecoration || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

/** Build wrapper-level inline style for the editor canvas (mirrors render.php $wrapper_inline). */
function buildWrapperStyle( attributes ) {
	const { textAlign, backgroundColour } = attributes;
	const style = {};
	if ( textAlign ) {
		style.textAlign = textAlign;
	}
	if ( backgroundColour ) {
		style.backgroundColor = colourVar( backgroundColour ) || undefined;
	}
	return style;
}

// ─── Main edit component ──────────────────────────────────────────────────────

export default function Edit( { attributes, setAttributes } ) {
	const {
		headingRole,
		content,
		level,
		subTag,
		textColour,
		textAlign,
		backgroundColour,
		fontStyle,
		textDecoration,
		inheritStyle,
	} = attributes;

	const isSubheading = headingRole === 'subheading';

	// Determine the tag to render in the editor canvas.
	const editorTag = isSubheading ? subTag : level;

	const blockProps = useBlockProps( {
		className: [
			'wp-block-sgs-heading',
			isSubheading ? 'wp-block-sgs-heading--subheading' : '',
		].filter( Boolean ).join( ' ' ),
		style: buildWrapperStyle( attributes ),
	} );

	const textStyle = buildTextStyle( attributes );

	return (
		<>
			<InspectorControls>
				{ /* ── Role panel ── */ }
				<PanelBody title={ __( 'Role', 'sgs-blocks' ) }>
					<RadioControl
						label={ __( 'Heading role', 'sgs-blocks' ) }
						selected={ headingRole }
						options={ HEADING_ROLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { headingRole: val } ) }
					/>

					{ ! isSubheading && (
						<SelectControl
							label={ __( 'Heading level', 'sgs-blocks' ) }
							value={ level }
							options={ HEADING_LEVEL_OPTIONS }
							onChange={ ( val ) => setAttributes( { level: val } ) }
							__nextHasNoMarginBottom
						/>
					) }

					{ isSubheading && (
						<SelectControl
							label={ __( 'HTML tag', 'sgs-blocks' ) }
							value={ subTag }
							options={ SUB_TAG_OPTIONS }
							onChange={ ( val ) => setAttributes( { subTag: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{ /* ── Colour panel ── */ }
				<PanelBody title={ __( 'Colour', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) => setAttributes( { textColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Background colour', 'sgs-blocks' ) }
						value={ backgroundColour }
						onChange={ ( val ) => setAttributes( { backgroundColour: val ?? '' } ) }
					/>
				</PanelBody>

				{ /* ── Typography panel ── */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Font size (desktop)', 'sgs-blocks' ) }
							value={ attributes.fontSize }
							onChange={ ( val ) => setAttributes( { fontSize: val } ) }
							min={ 8 }
							max={ 120 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ attributes.fontSizeUnit }
							options={ UNIT_OPTIONS_PX }
							onChange={ ( val ) => setAttributes( { fontSizeUnit: val } ) }
							__nextHasNoMarginBottom
						/>
					</div>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Font size (tablet)', 'sgs-blocks' ) }
							value={ attributes.fontSizeTablet || '' }
							onChange={ ( val ) => setAttributes( { fontSizeTablet: val } ) }
							min={ 8 }
							max={ 120 }
							step={ 1 }
							__nextHasNoMarginBottom
							allowReset
						/>
						<RangeControl
							label={ __( 'Font size (mobile)', 'sgs-blocks' ) }
							value={ attributes.fontSizeMobile || '' }
							onChange={ ( val ) => setAttributes( { fontSizeMobile: val } ) }
							min={ 8 }
							max={ 96 }
							step={ 1 }
							__nextHasNoMarginBottom
							allowReset
						/>
					</div>
					<SelectControl
						label={ __( 'Font weight', 'sgs-blocks' ) }
						value={ attributes.fontWeight }
						options={ FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) => setAttributes( { fontWeight: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Text transform', 'sgs-blocks' ) }
						value={ attributes.textTransform }
						options={ TEXT_TRANSFORM_OPTIONS }
						onChange={ ( val ) => setAttributes( { textTransform: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Font style', 'sgs-blocks' ) }
						value={ fontStyle }
						options={ FONT_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { fontStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Text decoration', 'sgs-blocks' ) }
						value={ textDecoration }
						options={ TEXT_DECORATION_OPTIONS }
						onChange={ ( val ) => setAttributes( { textDecoration: val } ) }
						__nextHasNoMarginBottom
					/>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Line height', 'sgs-blocks' ) }
							value={ attributes.lineHeight }
							onChange={ ( val ) => setAttributes( { lineHeight: val } ) }
							min={ 0.8 }
							max={ 3 }
							step={ 0.05 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ attributes.lineHeightUnit }
							options={ UNIT_OPTIONS_EM }
							onChange={ ( val ) => setAttributes( { lineHeightUnit: val } ) }
							__nextHasNoMarginBottom
						/>
					</div>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Letter spacing', 'sgs-blocks' ) }
							value={ attributes.letterSpacing }
							onChange={ ( val ) => setAttributes( { letterSpacing: val } ) }
							min={ -0.1 }
							max={ 0.5 }
							step={ 0.01 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ attributes.letterSpacingUnit }
							options={ UNIT_OPTIONS_EM }
							onChange={ ( val ) => setAttributes( { letterSpacingUnit: val } ) }
							__nextHasNoMarginBottom
						/>
					</div>
				</PanelBody>

				{ /* ── Layout panel ── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ textAlign }
						options={ TEXT_ALIGN_OPTIONS }
						onChange={ ( val ) => setAttributes( { textAlign: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Advanced panel ── */ }
				<PanelBody title={ __( 'Advanced', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Inherit style from parent', 'sgs-blocks' ) }
						help={ __( 'When enabled, all block-level typography styles are suppressed and the element inherits from its parent container.', 'sgs-blocks' ) }
						checked={ !! inheritStyle }
						onChange={ ( val ) => setAttributes( { inheritStyle: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Canvas ── */ }
			<div { ...blockProps }>
				<RichText
					tagName={ editorTag }
					className="wp-block-sgs-heading__text"
					value={ content }
					onChange={ ( val ) => setAttributes( { content: val } ) }
					placeholder={
						isSubheading
							? __( 'Subheading copy…', 'sgs-blocks' )
							: __( 'Section heading…', 'sgs-blocks' )
					}
					allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
					style={ textStyle }
				/>
			</div>
		</>
	);
}
