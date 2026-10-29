// The effect recogniser (Spec 48 FR-48-77, delivery unit U13): a draft's effects that its own script builds, recognised
// by their mechanism and never by a name in the draft, each as the SGS effect that expresses it. One record of the
// animation inventory (lib/read-animations.mjs, `animations.json`) goes in; out comes the effect layer(s), the hover
// state values or the block settings to write, which lib/fill-motion.mjs::motionWrites writes through
// lib/motion-effects.mjs::writeEffect. Values come from the record's formula and code text; a value the record does
// not state is not written (the block's own default stands).
//
// recogniseBehaviour(record, ctx) returns null for a record that is not a script-driven behaviour, else one of
//   { kind: 'effect', effects: [{ effect, panel, trigger, values }], hoverState?, alt?, unread?, host, notes, coverage }
//                                                 (unread: [ { field, reason } ], values not read, each a named row)
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
// ({ elements: { <key>: { style, realParent, srcLine, ... } } }), which says whether the header the draft shadows is pinned;
// `ctx.records` is the whole animation inventory, whose style records give a code-created effect element's declarations
// (lib/motion-effect-element.mjs: the sheen band's width, the ripple circle's size and colour).

import { poseOf, IDENTITY } from './motion-channels.mjs';
import { props, nameOf, words, triggerOf, scrollValueName, MINUS, TIMES, NUMBER, number, round, durationOf, easingOf, compact } from './motion-record-text.mjs';
import { pinnedSectionOf, headerScrollOf, dotPulseOf, accordionScrollOf, autoplayOf, pinnedTimelineOf, carouselOf } from './motion-behaviour-settings.mjs';
import { hiddenStartOf } from './motion-reveal.mjs';
import { effectElementStyle, effectElementOwner, colourOf, largerSideFactor } from './motion-effect-element.mjs';
import { templateKey } from './fact-key.mjs';
import { fromPointer, tiltOf, tiltGlareHostOf, tiltResetOf } from './motion-tilt.mjs';

// The attribute selector of the template element a record's script finds its target by (`[data-mag]`), or null.
export const hostOf = ( r ) => /\[data-[a-z0-9-]+\]/i.exec( words( r.element?.selector, r.trigger?.detail ) )?.[ 0 ] ?? null;

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
	// A handler that writes the position at once (a 0 duration) has no return time of its own; the transition set beside it does.
	const timing = compact( { returnDuration: durationOf( r ) || null, returnEasing: easingOf( r ) } );
	// A position in the element (0..1) minus a half, times the size: `(x - 0.5) * 10` over the element's own x and y, or
	// the pointer's offset in the element over its width and height (`(clientX - r.left) / r.width - 0.5) * 10`).
	const norm = new RegExp( `(?:width|\\bx)\\s*${ MINUS }\\s*0?\\.5\\s*\\)*\\s*${ TIMES }\\s*${ NUMBER }[\\s\\S]*?(?:height|\\by)\\s*${ MINUS }\\s*0?\\.5\\s*\\)*\\s*${ TIMES }\\s*${ NUMBER }`, 'i' ).exec( f );
	if ( norm ) {
		return { values: { engage, pullModel: 'normalised', maxPullX: number( norm[ 1 ] ), maxPullY: number( norm[ 2 ] ), ...timing }, axis: 'both', pullModel: 'normalised' };
	}
	const dist = new RegExp( `client([XY])\\s*${ MINUS }[^\\u00d7*]*${ TIMES }\\s*${ NUMBER }`, 'i' ).exec( f );
	if ( dist ) {
		const axis = dist[ 1 ].toLowerCase();
		return { values: { engage, pullModel: 'distance', axis, factor: number( dist[ 2 ] ), ...timing }, axis, pullModel: 'distance' };
	}
	return { unmapped: `a pointer handler moves the element toward the pointer, but its formula "${ f }" is neither a position in the element times a size nor an offset from its centre times a factor` };
}

