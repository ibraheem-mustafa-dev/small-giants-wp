// A draft's endless animations as effect layers (Spec 48 FR-48-78; Spec 38A FR-38A-44, FR-38A-52): the effects whose
// owned channels (`fx_effects`) cover the channels a loop moves are tried smallest first, and an effect is chosen only
// when its values reproduce the loop's motion. A one-axis, linear, one-way translate is a marquee, its speed the
// travel over the loop time in px/s. A <marquee> element and SVG animation elements are loops too. A loop no effect
// reproduces is reported as a Spec 38 gap. The chosen effect is written through lib/motion-effects.mjs::writeEffect.
import { propertyChannels, transformChannels, filterChannels } from './motion-layers.mjs';

const RANDOM = /Math\.random|\brnd\(/;
const camel = ( k ) => k.replace( /-([a-z])/g, ( _, c ) => c.toUpperCase() );

// The channel family of a channel: the `fx_effects.owned_properties` channel names.
const FAMILY = { translateX: 'translate', translateY: 'translate', scale: 'scale', scaleX: 'scale', scaleY: 'scale', rotate: 'rotate', rotateX: 'rotate', rotateY: 'rotate', opacity: 'opacity', blur: 'filter', grayscale: 'filter', brightness: 'filter' };

// One measured keyframe's channels: { channels, unsupported, other }.
function frameChannels( frame ) {
	const out = { channels: {}, unsupported: [], other: [] };
	for ( const [ k, v ] of Object.entries( frame ) ) {
		if ( 'offset' === k ) {
			continue;
		}
		const p = 'boxShadow' === k ? 'box-shadow' : k;
		const c = propertyChannels( p, v );
		if ( c.other ) {
			out.other.push( p );
		} else {
			Object.assign( out.channels, c.channels );
			out.unsupported.push( ...c.unsupported );
		}
	}
	return out;
}

// The measured endless animation that is this record's: a CSS animation by its name, a Web Animation by the
// properties it animates.
export function measuredLoopOf( record, measured ) {
	const loops = measured?.loops || [];
	if ( 'css-animation' === record.mechanism ) {
		const name = ( record.properties || [] ).find( ( p ) => 'animation-name' === p.property )?.to;
		return loops.find( ( l ) => l.css && l.name === name ) || null;
	}
	const props = ( record.properties || [] ).map( ( p ) => camel( p.property ) );
	return loops.find( ( l ) => ! l.css && props.every( ( p ) => l.frames.some( ( f ) => p in f ) ) ) || null;
}

// A record's loop with every value known: from the code where it states them, else (a value the code computes at run
// time, a CSS animation's keyframes) from the animation the draft's code made, read at one width. { loop } or
// { unmapped }. A loop: { frames: [channels], duration, delay, direction, easing, box, other, unsupported }.
export function resolvedLoop( record, measured ) {
	const texts = [ record.duration_ms, record.delay_ms, ...( record.properties || [] ).flatMap( ( p ) => [ p.from, p.to, p.formula ] ) ].filter( ( x ) => 'string' === typeof x );
	if ( texts.some( ( t ) => RANDOM.test( t ) ) ) {
		return { unmapped: 'the draft randomises this loop per element (Math.random in its values or timing); no effect randomises its values, a Spec 38 gap' };
	}
	const computed = ( record.properties || [] ).some( ( p ) => null !== ( p.formula ?? null ) || 'animation-name' === p.property ) || 'number' !== typeof record.duration_ms;
	const m = measuredLoopOf( record, measured );
	if ( computed && ! m ) {
		return { unmapped: 'its values are computed in the code and the render showed no matching endless animation on this element' };
	}
	let frames;
	const other = [];
	const unsupported = [];
	if ( computed ) {
		frames = m.frames.map( ( f ) => {
			const c = frameChannels( f );
			other.push( ...c.other );
			unsupported.push( ...c.unsupported );
			return c.channels;
		} );
	} else {
		const from = {};
		const to = {};
		for ( const p of record.properties || [] ) {
			const f = propertyChannels( p.property, p.from );
			const t = propertyChannels( p.property, p.to );
			if ( f.other ) {
				other.push( p.property );
				continue;
			}
			Object.assign( from, f.channels );
			Object.assign( to, t.channels );
			unsupported.push( ...f.unsupported, ...t.unsupported );
		}
		frames = [ from, to ];
	}
	return {
		loop: {
			frames,
			duration: 'number' === typeof record.duration_ms ? record.duration_ms : m.duration,
			delay: 'number' === typeof record.delay_ms ? record.delay_ms : m?.delay ?? 0,
			direction: record.direction || m?.direction || 'normal',
			easing: record.easing ?? m?.easing ?? null,
			box: measured?.box || null,
			other: [ ...new Set( other ) ],
			unsupported: [ ...new Set( unsupported ) ],
		},
	};
}

// The channel families a loop moves (channels that change between frames).
export function loopFamilies( loop ) {
	const keys = new Set( loop.frames.flatMap( ( f ) => Object.keys( f ) ) );
	const moving = [ ...keys ].filter( ( k ) => new Set( loop.frames.map( ( f ) => JSON.stringify( f[ k ] ?? null ) ) ).size > 1 );
	return { moving, families: [ ...new Set( moving.map( ( k ) => FAMILY[ k ] ) ) ] };
}

const px = ( v, along ) => ( 'number' === typeof v ? v : /%$/.test( String( v ) ) && along ? ( Number( String( v ).slice( 0, -1 ) ) / 100 ) * along : null );
const round = ( n, p = 3 ) => Math.round( n * 10 ** p ) / 10 ** p;
const isLinear = ( e ) => null === e || 'linear' === e;
const zero = ( v ) => 0 === v || '0px' === v || '0%' === v;

// Each builder: a loop (and its moving channels) as the effect's values, { values, notes }, or null when the effect
// cannot draw that loop's motion.
export const LOOP_BUILDERS = {
	marquee( loop, moving ) {
		const k = moving[ 0 ];
		if ( 1 !== moving.length || ! /^translate[XY]$/.test( k ) || 2 !== loop.frames.length || ! zero( loop.frames[ 0 ][ k ] ?? 0 ) || ! isLinear( loop.easing ) || ! /^(normal|reverse)$/.test( loop.direction ) ) {
			return null;
		}
		const along = 'translateX' === k ? loop.box?.width : loop.box?.height;
		const dist = px( loop.frames[ 1 ][ k ], along );
		if ( ! dist || ! loop.duration ) {
			return null;
		}
		const sign = Math.sign( dist ) * ( 'reverse' === loop.direction ? -1 : 1 );
		const direction = 'translateX' === k ? ( sign < 0 ? 'left' : 'right' ) : ( sign < 0 ? 'up' : 'down' );
		return { values: { speed: round( Math.abs( dist ) / ( loop.duration / 1000 ), 1 ), direction }, notes: [ `marquee speed ${ round( Math.abs( dist ), 1 ) }px over ${ round( loop.duration, 0 ) }ms` ] };
	},
	'ambient-float'( loop, moving ) {
		if ( ! moving.every( ( k ) => /^translate[XY]$/.test( k ) ) || 2 !== loop.frames.length || ! /^(normal|alternate)$/.test( loop.direction ) ) {
			return null;
		}
		const [ from, to ] = loop.frames;
		if ( ! moving.every( ( k ) => zero( from[ k ] ?? 0 ) ) || loop.duration < 500 || loop.duration > 60000 ) {
			return null;
		}
		const both = 2 === moving.length;
		const axis = both ? 'both' : 'translateX' === moving[ 0 ] ? 'x' : 'y';
		const values = { axis, travel: to[ both || 'x' === axis ? 'translateX' : 'translateY' ], period: loop.duration, direction: loop.direction };
		if ( both ) {
			values.travelY = to.translateY;
		}
		if ( loop.easing ) {
			values.easing = loop.easing;
		}
		const notes = [];
		const cycle = ( 'alternate' === loop.direction ? 2 : 1 ) * loop.duration;
		if ( loop.delay < 0 ) {
			values.phase = Math.round( -loop.delay % cycle );
		} else if ( loop.delay > 0 ) {
			values.phase = Math.round( ( cycle - ( loop.delay % cycle ) ) % cycle );
			notes.push( `the draft starts the float ${ loop.delay }ms late; the phase gives the same motion from then on, and the float moves during those first ${ loop.delay }ms` );
		}
		return { values, notes };
	},
	'svg-loop'( loop, moving ) {
		if ( 1 !== moving.length || 'opacity' !== moving[ 0 ] ) {
			return null;
		}
		const ops = loop.frames.map( ( f ) => f.opacity ?? 1 );
		const two = 2 === ops.length && 'alternate' === loop.direction && 1 === ops[ 0 ] && ops[ 1 ] < 1;
		const three = 3 === ops.length && 'normal' === loop.direction && 1 === ops[ 0 ] && 1 === ops[ 2 ] && ops[ 1 ] < 1;
		const amplitude = round( ( 1 - ops[ 1 ] ) / 0.5 );
		if ( ( ! two && ! three ) || amplitude > 5 ) {
			return null;
		}
		const notes = 'ease' === loop.easing ? [] : [ `the pulse eases ease between its keyframes; the draft's ${ loop.easing || 'linear' } is not kept` ];
		return { values: { motion: 'pulse', duration: two ? 2 * loop.duration : loop.duration, amplitude }, notes };
	},
	'ken-burns'( loop, moving ) {
		const [ from, to ] = loop.frames;
		if ( ! loop.box?.surface || ! moving.includes( 'scale' ) || ! moving.every( ( k ) => /^(scale|translate[XY])$/.test( k ) ) || 2 !== loop.frames.length || 'alternate' !== loop.direction ) {
			return null;
		}
		const zoomStart = round( ( from.scale ?? 1 ) * 100, 1 );
		const zoomEnd = round( ( to.scale ?? 1 ) * 100, 1 );
		if ( [ zoomStart, zoomEnd ].some( ( z ) => z < 100 || z > 200 ) ) {
			return null;
		}
		const x = Number( to.translateX ) || 0;
		const y = Number( to.translateY ) || 0;
		const panDirection = ! x && ! y ? 'none' : Math.abs( x ) >= Math.abs( y ) ? ( x < 0 ? 'left' : 'right' ) : y < 0 ? 'up' : 'down';
		const values = { mode: 'loop', zoomStart, zoomEnd, panDirection, duration: loop.duration };
		if ( loop.easing ) {
			values.easing = loop.easing;
		}
		return { values, notes: 'none' === panDirection ? [] : [ 'Ken Burns pans by a share of the element, so the draft\'s pan distance is not kept' ] };
	},
};

// The effect that draws a loop: { effect, values, devices, trigger, notes } or { unmapped }. `narrow` is { tablet,
// mobile: the same loop at 768 and 375, or null }; a narrower width whose numbers differ by more than 2% overrides them
// (writeEffect keeps only the fields the DB marks per-device). The effects tried are those with a builder whose
// `fx_effects` owned channels cover the families the loop moves, smallest first, after any that own no channel (the
// marquee moves a lane of its own).
export function chooseEffect( loop, narrow, { mdb } ) {
	if ( loop.unsupported.length || loop.other.length ) {
		return { unmapped: `the loop animates ${ [ ...loop.unsupported, ...loop.other ].join( ', ' ) }, which no effect owns: a Spec 38 gap` };
	}
	const { moving, families } = loopFamilies( loop );
	const owners = mdb.effects().filter( ( e ) => LOOP_BUILDERS[ e ] && mdb.effect( e ).panels.includes( 'effects' ) ).map( ( e ) => ( { e, owned: mdb.effect( e ).owned.channels } ) );
	const candidates = [ ...owners.filter( ( o ) => ! o.owned.length ), ...owners.filter( ( o ) => o.owned.length && families.every( ( f ) => o.owned.includes( f ) ) ).sort( ( a, b ) => a.owned.length - b.owned.length ) ].map( ( o ) => o.e );
	for ( const effect of candidates ) {
		const built = LOOP_BUILDERS[ effect ]( loop, moving );
		if ( ! built ) {
			continue;
		}
		const devices = {};
		for ( const [ tier, other ] of Object.entries( narrow || {} ) ) {
			const b = other && LOOP_BUILDERS[ effect ]( other, loopFamilies( other ).moving );
			for ( const [ k, v ] of Object.entries( b?.values || {} ) ) {
				const base = built.values[ k ];
				if ( 'number' === typeof v && 'number' === typeof base && Math.abs( v - base ) > 0.02 * Math.abs( base ) ) {
					devices[ tier ] = { ...( devices[ tier ] || {} ), [ k ]: v };
				}
			}
		}
		const trigger = mdb.effect( effect ).triggers.includes( 'load' ) ? 'load' : null;
		return { effect, values: built.values, devices, trigger, notes: built.notes };
	}
	return { unmapped: `no effect draws this loop (${ families.join( ' and ' ) || 'nothing' } moving, ${ loop.direction }, ${ loop.duration }ms; tried ${ candidates.join( ', ' ) || 'none' }): a Spec 38 gap` };
}

// A draft's endless animation record as an effect (chooseEffect), its values from the code or, where the code
// computes them, from the animation measured at each width (`measuredByWidth`: { 375, 768, 1440: { loops, box } }
// from lib/fill-entrance.mjs::sampleMotion).
export function loopEffect( record, measuredByWidth, { mdb } ) {
	const at = ( w ) => resolvedLoop( record, measuredByWidth?.[ w ] || null );
	const wide = at( 1440 );
	if ( wide.unmapped ) {
		return wide;
	}
	return chooseEffect( wide.loop, { tablet: at( 768 ).loop || null, mobile: at( 375 ).loop || null }, { mdb } );
}

const sameFrames = ( a, b ) => a.length === b.length && a.every( ( f, i ) => Object.keys( { ...f, ...b[ i ] } ).every( ( k ) => Math.abs( ( Number( f[ k ] ) || 0 ) - ( Number( b[ i ][ k ] ) || 0 ) ) < 0.01 ) );

// The loop records (among `candidates`, the records whose element the code picks at run time) that are the endless
// animation measured on an element: a CSS animation by name; a Web Animation by its properties, and where the code
// states its keyframes and duration, by those too. [] when none is.
export function runtimeLoopsFor( candidates, measured ) {
	return ( candidates || [] ).filter( ( r ) => {
		const m = measuredLoopOf( r, measured );
		if ( ! m ) {
			return false;
		}
		const own = resolvedLoop( r, { loops: [ m ], box: measured.box } ).loop;
		const literal = ! ( r.properties || [] ).some( ( p ) => null !== ( p.formula ?? null ) || 'animation-name' === p.property );
		return ! literal || ! own || ( sameFrames( own.frames, m.frames.map( ( f ) => frameChannels( f ).channels ) ) && ( 'number' !== typeof r.duration_ms || Math.abs( r.duration_ms - m.duration ) < 1 ) );
	} );
}

const seconds = ( t ) => {
	const m = /^\s*(\d*\.?\d+)\s*(ms|s|min)?\s*$/.exec( String( t ?? '' ) );
	return m ? Number( m[ 1 ] ) * ( { ms: 1, s: 1000, min: 60000 }[ m[ 2 ] || 's' ] ) : null;
};

// An SVG animation element (<animate>, <animateTransform>) that repeats indefinitely as a loop, or null.
export function smilLoop( a, box = null ) {
	if ( 'indefinite' !== a.repeatCount ) {
		return null;
	}
	const vals = a.values ? a.values.split( ';' ).map( ( s ) => s.trim() ).filter( Boolean ) : [ a.from, a.to ].filter( ( x ) => null !== x && undefined !== x );
	const channelsOf = ( v ) => {
		if ( 'animate' === a.tag && 'opacity' === a.attributeName ) {
			return { channels: { opacity: Number( v ) }, unsupported: [] };
		}
		if ( 'animateTransform' === a.tag ) {
			return transformChannels( `${ a.type }(${ v.replace( /\s+/g, ', ' ) })` );
		}
		return 'animate' === a.tag && 'filter' === a.attributeName ? filterChannels( v ) : { channels: {}, unsupported: [ a.attributeName ] };
	};
	const frames = vals.map( channelsOf );
	const duration = seconds( a.dur );
	if ( vals.length < 2 || ! duration ) {
		return null;
	}
	return { frames: frames.map( ( f ) => f.channels ), duration, delay: 0, direction: 'normal', easing: 'linear', box, other: [], unsupported: [ ...new Set( frames.flatMap( ( f ) => f.unsupported ) ) ] };
}

// A <marquee> element's attributes as the marquee effect's values: scrollamount px every scrolldelay ms (6 and 85 by
// default; a delay under 60 counts as 60 unless truespeed is set, as browsers run it). null for behavior="alternate" or
// "slide", which no effect draws.
export function marqueeTag( attrs ) {
	if ( attrs.behavior && 'scroll' !== attrs.behavior ) {
		return null;
	}
	const amount = Number( attrs.scrollamount ?? 6 ) || 6;
	const raw = Number( attrs.scrolldelay ?? 85 ) || 85;
	const delay = null === attrs.truespeed || undefined === attrs.truespeed ? Math.max( 60, raw ) : raw;
	const direction = [ 'left', 'right', 'up', 'down' ].includes( attrs.direction ) ? attrs.direction : 'left';
	return { speed: round( amount / ( delay / 1000 ), 1 ), direction };
}
