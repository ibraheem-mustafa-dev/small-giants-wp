// The Fill skeleton (FR-47-4): a normal block tree whose nodes also carry `draftRef` (the walker finder of the draft
// element the block copies) and `draftSlots` ({ "<element path>": finder } for elements inside it).
//
// A finder is the walker's own vocabulary (scripts/parity/lib/collect.mjs::resolveFinder): a CSS selector string,
// { text, tag?, within?, nth?, flags? } (the smallest visible element whose rendered text matches), { textRun: { within,
// direct?, match? } }, { group: { paths } }, or { js: '(root) => element', within? }. `draftRef` is resolved on the
// whole draft page, exactly as a walker pair's finder is. A slot finder is resolved inside its node's `draftRef`
// element (the slot key is the element's path from the block root, the format of calibration's `elements` keys), so
// it needs no knowledge of the page around it.
import { handoverProblems } from './fill-handover.mjs';

const isStr = ( v ) => 'string' === typeof v && '' !== v.trim();

// The attribute Fill puts on a node's draft element while its slots resolve (scopeSelector names it).
export const SCOPE_ATTR = 'data-fill-scope';
export const scopeSelector = ( index ) => `[${ SCOPE_ATTR }="${ index }"]`;

const KEYS = { text: [ 'text', 'tag', 'within', 'nth', 'flags' ], textRun: [ 'textRun' ], group: [ 'group' ], js: [ 'js', 'within' ] };

// A reason a value is not a walker finder, or null when it is one.
export function finderProblem( f ) {
	if ( isStr( f ) ) {
		return null;
	}
	if ( ! f || 'object' !== typeof f || Array.isArray( f ) ) {
		return 'a finder is a selector string or a walker finder object';
	}
	const kind = [ 'text', 'textRun', 'group', 'js' ].find( ( k ) => k in f );
	if ( ! kind ) {
		return `finder object has none of ${ Object.keys( KEYS ).join( ', ' ) }`;
	}
	const extra = Object.keys( f ).filter( ( k ) => ! KEYS[ kind ].includes( k ) );
	if ( extra.length ) {
		return `finder ${ kind } carries ${ extra.join( ', ' ) }, which the walker does not read`;
	}
	if ( 'text' === kind && ! isStr( f.text ) ) {
		return 'finder text is a regex source string';
	}
	if ( 'text' === kind && ( ( undefined !== f.nth && ! Number.isInteger( f.nth ) ) || ( undefined !== f.tag && ! isStr( f.tag ) ) || ( undefined !== f.within && ! isStr( f.within ) ) ) ) {
		return 'finder text takes tag and within as selectors and nth as an integer';
	}
	if ( 'textRun' === kind && ! isStr( f.textRun?.within ) ) {
		return 'finder textRun needs a within selector';
	}
	if ( 'group' === kind && ( ! Array.isArray( f.group?.paths ) || ! f.group.paths.length || ! f.group.paths.every( isStr ) ) ) {
		return 'finder group needs a list of selector paths';
	}
	if ( 'js' === kind && ( ! isStr( f.js ) || ( undefined !== f.within && ! isStr( f.within ) ) ) ) {
		return 'finder js is a function source, with an optional within selector';
	}
	return null;
}

// 'selector' | 'text' | 'textRun' | 'group' | 'js', or null for a value that is not a finder.
export function finderKind( f ) {
	if ( finderProblem( f ) ) {
		return null;
	}
	return 'string' === typeof f ? 'selector' : [ 'text', 'textRun', 'group', 'js' ].find( ( k ) => k in f );
}

const within = ( scope, sel ) => ( sel ? `${ scope } :is(${ sel })` : scope );

// The finder rewritten to resolve inside the element carrying `scope` (a scopeSelector). The input is not changed.
export function scopeFinder( f, scope ) {
	switch ( finderKind( f ) ) {
		case 'selector':
			return within( scope, f );
		case 'text':
			return { ...f, within: within( scope, f.within ) };
		case 'textRun':
			return { textRun: { ...f.textRun, within: within( scope, f.textRun.within ) } };
		case 'group':
			return { group: { ...f.group, paths: f.group.paths.map( ( p ) => within( scope, p ) ) } };
		case 'js':
			return { ...f, within: within( scope, f.within ) };
		default:
			throw new Error( `not a finder: ${ JSON.stringify( f ) }` );
	}
}

// Every node of a skeleton, depth-first (the index addRefs gives each ref), with its parent, its children's indices and
// its measuring targets: the draftRef (slot '') then each draftSlots entry. A target is { id, index, slot, finder,
// scoped }. A node with no draftRef has no targets: Fill reads nothing for it, and its children inherit past it.
export function skeletonNodes( tree ) {
	const nodes = [];
	const go = ( list, parent ) => list.forEach( ( node ) => {
		const index = nodes.length;
		const rec = { index, name: node.name, node, parent, children: [], targets: [] };
		nodes.push( rec );
		if ( null !== parent ) {
			nodes[ parent ].children.push( index );
		}
		if ( undefined !== node.draftRef ) {
			rec.targets.push( { id: `${ index }:`, index, slot: '', finder: node.draftRef, scoped: false } );
			for ( const [ slot, finder ] of Object.entries( node.draftSlots || {} ) ) {
				rec.targets.push( { id: `${ index }:${ slot }`, index, slot, finder, scoped: true } );
			}
		}
		go( node.innerBlocks || [], index );
	} );
	go( tree, null );
	return nodes;
}

// What is wrong with a skeleton's draft keys, as readable lines (empty when sound). The style lint (R-47-10) is
// lint.mjs::lintSkeleton; this checks only what Fill itself reads.
export function skeletonProblems( tree ) {
	const problems = [];
	for ( const n of skeletonNodes( tree ) ) {
		const label = `node ${ n.index } (${ n.name })`;
		const node = n.node;
		if ( undefined !== node.draftRef && finderProblem( node.draftRef ) ) {
			problems.push( `${ label } draftRef: ${ finderProblem( node.draftRef ) }` );
		}
		if ( undefined !== node.draftSlots && ( ! node.draftSlots || 'object' !== typeof node.draftSlots || Array.isArray( node.draftSlots ) ) ) {
			problems.push( `${ label } draftSlots must be an object of slot path to finder` );
			continue;
		}
		if ( node.draftSlots && Object.keys( node.draftSlots ).length && undefined === node.draftRef ) {
			problems.push( `${ label } has draftSlots but no draftRef` );
		}
		for ( const [ slot, finder ] of Object.entries( node.draftSlots || {} ) ) {
			if ( '' === slot ) {
				problems.push( `${ label } draftSlots has an empty slot key (the block root is the draftRef)` );
			} else if ( /::(before|after)$/.test( slot ) ) {
				problems.push( `${ label } slot "${ slot }" names a pseudo layer: a layer is read from its element, name the element` );
			} else if ( finderProblem( finder ) ) {
				problems.push( `${ label } slot "${ slot }": ${ finderProblem( finder ) }` );
			}
		}
		problems.push( ...handoverProblems( node.handover, label ) );
	}
	return problems;
}

const DRAFT_KEYS = [ 'draftRef', 'draftSlots', 'handover' ];

// A copy of the tree without the draft keys: what Fill writes, and what wp-build-page.js receives.
export function cleanTree( tree ) {
	const go = ( list ) => list.map( ( n ) => {
		const out = Object.fromEntries( Object.entries( structuredClone( n ) ).filter( ( [ k ] ) => ! DRAFT_KEYS.includes( k ) ) );
		out.innerBlocks = go( n.innerBlocks || [] );
		return out;
	} );
	return go( tree );
}
