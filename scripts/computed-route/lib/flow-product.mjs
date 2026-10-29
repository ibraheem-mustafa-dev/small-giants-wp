// The product a choice flow sells and the questions that are that product's attributes (Spec 48 FR-48-55 and FR-48-92,
// Spec 43 FR-43-7, FR-43-10 and FR-43-21), read from the draft code through its syntax tree (R-47-4), never by matching
// words:
//   - a basket call is an `.add( { … } )` call handed an object (directly, through a variable or either arm of a
//     conditional) whose `id` is a literal: that literal is the draft id of the product it adds;
//   - a flow sells a catalogue product when the basket calls of its component (the page map's `sgs_choice_flow` row's
//     draft surface, `surfaces.json`'s `dc`) add exactly one catalogue draft id;
//   - the choices the flow asks are the state keys that product's basket objects read (lib/catalogue-options.mjs::lineKeys,
//     a key gated by another left out), each with the options its setter's mapped list gives (keyOptions) and the
//     render binding that list is kept under (`sizes`), which the question's loop draws (`<sc-for list="{{ sizes }}">`);
//   - a flow choice is a catalogue attribute when both hold the same option values (the code's values, not the words).
import fs from 'node:fs';
import path from 'node:path';
import { keyName, parseLogic, splitDraft } from './intake-ast.mjs';
import { catalogueSources, follow } from './catalogue-source.mjs';
import { keyOptions, lineKeys } from './catalogue-options.mjs';

// The basket objects a parsed source hands to `.add` calls with a literal id: [{ id, node, src }].
export function basketObjects( src ) {
	const ctx = { sources: [ src ] };
	const out = [];
	for ( const n of src.idx.all ) {
		if ( 'CallExpression' !== n.type || 'MemberExpression' !== n.callee.type || n.callee.computed || 'add' !== n.callee.property.name ) {
			continue;
		}
		for ( const t of follow( ctx, src, n.arguments[ 0 ] ).filter( ( x ) => 'ObjectExpression' === x.node.type ) ) {
			const v = t.node.properties.find( ( p ) => 'ObjectProperty' === p.type && 'id' === keyName( p ) )?.value;
			if ( 'StringLiteral' === v?.type || 'NumericLiteral' === v?.type ) {
				out.push( { id: String( v.value ), node: t.node, src: t.src } );
			}
		}
	}
	return out;
}

// The draft ids a script's basket calls add, in order. `script` is a whole draft (its logic is cut from it) or logic alone;
// a script that does not parse adds none.
export function addedIds( script ) {
	if ( 'string' !== typeof script || ! script ) {
		return [];
	}
	let code = script;
	try {
		code = splitDraft( script ).logic;
	} catch {
		// No draft template: the text is the logic itself.
	}
	try {
		return [ ...new Set( basketObjects( { idx: parseLogic( code ) } ).map( ( b ) => b.id ) ) ];
	} catch {
		return [];
	}
}

// The component drawing each choice-flow row of the page map: [{ row, component }] (a row whose surface the handoff's
// surfaces.json does not name is left out).
export function flowComponents( folder, rows ) {
	const file = path.join( folder, 'surfaces.json' );
	const records = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).records || [] : [];
	return ( rows || [] ).filter( ( r ) => 'sgs_choice_flow' === r.postType ).map( ( row ) => {
		const id = String( row.draftId || '' ).split( ' ' ).pop();
		return { row, component: records.find( ( s ) => s.id === id )?.dc ?? null };
	} ).filter( ( f ) => f.component );
}

// The logic source of a component among the catalogue sources, or null.
export const componentSource = ( ctx, component ) => ctx.sources.find( ( s ) => 'logic' === s.kind && s.file === `${ component }.dc.html` ) ?? null;

// The choices one flow source asks for a product: [{ key, kind, name, values }], one per ungated state key its basket
// objects for that draft id read.
export function flowChoices( ctx, src, draftId ) {
	const keys = new Map();
	basketObjects( src ).filter( ( b ) => b.id === draftId ).forEach( ( b ) => lineKeys( ctx, { src: b.src, node: b.node } ).forEach( ( k ) => keys.has( k.key ) || keys.set( k.key, k ) ) );
	return [ ...keys.values() ].filter( ( k ) => ! k.gatedBy ).map( ( k ) => {
		const o = keyOptions( ctx, src, k );
		return { key: k.key, kind: o.kind, name: o.name, values: o.options.map( ( x ) => x.value ) };
	} );
}

// Whether two option lists hold the same values.
export const sameValues = ( a, b ) => a.length > 0 && a.length === b.length && a.every( ( v ) => b.includes( v ) );

// What a flow component sells: { product (the catalogue product), steps [{ binding, key, kind, attribute }] }, or
// { product: null, steps: [], note } when its basket calls add no catalogue product or several.
export function flowSale( { folder, component, catalogue, ctx = null } ) {
	const products = new Map( ( catalogue?.products || [] ).map( ( p ) => [ p.draftId, p ] ) );
	const sources = ctx || ( products.size && component ? catalogueSources( folder ) : null );
	const src = sources ? componentSource( sources, component ) : null;
	if ( ! src ) {
		return { product: null, steps: [], note: `the ${ component || 'flow' } component's logic is not read against a catalogue, so the flow sells no catalogue product` };
	}
	const ids = [ ...new Set( basketObjects( src ).map( ( b ) => b.id ).filter( ( id ) => products.has( id ) ) ) ];
	if ( 1 !== ids.length ) {
		return { product: null, steps: [], note: `the ${ component } script adds ${ ids.length ? `${ ids.length } catalogue products (${ ids.join( ', ' ) })` : 'no catalogue product' }, so its questions keep their own options` };
	}
	const product = products.get( ids[ 0 ] );
	const steps = flowChoices( sources, src, ids[ 0 ] ).filter( ( c ) => c.name && [ 'choice', 'multi' ].includes( c.kind ) ).map( ( c ) => ( {
		binding: c.name, key: c.key, kind: c.kind, attribute: product.attributes.find( ( a ) => sameValues( a.options.map( ( o ) => o.value ), c.values ) ) ?? null,
	} ) ).filter( ( s ) => s.attribute );
	return { product, steps, note: null };
}
