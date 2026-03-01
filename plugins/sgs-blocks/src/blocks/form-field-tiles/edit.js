import {
	__ } from '@wordpress/i18n';
import { useBlockProps,
	InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	RangeControl,
	Button,
	NumberControl,
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
		tiles,
		multiSelect,
		columns,
		minLength,
		maxLength,
		pattern,
		customError,
	} = attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--tiles',
		`sgs-form-field--${ width }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const updateTile = ( index, key, value ) => {
		const newTiles = [ ...tiles ];
		newTiles[ index ] = { ...newTiles[ index ], [ key ]: value };
		setAttributes( { tiles: newTiles } );
	};

	const removeTile = ( index ) => {
		const newTiles = tiles.filter( ( _, i ) => i !== index );
		setAttributes( { tiles: newTiles } );
	};

	const addTile = () => {
		const newTiles = [
			...tiles,
			{
				value: `tile-${ tiles.length + 1 }`,
				label: `Tile ${ tiles.length + 1 }`,
				icon: '',
			},
		];
		setAttributes( { tiles: newTiles } );
	};

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
					<ToggleControl
						label={ __( 'Allow multiple selection', 'sgs-blocks' ) }
						checked={ multiSelect }
						onChange={ ( val ) =>
							setAttributes( { multiSelect: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( val ) =>
							setAttributes( { columns: val } )
						}
						min={ 2 }
						max={ 4 }
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
					title={ __( 'Tiles', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ tiles.map( ( tile, index ) => (
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
								value={ tile.value || '' }
								onChange={ ( val ) =>
									updateTile( index, 'value', val )
								}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ tile.label || '' }
								onChange={ ( val ) =>
									updateTile( index, 'label', val )
								}
								style={ { marginTop: '8px' } }
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Icon (emoji or text)', 'sgs-blocks' ) }
								value={ tile.icon || '' }
								onChange={ ( val ) =>
									updateTile( index, 'icon', val )
								}
								style={ { marginTop: '8px' } }
								__nextHasNoMarginBottom
							/>
							<Button
								isDestructive
								isSmall
								onClick={ () => removeTile( index ) }
								style={ { marginTop: '8px' } }
							>
								{ __( 'Remove', 'sgs-blocks' ) }
							</Button>
						</div>
					) ) }
					<Button isPrimary onClick={ addTile }>
						{ __( 'Add Tile', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			
				<PanelBody
					title={ __( 'Validation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<NumberControl
						label={ __( 'Min length', 'sgs-blocks' ) }
						value={ minLength }
						onChange={ ( val ) =>
							setAttributes( { minLength: parseInt( val, 10 ) || 0 } )
						}
						min={ 0 }
						help={ __(
							'Minimum characters required (0 = no minimum).',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
					<NumberControl
						label={ __( 'Max length', 'sgs-blocks' ) }
						value={ maxLength }
						onChange={ ( val ) =>
							setAttributes( { maxLength: parseInt( val, 10 ) || 0 } )
						}
						min={ 0 }
						help={ __(
							'Maximum characters allowed (0 = no limit).',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Pattern (regex)', 'sgs-blocks' ) }
						value={ pattern }
						onChange={ ( val ) =>
							setAttributes( { pattern: val } )
						}
						help={ __(
							'HTML5 pattern (regex, no delimiters). Leave empty for no check.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Custom error message', 'sgs-blocks' ) }
						value={ customError }
						onChange={ ( val ) =>
							setAttributes( { customError: val } )
						}
						help={ __(
							'Override the default validation error shown to users.',
							'sgs-blocks'
						) }
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
					className="sgs-form-tiles"
					style={ {
						display: 'grid',
						gridTemplateColumns: `repeat(${ columns }, 1fr)`,
						gap: '12px',
					} }
				>
					{ tiles.map( ( tile, index ) => (
						<label
							key={ index }
							className="sgs-form-tile"
							style={ {
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								padding: '16px',
								border: '2px solid #ddd',
								borderRadius: '8px',
								cursor: 'pointer',
							} }
						>
							<input
								type={ multiSelect ? 'checkbox' : 'radio' }
								name={ `preview-${ fieldName }` }
								value={ tile.value || '' }
								style={ { display: 'none' } }
								disabled
							/>
							{ tile.icon && (
								<span
									style={ {
										fontSize: '32px',
										marginBottom: '8px',
									} }
								>
									{ tile.icon }
								</span>
							) }
							<span>{ tile.label || '' }</span>
						</label>
					) ) }
				</div>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
