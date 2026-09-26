/**
 * SGS Wishlist Panel — "Labels" inspector panel (row actions, sort, dates,
 * price drop, notify-me form, generic error text).
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function LabelsPanel( { attributes, setAttributes } ) {
	const { layout, showSort, showDateSaved, showPriceDrop } = attributes;

	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	const field = ( key, label, help ) => (
		<TextControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ label }
			help={ help }
			value={ attributes[ key ] }
			onChange={ set( key ) }
		/>
	);

	return (
		<PanelBody title={ __( 'Labels', 'sgs-blocks' ) }>
			{ field( 'moveLabel', __( 'Move to basket label', 'sgs-blocks' ) ) }
			{ field( 'removeLabel', __( 'Remove label', 'sgs-blocks' ) ) }
			{ field( 'notifyLabel', __( 'Notify me label', 'sgs-blocks' ) ) }
			{ field( 'outOfStockLabel', __( 'Out of stock label', 'sgs-blocks' ) ) }
			{ field( 'notifyEmailLabel', __( 'Notify-me email field label', 'sgs-blocks' ) ) }
			{ field( 'notifyConsentText', __( 'Notify-me consent text', 'sgs-blocks' ) ) }
			{ field( 'notifySuccessText', __( 'Notify-me success message', 'sgs-blocks' ) ) }
			{ field( 'errorText', __( 'Generic error message', 'sgs-blocks' ) ) }
			{ 'strip' !== layout && (
				<>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show the sort control', 'sgs-blocks' ) }
						checked={ !! showSort }
						onChange={ set( 'showSort' ) }
					/>
					{ showSort && (
						<>
							{ field( 'sortLabel', __( 'Sort control label', 'sgs-blocks' ) ) }
							{ field( 'sortRecentLabel', __( '"Recently saved" option', 'sgs-blocks' ) ) }
							{ field( 'sortPriceAscLabel', __( '"Price low to high" option', 'sgs-blocks' ) ) }
							{ field( 'sortPriceDescLabel', __( '"Price high to low" option', 'sgs-blocks' ) ) }
							{ field( 'sortStockLabel', __( '"In stock first" option', 'sgs-blocks' ) ) }
						</>
					) }
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show date saved', 'sgs-blocks' ) }
						checked={ !! showDateSaved }
						onChange={ set( 'showDateSaved' ) }
					/>
					{ showDateSaved &&
						field(
							'dateSavedText',
							__( 'Date saved text', 'sgs-blocks' ),
							__( 'Use {date} for the saved date.', 'sgs-blocks' )
						) }
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show the price-drop line', 'sgs-blocks' ) }
						checked={ !! showPriceDrop }
						onChange={ set( 'showPriceDrop' ) }
					/>
					{ showPriceDrop &&
						field(
							'priceDropText',
							__( 'Price-drop text', 'sgs-blocks' ),
							__( 'Use {now} and {saved} for the two prices.', 'sgs-blocks' )
						) }
				</>
			) }
		</PanelBody>
	);
}
