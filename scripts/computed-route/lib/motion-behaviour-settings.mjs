// The settings behaviours (Spec 48 FR-48-77): a draft's script behaviours that SGS expresses as block settings rather than
// motion layers (the header's scrolled shadow and sticky bar, the open-status dot pulse, scrolling to an opened accordion
// row, the testimonial slider's autoplay, the pinned timeline's track, counter, focus and active year). Each recogniser
// takes one animation record (and `ctx`, lib/motion-behaviours.mjs::recogniseBehaviour's) and returns
// { blocks: { '<block>': [ { attr, value, colour?, companion? } ] }, accepted?, sticky?, notes } or null. A `companion` setting is
// one the effect depends on (the pinned timeline's orientation): it is written with the others and is not a row of the review.

import { colourHex } from './tokens.mjs';
import { shadowParts } from './motion-shadow.mjs';
import { templateKey, templateKeyOf } from './fact-key.mjs';
import { props, nameOf, words, triggerOf, NUMBER, number, durationOf, codeTree, nodesOf, callsOf, expressionOf, negativeExpr, stringPieces } from './motion-record-text.mjs';

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

// A header the draft pins: `position: sticky` or `fixed` on its own template element.
function stickyOf( r, ctx ) {
	const t = templateOfRecord( r, ctx );
	return /^(?:sticky|fixed)$/.test( String( staticStyle( t?.element, 'position' ) ?? '' ).trim() );
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

// The template elements of a record's own element and their parent chain, nearest first, from ctx.template: [ key, ... ].
function chainOf( r, ctx ) {
	const t = templateOfRecord( r, ctx );
	return t ? [ t.key, ...( t.element.parentChain || [] ) ] : [];
}

// Whether a template element is drawn round: each corner's radius is 50% or more, or at least half the element's
// declared width and height.
function isRound( e ) {
	const corners = [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ].map( ( c ) => String( staticStyle( e, `border-${ c }-radius` ) ?? '' ).trim() );
	const half = Math.min( ...[ 'width', 'height' ].map( ( d ) => number( /^(\d*\.?\d+)px$/.exec( String( staticStyle( e, d ) ?? '' ).trim() )?.[ 1 ] ) ?? Infinity ) ) / 2;
	return corners.every( ( v ) => {
		const pct = /^(\d*\.?\d+)%$/.exec( v );
		const len = /^(\d*\.?\d+)px$/.exec( v );
		return pct ? Number( pct[ 1 ] ) >= 50 : !! len && Number.isFinite( half ) && Number( len[ 1 ] ) >= half;
	} );
}

const holesOf = ( e, where ) => ( e?.holes || [] ).filter( ( h ) => where.test( String( h.where ?? '' ) ) );

// The status element of a live status display: a round element with no words of its own whose paint (its background or
// colour) is a script value, inside a parent whose text is one (the status the script computes and the dot that shows it).
function statusDotOf( r, ctx ) {
	const t = templateOfRecord( r, ctx );
	const parent = t && ctx.template.elements[ t.element.realParent ?? t.element.parent ];
	return !! t && !! parent && isRound( t.element ) && ! String( t.element.words ?? '' ).trim() && holesOf( t.element, /^style:(?:background|background-color|color)$/ ).length > 0 && holesOf( parent, /^text$/ ).length > 0;
}

// An endless ring that grows from nothing and fades (a box-shadow spread from 0 to a transparent spread) on the status
// element of a live status display (statusDotOf): that display's dot pulse.
export function dotPulseOf( r, ctx = {} ) {
	const p = props( r ).find( ( q ) => 'box-shadow' === nameOf( q ) );
	if ( ! p || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || ! [ 'infinite', Infinity ].includes( r.iterations ) || ! statusDotOf( r, ctx ) ) {
		return null;
	}
	const from = shadowParts( p.from );
	const to = shadowParts( String( p.to ).replace( /\btransparent\b/i, 'rgba(0,0,0,0)' ) );
	if ( ! from || ! to || 0 !== from.spread || to.spread <= 0 || to.inset ) {
		return null;
	}
	return { blocks: { 'sgs/business-info': [ { attr: 'openStatusDotPulse', value: true }, ...( durationOf( r ) ? [ { attr: 'openStatusDotPulseDuration', value: durationOf( r ) } ] : [] ) ] }, notes: [ 'the dot pulses an endless expanding ring' ] };
}

// Whether a record's code calls `scrollTo` with an options object holding `top`, read from its syntax tree.
export const scrollsToTop = ( r ) => callsOf( codeTree( r.source?.code ), 'scrollTo' ).some( ( c ) => 'ObjectExpression' === c.arguments[ 0 ]?.type && c.arguments[ 0 ].properties.some( ( q ) => 'top' === ( q.key?.name ?? q.key?.value ) ) );

// The gap a scroll target keeps above an element's offset: the number in `<element>.offsetTop - <n>`, read from the syntax
// tree of the property's target value or formula, or null.
function offsetGap( p ) {
	for ( const text of [ p.to, p.formula ] ) {
		const hit = nodesOf( codeTree( text ), ( n ) => 'BinaryExpression' === n.type && '-' === n.operator && 'MemberExpression' === n.left.type && 'offsetTop' === n.left.property?.name && 'NumericLiteral' === n.right.type )[ 0 ];
		if ( hit ) {
			return hit.right.value;
		}
	}
	return null;
}

// A script that scrolls a page element (a template element, not the window) to an offset when a state changes: the
// container scrolled to the row it just opened. Its gap is the distance the code keeps above the row's offset.
export function accordionScrollOf( r ) {
	const p = props( r ).find( ( q ) => /^(?:scrolltop|scroll-position)$/.test( nameOf( q ) ) );
	if ( 'js-scroll' !== r.mechanism || ! p || 'state' !== triggerOf( r ) || null == r.element?.template_tpl_id || ! scrollsToTop( r ) ) {
		return null;
	}
	const gap = offsetGap( p );
	return {
		blocks: {
			'sgs/nav-drawer-menu': [ { attr: 'accordionScrollIntoView', value: true } ],
			'sgs/accordion': [ { attr: 'scrollToOpened', value: true }, ...( null === gap ? [] : [ { attr: 'scrollToOpenedGap', value: px( gap ) } ] ) ],
		},
		notes: [ 'opening a row scrolls it into view' ],
	};
}

// A state-driven entrance whose trigger also names an interval timer: the element replayed on a timer, the testimonial
// slider's autoplay (one card, the interval, the change duration).
export function autoplayOf( r ) {
	const every = new RegExp( `${ NUMBER }\\s*s\\s+setInterval|setInterval[^.]*?${ NUMBER }\\s*s\\b`, 'i' ).exec( words( r.trigger?.detail ) );
	const secs = number( every?.[ 1 ] ?? every?.[ 2 ] );
	if ( null === secs || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || 'state' !== triggerOf( r ) ) {
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

// A write that moves its element sideways: the value it writes is a translate3d whose second and third arguments are 0, or
// a translateX, and whose first argument is negative (the track travels left as the scroll advances). The value is read
// from the formula's syntax tree (its string pieces, each computed piece judged by its expression), else from the stated
// end value.
export function movesSideways( q ) {
	const expr = expressionOf( codeTree( q?.formula ) );
	const pieces = expr ? stringPieces( expr ) : 'string' === typeof q?.to ? [ q.to ] : [];
	const exprs = pieces.filter( ( x ) => 'string' !== typeof x );
	const value = pieces.map( ( x ) => ( 'string' === typeof x ? x : `\u0001${ exprs.indexOf( x ) }\u0001` ) ).join( '' );
	const fn = /^\s*(translate3d|translateX)\(([^()]*)\)\s*$/i.exec( value );
	const args = fn ? fn[ 2 ].split( ',' ).map( ( a ) => a.trim() ) : [];
	const flat = 'translate3d' === fn?.[ 1 ].toLowerCase() ? 3 === args.length && args.slice( 1 ).every( ( a ) => /^0(?:px)?$/.test( a ) ) : 1 === args.length;
	if ( ! fn || ! flat ) {
		return false;
	}
	const computed = /\u0001(\d+)\u0001/.exec( args[ 0 ] );
	return computed ? negativeExpr( exprs[ Number( computed[ 1 ] ) ] ) : /^-\s*\S/.test( args[ 0 ] );
}

// The section a scroll write holds in place: the nearest ancestor of its element positioned `sticky` (the stage that stays
// while its taller parent scrolls past), as its template key, or null.
function heldBy( r, ctx ) {
	return chainOf( r, ctx ).slice( 1 ).find( ( k ) => 'sticky' === String( staticStyle( ctx.template.elements[ k ], 'position' ) ?? '' ).trim() ) ?? null;
}

const writerOf = ( r ) => ( r.source?.function ? `${ r.source.file ?? '' }|${ r.source.function }` : null );
const scrollWrite = ( r ) => /^js-(?:style|text)-write$/.test( r.mechanism ) && 'scroll-position' === triggerOf( r ) && 'active' === ( r.status ?? 'active' );

// The pinned track a scroll write belongs to: its writer (the function that writes it) also translates an element held in
// a sticky section sideways, and the record's own element, when it names one, lies in that section. The section's
// template key, or null. ctx.records is the whole inventory; ctx.template the fact record's template.
export function pinnedSectionOf( r, ctx = {} ) {
	if ( ! scrollWrite( r ) || ! ctx.template?.elements ) {
		return null;
	}
	const track = ( x ) => ( scrollWrite( x ) && props( x ).some( ( q ) => /^(?:transform|translate)$/.test( nameOf( q ) ) && movesSideways( q ) ) ? heldBy( x, ctx ) : null );
	const own = track( r );
	if ( own ) {
		return own;
	}
	const writer = writerOf( r );
	const held = writer ? [ ...new Set( ( ctx.records || [] ).filter( ( x ) => x !== r && writerOf( x ) === writer ).map( track ).filter( Boolean ) ) ] : [];
	if ( 1 !== held.length ) {
		return null;
	}
	const chain = chainOf( r, ctx );
	return ! chain.length || chain.includes( held[ 0 ] ) ? held[ 0 ] : null;
}

// The edge and focus values of a proximity write `1 - <distance> * <depth>` (the distance from the centre runs 0 to 1):
// { edge, focus } from a stated from and to, else from the formula's syntax tree, else null.
function proximityEnds( q ) {
	const stated = ( v ) => null !== v && undefined !== v && '' !== v && Number.isFinite( Number( v ) );
	if ( stated( q.from ) && stated( q.to ) ) {
		return { edge: Number( q.from ), focus: Number( q.to ) };
	}
	const product = ( n ) => 'BinaryExpression' === n?.type && '*' === n.operator ? [ n.left, n.right ].find( ( x ) => 'NumericLiteral' === x.type ) ?? null : null;
	const hit = nodesOf( codeTree( q.formula ), ( n ) => 'BinaryExpression' === n.type && '-' === n.operator && 'NumericLiteral' === n.left.type && 1 === n.left.value && product( n.right ) )[ 0 ];
	const depth = hit ? product( hit.right ).value : null;
	return null === depth ? null : { edge: Math.round( ( 1 - depth ) * 1000 ) / 1000, focus: 1 };
}

// The pinned horizontal timeline (pinnedSectionOf): its track, counter, proximity focus and active year map onto
// `sgs/timeline`'s settings (Ruling 9).
export function pinnedTimelineOf( r, ctx = {} ) {
	if ( ! pinnedSectionOf( r, ctx ) ) {
		return null;
	}
	const list = props( r );
	const get = ( ...names ) => list.find( ( q ) => names.includes( nameOf( q ) ) );
	const text = get( 'textcontent' );
	if ( 'js-text-write' === r.mechanism && text ) {
		const padded = [ r.source?.code, text.formula ].map( codeTree ).some( ( t ) => callsOf( t, 'padStart' ).length > 0 );
		return { blocks: { 'sgs/timeline': [ { attr: 'panelCounter', value: true }, { attr: 'panelCounterFormat', value: padded ? 'padded-index-of-total' : 'index-of-total' } ] }, notes: [ 'the counter reads the pin\'s progress' ] };
	}
	const move = get( 'transform', 'translate' );
	if ( move && movesSideways( move ) ) {
		return {
			blocks: { 'sgs/timeline': [ { attr: 'scrollEffect', value: 'pinned-horizontal' }, { attr: 'orientation', value: 'horizontal', companion: true } ] },
			accepted: 'the draft switches to its touch-only strip at 1024px; SGS pins from 768px and swipes below (Ruling 9)',
			notes: [ 'the track moves sideways with the scroll while pinned' ],
		};
	}
	const opacity = get( 'opacity' );
	const scale = get( 'scale' );
	if ( opacity || scale ) {
		const o = opacity ? proximityEnds( opacity ) : null;
		const sc = scale ? proximityEnds( scale ) : null;
		const set = [ [ 'panelEdgeOpacity', o?.edge ], [ 'panelFocusOpacity', o?.focus ], [ 'panelEdgeScale', sc?.edge ], [ 'panelFocusScale', sc?.focus ] ].filter( ( [ , v ] ) => Number.isFinite( v ) );
		return { blocks: { 'sgs/timeline': [ { attr: 'panelProximityFocus', value: true }, ...set.map( ( [ attr, v ] ) => ( { attr, value: v } ) ) ] }, notes: [ 'entries scale and fade with distance from the centre' ] };
	}
	const colour = get( 'color' );
	const stroke = get( '-webkit-text-stroke-color', 'webkit-text-stroke-color' );
	const active = [ ...( colour && colourHex( colour.to ) ? [ { attr: 'dateActiveColour', value: colourHex( colour.to ), colour: true } ] : [] ), ...( stroke && colourHex( stroke.to ) ? [ { attr: 'dateActiveTextStrokeColour', value: colourHex( stroke.to ), colour: true } ] : [] ) ];
	if ( active.length ) {
		return { blocks: { 'sgs/timeline': active }, notes: [ 'the entry nearest the centre takes the active year colour' ] };
	}
	return null;
}

// A scroll track the draft's script drives, which the testimonial slider is: a timer that steps the track sideways
// (`setInterval every 6000ms via step`, a `scrollTo( { left: ... } )`) is the slider's autoplay and its interval; one writer
// that suspends scroll snapping (`scroll-snap-type: none`) and moves `scrollLeft` directly is its drag to scroll; prev and next controls that step
// the same function are its arrows; press controls of another function that scroll the same track to an offset derived from
// an index (`scrollTo( { left: i * w } )` inside the object each dot returns) are its dots. The track's other script writes (the drag handlers, the arrows' steps) are the slider's
// own. Returns a behaviour ({ kind: 'settings' | 'covered', ... }) or null. `ctx.records` is the whole inventory.
const STEPS = /scrollTo\(\s*\{\s*left/;
const INDEXED = /scrollTo\(\s*\{\s*left\s*:\s*\w+\s*\*/;
const isStep = ( r ) => 'js-scroll' === r.mechanism && 'active' === ( r.status ?? 'active' ) && STEPS.test( words( r.source?.code ) );
const everyMs = ( r ) => number( /setInterval\s+every\s+(\d*\.?\d+)\s*ms/i.exec( words( r.trigger?.detail ) )?.[ 1 ] );
export function carouselOf( r, ctx = {} ) {
	const all = ( ctx.records || [] ).filter( ( x ) => x.element?.dc === r.element?.dc && 'active' === ( x.status ?? 'active' ) );
	const timer = all.find( ( x ) => isStep( x ) && 'interval' === triggerOf( x ) && everyMs( x ) );
	if ( ! timer ) {
		return null;
	}
	const fn = timer.source?.function;
	// A drag suspends the track's snapping and moves its scroll offset directly, both in one writer.
	const suspends = all.filter( ( x ) => 'js-style-write' === x.mechanism && props( x ).some( ( q ) => 'scroll-snap-type' === nameOf( q ) && /^none$/i.test( String( q.to ?? '' ).trim() ) ) );
	const offsets = all.filter( ( x ) => 'js-scroll' === x.mechanism && ! isStep( x ) && props( x ).some( ( q ) => /^scroll-?left$/.test( nameOf( q ) ) ) );
	const sameWriter = ( x, y ) => !! writerOf( x ) && writerOf( x ) === writerOf( y );
	const drags = suspends.filter( ( x ) => offsets.some( ( y ) => sameWriter( x, y ) ) );
	const moves = offsets.filter( ( y ) => drags.some( ( x ) => sameWriter( x, y ) ) );
	const steps = all.filter( ( x ) => x.source?.function === fn && isStep( x ) && 'interval' !== triggerOf( x ) );
	const trackTpl = timer.element?.template_tpl_id;
	const dots = all.filter( ( x ) => isStep( x ) && 'press' === triggerOf( x ) && x.source?.function !== fn && null != trackTpl && trackTpl === x.element?.template_tpl_id && INDEXED.test( words( x.source?.code ) ) );
	const owns = new Set( [ ...all.filter( ( x ) => isStep( x ) && 'interval' === triggerOf( x ) && x.source?.function === fn ), ...drags, ...moves, ...steps, ...dots ].map( ( x ) => x.id ) );
	const dragging = drags.length > 0;
	const arrows = steps.length > 0;
	const dotted = dots.length > 0;
	if ( timer.id !== r.id ) {
		return owns.has( r.id ) ? { kind: 'covered', by: 'testimonial-slider', reason: `a write of the scroll track ${ timer.id } drives (its timer, its pointer drag or its arrows): the testimonial slider's own autoplay, drag to scroll and arrows` } : null;
	}
	return {
		kind: 'settings',
		blocks: { 'sgs/testimonial-slider': [
			{ attr: 'autoplay', value: true }, { attr: 'autoplaySpeed', value: everyMs( r ) },
			...( dragging ? [ { attr: 'dragToScroll', value: true } ] : [] ), ...( arrows ? [ { attr: 'showArrows', value: true } ] : [] ),
			...( dotted ? [ { attr: 'showDots', value: true } ] : [] ),
		] },
		accepted: "the hover, touch and focus holds that pause the timer and the slider's own arrow and dot styling are the slider's own",
		notes: [ `a scroll track stepped by a ${ everyMs( r ) }ms timer${ dragging ? ', dragged by the pointer' : '' }${ arrows ? ' and stepped by arrow controls' : '' } is the testimonial slider's autoplay${ dragging ? ', drag to scroll' : '' }${ arrows ? ' and arrows' : '' }${ dotted ? ' and dots' : '' }`, ...( dotted ? [] : [ "the slider's dots are not read from an active record, so showDots is left to the slider's own setting" ] ) ],
	};
}
