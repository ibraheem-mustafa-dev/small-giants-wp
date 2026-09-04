import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	SelectControl,
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
		placeholder,
		helpText,
		required,
		width,
		min,
		max,
		step,
	} = attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--number',
		`sgs-form-field--${ width }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={ __( 'Field Settings', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							fieldName: '',
							label: '',
							placeholder: '',
							helpText: '',
							required: false,
							width: 'full',
							min: '',
							max: '',
							step: '1',
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
						label={ __( 'Placeholder', 'sgs-blocks' ) }
						hasValue={ () => placeholder !== '' }
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
					<ToolsPanelItem
						label={ __( 'Minimum value', 'sgs-blocks' ) }
						hasValue={ () => min !== '' }
						onDeselect={ () => setAttributes( { min: '' } ) }
					>
						<TextControl
							label={ __( 'Minimum value', 'sgs-blocks' ) }
							value={ min }
							onChange={ ( val ) => setAttributes( { min: val } ) }
							type="number"
							help={ __(
								'Leave blank for no minimum',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Maximum value', 'sgs-blocks' ) }
						hasValue={ () => max !== '' }
						onDeselect={ () => setAttributes( { max: '' } ) }
					>
						<TextControl
							label={ __( 'Maximum value', 'sgs-blocks' ) }
							value={ max }
							onChange={ ( val ) => setAttributes( { max: val } ) }
							type="number"
							help={ __(
								'Leave blank for no maximum',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Step', 'sgs-blocks' ) }
						hasValue={ () => step !== '1' }
						onDeselect={ () => setAttributes( { step: '1' } ) }
					>
						<TextControl
							label={ __( 'Step', 'sgs-blocks' ) }
							value={ step }
							onChange={ ( val ) => setAttributes( { step: val } ) }
							type="number"
							help={ __(
								'Increment/decrement amount (default: 1)',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>
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
				<input
					type="number"
					className="sgs-form-field__input"
					placeholder={ placeholder }
					min={ min }
					max={ max }
					step={ step }
					disabled
				/>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
