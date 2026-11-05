import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem, ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { ResponsiveBoxControl, ResponsiveLengthControl, SgsLengthControl, ShadowControl } from '../../components';

const WEIGHT_OPTIONS = [
	{ value: '', label: __( 'Default', 'sgs-blocks' ) },
	{ value: '400', label: __( 'Regular (400)', 'sgs-blocks' ) },
	{ value: '500', label: __( 'Medium (500)', 'sgs-blocks' ) },
	{ value: '600', label: __( 'Semi-bold (600)', 'sgs-blocks' ) },
	{ value: '700', label: __( 'Bold (700)', 'sgs-blocks' ) },
	{ value: '800', label: __( 'Extra bold (800)', 'sgs-blocks' ) },
];

/**
 * One ToolsPanel item that resets to a block.json default.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.label         Item label.
 * @param {string[]} props.names         Attribute names the item writes.
 * @param {*}        props.fallback      The default shared by every name (object, string or boolean).
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @param {Element}  props.children      The control.
 * @return {Element} The item.
 */
function Item( { label, names, fallback, attributes, setAttributes, children } ) {
	return (
		<ToolsPanelItem
			label={ label }
			hasValue={ () => names.some( ( name ) => JSON.stringify( attributes[ name ] ?? fallback ) !== JSON.stringify( fallback ) ) }
			onDeselect={ () => setAttributes( Object.fromEntries( names.map( ( name ) => [ name, fallback ] ) ) ) }
			isShownByDefault
		>
			{ children }
		</ToolsPanelItem>
	);
}

/**
 * A weight select stored as a hundreds string.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.label         Label.
 * @param {string}   props.name          Attribute name.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The item.
 */
function WeightItem( { label, name, attributes, setAttributes } ) {
	return (
		<Item label={ label } names={ [ name ] } fallback="" attributes={ attributes } setAttributes={ setAttributes }>
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={ label }
				value={ attributes[ name ] || '' }
				options={ WEIGHT_OPTIONS }
				onChange={ ( val ) => setAttributes( { [ name ]: val } ) }
			/>
		</Item>
	);
}

/**
 * A per-device box (padding) for a `{desktop, tablet, mobile}` attribute.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.label         Label.
 * @param {string}   props.name          Attribute name.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The item.
 */
function BoxItem( { label, name, attributes, setAttributes } ) {
	const value = attributes[ name ] && 'object' === typeof attributes[ name ] ? attributes[ name ] : {};
	return (
		<Item label={ label } names={ [ name ] } fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
			<ResponsiveBoxControl
				label={ label }
				presets
				values={ { base: value.desktop ?? {}, tablet: value.tablet ?? {}, mobile: value.mobile ?? {} } }
				onChange={ ( tier, next ) => setAttributes( { [ name ]: { ...value, [ 'base' === tier ? 'desktop' : tier ]: next } } ) }
			/>
		</Item>
	);
}

/**
 * "Pick a set look" panels for sgs/buybox: the pick box spacing, the group headings, the option look and the colour dots.
 * Shown only while the buy box type is Pick a set.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @param {Object}   props.list          The checklist read from the server (its `headingGroups` name every group).
 */
