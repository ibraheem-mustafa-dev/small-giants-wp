// The draft's own store calls that a handoff surfaces.json state's `how_to_reach` names (Spec 48A FR-48A-7), for the surfaces
// that open only after the draft's store holds something (a signed-in account, a basket with a gift note): `MM.account.signIn()`,
// `MM.cart.setGift({ on: true })`. A store call is `<Ident>.<path>(<literal arguments>)` on a global the draft itself defines;
// the arguments must be a JSON-like literal (an object, array, string, number, boolean or null, keys bare or quoted, strings in
// either quote), so prose such as `MM.cart.add(...)` is never a call and no expression the page could run is ever built from
// the text. The page-side half (lib/intake-state.mjs::logicState, op `reach`) runs only a call whose root is a plain-object global
// the draft defines (never a built-in such as Math or console), and only a function reached by plain property names.
import { structuredReach } from './intake-reach-calls.mjs';
const IDENT = '[A-Za-z_$][\\w$]*';

// The value of a JS string literal's body (the text between its quotes, escapes still raw): \n \t \v \0 \xHH \uHHHH \u{H...}, an escaped
// quote, backslash or line break, any other escaped character as itself; null for a malformed escape or a legacy octal one.
function jsString( body ) {
	let out = '';
	for ( let i = 0; i < body.length; i++ ) {
		if ( '\\' !== body[ i ] ) {
			out += body[ i ];
			continue;
		}
		const e = body[ ++i ];
		const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v' }[ e ];
		if ( undefined !== simple ) {
			out += simple;
		} else if ( '0' === e && ! /\d/.test( body[ i + 1 ] ?? '' ) ) {
			out += '\0';
		} else if ( 'x' === e && /^[0-9a-fA-F]{2}$/.test( body.slice( i + 1, i + 3 ) ) ) {
			out += String.fromCharCode( parseInt( body.slice( i + 1, i + 3 ), 16 ) );
			i += 2;
		} else if ( 'u' === e && /^[0-9a-fA-F]{4}$/.test( body.slice( i + 1, i + 5 ) ) ) {
			out += String.fromCharCode( parseInt( body.slice( i + 1, i + 5 ), 16 ) );
			i += 4;
		} else if ( 'u' === e && /^\{[0-9a-fA-F]{1,6}\}/.test( body.slice( i + 1 ) ) ) {
			const end = body.indexOf( '}', i );
			const code = parseInt( body.slice( i + 2, end ), 16 );
			if ( code > 0x10FFFF ) {
				return null;
			}
			out += String.fromCodePoint( code );
			i = end;
		} else if ( undefined === e || /[0-9xu]/.test( e ) ) {
			return null;
		} else if ( '\r' === e && '\n' === body[ i + 1 ] ) {
			i++;
		} else if ( ! /^[\n\r]$/.test( e ) && ! [ 0x2028, 0x2029 ].includes( e.charCodeAt( 0 ) ) ) {
			out += e;
		}
	}
	return out;
}

// A JS-literal subset as an array of arguments, or null when the text is anything else.
export function literalArgs( src ) {
	const text = String( src ?? '' ).trim();
	if ( ! text ) {
		return [];
	}
	// Strings first: each is decoded once into its JSON form, so a bare-key rewrite never reaches inside one and an escape is read once.
	const bare = new RegExp( `([{,]\\s*)(${ IDENT })(\\s*:)`, 'g' );
	let quoted = '';
	let loose = '';
	for ( let i = 0; i < text.length; i++ ) {
		const c = text[ i ];
		if ( '"' !== c && '\'' !== c ) {
			loose += c;
			continue;
		}
		let j = i + 1;
		let body = '';
		for ( ; j < text.length && text[ j ] !== c; j++ ) {
			body += '\\' === text[ j ] ? text[ j ] + ( text[ ++j ] ?? '' ) : text[ j ];
		}
		if ( j >= text.length ) {
			return null;
		}
		const value = jsString( body );
		if ( null === value ) {
			return null;
		}
		quoted += loose.replace( bare, '$1"$2"$3' ) + JSON.stringify( value );
		loose = '';
		i = j;
	}
	quoted += loose.replace( bare, '$1"$2"$3' );
	try {
		const out = JSON.parse( `[${ quoted }]` );
		return Array.isArray( out ) ? out : null;
	} catch {
		return null;
	}
}

// The store calls in a how_to_reach text, in order: [{ ident, store: true, path: ['account', 'signIn'], args: [ ...literals ] }].
// A `setState` call (the logic's own, lib/intake-reach-calls.mjs), the `dcLogic` lookup and a call on `this` are not store calls.
export function storeCalls( text ) {
	const out = [];
	const re = new RegExp( `(?<![\\w$.'"])(${ IDENT })((?:\\s*\\.\\s*${ IDENT })+)\\s*\\(`, 'g' );
	const src = String( text ?? '' );
	for ( let m; ( m = re.exec( src ) ); ) {
		const path = m[ 2 ].split( '.' ).map( ( s ) => s.trim() ).filter( Boolean );
		let depth = 1;
		let i = re.lastIndex;
		for ( ; i < src.length && depth; i++ ) {
			const c = src[ i ];
			if ( '"' === c || '\'' === c || '`' === c ) {
				for ( i++; i < src.length && src[ i ] !== c; i++ ) {
					'\\' === src[ i ] && i++;
				}
			} else if ( '(' === c ) {
				depth++;
			} else if ( ')' === c ) {
				depth--;
			}
		}
		if ( depth ) {
			continue;
		}
		const args = literalArgs( src.slice( re.lastIndex, i - 1 ) );
		re.lastIndex = i;
		if ( 'dcLogic' !== m[ 1 ] && 'this' !== m[ 1 ] && 'setState' !== path.at( -1 ) && args ) {
			out.push( { ident: m[ 1 ], store: true, path, args } );
		}
	}
	return out;
}

// One store call as text: `MM.cart.setGift({"on":true})`.
export const describeStoreCall = ( c ) => `${ c.ident }.${ c.path.join( '.' ) }(${ c.args.map( ( a ) => JSON.stringify( a ) ).join( ', ' ) })`;

// The ways that put the draft's store where a surface's enclosing conditions need it. needs: the bare bindings the surface's
// root and the conditions around it test (`signed`, `gift.on`, from the stamped template); surfaces: the surfaces.json
// surfaces (each with `id`, `name` and `states`). A state whose `state_keys` give a need the value true and whose
// `how_to_reach` names store calls is a precondition: its calls, as a reach way `before` the surface's own way. Ways with the
// same calls are one.
export function preconditionWays( needs, surfaces ) {
	const seen = new Set();
	const out = [];
	for ( const need of needs || [] ) {
		for ( const s of surfaces || [] ) {
			for ( const st of s.states || [] ) {
				const v = st.state_keys?.[ need ];
				const calls = true === v || 'true' === v ? ( structuredReach( st )?.store ?? storeCalls( st.how_to_reach ) ) : [];
				const id = calls.map( describeStoreCall ).join( '; ' );
				if ( calls.length && ! seen.has( id ) ) {
					seen.add( id );
					out.push( { via: 'reach', state: `${ need } (${ s.id || s.name }: ${ st.name })`, calls, bounds: [] } );
				}
			}
		}
	}
	return out;
}
