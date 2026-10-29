// The settings behaviours (Spec 48 FR-48-77): a draft's script behaviours that SGS expresses as block settings rather than
// motion layers (the header's scrolled shadow and sticky bar, the open-status dot pulse, scrolling to an opened accordion
// row, the testimonial slider's autoplay, the pinned timeline's track, counter, focus and active year). Each recogniser
// takes one animation record (and `ctx`, lib/motion-behaviours.mjs::recogniseBehaviour's) and returns
// { blocks: { '<block>': [ { attr, value, colour? } ] }, accepted?, sticky?, notes } or null.

import { colourHex } from './tokens.mjs';
import { shadowParts } from './motion-shadow.mjs';
import { templateKey, templateKeyOf } from './fact-key.mjs';
import { props, nameOf, words, blob, triggerOf, MINUS, NUMBER, number, durationOf } from './motion-record-text.mjs';

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

const PINS = /^(?:sticky|fixed)$/;

// Each device tier and the width the draft is read at for it (lib/fill-read.mjs::READ_WIDTHS), widest first: a narrower
// tier inherits a wider one's value.
const TIER_WIDTHS = [ [ 'desktop', 1440 ], [ 'tablet', 768 ], [ 'mobile', 375 ] ];

// The draft's computed position of every root element a template element is, by width: { <template key>: { width:
// position } }, from lib/fill-read.mjs::readDraft's snapshots (a width that did not render the element has none). Only a
// root target found by its draft element ID (a tpl finder) names its template element. rootComponent: the entry draft's
// component, which the served root host is named after.
export function positionsByTemplate( { reads, nodes, rootComponent = null } ) {
	const out = {};
	for ( const t of nodes.flatMap( ( n ) => n.targets ).filter( ( x ) => '' === x.slot && 'string' === typeof x.finder?.tpl ) ) {
		const key = templateKeyOf( t.finder.tpl, rootComponent );
		for ( const [ width, snaps ] of Object.entries( reads?.widths || {} ) ) {
			const position = snaps[ t.id ]?.position;
			key && position && ( ( out[ key ] ??= {} )[ width ] = position );
		}
	}
	return out;
}

// headerSticky from the draft's computed position at each tier's width (`by`: { width: position }): `on` at desktop where
// the header pins there, `off` on every tier where it does not, and a tier that pins inherits (written `on` only beneath an
// `off`); a tier the draft does not render inherits. null when no tier pins. Without a read of the header, the code's
// pinning stands at desktop.
export function stickyTiers( by ) {
	if ( ! TIER_WIDTHS.some( ( [ , w ] ) => by?.[ w ] ) ) {
		return { desktop: 'on' };
	}
	if ( ! TIER_WIDTHS.some( ( [ , w ] ) => PINS.test( String( by[ w ] ?? '' ) ) ) ) {
		return null;
	}
	const out = {};
	let inherited = 'off';
	for ( const [ tier, w ] of TIER_WIDTHS ) {
		if ( ! by[ w ] ) {
			continue;
		}
		const want = PINS.test( String( by[ w ] ) ) ? 'on' : 'off';
		if ( 'off' === want || 'desktop' === tier || inherited !== want ) {
			out[ tier ] = want;
		}
		inherited = want;
	}
	return out;
}

// A script that writes a box-shadow once the page has scrolled past a distance: the site header's scrolled shadow and
// threshold and, for a header the draft pins, its sticky behaviour per tier (stickyTiers, from `ctx.positions`,
// positionsByTemplate's map). The shadow is the `shadowScrolled` shape with its colour split into `shadowScrolledColour`.
export function headerScrollOf( r, ctx ) {
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
	const by = ctx.positions?.[ templateOfRecord( r, ctx )?.key ];
	const sticky = by ? stickyTiers( by ) : ( stickyOf( r, ctx ) ? { desktop: 'on' } : null );
	return {
		blocks: { 'sgs/site-header': [
			{ attr: 'scrolledOffset', value: number( at[ 1 ] ) },
			{ attr: 'shadowScrolled', value: [ shadow.x, shadow.y, shadow.blur, shadow.spread ].map( px ).join( ' ' ) },
			...( colour ? [ { attr: 'shadowScrolledColour', value: colour, colour: true } ] : [] ),
			...( sticky ? [ { attr: 'headerSticky', value: sticky } ] : [] ),
		] },
		sticky: sticky ? templateOfRecord( r, ctx ) : null,
		notes: [ 'the scrolled shadow switches once the page has scrolled past the threshold' ],
	};
}

