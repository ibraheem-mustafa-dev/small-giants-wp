// A css-animation record whose declaration is bound to script values (`animation:{{ tickerAnim }}`, Spec 48 FR-48-25):
// the template text names a binding, not an animation, so the record is filled from what the element renders at each
// read width (the animation longhands lib/intake-inventory-sample.mjs::sampleWriters reads). The record's source keeps
// the declared text; its name, animation-name, timing, iterations and keyframe properties become the rendered
// animation's, and its trigger states the rendered value at every read width (a media query where it runs at some
// widths only, its `breakpoints` those devices). A binding that renders no animation at any read width is a no-op.
import { parseAnimation } from './intake-inventory-css.mjs';

const DEVICE = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };

// The rendered animation at one width from a sample's values ({ prop: { inline, computed } }) as one shorthand text
// ("marquee 30s linear infinite"), or 'none'. Only the first animation of a list is kept, as the template record keeps the first.
export function renderedAnimation( values ) {
	const at = ( p ) => String( values?.[ p ]?.computed ?? '' ).split( ',' )[ 0 ].trim();
	const name = at( 'animation-name' );
	if ( ! name || 'none' === name ) {
		return 'none';
	}
	// A longhand at its initial value is left out (a fill-mode `none` would read as the name).
	const initial = { 'animation-delay': '0s', 'animation-iteration-count': '1', 'animation-direction': 'normal', 'animation-fill-mode': 'none' };
	const rest = [ 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode' ].map( ( p ) => ( initial[ p ] === at( p ) ? '' : at( p ) ) );
	return [ name, ...rest ].filter( Boolean ).join( ' ' );
}

// The record filled from the rendered animation. rec: the K record; bound: the binding names; samples: its samples
// ([ { width, values } ]); keyframesOf( name ) → the animated properties of the @keyframes rule of that name ([] when none).
// Returns the record unchanged when no width was read.
export function resolveBound( rec, bound, samples, keyframesOf = () => [] ) {
	const byWidth = new Map();
	[ ...samples ].sort( ( a, b ) => a.width - b.width ).forEach( ( s ) => byWidth.has( s.width ) || byWidth.set( s.width, renderedAnimation( s.values ) ) );
	if ( ! byWidth.size ) {
		return rec;
	}
	const widths = [ ...byWidth.keys() ];
	const runs = widths.filter( ( w ) => 'none' !== byWidth.get( w ) );
	const bindings = bound.map( ( b ) => `{{ ${ b } }}` ).join( ', ' );
	const said = [ ...new Set( byWidth.values() ) ].map( ( v ) => `"${ v }" at ${ widths.filter( ( w ) => byWidth.get( w ) === v ).join( ', ' ) }px` ).join( '; ' );
	const detail = `the bound value ${ bindings } renders ${ said }`;
	if ( ! runs.length ) {
		return { ...rec, status: 'no-op', notes: [ rec.notes, `${ detail }: no animation runs at any read width` ].filter( Boolean ).join( '; ' ) };
	}
	const a = parseAnimation( byWidth.get( runs[ 0 ] ) )[ 0 ];
	const element = rec.element?.description ?? '';
	const some = runs.length < widths.length;
	const devices = runs.map( ( w ) => DEVICE[ w ] ).filter( Boolean );
	return {
		...rec,
		name: `CSS animation ${ a.name } on ${ element }`,
		trigger: some ? { type: 'media-query', detail } : { type: rec.trigger?.type ?? 'load', detail },
		properties: [ { property: 'animation-name', from: null, to: a.name }, ...keyframesOf( a.name ) ],
		duration_ms: a.duration_ms, delay_ms: a.delay_ms, easing: a.easing, iterations: a.iterations, direction: a.direction, fill: a.fill,
		...( some && devices.length ? { breakpoints: devices } : {} ),
	};
}
