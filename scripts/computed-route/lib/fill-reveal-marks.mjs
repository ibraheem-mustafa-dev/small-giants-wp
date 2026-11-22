// Reveal marks (Spec 48 FR-48-102, FR-38A-19): a draft element that carries a scroll-reveal mark (`data-reveal`, kept by the
// skeleton inventory as the element's `data`, lib/skeleton-inventory.mjs) is shown by the draft's own script as it scrolls into
// view, a mechanism no motion record describes (the script writes the element's inline style). Its block takes the
// framework's token entrance: the `entrance-fade-up` preset on the block's root, trigger `scroll`, its duration, easing and
// travel the client's `entrance` tokens (settings.custom.entrance). A block whose draft element carries no mark gets nothing,
// and a block that already holds a root entrance (a record or a sampled entrance wrote it) keeps it.
import { setAttr } from './tree.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';

// The `data-` names (without the prefix) the drafts use for a scroll reveal.
export const REVEAL_MARKS = /^(?:reveal|scroll-reveal)$/;
export const REVEAL_PRESET = 'entrance-fade-up';

// Whether an inventory element's `data` holds a reveal mark.
export const isRevealed = ( data ) => Object.keys( data || {} ).some( ( k ) => REVEAL_MARKS.test( k ) );

// Writes the token entrance on every skeleton node whose draft element carries a reveal mark. nodes: skeletonNodes();
// flat: tree nodes by index; refOf: tree node to ref; inventory: the surface's skeleton inventory ({ elements: [ { key, data } ] },
// null: nothing written); mdb: lib/motion-db.mjs::motionDb; schema: the motion schema. Returns { writes, unmapped, notes }.
export function revealMarkWrites( { nodes, flat, refOf, inventory, mdb, schema } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const marked = new Set( ( inventory?.elements || [] ).filter( ( e ) => isRevealed( e.data ) ).map( ( e ) => e.key ) );
	if ( ! marked.size ) {
		return out;
	}
	const preset = mdb.presets( 'entrance' ).find( ( p ) => p.slug === REVEAL_PRESET );
	for ( const n of nodes ) {
		const key = n.node.draftRef?.tpl;
		if ( ! key || ! marked.has( key ) ) {
			continue;
		}
		const node = flat[ n.index ];
		const ref = refOf( node );
		const where = { node: ref, block: n.name, slot: '' };
		if ( ! preset ) {
			out.unmapped.push( { ...where, property: 'scroll reveal', value: 'data-reveal', reason: `the framework holds no ${ REVEAL_PRESET } entrance preset` } );
			continue;
		}
		if ( ! mdb.targetsOf( n.name ).some( ( t ) => 'root' === t.target ) ) {
			out.unmapped.push( { ...where, property: 'scroll reveal', value: 'data-reveal', reason: `the draft reveals this element on scroll and ${ n.name } has no motion target to hold an entrance` } );
			continue;
		}
		const held = node.attributes?.sgsMotion;
		if ( held?.elements?.root?.entrance?.base ) {
			out.notes.push( `${ ref } ${ n.name }: carries a reveal mark and already holds a root entrance; kept` );
			continue;
		}
		const doc = structuredClone( held && 'object' === typeof held ? held : { v: 1, elements: {} } );
		doc.v ??= 1;
		doc.elements ??= {};
		doc.elements.root = { ...( doc.elements.root || {} ), entrance: { ...( doc.elements.root?.entrance || {} ), base: { preset: REVEAL_PRESET, trigger: 'scroll', values: structuredClone( preset.values ) } } };
		const verdict = validateMotionWrite( doc, schema );
		if ( ! verdict.valid ) {
			out.unmapped.push( { ...where, property: 'scroll reveal', value: 'data-reveal', reason: `sgsMotion refused: ${ verdictProblems( verdict ).join( '; ' ) }` } );
			continue;
		}
		const { before, after } = setAttr( node, { attr: 'sgsMotion', value: doc } );
		out.writes.push( { ...where, prop: `scroll reveal (data-reveal): ${ REVEAL_PRESET }`, attr: 'sgsMotion', before, after, widths: [], how: 'reveal-mark' } );
	}
	return out;
}
