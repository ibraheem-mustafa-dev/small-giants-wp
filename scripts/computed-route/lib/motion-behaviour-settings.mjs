// The settings behaviours (Spec 48 FR-48-77): a draft's script behaviours that SGS expresses as block settings rather than
// motion layers (the header's scrolled shadow and sticky bar, the open-status dot pulse, scrolling to an opened accordion
// row, the testimonial slider's autoplay, the pinned timeline's track, counter, focus and active year). Each recogniser
// takes one animation record (and `ctx`, lib/motion-behaviours.mjs::recogniseBehaviour's) and returns
// { blocks: { '<block>': [ { attr, value, colour? } ] }, accepted?, sticky?, notes } or null.

import { colourHex } from './tokens.mjs';
import { shadowParts } from './motion-shadow.mjs';
import { templateKey, templateKeyOf } from './fact-key.mjs';
import { props, nameOf, words, blob, triggerOf, NUMBER, number, durationOf, easingOf, timerMs, codeTree, nodesOf, callsOf, negativeExpr, readsScrollY, optionKeys, cssCallOf } from './motion-record-text.mjs';

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

// The scroll distance a write switches at: the number a comparison `scrollY > n` (or `>=`) tests in the record's code or
// formula, read from the syntax tree, or null.
export function scrollThreshold( r ) {
	for ( const text of [ r.source?.code, ...props( r ).map( ( q ) => q.formula ) ] ) {
		const hit = nodesOf( codeTree( text ), ( n ) => 'BinaryExpression' === n.type && /^>=?$/.test( n.operator ) && readsScrollY( n.left ) && 'NumericLiteral' === n.right.type )[ 0 ];
		if ( hit ) {
			return hit.right.value;
		}
	}
	return null;
}

// The fact record's template as the recognisers read it (`ctx.template`): each template element's `template` entry, and
// the looks and threshold of the draft's scrolled state (scrolledLooksOf, scrolledThresholdOf); null with no fact record.
// lib/fill-behaviour.mjs re-exports it; the apply stage and the intake review read it from here.
export const templateOf = ( facts ) => ( facts ? { elements: Object.fromEntries( Object.entries( facts.elements || {} ).map( ( [ key, e ] ) => [ key, e.template || {} ] ) ), scrolled: scrolledLooksOf( facts ), scrolledAt: scrolledThresholdOf( facts ) } : null );

// The template fields the recognisers read (this file, lib/motion-behaviours.mjs, lib/motion-tilt.mjs): an element's tag, its
// parents, its component and helmet place, its attributes and words, the places of its holes and its declared styles.
const EFFECT_FIELDS = [ 'tag', 'realTag', 'parent', 'realParent', 'parentChain', 'component', 'inHelmet', 'attrs', 'words' ];

// The committed stand-in for the fact record's template (`build/intake/effect-template.json`, written with facts.json by
// lib/fact-record.mjs::writeFacts): templateOf with each element cut to EFFECT_FIELDS, its holes to their places and its
// declared styles without the `initial` longhands. facts.json is gitignored, so a checkout without it (CI, a fresh clone)
// reads this file instead and the intake review stays a function of committed files
// (lib/intake-review.mjs::factTemplate). tests/effect-template.test.mjs holds the cut to the recognisers' reads.
export const EFFECT_TEMPLATE = 'effect-template.json';
export function effectTemplateOf( facts ) {
	if ( ! facts ) {
		return null;
	}
	const cut = ( t ) => {
		const o = Object.fromEntries( EFFECT_FIELDS.filter( ( f ) => null !== ( t[ f ] ?? null ) && ! ( Array.isArray( t[ f ] ) && ! t[ f ].length ) ).map( ( f ) => [ f, t[ f ] ] ) );
		const holes = ( t.holes || [] ).map( ( h ) => ( { where: h.where } ) );
		const declared = ( t.style?.static || [] ).filter( ( [ , v ] ) => 'initial' !== String( v ).trim() );
		return { ...o, ...( holes.length ? { holes } : {} ), ...( declared.length ? { style: { static: declared } } : {} ) };
	};
	return { elements: Object.fromEntries( Object.entries( facts.elements || {} ).map( ( [ key, e ] ) => [ key, cut( e.template || {} ) ] ) ), scrolled: scrolledLooksOf( facts ), scrolledAt: scrolledThresholdOf( facts ) };
}

