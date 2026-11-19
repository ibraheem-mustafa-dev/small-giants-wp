// One reader for a declared value written with a design token (`var(--ink)`), shared by every reader of declared styles
// (Spec 48A FR-48A-17: a draft uses its tokens by name everywhere). `lookup( name )` gives a custom property's value as
// written (it may itself hold a var()), or undefined when the name is not declared; the callers build it from the draft's
// own token files and :root rules (scripts/computed-route/lib/draft-tokens.mjs::draftTokenLookup) or from the custom
// properties the browser computed for the element (parity/lib/devtools.mjs::declaredValues). Nothing here names a token.
// resolveVars is self-contained (no outer reference), so its source can also run inside a page.

// The value with every var() replaced by its token's value, nested var()s and fallbacks followed; null when a var() names
// a token the lookup does not hold and gives no fallback, or the names form a cycle. A value with no var() is returned as
// it is.
export function resolveVars( value, lookup, stack = [] ) {
	const text = String( value ?? '' );
	// The index of the bracket that closes the one opened just before `from`, outside strings.
	const close = ( s, from ) => {
		let depth = 1;
		let quote = null;
		for ( let i = from; i < s.length; i++ ) {
			const c = s[ i ];
			if ( quote ) {
				quote = c === quote ? null : quote;
			} else if ( '"' === c || "'" === c ) {
				quote = c;
			} else if ( '(' === c ) {
				depth++;
			} else if ( ')' === c && 0 === --depth ) {
				return i;
			}
		}
		return -1;
	};
	// The first comma at depth 0 of `s`, or -1.
	const comma = ( s ) => {
		let depth = 0;
		for ( let i = 0; i < s.length; i++ ) {
			const c = s[ i ];
			depth += '(' === c ? 1 : ')' === c ? -1 : 0;
			if ( ',' === c && 0 === depth ) {
				return i;
			}
		}
		return -1;
	};
	let out = '';
	let i = 0;
	for ( ;; ) {
		const re = /var\(/gi;
		re.lastIndex = i;
		let m = re.exec( text );
		while ( m && m.index > 0 && /[\w-]/.test( text[ m.index - 1 ] ) ) {
			m = re.exec( text );
		}
		if ( ! m ) {
			break;
		}
		const end = close( text, m.index + 4 );
		if ( end < 0 ) {
			return null;
		}
		const inner = text.slice( m.index + 4, end );
		const at = comma( inner );
		const name = ( at < 0 ? inner : inner.slice( 0, at ) ).trim();
		const fallback = at < 0 ? undefined : inner.slice( at + 1 ).trim();
		const raw = stack.includes( name ) ? undefined : lookup( name );
		let sub = undefined === raw || null === raw || '' === String( raw ).trim() ? null : resolveVars( raw, lookup, [ ...stack, name ] );
		if ( null === sub && undefined !== fallback ) {
			sub = resolveVars( fallback, lookup, stack );
		}
		if ( null === sub ) {
			return null;
		}
		out += text.slice( i, m.index ) + sub;
		i = end + 1;
	}
	return ( out + text.slice( i ) ).trim();
}

// Whether a declared value holds a var() call.
export const hasVar = ( value ) => /(^|[^\w-])var\(/i.test( String( value ?? '' ) );

// The value with its var()s resolved where the lookup holds them; the value as written when it cannot be.
export const resolvedOrRaw = ( value, lookup ) => ( hasVar( value ) ? resolveVars( value, lookup ) ?? value : value );