// An endless ring that grows from a dot and fades (a box-shadow spread from nothing to transparent): the open-status dot.
export function dotPulseOf( r ) {
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
export function accordionScrollOf( r ) {
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
export function autoplayOf( r ) {
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
export const PINNED = /\[data-pin|updatePins|pin\.offsetHeight/i;
export function pinnedTimelineOf( r ) {
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
			blocks: { 'sgs/timeline': [ { attr: 'scrollEffect', value: 'pinned-horizontal' }, { attr: 'orientation', value: 'horizontal' }, ...( carousel ? [ { attr: 'mobileLayout', value: 'carousel' } ] : [] ) ] },
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

// A scroll track the draft's script drives, which the testimonial slider is: a timer that steps the track sideways
// (`setInterval every 6000ms via step`, a `scrollTo( { left: ... } )`) is the slider's autoplay and its interval; pointer
// dragging that suspends scroll snapping and moves `scrollLeft` is its drag to scroll; prev and next controls that step
// the same function are its arrows. The track's other script writes (the drag handlers, the arrows' steps) are the slider's
// own. Returns a behaviour ({ kind: 'settings' | 'covered', ... }) or null. `ctx.records` is the whole inventory.
const STEPS = /scrollTo\(\s*\{\s*left/;
const isStep = ( r ) => 'js-scroll' === r.mechanism && 'active' === ( r.status ?? 'active' ) && STEPS.test( words( r.source?.code ) );
const everyMs = ( r ) => number( /setInterval\s+every\s+(\d*\.?\d+)\s*ms/i.exec( words( r.trigger?.detail ) )?.[ 1 ] );
export function carouselOf( r, ctx = {} ) {
	const all = ( ctx.records || [] ).filter( ( x ) => x.element?.dc === r.element?.dc && 'active' === ( x.status ?? 'active' ) );
	const timer = all.find( ( x ) => isStep( x ) && 'interval' === triggerOf( x ) && everyMs( x ) );
	if ( ! timer ) {
		return null;
	}
	const fn = timer.source?.function;
	const drags = all.filter( ( x ) => /drag/i.test( x.source?.function ?? '' ) && 'js-style-write' === x.mechanism && props( x ).some( ( q ) => 'scroll-snap-type' === nameOf( q ) ) );
	const moves = all.filter( ( x ) => /drag/i.test( x.source?.function ?? '' ) && 'js-scroll' === x.mechanism );
	const steps = all.filter( ( x ) => x.source?.function === fn && isStep( x ) && 'interval' !== triggerOf( x ) );
	const owns = new Set( [ ...all.filter( ( x ) => isStep( x ) && 'interval' === triggerOf( x ) && x.source?.function === fn ), ...drags, ...moves, ...steps ].map( ( x ) => x.id ) );
	const dragging = drags.length > 0 && moves.length > 0;
	const arrows = steps.length > 0;
	if ( timer.id !== r.id ) {
		return owns.has( r.id ) ? { kind: 'covered', by: 'testimonial-slider', reason: `a write of the scroll track ${ timer.id } drives (its timer, its pointer drag or its arrows): the testimonial slider's own autoplay, drag to scroll and arrows` } : null;
	}
	return {
		kind: 'settings',
		blocks: { 'sgs/testimonial-slider': [
			{ attr: 'autoplay', value: true }, { attr: 'autoplaySpeed', value: everyMs( r ) },
			...( dragging ? [ { attr: 'dragToScroll', value: true } ] : [] ), ...( arrows ? [ { attr: 'showArrows', value: true } ] : [] ),
		] },
		accepted: "the hover, touch and focus holds that pause the timer and the slider's own arrow and dot styling are the slider's own",
		notes: [ `a scroll track stepped by a ${ everyMs( r ) }ms timer${ dragging ? ', dragged by the pointer' : '' }${ arrows ? ' and stepped by arrow controls' : '' } is the testimonial slider's autoplay${ dragging ? ', drag to scroll' : '' }${ arrows ? ' and arrows' : '' }`, "the slider's dots are not read from an active record, so showDots is left to the slider's own setting" ],
	};
}
