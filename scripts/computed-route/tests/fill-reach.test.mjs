// Fill's reach (lib/fill-resolve-state.mjs::alternateSlots, ::mergedRadius, lib/fill-resolve-element.mjs::checksRan,
// lib/fill-prop.mjs::notPainted, lib/resolve.mjs::ownElementSetting): a box or paint property tries the slots the block's
// calibration ties it to, four equal radii are read as one, a `no-setting` row records the checks that ran, an undeclared
// 0s transition duration paints nothing, and a tie between an element's setting and a part's setting breaks on the DB slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { alternateSlots, mergedRadius, RADIUS_CORNERS } from '../lib/fill-resolve-state.mjs';
import { notPainted } from '../lib/fill-prop.mjs';
import { ownElementSetting, resolve } from '../lib/resolve.mjs';
import { candidates, openDb } from '../lib/db.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

const db = openDb();
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const snapshot = { palette: [ { slug: 'primary', colour: { r: 10, g: 126, b: 168, a: 1 } } ], spacing: [], fontSizes: [] };

const box = ( w, h ) => Object.fromEntries( THREE.map( ( x ) => [ x, { width: `${ w }px`, height: `${ h }px` } ] ) );
const cal = { elements: { '': box( 40, 40 ), '.sgs-icon__shape': box( 40, 40 ), '.sgs-icon__link > .sgs-icon__shape': box( 40, 40 ), '.sgs-x__overlay': box( 400, 300 ), '.sgs-glyph': box( 20, 20 ) }, settings: {
	backgroundColour: { property: 'background-color', slot: '::after', slots: [ '::after' ] },
	borderRadius: { property: 'border-radius', slot: '.sgs-icon__shape', slots: [ '.sgs-icon__shape', '.sgs-icon__link > .sgs-icon__shape' ] },
	childBackground: { property: 'background-color', slot: '.sgs-button:nth-of-type(1)' },
	hoverBackground: { property: 'background-color', slot: '.sgs-hover', state: 'hover' },
	padding: { property: 'padding', slot: '' },
	partPadding: { property: 'padding', slot: '.sgs-icon__shape' },
	iconSize: { property: 'width', slot: '.sgs-glyph' },
	overlayColour: { property: 'background-color', slot: '.sgs-x__overlay' },
} };

test( 'MUST FAIL: a paint property tries the slot the block\'s calibration ties it to', () => {
	assert.deepEqual( alternateSlots( cal, 'background-color', {}, [ '' ] ), [ '::after' ] );
	assert.deepEqual( alternateSlots( cal, 'border-top-left-radius', {}, [ '' ] ), [ '.sgs-icon__shape', '.sgs-icon__link > .sgs-icon__shape' ] );
} );

test( 'negative control: a slot another target reads, a nested block, a state, another box or a non-paint property offers nothing', () => {
	assert.deepEqual( alternateSlots( cal, 'border-radius', {}, [ '', '.sgs-icon__shape', '.sgs-icon__link > .sgs-icon__shape' ] ), [], 'another target reads the shape: its own reading finds the setting' );
	assert.ok( ! alternateSlots( cal, 'background-color', {}, [ '' ] ).includes( '.sgs-button:nth-of-type(1)' ) );
	assert.ok( ! alternateSlots( cal, 'background-color', {}, [ '' ] ).includes( '.sgs-hover' ), 'a state setting is not the resting paint' );
	assert.ok( ! alternateSlots( cal, 'background-color', {}, [ '' ] ).includes( '.sgs-x__overlay' ), 'an overlay is a different box from the element' );
	assert.deepEqual( alternateSlots( cal, 'padding', {}, [ '' ] ), [], 'padding is not a paint property: it never moves to a part' );
	assert.deepEqual( alternateSlots( cal, 'width', {}, [ '' ] ), [], 'a size is not a paint property' );
	assert.deepEqual( alternateSlots( cal, 'background-color' ), [], 'a caller that names no other targets widens only carried properties' );
	assert.deepEqual( alternateSlots( { settings: { fontSize: { property: 'font-size', slot: '.sgs-x__part' } } }, 'font-size' ), [ '.sgs-x__part' ], 'a carried property is widened as before' );
} );

test( 'MUST FAIL: four equal corner radii are one border-radius; any difference or gap keeps them apart', () => {
	const four = ( v ) => Object.fromEntries( RADIUS_CORNERS.map( ( p ) => [ p, v ] ) );
	assert.deepEqual( mergedRadius( four( { 1440: '50%', 375: '50%' } ) ), { 1440: '50%', 375: '50%' } );
	assert.equal( mergedRadius( { ...four( { 1440: '50%' } ), 'border-top-left-radius': { 1440: '8px' } } ), null );
	assert.equal( mergedRadius( { ...four( { 1440: '50%' } ), 'border-top-left-radius': { 1440: '50%', 375: '50%' } } ), null, 'a corner stated at another set of widths' );
	assert.equal( mergedRadius( { 'border-top-left-radius': { 1440: '50%' } } ), null );
	assert.equal( mergedRadius( {} ), null );
} );

