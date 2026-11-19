// A block standing in for a draft element (Spec 48 FR-48-87; lib/region-stand-in.mjs, lib/fill-read-collect.mjs::collectMany):
// Fill stamps the element as the block's own and reads nothing there, so a wrapper above the block no longer reads the
// element's column template as its own layout (scripts/parity/lib/paint.mjs::layoutElement). The DOM is a planted stand-in
// for the draft page: a <main> whose one child is the grid laying out the form beside the order summary. Tests marked MUST
// FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { standInJobs } from '../lib/region-stand-in.mjs';
import { collectMany } from '../lib/fill-read-collect.mjs';
import { layoutElement } from '../../parity/lib/paint.mjs';

// A planted element: its tag, display and children; it keeps the attributes set on it.
function el( tagName, display, children = [] ) {
	const attrs = {};
	return { tagName, display, children, setAttribute: ( k, v ) => ( attrs[ k ] = String( v ) ), getAttribute: ( k ) => ( k in attrs ? attrs[ k ] : null ), getClientRects: () => [ 1 ], attrs };
}
const styleOf = ( e, ps ) => ( ps ? { content: 'none' } : { display: e.display, position: 'static' } );
const page = () => {
	const grid = el( 'DIV', 'grid', [ el( 'FORM', 'flex' ), el( 'ASIDE', 'flex' ) ] );
	const main = el( 'MAIN', 'block', [ grid ] );
	return { main, grid, byTpl: { 'Root/16#0': main, 'Root/17#0': grid } };
};
// collectMany in the planted page: its finders resolve by tpl, and its read finds nothing (only the stamps are under test).
function collect( jobs, dom ) {
	const saved = globalThis.document;
	globalThis.document = { createElement: () => ( { getContext: () => ( {} ), remove: () => {} } ), head: { appendChild: () => {} }, documentElement: { getBoundingClientRect: () => ( {} ) } };
	globalThis.__standInDom = dom.byTpl;
	try {
		return collectMany( [ jobs, '() => ( { missing: true } )', '( f ) => globalThis.__standInDom[ f.tpl ] || null', '', [], null, 'data-fill-scope' ] );
	} finally {
		globalThis.document = saved;
		delete globalThis.__standInDom;
	}
}
// The skeleton nodes (lib/fill-skeleton.mjs::skeletonNodes) of a main holding the stand-in block.
const NODES = [
	{ index: 0, node: { name: 'sgs/container', draftRef: { tpl: 'Root/16#0' } } },
	{ index: 1, node: { name: 'core/post-content', draftStandsFor: { tpl: 'Root/17#0' } } },
	{ index: 2, node: { name: 'sgs/heading', draftRef: { tpl: 'Root/34#0' } } },
];
const MAIN_JOB = { id: '0:', finder: { tpl: 'Root/16#0' }, mark: 0, owner: 0, root: true, own: true };

test( 'MUST FAIL: each node standing in for a draft element gives one stamp-only job naming its element and its node', () => {
	assert.deepEqual( standInJobs( NODES ), [ { id: '1:stand-in', finder: { tpl: 'Root/17#0' }, mark: null, owner: 1, root: false, own: false, stampOnly: true } ] );
	assert.deepEqual( standInJobs( NODES.filter( ( n ) => 1 !== n.index ) ), [] );
} );

test( 'MUST FAIL: with the stand-in stamped, the main above the block reads its own layout, not the grid\'s column template', () => {
	const dom = page();
	const out = collect( [ MAIN_JOB, ...standInJobs( NODES ) ], dom );
	assert.equal( dom.grid.getAttribute( 'data-fill-owner' ), '1' );
	assert.equal( layoutElement( dom.main, styleOf ), dom.main );
	// The stand-in reads nothing: the read covers only the main.
	assert.deepEqual( Object.keys( out ), [ '0:' ] );
} );

test( 'without a stand-in the main reads the grid as its layout (the fault the stamp prevents)', () => {
	const dom = page();
	collect( [ MAIN_JOB ], dom );
	assert.equal( layoutElement( dom.main, styleOf ), dom.grid );
} );
