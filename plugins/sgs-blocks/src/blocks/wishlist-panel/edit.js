/**
 * SGS Wishlist Panel — editor.
 *
 * The editor shows a static placeholder (three sample rows) — the real
 * content is fetched client-side from the shared wishlist store + the
 * WooCommerce Store API (view.js), so there is nothing meaningful to
 * preview server-side inside the editor's own request.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	RangeControl,
	__experimentalUnitControl as UnitControl, // eslint-disable-line camelcase
} from '@wordpress/components';
import { SgsColourPanel, ResponsiveControl, fillRow, textRow } from '../../components';

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Editor markup.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		heading,
		emptyText,
		emptyLinkLabel,
		showWhenEmpty,
		showPrice,
		showStock,
		columns,
		gap,
	} = attributes;

	const blockProps = useBlockProps( { className: 'sgs-wishlist-panel' } );

	const colourRows = [
		textRow( {
			key: 'heading',
			label: __( 'Heading', 'sgs-blocks' ),
			attrs: { base: 'headingColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'itemName',
			label: __( 'Product name', 'sgs-blocks' ),
			attrs: { base: 'itemNameColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'price',
			label: __( 'Price', 'sgs-blocks' ),
			attrs: { base: 'priceColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'stock',
			label: __( 'Stock status', 'sgs-blocks' ),
			attrs: { base: 'stockColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'buttonBackground',
			label: __( 'Move to basket background', 'sgs-blocks' ),
			attrs: { base: 'buttonBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'buttonText',
			label: __( 'Move to basket text', 'sgs-blocks' ),
			attrs: { base: 'buttonTextColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'link',
			label: __( 'Remove / Notify me links', 'sgs-blocks' ),
			attrs: { base: 'linkColour', hover: 'linkColourHover' },
			attributes,
			setAttributes,
		} ),
	];

	return (
		<>
			<InspectorControls group="color">
				<SgsColourPanel rows={ colourRows } />
			</InspectorControls>
			<InspectorControls>
				<PanelBody title={ __( 'Wishlist panel', 'sgs-blocks' ) } initialOpen>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Heading', 'sgs-blocks' ) }
						value={ heading }
						onChange={ ( value ) => setAttributes( { heading: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Empty-wishlist text', 'sgs-blocks' ) }
						value={ emptyText }
						onChange={ ( value ) => setAttributes( { emptyText: value } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Empty-wishlist link label', 'sgs-blocks' ) }
						value={ emptyLinkLabel }
						onChange={ ( value ) => setAttributes( { emptyLinkLabel: value } ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show the panel even when the wishlist is empty', 'sgs-blocks' ) }
						help={ __(
							'Off by default on the cart page — the panel simply does not render for an empty wishlist.',
							'sgs-blocks'
						) }
						checked={ !! showWhenEmpty }
						onChange={ ( value ) => setAttributes( { showWhenEmpty: value } ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show price', 'sgs-blocks' ) }
						checked={ !! showPrice }
						onChange={ ( value ) => setAttributes( { showPrice: value } ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show stock status', 'sgs-blocks' ) }
						checked={ !! showStock }
						onChange={ ( value ) => setAttributes( { showStock: value } ) }
					/>
					<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Columns', 'sgs-blocks' ) }
								hideLabelFromVision
								min={ 1 }
								max={ 4 }
								value={ columns[ breakpoint ] ?? ( 'desktop' === breakpoint ? 3 : 1 ) }
								onChange={ ( value ) =>
									setAttributes( { columns: { ...columns, [ breakpoint ]: value } } )
								}
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Row gap', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								__next40pxDefaultSize
								label={ __( 'Row gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ gap[ breakpoint ] ?? '' }
								onChange={ ( value ) =>
									setAttributes( { gap: { ...gap, [ breakpoint ]: value } } )
								}
							/>
						) }
					</ResponsiveControl>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<h2 className="sgs-wishlist-panel__heading">{ heading }</h2>
				<p className="sgs-wishlist-panel__editor-note">
					{ __(
						'Saved items load from the visitor’s wishlist on the frontend — preview on the live page.',
						'sgs-blocks'
					) }
				</p>
			</div>
		</>
	);
}
