/**
 * Message preview fields: editor component. The canvas is a read-only picture of the front end; the boxes
 * themselves are defined in the inspector.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { Fragment } from '@wordpress/element';
import { NumberControl } from '../../components/primitives';
import {
	Button,
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import {
	ResponsiveOverride,
	SgsBorderControl,
	SgsColourPanel,
	SgsLengthControl,
	TypographyControls,
	fillRow,
	textRow,
} from '../../components';
import {
	colourVar,
	resolveTier,
	sgsBorderPreview,
	typographyPreviewStyle,
	usePreviewTier,
} from '../../utils';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];

/**
 * @param {*} raw A stored length: a bare number means px.
 * @return {string} A CSS length, or ''.
 */
function px( raw ) {
	if ( raw === undefined || raw === null || raw === '' ) {
		return '';
	}
	return /^-?\d+(\.\d+)?$/.test( String( raw ) )
		? `${ raw }px`
		: String( raw );
}

/**
 * A key no other field uses.
 *
 * @param {string} base   Wanted key.
 * @param {Array}  fields Existing fields.
 * @return {string} Unique key.
 */
function uniqueKey( base, fields ) {
	let key = base;
	let n = 2;
	while ( fields.some( ( f ) => f.key === key ) ) {
		key = `${ base }-${ n++ }`;
	}
	return key;
}

const cleanKey = ( val ) => val.toLowerCase().replace( /[^a-z0-9_-]+/g, '' );

