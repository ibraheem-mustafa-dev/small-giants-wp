// A fluid value the draft's code declares (clamp(), min(), max(), a viewport length) is written as that one value when the
// setting takes the form (calibration lists it), never resolved to per-tier pixels and never refitted from the rendered
// samples (Spec 48 FR-48-1 row 8, T3). lib/fill-prop.mjs::resolveProperty passes the declared value to the resolver;
// lib/fill-resolve-element.mjs::declaredFluid reads it from the draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { declaredFluid } from '../lib/fill-resolve-element.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const CLAMP = 'clamp(24px, 2.4vw, 30px)';
const cal = ( forms ) => ( { elements: { '': {} }, settings: { fontSize: { slot: '', slots: [ '' ], reaches: [ '' ], property: 'font-size', state: null, forms, transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } } } );
const draft = { 375: '24px', 768: '24px', 1440: '30px' };
// A straight line through all five fluid widths: the sampled fit would write its own clamp.
const samples = { 375: '32px', 768: '39.86px', 1024: '44.98px', 1440: '53.3px', 1920: '62.9px' };
const run = ( forms, extra = {} ) => resolveProperty( { node: { attributes: {} }, block: 'sgs/heading', prop: 'font-size', draft, baseline: () => undefined, slots: [ '' ], calibration: cal( forms ), db, snapshot, log: [], fontPx: { 375: 16, 768: 16, 1440: 16 }, ...extra } );
const DECLARED = { 375: CLAMP, 768: CLAMP, 1440: CLAMP };

test( 'MUST FAIL WITHOUT THE WIRING: a declared clamp() is written whole at the desktop tier, not as per-tier pixels', () => {
	const r = run( [ 'clamp' ], { declaredFluid: DECLARED } );
	assert.equal( r.status, 'written' );
	assert.deepEqual( r.writes, [ { attr: 'fontSize', value: { desktop: CLAMP }, merge: 'deep' } ] );
	assert.equal( r.how, 'declared-fluid' );
	assert.deepEqual( r.fluid, { clamp: CLAMP, accepted: true, declared: true } );
	const perTier = run( [ 'clamp' ] );
	assert.deepEqual( perTier.writes[ 0 ].value, { tablet: 24, desktop: 30 }, 'without the declared value the tiers are per-tier pixels' );
} );

test( 'the declared clamp() wins over a clamp fitted from the rendered samples', () => {
	const r = run( [ 'clamp' ], { declaredFluid: DECLARED, fluid: samples } );
	assert.equal( r.writes[ 0 ].value.desktop, CLAMP );
	assert.equal( r.fluid.declared, true );
	const fitted = run( [ 'clamp' ], { fluid: samples } );
	assert.notEqual( fitted.writes[ 0 ].value.desktop, CLAMP, 'the sampled fit is what the declared path replaces' );
} );

test( 'a setting whose calibration does not list the form keeps per-tier values', () => {
	const r = run( [], { declaredFluid: DECLARED } );
	assert.deepEqual( r.writes[ 0 ].value, { tablet: 24, desktop: 30 } );
	assert.equal( r.fluid, undefined );
} );

test( 'declaredFluid: the same fluid value at every read width, else null (a value that changes with the width is per-tier)', () => {
	const st = ( by ) => ( { reads: { declared: Object.fromEntries( Object.entries( by ).map( ( [ w, v ] ) => [ w, { t: { 'font-size': v } } ] ) ) } } );
	const t = { id: 't' };
	assert.deepEqual( declaredFluid( st( { 375: CLAMP, 768: CLAMP, 1440: CLAMP } ), t, 'font-size', draft ), DECLARED );
	assert.equal( declaredFluid( st( { 375: '20px', 768: CLAMP, 1440: CLAMP } ), t, 'font-size', draft ), null );
	assert.equal( declaredFluid( st( { 375: '24px', 768: '24px', 1440: '24px' } ), t, 'font-size', draft ), null, 'plain lengths are not fluid' );
	assert.equal( declaredFluid( st( { 375: CLAMP, 768: CLAMP } ), t, 'font-size', draft ), null, 'a width with no declared value' );
} );
