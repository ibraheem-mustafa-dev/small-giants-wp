// The walker config Fill generates (FR-47-4 step 4): one pair per skeleton node that has a draftRef, drawn from the
// node's own ref class, with refPrefix 'cr-ref-' and the divergence ledger, so a walk compares every mapped node on every
// property. The pairs themselves are lib/pairs.mjs::configText's (the same generator Solve's full-coverage walker uses):
// Fill writes the small base config that generator spreads, and the generator writes the pairs.
import { configText } from './pairs.mjs';
import { skeletonPairs, tplSelector } from './origin-pairs.mjs';
import { refOf, REF_PREFIX } from './tree.mjs';
import { openerSource } from './fill-open.mjs';

// The pairs configText takes: { ref, draft } for each node with a draftRef (the finder as the skeleton wrote it, a
// walker finder on the whole draft page), less a node whose draft element does not hold its children's and with each
// width variant's pair scoped to its own words (lib/origin-pairs.mjs::skeletonPairs). tree: the filled tree (refs on
// every node); nodes: skeletonNodes( skeleton ); inventory: the surface's skeleton inventory, which adds a pair for each
// part a block renders whose draft element sits outside the block's (lib/origin-pairs.mjs::outsideSlotPairs).
export function walkerPairs( nodes, tree, inventory = null ) {
	const flat = [];
	const go = ( list ) => list.forEach( ( n ) => {
		flat.push( n );
		go( n.innerBlocks || [] );
	} );
	go( tree );
	return skeletonPairs( nodes, flat.map( ( n ) => refOf( n ) ), { inventory } ).pairs;
}

// The CSS selector of a root's draft element: a selector draftRef as written, a tpl finder's own selector
// (lib/origin-pairs.mjs::tplSelector); null for a finder no selector names (text, js, a tpl copy past the first, a scoped tpl).
const draftSelector = ( f ) => {
	if ( 'string' === typeof f ) {
		return f;
	}
	return f?.within ? null : tplSelector( f?.tpl );
};

// The beside elements (lib/skeleton-inventory.mjs: the root's siblings read with it) a node of the surface is drawn in or
// inside: { used, other } as inventory keys. A strip the skeleton made a row of the surface (a top bar drawn beside the
// <header>) is used; every other sibling (the page's main content, another surface, a fixed layer) is not.
function besideUse( nodes, inventory ) {
	const beside = inventory?.beside || [];
	const byKey = new Map( ( inventory?.elements || [] ).map( ( e ) => [ e.key, e ] ) );
	const top = ( key ) => {
		let k = key;
		while ( byKey.get( k )?.parentKey ) {
			k = byKey.get( k ).parentKey;
		}
		return k;
	};
	const tops = new Set( nodes.flatMap( ( n ) => n.targets.map( ( t ) => t.finder?.tpl ) ).filter( Boolean ).map( top ) );
	return { used: beside.filter( ( b ) => tops.has( b.key ) ).map( ( b ) => b.key ), other: beside.filter( ( b ) => ! tops.has( b.key ) ).map( ( b ) => b.key ) };
}

// The surface's root on each side, the element the walker's automatic text, link and moved-run collection runs inside
// (cfg.auto.root and cfg.linkRoot, both CSS selectors): one root block is its own draft element and its ref class on
// live; several root blocks (a page) are the element holding all of them as children on each side. A root whose
// skeleton also draws rows from elements beside its draft element (inventory.beside) is, on the draft, the element
// holding the root and those strips, less the siblings the surface does not use (`exclude`, draft side). Null when a
// side cannot be named, so the walk keeps the whole page on both sides rather than a root on one.
export function surfaceRoots( nodes, tree, inventory = null ) {
	const roots = nodes.filter( ( n ) => null === n.parent );
	if ( ! roots.length ) {
		return null;
	}
	const { used, other } = besideUse( nodes, inventory );
	const draft = [ ...roots.map( ( r ) => draftSelector( r.node.draftRef ) ), ...used.map( ( k ) => tplSelector( k ) ) ];
	const exclude = used.length ? other.map( ( k ) => tplSelector( k ) ) : [];
	const live = tree.map( ( n ) => ( refOf( n ) ? `.${ refOf( n ) }` : null ) );
	if ( [ ...draft, ...exclude, ...live ].some( ( s ) => ! s ) ) {
		return null;
	}
	const holder = ( sels ) => ( 1 === sels.length ? sels[ 0 ] : sels.map( ( s ) => `:has(> :is(${ s }))` ).join( '' ) );
	return { draft: holder( draft ), live: holder( live ), ...( exclude.length ? { exclude } : {} ) };
}

