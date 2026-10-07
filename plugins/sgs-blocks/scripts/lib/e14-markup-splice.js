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

/** Index of the argument of a call (arguments text starts at `base`) that holds `pos`, with the split pieces. */
function argumentAt( argsText, base, pos, splitTopLevel ) {
	const pieces = splitTopLevel( argsText, ',' );
	let off = 0;
	for ( let i = 0; i < pieces.length; i++ ) {
		const end = off + pieces[ i ].length;
		if ( pos - base >= off && pos - base <= end ) {
			return { index: i, pieces };
		}
		off = end + 1;
	}
	return { index: -1, pieces };
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

	/** Start of the statement holding `pos` (after the last `;`, `{` or `}` at bracket depth 0). */
	const statementStart = ( fileIdx, from, pos ) => {
		const src = masked[ fileIdx ];
		let depth = 0;
		let start = from;
		for ( let i = from; i < pos; i++ ) {
			const ch = src[ i ];
			if ( '(['.includes( ch ) ) {
				depth++;
			} else if ( ')]'.includes( ch ) ) {
				depth = Math.max( 0, depth - 1 );
			} else if ( 0 === depth && ';{}'.includes( ch ) ) {
				start = i + 1;
			}
		}
		return start;
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

	/** Innermost element of the file open at `pos` whose open tag lies at or after `minPos`. */
	const containing = ( fileIdx, pos, minPos, limit ) => {
		let best = -1;
		for ( const i of perFile[ fileIdx ] ) {
			const inst = instances[ i ];
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
		return -1 === ph ? [] : containing( fileIdx, base + ph, base, limit );
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

	/** Where every later read of `$name` lands (assignments TO the name are not reads). */
	const usesOf = ( fileIdx, name, from, to, depth, seen ) => {
		const out = [];
		const re  = new RegExp( '\\$' + name + '\\b(?!\\s*\\.?=(?![=>]))', 'g' );
		const src = masked[ fileIdx ].slice( 0, to );
		re.lastIndex = from;
		let m;
		while ( ( m = re.exec( src ) ) !== null ) {
			out.push( ...resolveRef( fileIdx, m.index, depth + 1, seen ) );
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
		const fn    = fnAt( fileIdx, pos );
		const from  = fn ? fn.bodyStart + 1 : 0;
		const limit = fn ? fn.bodyEnd : masked[ fileIdx ].length;
		for ( const call of enclosingCalls( fileIdx, from, pos ) ) {
			if ( SPRINTF_FN.has( call.name ) ) {
				return viaSprintf( fileIdx, call, pos, limit );
			}
			const callee = byName.get( call.name );
			if ( callee ) {
				return viaParameter( fileIdx, call, pos, callee, depth, seen );
			}
		}
		const stmtStart = statementStart( fileIdx, from, pos );
		const inside    = containing( fileIdx, pos, stmtStart, limit );
		if ( inside.length ) {
			return inside;
		}
		const stmtEnd = statementEnd( fileIdx, pos, limit );
		const stmt    = masked[ fileIdx ].slice( stmtStart, stmtEnd );
		const assign  = /^\s*\$(\w+)\s*\.?=(?![=>])/.exec( stmt );
		if ( assign && fn ) {
			return usesOf( fileIdx, assign[ 1 ], stmtEnd, fn.bodyEnd, depth, seen );
		}
		if ( fn && /^\s*return\b/.test( stmt ) ) {
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

	// A function with one landing element is placed in place; each further
	// landing element gets its own copy of the function's elements.
	for ( const { roots, parents } of placements ) {
		for ( const r of roots ) {
			instances[ r ].parent = parents[ 0 ];
		}
	}
	for ( const { roots, parents } of placements ) {
		const members = instances.map( ( inst, i ) => i ).filter( ( i ) => underRoot( i, roots ) );
		for ( const parent of parents.slice( 1 ) ) {
			const copy = new Map();
			for ( const i of members ) {
				const inst = instances[ i ];
				copy.set( i, instances.length );
				instances.push( { ...inst, classes: new Set( inst.classes ), parent: roots.includes( i ) ? parent : copy.get( inst.parent ) } );
			}
		}
	}
}

module.exports = { spliceFragments, placeholderOffset, maskStrings };
