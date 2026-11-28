// One property of one element, from the draft's measured values to the setting writes (FR-47-4 step 2). Every write
// comes from lib/resolve.mjs::resolve (R-47-3); this module decides only which tiers differ from what the node already
// shows (R-47-5), tries the slots a setting could paint, and turns a fluid size into a clamp() where the setting takes one.
import { contentSelectors } from './fill-content-selector.mjs';
import { resolve, splitProperty, LOOSE, timeToMs } from './resolve.mjs';
import { samePaint, exactPaint, paintCanon, PX_TOL } from './css-equivalence/tolerance.mjs';
import { fitFluid, acceptsClamp, applyClamp, LENGTH_PROPS } from './fill-values.mjs';
import { INHERITED } from './calibrate-props.mjs';
import { paintedAt, TIER_OF } from './fill-held.mjs';
import { initialOf, longhandsOf, propertiesApplyingTo } from './css-families.mjs';
import { appliesIn, contextAt as inertContextAt } from './css-equivalence/inert.mjs';
import { sameCanonical } from './css-equivalence/values.mjs';
import { modeGroups } from './fill-device-mode.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it):
// the CSS groups whose declared values a draft header's Fill run wrote and confirmed.
export const COVERAGE_WRITES = [
	'block-setting:behaviour:styling',
	'block-setting:color:styling',
	'block-setting:colour-background:styling',
	'block-setting:colour-gradient:styling',
	'block-setting:colour-text:styling',
	'block-setting:enum-class-probe:styling',
	'block-setting:enum-mode:styling',
	'block-setting:layout:styling',
	'block-setting:number-css-px:styling',
	'block-setting:position:styling',
	'block-setting:select-from-enum:styling',
	'block-setting:spacing-token:styling',
	'block-setting:styling:styling',
	'block-setting:text-content:styling',
	'block-setting:typography:styling',
	'block-setting:visual:styling',
	'css-function:alpha',
	'css-function:color',
	'css-function:color-mix',
	'css-function:hsl',
	'css-function:hsla',
	'css-function:hwb',
	'css-function:lab',
	'css-function:lch',
	'css-function:oklab',
	'css-function:oklch',
	'css-function:rgb',
	'css-function:rgba',
	'css-function:var',
	'css-group:backgrounds-and-borders',
	'css-group:box-alignment',
	'css-group:box-sizing',
	'css-group:display',
	'css-group:filter-effects',
	'css-group:flexible-box-layout',
	'css-group:fonts',
	'css-group:grid-layout',
	'css-group:inline',
	'css-group:positioned-layout',
	'css-group:scalable-vector-graphics',
	'css-group:scrollbars-styling',
	'css-group:text',
	'css-group:text-decoration',
	'css-group:webkit-extensions',
	'css-unit:em',
	'css-unit:percent',
	'css-unit:px',
	'css-unit:rem',
	'html-attr:body.alink',
	'html-attr:body.background',
	'html-attr:body.bgcolor',
	'html-attr:body.leftmargin',
	'html-attr:body.link',
	'html-attr:body.marginheight',
	'html-attr:body.marginwidth',
	'html-attr:body.text',
	'html-attr:body.topmargin',
	'html-attr:body.vlink',
	'html-attr:canvas.height',
	'html-attr:canvas.width',
	'html-attr:center.align',
	'html-attr:col.width',
	'html-attr:dialog.open',
	'html-attr:div.align',
	'html-attr:embed.hspace',
	'html-attr:embed.vspace',
	'html-attr:embed.width',
	'html-attr:font.color',
	'html-attr:font.face',
	'html-attr:font.size',
	'html-attr:global.style',
	'html-attr:h1.align',
	'html-attr:h2.align',
	'html-attr:h3.align',
	'html-attr:h4.align',
	'html-attr:h5.align',
	'html-attr:h6.align',
	'html-attr:hr.align',
	'html-attr:hr.width',
	'html-attr:iframe.frameborder',
	'html-attr:iframe.width',
	'html-attr:img.border',
	'html-attr:img.height',
	'html-attr:img.hspace',
	'html-attr:img.vspace',
	'html-attr:img.width',
	'html-attr:input.border',
	'html-attr:input.hspace',
	'html-attr:input.vspace',
	'html-attr:input.width',
	'html-attr:marquee.bgcolor',
	'html-attr:marquee.hspace',
	'html-attr:marquee.vspace',
	'html-attr:marquee.width',
	'html-attr:object.border',
	'html-attr:object.hspace',
	'html-attr:object.vspace',
	'html-attr:object.width',
	'html-attr:p.align',
	'html-attr:style.media',
	'html-attr:table.background',
	'html-attr:table.bgcolor',
	'html-attr:table.bordercolor',
	'html-attr:table.cellpadding',
	'html-attr:table.width',
	'html-attr:tbody.align',
	'html-attr:tbody.background',
	'html-attr:tbody.bgcolor',
	'html-attr:td.align',
	'html-attr:td.background',
	'html-attr:td.bgcolor',
	'html-attr:td.width',
	'html-attr:tfoot.align',
	'html-attr:tfoot.background',
	'html-attr:tfoot.bgcolor',
	'html-attr:th.align',
	'html-attr:th.background',
	'html-attr:th.bgcolor',
	'html-attr:th.width',
	'html-attr:thead.align',
	'html-attr:thead.background',
	'html-attr:thead.bgcolor',
	'html-attr:tr.align',
	'html-attr:tr.background',
	'html-attr:tr.bgcolor',
	'html-attr:video.width',
	'html:style',
];
// The tiers, widest first: an empty tier shows the nearest wider tier's value.
export const TIER_WIDTHS = [ 1440, 768, 375 ];
// Inherited properties (R-47-5): their baseline is the parent's measured value, not a recorded default. The list is
// calibration's own (lib/calibrate-props.mjs::INHERITED), which records no default paint for any of them.
export { INHERITED };
// Read from the element that paints the text and from the element that lays out the children (walker rows put them at
// textPath and layoutPath), so a setting on an inner element can hold them.
export const CARRIED = [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow', 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'flex-direction', 'grid-template-columns', 'justify-content', 'align-items' ];
// The shared comparison rule (lib/css-equivalence/tolerance.mjs), exported here for the modules that read it from Fill.
export { PX_TOL };

const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
const TIER_KEYS = [ 'desktop', 'tablet', 'mobile' ];

// Every path calibration knows for a block (its elements, and the slots and reaches of its settings), as Solve reads them.
export const knownPaths = ( cal ) => [ ...Object.keys( cal?.elements || {} ), ...Object.values( cal?.settings || {} ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] ) ];

