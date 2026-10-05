// Divergence ledger (GAP-CHECKLIST.md section 16, Spec 47 FR-47-5). A config may name a site's divergences.json
// (`divergences: '<path>'`, relative to the config file). Each entry records an intended difference:
//   { id, scope, node, state, property, widths, expected: { value } | { rule }, reason, register: [ register item ids ], decided }
// A row matches an entry on node (its ref, its block, or '*'), state, property (or '*', every property) and width. A rule entry accepts the
// row; a value entry accepts it only while live shows that value, and otherwise reports the expected value as the
// row's draft side. Kept separate from the computed route's own ledger: the walker imports nothing from it.
import fs from 'fs';
import path from 'path';
import { sameValue } from './compare.mjs';

export function loadDivergences( cfgPath, cfg ) {
	if ( ! cfg.divergences ) {
		return [];
	}
	const file = path.resolve( path.dirname( cfgPath ), cfg.divergences );
	const entries = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( ! Array.isArray( entries ) ) {
		throw new Error( `${ file }: a divergences file is an array of entries` );
	}
	return entries;
}

// Block slugs as the ref element's root class: sgs/site-footer-row paints .sgs-site-footer-row.
const slugClass = ( node ) => 'sgs-' + node.replace( /^sgs\//, '' );

export function divergenceFor( entries, ctx, diff ) {
	// state 'hover' matches hover rows (the hover end state); any other state names the walker state.
	const stateOk = ( e ) => '*' === e.state || ( 'hover' === e.state ? 'hover' === diff.kind : e.state === ctx.state );
	// A pseudo layer's row (diff.pseudo) matches only an entry naming that layer (e.pseudo), and an element's entry only
	// the element's own rows.
	return entries.find( ( e ) => stateOk( e ) &&
		( e.pseudo ?? null ) === ( diff.pseudo ?? null ) &&
		( '*' === e.property || e.property === diff.key ) &&
		( ! e.widths || e.widths.includes( ctx.width ) ) &&
		( '*' === e.node || e.node === diff.ref || ( diff.block && e.node.includes( '/' ) && slugClass( e.node ) === diff.block ) ) ) || null;
}

// Judges one row against the ledger: returns the accept reason, or null with the row's draft swapped for the
// expected value when a value entry does not hold. Every covered row carries `decided: { id, value }`, the value a
// settings writer must hold there: a value entry's decided value, or for a rule entry what live shows (accepted as it
// is). The draft side stays a plain value, so anything parsing it reads the decided value.
export function judgeDivergence( entries, ctx, diff, pxTol ) {
	const e = divergenceFor( entries, ctx, diff );
	if ( ! e ) {
		return null;
	}
	if ( e.expected?.rule ) {
		diff.decided = { id: e.id, rule: e.expected.rule, value: diff.live };
		return `${ e.id } (${ e.expected.rule }): ${ e.reason }`;
	}
	diff.decided = { id: e.id, value: e.expected.value };
	if ( sameValue( diff.key, e.expected.value, diff.live, pxTol ) ) {
		return `${ e.id } (value ${ e.expected.value }): ${ e.reason }`;
	}
	diff.draft = e.expected.value;
	return null;
}
