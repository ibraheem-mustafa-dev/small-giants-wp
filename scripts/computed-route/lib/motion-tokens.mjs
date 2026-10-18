// Token references and presets for the motion writer (Spec 38A §6.2, §7, §14): a written duration, easing or distance
// that equals one of the client's motion tokens is stored as `token:<family>.<key>`, otherwise as its literal value; a
// layer whose values then equal a framework preset's values names that preset. Which tokens a field type may reference
// is read from the schema itself (each field type's token branch and its pattern over the `tokenReference` enum), and
// the token values from the client's snapshot (`settings.custom`), so no family or key is listed in code.

// The token references each field type accepts, in schema order: { duration: [...], easing: [...], distance: [...] },
// with a distance's negated references (`-token:distance.sm`) under `negated`.
export function tokenTypes( schema ) {
	const defs = schema.$defs;
	const all = defs.tokenReference.enum;
	const out = {};
	for ( const [ type, def ] of Object.entries( defs ) ) {
		if ( 'fieldType' !== def[ 'x-sgs-kind' ] || ! Array.isArray( def.anyOf ) ) {
			continue;
		}
		const branch = def.anyOf.find( ( b ) => b.pattern && ( b.allOf || [] ).some( ( a ) => '#/$defs/tokenReference' === a.$ref ) );
		if ( ! branch ) {
			continue;
		}
		const re = new RegExp( branch.pattern );
		const negated = def.anyOf.flatMap( ( b ) => ( b.enum || [] ).filter( ( v ) => /^-token:/.test( v ) ) );
		out[ type ] = { refs: all.filter( ( t ) => re.test( t ) ), negated };
	}
	return out;
}

// A duration in ms from a number (ms) or a `ms` / `s` string; null when it is neither.
export function msOf( v ) {
	if ( 'number' === typeof v ) {
		return v;
	}
	const m = /^\s*(-?[\d.]+)\s*(ms|s)\s*$/.exec( String( v ?? '' ) );
	return m ? Math.round( Number( m[ 1 ] ) * ( 's' === m[ 2 ] ? 1000 : 1 ) * 1000 ) / 1000 : null;
}

// A px length from a number or a `px` string; null otherwise (a relative length is never equal to a px token).
export function pxOf( v ) {
	if ( 'number' === typeof v ) {
		return v;
	}
	const m = /^\s*(-?[\d.]+)px\s*$/.exec( String( v ?? '' ) );
	return m ? Number( m[ 1 ] ) : null;
}

// An easing in one canonical spelling: keywords as they are, the numbers of `cubic-bezier()` and `linear()` rounded to
// 4 places and joined by ', '. Returns null for text that is no easing (an unresolved variable name).
export function easingOf( v ) {
	const s = String( v ?? '' ).trim().toLowerCase();
	if ( /^(?:linear|ease|ease-in|ease-out|ease-in-out)$/.test( s ) ) {
		return s;
	}
	const m = /^(cubic-bezier|linear)\((.*)\)$/.exec( s );
	if ( ! m ) {
		return null;
	}
	const parts = m[ 2 ].split( ',' ).map( ( p ) => p.trim().split( /\s+/ ).map( ( x ) => ( /%$/.test( x ) ? x : String( Math.round( Number( x ) * 10000 ) / 10000 ) ) ).join( ' ' ) );
	return parts.some( ( p ) => /NaN/.test( p ) ) ? null : `${ m[ 1 ] }(${ parts.join( ', ' ) })`;
}

const COMPARE = { duration: msOf, distance: pxOf, easing: easingOf };

// The client's motion token values: { '<family>.<key>': raw value } from the raw snapshot's settings.custom.
export function clientTokens( rawSnapshot ) {
	const custom = rawSnapshot?.settings?.custom || {};
	const out = {};
	for ( const [ family, keys ] of Object.entries( custom ) ) {
		if ( keys && 'object' === typeof keys && ! Array.isArray( keys ) ) {
			for ( const [ key, value ] of Object.entries( keys ) ) {
				if ( 'string' === typeof value || 'number' === typeof value ) {
					out[ `${ family }.${ key }` ] = value;
				}
			}
		}
	}
	return out;
}

// Whether a field holds what its token family names (Spec 38A §7): a duration token is a duration (never a delay or a
// phase offset), a distance token is travel (a translate: lifts and entrance travel, never a blur or a ring), and every
// easing is a curve. A value of another field that happens to equal a token stays literal.
export function tokenises( field, fieldType ) {
	if ( 'duration' === fieldType ) {
		return ! /delay|phase/i.test( field );
	}
	if ( 'distance' === fieldType ) {
		return /^translate/.test( field );
	}
	return 'easing' === fieldType;
}

// The token reference for one value of a field type, or the value itself. `prefer` lists families tried first (an
// entrance prefers `entrance.*`), then the rest in schema order; a negative distance snaps to a negated token.
export function snapToken( value, fieldType, { types, tokens, prefer = [] } ) {
	const cmp = COMPARE[ fieldType ];
	const allowed = types[ fieldType ];
	if ( ! cmp || ! allowed ) {
		return value;
	}
	const want = cmp( value );
	if ( null === want ) {
		return value;
	}
	const famOf = ( ref ) => ref.slice( 6, ref.indexOf( '.' ) );
	const rank = ( ref ) => ( prefer.includes( famOf( ref ) ) ? prefer.indexOf( famOf( ref ) ) : prefer.length );
	const refs = [ ...allowed.refs ].sort( ( a, b ) => rank( a ) - rank( b ) );
	const equal = ( ref, target ) => {
		const raw = tokens[ ref.slice( 6 ) ];
		return undefined !== raw && cmp( raw ) === target;
	};
	const hit = refs.find( ( ref ) => equal( ref, want ) );
	if ( hit ) {
		return hit;
	}
	if ( 'number' === typeof want && want < 0 ) {
		const neg = refs.find( ( ref ) => allowed.negated.includes( `-${ ref }` ) && equal( ref, -want ) );
		if ( neg ) {
			return `-${ neg }`;
		}
	}
	return value;
}

const canon = ( v ) => ( v && 'object' === typeof v && ! Array.isArray( v ) ? Object.fromEntries( Object.keys( v ).sort().map( ( k ) => [ k, canon( v[ k ] ) ] ) ) : v );

// The slug of the preset (of `presets`, one panel's rows) whose trigger and values equal the layer's, or null.
export function presetFor( layer, presets ) {
	const want = JSON.stringify( canon( layer.values ) );
	const hit = presets.find( ( p ) => ( ! p.trigger || ! layer.trigger || p.trigger === layer.trigger ) && JSON.stringify( canon( p.values ) ) === want );
	return hit ? hit.slug : null;
}
