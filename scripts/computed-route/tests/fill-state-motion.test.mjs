// A hover transform the draft's state look shows is the block's sgsMotion hover layer for every block whose motion
// support is declared, by the same path the inventory's hover records take (lib/fill-state-motion.mjs). Real case: the
// four generated social icons' `scale(1.15) translateY(-3px) rotate(-8deg)` hover was raised as "no setting for
// transform (hover)" while sgs/button's hover reached sgsMotion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { fillStates, stateDrafts } from '../lib/fill-state.mjs';
import { stateMotionRecords, stateHover, splitList, withStateHover } from '../lib/fill-state-motion.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/icon': [], 'sgs/card': [] } ) ) );
const HOVER = 'scale(1.15) translateY(-3px) rotate(-8deg)';
const MATRIX = 'matrix(1.13881, -0.160049, 0.160049, 1.13881, 0, -3.45)';
const TIMING = { 'transition-property': 'box-shadow, transform', 'transition-duration': '0.25s, 0.35s', 'transition-timing-function': 'ease, cubic-bezier(.34, 1.56, .64, 1)' };

function reads( id, { declared = HOVER, states = [ 'hover' ], timing = TIMING } = {} ) {
	const w = {};
	const looks = { looks: { [ id ]: [ { states, declared: { transform: declared }, rendered: { transform: MATRIX }, read: 'entered' } ] } };
	return { widths: { 375: { [ id ]: { styles: timing } }, 768: { [ id ]: { styles: timing } }, 1440: { [ id ]: { styles: timing } } }, declared: { 375: { [ id ]: timing }, 768: { [ id ]: timing }, 1440: { [ id ]: timing } }, states: { 375: looks, 768: looks, 1440: looks }, w };
}
const run = ( block, r ) => {
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: '.row a.ig' } ] } ];
	const flat = [ { name: block, attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [], mdb, schema, rawSnapshot: { settings: { custom: {} } }, reads: r } );
	return { out, flat };
};

for ( const block of [ 'sgs/icon', 'sgs/card' ] ) {
	test( `MUST FAIL: ${ block } takes a hover transform from the state look as its sgsMotion hover layer`, () => {
		const { flat, out } = run( block, reads( '0:' ) );
		const v = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state?.values;
		assert.ok( v, JSON.stringify( out.unmapped ) );
		assert.equal( v.scale, 1.15 );
		assert.equal( v.duration, 350, 'the transform\'s own duration, not the shadow\'s' );
		assert.match( String( v.easing ), /cubic-bezier|spring|emphasised|token/ );
	} );
}

test( 'MUST FAIL: a block with no motion support is not given a motion layer, and its state pass still raises the transform', () => {
	const { flat, out } = run( 'sgs/text', reads( '0:' ) );
	assert.equal( flat[ 0 ].attributes.sgsMotion, undefined );
	assert.equal( out.writes.length, 0 );
} );

test( 'MUST FAIL: the state pass leaves a hover transform to the motion layer on a motion block and raises it on any other', () => {
	const cal = { settings: {}, elements: { '': { 375: {}, 768: {}, 1440: {} } } };
	const call = ( block ) => fillStates( { tree: [ { name: block, attributes: {} } ], nodes: [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: 'a' } ] } ], reads: reads( '0:' ), calFor: () => cal, db: openDb( motionFixtureDb( { 'sgs/icon': [] } ) ), snapshot: { palette: [], spacing: [], fontSizes: [] } } );
	assert.ok( ! call( 'sgs/icon' ).unmapped.some( ( u ) => 'transform' === u.property ), 'handed to the motion layer' );
	assert.ok( call( 'sgs/text' ).unmapped.some( ( u ) => 'transform' === u.property ), 'raised where no motion layer exists' );
} );

