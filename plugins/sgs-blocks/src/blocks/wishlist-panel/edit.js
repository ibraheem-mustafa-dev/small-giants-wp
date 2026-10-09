/**
 * SGS Wishlist Panel — editor.
 *
 * The canvas shows sample rows in the chosen layout (capped at maxItems,
 * with the "View all" link when the cap hides items) — the real content is
 * fetched client-side from the shared wishlist store + the WooCommerce Store
 * API (view.js), so there is nothing meaningful to preview server-side
 * inside the editor's own request.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { SgsColourPanel, fillRow, textRow } from '../../components';
import { usePreviewTier } from '../../utils';
import { wishlistColourStyles, wishlistGridStyle } from './colour-preview';
import WishlistLayoutPanel from './components/WishlistLayoutPanel';
import LabelsPanel from './components/LabelsPanel';
import AlertsSharingPanel from './components/AlertsSharingPanel';
import SiteFeaturesPanel from './components/SiteFeaturesPanel';

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} Editor markup.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { heading, layout, maxItems, viewAllLabel, viewAllUrl, showCount, moveLabel, removeLabel } =
		attributes;
	const previewLayout = [ 'grid', 'list', 'strip' ].includes( layout ) ? layout : 'grid';
	const sampleCount = 6;
	const cap = Number( maxItems ) > 0 ? Math.min( Number( maxItems ), sampleCount ) : sampleCount;
	const showViewAll = Number( maxItems ) > 0 && Number( maxItems ) < sampleCount;

	// Mirrors render.php: a one-column phone grid shows compact rows.
	const columns = attributes.columns || {};
	const phoneTier = [ 'mobile', 'tablet', 'desktop' ].find(
		( tier ) => columns[ tier ] !== undefined && columns[ tier ] !== null && columns[ tier ] !== ''
	);
	const mobileRows = 'grid' === previewLayout && 1 === Number( phoneTier ? columns[ phoneTier ] : 1 );

	const previewTier = usePreviewTier();
	const colourStyles = wishlistColourStyles( attributes );

	const blockProps = useBlockProps( {
		className: `sgs-wishlist-panel sgs-wishlist-panel--${ previewLayout }${
			mobileRows ? ' sgs-wishlist-panel--mobile-rows' : ''
		}`,
		style: wishlistGridStyle( attributes, previewTier ),
	} );

	const colourRows = [
		textRow( {
			key: 'heading',
			label: __( 'Heading', 'sgs-blocks' ),
			attrs: { base: 'headingColour', gradient: 'headingColourGradient' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'itemName',
			label: __( 'Product name', 'sgs-blocks' ),
			attrs: { base: 'itemNameColour', gradient: 'itemNameColourGradient' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'price',
			label: __( 'Price', 'sgs-blocks' ),
			attrs: { base: 'priceColour', gradient: 'priceColourGradient' },
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
			attrs: { base: 'buttonBackgroundColour', gradient: 'buttonBackgroundColourGradient' },
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
			attrs: { base: 'barBackgroundColour', gradient: 'barBackgroundColourGradient' },
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
				<div className="sgs-wishlist-panel__bar-top">
					<h2 className="sgs-wishlist-panel__heading" style={ colourStyles.heading }>
						{ heading }
						{ showCount && <span className="sgs-wishlist-panel__count">{ ` (${ sampleCount })` }</span> }
					</h2>
					{ showViewAll && (
						<a className="sgs-wishlist-panel__view-all" href={ viewAllUrl || '#' } onClick={ ( e ) => e.preventDefault() }>
							{ viewAllLabel }
						</a>
					) }
				</div>
				<div className="sgs-wishlist-panel__bar" style={ colourStyles.bar }>
					<span className="sgs-wishlist-panel__bar-note">{ __( 'Alerts and sharing', 'sgs-blocks' ) }</span>
					<input
						type="text"
						className="sgs-wishlist-panel__share-field"
						style={ colourStyles.shareField }
						readOnly
						value={ __( 'Share link', 'sgs-blocks' ) }
						aria-label={ __( 'Share link', 'sgs-blocks' ) }
					/>
				</div>
				<div className="sgs-wishlist-panel__items">
					{ Array.from( { length: cap }, ( _, i ) => (
						<div className="sgs-wishlist-panel__row" key={ i }>
							<span className="sgs-wishlist-panel__row-thumb sgs-wishlist-panel__row-thumb--placeholder" aria-hidden="true" />
							<div className="sgs-wishlist-panel__row-info">
								<span className="sgs-wishlist-panel__row-name" style={ colourStyles.itemName }>
									{ __( 'Saved product', 'sgs-blocks' ) } { i + 1 }
								</span>
								<span className="sgs-wishlist-panel__row-price" style={ colourStyles.price }>
									£0.00
								</span>
								{ 0 === i && (
									<>
										<span className="sgs-wishlist-panel__row-price-drop" style={ colourStyles.priceDrop }>
											{ __( 'Price dropped', 'sgs-blocks' ) }
										</span>
										<span className="sgs-wishlist-panel__row-stock" style={ colourStyles.stockChip }>
											{ __( 'In stock', 'sgs-blocks' ) }
										</span>
									</>
								) }
							</div>
							<div className="sgs-wishlist-panel__row-actions">
								<span className="sgs-wishlist-panel__move-to-basket wp-element-button" style={ colourStyles.button }>
									{ moveLabel }
								</span>
								{ 'strip' !== previewLayout && (
									<span className="sgs-wishlist-panel__remove" style={ colourStyles.link }>
										{ removeLabel }
									</span>
								) }
							</div>
						</div>
					) ) }
				</div>
				<p className="sgs-wishlist-panel__editor-note">
					{ __( 'Sample rows. Each visitor sees their own saved items on the live page.', 'sgs-blocks' ) }
				</p>
			</div>
		</>
	);
}