// The base config: the draft and live pages, the walker states, the divergence ledger (a path relative to the config
// file) and refPrefix. `open` is the regex source of the text a single-page draft's navigation clicks. A local draft
// is served on a fresh port each time, so the draft url may be overridden with SGS_DRAFT_URL. `roots`: surfaceRoots' { draft,
// live, exclude? }, written as auto.root, auto.exclude and linkRoot. `opener` (lib/fill-open.mjs::stateOpener, with a
// state) makes the draft side open the same draft state Fill read, in place of the click-text `open`; the draft url
// already carries the opener's route.
export function baseConfigText( { surface, draftUrl, liveUrl, open = null, opener = null, divergences = null, state = 'opening', roots = null } ) {
	return [
		`// Generated by scripts/computed-route/fill.mjs for the ${ surface } surface: the draft and live pages, the walker state, and the`,
		'// divergence ledger. The pairs come from the skeleton\'s draftRef finders (lib/pairs.mjs::configText), in the file beside this one.',
		'// A draft served from a local folder listens on a new port per run: set SGS_DRAFT_URL to the address it is on now.',
		'export default {',
		`\tname: ${ JSON.stringify( surface ) },`,
		'\twidths: [ 375, 768, 1440, 1920 ],',
		`\trefPrefix: ${ JSON.stringify( REF_PREFIX ) },`,
		...( divergences ? [ `\tdivergences: ${ JSON.stringify( divergences ) },` ] : [] ),
		...( roots ? [
			'\t// The surface\'s own element on each side: the automatic text and moved-run collection and the links run inside it.',
			`\tauto: { root: ${ JSON.stringify( { draft: roots.draft, live: roots.live } ) }${ roots.exclude ? `, exclude: ${ JSON.stringify( { draft: roots.exclude } ) }` : '' } },`,
			`\tlinkRoot: ${ JSON.stringify( { draft: roots.draft, live: roots.live } ) },`,
		] : [] ),
		`\tdraft: { url: process.env.SGS_DRAFT_URL || ${ JSON.stringify( draftUrl ) }${ opener?.state ? `, open: ${ openerSource( opener ) }` : open ? `, open: ( h ) => h.clickText( ${ JSON.stringify( open ) }, { wait: 900 } )` : '' } },`,
		`\tlive: { url: ${ JSON.stringify( liveUrl ) } },`,
		`\tstates: [ { name: ${ JSON.stringify( state ) }, fullPage: true } ],`,
		'\tpairs: [],',
		'};',
		'',
	].join( '\n' );
}

// Both files' names and texts: { baseFile, baseText, fullFile, fullText }. The full file is what Solve and the walker run.
export function walkerConfigs( { surface, nodes, tree, inventory = null, draftUrl, liveUrl, open, opener = null, divergences, state } ) {
	const baseFile = `${ surface }.fill-base.mjs`;
	return {
		baseFile,
		baseText: baseConfigText( { surface, draftUrl, liveUrl, open, opener, divergences, state, roots: surfaceRoots( nodes, tree, inventory ) } ),
		fullFile: `${ surface }.fill.mjs`,
		fullText: configText( baseFile, surface, walkerPairs( nodes, tree, inventory ) ),
	};
}