test( 'MUST FAIL: an undeclared 0s transition duration paints nothing; a declared one, an unknown declaration and a non-zero one do', () => {
	const none = { 'transition-duration': '0s' };
	assert.equal( notPainted( 'transition-duration', none, null, {} ), true );
	assert.equal( notPainted( 'transition-duration', { 'transition-duration': '0s, 0s' }, null, {} ), true );
	assert.equal( notPainted( 'transition-duration', none, null, { 'transition-duration': '0s' } ), false, 'the draft declares it' );
	assert.equal( notPainted( 'transition-duration', none, null, null ), false, 'the declared read failed: never judged' );
	assert.equal( notPainted( 'transition-duration', none ), false );
	assert.equal( notPainted( 'transition-duration', { 'transition-duration': '0.18s' }, null, {} ), false );
	assert.equal( notPainted( 'transition-duration', { 'transition-duration': '0s, 0.18s' }, null, {} ), false );
	assert.equal( notPainted( 'transition-delay', none, null, null ), true, 'delay stays inert at a 0s duration' );
} );

test( 'MUST FAIL: a container height tie breaks to the element\'s own setting over a part\'s; a gradient tie stays ambiguous', () => {
	const rows = candidates( db, 'sgs/container', 'min-height', null );
	assert.deepEqual( ownElementSetting( db, 'sgs/container', rows ).map( ( r ) => r.attr_name ), [ 'minHeight' ] );
	const calibration = { settings: { minHeight: { slot: '', slots: [ '' ], property: 'min-height' }, bgSvgMinHeight: { slot: '', slots: [ '' ], property: 'min-height' } } };
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'min-height', perWidth: { 375: '300px', 768: '300px', 1440: '300px' } }, { db, snapshot, calibration } );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'minHeight' ] );
	const gradients = candidates( db, 'sgs/container', 'background-image', 'hover' ).filter( ( g ) => /^(backgroundColourHoverGradient|textColourHoverGradient)$/.test( g.attr_name ) );
	assert.equal( gradients.length, 2, 'the hover gradient pair exists' );
	assert.equal( ownElementSetting( db, 'sgs/container', gradients ).length, 2, 'neither is a part: nothing breaks' );
	assert.equal( ownElementSetting( db, 'sgs/container', rows.slice( 0, 1 ) ).length, 1 );
} );

const CAL_LABEL = { 'sgs/label': { block: 'sgs/label', elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...DEFAULT, 'background-color': 'rgba(0, 0, 0, 0)' } ] ) ) },
	settings: { backgroundColour: { property: 'background-color', slot: '::after', slots: [ '::after' ], forms: [ 'hex', 'slug' ], reachedAt: THREE } }, discovered: {} } };

function run( name, styles, declared = {} ) {
	const skeleton = [ { name, draftRef: '.a', attributes: { text: 'A' } } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } } ] ) );
	return fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': declared } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot, calFor: ( b ) => CAL_LABEL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}

test( 'MUST FAIL: a label\'s root background is written to the setting that paints its ::after layer', () => {
	const out = run( 'sgs/label', { 'background-color': 'rgb(10, 126, 168)' } );
	const w = out.writes.find( ( x ) => 'background-color' === x.prop );
	assert.ok( w, JSON.stringify( out.unmapped.filter( ( u ) => 'background-color' === u.property ) ) );
	assert.equal( w.attr, 'backgroundColour' );
	assert.equal( w.after, 'primary' );
} );

test( 'MUST FAIL: a no-setting row records the checks that ran and lists the ancestor hop as unchecked', () => {
	const out = run( 'sgs/label', { 'text-indent': '24px' }, { 'text-indent': '24px' } );
	const row = out.unmapped.find( ( u ) => 'text-indent' === u.property );
	assert.ok( row && row.reason.startsWith( 'no-setting' ), JSON.stringify( out.unmapped.map( ( u ) => [ u.property, u.reason.slice( 0, 60 ) ] ) ) );
	assert.deepEqual( row.checks, [ 'own-slot', 'calibrated-slots', 'equivalence' ] );
	assert.deepEqual( row.unchecked, [ 'ancestor' ] );
} );

test( 'MUST FAIL: an element that declares no transition has no 0s duration row', () => {
	const undeclared = run( 'sgs/label', { 'transition-duration': '0s' } );
	assert.ok( ! undeclared.unmapped.some( ( u ) => 'transition-duration' === u.property ) );
	assert.equal( undeclared.settled.filter( ( s ) => 'transition-duration' === s.property && 'not-painted' === s.reason ).length, THREE.length );
} );
