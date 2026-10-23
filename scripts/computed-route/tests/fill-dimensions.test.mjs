// The size family against a block's built-in size (lib/fill-dimensions.mjs, Spec 48 FR-48-8): a floor above the draft, a
// ceiling below it, a declared height with content that fits or does not, per-tier sizes, `auto`, and the 24px target size
// of an interactive element. The generic resolver is stood in for by a fixture that records what it is asked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dimensionWrites, sizeOf, physical } from '../lib/fill-dimensions.mjs';
import { validate } from '../lib/ledger.mjs';

const calls = [];
const resolver = ( { prop, draft, block } ) => {
	calls.push( { prop, draft, block } );
	const attr = { 'min-height': 'minHeight', 'max-height': 'maxHeight', 'min-width': 'minWidth', 'max-width': 'maxWidth' }[ prop ];
	if ( 'sgs/plain' === block || ! attr ) {
		return { status: 'gap', gap: 'no-setting', detail: `no ${ prop } setting` };
	}
	const tiers = {};
	let carried = null;
	for ( const [ w, tier ] of [ [ 1440, 'desktop' ], [ 768, 'tablet' ], [ 375, 'mobile' ] ] ) {
		if ( undefined !== draft[ w ] && draft[ w ] !== carried ) {
			tiers[ tier ] = draft[ w ];
			carried = draft[ w ];
		}
	}
	return { status: 'written', writes: [ { attr, value: tiers, merge: 'deep' } ], included: draft };
};

// One node (index 0) with `kids` child rects per width; `own` is its rect per width, `tag` its element.
function world( { block = 'sgs/button', own = { 375: 34, 768: 34, 1440: 34 }, axis = 'h', kids = [], tag = 'a', declared = {}, padding = 0 } ) {
	const flat = [ { name: block, attributes: {}, ref: 'n0' }, ...kids.map( ( _, i ) => ( { name: 'sgs/x', attributes: {}, ref: `k${ i }` } ) ) ];
	const nodes = flat.map( ( n, index ) => ( { index, name: n.name, parent: index ? 0 : null, node: n, children: index ? [] : kids.map( ( _, i ) => i + 1 ), targets: [ { id: `${ index }:`, index, slot: '', finder: 'x' } ] } ) );
	const size = ( v ) => ( 'h' === axis ? { x: 0, y: 100, w: 200, h: v } : { x: 0, y: 100, w: v, h: 20 } );
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, {
		'0:': { rect: size( own[ w ] ), tag, href: 'a' === tag ? '/x' : null, styles: { 'padding-bottom': `${ padding }px`, 'padding-right': `${ padding }px` } },
		...Object.fromEntries( kids.map( ( k, i ) => [ `${ i + 1 }:`, { rect: 'h' === axis ? { x: 0, y: 100, w: 50, h: k[ w ] } : { x: 0, y: 100, w: k[ w ], h: 10 }, inFlow: true, styles: {} } ] ) ),
	} ] ) );
	return { flat, nodes, reads: { widths, declared: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': declared } ] ) ) }, refOf: ( n ) => n.ref };
}
const FLOOR_48 = { elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { 'min-height': '48px', 'max-height': '30px', 'min-width': '100px' } ] ) ) } };
const rowOf = ( o ) => ( { node: 'n0', block: 'sgs/button', slot: '', reason: 'shape: auto cannot be held', ...o } );
const run = ( w, rows, o = {} ) => dimensionWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db: null, unmapped: rows, calFor: () => FLOOR_48, scope: 'header', resolver, date: '2026-10-23', ...o } );
const attrs = ( w ) => w.flat[ 0 ].attributes;

test( 'the size family: physical names and logical aliases', () => {
	assert.deepEqual( sizeOf( 'block-size' ), { kind: 'exact', axis: 'h' } );
	assert.deepEqual( sizeOf( 'min-inline-size' ), { kind: 'min', axis: 'w' } );
	assert.equal( physical( 'max-block-size' ), 'max-height' );
	assert.equal( sizeOf( 'color' ), null );
} );

