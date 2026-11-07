// Position matching, the applier's last pairing step. A draft element a record names that no pair or skeleton node reaches is
// looked for among the post's other blocks by where it sits: inside the paired ancestor that holds it on the draft, a live block
// whose box overlaps it by at least 0.6, with shared words where either side has text (lib/apply-skeleton.mjs::positionMatch).
// A block a pair already reads is never a match: it has its draft element, and a second one would fight it over the same settings.
// The pass runs after the first read and returns extra targets for a second decide pass; every match is logged.
import { overlap, positionMatch } from './apply-skeleton.mjs';

const WIDTH = 1440;
const inside = ( a, b, slack = 2 ) => a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.w <= b.x + b.w + slack && a.y + a.h <= b.y + b.h + slack;
const idOf = ( tpl ) => Number( /^Root\/(\d+)#\d+$/.exec( String( tpl ) )?.[ 1 ] ?? NaN );

// The draft ids the records name that no target already reads.
export function unreachedIds( { recordsIndex, pairs } ) {
	const taken = new Set( pairs.flatMap( ( p ) => [ idOf( p.tpl ), ...( p.aux || [] ).map( ( a ) => idOf( a.tpl ) ) ] ) );
	return [ ...recordsIndex.keys() ].filter( ( k ) => k.startsWith( 'Root/' ) ).map( ( k ) => Number( k.slice( 5 ) ) ).filter( ( id ) => Number.isFinite( id ) && ! taken.has( id ) );
}

// Pure matching. draftFacts / liveFacts: { key: { box, text } } at one width; ancestors: the surface's targets with a draft box.
// Returns [ { id, ref, tpl, overlap, ancestor } ].
export function matchByPosition( { ids, draftFacts, liveFacts, pairs, saved } ) {
	const out = [];
	for ( const id of ids ) {
		const d = draftFacts[ `pos~${ id }` ];
		if ( ! d?.box || d.box.w * d.box.h <= 0 ) {
			continue;
		}
		const holders = pairs.filter( ( p ) => draftFacts[ p.key ?? p.ref ]?.box && ! p.slot && inside( d.box, draftFacts[ p.key ?? p.ref ].box ) && liveFacts[ p.ref ]?.box );
		const ancestor = holders.sort( ( a, b ) => draftFacts[ a.key ?? a.ref ].box.w * draftFacts[ a.key ?? a.ref ].box.h - draftFacts[ b.key ?? b.ref ].box.w * draftFacts[ b.key ?? b.ref ].box.h )[ 0 ];
		if ( ! ancestor ) {
			continue;
		}
		let best = null;
		for ( const ref of Object.keys( saved ) ) {
			const l = liveFacts[ ref ];
			if ( pairs.some( ( p ) => p.ref === ref ) || ! l?.box || ! inside( l.box, liveFacts[ ancestor.ref ].box ) ) {
				continue;
			}
			const score = overlap( d.box, l.box );
			if ( score >= 0.6 && positionMatch( { draft: d, live: { ...l, block: saved[ ref ].block }, block: saved[ ref ].block } ) && ( ! best || score > best.overlap ) ) {
				best = { id, ref, tpl: `Root/${ id }#0`, overlap: score, ancestor: ancestor.tpl };
			}
		}
		best && out.push( best );
	}
	return out;
}

// The targets position matching adds for a surface. readFacts( side, items ) reads { key: facts } at 1440.
export async function positionTargets( { surface, saved, recordsIndex, readFacts } ) {
	const ids = unreachedIds( { recordsIndex, pairs: surface.pairs } );
	if ( ! ids.length ) {
		return [];
	}
	const draftFacts = await readFacts( 'draft', [ ...surface.pairs.map( ( p ) => ( { key: p.key ?? p.ref, tpl: p.tpl } ) ), ...ids.map( ( id ) => ( { key: `pos~${ id }`, tpl: `Root/${ id }#0` } ) ) ] );
	const liveFacts = await readFacts( 'live', Object.keys( saved ).map( ( ref ) => ( { key: ref, ref } ) ) );
	return matchByPosition( { ids, draftFacts, liveFacts, pairs: surface.pairs, saved } ).map( ( m ) => ( {
		key: `${ m.ref }@${ m.id }`,
		ref: m.ref,
		tpl: m.tpl,
		via: 'position',
		shared: true,
		overlap: Math.round( m.overlap * 100 ) / 100,
		nearest_tpl: m.ancestor,
		owns: [ m.id ],
	} ) );
}

export { WIDTH };
