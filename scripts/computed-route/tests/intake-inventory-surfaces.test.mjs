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
