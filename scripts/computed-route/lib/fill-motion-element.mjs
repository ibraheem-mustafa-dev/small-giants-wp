// The motion layers one draft element makes on one target (Spec 48 FR-48-78, FR-48-47; Spec 38A FR-38A-33), for
// lib/fill-motion.mjs::motionWrites: its entrance (render-checked against the 375, 768 and 1440 samples, token-snapped,
// preset-named), its hover state, and the effects and Additional CSS its endless animations make. snapLayer is the
// token snapping every layer of the writer goes through.
import { hoverDevices } from './fill-state-motion.mjs';
import { classify, entranceLayer, stateTransitionLayer, hoverLayer, matchByPose } from './motion-layers.mjs';
import { snapToken, presetFor, intensityPresetFor, tokenises } from './motion-tokens.mjs';
import { loopEffect, loopCheck, chooseEffect, runtimeLoopsFor, smilLoop, marqueeTag, measuredLoopOf } from './motion-loops.mjs';
import { loopKeyframesCss, loopName, isLoopRecord } from './motion-loop-css.mjs';
import { entranceCheck } from './motion-check.mjs';
import { stateTrigger } from './motion-states.mjs';

// Every duration, easing and distance of a layer's values (and its device overrides) to a token reference where one
// equals it. `fieldOf(path)` gives the DB field for a values path.
export function snapLayer( layer, fieldOf, ctx, prefer ) {
	const walkObj = ( obj, base ) => {
		for ( const [ k, v ] of Object.entries( obj ) ) {
			const p = `${ base }.${ k }`;
			if ( v && 'object' === typeof v && ! Array.isArray( v ) ) {
				walkObj( v, p );
			} else if ( Array.isArray( v ) ) {
				v.filter( ( item ) => item && 'object' === typeof item ).forEach( ( item ) => walkObj( item, p ) );
			} else {
				const f = fieldOf( p );
				if ( f && tokenises( k, f.fieldType ) ) {
					obj[ k ] = snapToken( v, f.fieldType, { ...ctx, prefer } );
				} else if ( f && 'colourReference' === f.fieldType && 'string' === typeof v ) {
					obj[ k ] = ctx.palette?.get( v.toLowerCase() ) ?? v;
				}
			}
		}
	};
	walkObj( layer.values, 'values' );
	for ( const dev of Object.values( layer.devices || {} ) ) {
		walkObj( dev, 'values' );
	}
}

// True when the element was found at some sampled width and played no entrance at any width it was found: the render
// disagrees with the code's record, and the render wins (R-47-4).
export const renderRefutes = ( sampled ) => {
	const seen = Object.values( sampled || {} ).filter( ( m ) => undefined !== m );
	return seen.length > 0 && seen.every( ( m ) => null === m );
};

// One entrance record as a finished `entrance.base`: render-checked, token-snapped, preset-named. { layer, notes } or
// { unmapped }. `named` makes it a state or open entrance (lib/motion-states.mjs::stateTrigger); a state entrance and an
// SVG <set> are not played by the load-time render sample, so they are not render-checked. A state transition (a
// css-transition on a published motion state) is an entrance whose poses and timing are the transition's.
function finishedEntrance( record, { mdb, ctx, sampled, named = null } ) {
	const unsampled = named || 'smil-set' === record.mechanism;
	if ( ! unsampled && renderRefutes( sampled ) ) {
		return { unmapped: `the code's record names this element, but the render shows no entrance at ${ Object.keys( sampled ).join( ', ' ) }, so the render wins and nothing is written` };
	}
	const e = 'css-transition' === record.mechanism ? stateTransitionLayer( record, mdb, named ) : entranceLayer( record, mdb, sampled?.[ 1440 ] || null, named );
	if ( e.unmapped ) {
		return e;
	}
	const check = unsampled ? { devices: {}, differences: [] } : entranceCheck( e.layer, record, sampled );
	if ( Object.keys( check.devices ).length ) {
		e.layer.devices = check.devices;
	}
	snapLayer( e.layer, ( p ) => mdb.field( 'entrance.base', p ), ctx, [ 'entrance' ] );
	const preset = presetFor( e.layer, mdb.presets( 'entrance' ) ) ?? intensityPresetFor( e.layer, mdb.presets( 'entrance' ) );
	if ( preset ) {
		e.layer.preset = preset;
	}
	return { layer: e.layer, notes: [ ...e.notes, ...check.differences.map( ( d ) => `render check ${ d }` ) ] };
}