// A script that writes a box-shadow once the page has scrolled past a distance: the site header's scrolled shadow and
// threshold and, for a header the draft pins, its sticky behaviour per tier (stickyTiers, from `ctx.positions`,
// positionsByTemplate's map). The shadow is the `shadowScrolled` shape with its colour split into `shadowScrolledColour`.
export function headerScrollOf( r, ctx ) {
	const p = props( r ).find( ( q ) => 'box-shadow' === nameOf( q ) );
	const at = scrollThreshold( r );
	if ( 'js-style-write' !== r.mechanism || 'scroll-position' !== triggerOf( r ) || ! p || null === at || 'none' !== String( p.from ?? 'none' ).trim() ) {
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
			{ attr: 'scrolledOffset', value: at },
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

// The row block's own shrink timing, in the units the block's settings hold: the record's duration in ms and its easing as
// a named curve the block knows (a cubic-bezier() is `custom` with `rowShrinkEasingCustom`). The row prints a padding
// transition only when `rowShrinkDuration` is above 0 or `rowShrinkEasing` is set
// (plugins/sgs-blocks/includes/helpers-row-behaviour.php::sgs_row_shrink_settings_css), so a duration the draft states is
// always written, its 200ms default included; a duration above 0 and under 1ms is written as 1ms (rounding must not turn it
// into the switch-off below). A 0ms shrink (which `rowShrinkDuration` 0 would read as 200ms) is `rowAnimate` off, except on a
// row that also hides or collapses on a timed transition: `rowAnimate` off removes that transition too and the block times
// the collapse with `rowShrinkDuration`, so such a row writes no timing and the 0ms is named instead. `ease-out` and
// `ease-in` are written as their cubic-bezier(): the block reads those names as the client's easing tokens, not the CSS
// keywords. An easing the block has no name or custom field for is noted.
const SHRINK_EASING_NAMES = [ 'ease', 'ease-in-out', 'linear' ];
const SHRINK_EASING_CURVES = { 'ease-out': 'cubic-bezier(0, 0, 0.58, 1)', 'ease-in': 'cubic-bezier(0.42, 0, 1, 1)' };
const COLLAPSE_PROPERTIES = /^(?:transform|translate|block-size|height|max-height)$/;
function shrinkTiming( r, notes, timedCollapse = false ) {
	const ms = durationOf( r );
	const whole = null === ms ? null : ( 0 === ms ? 0 : Math.max( 1, Math.round( ms ) ) );
	if ( 0 === whole ) {
		if ( timedCollapse ) {
			notes.push( 'the draft shrinks the row in 0ms but the same row hides or collapses on a timed transition; the block times both with rowShrinkDuration, so no timing is written and the 0ms shrink is not mapped' );
			return [];
		}
		notes.push( 'the draft shrinks the row in 0ms, so it jumps: rowAnimate off' );
		return [ { attr: 'rowAnimate', value: false } ];
	}
	const curve = easingOf( r )?.trim().toLowerCase() ?? null;
	const out = null === whole ? [] : [ { attr: 'rowShrinkDuration', value: whole } ];
	if ( null !== curve && 'ease' !== curve ) {
		if ( SHRINK_EASING_NAMES.includes( curve ) ) {
			out.push( { attr: 'rowShrinkEasing', value: curve } );
		} else if ( SHRINK_EASING_CURVES[ curve ] || /^cubic-bezier\(/.test( curve ) ) {
			out.push( { attr: 'rowShrinkEasing', value: 'custom' }, { attr: 'rowShrinkEasingCustom', value: SHRINK_EASING_CURVES[ curve ] ?? curve } );
		} else {
			notes.push( `the row shrinks with the easing "${ curve }", which rowShrinkEasing has no name for` );
		}
	}
	return out;
}

// Whether another record on the same template element moves it by a timed transition of a hide or collapse property.
const timedCollapseOf = ( r, ctx, key ) => ( ctx.records || [] ).some( ( x ) => x !== r && x.id !== r.id && templateOfRecord( x, ctx )?.key === key && ( durationOf( x ) ?? 0 ) > 0 && props( x ).some( ( q ) => COLLAPSE_PROPERTIES.test( nameOf( q ) ) ) );

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
			...shrinkTiming( r, notes, timedCollapseOf( r, ctx, key ) ),
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
export const scrollsToTop = ( r ) => callsOf( codeTree( r.source?.code ), 'scrollTo' ).some( ( c ) => optionKeys( c ).includes( 'top' ) );

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

// The words that name an element as a card or another part of a slider.
const SLIDER_PART = /\bcards?\b|testimonial|slide|carousel|quote|review|rotator/i;

// A state-driven entrance whose interval timer is in the record's own code (lib/intake-inventory-trigger.mjs::schedulingTimer,
// the delay read from the syntax tree) or else named in its trigger: the testimonial slider's autoplay (one card, the
// interval, the change duration).
export function autoplayOf( r ) {
	const every = new RegExp( `${ NUMBER }\\s*s\\s+setInterval|setInterval[^.]*?${ NUMBER }\\s*s\\b`, 'i' ).exec( words( r.trigger?.detail ) );
	const secs = number( every?.[ 1 ] ?? every?.[ 2 ] );
	// The element must read as a card, a slide or another part of a slider (a timer also drives a hero word cycler or a
	// ticker, so a name with `word` never does), its code names split at each capital (`setTCard` is "set T Card"); the
	// timer in the record's own code gives the interval, else the one the trigger's words name.
	const ms = timerMs( r ) ?? ( null === secs ? null : secs * 1000 );
	const named = words( r.element?.description, r.name ).replace( /([a-z\d])([A-Z])/g, '$1 $2' ).replace( /([A-Z])([A-Z][a-z])/g, '$1 $2' );
	if ( null === ms || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || 'state' !== triggerOf( r ) || ! SLIDER_PART.test( named ) || /\bwords?\b/i.test( named ) ) {
		return null;
	}
	return {
		blocks: { 'sgs/testimonial-slider': [
			{ attr: 'autoplay', value: true }, { attr: 'autoplaySpeed', value: Math.round( ms ) }, { attr: 'slidesVisible', value: 1 },
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
	const c = cssCallOf( q );
	const zero = ( a ) => ( a.nodes.length ? 1 === a.nodes.length && null === a.text && 'NumericLiteral' === a.nodes[ 0 ].type && 0 === a.nodes[ 0 ].value : /^0(?:px)?$/.test( a.text ) );
	const flat = 'translate3d' === c?.name ? 3 === c.args.length && c.args.slice( 1 ).every( zero ) : 'translatex' === c?.name && 1 === c.args.length;
	if ( ! flat ) {
		return false;
	}
	const x = c.args[ 0 ];
	return x.nodes.length ? negativeExpr( x.nodes[ 0 ] ) : /^-\s*\S/.test( x.text );
}

// The touch strip a pinned stage gives way to: inside the same `<section>` as the stage, outside the stage, a template
// element the draft declares as a horizontal scroll track (overflow-x auto or scroll, with x scroll snapping). Read from the
// fact record's declared styles.
function touchStripBeside( stage, ctx ) {
	const elements = ctx.template.elements;
	const section = [ stage, ...( elements[ stage ]?.parentChain || [] ) ].find( ( k ) => /^section$/i.test( String( elements[ k ]?.realTag ?? elements[ k ]?.tag ?? '' ) ) );
	return !! section && Object.entries( elements ).some( ( [ k, e ] ) => k !== stage && ( e.parentChain || [] ).includes( section ) && ! ( e.parentChain || [] ).includes( stage )
		&& /^(?:auto|scroll)$/.test( String( staticStyle( e, 'overflow-x' ) ?? '' ).trim() ) && /^(?:x|both)\b/.test( String( staticStyle( e, 'scroll-snap-type' ) ?? '' ).trim() ) );
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
		const strip = touchStripBeside( pinnedSectionOf( r, ctx ), ctx );
		return {
			blocks: { 'sgs/timeline': [ { attr: 'scrollEffect', value: 'pinned-horizontal' }, ...( strip ? [ { attr: 'mobileLayout', value: 'carousel' } ] : [] ) ] },
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
