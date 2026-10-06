// L9.7 (FR-47-4 "values that need care"): a fluid size is linear within 0.5px across 375, 768, 1024, 1440 and 1920 and is
// written as clamp() only where calibration showed the setting accepts one; the 16px sweep logs each step against the
// nearest SGS boundary for a human to decide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FLUID_WIDTHS, SWEEP_WIDTHS, SGS_BOUNDARIES, fitFluid, acceptsClamp, applyClamp, breakpointSteps, nearestBoundary, sweepSteps } from '../lib/fill-values.mjs';

// Evaluates the clamp() fitFluid writes at a width, so the expression itself is checked and not only its text.
function evalClamp( text, w ) {
	const m = /^clamp\(([\d.]+)px, (-?[\d.]+)vw( [+-] ([\d.]+)px)?, ([\d.]+)px\)$/.exec( text ) || /^clamp\(([\d.]+)px, ([\d.]+)px ([+-]) ([\d.]+)vw, ([\d.]+)px\)$/.exec( text );
	assert.ok( m, `unexpected clamp text ${ text }` );
	const [ min, max ] = [ Number( m[ 1 ] ), Number( m[ 5 ] ) ];
	const vw = Number( m[ 2 ] ) * w / 100;
	const px = m[ 3 ] ? ( m[ 3 ].includes( '-' ) ? -1 : 1 ) * Number( m[ 4 ] ) : 0;
	return Math.min( max, Math.max( min, vw + px ) );
}
const at = ( fn ) => Object.fromEntries( FLUID_WIDTHS.map( ( w ) => [ w, fn( w ) ] ) );

test( 'the sampling widths and the sweep are the spec\'s: five widths, every 16px from 320 to 1920, boundaries 768 and 1024', () => {
	assert.deepEqual( FLUID_WIDTHS, [ 375, 768, 1024, 1440, 1920 ] );
	assert.equal( SWEEP_WIDTHS[ 0 ], 320 );
	assert.equal( SWEEP_WIDTHS.at( -1 ), 1920 );
	assert.equal( SWEEP_WIDTHS.length, 101 );
	assert.ok( SWEEP_WIDTHS.every( ( w, i ) => 0 === i || 16 === w - SWEEP_WIDTHS[ i - 1 ] ) );
	assert.ok( SWEEP_WIDTHS.includes( 768 ) && SWEEP_WIDTHS.includes( 1024 ), 'both SGS boundaries are sampled exactly' );
	assert.deepEqual( SGS_BOUNDARIES, [ 768, 1024 ] );
} );

test( 'MUST FAIL: a stepped value (media queries) is never called fluid, a constant is never fluid, a straight line always is', () => {
	assert.equal( fitFluid( at( ( w ) => ( w < 768 ? 16 : w < 1024 ? 20 : 24 ) ) ), null, 'steps' );
	assert.equal( fitFluid( at( () => 18 ) ), null, 'constant' );
	assert.equal( fitFluid( at( ( w ) => ( 375 === w ? 14 : 18 ) ) ), null, 'one odd sample' );
	const fit = fitFluid( at( ( w ) => 12 + w * 0.01 ) );
	assert.ok( fit, 'a straight line is fluid' );
	for ( const w of FLUID_WIDTHS ) {
		assert.ok( Math.abs( evalClamp( fit.clamp, w ) - ( 12 + w * 0.01 ) ) <= 0.5, `${ fit.clamp } at ${ w }` );
	}
} );

