// The header's scroll behaviours as settings (lib/fill-header-behaviour.mjs::applyHeaderBehaviour, called per target by
// lib/fill-motion.mjs::motionWrites; Spec 48 FR-48-77, register row C3): headerSticky from the computed position per tier,
// headerShrink and scrolledOffset from the header's height at rest and once scrolled, surfaceBlur from the resting backdrop
// blur. Each case plants the draft reads (lib/fill-read.mjs::readDraft's shape) and asserts the stored attributes on the tree
// node. The settings are checked against the blocks' own block.json files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { tierStates, blurOf, headerRootIds, isHeaderBlock } from '../lib/fill-header-behaviour.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const BLOCKS = path.join( HERE, '..', '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' );
const declared = ( block, attr ) => !! JSON.parse( fs.readFileSync( path.join( BLOCKS, block.split( '/' )[ 1 ], 'block.json' ), 'utf8' ) ).attributes?.[ attr ];
const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/site-header': [], 'sgs/container': [] } ) ) );

// The draft reads of one header root target ('0:') at the three read widths. at: { width: [ position, blur ] }; shrink: { width:
// [ rest height, scrolled height, scroll distance ] } (a width left out was not read scrolled); scrolledBlur: the backdrop-filter
// once scrolled.
const reads = ( { at = {}, shrink = {}, scrolledBlur = 'blur(16px)' } = {} ) => ( {
	widths: Object.fromEntries( Object.entries( at ).map( ( [ w, [ position, blur ] ] ) => [ w, { '0:': { position, styles: { 'backdrop-filter': blur } } } ] ) ),
	scrolled: Object.fromEntries( Object.entries( shrink ).map( ( [ w, [ rest, scrolled, from ] ] ) => [ w, { '0:': { rest: { height: rest, backdropFilter: 'blur(16px)', backgroundColor: 'rgba(250, 248, 245, 0.9)' }, scrolled: { height: scrolled, backdropFilter: scrolledBlur, backgroundColor: 'rgba(250, 248, 245, 0.9)' }, at: from } } ] ) ),
} );
const ALL = ( position, blur ) => ( { 375: [ position, blur ], 768: [ position, blur ], 1440: [ position, blur ] } );
const run = ( r, { block = 'sgs/site-header', slot = '', attributes = {}, has = declared } = {} ) => {
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot, finder: { tpl: 'Site/10#0' } } ] } ];
	const flat = [ { name: block, attributes: { ...attributes }, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [], mdb, schema, rawSnapshot: { settings: { custom: {} } }, stateVocab: [], hasAttr: has, reads: r } );
	return { attrs: flat[ 0 ].attributes, out, writes: out.writes.map( ( w ) => w.attr ), unmapped: out.unmapped.map( ( u ) => `${ u.property }: ${ u.reason }` ) };
};

test( 'MUST FAIL: a header pinned, shrinking and blurred in the draft is written as sticky, shrink, the scroll distance and the blur', () => {
	const { attrs, writes } = run( reads( { at: ALL( 'sticky', 'blur(16px)' ), shrink: { 375: [ 76, 64, 40 ], 768: [ 80, 64, 40 ], 1440: [ 88, 66, 40 ] } } ) );
	assert.deepEqual( attrs, { headerSticky: { desktop: 'on' }, headerShrink: { desktop: 'on' }, scrolledOffset: 40, surfaceBlur: '16px' } );
	assert.deepEqual( writes, [ 'headerSticky', 'headerShrink', 'scrolledOffset', 'surfaceBlur' ] );
} );

test( 'MUST FAIL: the pin follows the computed position at each tier: a tier that does not pin is off, a narrower tier that pins beneath it is on again', () => {
	const mobileStatic = run( reads( { at: { 375: [ 'static', 'none' ], 768: [ 'sticky', 'none' ], 1440: [ 'sticky', 'none' ] } } ) );
	assert.deepEqual( mobileStatic.attrs.headerSticky, { desktop: 'on', mobile: 'off' } );
	const desktopOnly = run( reads( { at: { 375: [ 'static', 'none' ], 768: [ 'static', 'none' ], 1440: [ 'fixed', 'none' ] } } ) );
	assert.deepEqual( desktopOnly.attrs.headerSticky, { desktop: 'on', tablet: 'off', mobile: 'off' } );
	const staticDesktop = run( reads( { at: { 375: [ 'sticky', 'none' ], 768: [ 'sticky', 'none' ], 1440: [ 'static', 'none' ] } } ) );
	assert.deepEqual( staticDesktop.attrs.headerSticky, { desktop: 'off', tablet: 'on' } );
} );

