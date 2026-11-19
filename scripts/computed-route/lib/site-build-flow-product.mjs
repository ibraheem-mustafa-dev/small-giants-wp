// The catalogue product a choice flow adds to the basket (Spec 48 FR-48-100, Spec 43 FR-43-25): the site build sets the saved
// flow's own `flowProductId` (data/surface-openers.json `flowLinks.productSetting`) to that product's id on the site, so the
// flow renders `data-flow-product-id` of a real product instead of 0. Read from the draft code, never from prose: the flow's
// surfaces.json record names its component (`dc`); in that component's logic, the basket calls (`<x>.add(…)`, `.push(…)`,
// `.unshift(…)`) whose argument holds a string literal equal to a draft catalogue id name the product. Exactly one such
// product is the flow's; none (a flow that prices whatever product page opens it, as a lens configurator does) or two leave
// the setting unset with a note. The id is the one catalogue.json records for the site (`sites.<site>.products.<draft id>.id`,
// written by `site-build.mjs --catalogue`).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDraft, propName, subtree } from './intake-ast.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SETTING = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'surface-openers.json' ), 'utf8' ) ).flowLinks.productSetting;
const FLOW_BLOCK = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'skeleton-decisions.json' ), 'utf8' ) ).rules.choiceFlow.block;
const BASKET_CALLS = new Set( [ 'add', 'push', 'unshift' ] );

// The draft catalogue ids a component's basket calls name. folder: the handoff folder; component: the record's `dc`;
// ids: the catalogue's draft ids.
export function basketIdsOf( folder, component, ids ) {
	const file = `${ component }.dc.html`;
	if ( ! component || ! fs.existsSync( path.join( folder, file ) ) ) {
		return [];
	}
	const d = loadDraft( folder, file );
	if ( ! d.idx ) {
		return [];
	}
	const known = new Set( ids );
	const out = new Set();
	for ( const call of d.idx.all.filter( ( n ) => 'CallExpression' === n.type && BASKET_CALLS.has( propName( n.callee ) ) ) ) {
		for ( const arg of call.arguments ) {
			subtree( d.idx, arg ).filter( ( n ) => 'StringLiteral' === n.type && known.has( n.value ) ).forEach( ( n ) => out.add( n.value ) );
		}
	}
	return [ ...out ];
}

// { ids: { <flow row slug>: <product id> }, notes }. rows: the page map's rows; folder: the handoff folder; catalogue:
// catalogue.json (or null); site: the site the build is aimed at.
export function flowProductIds( { rows, folder, catalogue, site } ) {
	const ids = {};
	const notes = [];
	const records = new Map( ( fs.existsSync( path.join( folder, 'surfaces.json' ) ) ? JSON.parse( fs.readFileSync( path.join( folder, 'surfaces.json' ), 'utf8' ) ).records : [] ).map( ( r ) => [ r.id, r ] ) );
	const draftIds = ( catalogue?.products || [] ).map( ( p ) => p.draftId );
	for ( const row of rows.filter( ( r ) => 'sgs_choice_flow' === r.postType && /^surfaces\.json /.test( r.draftId || '' ) ) ) {
		const record = records.get( row.draftId.replace( /^surfaces\.json /, '' ) );
		const named = draftIds.length ? basketIdsOf( folder, record?.dc, draftIds ) : [];
		if ( 1 !== named.length ) {
			notes.push( `flow ${ row.slug }: its draft's basket calls name ${ named.length ? `${ named.length } catalogue products (${ named.join( ', ' ) })` : 'no catalogue product' }, so ${ SETTING } stays unset (the flow prices the product page that opens it)` );
			continue;
		}
		const id = catalogue.sites?.[ site ]?.products?.[ named[ 0 ] ]?.id;
		if ( ! Number.isInteger( id ) ) {
			notes.push( `flow ${ row.slug }: it adds the catalogue product "${ named[ 0 ] }", which catalogue.json records on no product of ${ site }; run site-build.mjs --catalogue --apply first` );
			continue;
		}
		ids[ row.slug ] = id;
	}
	return { ids, notes };
}

// The same, read from a client's files: sites/<client>/handoff and sites/<client>/build/catalogue.json.
export function flowProductIdsFor( { repo, client, site, rows } ) {
	const file = path.join( repo, 'sites', client, 'build', 'catalogue.json' );
	return flowProductIds( { rows, folder: path.join( repo, 'sites', client, 'handoff' ), catalogue: fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null, site } );
}

// A flow row's tree with its root flow block holding the product id; any other row's tree, or a flow with no id, unchanged.
export function withFlowProduct( tree, row, ids = {} ) {
	const id = 'sgs_choice_flow' === row?.postType ? ids[ row.slug ] : undefined;
	if ( ! Number.isInteger( id ) ) {
		return tree;
	}
	return tree.map( ( n ) => ( FLOW_BLOCK === n.name ? { ...n, attributes: { ...( n.attributes || {} ), [ SETTING ]: id } } : n ) );
}