test( 'a combined state, a pseudo-element look and a run-time value are not read as a hover transform', () => {
	assert.deepEqual( stateMotionRecords( reads( '0:', { states: [ 'hover', 'focus' ] } ), { id: '0:' } ), [] );
	assert.deepEqual( stateMotionRecords( reads( '0:', { declared: 'scale(var(--s))' } ), { id: '0:' } ), [] );
	assert.equal( stateMotionRecords( reads( '0:' ), { id: '0:' } ).length, 1 );
} );

test( 'a transition list splits outside parentheses', () => {
	assert.deepEqual( splitList( 'cubic-bezier(.34, 1.56, .64, 1), ease' ), [ 'cubic-bezier(.34, 1.56, .64, 1)', 'ease' ] );
	assert.equal( typeof stateDrafts, 'function' );
} );

const perWidth = ( id, byWidth, timing = { 375: TIMING, 768: TIMING, 1440: TIMING } ) => {
	const states = {};
	for ( const w of [ 375, 768, 1440 ] ) {
		const t = byWidth[ w ];
		states[ w ] = { looks: { [ id ]: t ? [ { states: [ 'hover' ], declared: { transform: t }, rendered: { transform: MATRIX }, read: 'entered' } ] : [] } };
	}
	return { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { [ id ]: { styles: timing[ w ] } } ] ) ), declared: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { [ id ]: timing[ w ] } ] ) ), states };
};

test( 'MUST FAIL: a var() hover transform on a motion block is raised with its reason, not dropped', () => {
	const cal = { settings: {}, elements: { '': { 375: {}, 768: {}, 1440: {} } } };
	const r = perWidth( '0:', { 375: 'scale(var(--s))', 768: 'scale(var(--s))', 1440: 'scale(var(--s))' } );
	const out = fillStates( { tree: [ { name: 'sgs/icon', attributes: {} } ], nodes: [ { index: 0, name: 'sgs/icon', targets: [ { id: '0:', slot: '', finder: 'a' } ] } ], reads: r, calFor: () => cal, db: openDb( motionFixtureDb( { 'sgs/icon': [] } ) ), snapshot: { palette: [], spacing: [], fontSizes: [] } } );
	assert.ok( out.unmapped.some( ( u ) => 'transform' === u.property && ! /^hover-motion/.test( u.reason ) ), JSON.stringify( out.unmapped ) );
} );

test( 'MUST FAIL: a width whose hover transform holds a var() is raised while the other widths still reach the motion layer', () => {
	const cal = { settings: {}, elements: { '': { 375: {}, 768: {}, 1440: {} } } };
	const r = perWidth( '0:', { 375: 'scale(var(--s))', 768: 'scale(1.15)', 1440: 'scale(1.15)' } );
	const out = fillStates( { tree: [ { name: 'sgs/icon', attributes: {} } ], nodes: [ { index: 0, name: 'sgs/icon', targets: [ { id: '0:', slot: '', finder: 'a' } ] } ], reads: r, calFor: () => cal, db: openDb( motionFixtureDb( { 'sgs/icon': [] } ) ), snapshot: { palette: [], spacing: [], fontSizes: [] } } );
	assert.ok( out.unmapped.some( ( u ) => 'transform' === u.property && /375px/.test( u.reason ) ), JSON.stringify( out.unmapped ) );
	assert.equal( run( 'sgs/icon', r ).flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state?.values?.scale, 1.15 );
} );

test( 'MUST FAIL: a hover that differs by width is held per device, not collapsed to the first width read', () => {
	const { flat, out } = run( 'sgs/icon', perWidth( '0:', { 375: 'scale(1.05)', 768: 'scale(1.1)', 1440: 'scale(1.15)' } ) );
	const hover = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state;
	assert.equal( hover?.values?.scale, 1.15, JSON.stringify( out.unmapped ) );
	assert.equal( hover.devices?.tablet?.scale, 1.1 );
	assert.equal( hover.devices?.mobile?.scale, 1.05 );
} );

