// A column-count setting mapped to grid-template-columns holds the number of tracks, never the track string
// (lib/resolve.mjs::formatValue via lib/resolve-declared.mjs::holdsCount and lib/normalise.mjs::trackCount): the editor and the
// block's CSS read a whole number, so "repeat(3, minmax(0, 1fr))" cast to a count reads 1. The setting is a count when its
// calibrated form is `count`, else when its per-device defaults are numbers; a track-list setting (`repeat`) keeps the string.
// Real block schemas and the real framework DB; the calibration is the setting's recorded slot, property and forms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { trackCount } from '../lib/normalise.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const THREE = '160px 160px 160px';
const TWO = '240px 240px';
const ONE = '480px';
const perWidth = { 375: ONE, 768: TWO, 1440: THREE };
const run = ( block, attr, forms, extra = {} ) => resolve( { block, slot: '', prop: 'grid-template-columns', perWidth, ...extra },
	{ db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: 'grid-template-columns', ...( forms ? { forms } : {} ) } } } } );

test( 'MUST FAIL: a calibrated count setting is written the number of tracks per device', () => {
	const r = run( 'sgs/icon-list', 'listColumns', [ 'count' ] );
	assert.deepEqual( r.writes, [ { attr: 'listColumns', value: { mobile: 1, tablet: 2, desktop: 3 }, merge: 'deep' } ] );
} );

test( 'MUST FAIL: a count setting is written the count even where the draft declares a track list', () => {
	const declaredForm = { 1440: 'repeat(3, 1fr)', 768: 'repeat(2, 1fr)', 375: '1fr' };
	const r = run( 'sgs/icon-list', 'listColumns', [ 'count' ], { declaredForm } );
	assert.deepEqual( r.writes?.[ 0 ]?.value, { mobile: 1, tablet: 2, desktop: 3 } );
} );

test( 'MUST FAIL: a setting with no calibrated form whose per-device defaults are numbers is a count', () => {
	const r = run( 'sgs/post-grid', 'columns', null );
	assert.deepEqual( r.writes?.[ 0 ]?.value, { mobile: 1, tablet: 2, desktop: 3 } );
} );

// Negative controls: a track-list setting keeps the track string, and a count of tracks needs px tracks.
test( 'a track-list setting (calibrated repeat) still takes the track string', () => {
	const r = run( 'sgs/container', 'gridTemplateColumns', [ 'repeat' ] );
	assert.deepEqual( r.writes?.[ 0 ]?.value, { mobile: 'repeat(1, minmax(0, 1fr))', tablet: 'repeat(2, minmax(0, 1fr))', desktop: 'repeat(3, minmax(0, 1fr))' } );
} );

test( 'a track-list setting with no calibrated form and no numeric default still takes the track string', () => {
	const r = run( 'sgs/container', 'gridTemplateColumns', null );
	assert.equal( typeof r.writes?.[ 0 ]?.value?.desktop, 'string' );
} );

test( 'trackCount counts px tracks and refuses a track list it cannot read', () => {
	assert.deepEqual( trackCount( THREE ), { value: 3 } );
	assert.deepEqual( trackCount( ONE ), { value: 1 } );
	assert.match( trackCount( 'none' ).error, /cannot be held as a track count/ );
} );
