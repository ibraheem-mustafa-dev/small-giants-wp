import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, ToggleControl, Notice } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import ConfiguratorLookPanel from './ConfiguratorLookPanel';
import { fillRow, textRow, ResponsiveBoxControl, ResponsiveLengthControl, SgsLengthControl, MediaElementPanel } from '../../components';

/** The preview slot's atoms: Source and Fit for the picture; Shape, Radius and Border for the preview box (render.php prints them there). */
const PREVIEW_ATOMS = [ 'source', 'object-fit', 'shape' ];

const STYLE_OPTIONS = [
	{ value: '', label: __( 'Same as the picker style', 'sgs-blocks' ) },
	{ value: 'outlined', label: __( 'Outlined pills', 'sgs-blocks' ) },
	{ value: 'filled', label: __( 'Filled pills', 'sgs-blocks' ) },
	{ value: 'ghost', label: __( 'Plain pills', 'sgs-blocks' ) },
	{ value: 'tile', label: __( 'Tiles (colour or image, name, description)', 'sgs-blocks' ) },
];

/**
 * The product the setup checklist reads: the pinned one, else the product being edited.
 *
 * @param {Object} attributes Block attributes.
 * @return {number} Product ID, 0 when none.
 */
function useChecklistProductId( attributes ) {
	const pinned = parseInt( attributes.buyboxProductId, 10 ) || 0;
	const current = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return editor && 'product' === editor.getCurrentPostType?.() ? editor.getCurrentPostId?.() || 0 : 0;
	}, [] );
	return pinned || current || 0;
}

/**
 * "Pick a set" setup checklist, read from the server's own resolver.
 *
 * @param {Object} props           Props.
 * @param {number} props.productId Product ID.
 * @param {Object} props.state     Shared `{list, failed}` from the panel.
 */
function Checklist( { productId, list, failed } ) {
	if ( ! productId ) {
		return (
			<Notice status="info" isDismissible={ false }>
				{ __( 'Choose a product in the Product panel to see its Pick a set setup.', 'sgs-blocks' ) }
			</Notice>
		);
	}
	if ( failed ) {
		return (
			<Notice status="warning" isDismissible={ false }>
				{ __( 'The setup could not be read. You may not be allowed to edit that product.', 'sgs-blocks' ) }
			</Notice>
		);
	}
	if ( ! list ) {
		return <p>{ __( 'Checking the product…', 'sgs-blocks' ) }</p>;
	}
	const packText = list.pack.found
		? sprintf( /* translators: %s: pack sizes, e.g. 8, 20, 40. */ __( 'Pack size found: yes (%s)', 'sgs-blocks' ), list.pack.sizes.join( ', ' ) )
		: __( 'Pack size found: no', 'sgs-blocks' );
	const groupsText = list.groups.length
		? sprintf( /* translators: %s: option group names. */ __( 'Pick-several groups: %s', 'sgs-blocks' ), list.groups.map( ( g ) => g.label ).join( ', ' ) )
		: __( 'Pick-several groups: none yet', 'sgs-blocks' );
	return (
		<ul className="sgs-buybox-checklist">
			<li>{ packText }</li>
			<li>{ groupsText }</li>
			{ list.pack.unparseable.map( ( name ) => (
				<li key={ name }>{ sprintf( /* translators: %s: pack option name. */ __( "Could not read a number from '%s'", 'sgs-blocks' ), name ) }</li>
			) ) }
			{ list.issues.map( ( message ) => (
				<li key={ message }>{ message }</li>
			) ) }
			{ ( ! list.pack.found || 0 === list.groups.length || list.issues.length > 0 ) && list.editUrl && (
				<li>
					<a href={ list.editUrl } target="_blank" rel="noreferrer">
						{ __( 'Open the product to fix this (Attributes tab)', 'sgs-blocks' ) }
					</a>
				</li>
			) }
		</ul>
	);
}

/**
 * One ToolsPanel item: shows a reset dot when the value differs from the block.json default and resets to it.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.label         Item label.
 * @param {string}   props.name          Attribute name.
 * @param {*}        props.fallback      The block.json default.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @param {Element}  props.children      The control.
 * @return {Element} The item.
 */
