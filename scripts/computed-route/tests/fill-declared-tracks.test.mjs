// A grid's column tracks the draft's code declares are written as declared (lib/normalise.mjs::declaredTracks), so a
// content-sized track stays content-sized: the measured px tracks of one width written as fr shares fix the middle `auto`
// track of a `1fr auto 1fr` header bar to a share and drop the side tracks' min-content floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { declaredTracks } from '../lib/normalise.mjs';
import { holdsString } from '../lib/resolve-declared.mjs';
import { agreedDeclared } from '../lib/fill-resolve-element.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const calibration = { settings: { gridTemplateColumns: { slot: '.sgs-container__inner', property: 'grid-template-columns' } } };
// The bar's rendered tracks at each read width (the logo's track is content-sized).
const perWidth = { 375: '91.05px 152.9px 99.05px', 768: '228.4px 210px 228.4px', 1440: '560.8px 206.4px 560.8px' };
const row = ( declaredForm ) => resolve( { block: 'sgs/site-header-row', slot: '.sgs-container__inner', prop: 'grid-template-columns', perWidth, declaredForm }, { db, snapshot, calibration } );

test( 'MUST FAIL: a declared 1fr auto 1fr is written as declared at every device, not as measured shares', () => {
	const declared = { 375: '1fr auto 1fr', 768: '1fr auto 1fr', 1440: '1fr  auto 1fr' };
	assert.deepEqual( row( declared ).writes, [ { attr: 'gridTemplateColumns', value: { mobile: '1fr auto 1fr', tablet: '1fr auto 1fr', desktop: '1fr auto 1fr' }, merge: 'deep' } ] );
} );

test( 'MUST FAIL: a list declared differently per width (a media query or a bound value) is written per device', () => {
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'grid-template-columns', perWidth: { 375: '36px 299px', 1440: '560px 600px' }, declaredForm: { 375: '36px 1fr', 1440: 'minmax(0, .8fr) minmax(0,1fr)' } }, { db, snapshot, calibration } );
	assert.deepEqual( r.writes[ 0 ].value, { mobile: '36px 1fr', desktop: 'minmax(0, .8fr) minmax(0,1fr)' } );
} );

test( 'negative control: no declared list, or one the setting cannot hold, keeps the measured shares', () => {
	assert.deepEqual( row( {} ).writes[ 0 ].value.desktop, 'minmax(0, 2.72fr) minmax(0, 1fr) minmax(0, 2.72fr)' );
	for ( const d of [ 'var(--cols)', '[full] 1fr auto 1fr [end]', 'calc(50% - 10px) auto 1fr', 'none' ] ) {
		assert.equal( row( { 1440: d } ).writes[ 0 ].value.desktop, 'minmax(0, 2.72fr) minmax(0, 1fr) minmax(0, 2.72fr)', d );
	}
} );

test( 'negative control: a count per device painting the tracks is never given the declared list', () => {
	const r = resolve( { block: 'sgs/post-grid', slot: '.sgs-post-grid__inner', prop: 'grid-template-columns', perWidth: { 1440: '400px 400px 400px' }, declaredForm: { 1440: 'repeat(3, 1fr)' } },
		{ db, snapshot, calibration: { settings: { columns: { slot: '.sgs-post-grid__inner', property: 'grid-template-columns' } } } } );
	assert.notEqual( JSON.stringify( r.writes ?? r ).includes( 'repeat(3, 1fr)' ), true, JSON.stringify( r ) );
} );

test( 'declaredTracks: held as written only where the list lays out the rendered tracks', () => {
	assert.deepEqual( declaredTracks( '1fr auto 1fr', '91px 153px 99px' ), { value: '1fr auto 1fr' } );
	assert.deepEqual( declaredTracks( 'repeat(2, minmax(0px, 1fr))', '300px 300px' ), { value: 'repeat(2, minmax(0px, 1fr))' } );
	assert.deepEqual( declaredTracks( 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', '307px 307px 307px 307px' ), { value: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' } );
	assert.deepEqual( declaredTracks( '36px 1fr', '36px 299px' ), { value: '36px 1fr' } );
	assert.deepEqual( declaredTracks( 'fit-content(200px) max-content min-content', '200px 80px 40px' ), { value: 'fit-content(200px) max-content min-content' } );
	assert.equal( declaredTracks( '36px 1fr', '40px 299px' ), null, 'a fixed track the render does not lay out' );
	assert.equal( declaredTracks( '1fr 1fr', '300px 300px 300px' ), null, 'another track count' );
	assert.equal( declaredTracks( 'repeat(3, 1fr)', '300px 300px' ), null, 'another track count after repeat()' );
	assert.equal( declaredTracks( '1fr auto 1fr', 'none' ), null, 'no grid rendered' );
	assert.equal( declaredTracks( 'auto 1fr / auto', '10px 20px' ), null, 'a slash is not printed' );
	assert.equal( declaredTracks( 'subgrid', '10px' ), null );
	assert.equal( declaredTracks( 'minmax(0) 1fr', '10px 20px' ), null, 'a minmax() takes two sizes' );
	assert.equal( declaredTracks( 'var(--cols)', '10px' ), null );
	assert.equal( declaredTracks( '[a] 1fr [b]', '10px' ), null, 'named lines' );
} );

test( 'holdsString: a string per device holds a track list; a count per device or a list of values does not', () => {
	assert.equal( holdsString( { type: 'object', default: { desktop: 'repeat(4, 1fr)' } } ), true );
	assert.equal( holdsString( { type: 'string' } ), true );
	assert.equal( holdsString( { type: 'object', default: { desktop: 3, mobile: 1 } } ), false );
	assert.equal( holdsString( { type: 'number' } ), false );
	assert.equal( holdsString( { type: 'string', enum: [ '1fr', '1fr 1fr' ] } ), false );
} );

test( 'MUST FAIL: Fill takes a declared track list as agreeing with the rendered tracks it lays out', () => {
	const st = { reads: { declared: { 375: { t: { 'grid-template-columns': '1fr auto 1fr' } }, 768: { t: { 'grid-template-columns': '200px 1fr' } }, 1440: { t: { 'grid-template-columns': 'var(--cols)' } } } } };
	const draft = { 375: '91px 153px 99px', 768: '180px 500px', 1440: '600px 600px' };
	assert.deepEqual( agreedDeclared( st, { id: 't' }, 'grid-template-columns', draft, {} ), { 375: '1fr auto 1fr' } );
} );
