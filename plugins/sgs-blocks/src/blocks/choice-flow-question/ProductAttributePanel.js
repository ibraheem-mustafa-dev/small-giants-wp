/**
 * "Product attribute" inspector panel for `sgs/choice-flow-question` — Spec
 * 43 Phase 3/4 §1 (FR-43-10/10a). Lets an operator pick one of the flow's
 * own product's attributes to generate this step's options from, instead of
 * typing them. Extracted into its own file per this build's size cap (the
 * main edit.js is already over the 250-line JS guideline) — the main
 * thread imports and renders this component; see this feature's build
 * report for the exact wiring line.
 *
 * Mirrors `choice-flow/PricingSettingsPanel.js`'s own apiFetch-to-WC-REST
 * pattern rather than inventing a second one.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Slug a WooCommerce term name into a stable value when the terms endpoint
 * doesn't resolve one — mirrors `edit.js`'s own `slugifyLabel()`.
 *
 * @param {string} name
 * @return {string}
 */
function slugifyTermName( name ) {
	return ( name || '' )
		.toString()
		.toLowerCase()
		.trim()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' );
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @param {string}   props.clientId      This block's clientId.
 * @param {Object}   [props.context]     Block context (carries
 *                                       `sgs/choice-flow/productId` once the
 *                                       root `sgs/choice-flow` block.json
 *                                       declares a matching `providesContext`
 *                                       — see this feature's build report).
 */
export default function ProductAttributePanel( { attributes, setAttributes, clientId, context } ) {
	const { productAttribute, options } = attributes;

	const contextProductId = context?.[ 'sgs/choice-flow/productId' ] || 0;

	// Fallback while `providesContext` isn't wired yet on the root block:
	// walk up to the nearest sgs/choice-flow ancestor and read its OWN
	// flowProductId attribute directly — the same ancestor-walk edit.js
	// already uses for its step picker (see that file's stepChoices useSelect).
	const ancestorProductId = useSelect(
		( select ) => {
			if ( contextProductId ) {
				return 0;
			}
			const { getBlockRootClientId, getBlock } = select( 'core/block-editor' );
			let ancestorId = getBlockRootClientId( clientId );
			while ( ancestorId ) {
				const ancestorBlock = getBlock( ancestorId );
				if ( ancestorBlock && ancestorBlock.name === 'sgs/choice-flow' ) {
					return ancestorBlock.attributes.flowProductId || 0;
				}
				ancestorId = getBlockRootClientId( ancestorId );
			}
			return 0;
		},
		[ clientId, contextProductId ]
	);

	const productId = contextProductId || ancestorProductId || 0;

	const [ wcAttributes, setWcAttributes ] = useState( [] );
	const [ loading, setLoading ] = useState( false );

	// One combined fetch per product: its own attributes (which carry `id`,
	// `name`, `variation`, `options` — term NAMES, not slugs) joined against
	// the global attribute registry (which carries `id` → `slug`, so the
	// real `pa_<slug>` taxonomy can be built). Only global (taxonomy-backed)
	// attributes can be a `productAttribute` — render.php resolves the mode
	// from `WC_Product_Attribute::get_variation()` on a real taxonomy, so a
	// product's local/custom attributes (id === 0) are filtered out here.
	useEffect( () => {
		if ( ! productId ) {
			setWcAttributes( [] );
			return;
		}
		let cancelled = false;
		setLoading( true );
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
					.filter( ( a ) => a.id > 0 && slugById.has( a.id ) )
					.map( ( a ) => ( { ...a, taxonomy: `pa_${ slugById.get( a.id ) }` } ) );
				setWcAttributes( resolved );
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setWcAttributes( [] );
				}
			} )
			.finally( () => {
				if ( ! cancelled ) {
					setLoading( false );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ productId ] );

	const choices = [
		{ label: __( 'None — typed options', 'sgs-blocks' ), value: '' },
		...wcAttributes.map( ( attribute ) => ( {
			label: `${ attribute.name } ${
				attribute.variation
					? __( '(changes price)', 'sgs-blocks' )
					: __( '(no price)', 'sgs-blocks' )
			}`,
			value: attribute.taxonomy,
		} ) ),
	];

	const handleChange = ( taxonomy ) => {
		if ( ! taxonomy ) {
			setAttributes( { productAttribute: '' } );
			return;
		}
		const attribute = wcAttributes.find( ( a ) => a.taxonomy === taxonomy );
		if ( ! attribute ) {
			return;
		}
		apiFetch( { path: `/wc/v3/products/attributes/${ attribute.id }/terms?per_page=100` } )
			.then( ( terms ) => {
				const nameToSlug = new Map( ( terms || [] ).map( ( t ) => [ t.name, t.slug ] ) );
				const newOptions = ( attribute.options || [] ).map( ( name ) => {
					const slug = nameToSlug.get( name ) || slugifyTermName( name );
					const existing = ( options || [] ).find( ( o ) => o.value === slug ) || {};
					return {
						label: name,
						value: slug,
						nextStepId: existing.nextStepId || '',
						tags: existing.tags || [],
						image: existing.image || null,
						helpText: existing.helpText || '',
						addToBagNow: existing.addToBagNow || false,
						isDefault: existing.isDefault || false,
						badge: existing.badge || '',
						description: existing.description || '',
					};
				} );
				// productAttribute wins over priceGroup (Spec 43 Phase 3/4 §1) —
				// clear it here so the two never both carry a value.
				setAttributes( { productAttribute: taxonomy, priceGroup: '', options: newOptions } );
			} );
	};

	return (
		<PanelBody title={ __( 'Product attribute', 'sgs-blocks' ) } initialOpen={ false }>
			{ ! productId && (
				<p>
					{ __(
						'Set the flow’s product first (Pricing panel on the flow block, or open this on a product page) to generate options from its attributes.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ loading && <Spinner /> }
			{ !! productId && (
				<SelectControl
					label={ __( 'Generate options from', 'sgs-blocks' ) }
					value={ productAttribute || '' }
					options={ choices }
					onChange={ handleChange }
					help={ __(
						'When set, this step’s options are generated from the product’s own attribute terms — the options list above becomes read-only apart from routing, tags, image and help text.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}
