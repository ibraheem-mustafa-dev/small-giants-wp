// One property of one element, from the draft's measured values to the setting writes (FR-47-4 step 2). Every write
// comes from lib/resolve.mjs::resolve (R-47-3); this module decides only which tiers differ from what the node already
// shows (R-47-5), tries the slots a setting could paint, and turns a fluid size into a clamp() where the setting takes one.
import { resolve, splitProperty, LOOSE } from './resolve.mjs';
import { samePaint, paintCanon, PX_TOL } from './css-equivalence/tolerance.mjs';
import { fitFluid, acceptsClamp, applyClamp, LENGTH_PROPS } from './fill-values.mjs';
import { INHERITED } from './calibrate-props.mjs';
import { paintedAt, TIER_OF } from './fill-held.mjs';
import { initialOf } from './css-families.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it):
// the CSS groups whose declared values a draft header's Fill run wrote and confirmed.
export const COVERAGE_WRITES = [
	'block-setting:behaviour:styling',
	'block-setting:color:styling',
	'block-setting:colour-gradient:styling',
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
// declared read failed. styles: the element's collected styles; snap: the element's whole reading at this width, where
// the caller has it (a gap is judged from it).
export function notPainted( prop, styles, snap = null, declared = null ) {
	if ( GAP_PROPS.includes( prop ) ) {
		return null !== gapPaintsNothing( prop, styles, snap );
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
		return null !== declared && undefined === declared[ 'transition-duration' ] && /^\s*0(\.0+)?m?s(\s*,\s*0(\.0+)?m?s)*\s*$/.test( styles[ prop ] );
	}
	return /^transition-(delay|timing-function)$/.test( prop ) && zero( styles[ 'transition-duration' ] );
}

const GAP_PROPS = [ 'gap', 'row-gap', 'column-gap' ];
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

// The context calibration read an element's default paint in at a width (lib/calibrate-read.mjs::readInstancesInPage:
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

// A baseline value in the context it was read in, as the value an unstyled element holds: where it is what the
// property's initial value computes to there and not that value itself (a `min-height` of 0px read off a flex or grid
// item, the computed form of `auto` there), it is the initial value, which the comparison then canons in the draft's
// context. A value the block's stylesheet sets (the context's `own` names the property: a declared `min-height: 0`
// reads 0px off a flex item too) is that value, as is any other value or a baseline with no context of its own.
export function inOwnContext( prop, v, ctx ) {
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
// own fallback (its baseline), so a 10px desktop gap over a block whose mobile default is 8px writes the mobile tier too.
// A property calibration did not measure at every tier width gives no evidence of a fallback, so there the wider value
// carries down. baseline( width ) is the node's value with nothing written; defaultAt( width ) the block's calibrated
// default paint of the property (the baseline when not given); contextAt( width ) the element's context there for canon()
// ({ parentDisplay, position, direction }); baselineContextAt( width ) the context the baseline was read in, or null where
// it is the draft's. Each side is canoned in its own context (inOwnContext), then compared in the draft's by the shared
// rule (lib/css-equivalence/tolerance.mjs::samePaint). Returns { width: value }.
export function tiersDiffering( prop, draft, baseline, defaultAt = baseline, contextAt = () => ( {} ), baselineContextAt = () => null ) {
	const out = {};
	const fallbackAt = TIER_WIDTHS.every( ( w ) => undefined !== defaultAt( w ) ) ? defaultAt : () => '0px';
	for ( const w of TIER_WIDTHS ) {
		if ( undefined === draft[ w ] ) {
			continue;
		}
		const painted = paintedAt( { after: Object.fromEntries( Object.entries( out ).map( ( [ x, v ] ) => [ TIER_OF[ x ], v ] ) ) }, w, prop, fallbackAt );
		const shown = painted ? painted.value : inOwnContext( prop, baseline( w ), baselineContextAt( w ) );
		if ( ! samePaint( prop, draft[ w ], shown, contextAt( w ) ) ) {
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

const clampOk = ( cal, writes ) => writes.length > 0 && writes.every( ( w ) => acceptsClamp( cal, w.attr ) || acceptsClamp( cal, w.attr.replace( /(Tablet|Mobile)$/, '' ) ) );

// ctx: { node, owned ({ attr: value }: the settings a content writer decided for the node, which no answer changes;
// default: what OWNED holds for the node), block, prop, draft ({ width: value }), baseline( slot, width ), slots (the slot first, then other slots a
// setting for a carried property could paint), calibration, db, snapshot, log, fontPx, siblings, fluid ({ width: value }
// at the five fluid widths, or null), state (a setting state, block_attributes.css_state; null for the resting look),
// declared ({ width: value }: the code's value where it agrees with the draft value, written in its place, FR-48-36),
// contextAt ( width => { parentDisplay }: the element's parent's display, where the caller reads it; the element's own
// position and direction come from `siblings`) }.
// Returns { status: 'equal' | 'written' | 'gap', slot, writes?, included?, how?: 'tiers' | 'single' | 'clamp', fluid?, gap?, detail? }.
// 'equal': the draft matches what the node shows at every tier, nothing to write.
export function resolveProperty( ctx ) {
	const { node, owned = OWNED.get( node ) ?? null, block, prop, draft, baseline, slots, calibration, db, snapshot, log, media = null, fontPx = {}, siblings = {}, fluid = null, state = null, declared = {}, declaredFluid = null, contextAt = () => ( {} ), rest } = ctx;
	const contextOf = ( w ) => ( { position: siblings.position?.[ w ], direction: siblings.direction?.[ w ], ...contextAt( w ) } );
	const known = knownPaths( calibration ).map( LOOSE );
	let firstGap = null;
	// The first slot where the draft already matches: a property can be inert there (flex-wrap on a block root) while the
	// slot where it paints (the inner content band) still differs, so every other candidate slot is judged before the
	// property is called equal.
	let equalAt = null;
	for ( const slot of slots ) {
		// The baseline's own context is calibration's where the baseline is the calibrated default paint.
		const baselineContext = ( w ) => ( undefined !== baseline( slot, w ) && baseline( slot, w ) === defaultPaint( calibration, slot, w, prop ) ? calibratedContext( calibration, slot, w ) : null );
		// After a slot that matched, a later slot is judged only at the widths its baseline is known: an unmeasured slot is not
		// evidence that the draft differs there.
		const judged = null === equalAt ? draft : Object.fromEntries( Object.entries( draft ).filter( ( [ w ] ) => undefined !== baseline( slot, Number( w ) ) ) );
		const included = tiersDiffering( prop, judged, ( w ) => baseline( slot, w ), ( w ) => defaultPaint( calibration, slot, w, prop ), contextOf, baselineContext );
		if ( ! Object.keys( included ).length ) {
			equalAt ??= slot;
			continue;
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
			return resolve( { block, slot, anyIndex: false, tag: null, prop, state, perWidth, fontPx, current: node.attributes || {}, ...( owned ? { owned } : {} ), siblings, declaredForm, ...( rest ? { rest } : {} ), ...( declaredFluid ? { declared: declaredFluid } : {} ) }, { db, snapshot, calibration, log: sink, media } );
		};
		let r = call( included );
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
			r = call( Object.fromEntries( TIER_WIDTHS.filter( ( w ) => undefined !== draft[ w ] ).map( ( w ) => [ w, draft[ w ] ] ) ) );
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
	return null !== equalAt ? { status: 'equal', slot: equalAt } : { status: 'gap', ...firstGap };
}
