// Token references for Fill's writes (Spec 32 FR-32-29, Spec 48 FR-48-41): a value the draft element states through one of
// the draft's own tokens is written as the reference of that token, so the elements that use one draft token share one
// setting in the clone. The token is traced, never matched by value: the element's declaration at that width
// (`st.reads.declared[ width ][ id ][ prop ]`, the cascade winner as the author wrote it) is a `var(--token)`, an alias
// token's `var()` chain is followed to the literal token, and several tokens sharing one value never confuse the trace.
//
// What is written follows FR-32-29 (tokens are defaults, presets are the picker scale):
//   - a token the snapshot lists as a default (`settings.custom.defaultTokens`) is the default of its job: the element's
//     setting stays unset so it inherits it. The resolver already leaves an element unset where the default renders the
//     draft's value (status `equal`); a write that reaches here means the default renders differently at some width, so the
//     literal stays there (row `default`);
//   - a token a picker preset slot carries (`settings.custom.presetTokens.<spacing|fontSizes>.<slot>` = the token's name
//     without `--`) is written as that slot's reference, `var(--wp--preset--spacing--<slot>)` or
//     `var(--wp--preset--font-size--<slot>)` (the form SgsBoxControl and TypographyControls store), each per-device setting
//     taking that width's token, when the slot's value is the draft's computed value;
//   - colour (FR-32-28) and font family name the snapshot entry of the token the element uses (the bare slug);
//   - any other token, a literal and a token the snapshot does not carry stay as the resolver wrote them, each with a row.
// Radius, shadow, weight, line height, letter spacing, duration and easing are traced and reported, never written.
import { toPx, parseColour, deltaE, COLOUR_DE, LENGTH_TOL } from './normalise.mjs';
import { readTokens } from './tokens.mjs';
import { splitProperty } from './resolve.mjs';

const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const CORNER_KEY = { 'top-left': 'topLeft', 'top-right': 'topRight', 'bottom-right': 'bottomRight', 'bottom-left': 'bottomLeft' };
const TIER_OF = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
const TIER_ABOVE = { mobile: [ 'tablet', 'desktop' ], tablet: [ 'desktop' ], desktop: [] };
const LENGTH = /^-?(?:\d*\.)?\d+(?:px|rem|em)$/;
const SPACING_PROPS = [ ...[ 'padding', 'margin' ].flatMap( ( p ) => SIDES.map( ( s ) => `${ p }-${ s }` ) ), 'row-gap', 'column-gap', 'gap' ];

// One entry per family: the CSS properties it covers, where the snapshot lists its tokens, the field holding the value,
// the form a write takes, and how a snapshot value is compared with the draft's computed one. `write: false` families are
// traced and reported only.
export const FAMILIES = [
	{ id: 'font-size', preset: 'fontSizes', props: [ 'font-size' ], at: [ 'typography', 'fontSizes' ], field: 'size', ref: ( s ) => `var(--wp--preset--font-size--${ s })`, same: 'length', write: true },
	{ id: 'spacing', preset: 'spacing', props: SPACING_PROPS, at: [ 'spacing', 'spacingSizes' ], field: 'size', ref: ( s ) => `var(--wp--preset--spacing--${ s })`, same: 'length', write: true },
	{ id: 'font-family', props: [ 'font-family' ], at: [ 'typography', 'fontFamilies' ], field: 'fontFamily', ref: ( s ) => s, same: 'family', write: true },
	{ id: 'shadow', props: [ 'box-shadow' ], at: [ 'shadow', 'presets' ], field: 'shadow', ref: ( s ) => s, same: 'shadow', write: false },
	{ id: 'radius', props: [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ], custom: 'borderRadius', ref: ( s ) => `var(--wp--custom--border-radius--${ s })`, same: 'length', write: false },
	{ id: 'colour', props: [ 'color', 'background-color', 'border-color' ], at: [ 'color', 'palette' ], field: 'color', ref: ( s ) => s, same: 'colour', write: true },
	{ id: 'font-weight', props: [ 'font-weight' ], custom: 'fontWeight', same: 'text', write: false },
	{ id: 'line-height', props: [ 'line-height' ], custom: 'lineHeight', same: 'text', write: false },
	{ id: 'letter-spacing', props: [ 'letter-spacing' ], custom: 'letterSpacing', same: 'text', write: false },
	{ id: 'duration', props: [ 'transition-duration' ], custom: 'duration', same: 'text', write: false },
	{ id: 'easing', props: [ 'transition-timing-function' ], custom: 'easing', same: 'text', write: false },
];

export const familyOfProp = ( prop ) => FAMILIES.find( ( f ) => f.props.includes( prop ) ) ?? null;