function Item( { label, name, fallback, attributes, setAttributes, children } ) {
	return (
		<ToolsPanelItem
			label={ label }
			hasValue={ () => JSON.stringify( attributes[ name ] ?? fallback ) !== JSON.stringify( fallback ) }
			onDeselect={ () => setAttributes( { [ name ]: fallback } ) }
			isShownByDefault
		>
			{ children }
		</ToolsPanelItem>
	);
}

/**
 * A per-device inner-spacing control for a `{desktop, tablet, mobile}` attribute.
 *
 * @param {Object}   props               Props.
 * @param {string}   props.label         Control label.
 * @param {string}   props.name          Attribute name.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The control.
 */
function TierBox( { label, name, attributes, setAttributes } ) {
	const value = attributes[ name ] && 'object' === typeof attributes[ name ] ? attributes[ name ] : {};
	return (
		<ResponsiveBoxControl
			label={ label }
			presets
			values={ { base: value.desktop ?? {}, tablet: value.tablet ?? {}, mobile: value.mobile ?? {} } }
			onChange={ ( tier, next ) => setAttributes( { [ name ]: { ...value, [ 'base' === tier ? 'desktop' : tier ]: next } } ) }
		/>
	);
}

/**
 * "Pick a set" panel for sgs/buybox: shown only while the buy box type is Pick a set.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 */