export default function ConfiguratorLookPanel( { attributes, setAttributes, list } ) {
	if ( 'configurator' !== attributes.buyboxLayout ) {
		return null;
	}
	const headings = attributes.pickGroupHeadings && 'object' === typeof attributes.pickGroupHeadings ? attributes.pickGroupHeadings : {};
	const groups = list && Array.isArray( list.headingGroups ) ? list.headingGroups : [];
	const setHeading = ( key, field, val ) => {
		const row = { ...( headings[ key ] || {} ), [ field ]: val };
		const next = { ...headings, [ key ]: row };
		if ( '' === ( row.text || '' ) && '' === ( row.hint || '' ) ) {
			delete next[ key ];
		}
		setAttributes( { pickGroupHeadings: next } );
	};
	const columns = attributes.pickTileColumns && 'object' === typeof attributes.pickTileColumns ? attributes.pickTileColumns : {};
	const common = { attributes, setAttributes };

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Pick area spacing', 'sgs-blocks' ) } initialOpen={ false }>
				<ToolsPanel label={ __( 'Settings', 'sgs-blocks' ) } resetAll={ () => setAttributes( { pickerBoxPadding: {}, pickerBoxGap: {}, pickTileColumns: {} } ) }>
					<BoxItem label={ __( 'Box inner spacing', 'sgs-blocks' ) } name="pickerBoxPadding" { ...common } />
					<Item label={ __( 'Space between groups', 'sgs-blocks' ) } names={ [ 'pickerBoxGap' ] } fallback={ {} } { ...common }>
						<ResponsiveLengthControl
							label={ __( 'Space between groups', 'sgs-blocks' ) }
							scale="spacing"
							value={ attributes.pickerBoxGap }
							onChange={ ( obj ) => setAttributes( { pickerBoxGap: obj } ) }
						/>
					</Item>
					<Item label={ __( 'Pack tile columns', 'sgs-blocks' ) } names={ [ 'pickTileColumns' ] } fallback={ {} } { ...common }>
						{ [ [ 'desktop', __( 'Pack tile columns (desktop)', 'sgs-blocks' ) ], [ 'tablet', __( 'Pack tile columns (tablet)', 'sgs-blocks' ) ], [ 'mobile', __( 'Pack tile columns (mobile)', 'sgs-blocks' ) ] ].map( ( [ tier, label ] ) => (
							<TextControl
								key={ tier }
								type="number"
								min={ 1 }
								max={ 12 }
								label={ label }
								value={ columns[ tier ] ?? '' }
								onChange={ ( val ) => {
									const next = { ...columns };
									if ( '' === val ) {
										delete next[ tier ];
									} else {
										next[ tier ] = Math.min( 12, Math.max( 1, parseInt( val, 10 ) || 1 ) );
									}
									setAttributes( { pickTileColumns: next } );
								} }
								help={ 'desktop' === tier ? __( 'Empty keeps the automatic number of columns.', 'sgs-blocks' ) : undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) ) }
					</Item>
				</ToolsPanel>
			</PanelBody>
			<PanelBody title={ __( 'Pick area headings', 'sgs-blocks' ) } initialOpen={ false }>
				<ToolsPanel label={ __( 'Settings', 'sgs-blocks' ) } resetAll={ () => setAttributes( { pickGroupHeadings: {}, pickGroupNumbers: false, pickerLabelFontWeight: '', pickTilePriceLine: false, pickTileNumberWeight: '', pickTilePriceWeight: '' } ) }>
					<Item label={ __( 'Number the headings', 'sgs-blocks' ) } names={ [ 'pickGroupNumbers' ] } fallback={ false } { ...common }>
						<ToggleControl
							label={ __( 'Number the headings', 'sgs-blocks' ) }
							checked={ true === attributes.pickGroupNumbers }
							onChange={ ( val ) => setAttributes( { pickGroupNumbers: val } ) }
							help={ __( 'Puts 1 ·, 2 · and so on before each group heading, in order.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					</Item>
					<Item label={ __( 'Heading text and hint per group', 'sgs-blocks' ) } names={ [ 'pickGroupHeadings' ] } fallback={ {} } { ...common }>
						{ 0 === groups.length && <p>{ __( 'Choose a product in the Product panel to list its groups.', 'sgs-blocks' ) }</p> }
						{ groups.map( ( group ) => (
							<div key={ group.key }>
								<TextControl
									label={ sprintf( /* translators: %s: option group name. */ __( '%s heading', 'sgs-blocks' ), group.label ) }
									value={ headings[ group.key ]?.text || '' }
									onChange={ ( val ) => setHeading( group.key, 'text', val ) }
									help={ __( 'Empty keeps the attribute name.', 'sgs-blocks' ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								<TextControl
									label={ sprintf( /* translators: %s: option group name. */ __( '%s hint', 'sgs-blocks' ), group.label ) }
									value={ headings[ group.key ]?.hint || '' }
									onChange={ ( val ) => setHeading( group.key, 'hint', val ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</div>
						) ) }
					</Item>
					<WeightItem label={ __( 'Heading weight', 'sgs-blocks' ) } name="pickerLabelFontWeight" { ...common } />
					<Item label={ __( 'Show the pack tile total price', 'sgs-blocks' ) } names={ [ 'pickTilePriceLine' ] } fallback={ false } { ...common }>
						<ToggleControl
							label={ __( 'Show the pack tile total price', 'sgs-blocks' ) }
							checked={ true === attributes.pickTilePriceLine }
							onChange={ ( val ) => setAttributes( { pickTilePriceLine: val } ) }
							help={ __( 'Each pack tile shows its variation price between the number and the each-price.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					</Item>
					<WeightItem label={ __( 'Pack tile number weight', 'sgs-blocks' ) } name="pickTileNumberWeight" { ...common } />
					<WeightItem label={ __( 'Pack tile price weight', 'sgs-blocks' ) } name="pickTilePriceWeight" { ...common } />
				</ToolsPanel>
			</PanelBody>
			<PanelBody title={ __( 'Pick area option look', 'sgs-blocks' ) } initialOpen={ false }>
				<ToolsPanel
					label={ __( 'Settings', 'sgs-blocks' ) }
					resetAll={ () => setAttributes( { pickerPillFontWeight: '', pickerPillSelectedShadow: '', pickerPillSelectedShadowColour: '', pickerPillSelectedOffsetX: '', pickerPillSelectedOffsetY: '', pickerDotShape: '', pickerDotSize: '', pickerGroupDotSize: '', pickerDotRingThickness: '', pickerDotTickInside: false } ) }
				>
					<WeightItem label={ __( 'Option text weight', 'sgs-blocks' ) } name="pickerPillFontWeight" { ...common } />
					<ToolsPanelItem
						label={ __( 'Selected option shadow', 'sgs-blocks' ) }
						hasValue={ () => !! attributes.pickerPillSelectedShadow || !! attributes.pickerPillSelectedShadowColour }
						onDeselect={ () => setAttributes( { pickerPillSelectedShadow: '', pickerPillSelectedShadowColour: '' } ) }
						isShownByDefault
					>
						<ShadowControl
							label={ __( 'Selected option shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ { base: 'pickerPillSelectedShadow', colour: 'pickerPillSelectedShadowColour' } }
						/>
					</ToolsPanelItem>
					<Item label={ __( 'Selected option shift (across)', 'sgs-blocks' ) } names={ [ 'pickerPillSelectedOffsetX' ] } fallback="" { ...common }>
						<SgsLengthControl
							presets
							scale="spacing"
							label={ __( 'Selected option shift (across)', 'sgs-blocks' ) }
							value={ attributes.pickerPillSelectedOffsetX || '' }
							onChange={ ( val ) => setAttributes( { pickerPillSelectedOffsetX: val ?? '' } ) }
						/>
					</Item>
					<Item label={ __( 'Selected option shift (down)', 'sgs-blocks' ) } names={ [ 'pickerPillSelectedOffsetY' ] } fallback="" { ...common }>
						<SgsLengthControl
							presets
							scale="spacing"
							label={ __( 'Selected option shift (down)', 'sgs-blocks' ) }
							value={ attributes.pickerPillSelectedOffsetY || '' }
							onChange={ ( val ) => setAttributes( { pickerPillSelectedOffsetY: val ?? '' } ) }
						/>
					</Item>
					<Item label={ __( 'Colour dot shape', 'sgs-blocks' ) } names={ [ 'pickerDotShape' ] } fallback="" { ...common }>
						<ToggleGroupControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							isBlock
							isDeselectable
							label={ __( 'Colour dot shape', 'sgs-blocks' ) }
							value={ attributes.pickerDotShape || '' }
							onChange={ ( val ) => setAttributes( { pickerDotShape: val || '' } ) }
						>
							<ToggleGroupControlOption value="round" label={ __( 'Round', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="square" label={ __( 'Square', 'sgs-blocks' ) } />
						</ToggleGroupControl>
					</Item>
					<Item label={ __( 'Colour dot size (option pickers)', 'sgs-blocks' ) } names={ [ 'pickerDotSize' ] } fallback="" { ...common }>
						<SgsLengthControl
							presets
							scale="spacing"
							label={ __( 'Colour dot size (option pickers)', 'sgs-blocks' ) }
							value={ attributes.pickerDotSize || '' }
							onChange={ ( val ) => setAttributes( { pickerDotSize: val ?? '' } ) }
						/>
					</Item>
					<Item label={ __( 'Colour dot size (pick-several groups)', 'sgs-blocks' ) } names={ [ 'pickerGroupDotSize' ] } fallback="" { ...common }>
						<SgsLengthControl
							presets
							scale="spacing"
							label={ __( 'Colour dot size (pick-several groups)', 'sgs-blocks' ) }
							value={ attributes.pickerGroupDotSize || '' }
							onChange={ ( val ) => setAttributes( { pickerGroupDotSize: val ?? '' } ) }
						/>
					</Item>
					<Item label={ __( 'Colour dot ring width', 'sgs-blocks' ) } names={ [ 'pickerDotRingThickness' ] } fallback="" { ...common }>
						<SgsLengthControl
							presets
							scale="spacing"
							label={ __( 'Colour dot ring width', 'sgs-blocks' ) }
							value={ attributes.pickerDotRingThickness || '' }
							onChange={ ( val ) => setAttributes( { pickerDotRingThickness: val ?? '' } ) }
						/>
					</Item>
					<Item label={ __( 'Tick inside the colour dot', 'sgs-blocks' ) } names={ [ 'pickerDotTickInside' ] } fallback={ false } { ...common }>
						<ToggleControl
							label={ __( 'Tick inside the colour dot', 'sgs-blocks' ) }
							checked={ true === attributes.pickerDotTickInside }
							onChange={ ( val ) => setAttributes( { pickerDotTickInside: val } ) }
							help={ __( 'The selected tick sits inside the dot instead of before the label.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					</Item>
				</ToolsPanel>
			</PanelBody>
		</InspectorControls>
	);
}
