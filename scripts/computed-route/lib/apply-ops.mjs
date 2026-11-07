// Applier operations: an op is { surface, postId, ref, block, family, writes: [ { attr, value, merge } | { attr, unset: true } ],
// why, checks: [ { width, prop, want } ] }. Ops fold onto a copy of the block's saved attributes, so two ops on one attribute
// both land. A patch writes each changed attribute whole, because patch-block-attrs.php replaces a top-level attribute.
import { setAttr } from './tree.mjs';

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

export function foldOps( ops, blocks ) {
	const posts = new Map();
	for ( const op of ops ) {
		const saved = blocks[ op.postId ]?.blocks?.[ op.ref ]?.attrs ?? {};
		const post = posts.get( op.postId ) ?? new Map();
		posts.set( op.postId, post );
		const entry = post.get( op.ref ) ?? { block: op.block, node: { attributes: structuredClone( saved ) }, saved };
		post.set( op.ref, entry );
		for ( const w of op.writes ) {
			if ( w.unset ) {
				delete entry.node.attributes[ w.attr ];
			} else {
				setAttr( entry.node, w );
			}
		}
	}
	return posts;
}

// Whether an op changes the post: an insert always does; any other op does when its folded attributes differ from the saved ones.
export const changesPost = ( op, blocks ) => !! op.insert || patchesOf( foldOps( [ op ], blocks ) ).size > 0;

// The inserts of a run as patch-block-attrs.php operations, per post, in the order the ops were decided (the writer places several
// inserts at one anchor in that order, which keeps the draft's child order).
export function insertsOf( ops ) {
	const out = new Map();
	for ( const op of ops.filter( ( o ) => o.insert ) ) {
		out.set( op.postId, [ ...( out.get( op.postId ) || [] ), { match: op.anchor.match, insert: op.insert, position: op.anchor.position } ] );
	}
	return out;
}

// Every patch of a run per post: the attribute patches of the folded ops, then the inserts.
export function patchesFor( ops, blocks ) {
	const out = patchesOf( foldOps( ops, blocks ) );
	for ( const [ postId, list ] of insertsOf( ops ) ) {
		out.set( postId, [ ...( out.get( postId ) || [] ), ...list ] );
	}
	return out;
}

// One patch-block-attrs.php operation per changed block.
export function patchesOf( posts ) {
	const out = new Map();
	for ( const [ postId, refs ] of posts ) {
		const list = [];
		for ( const [ ref, { block, node, saved } ] of refs ) {
			const set = {};
			const unset = [];
			for ( const attr of new Set( [ ...Object.keys( saved ), ...Object.keys( node.attributes ) ] ) ) {
				if ( ! ( attr in node.attributes ) ) {
					unset.push( attr );
				} else if ( ! same( saved[ attr ], node.attributes[ attr ] ) ) {
					set[ attr ] = node.attributes[ attr ];
				}
			}
			const op = { match: ref, block };
			if ( Object.keys( set ).length ) {
				op.set = set;
			}
			if ( unset.length ) {
				op.unset = unset;
			}
			if ( op.set || op.unset ) {
				list.push( op );
			}
		}
		if ( list.length ) {
			out.set( postId, list );
		}
	}
	return out;
}

// The patch that takes one failed op back out of a block. Each attribute it wrote returns to what the block's kept ops leave
// there, so an op sharing the attribute (several families merge into sgsMotion) keeps its work; with none, to the saved value.
export function restoreOf( op, blocks, kept = [] ) {
	// An inserted block goes back by being removed: its className is its ref.
	if ( op.insert ) {
		return { match: op.ref, block: op.insert.block, remove: true };
	}
	const saved = blocks[ op.postId ]?.blocks?.[ op.ref ]?.attrs ?? {};
	const others = kept.filter( ( o ) => o !== op && o.postId === op.postId && o.ref === op.ref );
	const after = foldOps( others, blocks ).get( op.postId )?.get( op.ref )?.node.attributes ?? saved;
	const set = {};
	const unset = [];
	for ( const { attr } of op.writes ) {
		if ( attr in after ) {
			set[ attr ] = after[ attr ];
		} else {
			unset.push( attr );
		}
	}
	return { match: op.ref, block: op.block, ...( Object.keys( set ).length ? { set } : {} ), ...( unset.length ? { unset } : {} ) };
}

// A re-read value against what the op wanted: exact after whitespace, or a pixel length within half a pixel.
export function matches( got, want ) {
	const norm = ( v ) => String( v ?? '' ).replace( /\s+/g, ' ' ).trim();
	if ( norm( got ) === norm( want ) ) {
		return true;
	}
	const a = parseFloat( got );
	const b = parseFloat( want );
	return Number.isFinite( a ) && Number.isFinite( b ) && /px$/.test( norm( got ) ) && Math.abs( a - b ) <= 0.5;
}
