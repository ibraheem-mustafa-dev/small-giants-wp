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
import { SgsColourPanel, fillRow, textRow } from '../../components';
import WishlistLayoutPanel from './inspector/WishlistLayoutPanel';
import LabelsPanel from './inspector/LabelsPanel';
import AlertsSharingPanel from './inspector/AlertsSharingPanel';
import SiteFeaturesPanel from './inspector/SiteFeaturesPanel';

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Editor markup.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { heading } = attributes;

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
			key: 'priceDrop',
			label: __( 'Price-drop text', 'sgs-blocks' ),
			attrs: { base: 'priceDropColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'stockChipBackground',
			label: __( 'Stock chip background', 'sgs-blocks' ),
			attrs: { base: 'stockChipBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'stockChipText',
			label: __( 'Stock chip text', 'sgs-blocks' ),
			attrs: { base: 'stockChipTextColour' },
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
		fillRow( {
			key: 'barBackground',
			label: __( 'Guest prompt / alerts bar background', 'sgs-blocks' ),
			attrs: { base: 'barBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'shareFieldBackground',
			label: __( 'Share link field background', 'sgs-blocks' ),
			attrs: { base: 'shareFieldBackgroundColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'shareFieldText',
			label: __( 'Share link field text', 'sgs-blocks' ),
			attrs: { base: 'shareFieldTextColour' },
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
				<WishlistLayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				<LabelsPanel attributes={ attributes } setAttributes={ setAttributes } />
				<AlertsSharingPanel attributes={ attributes } setAttributes={ setAttributes } />
				<SiteFeaturesPanel />
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
