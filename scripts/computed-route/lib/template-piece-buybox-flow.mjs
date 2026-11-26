// Whether the product template's buy box keeps its own Add to Cart beside the flow's opener (Spec 43 FR-43-25, Bean
// 2026-11-19): the route sets `sgs/buybox` `keepAddToCartWithFlow` when the draft's buy box draws its own add-to-basket
// control AND a separate control that opens the flow the product page opens, and leaves it off otherwise.
//
// What the route reads, from the draft's code and never from prose:
// - the flow: the page map's product rows record `opensFlow` (lib/intake-pagemap-flow-openers.mjs::flowOpeners), the slug of the
//   one choice flow the product page opens; the flow row's surfaces.json record gives its opening writes
//   (::openingWrites), the state values every open state sets (`lens.open=true`);
// - a control: an element of the buy box's run (lib/template-piece-buybox.mjs::locateRun) whose click binding names functions;
//   it OPENS the flow when one of those functions makes every opening write (::handlerFns, ::fnWrites, the same reading the
//   page map's openers use), and it is an ADD-TO-BASKET control when its handler appends a record to the basket
//   (lib/shop-parts-logic.mjs::effectOf, the reading shop-parts.mjs finds the add button by);
// - the order: `openerFirst` when the draft draws its opener before its add control (`sgs/buybox` `openerBeforeAddToCart`);
// - the rule: at least one control that adds without opening the flow and at least one that opens it. A draft whose add control
//   is the one that opens the flow (a button that adds only through the flow), a draft with no flow link at all, and a buy box
//   whose only buttons add are all left as they are: the buy box block then turns its Add to Cart into the flow's opener (the
//   product link, FR-43-25) or keeps it, as the draft draws it.
// Never guessed: no page-map flow, no readable draft logic, no flow record with opening writes, or a product page opening more
// than one flow gives no value, with the reason (the placed buy box's notes carry it, except where the draft draws no flow at all).
// A control inside a fixed-position bar (a sticky bar repeating the add button) is not the buy box's own control and is not read.
// Not read: a buy box whose click handlers live in an imported component file; the draft's own logic is all that is read, so such
// controls give no role and the buy box keeps nothing.
import fs from 'node:fs';
import path from 'node:path';
import { handlerFns, fnWrites, openingWrites, ownWrites, componentOf } from './intake-pagemap-flow-openers.mjs';
import { draftLogic, underFixed } from './template-piece-draft.mjs';
import { elementHandler } from './draft-link.mjs';
import { effectOf } from './shop-parts-logic.mjs';

// The choice flow the product template's page opens and the writes that open it: { flow, writes } or { why }. `rows`: the
// page map's rows; `handoffDir`: the client's handoff folder (surfaces.json).
export function productFlow( rows, handoffDir ) {
	const slugs = [ ...new Set( ( rows || [] ).filter( ( r ) => 'product' === r.postType && 'live' === r.collection && r.opensFlow ).map( ( r ) => r.opensFlow ) ) ];
	if ( ! slugs.length ) {
		return { why: 'no product row of the page map opens a choice flow', silent: true };
	}
	if ( slugs.length > 1 ) {
		return { why: `the product rows open ${ slugs.length } different flows (${ slugs.join( ', ' ) }), and the buy box keeps its button beside one` };
	}
	const row = rows.find( ( r ) => 'sgs_choice_flow' === r.postType && r.slug === slugs[ 0 ] );
	const id = String( row?.draftId || '' ).replace( /^surfaces\.json /, '' );
	let record = null;
	try {
		record = ( JSON.parse( fs.readFileSync( path.join( handoffDir || '', 'surfaces.json' ), 'utf8' ) ).records || [] ).find( ( r ) => r.id === id ) || null;
	} catch {
		record = null;
	}
	const writes = openingWrites( record );
	return writes.length ? { flow: slugs[ 0 ], writes } : { why: `the flow "${ slugs[ 0 ] }" has no record in surfaces.json (${ id || 'no draftId' }) whose open states set a value its opener writes` };
}

// What one control does: { opens, adds }, both false when it has no handler or the logic names none. `value`: its click
// binding (`{{ openLens }}`, lib/draft-link.mjs::elementHandler).
export function controlRole( L, value, writes, own = null ) {
	if ( ! value ) {
		return { opens: false, adds: false };
	}
	const opens = handlerFns( L, value ).some( ( fn ) => {
		const made = ownWrites( fnWrites( L, fn ), own );
		return writes.every( ( w ) => made.has( w ) );
	} );
	const adds = !! effectOf( L, value.replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim() ).appends;
	return { opens, adds };
}

// The decision for a placed buy box. `ctx`: the builder's context (pageRows, handoffDir, draftSource); `found`: the run
// lib/template-piece-buybox.mjs::locateRun returned ({ index, inRun }). Returns { keep, why?, adds, openers, flow }:
// the inventory keys of the controls that add and of those that open the flow; `silent` is true when the draft draws no flow at all.
export function keepsAddToCart( ctx, found ) {
	const flow = productFlow( ctx.pageRows, ctx.handoffDir );
	if ( flow.why ) {
		return { keep: false, why: flow.why, silent: flow.silent };
	}
	const L = draftLogic( ctx.draftSource );
	if ( ! L ) {
		return { keep: false, why: 'the draft has no readable logic to say what its buttons do' };
	}
	const roles = found.index.elements.filter( ( e ) => found.inRun( e.key ) && ! underFixed( found.index, e.key ) ).map( ( e ) => ( { key: e.key, ...controlRole( L, elementHandler( e ), flow.writes, ctx.draftFile ? componentOf( ctx.draftFile ) : null ) } ) );
	const openers = roles.filter( ( r ) => r.opens ).map( ( r ) => r.key );
	const adds = roles.filter( ( r ) => r.adds && ! r.opens ).map( ( r ) => r.key );
	if ( ! openers.length ) {
		return { keep: false, why: `no control in the buy box opens the flow "${ flow.flow }"`, adds, openers };
	}
	if ( ! adds.length ) {
		return { keep: false, why: `the buy box has no add-to-basket control apart from the one that opens the flow "${ flow.flow }"`, adds, openers };
	}
	// The draft's order of the two: its first innermost opener against its first innermost add control, in the inventory's
	// document order (a wrapper's snippet holds its descendants' handlers, lib/draft-link.mjs::elementHandler, so a wrapper of a
	// control is set aside for the control itself). `openerFirst` is `sgs/buybox` `openerBeforeAddToCart`.
	const innermost = ( keys ) => keys.filter( ( k ) => ! keys.some( ( o ) => o !== k && found.index.within( o, k ) ) );
	const at = ( keys ) => Math.min( ...innermost( keys ).map( ( k ) => roles.findIndex( ( r ) => r.key === k ) ) );
	return { keep: true, adds, openers, flow: flow.flow, openerFirst: at( openers ) < at( adds ) };
}
