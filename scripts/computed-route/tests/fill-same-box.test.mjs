// Same-box routing (lib/fill-same-box.mjs, Spec 48 FR-48-8, FR-48-50): a block's root and its content band are one box in the
// draft. A size declared on the inner element goes to the root's setting (with the root's padding and border added); a layout
// keyword whose setting paints the content band is written there; a keyword a per-device setting's object shape cannot take is
// written per device, including the device default that differs from the draft; a block default that already does what the
// draft does writes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthLadderWrites, isLadderRow } from '../lib/fill-width-ladder.mjs';
import { dimensionWrites } from '../lib/fill-dimensions.mjs';
import { calSameBox, layoutHome, innerToRoot } from '../lib/fill-same-box.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const dbFile = fixtureDb( {
	blocks: [ 'sgs/mb', 'sgs/ctr', 'sgs/hrow' ].map( ( slug ) => ( { slug, title: slug, category: 'sgs', type: 'dynamic' } ) ),
	block_attributes: [
		// A per-device keyword setting (a flex row's direction: an object, no enum), and a tier-shaped setting painting no property.
		{ block_slug: 'sgs/mb', attr_name: 'flexDirection', attr_type: 'object', css_property: 'flex-direction', css_element: 'wrapper', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
		{ block_slug: 'sgs/mb', attr_name: 'justifyContent', attr_type: 'object', css_property: 'justify-content', css_element: 'wrapper', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
		{ block_slug: 'sgs/mb', attr_name: 'mbSizing', attr_type: 'object', css_property: null, tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
		// A content-band block: its layout settings paint the band, its size setting the root.
		{ block_slug: 'sgs/ctr', attr_name: 'flexDirection', attr_type: 'string', css_property: 'flex-direction', css_element: 'inner', role: 'layout' },
		{ block_slug: 'sgs/ctr', attr_name: 'alignItems', attr_type: 'string', css_property: 'align-items', css_element: 'inner', role: 'layout' },
		{ block_slug: 'sgs/hrow', attr_name: 'minHeight', attr_type: 'object', css_property: 'min-height', css_element: 'wrapper', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
	],
} );
const db = openDb( dbFile );
const W = [ 375, 768, 1440 ];
const BAND = '.sgs-ctr__inner';

const box = ( h, w = 300 ) => ( { height: `${ h }px`, width: `${ w }px` } );
const calOf = ( elements, settings = {} ) => ( { elements, settings } );
const per = ( f ) => Object.fromEntries( W.map( ( w ) => [ w, f( w ) ] ) );

// A node (index 0) with one visible child; the draft reads each width.
function world( { block, targets = [ '' ], rects = {}, styles = {}, declared = {}, kid = true } ) {
	const flat = [ { name: block, attributes: {}, ref: 'n0' }, ...( kid ? [ { name: 'sgs/x', attributes: {}, ref: 'k0' } ] : [] ) ];
	const id = ( s ) => `0:${ s }`;
	const nodes = flat.map( ( n, index ) => ( { index, name: n.name, parent: index ? 0 : null, node: n, children: index ? [] : ( kid ? [ 1 ] : [] ),
		targets: index ? [ { id: '1:', index, slot: '', finder: 'x' } ] : targets.map( ( s ) => ( { id: id( s ), index: 0, slot: s, finder: 'x' } ) ) } ) );
	const widths = Object.fromEntries( W.map( ( w ) => [ w, {
		...Object.fromEntries( targets.map( ( s ) => [ id( s ), { rect: rects[ s ]?.[ w ] ?? { x: 0, y: 100, w: 300, h: 40 }, layoutDisplay: 'flex', styles: { display: 'flex', ...( styles[ s ] || {} ) } } ] ) ),
		...( kid ? { '1:': { rect: { x: 0, y: 100, w: 50, h: 30 }, inFlow: true, styles: {} } } : {} ),
	} ] ) );
	return { flat, nodes, reads: { widths, sweep: {}, declared: Object.fromEntries( W.map( ( w ) => [ w, Object.fromEntries( targets.map( ( s ) => [ id( s ), 'function' === typeof declared[ s ] ? declared[ s ]( w ) : declared[ s ] || {} ] ) ) ] ) ) }, refOf: ( n ) => n.ref };
}
const attrs = ( w ) => w.flat[ 0 ].attributes;

// The resolver stands in for the generic one: a string setting writes any single keyword or length; an object (per-device)
// setting holds no keyword ("cannot be held"), as the real one does. It records the slot it was asked at.
const asked = [];
const resolver = ( { block, prop, draft, slots } ) => {
	asked.push( { block, prop, slot: slots[ 0 ], draft } );
	const vals = [ ...new Set( Object.values( draft ) ) ];
	if ( 'sgs/hrow' === block ) {
		return 'min-height' === prop && '' === slots[ 0 ]
			? { status: 'written', writes: [ { attr: 'minHeight', value: Object.fromEntries( [ [ 1440, 'desktop' ], [ 768, 'tablet' ], [ 375, 'mobile' ] ].filter( ( [ w ] ) => undefined !== draft[ w ] ).map( ( [ w, t ] ) => [ t, draft[ w ] ] ) ), merge: 'deep' } ], included: draft }
			: { status: 'gap', gap: 'no-setting', detail: `no ${ prop } setting on ${ block } paints "${ slots[ 0 ] }" (candidates: minHeight)` };
	}
	if ( 'sgs/ctr' === block && slots[ 0 ] === BAND && 1 === vals.length ) {
		return { status: 'written', writes: [ { attr: { 'flex-direction': 'flexDirection', 'align-items': 'alignItems' }[ prop ], value: vals[ 0 ], merge: 'replace' } ], included: draft };
	}
	return { status: 'gap', gap: 'shape', detail: `${ vals[ 0 ] } cannot be held` };
};
const ladder = ( w, rows, cal ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor: () => cal, scope: 'header', resolver, date: '2026-10-23' } );
const dims = ( w, rows, cal ) => dimensionWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor: () => cal, scope: 'header', resolver, date: '2026-10-23' } );

