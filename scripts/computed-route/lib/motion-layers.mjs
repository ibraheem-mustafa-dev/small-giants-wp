// One draft element's motion records (the re-derived animation inventory, Spec 48 FR-48-25) as sgsMotion layers
// (Spec 38A §6.2): a one-shot Web Animation or CSS animation that plays at load or on scroll becomes `entrance.base`,
// the element's hover transitions and instant hover rules become `hover.state`. Values come from the draft's code
// (R-47-4); the render check in lib/fill-motion.mjs confirms them. Each record that no layer holds is returned with the
// reason, naming the coverage wave that owns it.
//
// Field names are the schema's (`translateX`, `scale`, `rotate`, `blur`, ...); the CSS value parsing that produces them
// is lib/motion-channels.mjs. Whether a layer takes a field, and its field type, is asked of the framework DB
// (lib/motion-db.mjs).

import { round, lengthOf, propertyChannels, poseOf, keyframeStops } from './motion-channels.mjs';
import { shadowParts } from './motion-shadow.mjs';
import { colourHex } from './tokens.mjs';

// Each layer keeps only fields the framework DB lists for it; the rest are reported.
function keepFields( mdb, layer, base, obj, dropped ) {
	const out = {};
	for ( const [ k, v ] of Object.entries( obj ) ) {
		if ( mdb.field( layer, `${ base }.${ k }` ) ) {
			out[ k ] = v;
		} else {
			dropped.push( k );
		}
	}
	return out;
}

// The triggers a visitor's action fires.
const INTERACTION = /^(?:hover|pointer|press|click|focus|key|touch|drag|scroll(?!-into-view))/;

// How a record is handled: { kind: 'entrance' | 'hover' | 'effect' | 'skip', reason }; an endless or repeating
// animation is an effect (lib/motion-effects.mjs::loopEffect). `reason` names who owns a skipped record.
export function classify( record ) {
	const t = record.trigger?.type;
	if ( 'active' !== record.status ) {
		return { kind: 'skip', reason: `status ${ record.status }: the draft never runs it` };
	}
	if ( 'css-media' === record.mechanism ) {
		return { kind: 'skip', reason: 'a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12)' };
	}
	if ( /^js-|^waapi-control$/.test( record.mechanism ) ) {
		return { kind: 'skip', reason: `a script-written ${ record.mechanism } on ${ t }: recognised by the behaviour recognisers wave (FR-48-77)` };
	}
	if ( ( 'css-transition' === record.mechanism || 'css-pseudo' === record.mechanism ) && 'hover' === t ) {
		return { kind: 'hover' };
	}
	if ( 'css-transition' === record.mechanism || 'css-pseudo' === record.mechanism ) {
		return { kind: 'skip', reason: `a ${ t } state transition: the states wave (FR-48-81) or the owning block's setting` };
	}
	const starts = 'mount' === t || 'load' === t || 'scroll-into-view' === t;
	if ( 'infinite' === record.iterations || Infinity === record.iterations ) {
		if ( starts ) {
			return { kind: 'effect' };
		}
		// A loop the draft's own code starts (a state change after mount, a timer) is an effect when the render shows it
		// running on a page nobody touched (lib/fill-motion.mjs::elementEffects asks for that); one a visitor's action
		// starts is a behaviour.
		return INTERACTION.test( t || '' ) ? { kind: 'skip', reason: `an endless animation started on ${ t }: the visitor's ${ t } drives it, recognised by the behaviour recognisers wave (FR-48-80)` } : { kind: 'effect', confirm: true };
	}
	if ( 'number' === typeof record.iterations && record.iterations > 1 ) {
		return { kind: 'skip', reason: `plays ${ record.iterations } times: no motion field holds a repeat count (a Spec 38 gap)` };
	}
	if ( starts ) {
		return { kind: 'entrance' };
	}
	return { kind: 'skip', reason: `a one-shot animation on a ${ t } trigger: the draft's ${ t } drives it, recognised by the behaviour recognisers wave (FR-48-80)` };
}

// The most keyframes an entrance holds (schema $defs.EntranceKeyframeList).
const MAX_KEYFRAMES = 8;

const TRIGGER = { mount: 'load', load: 'load', 'scroll-into-view': 'scroll' };