test( 'MUST FAIL WITHOUT THE FLOOR RULE: a 34px draft pill (min-height auto) under the block\'s 48px floor is written as a 34px minimum', () => {
	calls.length = 0;
	const w = world( {} );
	const r = run( w, [ rowOf( { property: 'min-height', value: 'auto' } ) ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( attrs( w ).minHeight, { desktop: '34px' } );
	assert.equal( r.writes[ 0 ].how, 'dimension' );
	assert.match( r.notes[ 0 ], /paints min-height 48px \/ 48px \/ 48px where the draft renders 34px/ );
	assert.deepEqual( r.ledger, [] );
} );

test( 'MUST FAIL WITHOUT THE LOGICAL FORM: min-block-size auto is the same row as min-height auto', () => {
	const w = world( {} );
	const r = run( w, [ rowOf( { property: 'min-block-size', value: 'auto' } ) ] );
	assert.deepEqual( attrs( w ).minHeight, { desktop: '34px' } );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'MUST FAIL WITHOUT THE CEILING RULE: a ceiling below the draft (max-height none, block 30px, draft 60px) is written as the rendered size', () => {
	const w = world( { own: { 375: 60, 768: 60, 1440: 60 } } );
	const r = run( w, [ rowOf( { property: 'max-height', value: 'none', reason: 'shape: none cannot be held' } ) ] );
	assert.deepEqual( attrs( w ).maxHeight, { desktop: '60px' } );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'a floor at or under the draft, and a ceiling above it, write nothing and settle the row', () => {
	const w = world( { own: { 375: 60, 768: 60, 1440: 60 } } );
	const r = run( w, [ rowOf( { property: 'min-height', value: 'auto' } ), rowOf( { property: 'max-height', value: 'none' } ) ], { calFor: () => ( { elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( x ) => [ x, { 'min-height': '48px', 'max-height': '200px' } ] ) ) } } ) } );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( r.writes, [] );
} );

test( 'a floor that is unknown (no calibrated paint) stays a row, with the reason', () => {
	const w = world( { block: 'sgs/bar' } );
	const r = run( w, [ rowOf( { block: 'sgs/bar', property: 'min-height', value: 'auto' } ) ], { calFor: () => null } );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /dimension: .*unproven/ );
} );

test( 'MUST FAIL WITHOUT THE PER-TIER FLOOR: the floor contradicts at 375 only, so each width gets its own rendered size', () => {
	const w = world( { own: { 375: 34, 768: 60, 1440: 72 } } );
	run( w, [ rowOf( { property: 'min-height', value: 'auto' } ) ] );
	assert.deepEqual( attrs( w ).minHeight, { desktop: '72px', tablet: '60px', mobile: '34px' } );
} );

