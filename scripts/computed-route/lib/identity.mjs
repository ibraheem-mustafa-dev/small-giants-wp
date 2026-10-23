// Exact draft identity for pairing (Spec 48 route-accuracy R4). A block's draft element is named by the Claude Design
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

// Whether a block's draft element can hold a child block's, read from their skeleton fingerprints: the child's stamped
// ancestors (parentTags, root down) must run through the parent's ancestors and then the parent's own tag. False only
// when the fingerprints prove the child sits outside the parent (a draft <header> holding the main bar while the top
// bar sits beside it, which the live header holds both of); a fingerprint without parentTags proves nothing.
export function fingerprintHolds( parent, child ) {
	const above = parent?.parentTags;
	const own = child?.parentTags;
	if ( ! Array.isArray( above ) || ! Array.isArray( own ) || ! parent.tag ) {
		return true;
	}
	const chain = [ ...above, parent.tag ];
	return own.length >= chain.length && chain.every( ( t, i ) => t === own[ i ] );
}

// The children of a skeleton node whose draft element the node's own provably does not hold (fingerprintHolds):
// [ { name, tag } ]. A node with any measures only part of what its block holds, so it is never a pair or an identity.
export const childrenOutside = ( node ) => ( node?.innerBlocks || [] ).filter( ( c ) => c.draftFingerprint && ! fingerprintHolds( node.draftFingerprint, c.draftFingerprint ) ).map( ( c ) => ( { name: c.name, tag: c.draftFingerprint.tag } ) );

// FR-48-10 item 1: the draft element a list block stands for. key: the node's identity key; byKey: the inventory's
// records by key (lib/skeleton-inventory.mjs: key, parentKey, tag, membership); claimed: every other node's identity key.
// A list block whose identity is one item of a run (a copy of an sc-for loop body, or one of several same-tag siblings)
// that no other node claims an item of stands for the whole run: its identity is the run's parent element when that
// parent holds the run only and no other node claims it. Otherwise the list has no draft element of its own and the
// node gets none, never its first item. Returns null (the key stands), { key } or { key: null, why }.
export function listIdentity( key, byKey, claimed = new Set() ) {
	const at = byKey[ key ];
	const loopOf = ( r ) => ( r?.membership || [] ).filter( ( m ) => 'sc-for' === m.kind ).map( ( m ) => m.tpl ).pop() ?? null;
	const loop = loopOf( at );
	let item = at;
	while ( loop && item && loopOf( byKey[ item.parentKey ] ) === loop ) {
		item = byKey[ item.parentKey ];
	}
	const parent = byKey[ item?.parentKey ];
	if ( ! parent ) {
		return null;
	}
	const kids = Object.values( byKey ).filter( ( r ) => r.parentKey === parent.key );
	const inRun = ( r ) => ( loop ? loopOf( r ) === loop : r.tag === item.tag && ! loopOf( r ) );
	const run = kids.filter( inRun );
	if ( run.length < 2 || run.some( ( r ) => r.key !== item.key && claimed.has( r.key ) ) ) {
		return null;
	}
	if ( claimed.has( parent.key ) ) {
		return { key: null, why: `its items' parent ${ parent.key } is another block's identity: the list has no draft element of its own` };
	}
	if ( kids.some( ( r ) => ! inRun( r ) ) ) {
		return { key: null, why: `its items' parent ${ parent.key } also holds other content: the list has no draft element of its own` };
	}
	return { key: parent.key };
}

// FR-48-10 item 2: whether pairing adds an identity pair for a block no generated or hand pair measures. A word-based
// refusal (the width re-check found no word partner at some width) never removes it: word pairing only cross-checks,
// and the refusal is kept beside the pair (`crossCheck`). Returns { add, crossCheck }.
export function identityAdd( { add = true, hand = false, covered = false, wordRefusal = null } ) {
	return { add: !! add && ! hand && ! covered, crossCheck: wordRefusal || null };
}