// How far a measured entrance (lib/fill-entrance.mjs::shapeEntrance) is from a record's from-pose, or null when they
// move different channels: opacity, travel, scale, blur and clip must be set on both or on neither. The sampled first
// frame can be a frame into the animation, so the distance only ranks candidates.
export function poseDistance( record, measured ) {
	const pose = poseOf( record.properties );
	const f = pose.from;
	const scaleFrom = f.scale ?? f.scaleX ?? f.scaleY ?? 1;
	const blurFrom = f.blur ?? 0;
	const has = {
		opacity: [ 'number' === typeof f.opacity && f.opacity < 0.95, measured.opacityFrom < 0.95 ],
		travel: [ Math.hypot( Number( f.translateX ) || 0, Number( f.translateY ) || 0 ) > 0, measured.distancePx > 1 ],
		scale: [ Math.abs( scaleFrom - 1 ) > 0.005, Math.abs( measured.scale - 1 ) > 0.005 ],
		blur: [ blurFrom > 0, /blur\(/.test( measured.from.filter || '' ) && ! /blur\(0px\)/.test( measured.from.filter ) ],
		clip: [ ( Number( f.clip ) || 0 ) > 0, 'none' !== ( measured.from.clipPath || 'none' ) ],
	};
	if ( Object.values( has ).some( ( [ code, render ] ) => code !== render ) ) {
		return null;
	}
	return Math.abs( ( f.opacity ?? 1 ) - measured.opacityFrom ) + Math.abs( ( Number( f.translateY ) || 0 ) - measured.y ) / 20 + Math.abs( ( Number( f.translateX ) || 0 ) - measured.x ) / 20 + Math.abs( scaleFrom - measured.scale ) * 5;
}

// The record among `candidates` (entrance records whose element the code picks at run time) that a measured entrance
// is: the nearest by poseDistance among those whose trigger the render agrees with (a load record never plays as a
// scroll entrance; a scroll record already in view plays at load). Returns { record } or { ambiguous: [ids] } or null.
export function matchByPose( candidates, measured ) {
	const ranked = candidates.filter( ( r ) => 'scroll' !== measured.trigger || 'scroll' === TRIGGER[ r.trigger?.type ] ).map( ( r ) => ( { r, d: poseDistance( r, measured ) } ) ).filter( ( x ) => null !== x.d ).sort( ( a, b ) => a.d - b.d );
	if ( ! ranked.length ) {
		return null;
	}
	if ( ranked.length > 1 && ranked[ 1 ].d - ranked[ 0 ].d < 0.01 ) {
		return { ambiguous: ranked.filter( ( x ) => x.d - ranked[ 0 ].d < 0.01 ).map( ( x ) => x.r.id ) };
	}
	return { record: ranked[ 0 ].r };
}

// The offset and step of a delay the code computes per item: `(rv.i || 0) * 80` is { offset 0, step 80 },
// `80 + i * 110` and `i * 110 + 80` are { offset 80, step 110 }; null for any other expression.
export function delaySteps( text ) {
	const t = String( text ?? '' ).trim();
	const lead = /^(\d+(?:\.\d+)?)\s*\+[^*]+\*\s*(\d+(?:\.\d+)?)$/.exec( t );
	if ( lead ) {
		return { offset: Number( lead[ 1 ] ), step: Number( lead[ 2 ] ) };
	}
	const trail = /^[^*]+\*\s*(\d+(?:\.\d+)?)\s*\)?\s*(?:\+\s*(\d+(?:\.\d+)?))?$/.exec( t );
	return trail ? { offset: Number( trail[ 2 ] ?? 0 ), step: Number( trail[ 1 ] ) } : null;
}

// A record's delay in ms: its literal, else (a delay the code computes per item) the measured raw delay snapped to the
// code's offset and step, else to the 50ms step; null when neither is known.
export function delayOf( record, measured, step = 50 ) {
	if ( 'number' === typeof record.delay_ms ) {
		return record.delay_ms;
	}
	if ( ! measured ) {
		return null;
	}
	const k = delaySteps( record.delay_ms ) || { offset: 0, step };
	// A measured delay is the code's delay plus the time the page took to start the animation, never less, so it snaps to
	// the step it has reached, allowing up to three quarters of a step of that lag (51ms on an 80ms step is 0; 119 is 80).
	return k.offset + Math.max( 0, Math.floor( ( ( measured.delayRawMs - k.offset ) / k.step ) + 0.25 ) ) * k.step;
}

