// The page map's openers (Spec 48 FR-48-95): every draft control whose click handler opens a modal, starts a choice flow or
// fills a form that the page map holds as a row. The row holding the control records `opens: [{ kind, slug }]` (one entry per
// target, `kind` from data/surface-openers.json by the target row's post type), so the skeleton turns the control into a button
// linking the target's anchor and places the target's frame on that row (lib/skeleton-openers.mjs), and the site check walks
// every listed opener. `opensFlow` (lib/intake-pagemap-flow-openers.mjs) stays the product row's single flow link; this is its
// general form. Read from the draft code, never from prose:
// - a target's opening writes are lib/intake-pagemap-flow-openers.mjs::openingWrites of its surfaces.json record;
// - a control's writes are the literal setState writes of the functions its onClick binding names (::fnWrites);
// - the control opens the target when its writes hold every opening write, made in a component the opening calls run on
//   (::openingComponents: `dcLogic('Home').setState(…)` runs on Home only; a call naming none runs anywhere).
// The row holding a control is the innermost page-map surface whose draft root holds it (a header, footer, drawer, modal or
// flow row), else the page row of its route (`pageOfTag`). A control inside the target's own surface (a form's topic chip) is
// part of it and opens nothing. A control inside a part a block draws (the bag drawer the cart block draws) cannot be a button
// of its own: it is a gap row, never recorded. A flow entry on a product row carries `buyBox: true` when the control sits in
// the buy box, the lowest element holding both the control and the page's h1 that is neither the page's `<main>` nor a
// conditional route wrapper, so the site build links products only to a flow the buy box itself opens.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { attrOf, readBinding, propName } from './intake-ast.mjs';
import { fnsNamed } from './intake-census-map.mjs';
import { elementTree, descendants, innerText, KIND_POST_TYPE } from './intake-pagemap-surfaces.mjs';
import { openingWrites, openingComponents, componentOf, fnWrites } from './intake-pagemap-flow-openers.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const OPENABLE = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'surface-openers.json' ), 'utf8' ) ).kinds;

// `file:line:col` of a draftId (`Store.dc.html:26:1 <div aria-label="Your bag">`), or null for a surfaces.json id.
const tagId = ( id ) => /^(.+?\.dc\.html):(\d+):(\d+)/.exec( String( id || '' ) )?.slice( 1 ).join( ':' ) ?? null;

// The functions an onClick binding names (`{{ openLens }}`, `{{ item.pick }}`): every function the logic gives that name.
function handlerFns( idx, value ) {
	let expr = null;
	try {
		expr = readBinding( value || '' )?.expr;
	} catch {
		return [];
	}
	const name = expr && ( propName( expr ) || ( 'Identifier' === expr.type ? expr.name : null ) );
	return name ? [ ...new Set( [ 'member', 'local', 'key' ].flatMap( ( how ) => fnsNamed( { nodes: idx.all }, name, how ) ) ) ] : [];
}

// The page-map row a code surface became: the row naming its surfaces.json record, else the row of its post type and title.
function rowOfSurface( rows, s ) {
	const type = KIND_POST_TYPE[ String( s.kind ).toLowerCase() ];
	return rows.find( ( r ) => s.hint && r.draftId === `surfaces.json ${ s.hint }` ) ||
		rows.find( ( r ) => type && r.postType === type && ! r.draftId && r.title === ( s.title || s.label ) ) || null;
}

// Whether `node` sits in the buy box of its page: the lowest ancestor holding an h1 is an element of its own (not the page's
// `<main>`, a conditional `<sc-if>` route wrapper or the template root).
function inBuyBox( node ) {
	for ( let a = node.parent; a; a = a.parent ) {
		if ( descendants( a ).some( ( x ) => 'h1' === x.name ) ) {
			return ! [ 'main', 'sc-if', '#root' ].includes( a.name );
		}
	}
	return false;
}

