// The motion layers one draft element makes on one target (Spec 48 FR-48-78, FR-48-47; Spec 38A FR-38A-33), for
// lib/fill-motion.mjs::motionWrites: its entrance (render-checked against the 375, 768 and 1440 samples, token-snapped,
// preset-named), its hover state, and the effects and Additional CSS its endless animations make. snapLayer is the
// token snapping every layer of the writer goes through.
import { hoverDevices } from './fill-state-motion.mjs';
import { classify, entranceLayer, stateTransitionLayer, hoverLayer, matchByPose } from './motion-layers.mjs';
import { snapToken, presetFor, intensityPresetFor, tokenises, easingOf } from './motion-tokens.mjs';
import { loopEffect, loopCheck, chooseEffect, runtimeLoopsFor, smilLoop, marqueeTag, measuredLoopOf } from './motion-loops.mjs';
import { loopKeyframesCss, loopName, isLoopRecord } from './motion-loop-css.mjs';
import { entranceCheck } from './motion-check.mjs';
import { stateTrigger } from './motion-states.mjs';
import { oneTiming, sameTiming, SHADOW } from './fill-timing.mjs';
import { timeToMs } from './resolve.mjs';

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

const TIER = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };

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

// A hover the draft drives from an ancestor's :hover through a custom property (lib/intake-inventory-tpl.mjs).
const ANCESTOR_HOVER = /^the parent's style-hover\b/;
// A px length, or a `var(--x, <px>)` whose fallback is one (the custom property is unset at rest), else null.
const pxLength = ( v ) => {
	const s = String( v ?? '' ).trim();
	const m = /^var\(\s*--[\w-]+\s*,\s*([^()]+)\)$/.exec( s );
	const x = ( m ? m[ 1 ] : s ).trim();
	return /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/.test( x ) ? x : null;
};

