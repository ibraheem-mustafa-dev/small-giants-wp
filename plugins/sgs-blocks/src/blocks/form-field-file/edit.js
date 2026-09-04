import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
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
	const {
		fieldName,
		label,
		placeholder,
		helpText,
		required,
		width,
		allowedTypes,
		maxSize,
		uploadText,
	} = attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--file',
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
							helpText: '',
							uploadText: '',
							required: false,
							width: 'full',
							allowedTypes: [ 'image/*', 'application/pdf' ],
							maxSize: 10,
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
						label={ __( 'Drop-zone text', 'sgs-blocks' ) }
						hasValue={ () => uploadText !== '' }
						onDeselect={ () => setAttributes( { uploadText: '' } ) }
					>
						<TextControl
							label={ __( 'Drop-zone text', 'sgs-blocks' ) }
							value={ uploadText }
							onChange={ ( val ) =>
								setAttributes( { uploadText: val } )
							}
							placeholder={ __(
								'Drag a file here or click to browse',
								'sgs-blocks'
							) }
							help={ __(
								'Leave blank to use the default drop-zone copy.',
								'sgs-blocks'
							) }
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
						label={ __( 'Allowed file types', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( allowedTypes ) !==
							JSON.stringify( [ 'image/*', 'application/pdf' ] )
						}
						onDeselect={ () =>
							setAttributes( {
								allowedTypes: [ 'image/*', 'application/pdf' ],
							} )
						}
					>
						<TextControl
							label={ __( 'Allowed file types', 'sgs-blocks' ) }
							value={ allowedTypes }
							onChange={ ( val ) =>
								setAttributes( { allowedTypes: val } )
							}
							help={ __(
								'E.g., image/*,application/pdf,.docx',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Maximum file size (MB)', 'sgs-blocks' ) }
						hasValue={ () => maxSize !== 10 }
						onDeselect={ () => setAttributes( { maxSize: 10 } ) }
					>
						<RangeControl
							label={ __( 'Maximum file size (MB)', 'sgs-blocks' ) }
							value={ maxSize }
							onChange={ ( val ) =>
								setAttributes( { maxSize: val } )
							}
							min={ 1 }
							max={ 50 }
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
				<div
					className="sgs-form-field__file-zone"
					style={ {
						border: '2px dashed #ccc',
						borderRadius: '8px',
						padding: '40px',
						textAlign: 'center',
						backgroundColor: '#f9f9f9',
					} }
				>
					<div className="sgs-form-field__file-label">
						<span>
							{ __(
								'Drag a file here or click to browse',
								'sgs-blocks'
							) }
						</span>
						<span
							className="sgs-form-field__file-hint"
							style={ {
								display: 'block',
								marginTop: '8px',
								fontSize: '14px',
								color: '#666',
							} }
						>
							{ __( 'Max', 'sgs-blocks' ) } { maxSize }{ ' ' }
							{ __( 'MB', 'sgs-blocks' ) }
						</span>
					</div>
				</div>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