// One hover layer from an element's hover records, token-snapped and preset-named: { layer, notes, unmapped }.
function finishedHover( records, { mdb, ctx } ) {
	const h = hoverLayer( records, mdb );
	const tiered = records.find( ( r ) => Object.keys( r.tiers || {} ).length );
	if ( h.layer && tiered ) {
		const d = hoverDevices( tiered, h.layer, ( rec ) => hoverLayer( [ rec ], mdb ).layer, ( k ) => Boolean( mdb.field( 'hover.state', `values.${ k }` )?.perDevice ) );
		Object.keys( d.devices ).length && ( h.layer.devices = d.devices );
		h.unmapped.push( ...d.unmapped );
	}
	if ( h.layer ) {
		snapLayer( h.layer, ( p ) => mdb.field( 'hover.state', p ), ctx, [ 'duration', 'easing', 'distance' ] );
		const preset = presetFor( { ...h.layer, trigger: 'hover' }, mdb.presets( 'hover' ) );
		if ( preset ) {
			h.layer.preset = preset;
		}
	}
	return h;
}

// The entrance record an element plays: its own, else (when the render measured one) the run-time record whose
// from-pose it matches. `others` are the element's records no layer of this writer holds, named when they explain a
// measured motion. { record, notes, unmapped }.
function pickEntrance( own, measured, runtime, others = [] ) {
	const notes = [];
	const unmapped = own.slice( 1 ).map( ( r ) => ( { record: r.id, reason: 'a second entrance on the same element: one entrance layer per element' } ) );
	if ( own.length ) {
		return { record: own[ 0 ], notes, unmapped };
	}
	if ( ! measured ) {
		return { record: null, notes, unmapped };
	}
	const m = runtime.length ? matchByPose( runtime, measured ) : null;
	if ( m?.record ) {
		notes.push( `${ m.record.id }: the code picks this element at run time, and the render's from-pose matched it` );
		return { record: m.record, notes, unmapped };
	}
	const oneShot = others.filter( ( r ) => /^(waapi|css-animation)$/.test( r.mechanism ) );
	if ( m?.ambiguous ) {
		unmapped.push( { record: m.ambiguous.join( ',' ), reason: 'the render\'s from-pose matches more than one run-time entrance equally' } );
	} else if ( oneShot.length ) {
		notes.push( `the render shows ${ oneShot.map( ( r ) => r.id ).join( ', ' ) } playing (${ measured.durationMs }ms), which its own wave writes (see its unmapped row)` );
	} else {
		notes.push( `the render shows a ${ measured.trigger } entrance (${ measured.durationMs }ms) that no code record explains, so nothing is written` );
	}
	return { record: null, notes, unmapped };
}

// The layers one draft element's records make on one target: { element, notes, unmapped: [{ record, reason }] }.
// `runtime` holds the entrance records whose element the code picks at run time; `offers` ({ names, opens, openWords },
// lib/motion-states.mjs::stateTrigger) lets a one-shot animation the draft starts on a state change become a state or
// open entrance on a block that publishes that state (an animation on either, a transition only on a named state);
// `target` is the part the element is.
export function elementMotion( records, { mdb, ctx, sampled, runtime = [], offers = null, target = 'root' } ) {
	const element = {};
	const named = new Map();
	const kinds = records.map( ( r ) => {
		let s = offers && /^(?:waapi|css-animation|css-transition)$/.test( r.mechanism ) && 'active' === r.status ? stateTrigger( r, offers, target ) : null;
		s = s && ( 'css-transition' !== r.mechanism || 'state' === s.trigger ) ? s : null;
		if ( s ) {
			named.set( r.id, s );
		}
		return { r, c: s ? { kind: 'entrance' } : classify( r, { css: ctx.css } ) };
	} );
	const unmapped = kinds.filter( ( x ) => 'skip' === x.c.kind ).map( ( x ) => ( { record: x.r.id, reason: x.c.reason } ) );
	const pick = pickEntrance( kinds.filter( ( x ) => 'entrance' === x.c.kind ).map( ( x ) => x.r ), sampled?.[ 1440 ] || null, runtime, kinds.filter( ( x ) => 'skip' === x.c.kind ).map( ( x ) => x.r ) );
	const notes = [ ...pick.notes ];
	const used = [];
	unmapped.push( ...pick.unmapped );
	if ( pick.record ) {
		const e = finishedEntrance( pick.record, { mdb, ctx, sampled, named: named.get( pick.record.id ) || null } );
		if ( e.unmapped ) {
			unmapped.push( { record: pick.record.id, reason: e.unmapped } );
		} else {
			element.entrance = { base: e.layer };
			used.push( pick.record.id );
			notes.push( ...e.notes.map( ( n ) => `${ pick.record.id }: ${ n }` ) );
		}
	}
	const hovers = kinds.filter( ( x ) => 'hover' === x.c.kind ).map( ( x ) => x.r );
	if ( hovers.length ) {
		const h = finishedHover( hovers, { mdb, ctx } );
		unmapped.push( ...h.unmapped.map( ( reason ) => ( { record: hovers.map( ( x ) => x.id ).join( ',' ), reason } ) ) );
		notes.push( ...h.notes );
		if ( h.layer ) {
			element.hover = { state: h.layer };
			used.push( ...hovers.map( ( x ) => x.id ) );
		}
	}
	return { element, notes, unmapped, used };
}

