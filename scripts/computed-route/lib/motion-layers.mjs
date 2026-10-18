// One draft element's motion records (the re-derived animation inventory, Spec 48 FR-48-25) as sgsMotion layers
// (Spec 38A §6.2): a one-shot Web Animation or CSS animation that plays at load or on scroll becomes `entrance.base`,
// the element's hover transitions and instant hover rules become `hover.state`. Values come from the draft's code
// (R-47-4); the render check in lib/fill-motion.mjs confirms them. Each record that no layer holds is returned with the
// reason, naming the coverage wave that owns it.
//
// Field names are the schema's (`translateX`, `scale`, `rotate`, `blur`, ...): a CSS transform list is split into those
// channels here because a list of functions is CSS grammar, not a framework fact. Whether a layer takes a field, and
// its field type, is asked of the framework DB (lib/motion-db.mjs).

const num = ( s ) => ( /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test( String( s ).trim() ) ? Number( s ) : null );
const round = ( n, p = 4 ) => Math.round( n * 10 ** p ) / 10 ** p;

// A length: px as a number, another schema unit as its string, 0 unitless; null for anything else.
export function lengthOf( s ) {
	const t = String( s ?? '' ).trim();
	if ( '0' === t ) {
		return 0;
	}
	const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|em|rem|%|vh|vw|svh|dvh)$/.exec( t );
	if ( ! m ) {
		return null;
	}
	return 'px' === m[ 2 ] ? round( Number( m[ 1 ] ), 2 ) : `${ Number( m[ 1 ] ) }${ m[ 2 ] }`;
}

const ANGLE = { deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 };

// An angle in degrees; null when it is not one.
export function angleOf( s ) {
	const t = String( s ?? '' ).trim();
	if ( '0' === t ) {
		return 0;
	}
	const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(deg|turn|rad|grad)$/.exec( t );
	return m ? round( Number( m[ 1 ] ) * ANGLE[ m[ 2 ] ], 3 ) : null;
}

const args = ( s ) => s.split( /\s*,\s*|\s+/ ).filter( Boolean );

// A CSS transform list as schema channels: { channels: { translateX, translateY, scale, scaleX, scaleY, rotate, rotateX,
// rotateY }, unsupported: [function names no channel holds] }. `none` is no channels.
export function transformChannels( value ) {
	const out = { channels: {}, unsupported: [] };
	const s = String( value ?? '' ).trim();
	if ( '' === s || 'none' === s ) {
		return out;
	}
	const set = ( k, v ) => {
		if ( null === v ) {
			out.unsupported.push( k );
		} else {
			out.channels[ k ] = v;
		}
	};
	for ( const [ , fn, inner ] of s.matchAll( /([a-zA-Z0-9]+)\(([^)]*)\)/g ) ) {
		const a = args( inner );
		const f = fn.toLowerCase();
		if ( 'translate' === f || 'translate3d' === f ) {
			set( 'translateX', lengthOf( a[ 0 ] ) );
			if ( a[ 1 ] !== undefined ) {
				set( 'translateY', lengthOf( a[ 1 ] ) );
			}
			if ( 'translate3d' === f && 0 !== lengthOf( a[ 2 ] ?? '0' ) ) {
				out.unsupported.push( 'translateZ' );
			}
		} else if ( 'translatex' === f ) {
			set( 'translateX', lengthOf( a[ 0 ] ) );
		} else if ( 'translatey' === f ) {
			set( 'translateY', lengthOf( a[ 0 ] ) );
		} else if ( 'scale' === f || 'scale3d' === f ) {
			const x = num( a[ 0 ] );
			const y = undefined === a[ 1 ] ? x : num( a[ 1 ] );
			if ( x === y ) {
				set( 'scale', x );
			} else {
				set( 'scaleX', x );
				set( 'scaleY', y );
			}
		} else if ( 'scalex' === f ) {
			set( 'scaleX', num( a[ 0 ] ) );
		} else if ( 'scaley' === f ) {
			set( 'scaleY', num( a[ 0 ] ) );
		} else if ( 'rotate' === f || 'rotatez' === f ) {
			set( 'rotate', angleOf( a[ 0 ] ) );
		} else if ( 'rotatex' === f ) {
			set( 'rotateX', angleOf( a[ 0 ] ) );
		} else if ( 'rotatey' === f ) {
			set( 'rotateY', angleOf( a[ 0 ] ) );
		} else {
			out.unsupported.push( f );
		}
	}
	return out;
}

