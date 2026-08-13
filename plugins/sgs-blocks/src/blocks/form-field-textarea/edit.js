import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	RangeControl,
} from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { fieldName, label, placeholder, helpText, required, width, rows } =
		attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--textarea',
		`sgs-form-field--${ width }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Field Settings', 'sgs-blocks' ) }>
					<ToolsPanel
						label={ __( 'Field settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								fieldName: '',
								label: '',
								placeholder: '',
								helpText: '',
								rows: 4,
								required: false,
								width: 'full',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Field name', 'sgs-blocks' ) }
							hasValue={ () => !! fieldName }
							onDeselect={ () => setAttributes( { fieldName: '' } ) }
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
							hasValue={ () => !! label }
							onDeselect={ () => setAttributes( { label: '' } ) }
							isShownByDefault
						>
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ label }
								onChange={ ( val ) => setAttributes( { label: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Placeholder', 'sgs-blocks' ) }
							hasValue={ () => !! placeholder }
							onDeselect={ () => setAttributes( { placeholder: '' } ) }
						>
							<TextControl
								label={ __( 'Placeholder', 'sgs-blocks' ) }
								value={ placeholder }
								onChange={ ( val ) =>
									setAttributes( { placeholder: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Help text', 'sgs-blocks' ) }
							hasValue={ () => !! helpText }
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
							label={ __( 'Rows', 'sgs-blocks' ) }
							hasValue={ () => rows !== 4 }
							onDeselect={ () => setAttributes( { rows: 4 } ) }
						>
							<RangeControl
								label={ __( 'Rows', 'sgs-blocks' ) }
								value={ rows }
								onChange={ ( val ) => setAttributes( { rows: val } ) }
								min={ 2 }
								max={ 10 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
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
							label={ __( 'Width', 'sgs-blocks' ) }
							hasValue={ () => width !== 'full' }
							onDeselect={ () => setAttributes( { width: 'full' } ) }
							isShownByDefault
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
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ label && (
					<label className="sgs-form-field__label">
						{ label }
						{ required && (
							<span className="sgs-form-field__required">
								*
							</span>
						) }
					</label>
				) }
				<textarea
					className="sgs-form-field__input"
					placeholder={ placeholder }
					rows={ rows }
					disabled
				/>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
