/**
 * Gift order: the look panels (panel, choice tiles, name and note fields).
 *
 * Every control is a shared SGS control writing the block's own attributes (render.php prints them through
 * includes/gift-order/helpers-gift-order-look.php). Each starts unset, so the block keeps the Cart and Checkout
 * look until a setting is chosen.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';
import {
	BOX_UNITS,
	ResponsiveOverride,
	SgsBorderControl,
	SgsBoxControl,
	SgsColourPanel,
	SgsLengthControl,
	ShadowControl,
	TypographyControls,
	fillRow,
	normaliseResponsiveBox,
	textRow,
} from '../../components';

const TILE_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];

/**
 * One border, radius pair.
 *
 * @param {Object}   props
 * @param {Object}   props.names         Attribute names: `width`, `style`, `colour`, `radius`.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {JSX.Element} Border control.
 */
function BorderRows( { names, attributes, setAttributes } ) {
	const radius = attributes[ names.radius ] ?? {};
	return (
		<SgsBorderControl
			widthValues={ attributes[ names.width ] ?? {} }
			onWidthChange={ ( next ) =>
				setAttributes( { [ names.width ]: next } )
			}
			styleValue={ attributes[ names.style ] }
			onStyleChange={ ( val ) =>
				setAttributes( { [ names.style ]: val } )
			}
			colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
			colourLinked
			colourValue={ attributes[ names.colour ] }
			onColourChange={ ( val ) =>
				setAttributes( { [ names.colour ]: val ?? '' } )
			}
			radiusValues={ {
				base: radius.desktop ?? {},
				tablet: radius.tablet ?? {},
				mobile: radius.mobile ?? {},
			} }
			onRadiusChange={ ( tier, next ) =>
				setAttributes( {
					[ names.radius ]: {
						...radius,
						[ 'base' === tier ? 'desktop' : tier ]: next,
					},
				} )
			}
		/>
	);
}

/** The per-device minimum heights, each with the panel section it sits in. */
const HEIGHT_ROWS = [
	[ 'giftInputMinHeight', 'field' ],
	[ 'giftNoteMinHeight', 'field' ],
	[ 'giftSwitchMinHeight', 'tick' ],
];

/**
 * The label of a minimum-height row.
 *
 * @param {string} attr Attribute name.
 * @return {string} Control label.
 */
function heightLabel( attr ) {
	switch ( attr ) {
		case 'giftInputMinHeight':
			return __( 'Name field minimum height', 'sgs-blocks' );
		case 'giftNoteMinHeight':
			return __( 'Note box minimum height', 'sgs-blocks' );
		default:
			return __( 'Tick box row minimum height', 'sgs-blocks' );
	}
}

/**
 * The per-device minimum heights of one panel section.
 *
 * @param {Object}   props
 * @param {string}   props.section       `field` or `tick`.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {JSX.Element[]} Controls.
 */
function HeightRows( { section, attributes, setAttributes } ) {
	return HEIGHT_ROWS.map( ( [ attr, group ] ) =>
		group === section ? (
			<ResponsiveOverride
				key={ attr }
				label={ heightLabel( attr ) }
				value={ attributes[ attr ] }
				onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }
			>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsLengthControl
						presets={ false }
						scale="spacing"
						label={ heightLabel( attr ) }
						hideLabelFromVision
						value={ ownValue || '' }
						placeholder="44px"
						units={ TILE_UNITS }
						onChange={ ( val ) => setOwnValue( val || '' ) }
					/>
				) }
			</ResponsiveOverride>
		) : null
	);
}

/**
 * A per-device padding box.
 *
 * @param {Object}   props
 * @param {string}   props.label         Control label.
 * @param {string}   props.attr          Attribute name.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {JSX.Element} Control.
 */
