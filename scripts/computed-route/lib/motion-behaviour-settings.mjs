// The settings behaviours (Spec 48 FR-48-77): a draft's script behaviours that SGS expresses as block settings rather than
// motion layers (the header's scrolled shadow and sticky bar, the open-status dot pulse, scrolling to an opened accordion
// row, the testimonial slider's autoplay, the pinned timeline's track, counter, focus and active year). Each recogniser
// takes one animation record (and `ctx`, lib/motion-behaviours.mjs::recogniseBehaviour's) and returns
// { blocks: { '<block>': [ { attr, value, colour? } ] }, accepted?, sticky?, notes } or null.

import { colourHex } from './tokens.mjs';
import { shadowParts } from './motion-shadow.mjs';
import { templateKey, templateKeyOf } from './fact-key.mjs';
import { props, nameOf, words, blob, triggerOf, MINUS, NUMBER, number, durationOf, easingOf } from './motion-record-text.mjs';

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

// The header block and its sticky setting, which headerScrollOf and lib/fill-header-sticky.mjs write.
export const STICKY_HEADER = { block: 'sgs/site-header', attr: 'headerSticky' };

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

// The state key a draft's "the page has scrolled" state is named by (`scrolled`, `isScrolled`).
const SCROLLED_KEY = /^(?:is)?scrolled$/i;
const stateKeysOf = ( r ) => ( Array.isArray( r.trigger?.state_keys ) ? r.trigger.state_keys : [] );

// The one value a hole's answer summary holds (a string or number answer that is not a loop's), else null.
const valueOf = ( a ) => ( 1 === a?.v?.length && ! a.loop && [ 'string', 'number' ].includes( a.v[ 0 ].t ) ? a.v[ 0 ].v : null );

// The looks a draft's scrolled state gives its template elements, from the fact record (lib/fact-record.mjs): the surface
// states whose keys set only a scrolled key to true name a state job (`<surface id>:<state name>`), and each element's
// `logic.holesByState[<job>]` holds the holes that state changes, per width, against `logic.holes`. Returns
// { <template key>: [ { where: 'style:padding', path: 'navPad', by: { <width>: { rest, scrolled } } } ] }; `where` is the
// hole's place (the style property or attribute), `path` the expression it is bound to.
export function scrolledLooksOf( facts ) {
	const els = facts?.elements || {};
	const jobs = new Set();
	for ( const e of Object.values( els ) ) {
		for ( const s of e.surfaces || [] ) {
			for ( const st of s.otherStates || [] ) {
				const keys = Object.entries( st.state_keys || {} );
				1 === keys.length && SCROLLED_KEY.test( keys[ 0 ][ 0 ] ) && true === keys[ 0 ][ 1 ] && jobs.add( `${ s.id }:${ st.name }` );
			}
		}
	}
	const out = {};
	for ( const [ key, e ] of Object.entries( els ) ) {
		const holes = Object.fromEntries( ( e.template?.holes || [] ).map( ( h ) => [ h.id, h ] ) );
		for ( const [ , changed ] of Object.entries( e.logic?.holesByState || {} ).filter( ( [ job ] ) => jobs.has( job ) ) ) {
			for ( const [ id, byWidth ] of Object.entries( changed ) ) {
				const h = holes[ id ];
				const by = {};
				for ( const [ w, a ] of Object.entries( byWidth ) ) {
					const scrolled = valueOf( a );
					const rest = valueOf( e.logic?.holes?.[ id ]?.[ w ] );
					null !== scrolled && null !== rest && ( by[ w ] = { rest, scrolled } );
				}
				h && Object.keys( by ).length && ( out[ key ] ??= [] ).push( { where: h.where, path: h.path, by } );
			}
		}
	}
	return out;
}

// A CSS padding shorthand of one to four pixel lengths as { top, right, bottom, left }, else null.
export function paddingBox( value ) {
	const parts = String( value ?? '' ).trim().split( /\s+/ );
	if ( parts.length > 4 || ! parts.every( ( x ) => /^-?\d*\.?\d+(?:px)?$/.test( x ) ) ) {
		return null;
	}
	const [ top, right = top, bottom = top, left = right ] = parts.map( ( x ) => ( /px$/.test( x ) || '0' === x ? x : `${ x }px` ) );
	return { top, right, bottom, left };
}

