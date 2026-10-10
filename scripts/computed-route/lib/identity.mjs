// Exact draft identity for pairing (Spec 47 route-accuracy R4). A block's draft element is named by the Claude Design
// runtime's own stamp (a `tpl` finder, scripts/parity/lib/collect.mjs::resolveFinder), recorded per cr-ref in
// `<surface>.origin.json`. The word matcher (pairs.mjs) stays as an independent cross-check: when the element it chose is
// neither the identity element nor a same-box wrapper of it, the block is mispaired, its rows are flagged by the walker
// and Solve never writes through them.
//
// An origin for a tree Fill did not build comes from the skeleton writer's fresh draft links, aligned to the committed
// tree by structure (block names, level by level), never converted from word pairs (that would check the matcher
// against itself).
import { refOf } from './tree.mjs';

// Longest common subsequence of two name lists: [ [ i, j ] ] in order.
export function alignByName( a, b ) {
	const n = a.length;
	const m = b.length;
	const L = Array.from( { length: n + 1 }, () => new Array( m + 1 ).fill( 0 ) );
	for ( let i = n - 1; i >= 0; i-- ) {
		for ( let j = m - 1; j >= 0; j-- ) {
			L[ i ][ j ] = a[ i ] === b[ j ] ? L[ i + 1 ][ j + 1 ] + 1 : Math.max( L[ i + 1 ][ j ], L[ i ][ j + 1 ] );
		}
	}
	const out = [];
	for ( let i = 0, j = 0; i < n && j < m; ) {
		if ( a[ i ] === b[ j ] ) {
			out.push( [ i, j ] );
			i++;
			j++;
		} else if ( L[ i + 1 ][ j ] >= L[ i ][ j + 1 ] ) {
			i++;
		} else {
			j++;
		}
	}
	return out;
}

// The origin of a committed tree from a skeleton: { origin: { [cr-ref]: { tpl, fingerprint } }, unaligned: [ { ref,
// block, why } ] }. Siblings align by block name (alignByName); an aligned node's children align in turn. A tree node
// with no aligned skeleton node, or whose skeleton node names no tpl finder, is listed with why.
export function originFromSkeleton( skeleton, tree ) {
	const origin = {};
	const unaligned = [];
	const miss = ( list, why ) => {
		for ( const t of list ) {
			const ref = refOf( t );
			ref && unaligned.push( { ref, block: t.name, why } );
			miss( t.innerBlocks || [], 'its parent has no skeleton node' );
		}
	};
	const go = ( sk, tr ) => {
		const pairs = alignByName( sk.map( ( s ) => s.name ), tr.map( ( t ) => t.name ) );
		const matched = new Set( pairs.map( ( [ , j ] ) => j ) );
		miss( tr.filter( ( _, j ) => ! matched.has( j ) ), 'no skeleton node of the same block at this level' );
		for ( const [ i, j ] of pairs ) {
			const s = sk[ i ];
			const t = tr[ j ];
			const ref = refOf( t );
			if ( ref && s.draftRef?.tpl ) {
				origin[ ref ] = { tpl: s.draftRef.tpl, fingerprint: s.draftFingerprint || null };
			} else if ( ref ) {
				unaligned.push( { ref, block: t.name, why: 'its skeleton node names no tpl finder' } );
			}
			go( s.innerBlocks || [], t.innerBlocks || [] );
		}
	};
	go( skeleton, tree );
	return { origin, unaligned };
}

// Whether the word matcher's element agrees with the identity element. relation: 'same', 'word-contains' (the word
// element is an ancestor of the identity element), 'id-contains' or 'apart'; boxes { w, h }. A wrapper agrees only when
// it has the identity element's box (within tol px): a wrapper around more than the element measures something else.
export function identityAgrees( { relation, idBox, wordBox }, tol = 2 ) {
	if ( 'same' === relation ) {
		return true;
	}
	if ( 'apart' === relation || ! idBox || ! wordBox ) {
		return false;
	}
	return Math.abs( idBox.w - wordBox.w ) <= tol && Math.abs( idBox.h - wordBox.h ) <= tol;
}

// The why of a disagreement, for qa/pairs/<surface>.json `mispaired` and the walker's row flag.
export const mispairWhy = ( { tpl, relation, idBox, wordBox, idTag, wordTag } ) => `identity ${ tpl } is <${ idTag || '?' }> ${ idBox ? `${ Math.round( idBox.w ) }x${ Math.round( idBox.h ) }` : 'unresolved' }; the words chose <${ wordTag || '?' }> ${ wordBox ? `${ Math.round( wordBox.w ) }x${ Math.round( wordBox.h ) }` : 'unresolved' } (${ relation })`;

// In-page: for each { ref, tpl, word } (word: a walker finder or null), the identity element and the word element's
// relation and boxes. resolveSrc: collect.mjs::resolveFinder's source. Self-contained.
export function relateInPage( [ resolveSrc, items ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc })` )();
	const box = ( e ) => {
		const r = e.getBoundingClientRect();
		return { w: r.width, h: r.height };
	};
	return items.map( ( it ) => {
		const id = resolve( { tpl: it.tpl } );
		const word = it.word ? resolve( it.word ) : null;
		const relation = ! id || ! word ? 'apart' : ( id === word ? 'same' : ( word.contains( id ) ? 'word-contains' : ( id.contains( word ) ? 'id-contains' : 'apart' ) ) );
		return { ref: it.ref, tpl: it.tpl, relation, idBox: id ? box( id ) : null, wordBox: word ? box( word ) : null, idTag: id?.tagName.toLowerCase() || null, wordTag: word?.tagName.toLowerCase() || null, unresolved: ! id };
	} );
}
