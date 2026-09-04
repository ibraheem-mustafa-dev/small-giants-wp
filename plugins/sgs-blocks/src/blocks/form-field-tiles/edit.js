import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	RangeControl,
	Button,
} from '@wordpress/components';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { IconPicker, IconPreview, SgsColourPanel, fillRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { resolveResponsiveTier } from '../../utils';

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
];

const SELECTED_STYLE_OPTIONS = [
	{ label: __( 'Checkmark', 'sgs-blocks' ), value: 'checkmark' },
	{ label: __( 'Border', 'sgs-blocks' ), value: 'border' },
	{ label: __( 'Background', 'sgs-blocks' ), value: 'background' },
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
		selectedStyle,
		columns,
		backgroundColour,
		backgroundColourGradient,
		textColour,
		textColourGradient,
	} = attributes;

	// Contrast check for border — warn if border fails WCAG contrast against
	// the block's own background. When there's no background set or a gradient
	// is active, skip the check entirely.
	const formFieldTilesContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';


	// columns is a TIER OBJECT (Spec 35 pass 4) — this control only ever edits
	// the desktop tier (there is no per-tier UI here); resolve it for both the
	// RangeControl value and the inline grid-template-columns preview, or a
	// raw setAttributes({ columns: val }) would coerce the whole object-typed
	// attr to its block.json default (D563 bug class).
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;
	const setColumnsDesktop = ( val ) =>
		setAttributes( { columns: { ...( columns && typeof columns === 'object' ? columns : {} ), desktop: val } } );

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
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* Outer PanelBody removed 2026-08-13 — it duplicated this
				   ToolsPanel's own "Field settings" title with no
				   initialOpen, so the client saw the same words twice for
				   no collapse benefit (Spec 35 A5 note). */ }
					<ToolsPanel
						label={ __( 'Field settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								fieldName: '',
								label: '',
								helpText: '',
								required: false,
								multiSelect: false,
								columns: { desktop: 3, tablet: 2, mobile: 1 },
								width: 'full',
								selectedStyle: 'checkmark',
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
							label={ __( 'Allow multiple selection', 'sgs-blocks' ) }
							hasValue={ () => multiSelect !== false }
							onDeselect={ () => setAttributes( { multiSelect: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Allow multiple selection', 'sgs-blocks' ) }
								checked={ multiSelect }
								onChange={ ( val ) =>
									setAttributes( { multiSelect: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Columns', 'sgs-blocks' ) }
							hasValue={ () => columnsDesktop !== 3 }
							onDeselect={ () => setColumnsDesktop( 3 ) }
						>
							<RangeControl
								label={ __( 'Columns', 'sgs-blocks' ) }
								value={ columnsDesktop }
								onChange={ ( val ) =>
									setColumnsDesktop( val )
								}
								min={ 2 }
								max={ 4 }
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
							label={ __( 'Selected tile style', 'sgs-blocks' ) }
							hasValue={ () => selectedStyle !== 'checkmark' }
							onDeselect={ () =>
								setAttributes( { selectedStyle: 'checkmark' } )
							}
						>
							<SelectControl
								label={ __( 'Selected tile style', 'sgs-blocks' ) }
								value={ selectedStyle }
								options={ SELECTED_STYLE_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { selectedStyle: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>

				{ /* Container wrapper (WS-4 mirror) */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
				/>

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
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ tile.label || '' }
								onChange={ ( val ) =>
									updateTile( index, 'label', val )
								}
								style={ { marginTop: '8px' } }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<IconPicker
								label={ __( 'Icon', 'sgs-blocks' ) }
								value={ {
									source: tile.iconSource || 'emoji',
									name: tile.icon || '',
								} }
								onChange={ ( { source, name } ) => {
									const newTiles = [ ...tiles ];
									newTiles[ index ] = {
										...newTiles[ index ],
										icon: name,
										iconSource: source,
									};
									setAttributes( { tiles: newTiles } );
								} }
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
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ formFieldTilesContrastAgainst }
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
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
						gridTemplateColumns: `repeat(${ columnsDesktop }, 1fr)`,
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
										lineHeight: 1,
									} }
									aria-hidden="true"
								>
									<IconPreview
										source={ tile.iconSource || 'emoji' }
										name={ tile.icon }
										size={ 32 }
									/>
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