// The tier map ({ desktop?, tablet?, mobile? }) of the values a draft gives at each width (`at`: { <width>: value | null },
// null meaning the draft changes nothing at that width): a tier is written only where its value differs from the wider
// tier's, a narrower tier inheriting. `off`, when given, is the value a width with no change takes beneath a tier that has one.
function tiersOf( at, off = null ) {
	const out = {};
	let held = null;
	for ( const [ tier, w ] of TIER_WIDTHS ) {
		if ( ! ( w in at ) ) {
			continue;
		}
		const v = null === at[ w ] ? off : at[ w ];
		if ( null === v || ( null === held && null === at[ w ] ) ) {
			continue;
		}
		JSON.stringify( v ) !== JSON.stringify( held ) && ( out[ tier ] = v );
		held = v;
	}
	return out;
}

// The header element a template element sits in (itself or its nearest ancestor that is a `header`), else the nearest that
// the draft pins; null for an element in no header.
function headerKeyOf( key, template ) {
	const els = template?.elements || {};
	const pins = ( e ) => PINS.test( String( staticStyle( e, 'position' ) ?? '' ).trim() );
	const chain = [ key, ...( els[ key ]?.parentChain || [] ) ].filter( ( k ) => els[ k ] );
	return chain.find( ( k ) => 'header' === els[ k ].realTag || 'header' === els[ k ].tag ) ?? chain.find( ( k ) => pins( els[ k ] ) ) ?? null;
}

// The scrollY threshold the draft states for its scrolled state (`scrollY > 40`): the first record, of the given records, that
// keys a scrolled state and names one. The fact record keeps the draft's own records under each element's `effects`.
function scrolledThreshold( records ) {
	for ( const r of records || [] ) {
		const at = stateKeysOf( r ).some( ( k ) => SCROLLED_KEY.test( k ) ) ? new RegExp( `scrollY\\s*>\\s*${ NUMBER }` ).exec( blob( r ) ) : null;
		if ( at ) {
			return number( at[ 1 ] );
		}
	}
	return null;
}

// The scroll distance the fact record's records give for the draft's scrolled state, or null.
export const scrolledThresholdOf = ( facts ) => scrolledThreshold( Object.values( facts?.elements || {} ).flatMap( ( e ) => e.effects || [] ) );

// The header block's own scrolled threshold, which a draft's is written over only where it differs.
const SCROLLED_OFFSET_DEFAULT = 50;

// The property a scrolled look is a look of, as an animation record names it.
const LOOK_PROPERTY = { 'style:padding': 'padding', 'attr:width': 'width' };

