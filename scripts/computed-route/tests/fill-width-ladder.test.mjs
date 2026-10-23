// The width ladder (lib/fill-width-ladder.mjs, Spec 48 FR-48-50): a per-width difference no single setting holds is tried as
// an equal-in-effect value, a tier-shaped sibling, the block's own breakpoint, then a scoped @media rule; a value is refused
// only when no rung holds it. The generic resolver is stood in for by a fixture that holds the keywords its enum lists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthLadderWrites, effectOf, isLadderRow } from '../lib/fill-width-ladder.mjs';
import { ONE_VALUE_EVERY_WIDTH } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const dbFile = fixtureDb( {
	blocks: [ { slug: 'sgs/box', title: 'Box', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/bar', title: 'Bar', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/nav', title: 'Nav', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/box', attr_name: 'justifyContent', attr_type: 'string', css_property: 'justify-content', css_element: 'wrapper', role: 'layout' },
		{ block_slug: 'sgs/box', attr_name: 'colour', attr_type: 'string', css_property: 'color', css_element: 'wrapper', role: 'colour' },
		{ block_slug: 'sgs/bar', attr_name: 'barJustify', attr_type: 'object', css_property: 'justify-content', css_element: 'wrapper', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
		// A tier-shaped setting that paints no CSS property (as sgs/button's widthType): rung 2 never reads it.
		{ block_slug: 'sgs/bar', attr_name: 'barSizing', attr_type: 'object', css_property: null, tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
		{ block_slug: 'sgs/nav', attr_name: 'collapsePoint', attr_type: 'number', css_property: null, role: 'layout' },
		{ block_slug: 'sgs/nav', attr_name: 'navJustify', attr_type: 'string', css_property: 'justify-content', css_element: 'wrapper', role: 'layout' },
	],
} );
const db = openDb( dbFile );
const ENUM = [ '', 'flex-start', 'center', 'flex-end', 'space-between' ];

// A resolver standing in for lib/fill-prop.mjs::resolveProperty: one string setting holding the ENUM keywords (or any colour).
const resolver = ( { block, prop, draft } ) => {
	const attr = { 'justify-content': 'sgs/bar' === block ? 'barJustify' : 'sgs/nav' === block ? 'navJustify' : 'justifyContent', color: 'colour' }[ prop ];
	const vals = [ ...new Set( Object.values( draft ) ) ];
	if ( 'color' === prop ) {
		return { status: 'gap', gap: 'shape', code: ONE_VALUE_EVERY_WIDTH, detail: 'colour holds one value for every width' };
	}
	return vals.length > 1 || ! ENUM.includes( vals[ 0 ] ) ? { status: 'gap', gap: 'shape', detail: `${ vals[ 0 ] } is not one of ${ ENUM.join( ', ' ) }` } : { status: 'written', writes: [ { attr, value: vals[ 0 ], merge: 'replace' } ], included: draft };
};

// A skeleton of one node (index 0) with `kids` children, each read at the widths it is visible.
function world( { block = 'sgs/box', attrs = {}, kids = [ [ 375, 768, 1440 ] ], display = 'flex', sweep = null, slot = '' } ) {
	const flat = [ { name: block, attributes: { ...attrs }, ref: 'n0' }, ...kids.map( ( _, i ) => ( { name: 'sgs/button', attributes: {}, ref: `k${ i }` } ) ) ];
	const nodes = flat.map( ( n, index ) => ( { index, name: n.name, parent: index ? 0 : null, node: n, children: index ? [] : kids.map( ( _, i ) => i + 1 ), targets: [ { id: `${ index }:`, index, slot: '', finder: 'x' } , ...( 0 === index && slot ? [ { id: `0:${ slot }`, index: 0, slot, finder: 'y' } ] : [] ) ] } ) );
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, {
		'0:': { rect: { x: 0, y: 0, w: 300, h: 40 }, layoutDisplay: display, styles: { display } },
		...( slot ? { [ `0:${ slot }` ]: { rect: { x: 0, y: 0, w: 300, h: 40 }, layoutDisplay: display, styles: { display } } } : {} ),
		...Object.fromEntries( kids.map( ( shown, i ) => [ `${ i + 1 }:`, shown.includes( w ) ? { rect: { x: 0, y: 0, w: 50, h: 20 }, inFlow: true, styles: {} } : { missing: true } ] ) ),
	} ] ) );
	return { flat, nodes, reads: { widths, sweep: sweep ? { [ slot ? `0:${ slot }` : '0:' ]: { 'justify-content': sweep } } : {} }, refOf: ( n ) => n.ref };
}
const rowOf = ( o ) => ( { node: 'n0', block: 'sgs/box', slot: '', ...o } );
const run = ( w, rows, o = {} ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor: () => null, scope: 'header', resolver, date: '2026-10-23', ...o } );
const attrs = ( w ) => w.flat[ 0 ].attributes;

