/**
 * Source + Display inspector controls for sgs/brand-strip.
 *
 * Extracted out of edit.js (already well past this project's 250-line JS
 * guideline — see its own header) rather than growing it further. Two
 * exported panels; edit.js just imports and mounts them.
 *
 * GROUND-TRUTH: mirrors sgs/post-grid's own `useEntityRecords( 'taxonomy',
 * 'category', … )` pattern (post-grid/edit.js) for detecting a taxonomy from
 * the editor, and this block's own pre-existing "Caption" panel (TypographyControls
 * + SelectControl align, edit.js) for the brand-text typography controls shape.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as coreDataStore } from '@wordpress/core-data';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import { TypographyControls } from '../../components';

const SOURCE_OPTIONS = [
	{ label: __( 'Manual (add logos below)', 'sgs-blocks' ), value: 'manual' },
	{ label: __( 'Product brands (WooCommerce)', 'sgs-blocks' ), value: 'product-brands' },
];

const ORDER_OPTIONS = [
	{ label: __( 'Name (A–Z)', 'sgs-blocks' ), value: 'name' },
	{ label: __( 'Most products first', 'sgs-blocks' ), value: 'count' },
	{ label: __( 'Taxonomy order', 'sgs-blocks' ), value: 'term_order' },
];

const DISPLAY_OPTIONS = [
	{ label: __( 'Logos', 'sgs-blocks' ), value: 'logos' },
	{ label: __( 'Text only', 'sgs-blocks' ), value: 'text' },
	{ label: __( 'Logo, else text', 'sgs-blocks' ), value: 'logo-else-text' },
];

/**
 * "Source" panel — Manual vs Product brands, the product-brand query
 * settings (order/hide-empty/max/link), and the Display setting (applies to
 * both sources).
 */
export function SourcePanel( { attributes, setAttributes } ) {
	const {
		source,
		brandOrder,
		brandHideEmpty,
		brandMaxItems,
		brandLinkToShop,
		brandDisplay,
	} = attributes;

	// Detect the WooCommerce core `product_brand` taxonomy from the editor
	// (mirrors sgs/post-grid's useEntityRecords pattern). `hasResolved` false
	// means "still checking"; once resolved, `taxonomy` is undefined when the
	// REST route 404s (WooCommerce off, or a WooCommerce version without core
	// Product Brands) — the ONLY case this notice covers. The frontend render
	// path (product-brands-source.php) checks independently via taxonomy_exists().
	const { taxonomy, hasResolved } = useSelect( ( select ) => {
		const { getTaxonomy, hasFinishedResolution } = select( coreDataStore );
		return {
			taxonomy: getTaxonomy( 'product_brand' ),
			hasResolved: hasFinishedResolution( 'getTaxonomy', [ 'product_brand' ] ),
		};
	}, [] );
	const brandsUnavailable = 'product-brands' === source && hasResolved && ! taxonomy;

	return (
		<PanelBody title={ __( 'Source', 'sgs-blocks' ) } initialOpen={ true }>
			<SelectControl
				label={ __( 'Brand source', 'sgs-blocks' ) }
				value={ source || 'manual' }
				options={ SOURCE_OPTIONS }
				onChange={ ( val ) => setAttributes( { source: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			{ brandsUnavailable && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'No WooCommerce "Product brands" taxonomy found on this site — the strip will show nothing on the front end until WooCommerce (with core Product Brands) is active. Switch to Manual until then.',
						'sgs-blocks'
					) }
				</Notice>
			) }

			{ 'product-brands' === source && (
				<>
					<SelectControl
						label={ __( 'Order by', 'sgs-blocks' ) }
						value={ brandOrder || 'name' }
						options={ ORDER_OPTIONS }
						onChange={ ( val ) => setAttributes( { brandOrder: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Hide brands with no products', 'sgs-blocks' ) }
						checked={ brandHideEmpty ?? true }
						onChange={ ( val ) => setAttributes( { brandHideEmpty: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Maximum brands', 'sgs-blocks' ) }
						value={ brandMaxItems ?? 20 }
						onChange={ ( val ) => setAttributes( { brandMaxItems: val ?? 20 } ) }
						min={ 1 }
						max={ 100 }
						step={ 1 }
						withInputField
						allowReset
						resetFallbackValue={ 20 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Link each brand to its shop page', 'sgs-blocks' ) }
						checked={ brandLinkToShop ?? true }
						onChange={ ( val ) => setAttributes( { brandLinkToShop: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }

			<SelectControl
				label={ __( 'Display', 'sgs-blocks' ) }
				help={ __(
					'Logo, else text falls back to the brand name whenever a logo image is missing — the common case for WooCommerce brands with no image set.',
					'sgs-blocks'
				) }
				value={ brandDisplay || 'logos' }
				options={ DISPLAY_OPTIONS }
				onChange={ ( val ) => setAttributes( { brandDisplay: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}

/**
 * "Brand text style" panel — typography for the no-logo text fallback.
 * Rendered only when it can affect anything (Display !== 'logos'); a hidden
 * control is not a missing one, it is dead weight and a check-dead-controls
 * gate risk.
 */
export function BrandTextStylePanel( { attributes, setAttributes } ) {
	if ( 'logos' === ( attributes.brandDisplay || 'logos' ) ) {
		return null;
	}

	return (
		<PanelBody title={ __( 'Brand text style', 'sgs-blocks' ) } initialOpen={ false }>
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="brandText"
				showResponsive={ false }
				showStyle={ false }
				showLineHeight={ false }
				showFontFamily
				showTransform
				showLetterSpacing
			/>
		</PanelBody>
	);
}