test( 'MUST FAIL: a width with no hover transform takes the neutral pose on its device', () => {
	const { flat } = run( 'sgs/icon', perWidth( '0:', { 375: null, 768: 'scale(1.15)', 1440: 'scale(1.15)' } ) );
	const hover = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state;
	assert.equal( hover?.devices?.mobile?.scale, 1 );
	assert.equal( hover?.devices?.tablet, undefined );
} );

test( 'MUST FAIL: an easing that differs by width is raised, since the hover layer holds one easing', () => {
	const other = { ...TIMING, 'transition-timing-function': 'ease, linear' };
	const { out } = run( 'sgs/icon', perWidth( '0:', { 375: 'scale(1.15)', 768: 'scale(1.15)', 1440: 'scale(1.15)' }, { 375: other, 768: TIMING, 1440: TIMING } ) );
	assert.ok( out.unmapped.some( ( u ) => /holds easing for all devices/.test( u.reason ) ), JSON.stringify( out.unmapped ) );
} );

// A hover that moves an element's start padding is the hover layer's `indent`, the delta from the resting padding
// (Spec 38A §5.1). Real case: the Indus numbered rows (6px at rest, 16px on hover) and mega-panel links (6px to 12px).
const padReads = ( id, { rest = '6px', hover = '16px', restKey = 'padding-left', hoverKey = 'padding-left', by = {} } = {} ) => {
	const looks = ( w ) => ( { looks: { [ id ]: [ { states: [ 'hover' ], declared: { [ hoverKey ]: by[ w ] ?? hover }, rendered: { [ hoverKey ]: by[ w ] ?? hover }, read: 'entered' } ] } } );
	const timing = { 'transition-property': 'padding-left', 'transition-duration': '0.2s', 'transition-timing-function': 'ease' };
	const dec = { ...timing, ...( null === rest ? {} : { [ restKey ]: rest } ) };
	return { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { [ id ]: { styles: { ...timing, 'padding-left': rest ?? '0px' } } } ] ) ), declared: { 375: { [ id ]: dec }, 768: { [ id ]: dec }, 1440: { [ id ]: dec } }, states: { 375: looks( 375 ), 768: looks( 768 ), 1440: looks( 1440 ) } };
};

for ( const block of [ 'sgs/icon', 'sgs/card' ] ) {
	test( `MUST FAIL: ${ block } takes a hover start-padding change as the hover layer's indent, the delta from the resting padding`, () => {
		const { flat, out } = run( block, padReads( '0:' ) );
		const v = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state?.values;
		assert.ok( v, JSON.stringify( out.unmapped ) );
		assert.equal( v.indent, 10 );
		assert.equal( v.duration, 200, 'the padding\'s own duration' );
	} );
}

test( 'MUST FAIL: the resting padding is read from the element, a missing declaration falling back to its rendered padding', () => {
	assert.equal( run( 'sgs/icon', padReads( '0:', { rest: '6px', hover: '12px' } ) ).flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values.indent, 6 );
	assert.equal( run( 'sgs/icon', padReads( '0:', { rest: null, hover: '12px' } ) ).flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values.indent, 12 );
} );

test( 'MUST FAIL: padding-inline-start is the same indent, and a delta of 0 writes nothing', () => {
	assert.equal( run( 'sgs/icon', padReads( '0:', { hoverKey: 'padding-inline-start', restKey: 'padding-inline-start' } ) ).flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values.indent, 10 );
	assert.deepEqual( stateMotionRecords( padReads( '0:', { rest: '16px', hover: '16px' } ), { id: '0:' } ), [] );
} );

test( 'MUST FAIL: a start-padding hover that is not a px length is raised with its reason, never guessed', () => {
	const r = padReads( '0:', { hover: 'calc(1em + 2px)' } );
	assert.deepEqual( stateMotionRecords( r, { id: '0:' } ), [] );
	assert.match( stateHover( r, { id: '0:' } ).gaps[ 0 ], /padding-left/ );
} );

