// The clone difference ledger's pairing (tools/clone-ledger.mjs), taken from the route's own records, never guessed: skeleton
// node i (depth-first, lib/fill-skeleton.mjs::skeletonNodes) is the Filled and built node i and prints the class
// cr-ref-<surface>-<i> on the live page; its draftRef is its draft element and each draftSlots entry pairs the element at
// that path from the live block root (parity/lib/ref-trace.mjs::elementPath steps) with a draft element found inside the
// node's own. Draft elements of the inventory no target reads are listed as unpaired, each with its proposal row.
// Pure functions: no browser, no site, no file reads.
import { skeletonNodes, scopeFinder, scopeSelector, BAND_WRAPPER_SLOT } from './fill-skeleton.mjs';

const tplOf = ( f ) => ( f && 'object' === typeof f && 'string' === typeof f.tpl ? f.tpl : null );

// Every measuring target of a surface: [ { id, index, ref, block, slot, parent, top, draftFinder, scope, draftKey, liveRoot,
// liveSlot } ]. `parent` is the index of the nearest ancestor node with targets (null at the top: the surface root, whose
// position the site decides). `scope` is the index whose draft element a slot finder resolves inside (its finder already
// rewritten with scopeFinder). Nodes without a draftRef get a target with draftFinder null: a live element with no draft.
export function ledgerTargets( skeleton, surface ) {
	const nodes = skeletonNodes( skeleton );
	const targets = [];
	const drawn = ( i ) => ( null === i ? null : ( nodes[ i ].targets.length ? i : drawn( nodes[ i ].parent ) ) );
	for ( const rec of nodes ) {
		const ref = `cr-ref-${ surface }-${ rec.index }`;
		const parent = drawn( rec.parent );
		if ( ! rec.targets.length ) {
			targets.push( { id: `${ rec.index }:`, index: rec.index, ref, block: rec.name, slot: '', parent, top: null === parent, draftFinder: null, scope: null, draftKey: null, liveRoot: `.${ ref }`, liveSlot: '' } );
			continue;
		}
		for ( const t of rec.targets ) {
			if ( String( t.slot ).startsWith( BAND_WRAPPER_SLOT ) ) {
				continue;
			}
			const draftFinder = t.scoped ? scopeFinder( t.finder, scopeSelector( rec.index ) ) : t.finder;
			targets.push( { id: t.id, index: rec.index, ref, block: rec.name, slot: t.slot, parent: t.slot ? rec.index : parent, top: ! t.slot && null === parent, draftFinder, scope: t.scoped ? rec.index : null, draftKey: tplOf( t.finder ), liveRoot: `.${ ref }`, liveSlot: t.slot } );
		}
	}
	return targets;
}

// The inventory elements no target names by key: [ { key, element, row, owner } ], `row` the proposal row for it (or null)
// and `owner` the node that absorbed it ({ ref, block, index }) when its row is absorbed into a node's draft element.
export function unpairedDraft( inventory, proposal, targets ) {
	const named = new Set( targets.map( ( t ) => t.draftKey ).filter( Boolean ) );
	const rows = new Map( ( proposal?.rows || [] ).map( ( r ) => [ r.key, r ] ) );
	const byKey = new Map( targets.filter( ( t ) => '' === t.slot && t.draftKey ).map( ( t ) => [ t.draftKey, t ] ) );
	return ( inventory?.elements || [] ).filter( ( e ) => ! named.has( e.key ) ).map( ( e ) => {
		const row = rows.get( e.key ) || null;
		const into = row?.into ? byKey.get( row.into ) : null;
		// The proposal's problems naming this element (a paint pairing it refused), the key not followed by another digit.
		const problems = ( proposal?.problems || [] ).map( ( p ) => ( 'string' === typeof p ? p : JSON.stringify( p ) ) ).filter( ( p ) => p.split( e.key ).slice( 1 ).some( ( rest ) => ! /^\d/.test( rest ) ) );
		return { key: e.key, element: e, row, owner: into ? { ref: into.ref, block: into.block, index: into.index } : null, problems };
	} );
}

// The built tree's attributes per ref: the Filled tree's node attributes (node i is cr-ref-<surface>-<i>), with the apply
// plan's written operations laid over them (the applier writes those settings into the saved post after the build).
// `lastLoad`, when given, is the build's own read-back (wp-build-page.js's diff file): a ref it holds takes its attributes.
export function builtAttributes( filled, surface, applyPlan = null, lastLoad = null ) {
	const out = new Map();
	let i = 0;
	const walk = ( list ) => list.forEach( ( n ) => {
		out.set( `cr-ref-${ surface }-${ i }`, { ...( n.attributes || {} ) } );
		i += 1;
		walk( n.innerBlocks || [] );
	} );
	walk( filled || [] );
	for ( const [ ref, attrs ] of lastLoad || [] ) {
		out.set( ref, attrs );
	}
	for ( const row of applyPlan?.rows || [] ) {
		if ( 'written' === row.status && out.has( row.ref ) ) {
			for ( const w of row.writes || [] ) {
				out.get( row.ref )[ w.attr ] = w.value;
			}
		}
	}
	return out;
}

// The block comments of serialised post content as Map ref -> attributes (the ref read from each block's className).
export function refsOfContent( content, surface ) {
	const out = new Map();
	const re = /<!--\s+wp:([a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)\s+(\{.*?\})\s+\/?-->/g;
	const refRe = new RegExp( `cr-ref-${ surface.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }-(\\d+)(?!\\d)` );
	let m;
	while ( ( m = re.exec( String( content || '' ) ) ) ) {
		let attrs;
		try {
			attrs = JSON.parse( m[ 2 ] );
		} catch {
			continue;
		}
		const hit = refRe.exec( String( attrs.className || '' ) );
		if ( hit ) {
			out.set( `cr-ref-${ surface }-${ hit[ 1 ] }`, attrs );
		}
	}
	return out;
}

// The apply plan's rows per ref.
export function applyIndex( plan ) {
	const by = new Map();
	for ( const r of plan?.rows || [] ) {
		if ( ! by.has( r.ref ) ) {
			by.set( r.ref, [] );
		}
		by.get( r.ref ).push( r );
	}
	return by;
}
