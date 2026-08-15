/**
 * php-kind-consumption.js
 *
 * BRANCH-AWARE CONSUMPTION ANALYSER for the shared container wrapper.
 *
 * THE PROBLEM THIS EXISTS TO SOLVE
 * --------------------------------
 * `class-sgs-container-wrapper.php` reads ~70 distinct attribute keys, but 21
 * sites gate their effect on `$is_section` / `$is_layout` (both derived from
 * the `$kind` argument at :120-121). A naive "is `$attributes['minHeight']`
 * present in the file?" check therefore reports CONSUMED for every consumer —
 * including the `layout`- and `content`-kind blocks for which that value can
 * never reach paint.
 *
 * That naive answer is not a small error. It is the difference between "this
 * control is live everywhere" and "this control is live for 7 of 25 blocks",
 * which is precisely the judgement the wrapper-decomposition census has to make.
 *
 * WHY A PLAIN LINE-CONTAINMENT CHECK IS NOT ENOUGH
 * -----------------------------------------------
 * The value rarely reaches its guard directly. Measured on the live file:
 *
 *     :336  $min_height_obj    = sgs_responsive_normalise_object( $attributes['minHeight'] ?? null );
 *     :337  $min_height        = $min_height_obj['desktop'] ?? '';
 *     :421  $min_height        = $sgs_css_length( $min_height );
 *     :759  if ( $is_section && $min_height && ! $has_responsive_min_height ) {
 *
 * The read at :336 is unguarded; the guard is three hops later. So the analyser
 * propagates taint from each `$attributes['KEY']` read through local variable
 * assignments, and computes the union of the kind-masks of every site the value
 * can reach. Stopping at one hop would mark `minHeight` unguarded and hand back
 * the same confident wrong answer, just more slowly.
 *
 * THE MODEL
 * ---------
 * Every line carries a KIND MASK — the set of `$kind` values under which it can
 * execute. Unguarded lines are the full set. A line inside `if ( $is_section )`
 * is `{section}`; inside `if ( $is_section || $is_layout )`, `{section,layout}`;
 * nested guards INTERSECT. An attribute is CONSUMED under kind K when any site
 * its value reaches has K in its mask.
 *
 * KNOWN LIMITS — deliberately reported, never silently absorbed:
 *   - Taint follows `$var = <expr>` assignments only. A value passed into a
 *     closure and returned is followed to the assignment, not through the
 *     closure body.
 *   - `$is_section` is treated as opaque truth; a guard built from some other
 *     expression that happens to correlate with kind is not recognised.
 *   - Reads through a computed key (`$attributes[ $foo ]`) are not resolvable to
 *     a key name and are reported via `unresolvedComputedReads` so the caller can
 *     surface them rather than count them as absent.
 *
 * @package SGS\Blocks
 */

'use strict';

const ALL_KINDS = Object.freeze( [ 'section', 'layout', 'content' ] );

/**
 * Blank out PHP comments and single-quoted strings, preserving offsets.
 *
 * Same-length replacement keeps every line number and column valid, so a caller
 * can report `file:line` against the ORIGINAL source. Newlines are preserved so
 * line counting still works inside a blanked block comment.
 *
 * Single-quoted strings are preserved, NOT blanked — `$attributes['minHeight']`
 * is the very shape being detected. Double-quoted strings are blanked because
 * they can contain `//` or brace characters that would desync brace matching.
 *
 * @param {string} src Raw PHP source.
 * @return {string} Source of identical length with comments blanked.
 */
function blankPhpComments( src ) {
	const out = src.split( '' );
	let i = 0;
	const n = src.length;

	while ( i < n ) {
		const two = src.slice( i, i + 2 );

		// Line comment: // or #
		if ( two === '//' || src[ i ] === '#' ) {
			while ( i < n && src[ i ] !== '\n' ) {
				out[ i ] = ' ';
				i++;
			}
			continue;
		}

		// Block comment: /* ... */
		if ( two === '/*' ) {
			while ( i < n && src.slice( i, i + 2 ) !== '*/' ) {
				if ( src[ i ] !== '\n' ) {
					out[ i ] = ' ';
				}
				i++;
			}
			// Blank the closing */ too.
			for ( let k = 0; k < 2 && i < n; k++, i++ ) {
				out[ i ] = ' ';
			}
			continue;
		}

		// Single-quoted string — SKIP (kept intact, see docblock).
		if ( src[ i ] === "'" ) {
			i++;
			while ( i < n && src[ i ] !== "'" ) {
				i += src[ i ] === '\\' ? 2 : 1;
			}
			i++;
			continue;
		}

		// Double-quoted string — blank the contents.
		if ( src[ i ] === '"' ) {
			i++;
			while ( i < n && src[ i ] !== '"' ) {
				if ( src[ i ] !== '\n' ) {
					out[ i ] = ' ';
				}
				i += src[ i ] === '\\' ? 2 : 1;
			}
			i++;
			continue;
		}

		i++;
	}

	return out.join( '' );
}