test( 'MUST FAIL: a start-padding hover that differs by width is held per device', () => {
	const { flat } = run( 'sgs/icon', padReads( '0:', { by: { 375: '8px' } } ) );
	const hover = flat[ 0 ].attributes.sgsMotion.elements.root.hover.state;
	assert.equal( hover.values.indent, 10 );
	assert.equal( hover.devices?.mobile?.indent, 2 );
} );

test( 'MUST FAIL: a transform and a start-padding hover on one element share one hover layer', () => {
	const r = reads( '0:' );
	const p = padReads( '0:' );
	const merged = { ...r, declared: p.declared, states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: { '0:': [ { ...r.states[ w ].looks[ '0:' ][ 0 ], declared: { transform: HOVER, 'padding-left': '16px' } } ] } } ] ) ), widths: { 375: { '0:': { styles: { ...TIMING, 'padding-left': '6px' } } }, 768: { '0:': { styles: { ...TIMING, 'padding-left': '6px' } } }, 1440: { '0:': { styles: { ...TIMING, 'padding-left': '6px' } } } } };
	merged.declared = { 375: { '0:': { ...TIMING, 'padding-left': '6px' } }, 768: { '0:': { ...TIMING, 'padding-left': '6px' } }, 1440: { '0:': { ...TIMING, 'padding-left': '6px' } } };
	const v = run( 'sgs/icon', merged ).flat[ 0 ].attributes.sgsMotion.elements.root.hover.state.values;
	assert.equal( v.scale, 1.15 );
	assert.equal( v.indent, 10 );
} );

test( 'MUST FAIL: the state pass leaves a start-padding hover to the motion layer on a motion block and raises it on any other', () => {
	const cal = { settings: {}, elements: { '': { 375: {}, 768: {}, 1440: {} } } };
	const call = ( block ) => fillStates( { tree: [ { name: block, attributes: {} } ], nodes: [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: 'a' } ] } ], reads: padReads( '0:' ), calFor: () => cal, db: openDb( motionFixtureDb( { 'sgs/icon': [] } ) ), snapshot: { palette: [], spacing: [], fontSizes: [] } } );
	assert.ok( ! call( 'sgs/icon' ).unmapped.some( ( u ) => 'padding-left' === u.property ), 'handed to the motion layer' );
	assert.ok( call( 'sgs/text' ).unmapped.some( ( u ) => 'padding-left' === u.property ), 'raised where no motion layer exists' );
} );

// The draft's `style-hover="padding-left:16px"` names only the hover value, so the inventory's record has no resting
// value; the indent is the delta from the element's own resting padding (6px here), not the 16px itself.
const hoverRecord = ( from ) => ( { id: 'TR', mechanism: 'css-transition', status: 'active', group: 'hover', element: { dc: 'Site', template_tpl_id: '10' }, trigger: { type: 'hover' }, properties: [ { property: 'padding-left', from, to: '16px', duration_ms: 250, delay_ms: 0, easing: 'ease-out' } ], duration_ms: 250, delay_ms: 0, easing: 'ease-out' } );
const runRecord = ( block, record, r ) => {
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: { tpl: 'Site/10#0' } } ] } ];
	const flat = [ { name: block, attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [ record ], mdb, schema, rawSnapshot: { settings: { custom: {} } }, reads: r } );
	return { out, v: flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state?.values };
};

test( 'MUST FAIL: an inventory hover padding with no resting value takes the element\'s resting padding, so the indent is the delta', () => {
	const { v, out } = runRecord( 'sgs/card', hoverRecord( null ), padReads( '0:' ) );
	assert.ok( v, JSON.stringify( out.unmapped ) );
	assert.equal( v.indent, 10 );
} );

test( 'a record that names its own resting padding, or an element whose resting padding is not px, is left as it is', () => {
	assert.equal( runRecord( 'sgs/card', hoverRecord( '4px' ), padReads( '0:' ) ).v.indent, 12 );
	assert.equal( runRecord( 'sgs/card', hoverRecord( null ), padReads( '0:', { rest: '1em' } ) ).v.indent, 16 );
} );

