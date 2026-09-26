/**
 * D9 (2026-09-26 plan): warns an operator when a flow asks some but not all
 * of its product's price-changing (variation-forming) attributes across its
 * `sgs/choice-flow-question` steps — a partial set lets a visitor skip a
 * real price change here that the product page would still have asked.
 * Renders nothing for a plain question, an answer-mode (non-priced) product
 * attribute, a flow asking none of its variation attributes yet, or one
 * asking all of them.
 *
 * Extracted into its own file per this build's size cap (the main edit.js
 * is already over the 250-line JS guideline) — the main thread imports and
 * renders this component; see this feature's build report for the exact
 * wiring line.
 *
 * Mirrors ProductAttributePanel.js's own product-id resolution and
 * apiFetch-to-WC-REST pattern rather than inventing a second one.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Recursively collect every block of one name under a subtree —
 * `sgs/choice-flow-question` sits two levels down (inside an
 * `sgs/form-step` child of the flow root — see this block's own `parent`
 * in block.json), so a flat direct-children filter (as edit.js's own step
 * picker uses for `sgs/form-step`) would miss every question.
 *
 * @param {Array}  blocks Blocks to search (one level of the tree).
 * @param {string} name   Block name to match.
 * @return {Array} Matching blocks, in document order.
 */
function collectBlocksByName( blocks, name ) {
	const found = [];
	( blocks || [] ).forEach( ( block ) => {
		if ( block.name === name ) {
			found.push( block );
		}
		if ( block.innerBlocks && block.innerBlocks.length ) {
			found.push( ...collectBlocksByName( block.innerBlocks, name ) );
		}
	} );
	return found;
}

/**
 * @param {Object} props
 * @param {Object} props.attributes This question's own attributes.
 * @param {string} props.clientId   This question's clientId.
 * @param {Object} [props.context]  Block context (`sgs/choice-flow/productId`).
 */
export default function VariationCoverageNotice( { attributes, clientId, context } ) {
	const { productAttribute } = attributes;
	const contextProductId = context?.[ 'sgs/choice-flow/productId' ] || 0;

	const flowInfo = useSelect(
		( select ) => {
			const { getBlockRootClientId, getBlock, getBlocks } =
				select( 'core/block-editor' );

			let ancestorId = getBlockRootClientId( clientId );
			while ( ancestorId ) {
				const ancestorBlock = getBlock( ancestorId );
				if ( ancestorBlock && ancestorBlock.name === 'sgs/choice-flow' ) {
					const siblingAttributes = collectBlocksByName(
						getBlocks( ancestorId ),
						'sgs/choice-flow-question'
					).map( ( block ) => block.attributes.productAttribute || '' );

					return {
						flowProductId: ancestorBlock.attributes.flowProductId || 0,
						siblingAttributes,
					};
				}
				ancestorId = getBlockRootClientId( ancestorId );
			}
			return { flowProductId: 0, siblingAttributes: [] };
		},
		[ clientId ]
	);

	const productId = contextProductId || flowInfo.flowProductId || 0;

	const [ variationAttributes, setVariationAttributes ] = useState( [] );

	// One combined fetch per product, same join ProductAttributePanel.js
	// already uses — the product's own attributes (variation flag) joined
	// against the global attribute registry (id -> slug, for the real
	// `pa_<slug>` taxonomy).
	useEffect( () => {
		if ( ! productId ) {
			setVariationAttributes( [] );
			return;
		}
		let cancelled = false;
		Promise.all( [
			apiFetch( { path: `/wc/v3/products/${ productId }` } ),
			apiFetch( { path: '/wc/v3/products/attributes?per_page=100' } ),
		] )
			.then( ( [ product, globalAttributes ] ) => {
				if ( cancelled ) {
					return;
				}
				const slugById = new Map( ( globalAttributes || [] ).map( ( a ) => [ a.id, a.slug ] ) );
				const resolved = ( product.attributes || [] )
					.filter( ( a ) => a.id > 0 && a.variation && slugById.has( a.id ) )
					.map( ( a ) => ( { name: a.name, taxonomy: `pa_${ slugById.get( a.id ) }` } ) );
				setVariationAttributes( resolved );
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setVariationAttributes( [] );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ productId ] );

	// Nothing to warn about: this step isn't itself a variation-forming
	// product-attribute step, or the product has under 2 priced axes
	// (nothing TO leave out), or the fetch hasn't resolved yet.
	const isVariationAttribute = variationAttributes.some(
		( attribute ) => attribute.taxonomy === productAttribute
	);
	if ( ! isVariationAttribute || variationAttributes.length < 2 ) {
		return null;
	}

	const askedTaxonomies = new Set( flowInfo.siblingAttributes.filter( Boolean ) );
	const covered = variationAttributes.filter( ( attribute ) => askedTaxonomies.has( attribute.taxonomy ) );
	const missing = variationAttributes.filter( ( attribute ) => ! askedTaxonomies.has( attribute.taxonomy ) );

	// D9 only warns on a PARTIAL set — full coverage and (the unreachable-
	// in-practice) zero coverage both render nothing.
	if ( 0 === missing.length || 0 === covered.length ) {
		return null;
	}

	return (
		<Notice status="warning" isDismissible={ false }>
			{ sprintf(
				/* translators: 1: attribute name(s) already asked in this flow, 2: attribute name(s) not asked. */
				__(
					'This flow asks %1$s but not %2$s. Ask every price-changing option here, or none (leave them to the product page).',
					'sgs-blocks'
				),
				covered.map( ( attribute ) => attribute.name ).join( ', ' ),
				missing.map( ( attribute ) => attribute.name ).join( ', ' )
			) }
		</Notice>
	);
}
