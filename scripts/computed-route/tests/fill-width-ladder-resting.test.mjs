// The width ladder's rung 4 (lib/fill-width-ladder.mjs) for a block that paints nothing of the property by default: the setting
// holds the widest read width's value, so the block renders (a decorative layer with no ground prints nothing at all), and the
// scoped @media rules cover only the other ranges. Eye Care Home's hero fade: two gradient layers whose gradient differs at
// 375 and at 768 and up were written only as @media rules, so neither layer rendered. Where the block's calibrated paint is
// not the property's initial value, where the row is a state's, or where no setting holds the property, rung 4 is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthLadderWrites, restingHeld } from '../lib/fill-width-ladder.mjs';
import { ONE_VALUE_EVERY_WIDTH } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const dbFile = fixtureDb( {
	blocks: [ { slug: 'sgs/layer', title: 'Layer', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/plain', title: 'Plain', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/layer', attr_name: 'ground', attr_type: 'string', css_property: 'background-image', css_element: 'wrapper', role: 'colour' },
	],
} );
const db = openDb( dbFile );
const A = 'linear-gradient(rgba(20, 20, 20, 0.44) 0%, rgba(20, 20, 20, 0.5) 100%)';
const B = 'linear-gradient(100deg, rgba(18, 18, 18, 0.86) 0%, rgba(18, 18, 18, 0) 100%)';

// One skeleton node; the gradient reads A at 375 and B at 768 and 1440.
function world( block = 'sgs/layer' ) {
	const flat = [ { name: block, attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: block, parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' } ] } ];
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 300, h: 40 }, layoutDisplay: 'block', styles: { display: 'block', 'background-image': 375 === w ? A : B } } } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
// The generic resolver stood in for: the ground setting takes one gradient, and refuses a value that differs by width.
const resolver = ( { block, prop, draft } ) => {
	const vals = [ ...new Set( Object.values( draft ) ) ];
	if ( 'sgs/layer' !== block || 'background-image' !== prop ) {
		return { status: 'gap', gap: 'no-setting', detail: 'no setting' };
	}
	return vals.length > 1 ? { status: 'gap', gap: 'shape', code: ONE_VALUE_EVERY_WIDTH, detail: 'one value for every width' } : { status: 'written', writes: [ { attr: 'ground', value: vals[ 0 ], merge: 'replace' } ], included: Object.fromEntries( Object.keys( draft ).map( ( w ) => [ w, true ] ) ) };
};
const paint = ( value ) => ( { elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { 'background-image': value } ] ) ) }, settings: {} } );
const row = ( o = {} ) => ( { node: 'n0', block: 'sgs/layer', slot: '', property: 'background-image', value: JSON.stringify( { 375: A, 768: B, 1440: B } ), code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: one value for every width', ...o } );
const run = ( w, rows, cal, r = resolver ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor: () => cal, scope: 'page', resolver: r, date: '2026-11-19' } );
const attrs = ( w ) => w.flat[ 0 ].attributes;

test( 'MUST FAIL: a block with no ground by default holds the widest width\'s gradient in its setting, and the @media rule covers 375 only', () => {
	const w = world();
	const r = run( w, [ row() ], paint( 'none' ) );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( attrs( w ).ground, B, 'the layer\'s ground setting holds the 768 and up gradient, so the layer renders' );
	assert.equal( attrs( w ).sgsCustomCss, `@media (max-width: 767px) { & { background-image: ${ A }; } }` );
	assert.match( attrs( w ).sgsCustomCssNote, /Width ladder background-image: 0-767px linear-gradient/ );
	assert.ok( ! /768px and up/.test( attrs( w ).sgsCustomCssNote ), 'the held range is not repeated as a rule' );
	assert.ok( r.writes.some( ( x ) => 'ground' === x.attr ), 'the setting write is in the list' );
	assert.ok( r.notes.some( ( n ) => /written as the setting at 1440px and a scoped @media rule/.test( n ) ) );
	assert.equal( r.answered.length, 1 );
} );

test( 'a block that paints a ground of its own by default keeps every range as a rule and writes no setting', () => {
	const w = world();
	run( w, [ row() ], paint( 'linear-gradient(red, blue)' ) );
	assert.equal( attrs( w ).ground, undefined );
	assert.match( attrs( w ).sgsCustomCss, /\(max-width: 767px\)/ );
	assert.match( attrs( w ).sgsCustomCss, /\(min-width: 768px\)/ );
} );

test( 'no calibrated paint, a state row and a property no setting holds keep the old behaviour', () => {
	const none = world();
	run( none, [ row() ], null );
	assert.equal( attrs( none ).ground, undefined, 'no calibrated paint: nothing proves the block paints nothing' );
	assert.match( attrs( none ).sgsCustomCss, /\(min-width: 768px\)/ );
	const state = world();
	run( state, [ row( { state: 'hover' } ) ], paint( 'none' ) );
	assert.equal( attrs( state ).ground, undefined );
	const plain = world( 'sgs/plain' );
	run( plain, [ row( { block: 'sgs/plain' } ) ], paint( 'none' ) );
	assert.equal( attrs( plain ).ground, undefined, 'a block with no setting for the property has none to hold' );
	assert.match( attrs( plain ).sgsCustomCss, /\(min-width: 768px\)/ );
} );

test( 'a resolver that refuses the widest value leaves every range as a rule', () => {
	const w = world();
	run( w, [ row() ], paint( 'none' ), () => ( { status: 'gap', gap: 'shape', detail: 'not a gradient' } ) );
	assert.equal( attrs( w ).ground, undefined );
	assert.match( attrs( w ).sgsCustomCss, /\(min-width: 768px\)/ );
} );

test( 'restingHeld: the paint must be the initial value at every width, and the draft\'s widest value must not be', () => {
	const base = ( v ) => () => v;
	const ok = { widths: [ 375, 768, 1440 ], prop: 'background-image', state: null, hasSetting: true, raw: B };
	assert.equal( restingHeld( { ...ok, base: base( 'none' ) } ), true );
	assert.equal( restingHeld( { ...ok, base: base( 'linear-gradient(red, blue)' ) } ), false );
	assert.equal( restingHeld( { ...ok, base: base( undefined ) } ), false, 'an unmeasured paint is no proof' );
	assert.equal( restingHeld( { ...ok, base: ( w ) => ( 375 === w ? 'none' : undefined ) } ), false, 'every width must be measured' );
	assert.equal( restingHeld( { ...ok, base: base( 'none' ), raw: 'none' } ), false, 'the widest value is the initial value: nothing to hold' );
	assert.equal( restingHeld( { ...ok, base: base( 'none' ), state: 'hover' } ), false );
	assert.equal( restingHeld( { ...ok, base: base( 'none' ), hasSetting: false } ), false );
} );
