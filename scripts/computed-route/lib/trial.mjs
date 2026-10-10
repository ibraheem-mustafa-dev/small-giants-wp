// Try before write (Spec 47 route-accuracy R6): a Solve write is tried in the open live page before it is saved. The
// block is rendered twice through core's /wp/v2/block-renderer (its current attributes, then with the write); the
// current render must reproduce the live element's style uid and the CSS the live page holds for it (the self-check),
// else the block needs a rebuild. The CSS the write adds or removes is mapped onto the live uid, applied, the pairs in
// and after the block are measured at every width, and the change is undone. A write is kept only when the page moves
// toward the draft and no pair moves away. The pure parts are here; the page parts are lib/trial-page.mjs.
import fs from 'fs';
import path from 'path';
import { nodeByRef } from './tree.mjs';

// A block's style uid class: `sgs-<prefix>-<8 hex>` (class-sgs-container-wrapper.php: a hash of the attributes).
export const UID_RE = /^sgs-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}$/;
export const uidsIn = ( classes ) => String( classes || '' ).split( /\s+/ ).filter( ( c ) => UID_RE.test( c ) );
const prefixOf = ( uid ) => uid.slice( 0, -9 );

// Rewrites every uid of `from` in text to the uid of `to` with the same prefix. Returns the text.
export function mapUids( text, from, to ) {
	let out = text;
	for ( const u of from ) {
		const t = to.find( ( x ) => prefixOf( x ) === prefixOf( u ) );
		t && t !== u && ( out = out.split( u ).join( t ) );
	}
	return out;
}

// The rules one list has and the other lacks, both as normalised rule texts: { added, removed }.
export function ruleDiff( before, after ) {
	const a = new Set( before );
	const b = new Set( after );
	return { added: after.filter( ( r ) => ! a.has( r ) ), removed: before.filter( ( r ) => ! b.has( r ) ) };
}

// Whether the current-attributes render reproduces the live block: the same uids, and the same rules for them.
// Returns { ok, why }.
export function selfCheck( { liveUids, renderUids, liveRules, renderRules } ) {
	const sorted = ( l ) => [ ...l ].sort().join( ' ' );
	if ( ! renderUids.length ) {
		return { ok: false, why: 'the render carries no style uid' };
	}
	if ( sorted( liveUids ) !== sorted( renderUids ) ) {
		return { ok: false, why: `uid ${ sorted( renderUids ) } rendered, ${ sorted( liveUids ) || 'none' } live: the tree and the live page differ` };
	}
	const { added, removed } = ruleDiff( liveRules, renderRules );
	return added.length || removed.length ? { ok: false, why: `${ added.length } rule(s) only in the render, ${ removed.length } only live` } : { ok: true, why: null };
}