test( 'MUST FAIL WITHOUT THE DECLARED HEIGHT RULE: a declared height whose content fits is the minimum height, per tier', () => {
	const w = world( { block: 'sgs/bar', own: { 375: 72, 768: 72, 1440: 84 }, kids: [ { 375: 30, 768: 30, 1440: 30 } ], declared: { height: '72px' }, tag: 'div' } );
	w.reads.declared[ 1440 ][ '0:' ] = { height: '84px' };
	const r = run( w, [ rowOf( { block: 'sgs/bar', property: 'height', value: '{"375":"72px","768":"72px","1440":"84px"}', reason: 'no-setting: sgs/bar has no setting for height' } ) ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( attrs( w ).minHeight, { desktop: '84px', tablet: '72px' } );
	assert.deepEqual( calls.at( -1 ).prop, 'min-height' );
} );

test( 'MUST FAIL WITHOUT THE OVERFLOW GUARD: a declared height under taller content is not written and is raised with the reason', () => {
	const w = world( { block: 'sgs/bar', own: { 375: 46, 768: 46, 1440: 46 }, kids: [ { 375: 90, 768: 90, 1440: 90 } ], declared: { height: '46px' }, tag: 'div' } );
	const r = run( w, [ rowOf( { block: 'sgs/bar', property: 'height', value: '46px', reason: 'no-setting: sgs/bar has no setting for height' } ) ] );
	assert.deepEqual( attrs( w ), {} );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /the content is 90px at 375, 90px at 768, 90px at 1440 against a declared height of 46px/ );
} );

test( 'MUST FAIL WITHOUT THE WIDTH FORM: a declared width goes to the minimum width when the content fits', () => {
	const w = world( { block: 'sgs/bar', axis: 'w', own: { 375: 120, 768: 120, 1440: 120 }, kids: [ { 375: 60, 768: 60, 1440: 60 } ], declared: { width: '120px' }, tag: 'div' } );
	run( w, [ rowOf( { block: 'sgs/bar', property: 'width', value: '120px', reason: 'no-setting: sgs/bar has no setting for width' } ) ] );
	assert.deepEqual( attrs( w ).minWidth, { desktop: '120px' } );
} );

test( 'MUST FAIL WITHOUT AUTO: height auto and width auto check the block\'s minimum in their dimension', () => {
	const w = world( { axis: 'w', own: { 375: 60, 768: 60, 1440: 60 } } );
	const r = run( w, [ rowOf( { property: 'width', value: 'auto' } ) ] );
	assert.deepEqual( attrs( w ).minWidth, { desktop: '60px' }, 'the block paints min-width 100px over a 60px draft' );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'MUST FAIL WITHOUT THE TOUCH-TARGET GUARD: an interactive element under 24px is written as 24px with a touch-target ledger entry; a non-interactive one is matched exactly', () => {
	const w = world( { own: { 375: 20, 768: 20, 1440: 20 } } );
	const r = run( w, [ rowOf( { property: 'min-height', value: 'auto' } ) ] );
	assert.deepEqual( attrs( w ).minHeight, { desktop: '24px' } );
	assert.equal( r.ledger.length, 1 );
	assert.equal( r.ledger[ 0 ].expected.rule, 'touch-target' );
	assert.deepEqual( r.ledger[ 0 ].widths, [ 375, 768, 1440 ] );
	assert.equal( validate( r.ledger ), true );
	assert.match( r.notes[ 0 ], /raised to 24px \(touch target\)/ );
	const plain = world( { own: { 375: 20, 768: 20, 1440: 20 }, tag: 'div' } );
	const r2 = run( plain, [ rowOf( { property: 'min-height', value: 'auto' } ) ] );
	assert.deepEqual( attrs( plain ).minHeight, { desktop: '20px' } );
	assert.deepEqual( r2.ledger, [] );
	const exactly = world( { own: { 375: 24, 768: 24, 1440: 24 } } );
	assert.deepEqual( run( exactly, [ rowOf( { property: 'min-height', value: 'auto' } ) ] ).ledger, [], '24px itself is not raised' );
} );

test( 'a block with no setting for the minimum keeps the row and names the missing framework setting', () => {
	const w = world( { block: 'sgs/plain' } );
	const r = run( w, [ rowOf( { block: 'sgs/plain', property: 'min-height', value: 'auto' } ) ] );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /a framework setting is needed/ );
} );

test( 'rows of other properties, other gap kinds and state rows are untouched', () => {
	const w = world( {} );
	const rows = [ rowOf( { property: 'color', value: 'red' } ), rowOf( { property: 'min-height', value: 'auto', reason: 'conflict: x' } ), rowOf( { property: 'min-height', value: 'auto', state: 'hover' } ) ];
	assert.deepEqual( run( w, rows ).unmapped, rows );
} );

test( 'MUST FAIL WITHOUT THE STYLESHEET FLOOR: with no calibration, the button\'s own min-height 48px (src/blocks/button/style.css) is the floor a 34px draft contradicts', () => {
	const w = world( {} );
	const r = run( w, [ rowOf( { property: 'min-height', value: 'auto' } ) ], { calFor: () => null } );
	assert.deepEqual( attrs( w ).minHeight, { desktop: '34px' } );
	assert.deepEqual( r.unmapped, [] );
} );
