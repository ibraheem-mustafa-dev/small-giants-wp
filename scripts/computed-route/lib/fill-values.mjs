// The values FR-47-4 says need care. Fluid sizes: sampled at five widths, linear within 0.5px means fluid, written as
// clamp() only where calibration showed the setting accepts one. Breakpoints: swept every 16px from 320 to 1920, each
// step logged against the nearest SGS boundary so a human can decide (nothing here writes a ledger entry).
import { parseLength, round } from './normalise.mjs';

export const FLUID_WIDTHS = [ 375, 768, 1024, 1440, 1920 ];
export const SWEEP_WIDTHS = Array.from( { length: 101 }, ( _, i ) => 320 + i * 16 );
// The widths the SGS tiers change at: tablet from 768, desktop from 1024.
export const SGS_BOUNDARIES = [ 768, 1024 ];
// The properties read at the extra fluid widths: the lengths a clamp() could carry.
export const LENGTH_PROPS = [ 'font-size', 'line-height', 'letter-spacing', 'min-height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'row-gap', 'column-gap' ];
// Linear and equal both mean within this many px.
export const FLUID_TOL = 0.5;

const px = ( v ) => {
	if ( 'number' === typeof v ) {
		return v;
	}
	const l = parseLength( v );
	return l && 'px' === l.unit ? l.n : null;
};

// One sampled series ({ width: px number or "Npx" }, every FLUID_WIDTHS entry) as a straight line through its first and
// last sample, or null: a missing or non-px sample, a constant, or any sample more than FLUID_TOL off the line.
// Returns { slope (px per px of width), intercept (px), minPx, maxPx, clamp }.
export function fitFluid( samples ) {
	const ys = FLUID_WIDTHS.map( ( w ) => px( samples?.[ w ] ) );
	if ( ys.some( ( y ) => null === y ) || Math.max( ...ys ) - Math.min( ...ys ) <= FLUID_TOL ) {
		return null;
	}
	const [ w0, w1 ] = [ FLUID_WIDTHS[ 0 ], FLUID_WIDTHS.at( -1 ) ];
	const slope = ( ys.at( -1 ) - ys[ 0 ] ) / ( w1 - w0 );
	const intercept = ys[ 0 ] - slope * w0;
	if ( FLUID_WIDTHS.some( ( w, i ) => Math.abs( ys[ i ] - ( intercept + slope * w ) ) > FLUID_TOL ) ) {
		return null;
	}
	const [ minPx, maxPx ] = [ round( Math.min( ys[ 0 ], ys.at( -1 ) ) ), round( Math.max( ys[ 0 ], ys.at( -1 ) ) ) ];
	const vw = `${ round( slope * 100 ) }vw`;
	const b = round( Math.abs( intercept ) );
	const term = b < 0.001 ? vw : `${ vw } ${ intercept < 0 ? '-' : '+' } ${ b }px`;
	return { slope, intercept, minPx, maxPx, clamp: `clamp(${ minPx }px, ${ term }, ${ maxPx }px)` };
}

// Whether calibration showed the setting accepts a clamp() string (its `forms` lists 'clamp').
export const acceptsClamp = ( calibration, attr ) => !! calibration?.settings?.[ attr ]?.forms?.includes( 'clamp' );

const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
const TIERS = [ 'desktop', 'tablet', 'mobile' ];

// The resolver's writes for a fluid property with the per-tier values replaced by one clamp at the base tier. A tier
// object keeps only desktop (tablet and mobile show it); in a box the measured `side` (null: every side) takes the
// clamp and the sides the resolver seeded stay; flat sibling attributes keep only the base one. Input is not changed.
export function applyClamp( writes, clamp, side ) {
	const names = new Set( writes.map( ( w ) => w.attr ) );
	return writes.filter( ( w ) => ! ( /(Tablet|Mobile)$/.test( w.attr ) && names.has( w.attr.replace( /(Tablet|Mobile)$/, '' ) ) ) ).map( ( w ) => {
		if ( isObj( w.value ) && TIERS.some( ( t ) => t in w.value ) ) {
			const d = w.value.desktop;
			const desktop = isObj( d ) ? Object.fromEntries( Object.entries( d ).map( ( [ k, v ] ) => [ k, ! side || k === side ? clamp : v ] ) ) : clamp;
			return { ...w, value: { desktop } };
		}
		return { ...w, value: clamp };
	} );
}

// The SGS boundary nearest a width, and the width's signed distance from it.
export function nearestBoundary( width ) {
	const boundary = [ ...SGS_BOUNDARIES ].sort( ( a, b ) => Math.abs( width - a ) - Math.abs( width - b ) )[ 0 ];
	return { boundary, offset: width - boundary };
}

const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g;

// How a value changed between two readings: null (not at all), a number (the largest numeric difference, same shape of
// text) or 'shape' (different text around the numbers).
function change( a, b ) {
	const [ sa, sb ] = [ String( a ).trim(), String( b ).trim() ];
	if ( sa === sb ) {
		return null;
	}
	const [ na, nb ] = [ sa.match( NUM ), sb.match( NUM ) ];
	if ( ! na || ! nb || na.length !== nb.length || sa.replace( NUM, '#' ) !== sb.replace( NUM, '#' ) ) {
		return 'shape';
	}
	const d = Math.max( ...na.map( ( n, i ) => Math.abs( Number( n ) - Number( nb[ i ] ) ) ) );
	return d <= ( /px/.test( sa ) ? FLUID_TOL : 0.01 ) ? null : d;
}

const median = ( list ) => [ ...list ].sort( ( a, b ) => a - b )[ Math.floor( list.length / 2 ) ];

// The steps in one property's sweep: series is [{ width, value }] in width order (a width with no reading has an
// undefined value and is skipped). A fluid ramp changes at many consecutive widths by similar amounts and is not a step;
// a change that stands alone (a run of one or two), a change of text, or a jump more than 4x a ramp's median change is.
// Each step: { prop, from, to, between: [last old width, first new width], at, boundary, offset, onBoundary }, where
// boundary is the nearest of SGS_BOUNDARIES to `at` and onBoundary says the step falls on it (the old reading is below
// the boundary and the new one at or above it).
export function breakpointSteps( prop, series ) {
	const intervals = [];
	for ( let i = 1; i < series.length; i++ ) {
		const [ a, b ] = [ series[ i - 1 ], series[ i ] ];
		if ( undefined === a.value || undefined === b.value ) {
			continue;
		}
		const c = change( a.value, b.value );
		if ( null !== c ) {
			intervals.push( { i, c } );
		}
	}
	const runs = [];
	for ( const iv of intervals ) {
		const run = runs.at( -1 );
		if ( run && run.at( -1 ).i === iv.i - 1 ) {
			run.push( iv );
		} else {
			runs.push( [ iv ] );
		}
	}
	const steps = runs.flatMap( ( run ) => {
		if ( run.length < 3 ) {
			return run;
		}
		const numeric = run.filter( ( iv ) => 'shape' !== iv.c ).map( ( iv ) => iv.c );
		const limit = numeric.length ? Math.max( 2, 4 * median( numeric ) ) : 0;
		return run.filter( ( iv ) => 'shape' === iv.c || iv.c > limit );
	} );
	return steps.map( ( { i } ) => {
		const [ a, b ] = [ series[ i - 1 ], series[ i ] ];
		const { boundary, offset } = nearestBoundary( b.width );
		return { prop, from: a.value, to: b.value, between: [ a.width, b.width ], at: b.width, boundary, offset, onBoundary: a.width < boundary && boundary <= b.width };
	} );
}

// Every step in a whole sweep ({ targetId: { prop: [{ width, value }] } }), each labelled with labelOf( targetId ) (the
// node ref and slot), ordered by node, slot, width and property. For a human to read against divergences.json; nothing
// here decides or writes.
export function sweepSteps( sweep, labelOf ) {
	return Object.entries( sweep ).flatMap( ( [ id, byProp ] ) => Object.entries( byProp ).flatMap( ( [ prop, series ] ) => breakpointSteps( prop, series ).map( ( s ) => ( { ...labelOf( id ), ...s } ) ) ) )
		.sort( ( a, b ) => String( a.node ).localeCompare( String( b.node ), 'en', { numeric: true } ) || a.slot.localeCompare( b.slot ) || a.at - b.at || a.prop.localeCompare( b.prop ) );
}
