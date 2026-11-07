// The site reveal default as the applier reads it (Spec 38A §8.1, FR-38A-64): a block stores an entrance only where it differs
// from `settings.custom.entrance.reveal`. The renderer (includes/motion/class-sgs-motion-reveal-default.php) owns which blocks
// a rule reaches; this file owns the value comparison only: whether an entrance layer is what a rule would produce, and what the
// applier does about it. The reach is proven on the live page, not decided here: a removal carries checks (a `me` check and the
// delay) that the applier's re-read judges, and a removal the page does not keep is put back.
import { clientTokens } from './motion-tokens.mjs';

const ALLOWED = new Set( [ 'from', 'to', 'duration', 'delay', 'easing', 'start' ] );
// What an entrance's `to` side holds when it rests: the default's rules store no `to`, so each of these is the rule's own end.
const REST = { opacity: 1, translateX: 0, translateY: 0, scale: 1, blur: 0, rotate: 0 };

const tokenOf = ( v, tokens ) => ( 'string' === typeof v && v.startsWith( 'token:' ) ? tokens[ v.slice( 6 ) ] : v );
const number = ( v ) => ( 'number' === typeof v ? v : /^\s*-?[\d.]+\s*(px)?\s*$/.test( String( v ) ) ? parseFloat( v ) : null );
const ms = ( v ) => {
	if ( 'number' === typeof v ) {
		return v;
	}
	const m = /^\s*([\d.]+)\s*(ms|s)\s*$/.exec( String( v ?? '' ) );
	return m ? ( 's' === m[ 2 ] ? parseFloat( m[ 1 ] ) * 1000 : parseFloat( m[ 1 ] ) ) : null;
};
const curve = ( v ) => ( 'string' === typeof v ? v.replace( /\s+/g, '' ).replace( /(^|[(,])0\./g, '$1.' ) : null );

// A rule's `from` the way an entrance stores it: a `filter: blur(Npx)` is `blur`.
function ruleFrom( from ) {
	const out = {};
	for ( const [ k, v ] of Object.entries( from || {} ) ) {
		if ( 'filter' === k ) {
			const m = /^\s*blur\(\s*(-?[\d.]+)\s*(?:px)?\s*\)\s*$/.exec( String( v ) );
			m && ( out.blur = parseFloat( m[ 1 ] ) );
		} else {
			out[ k ] = number( v ) ?? v;
		}
	}
	return out;
}

// The delays the rules give an `item`: index times step, capped, restarting after `every` items.
function staggerDelays( t ) {
	const step = Number( t.staggerStep );
	if ( ! ( step > 0 ) ) {
		return new Set( [ 0 ] );
	}
	const every = Number( t.staggerEvery ) > 0 ? Number( t.staggerEvery ) : 64;
	const cap = Number.isFinite( Number( t.staggerCap ) ) && null !== t.staggerCap && undefined !== t.staggerCap ? Number( t.staggerCap ) : Infinity;
	return new Set( Array.from( { length: every }, ( _, i ) => Math.min( i * step, cap ) ) );
}

// The name of the rule whose entrance `layer` is (values, timing, start line and delay), or null: no default, or a layer that
// differs in any value, carries a device override or another trigger, or holds a key the rules never write.
const FROM_VAR = { translateY: '--sgs-me-from-ty', scale: '--sgs-me-from-s', blur: '--sgs-me-from-blur', opacity: '--sgs-me-from-op' };

// The custom properties an entrance's values print on its element (lib/apply-family-motion.mjs reads them for the proofs below).
export const ENTRANCE_PROPS = [ '--sgs-me-delay', '--sgs-me-dur', ...Object.values( FROM_VAR ) ];

export function defaultRule( layer, rawSnapshot ) {
	const entrance = rawSnapshot?.settings?.custom?.entrance;
	const reveal = entrance?.reveal;
	if ( ! layer || ! reveal || 'object' !== typeof reveal || 'scroll' !== layer.trigger || layer.devices || layer.state || layer.off ) {
		return null;
	}
	const values = layer.values || {};
	if ( Object.keys( values ).some( ( k ) => ! ALLOWED.has( k ) ) ) {
		return null;
	}
	const tokens = clientTokens( rawSnapshot );
	const resolve = ( o ) => Object.fromEntries( Object.entries( o || {} ).map( ( [ k, v ] ) => [ k, number( tokenOf( v, tokens ) ) ?? tokenOf( v, tokens ) ] ) );
	const to = resolve( values.to );
	if ( Object.entries( to ).some( ( [ k, v ] ) => REST[ k ] !== v ) ) {
		return null;
	}
	const from = resolve( values.from );
	const delay = values.delay ?? 0;
	for ( const [ name, rule ] of Object.entries( reveal ) ) {
		const want = ruleFrom( rule?.from );
		const time = ms( rule?.duration ?? entrance.duration );
		const ease = curve( rule?.easing ?? entrance.easing );
		const start = Number.isFinite( Number( entrance.start ) ) && null !== entrance.start && undefined !== entrance.start ? Number( entrance.start ) : null;
		const delays = 'item' === name ? staggerDelays( entrance ) : new Set( [ 0 ] );
		const sameFrom = JSON.stringify( Object.entries( want ).sort() ) === JSON.stringify( Object.entries( from ).sort() );
		if ( sameFrom && null !== time && ms( tokenOf( values.duration, tokens ) ) === time && ease && curve( tokenOf( values.easing, tokens ) ) === ease && ( values.start ?? null ) === start && delays.has( Number( delay ) ) ) {
			return name;
		}
	}
	return null;
}

// What the draft's layer prints on the element: { '--sgs-me-delay': ms, '--sgs-me-dur': ms, '--sgs-me-from-ty': n, ... }, tokens resolved.
export function layerWants( layer, rawSnapshot ) {
	const tokens = clientTokens( rawSnapshot );
	const at = ( v ) => { const r = tokenOf( v, tokens ); return number( r ) ?? ms( r ); };
	const wants = { '--sgs-me-delay': ms( layer.values?.delay ?? 0 ), '--sgs-me-dur': ms( tokenOf( layer.values?.duration, tokens ) ) };
	for ( const [ k, prop ] of Object.entries( FROM_VAR ) ) {
		layer.values?.from && k in layer.values.from && ( wants[ prop ] = at( layer.values.from[ k ] ) );
	}
	return wants;
}

// The numeric value of a re-read custom property: a time in ms, a length in px or a bare number; null when empty.
export function numeric( got ) {
	const t = ms( got );
	return null !== t ? t : number( got );
}

const near = ( a, b ) => null !== a && null !== b && undefined !== b && Math.abs( a - b ) < 0.01;

// FR-38A-64 for one element's root entrance. The rule is picked by value here and by structure in the renderer (heading, then
// the outermost grid's items), so a value match proves nothing about reach: only a read of the live page does. Returns true
// when it handled the element, false when the normal write goes on.
//  - A stored entrance the draft's default-equal layer replaces is removed with checks on the page it leaves: the entrance is
//    still there and its delay, duration and from-values are the draft layer's. A failed or missing re-read puts it back
//    (`needsProof`). It is removed only where the live read shows the element's own entrance values now, so the read works.
//  - With nothing stored, the entrance is equal only where the live page already shows the draft layer's values; any other
//    reading (different values, or none) goes on to the normal write.
export function reconcileDefault( { el, layer, rawSnapshot, live, items, whys, checks } ) {
	const rule = defaultRule( layer, rawSnapshot );
	const facts = live?.[ 1440 ];
	const readable = !! facts?.data?.includes( 'data-sgs-me' ) && '' !== String( facts?.styles?.[ '--sgs-me-dur' ] ?? '' ).trim();
	if ( ! rule || ! readable ) {
		return false;
	}
	const wants = layerWants( layer, rawSnapshot );
	const held = el.entrance?.base;
	if ( ! held ) {
		const shown = Object.entries( wants ).every( ( [ prop, want ] ) => near( numeric( facts.styles[ prop ] ) ?? ( '--sgs-me-delay' === prop ? 0 : null ), want ) );
		shown && items.push( { status: 'equal', prop: 'root entrance', why: `the site default's ${ rule } rule gives the draft entrance (read on the live page)` } );
		return shown;
	}
	delete el.entrance.base;
	Object.keys( el.entrance ).length || delete el.entrance;
	whys.push( `entrance removed: it is the site default's ${ rule } rule` );
	checks.push( { width: 1440, me: true } );
	for ( const [ prop, want ] of Object.entries( wants ) ) {
		null !== want && undefined !== want && checks.push( { width: 1440, prop, want, num: true } );
	}
	return true;
}