// The two small writes that go with a pointer-written translate: the transition the handler sets on the element it moves
// (the return timing, which the magnet effect holds as its return duration) and the handler that clears the written
// transform when the pointer leaves (the magnet returns to rest itself). { reason } or null.
function magnetCompanionOf( r ) {
	const p = props( r ).find( ( q ) => /^(?:transition|translate|transform)$/.test( nameOf( q ) ) );
	if ( 'js-style-write' !== r.mechanism || ! p ) {
		return null;
	}
	if ( 'pointer-move' === triggerOf( r ) && 'transition' === nameOf( p ) && /\btranslate\s+\.?\d/.test( words( p.formula, p.to, r.source?.code ) ) ) {
		return { reason: 'the handler sets the transition of the translate it writes toward the pointer: the magnet effect holds that return timing' };
	}
	if ( 'pointer-leave' === triggerOf( r ) && 'transition' !== nameOf( p ) && 'string' === typeof p.to && '' === p.to.trim() && null == p.formula ) {
		return { reason: 'the handler clears the pointer-written position when the pointer leaves: the magnet effect returns the element to rest itself' };
	}
	return null;
}

// The one colour of a band painted `linear-gradient( <direction>, transparent, <colour>, transparent )`, the shape the
// sheen layer paints (assets/css/fx-sheen.css), as { hex, alpha }; null for any other background.
function bandColourOf( value ) {
	const m = /^linear-gradient\((.*)\)$/i.exec( String( value ?? '' ).trim() );
	const args = m ? m[ 1 ].split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() ) : [];
	const stops = /^(?:-?\d*\.?\d+(?:deg|turn|rad|grad)|to\s)/i.test( args[ 0 ] ?? '' ) ? args.slice( 1 ) : args;
	return 3 === stops.length && /^transparent$/i.test( stops[ 0 ] ) && /^transparent$/i.test( stops[ 2 ] ) ? colourOf( stops[ 1 ] ) : null;
}

// A stripe slanted by a constant skewX that slides across its host on pointer entry: a sheen. Its angle is the skew of
// its keyframes; its band width, colour and strength are the declarations the script gives the stripe it creates
// (lib/motion-effect-element.mjs): the width as a share of the host, and a band painted transparent, one colour,
// transparent, whose colour is the band's colour and whose alpha is its opacity. A value the stripe's declarations do
// not state is not written (the sheen's own default stands).
function sheenOf( r, ctx ) {
	const p = props( r ).find( ( q ) => 'transform' === nameOf( q ) && /skewX/i.test( words( q.from, q.to ) ) );
	if ( 'waapi' !== r.mechanism || 'pointer-move' !== triggerOf( r ) || ! p ) {
		return null;
	}
	const skew = number( new RegExp( `skewX\\(\\s*(${ MINUS }?\\d*\\.?\\d+)deg`, 'i' ).exec( words( p.from ) )?.[ 1 ].replace( '−', '-' ) );
	const style = effectElementStyle( r, ctx.records ) || {};
	const bandWidth = number( /^(\d*\.?\d+)%$/.exec( style.width?.value ?? '' )?.[ 1 ] );
	const band = bandColourOf( style[ 'background-image' ]?.value ?? style.background?.value );
	return { effect: 'sheen', panel: 'hover', trigger: 'hover', values: compact( { angle: skew, bandWidth, colour: band?.hex ?? null, opacity: band ? round( band.alpha ) : null, duration: durationOf( r ), easing: easingOf( r ) } ) };
}

