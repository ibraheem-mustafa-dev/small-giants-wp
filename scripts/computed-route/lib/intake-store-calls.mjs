// The draft's own store calls that a handoff surfaces.json state's `how_to_reach` names (Spec 48A FR-48A-7), for the surfaces
// that open only after the draft's store holds something (a signed-in account, a basket with a gift note): `MM.account.signIn()`,
// `MM.cart.setGift({ on: true })`. A store call is `<Ident>.<path>(<literal arguments>)` on a global the draft itself defines;
// the arguments must be a JSON-like literal (an object, array, string, number, boolean or null, keys bare or quoted, strings in
// either quote), so prose such as `MM.cart.add(...)` is never a call and no expression the page could run is ever built from
// the text. The page-side half (lib/intake-state.mjs::logicState, op `reach`) runs only a call whose root is a plain-object global
// the draft defines (never a built-in such as Math or console), and only a function reached by plain property names.
import { structuredReach } from './intake-reach-calls.mjs';
const IDENT = '[A-Za-z_$][\\w$]*';

// A JS-literal subset as an array of arguments, or null when the text is anything else.
export function literalArgs( src ) {
	const text = String( src ?? '' ).trim();
	if ( ! text ) {
		return [];
	}
	let json = '';
	for ( let i = 0; i < text.length; i++ ) {
		const c = text[ i ];
		if ( '"' === c || '\'' === c ) {
			let j = i + 1;
			let body = '';
			for ( ; j < text.length && text[ j ] !== c; j++ ) {
				body += '\\' === text[ j ] ? text[ j ] + ( text[ ++j ] ?? '' ) : text[ j ];
			}
			if ( j >= text.length ) {
				return null;
			}
			json += JSON.stringify( '\'' === c ? body.replace( /\\'/g, '\'' ) : body );
			i = j;
		} else {
			json += c;
		}
	}
	const quoted = json.replace( new RegExp( `([{,]\\s*)(${ IDENT })(\\s*:)`, 'g' ), '$1"$2"$3' );
	try {
		const out = JSON.parse( `[${ quoted }]` );
		return Array.isArray( out ) ? out : null;
	} catch {
		return null;
	}
}

// The store calls in a how_to_reach text, in order: [{ ident, store: true, path: ['account', 'signIn'], args: [ ...literals ] }].
// A `setState` call (the logic's own, lib/intake-reach-calls.mjs) and the `dcLogic` lookup are not store calls.
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
		if ( 'dcLogic' !== m[ 1 ] && 'setState' !== path.at( -1 ) && args ) {
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
