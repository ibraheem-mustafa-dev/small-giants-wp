// Proves FR-47-1 / R-47-3: one engine maps a measured property on a calibrated slot to a write in the block's
// storage shape, or returns a gap. Covers §3.1's done line: heading line-height as a tier object with its unit,
// container padding as a box inside a tier object, a flat_sibling background image, and an unknown property.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve, splitProperty, tiersOf } from '../lib/resolve.mjs';
import { parseColour } from '../lib/normalise.mjs';

const db = openDb();
const snapshot = { palette: [ { slug: 'text-label', colour: parseColour( '#8A8278' ) } ], spacing: [], fontSizes: [] };
const cal = ( settings ) => ( { settings } );

test( 'heading line-height: a tier object in the unit companion (em), from measured px', () => {
	const r = resolve( { block: 'sgs/heading', slot: '', prop: 'line-height', perWidth: { 375: '21px', 768: '21px', 1440: '27px', 1920: '27px' }, fontPx: { 375: 14, 768: 14, 1440: 18 } },
		{ db, snapshot, calibration: cal( { lineHeight: { slot: '', property: 'line-height' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'lineHeight', value: { mobile: 1.5, tablet: 1.5, desktop: 1.5 }, merge: 'deep' } ] );
} );

test( 'container padding-top: one side of a box inside a tier object', () => {
	const r = resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop: 'padding-top', perWidth: { 375: '56px', 1440: '104px' } },
		{ db, snapshot, calibration: cal( { padding: { slot: '.sgs-container__inner', property: 'padding' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'padding', value: { mobile: { top: '56px' }, desktop: { top: '104px' } }, merge: 'deep' } ] );
} );

test( 'container background image: one flat_sibling attribute per tier', () => {
	const r = resolve( { block: 'sgs/container', slot: '', prop: 'background-image', perWidth: { 1440: 'url("https://x.test/a.jpg")', 375: 'url("https://x.test/b.jpg")' } },
		{ db, snapshot, calibration: cal( { backgroundImage: { slot: '', property: 'background-image' }, backgroundImageTablet: { slot: '', property: 'background-image' }, backgroundImageMobile: { slot: '', property: 'background-image' } } ) } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value.url ] ).sort(), [ [ 'backgroundImage', 'https://x.test/a.jpg' ], [ 'backgroundImageMobile', 'https://x.test/b.jpg' ] ] );
} );

test( 'a colour snaps to the palette slug', () => {
	const r = resolve( { block: 'sgs/heading', slot: '', prop: 'color', perWidth: { 1440: 'rgb(138, 130, 120)', 375: 'rgb(138, 130, 120)' } },
		{ db, snapshot, calibration: cal( { textColour: { slot: '', property: 'color' } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'textColour', value: 'text-label', merge: 'replace' } ] );
} );

test( 'gaps: uncalibrated, wrong slot, shape (desktop differs at 1920), one-value setting differing by width', () => {
	const base = { block: 'sgs/heading', slot: '', prop: 'line-height', perWidth: { 1440: '27px' }, fontPx: { 1440: 18 } };
	assert.equal( resolve( base, { db, snapshot, calibration: null } ).gap, 'uncalibrated' );
	assert.equal( resolve( { ...base, slot: '.sgs-heading__inner' }, { db, snapshot, calibration: cal( { lineHeight: { slot: '' } } ) } ).gap, 'no-setting' );
	assert.equal( resolve( { ...base, perWidth: { 1440: '27px', 1920: '30px' } }, { db, snapshot, calibration: cal( { lineHeight: { slot: '' } } ) } ).gap, 'shape' );
	assert.equal( resolve( { block: 'sgs/heading', slot: '', prop: 'text-transform', perWidth: { 1440: 'uppercase', 375: 'none' } }, { db, snapshot, calibration: cal( { textTransform: { slot: '' } } ) } ).gap, 'shape' );
} );

test( 'MUST FAIL TO WRITE: an unknown property returns no-setting and no write', () => {
	const r = resolve( { block: 'sgs/heading', slot: '', prop: 'mask-composite', perWidth: { 1440: 'add' } }, { db, snapshot, calibration: cal( {} ) } );
	assert.equal( r.gap, 'no-setting' );
	assert.equal( r.writes, undefined );
} );

test( 'longhands map to the database shorthand and a side', () => {
	assert.deepEqual( splitProperty( 'margin-left' ), { short: 'margin', side: 'left' } );
	assert.deepEqual( splitProperty( 'border-top-color' ), { short: 'border-color', side: 'top' } );
	assert.deepEqual( tiersOf( { 375: '1px', 1440: '2px' }, 'x' ).tiers, { mobile: '1px', desktop: '2px' } );
} );