// The origin of a committed tree from a skeleton: { origin: { [cr-ref]: { tpl, fingerprint } }, unaligned: [ { ref,
// block, why } ] }. Siblings align by block name (alignByName); an aligned node's children align in turn. A tree node
// with no aligned skeleton node, or whose skeleton node names no tpl finder, is listed with why. So is a node whose
// draft element provably does not hold a child's (childrenOutside). With `inventory` (the surface's skeleton inventory)
// and `listBlocks` (the blocks that render a list from one array attribute), a list block's identity is its run's
// parent element or none (listIdentity).
export function originFromSkeleton( skeleton, tree, { inventory = null, listBlocks = new Set() } = {} ) {
	const origin = {};
	const unaligned = [];
	const byKey = Object.fromEntries( ( inventory?.elements || [] ).map( ( e ) => [ e.key, e ] ) );
	const claimed = new Set();
	const claim = ( list ) => list.forEach( ( s ) => {
		s.draftRef?.tpl && claimed.add( s.draftRef.tpl );
		claim( s.innerBlocks || [] );
	} );
	claim( skeleton );
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
			const outside = ref && s.draftRef?.tpl ? childrenOutside( s ) : [];
			const list = ref && s.draftRef?.tpl && listBlocks.has( s.name ) ? listIdentity( s.draftRef.tpl, byKey, new Set( [ ...claimed ].filter( ( k ) => k !== s.draftRef.tpl ) ) ) : null;
			if ( outside.length ) {
				unaligned.push( { ref, block: t.name, why: `its draft element <${ s.draftFingerprint.tag }> does not hold its child ${ outside.map( ( o ) => `${ o.name } <${ o.tag }>` ).join( ', ' ) }` } );
			} else if ( list && ! list.key ) {
				unaligned.push( { ref, block: t.name, why: list.why } );
			} else if ( ref && s.draftRef?.tpl ) {
				origin[ ref ] = list ? { tpl: list.key, fingerprint: null } : { tpl: s.draftRef.tpl, fingerprint: s.draftFingerprint || null };
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
	if ( 'apart' === relation || ! idBox || ! wordBox || ! ( idBox.w > 0 && idBox.h > 0 ) ) {
		return false;
	}
	return Math.abs( idBox.w - wordBox.w ) <= tol && Math.abs( idBox.h - wordBox.h ) <= tol;
}

// The why of a disagreement, for qa/pairs/<surface>.json `mispaired` and the walker's row flag.
export const mispairWhy = ( { tpl, relation, idBox, wordBox, idTag, wordTag } ) => `identity ${ tpl } is <${ idTag || '?' }> ${ idBox ? `${ Math.round( idBox.w ) }x${ Math.round( idBox.h ) }` : 'unresolved' }; the words chose <${ wordTag || '?' }> ${ wordBox ? `${ Math.round( wordBox.w ) }x${ Math.round( wordBox.h ) }` : 'unresolved' } (${ relation })`;

// A short stable hash of a string (djb2 xor), only ever a hash: a value never leaves the record it came from.
export function hashText( text ) {
	let h = 5381;
	for ( const ch of String( text ?? '' ) ) {
		h = ( ( h * 33 ) ^ ch.charCodeAt( 0 ) ) >>> 0;
	}
	return h.toString( 16 );
}

// The line (1-based) of the element stamped `data-dc-tpl="<n>"` in an annotated template's text, or null when it is not
// found. Self-contained: lib/skeleton-inventory.mjs::collect serialises it into the page.
export function tplLineOf( text, n ) {
	const at = new RegExp( `data-dc-tpl=["']?${ n }(?![0-9])` ).exec( String( text ?? '' ) );
	return at ? String( text ).slice( 0, at.index ).split( '\n' ).length : null;
}

// The lines of every stamped element of an annotated template, read in one pass: n (as text) -> 1-based line of its first
// `data-dc-tpl="<n>"`. The same answer as tplLineOf for each element, without scanning the text once per element.
export function tplLineIndex( text ) {
	const html = String( text ?? '' );
	const lines = new Map();
	let line = 1;
	let from = 0;
	for ( const m of html.matchAll( /data-dc-tpl=["']?([0-9]+)/g ) ) {
		for ( let at = html.indexOf( '\n', from ); -1 !== at && at < m.index; at = html.indexOf( '\n', from ) ) {
			line++;
			from = at + 1;
		}
		lines.has( m[ 1 ] ) || lines.set( m[ 1 ], line );
	}
	return ( n ) => lines.get( String( n ) ) ?? null;
}

// The fingerprint of one inventory record (lib/skeleton-inventory.mjs): its tag, class, a hash of the style attribute,
// the tags of its stamped ancestors from the root down, a hash of its own words and, where the record has one, its line
// in the annotated template. byKey: the records by instance key (parentKey walks the ancestors).
export function fingerprintOf( e, byKey = {} ) {
	const parentTags = [];
	for ( let p = byKey[ e.parentKey ], guard = 0; p && guard < 200; p = byKey[ p.parentKey ], guard++ ) {
		parentTags.unshift( p.tag );
	}
	return { tag: e.tag, cls: e.attrs?.class || '', styleHash: hashText( e.attrs?.style ), parentTags, textHash: hashText( e.words ), ...( null == e.srcLine ? {} : { line: e.srcLine } ) };
}

// The instance key to fingerprint of every element of a saved inventory.
export function fingerprintsOf( inventory ) {
	const byKey = Object.fromEntries( ( inventory.elements || [] ).map( ( e ) => [ e.key, e ] ) );
	return Object.fromEntries( ( inventory.elements || [] ).map( ( e ) => [ e.key, fingerprintOf( e, byKey ) ] ) );
}

const FIELDS = [ 'tag', 'cls', 'styleHash', 'parentTags', 'textHash', 'line' ];
const same = ( a, b ) => ( Array.isArray( a ) ? Array.isArray( b ) && a.length === b.length && a.every( ( x, i ) => x === b[ i ] ) : a === b );

// The fields on which two fingerprints disagree: every field both sides carry is compared (a field one side lacks is
// skipped, so a record written before the field existed still compares by what it has). `ignore` names fields left out.
export const fingerprintDiff = ( a, b, ignore = [] ) => FIELDS.filter( ( f ) => ! ignore.includes( f ) && null != a?.[ f ] && null != b?.[ f ] && ! same( a[ f ], b[ f ] ) );

// Whether the identity element still is the element the skeleton writer stamped. `other` is a tag name (the live page's
// element: only the tag is known there) or a fingerprint (every field both carry must agree). No fingerprint, or no tag
// on it, compares nothing. A tpl number that now resolves to another element points at a changed draft.
export function fingerprintAgrees( fingerprint, other, { ignore = [] } = {} ) {
	if ( ! fingerprint || 'object' !== typeof fingerprint ) {
		return true;
	}
	if ( other && 'object' === typeof other ) {
		return 0 === fingerprintDiff( fingerprint, other, ignore ).length;
	}
	return ! fingerprint.tag || fingerprint.tag === other;
}

// Maps each previous record's key to the key of the next export's record it still is. Records are { key, fingerprint }.
// Pass 1 pairs records whose identity fields (tag, class, style, ancestors, own words) are all equal, in document order
// within each group of equal signatures when the groups are the same size. Pass 2 pairs what is left in sequence within
// the same tag and ancestor chain, when the fingerprints agree on every carried field except the source line (a
// re-export moves lines). A previous record that pairs with nothing, or whose paired record disagrees, is refused with
// why. Returns { map: { [previousKey]: nextKey }, refused: [ { key, why } ] }.
export function realign( prevRecords, nextRecords ) {
	const sig = ( r ) => JSON.stringify( [ r.fingerprint?.tag, r.fingerprint?.cls, r.fingerprint?.styleHash, r.fingerprint?.parentTags, r.fingerprint?.textHash ] );
	const chain = ( r ) => JSON.stringify( [ r.fingerprint?.tag, r.fingerprint?.parentTags ] );
	const group = ( list, by ) => list.reduce( ( m, r ) => m.set( by( r ), [ ...( m.get( by( r ) ) || [] ), r ] ), new Map() );
	const map = {};
	const taken = new Set();
	const note = ( p, n ) => {
		map[ p.key ] = n.key;
		taken.add( n.key );
	};
	const nexts = group( nextRecords, sig );
	for ( const [ k, ps ] of group( prevRecords, sig ) ) {
		const ns = nexts.get( k ) || [];
		if ( ns.length === ps.length ) {
			ps.forEach( ( p, i ) => note( p, ns[ i ] ) );
		}
	}
	const left = nextRecords.filter( ( n ) => ! taken.has( n.key ) );
	const refused = [];
	for ( const ps of group( prevRecords.filter( ( p ) => ! ( p.key in map ) ), chain ).values() ) {
		// A previous record with no ancestor chain (written before the field existed) pairs by tag alone.
		const room = ps[ 0 ].fingerprint?.parentTags ? left.filter( ( n ) => chain( n ) === chain( ps[ 0 ] ) ) : left.filter( ( n ) => n.fingerprint?.tag === ps[ 0 ].fingerprint?.tag );
		const open = room.filter( ( n ) => ! taken.has( n.key ) );
		ps.forEach( ( p, i ) => {
			const n = open[ i ];
			const bad = n ? fingerprintDiff( p.fingerprint, n.fingerprint, [ 'line' ] ) : [];
			if ( ! n ) {
				refused.push( { key: p.key, why: 'no element of the same tag and ancestors in the new export' } );
			} else if ( bad.length ) {
				refused.push( { key: p.key, why: `the element at ${ n.key } differs in ${ bad.join( ', ' ) }` } );
			} else {
				note( p, n );
			}
		} );
	}
	return { map, refused };
}

// The live block refs with no origin entry: blocks identity pairing cannot check (their skeleton node did not align).
export const unalignedRefs = ( refs, origin ) => [ ...refs ].filter( ( r ) => ! Object.hasOwn( origin, r ) ).sort();

// Hand pairs measuring an element inside a block (not its root) are checked by containment: their draft element must be
// the block's identity element or inside it. handInner: [ { name, ref, draft } ]; rel: relateInPage's output, whose
// `inner` holds { name, resolved, inside } per hand pair of that ref. Returns { mispaired: [ { ref, why } ],
// uncheckedHand: [ { name, ref, why } ] }: a pair on a block with no origin entry, or whose draft finds nothing, is
// unchecked, never agreeing.
export function innerVerdicts( { handInner, origin, rel } ) {
	const mispaired = [];
	const uncheckedHand = [];
	for ( const h of handInner ) {
		const r = rel.find( ( x ) => x.ref === h.ref );
		const v = r?.inner?.find( ( i ) => i.name === h.name );
		if ( ! Object.hasOwn( origin, h.ref ) ) {
			uncheckedHand.push( { name: h.name, ref: h.ref, why: 'its block has no origin entry' } );
		} else if ( ! v || ! v.resolved || r.unresolved ) {
			uncheckedHand.push( { name: h.name, ref: h.ref, why: r?.unresolved ? 'the identity element is not on the draft' : 'its draft finder finds nothing' } );
		} else if ( ! v.inside ) {
			mispaired.find( ( m ) => m.ref === h.ref ) || mispaired.push( { ref: h.ref, why: `hand pair ${ h.name } measures a draft element outside identity ${ r.tpl }` } );
		}
	}
	return { mispaired, uncheckedHand };
}

// The identity check per pairing state: each state's own kept pairs (a panel state's carry its `scope`, the first
// state's none), with blocks added only in the first state (a later state checks, it never duplicates a pair).
// runs: pairs.mjs's [ { state, scope } ]. Returns [ { state, scope, kept, add } ]; kept holds the same objects.
export function identityStates( runs, kept ) {
	return runs.map( ( r, i ) => ( { state: r.state, scope: r.scope || null, kept: kept.filter( ( k ) => ( k.scope || null ) === ( r.scope || null ) ), add: 0 === i } ) );
}

// In-page: for each { ref, tpl, word, inner? } (word: a walker finder or null; inner: [ { name, draft } ] hand pairs
// measuring inside the block), the identity element and the word element's relation and boxes, and per inner pair
// whether its draft element is the identity element or inside it. resolveSrc: collect.mjs::resolveFinder's source.
// Self-contained.
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
		const inner = ( it.inner || [] ).map( ( h ) => {
			let e = null;
			try {
				e = resolve( h.draft );
			} catch {
				e = null;
			}
			return { name: h.name, resolved: !! e, inside: !! ( id && e && id.contains( e ) ) };
		} );
		return { ref: it.ref, tpl: it.tpl, relation, idBox: id ? box( id ) : null, wordBox: word ? box( word ) : null, idTag: id?.tagName.toLowerCase() || null, wordTag: word?.tagName.toLowerCase() || null, unresolved: ! id, inner };
	} );
}