// The element's one perspective (Spec 38A §10) as { perspective } when the layer takes it and the value is within the
// model's 100 to 5000px; otherwise nothing, with a note for a value outside that range.
const PERSPECTIVE = { min: 100, max: 5000 };
function perspectiveOf( px, mdb, layer, notes ) {
	if ( 'number' !== typeof px || ! mdb.field( layer, 'values.perspective' ) ) {
		return {};
	}
	if ( px < PERSPECTIVE.min || px > PERSPECTIVE.max ) {
		notes.push( `perspective ${ px }px is outside the ${ PERSPECTIVE.min } to ${ PERSPECTIVE.max }px the motion model holds, so the renderer's default is used` );
		return {};
	}
	return { perspective: px };
}

// A one-shot record as it plays: `reverse` (and `alternate-reverse`, whose single run is backwards) plays the keyframes
// from the last to the first, so its from and to swap and its keyframe offsets mirror.
export function asPlayed( record ) {
	if ( ! /reverse/.test( record.direction || '' ) ) {
		return record;
	}
	const properties = ( record.properties || [] ).map( ( p ) => ( { ...p, from: p.to, to: p.from, ...( Array.isArray( p.keyframes ) ? { keyframes: p.keyframes.map( ( k ) => ( { ...k, offset: Math.round( ( 1 - Number( k.offset ) ) * 10000 ) / 10000 } ) ).reverse() } : {} ) } ) );
	return { ...record, properties, direction: 'normal' };
}

// `entrance.base` from one entrance record: { layer, notes } or { unmapped }. `measured` (the sampled entrance at the
// widest width) supplies a delay the code computes.
export function entranceLayer( given, mdb, measured = null ) {
	const record = asPlayed( given );
	const kf = keyframeStops( record.properties );
	const pose = poseOf( record.properties );
	const notes = [];
	const unsupported = kf ? kf.unsupported : pose.unsupported;
	const other = kf ? kf.other : pose.other;
	if ( kf?.computed.length ) {
		return { unmapped: `${ kf.computed.join( ', ' ) } is computed in the code, so its keyframe cannot be written` };
	}
	if ( unsupported.length ) {
		return { unmapped: `${ unsupported.join( ', ' ) } has no entrance channel` };
	}
	if ( kf ? ! kf.stops.some( ( s ) => Object.keys( s.channels ).length ) : ! Object.keys( pose.from ).length ) {
		return { unmapped: `animates ${ other.join( ', ' ) || 'nothing' }, which no entrance channel holds` };
	}
	if ( kf && kf.stops.length > MAX_KEYFRAMES ) {
		return { unmapped: `${ kf.stops.length } distinct keyframe offsets; an entrance holds ${ MAX_KEYFRAMES }` };
	}
	if ( other.length ) {
		notes.push( `${ other.join( ', ' ) } is not an entrance channel and is left to the block's own settings` );
	}
	const dropped = [];
	const values = kf
		? { keyframes: kf.stops.map( ( s ) => ( { offset: s.offset, ...keepFields( mdb, 'entrance.base', 'values.keyframes', s.channels, dropped ) } ) ), duration: record.duration_ms }
		: {
			from: keepFields( mdb, 'entrance.base', 'values.from', pose.from, dropped ),
			to: keepFields( mdb, 'entrance.base', 'values.to', pose.to, dropped ),
			duration: record.duration_ms,
		};
	if ( 'number' !== typeof record.duration_ms ) {
		if ( ! measured ) {
			return { unmapped: `duration "${ record.duration_ms }" is computed in the code and was not measured` };
		}
		values.duration = Math.round( measured.durationRawMs / 50 ) * 50;
		notes.push( `duration "${ record.duration_ms }" is computed in the code; the render measured ${ values.duration }ms` );
	}
	const delay = delayOf( record, measured );
	if ( null === delay ) {
		notes.push( `delay "${ record.delay_ms }" is computed in the code and was not measured` );
	} else if ( delay > 0 ) {
		values.delay = delay;
	}
	const easing = easingText( record.easing, notes );
	if ( easing ) {
		values.easing = easing;
	}
	Object.assign( values, perspectiveOf( pose.perspective, mdb, 'entrance.base', notes ) );
	if ( dropped.length ) {
		notes.push( `no entrance field for ${ [ ...new Set( dropped ) ].join( ', ' ) }` );
	}
	return { layer: { trigger: TRIGGER[ record.trigger.type ], values }, notes };
}