// Records `opens` on each row holding a control that opens an openable row. exp: the loaded export; rows: the page map's rows;
// hint: handoff/surfaces.json; pageOfTag( 'file:line:col' ): the route key holding a template element; surfaces: the code
// surfaces after the surfaces.json cross-check (each with its root `draftId` and its record id `hint`).
// Returns { gaps, list }: gap rows for a control no row can hold, and one entry per opening control
// { control (file:line:col), words, handler, kind, slug, holder (the row's slug), buyBox? }.
export function surfaceOpeners( { exp, rows, hint, pageOfTag, surfaces = [] } ) {
	const records = new Map( ( hint?.records || [] ).map( ( r ) => [ r.id, r ] ) );
	const targets = rows.filter( ( r ) => OPENABLE[ r.postType ] && /^surfaces\.json /.test( r.draftId || '' ) )
		.map( ( r ) => {
			const record = records.get( r.draftId.replace( /^surfaces\.json /, '' ) );
			return { row: r, kind: OPENABLE[ r.postType ], writes: openingWrites( record ), components: openingComponents( record ) };
		} )
		.filter( ( t ) => t.writes.length );
	const gaps = [];
	const list = [];
	if ( ! targets.length ) {
		return { gaps, list };
	}
	// Each surface root and block-owned part root by its file:line:col, with the row it belongs to.
	const roots = new Map();
	for ( const s of surfaces ) {
		const id = tagId( s.draftId );
		const row = id ? rowOfSurface( rows, s ) : null;
		id && row && roots.set( id, { row } );
	}
	for ( const r of rows ) {
		for ( const p of ( r.parts || [] ).filter( ( x ) => 'block' === x.owner && tagId( x.draftId ) ) ) {
			roots.set( tagId( p.draftId ), { part: p, row: r } );
		}
	}
	const pageRow = ( route ) => ( route ? rows.find( ( r ) => r.route === route && ! OPENABLE[ r.postType ] ) || null : null );
	for ( const d of exp.drafts.filter( ( x ) => ! x.error && x.idx ) ) {
		const tree = elementTree( d );
		const key = ( n ) => `${ d.file }:${ n.line }:${ n.col }`;
		for ( const node of tree.nodes.filter( ( n ) => attrOf( n, 'onClick' ) ) ) {
			const writes = new Set( handlerFns( d.idx, attrOf( node, 'onClick' ) ).flatMap( ( fn ) => [ ...fnWrites( d.idx, fn ) ] ) );
			const hits = targets.filter( ( t ) => ( ! t.components || t.components.has( componentOf( d.file ) ) ) && t.writes.every( ( w ) => writes.has( w ) ) );
			if ( ! hits.length ) {
				continue;
			}
			// The surfaces holding the control, innermost first.
			const holders = [];
			for ( let a = node; a && a.parent; a = a.parent ) {
				roots.has( key( a ) ) && holders.push( roots.get( key( a ) ) );
			}
			const control = key( node );
			const words = innerText( tree.text, node ) || attrOf( node, 'aria-label' ) || '';
			const handler = attrOf( node, 'onClick' );
			for ( const t of hits ) {
				if ( holders.some( ( h ) => ! h.part && h.row === t.row ) ) {
					continue;
				}
				const owned = holders.find( ( h ) => h.part );
				if ( owned && holders.indexOf( owned ) === 0 ) {
					gaps.push( { construct: 'page-map', draftId: control, error: `"${ words }" opens the ${ t.kind } ${ t.row.slug }, but it sits in the ${ owned.part.kind } "${ owned.part.label }" that a block draws whole, so it cannot be a button of its own` } );
					continue;
				}
				const holder = holders[ 0 ]?.row || pageRow( pageOfTag( control ) );
				if ( ! holder ) {
					gaps.push( { construct: 'page-map', draftId: control, error: `"${ words }" opens the ${ t.kind } ${ t.row.slug }, and no page-map row holds it` } );
					continue;
				}
				const buyBox = 'flow' === t.kind && 'product' === holder.postType && ! holders.length && inBuyBox( node );
				list.push( { control, words, handler, kind: t.kind, slug: t.row.slug, holder: holder.slug, ...( buyBox ? { buyBox } : {} ) } );
				const entry = ( holder.opens ??= [] ).find( ( o ) => o.kind === t.kind && o.slug === t.row.slug );
				if ( ! entry ) {
					holder.opens.push( { kind: t.kind, slug: t.row.slug, ...( buyBox ? { buyBox } : {} ) } );
				} else if ( buyBox ) {
					entry.buyBox = true;
				}
			}
		}
	}
	return { gaps, list };
}
