// The setState calls a handoff surfaces.json state's `how_to_reach` text gives (Spec 48A FR-48A-7): each
// `<ident>.setState(<args>)` with its arguments balanced, read from prose that may hold several calls or none. A call on
// the runtime's own lookup of a component's logic, `dcLogic('<name>').setState(<args>)`, is one too: its ident is
// `dcLogic` (bound to that component's logic when the call runs) and `component` names the component. Shared by
// the intake openers (lib/intake-skeletons.mjs::openers) and the page map's flow openers (lib/intake-pagemap-flow-openers.mjs).
export function reachCalls( text ) {
	const out = [];
	const re = /(?<![\w$.])(?:(dcLogic)\s*\(\s*(['"])([^'"]+)\2\s*\)|([A-Za-z_$][\w$]*))\s*\.\s*setState\s*\(/g;
	for ( let m; ( m = re.exec( String( text || '' ) ) ); ) {
		const src = m.input;
		const close = { '(': ')', '[': ']', '{': '}' };
		const stack = [ ')' ];
		let i = re.lastIndex;
		for ( ; i < src.length && stack.length; i++ ) {
			const c = src[ i ];
			if ( '\'' === c || '"' === c || '`' === c ) {
				for ( i++; i < src.length && src[ i ] !== c; i++ ) {
					'\\' === src[ i ] && i++;
				}
			} else if ( close[ c ] ) {
				stack.push( close[ c ] );
			} else if ( c === stack.at( -1 ) ) {
				stack.pop();
			} else if ( /[)\]}]/.test( c ) ) {
				break;
			}
		}
		if ( ! stack.length ) {
			out.push( { ident: m[ 1 ] || m[ 4 ], args: src.slice( re.lastIndex, i - 1 ).trim(), ...( m[ 1 ] ? { component: m[ 3 ] } : {} ) } );
			re.lastIndex = i;
		}
	}
	return out;
}

// A surfaces.json state's structured way in (Spec 48A FR-48A-13): `how_to_reach_structured` is
// { setState: { <key>: <value> }, storeCalls: [ { path: 'MM.account.signIn', args: [ ...literals ] } ], event: { type, target } }.
// Returns { set: [{ ident, args }], store: [{ ident, store: true, path, args }] } in the shapes reachCalls and
// intake-store-calls.mjs::storeCalls give, or null when the state carries no setState and no store call (the caller then
// reads the how_to_reach prose). `event` is recorded for the reader and not run here.
export function structuredReach( state ) {
	const s = state?.how_to_reach_structured;
	if ( ! s || 'object' !== typeof s ) {
		return null;
	}
	const set = s.setState && 'object' === typeof s.setState && ! Array.isArray( s.setState ) && Object.keys( s.setState ).length ? [ { ident: 'this', args: JSON.stringify( s.setState ) } ] : [];
	const store = ( Array.isArray( s.storeCalls ) ? s.storeCalls : [] )
		.filter( ( c ) => 'string' === typeof c?.path && c.path.includes( '.' ) && ( c.args === undefined || Array.isArray( c.args ) ) )
		.map( ( c ) => {
			const parts = c.path.split( '.' ).map( ( p ) => p.trim() ).filter( Boolean );
			return { ident: parts[ 0 ], store: true, path: parts.slice( 1 ), args: c.args || [] };
		} );
	return set.length || store.length ? { set, store } : null;
}