export default function ConfiguratorPanel( { attributes, setAttributes } ) {
	const productId = useChecklistProductId( attributes );
	const [ state, setState ] = useState( { list: null, failed: false } );
	const active = 'configurator' === attributes.buyboxLayout;

	useEffect( () => {
		if ( ! active || ! productId ) {
			return undefined;
		}
		let live = true;
		setState( { list: null, failed: false } );
		apiFetch( { path: `/sgs/v1/buybox/checklist?product=${ productId }` } )
			.then( ( list ) => live && setState( { list, failed: false } ) )
			.catch( () => live && setState( { list: null, failed: true } ) );
		return () => {
			live = false;
		};
	}, [ active, productId ] );

	if ( ! active ) {
		return null;
	}
	const styles = attributes.groupStyles && 'object' === typeof attributes.groupStyles ? attributes.groupStyles : {};

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Pick a set', 'sgs-blocks' ) } initialOpen>
				<Checklist productId={ productId } list={ state.list } failed={ state.failed } />
				<ToolsPanel label={ __( 'Settings', 'sgs-blocks' ) } resetAll={ () => setAttributes( { groupStyles: {}, summaryText: 'Your {pack}: {split}', previewLayerAxis: '', pickHideGallery: false, pickHidePreview: false, showPriceRow: true } ) }>
				<Item label={ __( 'Option group looks', 'sgs-blocks' ) } name="groupStyles" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					{ ( state.list ? state.list.groups : [] ).map( ( group ) => (
						<SelectControl
							key={ group.key }
							label={ sprintf( /* translators: %s: option group name. */ __( '%s look', 'sgs-blocks' ), group.label ) }
							value={ styles[ group.key ] || '' }
							options={ STYLE_OPTIONS }
							onChange={ ( val ) => setAttributes( { groupStyles: { ...styles, [ group.key ]: val } } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) ) }
				</Item>
				<Item label={ __( 'Summary text (use {pack} and {split})', 'sgs-blocks' ) } name="summaryText" fallback={ 'Your {pack}: {split}' } attributes={ attributes } setAttributes={ setAttributes }>
					<TextControl
						label={ __( 'Summary text (use {pack} and {split})', 'sgs-blocks' ) }
						value={ attributes.summaryText ?? 'Your {pack}: {split}' }
						onChange={ ( val ) => setAttributes( { summaryText: val } ) }
						help={ __( 'Also {pack_label}, {variation}, {picks} and {count}. Unknown words in braces are removed.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</Item>
				<Item label={ __( 'Preview: scatter this attribute’s colour', 'sgs-blocks' ) } name="previewLayerAxis" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<TextControl
						label={ __( 'Preview: scatter this attribute’s colour', 'sgs-blocks' ) }
						value={ attributes.previewLayerAxis || '' }
						onChange={ ( val ) => setAttributes( { previewLayerAxis: val.trim() } ) }
						help={ __( 'The attribute key of a variation attribute whose option colour is scattered over the preview as small squares (for example pa_chip). Empty = none.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</Item>
				<Item label={ __( 'Hide the product photos', 'sgs-blocks' ) } name="pickHideGallery" fallback={ false } attributes={ attributes } setAttributes={ setAttributes }>
					<ToggleControl
						label={ __( 'Hide the product photos', 'sgs-blocks' ) }
						checked={ true === attributes.pickHideGallery }
						onChange={ ( val ) => setAttributes( { pickHideGallery: val } ) }
						help={ __( 'The picker, preview and summary then fill the width.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</Item>
				<Item label={ __( 'Hide the preview picture', 'sgs-blocks' ) } name="pickHidePreview" fallback={ false } attributes={ attributes } setAttributes={ setAttributes }>
					<ToggleControl
						label={ __( 'Hide the preview picture', 'sgs-blocks' ) }
						checked={ true === attributes.pickHidePreview }
						onChange={ ( val ) => setAttributes( { pickHidePreview: val } ) }
						help={ __( 'The summary line then sits under the pick groups at full width.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
				</Item>
				<Item label={ __( 'Show the price row', 'sgs-blocks' ) } name="showPriceRow" fallback={ true } attributes={ attributes } setAttributes={ setAttributes }>
					<ToggleControl
						label={ __( 'Show the price row', 'sgs-blocks' ) }
						checked={ false !== attributes.showPriceRow }
						onChange={ ( val ) => setAttributes( { showPriceRow: val } ) }
						__nextHasNoMarginBottom
					/>
				</Item>
				</ToolsPanel>
			</PanelBody>
			{ /* The picture inside the live preview (Spec 49 10.4, the `preview` slot); the preview box's own spacing follows. */ }
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="preview"
				blockSlug="sgs/buybox"
				blockName="sgs/buybox"
				context="content"
				atoms={ PREVIEW_ATOMS }
			/>
			<PanelBody title={ __( 'Preview box', 'sgs-blocks' ) } initialOpen={ false }>
				<ToolsPanel label={ __( 'Settings', 'sgs-blocks' ) } resetAll={ () => setAttributes( { previewPadding: {} } ) }>
				<Item label={ __( 'Inner spacing', 'sgs-blocks' ) } name="previewPadding" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<TierBox label={ __( 'Inner spacing', 'sgs-blocks' ) } name="previewPadding" attributes={ attributes } setAttributes={ setAttributes } />
				</Item>
				</ToolsPanel>
			</PanelBody>
			<PanelBody title={ __( 'Options and tiles', 'sgs-blocks' ) } initialOpen={ false }>
				<ToolsPanel label={ __( 'Settings', 'sgs-blocks' ) } resetAll={ () => setAttributes( { pickOptionRadius: '', pickOptionPadding: {}, pickOptionGap: '', pickTilePadding: {}, pickTileGap: '', pickPricedRadius: '', pickPricedPadding: {}, pickPricedGap: '', pickPricedFontSize: {}, pickPricedLayout: '', pickPricedMinHeight: {}, pickTileNumberSize: {}, pickTilePriceSize: {}, pickTileEachSize: {} } ) }>
				<Item label={ __( 'Option pill corner radius', 'sgs-blocks' ) } name="pickOptionRadius" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SgsLengthControl
						presets
						label={ __( 'Option pill corner radius', 'sgs-blocks' ) }
						value={ attributes.pickOptionRadius || '' }
						onChange={ ( val ) => setAttributes( { pickOptionRadius: val ?? '' } ) }
					/>
				</Item>
				<Item label={ __( 'Option pill inner spacing', 'sgs-blocks' ) } name="pickOptionPadding" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<TierBox label={ __( 'Option pill inner spacing', 'sgs-blocks' ) } name="pickOptionPadding" attributes={ attributes } setAttributes={ setAttributes } />
				</Item>
				<Item label={ __( 'Space between option pills', 'sgs-blocks' ) } name="pickOptionGap" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SgsLengthControl
						presets
						label={ __( 'Space between option pills', 'sgs-blocks' ) }
						value={ attributes.pickOptionGap || '' }
						onChange={ ( val ) => setAttributes( { pickOptionGap: val ?? '' } ) }
					/>
				</Item>
				<Item label={ __( 'Priced tile inner spacing', 'sgs-blocks' ) } name="pickTilePadding" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<TierBox label={ __( 'Priced tile inner spacing', 'sgs-blocks' ) } name="pickTilePadding" attributes={ attributes } setAttributes={ setAttributes } />
				</Item>
				<Item label={ __( 'Space between priced tiles', 'sgs-blocks' ) } name="pickTileGap" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SgsLengthControl
						presets
						label={ __( 'Space between priced tiles', 'sgs-blocks' ) }
						value={ attributes.pickTileGap || '' }
						onChange={ ( val ) => setAttributes( { pickTileGap: val ?? '' } ) }
					/>
				</Item>
				<Item label={ __( 'Priced pill corner radius', 'sgs-blocks' ) } name="pickPricedRadius" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SgsLengthControl
						presets
						label={ __( 'Priced pill corner radius', 'sgs-blocks' ) }
						value={ attributes.pickPricedRadius || '' }
						onChange={ ( val ) => setAttributes( { pickPricedRadius: val ?? '' } ) }
					/>
				</Item>
				<Item label={ __( 'Priced pill inner spacing', 'sgs-blocks' ) } name="pickPricedPadding" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<TierBox label={ __( 'Priced pill inner spacing', 'sgs-blocks' ) } name="pickPricedPadding" attributes={ attributes } setAttributes={ setAttributes } />
				</Item>
				<Item label={ __( 'Space between priced pills', 'sgs-blocks' ) } name="pickPricedGap" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SgsLengthControl
						presets
						label={ __( 'Space between priced pills', 'sgs-blocks' ) }
						value={ attributes.pickPricedGap || '' }
						onChange={ ( val ) => setAttributes( { pickPricedGap: val ?? '' } ) }
					/>
				</Item>
				<Item label={ __( 'Priced pill text size', 'sgs-blocks' ) } name="pickPricedFontSize" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<ResponsiveLengthControl
						label={ __( 'Priced pill text size', 'sgs-blocks' ) }
						scale="font-size"
						value={ attributes.pickPricedFontSize }
						onChange={ ( obj ) => setAttributes( { pickPricedFontSize: obj } ) }
					/>
				</Item>
				<Item label={ __( 'Priced pill layout', 'sgs-blocks' ) } name="pickPricedLayout" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Priced pill layout', 'sgs-blocks' ) }
						value={ attributes.pickPricedLayout || '' }
						options={ [
							{ label: __( 'Columns', 'sgs-blocks' ), value: '' },
							{ label: __( 'Auto width, wrapping in a row', 'sgs-blocks' ), value: 'auto' },
						] }
						onChange={ ( val ) => setAttributes( { pickPricedLayout: val } ) }
					/>
				</Item>
				<Item label={ __( 'Priced pill minimum height', 'sgs-blocks' ) } name="pickPricedMinHeight" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<ResponsiveLengthControl
						label={ __( 'Priced pill minimum height', 'sgs-blocks' ) }
						scale="spacing"
						value={ attributes.pickPricedMinHeight }
						onChange={ ( obj ) => setAttributes( { pickPricedMinHeight: obj } ) }
					/>
				</Item>
				<Item label={ __( 'Pack tile number size', 'sgs-blocks' ) } name="pickTileNumberSize" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<ResponsiveLengthControl
						label={ __( 'Pack tile number size', 'sgs-blocks' ) }
						scale="font-size"
						value={ attributes.pickTileNumberSize }
						onChange={ ( obj ) => setAttributes( { pickTileNumberSize: obj } ) }
					/>
				</Item>
				<Item label={ __( 'Pack tile price size', 'sgs-blocks' ) } name="pickTilePriceSize" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<ResponsiveLengthControl
						label={ __( 'Pack tile price size', 'sgs-blocks' ) }
						scale="font-size"
						value={ attributes.pickTilePriceSize }
						onChange={ ( obj ) => setAttributes( { pickTilePriceSize: obj } ) }
					/>
				</Item>
				<Item label={ __( 'Pack tile each-line size', 'sgs-blocks' ) } name="pickTileEachSize" fallback={ {} } attributes={ attributes } setAttributes={ setAttributes }>
					<ResponsiveLengthControl
						label={ __( 'Pack tile each-line size', 'sgs-blocks' ) }
						scale="font-size"
						value={ attributes.pickTileEachSize }
						onChange={ ( obj ) => setAttributes( { pickTileEachSize: obj } ) }
					/>
				</Item>
				</ToolsPanel>
			</PanelBody>
			<PanelBody title={ __( 'Picker box', 'sgs-blocks' ) } initialOpen={ false }>
				<ToolsPanel label={ __( 'Settings', 'sgs-blocks' ) } resetAll={ () => setAttributes( { pickerBoxBorderWidth: '', pickerBoxRadius: '' } ) }>
				<Item label={ __( 'Border width', 'sgs-blocks' ) } name="pickerBoxBorderWidth" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SgsLengthControl
						presets
						label={ __( 'Border width', 'sgs-blocks' ) }
						value={ attributes.pickerBoxBorderWidth || '' }
						onChange={ ( val ) => setAttributes( { pickerBoxBorderWidth: val ?? '' } ) }
					/>
				</Item>
				<Item label={ __( 'Corner radius', 'sgs-blocks' ) } name="pickerBoxRadius" fallback={ '' } attributes={ attributes } setAttributes={ setAttributes }>
					<SgsLengthControl
						presets
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ attributes.pickerBoxRadius || '' }
						onChange={ ( val ) => setAttributes( { pickerBoxRadius: val ?? '' } ) }
					/>
				</Item>
				</ToolsPanel>
			</PanelBody>
			<ConfiguratorLookPanel attributes={ attributes } setAttributes={ setAttributes } list={ state.list } />
		</InspectorControls>
	);
}

/**
 * The picker box's colour rows for the block's one SgsColourPanel; empty unless the type is Pick a set.
 *
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Array} Colour rows.
 */
export function configuratorColourRows( { attributes, setAttributes } ) {
	if ( 'configurator' !== attributes.buyboxLayout ) {
		return [];
	}
	return [
		fillRow( { key: 'pickerBoxFill', label: __( 'Picker box fill', 'sgs-blocks' ), attrs: { base: 'pickerBoxBackgroundColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickerBoxBorder', label: __( 'Picker box border colour', 'sgs-blocks' ), attrs: { base: 'pickerBoxBorderColour' }, attributes, setAttributes } ),
		fillRow( { key: 'previewFill', label: __( 'Preview box fill', 'sgs-blocks' ), attrs: { base: 'previewBackgroundColour' }, attributes, setAttributes } ),
		fillRow( { key: 'previewBorder', label: __( 'Preview box border colour', 'sgs-blocks' ), attrs: { base: 'previewBorderColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickSummary', label: __( 'Summary colour', 'sgs-blocks' ), attrs: { base: 'pickSummaryColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickSelectedFill', label: __( 'Selected option fill', 'sgs-blocks' ), attrs: { base: 'pickSelectedBackgroundColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickSelectedBorder', label: __( 'Selected option border colour', 'sgs-blocks' ), attrs: { base: 'pickSelectedBorderColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickBadgeFill', label: __( 'Term badge fill', 'sgs-blocks' ), attrs: { base: 'pickBadgeBackgroundColour' }, attributes, setAttributes } ),
		textRow( { key: 'pickBadgeText', label: __( 'Term badge text colour', 'sgs-blocks' ), attrs: { base: 'pickBadgeTextColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickerPillFill', label: __( 'Option fill (resting)', 'sgs-blocks' ), attrs: { base: 'pickerPillBackgroundColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickerPillBorder', label: __( 'Option border colour (resting)', 'sgs-blocks' ), attrs: { base: 'pickerPillBorderColour' }, attributes, setAttributes } ),
		fillRow( { key: 'pickerDotRing', label: __( 'Colour dot ring colour', 'sgs-blocks' ), attrs: { base: 'pickerDotRingColour' }, attributes, setAttributes } ),
		textRow( { key: 'pickerDotTick', label: __( 'Tick colour inside the colour dot', 'sgs-blocks' ), attrs: { base: 'pickerDotTickColour' }, attributes, setAttributes } ),
		textRow( { key: 'pickerHint', label: __( 'Heading hint colour', 'sgs-blocks' ), attrs: { base: 'pickerHintColour' }, attributes, setAttributes } ),
		textRow( { key: 'pickSelectedText', label: __( 'Selected option text colour', 'sgs-blocks' ), attrs: { base: 'pickSelectedTextColour' }, attributes, setAttributes } ),
	];
}