export default function Edit( { attributes, setAttributes } ) {
	const tier = usePreviewTier();
	const { fields, group, rememberNote } = attributes;

	const setField = ( index, patch ) =>
		setAttributes( {
			fields: fields.map( ( f, i ) =>
				i === index ? { ...f, ...patch } : f
			),
		} );
	const moveField = ( index, by ) => {
		const next = [ ...fields ];
		const [ item ] = next.splice( index, 1 );
		next.splice( index + by, 0, item );
		setAttributes( { fields: next } );
	};

	const gap = px( resolveTier( attributes.gap, tier ).value );
	const inputMin = px( resolveTier( attributes.inputMinHeight, tier ).value );

	const blockProps = useBlockProps( {
		className: 'sgs-message-preview sgs-message-preview--editor',
		'data-group': group,
		style: gap ? { gap } : {},
	} );

	const inputStyle = {
		...typographyPreviewStyle( attributes, 'input', tier ),
		...sgsBorderPreview(
			{
				widthValues: attributes.inputBorderWidth,
				styleValue: attributes.inputBorderStyle,
				colourValue: attributes.inputBorderColour,
				radiusValues: attributes.inputBorderRadius,
			},
			tier,
			undefined
		),
		...( attributes.inputTextColour
			? { color: colourVar( attributes.inputTextColour ) }
			: {} ),
		...( attributes.inputBackgroundColour
			? { backgroundColor: colourVar( attributes.inputBackgroundColour ) }
			: {} ),
		...( inputMin ? { minHeight: inputMin } : {} ),
	};
	const labelStyle = {
		...typographyPreviewStyle( attributes, 'label', tier ),
		...( attributes.labelColour
			? { color: colourVar( attributes.labelColour ) }
			: {} ),
	};

	return (
		<div { ...blockProps }>
			<InspectorControls group="styles">
				<SgsColourPanel
					initialOpen
					rows={ [
						textRow( {
							key: 'label',
							label: __( 'Labels', 'sgs-blocks' ),
							attrs: { base: 'labelColour' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'inputText',
							label: __( 'Box text', 'sgs-blocks' ),
							attrs: { base: 'inputTextColour' },
							attributes,
							setAttributes,
						} ),
						fillRow( {
							key: 'inputBackground',
							label: __( 'Box background', 'sgs-blocks' ),
							attrs: { base: 'inputBackgroundColour' },
							attributes,
							setAttributes,
						} ),
					] }
				/>
				<PanelBody
					title={ __( 'Label text', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="label"
						showResponsive
						fontSizePresets
						showFontFamily
						showWeight
						showLineHeight
						showLetterSpacing
						showTransform
						showTextAlign
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Box text', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="input"
						showResponsive
						fontSizePresets
						showFontFamily
						showWeight
						showLineHeight
						showLetterSpacing
						showTransform
						showTextAlign
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Boxes', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						label={ __( 'Box height', 'sgs-blocks' ) }
						value={ attributes.inputMinHeight }
						onChange={ ( obj ) =>
							setAttributes( { inputMinHeight: obj } )
						}
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								scale="spacing"
								label={ __( 'Box height', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder="52px"
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
					<SgsBorderControl
						widthValues={ attributes.inputBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { inputBorderWidth: next } )
						}
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.inputBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { inputBorderStyle: val } )
						}
						colourLabel={ __( 'Box border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.inputBorderColour,
								onChange: ( val ) =>
									setAttributes( {
										inputBorderColour: val ?? '',
									} ),
								linked: true,
							},
						] }
						radiusValues={ {
							base: attributes.inputBorderRadius?.desktop ?? {},
							tablet: attributes.inputBorderRadius?.tablet ?? {},
							mobile: attributes.inputBorderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( t, next ) => {
							const key = t === 'base' ? 'desktop' : t;
							setAttributes( {
								inputBorderRadius: {
									...attributes.inputBorderRadius,
									[ key ]: next,
								},
							} );
						} }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls>
				<PanelBody initialOpen title={ __( 'Boxes', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Group name', 'sgs-blocks' ) }
						help={ __(
							'Message preview lines with the same group name show what is typed here.',
							'sgs-blocks'
						) }
						value={ group }
						onChange={ ( val ) =>
							setAttributes( { group: cleanKey( val ) } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<Button
						variant="secondary"
						onClick={ () =>
							setAttributes( {
								fields: [
									...fields,
									{
										key: uniqueKey( 'box', fields ),
										label: __( 'New box', 'sgs-blocks' ),
										fieldType: 'text',
										rows: 3,
										placeholder: '',
										defaultValue: '',
										maxLength: 0,
									},
								],
							} )
						}
					>
						{ __( 'Add a box', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				{ fields.map( ( field, index ) => (
					<Fragment key={ field.key || index }>
						<PanelBody
							title={ field.label || __( 'Box', 'sgs-blocks' ) }
							initialOpen={ false }
						>
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ field.label }
								onChange={ ( val ) =>
									setField( index, { label: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<SelectControl
								label={ __( 'Box type', 'sgs-blocks' ) }
								value={ field.fieldType }
								options={ [
									{
										value: 'text',
										label: __( 'One line', 'sgs-blocks' ),
									},
									{
										value: 'textarea',
										label: __(
											'Several lines',
											'sgs-blocks'
										),
									},
								] }
								onChange={ ( val ) =>
									setField( index, { fieldType: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Placeholder', 'sgs-blocks' ) }
								value={ field.placeholder }
								onChange={ ( val ) =>
									setField( index, { placeholder: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Starting text', 'sgs-blocks' ) }
								help={ __(
									'Filled in the box until the visitor types. Give the matching preview line the same starting text.',
									'sgs-blocks'
								) }
								value={ field.defaultValue }
								onChange={ ( val ) =>
									setField( index, { defaultValue: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<NumberControl
								label={ __( 'Longest allowed', 'sgs-blocks' ) }
								help={ __(
									'Characters. 0 means no limit.',
									'sgs-blocks'
								) }
								value={ field.maxLength }
								min={ 0 }
								onChange={ ( val ) =>
									setField( index, {
										maxLength: Math.max(
											0,
											Number( val ) || 0
										),
									} )
								}
								__next40pxDefaultSize
							/>
						</PanelBody>
						<PanelBody
							title={
								( field.label || __( 'Box', 'sgs-blocks' ) ) +
								': ' +
								__( 'name and order', 'sgs-blocks' )
							}
							initialOpen={ false }
						>
							{ field.fieldType === 'textarea' ? (
								<NumberControl
									label={ __(
										'Visible lines',
										'sgs-blocks'
									) }
									value={ field.rows }
									min={ 2 }
									max={ 12 }
									onChange={ ( val ) =>
										setField( index, {
											rows: Number( val ) || 3,
										} )
									}
									__next40pxDefaultSize
								/>
							) : null }
							<TextControl
								label={ __( 'Box name', 'sgs-blocks' ) }
								help={ __(
									'Preview lines pick this box by name. Letters, numbers and dashes.',
									'sgs-blocks'
								) }
								value={ field.key }
								onChange={ ( val ) =>
									setField( index, { key: cleanKey( val ) } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<div className="sgs-message-preview__field-actions">
								<Button
									variant="tertiary"
									disabled={ index === 0 }
									onClick={ () => moveField( index, -1 ) }
								>
									{ __( 'Move up', 'sgs-blocks' ) }
								</Button>
								<Button
									variant="tertiary"
									disabled={ index === fields.length - 1 }
									onClick={ () => moveField( index, 1 ) }
								>
									{ __( 'Move down', 'sgs-blocks' ) }
								</Button>
								<Button
									variant="tertiary"
									isDestructive
									onClick={ () =>
										setAttributes( {
											fields: fields.filter(
												( f, i ) => i !== index
											),
										} )
									}
								>
									{ __( 'Remove', 'sgs-blocks' ) }
								</Button>
							</div>
						</PanelBody>
					</Fragment>
				) ) }
				<PanelBody
					title={ __( 'Layout and saved note', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveOverride
						label={ __( 'Space between boxes', 'sgs-blocks' ) }
						value={ attributes.gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								scale="spacing"
								label={ __(
									'Space between boxes',
									'sgs-blocks'
								) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder="14px"
								units={ LENGTH_UNITS }
								onChange={ ( val ) => setOwnValue( val || '' ) }
							/>
						) }
					</ResponsiveOverride>
					<ToggleControl
						label={ __(
							'Keep the note while the visitor browses',
							'sgs-blocks'
						) }
						help={ __(
							'Saves the note in this browser tab only, so a gift message box at checkout can fill itself in. Nothing is sent anywhere.',
							'sgs-blocks'
						) }
						checked={ !! rememberNote }
						onChange={ ( val ) =>
							setAttributes( { rememberNote: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ fields.map( ( field, index ) => {
				return (
					<div
						className="sgs-message-preview__field"
						key={ field.key || index }
					>
						<span
							className="sgs-message-preview__label"
							style={ labelStyle }
						>
							{ field.label }
						</span>
						{ field.fieldType === 'textarea' ? (
							<textarea
								className="sgs-message-preview__input"
								style={ inputStyle }
								readOnly
								tabIndex={ -1 }
								aria-hidden="true"
								placeholder={ field.placeholder }
								value={ field.defaultValue }
								rows={ field.rows }
							/>
						) : (
							<input
								className="sgs-message-preview__input"
								style={ inputStyle }
								readOnly
								tabIndex={ -1 }
								aria-hidden="true"
								placeholder={ field.placeholder }
								value={ field.defaultValue }
							/>
						) }
					</div>
				);
			} ) }
		</div>
	);
}
