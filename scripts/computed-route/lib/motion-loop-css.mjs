// A draft's endless keyframe animation as the CSS of a block's Additional CSS box (Spec 48 FR-48-78; Spec 32 FR-32-20),
// for a loop no motion effect draws (lib/motion-loops.mjs::chooseEffect reports it unmapped). The Web Animations API
// applies a record's easing once across the whole iteration and interpolates its keyframes linearly; CSS applies
// `animation-timing-function` per keyframe interval. So the CSS runs `linear` over stops sampled from the whole-cycle
// curve: for each stop's time t, the easing gives the progress and the draft's keyframes are interpolated at it. The
// stop count is the smallest whose linear-between-stops error against the true curve is within tolerance.
//
// Every function here is pure: no DOM, no file reads.

const NAMED = { ease: [ 0.25, 0.1, 0.25, 1 ], 'ease-in': [ 0.42, 0, 1, 1 ], 'ease-out': [ 0, 0, 0.58, 1 ], 'ease-in-out': [ 0.42, 0, 0.58, 1 ] };

// The four numbers of a cubic-bezier easing, [] for `linear` (or none), null for any easing this module cannot sample
// (steps(), linear(), a malformed bezier).
export function bezierOf( easing ) {
	const e = String( easing ?? 'linear' ).trim().toLowerCase();
	if ( 'linear' === e ) {
		return [];
	}
	if ( NAMED[ e ] ) {
		return NAMED[ e ];
	}
	const m = /^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/.exec( e );
	const n = m ? m.slice( 1 ).map( Number ) : null;
	return n && n.every( Number.isFinite ) && n[ 0 ] >= 0 && n[ 0 ] <= 1 && n[ 2 ] >= 0 && n[ 2 ] <= 1 ? n : null;
}