// The width a hover grows or shrinks an element to, a real width change the hover layer holds as `width` with the
// resting `restWidth` (motion.schema.json HoverStateValues): { values, taken (the records it read), unmapped } or null
// when no record changes the width or the layer has no width fields. Its timing is the record's own.
function widthHover( records, mdb ) {
	const taken = records.filter( ( r ) => ( r.properties || [] ).some( ( p ) => 'width' === p.property ) );
	if ( ! taken.length || ! mdb.field( 'hover.state', 'values.width' ) || ! mdb.field( 'hover.state', 'values.restWidth' ) ) {
		return null;
	}
	const r = taken[ 0 ];
	const p = r.properties.find( ( x ) => 'width' === x.property );
	const [ rest, to ] = [ pxLength( p.from ), pxLength( p.to ) ];
	if ( ! rest || ! to ) {
		return { values: null, taken, unmapped: [ `width hover from ${ p.from } to ${ p.to }: the hover layer's width and restWidth take px lengths, and ${ rest ? p.to : p.from } is not one` ] };
	}
	const at = ( k ) => p[ k ] ?? r[ k ];
	const values = { restWidth: rest, width: to, duration: 'number' === typeof at( 'duration_ms' ) ? at( 'duration_ms' ) : 0 };
	'number' === typeof at( 'delay_ms' ) && at( 'delay_ms' ) > 0 && ( values.delay = at( 'delay_ms' ) );
	/^(?:linear|ease|ease-in|ease-out|ease-in-out)$|^(?:cubic-bezier|linear)\(/.test( String( at( 'easing' ) ?? '' ).trim() ) && ( values.easing = String( at( 'easing' ) ).trim() );
	return { values, taken, unmapped: taken.slice( 1 ).map( ( x ) => `${ x.id }: a second width hover on the same element: the hover layer holds one width` ) };
}

// One hover layer from an element's hover records, token-snapped and preset-named: { layer, notes, unmapped }. A width
// hover (widthHover) joins the layer; a hover the draft drives from an ancestor's :hover takes the block's item host as
// its source (`item`: supports.sgs.animationItems), which `itemHost` says the block declares.
function finishedHover( records, { mdb, ctx, itemHost = false } ) {
	const w = widthHover( records, mdb );
	const others = w ? records.map( ( r ) => ( w.taken.includes( r ) ? { ...r, properties: r.properties.filter( ( p ) => 'width' !== p.property ) } : r ) ) : records;
	const h = hoverLayer( others, mdb );
	if ( w ) {
		h.unmapped.push( ...w.unmapped );
		if ( w.values && ! h.layer ) {
			h.layer = { values: w.values };
		} else if ( w.values ) {
			const timed = [ 'duration', 'delay', 'easing' ].filter( ( k ) => undefined !== w.values[ k ] && undefined !== h.layer.values[ k ] && w.values[ k ] !== h.layer.values[ k ] );
			timed.length && h.unmapped.push( `the width hover's ${ timed.join( ', ' ) } (${ timed.map( ( k ) => w.values[ k ] ).join( ', ' ) }) differs from the element's other hover (${ timed.map( ( k ) => h.layer.values[ k ] ).join( ', ' ) }), and the layer holds one timing` );
			Object.assign( h.layer.values, { restWidth: w.values.restWidth, width: w.values.width } );
		}
	}
	const tiered = records.find( ( r ) => Object.keys( r.tiers || {} ).length );
	if ( h.layer && tiered ) {
		const d = hoverDevices( tiered, h.layer, ( rec ) => hoverLayer( [ rec ], mdb ).layer, ( k ) => Boolean( mdb.field( 'hover.state', `values.${ k }` )?.perDevice ) );
		Object.keys( d.devices ).length && ( h.layer.devices = d.devices );
		h.unmapped.push( ...d.unmapped );
	}
	if ( h.layer && records.some( ( r ) => ANCESTOR_HOVER.test( String( r.trigger?.detail ?? '' ) ) ) ) {
		itemHost ? ( h.layer.source = 'item' ) : h.unmapped.push( `the draft drives this hover from an ancestor's hover, and the block declares no item host (supports.sgs.animationItems) for the hover layer's Card hovered source, so it is written to play on the element's own hover` );
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
		notes.push( `${ m.record.id }: the code picks this element at run time, and the render's from-pose matched it${ m.record.mergedFrom?.length > 1 ? ` (the writes ${ m.record.mergedFrom.join( ', ' ) } of one tween)` : '' }` );
		const same = ( m.identical || [] ).filter( ( id ) => id !== m.record.id );
		same.length && notes.push( `${ m.record.id }: ${ same.join( ', ' ) } play the same animation (one entrance the code reaches by several callers), so they are this entrance` );
		return { record: m.record, notes, unmapped, also: same };
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
export function elementMotion( records, { mdb, ctx, sampled, runtime = [], offers = null, target = 'root', itemHost = false } ) {
	const element = {};
	const named = new Map();
	const kinds = records.map( ( r ) => {
		let s = offers && /^(?:waapi|css-animation|css-transition)$/.test( r.mechanism ) && 'active' === r.status ? stateTrigger( r, offers, target ) : null;
		s = s && ( 'css-transition' !== r.mechanism || 'state' === s.trigger ) ? s : null;
		if ( s ) {
			named.set( r.id, s );
		}
		return { r, c: s ? { kind: 'entrance' } : classify( r, { css: ctx.css, records: ctx.records } ) };
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
			used.push( pick.record.id, ...( pick.also || [] ) );
			notes.push( ...e.notes.map( ( n ) => `${ pick.record.id }: ${ n }` ) );
		}
	}
	const hovers = kinds.filter( ( x ) => 'hover' === x.c.kind ).map( ( x ) => x.r );
	if ( hovers.length ) {
		const h = finishedHover( hovers, { mdb, ctx, itemHost } );
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
	// A loop is judged at the widest width the render shows motion on this element at: a loop the draft runs below a breakpoint
	// only (a mobile ticker) is not running at 1440, and a loop is not refused for not running where the draft never runs it.
	const shows = ( m ) => Boolean( m?.loops?.length || m?.marquee || m?.smil?.length );
	const base = [ 1440, 768, 375 ].find( ( w ) => shows( loops?.[ w ] ) ) ?? 1440;
	const wide = loops?.[ base ] || null;
	const ranAt = [ 1440, 768, 375 ].filter( ( w ) => shows( loops?.[ w ] ) ).map( ( w ) => TIER[ w ] );
	const only = ranAt.length && ! ranAt.includes( 'desktop' ) ? `the render shows this endless animation at ${ ranAt.join( ' and ' ) } only, so it is judged there; the effect runs at every width (no per-width switch holds it)` : null;
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
		const e = loopEffect( r, loops, { mdb, base } );
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
			keep( `<${ a.tag } ${ a.attributeName || a.type || '' }>`, chooseEffect( loop, { tablet: 1440 === base ? at( 768 ) : null, mobile: base > 375 ? at( 375 ) : null }, { mdb } ) );
		}
	} );
	only && out.effects.length && out.notes.push( only );
	if ( wide?.loops?.length && ! own.length ) {
		out.notes.push( `the render shows an endless animation on this element that no code record explains, so nothing is written (R-47-4)` );
	}
	return out;
}


// The motion hover layer's paint timing from lib/fill-timing.mjs::paintTimings' result: { values: { paintDuration,
// paintEasing, shadowDuration, shadowEasing }, devices: { tablet|mobile: { paintDuration, shadowDuration } }, notes,
// unmapped: [{ field, reason }] } (values null when nothing is written). Unset, the layer's paint runs on the client's
// transition.fast (its duration and easing; the framework's duration.fast and ease without it), so a draft paint timing
// equal to it at every width is not written. Otherwise both fields are written from the widest width (set alone, either
// field's other half falls back to duration.fast or easing.default, not to transition.fast), a narrower width's duration
// where it differs from the wider tier's, and an easing that differs between widths, which the layer holds for all
// devices at once, is a row. The shadow's own timing is judged against the paint timing it would otherwise run on
// (shadowLayer). ctx: { types, tokens } (lib/motion-tokens.mjs).
export function paintLayer( paint, ctx ) {
	const out = { values: null, devices: {}, notes: [], unmapped: [] };
	const widths = Object.keys( paint ).map( Number ).sort( ( a, b ) => b - a );
	if ( ! widths.length ) {
		return out;
	}
	const fast = splitTiming( ctx.tokens?.[ 'transition.fast' ] ) ?? { duration: String( ctx.tokens?.[ 'duration.fast' ] ?? '200ms' ), easing: 'ease' };
	const dur = ( w ) => paint[ w ][ 'transition-duration' ].value;
	const ease = ( w ) => paint[ w ][ 'transition-timing-function' ].value;
	const snap = ( v, type ) => snapToken( v, type, { ...ctx, prefer: [ type ] } );
	const asFast = widths.every( ( w ) => sameTiming( 'transition-duration', dur( w ), fast.duration ) && sameEase( ease( w ), fast.easing ) );
	if ( asFast ) {
		out.notes.push( `the draft times colour, background, border colour and shadow at ${ dur( widths[ 0 ] ) } ${ ease( widths[ 0 ] ) }, the client's transition.fast, which the hover layer's paint runs on unset; no paint field is written` );
		shadowLayer( { paint, widths, out, snap, held: { duration: () => fast.duration, easing: () => fast.easing } } );
		return out;
	}
	const ms = ( w ) => timeToMs( oneTiming( dur( w ) ) );
	out.values = { paintDuration: snap( ms( widths[ 0 ] ), 'duration' ), paintEasing: snap( oneTiming( ease( widths[ 0 ] ) ) ?? ease( widths[ 0 ] ), 'easing' ) };
	let wider = widths[ 0 ];
	for ( const w of widths.slice( 1 ) ) {
		if ( ! sameTiming( 'transition-duration', dur( w ), dur( wider ) ) && TIER[ w ] ) {
			out.devices[ TIER[ w ] ] = { paintDuration: snap( ms( w ), 'duration' ) };
		}
		if ( ! sameEase( ease( w ), ease( widths[ 0 ] ) ) ) {
			out.unmapped.push( { field: 'paintEasing', reason: `the draft eases colour, background, border colour and shadow with ${ ease( w ) } at ${ w }px and ${ ease( widths[ 0 ] ) } at ${ widths[ 0 ] }px, and the hover layer holds paintEasing for all devices at once` } );
		}
		wider = w;
	}
	shadowLayer( { paint, widths, out, snap, held: { duration: dur, easing: ease } } );
	return out;
}

// The shadow's own timing (hover.state.values.shadowDuration and shadowEasing; each unset, the shadow runs on the paint
// timing). Where the draft's shadow is timed other than its paint at any width (`held`: { duration( width ),
// easing( width ) }, the draft's paint timing, or transition.fast where that is what the paint runs on), both fields are
// written from the widest width the shadow is timed at (set alone over transition.fast, the other half would fall back to
// easing.default), with a narrower width's duration where it differs from the wider tier's, and a width whose shadow
// easing differs from the widest width's is a row, the layer holding shadowEasing for all devices at once. A shadow timed
// as its paint at every width writes nothing; the paint's own rows name what the paint fields cannot hold.
function shadowLayer( { paint, widths, out, snap, held } ) {
	const at = ( w, prop ) => paint[ w ][ prop ].groups.find( ( g ) => g.properties.includes( SHADOW ) )?.value;
	const dur = ( w ) => at( w, 'transition-duration' );
	const ease = ( w ) => at( w, 'transition-timing-function' );
	const timed = widths.filter( ( w ) => undefined !== dur( w ) && undefined !== ease( w ) );
	if ( ! timed.length ) {
		return;
	}
	const ms = ( w ) => timeToMs( oneTiming( dur( w ) ) );
	if ( timed.every( ( w ) => sameTiming( 'transition-duration', dur( w ), held.duration( w ) ) && sameEase( ease( w ), held.easing( w ) ) ) ) {
		return;
	}
	out.values = { ...( out.values || {} ), shadowDuration: snap( ms( timed[ 0 ] ), 'duration' ), shadowEasing: snap( oneTiming( ease( timed[ 0 ] ) ) ?? ease( timed[ 0 ] ), 'easing' ) };
	let wider = timed[ 0 ];
	for ( const w of timed.slice( 1 ) ) {
		if ( ! sameTiming( 'transition-duration', dur( w ), dur( wider ) ) && TIER[ w ] ) {
			out.devices[ TIER[ w ] ] = { ...( out.devices[ TIER[ w ] ] || {} ), shadowDuration: snap( ms( w ), 'duration' ) };
		}
		if ( ! sameEase( ease( w ), ease( timed[ 0 ] ) ) ) {
			out.unmapped.push( { field: 'shadowEasing', reason: `the draft eases the shadow with ${ ease( w ) } at ${ w }px and ${ ease( timed[ 0 ] ) } at ${ timed[ 0 ] }px, and the hover layer holds shadowEasing for all devices at once` } );
		}
		wider = w;
	}
}

const sameEase = ( a, b ) => null !== curve( a ) && curve( a ) === curve( b );

// An easing as one canonical curve: a keyword is its cubic-bezier (CSS Easing 1 §2.2), so `ease` is the
// cubic-bezier(0.25, 0.1, 0.25, 1) a token may spell out. null when it cannot be read.
const KEYWORD = { ease: 'cubic-bezier(.25,.1,.25,1)', 'ease-in': 'cubic-bezier(.42,0,1,1)', 'ease-out': 'cubic-bezier(0,0,.58,1)', 'ease-in-out': 'cubic-bezier(.42,0,.58,1)' };
const curve = ( v ) => easingOf( KEYWORD[ String( oneTiming( v ) ?? v ).trim().toLowerCase() ] ?? oneTiming( v ) ?? v );

// A `<duration> <easing>` pair (a transition token's value) as { duration, easing }, or null.
function splitTiming( text ) {
	const m = /^\s*(-?[\d.]+m?s)\s+(.+?)\s*$/.exec( String( text ?? '' ) );
	return m ? { duration: m[ 1 ], easing: m[ 2 ] } : null;
}
