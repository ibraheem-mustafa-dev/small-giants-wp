// The effect recogniser (Spec 48 FR-48-77, delivery unit U13): a draft's effects that its own script builds, recognised
// by their mechanism and never by a name in the draft, each as the SGS effect that expresses it. One record of the
// animation inventory (lib/read-animations.mjs, `animations.json`) goes in; out comes the effect layer(s), the hover
// state values or the block settings to write, which lib/fill-motion.mjs::motionWrites writes through
// lib/motion-effects.mjs::writeEffect. Values come from the record's formula and code text; a value the record does
// not state is not written (the block's own default stands).
//
// recogniseBehaviour(record, ctx) returns null for a record that is not a script-driven behaviour, else one of
//   { kind: 'effect', effects: [{ effect, panel, trigger, values }], hoverState?, alt?, host, notes, coverage }
//   { kind: 'control', of, effect, values }       a control of another record's layer (the marquee's hover rate)
//   { kind: 'site', option, value }               a site-wide option (the route fade), not a block layer
//   { kind: 'settings', blocks: { '<block>': [ { attr, value, colour? } ] }, accepted?, sticky?, notes }
//                                                 settings of the block that declares them (the header's scrolled shadow, the
//                                                 timeline's pinned track, the slider's autoplay, the dot pulse, ...)
//   { kind: 'close', to, duration, easing, delay } the exit of the same element's open entrance (entrance.base.close)
//   { kind: 'native', reason }                    nothing to write: the SGS page already does it
//   { kind: 'covered', by, reason }               held by another recognised record's effect
//   { kind: 'unmapped', reason }                  no SGS effect expresses it (a Spec 38 gap that names the mechanism)
// `ctx.css` is the draft's CSS text (a list of strings), which a pointer-written custom property must feed through a
// clip-path or mask for the record to be a pointer-tracked reveal; `ctx.template` is the fact record's template
// ({ elements: { <key>: { style, realParent, srcLine, ... } } }), which says whether the header the draft shadows is pinned.

import { poseOf } from './motion-channels.mjs';
import { colourHex } from './tokens.mjs';
import { shadowParts } from './motion-shadow.mjs';
import { templateKey } from './fact-key.mjs';

const props = ( r ) => ( Array.isArray( r.properties ) ? r.properties : [] );
const nameOf = ( p ) => String( p.property ?? '' ).toLowerCase();
const words = ( ...parts ) => parts.filter( ( s ) => 'string' === typeof s ).join( ' ' );
const blob = ( r ) => words( r.source?.code, r.trigger?.detail, r.element?.selector, r.element?.description, r.notes, ...props( r ).flatMap( ( p ) => [ p.property, p.from, p.to, p.formula ] ) );
const triggerOf = ( r ) => r.trigger?.type ?? null;
const MINUS = '[-\\u2212]';
const TIMES = '[\\u00d7*]';
const NUMBER = '(\\d*\\.?\\d+)';
const number = ( s ) => ( null == s ? null : Number( s ) );
const round = ( n ) => Math.round( n * 1000 ) / 1000;

// The attribute selector of the template element a record's script finds its target by (`[data-mag]`), or null.
export const hostOf = ( r ) => /\[data-[a-z0-9-]+\]/i.exec( words( r.element?.selector, r.trigger?.detail ) )?.[ 0 ] ?? null;

const durationOf = ( r ) => ( 'number' === typeof r.duration_ms ? r.duration_ms : null );
const easingOf = ( r ) => ( 'string' === typeof r.easing && r.easing ? r.easing : null );
const compact = ( o ) => Object.fromEntries( Object.entries( o ).filter( ( [ , v ] ) => null !== v && undefined !== v ) );