// A block that can never be trialled: its classes are minted per request (wp_unique_id, microtime) or its render
// reads its parent's values (usesContext), which /wp/v2/block-renderer does not pass. Reads the block's own sources.
export function untriable( block, blocksDir ) {
	const dir = path.join( blocksDir, block.replace( /^sgs\//, '' ) );
	const read = ( f ) => ( fs.existsSync( path.join( dir, f ) ) ? fs.readFileSync( path.join( dir, f ), 'utf8' ) : '' );
	const json = read( 'block.json' );
	if ( json && ( JSON.parse( json ).usesContext || [] ).length ) {
		return 'it reads its parent block\'s values (usesContext), which the block renderer does not pass';
	}
	return /\b(wp_unique_id|microtime)\s*\(/.test( read( 'render.php' ) ) ? 'its render mints a class per request (wp_unique_id or microtime)' : null;
}

// The attributes with one Solve write applied (a write: { attr, after }; after null removes the attribute).
export function withWrite( attributes, write ) {
	const out = { ...attributes };
	null == write.after ? delete out[ write.attr ] : ( out[ write.attr ] = write.after );
	return out;
}

// One pair's distance to the draft: width, height and left offset from the block (both sides' page positions differ by
// whatever sits above, so only the offset inside the block is compared). pair: { box }, draft: { box }, blockX: each
// side's block left edge.
export function pairDistance( live, draft, blockX ) {
	if ( ! live?.box || ! draft?.box ) {
		return null;
	}
	return Math.abs( live.box.w - draft.box.w ) + Math.abs( live.box.h - draft.box.h ) + Math.abs( ( live.box.x - blockX.live ) - ( draft.box.x - blockX.draft ) );
}

// The verdict on one trial at all widths. before/after: { [width]: { [pair]: { box } } } measured live; draft: the same
// for the draft; blockX: { [width]: { live, draft } }. `keep` when the summed distance falls and no pair moves more than
// tol px further from the draft; `reject` when a pair moves further or the sum rises; `no-box-change` when no box moved
// (a colour, a border colour: boxes cannot judge it, so the rebuild and walk do, as before). The sum is judged against
// max( tol, 0.5 * sqrt( n ) ) over the n pair-widths compared: each pair carries about half a pixel of rounding, and
// that noise grows with the square root of how many are summed. Returns { verdict, keep, delta, sumTol, worse: [ {
// width, pair, by } ], pairs: [ { width, pair, before, after } ] } (each pair's distance to the draft).
export function judgeTrial( { before, after, draft, blockX }, tol = 1 ) {
	let delta = 0;
	const worse = [];
	const pairs = [];
	for ( const w of Object.keys( before ) ) {
		for ( const pair of Object.keys( before[ w ] ) ) {
			const b = pairDistance( before[ w ][ pair ], draft[ w ]?.[ pair ], blockX[ w ] );
			const a = pairDistance( after[ w ]?.[ pair ], draft[ w ]?.[ pair ], blockX[ w ] );
			if ( null == b || null == a ) {
				continue;
			}
			delta += a - b;
			pairs.push( { width: Number( w ), pair, before: +b.toFixed( 1 ), after: +a.toFixed( 1 ) } );
			a - b > tol && worse.push( { width: Number( w ), pair, by: +( a - b ).toFixed( 1 ) } );
		}
	}
	const sumTol = Math.max( tol, 0.5 * Math.sqrt( pairs.length ) );
	const verdict = worse.length || delta > sumTol ? 'reject' : ( delta < -sumTol ? 'keep' : 'no-box-change' );
	return { verdict, keep: 'keep' === verdict, delta: +delta.toFixed( 1 ), sumTol: +sumTol.toFixed( 1 ), worse, pairs };
}

// The last write of each setting on each block in a round: [ { ref, block, attr, after, group, ... } ]. A setting
// several groups wrote in one round carries its whole value in the last write's `after`.
export function candidatesOf( writes, round ) {
	const last = new Map();
	for ( const w of writes.filter( ( x ) => x.round === round ) ) {
		last.set( `${ w.ref }|${ w.attr }`, w );
	}
	return [ ...last.values() ];
}

// Applies one round's trial verdicts to Solve's tree (R6 step 3). Each rejected setting goes back to its value in
// `start` (the tree before the round's first write), or is removed where start lacks it; its writes leave the round;
// every group that wrote it is blocked, and gapped, with the trial's reason. Every other verdict (keep, no-box-change,
// needs-rebuild, no-css, error) leaves the write to the rebuild and the guard. Throws, before changing anything, when
// any trial left the live page changed (`restored: false`). Mutates tree, gaps and blocked. Returns { writes, gaps,
// rejected }.
export function applyVerdicts( { tree, start, writes, gaps, blocked, results } ) {
	// A trial that could not give the live page back exactly left every later trial measuring a changed page.
	const dirty = results.filter( ( r ) => false === r.restored );
	if ( dirty.length ) {
		throw new Error( `the trial could not restore the live page after ${ dirty.map( ( r ) => `${ r.ref } ${ r.attr }` ).join( ', ' ) }: no verdict of this round is trusted` );
	}
	const rejects = new Map( results.filter( ( r ) => 'reject' === r.verdict ).map( ( r ) => [ `${ r.ref }|${ r.attr }`, r ] ) );
	const rejected = writes.filter( ( w ) => rejects.has( `${ w.ref }|${ w.attr }` ) );
	for ( const r of rejects.values() ) {
		const node = nodeByRef( tree, r.ref );
		const was = nodeByRef( start, r.ref )?.attributes || {};
		if ( ! node ) {
			continue;
		}
		node.attributes = node.attributes || {};
		Object.hasOwn( was, r.attr ) ? ( node.attributes[ r.attr ] = structuredClone( was[ r.attr ] ) ) : delete node.attributes[ r.attr ];
	}
	for ( const w of rejected ) {
		const r = rejects.get( `${ w.ref }|${ w.attr }` );
		const worse = ( r.worse || [] ).map( ( x ) => `${ x.pair }@${ x.width } +${ x.by }px` ).join( ', ' );
		const entry = { gap: 'trial-reject', detail: `tried before writing, ${ w.block } ${ w.attr } moves the page away from the draft (summed ${ r.delta ?? '?' }px${ worse ? `; further: ${ worse }` : '' })` };
		blocked.set( w.group, entry );
		gaps[ w.group ] = entry;
	}
	return { writes: writes.filter( ( w ) => ! rejected.includes( w ) ), gaps, rejected };
}

// The saved attributes of the block whose className carries ref, from a post's raw content: { name, attributes } or
// null. The uid is a hash of exactly these (the editor normalises a tree's attributes on save), so a trial starts from
// them, never from the tree. Block comments are scanned with balanced braces, strings honoured.
export function savedBlock( raw, ref ) {
	const open = /<!--\s+wp:([a-z0-9-]+(?:\/[a-z0-9-]+)?)\s+/g;
	for ( let m = open.exec( raw ); m; m = open.exec( raw ) ) {
		let i = open.lastIndex;
		if ( '{' !== raw[ i ] ) {
			continue;
		}
		const start = i;
		let depth = 0;
		let inStr = false;
		for ( ; i < raw.length; i++ ) {
			const ch = raw[ i ];
			if ( inStr ) {
				'\\' === ch ? i++ : '"' === ch && ( inStr = false );
			} else if ( '"' === ch ) {
				inStr = true;
			} else if ( '{' === ch ) {
				depth++;
			} else if ( '}' === ch && 0 === --depth ) {
				break;
			}
		}
		let attributes;
		try {
			attributes = JSON.parse( raw.slice( start, i + 1 ) );
		} catch {
			continue;
		}
		if ( String( attributes.className || '' ).split( /\s+/ ).includes( ref ) ) {
			return { name: m[ 1 ].includes( '/' ) ? m[ 1 ] : `core/${ m[ 1 ] }`, attributes };
		}
	}
	return null;
}
