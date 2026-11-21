// The build and apply stages' run ledger rows (lib/run-ledger.mjs), written by site-run.mjs once each stage has run. Pure.
// build: wp-build-page.js --save-built <file> saves the content the editor holds after its last reload ({ saved, built }, block
//   markup keyed by each block's cr-ref-<surface>-<i> class); each Fill write is passed on when the saved block holds the
//   setting at the value the Filled tree holds (a setting left out of the markup counts as its block.json default) and dropped
//   when the block is missing or holds another value (the editor rewrote it).
// apply: each row of the applier's plan (qa/apply/<surface>.plan.json) keyed by its draft element (`tpl`): written,
//   judged-equal (equal, or a divergence-ledger entry) or dropped (no setting, unchecked, unpaired, structural, with its why).
import { runRow } from './run-ledger.mjs';
import { refsOfContent } from './ledger-pairs.mjs';

const canon = ( v ) => JSON.stringify( v, ( k, x ) => ( x && 'object' === typeof x && ! Array.isArray( x ) ? Object.fromEntries( Object.keys( x ).sort().map( ( y ) => [ y, x[ y ] ] ) ) : x ) );
const propOf = ( p ) => String( p ?? '' ).replace( /^\(([^)]+)\).*$/, '$1' );

// The attributes of every node of a Filled tree by its cr-ref (the build's order: depth first).
export function filledByRef( tree, surface ) {
	const out = new Map();
	let i = 0;
	const walk = ( list ) => ( list || [] ).forEach( ( n ) => {
		out.set( `cr-ref-${ surface }-${ i++ }`, { block: n.name, attributes: n.attributes || {} } );
		walk( n.innerBlocks );
	} );
	walk( tree );
	return out;
}

// The build rows. writes: the Fill report's writes; filled: the Filled tree the build took; saved: the saved content (block
// markup); draftKeyOf( node, slot ): the draft element of a write's target; schemaOf( block ): its block.json attributes.
export function buildRunRows( { surface, writes, filled, saved, savedFile, draftKeyOf = () => null, schemaOf = () => null } ) {
	const built = refsOfContent( saved, surface );
	const fill = filledByRef( filled, surface );
	const out = [];
	const seen = new Set();
	for ( const w of writes || [] ) {
		const id = `${ w.node }|${ w.attr }|${ w.slot }|${ w.prop }|${ w.state ?? '' }`;
		if ( ! w.attr || seen.has( id ) ) {
			continue;
		}
		seen.add( id );
		const want = fill.get( w.node )?.attributes?.[ w.attr ];
		const attrs = built.get( w.node );
		const fallback = schemaOf( fill.get( w.node )?.block )?.[ w.attr ]?.default;
		const has = attrs ? ( undefined === attrs[ w.attr ] ? fallback : attrs[ w.attr ] ) : undefined;
		const kept = attrs && canon( has ) === canon( want );
		out.push( runRow( { draftKey: draftKeyOf( w.node, w.slot ), node: w.node, part: w.slot || '', property: propOf( w.prop ) || w.attr, state: w.state || 'rest', widths: w.widths || [], draft: w.after ?? null, stage: 'build',
			outcome: kept ? { kind: 'passed-on', setting: w.attr, value: want ?? null } : { kind: 'dropped', setting: w.attr, value: want ?? null, reason: attrs ? `the saved block holds ${ JSON.stringify( attrs[ w.attr ] ?? null ).slice( 0, 160 ) }` : `the saved content holds no block ${ w.node }` },
			record: { file: savedFile, section: 'saved', match: { node: w.node, setting: w.attr } } } ) );
	}
	return out;
}

const APPLY_OUTCOME = { written: 'written', equal: 'judged-equal', ledger: 'judged-equal' };

// The apply rows from the applier's plan ({ rows }); planFile: its path relative to the records folder.
export function applyRunRows( { plan, planFile } ) {
	return ( plan?.rows || [] ).filter( ( r ) => r.tpl || r.ref ).map( ( r ) => {
		const kind = APPLY_OUTCOME[ r.status ] ?? 'dropped';
		const outcome = 'written' === kind ? { kind, setting: r.prop ?? null, reason: r.why ?? null } : 'judged-equal' === kind ? { kind, baseline: r.why ?? null, reason: r.status } : { kind, reason: `${ r.status }: ${ r.why ?? '' }`.trim() };
		return runRow( { draftKey: r.tpl ?? null, node: r.ref ?? null, part: '', property: r.prop || r.family || 'element', state: r.state || 'rest', widths: [], stage: 'apply', outcome, record: { file: planFile, section: 'rows', match: { ref: r.ref ?? null, family: r.family ?? null, prop: r.prop ?? null } } } );
	} );
}