// Whether a pointer handler wrote the property from the pointer's position (an x and y in the element, or a client
// coordinate), as against a fixed value.
const fromPointer = ( p, r ) => /client[XY]|pointer|\bx\b[^.]*\by\b|\(x\b|\by\b/i.test( words( p.formula, p.to, r.source?.code ) );

// A script-written translate of the element toward the pointer: a magnet. The pull model follows the formula: a
// position in the element (0..1) times a size is the normalised model (the size is the full travel across the element),
// an offset from the element's centre times a factor is the distance model.
function magnetOf( r ) {
	const p = props( r ).find( ( q ) => /^(?:translate|transform)$/.test( nameOf( q ) ) );
	if ( 'js-style-write' !== r.mechanism || 'pointer-move' !== triggerOf( r ) || ! p || /rotate/i.test( nameOf( p ) + words( p.formula, p.from ) ) || ! fromPointer( p, r ) ) {
		return null;
	}
	const f = words( p.formula );
	const engage = /closest\(|over|onMouseEnter|onMouseMove/i.test( words( r.trigger?.detail, r.element?.selector ) ) ? 'over' : 'proximity';
	const timing = compact( { returnDuration: durationOf( r ), returnEasing: easingOf( r ) } );
	const norm = new RegExp( `\\(\\(?\\s*x\\s*${ MINUS }\\s*0?\\.5\\s*\\)?\\s*${ TIMES }\\s*${ NUMBER }\\s*\\)?\\s*px[^,]*?\\(\\(?\\s*y\\s*${ MINUS }\\s*0?\\.5\\s*\\)?\\s*${ TIMES }\\s*${ NUMBER }`, 'i' ).exec( f );
	if ( norm ) {
		return { values: { engage, pullModel: 'normalised', maxPullX: number( norm[ 1 ] ), maxPullY: number( norm[ 2 ] ), ...timing }, axis: 'both', pullModel: 'normalised' };
	}
	const dist = new RegExp( `client([XY])\\s*${ MINUS }[^)]*\\)\\s*${ TIMES }\\s*${ NUMBER }`, 'i' ).exec( f );
	if ( dist ) {
		const axis = dist[ 1 ].toLowerCase();
		return { values: { engage, pullModel: 'distance', axis, factor: number( dist[ 2 ] ), ...timing }, axis, pullModel: 'distance' };
	}
	return { unmapped: `a pointer handler moves the element toward the pointer, but its formula "${ f }" is neither a position in the element times a size nor an offset from its centre times a factor` };
}

// A script-written rotation from the pointer's position: a tilt (the hover state's followPointer), with a glare layer
// when the same handler writes the pointer position into custom properties for a highlight.
function tiltOf( r ) {
	const list = props( r );
	const rot = list.find( ( q ) => /^rotate$/.test( nameOf( q ) ) || ( 'transform' === nameOf( q ) && /rotate[xy]/i.test( words( q.formula, q.to ) ) ) );
	if ( 'js-style-write' !== r.mechanism || 'pointer-move' !== triggerOf( r ) || ! rot || ! fromPointer( rot, r ) ) {
		return null;
	}
	const f = words( rot.formula );
	const angle = number( new RegExp( `max\\s*[\\u2248~=]\\s*${ NUMBER }\\s*deg`, 'i' ).exec( f )?.[ 1 ] ) ?? number( new RegExp( `${ TIMES }\\s*${ NUMBER }\\s*deg`, 'i' ).exec( f )?.[ 1 ] );
	const glare = list.some( ( q ) => /^--/.test( nameOf( q ) ) && fromPointer( q, r ) );
	return { hoverState: compact( { followPointer: true, maxAngle: angle } ), glare };
}

// The spring back of a tilt: a Web Animation on pointer leave that returns the rotation to zero.
function tiltResetOf( r ) {
	const p = props( r ).find( ( q ) => 'rotate' === nameOf( q ) );
	if ( 'pointer-leave' !== triggerOf( r ) || ! p || 'waapi' !== r.mechanism || ! /^(?:0 0 1 )?0(?:deg)?$|^0 0 1 0deg$/.test( String( p.to ).trim() ) ) {
		return null;
	}
	return { resetDuration: durationOf( r ), resetEasing: easingOf( r ) };
}

// A stripe slanted by a constant skewX that slides across its host on pointer entry: a sheen.
function sheenOf( r ) {
	const p = props( r ).find( ( q ) => 'transform' === nameOf( q ) && /skewX/i.test( words( q.from, q.to ) ) );
	if ( 'waapi' !== r.mechanism || 'pointer-move' !== triggerOf( r ) || ! p ) {
		return null;
	}
	const skew = number( new RegExp( `skewX\\(\\s*(${ MINUS }?\\d*\\.?\\d+)deg`, 'i' ).exec( words( p.from ) )?.[ 1 ].replace( '−', '-' ) );
	return { effect: 'sheen', panel: 'hover', trigger: 'hover', values: compact( { angle: skew, bandWidth: number( new RegExp( `width\\s+${ NUMBER }%`, 'i' ).exec( words( r.notes ) )?.[ 1 ] ), duration: durationOf( r ), easing: easingOf( r ) } ) };
}

// A circle that grows from the pointer's press and fades: a ripple.
function rippleOf( r ) {
	const list = props( r );
	const grow = list.find( ( q ) => 'transform' === nameOf( q ) && /scale\(\s*0\s*\)/i.test( words( q.from ) ) );
	const fade = list.find( ( q ) => 'opacity' === nameOf( q ) );
	if ( 'waapi' !== r.mechanism || 'press' !== triggerOf( r ) || ! grow || ! fade ) {
		return null;
	}
	const alpha = number( new RegExp( `rgba\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*,\\s*${ NUMBER }`, 'i' ).exec( words( r.notes ) )?.[ 1 ] );
	return { effect: 'ripple', panel: 'effects', trigger: 'pointerdown', values: compact( {
		duration: durationOf( r ), easing: easingOf( r ),
		sizeFactor: number( new RegExp( `${ NUMBER }\\s*${ TIMES }\\s*max`, 'i' ).exec( words( r.notes ) )?.[ 1 ] ),
		peakOpacity: null === alpha ? null : round( alpha * ( Number( fade.from ) || 1 ) ),
		colour: null === alpha ? null : '#ffffff',
	} ) };
}

// The first CSS declaration in the draft's CSS that clips or masks with a circle fed by one of `names` (the custom
// properties a pointer handler writes), as { text, radiusRest, radiusHover, duration, easing } or null.
function circleConsumer( names, css ) {
	for ( const text of css ) {
		for ( const name of names ) {
			const use = new RegExp( `(?:clip-path|mask(?:-image)?)\\s*:\\s*(?:circle|ellipse|radial-gradient)\\([^;{}]*var\\(\\s*${ name }\\b`, 'i' ).exec( text );
			if ( use ) {
				const around = text.slice( Math.max( 0, use.index - 400 ), use.index + 600 );
				const t = new RegExp( `transition\\s*:\\s*(?:clip-path|mask[-\\w]*)\\s+(\\d*\\.?\\d+)(m?s)\\s+([^;"]+)`, 'i' ).exec( around );
				return {
					text,
					radiusRest: number( /var\(\s*--pr\s*,\s*(\d*\.?\d+)px/i.exec( use[ 0 ] )?.[ 1 ] ),
					duration: t ? Math.round( Number( t[ 1 ] ) * ( 's' === t[ 2 ] ? 1000 : 1 ) ) : null,
					easing: t ? t[ 3 ].trim() : null,
				};
			}
		}
	}
	return null;
}

// A pointer handler that writes only the pointer's position into custom properties, which a clip-path or mask circle
// in the draft's CSS consumes: a pointer-tracked reveal, the cursor field's image reveal.
function peekOf( r, ctx ) {
	const list = props( r );
	const names = list.flatMap( ( q ) => String( q.property ).split( /\s*\/\s*/ ) ).filter( ( n ) => /^--/.test( n ) );
	if ( 'js-style-write' !== r.mechanism || 'pointer-move' !== triggerOf( r ) || ! names.length || names.length < list.flatMap( ( q ) => String( q.property ).split( /\s*\/\s*/ ) ).length ) {
		return null;
	}
	// With no draft CSS given at all (the intake review) the pointer-written custom properties alone are the evidence.
	const use = undefined === ctx.css ? { text: '', radiusRest: null, duration: null, easing: null } : circleConsumer( names, ctx.css );
	if ( ! use ) {
		return null;
	}
	const hover = number( new RegExp( `--pr\\s*:\\s*${ NUMBER }px` ).exec( words( r.notes, use.text ) )?.[ 1 ] );
	return { effect: 'cursor-field', panel: 'effects', trigger: 'hover', values: compact( {
		field: 'image-reveal', radius: use.radiusRest, hoverRadius: hover, radiusDuration: use.duration, radiusEasing: use.easing, ring: /\bring\b/i.test( words( r.notes ) ) ? true : null,
	} ) };
}

// Dropping a file onto the card opens the whole reveal (a script writes the full radius on dragenter).
function peekDragOf( r ) {
	const p = props( r ).find( ( q ) => /^--/.test( nameOf( q ) ) );
	return p && 'js-style-write' === r.mechanism && /dragenter|dragover|drop/i.test( words( r.trigger?.detail, r.source?.code ) ) ? p : null;
}

// A transform or translate written in proportion to the scroll position: a parallax (distance from the page top, or
// from the element's own place in the view) and, for a scale written to the scroll fraction, a progress bar.
function scrollOf( r ) {
	const list = props( r );
	if ( 'js-style-write' !== r.mechanism || 'scroll-position' !== triggerOf( r ) ) {
		return null;
	}
	const bar = list.find( ( q ) => 'transform' === nameOf( q ) && /scale([XY])\(/i.test( words( q.to, q.formula ) ) && ( /scrollHeight|scrollable/i.test( words( q.formula ) ) || ( /^scale[XY]\(\s*p\s*\)$/i.test( words( q.formula ).trim() ) && PINNED.test( blob( r ) ) ) ) );
	if ( bar ) {
		const axis = /scaleY/i.test( words( bar.to, bar.formula ) ) ? 'bar-y' : 'bar-x';
		const pin = /data-pin\b|\[data-pin\]/i.test( blob( r ) );
		return { effect: 'scroll-progress', panel: 'effects', trigger: 'scroll', values: { source: pin ? 'pin' : 'page', output: axis } };
	}
	const move = list.find( ( q ) => /^(?:translate|transform)$/.test( nameOf( q ) ) && /scrollY/i.test( words( q.formula ) ) );
	if ( ! move ) {
		return null;
	}
	const f = words( move.formula );
	const k = new RegExp( `scrollY\\s*${ TIMES }\\s*(${ MINUS }?\\d*\\.?\\d+)`, 'i' ).exec( f );
	const view = /innerHeight\s*\/\s*2/i.test( f );
	const ratio = k ? number( k[ 1 ].replace( '−', '-' ) ) : view ? number( new RegExp( `${ TIMES }\\s*${ NUMBER }\\s*px`, 'i' ).exec( f )?.[ 1 ] ) : null;
	if ( null === ratio ) {
		return { unmapped: `a scroll handler moves the element, but the factor in "${ f }" is not a number the parallax effect holds` };
	}
	const xOnly = /translateX/i.test( f ) && ! /translateY|\b0\s*'|'0\s/i.test( f );
	return { effect: 'parallax', panel: 'effects', trigger: 'scroll', values: { axis: xOnly ? 'x' : 'y', basis: view ? 'view' : 'page', speedRatio: ratio } };
}

// A Web Animation control that sets another animation's playback rate on hover: the marquee's hover rate.
function controlOf( r ) {
	const p = props( r ).find( ( q ) => /playbackRate/i.test( nameOf( q ) ) );
	const of = /\(of\s+([A-Za-z]+-\d+)\)/.exec( String( p?.property ?? '' ) )?.[ 1 ];
	return 'waapi-control' === r.mechanism && p && of && Number.isFinite( Number( p.to ) ) && Number( p.to ) >= 0 && Number( p.to ) <= 1 ? { of, rate: Number( p.to ) } : null;
}

// The page fades in on a route change: the site's page transition (a site option, not a block layer).
function routeFadeOf( r ) {
	const list = props( r );
	if ( 'route' !== triggerOf( r ) || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || list.length !== 1 || 'opacity' !== nameOf( list[ 0 ] ) || ! ( Number( list[ 0 ].from ) < Number( list[ 0 ].to ) ) || ! /\bmain\b|\bbody\b|page/i.test( words( r.element?.selector, r.element?.description ) ) ) {
		return null;
	}
	return { style: 'fade', durationMs: durationOf( r ), easing: easingOf( r ) };
}

const px = ( n ) => `${ n }px`;

// The template element a record names (its first `template_tpl_id`) from ctx.template: { key, element } or null.
function templateOfRecord( r, ctx ) {
	const tpl = [ r.element?.template_tpl_id ].flat()[ 0 ];
	if ( null === tpl || undefined === tpl || ! r.element?.dc || ! ctx.template?.elements ) {
		return null;
	}
	const key = templateKey( { dc: r.element.dc, tpl } );
	return ctx.template.elements[ key ] ? { key, element: ctx.template.elements[ key ] } : null;
}

const staticStyle = ( e, name ) => ( e?.style?.static || [] ).find( ( [ n ] ) => n === name )?.[ 1 ] ?? null;

// A header the draft pins: `position: sticky` or `fixed` on its own template element, or its description saying so.
function stickyOf( r, ctx ) {
	const t = templateOfRecord( r, ctx );
	return /^(?:sticky|fixed)$/.test( String( staticStyle( t?.element, 'position' ) ?? '' ).trim() ) || /\b(?:sticky|fixed)\b/i.test( words( r.element?.description ) );
}

// A script that writes a box-shadow once the page has scrolled past a distance: the site header's scrolled shadow and
// threshold and, for a header the draft pins, its sticky behaviour. The shadow is the `shadowScrolled` shape with its
// colour split into `shadowScrolledColour`.
function headerScrollOf( r, ctx ) {
	const p = props( r ).find( ( q ) => 'box-shadow' === nameOf( q ) );
	const at = new RegExp( `scrollY\\s*>\\s*${ NUMBER }` ).exec( words( r.source?.code, r.trigger?.detail ) );
	if ( 'js-style-write' !== r.mechanism || 'scroll-position' !== triggerOf( r ) || ! p || ! at || 'none' !== String( p.from ?? 'none' ).trim() ) {
		return null;
	}
	const shadow = shadowParts( p.to );
	if ( ! shadow || shadow.inset ) {
		return null;
	}
	const colour = colourHex( shadow.colour );
	const sticky = stickyOf( r, ctx );
	return {
		blocks: { 'sgs/site-header': [
			{ attr: 'scrolledOffset', value: number( at[ 1 ] ) },
			{ attr: 'shadowScrolled', value: [ shadow.x, shadow.y, shadow.blur, shadow.spread ].map( px ).join( ' ' ) },
			...( colour ? [ { attr: 'shadowScrolledColour', value: colour, colour: true } ] : [] ),
			...( sticky ? [ { attr: 'headerSticky', value: { desktop: 'on' } } ] : [] ),
		] },
		sticky: sticky ? templateOfRecord( r, ctx ) : null,
		notes: [ 'the scrolled shadow switches once the page has scrolled past the threshold' ],
	};
}

// An endless ring that grows from a dot and fades (a box-shadow spread from nothing to transparent): the open-status dot.
function dotPulseOf( r ) {
	const p = props( r ).find( ( q ) => 'box-shadow' === nameOf( q ) );
	if ( ! p || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || ! [ 'infinite', Infinity ].includes( r.iterations ) || ! /\bdot\b|status|open/i.test( words( r.element?.description, r.name ) ) ) {
		return null;
	}
	const from = shadowParts( p.from );
	const to = shadowParts( String( p.to ).replace( /\btransparent\b/i, 'rgba(0,0,0,0)' ) );
	if ( ! from || ! to || 0 !== from.spread || to.spread <= 0 || to.inset ) {
		return null;
	}
	return { blocks: { 'sgs/business-info': [ { attr: 'openStatusDotPulse', value: true }, ...( durationOf( r ) ? [ { attr: 'openStatusDotPulseDuration', value: durationOf( r ) } ] : [] ) ] }, notes: [ 'the dot pulses an endless expanding ring' ] };
}

// A script that scrolls a container to the accordion row it just opened.
function accordionScrollOf( r ) {
	const p = props( r ).find( ( q ) => 'scrolltop' === nameOf( q ) );
	if ( 'js-scroll' !== r.mechanism || ! p || ! /scrollTo\s*\(\s*\{\s*top/.test( words( r.source?.code ) ) || ! /\bacc/i.test( words( r.source?.function, r.trigger?.detail, r.trigger?.state_keys?.join( ' ' ) ) ) ) {
		return null;
	}
	const gap = number( new RegExp( `offsetTop\\s*${ MINUS }\\s*${ NUMBER }` ).exec( words( p.to ) )?.[ 1 ] );
	return {
		blocks: {
			'sgs/nav-drawer-menu': [ { attr: 'accordionScrollIntoView', value: true } ],
			'sgs/accordion': [ { attr: 'scrollToOpened', value: true }, ...( null === gap ? [] : [ { attr: 'scrollToOpenedGap', value: px( gap ) } ] ) ],
		},
		notes: [ 'opening a row scrolls it into view' ],
	};
}

// A state-driven entrance whose trigger also names an interval timer: the testimonial slider's autoplay (one card, the
// interval, the change duration).
function autoplayOf( r ) {
	const every = new RegExp( `${ NUMBER }\\s*s\\s+setInterval|setInterval[^.]*?${ NUMBER }\\s*s\\b`, 'i' ).exec( words( r.trigger?.detail ) );
	const secs = number( every?.[ 1 ] ?? every?.[ 2 ] );
	if ( null === secs || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || 'state' !== triggerOf( r ) || ! /\bcard\b|testimonial|slide/i.test( words( r.element?.description, r.name ) ) ) {
		return null;
	}
	return {
		blocks: { 'sgs/testimonial-slider': [
			{ attr: 'autoplay', value: true }, { attr: 'autoplaySpeed', value: Math.round( secs * 1000 ) }, { attr: 'slidesVisible', value: 1 },
			...( durationOf( r ) ? [ { attr: 'transitionDuration', value: String( durationOf( r ) ) } ] : [] ),
		] },
		accepted: 'the slide change (it slides rather than fades), the always-on hover and focus pause, the 44px arrows and the round active dot are the slider\'s own (Ruling 10)',
		notes: [ 'one card is visible and the slider advances on the draft\'s interval' ],
	};
}

// The pinned horizontal timeline, written by one scroll function: its track, counter, proximity focus and active year
// map onto `sgs/timeline`'s settings (Ruling 9).
const PINNED = /\[data-pin|updatePins|pin\.offsetHeight/i;
function pinnedTimelineOf( r ) {
	if ( ! /^js-(?:style|text)-write$/.test( r.mechanism ) || 'scroll-position' !== triggerOf( r ) || ! PINNED.test( blob( r ) ) ) {
		return null;
	}
	const list = props( r );
	const get = ( name ) => list.find( ( q ) => name === nameOf( q ) );
	const text = get( 'textcontent' );
	if ( 'js-text-write' === r.mechanism && text ) {
		const padded = /padStart|\bNN\b|\b0\d\b/.test( words( r.source?.code, text.from, text.to ) );
		return { blocks: { 'sgs/timeline': [ { attr: 'panelCounter', value: true }, { attr: 'panelCounterFormat', value: padded ? 'padded-index-of-total' : 'index-of-total' } ] }, notes: [ 'the counter reads the pin\'s progress' ] };
	}
	const move = get( 'transform' );
	if ( move && /translate3d|translateX/i.test( words( move.to, move.formula ) ) && new RegExp( `${ MINUS }\\s*p\\b` ).test( words( move.formula ) ) ) {
		const carousel = /native horizontal scroller|scroll-snap/i.test( words( r.trigger?.detail ) );
		return {
			blocks: { 'sgs/timeline': [ { attr: 'scrollEffect', value: 'pinned-horizontal' }, ...( carousel ? [ { attr: 'mobileLayout', value: 'carousel' } ] : [] ) ] },
			accepted: 'the draft switches to its touch-only strip at 1024px; SGS pins from 768px and swipes below (Ruling 9)',
			notes: [ 'the track moves sideways with the scroll while pinned' ],
		};
	}
	const opacity = get( 'opacity' );
	const scale = get( 'scale' );
	if ( opacity && scale && /\bk\b/.test( words( opacity.formula ) ) ) {
		const set = [ [ 'panelEdgeOpacity', opacity.from ], [ 'panelFocusOpacity', opacity.to ], [ 'panelEdgeScale', scale.from ], [ 'panelFocusScale', scale.to ] ].filter( ( [ , v ] ) => Number.isFinite( Number( v ) ) );
		return { blocks: { 'sgs/timeline': [ { attr: 'panelProximityFocus', value: true }, ...set.map( ( [ attr, v ] ) => ( { attr, value: Number( v ) } ) ) ] }, notes: [ 'entries scale and fade with distance from the centre' ] };
	}
	const colour = get( 'color' );
	const stroke = get( '-webkit-text-stroke-color' );
	if ( colour && colourHex( colour.to ) ) {
		return { blocks: { 'sgs/timeline': [ { attr: 'dateActiveColour', value: colourHex( colour.to ), colour: true }, ...( stroke && colourHex( stroke.to ) ? [ { attr: 'dateActiveTextStrokeColour', value: colourHex( stroke.to ), colour: true } ] : [] ) ] }, notes: [ 'the entry nearest the centre takes the active year colour' ] };
	}
	return null;
}

// The exit of an element's open entrance: a Web Animation on close, from the resting pose to another, held at the end.
function closeOf( r ) {
	if ( 'waapi' !== r.mechanism || 'forwards' !== r.fill || ! /clos|dismiss|exit/i.test( words( r.source?.function, r.trigger?.detail, r.name ) ) ) {
		return null;
	}
	const pose = poseOf( props( r ) );
	if ( pose.unsupported.length || pose.other.length || ! Object.keys( pose.to ).length ) {
		return null;
	}
	return { to: pose.to, duration: durationOf( r ), easing: easingOf( r ), delay: 'number' === typeof r.delay_ms && r.delay_ms > 0 ? r.delay_ms : null };
}

// A scroll position reset on a route change: SGS pages are separate page loads, which start at the top.
function scrollResetOf( r ) {
	const p = props( r ).find( ( q ) => 'scrolly' === nameOf( q ) );
	return p && 'route' === triggerOf( r ) && 0 === Number( p.to ) ? p : null;
}

const done = ( r, fields ) => ( { record: r.id, host: hostOf( r ), notes: [], coverage: [], ...fields } );

export function recogniseBehaviour( record, ctx = {} ) {
	const r = record;
	if ( ! r || 'object' !== typeof r || 'active' !== ( r.status ?? 'active' ) ) {
		return null;
	}
	const control = controlOf( r );
	if ( control ) {
		return done( r, { kind: 'control', of: control.of, effect: 'marquee', values: { hoverRate: control.rate } } );
	}
	if ( scrollResetOf( r ) ) {
		return done( r, { kind: 'native', reason: 'the draft scrolls to the top when its route changes; each SGS page is its own page load, which starts at the top' } );
	}
	const fade = routeFadeOf( r );
	if ( fade ) {
		return done( r, { kind: 'site', option: 'page-transition', value: { ...fade, settings: compact( { page_transitions: true, page_transition_style: fade.style, page_transition_duration: fade.durationMs, page_transition_easing: fade.easing } ) }, notes: [ `the page fades in on a route change: the site's page transition (${ fade.style }, ${ fade.durationMs }ms ${ fade.easing }) with the custom duration and easing, which win over the style's own`, 'the draft fades only the page body; SGS fades the page (an accepted difference, Ruling 5)' ] } );
	}
	for ( const make of [ ( x ) => headerScrollOf( x, ctx ), dotPulseOf, accordionScrollOf, autoplayOf, pinnedTimelineOf ] ) {
		const e = make( r );
		if ( e ) {
			return done( r, { kind: 'settings', ...e } );
		}
	}
	const exit = closeOf( r );
	if ( exit ) {
		return done( r, { kind: 'close', ...exit } );
	}
	const scrollTop = props( r ).find( ( q ) => 'scrolly' === nameOf( q ) );
	if ( 'js-scroll' === r.mechanism && 'press' === triggerOf( r ) && scrollTop && 0 === Number( scrollTop.to ) ) {
		return done( r, { kind: 'native', reason: 'a back-to-top control scrolls to the top: the page\'s own anchor to the top does this' } );
	}
	if ( 'js-style-write' === r.mechanism && 'state' === triggerOf( r ) && props( r ).some( ( q ) => 'overflow' === nameOf( q ) ) && /\bbody\b/i.test( words( r.element?.selector ) ) ) {
		return done( r, { kind: 'native', reason: 'the drawer is a modal dialog; it locks the page scroll while it is open' } );
	}
	const magnet = magnetOf( r );
	if ( magnet?.unmapped ) {
		return done( r, { kind: 'unmapped', reason: magnet.unmapped } );
	}
	if ( magnet ) {
		const effects = [ { effect: 'magnet', panel: 'hover', trigger: 'hover', values: magnet.values } ];
		// A magnet that pulls along one axis by a factor, on a label inside a nav item, is the nav bar's item magnet setting.
		const alt = 'distance' === magnet.pullModel && 'x' === magnet.axis ? { settings: [ { attr: 'itemMagnetEnabled', value: true }, { attr: 'itemMagnetStrength', value: magnet.values.factor } ] } : null;
		return done( r, { kind: 'effect', effects, ...( alt ? { alt } : {} ) } );
	}
	const tilt = tiltOf( r );
	if ( tilt ) {
		return done( r, { kind: 'effect', effects: tilt.glare ? [ { effect: 'glare', panel: 'hover', trigger: 'hover', values: {} } ] : [], hoverState: tilt.hoverState } );
	}
	const reset = tiltResetOf( r );
	if ( reset ) {
		return done( r, { kind: 'effect', effects: [], hoverState: compact( reset ) } );
	}
	for ( const make of [ sheenOf, rippleOf, ( x ) => peekOf( x, ctx ), scrollOf ] ) {
		const e = make( r );
		if ( e?.unmapped ) {
			return done( r, { kind: 'unmapped', reason: e.unmapped } );
		}
		if ( e ) {
			return done( r, { kind: 'effect', effects: [ e ], coverage: 'sheen' === e.effect ? [ 'css-function:skewx' ] : 'cursor-field' === e.effect ? [ 'css-function:circle' ] : [] } );
		}
	}
	if ( peekDragOf( r ) ) {
		return done( r, { kind: 'covered', by: 'cursor-field', reason: 'the whole-image reveal is what the cursor field gives on keyboard focus and tap; dropping a file onto the card is the draft\'s editing aid and is not cloned' } );
	}
	return null;
}

// The review rows of the `effect` row type (lib/intake-review.mjs): one per recognised behaviour a visitor or a
// reviewer confirms once, and one per behaviour no SGS effect expresses. `ctx` is recogniseBehaviour's.
export function effectRows( records, ctx = {} ) {
	const rows = [];
	for ( const r of Array.isArray( records ) ? records : [] ) {
		const b = recogniseBehaviour( r, ctx );
		if ( ! b || [ 'native', 'covered' ].includes( b.kind ) ) {
			continue;
		}
		const what = 'effect' === b.kind ? [ ...b.effects.map( ( e ) => e.effect ), ...( b.hoverState ? [ 'follow-pointer' ] : [] ) ].join(  ' + ' ) || 'hover state'
			: 'control' === b.kind ? `${ b.effect } hover rate of ${ b.of }` : 'site' === b.kind ? b.option : 'no SGS effect';
		rows.push( {
			rowId: `effect:${ r.id }`, draftId: r.id, record: r.id, effect: what, kind: b.kind,
			text: `${ r.id } ${ r.name ?? '' } (${ r.mechanism }, ${ triggerOf( r ) }) is ${ 'unmapped' === b.kind ? `not expressed by any SGS effect: ${ b.reason }` : `the ${ what } effect` }`.replace( /\s+/g, ' ' ),
			unmapped: 'unmapped' === b.kind ? b.reason : undefined,
		} );
	}
	return rows;
}

// The attribute selector -> element keys map of a read template: every element whose attributes name the selector's
// `data-*` hook. `selectors` are the `[data-x]` strings records name (hostOf).
export function hostsFromTemplate( template, selectors ) {
	const hosts = new Map();
	for ( const sel of new Set( selectors ) ) {
		const name = /^\[(data-[a-z0-9-]+)\]$/i.exec( sel )?.[ 1 ];
		hosts.set( sel, new Set( name ? Object.entries( template?.elements || {} ).filter( ( [ , e ] ) => name in ( e.attrs || {} ) ).map( ( [ key ] ) => key ) : [] ) );
	}
	return hosts;
}