// A circle that grows from the pointer's press and fades: a ripple. Its diameter as a multiple of the host's larger side
// is the scale its keyframes grow it to times the multiple the script sizes the circle by (lib/motion-effect-element.mjs::
// largerSideFactor); its peak opacity is its first keyframe's opacity times its declared background colour's alpha, and
// its colour that background's. A value the circle's keyframes and declarations do not state is not written.
function rippleOf( r, ctx ) {
	const list = props( r );
	const grow = list.find( ( q ) => 'transform' === nameOf( q ) && /scale\(\s*0\s*\)/i.test( words( q.from ) ) );
	const fade = list.find( ( q ) => 'opacity' === nameOf( q ) );
	if ( 'waapi' !== r.mechanism || 'press' !== triggerOf( r ) || ! grow || ! fade ) {
		return null;
	}
	const style = effectElementStyle( r, ctx.records ) || {};
	const scaleEnd = number( new RegExp( `^scale\\(\\s*${ NUMBER }\\s*\\)$`, 'i' ).exec( words( grow.to ).trim() )?.[ 1 ] );
	const side = largerSideFactor( style.width );
	const paint = colourOf( style[ 'background-color' ]?.value ?? style.background?.value );
	const first = Number.isFinite( Number( fade.from ) ) && null !== fade.from && '' !== fade.from ? Number( fade.from ) : 1;
	return { effect: 'ripple', panel: 'effects', trigger: 'pointerdown', values: compact( {
		duration: durationOf( r ), easing: easingOf( r ),
		sizeFactor: null !== side && null !== scaleEnd ? round( side * scaleEnd ) : null,
		peakOpacity: paint ? round( paint.alpha * first ) : null,
		colour: paint ? paint.hex : null,
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
	// With no draft CSS given at all (the intake review, or a draft served from a URL: an empty list) the pointer-written custom properties alone are the evidence.
	const use = ! ctx.css?.length ? { text: '', radiusRest: null, duration: null, easing: null } : circleConsumer( names, ctx.css );
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
// from the element's own place in the view) and, for a scale written to the scroll fraction (the page's, or a pinned
// section's progress, lib/motion-behaviour-settings.mjs::pinnedSectionOf), a progress bar.
function scrollOf( r, ctx = {} ) {
	const list = props( r );
	if ( 'js-style-write' !== r.mechanism || 'scroll-position' !== triggerOf( r ) ) {
		return null;
	}
	const pin = !! pinnedSectionOf( r, ctx );
	const bar = list.find( ( q ) => 'transform' === nameOf( q ) && /scale([XY])\(/i.test( words( q.to, q.formula ) ) && ( pin || /scrollHeight|scrollable/i.test( words( q.formula ) ) ) );
	if ( bar ) {
		const axis = /scaleY/i.test( words( bar.to, bar.formula ) ) ? 'bar-y' : 'bar-x';
		return { effect: 'scroll-progress', panel: 'effects', trigger: 'scroll', values: { source: pin ? 'pin' : 'page', output: axis } };
	}
	const move = list.find( ( q ) => /^(?:translate|transform)$/.test( nameOf( q ) ) && scrollValueName( q, r ) );
	if ( ! move ) {
		return null;
	}
	const f = words( move.formula );
	const k = new RegExp( `${ scrollValueName( move, r ).replace( /\$/g, '\\$' ) }\\s*${ TIMES }\\s*(${ MINUS }?\\d*\\.?\\d+)`, 'i' ).exec( f );
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

// The page component's single content root: the one element with no parent, outside and not the helmet, of a component
// no `<dc-import>` imports (an imported component's root is that component's). Its component: `component`, else the key's.
function isPageRoot( key, e, elements ) {
	const compOf = ( k, x ) => x.component ?? k.slice( 0, k.lastIndexOf( '/' ) );
	const isRoot = ( x ) => ! x.parent && ! x.inHelmet && ! /^(?:sc-helmet|helmet)$/i.test( String( x.realTag ?? x.tag ?? '' ) );
	const comp = compOf( key, e );
	const imported = Object.values( elements ).some( ( x ) => /^dc-import$/i.test( String( x.realTag ?? x.tag ?? '' ) ) && comp === x.attrs?.name );
	return isRoot( e ) && ! imported && 1 === Object.entries( elements ).filter( ( [ k, x ] ) => compOf( k, x ) === comp && isRoot( x ) ).length;
}

// Whether the element a record animates is the page: the template element it names is the document's `<main>` or
// `<body>`, or the page component's single content root (isPageRoot), whatever the ref or selector that reaches it is
// called. A record that names no element of the given template is read by its selector alone: the element it selects
// is `main` or `body`.
function isPageElement( r, ctx ) {
	const tpls = [ r.element?.template_tpl_id ].flat().filter( ( v ) => null !== v && undefined !== v );
	const elements = ctx.template?.elements;
	const keys = elements && r.element?.dc ? tpls.map( ( tpl ) => templateKey( { dc: r.element.dc, tpl } ) ).filter( ( k ) => elements[ k ] ) : [];
	if ( keys.length ) {
		return keys.every( ( k ) => /^(?:main|body)$/i.test( String( elements[ k ].realTag ?? elements[ k ].tag ?? '' ) ) || isPageRoot( k, elements[ k ], elements ) );
	}
	return /(?:^|[^\w-])(?:main|body)(?![\w-])/i.test( String( r.element?.selector ?? '' ) );
}

// The page fades in on a route change: the site's page transition (a site option, not a block layer).
function routeFadeOf( r, ctx ) {
	const list = props( r );
	if ( 'route' !== triggerOf( r ) || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || list.length !== 1 || 'opacity' !== nameOf( list[ 0 ] ) || ! ( Number( list[ 0 ].from ) < Number( list[ 0 ].to ) ) || ! isPageElement( r, ctx ) ) {
		return null;
	}
	return { style: 'fade', durationMs: durationOf( r ), easing: easingOf( r ) };
}

// The exit of an element's open entrance: a Web Animation on an interaction (not the page's own entering), from the
// resting pose to another, held at the end: the element leaves its rest and stays away.
const ENTERING = new Set( [ 'mount', 'load', 'scroll-into-view' ] );
const restValue = ( k, v ) => k in IDENTITY && ( Number( v ) === IDENTITY[ k ] || parseFloat( v ) === IDENTITY[ k ] );

function closeOf( r ) {
	if ( 'waapi' !== r.mechanism || 'forwards' !== r.fill || ENTERING.has( triggerOf( r ) ) ) {
		return null;
	}
	const pose = poseOf( props( r ) );
	if ( pose.unsupported.length || pose.other.length || ! Object.keys( pose.to ).length ) {
		return null;
	}
	if ( ! Object.entries( pose.from ).every( ( [ k, v ] ) => restValue( k, v ) ) || Object.entries( pose.to ).every( ( [ k, v ] ) => restValue( k, v ) ) ) {
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

// A property that states its values only in its formula, as a choice between two literals (`cond ? 'a' : 'b'`, the shape
// intake's re-derived inventory writes), with `to` the first and `from` the second; a stated `from` or `to` is kept.
export function withEnds( r ) {
	const list = Array.isArray( r?.properties ) ? r.properties : null;
	if ( ! list ) {
		return r;
	}
	const re = /\?\s*(?:'([^']*)'|"([^"]*)")\s*:\s*(?:'([^']*)'|"([^"]*)")\s*$/;
	const properties = list.map( ( p ) => {
		if ( null != p.to || 'string' !== typeof p.formula ) {
			return p;
		}
		const m = re.exec( p.formula.trim() );
		return m ? { ...p, to: m[ 1 ] ?? m[ 2 ], from: p.from ?? ( m[ 3 ] ?? m[ 4 ] ) } : p;
	} );
	return { ...r, properties };
}

export function recogniseBehaviour( record, ctx = {} ) {
	if ( ! record || 'object' !== typeof record || 'active' !== ( record.status ?? 'active' ) ) {
		return null;
	}
	const r = withEnds( record );
	const control = controlOf( r );
	if ( control ) {
		return done( r, { kind: 'control', of: control.of, effect: 'marquee', values: { hoverRate: control.rate } } );
	}
	if ( scrollResetOf( r ) ) {
		return done( r, { kind: 'native', reason: 'the draft scrolls to the top when its route changes; each SGS page is its own page load, which starts at the top' } );
	}
	const fade = routeFadeOf( r, ctx );
	if ( fade ) {
		return done( r, { kind: 'site', option: 'page-transition', value: { ...fade, settings: compact( { page_transitions: true, page_transition_style: fade.style, page_transition_duration: fade.durationMs, page_transition_easing: fade.easing } ) }, notes: [ `the page fades in on a route change: the site's page transition (${ fade.style }, ${ fade.durationMs }ms ${ fade.easing }) with the custom duration and easing, which win over the style's own`, 'the draft fades only the page body; SGS fades the page (an accepted difference, Ruling 5)' ] } );
	}
	for ( const make of [ headerScrollOf, dotPulseOf, accordionScrollOf, autoplayOf, pinnedTimelineOf ] ) {
		const e = make( r, ctx );
		if ( e ) {
			return done( r, { kind: 'settings', ...e } );
		}
	}
	// The track a timer steps sideways (the testimonial slider's autoplay, drag and arrows) and the writes that only hide an element until its reveal.
	const carousel = carouselOf( r, ctx );
	if ( carousel ) {
		return done( r, carousel );
	}
	const hides = hiddenStartOf( r, ctx.records );
	if ( hides ) {
		return done( r, { kind: 'covered', by: 'entrance', reason: `the script hides the element until its scroll reveal ${ hides } plays it in: the entrance's from-pose` } );
	}
	const owner = effectElementOwner( r, ctx.records );
	if ( owner ) {
		return done( r, { kind: 'covered', by: 'effect element', reason: `the declarations the script gives the element it creates for ${ owner }'s effect: the effect reads them` } );
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
	const companion = magnetCompanionOf( r );
	if ( companion ) {
		return done( r, { kind: 'covered', by: 'magnet', reason: companion.reason } );
	}
	const tilt = tiltOf( r, ctx );
	if ( tilt ) {
		return done( r, { kind: 'effect', effects: tilt.glare ? [ { effect: 'glare', panel: 'hover', trigger: 'hover', values: tilt.glareValues } ] : [], hoverState: tilt.hoverState, unread: tilt.rows } );
	}
	const tiltHost = tiltGlareHostOf( r, ctx );
	if ( tiltHost ) {
		return done( r, { kind: 'covered', by: 'glare', reason: `the pointer position on the element ${ tiltHost } tilts: the glare layer of that Follow pointer reads it` } );
	}
	const reset = tiltResetOf( r );
	if ( reset ) {
		return done( r, { kind: 'effect', effects: [], hoverState: compact( reset ) } );
	}
	for ( const make of [ sheenOf, rippleOf, peekOf, scrollOf ] ) {
		const e = make( r, ctx );
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
	const list = Array.isArray( records ) ? records : [];
	const c = { records: list, ...ctx };
	for ( const r of list ) {
		const b = recogniseBehaviour( r, c );
		if ( ! b || [ 'native', 'covered' ].includes( b.kind ) ) {
			continue;
		}
		const attrs = 'settings' === b.kind ? Object.entries( b.blocks || {} ).map( ( [ block, s ] ) => `${ block } ${ s.filter( ( x ) => ! x.companion ).map( ( x ) => x.attr ).join( ', ' ) }` ).join( ' or ' ) : '';
		const what = 'effect' === b.kind ? [ ...b.effects.map( ( e ) => e.effect ), ...( b.hoverState ? [ 'follow-pointer' ] : [] ) ].join(  ' + ' ) || 'hover state'
			: 'control' === b.kind ? `${ b.effect } hover rate of ${ b.of }` : 'site' === b.kind ? b.option : 'settings' === b.kind ? `settings: ${ attrs }` : 'close' === b.kind ? 'close' : 'no SGS effect';
		const says = 'unmapped' === b.kind ? `not expressed by any SGS effect: ${ b.reason }`
			: 'settings' === b.kind ? `written as the block settings ${ attrs }`
			: 'close' === b.kind ? 'the close of the same element\'s open entrance (its entrance close values)' : `the ${ what } effect`;
		rows.push( {
			rowId: `effect:${ r.id }`, draftId: r.id, record: r.id, effect: what, kind: b.kind,
			text: `${ r.id } ${ r.name ?? '' } (${ r.mechanism }, ${ triggerOf( r ) }) is ${ says }`.replace( /\s+/g, ' ' ),
			unmapped: 'unmapped' === b.kind ? b.reason : undefined,
		} );
		( b.unread || [] ).forEach( ( u ) => rows.push( { rowId: `effect:${ r.id }:${ u.field }`, draftId: r.id, record: r.id, effect: what, kind: b.kind, text: `${ r.id } ${ what } ${ u.field }: ${ u.reason }`, unmapped: u.reason } ) );
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