// The effects one draft element's endless animations make: its own loop records, else the run-time loop records the
// animation measured on it is (runtimeLoopsFor), plus a <marquee>'s attributes and its SVG animation elements.
// `loops` is the element's sampleMotion() loops by width. Returns { effects: [{ record, effect, values, devices,
// trigger, notes }], css: [{ record, name, css }], unmapped: [{ record, reason }], notes }. An endless keyframe animation
// no effect draws becomes `css` (the block's Additional CSS box, lib/motion-loop-css.mjs) when its values are literal.
export function elementEffects( records, { mdb, loops = null, runtimeLoops = [], cls = {} } ) {
	const out = { effects: [], css: [], unmapped: [], notes: [] };
	const wide = loops?.[ 1440 ] || null;
	let own = records.filter( ( r ) => 'effect' === classify( r, cls ).kind );
	if ( ! own.length && wide?.loops?.length ) {
		own = wide.loops.flatMap( ( l ) => runtimeLoopsFor( runtimeLoops, { ...wide, loops: [ l ] } ).slice( 0, 1 ) );
		out.notes.push( ...own.map( ( r ) => `${ r.id }: the code picks this element at run time, and the endless animation on it matched` ) );
	}
	const keep = ( record, e ) => ( e.unmapped ? out.unmapped.push( { record, reason: e.unmapped } ) : out.effects.push( { record, ...e } ) );
	for ( const r of own ) {
		const t = r.trigger?.type;
		if ( classify( r, cls ).confirm && ! measuredLoopOf( r, wide ) ) {
			keep( r.id, { unmapped: `the draft's code starts this loop on ${ t }, and the render showed it not running on an untouched page, so nothing is written` } );
			continue;
		}
		const e = loopEffect( r, loops, { mdb } );
		const boxed = e.unmapped && isLoopRecord( r ) ? loopKeyframesCss( r, loopName( r ) ) : null;
		if ( boxed?.css ) {
			out.css.push( { record: r, css: boxed.css } );
			out.notes.push( `${ r.id }: no motion effect draws this loop (${ e.unmapped }), so it is written to the Additional CSS box: ${ boxed.stops } stops sampled from the ${ r.easing } curve, linear between them` );
			continue;
		}
		keep( r.id, e.unmapped || 'scroll-into-view' !== t ? e : { ...e, trigger: 'visible' } );
		out.notes.push( ...loopCheck( r, loops ).map( ( d ) => `${ r.id }: render check ${ d }` ) );
	}
	if ( wide?.marquee ) {
		const values = marqueeTag( wide.marquee );
		keep( '<marquee>', values ? { effect: 'marquee', values, devices: {}, trigger: 'load', notes: [] } : { unmapped: `a <marquee behavior="${ wide.marquee.behavior }">: the marquee effect only scrolls, a Spec 38 gap` } );
	}
	( wide?.smil || [] ).forEach( ( a, i ) => {
		const loop = smilLoop( a, wide.box );
		if ( loop ) {
			const at = ( w ) => ( loops?.[ w ]?.smil?.[ i ] ? smilLoop( loops[ w ].smil[ i ], loops[ w ].box ) : null );
			keep( `<${ a.tag } ${ a.attributeName || a.type || '' }>`, chooseEffect( loop, { tablet: at( 768 ), mobile: at( 375 ) }, { mdb } ) );
		}
	} );
	if ( wide?.loops?.length && ! own.length ) {
		out.notes.push( `the render shows an endless animation on this element that no code record explains, so nothing is written (R-47-4)` );
	}
	return out;
}
