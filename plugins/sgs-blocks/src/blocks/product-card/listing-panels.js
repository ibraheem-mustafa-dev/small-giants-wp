/**
 * Inspector panels for the listing-card settings of sgs/product-card:
 * what a connected product's card shows (description, button, wishlist
 * heart, RRP saving, colour dots) and the card's image shape and shadow.
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { FlexWrapControl, MEDIA_SIZING_RATIO_OPTIONS, SgsBoxControl, SgsLengthControl } from '../../components';
import { SGS_LENGTH_UNITS, sgsNormaliseLength } from '../../utils';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';

import SgsFreeTextField from '../../components/SgsFreeTextField';
/**
 * Connected-product panel: which elements a live card shows and where its
 * RRP and colour dots come from.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListingContentPanel( { attributes, setAttributes } ) {
	const {
		showDescription,
		showCta,
		showWishlist,
		rrpMetaKey,
		rrpSavingFormat,
		swatchAttribute,
		cardContentSource,
		badgeMetaKey,
		priceNoteMetaKey,
		ctaLabelMetaKey,
		ctaActionMetaKey,
		ctaChoicesToPage,
		priceFromLowest,
		showCtaIcon,
		showCtaShadow,
		showSwatches,
		showDescriptionTier,
		imageSize,
	} = attributes;
	const tierValue = ( tier ) => ( showDescriptionTier && showDescriptionTier[ tier ] ) || '';
	const setTier = ( tier, v ) => {
		const next = { ...( showDescriptionTier || {} ) };
		if ( v ) {
			next[ tier ] = v;
		} else {
			delete next[ tier ];
		}
		setAttributes( { showDescriptionTier: next } );
	};
	const fromProduct = 'product' === cardContentSource;
	const metaKeyFields = [
		[ 'badgeMetaKey', badgeMetaKey, __( 'Badge field (meta key)', 'sgs-blocks' ), '_sgs_card_badge' ],
		[ 'priceNoteMetaKey', priceNoteMetaKey, __( 'Price note field (meta key)', 'sgs-blocks' ), '_sgs_card_price_note' ],
		[ 'ctaLabelMetaKey', ctaLabelMetaKey, __( 'Button label field (meta key)', 'sgs-blocks' ), '_sgs_card_cta_label' ],
		[ 'ctaActionMetaKey', ctaActionMetaKey, __( 'Button action field (meta key)', 'sgs-blocks' ), '_sgs_card_cta_action' ],
	];

	return (
		<>
			<PanelBody title={ __( 'Card content', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Card content', 'sgs-blocks' ) }
					help={ __(
						'Typed on this card: the badge, price note and button text you set here. From each product: every product’s own badge, price note and button, set on its Card tab in the product editor.',
						'sgs-blocks'
					) }
					value={ fromProduct ? 'product' : 'typed' }
					options={ [
						{ label: __( 'Typed on this card', 'sgs-blocks' ), value: 'typed' },
						{ label: __( 'From each product', 'sgs-blocks' ), value: 'product' },
					] }
					onChange={ ( v ) => setAttributes( { cardContentSource: v } ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				{ fromProduct &&
					metaKeyFields.map( ( [ attr, value, label, standard ] ) => (
						<TextControl
							key={ attr }
							label={ label }
							help={ __( 'Empty uses', 'sgs-blocks' ) + ' ' + standard }
							value={ value || '' }
							onChange={ ( v ) => setAttributes( { [ attr ]: v } ) }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) ) }
				{ fromProduct && false !== showCta && (
					<ToggleControl
						label={ __( 'Products that need choices go to their page', 'sgs-blocks' ) }
						help={ __(
							'A variable or grouped product gets a link to its page instead of an add-to-basket button, unless its own Button action says otherwise.',
							'sgs-blocks'
						) }
						checked={ !! ctaChoicesToPage }
						onChange={ ( v ) => setAttributes( { ctaChoicesToPage: v } ) }
						__nextHasNoMarginBottom
					/>
				) }
				{ fromProduct && (
					<ToggleControl
						label={ __( 'Show “From” and the lowest price', 'sgs-blocks' ) }
						help={ __(
							'A variable product whose options cost different amounts shows “From” and its lowest price instead of the default option’s price.',
							'sgs-blocks'
						) }
						checked={ !! priceFromLowest }
						onChange={ ( v ) => setAttributes( { priceFromLowest: v } ) }
						__nextHasNoMarginBottom
					/>
				) }
			</PanelBody>
			<PanelBody title={ __( 'Show or hide', 'sgs-blocks' ) } initialOpen={ false }>
				<ToggleControl
					label={ __( 'Show description', 'sgs-blocks' ) }
					help={ __(
						'The product’s short description under the title.',
						'sgs-blocks'
					) }
					checked={ showDescription !== false }
					onChange={ ( v ) => setAttributes( { showDescription: v } ) }
					__nextHasNoMarginBottom
				/>
				{ showDescription !== false &&
					[
						[ 'desktop', __( 'Description on desktop', 'sgs-blocks' ) ],
						[ 'tablet', __( 'Description on tablet', 'sgs-blocks' ) ],
						[ 'mobile', __( 'Description on mobile', 'sgs-blocks' ) ],
					].map( ( [ tier, label ] ) => (
						<SelectControl
							key={ tier }
							label={ label }
							value={ tierValue( tier ) }
							options={ [
								{ label: __( 'As the tier above', 'sgs-blocks' ), value: '' },
								{ label: __( 'Show', 'sgs-blocks' ), value: 'on' },
								{ label: __( 'Hide', 'sgs-blocks' ), value: 'off' },
							] }
							onChange={ ( v ) => setTier( tier, v ) }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) ) }
				<ToggleControl
					label={ __( 'Show button', 'sgs-blocks' ) }
					help={ __(
						'Off for shop grids: the image and title still link to the product.',
						'sgs-blocks'
					) }
					checked={ showCta !== false }
					onChange={ ( v ) => setAttributes( { showCta: v } ) }
					__nextHasNoMarginBottom
				/>
				{ showCta !== false && (
					<>
						<ToggleControl
							label={ __( 'Show basket icon on the button', 'sgs-blocks' ) }
							checked={ showCtaIcon !== false }
							onChange={ ( v ) => setAttributes( { showCtaIcon: v } ) }
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Show button shadow', 'sgs-blocks' ) }
							checked={ showCtaShadow !== false }
							onChange={ ( v ) => setAttributes( { showCtaShadow: v } ) }
							__nextHasNoMarginBottom
						/>
					</>
				) }
				<ToggleControl
					label={ __( 'Show wishlist heart', 'sgs-blocks' ) }
					help={ __(
						'A heart on the image that saves the product in the visitor’s browser.',
						'sgs-blocks'
					) }
					checked={ !! showWishlist }
					onChange={ ( v ) => setAttributes( { showWishlist: v } ) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
			<PanelBody
				title={ __( 'Listing card', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'RRP field (meta key)', 'sgs-blocks' ) }
					help={ __(
						'The product field holding the recommended retail price, e.g. _sgs_rrp. When the RRP is above the price it shows struck through, and an empty saving badge reads the saving.',
						'sgs-blocks'
					) }
					value={ rrpMetaKey || '' }
					onChange={ ( v ) => setAttributes( { rrpMetaKey: v } ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				{ '' !== ( rrpMetaKey || '' ) && (
					<SelectControl
						label={ __( 'Saving wording', 'sgs-blocks' ) }
						value={ rrpSavingFormat || 'amount' }
						options={ [
							{
								label: __( 'Amount (Save £32)', 'sgs-blocks' ),
								value: 'amount',
							},
							{
								label: __( 'Percentage (Save 19%)', 'sgs-blocks' ),
								value: 'percentage',
							},
						] }
						onChange={ ( v ) => setAttributes( { rrpSavingFormat: v } ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				) }
				<SelectControl
					label={ __( 'Photo size', 'sgs-blocks' ) }
					help={ __( 'A larger size stops a small thumbnail looking soft on a wide card. Default = the shop\u2019s thumbnail size.', 'sgs-blocks' ) }
					value={ imageSize || '' }
					options={ [
						{ label: __( 'Shop thumbnail (default)', 'sgs-blocks' ), value: '' },
						{ label: __( 'Thumbnail', 'sgs-blocks' ), value: 'thumbnail' },
						{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
						{ label: __( 'Medium large', 'sgs-blocks' ), value: 'medium_large' },
						{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
						{ label: __( 'Full size', 'sgs-blocks' ), value: 'full' },
					] }
					onChange={ ( v ) => setAttributes( { imageSize: v } ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Show colour dots', 'sgs-blocks' ) }
					checked={ showSwatches !== false }
					onChange={ ( v ) => setAttributes( { showSwatches: v } ) }
					__nextHasNoMarginBottom
				/>
				{ showSwatches !== false && (
				<TextControl
					label={ __( 'Colour dots from attribute', 'sgs-blocks' ) }
					help={ __(
						'The variation attribute whose colours show as dots, e.g. pa_colour. Empty = the first attribute with colours set. Typed swatches win when present.',
						'sgs-blocks'
					) }
					value={ swatchAttribute || '' }
					onChange={ ( v ) => setAttributes( { swatchAttribute: v } ) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				) }
			</PanelBody>
		</>
	);
}

/**
 * Styles panel: the image box shape and the resting shadow.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListingShapePanel( { name, attributes, setAttributes } ) {
	const { imageAspectRatio, showShadow, noImageLabel, priceRowSpaceAbove, imageFill, cardPaddingTier, cardPadding } = attributes;
	const setPaddingTier = ( tier, box ) => setAttributes( { cardPaddingTier: { ...( cardPaddingTier || {} ), [ tier ]: box } } );

	return (
		<PanelBody
			title={ __( 'Image shape & shadow', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SelectControl
				label={ __( 'Image shape', 'sgs-blocks' ) }
				help={ __(
					'Fixed height uses the Image height setting; a ratio follows the card’s width.',
					'sgs-blocks'
				) }
				value={ imageAspectRatio || '' }
				options={ [
					{ label: __( 'Fixed height', 'sgs-blocks' ), value: '' },
					...MEDIA_SIZING_RATIO_OPTIONS,
				] }
				onChange={ ( v ) => setAttributes( { imageAspectRatio: v } ) }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{ '' !== ( imageAspectRatio || '' ) && (
				<ToggleControl
					label={ __( 'Photo fills its box', 'sgs-blocks' ) }
					help={ __( 'Stretches the photo link to the box\u2019s full height so a short photo fills it.', 'sgs-blocks' ) }
					checked={ !! imageFill }
					onChange={ ( v ) => setAttributes( { imageFill: v } ) }
					__nextHasNoMarginBottom
				/>
			) }
			<SgsBoxControl
				label={ __( 'Card padding on tablet', 'sgs-blocks' ) }
				values={ ( cardPaddingTier && cardPaddingTier.tablet ) || cardPadding || {} }
				presets
				defaults={ spacingDefaultsFor( name, 'cardPaddingTier' ) }
				onChange={ ( next ) => setPaddingTier( 'tablet', next ) }
			/>
			<SgsBoxControl
				label={ __( 'Card padding on mobile', 'sgs-blocks' ) }
				values={ ( cardPaddingTier && cardPaddingTier.mobile ) || ( cardPaddingTier && cardPaddingTier.tablet ) || cardPadding || {} }
				presets
				defaults={ spacingDefaultsFor( name, 'cardPaddingTier' ) }
				onChange={ ( next ) => setPaddingTier( 'mobile', next ) }
			/>
			<ToggleControl
				label={ __( 'Resting shadow', 'sgs-blocks' ) }
				help={ __(
					'Off = border only at rest. The hover shadow is set in Hover Effects.',
					'sgs-blocks'
				) }
				checked={ showShadow !== false }
				onChange={ ( v ) => setAttributes( { showShadow: v } ) }
				__nextHasNoMarginBottom
			/>
			<SgsFreeTextField type="rich" noLink
				label={ __( 'No-photo label', 'sgs-blocks' ) }
				help={ __(
					'Shown in the photo box of a product with no photo (or the shop’s placeholder image), e.g. “Photo to come”. Empty shows a picture icon. Its size and spacing are in Typography.',
					'sgs-blocks'
				) }
				value={ noImageLabel || '' }
				onChange={ ( v ) => setAttributes( { noImageLabel: v } ) }
			/>
			<SgsLengthControl
				label={ __( 'Space above the price', 'sgs-blocks' ) }
				help={ __( 'Added to the gap between the card’s rows, above the price row. Empty = none.', 'sgs-blocks' ) }
				value={ priceRowSpaceAbove ?? '' }
				units={ SGS_LENGTH_UNITS }
				presets={ false }
				onChange={ ( v ) => setAttributes( { priceRowSpaceAbove: sgsNormaliseLength( v ) } ) }
			/>
		</PanelBody>
	);
}

/**
 * Colour dots panel: the size of a card's colour dots and how far one grows
 * when pointed at (includes/product-card-card-parts.php).
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListingDotsPanel( { attributes, setAttributes } ) {
	const { swatchSize, swatchHoverGrow, showSwatches } = attributes;
	if ( false === showSwatches ) {
		return null;
	}

	return (
		<PanelBody title={ __( 'Colour dots', 'sgs-blocks' ) } initialOpen={ false }>
			<RangeControl
				label={ __( 'Dot size (px)', 'sgs-blocks' ) }
				help={ __( '0 = the card style’s default.', 'sgs-blocks' ) }
				value={ swatchSize ?? 0 }
				onChange={ ( v ) => setAttributes( { swatchSize: v ?? 0 } ) }
				min={ 0 }
				max={ 40 }
				step={ 1 }
				allowReset
				resetFallbackValue={ 0 }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<RangeControl
				label={ __( 'Grow on hover (%)', 'sgs-blocks' ) }
				help={ __( '125 = a quarter larger when pointed at. 0 = no growth.', 'sgs-blocks' ) }
				value={ swatchHoverGrow ?? 0 }
				onChange={ ( v ) => setAttributes( { swatchHoverGrow: v ?? 0 } ) }
				min={ 0 }
				max={ 200 }
				step={ 1 }
				allowReset
				resetFallbackValue={ 0 }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}

/**
 * Row wrapping panel: whether the card's rows of items (thumbnails, price row, colour dots, buttons) wrap onto
 * further rows or stay on one line (`css:flex-wrap` on each element, rendered by render.php).
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListingRowsPanel( { attributes, setAttributes } ) {
	const { thumbsFlexWrap, priceRowFlexWrap, swatchesFlexWrap, ctaRowFlexWrap } = attributes;

	return (
		<PanelBody title={ __( 'Row wrapping', 'sgs-blocks' ) } initialOpen={ false }>
			<FlexWrapControl
				label={ __( 'Wrap thumbnails', 'sgs-blocks' ) }
				value={ thumbsFlexWrap }
				onChange={ ( v ) => setAttributes( { thumbsFlexWrap: v } ) }
			/>
			<FlexWrapControl
				label={ __( 'Wrap price row', 'sgs-blocks' ) }
				value={ priceRowFlexWrap }
				onChange={ ( v ) => setAttributes( { priceRowFlexWrap: v } ) }
			/>
			<FlexWrapControl
				label={ __( 'Wrap colour dots', 'sgs-blocks' ) }
				value={ swatchesFlexWrap }
				onChange={ ( v ) => setAttributes( { swatchesFlexWrap: v } ) }
			/>
			<FlexWrapControl
				label={ __( 'Wrap buttons', 'sgs-blocks' ) }
				value={ ctaRowFlexWrap }
				onChange={ ( v ) => setAttributes( { ctaRowFlexWrap: v } ) }
			/>
		</PanelBody>
	);
}

/**
 * Photo overlays panel: the padding of the brand overlay on the photo
 * (includes/product-card-card-parts.php).
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListingOverlaysPanel( { name, attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Photo overlays', 'sgs-blocks' ) } initialOpen={ false }>
			<SgsBoxControl
				label={ __( 'Brand overlay padding', 'sgs-blocks' ) }
				values={ attributes.brandPadding ?? {} }
				presets
				defaults={ spacingDefaultsFor( name, 'brandPadding' ) }
				onChange={ ( next ) => setAttributes( { brandPadding: next } ) }
			/>
		</PanelBody>
	);
}