function intersect( a, b ) {
	return a.filter( ( k ) => b.includes( k ) );
}

function union( a, b ) {
	return ALL_KINDS.filter( ( k ) => a.includes( k ) || b.includes( k ) );
}

/**
 * Split an expression on a top-level operator, ignoring bracketed depth.
 *
 * @param {string} expr Expression text.
 * @param {string} op   Two-character operator (`||` or `&&`).
 * @return {string[]} Parts.
 */
function splitTopLevel( expr, op ) {
	const parts = [];
	let depth = 0;
	let start = 0;
	for ( let i = 0; i < expr.length; i++ ) {
		const c = expr[ i ];
		if ( c === '(' || c === '[' ) {
			depth++;
		} else if ( c === ')' || c === ']' ) {
			depth--;
		} else if ( depth === 0 && expr.slice( i, i + 2 ) === op ) {
			parts.push( expr.slice( start, i ) );
			start = i + 2;
			i++;
		}
	}
	parts.push( expr.slice( start ) );
	return parts;
}

/**
 * Kind mask admitted by a boolean EXPRESSION.
 *
 * Evaluated structurally, because the wrapper's guards are real boolean algebra
 * rather than a flat list of flags:
 *   `A || B` → UNION of the two masks   (either branch can make it true)
 *   `A && B` → INTERSECTION              (both must hold)
 *
 * Atoms: `$is_section` → {section}; `$is_layout` → {layout}; a known GUARD
 * VARIABLE → its own derived mask; anything else → all kinds.
 *
 * Negation deliberately does NOT narrow. `! $is_section` is true for two kinds,
 * and inverting a partially-known mask is where a wrong narrowing would silently
 * delete a real consumer from the census. Widening on doubt is the safe error.
 *
 * @param {string}              expr      Expression text.
 * @param {Map<string,string[]>} guardVars Variable → mask it carries.
 * @return {string[]} Kinds admitted.
 */
function maskOfExpr( expr, guardVars = new Map() ) {
	const text = String( expr ).trim();
	if ( text === '' ) {
		return [ ...ALL_KINDS ];
	}

	const ors = splitTopLevel( text, '||' );
	if ( ors.length > 1 ) {
		return ors.reduce(
			( acc, part ) => union( acc, maskOfExpr( part, guardVars ) ),
			[]
		);
	}

	const ands = splitTopLevel( text, '&&' );
	if ( ands.length > 1 ) {
		return ands.reduce(
			( acc, part ) => intersect( acc, maskOfExpr( part, guardVars ) ),
			[ ...ALL_KINDS ]
		);
	}

	let atom = text.trim();
	while ( atom.startsWith( '(' ) && atom.endsWith( ')' ) ) {
		atom = atom.slice( 1, -1 ).trim();
		// Re-enter: the parenthesised body may itself be compound.
		return maskOfExpr( atom, guardVars );
	}

	if ( /^!/.test( atom ) ) {
		return [ ...ALL_KINDS ];
	}
	if ( /^\$is_section\b/.test( atom ) ) {
		return [ 'section' ];
	}
	if ( /^\$is_layout\b/.test( atom ) ) {
		return [ 'layout' ];
	}

	const bare = atom.match( /^\$([A-Za-z_][A-Za-z0-9_]*)\s*$/ );
	if ( bare && guardVars.has( bare[ 1 ] ) ) {
		return [ ...guardVars.get( bare[ 1 ] ) ];
	}

	return [ ...ALL_KINDS ];
}

/**
 * Kept as the condition-level entry point.
 *
 * @param {string}              cond      Condition text.
 * @param {Map<string,string[]>} guardVars Variable → mask it carries.
 * @return {string[]} Kinds admitted.
 */
function maskFromCondition( cond, guardVars = new Map() ) {
	return maskOfExpr( cond, guardVars );
}

/**
 * Does this assignment reduce its RHS to a boolean FLAG?
 *
 * A flag gates; it does not paint. See the BOOLEAN-FLAG CUT-OFF note at the
 * propagation site for the measured case this exists to get right.
 *
 * Detected by the RHS being built from boolean operators/tests and containing no
 * string concatenation (`.`), which is how this file assembles CSS — a line that
 * concatenates is carrying a value, whatever else it does.
 *
 * @param {string} line Source line.
 * @return {boolean} True when the RHS is a boolean flag.
 */