// A value as the browser paints it, for comparing (lib/css-equivalence/tolerance.mjs::paintCanon): a normal spacing or gap
// is 0px; an auto minimum height is 0px only where ctx shows no flex or grid item; text-align start and end are physical
// only where ctx reads the direction. ctx: { parentDisplay, position, direction }.
export const canon = ( prop, v, ctx = {} ) => paintCanon( prop, v, ctx );

// Whether a property paints nothing on this element at this width: an outline with no style or width, a border side with
// no width, a text decoration with no line, a transition that lasts 0s, a gap (gapPaintsNothing). Such a value is a
// computed leftover (currentcolor, a gap's `normal`), not a design value. A transition-duration of 0s is a leftover too
// where the draft declares none (the CSS initial value on an element it gives no transition): it is judged only where
// the draft's declared values for the element are known (`declared`: { longhand: value }, FR-48-8), never when the
// declared read failed. It is a design value, though, where the block's own paint of the element lasts (`own`: the
// block's calibrated default transition-duration there, from defaultPaint): the draft's undeclared 0s then removes the
// block's own transition, and the 0 is written. styles: the element's collected styles; snap: the element's whole
// reading at this width, where the caller has it (a gap is judged from it).
export function notPainted( prop, styles, snap = null, declared = null, own = undefined ) {
	if ( GAP_PROPS.includes( prop ) ) {
		return null !== gapPaintsNothing( prop, styles, snap );
	}
	if ( FLEX_ONLY.includes( prop ) ) {
		return null !== flexOnlyPaintsNothing( prop, snap );
	}
	const zero = ( v ) => undefined !== v && 0 === parseFloat( v );
	if ( /^outline-(color|offset)$/.test( prop ) ) {
		return 'none' === styles[ 'outline-style' ] || zero( styles[ 'outline-width' ] );
	}
	const side = /^border-(top|right|bottom|left)-color$/.exec( prop );
	if ( side ) {
		return zero( styles[ `border-${ side[ 1 ] }-width` ] );
	}
	if ( /^text-decoration-(color|thickness)$/.test( prop ) || 'text-underline-offset' === prop ) {
		return 'none' === ( styles[ 'text-decoration-line' ] ?? 'none' );
	}
	if ( 'transition-duration' === prop ) {
		return null !== declared && undefined === declared[ 'transition-duration' ] && ! lasts( own ) && /^\s*0(\.0+)?m?s(\s*,\s*0(\.0+)?m?s)*\s*$/.test( styles[ prop ] );
	}
	return /^transition-(delay|timing-function)$/.test( prop ) && zero( styles[ 'transition-duration' ] );
}

