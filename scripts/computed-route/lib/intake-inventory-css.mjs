// The re-derived inventory's CSS reading (Spec 48 FR-48-25, METHOD.md §5.4): the transition and animation shorthands
// split per property, the rule blocks of a helmet <style> with the @media each sits in, and a stamped-template
// element matcher for the simple selectors draft code queries with. Inputs come from the census (the stamped
// template's attributes and helmet style bodies, lib/intake-census-template.mjs), never from the .dc.html text.
import { cssDecls } from './intake-census-logic.mjs';

const EASING = /^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|cubic-bezier\(.*\)|steps\(.*\)|linear\(.*\))$/;
const TIME = /^(-?\d*\.?\d+)(ms|s)$/;
const ANIM_KEYWORDS = /^(normal|reverse|alternate|alternate-reverse|none|forwards|backwards|both|running|paused|infinite)$/;

export { cssDecls };

// A CSS time in ms, or null.
export const ms = ( t ) => {
	const m = TIME.exec( String( t ).trim() );
	return m ? Number( m[ 1 ] ) * ( 's' === m[ 2 ] ? 1000 : 1 ) : null;
};

// Splits at top-level commas (not inside brackets).
export function splitTop( s, sep = ',' ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const c of String( s ) ) {
		depth += '(' === c ? 1 : ')' === c ? -1 : 0;
		if ( c === sep && 0 === depth ) {
			out.push( cur.trim() );
			cur = '';
		} else {
			cur += c;
		}
	}
	if ( cur.trim() ) {
		out.push( cur.trim() );
	}
	return out;
}

const tokens = ( s ) => splitTop( s, ' ' ).filter( Boolean );

// A transition shorthand per property: [{ property, duration_ms, delay_ms, easing }] (CSS defaults: all, 0s, ease).
// A value holding a `{{ }}` hole is one entry with the raw value as its property.
export function parseTransition( value ) {
	if ( String( value ).includes( '{{' ) ) {
		return [ { property: 'state-bound', raw: value, duration_ms: null, delay_ms: null, easing: null } ];
	}
	return splitTop( value ).map( ( item ) => {
		const out = { property: 'all', duration_ms: 0, delay_ms: 0, easing: 'ease' };
		let times = 0;
		for ( const t of tokens( item ) ) {
			if ( null !== ms( t ) ) {
				out[ 0 === times++ ? 'duration_ms' : 'delay_ms' ] = ms( t );
			} else if ( EASING.test( t ) ) {
				out.easing = t;
			} else {
				out.property = t;
			}
		}
		return out;
	} );
}

