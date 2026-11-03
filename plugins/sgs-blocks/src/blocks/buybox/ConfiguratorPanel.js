import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, ToggleControl, Button, Notice } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { fillRow, ResponsiveBoxControl, SgsLengthControl } from '../../components';

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
				<TextControl
					label={ __( 'Summary text (use {pack} and {split})', 'sgs-blocks' ) }
					value={ attributes.summaryText ?? 'Your {pack}: {split}' }
					onChange={ ( val ) => setAttributes( { summaryText: val } ) }
					help={ __( 'Also {pack_label}, {variation}, {picks} and {count}. Unknown words in braces are removed.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<MediaUploadCheck>
					<MediaUpload
						onSelect={ ( media ) => setAttributes( { previewImageId: media && media.id ? media.id : 0 } ) }
						allowedTypes={ [ 'image' ] }
						value={ attributes.previewImageId || 0 }
						render={ ( { open } ) => (
							<div>
								<Button variant="secondary" onClick={ open } __next40pxDefaultSize>
									{ attributes.previewImageId ? __( 'Change the preview image', 'sgs-blocks' ) : __( 'Choose the preview image', 'sgs-blocks' ) }
								</Button>
								{ attributes.previewImageId > 0 && (
									<Button variant="link" isDestructive onClick={ () => setAttributes( { previewImageId: 0 } ) }>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								) }
							</div>
						) }
					/>
				</MediaUploadCheck>
				<TextControl
					label={ __( 'Preview: scatter this attribute’s colour', 'sgs-blocks' ) }
					value={ attributes.previewLayerAxis || '' }
					onChange={ ( val ) => setAttributes( { previewLayerAxis: val.trim() } ) }
					help={ __( 'The attribute key of a variation attribute whose option colour is scattered over the preview as small squares (for example pa_chip). Empty = none.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<ToggleControl
					label={ __( 'Hide the product photos', 'sgs-blocks' ) }
					checked={ true === attributes.pickHideGallery }
					onChange={ ( val ) => setAttributes( { pickHideGallery: val } ) }
					help={ __( 'The picker, preview and summary then fill the width.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Show the price row', 'sgs-blocks' ) }
					checked={ false !== attributes.showPriceRow }
					onChange={ ( val ) => setAttributes( { showPriceRow: val } ) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
			<PanelBody title={ __( 'Preview box', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsLengthControl
					presets
					label={ __( 'Border width', 'sgs-blocks' ) }
					value={ attributes.previewBorderWidth || '' }
					onChange={ ( val ) => setAttributes( { previewBorderWidth: val ?? '' } ) }
				/>
				<SgsLengthControl
					presets
					label={ __( 'Corner radius', 'sgs-blocks' ) }
					value={ attributes.previewRadius || '' }
					onChange={ ( val ) => setAttributes( { previewRadius: val ?? '' } ) }
				/>
				<TierBox label={ __( 'Inner spacing', 'sgs-blocks' ) } name="previewPadding" attributes={ attributes } setAttributes={ setAttributes } />
			</PanelBody>
			<PanelBody title={ __( 'Options and tiles', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsLengthControl
					presets
					label={ __( 'Option pill corner radius', 'sgs-blocks' ) }
					value={ attributes.pickOptionRadius || '' }
					onChange={ ( val ) => setAttributes( { pickOptionRadius: val ?? '' } ) }
				/>
				<TierBox label={ __( 'Option pill inner spacing', 'sgs-blocks' ) } name="pickOptionPadding" attributes={ attributes } setAttributes={ setAttributes } />
				<SgsLengthControl
					presets
					label={ __( 'Space between option pills', 'sgs-blocks' ) }
					value={ attributes.pickOptionGap || '' }
					onChange={ ( val ) => setAttributes( { pickOptionGap: val ?? '' } ) }
				/>
				<TierBox label={ __( 'Priced tile inner spacing', 'sgs-blocks' ) } name="pickTilePadding" attributes={ attributes } setAttributes={ setAttributes } />
				<SgsLengthControl
					presets
					label={ __( 'Space between priced tiles', 'sgs-blocks' ) }
					value={ attributes.pickTileGap || '' }
					onChange={ ( val ) => setAttributes( { pickTileGap: val ?? '' } ) }
				/>
			</PanelBody>
			<PanelBody title={ __( 'Picker box', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsLengthControl
					presets
					label={ __( 'Border width', 'sgs-blocks' ) }
					value={ attributes.pickerBoxBorderWidth || '' }
					onChange={ ( val ) => setAttributes( { pickerBoxBorderWidth: val ?? '' } ) }
				/>
				<SgsLengthControl
					presets
					label={ __( 'Corner radius', 'sgs-blocks' ) }
					value={ attributes.pickerBoxRadius || '' }
					onChange={ ( val ) => setAttributes( { pickerBoxRadius: val ?? '' } ) }
				/>
			</PanelBody>
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
	];
}