// The layout properties whose initial value is what an element computes when nothing declares it (a hero's `grid-template-columns:
// none`, a mega group's `flex-grow: 0`). Writing that value would replace the block's own layout with a value the draft never
// stated (Spec 48 R-47-5: a stated value is written, an unstated initial one is not). They are the properties mdn-data says
// apply only to a box inside a grid or flex layout the element may not be part of (a grid container, a flex or grid item, a
// multi-line flex container), by its `appliesto` category; the initial value is mdn-data's (`initialOf`). The flex container's
// own direction, wrap and justification, and the gaps, apply to every such container and are judged by their own rules.
const LAYOUT_ROLE = [ 'gridContainers', 'gridItemsAndBoxesWithinGridContainer', 'flexItemsAndInFlowPseudos', 'flexItemsGridItemsAbsolutelyPositionedContainerChildren', 'flexItemsGridItemsAndAbsolutelyPositionedBoxes', 'blockLevelBoxesAndAbsolutelyPositionedBoxesAndGridItems', 'multilineFlexContainers', 'blockContainersMultiColumnContainersFlexContainersGridContainers' ];
export const INITIAL_UNSTATED = new Set( propertiesApplyingTo( LAYOUT_ROLE ) );

// Whether a read value is the property's initial value with no declaration behind it, and the block's own default look paints
// that same initial value (`paint`, its calibrated default paint of the property at the width). A block that paints another
// value by default (a flex-grow of 1 in its stylesheet) is not left alone by an unstated initial value: the draft's `0` is what
// the element computes there, so the resolver judges it. A paint that was not measured (the look never reads align-self, grid-column
// and the like, so `paint` is undefined) is no evidence against leaving the value alone. declared: the element's
// declared longhands at the width ({ prop: value }), or null where the declared read failed (then nothing is judged).
export function undeclaredInitial( prop, value, declared, paint ) {
	if ( ! declared || ! INITIAL_UNSTATED.has( prop ) || Object.keys( declared ).some( ( k ) => k === prop || longhandsOf( k ).includes( prop ) ) ) {
		return false;
	}
	const initial = initialOf( prop );
	return null !== initial && sameCanonical( prop, value, initial ) && ( undefined === paint || sameCanonical( prop, paint, initial ) );
}

// Whether a transition-duration list holds a duration above 0 (a block's own transition); an unmeasured one does not.
const lasts = ( v ) => undefined !== v && String( v ).split( ',' ).some( ( t ) => 0 < ( timeToMs( t.trim() ) ?? 0 ) );

const GAP_PROPS = [ 'gap', 'row-gap', 'column-gap' ];
// The properties only a flex container lays out by: on any other box the computed value is the initial one (a block's
// flex-direction reads `row`) and no draft value was chosen.
export const FLEX_ONLY = [ 'flex-direction', 'flex-wrap' ];
// Why a flex-only property paints nothing on the element laying out the children, or null where it may paint (the layout
// element's display is a flex container, or is unknown).
export function flexOnlyPaintsNothing( prop, snap ) {
	const laid = snap?.layoutDisplay;
	return undefined === laid || '' === laid || /(^|-)flex$/.test( laid ) ? null : `${ prop } on a ${ laid } box, which lays out no flex items`;
}
const isSet = ( v ) => undefined !== v && 'auto' !== String( v ).trim();
// The explicit tracks a grid template lists (line names left out); 'none' lists none.
const trackCount = ( v ) => ( undefined === v || 'none' === String( v ).trim() ? 0 : String( v ).replace( /\[[^\]]*\]/g, ' ' ).trim().split( /\s+(?![^(]*\))/ ).filter( Boolean ).length );

