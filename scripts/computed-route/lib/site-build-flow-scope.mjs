// Which products a choice flow's product link reaches (Spec 48 FR-48-95, Spec 43 FR-43-25). lib/site-build-flow-links.mjs
// plans a `_sgs_choice_flow` link for each published product a product row covers; this narrows that plan:
// - a product row links its flow only when the draft's buy box itself opens it: the row's `opens` entry for that flow carries
//   `buyBox` (lib/intake-pagemap-openers.mjs). A flow drawn inline on a page (a home page's build-your-box section) or opened only from
//   elsewhere links no product;
// - a product is linked only when it is a purchasable product of the types data/surface-openers.json `flowLinks.productTypes`
//   names (never a gift card or any other product type), holds at least one variation attribute (never an option-less
//   product), and holds every attribute the flow's priced questions resolve (the question block's `flowLinks.pricedSetting`
//   in the published flow post).
// The site's half is PHP read beside the link state (shapePhp, flowAttributesPhp): each product's type and variation
// attribute slugs, and each flow post's priced attributes, `pa_` dropped.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const FLOW_LINKS = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'surface-openers.json' ), 'utf8' ) ).flowLinks;
const QUESTION = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'skeleton-decisions.json' ), 'utf8' ) ).rules.choiceFlow.question;

// Why a product row links no product to its flow, or null when the draft's buy box opens the flow.
export function rowRefusal( row ) {
	return ( row.opens || [] ).some( ( o ) => 'flow' === o.kind && o.slug === row.opensFlow && o.buyBox ) ? null
		: `product row "${ row.slug }" opens flow "${ row.opensFlow }" from no buy box of the draft (an inline flow, or a control outside the buy box), so no product links it`;
}

// Why one product takes no link to a flow, or null when it may. p: { id, title, type, options (its variation attribute
// slugs) }; attrs: the flow's priced attribute slugs.
export function productRefusal( p, attrs = [] ) {
	if ( ! FLOW_LINKS.productTypes.includes( p.type ) ) {
		return `product ${ p.id } "${ p.title }" is a ${ p.type || 'product of no known type' }, which a flow never links`;
	}
	if ( ! ( p.options || [] ).length ) {
		return `product ${ p.id } "${ p.title }" has no options (no variation attribute), so the flow has nothing of it to price`;
	}
	const missing = attrs.filter( ( a ) => ! p.options.includes( a ) );
	return missing.length ? `product ${ p.id } "${ p.title }" lacks the attribute${ missing.length > 1 ? 's' : '' } ${ missing.join( ', ' ) } the flow prices` : null;
}

// A link plan (lib/site-build-flow-links.mjs::planFlowLinks) narrowed to the rows and products above: refused actions become
// notes. state: the link state read with each product's shape ({ products: [{ id, type, options }], flowAttributes: { slug:
// [attr] } }).
export function scopePlan( plan, rows, state ) {
	const byFlow = new Map();
	for ( const row of rows.filter( ( r ) => 'product' === r.postType && r.opensFlow ) ) {
		// A flow any of its rows opens from a buy box is allowed.
		if ( ! byFlow.has( row.opensFlow ) || null !== byFlow.get( row.opensFlow ) ) {
			byFlow.set( row.opensFlow, rowRefusal( row ) );
		}
	}
	const shapes = new Map( ( state.products || [] ).map( ( p ) => [ p.id, p ] ) );
	const notes = [ ...plan.notes ];
	const said = new Set();
	const actions = plan.actions.filter( ( a ) => {
		const why = byFlow.get( a.to ) ?? productRefusal( { ...a, ...( shapes.get( a.id ) || {} ) }, state.flowAttributes?.[ a.to ] || [] );
		if ( why && ! said.has( why ) ) {
			said.add( why );
			notes.push( why );
		}
		return ! why;
	} );
	return { ...plan, actions, notes };
}

// The PHP expression pair for a product `$var` (a WP_Post): its WooCommerce type and its variation attribute slugs.
export const shapePhp = ( v ) => `'type' => ( function_exists( 'wc_get_product' ) && ( $wc = wc_get_product( ${ v }->ID ) ) ) ? $wc->get_type() : '', 'options' => ( function_exists( 'wc_get_product' ) && ( $wc = wc_get_product( ${ v }->ID ) ) ) ? array_values( array_map( function ( $a ) { return preg_replace( '/^pa_/', '', $a->get_name() ); }, array_filter( $wc->get_attributes(), function ( $a ) { return is_object( $a ) && $a->get_variation(); } ) ) ) : array()`;

// The PHP that fills `$flow_attributes[ $slug ]` with the priced attributes of the flow post `$post`.
export const flowAttributesPhp = ( post, slug ) => `$found = array();
$walk = function ( $blocks ) use ( &$walk, &$found ) {
	foreach ( $blocks as $b ) {
		if ( ${ JSON.stringify( QUESTION ) } === $b['blockName'] && ! empty( $b['attrs'][ ${ JSON.stringify( FLOW_LINKS.pricedSetting ) } ] ) ) {
			$found[] = preg_replace( '/^pa_/', '', (string) $b['attrs'][ ${ JSON.stringify( FLOW_LINKS.pricedSetting ) } ] );
		}
		$walk( $b['innerBlocks'] );
	}
};
$walk( parse_blocks( ${ post }->post_content ) );
$flow_attributes[ ${ slug } ] = array_values( array_unique( $found ) );`;
