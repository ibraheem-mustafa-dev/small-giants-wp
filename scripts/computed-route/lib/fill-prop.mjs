// One property of one element, from the draft's measured values to the setting writes (FR-47-4 step 2). Every write
// comes from lib/resolve.mjs::resolve (R-47-3); this module decides only which tiers differ from what the node already
// shows (R-47-5), tries the slots a setting could paint, and turns a fluid size into a clamp() where the setting takes one.
import { resolve, splitProperty, LOOSE } from './resolve.mjs';
import { sameValue } from '../../parity/lib/compare.mjs';
import { fitFluid, acceptsClamp, applyClamp, LENGTH_PROPS } from './fill-values.mjs';
import { INHERITED } from './calibrate-props.mjs';

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

// The tiers whose draft value differs from what the node shows there: its baseline, or the value written at a wider
// tier (an empty tier shows it). baseline( width ) is the node's value with nothing written. Returns { width: value }.
export function tiersDiffering( prop, draft, baseline ) {
	const out = {};
	let carried = null;
	for ( const w of TIER_WIDTHS ) {
		if ( undefined === draft[ w ] ) {
			continue;
		}
		if ( ! sameValue( prop, canon( prop, draft[ w ] ), canon( prop, null === carried ? baseline( w ) : carried ), PX_TOL ) ) {
			out[ w ] = draft[ w ];
			carried = draft[ w ];
		}
	}
	return out;
}

// A setting holding one value for every width: its writes are no tier object and no Tablet or Mobile sibling.
const untiered = ( writes ) => writes.every( ( w ) => ! ( isObj( w.value ) && TIER_KEYS.some( ( t ) => t in w.value ) ) && ! /(Tablet|Mobile)$/.test( w.attr ) );

const clampOk = ( cal, writes ) => writes.length > 0 && writes.every( ( w ) => acceptsClamp( cal, w.attr ) || acceptsClamp( cal, w.attr.replace( /(Tablet|Mobile)$/, '' ) ) );

// ctx: { node, block, prop, draft ({ width: value }), baseline( slot, width ), slots (the slot first, then other slots a
// setting for a carried property could paint), calibration, db, snapshot, log, fontPx, siblings, fluid ({ width: value }
// at the five fluid widths, or null) }.
// Returns { status: 'equal' | 'written' | 'gap', slot, writes?, included?, how?: 'tiers' | 'single' | 'clamp', fluid?, gap?, detail? }.
// 'equal': the draft matches what the node shows at every tier, nothing to write.
export function resolveProperty( ctx ) {
	const { node, block, prop, draft, baseline, slots, calibration, db, snapshot, log, fontPx = {}, siblings = {}, fluid = null } = ctx;
	const known = knownPaths( calibration ).map( LOOSE );
	let firstGap = null;
	for ( const slot of slots ) {
		const included = tiersDiffering( prop, draft, ( w ) => baseline( slot, w ) );
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
			return resolve( { block, slot, anyIndex: false, tag: null, prop, state: null, perWidth, fontPx, current: node.attributes || {}, siblings }, { db, snapshot, calibration, log: sink } );
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