// The row block's own shrink timing (`rowShrinkDuration` 0 keeps 200ms; `rowShrinkEasing` empty keeps ease), in the units
// the block's settings hold: the record's duration in ms and its easing as a named curve the block knows (a cubic-bezier()
// is `custom` with `rowShrinkEasingCustom`). A timing equal to the block's own default is not written; an easing the
// block has no name or custom field for is noted.
const SHRINK_EASING_NAMES = [ 'ease', 'ease-out', 'ease-in-out', 'linear' ];
const SHRINK_DURATION_DEFAULT = 200;
function shrinkTiming( r, notes ) {
	const ms = durationOf( r );
	const curve = easingOf( r )?.trim().toLowerCase() ?? null;
	const out = [];
	if ( null !== ms && ms !== SHRINK_DURATION_DEFAULT ) {
		out.push( { attr: 'rowShrinkDuration', value: Math.round( ms ) } );
	}
	if ( null !== curve && 'ease' !== curve ) {
		if ( SHRINK_EASING_NAMES.includes( curve ) ) {
			out.push( { attr: 'rowShrinkEasing', value: curve } );
		} else if ( /^cubic-bezier\(/.test( curve ) ) {
			out.push( { attr: 'rowShrinkEasing', value: 'custom' }, { attr: 'rowShrinkEasingCustom', value: curve } );
		} else {
			notes.push( `the row shrinks with the easing "${ curve }", which rowShrinkEasing has no name for` );
		}
	}
	return out;
}

// A transition of a property the draft's scrolled state changes on that element (`ctx.template.scrolled`, scrolledLooksOf): a
// row whose padding changes with it shrinks on scroll (`rowShrink` and `rowShrinkPadding` on the `sgs/site-header-row`, and
// the draft's threshold as `scrolledOffset` on the header it sits in where it is not the default), and a logo whose width
// changes with it is `shrinkWidth` on its `sgs/responsive-logo`. The record is the one the element is keyed by and the
// values are the fact record's, so a record needs no `scrolled` state key of its own. `placements` names each template
// element and the settings written there, by block; `blocks` is the same settings by block alone.
export function scrollShrinkOf( r, ctx ) {
	const looks = ctx.template?.scrolled;
	const key = templateOfRecord( r, ctx )?.key;
	const mine = ( looks?.[ key ] || [] ).filter( ( l ) => props( r ).some( ( p ) => nameOf( p ) === LOOK_PROPERTY[ l.where ] ) );
	if ( 'state' !== triggerOf( r ) || ! mine.length ) {
		return null;
	}
	const placements = {};
	const notes = [ 'the header shrinks once the page has scrolled (the draft\'s scrolled state)' ];
	const offset = ctx.template.scrolledAt ?? scrolledThreshold( ctx.records );
	const px = ( v ) => ( 'number' === typeof v ? `${ v }px` : String( v ) );
	const pad = mine.find( ( l ) => 'style:padding' === l.where );
	const width = mine.find( ( l ) => 'attr:width' === l.where );
	const header = pad ? headerKeyOf( key, ctx.template ) : null;
	if ( pad && header ) {
		const boxes = Object.fromEntries( TIER_WIDTHS.map( ( [ , w ] ) => [ w, pad.by[ w ] ? paddingBox( pad.by[ w ].scrolled ) : null ] ) );
		const held = TIER_WIDTHS.every( ( [ , w ] ) => ! pad.by[ w ] || boxes[ w ] );
		const on = tiersOf( Object.fromEntries( TIER_WIDTHS.map( ( [ , w ] ) => [ w, pad.by[ w ] ? 'on' : null ] ) ), 'off' );
		( placements[ key ] ??= {} )[ 'sgs/site-header-row' ] = [
			{ attr: 'rowShrink', value: on },
			...( held ? [ { attr: 'rowShrinkPadding', value: tiersOf( Object.fromEntries( TIER_WIDTHS.map( ( [ , w ] ) => [ w, boxes[ w ] ] ) ) ) } ] : [] ),
			...shrinkTiming( r, notes ),
		];
		held || notes.push( `the shrunk padding is not in pixels at every width, so the row's own default (half the resting top and bottom) stands` );
		if ( null !== offset && offset !== SCROLLED_OFFSET_DEFAULT ) {
			( placements[ header ] ??= {} )[ 'sgs/site-header' ] = [ { attr: 'scrolledOffset', value: offset } ];
		}
	}
	if ( width ) {
		const value = tiersOf( Object.fromEntries( TIER_WIDTHS.map( ( [ , w ] ) => [ w, width.by[ w ] ? px( width.by[ w ].scrolled ) : null ] ) ) );
		Object.keys( value ).length && ( ( placements[ key ] ??= {} )[ 'sgs/responsive-logo' ] = [ { attr: 'shrinkWidth', value } ] );
	}
	if ( ! Object.keys( placements ).length ) {
		return null;
	}
	const blocks = {};
	for ( const byBlock of Object.values( placements ) ) {
		for ( const [ block, settings ] of Object.entries( byBlock ) ) {
			blocks[ block ] = [ ...( blocks[ block ] || [] ), ...settings ];
		}
	}
	return { blocks, placements, notes };
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
