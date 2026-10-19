// Spec 48 FR-48-25, the surfaces inventory on hand-built censuses (no browser): the route list comes from the page
// map's resolved rows when given, a breakpoint sc-if is a state of the page it sits on, and readsState follows a bare
// identifier field value and a `this.state` handed to a helper method.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel } from '../lib/intake-inventory-code.mjs';
import { surfaceRecords } from '../lib/intake-inventory-surfaces.mjs';

const el = ( n, parent, tag ) => ( { n, parent, tag, attrs: [], texts: [], inFor: false, inHelmet: false } );
const source = ( logic, elements = [] ) => ( { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements } } );
const ifRow = ( n, value ) => ( { id: `sc-if@App:${ n }`, kind: 'sc-if', component: 'App', draftId: `App:${ n }`, detail: { value } } );
const forRow = ( n, list, as ) => ( { id: `sc-for@App:${ n }`, kind: 'sc-for', component: 'App', draftId: `App:${ n }`, detail: { as, list } } );
const run = ( c, extra = {} ) => surfaceRecords( c, { model: codeModel( c ), ...extra } );

const ROUTER = `class Component extends DCComponent {
state = { route: 'home', wide: false };
go() { this.setState( { route: location.hash, wide: window.innerWidth > 900 } ); }
renderVals() { return { isHome: this.state.route === '#home', R: { pin: this.state.wide, noPin: ! this.state.wide } }; }
}`;

test( '(a) routes come from the page map rows when given, and from routing.routes otherwise', () => {
	const c = { sources: [ source( ROUTER ) ], rows: [] };
	const routing = { adapter: 'hash', routes: [ { key: 'home', source: 'pages' } ], links: [] };
	const pageRows = [ { route: 'home' }, { route: 'post-a' }, { route: 'post-b' } ];
	assert.deepEqual( run( c, { routing, pageRows } ).records.filter( ( r ) => 'page' === r.kind ).map( ( r ) => r.page_key ), [ 'home', 'post-a', 'post-b' ] );
	assert.deepEqual( run( c, { routing } ).records.filter( ( r ) => 'page' === r.kind ).map( ( r ) => r.page_key ), [ 'home' ], 'without pageRows the adapter\'s routes stand' );
} );

test( '(b) a breakpoint sc-if is a state of the page it sits on, carrying its sc-if id', () => {
	const c = {
		sources: [ source( ROUTER, [ el( '1', null, 'sc-if' ), el( '2', '1', 'sc-if' ), el( '3', '1', 'sc-if' ) ] ) ],
		rows: [ ifRow( '1', '{{ isHome }}' ), ifRow( '2', '{{ R.pin }}' ), ifRow( '3', '{{ R.noPin }}' ) ],
	};
	const routing = { adapter: 'hash', routes: [ { key: 'home', source: 'pages' }, { key: 'about', source: 'pages' } ], links: [] };
	const s = run( c, { routing } );
	const home = s.records.find( ( r ) => 'home' === r.page_key );
	const about = s.records.find( ( r ) => 'about' === r.page_key );
	assert.deepEqual( home.states.map( ( x ) => x.name ), [ 'default', 'breakpoint R.pin', 'breakpoint R.noPin' ] );
	assert.deepEqual( home.states.slice( 1 ).map( ( x ) => x.sc_if_tpl_ids ), [ [ '2' ], [ '3' ] ] );
	assert.deepEqual( about.states.map( ( x ) => x.name ), [ 'default' ], 'a page that holds no breakpoint sc-if keeps its one state' );
} );

const withStatic = ( body ) => `class Component extends DCComponent {
state = { tab: 0 };
pick( i ) { this.setState( { tab: i } ); }
${ body }
}`;
const loopCensus = ( logic ) => ( { sources: [ source( logic ) ], rows: [ forRow( '4', '{{ items }}', 'it' ), ifRow( '5', '{{ it.on }}' ) ] } );
const kinds = ( c ) => run( c ).records.map( ( r ) => r.name );

test( '(c1) a loop item field whose value is a bare local that reads state toggles the surface', () => {
	const c = loopCensus( withStatic( `renderVals() { const on = this.state.tab === 1; return { items: [ { on } ] }; }` ) );
	assert.deepEqual( kinds( c ), [ 'App', 'App: tab (read through items)' ] );
} );

test( '(c2) a this.state handed to a helper method is read as state', () => {
	const c = loopCensus( withStatic( `isOn( s ) { return s.tab === 1; }
renderVals() { return { items: [ { on: this.isOn( this.state ) } ] }; }` ) );
	assert.deepEqual( kinds( c ), [ 'App', 'App: tab (read through items)' ] );
} );

test( '(c3) a loop item field that is static content, even through a local, is a content variant', () => {
	const c = loopCensus( withStatic( `renderVals() { const on = true; return { items: [ { on }, { on: false } ] }; }` ) );
	assert.deepEqual( kinds( c ), [ 'App' ] );
	assert.deepEqual( Object.keys( run( c ).counts.other_sc_ifs[ 'content-variant' ].covered_by ), [ 'App:5' ] );
} );

test( '(c1b) a bare local declared inside the loop callback that reads state toggles the surface', () => {
	const c = loopCensus( withStatic( `renderVals() { return { items: [ 1, 2 ].map( ( p ) => { const on = this.state.tab === p; return { on, label: 'x' }; } ) }; }` ) );
	assert.deepEqual( kinds( c ), [ 'App', 'App: tab (read through items)' ] );
} );

test( '(c3b) a static field in a callback that reads state for another field stays a content variant', () => {
	const c = loopCensus( withStatic( `renderVals() { return { items: [ 1, 2 ].map( ( p ) => { const open = this.state.tab === p; const on = p > 1; return { on, open }; } ) }; }` ) );
	assert.deepEqual( kinds( c ), [ 'App' ] );
} );