test( 'effects: normal is the start value in a flex container, space-between with one child is too, around and evenly centre one child', () => {
	const flex = { display: 'flex', children: 2 };
	assert.equal( effectOf( 'justify-content', 'normal', flex ), 'start' );
	assert.equal( effectOf( 'justify-content', 'normal', { display: 'block', children: 2 } ), 'normal', 'not a flex or grid container' );
	assert.equal( effectOf( 'justify-content', 'space-between', { display: 'flex', children: 1 } ), 'start' );
	assert.equal( effectOf( 'justify-content', 'space-between', flex ), 'space-between' );
	assert.equal( effectOf( 'justify-content', 'space-around', { display: 'flex', children: 1 } ), 'center' );
	assert.equal( effectOf( 'justify-content', 'space-evenly', { display: 'flex', children: 1 } ), 'center' );
	assert.equal( effectOf( 'justify-content', 'space-between', { display: 'flex', children: null } ), 'space-between', 'unknown children prove nothing' );
	assert.equal( effectOf( 'align-items', 'normal', { display: 'grid' } ), 'stretch' );
} );

test( 'MUST FAIL WITHOUT RUNG 1: the top row (375 normal, 768 and 1440 space-between, one visible child at 375) is one space-between value', () => {
	const w = world( { kids: [ [ 375, 768, 1440 ], [ 768, 1440 ] ] } );
	const r = run( w, [ rowOf( { property: 'justify-content', value: '{"375":"normal","768":"space-between","1440":"space-between"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ) ] );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( attrs( w ).justifyContent, 'space-between' );
	assert.equal( attrs( w ).sgsCustomCss, undefined, 'no CSS: one value does the same at every width' );
} );

test( 'MUST FAIL WITHOUT THE ENUM ALIAS: normal alone (not in the enum) is written as the start keyword the enum holds', () => {
	const w = world( {} );
	const r = run( w, [ rowOf( { property: 'justify-content', value: 'normal', reason: 'shape: normal is not one of , flex-start, center' } ) ] );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( attrs( w ).justifyContent, 'flex-start' );
} );

test( 'MUST FAIL WITHOUT RUNG 4: all three widths differ and nothing holds it, so a scoped @media rule per range is written, labelled, with the tier boundaries', () => {
	const w = world( { kids: [ [ 375, 768, 1440 ], [ 375, 768, 1440 ] ] } );
	const r = run( w, [ rowOf( { property: 'justify-content', value: '{"375":"center","768":"flex-end","1440":"space-between"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ) ] );
	assert.deepEqual( r.unmapped, [] );
	const a = attrs( w );
	assert.equal( a.sgsCustomCss, '@media (max-width: 767px) { & { justify-content: center; } } @media (min-width: 768px) and (max-width: 1023px) { & { justify-content: flex-end; } } @media (min-width: 1024px) { & { justify-content: space-between; } }' );
	assert.match( a.sgsCustomCssId, /^[a-z0-9]{4,16}$/ );
	assert.match( a.sgsCustomCssNote, /Width ladder justify-content: 0-767px center, 768-1023px flex-end, 1024px and up space-between/ );
	assert.equal( a.justifyContent, undefined );
	assert.deepEqual( r.ledger, [] );
} );

test( 'MUST FAIL WITHOUT THE PAIR RULE: two widths agreeing (mobile with desktop, only the middle differs) keep both of their ranges', () => {
	const w = world( { kids: [ [ 375, 768, 1440 ], [ 375, 768, 1440 ] ] } );
	run( w, [ rowOf( { property: 'justify-content', value: '{"375":"center","768":"flex-end","1440":"center"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ) ] );
	assert.equal( (attrs( w ).sgsCustomCss.match( /@media/g ) || []).length, 3 );
	assert.match( attrs( w ).sgsCustomCss, /\(min-width: 1024px\) \{ & \{ justify-content: center; \} \}/ );
	const w2 = world( { kids: [ [ 375, 768, 1440 ], [ 375, 768, 1440 ] ] } );
	run( w2, [ rowOf( { property: 'justify-content', value: '{"375":"center","768":"center","1440":"flex-end"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ) ] );
	assert.equal( attrs( w2 ).sgsCustomCss, '@media (max-width: 1023px) { & { justify-content: center; } } @media (min-width: 1024px) { & { justify-content: flex-end; } }', 'equal adjacent ranges merge' );
} );

test( 'MUST FAIL WITHOUT THE SNAP: a 760px threshold from the sweep snaps to 768 with one breakpoint-snap entry; 900 stays and snaps nothing', () => {
	const sweep = ( at ) => [ 320, 336, 352, 368, 384 ].map( ( x ) => ( { width: x, value: 'center' } ) ).concat( Array.from( { length: 100 }, ( _, i ) => 400 + i * 16 ).map( ( x ) => ( { width: x, value: x >= at ? 'flex-end' : 'center' } ) ) );
	const row = rowOf( { property: 'justify-content', value: '{"375":"center","1440":"flex-end"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } );
	const w = world( { kids: [ [ 375, 1440 ], [ 375, 1440 ] ], sweep: sweep( 752 ) } );
	const r = run( w, [ row ] );
	assert.equal( attrs( w ).sgsCustomCss, '@media (max-width: 767px) { & { justify-content: center; } } @media (min-width: 768px) { & { justify-content: flex-end; } }' );
	assert.equal( r.ledger.length, 1, '752 is 16px under 768: within 5%, so it snaps' );
	const w2 = world( { kids: [ [ 375, 1440 ], [ 375, 1440 ] ], sweep: sweep( 1008 ) } );
	const r2 = run( w2, [ row ] );
	assert.equal( r2.ledger.length, 1, '1008 is 16px under 1024: within 5%' );
	assert.equal( r2.ledger[ 0 ].expected.rule, 'breakpoint-snap' );
	assert.match( attrs( w2 ).sgsCustomCss, /\(min-width: 1024px\)/ );
	const w3 = world( { kids: [ [ 375, 1440 ], [ 375, 1440 ] ], sweep: sweep( 1200 ) } );
	const r3 = run( w3, [ row ] );
	assert.equal( r3.ledger.length, 0 );
	assert.match( attrs( w3 ).sgsCustomCss, /\(min-width: 1200px\)/, 'an off-tier threshold is kept' );
} );

test( 'MUST FAIL WITHOUT RUNG 4 FOR COLOURS: a colour (a free value no enum holds) that differs by width is written as the CSS colour at each range', () => {
	const w = world( { kids: [ [ 375, 768, 1440 ] ] } );
	const r = run( w, [ rowOf( { property: 'color', value: '{"768":"rgb(255, 255, 255)","1440":"rgb(10, 126, 168)"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: colour holds one value for every width' } ) ] );
	assert.deepEqual( r.unmapped, [] );
	assert.match( attrs( w ).sgsCustomCss, /\(max-width: 1023px\) \{ & \{ color: rgb\(255, 255, 255\); \} \} @media \(min-width: 1024px\) \{ & \{ color: rgb\(10, 126, 168\); \} \}/ );
} );

test( 'MUST FAIL WITHOUT LENGTHS: a length and a state value that vary by width go to the element\'s slot and the state\'s pseudo-class', () => {
	const w = world( { slot: '.sgs-box__inner' } );
	const r = run( w, [
		rowOf( { property: 'gap', slot: '.sgs-box__inner', value: '{"375":"8px","1440":"24px"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ),
		rowOf( { property: 'color', slot: '.sgs-box__inner', state: 'hover', value: '{"375":"red","1440":"blue"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ),
	] );
	assert.deepEqual( r.unmapped, [] );
	assert.match( attrs( w ).sgsCustomCss, /& \.sgs-box__inner \{ gap: 8px; \}/ );
	assert.match( attrs( w ).sgsCustomCss, /& \.sgs-box__inner:hover \{ color: blue; \}/ );
	assert.equal( 3, w.flat[ 0 ].attributes.sgsCustomCssNote.split( '; ' ).length + 1, 'two labels, one per rule set' );
} );

test( 'MUST FAIL WITHOUT RUNG 2: a tier-shaped setting that paints the element takes the value per device', () => {
	const w = world( { block: 'sgs/bar' } );
	const cal = { settings: { barJustify: { slot: '' } } };
	const r = run( w, [ rowOf( { block: 'sgs/bar', property: 'justify-content', value: '{"375":"center","768":"flex-start","1440":"flex-start"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ) ], { calFor: () => cal } );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( attrs( w ).barJustify, { desktop: 'flex-start', mobile: 'center' } );
	assert.equal( attrs( w ).sgsCustomCss, undefined );
} );

test( 'MUST FAIL WITHOUT RUNG 3: a block drawing its own narrow alternative under collapsePoint takes the wide value', () => {
	const w = world( { block: 'sgs/nav', attrs: { collapsePoint: 1024 } } );
	const r = run( w, [ rowOf( { block: 'sgs/nav', property: 'justify-content', value: '{"375":"center","768":"center","1440":"flex-end"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } ) ], { collapse: { 'sgs/nav': 'collapsePoint' } } );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( attrs( w ).navJustify, 'flex-end' );
	assert.equal( attrs( w ).sgsCustomCss, undefined );
	assert.match( r.notes.join( '\n' ), /own narrow alternative under collapsePoint = 1024px/ );
} );

test( 'unsafe CSS is refused, and rows that are not ladder rows are left', () => {
	const w = world( {} );
	const bad = rowOf( { property: 'justify-content', value: '{"375":"center","1440":"red; } body { display:none"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } );
	const other = rowOf( { property: 'max-width', value: 'none', reason: 'shape: none cannot be held' } );
	const r = run( w, [ bad, other ] );
	assert.deepEqual( r.unmapped, [ bad, other ] );
	assert.equal( attrs( w ).sgsCustomCss, undefined );
	assert.equal( isLadderRow( other ), false );
	assert.equal( isLadderRow( bad ), true );
} );