test( 'negative control: a header that pins at no tier writes no headerSticky, and a draft read with no position writes none', () => {
	assert.equal( run( reads( { at: ALL( 'static', 'none' ) } ) ).attrs.headerSticky, undefined );
	assert.equal( run( reads( { at: ALL( 'relative', 'none' ) } ) ).attrs.headerSticky, undefined );
	assert.equal( run( reads( { at: ALL( undefined, 'none' ) } ) ).attrs.headerSticky, undefined );
	assert.equal( run( { widths: {} } ).writes.length, 0 );
} );

test( 'MUST FAIL: the shrink is per tier, from the height drop; a drop under a pixel is rounding, not a shrink', () => {
	const some = run( reads( { shrink: { 375: [ 64, 64, 40 ], 768: [ 80, 64, 40 ], 1440: [ 88, 66, 40 ] } } ) );
	assert.deepEqual( some.attrs.headerShrink, { desktop: 'on', mobile: 'off' } );
	const rounding = run( reads( { shrink: { 375: [ 64, 63.5, 40 ], 768: [ 80, 79.2, 40 ], 1440: [ 88, 87.5, 40 ] } } ) );
	assert.equal( rounding.attrs.headerShrink, undefined );
	assert.equal( rounding.attrs.scrolledOffset, undefined, 'no shrink, no threshold' );
	const exact = run( reads( { shrink: { 1440: [ 88, 87, 12 ] } } ) );
	assert.deepEqual( exact.attrs.headerShrink, { desktop: 'on' }, 'a drop of one pixel is a shrink' );
	assert.equal( exact.attrs.scrolledOffset, 12 );
} );

test( 'negative control: a header whose height does not change on scroll, or a page that cannot scroll, writes no shrink', () => {
	assert.equal( run( reads( { shrink: { 375: [ 64, 64, null ], 768: [ 80, 80, null ], 1440: [ 88, 88, null ] } } ) ).attrs.headerShrink, undefined );
	assert.equal( run( reads( { shrink: {} } ) ).attrs.headerShrink, undefined );
	const taller = run( reads( { shrink: { 1440: [ 64, 90, 40 ] } } ) );
	assert.equal( taller.attrs.headerShrink, undefined, 'a header that grows is no shrink' );
} );

test( 'the scroll distance the code states (the scrolled shadow\'s scrolledOffset) is kept, not replaced by the probe\'s', () => {
	const r = run( reads( { shrink: { 1440: [ 88, 66, 40 ] } } ), { attributes: { scrolledOffset: 8 } } );
	assert.equal( r.attrs.scrolledOffset, 8 );
	assert.ok( ! r.writes.includes( 'scrolledOffset' ) );
} );

test( 'MUST FAIL: the blur is the resting backdrop blur, one length for every tier; a width that differs is raised, not written', () => {
	const r = run( reads( { at: { 375: [ 'static', 'none' ], 768: [ 'static', 'blur(8px)' ], 1440: [ 'static', 'blur(16px)' ] } } ) );
	assert.equal( r.attrs.surfaceBlur, '16px', 'the widest width stands' );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped.join( '\n' ), /none at 375, 8px at 768 differs from 16px at 1440/ );
	const uniform = run( reads( { at: ALL( 'static', 'blur(16px) saturate(1.2)' ) } ) );
	assert.equal( uniform.attrs.surfaceBlur, '16px' );
	assert.deepEqual( uniform.unmapped, [], 'one blur everywhere raises nothing' );
} );

test( 'a blur that appears only once scrolled has no setting: it is raised and surfaceBlur stays unset', () => {
	const r = run( reads( { at: ALL( 'static', 'none' ), shrink: { 1440: [ 88, 66, 40 ] }, scrolledBlur: 'blur(12px)' } ) );
	assert.equal( r.attrs.surfaceBlur, undefined );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ], /backdrop-filter: .*12px at 1440px\) only once the window has scrolled/ );
} );

test( 'negative control: no blur anywhere writes nothing and raises nothing; a blur of zero is none', () => {
	const none = run( reads( { at: ALL( 'static', 'none' ), shrink: { 1440: [ 88, 88, null ] }, scrolledBlur: 'none' } ) );
	assert.equal( none.attrs.surfaceBlur, undefined );
	assert.deepEqual( none.unmapped, [] );
	assert.equal( blurOf( 'blur(0px)' ), null );
	assert.equal( blurOf( 'saturate(1.4)' ), null );
	assert.equal( blurOf( 'blur(.5px)' ), '0.5px' );
	assert.equal( blurOf( undefined ), null );
} );