test( '(c3c) a static field value that is an identifier of the callback parameter stays a content variant', () => {
	const c = loopCensus( withStatic( `renderVals() { const t = this.state.tab; return { items: [ 1, 2 ].map( ( p ) => ( { on: p, t } ) ) }; }` ) );
	assert.deepEqual( kinds( c ), [ 'App' ] );
} );

// FR-48-25, the Indus review's nine static content variants and the toggles the reader missed: the draft's nav items,
// form step and FAQ rows.
const mapCensus = ( logic, ifValue, rows = [ forRow( '4', '{{ items }}', 'it' ) ] ) => ( { sources: [ source( logic ) ], rows: [ ...rows, ifRow( '5', ifValue ) ] } );

test( '(d1) MUST FAIL: a map parameter is not the renderVals local that shares its spelling (a static field stays a content variant)', () => {
	// `mn` is the map parameter in the items list and also a local read from state elsewhere in renderVals.
	const c = mapCensus( withStatic( `renderVals() { const menus = this.menus; const active = this.state.tab; const mn = menus[ active ];
const items = menus.map( ( mn, i ) => ( { hasPanel: !! mn.kind, label: mn.label } ) );
return { items, activePanel: mn.links }; }` ), '{{ it.hasPanel }}' );
	assert.deepEqual( kinds( c ), [ 'App' ] );
} );

test( '(d2) MUST FAIL: a local declared inside the list callback that reads state toggles the field built from it', () => {
	const c = mapCensus( withStatic( `renderVals() { const blocks = this.blocks.map( ( b, bi ) => { const v = {}; if ( b.type === 'form' ) { const done = !! this.state.tab; Object.assign( v, { done, notDone: ! done } ); } return v; } );
return { items: blocks }; }` ), '{{ it.done }}' );
	assert.deepEqual( kinds( c ), [ 'App', 'App: tab (read through items)' ] );
} );

test( '(d3) MUST FAIL: a loop over an outer loop\'s field follows the outer list to the key that holds it', () => {
	const c = mapCensus( withStatic( `renderVals() { const blocks = this.blocks.map( ( b ) => ( { groups: b.groups.map( ( g ) => ( { items: g.items.map( ( q ) => { const open = !! this.state.tab; return { ...q, open }; } ) } ) ) } ) );
return { blocks }; }` ), '{{ q.open }}', [ forRow( '3', '{{ blocks }}', 'b' ), forRow( '4', '{{ b.groups }}', 'g' ), forRow( '6', '{{ g.items }}', 'q' ) ] );
	c.rows = c.rows.map( ( r ) => ( 'sc-if' === r.kind ? { ...r, id: 'sc-if@App:7', draftId: 'App:7', detail: { value: '{{ q.open }}' } } : r ) );
	assert.deepEqual( kinds( c ), [ 'App', 'App: tab (read through blocks)' ] );
} );

test( '(d4) MUST FAIL: a field spread from a helper method\'s result is read through the arguments the helper takes', () => {
	const c = mapCensus( withStatic( `float( n, err ) { return { hasErr: !! err, tone: 'x' }; }
renderVals() { const { tab } = this.state; return { items: [ 'a', 'b' ].map( ( n ) => ( { id: n, ...this.float( n, tab ) } ) ) }; }` ), '{{ it.hasErr }}' );
	assert.deepEqual( kinds( c ), [ 'App', 'App: tab (read through items)' ] );
} );

test( '(e) MUST FAIL: a page map row with no route (a menu-only or unrouted row) is not a route of the surfaces list', () => {
	const c = { sources: [ source( ROUTER ) ], rows: [] };
	const routing = { adapter: 'hash', routes: [ { key: 'home', source: 'pages' } ], links: [] };
	const pageRows = [ { route: 'home' }, { route: null }, { route: 'home' }, { route: 'about' }, {} ];
	assert.deepEqual( run( c, { routing, pageRows } ).records.filter( ( r ) => 'page' === r.kind ).map( ( r ) => r.page_key ), [ 'home', 'about' ] );
} );

test( 'MUST FAIL (QC): page-map rows that carry no route leave the adapter\'s routes in place', () => {
	const c = { sources: [ source( ROUTER ) ], rows: [] };
	const routing = { adapter: 'hash', routes: [ { key: 'home', source: 'pages' } ], links: [] };
	assert.deepEqual( run( c, { routing, pageRows: [ { route: null }, {} ] } ).records.filter( ( r ) => 'page' === r.kind ).map( ( r ) => r.page_key ), [ 'home' ] );
} );

test( 'MUST FAIL (QC): a breakpoint sc-if under a negated or only partly matching route gate is not put on that page', () => {
	const logic = `class Component extends DCComponent {
state = { route: 'home', wide: false };
go() { this.setState( { route: location.hash, wide: window.innerWidth > 900 } ); }
renderVals() { return { notHome: this.state.route !== '#home', R: { pin: this.state.wide } }; }
}`;
	const c = { sources: [ source( logic, [ el( '1', null, 'sc-if' ), el( '2', '1', 'sc-if' ) ] ) ], rows: [ ifRow( '1', '{{ !notHome }}' ), ifRow( '2', '{{ R.pin }}' ) ] };
	const routing = { adapter: 'hash', routes: [ { key: 'home', source: 'pages' } ], links: [] };
	const home = run( c, { routing } ).records.find( ( r ) => 'home' === r.page_key );
	assert.deepEqual( home.states.map( ( x ) => x.name ), [ 'default' ] );
} );