test( 'MUST FAIL: an inventory hover record that already has tiers is merged with the state read tiers, never replaces them', () => {
	const rec = ( properties, tiers ) => ( { id: 'R', trigger: { type: 'hover' }, properties, ...( tiers ? { tiers } : {} ) } );
	const tf = ( to ) => ( { property: 'transform', from: null, to } );
	const pad = ( to ) => ( { property: 'padding-left', from: '0px', to } );
	const own = [ rec( [ tf( 'scale(1.1)' ) ], { mobile: rec( [ tf( 'scale(1.05)' ) ] ) } ) ];
	const state = [ rec( [ pad( '16px' ) ], { tablet: rec( [ pad( '8px' ) ] ), mobile: null } ) ];
	const [ merged ] = withStateHover( own, state );
	assert.deepEqual( merged.properties.map( ( p ) => p.to ), [ 'scale(1.1)', '16px' ] );
	// The state's tablet indent is kept beside the inventory's base transform; the inventory's own mobile transform is kept and
	// the state read's mobile (no indent there) adds nothing to it.
	assert.deepEqual( merged.tiers.tablet.properties.map( ( p ) => p.to ), [ 'scale(1.1)', '8px' ] );
	assert.deepEqual( merged.tiers.mobile.properties.map( ( p ) => p.to ), [ 'scale(1.05)' ] );
	// Negative controls: no inventory tiers (the state's become the record's), and a state with no tiers leaves the inventory's.
	const bare = withStateHover( [ rec( [ tf( 'scale(1.1)' ) ] ) ], state )[ 0 ];
	assert.deepEqual( bare.tiers.tablet.properties.map( ( p ) => p.to ), [ 'scale(1.1)', '8px' ] );
	assert.deepEqual( bare.tiers.mobile.properties.map( ( p ) => p.to ), [ 'scale(1.1)' ] );
	const none = withStateHover( own, [ rec( [ pad( '16px' ) ] ) ] )[ 0 ];
	assert.deepEqual( Object.keys( none.tiers ), [ 'mobile' ] );
	assert.deepEqual( none.tiers.mobile.properties.map( ( p ) => p.to ), [ 'scale(1.05)', '16px' ] );
} );

test( 'MUST FAIL: a padding-inline-start hover reads the transition entry and the resting value of the key it was asked for', () => {
	const rest = { 'padding-left': '4px', 'transition-property': 'opacity, padding-inline-start', 'transition-duration': '0.1s, 0.5s', 'transition-timing-function': 'ease, linear' };
	const at = { styles: { 'padding-left': '30px' } };
	const look = { states: [ 'hover' ], declared: { 'padding-inline-start': '16px' }, rendered: {}, read: 'entered' };
	const r = { widths: { 375: { '0:': at }, 768: { '0:': at }, 1440: { '0:': at } }, declared: { 375: { '0:': rest }, 768: { '0:': rest }, 1440: { '0:': rest } }, states: { 375: { looks: { '0:': [ look ] } }, 768: { looks: { '0:': [ look ] } }, 1440: { looks: { '0:': [ look ] } } } };
	const p = stateHover( r, { id: '0:' } ).base.properties[ 0 ];
	assert.deepEqual( [ p.from, p.to, p.duration_ms, p.easing ], [ '4px', '16px', 500, 'linear' ] );
	// A transition list naming the padding shorthand times the start-padding hover with that entry, not the first.
	const short = { ...rest, 'transition-property': 'opacity, padding', 'transition-duration': '0.1s, 0.7s' };
	const rs = { ...r, declared: { 375: { '0:': short }, 768: { '0:': short }, 1440: { '0:': short } } };
	assert.equal( stateHover( rs, { id: '0:' } ).base.properties[ 0 ].duration_ms, 700 );
} );