// Why a gap paints nothing on this element, or null where it may paint. The reader takes a gap from the element laying
// out the children (parity/lib/collect.mjs::layoutElement), so it is judged by that element's display (`layoutDisplay`)
// and its in-flow rendered children (`layoutChildren`), never the wrapper's own display. A gap separates the items of a
// flex or grid container (and a column gap the columns of a multi-column box), so on any other box it is inert; and a
// container rendering fewer than two children has no two items to separate, unless it is a grid whose template lists two
// or more tracks across the gap's axis (the gap still sizes those tracks). A reading without them is never judged.
export function gapPaintsNothing( prop, styles, snap ) {
	const display = snap?.layoutDisplay;
	const children = snap?.layoutChildren;
	if ( undefined === display ) {
		return null;
	}
	const grid = /grid$/.test( display );
	if ( ! grid && ! /flex$/.test( display ) ) {
		const multicol = 'row-gap' !== prop && ( isSet( styles[ 'column-count' ] ) || isSet( styles[ 'column-width' ] ) );
		return multicol ? null : `${ prop } on a ${ display } box, which lays out no flex or grid items`;
	}
	// A grid whose resolved track list (the computed grid-template-rows or -columns, implicit tracks included) holds one track
	// has no second track on that axis to separate. (A flex container's gaps are left to Fill's spacing ownership,
	// lib/fill-spacing.mjs, which reads the rendered gaps between the children.)
	const axis = { 'row-gap': 'grid-template-rows', 'column-gap': 'grid-template-columns' }[ prop ];
	if ( grid && axis && 1 === trackCount( styles[ axis ] ) ) {
		return `${ prop } on a grid with one ${ 'row-gap' === prop ? 'row' : 'column' } track (${ styles[ axis ] }), which has no second track to separate`;
	}
	if ( ! Number.isInteger( children ) || children >= 2 ) {
		return null;
	}
	const axes = { 'column-gap': [ 'grid-template-columns' ], 'row-gap': [ 'grid-template-rows' ], gap: [ 'grid-template-columns', 'grid-template-rows' ] }[ prop ];
	if ( grid && axes.some( ( a ) => trackCount( styles[ a ] ) >= 2 ) ) {
		return null;
	}
	return `${ prop } on a ${ display } container rendering ${ children } child${ 1 === children ? '' : 'ren' }, so no two items to separate`;
}

// The calibrated default paint of an element at a width (1920 reads as 1440), with a gap of `normal` as the 0 it paints.
export function defaultPaint( cal, slot, width, prop ) {
	const key = Object.keys( cal?.elements || {} ).find( ( k ) => LOOSE( k ) === LOOSE( slot ) );
	const v = undefined !== key ? cal.elements[ key ]?.[ String( 1920 === width ? 1440 : width ) ]?.[ prop ] : undefined;
	return /gap$/.test( prop ) && 'normal' === v ? '0px' : v;
}

// The context calibration read an element's default paint in at a width (the reader's
// `_parentDisplay`, `_position`, the read direction, and as `own` the properties its paint marks `_own:` because the
// block's stylesheet sets them), or null where its paint carries none (a paint read before the context was recorded).
export function calibratedContext( cal, slot, width ) {
	const key = Object.keys( cal?.elements || {} ).find( ( k ) => LOOSE( k ) === LOOSE( slot ) );
	const paint = undefined !== key ? cal.elements[ key ]?.[ String( 1920 === width ? 1440 : width ) ] : undefined;
	if ( ! paint || undefined === paint._parentDisplay ) {
		return null;
	}
	const own = Object.keys( paint ).filter( ( k ) => k.startsWith( '_own:' ) ).map( ( k ) => k.slice( 5 ) );
	return { parentDisplay: paint._parentDisplay, ...( paint._position ? { position: paint._position } : {} ), ...( paint.direction ? { direction: paint.direction } : {} ), ...( own.length ? { own } : {} ) };
}

const INSETS = new Set( [ 'top', 'right', 'bottom', 'left' ] );
const OUT_OF_FLOW_POSITION = /^(absolute|fixed)$/;