// The eased progress for time t in 0..1: solve x(s) = t on the bezier by bisection, return y(s).
export function easedProgress( bezier, t ) {
	if ( ! bezier.length || t <= 0 || t >= 1 ) {
		return Math.min( 1, Math.max( 0, t ) );
	}
	const [ x1, y1, x2, y2 ] = bezier;
	const at = ( a, b, s ) => 3 * a * s * ( 1 - s ) ** 2 + 3 * b * s * s * ( 1 - s ) + s ** 3;
	let lo = 0;
	let hi = 1;
	for ( let i = 0; i < 60; i++ ) {
		const mid = ( lo + hi ) / 2;
		if ( at( x1, x2, mid ) < t ) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return at( y1, y2, ( lo + hi ) / 2 );
}

// A CSS value split into its literal skeleton and its numbers: `scale(1.35) rotate(90deg)` is
// { shape: 'scale(#) rotate(#deg)', nums: [1.35, 90], units: ['', 'deg'] }. A unitless 0 inside rotate() or skew()
// is read as 0deg, so `rotate(0)` and `rotate(180deg)` interpolate.
const NUM = /(-?\d*\.?\d+(?:e-?\d+)?)([a-z%]*)/gi;
function templateOf( value ) {
	const text = String( value ).trim().replace( /\b(rotate[XYZ]?|skew[XY]?)\(\s*0\s*\)/gi, '$1(0deg)' );
	const nums = [];
	const units = [];
	const shape = text.replace( NUM, ( _, n, u ) => {
		nums.push( Number( n ) );
		units.push( u );
		return '#';
	} );
	return { shape: shape + '|' + units.join( ',' ), nums, units, text: shape };
}

// A keyframe as { offset, props: { property: value } }. Accepts the inventory's two shapes: { offset?, <css property>:
// value } and { offset?, value } under a property row. Missing offsets are spread evenly; offsets of 0 to 100 (not 0 to
// 1) are read as percentages.
function framesOf( properties ) {
	const rows = ( properties || [] ).filter( ( p ) => 'animation-name' !== p.property && Array.isArray( p.keyframes ) && p.keyframes.length > 1 );
	if ( ! rows.length ) {
		return null;
	}
	let frames = null;
	for ( const row of rows ) {
		const list = row.keyframes;
		const spread = list.map( ( k, i ) => ( 'number' === typeof k.offset ? k.offset : i / ( list.length - 1 ) ) );
		const scale = Math.max( ...spread ) > 1 ? 100 : 1;
		const mine = list.map( ( k, i ) => ( { offset: spread[ i ] / scale, props: { [ row.property ]: String( undefined !== k[ row.property ] ? k[ row.property ] : k.value ) } } ) );
		if ( ! frames ) {
			frames = mine;
		} else if ( frames.length === mine.length && frames.every( ( f, i ) => Math.abs( f.offset - mine[ i ].offset ) < 1e-9 ) ) {
			frames = frames.map( ( f, i ) => ( { ...f, props: { ...f.props, ...mine[ i ].props } } ) );
		} else {
			return null;
		}
	}
	return frames;
}

// How far two values can differ before the match is off, by unit (a margin inside the 1 degree, 0.5px and 0.005
// the match is held to): degrees 0.75, px 0.4, anything else (scale, opacity) 0.005.
const TOLERANCE = { deg: 0.75, px: 0.4 };
const tolerance = ( unit ) => TOLERANCE[ unit ] ?? 0.005;
const PRECISION = { deg: 2, px: 2 };
const precision = ( unit ) => PRECISION[ unit ] ?? 4;

// The draft's value at progress p (0..1) as numbers: linear between the keyframes either side of p. `props` is one
// property's frames [{ offset, tpl }].
function valueAt( frames, p ) {
	let i = frames.findIndex( ( f ) => f.offset >= p );
	i = -1 === i ? frames.length - 1 : Math.max( 1, i );
	const a = frames[ i - 1 ];
	const b = frames[ i ];
	const k = b.offset === a.offset ? 1 : Math.min( 1, Math.max( 0, ( p - a.offset ) / ( b.offset - a.offset ) ) );
	return a.tpl.nums.map( ( n, j ) => n + ( b.tpl.nums[ j ] - n ) * k );
}

const fixed = ( n, dp ) => String( Number( n.toFixed( dp ) ) );
const textOf = ( tpl, nums ) => {
	let j = 0;
	return tpl.text.replace( /#/g, () => {
		const unit = tpl.units[ j ];
		const n = fixed( nums[ j ], precision( unit ) );
		j += 1;
		return n + unit;
	} );
};
const pct = ( x ) => `${ fixed( x * 100, 2 ) }%`;

// Whether linear interpolation between `count` evenly spaced stops stays within tolerance of the true curve, and the
// worst error per unit.
function worst( tracks, bezier, count ) {
	const out = {};
	const stops = Array.from( { length: count + 1 }, ( _, i ) => tracks.map( ( tr ) => valueAt( tr.frames, easedProgress( bezier, i / count ) ) ) );
	const samples = 600;
	for ( let s = 0; s <= samples; s++ ) {
		const t = s / samples;
		const i = Math.min( count - 1, Math.floor( t * count ) );
		const k = t * count - i;
		tracks.forEach( ( tr, ti ) => {
			const truth = valueAt( tr.frames, easedProgress( bezier, t ) );
			truth.forEach( ( v, j ) => {
				const approx = stops[ i ][ ti ][ j ] + ( stops[ i + 1 ][ ti ][ j ] - stops[ i ][ ti ][ j ] ) * k;
				const unit = tr.frames[ 0 ].tpl.units[ j ];
				out[ unit ] = Math.max( out[ unit ] ?? 0, Math.abs( approx - v ) );
			} );
		} );
	}
	return out;
}

