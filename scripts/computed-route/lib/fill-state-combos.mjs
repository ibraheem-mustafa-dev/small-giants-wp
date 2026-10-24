// The state combinations a draft's stylesheets hold (Spec 48 FR-48-81, split from lib/fill-state-read.mjs): which vocabulary
// tokens a selector carries (`tokenSource`, `readableRows`) and, in the page, each target's combinations with the host of
// every token (`stateCombos`). lib/fill-state-read.mjs enters them and reads the looks.

// The reaches the reader can enter in a page; environment states (media emulation) belong to the media-feature
// entries, and an unreachable one (:visited) is read from its stylesheet rules, never entered.
export const READABLE = [ 'force-pseudo', 'set-attribute', 'toggle-class', 'call', 'scroll' ];
const esc = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

// The regex source that finds one vocabulary row's token inside a selector. A pseudo-class never matches a longer
// name (`:focus` is not `:focus-visible`); an attribute token without a value matches any value of that attribute, and
// one without its closing bracket (`[data-state`) is a prefix; a class token starting `--` is a BEM modifier on any
// element, one ending `-` a class prefix.
export function tokenSource( row ) {
	const t = row.token;
	if ( 'pseudo-class' === row.kind ) {
		return `${ esc( t ) }(?![\\w-])`;
	}
	if ( 'media' === row.kind ) {
		return null;
	}
	if ( t.startsWith( '[' ) ) {
		const m = /^\[([\w-]+)(?:([~|^$*]?=)"?([^"\]]*)"?)?(\])?$/.exec( t );
		if ( ! m ) {
			return null;
		}
		const [ , name, op, value, closed ] = m;
		if ( ! closed ) {
			return `\\[\\s*${ esc( name ) }(?![\\w-])[^\\]]*\\]`;
		}
		return op ? `\\[\\s*${ esc( name ) }\\s*${ esc( op ) }\\s*["']?${ esc( value ) }["']?\\s*\\]` : `\\[\\s*${ esc( name ) }(?:\\s*[~|^$*]?=[^\\]]*)?\\s*\\]`;
	}
	if ( t.startsWith( '--' ) ) {
		return `\\.[\\w-]+${ esc( t ) }(?![\\w-])`;
	}
	return t.endsWith( '-' ) ? `\\.${ esc( t ) }[\\w-]+` : `\\.${ esc( t ) }(?![\\w-])`;
}

// The vocabulary rows the reader can enter, each with its token's regex source: [{ i, state, family, kind, reach,
// call, src }]. rows: the `states` table (or states.json's `states`).
export function readableRows( rows ) {
	return rows.map( ( r, i ) => ( { ...r, i, src: tokenSource( r ) } ) ).filter( ( r ) => r.src && ( READABLE.includes( r.reach ) || 'unreachable' === r.reach ) );
}