function easingText( raw, notes ) {
	if ( null === raw || undefined === raw ) {
		return null;
	}
	const s = String( raw ).trim();
	const ok = /^(?:linear|ease|ease-in|ease-out|ease-in-out)$/.test( s ) || /^(?:cubic-bezier|linear)\(/.test( s );
	if ( ! ok ) {
		notes.push( `easing "${ s }" is not resolved in the code, so the renderer's default curve is used` );
		return null;
	}
	return s;
}

// The layout properties a hover may animate that Spec 38A §5.1 maps onto a motion channel instead.
const INDENT = new Set( [ 'padding-left', 'padding-inline-start' ] );

// A box-shadow hover the hover state draws itself (Spec 38A §5.1): a ring (a spread with no offset or blur) as
// ringSpread and ringColour, an accent line (an inset shadow along the bottom edge) as accentWidth and accentColour,
// each from nothing at rest; null for any other shadow, which belongs to the block's shadow settings. A colour is hex
// here (one with no plain value, such as currentColor, leaves the colour out); the writer turns a hex equal to a
// palette colour into its slug.
function shadowHover( p ) {
	const to = shadowParts( p.to );
	const from = null === p.from || undefined === p.from ? null : shadowParts( p.from );
	const atRest = 'none' === String( p.from ?? 'none' ).trim() || ( from && 0 === from.spread && 0 === from.x && 0 === from.y );
	if ( ! to || ! atRest || 0 !== to.blur || 0 !== to.x ) {
		return null;
	}
	const colour = colourHex( to.colour );
	if ( ! to.inset && 0 === to.y && to.spread > 0 ) {
		return { ringSpread: to.spread, ...( colour ? { ringColour: colour } : {} ) };
	}
	if ( to.inset && to.y < 0 && 0 === to.spread ) {
		return { accentWidth: -to.y, ...( colour ? { accentColour: colour } : {} ) };
	}
	return null;
}

// `hover.state` from an element's hover records: { layer, notes, unmapped: [text] } (layer null when none moves).
export function hoverLayer( records, mdb ) {
	const notes = [];
	const unmapped = [];
	const values = {};
	let timing = null;
	const rest = {};
	for ( const r of records ) {
		for ( const p of r.properties || [] ) {
			const t = propertyChannels( p.property, p.to );
			if ( t.other ) {
				const glow = 'box-shadow' === p.property ? shadowHover( p ) : null;
				if ( glow ) {
					Object.assign( values, glow );
				} else if ( INDENT.has( p.property ) ) {
					const by = ( lengthOf( p.to ) ?? 0 ) - ( lengthOf( p.from ?? '0' ) ?? 0 );
					values.indent = round( by, 2 );
				} else if ( /^(?:width|gap|column-gap|row-gap|background-size|padding-.*|margin-.*)$/.test( p.property ) ) {
					unmapped.push( `${ p.property } hover: Spec 38A §5.1 maps a layout-property hover to scale, translate, indent or the link underline, which this draft node needs routed by hand` );
					continue;
				} else {
					notes.push( `${ p.property } hover belongs to the block's hover colour, border or shadow settings` );
					continue;
				}
			} else {
				if ( t.unsupported.length ) {
					unmapped.push( `${ t.unsupported.join( ', ' ) } has no hover channel` );
				}
				Object.assign( values, t.channels );
				const f = propertyChannels( p.property, p.from );
				Object.assign( rest, f.channels || {} );
				Object.assign( values, perspectiveOf( t.perspective ?? f.perspective, mdb, 'hover.state', notes ) );
			}
			if ( ! timing && 'css-transition' === r.mechanism ) {
				timing = { duration: p.duration_ms ?? r.duration_ms, delay: p.delay_ms ?? r.delay_ms, easing: p.easing ?? r.easing };
			}
		}
	}
	for ( const [ k, restK ] of [ [ 'rotate', 'restRotate' ], [ 'rotateX', 'restRotateX' ], [ 'rotateY', 'restRotateY' ] ] ) {
		if ( k in rest && 0 !== rest[ k ] ) {
			values[ restK ] = rest[ k ];
		}
	}
	if ( 'grayscale' in rest && 0 !== rest.grayscale ) {
		values.restGrayscale = rest.grayscale;
	}
	const dropped = [];
	const kept = keepFields( mdb, 'hover.state', 'values', values, dropped );
	if ( dropped.length ) {
		unmapped.push( `no hover field for ${ dropped.join( ', ' ) }` );
	}
	if ( ! Object.keys( kept ).length ) {
		return { layer: null, notes, unmapped };
	}
	if ( timing ) {
		kept.duration = timing.duration;
		if ( timing.delay > 0 ) {
			kept.delay = timing.delay;
		}
		const e = easingText( timing.easing, notes );
		if ( e ) {
			kept.easing = e;
		}
	} else {
		kept.duration = 0;
	}
	return { layer: { values: kept }, notes, unmapped };
}
