// FR-48-14b: a host block's part-wide setting is written once when every instance of that part asks the same value, and never
// when one differs or one was not measured. Real case: Indus's careers form, where 187 field-look rows sat on the field blocks
// (which hold no such setting) while `sgs/form` holds one `field*` setting per look (`fieldBackground` paints every field's
// `.sgs-form-field__input`). Run against the real framework DB and the real resolver, with synthetic calibrations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { homesOf } from '../lib/fill-ancestor.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const INPUT = '.sgs-form-field__input';
const HOMES = [ 2, 3, 4 ].map( ( n ) => `.sgs-form__inner > .sgs-form-field:nth-of-type(${ n }) > ${ INPUT }` );
const paint = ( styles ) => Object.fromEntries( THREE.map( ( w ) => [ w, { display: 'block', ...styles } ] ) );
const at = ( slots, property ) => ( { slot: slots[ 0 ], slots, property, state: null, forms: [ 'hex', 'slug' ], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const SIDES = [ 'top', 'right', 'bottom', 'left' ].map( ( s ) => `padding-${ s }` );
const BAND = '.sgs-container__inner';
const NONE = Object.fromEntries( SIDES.map( ( p ) => [ p, '0px' ] ) );
const HOST = {
	block: 'sgs/form',
	elements: { '': paint( {} ), [ BAND ]: paint( NONE ), ...Object.fromEntries( HOMES.map( ( h ) => [ h, paint( { 'background-color': 'rgb(255, 255, 255)', 'min-height': '0px', ...NONE } ) ] ) ) },
	// `padding` is the content band's setting (css_element content-band): calibration lists the field inputs among its slots, which the layout move shifts.
	settings: { fieldBackground: at( HOMES, 'background-color' ), fieldPadding: at( HOMES, 'padding' ), fieldMinHeight: at( HOMES, 'min-height' ), padding: at( [ BAND, ...HOMES.map( ( h ) => `${ BAND } > ${ h }` ) ], 'padding' ) },
	discovered: {},
};
const FIELD = { block: 'sgs/form-field-text', elements: { '': paint( {} ), [ INPUT ]: paint( { 'background-color': 'rgba(0, 0, 0, 0)' } ) }, settings: {}, discovered: {} };
const PADDED = Object.fromEntries( SIDES.map( ( p, i ) => [ p, i % 2 ? '14px' : '13px' ] ) );
const snap = ( styles ) => ( { styles: { display: 'block', ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null } );

// A form holding one field per entry of `fields`: { bg, slotted: false leaves the control unpaired to the field's input part }.
function run( fields, { partWide, host = {} } = {} ) {
	const skeleton = [ { name: 'sgs/form', draftRef: 'form', attributes: host, innerBlocks: fields.map( ( f, i ) => ( { name: 'sgs/form-field-text', draftRef: `input${ i }`, ...( false === f.slotted ? {} : { draftSlots: { [ INPUT ]: `input${ i }` } } ), attributes: {} } ) ) } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fm' );
	const widths = Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, {
		'0:': snap( {} ),
		...Object.fromEntries( fields.flatMap( ( f, i ) => [ [ `${ i + 1 }:`, snap( { 'background-color': f.bg, ...f.pad } ) ], ...( false === f.slotted ? [] : [ [ `${ i + 1 }:${ INPUT }`, snap( { 'background-color': f.bg, ...f.pad } ) ] ] ) ] ) ),
	} ] ) );
	const reads = { widths, declared: Object.fromEntries( Object.keys( widths ).map( ( w ) => [ w, {} ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: ( b ) => ( 'sgs/form' === b ? HOST : FIELD ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1', partWide } );
	return { tree, out };
}
const GREY = 'rgb(240, 240, 240)';
const fieldRows = ( out, prop = 'background-color' ) => out.unmapped.filter( ( u ) => 'sgs/form-field-text' === u.block && prop === u.property );

test( 'MUST FAIL: every instance asking one value is one write on the host, and the rows on the fields are settled naming it', () => {
	const { tree, out } = run( [ { bg: GREY }, { bg: GREY }, { bg: GREY } ] );
	assert.ok( tree[ 0 ].attributes.fieldBackground, 'written once on sgs/form' );
	assert.equal( out.writes.filter( ( w ) => 'fieldBackground' === w.attr ).length, 1, 'once, not once per field' );
	assert.deepEqual( fieldRows( out ), [], 'no no-setting row is left on a field' );
	const settled = out.settled.filter( ( s ) => 'host-write' === s.via );
	assert.equal( settled.length, 6, 'each field\'s input row and root row' );
	assert.ok( settled.every( ( s ) => s.attr === 'fieldBackground' && /sgs\/form/.test( s.detail ) ) );
	assert.ok( ! tree[ 0 ].innerBlocks[ 0 ].attributes?.fieldBackground, 'nothing is written on a field' );
} );

test( 'MUST FAIL: one instance asking another value blocks the write, and every instance keeps its row with the ancestor check recorded', () => {
	const { tree, out } = run( [ { bg: GREY }, { bg: GREY }, { bg: 'rgb(10, 20, 30)' } ] );
	assert.equal( tree[ 0 ].attributes.fieldBackground, undefined, 'a value is never averaged' );
	const rows = fieldRows( out );
	assert.equal( rows.length, 6 );
	assert.ok( rows.every( ( r ) => r.checks.includes( 'ancestor' ) && ! r.unchecked.includes( 'ancestor' ) && /ancestor: .*asks another background-color value/.test( r.reason ) ), JSON.stringify( rows[ 0 ] ) );
} );

test( 'MUST FAIL: an instance of the part the skeleton gives no element blocks the write', () => {
	const { tree, out } = run( [ { bg: GREY }, { bg: GREY }, { bg: GREY, slotted: false } ] );
	assert.equal( tree[ 0 ].attributes.fieldBackground, undefined );
	assert.ok( fieldRows( out ).length > 0 );
	const slotted = fieldRows( out ).filter( ( r ) => INPUT === r.slot );
	assert.equal( slotted.length, 2 );
	assert.ok( slotted.every( ( r ) => /no element/.test( r.reason ) && r.checks.includes( 'ancestor' ) ) );
} );

test( 'MUST FAIL: with the hop removed the rows come back, and a row no enclosing block can hold still records the check', () => {
	const { tree, out } = run( [ { bg: GREY }, { bg: GREY }, { bg: GREY } ], { partWide: { hop: () => null } } );
	assert.equal( tree[ 0 ].attributes.fieldBackground, undefined );
	assert.equal( fieldRows( out ).length, 6 );
} );

test( 'a root row whose control is not also a part of the block is never answered by a host', () => {
	const { out } = run( [ { bg: GREY, slotted: false } ] );
	const rows = fieldRows( out );
	assert.equal( rows.length, 1 );
	assert.ok( rows[ 0 ].checks.includes( 'ancestor' ) );
} );

test( 'the host path of a part is the one whose steps end with the part\'s own path; the root has none', () => {
	assert.deepEqual( homesOf( HOST, INPUT ), [ HOMES[ 0 ], `${ BAND } > ${ HOMES[ 0 ] }` ], 'one path per distinct form, the decoy variant included' );
	assert.deepEqual( homesOf( HOST, '' ), [] );
	assert.deepEqual( homesOf( HOST, '.sgs-form-field__label' ), [] );
} );

test( 'MUST FAIL: a part padding goes to the setting for that part, never to the content band setting that lists the part among its slots', () => {
	const { tree, out } = run( [ { bg: GREY, pad: PADDED }, { bg: GREY, pad: PADDED }, { bg: GREY, pad: PADDED } ] );
	assert.deepEqual( tree[ 0 ].attributes.fieldPadding?.desktop, { top: '13px', right: '14px', bottom: '13px', left: '14px' } );
	assert.equal( tree[ 0 ].attributes.padding, undefined );
	assert.deepEqual( out.unmapped.filter( ( u ) => 'sgs/form-field-text' === u.block && /^padding/.test( u.property ) ), [] );
} );

test( 'MUST FAIL: a host that already holds another value for the setting keeps it, and the field rows stay', () => {
	const { tree, out } = run( [ { bg: GREY }, { bg: GREY } ], { host: { fieldBackground: 'accent' } } );
	assert.equal( tree[ 0 ].attributes.fieldBackground, 'accent' );
	const rows = fieldRows( out ).filter( ( r ) => INPUT === r.slot );
	assert.equal( rows.length, 2 );
	assert.ok( rows.every( ( r ) => /already holds another value for fieldBackground/.test( r.reason ) ) );
} );

test( 'MUST FAIL: a size row stays for the dimension pass, which judges it against the rendered box', () => {
	const { tree, out } = run( [ { bg: GREY, pad: { 'min-height': '52px' } }, { bg: GREY, pad: { 'min-height': '52px' } } ] );
	assert.equal( tree[ 0 ].attributes.fieldMinHeight, undefined );
	const rows = fieldRows( out, 'min-height' );
	assert.equal( rows.length, 4 );
	assert.ok( rows.every( ( r ) => ! r.checks.includes( 'ancestor' ) ) );
	assert.ok( tree[ 0 ].attributes.fieldBackground, 'the other looks are still written once' );
} );
