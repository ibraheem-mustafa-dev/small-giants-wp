// One property of one element, from the draft's measured values to the setting writes (FR-47-4 step 2). Every write
// comes from lib/resolve.mjs::resolve (R-47-3); this module decides only which tiers differ from what the node already
// shows (R-47-5), tries the slots a setting could paint, and turns a fluid size into a clamp() where the setting takes one.
import { resolve, splitProperty, LOOSE } from './resolve.mjs';
import { sameValue } from '../../parity/lib/compare.mjs';
import { fitFluid, acceptsClamp, applyClamp, LENGTH_PROPS } from './fill-values.mjs';
import { INHERITED } from './calibrate-props.mjs';
import { paintedAt, TIER_OF } from './fill-held.mjs';

// The clone-coverage IDs this module writes (lib/clone-coverage.mjs::declaredWrites holds each entry's write to it):
// the CSS groups whose declared values a draft header's Fill run wrote and confirmed.
export const COVERAGE_WRITES = [
	'block-setting:behaviour:styling',
	'block-setting:color:styling',
	'block-setting:colour-gradient:styling',
	'block-setting:enum-mode:styling',
	'block-setting:layout:styling',
	'block-setting:number-css-percent:styling',
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
const PX_TOL = 0.5;

const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
const TIER_KEYS = [ 'desktop', 'tablet', 'mobile' ];

// Every path calibration knows for a block (its elements, and the slots and reaches of its settings), as Solve reads them.
export const knownPaths = ( cal ) => [ ...Object.keys( cal?.elements || {} ), ...Object.values( cal?.settings || {} ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] ) ];

// A value as the browser paints it, for comparing: a normal letter or gap spacing is 0, text-align start is left, and an
// auto minimum height is 0 where nothing makes it content-sized.
export function canon( prop, v ) {
	const s = String( v ?? '' ).trim();
	if ( undefined === v || ( 'normal' === s && /^(letter-spacing|word-spacing|.*gap)$/.test( prop ) ) || ( 'auto' === s && 'min-height' === prop ) ) {
		return undefined === v ? v : '0px';
	}
	return 'text-align' === prop && 'start' === s ? 'left' : v;
}

// Whether a property paints nothing on this element at this width: an outline with no style or width, a border side with
// no width, a text decoration with no line, a transition that lasts 0s. Such a value is a computed leftover (currentcolor),
// not a design value. styles: the element's collected styles.
export function notPainted( prop, styles ) {
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
	return /^transition-(delay|timing-function)$/.test( prop ) && zero( styles[ 'transition-duration' ] );
}

// The calibrated default paint of an element at a width (1920 reads as 1440), with a gap of `normal` as the 0 it paints.
export function defaultPaint( cal, slot, width, prop ) {
	const key = Object.keys( cal?.elements || {} ).find( ( k ) => LOOSE( k ) === LOOSE( slot ) );
	const v = undefined !== key ? cal.elements[ key ]?.[ String( 1920 === width ? 1440 : width ) ]?.[ prop ] : undefined;
	return /gap$/.test( prop ) && 'normal' === v ? '0px' : v;
}

// The tiers whose draft value differs from what the node shows there: its baseline, or what the tiers already chosen paint
// there, judged as the held side judges a write (lib/fill-held.mjs::paintedAt): an empty tier shows the nearest wider
// chosen tier only where the block's default paint of the property is the same at both widths, and otherwise the block's
// own fallback (its baseline), so a 10px desktop gap over a block whose mobile default is 8px writes the mobile tier too.
// A property calibration did not measure at every tier width gives no evidence of a fallback, so there the wider value
// carries down. baseline( width ) is the node's value with nothing written; defaultAt( width ) the block's calibrated
// default paint of the property (the baseline when not given). Returns { width: value }.
export function tiersDiffering( prop, draft, baseline, defaultAt = baseline ) {
	const out = {};
	const fallbackAt = TIER_WIDTHS.every( ( w ) => undefined !== defaultAt( w ) ) ? defaultAt : () => '0px';
	for ( const w of TIER_WIDTHS ) {
		if ( undefined === draft[ w ] ) {
			continue;
		}
		const painted = paintedAt( { after: Object.fromEntries( Object.entries( out ).map( ( [ x, v ] ) => [ TIER_OF[ x ], v ] ) ) }, w, prop, fallbackAt );
		if ( ! sameValue( prop, canon( prop, draft[ w ] ), canon( prop, painted ? painted.value : baseline( w ) ), PX_TOL ) ) {
			out[ w ] = draft[ w ];
		}
	}
	return out;
}

// A setting holding one value for every width: its writes are no tier object and no Tablet or Mobile sibling.
const untiered = ( writes ) => writes.every( ( w ) => ! ( isObj( w.value ) && TIER_KEYS.some( ( t ) => t in w.value ) ) && ! /(Tablet|Mobile)$/.test( w.attr ) );

const clampOk = ( cal, writes ) => writes.length > 0 && writes.every( ( w ) => acceptsClamp( cal, w.attr ) || acceptsClamp( cal, w.attr.replace( /(Tablet|Mobile)$/, '' ) ) );

// ctx: { node, block, prop, draft ({ width: value }), baseline( slot, width ), slots (the slot first, then other slots a
// setting for a carried property could paint), calibration, db, snapshot, log, fontPx, siblings, fluid ({ width: value }
// at the five fluid widths, or null), state (a setting state, block_attributes.css_state; null for the resting look),
// declared ({ width: value }: the code's value where it agrees with the draft value, written in its place, FR-48-36) }.
// Returns { status: 'equal' | 'written' | 'gap', slot, writes?, included?, how?: 'tiers' | 'single' | 'clamp', fluid?, gap?, detail? }.
// 'equal': the draft matches what the node shows at every tier, nothing to write.
export function resolveProperty( ctx ) {
	const { node, block, prop, draft, baseline, slots, calibration, db, snapshot, log, fontPx = {}, siblings = {}, fluid = null, state = null, declared = {}, declaredFluid = null } = ctx;
	const known = knownPaths( calibration ).map( LOOSE );
	let firstGap = null;
	for ( const slot of slots ) {
		const included = tiersDiffering( prop, draft, ( w ) => baseline( slot, w ), ( w ) => defaultPaint( calibration, slot, w, prop ) );
		if ( ! Object.keys( included ).length ) {
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
			return resolve( { block, slot, anyIndex: false, tag: null, prop, state, perWidth, fontPx, current: node.attributes || {}, siblings, declaredForm, ...( declaredFluid ? { declared: declaredFluid } : {} ) }, { db, snapshot, calibration, log: sink } );
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
	return { status: 'gap', ...firstGap };
}