// A baseline value in the context it was read in, as the value an unstyled element holds: where it is what the
// property's initial value computes to there and not that value itself (a `min-height` of 0px read off a flex or grid
// item, the computed form of `auto` there), it is the initial value, which the comparison then canons in the draft's
// context (an inset of an absolute or fixed element it does not set is the used value of `auto`, so it reads as `auto`). A value the block's stylesheet sets (the context's `own` names the property: a declared `min-height: 0`
// reads 0px off a flex item too) is that value, as is any other value or a baseline with no context of its own.
export function inOwnContext( prop, v, ctx ) {
	// An inset of an out-of-flow element the block's stylesheet does not set is the used value of `auto`: its static position.
	if ( INSETS.has( prop ) && OUT_OF_FLOW_POSITION.test( String( ctx?.position ?? '' ) ) && ! ctx.own?.includes( prop ) && undefined !== v ) {
		return 'auto';
	}
	const initial = ctx && undefined !== v && ! ctx.own?.includes( prop ) ? initialOf( prop ) : null;
	if ( ! initial || String( v ).trim() === initial ) {
		return v;
	}
	const there = paintCanon( prop, initial, ctx );
	return there !== initial && String( there ).trim() === String( v ).trim() ? initial : v;
}

// The tiers whose draft value differs from what the node shows there: its baseline, or what the tiers already chosen paint
// there, judged as the held side judges a write (lib/fill-held.mjs::paintedAt): an empty tier shows the nearest wider
// chosen tier only where the block's default paint of the property is the same at both widths, and otherwise the block's
// own fallback (its baseline), so a 10px desktop gap over a block whose mobile default is 8px writes the mobile tier too;
// a narrower draft value differing from the nearest written wider value is written even where the fallback paints it.
// A property calibration did not measure at every tier width gives no evidence of a fallback, so there the wider value
// carries down. baseline( width ) is the node's value with nothing written; defaultAt( width ) the block's calibrated
// default paint of the property (the baseline when not given); contextAt( width ) the element's context there for canon()
// ({ parentDisplay, position, direction }); baselineContextAt( width ) the context the baseline was read in, or null where
// it is the draft's. Each side is canoned in its own context (inOwnContext), then compared in the draft's by the shared
// rule (lib/css-equivalence/tolerance.mjs::exactPaint: a stated length is the default only when equal). Returns { width: value }.
export function tiersDiffering( prop, draft, baseline, defaultAt = baseline, contextAt = () => ( {} ), baselineContextAt = () => null ) {
	const out = {};
	const fallbackAt = TIER_WIDTHS.every( ( w ) => undefined !== defaultAt( w ) ) ? defaultAt : () => '0px';
	for ( const w of TIER_WIDTHS ) {
		if ( undefined === draft[ w ] ) {
			continue;
		}
		const painted = paintedAt( { after: Object.fromEntries( Object.entries( out ).map( ( [ x, v ] ) => [ TIER_OF[ x ], v ] ) ) }, w, prop, fallbackAt );
		const shown = painted ? painted.value : inOwnContext( prop, baseline( w ), baselineContextAt( w ) );
		// The block's own fallback is what an empty tier shows only while no wider tier of the setting is written: once one
		// is, the emitter may carry it down instead (the shared wrapper fills a split hero's empty phone column template from
		// the tablet one, over the hero's own one-column phone rule). Calibration records no carry-down per setting, so a
		// narrower draft value that differs from the nearest written wider value is written; one equal to it is not.
		const wider = TIER_WIDTHS.filter( ( x ) => x > w && x in out ).sort( ( a, b ) => a - b )[ 0 ];
		const carried = undefined === wider || exactPaint( prop, draft[ w ], out[ wider ], contextAt( w ) );
		if ( ! exactPaint( prop, draft[ w ], shown, contextAt( w ) ) || ! carried ) {
			out[ w ] = draft[ w ];
		}
	}
	return out;
}

// The settings a content writer decided from the draft for a tree node (an icon's source from its mark,
// lib/fill-icon.mjs::iconDecisions), keyed by the node object: lib/fill-resolve.mjs sets them before any look is resolved,
// and every resolver call on the node (or a copy registered with ownedCopy) leaves them as decided.
export const OWNED = new WeakMap();

// Registers a working copy of a node as holding its source's decided settings.
export function ownedCopy( from, copy ) {
	OWNED.has( from ) && OWNED.set( copy, OWNED.get( from ) );
	return copy;
}

// A setting holding one value for every width: its writes are no tier object and no Tablet or Mobile sibling.
const untiered = ( writes ) => writes.every( ( w ) => ! ( isObj( w.value ) && TIER_KEYS.some( ( t ) => t in w.value ) ) && ! /(Tablet|Mobile)$/.test( w.attr ) );

