// The parts a render-context surface draws another surface's block in are read on their own (Spec 48 §3.4, RC5,
// lib/intake-skeletons.mjs::surfaceRoots `renderParts`): a part record whose parent chain holds a surface of a kind
// data/render-contexts.json names (a drawer) and that has a state opening it. MUST FAIL on the Indus drawer's four accordion
// sections (S-10 to S-13, inside the drawer S-09); negative controls: Mama's page accordions (inside a page) and Indus's mega
// menus (surfaces of their own) are no render parts, and a part's states are only the ones that open it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { surfaceRoots, markAt, markRoot, restFailsAt } from '../lib/intake-skeletons.mjs';

const recordsOf = ( client ) => JSON.parse( readFileSync( new URL( `../../../sites/${ client }/handoff/surfaces.json`, import.meta.url ), 'utf8' ) ).records;
// A census holding every record's template elements as divs.
const censusFor = ( records ) => ( { rows: records.flatMap( ( r ) => [].concat( r.template_tpl_id ?? [] ).map( ( n ) => ( { kind: 'template-element', draftId: `${ r.dc }:${ n }`, component: r.dc, detail: { tag: 'div' } } ) ) ) } );
const roots = ( client ) => {
	const records = recordsOf( client );
	return surfaceRoots( { folder: '', census: censusFor( records ), records, files: null } );
};

test( 'MUST FAIL: the Indus drawer\'s accordion sections are render parts, opened inside the drawer by their own open state', () => {
	const r = roots( 'indus-foods' );
	assert.deepEqual( r.renderParts.map( ( p ) => [ p.id, p.slug, p.context, p.ancestors.map( ( a ) => a.id ).join() ] ), [
		[ 'S-10', 'part-drawer-accordion-about', 'drawer', 'S-09' ],
		[ 'S-11', 'part-drawer-accordion-sectors', 'drawer', 'S-09' ],
		[ 'S-12', 'part-drawer-accordion-brands', 'drawer', 'S-09' ],
		[ 'S-13', 'part-drawer-accordion-trade', 'drawer', 'S-09' ],
	] );
	assert.deepEqual( r.renderParts[ 0 ].states.map( ( st ) => st.name ), [ 'expanded' ], 'the collapsed state opens nothing' );
	assert.ok( r.renderParts.every( ( p ) => p.part && r.parts.some( ( x ) => x.id === p.id ) ), 'still listed as parts' );
	assert.ok( ! r.surfaces.some( ( s ) => s.part ), 'never a surface of its own' );
} );

test( 'negative controls: a page\'s accordions and the mega menus are no render parts', () => {
	assert.deepEqual( roots( 'mamas-munches-redesign' ).renderParts.map( ( p ) => p.id ), [] );
	assert.ok( ! roots( 'indus-foods' ).renderParts.some( ( p ) => 'menu' === p.kind ) );
} );

// A page whose evaluate answers the root mark (markRoot) and the draft-state calls (logicState), recording each.
const fakePage = ( mark = { copies: 4, tag: 'div', viaCondition: false, viaMain: false } ) => {
	const calls = [];
	return { calls, evaluate: async ( fn, arg ) => {
		calls.push( { fn: fn.name, arg } );
		return 'markRoot' === fn.name ? mark : 1;
	} };
};
const SECTION = { component: 'C', rootTpl: '134', slug: 'part-x', kind: 'accordion', part: true };

test( 'MUST FAIL: a render part\'s own state is set even while its root is mounted, and its root is re-marked as the copy that state shows', async () => {
	const page = fakePage();
	await markAt( page, SECTION, async () => {}, { via: 'state', state: 'expanded', keys: { acc: 1 } } );
	assert.deepEqual( page.calls.map( ( c ) => c.fn ), [ 'markRoot', 'logicState', 'markRoot' ] );
	assert.deepEqual( page.calls[ 1 ].arg.patch, { acc: 1 } );
	assert.equal( page.calls[ 2 ].arg[ 5 ], true, 'the mark looks for the shown copy' );
	assert.equal( await restFailsAt( null, SECTION, null, [] ), true, 'a render part is always read through its ways' );
} );

test( 'negative control: a surface that renders at rest is marked once and its state is left alone', async () => {
	const page = fakePage();
	const surface = { ...SECTION, part: undefined, kind: 'drawer' };
	await markAt( page, surface, async () => {}, { via: 'state', state: 'open', keys: { open: true } } );
	assert.deepEqual( page.calls.map( ( c ) => c.fn ), [ 'markRoot' ] );
	assert.equal( page.calls[ 0 ].arg[ 5 ], false );
	assert.equal( await restFailsAt( null, surface, null, [] ), false, 'no width-bound way: read at rest' );
} );

test( 'markRoot: a render part marks the first shown copy of its root, a surface the first copy (negative control)', () => {
	const copy = ( shown ) => {
		const el = { tagName: 'DIV', marked: null, parentElement: { closest: () => ( { dataset: { scName: 'C' } } ) }, checkVisibility: () => shown, getBoundingClientRect: () => ( { height: shown ? 40 : 0 } ), setAttribute( a, v ) {
			this.marked = v;
		}, closest: () => null, querySelectorAll: () => [] };
		return el;
	};
	const [ shut, open ] = [ copy( false ), copy( true ) ];
	const saved = globalThis.document;
	globalThis.document = { querySelectorAll: ( sel ) => ( sel.startsWith( '[data-dc-tpl' ) ? [ shut, open ] : [] ) };
	try {
		markRoot( [ 'C', '134', 'part-x', 'data-mark', false, true ] );
		assert.deepEqual( [ shut.marked, open.marked ], [ null, 'part-x' ] );
		open.marked = null;
		markRoot( [ 'C', '134', 'surface-x', 'data-mark', false, false ] );
		assert.deepEqual( [ shut.marked, open.marked ], [ 'surface-x', null ] );
	} finally {
		globalThis.document = saved;
	}
} );
