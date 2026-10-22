// Proves Spec 48 FR-48-85 (d): each CSS function and the fr unit the Indus and Mama's drafts use is written by the
// writer that owns its carrying property, or named as not written. Gradients (linear, radial, repeating, layered) on a
// background-image gradient setting are written as measured, never as an image; grid tracks built with repeat(),
// minmax() and fr become per-tier track proportions; blur() and grayscale() in a filter are motion channels and
// contrast() is reported; inset() is the entrance clip channel in Chrome's computed form; circle(), polygon() and a
// rounded inset() are reported, never guessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { filterChannels } from '../lib/motion-channels.mjs';
import { clipChannels } from '../lib/motion-clip.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const all = ( v ) => ( { 375: v, 768: v, 1440: v, 1920: v } );
const drawer = { settings: { drawerBgGradient: { slot: '', property: 'background-image' } } };

test( 'linear, radial, repeating and layered gradients are written as measured to a gradient setting', () => {
	for ( const g of [
		'linear-gradient(180deg, rgb(31, 122, 122) 0%, rgb(20, 80, 80) 100%)',
		'radial-gradient(circle at 30% 20%, rgba(245, 158, 11, 0.25), rgba(0, 0, 0, 0) 60%)',
		'linear-gradient(rgb(255, 250, 240), rgb(255, 250, 240)), repeating-linear-gradient(rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 23px, rgb(230, 220, 200) 24px)',
	] ) {
		const r = resolve( { block: 'sgs/nav-drawer', slot: '', prop: 'background-image', perWidth: all( g ) }, { db, snapshot, calibration: drawer } );
		assert.deepEqual( r.writes, [ { attr: 'drawerBgGradient', value: g, merge: 'replace' } ], g );
	}
} );

test( 'MUST FAIL: a gradient never lands in an image setting', () => {
	const cal = { settings: { backgroundImage: { slot: '', property: 'background-image' } } };
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'background-image', perWidth: all( 'linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))' ) }, { db, snapshot, calibration: cal } );
	assert.ok( ! r.writes?.length, JSON.stringify( r ) );
} );

test( 'repeat(auto-fit, minmax(240px, 1fr)) tracks become per-tier proportions', () => {
	const cal = { settings: { gridTemplateColumns: { slot: '.sgs-container__inner', property: 'grid-template-columns' } } };
	const perWidth = { 375: '343px', 768: '352px 352px', 1440: '400px 400px 400px', 1920: '400px 400px 400px' };
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'grid-template-columns', perWidth }, { db, snapshot, calibration: cal } );
	assert.deepEqual( r.writes, [ { attr: 'gridTemplateColumns', value: { mobile: 'repeat(1, minmax(0, 1fr))', tablet: 'repeat(2, minmax(0, 1fr))', desktop: 'repeat(3, minmax(0, 1fr))' }, merge: 'deep' } ] );
} );

test( 'blur() and grayscale() in a filter are motion channels; contrast() is reported, never dropped', () => {
	assert.deepEqual( filterChannels( 'blur(8px)' ), { channels: { blur: 8 }, unsupported: [] } );
	assert.deepEqual( filterChannels( 'grayscale(0.35) contrast(1.05)' ), { channels: { grayscale: 0.35 }, unsupported: [ 'contrast' ] } );
} );

test( 'MUST FAIL: an inset() clip in Chrome computed form, zero edges as 0px, is the entrance clip channel', () => {
	assert.deepEqual( clipChannels( 'inset(100% 0px 0px)' ).channels, { clip: 100, clipEdge: 'top' } );
	assert.deepEqual( clipChannels( 'inset(0px)' ).channels, { clip: 0 } );
	assert.deepEqual( clipChannels( 'inset(8%)' ).channels, { clip: 8 } );
} );

test( 'circle(), polygon() and a length inset are reported as no clip channel', () => {
	for ( const v of [ 'circle(40px at 10px 10px)', 'polygon(0px 0px, 100% 0px, 88% 50%, 100% 100%, 0px 100%)', 'inset(10px)', 'inset(10% round)', 'inset(round 24px)' ] ) {
		assert.deepEqual( clipChannels( v ), { channels: {}, unsupported: [ 'clip-path' ] }, v );
	}
} );
