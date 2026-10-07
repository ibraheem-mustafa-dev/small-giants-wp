'use strict';

/**
 * E14 markup splice (triage section 7, gap 13).
 *
 * The element model reads literal tags from each PHP file with one tag stack per
 * file, so markup a function builds and RETURNS has no parent: its outermost
 * elements sit at the top of the stack. The caller puts that string inside an
 * element somewhere else, and the model cannot see the nesting. This module finds
 * where each call's result lands and gives the function's outermost elements that
 * parent. The text can be assembled in any way (a variable, a concatenation, a
 * wrapper function); only the point where it lands matters.
 *
 * A call's result lands in the first of these that applies:
 *   1. an argument of sprintf()/printf(): the element holding that argument's
 *      `%N$s` (or Nth plain `%s`) slot in the template;
 *   2. an argument of another function of the block: the element holding that
 *      function's parameter, wherever the function uses it;
 *   3. a concatenation inside one literal element, in the same statement:
 *      `'<summary>' . $inner . '</summary>'`;
 *   4. a variable (`$x = call() . …`): every later use of `$x` in the function,
 *      under the same rules;
 *   5. the function's return value: wherever its own callers put the result.
 * Anything else leaves the elements unplaced, and a row that depends on them
 * stays CANNOT-RESOLVE. A tag opened in an EARLIER statement never counts, which
 * keeps a statement-by-statement string builder from adopting unrelated markup.
 *
 * A function called from several elements gets one copy of its elements per
 * element, so each copy reads under its own parent.
 */