const pick = ( from, widths ) => Object.fromEntries( widths.filter( ( w ) => undefined !== from[ w ] ).map( ( w ) => [ w, from[ w ] ] ) );
const tierObject = ( v ) => isObj( v ) && Object.keys( v ).length > 0 && Object.keys( v ).every( ( k ) => TIER_KEYS.includes( k ) );

// A node drawn in another mode at some widths (calibration.modeAt, lib/fill-device-mode.mjs) whose property no one setting
// answers at every width is resolved once per mode: each group of widths drawn in one mode asks only the settings in force
// there (lib/resolve.mjs::resolve), a one-value setting holding the draft at every width that mode draws at. A group no setting
// answers is returned as a gap of its own widths (`modeGaps`: { widths, draft, gap, detail, code }) beside the other groups'
// writes, so its look goes to what paints it in that mode. Two groups writing one setting merge where each holds its own
// tiers; another value for a setting already written is that group's conflict. Returns null when the node has one mode over
// these widths or no group is written.
function byMode( { calibration, included, draft, call, sink, log, slot } ) {
	const widths = Object.keys( included ).map( Number );
	const groups = modeGroups( calibration?.modeAt, widths );
	if ( groups.length < 2 ) {
		return null;
	}
	const drawn = modeGroups( calibration.modeAt, Object.keys( draft ).map( Number ) );
	const kept = [];
	const ask = ( pw ) => {
		const r = call( pw );
		kept.push( ...sink );
		return r;
	};
	const parts = groups.map( ( ws ) => {
		let r = ask( pick( included, ws ) );
		let how = 'tiers';
		if ( ! r.gap && untiered( r.writes ) ) {
			r = ask( pick( draft, drawn.find( ( g ) => g.includes( ws[ 0 ] ) ) || ws ) );
			how = 'single';
		}
		return { widths: ws, r, how };
	} );
	const writes = [];
	for ( const p of parts.filter( ( x ) => ! x.r.gap ) ) {
		const clash = p.r.writes.find( ( w ) => writes.some( ( x ) => x.attr === w.attr && JSON.stringify( x.value ) !== JSON.stringify( w.value ) && ! ( tierObject( x.value ) && tierObject( w.value ) && Object.keys( w.value ).every( ( k ) => ! ( k in x.value ) || JSON.stringify( x.value[ k ] ) === JSON.stringify( w.value[ k ] ) ) ) ) );
		if ( clash ) {
			p.r = { gap: 'conflict', detail: `${ clash.attr } is written for the mode drawn at ${ widths.filter( ( w ) => ! p.widths.includes( w ) ).join( ', ' ) } with another value than the mode drawn at ${ p.widths.join( ', ' ) } needs` };
			continue;
		}
		for ( const w of p.r.writes ) {
			const prior = writes.find( ( x ) => x.attr === w.attr );
			prior ? ( tierObject( prior.value ) && ( prior.value = { ...prior.value, ...w.value } ) ) : writes.push( { ...w } );
		}
	}
	const done = parts.filter( ( p ) => ! p.r.gap );
	if ( ! done.length ) {
		return null;
	}
	log.push( ...kept );
	const gaps = parts.filter( ( p ) => p.r.gap );
	return {
		status: 'written', slot, writes, included: pick( included, done.flatMap( ( p ) => p.widths ) ), how: done.every( ( p ) => 'single' === p.how ) ? 'single' : 'tiers',
		modeGaps: gaps.map( ( p ) => ( { widths: p.widths, draft: pick( included, p.widths ), gap: p.r.gap, detail: `${ p.r.detail }; the block draws another mode at ${ widths.filter( ( w ) => ! p.widths.includes( w ) ).join( ', ' ) }, whose settings do not paint ${ p.widths.join( ', ' ) }`, ...( p.r.code ? { code: p.r.code } : {} ) } ) ),
	};
}

const clampOk = ( cal, writes ) => writes.length > 0 && writes.every( ( w ) => acceptsClamp( cal, w.attr ) || acceptsClamp( cal, w.attr.replace( /(Tablet|Mobile)$/, '' ) ) );

