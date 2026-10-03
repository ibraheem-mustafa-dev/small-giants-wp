// Block calibration library (FR-47-2, R-47-6). Builds one calibration tree per block (a default instance plus one
// marked instance per setting and marker), reads every rendered element of each instance in a browser, and works out
// which element and property each setting paints (the slot map) and each element's default paint.
// Only settings painting a property the walker measures are calibrated: those are the only ones Solve can be asked for.
import { DEFAULT_PROPS, HOVER_PROPS } from '../../parity/lib/collect.mjs';
import { REF_PROPS, elementPath } from '../../parity/lib/ref-trace.mjs';
import { splitProperty } from './resolve.mjs';

export const WIDTHS = [ 375, 768, 1440 ];
export const MARKER_HEX = '#13579b';
export const MARKER_RGB = 'rgb(19, 87, 155)';
export const CAL_PREFIX = 'cr-ref-cal-';
export const READ_PROPS = [ ...new Set( [ ...DEFAULT_PROPS.filter( ( p ) => ! /^icon-/.test( p ) ), ...REF_PROPS, ...HOVER_PROPS ] ) ];
// Inherited properties are never default paint (R-47-5 compares them with the parent's live value instead).
// How each setting state is reached before a marker is read (§3.2): 'hover' under a real mouse; 'scroll' by scrolling
// the window past the header offset (the header script toggles is-header-scrolled on every site header); 'fixture'
// when the fixture renders the state at rest (an accordion item saved open, the first tab, the last breadcrumb, a nav
// item linking to the page itself). A state with no entry has no trigger: its settings are reported, never calibrated.
export const STATE_TRIGGERS = { hover: 'hover', scrolled: 'scroll', open: 'fixture', current: 'fixture' };
export const SCROLL_Y = 600;

// The trigger for a setting state (null = rest), or undefined when the state has none.
export const triggerFor = ( state ) => ( state ? STATE_TRIGGERS[ state ] : null );