test( 'calibration: two elements are one box when both axes match at every width; the same slot always does', () => {
	const same = calOf( { '': per( () => box( 51, 327 ) ), [ BAND ]: per( () => box( 51, 327 ) ), '.other': per( () => box( 20, 100 ) ) } );
	assert.equal( calSameBox( same, '', BAND ), true );
	assert.equal( calSameBox( same, '', '.other' ), false );
	assert.equal( calSameBox( same, '.other', '.other' ), true );
	assert.equal( calSameBox( calOf( { '': { 375: box( 51 ), 768: box( 51 ), 1440: box( 60 ) }, [ BAND ]: per( () => box( 51 ) ) } ), '', BAND ), false, 'one differing width is a different box' );
	assert.equal( calSameBox( null, '', BAND ), false );
} );

test( 'MUST FAIL WITHOUT THE LAYOUT HOME: a keyword whose setting paints the content band is asked at the band when the band is the root\'s box', () => {
	asked.length = 0;
	const cal = calOf( { '': per( () => box( 51 ) ), [ BAND ]: per( () => box( 51 ) ) }, { flexDirection: { slot: BAND, slots: [ BAND ] } } );
	assert.equal( layoutHome( { db, block: 'sgs/ctr', cal, prop: 'flex-direction', slot: '' } ), BAND );
	const w = world( { block: 'sgs/ctr' } );
	const r = ladder( w, [ { node: 'n0', block: 'sgs/ctr', slot: '', property: 'flex-direction', value: 'column', reason: 'no-setting: no flex-direction setting on sgs/ctr paints "" (candidates: flexDirection)' } ], cal );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( attrs( w ).flexDirection, 'column' );
	assert.equal( asked.at( -1 ).slot, BAND );
} );