const MAX_HOPS   = 6;
const SPRINTF_FN = new Set( [ 'sprintf', 'printf' ] );
// Functions the block does not define that hand their argument's markup through
// unchanged, so the call lands where their own result lands. Any other unknown
// function may drop or rewrite it, which leaves the call unplaced.
const TRANSPARENT_CALLS = new Set( [ 'esc_html', 'esc_attr', 'esc_textarea', 'wp_kses_post', 'wp_kses', 'trim', 'ltrim', 'rtrim', 'strval', 'implode', 'join', 'array', 'return', 'echo', 'print' ] );
const MAX_COPY_MEMBERS = 400;
const PLACEHOLDER_RE = /%%|%(?:(\d+)\$)?[-+0-9.' ]*[a-zA-Z]/g;

/** `src` with the inside of every quoted string blanked (same length), so brackets and `;` in a string are inert. */
function maskStrings( src, skipQuoted ) {
	let out = '';
	for ( let i = 0; i < src.length; i++ ) {
		const ch = src[ i ];
		if ( "'" === ch || '"' === ch ) {
			const end = skipQuoted( src, i );
			out += ch + ' '.repeat( Math.max( 0, end - i - 2 ) ) + ( end - i >= 2 ? ch : '' );
			i = end - 1;
		} else {
			out += ch;
		}
	}
	return out;
}

/** Offset of the `n`th argument's placeholder in `template` (numbered `%n$s`, or the nth plain one), or -1. */
function placeholderOffset( template, n ) {
	let plain = 0;
	for ( const m of template.matchAll( PLACEHOLDER_RE ) ) {
		if ( '%%' === m[ 0 ] ) {
			continue;
		}
		plain++;
		if ( ( m[ 1 ] ? Number( m[ 1 ] ) : plain ) === n ) {
			return m.index;
		}
	}
	return -1;
}

/** Index of the argument of a call (arguments text starts at `base`) that holds `pos`, its start offset from `base`, and the split pieces. */
function argumentAt( argsText, base, pos, splitTopLevel ) {
	const pieces = splitTopLevel( argsText, ',' );
	let off = 0;
	for ( let i = 0; i < pieces.length; i++ ) {
		const end = off + pieces[ i ].length;
		if ( pos - base >= off && pos - base <= end ) {
			return { index: i, start: off, pieces };
		}
		off = end + 1;
	}
	return { index: -1, start: 0, pieces };
}

/**
 * Place the outermost elements of every function that returns markup under the
 * element each of its calls lands in. Mutates `instances` in place.
 *
 * @param {Object[]} instances Markup-model instances; each carries `fileIdx`, `pos`, `closePos`, `parent`.
 * @param {Object[]} files     Block PHP files ({ file, src }), in the model's order.
 * @param {Object}   deps      The gate's own parsers: collectPhpFunctionParams, collectPhpCallSites,
 *                             splitTopLevel, matchBracket, skipQuoted.
 */
function spliceFragments( instances, files, deps ) {
	const { collectPhpFunctionParams, collectPhpCallSites, splitTopLevel, matchBracket, skipQuoted } = deps;
	const masked   = files.map( ( f ) => maskStrings( f.src, skipQuoted ) );
	const fns      = collectPhpFunctionParams( files ).filter( ( fn ) => fn.bodyStart >= 0 && fn.bodyEnd > fn.bodyStart );
	const byName   = new Map();
	for ( const fn of fns ) {
		byName.set( fn.name.toLowerCase(), byName.has( fn.name.toLowerCase() ) ? null : fn ); // null: two definitions, ambiguous
	}
	const perFile = files.map( () => [] );
	instances.forEach( ( inst, i ) => perFile[ inst.fileIdx ].push( i ) );

	const fnAt = ( fileIdx, pos ) => {
		let best = null;
		for ( const fn of fns ) {
			if ( fn.fileIdx === fileIdx && fn.bodyStart < pos && pos < fn.bodyEnd && ( ! best || fn.bodyStart > best.bodyStart ) ) {
				best = fn;
			}
		}
		return best;
	};

	/**
	 * Start of the statement holding `pos`: after the last `;`, `{` or `}` (also inside a
	 * call's brackets, where only a closure body has them) or PHP open tag. `nested` is true
	 * when that boundary sat inside brackets, i.e. the statement is a closure body's.
	 */
	const statementStart = ( fileIdx, from, pos ) => {
		const src = masked[ fileIdx ];
		let depth  = 0;
		let start  = from;
		let nested = false;
		for ( let i = from; i < pos; i++ ) {
			const ch = src[ i ];
			if ( '(['.includes( ch ) ) {
				depth++;
			} else if ( ')]'.includes( ch ) ) {
				depth = Math.max( 0, depth - 1 );
			} else if ( ';{}'.includes( ch ) ) {
				start  = i + 1;
				nested = depth > 0;
			} else if ( '>' === ch && '?' === src[ i - 1 ] ) {
				start  = i + 1; // `?>` ends a statement too: the HTML after it is a new run of markup
				nested = false;
			} else if ( '<' === ch && '?' === src[ i + 1 ] ) {
				start  = i + ( src.startsWith( '<?php', i ) ? 5 : ( src.startsWith( '<?=', i ) ? 3 : 2 ) ); // code starts here, after the HTML
				nested = false;
			}
		}
		return { start, nested };
	};

	const statementEnd = ( fileIdx, from, limit ) => {
		const src = masked[ fileIdx ];
		let depth = 0;
		for ( let i = from; i < limit; i++ ) {
			const ch = src[ i ];
			if ( '([{'.includes( ch ) ) {
				depth++;
			} else if ( ')]}'.includes( ch ) ) {
				depth--;
			} else if ( ';' === ch && depth <= 0 ) {
				return i;
			}
		}
		return limit;
	};

	/**
	 * Innermost element of the file open at `pos` whose open tag lies at or after `minPos`
	 * (an empty list when there is none). A position inside an element's own open tag (an
	 * attribute value) is no element's child, so the answer is null: nothing outside it counts.
	 */
	const containing = ( fileIdx, pos, minPos, limit ) => {
		let best = -1;
		for ( const i of perFile[ fileIdx ] ) {
			const inst = instances[ i ];
			if ( inst.pos < pos && pos < inst.tagEnd ) {
				return null;
			}
			if ( inst.pos >= pos || inst.pos < minPos ) {
				continue;
			}
			if ( Math.min( inst.closePos, limit ) > pos && ( best < 0 || inst.pos > instances[ best ].pos ) ) {
				best = i;
			}
		}
		return best < 0 ? [] : [ best ];
	};

	/** Calls whose argument list holds `pos`, innermost first. */
	const enclosingCalls = ( fileIdx, from, pos ) => {
		const src = masked[ fileIdx ];
		const re  = /([A-Za-z_]\w*)\s*\(/g;
		const out = [];
		re.lastIndex = from;
		let m;
		while ( ( m = re.exec( src ) ) !== null && m.index < pos ) {
			const open = m.index + m[ 0 ].length - 1;
			if ( open >= pos ) {
				break;
			}
			if ( /(?:->|::)\s*$/.test( src.slice( Math.max( 0, m.index - 4 ), m.index ) ) ) {
				continue; // a method or static call that shares a function's name
			}
			const close = matchBracket( src, open );
			if ( close - 1 > pos ) {
				out.push( { name: m[ 1 ].toLowerCase(), open, close: close - 1 } );
			}
		}
		return out.sort( ( a, b ) => b.open - a.open );
	};

	let resolveRef;

	const viaSprintf = ( fileIdx, call, pos, limit ) => {
		const src  = files[ fileIdx ].src;
		const base = call.open + 1;
		const { index, pieces } = argumentAt( src.slice( base, call.close ), base, pos, splitTopLevel );
		if ( index < 1 ) {
			return [];
		}
		const ph = placeholderOffset( pieces[ 0 ], index );
		return -1 === ph ? [] : ( containing( fileIdx, base + ph, base, limit ) || [] );
	};

	const viaParameter = ( fileIdx, call, pos, callee, depth, seen ) => {
		const src  = files[ fileIdx ].src;
		const base = call.open + 1;
		const { index } = argumentAt( src.slice( base, call.close ), base, pos, splitTopLevel );
		const param = index >= 0 ? callee.params[ index ] : null;
		if ( ! param || ! param.name || param.variadic ) {
			return [];
		}
		return usesOf( callee.fileIdx, param.name, callee.bodyStart + 1, callee.bodyEnd, depth, seen );
	};

	/** Net `{` minus `}` between two offsets: above zero means the second offset sits in a block opened after the first. */
	const braceNet = ( fileIdx, a, b ) => {
		let net = 0;
		for ( const ch of masked[ fileIdx ].slice( a, b ) ) {
			net += '{' === ch ? 1 : ( '}' === ch ? -1 : 0 );
		}
		return net;
	};

	/**
	 * Where every later read of `$name` lands: up to the end of the next plain reassignment
	 * (`$name = …` holds a different value from there; its own right-hand side still reads the
	 * old one, and a reassignment inside a branch opened after the first assignment does not end
	 * the old value), skipping assignments TO the name (`.=` appends to the same value, so it
	 * stays) and comparisons (`'' !== $name`).
	 */
	const usesOf = ( fileIdx, name, from, to, depth, seen ) => {
		const out    = [];
		const whole  = masked[ fileIdx ];
		const reset  = new RegExp( '\\$' + name + '\\s*=(?![=>])', 'g' );
		reset.lastIndex = from;
		const rm     = reset.exec( whole );
		const cut    = rm && rm.index < to && braceNet( fileIdx, from, rm.index ) <= 0 ? statementEnd( fileIdx, rm.index, to ) : to;
		const src    = whole.slice( 0, cut );
		const re     = new RegExp( '\\$' + name + '\\b(?!\\s*\\.?=(?![=>]))', 'g' );
		re.lastIndex = from;
		let m;
		while ( ( m = re.exec( src ) ) !== null ) {
			const comparison = /(?:===?|!==?|<>)\s*$/.test( src.slice( Math.max( 0, m.index - 6 ), m.index ) ) || /^\s*(?:===?|!==?|<>)/.test( src.slice( re.lastIndex ) );
			if ( ! comparison ) {
				out.push( ...resolveRef( fileIdx, m.index, depth + 1, seen ) );
			}
		}
		return out;
	};

	/** Parents the value written at `pos` (a call, or a read of a variable) lands under. */
	resolveRef = ( fileIdx, pos, depth, seen ) => {
		const key = fileIdx + ':' + pos;
		if ( depth > MAX_HOPS || seen.has( key ) ) {
			return [];
		}
		seen.add( key );
		const fn        = fnAt( fileIdx, pos );
		const from      = fn ? fn.bodyStart + 1 : 0;
		const limit     = fn ? fn.bodyEnd : masked[ fileIdx ].length;
		const { start: stmtStart, nested } = statementStart( fileIdx, from, pos );
		const stmtEnd = statementEnd( fileIdx, pos, limit );
		const stmt    = masked[ fileIdx ].slice( stmtStart, stmtEnd );
		for ( const call of enclosingCalls( fileIdx, stmtStart, pos ) ) {
			// An element the argument itself builds around the call is where it lands, whatever the call does with it.
			const { start: argStart } = argumentAt( files[ fileIdx ].src.slice( call.open + 1, call.close ), call.open + 1, pos, splitTopLevel );
			const literal = containing( fileIdx, pos, call.open + 1 + argStart, limit );
			if ( ! literal ) {
				return [];
			}
			if ( literal.length ) {
				return literal;
			}
			if ( SPRINTF_FN.has( call.name ) ) {
				return viaSprintf( fileIdx, call, pos, limit );
			}
			if ( byName.has( call.name ) ) {
				const callee = byName.get( call.name );
				return callee ? viaParameter( fileIdx, call, pos, callee, depth, seen ) : []; // null: defined twice
			}
			if ( ! TRANSPARENT_CALLS.has( call.name ) ) {
				return []; // a function the block does not define may do anything with its argument
			}
		}
		// Output (`echo`, `print`, `<?=`) goes into whatever element is open at that point of the template.
		const isOutput = /^\s*(?:echo|print)\b/.test( stmt ) || '<?=' === masked[ fileIdx ].slice( stmtStart - 3, stmtStart );
		const inside   = containing( fileIdx, pos, isOutput ? from : stmtStart, limit );
		if ( ! inside ) {
			return [];
		}
		if ( inside.length ) {
			return inside;
		}
		const assign = /^\s*\$(\w+)\s*\.?=(?![=>])/.exec( stmt );
		if ( assign && fn ) {
			return usesOf( fileIdx, assign[ 1 ], stmtEnd, fn.bodyEnd, depth, seen );
		}
		if ( fn && ! nested && /^\s*return\b/.test( stmt ) ) {
			const sites = collectPhpCallSites( files, [ fn ] ).get( fn ) || [];
			return sites.flatMap( ( s ) => resolveRef( s.fileIdx, s.pos, depth + 1, seen ) );
		}
		return [];
	};

	const rootsOf = ( fn ) => instances
		.map( ( inst, i ) => ( inst.fileIdx === fn.fileIdx && -1 === inst.parent && inst.pos > fn.bodyStart && inst.pos < fn.bodyEnd ? i : -1 ) )
		.filter( ( i ) => i >= 0 );

	const underRoot = ( i, roots ) => {
		for ( let p = i; p >= 0; p = instances[ p ].parent ) {
			if ( roots.includes( p ) ) {
				return true;
			}
		}
		return false;
	};

	const placements = [];
	for ( const fn of fns ) {
		const roots = rootsOf( fn );
		if ( ! roots.length ) {
			continue;
		}
		const sites   = collectPhpCallSites( files, [ fn ] ).get( fn ) || [];
		const parents = new Set();
		for ( const s of sites ) {
			for ( const p of resolveRef( s.fileIdx, s.pos, 0, new Set() ) ) {
				if ( ! underRoot( p, roots ) ) {
					parents.add( p );
				}
			}
		}
		if ( parents.size ) {
			placements.push( { roots, parents: [ ...parents ] } );
		}
	}

	// A function with one landing element is placed in place; each further landing
	// element gets its own copy of the function's elements, unless the function holds
	// more than MAX_COPY_MEMBERS (an icon set): that one stays under its first element.
	// A landing element that sits under the function's own elements (two functions
	// returning each other's markup) would make a parent cycle, so it is skipped.
	const placed = [];
	for ( const { roots, parents } of placements ) {
		const usable = parents.filter( ( p ) => ! underRoot( p, roots ) );
		if ( ! usable.length ) {
			continue;
		}
		for ( const r of roots ) {
			instances[ r ].parent = usable[ 0 ];
		}
		placed.push( { roots, parents: usable } );
	}
	for ( const { roots, parents } of placed ) {
		const members = instances.map( ( inst, i ) => i ).filter( ( i ) => underRoot( i, roots ) );
		if ( members.length > MAX_COPY_MEMBERS ) {
			continue;
		}
		for ( const parent of parents.slice( 1 ) ) {
			const copy = new Map( members.map( ( i, k ) => [ i, instances.length + k ] ) );
			for ( const i of members ) {
				const inst = instances[ i ];
				instances.push( { ...inst, classes: new Set( inst.classes ), parent: roots.includes( i ) ? parent : ( copy.get( inst.parent ) ?? inst.parent ) } );
			}
		}
	}
}

module.exports = { spliceFragments, placeholderOffset, maskStrings };