test( 'linear within 0.5px is fluid, 0.51px off the line is not; a decreasing line and a negative intercept are written validly', () => {
	const line = ( w ) => 8 + w * 0.02;
	const jitter = ( d ) => at( ( w ) => ( 1024 === w ? line( w ) + d : line( w ) ) );
	assert.ok( fitFluid( jitter( 0.49 ) ) );
	assert.equal( fitFluid( jitter( 0.51 ) ), null );
	const down = fitFluid( at( ( w ) => 60 - w * 0.01 ) );
	assert.ok( down.slope < 0 );
	assert.ok( Math.abs( evalClamp( down.clamp, 768 ) - ( 60 - 7.68 ) ) <= 0.5 );
	const neg = fitFluid( at( ( w ) => -6 + w * 0.025 ) );
	assert.match( neg.clamp, /^clamp\(.*vw - 6px, /, 'a negative intercept is written "Nvw - Mpx"' );
	assert.match( fitFluid( at( ( w ) => w * 0.02 ) ).clamp, /^clamp\([\d.]+px, 2vw, [\d.]+px\)$/, 'no intercept, no term' );
} );

test( 'fitFluid needs every sampled width: a missing sample or a non-px value is not fluid', () => {
	const s = at( ( w ) => w * 0.02 );
	delete s[ 1024 ];
	assert.equal( fitFluid( s ), null );
	assert.equal( fitFluid( { ...at( ( w ) => w * 0.02 ), 768: 'auto' } ), null );
	assert.ok( fitFluid( Object.fromEntries( FLUID_WIDTHS.map( ( w ) => [ w, `${ w * 0.02 }px` ] ) ) ), 'px strings are read' );
} );

test( 'acceptsClamp is true only where calibration listed clamp among the setting\'s forms', () => {
	const cal = { settings: { fontSize: { forms: [ 'hex', 'clamp' ] }, padding: { forms: [] }, gap: {} } };
	assert.equal( acceptsClamp( cal, 'fontSize' ), true );
	assert.equal( acceptsClamp( cal, 'padding' ), false );
	assert.equal( acceptsClamp( cal, 'gap' ), false );
	assert.equal( acceptsClamp( cal, 'missing' ), false );
	assert.equal( acceptsClamp( null, 'fontSize' ), false );
} );

test( 'applyClamp turns the resolver\'s per-tier write into one desktop clamp, in every storage shape, and never mutates it', () => {
	const C = 'clamp(14px, 1vw + 10px, 28px)';
	// Per-device plain setting.
	const tier = { attr: 'fontSize', value: { desktop: '28px', tablet: '18px', mobile: '14px' }, merge: 'deep' };
	assert.deepEqual( applyClamp( [ tier ], C, null ), [ { attr: 'fontSize', value: { desktop: C }, merge: 'deep' } ] );
	assert.equal( tier.value.tablet, '18px' );
	// Per-device box, one side measured: the other sides the resolver seeded stay, the measured side is the clamp.
	const box = { attr: 'padding', value: { desktop: { top: '10px', right: '20px', bottom: '0px', left: '0px' }, tablet: { top: '8px', right: '20px', bottom: '0px', left: '0px' } }, merge: 'deep' };
	assert.deepEqual( applyClamp( [ box ], C, 'top' )[ 0 ].value, { desktop: { top: C, right: '20px', bottom: '0px', left: '0px' } } );
	// Shorthand on every side.
	assert.deepEqual( applyClamp( [ { attr: 'padding', value: { desktop: { top: '9px', right: '9px', bottom: '9px', left: '9px' } }, merge: 'deep' } ], C, null )[ 0 ].value.desktop, { top: C, right: C, bottom: C, left: C } );
	// Flat sibling attributes: only the base (desktop) attribute remains.
	const flat = [ { attr: 'gap', value: '20px', merge: 'replace' }, { attr: 'gapTablet', value: '16px', merge: 'replace' }, { attr: 'gapMobile', value: '12px', merge: 'replace' } ];
	assert.deepEqual( applyClamp( flat, C, null ), [ { attr: 'gap', value: C, merge: 'replace' } ] );
	// A single value for every width.
	assert.deepEqual( applyClamp( [ { attr: 'letterSpacing', value: '1px', merge: 'replace' } ], C, null ), [ { attr: 'letterSpacing', value: C, merge: 'replace' } ] );
} );

test( 'nearestBoundary returns 768 or 1024 and the signed distance', () => {
	assert.deepEqual( nearestBoundary( 768 ), { boundary: 768, offset: 0 } );
	assert.deepEqual( nearestBoundary( 800 ), { boundary: 768, offset: 32 } );
	assert.deepEqual( nearestBoundary( 960 ), { boundary: 1024, offset: -64 } );
	assert.deepEqual( nearestBoundary( 320 ), { boundary: 768, offset: -448 } );
} );

const series = ( fn ) => SWEEP_WIDTHS.map( ( width ) => ( { width, value: fn( width ) } ) );

test( 'MUST FAIL: a step at 800px instead of the SGS boundary is logged with the width it lands on and its distance from 768', () => {
	const steps = breakpointSteps( 'padding-top', series( ( w ) => ( w < 800 ? '24px' : '48px' ) ) );
	assert.equal( steps.length, 1 );
	assert.deepEqual( steps[ 0 ], { prop: 'padding-top', from: '24px', to: '48px', between: [ 784, 800 ], at: 800, boundary: 768, offset: 32, onBoundary: false } );
} );

test( 'a step exactly at an SGS boundary is on it; a media-query pair at 768 and 1024 gives two steps, both on their boundaries', () => {
	const one = breakpointSteps( 'display', series( ( w ) => ( w < 768 ? 'block' : 'flex' ) ) );
	assert.deepEqual( one.map( ( s ) => [ s.at, s.boundary, s.onBoundary ] ), [ [ 768, 768, true ] ] );
	const two = breakpointSteps( 'font-size', series( ( w ) => ( w < 768 ? '16px' : w < 1024 ? '20px' : '24px' ) ) );
	assert.deepEqual( two.map( ( s ) => [ s.at, s.boundary, s.onBoundary ] ), [ [ 768, 768, true ], [ 1024, 1024, true ] ] );
} );

test( 'a constant series and a pure fluid ramp log nothing; a ramp with a jump in it logs only the jump', () => {
	assert.deepEqual( breakpointSteps( 'color', series( () => 'rgb(0, 0, 0)' ) ), [] );
	assert.deepEqual( breakpointSteps( 'font-size', series( ( w ) => `${ 12 + w * 0.01 }px` ) ), [] );
	const jump = breakpointSteps( 'font-size', series( ( w ) => `${ 12 + w * 0.01 + ( w >= 768 ? 12 : 0 ) }px` ) );
	assert.deepEqual( jump.map( ( s ) => [ s.at, s.onBoundary ] ), [ [ 768, true ] ] );
} );

test( 'non-numeric and vector values: a keyword change is a step; track lists that only ramp are not; a colour jump is one step', () => {
	assert.equal( breakpointSteps( 'grid-template-columns', series( ( w ) => ( w < 768 ? 'none' : `${ w * 0.5 }px ${ w * 0.4 }px` ) ) ).length, 1 );
	assert.deepEqual( breakpointSteps( 'grid-template-columns', series( ( w ) => `${ w * 0.5 }px ${ w * 0.4 }px` ) ), [] );
	const colour = breakpointSteps( 'background-color', series( ( w ) => ( w < 1024 ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)' ) ) );
	assert.deepEqual( colour.map( ( s ) => [ s.at, s.boundary, s.onBoundary ] ), [ [ 1024, 1024, true ] ] );
} );

test( 'sweepSteps labels every step with its node and slot and orders them, logging for a human and writing nothing', () => {
	const sweep = {
		'2:': { 'font-size': series( () => '16px' ), 'padding-top': series( ( w ) => ( w < 800 ? '8px' : '16px' ) ) },
		'1:.sgs-card__t': { display: series( ( w ) => ( w < 768 ? 'block' : 'flex' ) ) },
		'1:': { 'row-gap': series( ( w ) => ( w < 1024 ? '8px' : '24px' ) ) },
	};
	const label = ( id ) => ( { node: `cr-ref-x-${ id.split( ':' )[ 0 ] }`, slot: id.split( ':' )[ 1 ] } );
	const steps = sweepSteps( sweep, label );
	assert.deepEqual( steps.map( ( s ) => [ s.node, s.slot, s.prop, s.at, s.boundary, s.onBoundary ] ), [
		[ 'cr-ref-x-1', '', 'row-gap', 1024, 1024, true ],
		[ 'cr-ref-x-1', '.sgs-card__t', 'display', 768, 768, true ],
		[ 'cr-ref-x-2', '', 'padding-top', 800, 768, false ],
	] );
	assert.deepEqual( sweepSteps( {}, label ), [] );
} );

test( 'a missing reading (the element not rendered at a width) is skipped, not logged as a step', () => {
	const s = series( ( w ) => ( w < 700 ? undefined : '20px' ) );
	assert.deepEqual( breakpointSteps( 'font-size', s ), [] );
} );