function PaddingRow( { label, attr, attributes, setAttributes } ) {
	const defaults = spacingDefaultsFor( 'sgs/gift-order', attr );
	return (
		<ResponsiveOverride
			label={ label }
			value={ attributes[ attr ] }
			onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }
		>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl
					label={ label }
					hideLabelFromVision
					values={
						ownValue && 'object' === typeof ownValue ? ownValue : {}
					}
					units={ BOX_UNITS }
					presets
					defaults={ defaults }
					onChange={ ( next ) =>
						setOwnValue( normaliseResponsiveBox( next ) )
					}
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {JSX.Element} The three look panels.
 */
export default function LookPanels( { attributes, setAttributes } ) {
	const common = { attributes, setAttributes };
	const fill = ( key, label, attr ) =>
		fillRow( { key, label, attrs: { base: attr }, ...common } );
	return (
		<>
			<PanelBody
				title={ __( 'Gift panel look', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SgsColourPanel
					rows={ [
						fill(
							'panel',
							__( 'Panel background', 'sgs-blocks' ),
							'giftPanelBackground'
						),
					] }
				/>
				<BorderRows
					names={ {
						width: 'giftPanelBorderWidth',
						style: 'giftPanelBorderStyle',
						colour: 'giftPanelBorderColour',
						radius: 'giftPanelBorderRadius',
					} }
					{ ...common }
				/>
				<ShadowControl
					label={ __( 'Panel shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ {
						base: 'giftPanelShadow',
						colour: 'giftPanelShadowColour',
					} }
				/>
				<ResponsiveOverride
					label={ __( 'Panel padding', 'sgs-blocks' ) }
					value={ attributes.giftPanelPadding }
					onChange={ ( obj ) =>
						setAttributes( { giftPanelPadding: obj } )
					}
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Panel padding', 'sgs-blocks' ) }
							hideLabelFromVision
							values={
								ownValue && 'object' === typeof ownValue
									? ownValue
									: {}
							}
							units={ BOX_UNITS }
							presets
							onChange={ ( next ) =>
								setOwnValue( normaliseResponsiveBox( next ) )
							}
						/>
					) }
				</ResponsiveOverride>
			</PanelBody>
			<PanelBody
				title={ __( 'Choice tile look', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SgsColourPanel
					rows={ [
						fill(
							'tile',
							__( 'Tile background', 'sgs-blocks' ),
							'giftTileBackground'
						),
						fill(
							'tileSelected',
							__( 'Chosen tile background', 'sgs-blocks' ),
							'giftTileSelectedBackground'
						),
						fill(
							'tileSelectedBorder',
							__( 'Chosen tile border', 'sgs-blocks' ),
							'giftTileSelectedBorderColour'
						),
					] }
				/>
				<ResponsiveOverride
					label={ __( 'Tile minimum height', 'sgs-blocks' ) }
					value={ attributes.giftTileMinHeight }
					onChange={ ( obj ) =>
						setAttributes( { giftTileMinHeight: obj } )
					}
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsLengthControl
							presets={ false }
							scale="spacing"
							label={ __( 'Tile minimum height', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ ownValue || '' }
							placeholder="44px"
							units={ TILE_UNITS }
							onChange={ ( val ) => setOwnValue( val || '' ) }
						/>
					) }
				</ResponsiveOverride>
				<PaddingRow
					label={ __( 'Tile padding', 'sgs-blocks' ) }
					attr="giftTilePadding"
					{ ...common }
				/>
				<BorderRows
					names={ {
						width: 'giftTileBorderWidth',
						style: 'giftTileBorderStyle',
						colour: 'giftTileBorderColour',
						radius: 'giftTileBorderRadius',
					} }
					{ ...common }
				/>
				<ShadowControl
					label={ __( 'Chosen tile shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ {
						base: 'giftTileSelectedShadow',
						colour: 'giftTileSelectedShadowColour',
					} }
				/>
			</PanelBody>
			<PanelBody
				title={ __( 'Name and note field look', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SgsColourPanel
					rows={ [
						fill(
							'field',
							__( 'Field background', 'sgs-blocks' ),
							'fieldBackground'
						),
					] }
				/>
				<BorderRows
					names={ {
						width: 'fieldBorderWidth',
						style: 'fieldBorderStyle',
						colour: 'fieldBorderColour',
						radius: 'fieldBorderRadius',
					} }
					{ ...common }
				/>
				<ShadowControl
					label={ __( 'Field shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ {
						base: 'fieldShadow',
						colour: 'fieldShadowColour',
					} }
				/>
				<PaddingRow
					label={ __( 'Field padding', 'sgs-blocks' ) }
					attr="giftFieldPadding"
					{ ...common }
				/>
				<HeightRows section="field" { ...common } />
			</PanelBody>
			<PanelBody
				title={ __( 'Field label and note text', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					prefix="giftLabel"
					showResponsive
					fontSizePresets
					showFontFamily
					showWeight
					showLineHeight
				/>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					prefix="giftNote"
					showResponsive
					fontSizePresets
					showFontFamily
					showWeight
					showLineHeight
				/>
			</PanelBody>
			<PanelBody
				title={ __( 'Tick box, hint and count', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<SgsColourPanel
					rows={ [
						textRow( {
							key: 'checkbox',
							label: __( 'Ticked box', 'sgs-blocks' ),
							attrs: { base: 'giftCheckboxColour' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'help',
							label: __( 'Hint text', 'sgs-blocks' ),
							attrs: { base: 'giftHelpColour' },
							attributes,
							setAttributes,
						} ),
						textRow( {
							key: 'count',
							label: __( 'Character count', 'sgs-blocks' ),
							attrs: { base: 'giftCountColour' },
							attributes,
							setAttributes,
						} ),
					] }
				/>
				<HeightRows section="tick" { ...common } />
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					prefix="giftHelp"
					showWeight={ false }
					showStyle={ false }
					showLineHeight={ false }
					showResponsive
					fontSizePresets
				/>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					prefix="giftCount"
					showWeight={ false }
					showStyle={ false }
					showLineHeight={ false }
					showResponsive
					fontSizePresets
					showTextAlign
				/>
			</PanelBody>
		</>
	);
}