function isBooleanFlagAssignment( line ) {
	const assign = line.match( /^[^=]*=\s*(.*)$/ );
	if ( ! assign ) {
		return false;
	}
	const rhs = assign[ 1 ];
	if ( /\.\s*=|'\s*\.|\.\s*'/.test( rhs ) ) {
		return false; // string/CSS concatenation — a value, not a flag
	}
	if ( splitTopLevel( rhs, '?' ).length > 1 || rhs.includes( '?' ) ) {
		// A ternary SELECTS a value; `$x = ( $is_section || $is_layout ) ? $v : ''`
		// contains `||` but yields a length, not a flag. Treating it as a flag
		// truncated contentWidthTablet/Mobile to "reaches paint under NO kind".
		return false;
	}
	return /(\|\||&&|!==|===|!=|==|\bempty\s*\(|\bisset\s*\()/.test( rhs );
}

/**
 * Find variables that CARRY a kind guard, to a fixpoint.
 *
 * `:427 $has_responsive_min_height = $is_section && ( … );` makes that variable
 * a section-only truth. Every later `if ( $has_responsive_min_height )` is then
 * a section guard too — which is how the whole responsive min-height CSS block
 * at :1606-1614 is gated, with no `$is_*` anywhere in sight.
 *
 * Without this pass the analyser reports `minHeight` as reaching all three
 * kinds. Measured on the live file: this is the difference between the right
 * answer and a confident wrong one.
 *
 * Iterated to a fixpoint because a guard variable may be defined from another
 * guard variable. A variable assigned more than once takes the UNION of its
 * definitions — it can hold any of them at a later read.
 *
 * @param {string[]} lines Comment-blanked source lines.
 * @return {Map<string,string[]>} Variable → mask.
 */
function findGuardVars( lines ) {
	const guardVars = new Map();

	for ( let pass = 0; pass < 5; pass++ ) {
		let changed = false;

		lines.forEach( ( text ) => {
			const def = text.match(
				/^\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]*);/
			);
			if ( ! def ) {
				return;
			}
			const [ , name, rhs ] = def;
			if ( ! /\$is_(section|layout)\b/.test( rhs ) && ! [ ...guardVars.keys() ].some( ( g ) => rhs.includes( '$' + g ) ) ) {
				return;
			}

			// A ternary carries the guard of its CONDITION.
			const ternary = rhs.match( /^([^?]*)\?/ );
			const mask = ternary
				? maskOfExpr( ternary[ 1 ], guardVars )
				: maskOfExpr( rhs, guardVars );

			if ( mask.length === ALL_KINDS.length ) {
				return;
			}

			const prev = guardVars.get( name );
			const next = prev ? union( prev, mask ) : mask;
			if ( ! prev || prev.join() !== next.join() ) {
				guardVars.set( name, next );
				changed = true;
			}
		} );

		if ( ! changed ) {
			break;
		}
	}

	return guardVars;
}

/**
 * Find the index of the brace matching the one at `open`.
 *
 * @param {string} src   Comment-blanked source.
 * @param {number} open  Index of the opening brace.
 * @return {number} Index of the matching brace, or -1.
 */
