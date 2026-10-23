// No declared value dropped silently (register row R7) through fillTree (lib/fill-resolve.mjs): every property Fill reads on
// a measured element ends written, unwritten (UNMAPPED), held (the ledger or already held) or settled with a reason
// (lib/fill-report.mjs::SETTLED). A keyword the browser paints as 0 (letter-spacing: normal) matches only an exact 0px, as
// the walker compares it (parity/lib/compare.mjs::sameValue), never a length within the px tolerance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { SETTLED } from '../lib/fill-report.mjs';
import { PROPS } from '../lib/fill-read.mjs';
import { notPainted } from '../lib/fill-prop.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf, walk } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ], ...extra } );
const CAL = {
	'sgs/text': { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size' ), textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ), margin: setting( 'margin' ), letterSpacing: setting( 'letter-spacing' ), textTransform: setting( 'text-transform' ), lineHeight: setting( 'line-height' ) }, discovered: {} },
	'sgs/container': { block: 'sgs/container', elements: { '': tiers( DEFAULT ) }, settings: { padding: setting( 'padding' ), margin: setting( 'margin' ), textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ) }, discovered: {} },
};
const snap = ( styles, words = '' ) => ( { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words, href: null } );

function run( skeleton, spec, declared = {} ) {
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, {} ] ) );
	for ( const [ id, s ] of Object.entries( spec ) ) {
		FIVE.forEach( ( w ) => ( widths[ w ][ id ] = s ) );
	}
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	return { tree, ...fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } ) };
}
const atAll = ( id, decl ) => Object.fromEntries( THREE.map( ( w ) => [ w, { [ id ]: decl } ] ) );

test( 'MUST FAIL: a letter spacing of -0.17px against a normal baseline is written, not taken as equal within the px tolerance', () => {
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( { 'letter-spacing': '-0.17px' }, 'A' ) } );
	const w = r.writes.find( ( x ) => 'letter-spacing' === x.prop );
	assert.ok( w, `letter-spacing is written (writes: ${ JSON.stringify( r.writes.map( ( x ) => x.prop ) ) })` );
	assert.ok( r.tree[ 0 ].attributes.letterSpacing, 'the letter spacing setting holds it' );
	assert.equal( r.settled.filter( ( s ) => 'letter-spacing' === s.property ).length, 0, 'never settled as equal' );
} );

test( 'control: an exact 0px letter spacing matches normal and a length within tolerance of another length stays equal', () => {
	const zero = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( { 'letter-spacing': '0px' }, 'A' ) } );
	assert.equal( zero.writes.filter( ( x ) => 'letter-spacing' === x.prop ).length, 0 );
	assert.ok( zero.settled.some( ( s ) => 'letter-spacing' === s.property && 'equal' === s.reason ), '0px against normal is settled as equal' );
	const near = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( { 'font-size': '16.3px' }, 'A' ) } );
	assert.equal( near.writes.filter( ( x ) => 'font-size' === x.prop ).length, 0, 'two lengths 0.3px apart are within the tolerance' );
} );

test( 'MUST FAIL: every property read on a measured element ends written, unwritten, held or settled with a known reason', () => {
	const sk = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
		{ name: 'sgs/text', draftRef: '.a', attributes: { text: 'A', textTransform: 'uppercase' } },
		{ name: 'sgs/text', draftRef: '.b', attributes: { text: 'B' } },
	] } ];
	const spec = {
		'0:': snap( { width: '600px', top: '10px', 'margin-left': '170px', 'margin-right': '170px' } ),
		'1:': snap( { 'text-transform': 'uppercase', width: '13px', 'letter-spacing': '-0.17px' }, 'A' ),
		'2:': snap( { color: 'rgb(255, 0, 0)', 'background-image': 'url("x.png")' }, 'B' ),
	};
	const declared = Object.fromEntries( THREE.map( ( w ) => [ w, { '0:': { 'margin-left': 'auto', 'margin-right': 'auto' }, '1:': { width: 'var(--b2,13px)' }, '2:': {} } ] ) );
	const r = run( sk, spec, declared );
	const outcome = ( node, prop ) => [
		...r.writes.filter( ( x ) => x.node === node && x.prop === prop ).map( () => 'written' ),
		...r.unmapped.filter( ( x ) => x.node === node && x.property === prop ).map( () => 'unmapped' ),
		...r.alreadyHeld.filter( ( x ) => x.node === node && x.property === prop ).map( () => 'held' ),
		...r.held.filter( ( x ) => x.node === node && x.prop === prop ).map( () => 'ledger' ),
		...r.settled.filter( ( x ) => x.node === node && x.property === prop ).map( ( x ) => `settled ${ x.reason }` ),
	];
	const refs = [];
	walk( r.tree, ( n, i ) => ( refs[ i ] = refOf( n ) ) );
	const silent = [];
	for ( const [ i, id ] of [ '0:', '1:', '2:' ].entries() ) {
		const ref = refs[ i ];
		for ( const prop of Object.keys( spec[ id ].styles ).filter( ( p ) => PROPS.includes( p ) && ! notPainted( p, spec[ id ].styles ) ) ) {
			outcome( ref, prop ).length || silent.push( `${ ref } ${ prop }` );
		}
	}
	assert.deepEqual( silent, [], 'no property read ends with no outcome' );
	assert.ok( r.settled.every( ( s ) => SETTLED.includes( s.reason ) ) );
	assert.ok( r.settled.some( ( s ) => 'margin-left' === s.property && 'used-size' === s.reason ), 'the declared auto margin is settled as a used size' );
	assert.ok( r.settled.some( ( s ) => 'top' === s.property && 'used-size' === s.reason ), 'an undeclared offset is settled as a used size' );
	assert.ok( r.settled.some( ( s ) => 'text-transform' === s.property && 'already-set' === s.reason ), 'a value the skeleton already set is settled as already set' );
	assert.ok( r.unmapped.some( ( u ) => 'width' === u.property && /var\(--b2,13px\)/.test( u.reason ) ), 'a declared var() width is an UNMAPPED row, not dropped' );
} );
