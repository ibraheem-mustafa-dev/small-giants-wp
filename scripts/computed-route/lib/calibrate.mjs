// Block calibration library (FR-47-2, R-47-6). Builds one calibration tree per block (a default instance plus one
// marked instance per setting and marker), and works out from the readings which element and property each setting
// paints (the slot map) and each element's default paint. Markers: lib/calibrate-markers.mjs; instance planning and
// preconditions: lib/calibrate-instances.mjs; the browser reader: lib/calibrate-read.mjs.
import { WIDTHS, INHERITED, CAL_PREFIX, longhands } from './calibrate-props.mjs';
import { splitProperty } from './resolve.mjs';

export { WIDTHS, MARKER_HEX, MARKER_RGB, MARKER_GRADIENT, CAL_PREFIX, READ_PROPS, INHERITED, longhands } from './calibrate-props.mjs';
export { markersFor, companionWidth, borderPartners, KEYWORDS } from './calibrate-markers.mjs';
export { STATE_TRIGGERS, triggerFor, planInstances, preconditionsFor, layoutModes, stateTarget } from './calibrate-instances.mjs';
export { readInstancesInPage, readAll, SCROLL_Y } from './calibrate-read.mjs';
export { elementPath } from '../../parity/lib/ref-trace.mjs';

// One calibration tree for a block: every instance wrapped in an sgs/container (class cr-cal-<block>-<key>), the
// instance itself carrying cr-ref-cal-<n> so its element paths read exactly as the walker's. The fixture gives the
// content, inner blocks and parent chain the block needs.
export function buildTree( block, fixture, instances ) {
	const short = block.replace( /^sgs\//, '' );
	return instances.map( ( inst, n ) => {
		let node = { name: block, attributes: { ...( fixture.attributes || {} ), ...inst.attrs, className: `${ CAL_PREFIX }${ n }` }, innerBlocks: structuredClone( fixture.inner || [] ) };
		for ( const p of [ ...( fixture.parents || [] ) ].reverse() ) {
			node = { name: p.name, attributes: { ...( p.attributes || {} ) }, innerBlocks: [ node ] };
		}
		// fixture.before: blocks placed ahead of the instance in its wrapper, for a block that reads the rest of the page
		// (a table of contents lists the page's headings). Reads stay scoped to the instance's own class.
		return { name: 'sgs/container', attributes: { className: `cr-cal-${ short }-${ inst.key }` }, innerBlocks: [ ...structuredClone( fixture.before || [] ), node ] };
	} );
}

const sameVal = ( a, b ) => String( a ).replace( /\s+/g, '' ) === String( b ).replace( /\s+/g, '' );

// Works out one setting's slot from the default and marked readings ({ width: { path: { prop: value } } }).
// Returns { slot, slots, property, transform, reachedAt, oneWidth, effects } or { dead }. containerQuery: the block's
// tiers follow its container's width (an @container rule), so a tier reached at fewer page widths is expected, not oneWidth.
// slots: every element the marker reaches (a non-inherited property can land on the root and an inner element alike;
// an inherited one only counts where it is set, the shallowest). effects: other properties the marker changed on those
// elements ("path|prop"), the side effects Solve's regression guard matches regressions against.
export function slotFor( row, marker, defReads, markReads, { containerQuery = false } = {} ) {
	const props = longhands( row.css_property );
	const changes = [];
	const side = new Set();
	for ( const w of WIDTHS ) {
		const d = defReads[ w ] || {};
		const m = markReads[ w ] || {};
		for ( const [ p, styles ] of Object.entries( m ) ) {
			for ( const [ prop, v ] of Object.entries( styles ) ) {
				if ( sameVal( v, d[ p ]?.[ prop ] ) ) {
					continue;
				}
				if ( props.includes( prop ) ) {
					changes.push( { w, path: p, prop, value: v, hit: marker.expect ? sameVal( v, marker.expect[ w ] ) : true } );
				} else {
					side.add( `${ p }|${ prop }` );
				}
			}
		}
	}
	if ( ! changes.length ) {
		return { dead: true };
	}
	// The written element: one where the value equals the marker if any, the shallowest such (inherited values repeat lower down).
	const depth = ( p ) => ( '' === p ? 0 : p.split( ' > ' ).length );
	const pool = changes.some( ( c ) => c.hit ) ? changes.filter( ( c ) => c.hit ) : changes;
	const best = pool.reduce( ( a, c ) => ( depth( c.path ) < depth( a.path ) ? c : a ) );
	const inherited = props.every( ( p ) => INHERITED.includes( p ) );
	const slots = inherited ? [ best.path ] : [ ...new Set( pool.map( ( c ) => c.path ) ) ].sort( ( a, b ) => depth( a ) - depth( b ) );
	const at = changes.filter( ( c ) => c.path === best.path && ( ! marker.expect || c.hit ) );
	const reachedAt = [ ...new Set( at.map( ( c ) => c.w ) ) ].sort( ( a, b ) => a - b );
	const transform = marker.expect && ! best.hit ? Object.fromEntries( changes.filter( ( c ) => c.path === best.path ).map( ( c ) => [ c.w, c.value ] ) ) : null;
	const effects = [ ...side ].filter( ( e ) => slots.includes( e.split( '|' )[ 0 ] ) );
	// An inherited property also records every element the marker reached (a link's label inheriting the root's
	// colour); a descendant whose own rule overrides the value never changes, so it is never among them.
	const reaches = inherited ? [ ...new Set( pool.map( ( c ) => c.path ) ) ].sort( ( a, b ) => depth( a ) - depth( b ) ) : null;
	return { slot: best.path, slots, ...( reaches ? { reaches } : {} ), property: splitProperty( best.prop ).short, transform, reachedAt, oneWidth: ! containerQuery && 'tier_object' === row.tier_shape && reachedAt.length < WIDTHS.length, ...( containerQuery && reachedAt.length < WIDTHS.length ? { containerTier: true } : {} ), effects };
}

// What one enum value of a setting with no css_property changes: every read property that differs from the default
// instance, on the shallowest element(s) where it changes. Returns { prop: { slots, value: { width: v } } }.
export function discoverEffects( defReads, markReads ) {
	const found = {};
	const depth = ( p ) => ( '' === p ? 0 : p.split( ' > ' ).length );
	for ( const w of WIDTHS ) {
		const d = defReads[ w ] || {};
		for ( const [ p, styles ] of Object.entries( markReads[ w ] || {} ) ) {
			for ( const [ prop, v ] of Object.entries( styles ) ) {
				if ( [ 'width', 'gap', 'row-gap', 'column-gap' ].includes( prop ) || sameVal( v, d[ p ]?.[ prop ] ) ) {
					continue;
				}
				const f = ( found[ prop ] ??= { slots: [], value: {}, depth: Infinity } );
				if ( depth( p ) < f.depth ) {
					f.depth = depth( p );
					f.slots = [ p ];
					f.value = {};
				}
				if ( depth( p ) === f.depth ) {
					if ( ! f.slots.includes( p ) ) {
						f.slots.push( p );
					}
					f.value[ w ] = v;
				}
			}
		}
	}
	return Object.fromEntries( Object.entries( found ).map( ( [ k, v ] ) => [ k, { slots: v.slots, value: v.value } ] ) );
}

// The default paint of every element at each width, without inherited properties.
export function defaultPaint( defReads ) {
	const out = {};
	for ( const [ w, els ] of Object.entries( defReads ) ) {
		for ( const [ p, styles ] of Object.entries( els || {} ) ) {
			out[ p ] = out[ p ] || {};
			out[ p ][ w ] = Object.fromEntries( Object.entries( styles ).filter( ( [ k ] ) => ! INHERITED.includes( k ) ) );
		}
	}
	return out;
}