const norm = ( v ) => String( v ?? '' ).trim().replace( /\s+/g, ' ' );
const family = ( stack ) => norm( stack ).split( ',' )[ 0 ].replace( /^["']|["']$/g, '' ).toLowerCase();
const VAR = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/;

// The draft's tokens by name for tracing: the root declaration of a name, else its first.
export function tokenMap( folder ) {
	const map = new Map();
	for ( const t of readTokens( folder ).tokens ) {
		const root = /^(?::root|html)$/.test( String( t.selector ).trim() ) && ! t.media;
		if ( root || ! map.has( t.name ) ) {
			map.set( t.name, String( t.value ).trim() );
		}
	}
	return map;
}

// The literal token a declared value uses: { token } (a name with its `--`) when the whole value is one var() whose chain of
// alias tokens ends at a token holding a literal, else null (a literal, a compound value, a missing or cyclic token).
export function traceToken( declared, map ) {
	const seen = new Set();
	let m = VAR.exec( norm( declared ).replace( /\s*!important$/, '' ) );
	while ( m && ! seen.has( m[ 1 ] ) ) {
		seen.add( m[ 1 ] );
		const value = map.get( m[ 1 ] );
		if ( undefined === value ) {
			return null;
		}
		const next = VAR.exec( value );
		if ( ! next ) {
			return { token: m[ 1 ] };
		}
		m = next;
	}
	return null;
}

// The slot of a preset family that carries a token (`presetTokens.<family>.<slot>` is the token's name), or null.
const slotOf = ( raw, f, slug ) => Object.entries( raw?.settings?.custom?.presetTokens?.[ f.preset ] ?? {} ).find( ( [ , t ] ) => String( t ).replace( /^--/, '' ) === slug )?.[ 0 ] ?? null;

// The snapshot entries of a family as { slug: value }.
function entries( raw, f ) {
	const s = raw?.settings ?? {};
	if ( f.custom ) {
		return Object.fromEntries( Object.entries( s.custom?.[ f.custom ] ?? {} ).map( ( [ k, v ] ) => [ k, v ] ) );
	}
	const list = s[ f.at[ 0 ] ]?.[ f.at[ 1 ] ];
	return Object.fromEntries( ( Array.isArray( list ) ? list : [] ).map( ( e ) => [ e.slug, e[ f.field ] ] ) );
}

// Whether a snapshot value is the draft's computed value at a width.
function sameValue( kind, snapshotValue, computed, fontPx ) {
	switch ( kind ) {
		case 'length': {
			const [ a, b ] = [ toPx( snapshotValue, fontPx ), toPx( computed, fontPx ) ];
			return null !== a && null !== b && undefined !== a && undefined !== b && Math.abs( a - b ) <= LENGTH_TOL;
		}
		case 'family':
			return '' !== family( snapshotValue ) && family( snapshotValue ) === family( computed );
		case 'colour': {
			const [ a, b ] = [ parseColour( snapshotValue ), parseColour( computed ) ];
			return !! a && !! b && Math.abs( a.a - b.a ) < 0.02 && deltaE( a, b ) <= COLOUR_DE;
		}
		case 'shadow': {
			const nums = ( v ) => ( String( v ).match( /-?\d*\.?\d+(?=px)/g ) || [] ).map( Number ).sort( ( x, y ) => x - y ).join( ',' );
			return '' !== nums( snapshotValue ) && nums( snapshotValue ) === nums( computed );
		}
		default:
			return norm( snapshotValue ) === norm( computed );
	}
}

// The reference of the token the element uses at each width: { widths: { width: ref }, rows }. A row per width says
// `ref` (written), or `literal` with its reason. `declaredAt`: { width: declared text }; `draft`: { width: computed value }.
export function traceRefs( { prop, draft, declaredAt, map, raw, fontPx = {} } ) {
	const f = familyOfProp( prop );
	const out = { family: f?.id ?? null, widths: {}, rows: [] };
	if ( ! f ) {
		return out;
	}
	const have = entries( raw, f );
	for ( const w of Object.keys( draft ) ) {
		const row = ( status, reason, token = null ) => out.rows.push( { prop, width: Number( w ), family: f.id, status, ...( token ? { token } : {} ), reason } );
		const declared = declaredAt?.[ w ];
		if ( null == declared || '' === norm( declared ) ) {
			row( 'literal', 'the draft declares no value here' );
			continue;
		}
		const hit = traceToken( declared, map );
		if ( ! hit ) {
			row( 'literal', `the draft states ${ norm( declared ) } literally` );
			continue;
		}
		const token = hit.token.replace( /^--/, '' );
		if ( raw?.settings?.custom?.defaultTokens?.includes?.( token ) ) {
			row( 'default', `${ hit.token } is a default; the default does not render the draft's value here, so the literal stays`, hit.token );
			continue;
		}
		const slug = f.preset ? slotOf( raw, f, token ) : token;
		if ( null === slug ) {
			row( 'literal', `no ${ f.id } preset slot carries ${ hit.token }`, hit.token );
		} else if ( ! ( slug in have ) ) {
			row( 'literal', `the snapshot carries no ${ f.id } entry ${ slug }`, hit.token );
		} else if ( ! sameValue( f.same, have[ slug ], draft[ w ], fontPx[ w ] || 16 ) ) {
			row( 'literal', `the snapshot's ${ slug } is ${ norm( have[ slug ] ) }, not the draft's ${ norm( draft[ w ] ) }`, hit.token );
		} else if ( ! f.write ) {
			row( 'literal', `${ f.id } is traced to ${ hit.token } but its setting holds a plain value, not a reference`, hit.token );
		} else {
			out.widths[ w ] = f.ref( slug );
			row( 'ref', `the element uses ${ hit.token }`, hit.token );
		}
	}
	return out;
}

const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
const holdsLiteral = ( f, v ) => ( 'string' === typeof v && ( 'length' === f.same ? LENGTH.test( v.trim() ) : '' !== v.trim() ) );

// One write's value with the traced references in place of the literals. Only a string leaf the resolver wrote at the tier
// (a length for a length family) is replaced; a tier the resolver left to the tier above takes its own reference when the
// token differs from the tier above's.
function rewrite( value, f, prop, widths, side ) {
	const at = ( tier ) => widths[ Object.keys( TIER_OF ).find( ( w ) => TIER_OF[ w ] === tier ) ];
	if ( 'string' === typeof value ) {
		const refs = new Set( Object.values( widths ) );
		return holdsLiteral( f, value ) || 'colour' === f.id || 'font-family' === f.id ? ( 1 === refs.size && Object.keys( widths ).length ? [ ...refs ][ 0 ] : value ) : value;
	}
	if ( ! isObj( value ) || ! [ 'desktop', 'tablet', 'mobile' ].some( ( t ) => t in value ) ) {
		return value;
	}
	const out = { ...value };
	for ( const tier of [ 'desktop', 'tablet', 'mobile' ] ) {
		const ref = at( tier );
		if ( undefined === ref ) {
			continue;
		}
		const node = value[ tier ];
		const above = TIER_ABOVE[ tier ].map( at ).find( ( r ) => undefined !== r );
		const place = ( leaf ) => ( holdsLiteral( f, leaf ) || 'colour' === f.id || 'font-family' === f.id ? ref : leaf );
		if ( undefined === node ) {
			if ( ref !== above && ! side ) {
				out[ tier ] = ref;
			} else if ( ref !== above && side ) {
				out[ tier ] = { [ side ]: ref };
			}
		} else if ( isObj( node ) && side ) {
			out[ tier ] = side in node ? { ...node, [ side ]: place( node[ side ] ) } : node;
		} else if ( ! isObj( node ) && ! side ) {
			out[ tier ] = place( node );
		}
	}
	return out;
}

// The writes of one property with the traced references in place; `rows` is the trace's account. The write is untouched
// when no width traced to a reference.
export function applyRefs( { writes, prop, side, traced } ) {
	const f = familyOfProp( prop );
	if ( ! f || ! f.write || ! Object.keys( traced.widths ).length ) {
		return writes;
	}
	return writes.map( ( w ) => ( { ...w, value: rewrite( w.value, f, prop, traced.widths, side ) } ) );
}

// The box key a longhand lands on inside a tier: `top` for padding-top, `topLeft` for border-top-left-radius, null for a
// property holding one value.
export const boxKey = ( prop, split ) => split.side ?? ( split.corner ? CORNER_KEY[ split.corner ] : null );

// The writes of one element's property with the draft's token references in place (the call Fill makes before applying a
// result). `st.draftTokens` is the draft's token map (tokenMap, read from `st.draftFolder` once) and `st.rawSnapshot` the client's
// snapshot; a run without either writes what the resolver wrote. The trace's rows are kept on `st.out.tokenRefs`.
export function tokenWrites( st, target, prop, draft, writes, fontPx = {} ) {
	if ( ! st.rawSnapshot || ! familyOfProp( prop ) ) {
		return writes;
	}
	st.draftTokens ??= st.draftFolder ? tokenMap( st.draftFolder ) : new Map();
	if ( ! st.draftTokens.size ) {
		return writes;
	}
	const declaredAt = Object.fromEntries( Object.keys( draft ).map( ( w ) => [ w, st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] ] ) );
	const traced = traceRefs( { prop, draft, declaredAt, map: st.draftTokens, raw: st.rawSnapshot, fontPx } );
	( st.out.tokenRefs ??= [] ).push( ...traced.rows.map( ( r ) => ( { node: target.id, slot: target.slot, ...r } ) ) );
	return applyRefs( { writes, prop, side: boxKey( prop, splitProperty( prop ) ), traced } );
}
