import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	Button,
} from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
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
		'sgs-form-field--radio',
		`sgs-form-field--${ width }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

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
						<TextControl
							label={ __( 'Label', 'sgs-blocks' ) }
							value={ label }
							onChange={ ( val ) => setAttributes( { label: val } ) }
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
				<fieldset className="sgs-form-field__options">
					{ options.map( ( option, index ) => (
						<label
							key={ index }
							className="sgs-form-field__option"
						>
							<input
								type="radio"
								name={ `preview-${ fieldName }` }
								value={ option.value || '' }
								disabled
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