// In-page: every state combination the stylesheets hold for each target. A selector part (one entry of a comma list)
// with one or more state tokens is a combination; it applies to a target when the part matches it with the tokens taken
// out. Each token's host is the nearest element (the target or an ancestor) that matches the part cut after the
// token's compound, tokens taken out; it is marked with a numbered attribute so the node side can reach it.
// A combination the page cannot enter (a token whose reach is unreachable, or with no host) also carries `code`: the
// declarations of every rule that produced its selector part, [{ order, d: [[prop, value, priority]] }], var() resolved
// on the target (lib/fill-state-code.mjs).
// Returns { [targetId]: [{ selector, tokens: [{ i, text, host }], code? }] }.
export function stateCombos( [ jobs, rows, resolveSrc, hostAttr ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const res = rows.map( ( r ) => ( { i: r.i, re: new RegExp( r.src, 'g' ) } ) );
	const parts = [];
	const unreachable = new Set( rows.filter( ( r ) => 'unreachable' === r.reach ).map( ( r ) => r.i ) );
	const ruleDecls = new Map();
	let ruleOrder = 0;
	const splitTop = ( sel ) => {
		const out = [];
		let depth = 0;
		let start = 0;
		for ( let k = 0; k < sel.length; k++ ) {
			const ch = sel[ k ];
			depth += '([' .includes( ch ) ? 1 : ')]'.includes( ch ) ? -1 : 0;
			if ( ',' === ch && 0 === depth ) {
				out.push( sel.slice( start, k ).trim() );
				start = k + 1;
			}
		}
		out.push( sel.slice( start ).trim() );
		return out;
	};
	// A nested rule's selector is resolved against its parent's: `&` stands for the parent, and a nested selector with
	// no `&` is a descendant of it.
	const nest = ( sel, parent ) => {
		if ( ! parent ) {
			return sel;
		}
		return sel.includes( '&' ) ? sel.replaceAll( '&', `:is(${ parent })` ) : `:is(${ parent }) ${ sel }`;
	};
	// Whether position `at` sits inside a bracket whose opener is preceded by `fn` (`:not` or `:has`), at any depth:
	// an `:is( … )` between the two is walked past, so `.b:not(:is(:hover))` is inside `:not`.
	const enclosedBy = ( sel, at, fn ) => {
		let depth = 0;
		for ( let k = at - 1; k >= 0; k-- ) {
			depth += ')' === sel[ k ] ? 1 : '(' === sel[ k ] ? -1 : 0;
			if ( depth < 0 ) {
				if ( fn.test( sel.slice( 0, k ) ) ) {
					return true;
				}
				depth = 0;
			}
		}
		return false;
	};
	// `:is()` and `:where()` list alternatives: `.a:is(:hover, :focus-visible)` is a hover look and a focus look, never
	// one look needing both, so each argument becomes its own part, wrapped in the function it came from (`:where()`
	// keeps counting nothing toward the part's specificity). Inside `:not()` or `:has()` the list is not split: the
	// alternatives of `:not(:is(.x, .y))` are not alternatives of the look.
	const alternatives = ( sel, budget = 32 ) => {
		const re = /:(?:is|where)\(/g;
		let m = re.exec( sel );
		while ( m && enclosedBy( sel, m.index, /:(?:not|has)$/ ) ) {
			m = re.exec( sel );
		}
		if ( ! m ) {
			return [ sel ];
		}
		const open = m.index + m[ 0 ].length;
		let depth = 1;
		let k = open;
		const cuts = [];
		for ( ; k < sel.length && depth; k++ ) {
			const ch = sel[ k ];
			depth += '([' .includes( ch ) ? 1 : ')]'.includes( ch ) ? -1 : 0;
			if ( ',' === ch && 1 === depth ) {
				cuts.push( k );
			}
		}
		const close = k - 1;
		const args = [ open, ...cuts.map( ( c ) => c + 1 ) ].map( ( s, j ) => sel.slice( s, j < cuts.length ? cuts[ j ] : close ).trim() );
		const head = sel.slice( 0, m.index );
		const tail = sel.slice( close + 1 );
		const fn = m[ 0 ].slice( 0, -1 );
		// One argument: keep it, and expand what follows.
		if ( 1 === args.length ) {
			return alternatives( tail, budget ).map( ( t ) => `${ head }${ fn }(${ args[ 0 ] })${ t }` );
		}
		return args.slice( 0, budget ).flatMap( ( a ) => alternatives( `${ head }${ fn }(${ a })${ tail }`, budget ) ).slice( 0, budget );
	};
	const walk = ( list, parent = null ) => {
		for ( const rule of list ) {
			if ( rule.media && ! matchMedia( rule.media.mediaText ).matches ) {
				continue;
			}
			let own = parent;
			if ( rule.selectorText ) {
				own = splitTop( rule.selectorText ).map( ( p ) => nest( p, parent ) ).join( ', ' );
				const d = rule.style ? Array.from( rule.style ).map( ( p ) => [ p, rule.style.getPropertyValue( p ), rule.style.getPropertyPriority( p ) ] ) : [];
				ruleOrder++;
				splitTop( own ).flatMap( ( p ) => alternatives( p ) ).forEach( ( p ) => {
					parts.push( p );
					ruleDecls.set( p, [ ...( ruleDecls.get( p ) || [] ), { order: ruleOrder, d } ] );
				} );
			}
			if ( rule.cssRules ) {
				walk( rule.cssRules, own );
			}
		}
	};
	for ( const sheet of document.styleSheets ) {
		try {
			walk( sheet.cssRules );
		} catch {
			// A cross-origin sheet cannot be read; the draft's own styles are same-origin.
		}
	}
	// The selector with its state tokens taken out. A token that was a whole compound (`.x :hover`, `.a > :checked`)
	// leaves the universal selector, so the combinators keep their meaning; one inside a compound just goes.
	const strip = ( sel, hits ) => {
		let out = sel;
		[ ...hits ].sort( ( a, b ) => b.at - a.at ).forEach( ( h ) => ( out = `${ out.slice( 0, h.at ) }\u0000${ out.slice( h.at + h.text.length ) }` ) );
		return out.replace( /\u0000+/g, ( m, at, s ) => ( /^$|[\s>+~(,]$/.test( s.slice( Math.max( 0, at - 1 ), at ) ) && /^$|^[\s>+~),]/.test( s.slice( at + m.length, at + m.length + 1 ) ) ? '*' : '' ) ).trim();
	};
	// A token inside :not( … ) says "not in that state": it is not a state to enter.
	const negated = ( sel, at ) => enclosedBy( sel, at, /:not$/ );
	// Where the compound holding position `from` ends: the first combinator outside every bracket, with the depth counted
	// from the selector's start, so a token inside `:is( … )` ends at its own compound, not at the selector's end.
	const compoundEnd = ( sel, from ) => {
		let depth = 0;
		for ( let k = 0; k < from; k++ ) {
			depth += '([' .includes( sel[ k ] ) ? 1 : ')]'.includes( sel[ k ] ) ? -1 : 0;
		}
		for ( let k = from; k < sel.length; k++ ) {
			const ch = sel[ k ];
			depth += '([' .includes( ch ) ? 1 : ')]'.includes( ch ) ? -1 : 0;
			if ( 0 === depth && /[\s>+~]/.test( ch ) ) {
				return k;
			}
		}
		return sel.length;
	};
	// A token inside :has( … ) is a state of a descendant the selector only tests for: its host is not on the target's
	// ancestor chain, so it is listed, never entered on the wrong element.
	const insideHas = ( sel, at ) => {
		let depth = 0;
		for ( let k = at - 1; k >= 0; k-- ) {
			depth += ')' === sel[ k ] ? 1 : '(' === sel[ k ] ? -1 : 0;
			if ( depth < 0 && /:has$/.test( sel.slice( 0, k ) ) ) {
				return true;
			}
		}
		return false;
	};
	// What does not depend on the target, worked out once per part: its tokens, the selector they leave, and each
	// token's host selector. A part that leaves nothing but the universal selector (`[hidden]{display:none}`, a bare
	// `:disabled`) is a page-wide utility, not a look of any one element, so it is skipped.
	const analysed = [];
	for ( const full of new Set( parts ) ) {
		// A trailing pseudo-element (`.card:hover::after`) is cut off before matching: the part names the element that
		// carries it, and the look is the pseudo-element's own.
		const pm = /::?(before|after|marker|placeholder)$/.exec( full );
		const part = pm ? full.slice( 0, pm.index ) : full;
		const pseudo = pm ? `::${ pm[ 1 ] }` : null;
		const hits = [];
		for ( const { i, re } of res ) {
			re.lastIndex = 0;
			for ( let m; ( m = re.exec( part ) ); ) {
				// One occurrence counts once: the first row that names it (rows are ordered specific first).
				if ( ! hits.some( ( h ) => h.at === m.index ) && ! negated( part, m.index ) ) {
					hits.push( { i, at: m.index, text: m[ 0 ] } );
				}
			}
		}
		if ( ! hits.length ) {
			continue;
		}
		const stripped = strip( part, hits );
		if ( ! /[.#[]|(^|[\s>+~(])[a-z]/i.test( stripped.replace( /:is\(\*\)/g, '' ) ) ) {
			continue;
		}
		const hostOf = hits.map( ( h ) => ( insideHas( part, h.at ) ? null : strip( part.slice( 0, compoundEnd( part, h.at ) ), hits.filter( ( x ) => x.at < compoundEnd( part, h.at ) ) ) ) );
		// The pseudo-element left in the selector: `matches()` never matches one, so the element is matched without it.
		const tail = /::[a-z-]+(\([^)]*\))?$/.exec( stripped );
		analysed.push( { part, full, pseudo, hits, stripped: tail ? stripped.slice( 0, tail.index ) || '*' : stripped, hostOf, unreadable: !! tail } );
	}
	const out = {};
	let n = 0;
	for ( const job of jobs ) {
		// A target a state reveals (a popover, a dropdown panel) is hidden at rest, and a string finder resolves only
		// visible elements, so it falls back to the first match; a draft identity (tpl) finder never filters by visibility.
		const el = resolve( job.finder ) || ( 'string' === typeof job.finder ? document.querySelector( job.finder ) : null );
		if ( ! el ) {
			continue;
		}
		for ( const { part, full, pseudo, hits, stripped, hostOf, unreadable } of analysed ) {
			let matches = false;
			try {
				matches = el.matches( stripped );
			} catch {
				continue;
			}
			if ( ! matches ) {
				continue;
			}
			if ( unreadable ) { // a trailing pseudo-element no browser reads (`::selection`): reported, never dropped
				( out[ job.id ] ??= [] ).push( { selector: full, tokens: [], unreadable: 'pseudo-element not readable' } );
				continue;
			}
			const tokens = hits.map( ( h, k ) => {
				let host = null;
				try {
					host = null === hostOf[ k ] ? null : el.closest( hostOf[ k ] );
				} catch {
					host = null;
				}
				if ( host && ! host.hasAttribute( hostAttr ) ) {
					host.setAttribute( hostAttr, String( ++n ) );
				}
				return { i: h.i, text: h.text, host: host ? host.getAttribute( hostAttr ) : null, inHas: null === hostOf[ k ] };
			} );
			const entry = { selector: full, tokens, ...( pseudo ? { pseudo } : {} ) };
			if ( hits.some( ( h ) => unreachable.has( h.i ) ) || tokens.some( ( t ) => null === t.host ) ) {
				const style = getComputedStyle( el );
				const plain = ( v ) => {
					let text = v;
					for ( let k = 0; k < 5 && /var\(/.test( text ); k++ ) {
						text = text.replace( /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, ( m, name, fallback ) => style.getPropertyValue( name ).trim() || ( fallback || '' ).trim() );
					}
					return text;
				};
				entry.code = ( ruleDecls.get( full ) || [] ).map( ( r ) => ( { order: r.order, d: r.d.map( ( [ p, v, i ] ) => [ p, plain( v ), i ] ) } ) );
			}
			( out[ job.id ] ??= [] ).push( entry );
		}
	}
	return out;
}