// A filter list as channels: blur (px), grayscale and brightness (ratios; 100% is 1).
export function filterChannels( value ) {
	const out = { channels: {}, unsupported: [] };
	const ratio = ( x ) => ( /%$/.test( x ) ? round( Number( x.slice( 0, -1 ) ) / 100 ) : num( x ) );
	for ( const [ , fn, inner ] of String( value ?? '' ).matchAll( /([a-z-]+)\(([^)]*)\)/g ) ) {
		const v = inner.trim();
		if ( 'blur' === fn && 'number' === typeof lengthOf( v ) ) {
			out.channels.blur = lengthOf( v );
		} else if ( 'grayscale' === fn || 'brightness' === fn ) {
			out.channels[ fn ] = ratio( v );
		} else {
			out.unsupported.push( fn );
		}
	}
	return out;
}

// One property's value (opacity, transform, translate, scale, rotate, filter) as channels; other properties are not
// motion channels and come back as `other`.
export function propertyChannels( property, value ) {
	if ( null === value || undefined === value ) {
		return { channels: {}, unsupported: [] };
	}
	switch ( property ) {
		case 'opacity':
			return { channels: { opacity: num( value ) ?? Number( value ) }, unsupported: [] };
		case 'transform':
			return transformChannels( value );
		case 'translate': {
			const [ x, y ] = args( String( value ) );
			return transformChannels( `translate(${ x }, ${ y ?? '0' })` );
		}
		case 'scale': {
			const [ x, y ] = args( String( value ) );
			return transformChannels( `scale(${ x }, ${ y ?? x })` );
		}
		case 'rotate':
			return transformChannels( `rotate(${ value })` );
		case 'filter':
			return filterChannels( value );
		default:
			return { other: property };
	}
}

const IDENTITY = { opacity: 1, translateX: 0, translateY: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, rotateX: 0, rotateY: 0, blur: 0, grayscale: 0, brightness: 1 };

// The from and to channels of a record's properties: { from, to, unsupported, other }. A channel the from side sets and
// the to side leaves out (or sets to `none`) goes to its identity.
export function poseOf( properties ) {
	const out = { from: {}, to: {}, unsupported: [], other: [] };
	for ( const p of properties || [] ) {
		const f = propertyChannels( p.property, p.from );
		const t = propertyChannels( p.property, p.to );
		if ( f.other ) {
			out.other.push( p.property );
			continue;
		}
		Object.assign( out.from, f.channels );
		Object.assign( out.to, t.channels );
		out.unsupported.push( ...f.unsupported, ...t.unsupported );
	}
	for ( const k of Object.keys( out.from ) ) {
		if ( ! ( k in out.to ) ) {
			out.to[ k ] = IDENTITY[ k ];
		}
	}
	return out;
}

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
	const loops = 'infinite' === record.iterations || ( 'number' === typeof record.iterations && record.iterations > 1 ) || /alternate/.test( record.direction || '' );
	if ( loops ) {
		return { kind: 'effect' };
	}
	if ( 'mount' === t || 'load' === t || 'scroll-into-view' === t ) {
		return { kind: 'entrance' };
	}
	return { kind: 'skip', reason: `a one-shot animation on a ${ t } trigger: the draft's ${ t } drives it, recognised by the behaviour recognisers wave (FR-48-80)` };
}

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
		clip: [ pose.other.includes( 'clip-path' ), 'none' !== ( measured.from.clipPath || 'none' ) ],
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
	return k.offset + Math.max( 0, Math.round( ( measured.delayRawMs - k.offset ) / k.step ) ) * k.step;
}

// `entrance.base` from one entrance record: { layer, notes } or { unmapped }. `measured` (the sampled entrance at the
// widest width) supplies a delay the code computes.
export function entranceLayer( record, mdb, measured = null ) {
	const pose = poseOf( record.properties );
	const notes = [];
	if ( pose.unsupported.length ) {
		return { unmapped: `${ pose.unsupported.join( ', ' ) } has no entrance channel` };
	}
	if ( ! Object.keys( pose.from ).length ) {
		return { unmapped: `animates ${ pose.other.join( ', ' ) || 'nothing' }, which no entrance channel holds` };
	}
	if ( pose.other.length ) {
		notes.push( `${ pose.other.join( ', ' ) } is not an entrance channel and is left to the block's own settings` );
	}
	const dropped = [];
	const values = {
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
				if ( INDENT.has( p.property ) ) {
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
			}
			if ( ! timing && 'css-transition' === r.mechanism ) {
				timing = { duration: p.duration_ms ?? r.duration_ms, delay: p.delay_ms ?? r.delay_ms, easing: p.easing ?? r.easing };
			}
		}
	}
	if ( 'rotate' in rest && 0 !== rest.rotate ) {
		values.restRotate = rest.rotate;
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