function matchBrace( src, open ) {
	let depth = 0;
	for ( let i = open; i < src.length; i++ ) {
		if ( src[ i ] === '{' ) {
			depth++;
		} else if ( src[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * Compute a per-line kind mask for the whole file.
 *
 * Two guard shapes contribute:
 *   BLOCK  — `if ( <cond> ) { … }` narrows every line in the braced body.
 *   INLINE — a line containing `$is_section ? …` or `$is_section && …` narrows
 *            that line alone (the value produced there is kind-conditional).
 *
 * @param {string} blanked Comment-blanked source.
 * @return {string[][]} Index i = kinds admitted on line i+1.
 */
function computeLineMasks( blanked, guardVars = null ) {
	const lines = blanked.split( '\n' );
	const masks = lines.map( () => [ ...ALL_KINDS ] );
	const guards = guardVars || findGuardVars( lines );

	const lineOf = ( idx ) => blanked.slice( 0, idx ).split( '\n' ).length;

	// BLOCK guards.
	const ifRe = /\bif\s*\(/g;
	let m;
	while ( ( m = ifRe.exec( blanked ) ) !== null ) {
		const parenOpen = m.index + m[ 0 ].length - 1;
		let depth = 0;
		let parenClose = -1;
		for ( let i = parenOpen; i < blanked.length; i++ ) {
			if ( blanked[ i ] === '(' ) {
				depth++;
			} else if ( blanked[ i ] === ')' ) {
				depth--;
				if ( depth === 0 ) {
					parenClose = i;
					break;
				}
			}
		}
		if ( parenClose === -1 ) {
			continue;
		}

		const cond = blanked.slice( parenOpen + 1, parenClose );
		const mask = maskFromCondition( cond, guards );
		if ( mask.length === ALL_KINDS.length ) {
			continue;
		}

		const braceOpen = blanked.indexOf( '{', parenClose );
		if ( braceOpen === -1 ) {
			continue;
		}
		// Only a brace immediately following the condition opens this if's body.
		if ( blanked.slice( parenClose + 1, braceOpen ).trim() !== '' ) {
			continue;
		}
		const braceClose = matchBrace( blanked, braceOpen );
		if ( braceClose === -1 ) {
			continue;
		}

		const from = lineOf( braceOpen );
		const to = lineOf( braceClose );
		for ( let ln = from; ln <= to; ln++ ) {
			masks[ ln - 1 ] = intersect( masks[ ln - 1 ], mask );
		}
	}

	// INLINE guards.
	lines.forEach( ( text, idx ) => {
		if ( ! /\$is_(section|layout)\b/.test( text ) ) {
			return;
		}
		if ( ! /\?|&&/.test( text ) ) {
			return;
		}
		if ( /\bif\s*\(/.test( text ) ) {
			return; // already handled as a block guard
		}
		// The guard lives in the RHS, never the whole line. Passing the whole
		// line hands the evaluator an atom beginning `$has_responsive_min_height
		// = $is_section`, which matches no `$is_*` pattern and silently widens
		// back to all kinds — measured, and it defeated the entire pass.
		//   `$x = COND ? a : b` → the guard is COND
		//   `$x = $is_section && (…)` → the guard is the whole RHS
		const ternary = text.match( /=\s*([^?]*)\?/ );
		const assign = text.match( /^[^=]*=\s*(.*)$/ );
		let expr = text;
		if ( ternary ) {
			expr = ternary[ 1 ];
		} else if ( assign ) {
			expr = assign[ 1 ];
		}
		masks[ idx ] = intersect( masks[ idx ], maskFromCondition( expr, guards ) );
	} );

	return masks;
}

/**
 * Analyse which kinds each attribute key can reach paint under.
 *
 * @param {string} rawSrc Raw PHP source of the wrapper.
 * @return {{kindsByAttr: Map<string,string[]>, unresolvedComputedReads: Array, lineMasks: string[][]}}
 */
function analyseKindConsumption( rawSrc ) {
	const blanked = blankPhpComments( rawSrc );
	const lines = blanked.split( '\n' );
	const guardVars = findGuardVars( lines );
	const lineMasks = computeLineMasks( blanked, guardVars );

	// Variable definition sites: `$name = <expr>;` (also `.=`).
	const defsByVar = new Map();
	const usesByVar = new Map();
	lines.forEach( ( text, idx ) => {
		const def = text.match( /^\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\.?=[^=]/ );
		if ( def ) {
			if ( ! defsByVar.has( def[ 1 ] ) ) {
				defsByVar.set( def[ 1 ], [] );
			}
			defsByVar.get( def[ 1 ] ).push( idx + 1 );
		}
		const varRe = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
		let v;
		while ( ( v = varRe.exec( text ) ) !== null ) {
			if ( ! usesByVar.has( v[ 1 ] ) ) {
				usesByVar.set( v[ 1 ], [] );
			}
			usesByVar.get( v[ 1 ] ).push( idx + 1 );
		}
	} );

	const unresolvedComputedReads = [];
	lines.forEach( ( text, idx ) => {
		if ( /\$attributes\[\s*\$/.test( text ) ) {
			unresolvedComputedReads.push( { line: idx + 1, text: text.trim() } );
		}
	} );

	// Seed: every `$attributes['KEY']` read, with the line it sits on.
	const seeds = new Map();
	lines.forEach( ( text, idx ) => {
		const re = /\$attributes\[\s*'([A-Za-z0-9_]+)'\s*\]/g;
		let mm;
		while ( ( mm = re.exec( text ) ) !== null ) {
			if ( ! seeds.has( mm[ 1 ] ) ) {
				seeds.set( mm[ 1 ], [] );
			}
			seeds.get( mm[ 1 ] ).push( idx + 1 );
		}
	} );

	const kindsByAttr = new Map();

	// PATH-SENSITIVE propagation.
	//
	// The mask travels WITH the value and intersects at every line the value
	// passes through; only EFFECT sites contribute to the result.
	//
	// Why both halves are load-bearing (this analyser's first version had
	// neither, and reported every attribute as reaching all three kinds):
	//
	//   Path-sensitivity — `:427 $has_responsive_min_height = $is_section && …`
	//   narrows everything downstream of it. A mask computed per-line in
	//   isolation loses that the moment the value moves on.
	//
	//   Effect sites only — `:421 $min_height = $sgs_css_length( $min_height );`
	//   is unguarded PLUMBING, not paint. Counting it as a site unions
	//   {section,layout,content} back in and erases the guard at :759, which is
	//   the exact wrong answer this file exists to prevent.
	//
	// An assignment propagates; anything else (a condition, a concatenation into
	// output, a function argument) is where the value can actually reach paint.
	for ( const [ attr, readLines ] of seeds ) {
		const union = new Set();
		const seen = new Set();
		const queue = readLines.map( ( ln ) => ( { ln, mask: [ ...ALL_KINDS ] } ) );

		while ( queue.length ) {
			const { ln, mask } = queue.shift();
			const here = intersect( mask, lineMasks[ ln - 1 ] || ALL_KINDS );
			if ( here.length === 0 ) {
				continue; // unreachable under every kind — this path is dead
			}

			const memo = `${ ln }:${ here.join( ',' ) }`;
			if ( seen.has( memo ) ) {
				continue;
			}
			seen.add( memo );

			const def = lines[ ln - 1 ].match( /^\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*(\.?)=[^=]/ );
			const target = def && def[ 1 ] !== 'attributes' ? def[ 1 ] : null;

			// APPEND (`.=`) IS PAINT.
			//
			// `$responsive_css .= '{min-height:' . $min_height . '}';` is the
			// moment the value becomes output — not a step on the way to it. If
			// this is treated as plumbing, the verdict depends on whether the
			// accumulator happens to be read again later in the same scope; it is
			// in this file today, which quietly hid the gap until a fixture with
			// a terminal accumulator returned "reaches paint under no kind".
			// Recording here and still propagating keeps both readings.
			if ( target && def[ 2 ] === '.' ) {
				here.forEach( ( k ) => union.add( k ) );
			}

			// BOOLEAN-FLAG CUT-OFF.
			//
			// When a tainted value is reduced to a boolean flag, the flag is not
			// the attribute's value — it is a gate. Following the taint onward
			// tracks CONTROL influence, not where the value paints, and the two
			// give different answers:
			//
			//   :427  $has_responsive_min_height = $is_section && ( '' !== $min_height_tablet … );
			//   :1329 $has_responsive_attr = ( $gap_tablet || … || $has_responsive_min_height || … );
			//   :1583 if ( $has_responsive_attr ) { …
			//
			// `$has_responsive_attr` is genuinely all-kinds (a layout block with a
			// tablet gap sets it), so the taint arrives at :1583 unnarrowed and
			// reports minHeight as painting on every kind. But minHeight's VALUE
			// never lands there — it lands at :760 and :1608, both section-gated.
			// Cutting at the flag gives the right answer for the right reason;
			// the flag's own kind-mask is still captured, separately, by
			// findGuardVars().
			// The flag assignment IS the effect site, then propagation stops.
			// Recording it (rather than merely cutting) matters for a boolean
			// attribute whose whole semantic is the flag — `bgKenBurns`,
			// `bgParallax`, `overlayGradient` are read straight into
			// `! empty( … )` and paint by adding a class. Cutting without
			// recording reported all nine as reaching paint under NO kind.
			if ( target && isBooleanFlagAssignment( lines[ ln - 1 ] ) ) {
				here.forEach( ( k ) => union.add( k ) );
				continue;
			}

			if ( ! target ) {
				// EFFECT SITE — the value is used for something other than being
				// moved into another local. This is what counts as reaching paint.
				here.forEach( ( k ) => union.add( k ) );
				continue;
			}

			for ( const useLine of usesByVar.get( target ) || [] ) {
				if ( useLine !== ln ) {
					queue.push( { ln: useLine, mask: here } );
				}
			}
		}

		kindsByAttr.set( attr, ALL_KINDS.filter( ( k ) => union.has( k ) ) );
	}

	return { kindsByAttr, unresolvedComputedReads, lineMasks, guardVars };
}

module.exports = {
	ALL_KINDS,
	blankPhpComments,
	splitTopLevel,
	maskOfExpr,
	maskFromCondition,
	findGuardVars,
	computeLineMasks,
	analyseKindConsumption,
};
