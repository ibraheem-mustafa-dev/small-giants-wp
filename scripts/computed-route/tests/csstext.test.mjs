// A style a script builds up as one `cssText` string reaches the inventory whole (lib/intake-inventory-csstext.mjs, used by
// lib/intake-inventory-target.mjs::writerSites): one declaration per property, each value kept whole, a local name the
// value uses replaced by its arithmetic definition. Each MUST FAIL case is red on the previous writer, which kept the
// string as one formula clipped at 160 characters with the name unresolved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeModel } from '../lib/intake-inventory-code.mjs';
import { writerSites } from '../lib/intake-inventory-target.mjs';
import { animationRecords } from '../lib/intake-inventory-anim.mjs';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';

const sitesOf = ( logic ) => {
	const source = { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } };
	return writerSites( codeModel( { sources: [ source ], rows: [] } ).progs.get( 'App' ) ).filter( ( w ) => 'js-style-write' === w.mechanism );
};
const byProperty = ( w ) => Object.fromEntries( w.properties.map( ( x ) => [ x.property, x ] ) );

const PRESS = `class Component extends DCComponent {
bind() {
document.addEventListener( 'pointerdown', ( e ) => {
const m = e.target.closest( '[data-hit]' );
const r = m.getBoundingClientRect(), d = Math.max( r.width, r.height ) * 2.2, sp = document.createElement( 'span' );
sp.style.cssText = \`position:absolute;left:\${ e.clientX - r.left - d / 2 }px;width:\${ d }px;height:\${ d }px;opacity:.35;background:rgba(255,255,255,.35);pointer-events:none;\`;
m.appendChild( sp );
} );
}
}`;

test( 'MUST FAIL: a template-literal cssText gives one declaration per property, a local multiplier visible in the size', () => {
	const [ w ] = sitesOf( PRESS );
	const p = byProperty( w );
	assert.deepEqual( Object.keys( p ), [ 'position', 'left', 'width', 'height', 'opacity', 'background', 'pointer-events' ] );
	assert.equal( p.position.to, 'absolute' );
	assert.equal( p.width.formula, "( Math.max( r.width, r.height ) * 2.2 ) + 'px'" );
	assert.equal( p.height.formula, p.width.formula );
	assert.equal( p.left.formula, "( e.clientX - r.left - ( Math.max( r.width, r.height ) * 2.2 ) / 2 ) + 'px'" );
	assert.equal( p.opacity.to, '.35' );
	assert.equal( p.background.to, 'rgba(255,255,255,.35)' );
} );

test( 'MUST FAIL: a string concatenation reads the same, and a call the name holds (`r`) stays its own name', () => {
	const [ w ] = sitesOf( PRESS.replace( /`position[^`]*`/, "'width:' + d + 'px;height:' + r.height + 'px;'" ) );
	const p = byProperty( w );
	assert.equal( p.width.formula, "( Math.max( r.width, r.height ) * 2.2 ) + 'px'" );
	assert.equal( p.height.formula, "r.height + 'px'" );
} );

test( 'MUST FAIL: a cssText of 300 characters is kept whole, never clipped', () => {
	const long = `background:linear-gradient(100deg,${ 'rgba(255,255,255,.45),'.repeat( 12 ) }transparent);width:60%`;
	const [ w ] = sitesOf( `class Component extends DCComponent { f( n ) { const s = document.createElement( 'span' ); s.style.cssText = 'height:' + n + 'px;${ long }'; } }` );
	assert.ok( long.length > 280 );
	assert.equal( byProperty( w ).background.to, long.slice( 'background:'.length, long.indexOf( ';width' ) ) );
	assert.equal( byProperty( w ).width.to, '60%' );
	const [ v ] = sitesOf( `class Component extends DCComponent { f( n ) { const s = document.createElement( 'span' ); s.style.cssText = '${ 'x:1;'.repeat( 80 ) }height:' + n + 'px'; } }` );
	assert.equal( v.properties.length, 81 );
	assert.equal( v.properties[ 80 ].formula, "n + 'px'" );
} );

test( 'MUST FAIL: a value that cannot be resolved stays the call site\'s own text', () => {
	// A parameter, a reassigned variable and a call result are not definitions: each stays its name.
	const [ w ] = sitesOf( `class Component extends DCComponent { f( size ) { let k = 2; k = size * 3; const s = document.createElement( 'span' ); const t = this.measure(); const q = this.measure() * 2; s.style.cssText = 'width:' + size + 'px;height:' + k + 'px;top:' + t + 'px;margin:' + ( size + 1 ) + 'px;left:' + q + 'px'; } }` );
	const p = byProperty( w );
	assert.equal( p.width.formula, "size + 'px'" );
	assert.equal( p.height.formula, "k + 'px'" );
	assert.equal( p.top.formula, "t + 'px'" );
	assert.equal( p.margin.formula, "( size + 1 ) + 'px'" );
	assert.equal( p.left.formula, "q + 'px'" );
	// A whole value that is no string expression keeps its full text.
	const [ x ] = sitesOf( 'class Component extends DCComponent { f( css ) { const s = document.createElement( "span" ); s.style.cssText = this.build( css ); } }' );
	assert.deepEqual( x.properties, [ { property: 'css-text', to: null, formula: 'this.build( css )' } ] );
} );

test( 'a literal cssText splits as before, and a semicolon inside parentheses ends nothing', () => {
	const [ w ] = sitesOf( `class Component extends DCComponent { f() { const s = document.createElement( 'span' ); s.style.cssText = 'Position:absolute;background:url(data:image/png;base64,AAA) no-repeat;;width:60%'; } }` );
	assert.deepEqual( w.properties, [ { property: 'position', to: 'absolute' }, { property: 'background', to: 'url(data:image/png;base64,AAA) no-repeat' }, { property: 'width', to: '60%' } ] );
} );

test( 'MUST FAIL: the press ripple\'s record gives the effect recogniser its size factor, peak opacity and colour', () => {
	const source = { component: 'App', file: 'App.dc.html', via: 'entry', logic: `${ PRESS.replace( "m.appendChild( sp );", "m.appendChild( sp ); sp.animate( [ { transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 } ], { duration: 650, easing: 'ease-out' } );" ) }`, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements: [] } };
	const m = codeModel( { sources: [ source ], rows: [] } );
	const call = m.progs.get( 'App' ).nodes.find( ( n ) => 'CallExpression' === n.type && 'animate' === n.callee?.property?.name );
	const census = { sources: [ source ], rows: [ { id: 'waapi@App:0', kind: 'waapi', component: 'App', draftId: `App:js:${ call.loc.start.line }:${ call.loc.start.column }`, detail: {} } ] };
	const { records } = animationRecords( census );
	const ripple = records.find( ( r ) => 'waapi' === r.mechanism );
	const e = recogniseBehaviour( ripple, { records } ).effects[ 0 ];
	assert.equal( e.effect, 'ripple' );
	assert.equal( e.values.sizeFactor, 2.2 );
	assert.equal( e.values.peakOpacity, 0.35 );
	assert.equal( e.values.colour, '#ffffff' );
} );