test( 'MUST FAIL WITHOUT THE LAYOUT HOME: a per-width keyword with no setting at the root is a scoped rule on the band, never on the root', () => {
	const cal = calOf( { '': per( () => box( 51 ) ), [ BAND ]: per( () => box( 51 ) ) }, { alignItems: { slot: BAND, slots: [ BAND ] } } );
	const w = world( { block: 'sgs/ctr', targets: [ '' ] } );
	const r = ladder( w, [ { node: 'n0', block: 'sgs/ctr', slot: '', property: 'align-items', value: '{"375":"flex-end","768":"center"}', reason: 'no-setting: no align-items setting on sgs/ctr paints "" (candidates: alignItems)' } ], cal );
	assert.deepEqual( r.unmapped, [] );
	assert.match( attrs( w ).sgsCustomCss, /@media \(max-width: 767px\) \{ & \.sgs-ctr__inner \{ align-items: flex-end; \} \}/ );
	assert.doesNotMatch( attrs( w ).sgsCustomCss, /& \{/ );
	// A band that is a different box is not the root: the rule stays on the draft's own element.
	const apart = calOf( { '': per( () => box( 51, 327 ) ), [ BAND ]: per( () => box( 51, 300 ) ) }, { alignItems: { slot: BAND, slots: [ BAND ] } } );
	const w2 = world( { block: 'sgs/ctr' } );
	ladder( w2, [ { node: 'n0', block: 'sgs/ctr', slot: '', property: 'align-items', value: '{"375":"flex-end","768":"center"}', reason: 'no-setting: no align-items setting on sgs/ctr paints "" (candidates: alignItems)' } ], apart );
	assert.match( attrs( w2 ).sgsCustomCss, /& \{ align-items: flex-end; \}/ );
} );

const MB_CAL = calOf( { '': { 375: { 'flex-direction': 'column', 'justify-content': 'flex-start' }, 768: { 'flex-direction': 'row', 'justify-content': 'flex-start' }, 1440: { 'flex-direction': 'row', 'justify-content': 'flex-start' } } },
	{ flexDirection: { slot: '', slots: [ '' ] }, justifyContent: { slot: '', slots: [ '' ] } } );

test( 'MUST FAIL WITHOUT THE DEVICE DEFAULT: a draft row at every width is written on the device whose block default stacks (mobile column), not only on desktop', () => {
	const w = world( { block: 'sgs/mb' } );
	const r = ladder( w, [ { node: 'n0', block: 'sgs/mb', slot: '', property: 'flex-direction', value: 'row', reason: 'shape: row cannot be held' } ], MB_CAL );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( attrs( w ).flexDirection, { desktop: 'row', mobile: 'row' } );
	assert.equal( r.writes[ 0 ].how, 'width-ladder' );
} );

test( 'MUST FAIL WITHOUT THE DEFAULT-HELD RULE: a keyword the block\'s own default paint already does at every width writes nothing and settles the row', () => {
	const w = world( { block: 'sgs/mb' } );
	const r = ladder( w, [ { node: 'n0', block: 'sgs/mb', slot: '', property: 'justify-content', value: 'normal', reason: 'shape: normal cannot be held' } ], MB_CAL );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( r.writes, [] );
	assert.match( r.notes[ 0 ], /block's own default paint \(start at 375, start at 768, start at 1440\)/ );
	// A setting the node already carries is not the default: the row is left for the next pass.
	const w2 = world( { block: 'sgs/mb' } );
	w2.flat[ 0 ].attributes.justifyContent = { desktop: 'center' };
	assert.equal( ladder( w2, [ { node: 'n0', block: 'sgs/mb', slot: '', property: 'justify-content', value: 'normal', reason: 'shape: normal cannot be held' } ], MB_CAL ).unmapped.length, 1 );
	// A draft whose effect differs from the default at one width is written per device.
	const w3 = world( { block: 'sgs/mb' } );
	ladder( w3, [ { node: 'n0', block: 'sgs/mb', slot: '', property: 'justify-content', value: 'center', reason: 'shape: center cannot be held' } ], MB_CAL );
	assert.deepEqual( attrs( w3 ).justifyContent, { desktop: 'center', tablet: 'center', mobile: 'center' } );
} );

test( 'MUST FAIL WITHOUT THE SIZE EXCLUSION: a size keyword the ladder cannot hold is never a ladder row; layout keywords are', () => {
	assert.equal( isLadderRow( { property: 'max-width', reason: 'shape: none cannot be held' } ), false );
	assert.equal( isLadderRow( { property: 'min-block-size', reason: 'shape: auto cannot be held' } ), false );
	assert.equal( isLadderRow( { property: 'flex-direction', reason: 'shape: row cannot be held' } ), true );
	assert.equal( isLadderRow( { property: 'align-items', reason: 'no-setting: no align-items setting on sgs/ctr paints "" (candidates: alignItems)' } ), true );
	assert.equal( isLadderRow( { property: 'font-size', reason: 'no-setting: sgs/ctr has no setting for font-size' } ), false, 'a block with no setting at all is no ladder row' );
	const w = world( { block: 'sgs/mb' } );
	const r = ladder( w, [ { node: 'n0', block: 'sgs/mb', slot: '', property: 'max-width', value: 'none', reason: 'shape: none cannot be held' } ], MB_CAL );
	assert.equal( r.unmapped.length, 1 );
	assert.deepEqual( attrs( w ), {} );
} );

const ROW_CAL = calOf( { '': per( () => box( 25 ) ), '.inner': per( () => box( 25 ) ) } );
const rowRects = { '': { 375: { x: 0, y: 100, w: 375, h: 75 }, 768: { x: 0, y: 100, w: 768, h: 75 }, 1440: { x: 0, y: 100, w: 1440, h: 87 } }, '.inner': { 375: { x: 0, y: 100, w: 375, h: 72 }, 768: { x: 0, y: 100, w: 768, h: 72 }, 1440: { x: 0, y: 100, w: 1440, h: 84 } } };
const rowWorld = () => world( { block: 'sgs/hrow', targets: [ '', '.inner' ], rects: rowRects, styles: { '': { 'border-bottom-width': '3px' } }, declared: { '.inner': ( w ) => ( { height: 1440 === w ? '84px' : '72px' } ) } } );
const heightRow = { node: 'n0', block: 'sgs/hrow', slot: '.inner', property: 'height', value: '{"375":"72px","768":"72px","1440":"84px"}', reason: 'no-setting: sgs/hrow has no setting for height' };

test( 'MUST FAIL WITHOUT THE ROOT ROUTE: a height declared on the root\'s content box is the root\'s minimum, plus the root\'s own border', () => {
	asked.length = 0;
	const w = rowWorld();
	const r = dims( w, [ heightRow ], ROW_CAL );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( attrs( w ).minHeight, { desktop: '87px', tablet: '75px', mobile: '75px' } );
	assert.equal( asked.at( -1 ).slot, '' );
	assert.deepEqual( asked.at( -1 ).draft, { 375: '75px', 768: '75px', 1440: '87px' } );
	assert.match( r.notes[ 0 ], /written on the root/ );
	const probe = innerToRoot( { rec: w.nodes[ 0 ], target: w.nodes[ 0 ].targets[ 1 ], axis: 'h', reads: w.reads, cal: ROW_CAL } );
	assert.deepEqual( probe.extra, { 375: 3, 768: 3, 1440: 3 } );
} );

test( 'MUST FAIL WITHOUT THE SAME-BOX GATE: an inner element calibration measures as another box, or one that does not fill the root, is not the root\'s size', () => {
	const apart = calOf( { '': per( () => box( 25 ) ), '.inner': per( () => box( 10 ) ) } );
	const r = dims( rowWorld(), [ heightRow ], apart );
	assert.match( r.unmapped[ 0 ].reason, /dimension: the block has no setting that holds min-height 72px \/ 72px \/ 84px/ );
	// The draft's inner fills only part of the root (a 20px strip of other content): not the root's content box.
	const part = world( { block: 'sgs/hrow', targets: [ '', '.inner' ], rects: { ...rowRects, '': { 375: { x: 0, y: 100, w: 375, h: 95 }, 768: { x: 0, y: 100, w: 768, h: 95 }, 1440: { x: 0, y: 100, w: 1440, h: 107 } } }, styles: { '': { 'border-bottom-width': '3px' } }, declared: { '.inner': ( w ) => ( { height: 1440 === w ? '84px' : '72px' } ) } } );
	assert.equal( dims( part, [ heightRow ], ROW_CAL ).unmapped.length, 1 );
	assert.deepEqual( attrs( part ), {} );
} );