test( 'negative control: only a header block\'s root target is written: another block, a header part and a block without the settings write nothing', () => {
	const r = reads( { at: ALL( 'sticky', 'blur(16px)' ), shrink: { 1440: [ 88, 66, 40 ] } } );
	assert.deepEqual( run( r, { block: 'sgs/container' } ).writes, [] );
	assert.deepEqual( run( r, { slot: '.sgs-site-header__inner' } ).writes, [] );
	assert.deepEqual( run( r, { has: ( b, a ) => 'headerShrink' !== a && declared( b, a ) } ).writes, [], 'a block with no shrink setting is not a header' );
	assert.deepEqual( run( null ).writes, [] );
	const noBlur = run( r, { has: ( b, a ) => 'surfaceBlur' !== a && declared( b, a ) } );
	assert.ok( ! noBlur.writes.includes( 'surfaceBlur' ) && noBlur.writes.includes( 'headerSticky' ), 'a header with no blur setting still gets the others' );
} );

test( 'a value the node already holds is not written again', () => {
	const r = run( reads( { at: ALL( 'sticky', 'none' ) } ), { attributes: { headerSticky: { desktop: 'on' } } } );
	assert.deepEqual( r.writes, [] );
} );

test( 'tierStates: off where it does not hold, on at desktop, a narrower tier on only beneath one that is off; null when nothing holds', () => {
	assert.deepEqual( tierStates( { 375: true, 768: true, 1440: true } ), { desktop: 'on' } );
	assert.deepEqual( tierStates( { 375: false, 768: true, 1440: true } ), { desktop: 'on', mobile: 'off' } );
	assert.deepEqual( tierStates( { 375: true, 768: false, 1440: true } ), { desktop: 'on', tablet: 'off', mobile: 'on' } );
	assert.deepEqual( tierStates( { 768: true } ), { tablet: 'on' }, 'a width not read is left to inherit' );
	assert.equal( tierStates( { 375: false, 768: false, 1440: false } ), null );
	assert.equal( tierStates( {} ), null );
} );

test( 'headerRootIds and isHeaderBlock come from the block\'s declared settings, not its name', () => {
	const nodes = [ { name: 'sgs/site-header', targets: [ { id: 'a', slot: '' }, { id: 'b', slot: '.x' } ] }, { name: 'sgs/container', targets: [ { id: 'c', slot: '' } ] } ];
	assert.deepEqual( headerRootIds( nodes, declared ), [ 'a' ] );
	assert.equal( isHeaderBlock( 'sgs/site-header', declared ), true );
	assert.equal( isHeaderBlock( 'sgs/container', declared ), false );
	assert.equal( isHeaderBlock( 'sgs/site-header', undefined ), false );
	assert.deepEqual( headerRootIds( [ { name: 'sgs/some-header', targets: [ { id: 'z', slot: '' } ] } ], ( b, a ) => [ 'headerSticky', 'headerShrink' ].includes( a ) ), [ 'z' ], 'any block that declares the pair is a header' );
} );

test( 'negative control: a width with no position read inherits, a width the header is not drawn at is not described, and a drop with no known distance writes no threshold', () => {
	const gaps = run( reads( { at: { 375: [ undefined, 'none' ], 768: [ 'sticky', 'none' ], 1440: [ 'sticky', 'none' ] } } ) );
	assert.deepEqual( gaps.attrs.headerSticky, { desktop: 'on' }, 'a width with no position read is left to inherit, not off' );
	const absent = reads( { at: { 768: [ 'sticky', 'none' ], 1440: [ 'sticky', 'none' ] } } );
	absent.widths[ 375 ] = { '0:': { missing: true } };
	const note = run( absent ).out.notes.map( ( x ) => x.text ).join( '\n' );
	assert.ok( ! /375/.test( note ), 'the header is not drawn at 375' );
	assert.match( note, /sticky at 768, sticky at 1440/ );
	const unknown = run( reads( { shrink: { 1440: [ 88, 66, null ] } } ) );
	assert.deepEqual( unknown.attrs.headerShrink, { desktop: 'on' } );
	assert.equal( unknown.attrs.scrolledOffset, undefined, 'no distance is known, so none is written' );
} );