// ctx: { node, owned ({ attr: value }: the settings a content writer decided for the node, which no answer changes;
// default: what OWNED holds for the node), block, prop, draft ({ width: value }), baseline( slot, width ), slots (the slot first, then other slots a
// setting for a carried property could paint), calibration, db, snapshot, log, fontPx, siblings, fluid ({ width: value }
// at the five fluid widths, or null), state (a setting state, block_attributes.css_state; null for the resting look),
// declared ({ width: value }: the code's value where it agrees with the draft value, written in its place, FR-48-36),
// contextAt ( width => { parentDisplay }: the element's parent's display, where the caller reads it; the element's own
// position and direction come from `siblings`), drawnAt ( ( slot, prop, width ) => the draft's value of prop on the
// node's element at that calibrated slot, undefined where the draft has none: a per-device mode is checked against the
// node's other elements, lib/resolve.mjs::resolveDiscovered) }.
// Returns { status: 'equal' | 'written' | 'gap', slot, writes?, included?, how?: 'tiers' | 'single' | 'clamp', fluid?, gap?, detail?,
// modeGaps? (the widths of a mode no setting answers, beside a written mode: byMode) }.
// 'equal': the draft matches what the node shows at every tier, nothing to write.
export function resolveProperty( ctx ) {
	const r = resolveOne( ctx );
	const gone = inapplicableAt( ctx );
	return gone.length && ! r.inapplicable ? { ...r, inapplicable: gone } : r;
}

// The widths of `draft` at which `prop` applies to no box the element is (a grid template on a flex box, `flex-grow` on a block
// child), each with why: [ { width, detail } ] (lib/css-equivalence/inert.mjs::appliesIn decides it from the element's own display
// and position and its parent's display; an undecided case is not listed). A state's value and a painted layer are judged where
// they are read, not by the resting element, and a node with no sibling reads has no context to judge by.
export function inapplicableAt( { prop, draft, siblings = {}, state = null, paintState = null, contextAt = () => ( {} ) } ) {
	if ( state || paintState || ! Object.keys( siblings ).length ) {
		return [];
	}
	return Object.keys( draft ).flatMap( ( w ) => {
		const c = { ...inertContextAt( siblings, null, w ), parentDisplay: contextAt( w ).parentDisplay };
		const { applies, code } = appliesIn( prop, c );
		return false === applies ? [ { width: Number( w ), detail: `at ${ w }: ${ prop } applies to ${ code } and the element is display ${ c.display ?? 'unknown' }${ c.position ? `, position ${ c.position }` : '' } with parent display ${ c.parentDisplay ?? 'unknown' }, so it paints nothing there` } ] : [];
	} );
}