export const INHERITED = [ 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-wrap', 'text-shadow' ];

const TIER_PX = { desktop: 37, tablet: 23, mobile: 7 };
const WIDTH_TIER = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
const BOX = { desktop: [ 11, 13, 17, 19 ], tablet: [ 21, 23, 25, 27 ], mobile: [ 3, 5, 7, 9 ] };
const SIDES = [ 'top', 'right', 'bottom', 'left' ];

// The longhand properties a setting's css_property covers, as the walker reads them.
export function longhands( cssProperty ) {
	return [ ...new Set( cssProperty.split( ',' ).map( ( s ) => s.trim() ).flatMap( ( p ) => {
		if ( /^(padding|margin)$/.test( p ) ) {
			return SIDES.map( ( s ) => `${ p }-${ s }` );
		}
		const m = p.match( /^border-(width|color|style)$/ );
		if ( m ) {
			return SIDES.map( ( s ) => `border-${ s }-${ m[ 1 ] }` );
		}
		if ( 'gap' === p ) {
			return [ 'row-gap', 'column-gap', 'gap' ];
		}
		if ( 'text-decoration' === p ) {
			return [ 'text-decoration-line' ];
		}
		return [ p ];
	} ) ) ].filter( ( p ) => READ_PROPS.includes( p ) );
}

// Markers for free-text settings that take a CSS keyword or value (no enum in block.json).
const KEYWORDS = {
	'text-transform': [ 'uppercase', 'lowercase', 'capitalize' ],
	'text-wrap': [ 'balance', 'pretty', 'nowrap' ],
	'font-family': [ 'Georgia, serif' ],
	'font-style': [ 'italic' ],
	'text-decoration': [ 'underline' ],
	'box-shadow': [ '0 0 0 3px #13579b' ],
	'text-align': [ 'center', 'right' ],
};

const isColour = ( p ) => /(^|-)color$/.test( p ) || 'background-color' === p;
const types = ( def ) => [].concat( def?.type || [] );

// The markers for one setting (§3.2 table). Each: { label, attrs, expect: { width: value } | null, form? }.
// expect is the value the slot should compute at each width when the setting works; null means "any change".
export function markersFor( row, schema, snapshot, current = {} ) {
	const def = schema[ row.attr_name ] || {};
	const prop = row.css_property.split( ',' )[ 0 ].trim();
	const unitAttr = schema[ `${ row.attr_name }Unit` ] ? `${ row.attr_name }Unit` : null;
	const withUnit = ( attrs ) => ( unitAttr ? { ...attrs, [ unitAttr ]: 'px' } : attrs );
	// A number when the setting is numeric; a string ("37" beside a unit setting, else "37px") when it is a string.
	const lengthIn = ( n ) => {
		if ( types( def ).includes( 'number' ) || ( unitAttr && ! types( def ).includes( 'string' ) ) ) {
			return n;
		}
		return unitAttr ? String( n ) : `${ n }px`;
	};
	const all = ( v ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, v ] ) );
	if ( isColour( prop ) ) {
		// The palette colour furthest from both black and white, so it differs from any default text or ground.
		const mid = ( c ) => Math.min( c.r + c.g + c.b, 765 - ( c.r + c.g + c.b ) ) + ( Math.max( c.r, c.g, c.b ) - Math.min( c.r, c.g, c.b ) );
		const slugTok = snapshot.palette.filter( ( t ) => t.slug !== current[ row.attr_name ] && 1 === t.colour.a ).sort( ( a, b ) => mid( b.colour ) - mid( a.colour ) )[ 0 ];
		const out = [ { label: 'hex', form: 'hex', attrs: { [ row.attr_name ]: MARKER_HEX }, expect: all( MARKER_RGB ) } ];
		if ( slugTok ) {
			const c = slugTok.colour;
			out.push( { label: 'slug', form: 'slug', attrs: { [ row.attr_name ]: slugTok.slug }, expect: all( `rgb(${ c.r }, ${ c.g }, ${ c.b })` ) } );
		}
		return out;
	}
	if ( ! Array.isArray( def.enum ) && KEYWORDS[ prop ] && types( def ).includes( 'string' ) ) {
		return KEYWORDS[ prop ].map( ( v ) => ( { label: `kw-${ v.replace( /[^a-z0-9]+/gi, '-' ) }`, attrs: { [ row.attr_name ]: v }, expect: null } ) );
	}
	if ( Array.isArray( def.enum ) ) {
		return def.enum.filter( ( v ) => '' !== v && v !== def.default ).map( ( v ) => ( { label: `enum-${ v }`, attrs: { [ row.attr_name ]: v }, expect: null } ) );
	}
	if ( types( def ).includes( 'boolean' ) ) {
		return [ { label: 'bool', attrs: { [ row.attr_name ]: ! def.default }, expect: null } ];
	}
	const box = !! row.box_family || 'box_only' === row.tier_shape;
	const boxOf = ( t ) => Object.fromEntries( SIDES.map( ( s, i ) => [ s, `${ BOX[ t ][ i ] }px` ] ) );
	if ( 'tier_object' === row.tier_shape ) {
		if ( box ) {
			return [ { label: 'box-tiers', attrs: { [ row.attr_name ]: { desktop: boxOf( 'desktop' ), tablet: boxOf( 'tablet' ), mobile: boxOf( 'mobile' ) } }, expect: null, box: true } ];
		}
		if ( 'line-height' === prop ) {
			return [ { label: 'tiers', attrs: withUnit( { [ row.attr_name ]: { desktop: lengthIn( 37 ), tablet: lengthIn( 23 ), mobile: lengthIn( 7 ) } } ), expect: { 1440: '37px', 768: '23px', 375: '7px' } } ];
		}
		return [ { label: 'tiers', attrs: withUnit( { [ row.attr_name ]: { desktop: lengthIn( 37 ), tablet: lengthIn( 23 ), mobile: lengthIn( 7 ) } } ), expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, `${ TIER_PX[ WIDTH_TIER[ w ] ] }px` ] ) ) } ];
	}
	if ( box ) {
		return [ { label: 'box', attrs: { [ row.attr_name ]: boxOf( 'desktop' ) }, expect: null, box: true } ];
	}
	if ( 'font-weight' === prop ) {
		const w = '700' === String( def.default ) ? '300' : '700';
		return [ { label: 'weight', attrs: { [ row.attr_name ]: w }, expect: all( w ) } ];
	}
	if ( 'opacity' === prop ) {
		return [ { label: 'number', attrs: { [ row.attr_name ]: types( def ).includes( 'string' ) ? '0.37' : 0.37 }, expect: all( '0.37' ) } ];
	}
	if ( types( def ).some( ( t ) => [ 'number', 'string', 'integer' ].includes( t ) ) && /width|height|gap|size|radius|indent/.test( prop ) ) {
		return [ { label: 'length', attrs: withUnit( { [ row.attr_name ]: lengthIn( 37 ) } ), expect: all( '37px' ) } ];
	}
	return [];
}

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

// In-page: every element of each instance (the root and up to 80 descendants), its path from the instance root and
// the read properties. Self-contained; pathSrc is elementPath's source.
export function readInstancesInPage( [ count, prefix, props, pathSrc ] ) {
	// eslint-disable-next-line no-new-func
	const pathOf = new Function( `return (${ pathSrc });` )();
	const out = [];
	for ( let n = 0; n < count; n++ ) {
		const root = document.querySelector( `.${ prefix }${ n }` );
		if ( ! root ) {
			out.push( null );
			continue;
		}
		const els = {};
		for ( const el of [ root, ...root.querySelectorAll( '*' ) ].slice( 0, 81 ) ) {
			const cs = getComputedStyle( el );
			const key = pathOf( el, root );
			if ( key in els ) {
				continue;
			}
			els[ key ] = Object.fromEntries( props.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
		}
		out.push( els );
	}
	return out;
}

export { elementPath };

const sameVal = ( a, b ) => String( a ).replace( /\s+/g, '' ) === String( b ).replace( /\s+/g, '' );

// Works out one setting's slot from the default and marked readings ({ width: { path: { prop: value } } }).
// Returns { slot, slots, property, transform, reachedAt, oneWidth, effects } or { dead }.
// slots: every element the marker reaches (a non-inherited property can land on the root and an inner element alike;
// an inherited one only counts where it is set, the shallowest). effects: other properties the marker changed on those
// elements ("path|prop"), the side effects Solve's regression guard matches regressions against.
export function slotFor( row, marker, defReads, markReads ) {
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
	return { slot: best.path, slots, property: splitProperty( best.prop ).short, transform, reachedAt, oneWidth: 'tier_object' === row.tier_shape && reachedAt.length < WIDTHS.length, effects };
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
