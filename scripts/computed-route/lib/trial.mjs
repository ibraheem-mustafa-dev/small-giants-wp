// Try before write (Spec 47 route-accuracy R6): a Solve write is tried in the open live page before it is saved. The
// block is rendered twice through core's /wp/v2/block-renderer (its current attributes, then with the write); the
// current render must reproduce the live element's style uid and the CSS the live page holds for it (the self-check),
// else the block needs a rebuild. The CSS the write adds or removes is mapped onto the live uid, applied, the pairs in
// and after the block are measured at every width, and the change is undone. A write is kept only when the page moves
// toward the draft and no pair moves away. The pure parts are here; the page parts are lib/trial-page.mjs.
import fs from 'fs';
import path from 'path';

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
// for the draft; blockX: { [width]: { live, draft } }. Kept only when the summed distance falls and no pair moves more
// than tol px further from the draft. Returns { keep, delta, worse: [ { width, pair, by } ] }.
export function judgeTrial( { before, after, draft, blockX }, tol = 1 ) {
	let delta = 0;
	const worse = [];
	for ( const w of Object.keys( before ) ) {
		for ( const pair of Object.keys( before[ w ] ) ) {
			const b = pairDistance( before[ w ][ pair ], draft[ w ]?.[ pair ], blockX[ w ] );
			const a = pairDistance( after[ w ]?.[ pair ], draft[ w ]?.[ pair ], blockX[ w ] );
			if ( null == b || null == a ) {
				continue;
			}
			delta += a - b;
			a - b > tol && worse.push( { width: Number( w ), pair, by: +( a - b ).toFixed( 1 ) } );
		}
	}
	return { keep: delta < -tol && ! worse.length, delta: +delta.toFixed( 1 ), worse };
}
