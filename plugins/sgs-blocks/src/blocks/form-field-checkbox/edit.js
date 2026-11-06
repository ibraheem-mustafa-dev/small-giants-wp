import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { sgsBorderPreview, backgroundPaintPreview, tierBoxLonghands, sgsLengthPreview, usePreviewTier } from '../../utils';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker, SgsBorderControl, SgsBoxControl, SgsLengthControl, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox } from '../../components';
import FormFieldAdvancedPanel from '../../components/FormFieldAdvancedPanel';
import { fieldLabelClasses } from '../../components/form-field-preview';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

import SgsFreeTextField from '../../components/SgsFreeTextField';
import AuthoredText from '../../components/AuthoredText';
const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
	{ label: __( 'Parent grid decides', 'sgs-blocks' ), value: 'auto' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		fieldName,
		label,
		helpText,
		required,
		width,
		options,
	} = attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--checkbox',
		`sgs-form-field--${ width }`,
		...fieldLabelClasses( attributes ),
		'card' === attributes.optionPresentation ? 'sgs-form-field--option-card' : '',
	].filter( Boolean ).join( ' ' );

	// Card rows on the canvas, as render.php paints them: row box (background, border, radius, padding, gap) on each
	// option, tick-box size and radius on the field, ticked fill on a ticked box.
	const previewTier = usePreviewTier();
	const [ colourPalette ] = useSettings( 'color.palette' );
	const isCard = 'card' === attributes.optionPresentation;
	const cardRowStyle = isCard
		? {
			...backgroundPaintPreview( attributes.rowBackground, '', colourPalette ),
			...sgsBorderPreview(
				{
					widthValues: attributes.rowBorderWidth,
					styleValue: attributes.rowBorderStyle,
					colourValue: attributes.rowBorderColour,
					radiusValues: attributes.rowBorderRadius,
				},
				previewTier,
				colourPalette,
				{ fallbackColour: 'currentColor' }
			),
			...tierBoxLonghands( attributes.rowPadding, previewTier, 'padding' ),
			gap: sgsLengthPreview( attributes.rowGap ),
		}
		: undefined;
	// optionRowMinHeight: the tap-area height of each option row, plain or card.
	const rowMinHeight = sgsLengthPreview( attributes.optionRowMinHeight );
	const rowStyle = cardRowStyle || rowMinHeight
		? { ...cardRowStyle, ...( rowMinHeight ? { minHeight: rowMinHeight } : {} ) }
		: undefined;
	const boxVars = isCard
		? {
			'--sgs-option-box-size': sgsLengthPreview( attributes.boxSize ),
			'--sgs-option-box-radius': sgsLengthPreview( attributes.boxRadius ),
		}
		: undefined;
	const tickedPaint = isCard ? backgroundPaintPreview( attributes.boxColourChecked, '', colourPalette ) : {};
	const blockProps = useBlockProps( { className, style: boxVars } );

	const updateOption = ( index, key, value ) => {
		const newOptions = [ ...options ];
		newOptions[ index ] = { ...newOptions[ index ], [ key ]: value };
		setAttributes( { options: newOptions } );
	};

	const removeOption = ( index ) => {
		const newOptions = options.filter( ( _, i ) => i !== index );
		setAttributes( { options: newOptions } );
	};

	const addOption = () => {
		const newOptions = [
			...options,
			{
				value: `option-${ options.length + 1 }`,
				label: `Option ${ options.length + 1 }`,
			},
		];
		setAttributes( { options: newOptions } );
	};

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={ __( 'Field Settings', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							fieldName: '',
							label: '',
							helpText: '',
							required: false,
							width: 'full',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Field name', 'sgs-blocks' ) }
						hasValue={ () => fieldName !== '' }
						onDeselect={ () => setAttributes( { fieldName: '' } ) }
						isShownByDefault
					>
						<TextControl
							label={ __( 'Field name', 'sgs-blocks' ) }
							value={ fieldName }
							onChange={ ( val ) =>
								setAttributes( { fieldName: val } )
							}
							help={ __(
								'Machine name used in submission data',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Label', 'sgs-blocks' ) }
						hasValue={ () => label !== '' }
						onDeselect={ () => setAttributes( { label: '' } ) }
						isShownByDefault
					>
						<SgsFreeTextField type="rich" noLink
							label={ __( 'Label', 'sgs-blocks' ) }
							value={ label }
							onChange={ ( val ) => setAttributes( { label: val } ) }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Required', 'sgs-blocks' ) }
						hasValue={ () => required !== false }
						onDeselect={ () => setAttributes( { required: false } ) }
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Required', 'sgs-blocks' ) }
							checked={ required }
							onChange={ ( val ) =>
								setAttributes( { required: val } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Help text', 'sgs-blocks' ) }
						hasValue={ () => helpText !== '' }
						onDeselect={ () => setAttributes( { helpText: '' } ) }
					>
						<TextControl
							label={ __( 'Help text', 'sgs-blocks' ) }
							value={ helpText }
							onChange={ ( val ) =>
								setAttributes( { helpText: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Width', 'sgs-blocks' ) }
						hasValue={ () => width !== 'full' }
						onDeselect={ () => setAttributes( { width: 'full' } ) }
					>
						<SelectControl
							label={ __( 'Width', 'sgs-blocks' ) }
							value={ width }
							options={ WIDTH_OPTIONS }
							onChange={ ( val ) => setAttributes( { width: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>

				<PanelBody title={ __( 'Options', 'sgs-blocks' ) }>
					{ options.map( ( option, index ) => (
						<div
							key={ index }
							style={ {
								marginBottom: '12px',
								paddingBottom: '12px',
								borderBottom: '1px solid #ddd',
							} }
						>
							<TextControl
								label={ __( 'Value', 'sgs-blocks' ) }
								value={ option.value || '' }
								onChange={ ( val ) =>
									updateOption( index, 'value', val )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ option.label || '' }
								onChange={ ( val ) =>
									updateOption( index, 'label', val )
								}
								style={ { marginTop: '8px' } }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<ToggleControl
								label={ __( 'Ticked by default', 'sgs-blocks' ) }
								checked={ !! option.checked }
								onChange={ ( val ) =>
									updateOption( index, 'checked', val )
								}
								__nextHasNoMarginBottom
							/>
							<Button
								isDestructive
								isSmall
								onClick={ () => removeOption( index ) }
								style={ { marginTop: '8px' } }
							>
								{ __( 'Remove', 'sgs-blocks' ) }
							</Button>
						</div>
					) ) }
					<Button isPrimary onClick={ addOption }>
						{ __( 'Add Option', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
				<ToolsPanel
					label={ __( 'Option rows', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							optionRowMinHeight: '',
							optionPresentation: 'plain',
							rowBackground: '',
							rowBorderWidth: {},
							rowBorderStyle: '',
							rowBorderColour: '',
							rowBorderRadius: {},
							rowPadding: {},
							rowGap: '',
							boxSize: '',
							boxRadius: '',
							boxColourChecked: '',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Row minimum height', 'sgs-blocks' ) }
						hasValue={ () => !! attributes.optionRowMinHeight }
						onDeselect={ () => setAttributes( { optionRowMinHeight: '' } ) }
					>
						<SgsLengthControl
							presets={ false }
							label={ __( 'Row minimum height', 'sgs-blocks' ) }
							help={ __( 'Empty keeps 44px, the touch-target minimum. Smaller only to match a supplied design.', 'sgs-blocks' ) }
							value={ attributes.optionRowMinHeight ?? '' }
							onChange={ ( val ) => setAttributes( { optionRowMinHeight: val || undefined } ) }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Option presentation', 'sgs-blocks' ) }
						hasValue={ () => 'card' === attributes.optionPresentation }
						onDeselect={ () => setAttributes( { optionPresentation: 'plain' } ) }
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Option presentation', 'sgs-blocks' ) }
							value={ attributes.optionPresentation || 'plain' }
							options={ [
								{ label: __( 'Plain row', 'sgs-blocks' ), value: 'plain' },
								{ label: __( 'Card (boxed row, custom tick box)', 'sgs-blocks' ), value: 'card' },
							] }
							onChange={ ( val ) => setAttributes( { optionPresentation: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					{ isCard && (
						<>
							<ToolsPanelItem
								label={ __( 'Row background', 'sgs-blocks' ) }
								hasValue={ () => !! attributes.rowBackground }
								onDeselect={ () => setAttributes( { rowBackground: '' } ) }
							>
								<DesignTokenPicker
									label={ __( 'Row background', 'sgs-blocks' ) }
									value={ attributes.rowBackground }
									onChange={ ( val ) => setAttributes( { rowBackground: val ?? '' } ) }
									linked
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Row border', 'sgs-blocks' ) }
								hasValue={ () => !! ( attributes.rowBorderStyle || attributes.rowBorderColour || Object.keys( attributes.rowBorderWidth ?? {} ).length || Object.keys( attributes.rowBorderRadius ?? {} ).length ) }
								onDeselect={ () => setAttributes( { rowBorderWidth: {}, rowBorderStyle: '', rowBorderColour: '', rowBorderRadius: {} } ) }
							>
								<SgsBorderControl
									widthValues={ attributes.rowBorderWidth ?? {} }
									onWidthChange={ ( next ) => setAttributes( { rowBorderWidth: next } ) }
									widthPresets={ [ '10', '20', '30' ] }
									styleValue={ attributes.rowBorderStyle }
									onStyleChange={ ( val ) => setAttributes( { rowBorderStyle: val } ) }
									colourLabel={ __( 'Row border colour', 'sgs-blocks' ) }
									colourValue={ attributes.rowBorderColour }
									onColourChange={ ( val ) => setAttributes( { rowBorderColour: val ?? '' } ) }
									colourLinked={ true }
									radiusValues={ {
										base: attributes.rowBorderRadius?.desktop ?? {},
										tablet: attributes.rowBorderRadius?.tablet ?? {},
										mobile: attributes.rowBorderRadius?.mobile ?? {},
									} }
									onRadiusChange={ ( tier, next ) => {
										const key = tier === 'base' ? 'desktop' : tier;
										setAttributes( { rowBorderRadius: { ...attributes.rowBorderRadius, [ key ]: next } } );
									} }
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Row padding', 'sgs-blocks' ) }
								hasValue={ () => Object.keys( attributes.rowPadding ?? {} ).length > 0 }
								onDeselect={ () => setAttributes( { rowPadding: {} } ) }
							>
								<ResponsiveOverride
									value={ attributes.rowPadding }
									onChange={ ( obj ) => setAttributes( { rowPadding: obj } ) }
								>
									{ ( { ownValue, setOwnValue } ) => (
										<SgsBoxControl
											label={ __( 'Row padding', 'sgs-blocks' ) }
											values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
											units={ BOX_UNITS }
											presets
											onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
										/>
									) }
								</ResponsiveOverride>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Gap between box and label', 'sgs-blocks' ) }
								hasValue={ () => !! attributes.rowGap }
								onDeselect={ () => setAttributes( { rowGap: '' } ) }
							>
								<SgsLengthControl
									presets={ false }
									label={ __( 'Gap between box and label', 'sgs-blocks' ) }
									value={ attributes.rowGap ?? '' }
									onChange={ ( val ) => setAttributes( { rowGap: val || undefined } ) }
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Tick box size', 'sgs-blocks' ) }
								hasValue={ () => !! attributes.boxSize }
								onDeselect={ () => setAttributes( { boxSize: '' } ) }
							>
								<SgsLengthControl
									presets={ false }
									label={ __( 'Tick box size', 'sgs-blocks' ) }
									value={ attributes.boxSize ?? '' }
									onChange={ ( val ) => setAttributes( { boxSize: val || undefined } ) }
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Tick box corner radius', 'sgs-blocks' ) }
								hasValue={ () => !! attributes.boxRadius }
								onDeselect={ () => setAttributes( { boxRadius: '' } ) }
							>
								<SgsLengthControl
									presets={ false }
									label={ __( 'Tick box corner radius', 'sgs-blocks' ) }
									value={ attributes.boxRadius ?? '' }
									onChange={ ( val ) => setAttributes( { boxRadius: val || undefined } ) }
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Ticked box colour', 'sgs-blocks' ) }
								hasValue={ () => !! attributes.boxColourChecked }
								onDeselect={ () => setAttributes( { boxColourChecked: '' } ) }
							>
								<DesignTokenPicker
									label={ __( 'Ticked box colour', 'sgs-blocks' ) }
									value={ attributes.boxColourChecked }
									onChange={ ( val ) => setAttributes( { boxColourChecked: val ?? '' } ) }
									linked
								/>
							</ToolsPanelItem>
						</>
					) }
				</ToolsPanel>
				<FormFieldAdvancedPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					features={ [ 'msgRequired' ] }
				/>
			</InspectorControls>

			<div { ...blockProps }>
				{ label && (
					<label className="sgs-form-field__label">
						<AuthoredText value={ label } />
						{ required && (
							<span className="sgs-form-field__required">
								*
							</span>
						) }
					</label>
				) }
				<fieldset className="sgs-form-field__options">
					{ options.map( ( option, index ) => (
						<label
							key={ index }
							className="sgs-form-field__option"
							style={ rowStyle }
						>
							<input
								type="checkbox"
								name={ `preview-${ fieldName }` }
								value={ option.value || '' }
								checked={ !! option.checked }
								readOnly
								disabled
								style={ option.checked && tickedPaint.backgroundColor ? { ...tickedPaint, borderColor: tickedPaint.backgroundColor } : undefined }
							/>
							<span>{ option.label || '' }</span>
						</label>
					) ) }
				</fieldset>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
