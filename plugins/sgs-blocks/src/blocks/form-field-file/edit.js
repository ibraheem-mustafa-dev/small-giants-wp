import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	SelectControl,
	RangeControl,
} from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import FieldLabelLayoutPanel from '../../components/FieldLabelLayoutPanel';
import ZonePanel from './ZonePanel';

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
];

// labelStyle 'hidden' leaves the label to screen readers only, as field_label() does.
const SR_ONLY = {
	position: 'absolute',
	width: '1px',
	height: '1px',
	overflow: 'hidden',
	clipPath: 'inset(50%)',
	whiteSpace: 'nowrap',
};

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

	const isPanel = 'panel' === attributes.zoneStyle;
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
				<FieldLabelLayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				<ZonePanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>

			<div { ...blockProps }>
				{ label && (
					<label
						className={ 'hidden' === attributes.labelStyle ? 'sgs-form-field__label sgs-sr-only' : 'sgs-form-field__label' }
						style={ 'hidden' === attributes.labelStyle ? SR_ONLY : undefined }
					>
						{ label }
						{ required && (
							<span className="sgs-form-field__required">
								*
							</span>
						) }
					</label>
				) }
				<div
					className={ isPanel ? 'sgs-form-field__file-zone sgs-form-field__file-zone--panel' : 'sgs-form-field__file-zone' }
					style={ isPanel ? undefined : {
						border: '2px dashed #ccc',
						borderRadius: '8px',
						padding: '40px',
						textAlign: 'center',
						backgroundColor: '#f9f9f9',
					} }
				>
					<div className="sgs-form-field__file-label" style={ isPanel ? undefined : { border: 'none', padding: 0 } }>
						<span>
							{ uploadText || __(
								'Drag a file here or click to browse',
								'sgs-blocks'
							) }
						</span>
						<span
							className="sgs-form-field__file-hint"
							style={ isPanel ? undefined : {
								display: 'block',
								marginTop: '8px',
								fontSize: '14px',
								color: '#666',
							} }
						>
							{ __( 'Max', 'sgs-blocks' ) } { maxSize }{ ' ' }
							{ __( 'MB', 'sgs-blocks' ) }
						</span>
						{ isPanel && helpText && (
							<p className="sgs-form-field__help">{ helpText }</p>
						) }
						{ isPanel && (
							<span className="sgs-form-field__file-button" aria-hidden="true">
								{ attributes.buttonLabel || __( 'Choose file', 'sgs-blocks' ) }
							</span>
						) }
					</div>
				</div>
				{ ! isPanel && helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