// The loop as its CSS. record: an animations.json record (`properties[].keyframes`, `duration_ms`, `delay_ms`,
// `easing`, `iterations`, `direction`). name: the keyframes name (the box renames it per block). Returns { css, stops,
// error } (error: the worst gap per unit against the true curve) or { unmapped: reason }.
export function loopKeyframesCss( record, name ) {
	const frames = framesOf( record.properties );
	if ( ! frames || 'number' !== typeof record.duration_ms || record.duration_ms <= 0 ) {
		return { unmapped: 'its keyframes or duration are not literal values the Additional CSS box can hold' };
	}
	const bezier = bezierOf( record.easing );
	if ( ! bezier ) {
		return { unmapped: `its ${ record.easing } easing is a curve no cubic-bezier states` };
	}
	const names = Object.keys( frames[ 0 ].props );
	const tracks = [];
	for ( const property of names ) {
		const list = frames.map( ( f ) => ( { offset: f.offset, tpl: templateOf( f.props[ property ] ?? '' ) } ) );
		if ( list.some( ( f ) => f.tpl.shape !== list[ 0 ].tpl.shape ) || ! list[ 0 ].tpl.nums.length ) {
			return { unmapped: `its ${ property } keyframes do not share one list of functions, so no value lies between them` };
		}
		tracks.push( { property, frames: list } );
	}
	const linear = ! bezier.length;
	let count = linear ? frames.length - 1 : 4;
	let error = worst( tracks, bezier, count );
	const within = ( e ) => Object.entries( e ).every( ( [ unit, v ] ) => v < tolerance( unit ) );
	if ( linear ) {
		const stops = frames.map( ( f ) => ( { at: f.offset, tracks: tracks.map( ( tr, ti ) => ( { tr, nums: tr.frames.find( ( x ) => x.offset === f.offset ).tpl.nums, ti } ) ) } ) );
		return { css: assemble( record, name, stops.map( ( s ) => `${ pct( s.at ) }{${ s.tracks.map( ( x ) => `${ x.tr.property }:${ textOf( x.tr.frames[ 0 ].tpl, x.nums ) }` ).join( ';' ) }}` ), 'linear' ), stops: frames.length, error: {} };
	}
	while ( ! within( error ) && count < 200 ) {
		count += 2;
		error = worst( tracks, bezier, count );
	}
	if ( ! within( error ) ) {
		return { unmapped: 'no stop count under 200 reproduces its easing within tolerance' };
	}
	const blocks = Array.from( { length: count + 1 }, ( _, i ) => {
		const p = easedProgress( bezier, i / count );
		return `${ pct( i / count ) }{${ tracks.map( ( tr ) => `${ tr.property }:${ textOf( tr.frames[ 0 ].tpl, valueAt( tr.frames, p ) ) }` ).join( ';' ) }}`;
	} );
	return { css: assemble( record, name, blocks, 'linear' ), stops: count + 1, error };
}

// "2400" ms as "2.4s", a whole number of seconds as "2s".
const secondsOf = ( ms ) => `${ fixed( ms / 1000, 3 ) }s`;

// The box content: the animation under a reduced-motion gate on the block itself (`&`), then the keyframes.
function assemble( record, name, blocks, timing ) {
	const extras = [ record.delay_ms ? secondsOf( record.delay_ms ) : null, 'infinite', /^(alternate|reverse|alternate-reverse)$/.test( record.direction || '' ) ? record.direction : null ].filter( Boolean );
	return `@media (prefers-reduced-motion: no-preference){ & { animation: ${ name } ${ secondsOf( record.duration_ms ) } ${ timing } ${ extras.join( ' ' ) }; } } @keyframes ${ name } { ${ blocks.join( ' ' ) } }`;
}

// The keyframes name for a record: unique within a block, a valid identifier.
export const loopName = ( record ) => `sgs-loop-${ String( record.id ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' ) }`;

// Whether a record is an endless keyframe animation this module can write: group "loop" or iterations "infinite",
// keyframes on a property row.
export const isLoopRecord = ( record ) => ! ( record.properties || [] ).some( ( p ) => null !== ( p.formula ?? null ) ) && ( 'infinite' === record.iterations || Infinity === record.iterations ) && Array.isArray( ( record.properties || [] ).find( ( p ) => Array.isArray( p.keyframes ) )?.keyframes );