function resolveOne( ctx ) {
	const { node, owned: given = OWNED.get( node ) ?? null, block, prop, draft: stated, baseline, slots, calibration, db, snapshot, log, fontPx = {}, siblings = {}, fluid = null, state = null, paintState = null, declared = {}, declaredFluid = null, contextAt = () => ( {} ), drawnAt = null, rest } = ctx;
	// The skeleton's content selectors (Site Info's displayType) stay as written: a look never changes which parts a block renders.
	const selectors = contentSelectors( { db, block, attributes: node.attributes, calibration } );
	const owned = Object.keys( selectors ).length ? { ...selectors, ...( given || {} ) } : given;
	const contextOf = ( w ) => ( { position: siblings.position?.[ w ], direction: siblings.direction?.[ w ], ...contextAt( w ) } );
	const known = knownPaths( calibration ).map( LOOSE );
	// A value on a property that does not apply to the element at a width (a grid template on a flex box, `flex-grow` on a block
	// child) paints nothing there: lib/css-equivalence/inert.mjs::appliesIn decides it from the element's own display and
	// position and its parent's display, and an undecided case stays written. A state's value and a painted layer are judged
	// where they are read, not by the resting element.
	let draft = stated;
	const gone = inapplicableAt( { prop, draft: stated, siblings, state, paintState, contextAt } );
	if ( gone.length ) {
		if ( gone.length === Object.keys( draft ).length ) {
			return { status: 'equal', slot: slots[ 0 ], inapplicable: gone };
		}
		draft = Object.fromEntries( Object.entries( draft ).filter( ( [ w ] ) => ! gone.some( ( g ) => String( g.width ) === w ) ) );
	}
	let firstGap = null;
	for ( const slot of slots ) {
		// The baseline's own context is calibration's where the baseline is the calibrated default paint.
		const baselineContext = ( w ) => ( undefined !== baseline( slot, w ) && baseline( slot, w ) === defaultPaint( calibration, slot, w, prop ) ? calibratedContext( calibration, slot, w ) : null );
		const included = tiersDiffering( prop, draft, ( w ) => baseline( slot, w ), ( w ) => defaultPaint( calibration, slot, w, prop ), contextOf, baselineContext );
		if ( ! Object.keys( included ).length ) {
			// An inherited property that equals the draft on this element still reaches the elements below it, and a part of the block
			// that paints its own value of it (an icon shape's colour) breaks that inheritance: the draft's value is then asked of
			// the next slot, and only where no slot differs is the property equal.
			if ( INHERITED.includes( prop ) && slots.slice( slots.indexOf( slot ) + 1 ).some( ( next ) => Object.keys( tiersDiffering( prop, draft, ( w ) => baseline( next, w ), ( w ) => defaultPaint( calibration, next, w, prop ), contextOf, () => null ) ).length ) ) {
				continue;
			}
			return { status: 'equal', slot };
		}
		if ( calibration && ! known.includes( LOOSE( slot ) ) ) {
			firstGap ??= { gap: 'unmapped-element', detail: `${ block } path "${ slot }" is not a calibrated element`, slot };
			continue;
		}
		// Only the call whose writes are kept logs its token snaps.
		const sink = [];
		const call = ( perWidth ) => {
			sink.length = 0;
			const declaredForm = Object.fromEntries( Object.keys( perWidth ).filter( ( w ) => undefined !== declared[ w ] ).map( ( w ) => [ w, declared[ w ] ] ) );
			return resolve( { block, slot, anyIndex: false, tag: null, prop, state, perWidth, fontPx, current: node.attributes || {}, variants: node.drawnVariants || [], ...( owned ? { owned } : {} ), siblings, ...( drawnAt ? { drawnAt } : {} ), declaredForm, ...( rest ? { rest } : {} ), ...( paintState ? { paintState } : {} ), ...( declaredFluid ? { declared: declaredFluid } : {} ) }, { db, snapshot, calibration, log: sink } );
		};
		let r = call( included );
		const split = 'no-setting' === r.gap ? byMode( { calibration, included, draft, call, sink, log, slot } ) : null;
		if ( split ) {
			return split;
		}
		if ( r.gap ) {
			firstGap ??= { ...r, slot };
			if ( [ 'no-setting', 'unmapped-element' ].includes( r.gap ) ) {
				continue;
			}
			return { status: 'gap', ...firstGap };
		}
		let how = 'tiers';
		if ( untiered( r.writes ) ) {
			// One value for every width: the draft must hold it at every tier, not only where it differs.
			const every = Object.fromEntries( TIER_WIDTHS.filter( ( w ) => undefined !== draft[ w ] ).map( ( w ) => [ w, draft[ w ] ] ) );
			r = call( every );
			// A one-value setting of one mode cannot hold the widths the node draws in another: resolved per mode.
			const perMode = 'no-setting' === r.gap ? byMode( { calibration, included: every, draft, call, sink, log, slot } ) : null;
			if ( perMode ) {
				return perMode;
			}
			if ( r.gap ) {
				return { status: 'gap', ...r, slot };
			}
			how = 'single';
		}
		log.push( ...sink );
		let writes = r.writes;
		let fit = null;
		// A fluid value the draft's code declares (one clamp(), min() or max() at every width) is written whole when the setting
		// takes it (lib/resolve.mjs, FR-48-1 row 8): it is held as that one value, never refitted from the rendered samples.
		if ( r.fluid?.accepted ) {
			return { status: 'written', slot, writes, included, how: 'declared-fluid', fluid: { clamp: r.fluid.declared, accepted: true, declared: true } };
		}
		if ( fluid && LENGTH_PROPS.includes( prop ) && ( fit = fitFluid( fluid ) ) ) {
			const ok = clampOk( calibration, writes );
			fit = { ...fit, accepted: ok };
			if ( ok ) {
				writes = applyClamp( writes, fit.clamp, splitProperty( prop ).side );
				how = 'clamp';
			}
		}
		return { status: 'written', slot, writes, included, how, ...( fit ? { fluid: fit } : {} ) };
	}
	return { status: 'gap', ...firstGap };
}