// An animation shorthand: [{ name, duration_ms, delay_ms, easing, iterations, direction, fill }]. The value may be the
// source text of a string literal in a style object (`'mmMarquee 24s linear infinite'`): its quotes are not tokens.
export function parseAnimation( value ) {
	return splitTop( value ).map( ( item ) => {
		const out = { name: null, duration_ms: 0, delay_ms: 0, easing: 'ease', iterations: 1, direction: 'normal', fill: 'none' };
		let times = 0;
		for ( const t of tokens( item.replace( /[{}'"`]/g, ' ' ).replace( /\s*!important\s*$/, '' ) ) ) {
			if ( null !== ms( t ) ) {
				out[ 0 === times++ ? 'duration_ms' : 'delay_ms' ] = ms( t );
			} else if ( EASING.test( t ) ) {
				out.easing = t;
			} else if ( 'infinite' === t ) {
				out.iterations = 'infinite';
			} else if ( /^\d*\.?\d+$/.test( t ) ) {
				out.iterations = Number( t );
			} else if ( /^(normal|reverse|alternate|alternate-reverse)$/.test( t ) ) {
				out.direction = t;
			} else if ( /^(forwards|backwards|both)$/.test( t ) ) {
				out.fill = t;
			} else if ( ! ANIM_KEYWORDS.test( t ) || 'none' === t ) {
				out.name = t;
			}
		}
		return out;
	} );
}

// The rule blocks of a stylesheet text: [{ media (the @media condition around it, or null), selector, decls }];
// @keyframes and @font-face bodies are skipped. Comments are removed first.
export function cssBlocks( text ) {
	const src = String( text || '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
	const out = [];
	const walk = ( from, to, media ) => {
		let i = from;
		while ( i < to ) {
			const open = src.indexOf( '{', i );
			if ( open < 0 || open >= to ) {
				return;
			}
			const prelude = src.slice( i, open ).trim();
			let depth = 1;
			let j = open + 1;
			for ( ; j < to && depth; j++ ) {
				depth += '{' === src[ j ] ? 1 : '}' === src[ j ] ? -1 : 0;
			}
			if ( /^@media/i.test( prelude ) ) {
				walk( open + 1, j - 1, prelude.replace( /^@media\s*/i, '' ) );
			} else if ( /^@(supports|layer|container)/i.test( prelude ) ) {
				walk( open + 1, j - 1, media );
			} else if ( ! prelude.startsWith( '@' ) ) {
				out.push( { media, selector: prelude, decls: cssDecls( src.slice( open + 1, j - 1 ) ) } );
			}
			i = j;
		}
	};
	walk( 0, src.length, null );
	return out;
}

// A selector the browser's selectorText and the source spell differently (`*::before` and `::before`) compared alike.
export const sameSelector = ( a, b ) => {
	const n = ( s ) => String( s ).replace( /\*(?=::?[a-z])/g, '' ).replace( /\s+/g, '' );
	return n( a ) === n( b );
};

// True when a media condition is the reduced-motion query.
export const reducedMotionMedia = ( m ) => /prefers-reduced-motion\s*:\s*reduce/.test( m || '' );

// One compound selector (`tag.class#id[attr="v"]`) as tests, or null when it uses anything else.
function compound( sel ) {
	const re = /([a-z][a-z0-9-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:([~^$*|]?=)"?([^"\]]*)"?)?\]|(\*)/gy;
	const tests = [];
	let m;
	let at = 0;
	while ( at < sel.length && ( re.lastIndex = at, m = re.exec( sel ) ) ) {
		at = re.lastIndex;
		if ( m[ 1 ] ) {
			const tag = m[ 1 ];
			tests.push( ( e ) => e.tag === tag || e.tag === `sc-raw-${ tag }` );
		} else if ( m[ 7 ] ) {
			tests.push( () => true );
		} else if ( m[ 2 ] ) {
			const c = m[ 2 ];
			tests.push( ( e ) => ( attrOf( e, 'class' ) || '' ).split( /\s+/ ).includes( c ) );
		} else if ( m[ 3 ] ) {
			const id = m[ 3 ];
			tests.push( ( e ) => attrOf( e, 'id' ) === id );
		} else if ( m[ 4 ] ) {
			const [ name, op, v ] = [ m[ 4 ], m[ 5 ], m[ 6 ] ];
			tests.push( ( e ) => {
				const x = attrOf( e, name );
				if ( null === x ) {
					return false;
				}
				return ! op || ( '=' === op ? x === v : '^=' === op ? x.startsWith( v ) : '$=' === op ? x.endsWith( v ) : '*=' === op ? x.includes( v ) : '~=' === op ? x.split( /\s+/ ).includes( v ) : x === v || x.startsWith( `${ v }-` ) );
			} );
		}
	}
	return at === sel.length && tests.length ? tests : null;
}

const attrOf = ( e, name ) => e.attrs.find( ( [ a ] ) => a === name )?.[ 1 ] ?? null;

// A selector's compounds, split at combinators outside `[...]` and `(...)`.
function splitCompounds( sel ) {
	const parts = [];
	let depth = 0;
	let cur = '';
	for ( const ch of sel ) {
		if ( '[('.includes( ch ) ) {
			depth++;
		} else if ( '])'.includes( ch ) ) {
			depth = Math.max( 0, depth - 1 );
		}
		if ( ! depth && /[\s>+~]/.test( ch ) ) {
			parts.push( cur );
			cur = '';
		} else {
			cur += ch;
		}
	}
	return [ ...parts, cur ].filter( Boolean );
}

// The stamped elements a selector list matches: { tpl: [n], rule? }. Each selector is matched on its last compound
// only (a descendant or pseudo part is kept as `rule`); a selector with an unsupported part matches nothing.
export function matchSelector( elements, selector ) {
	const tpl = new Set();
	let rule = null;
	for ( const sel of splitTop( selector ) ) {
		const parts = splitCompounds( sel );
		const last = parts[ parts.length - 1 ].replace( /::?[a-z-]+(\(.*\))?$/i, '' );
		if ( parts.length > 1 || last !== parts[ parts.length - 1 ] ) {
			rule = `matched on the last compound of ${ selector }`;
		}
		const tests = compound( last );
		if ( ! tests ) {
			continue;
		}
		elements.filter( ( e ) => ! e.inHelmet && ! /^sc-(if|for|helmet)$/.test( e.tag ) && tests.every( ( t ) => t( e ) ) ).forEach( ( e ) => tpl.add( e.n ) );
	}
	return { tpl: [ ...tpl ], ...( rule ? { rule } : {} ) };
}
