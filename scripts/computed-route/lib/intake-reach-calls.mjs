// The setState calls a handoff surfaces.json state's `how_to_reach` text gives (Spec 48A FR-48A-7): each
// `<ident>.setState(<args>)` with its arguments balanced, read from prose that may hold several calls or none. Shared by
// the intake openers (lib/intake-skeletons.mjs::openers) and the page map's flow openers (lib/intake-pagemap-flow-openers.mjs).
export function reachCalls( text ) {
	const out = [];
	const re = /(?<![\w$.])([A-Za-z_$][\w$]*)\s*\.\s*setState\s*\(/g;
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
			out.push( { ident: m[ 1 ], args: src.slice( re.lastIndex, i - 1 ).trim() } );
			re.lastIndex = i;
		}
	}
	return out;
}
