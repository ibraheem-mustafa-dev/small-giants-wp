// A setting the framework stores as a gradient BORDER control (css_property `border-color-gradient`: a ring painted on a layer
// such as `::before`) is no candidate for a draft's `background-image`: the layer calibration measured paints the border box only,
// so a link's background-size underline (or any fill) written to it draws a 1px ring round the element. The row is the
// no-setting gap it is (lib/resolve.mjs::resolve, the candidate filter).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve, borderGradientOnly } from '../lib/resolve.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const GRADIENT = 'linear-gradient(rgb(216, 202, 80), rgb(216, 202, 80))';
const input = ( block, slot ) => ( { block, slot, prop: 'background-image', perWidth: { 1440: GRADIENT } } );
const setting = ( slot ) => ( { slot, slots: [ slot ], property: 'background-image', forms: [], reachedAt: [ 375, 768, 1440 ], effects: [] } );

test( 'MUST FAIL: a background-image is never written to a border gradient layer', () => {
	const r = resolve( input( 'sgs/business-info', '::before' ), { db, snapshot, calibration: { settings: { borderColourGradient: setting( '::before' ) } } } );
	assert.equal( r.writes, undefined, JSON.stringify( r ) );
	assert.equal( r.gap, 'no-setting', JSON.stringify( r ) );
} );

test( 'negative control: a background gradient setting on the element is still written', () => {
	const r = resolve( input( 'sgs/container', '' ), { db, snapshot, calibration: { settings: { backgroundColourGradient: setting( '' ) } } } );
	assert.deepEqual( r.writes?.map( ( w ) => w.attr ), [ 'backgroundColourGradient' ], JSON.stringify( r ) );
} );

test( 'a row is a border ring only when every property it stores is a border gradient', () => {
	assert.equal( borderGradientOnly( { css_property: 'border-color-gradient' } ), true );
	assert.equal( borderGradientOnly( { css_property: 'border-top-color-gradient' } ), true );
	assert.equal( borderGradientOnly( { css_property: 'border-color-gradient, background-image' } ), false );
	assert.equal( borderGradientOnly( { css_property: 'background-image' } ), false );
	assert.equal( borderGradientOnly( { css_property: 'color-gradient' } ), false );
	assert.equal( borderGradientOnly( { css_property: null } ), false );
} );
