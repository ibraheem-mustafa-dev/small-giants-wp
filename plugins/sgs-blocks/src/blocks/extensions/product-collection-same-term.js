/**
 * "Show products that share this product's <taxonomy>" extension.
 *
 * Adds a single attribute, `sgsSameTermAs`, to WooCommerce's native
 * `woocommerce/product-collection` block ONLY. On a single-product template
 * the block then lists other products sharing at least one of the current
 * product's terms in the chosen taxonomy (e.g. same `product_brand` → "More
 * from Ray-Ban", same `pa_shape` → "Similar shapes", a bakery's same
 * `product_cat`), excluding the product itself. The frontend query change is
 * server-side (includes/product-collection-same-term.php); this file only
 * adds the attribute and its inspector control.
 *
 * The taxonomy list (product_brand when registered, product_cat, product_tag,
 * every `pa_*` product attribute) comes from PHP via
 * `window.sgsBlocksData.sameTermTaxonomies` — the same inline-script channel
 * `class-sgs-blocks.php` and `conditional-visibility.php` already use, so it
 * is available regardless of bundle load order.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/** Only WooCommerce's native Product Collection block carries this control. */
const TARGET_BLOCK_NAME = 'woocommerce/product-collection';

/**
 * Guard against double registration (see conditional-visibility.js for why:
 * a CJS + ESM double-load would otherwise register every filter twice).
 */
if ( ! window.__sgsSameTermRegistered ) {
	window.__sgsSameTermRegistered = true;

	/**
	 * Inject the `sgsSameTermAs` attribute into the Product Collection block only.
	 *
	 * @param {Object} settings Block settings.
	 * @param {string} name     Block name.
	 * @return {Object} Modified settings.
	 */
	function addSameTermAttribute( settings, name ) {
		if ( TARGET_BLOCK_NAME !== name ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				/** Taxonomy slug ('' = off), e.g. 'product_brand', 'product_cat', 'pa_shape'. */
				sgsSameTermAs: { type: 'string', default: '' },
			},
		};
	}

	addFilter(
		'blocks.registerBlockType',
		'sgs/product-collection-same-term-attribute',
		addSameTermAttribute
	);

	/**
	 * Read the taxonomy options PHP localised onto `window.sgsBlocksData`.
	 * Always includes the "None" option; falls back to just that option when
	 * the data has not been localised (e.g. WooCommerce inactive).
	 *
	 * @return {Array<{label: string, value: string}>} SelectControl options.
	 */
	function getTaxonomyOptions() {
		const taxonomies = window.sgsBlocksData?.sameTermTaxonomies;
		if ( Array.isArray( taxonomies ) && taxonomies.length > 0 ) {
			return taxonomies;
		}
		return [ { value: '', label: __( 'None', 'sgs-blocks' ) } ];
	}

	/**
	 * HOC that adds the "Same as the current product" panel to the Product
	 * Collection block's inspector.
	 */
	const withSameTermControl = createHigherOrderComponent( ( BlockEdit ) => {
		return ( props ) => {
			const { name, attributes, setAttributes } = props;

			if ( TARGET_BLOCK_NAME !== name ) {
				return <BlockEdit { ...props } />;
			}

			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls>
						<PanelBody
							title={ __( 'Same as the current product', 'sgs-blocks' ) }
							initialOpen={ false }
						>
							<SelectControl
								label={ __(
									"Show products that share this product's…",
									'sgs-blocks'
								) }
								value={ attributes.sgsSameTermAs ?? '' }
								options={ getTaxonomyOptions() }
								onChange={ ( value ) =>
									setAttributes( { sgsSameTermAs: value } )
								}
								help={ __(
									"On a product page, list other products with the same value. Leave the collection's own filters empty.",
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</PanelBody>
					</InspectorControls>
				</>
			);
		};
	}, 'withSameTermControl' );

	addFilter(
		'editor.BlockEdit',
		'sgs/product-collection-same-term-controls',
		withSameTermControl
	);
} // end guard: window.__sgsSameTermRegistered
