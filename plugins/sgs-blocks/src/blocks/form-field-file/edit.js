import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	RangeControl,
} from '@wordpress/components';

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
		maxFiles,
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
				<PanelBody title={ __( 'Field Settings', 'sgs-blocks' ) }>
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
					/>
					<TextControl
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Help text', 'sgs-blocks' ) }
						value={ helpText }
						onChange={ ( val ) =>
							setAttributes( { helpText: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Required', 'sgs-blocks' ) }
						checked={ required }
						onChange={ ( val ) =>
							setAttributes( { required: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width }
						options={ WIDTH_OPTIONS }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Upload Settings', 'sgs-blocks' ) }
					initialOpen={ false }
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
					/>
					<RangeControl
						label={ __( 'Maximum file size (MB)', 'sgs-blocks' ) }
						value={ maxSize }
						onChange={ ( val ) =>
							setAttributes( { maxSize: val } )
						}
						min={ 1 }
						max={ 50 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Maximum files', 'sgs-blocks' ) }
						value={ maxFiles }
						onChange={ ( val ) =>
							setAttributes( { maxFiles: val } )
						}
						min={ 1 }
						max={ 10 }
						__nextHasNoMarginBottom
					/>
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
