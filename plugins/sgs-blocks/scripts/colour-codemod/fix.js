'use strict';

/**
 * fix.js — the WRITING half of the colour-conformance triad (D542, Task 1).
 *
 * Scope: TIER A ONLY — rows survey.js verdicts as
 * `AUTOFIXABLE:helper-at-existing-selector`, AND (this file's own further
 * narrowing, documented in task-1-report.md) only the sub-set of those rows
 * whose GRADIENT dimension is already conformant (`needsGradient === false`,
 * i.e. shadow-exempt or already gradient-capable). A row that needs BOTH a
 * hover state and a new gradient sibling is refused whole rather than
 * half-fixed — "three edits, all three or none" (task-1-brief.md) is read
 * here as "every required DIMENSION or none": a row still verdicts
 * AUTOFIXABLE after a partial fix, so a partial fix buys nothing and leaves
 * a row this tool will not touch again looking untouched forever.
 *
 * Reuses survey.js's own row-walk + verdict logic wholesale (does not
 * reimplement row detection) by requiring survey.js is unchanged and calling
 * into the same core/golden.js + core/sources.js helpers it uses.
 *
 * REFUSE RATHER THAN GUESS (brief, mirrored from migrate-tier-object.py's
 * UNCLEAR discipline). Every refusal below carries one of a small fixed set
 * of named reasons — never a bare "couldn't do it".
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const babelParser = require( '@babel/parser' );

const {
	collectIndirectRowSources,
	jsxName,
	jsxAttrExpr,
	unwrapRowObject,
	objProp,
	stringLiteralValue,
	booleanLiteralValue,
	normalStateAttrName,
	statesArrayHasGradient,
	resolveMechanismFromCssProperty,
} = require( '../inspector-scan/core/golden' );
const { SourceCache } = require( '../inspector-scan/core/sources' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
const EXPORTER = path.join( PLUGIN_ROOT, 'scripts', 'inspector-scan', 'export-colour-css-property.py' );

const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
	errorRecovery: false,
};

// The three helpers a row's NORMAL-state colour value may be resolved through
// in render.php, in the order this tool tries them.
const COLOUR_HELPERS = [ 'sgs_colour_value', 'sgs_text_colour_decl', 'sgs_background_paint_decl' ];

// ---------------------------------------------------------------------------
// DB rows (same fail-closed contract as survey.js)
// ---------------------------------------------------------------------------
function loadDbRows() {
	const out = execFileSync( 'python', [ EXPORTER, '--rich' ], { encoding: 'utf8' } );
	if ( ! out || ! out.trim() ) {
		throw new Error( 'fix: exporter returned nothing — refusing to treat every row as unresolved.' );
	}
	return JSON.parse( out );
}

function blockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( n ) => fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) )
		.sort();
}

// ---------------------------------------------------------------------------
// Row discovery — mirrors survey.js's rowsInFile() but also keeps the raw AST
// node for the row object + its states array, since fix.js needs to SPLICE
// source text, not just report shape.
// ---------------------------------------------------------------------------
function rowsInFile( cache, file ) {
	const rows = [];
	if ( ! fs.existsSync( file ) ) return rows;

	const { pushedRows, declaredArrays } = collectIndirectRowSources(
		( visitors ) => cache.traverse( file, visitors ),
		unwrapRowObject
	);

	function resolveArrayLike( node, depth ) {
		if ( ! node || depth > 6 ) return [];
		if ( node.type === 'ArrayExpression' ) {
			return node.elements.flatMap( ( el ) =>
				el && el.type === 'SpreadElement' ? resolveArrayLike( el.argument, depth + 1 ) : [ el ]
			);
		}
		if ( node.type === 'Identifier' ) {
			if ( pushedRows[ node.name ] ) return pushedRows[ node.name ];
			if ( declaredArrays[ node.name ] ) return resolveArrayLike( declaredArrays[ node.name ], depth + 1 );
			return [];
		}
		if ( node.type === 'ConditionalExpression' ) {
			return resolveArrayLike( node.consequent, depth + 1 ).concat( resolveArrayLike( node.alternate, depth + 1 ) );
		}
		return [];
	}

	cache.traverse( file, {
		JSXOpeningElement( p ) {
			const node = p.node;
			const name = jsxName( node );
			if ( name !== 'SgsColourPanel' ) return; // fix.js: tier-A DesignTokenPicker rows are refused wholesale below.
			const rowsExpr = jsxAttrExpr( node, 'rows' );
			if ( ! rowsExpr ) return;
			const objs = resolveArrayLike( rowsExpr, 0 ).map( unwrapRowObject ).filter( Boolean );
			for ( const rowObj of objs ) {
				const statesArray = objProp( rowObj, 'states' );
				const isArr = statesArray && statesArray.type === 'ArrayExpression';
				const line = rowObj.loc ? rowObj.loc.start.line : 0;
				rows.push( {
					rowKey: stringLiteralValue( objProp( rowObj, 'key' ) ) || 'row-line-' + line,
					line,
					rowNode: rowObj,
					statesNode: isArr ? statesArray : null,
					statesCount: isArr ? statesArray.elements.length : 1,
					attr: normalStateAttrName( statesArray ),
					hasGradient:
						booleanLiteralValue( objProp( rowObj, 'gradientCapable' ) ) === true ||
						statesArrayHasGradient( statesArray ),
					via: 'SgsColourPanel',
				} );
			}
		},
	} );

	return rows;
}

// DesignTokenPicker-standalone rows are detected (so they can be REPORTED as
// refused, per the brief's "every row either fixed or refused-with-a-named-
// reason") but never planned for a fix — their row shape has no SgsColourPanel
// wrapper object to clone a state from, a materially different edit-site
// shape this task does not implement.
function designTokenPickerRows( cache, file ) {
	const rows = [];
	if ( ! fs.existsSync( file ) ) return rows;
	cache.traverse( file, {
		JSXOpeningElement( p ) {
			const node = p.node;
			if ( jsxName( node ) !== 'DesignTokenPicker' ) return;
			const statesExpr = jsxAttrExpr( node, 'states' );
			const isArr = statesExpr && statesExpr.type === 'ArrayExpression';
			const line = node.loc ? node.loc.start.line : 0;
			rows.push( {
				rowKey: 'standalone-line-' + line,
				attr: isArr ? normalStateAttrName( statesExpr ) : null,
				statesCount: isArr ? statesExpr.elements.length : 1,
				hasGradient: isArr ? statesArrayHasGradient( statesExpr ) : false,
				statesNode: isArr ? statesExpr : null,
			} );
		},
	} );
	return rows;
}

// A row is only fixable if its states array has an EXPLICIT 'normal'-keyed
// element — some rows (e.g. sgs/testimonial's border-colour-hover row) are
// deliberately hover-only, paired with WP's native colour support for the
// resting state. Synthesising a 'normal' state there would misrepresent a
// documented design, not fix a gap. Refuse, never guess.
function hasExplicitNormalState( statesNode ) {
	if ( ! statesNode || statesNode.type !== 'ArrayExpression' ) return false;
	return statesNode.elements.some(
		( el ) => el && el.type === 'ObjectExpression' && stringLiteralValue( objProp( el, 'key' ) ) === 'normal'
	);
}

function findStateByKey( statesNode, key ) {
	if ( ! statesNode || statesNode.type !== 'ArrayExpression' ) return null;
	return (
		statesNode.elements.find(
			( el ) => el && el.type === 'ObjectExpression' && stringLiteralValue( objProp( el, 'key' ) ) === key
		) || null
	);
}

// ---------------------------------------------------------------------------
// render.php selector/property resolution — DIRECT SINGLE-STATEMENT ONLY.
//
// "Confident" here means: the base attribute's PHP variable is passed to one
// of COLOUR_HELPERS, and the SAME PHP STATEMENT also carries, as a literal
// string-concatenation prefix immediately before that call, a CSS selector
// template ending in the rule-opening `{` plus a property name (e.g.
// `".{$uid}.sgs-x__el{color:" . sgs_colour_value( $v ) . '}'`). Any
// indirection (the value pushed into an array assembled elsewhere, a
// selector held in a variable that is itself built across multiple
// statements) is OUT OF this tool's confidence bar — refused, not chased.
// ---------------------------------------------------------------------------

// PHP `{$var}` / `{$obj->prop}` string-interpolation braces read as literal
// CSS-rule braces to a naive scanner. Mask them out (same length, so string
// offsets used afterwards stay valid) before looking for the real one.
function maskPhpInterpolation( str ) {
	return str.replace( /\{\$[^}]*\}/g, ( m ) => ' '.repeat( m.length ) );
}

function firstRealBraceIndex( str ) {
	return maskPhpInterpolation( str ).indexOf( '{' );
}

// Extract the literal-string concatenation chain immediately preceding
// `text`'s end (e.g. the `"...{color:" . ` in `"...{color:" . sgs_colour_value(`).
function concatLiteralPrefix( text ) {
	const re = /(?:['"](?:\\.|[^'"\\])*['"]\s*\.\s*)+$/;
	const m = text.match( re );
	if ( ! m ) return null;
	const chunk = m[ 0 ];
	const litRe = /['"]((?:\\.|[^'"\\])*)['"]/g;
	let out = '';
	let mm;
	while ( ( mm = litRe.exec( chunk ) ) ) out += mm[ 1 ];
	return out;
}

function findVarAssignedFromAttr( php, attr ) {
	const re = new RegExp(
		'\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=[^;\\n]*\\$attributes\\s*\\[\\s*([\'"])' + attr + '\\2\\s*\\][^;]*;',
		'g'
	);
	const names = new Set();
	let m;
	while ( ( m = re.exec( php ) ) ) names.add( m[ 1 ] );
	if ( names.size !== 1 ) {
		return { ok: false, reason: names.size === 0 ? 'no-attribute-assignment-found' : 'multiple-distinct-assignments-ambiguous' };
	}
	return { ok: true, varName: [ ...names ][ 0 ] };
}

/**
 * Resolve the (selectorTemplate, propertyName, statementEnd) for a variable's
 * single-statement colour-helper usage. Returns { ok:false, reason } on
 * anything short of full confidence.
 */
function resolveDirectSelector( php, varName ) {
	const candidates = [];
	for ( const helper of COLOUR_HELPERS ) {
		const re = new RegExp( '\\b' + helper + '\\s*\\(\\s*\\$' + varName + '\\b', 'g' );
		let m;
		while ( ( m = re.exec( php ) ) ) candidates.push( { idx: m.index, helper } );
	}
	if ( candidates.length === 0 ) return { ok: false, reason: 'no-colour-helper-call-found-for-attr-var' };
	if ( candidates.length > 1 ) return { ok: false, reason: 'multiple-helper-call-sites-ambiguous' };

	const { idx, helper } = candidates[ 0 ];
	// The statement is taken to start at the beginning of its SOURCE LINE
	// (every direct-pattern statement observed in this tree is single-line —
	// `$arr[] = "...{prop:" . helper( $v ) . '}';`). Scanning back to the
	// nearest `;`/`{` instead would risk matching a brace that is really part
	// of a `{$uid}` interpolation or a `{color:` CSS-rule-opener still inside
	// the SAME string literal, not a real statement boundary.
	let start = php.lastIndexOf( '\n', idx );
	start = start === -1 ? 0 : start + 1;
	// A naive `indexOf(';', idx)` truncates mid-string whenever the assembled
	// CSS literal carries its OWN semicolon (e.g. `. ';}'` / `;}"`), exactly
	// the shape `resolveTextGradientChainSelector`'s
	// `findStatementEndRespectingStrings` was built to handle — reused here so
	// this, the path most --apply insertions actually go through, gets the
	// same protection (Finding 1, cross-tier review 2026-09-04).
	const semiIdx = findStatementEndRespectingStrings( php, start );
	if ( semiIdx === -1 ) return { ok: false, reason: 'unterminated-statement' };
	// Minor finding (cross-tier review 2026-09-04): the old naive `indexOf(';', idx)`
	// guaranteed semiIdx >= idx by construction (a forward search from idx can only
	// find something at or after idx). `findStatementEndRespectingStrings` searches
	// from `start` (the statement's own line start), not from `idx` (the helper
	// call), so that guarantee is no longer automatic — refuse rather than emit a
	// negative-length / backwards slice if it's ever violated (e.g. two statements
	// sharing a line, or `start` landing inside an already-open string).
	if ( semiIdx < idx ) return { ok: false, reason: 'statement-end-before-helper-call' };
	const end = semiIdx + 1;
	const stmt = php.slice( start, end );
	const localIdx = idx - start;
	const prefixText = stmt.slice( 0, localIdx );
	const literal = concatLiteralPrefix( prefixText );
	if ( literal == null ) return { ok: false, reason: 'no-literal-selector-prefix-in-same-statement' };
	const braceIdx = firstRealBraceIndex( literal );
	if ( braceIdx === -1 ) return { ok: false, reason: 'no-css-rule-brace-in-literal-prefix' };
	const selectorTemplate = literal.slice( 0, braceIdx ).trim();
	const propText = literal
		.slice( braceIdx + 1 )
		.replace( /:\s*$/, '' )
		.trim();
	if ( ! selectorTemplate || ! propText ) return { ok: false, reason: 'empty-selector-or-property-after-split' };
	if ( /[{}]/.test( propText ) ) return { ok: false, reason: 'property-text-contains-brace-multi-rule-statement' };

	// Which array does this statement push its finished string into? Reused
	// for the inserted hover statement so it lands in the SAME emission
	// channel (scoped_css_parts / scoped_css / responsive_css, whichever the
	// block already uses) rather than inventing a new one.
	const pushMatch = stmt.match( /^\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*(\[\s*\]|\.\s*=)/ );
	if ( ! pushMatch ) return { ok: false, reason: 'normal-statement-not-a-recognised-css-assembly-shape' };
	const sinkVar = pushMatch[ 1 ];
	const sinkIsAppend = pushMatch[ 2 ].trim().startsWith( '.' ); // `.=` string-append vs `[]=` array-push

	return {
		ok: true,
		helper,
		selectorTemplate,
		propText,
		stmtStart: start,
		stmtEnd: end,
		sinkVar,
		sinkIsAppend,
	};
}

/**
 * Strategy T (text-gradient-chain) — a SECOND direct-pattern resolver,
 * alongside resolveDirectSelector, for a text-mechanism row whose base
 * attribute is routed through the canonical gradient-aware text-colour chain
 * (`includes/helpers-tokens.php` — see plugins/sgs-blocks/CLAUDE.md "Real
 * text gradient — the only path that supports it") rather than calling
 * `sgs_text_colour_decl()` on the base var directly:
 *
 *   $effective = sgs_resolve_text_colour_or_gradient( <base value>, <gradient value> );
 *   if ( '' !== $effective ) {
 *       $decl = sgs_text_colour_decl( $effective );
 *       if ( '' !== $decl ) { <a CSS-rule-assembly statement using $decl> }
 *       ...gradient fallback...
 *   }
 *
 * resolveDirectSelector never finds a candidate here — the base var (or, on
 * some blocks, the raw `$attributes['attr']` read with NO intermediate var
 * at all: sgs/nav-menu.submenuColour, sgs/product-card.tagTextColour) is
 * never itself an argument to sgs_colour_value/sgs_text_colour_decl/
 * sgs_background_paint_decl — it only reaches `sgs_text_colour_decl()`
 * two hops later, via `$effective`. `sgs_resolve_text_colour_or_gradient()`
 * being an unrecognised resolution path is exactly the Bug C gap; the base
 * attribute sometimes having no intermediate variable at all is Bug B's
 * "call inside ... a literal" shape. Fixed together because both blockers
 * sit on the SAME three-statement chain and the second cannot be reached
 * without the first.
 *
 * The consumption statement's selector text (a bare literal, a `$var`, or a
 * `{$var}` double-quote interpolation — every shape observed live) is
 * rebuilt as plain PHP source text safe to re-embed inside a NEW
 * double-quoted string, exactly what `direct-new-statement` mode's inserted
 * hover statement needs. No deep resolution of an outer selector variable
 * (e.g. `$root_sel`) is attempted or needed — it is already in scope at the
 * insertion point, so `{$name_colour_sel}` is valid PHP as-is.
 */

// The CSS these statements assemble routinely contains its OWN literal `;`
// (`. ';}'`, `;}"`), so a naive `indexOf(';', …)` from mid-statement finds
// that one first, short of the statement's real close. Scan quote-state
// aware instead: `fromIdx` MUST be a position outside any string (a
// statement's own start) for the initial `inString = null` to be correct.
function findStatementEndRespectingStrings( php, fromIdx ) {
	let inString = null;
	for ( let i = fromIdx; i < php.length; i++ ) {
		const ch = php[ i ];
		if ( inString ) {
			if ( '\\' === ch ) {
				i++; // skip the escaped character, whatever it is
				continue;
			}
			if ( ch === inString ) inString = null;
			continue;
		}
		if ( '"' === ch || "'" === ch ) {
			inString = ch;
			continue;
		}
		if ( ';' === ch ) return i;
	}
	return -1;
}

// ---------------------------------------------------------------------------
// Hoisting a `direct-new-statement` insertion out of the base-value guard(s)
// it would otherwise land inside (the bug this task fixes, cross-tier review
// 2026-09-04, Bean-flagged). Every Strategy-T-shaped consumption statement
// observed live sits nested inside one or two `if ( '' !== $var )` presence
// guards testing the BASE attribute's resolved value (nav-menu:864/866,
// team-member:629/631) — splicing the hover block at the consumption
// statement's own `;` therefore lands it inside those same guards, so the
// hover CSS silently never renders when the base colour is unset (a
// legitimate client choice). The fix already shipped for `burgerBg`/
// `burgerHoverColour` (nav-menu:1166-1173): each is its own TOP-LEVEL `if`,
// sibling to the guard, not nested inside it. These two helpers find that
// same outer boundary generically, string/comment aware, PHP-tokenizer-lite
// (not a naive brace count — `{`/`}` inside a string or a `//`/`/* */`
// comment must not be mistaken for real block delimiters).
// ---------------------------------------------------------------------------

// Returns the stack of `{ openPos, header }` frames — every unmatched `{`
// still open at `uptoIdx`, scanning forward from php[0] — where `header` is
// the raw source text between the previous statement/block boundary
// (`;`/`{`/`}`) and the `{` itself (e.g. `if ( '' !== $nav_colour_effective )`).
function scanBraceFrames( php, uptoIdx ) {
	const stack = [];
	let inString = null;
	let inLineComment = false;
	let inBlockComment = false;
	let lastBoundary = 0;
	for ( let i = 0; i < uptoIdx; i++ ) {
		const ch = php[ i ];
		if ( inLineComment ) {
			if ( ch === '\n' ) inLineComment = false;
			continue;
		}
		if ( inBlockComment ) {
			if ( ch === '*' && php[ i + 1 ] === '/' ) {
				inBlockComment = false;
				i++;
			}
			continue;
		}
		if ( inString ) {
			if ( ch === '\\' ) {
				i++;
				continue;
			}
			if ( ch === inString ) inString = null;
			continue;
		}
		if ( ch === '"' || ch === "'" ) {
			inString = ch;
			continue;
		}
		if ( ch === '/' && php[ i + 1 ] === '/' ) {
			inLineComment = true;
			i++;
			continue;
		}
		if ( ch === '#' ) {
			inLineComment = true;
			continue;
		}
		if ( ch === '/' && php[ i + 1 ] === '*' ) {
			inBlockComment = true;
			i++;
			continue;
		}
		if ( ch === '{' ) {
			stack.push( { openPos: i, header: php.slice( lastBoundary, i ).trim() } );
			lastBoundary = i + 1;
			continue;
		}
		if ( ch === '}' ) {
			stack.pop();
			lastBoundary = i + 1;
			continue;
		}
		if ( ch === ';' ) {
			lastBoundary = i + 1;
		}
	}
	return stack;
}

// Given php[openPos] === '{', returns the index of its matching '}' (same
// string/comment-aware scan as scanBraceFrames), or -1 if unterminated.
function findMatchingBrace( php, openPos ) {
	let depth = 0;
	let inString = null;
	let inLineComment = false;
	let inBlockComment = false;
	for ( let i = openPos; i < php.length; i++ ) {
		const ch = php[ i ];
		if ( inLineComment ) {
			if ( ch === '\n' ) inLineComment = false;
			continue;
		}
		if ( inBlockComment ) {
			if ( ch === '*' && php[ i + 1 ] === '/' ) {
				inBlockComment = false;
				i++;
			}
			continue;
		}
		if ( inString ) {
			if ( ch === '\\' ) {
				i++;
				continue;
			}
			if ( ch === inString ) inString = null;
			continue;
		}
		if ( ch === '"' || ch === "'" ) {
			inString = ch;
			continue;
		}
		if ( ch === '/' && php[ i + 1 ] === '/' ) {
			inLineComment = true;
			i++;
			continue;
		}
		if ( ch === '#' ) {
			inLineComment = true;
			continue;
		}
		if ( ch === '/' && php[ i + 1 ] === '*' ) {
			inBlockComment = true;
			i++;
			continue;
		}
		if ( ch === '{' ) {
			depth++;
			continue;
		}
		if ( ch === '}' ) {
			depth--;
			if ( depth === 0 ) return i;
			continue;
		}
	}
	return -1;
}

// A bare presence guard on some variable — `if ( '' !== $var )` — the ONLY
// enclosing-condition shape every observed base-value guard uses. Deliberately
// narrow: REFUSES to hoist past anything else (an `elseif`, a compound
// condition, a guard on an unrelated variable) rather than guessing that it's
// safe to jump out of it too.
//
// `allowedVarNames` (Finding 2, cross-tier review round 2, 2026-09-04) — when
// given (a non-empty array), the guard's OWN variable must be one of these —
// the variable(s) this row's own base-attribute resolution chain is provably
// known to have produced (`varInfo.varName` for the direct strategy;
// `effectiveVar`/`declVar` for the text-gradient chain). Without this check
// ANY `if ( '' !== $\w+ )`-shaped guard matched, including one on a totally
// unrelated variable an outer, unrelated `if` happened to wrap the statement
// in — hoisting past it moves the hover CSS somewhere it was never gated to
// be. `allowedVarNames` omitted/empty means "no constraint known" (kept only
// for defensive callers that haven't supplied one — every real call site in
// this file always does).
// Finding 3 (cross-tier review round 2, 2026-09-04): `header` is sliced from
// the last `;`/`{`/`}` boundary — scanBraceFrames does NOT treat a comment as
// a boundary, so a `// comment` (or `/* ... */`) line sitting between the
// previous statement and the guard's own `if` stays embedded in `header`,
// pushing the real `if` past position 0 and silently failing the `^if`
// anchor. That failure is SILENT — no refusal reason, nothing — the codemod
// just falls back to the original un-hoisted (broken) insertion with no
// signal anything went wrong. Strip leading `//…`/`#…`/`/*…*/` comment text
// before testing the anchor so a comment line no longer disables hoisting.
function stripLeadingPhpComments( header ) {
	let s = header;
	for ( ;; ) {
		const trimmed = s.replace( /^\s+/, '' );
		if ( /^\/\//.test( trimmed ) || /^#/.test( trimmed ) ) {
			const nl = trimmed.indexOf( '\n' );
			s = nl === -1 ? '' : trimmed.slice( nl + 1 );
			continue;
		}
		if ( /^\/\*/.test( trimmed ) ) {
			const close = trimmed.indexOf( '*/' );
			s = close === -1 ? '' : trimmed.slice( close + 2 );
			continue;
		}
		return trimmed;
	}
}

function isSimplePresenceGuard( header, allowedVarNames ) {
	const cleaned = stripLeadingPhpComments( header );
	const m = /^if\s*\(\s*''\s*!==\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\)$/.exec( cleaned );
	if ( ! m ) return false;
	if ( allowedVarNames && allowedVarNames.length && ! allowedVarNames.includes( m[ 1 ] ) ) return false;
	return true;
}

// Given `php[idx]`, returns the index of the first non-whitespace character
// at/after `idx` (Findings 1 and 3 both need "what comes right after this
// position, skipping whitespace").
function skipWhitespace( php, idx ) {
	let i = idx;
	while ( i < php.length && /\s/.test( php[ i ] ) ) i++;
	return i;
}

// Walks OUTWARD from the consumption statement's own frames (innermost
// first), hoisting the insertion point past every enclosing simple presence
// guard whose variable is one of `allowedVarNames` (Finding 2), and stops —
// returning the boundary reached so far — the moment an enclosing frame is
// anything else (not conditional on the base attribute's own presence, per
// the task brief's own phrasing). For a statement that isn't nested in any
// such guard at all (frames empty, or the innermost frame doesn't match),
// returns `stmtEnd` unchanged — the original behaviour.
//
// Finding 1 (cross-tier review round 2, 2026-09-04): a guard immediately
// followed by `else`/`elseif` cannot be hoisted past — splicing the new
// hover block between the guard's closing `}` and the following `else`/
// `elseif` keyword is a PHP parse error. REFUSE to hoist past that
// particular guard (stop one level earlier) rather than guess at some other
// "safe" spot; the caller sees this as the ordinary "stop here" case
// because the loop simply breaks without updating insertionPoint.
function computeHoistedInsertionPoint( php, stmtStart, stmtEnd, allowedVarNames ) {
	const frames = scanBraceFrames( php, stmtStart );
	let insertionPoint = stmtEnd;
	for ( let i = frames.length - 1; i >= 0; i-- ) {
		const frame = frames[ i ];
		if ( ! isSimplePresenceGuard( frame.header, allowedVarNames ) ) break;
		const closePos = findMatchingBrace( php, frame.openPos );
		if ( closePos === -1 || closePos < insertionPoint ) break;
		// Finding 1: refuse to land between this guard's `}` and a following
		// `else`/`elseif` — stop hoisting at the boundary reached so far
		// instead (never past THIS guard).
		const afterClose = skipWhitespace( php, closePos + 1 );
		if ( /^(else|elseif)\b/.test( php.slice( afterClose, afterClose + 8 ) ) ) break;
		insertionPoint = closePos + 1;
	}
	return insertionPoint;
}

function resolveTextGradientChainSelector( php, attr, varName ) {
	const callRe = /\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*sgs_resolve_text_colour_or_gradient\s*\(([\s\S]*?)\)\s*;/g;
	const attrNeedle = varName
		? new RegExp( '\\$' + varName + '\\b' )
		: new RegExp( '\\$attributes\\s*\\[\\s*([\'"])' + attr + '\\1\\s*\\]' );
	let m;
	// REFUSE RATHER THAN GUESS (Finding 3, cross-tier review 2026-09-04):
	// resolveDirectSelector refuses whole with 'multiple-helper-call-sites-
	// ambiguous' when a base attribute resolves at more than one selector —
	// deliberate, because a block resolving the same attr at two selectors
	// (e.g. a desktop/mobile split) needs a human to pick, not a guess. This
	// sibling resolver used to `break` on the FIRST match at each of its three
	// steps, silently picking one of possibly-multiple sites. Collect every
	// candidate at each step instead and refuse on ambiguity, matching
	// resolveDirectSelector's discipline.
	const effectiveVarCandidates = [];
	while ( ( m = callRe.exec( php ) ) ) {
		if ( attrNeedle.test( m[ 2 ] ) ) {
			effectiveVarCandidates.push( m[ 1 ] );
		}
	}
	if ( effectiveVarCandidates.length === 0 ) return { ok: false, reason: 'no-sgs_resolve_text_colour_or_gradient-call-for-attr' };
	if ( effectiveVarCandidates.length > 1 ) return { ok: false, reason: 'multiple-text-gradient-chain-sites-ambiguous' };
	const effectiveVar = effectiveVarCandidates[ 0 ];

	const declRe = new RegExp( '\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*sgs_text_colour_decl\\s*\\(\\s*\\$' + effectiveVar + '\\b[^)]*\\)\\s*;', 'g' );
	const declMatches = [];
	let dm;
	while ( ( dm = declRe.exec( php ) ) ) declMatches.push( dm );
	if ( declMatches.length === 0 ) return { ok: false, reason: 'no-sgs_text_colour_decl-call-for-effective-var' };
	if ( declMatches.length > 1 ) return { ok: false, reason: 'multiple-text-gradient-chain-sites-ambiguous' };
	const declMatch = declMatches[ 0 ];
	const declVar = declMatch[ 1 ];

	// Scan every use of $declVar strictly AFTER its own declaration
	// statement and take the first one that is genuinely being CONCATENATED
	// or INTERPOLATED into a string — i.e. skip past guard-condition reads
	// like `if ( '' !== $decl )`, which is always the FIRST use in this
	// shape (team-member/nav-menu/product-card all guard before consuming)
	// and is not itself a consumption site.
	const useRe = new RegExp( '\\$' + declVar + '\\b', 'g' );
	useRe.lastIndex = declMatch.index + declMatch[ 0 ].length;
	let useMatch;
	// Collect EVERY genuine consumption site rather than stopping at the
	// first — refused below if more than one is found (Finding 3).
	const consumptionCandidates = [];
	while ( ( useMatch = useRe.exec( php ) ) ) {
		const lineStart = php.lastIndexOf( '\n', useMatch.index ) + 1;
		// The literal CSS text these statements build routinely contains its
		// OWN semicolon (e.g. `. ';}'` / `;}"`) — a naive `indexOf(';', …)`
		// stops there, short of the statement's REAL closing `;`. Scan
		// string-boundary-aware instead, starting from the statement's own
		// start (a fresh, unquoted position) so quote state is tracked
		// correctly across the whole statement.
		const candStmtEndIdx = findStatementEndRespectingStrings( php, lineStart );
		if ( candStmtEndIdx === -1 || candStmtEndIdx < useMatch.index ) continue;
		const candStmt = php.slice( lineStart, candStmtEndIdx + 1 );
		const localUseIdx = useMatch.index - lineStart;
		const prefix = candStmt.slice( 0, localUseIdx );

		// Every consumption shape observed pushes into a sink at the very
		// start of its own statement (`$sink[] = …` / `$sink .= …`) — strip
		// that prefix off before parsing selector terms, or the sink var
		// itself (`$css`, `$scoped_css`, …) gets mistaken for a selector term.
		const pushMatch = /^\s*\$[A-Za-z_][A-Za-z0-9_]*\s*(?:\[\s*\]|\.\s*=)\s*/.exec( candStmt );
		if ( ! pushMatch ) continue;
		if ( localUseIdx < pushMatch[ 0 ].length ) continue; // $declVar used before the sink's own `=`/`.=` — not this shape
		const afterPush = prefix.slice( pushMatch[ 0 ].length );

		// `useRe`'s match starts at `$`, not at the `{` that opens PHP's
		// `{$var}` string-interpolation syntax — so the opener itself is the
		// LAST character of `afterPush`, not part of the match. Detect a bare
		// trailing `{` here (real shape: `"{$name_colour_sel}{{$name_colour_decl}"`
		// — sel's own `}` closes its interpolation, then a literal `{` opens
		// the CSS rule, then ANOTHER `{` opens decl's interpolation).
		const interpMatch = /\{$/.exec( afterPush );
		if ( interpMatch ) {
			// Double-quoted-string shape (e.g. team-member: `"{$name_colour_sel}{{$name_colour_decl};}"`).
			// Everything from the string's own opening `"` up to the
			// interpolation opener is already literal PHP string text (which
			// may itself carry other `{$var}` interpolations) — safe to
			// reuse verbatim.
			const quoteIdx = afterPush.indexOf( '"' );
			if ( quoteIdx === -1 ) continue;
			const beforeInterp = afterPush.slice( quoteIdx + 1, interpMatch.index );
			const braceIdx = firstRealBraceIndex( beforeInterp );
			if ( braceIdx === -1 ) continue;
			const tpl = beforeInterp.slice( 0, braceIdx ).trim();
			if ( ! tpl ) continue;
			consumptionCandidates.push( { selectorTemplate: tpl, stmt: candStmt, stmtEndIdx: candStmtEndIdx, stmtStart: lineStart } );
			continue;
		}

		// Concatenation shape (e.g. nav-menu: `$uid_sel . ' .sgs-nav-menu__sublink{' . $submenu_colour_decl`;
		// product-card: `$sgs_tag_text_colour_sel . '{' . $sgs_tag_text_colour_decl`). Walk the `.`-joined
		// terms and rebuild each as embeddable text: a bare `$var` becomes
		// `{$var}`, a quoted literal keeps its unescaped contents.
		const concatMatch = /\.\s*$/.exec( afterPush );
		if ( ! concatMatch ) continue; // not a concat/interp consumption (e.g. the `if ('' !== $decl)` guard) — skip
		const beforeConcat = afterPush.slice( 0, concatMatch.index );
		const termRe = /\$([A-Za-z_][A-Za-z0-9_]*)|(['"])((?:\\.|(?!\2)[^\\])*)\2/g;
		let built = '';
		let tm;
		let sawTerm = false;
		while ( ( tm = termRe.exec( beforeConcat ) ) ) {
			sawTerm = true;
			built += tm[ 1 ] ? `{$${ tm[ 1 ] }}` : tm[ 3 ];
		}
		if ( ! sawTerm ) continue;
		const braceIdx = firstRealBraceIndex( built );
		if ( braceIdx === -1 ) continue;
		const tpl = built.slice( 0, braceIdx ).trim();
		if ( ! tpl ) continue;
		consumptionCandidates.push( { selectorTemplate: tpl, stmt: candStmt, stmtEndIdx: candStmtEndIdx, stmtStart: lineStart } );
	}
	if ( consumptionCandidates.length === 0 ) return { ok: false, reason: 'no-concat-or-interp-consumption-site-found-for-decl-var' };
	if ( consumptionCandidates.length > 1 ) return { ok: false, reason: 'multiple-text-gradient-chain-sites-ambiguous' };
	const { selectorTemplate, stmt, stmtEndIdx, stmtStart } = consumptionCandidates[ 0 ];

	const pushMatch = stmt.match( /^\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*(\[\s*\]|\.\s*=)/ );
	if ( ! pushMatch ) return { ok: false, reason: 'consumption-statement-not-a-recognised-css-assembly-shape' };

	return {
		ok: true,
		selectorTemplate,
		sinkVar: pushMatch[ 1 ],
		sinkIsAppend: pushMatch[ 2 ].trim().startsWith( '.' ),
		stmtStart,
		stmtEnd: stmtEndIdx + 1,
		// Finding 2 (cross-tier review round 2, 2026-09-04): the ONLY variables
		// legitimately derived from THIS row's own base attribute in this
		// chain — used by computeHoistedInsertionPoint to refuse hoisting past
		// an enclosing guard on some OTHER, unrelated variable.
		guardVarNames: [ effectiveVar, declVar ],
	};
}

/**
 * Strategy H (hover-sink) — a FALLBACK for when the base attribute's own
 * normal-state usage is indirect (pushed into an array assembled elsewhere,
 * as `quote`/`heading`/`mega-panel` etc. do for their box-model decls). Many
 * of those SAME blocks already have a working, SEPARATE `:hover` rule
 * assembly for OTHER properties (e.g. quote's `$hover_rules` ->
 * `"{$root_sel}:hover,{$root_sel}:focus-within{" . implode(';', $hover_rules)
 * . ';}'`). That is a real, already-scoped selector this row's hover
 * declaration can join — confidence comes from there being EXACTLY ONE such
 * sink in the file, not from tracing the base attribute's own data flow.
 *
 * Only ONE candidate sink is ever accepted; more than one is ambiguous
 * (which hover rule does this row belong to?) and refused rather than
 * guessed.
 */
function findHoverSink( php ) {
	const candidates = [];

	// Shape A: "...:hover...{" . implode( ';', $arr ) . '...}'
	const implodeRe = /implode\s*\(\s*(['"]);\1\s*,\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\)/g;
	let m;
	while ( ( m = implodeRe.exec( php ) ) ) {
		const idx = m.index;
		const lineStart = php.lastIndexOf( '\n', idx ) + 1;
		const stmt = php.slice( lineStart, php.indexOf( ';', php.indexOf( ';', idx ) + 1 ) + 1 );
		if ( ! /:hover/.test( stmt ) ) continue;
		const prefixText = php.slice( lineStart, idx );
		const literal = concatLiteralPrefix( prefixText );
		if ( literal == null ) continue;
		const braceIdx = firstRealBraceIndex( literal );
		if ( braceIdx === -1 ) continue;
		const selectorTemplate = literal.slice( 0, braceIdx ).trim();
		if ( ! selectorTemplate ) continue;
		candidates.push( { selectorTemplate, hoverArrayVar: m[ 2 ], insertBeforeLine: lineStart } );
	}

	// Shape B: sgs_emit_state_colour_css( SELECTOR, $normalArr, $hoverArr )
	const emitRe = /sgs_emit_state_colour_css\s*\(\s*([^,]+),[^,]+,\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\)/g;
	while ( ( m = emitRe.exec( php ) ) ) {
		const idx = m.index;
		const lineStart = php.lastIndexOf( '\n', idx ) + 1;
		candidates.push( {
			selectorTemplate: m[ 1 ].trim(),
			hoverArrayVar: m[ 2 ],
			insertBeforeLine: lineStart,
			isBareExpr: true, // selectorTemplate is a PHP expression (e.g. `$root_sel`), not a string literal to re-embed in a double-quoted string
		} );
	}

	// Shape C: sgs_hover_state_rules( SELECTOR, implode( ';', $hoverArr ), ... )
	// — found live 2026-09-04 (qc-council audit): identical hover-array
	// assembly shape to Shape A, just wrapped through the shared touch-safe
	// hover-guard helper instead of a raw literal-prefixed concat. Same
	// insertion contract as Shape B (bare array var + insertBeforeLine), so
	// no new insertion logic is needed — only detection was missing.
	const hoverStateRulesRe = /sgs_hover_state_rules\s*\(\s*([^,]+),\s*implode\s*\(\s*(['"]);\2\s*,\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\)/g;
	while ( ( m = hoverStateRulesRe.exec( php ) ) ) {
		const idx = m.index;
		const lineStart = php.lastIndexOf( '\n', idx ) + 1;
		candidates.push( {
			selectorTemplate: m[ 1 ].trim(),
			hoverArrayVar: m[ 3 ],
			insertBeforeLine: lineStart,
			isBareExpr: true,
		} );
	}

	if ( candidates.length !== 1 ) return { ok: false, reason: candidates.length === 0 ? 'no-hover-sink-found' : 'multiple-hover-sinks-ambiguous' };
	const sink = candidates[ 0 ];

	// A truthiness guard on the array (`if ( $hover_rules ) { ... implode(...
	// $hover_rules ...) ... }`, as sgs/quote has) is evaluated BEFORE a push
	// inserted right at `insertBeforeLine` would run — inserting there would
	// silently produce dead code whenever this row is the ONLY hover value an
	// operator sets. Detect the nearest such guard between the array's own
	// declaration and the consumption site, and insert before THAT instead.
	const declMatch = new RegExp( '\\$' + sink.hoverArrayVar + '\\s*=\\s*array\\s*\\(\\s*\\)\\s*;' ).exec( php );
	const searchFrom = declMatch ? declMatch.index + declMatch[ 0 ].length : 0;
	const guardRe = new RegExp( 'if\\s*\\(\\s*\\$' + sink.hoverArrayVar + '\\b' );
	const between = php.slice( searchFrom, sink.insertBeforeLine );
	const guardMatch = guardRe.exec( between );
	if ( guardMatch ) {
		const guardAbsIdx = searchFrom + guardMatch.index;
		sink.insertBeforeLine = php.lastIndexOf( '\n', guardAbsIdx ) + 1;
	}

	return { ok: true, sink };
}

// A CSS property name is only trusted from the DB's css_property value when
// it is a single, safe CSS-identifier token — never containing PHP/CSS
// injection-relevant characters. Compound (comma-joined) values were already
// refused upstream as multi-mechanism-ambiguous.
function safeCssPropertyToken( cssProperty ) {
	if ( ! cssProperty ) return null;
	const trimmed = String( cssProperty ).trim();
	return /^[a-z-]+$/.test( trimmed ) ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Naming convention (task-1-brief.md): {base}Hover, derived per row, never
// invented independent of the base attribute actually bound.
// ---------------------------------------------------------------------------
function hoverAttrName( baseAttr ) {
	return baseAttr + 'Hover';
}

// ---------------------------------------------------------------------------
// TASK 2 — gradient dimension for fill/border mechanisms (task-2-brief.md).
//
// Three gradient strategies, tried in order of confidence, refuse otherwise:
//
//  (1) WIRE-ONLY — the `{base}Gradient` attribute is ALREADY declared in
//      block.json AND already consumed in render.php (a prior feature wired
//      the render+schema halves but never exposed the editor control, or
//      exposed it only on a sibling "linked" branch — the real shape found
//      live at sgs/social-icons.iconBorderColourHover, whose "unlinked"
//      branch row lacks the control its own "linked" branch already has).
//      Only edit.js changes; render.php and block.json are untouched.
//  (2) FILL-DIRECT — mechanism=fill, and the base attribute's PHP variable
//      is used EXACTLY ONCE in the whole file via `sgs_colour_value( $var )`,
//      and that sole usage is the value half of a literal
//      `'background-color:' . sgs_colour_value( $var )` concatenation
//      fragment (a "prop:" + helper-call pair strictly ANALOGOUS to Task 1's
//      own direct-pattern gate — a literal CSS-declaration prefix
//      immediately touching the helper call in the SAME statement). The
//      fragment is replaced in place with
//      `sgs_background_paint_decl( $var, $var_gradient )`, which already
//      knows how to resolve "gradient wins over flat colour" and emits the
//      correct property (background-color OR background-image) itself — so
//      the literal 'background-color:' prefix is REMOVED, not kept beside
//      it. Any other shape (CSS-custom-property-mediated backgrounds like
//      `--sgs-x-bg:` + a downstream `background:var(--sgs-x-bg)` consumer,
//      a WP-native style-engine arg like `$style_color_args['background']`,
//      a preset-CLASS-name resolution via `sanitize_html_class()`, or the
//      variable used more than once) is REFUSED — extending any of those
//      would mean inventing a new CSS shape or rewriting a second file this
//      task was not asked to touch (task-2-brief.md's own escape hatch).
//  (3) BORDER-EXTEND — mechanism=border, and the base attribute's PHP
//      variable already appears as a BARE (non-ternary, no gradient
//      fallback yet) argument to an EXISTING `sgs_border_gradient_css(...)`
//      call somewhere in the file — i.e. the mask-selector/width shape this
//      row's border already renders through was already built (for a
//      DIFFERENT gradient-bearing sibling row in the same block, e.g.
//      testimonial/brand-strip/social-icons/process-steps's own
//      already-working hover-paint ternary). Swapping the bare call for
//      `'' !== $var_gradient ? $var_gradient : sgs_colour_value( $var )`
//      reuses that ALREADY-CORRECT selector/width without this tool ever
//      inventing one. If no such call exists for this var, extending it
//      would mean inventing the mask rule from scratch (selector + width
//      are not safely derivable here) — REFUSED, per the brief's explicit
//      instruction that inventing a rule is worse than leaving the row.
// ---------------------------------------------------------------------------

function gradientAttrName( baseAttr ) {
	return baseAttr + 'Gradient';
}

// A safe-to-derive PHP variable name for the new gradient value: the base
// var's own name + `_gradient`. Refused (by the caller) if this name is
// already in use anywhere in the file for something this tool did not just
// derive itself — avoids ever double-declaring or shadowing an unrelated var.
function gradientVarName( baseVarName ) {
	return baseVarName + '_gradient';
}

function wireOnlyGradientCheck( db, slug, blockJson, php, baseAttr ) {
	const gradAttr = gradientAttrName( baseAttr );
	const declared = !! ( blockJson.attributes && blockJson.attributes[ gradAttr ] );
	const consumedInPhp = php.includes( "['" + gradAttr + "']" ) || php.includes( '[\'' + gradAttr + '\']' );
	return declared && consumedInPhp ? { ok: true, gradAttr } : { ok: false };
}

// Strategy (2) — FILL-DIRECT. Finds the sole `sgs_colour_value( $varName )`
// call site and verifies it is the value-half of a literal
// `'background-color:' . sgs_colour_value( $varName )` fragment in a single
// statement, returning the exact source span to replace.
//
// `background-color:` need not be an entirely standalone quoted-concatenation
// segment (`'background-color:' .`) — it may instead be the TAIL of a larger
// single string literal that also carries a selector/other-property prefix in
// the SAME quotes (e.g. `' .sgs-nav-menu__burger{background-color:' .`, real
// shape found live at sgs/nav-menu's burgerBg/indicatorColour). Both shapes
// are matched by one regex; `prefix`/`quote` come back non-empty only for the
// fused shape, telling the caller to re-close the literal at the split point
// rather than deleting the whole thing (Bug A fix, 2026-09-04).
function resolveFillGradientDirectSite( php, varName ) {
	const callRe = new RegExp( 'sgs_colour_value\\s*\\(\\s*\\$' + varName + '\\b[^)]*\\)', 'g' );
	const calls = [];
	let m;
	while ( ( m = callRe.exec( php ) ) ) calls.push( { idx: m.index, text: m[ 0 ] } );
	if ( calls.length === 0 ) return { ok: false, reason: 'no-sgs_colour_value-usage-for-var' };
	if ( calls.length > 1 ) return { ok: false, reason: 'multiple-sgs_colour_value-usages-for-var-ambiguous-gradient-target' };

	const call = calls[ 0 ];
	// `prefix` (group 2) must contain no quote characters of its own — this
	// keeps the match anchored on the SAME literal's real opening quote
	// rather than skipping back across an earlier, unrelated string.
	const fragRe = /(['"])([^'"]*?)background-color:\1\s*\.\s*/;
	const before = php.slice( Math.max( 0, call.idx - 200 ), call.idx );
	const fm = fragRe.exec( before );
	if ( ! fm || fm.index + fm[ 0 ].length !== before.length ) {
		return { ok: false, reason: 'value-not-directly-embedded-in-a-background-color-declaration' };
	}
	const fragStart = call.idx - ( before.length - fm.index );
	const fragEnd = call.idx + call.text.length;
	return { ok: true, fragStart, fragEnd, prefix: fm[ 2 ], quote: fm[ 1 ], callText: call.text };
}

// Strategy (3) — BORDER-EXTEND. Finds an EXISTING `sgs_border_gradient_css(`
// call whose args contain a BARE `sgs_colour_value( $varName )` (no ternary,
// no gradient fallback already wired for this var) and returns the exact
// span to replace with the gradient-aware ternary.
function resolveBorderGradientExtendSite( php, varName ) {
	const bareRe = new RegExp( 'sgs_colour_value\\s*\\(\\s*\\$' + varName + '\\b[^)]*\\)', 'g' );
	const candidates = [];
	let m;
	while ( ( m = bareRe.exec( php ) ) ) candidates.push( { idx: m.index, text: m[ 0 ] } );
	if ( candidates.length === 0 ) return { ok: false, reason: 'var-not-used-via-sgs_colour_value' };

	// Only accept a candidate that sits textually inside an
	// sgs_border_gradient_css( ... ) call's argument list AND is not already
	// preceded by a ternary/ ' !== ' gradient-fallback pattern for this var
	// (which would mean gradient is already wired for it).
	const inMaskCall = candidates.filter( ( c ) => {
		const windowStart = Math.max( 0, c.idx - 400 );
		const windowText = php.slice( windowStart, c.idx );
		const lastMaskCall = windowText.lastIndexOf( 'sgs_border_gradient_css(' );
		if ( lastMaskCall === -1 ) return false;
		// Make sure no closing paren of that call happened before our candidate
		// (i.e. we are still inside the SAME call's argument list).
		const between = windowText.slice( lastMaskCall );
		const opens = ( between.match( /\(/g ) || [] ).length;
		const closes = ( between.match( /\)/g ) || [] ).length;
		return opens > closes; // still inside an unbalanced ( — i.e. inside the call.
	} );
	if ( inMaskCall.length === 0 ) return { ok: false, reason: 'no-existing-sgs_border_gradient_css-call-references-var' };
	if ( inMaskCall.length > 1 ) return { ok: false, reason: 'multiple-sgs_border_gradient_css-references-ambiguous' };

	const c = inMaskCall[ 0 ];
	// Refuse if this exact call text is already preceded, on the same
	// argument, by a ternary testing a *_gradient variable (already wired).
	const precedingChunk = php.slice( Math.max( 0, c.idx - 60 ), c.idx );
	if ( /!==\s*\(\s*\$[A-Za-z0-9_]*gradient/i.test( precedingChunk ) || /\?\s*$/.test( precedingChunk.trim() ) ) {
		return { ok: false, reason: 'var-already-behind-a-gradient-ternary' };
	}
	return { ok: true, fragStart: c.idx, fragEnd: c.idx + c.text.length, callText: c.text };
}

// Where a row's normal/sole state resolves its `value` from, mirroring
// planRow's own baseIdent extraction — needed to reuse the SAME identifier
// on the gradient-value prop we add, without inventing a second lookup.
function stateValueIdent( stateNode ) {
	const v = objProp( stateNode, 'value' );
	return v && v.type === 'Identifier' ? v.name : null;
}

// CRITICAL FIX (cross-tier review, post-Task-1). Two candidate remediations
// were evaluated:
//
//   (a) declare the derived sibling attr in block.json alongside the hover
//       attr — this closes the silent-discard hole, but re-opens a SECOND
//       one: `check-dead-controls.js` and inspector-scan rule
//       "34-declared-attr-unrendered" both correctly flag the result as a
//       DEAD control, because no render.php in this tree ever consumes a
//       `{base}HoverGradient` value — the hover-gradient CSS was never
//       wired, in ANY of the 3 affected blocks. Declaring it trades an
//       invisible bug for a visible one; the control still does nothing.
//   (b) never clone the sibling into the hover state in the first place —
//       adopted here. The normal state's source text can carry a SIBLING
//       attribute reference beyond its own `value`/`onChange` pair — most
//       commonly `gradientValue`/`onGradientChange` pointing at
//       `{baseAttr}Gradient` (present because the row is already
//       gradient-capable on its NORMAL state — `needsGradient` is false, so
//       this row IS in this pass's hover-only scope). The naive
//       `text.split(baseAttrSrc).join(hoverAttr)` clone in
//       buildHoverStateSource() used to rewrite that sibling into
//       `{hoverAttr}Gradient` right along with everything else — correct AS
//       TEXT, but for a control with no render consumer. This mirrors the
//       file's own "REFUSE RATHER THAN GUESS" / "never half-fix" discipline
//       (see planRow's `needsGradient` refusal above): a hover-gradient
//       control this pass cannot also wire into render.php must not be
//       emitted at all, not emitted-and-declared-but-dead. Wiring the
//       render-side hover-gradient CSS remains out of scope for this pass,
//       same as the base-row gradient path.
//
// Detected generically — by scanning the normal state's OWN properties for
// any Identifier-valued prop whose name is `baseIdent` + some suffix, so
// this covers `gradientValue` today and any future `{baseAttr}<Suffix>`
// sibling without a second hardcoded name. `identifyUnclonableSiblingProps`
// also picks up each sibling's PAIRED handler prop (e.g. `onGradientChange`)
// by searching for any other property whose source text references the
// sibling identifier as a whole word.
// A sibling attribute name referenced by a state prop's value — either a
// bare destructured Identifier (`gradientValue: borderColourGradient`, the
// shape Task 1 found live) OR a `attributes.X` MemberExpression (the shape
// Task 2's OWN gradient wiring introduces via applyGradientEditJsFix, which
// deliberately never destructures the new attribute — see that function's
// comment). Both must be recognised: after this task's fix, buildHoverStateSource's
// blanket substring clone would otherwise rename a `attributes.numberBackgroundGradient`
// reference into `attributes.numberBackgroundHoverGradient` (baseIdent is a
// textual prefix of the sibling name either way) with no render.php consumer
// anywhere — the EXACT same defect class Task 1's addendum fixed for the
// Identifier shape, now reproduced live for the MemberExpression shape by
// this task's own code before this fix. Caught by
// scan-undeclared-setattributes.js on sgs/process-steps.numberBackgroundHoverGradient
// during Task 2 verification.
function siblingAttrNameFromValueNode( val, baseIdent ) {
	if ( ! val ) return null;
	if ( val.type === 'Identifier' && val.name !== baseIdent && val.name.startsWith( baseIdent ) ) return val.name;
	if (
		val.type === 'MemberExpression' &&
		! val.computed &&
		val.object.type === 'Identifier' &&
		val.object.name === 'attributes' &&
		val.property.type === 'Identifier' &&
		val.property.name !== baseIdent &&
		val.property.name.startsWith( baseIdent )
	) {
		return val.property.name;
	}
	return null;
}

function identifyUnclonableSiblingProps( editSrc, normalState, baseIdent ) {
	if ( ! normalState || normalState.type !== 'ObjectExpression' || ! baseIdent ) return { toRemove: [], removedIdents: [] };
	const toRemove = [];
	const removedIdents = [];
	for ( const prop of normalState.properties ) {
		if ( prop.type !== 'ObjectProperty' ) continue;
		const name = siblingAttrNameFromValueNode( prop.value, baseIdent );
		if ( name ) {
			toRemove.push( prop );
			removedIdents.push( name );
		}
	}
	if ( removedIdents.length === 0 ) return { toRemove: [], removedIdents: [] };
	for ( const prop of normalState.properties ) {
		if ( prop.type !== 'ObjectProperty' || toRemove.includes( prop ) ) continue;
		const src = editSrc.slice( prop.start, prop.end );
		if ( removedIdents.some( ( id ) => new RegExp( '\\b' + id + '\\b' ).test( src ) ) ) {
			toRemove.push( prop );
		}
	}
	return { toRemove, removedIdents };
}

// Remove the given property nodes (positions relative to `normalState`,
// found in the ORIGINAL editSrc) from `text` — a clone of
// `editSrc.slice(normalState.start, normalState.end)` that has not yet had
// any other substitution applied. Consumes the adjoining comma so the
// result is syntactically valid (trailing comma after the removed prop, or
// a leading one if it was the last property in the object).
function removePropsFromClone( text, editSrc, normalState, propsToRemove ) {
	if ( propsToRemove.length === 0 ) return text;
	const removals = propsToRemove
		.map( ( p ) => ( { start: p.start - normalState.start, end: p.end - normalState.start } ) )
		.sort( ( a, b ) => b.start - a.start ); // descending: remove from the end first so earlier offsets stay valid.
	let result = text;
	for ( const r of removals ) {
		let start = r.start;
		let end = r.end;
		const after = result.slice( end );
		const trailingComma = after.match( /^\s*,\s*/ );
		if ( trailingComma ) {
			end += trailingComma[ 0 ].length;
		} else {
			const before = result.slice( 0, start );
			const leadingComma = before.match( /,\s*$/ );
			if ( leadingComma ) start -= leadingComma[ 0 ].length;
		}
		result = result.slice( 0, start ) + result.slice( end );
	}
	return result;
}

// ---------------------------------------------------------------------------
// Plan one row. Returns either { fixable:true, ... edit descriptors } or
// { fixable:false, reason }.
// ---------------------------------------------------------------------------
function planRow( db, dir, slug, row, phpText, blockJsonPathOverride ) {
	if ( ! row.attr ) return { fixable: false, reason: 'REFUSED:unresolvable-attr' };

	const dbRow = db[ slug ] ? db[ slug ][ row.attr ] : null;
	const cssProperty = dbRow ? dbRow.css_property : null;
	const mech = resolveMechanismFromCssProperty( cssProperty );
	const mechanisms = mech.unresolved ? [] : mech.mechanisms || [];
	if ( mechanisms.length === 0 ) return { fixable: false, reason: 'REFUSED:no-css_property-mechanism-unresolved' };
	if ( mechanisms.length > 1 ) return { fixable: false, reason: 'REFUSED:multiple-mechanisms-' + mechanisms.join( '|' ) + '-ambiguous' };
	const mechanism = mechanisms[ 0 ];

	const needsHover = row.statesCount < 2;
	const needsGradient = ! row.hasGradient && mechanism !== 'shadow';
	if ( ! needsHover && ! needsGradient ) return { fixable: false, reason: 'CONFORMANT-already' };

	// -----------------------------------------------------------------
	// GRADIENT DIMENSION (Task 2, task-2-brief.md) — fill/border only.
	// Resolved and returned ALONE when needed: this row's gradient and
	// hover dimensions are never mixed into one write (mirrors Task 1's
	// "every required dimension or none" per SINGLE call — a row still
	// needing hover after its gradient is fixed simply re-verdicts
	// AUTOFIXABLE and is picked up by a subsequent --fix --apply run
	// through the UNCHANGED Task 1 hover logic below; nothing is ever
	// left half-fixed in a way that creates a dead control).
	// -----------------------------------------------------------------
	if ( needsGradient ) {
		if ( mechanism === 'text' ) {
			return {
				fixable: false,
				reason:
					'REFUSED:gradient-path-deferred (text-mechanism gradient is background-clip:text, a ' +
					'structurally different helper pair — Task 3 scope, not this pass)',
			};
		}
		if ( mechanism !== 'fill' && mechanism !== 'border' ) {
			return {
				fixable: false,
				reason: 'REFUSED:gradient-path-deferred (mechanism=' + mechanism + ' outside this pass\'s fill/border scope)',
			};
		}

		const blockJsonPath = blockJsonPathOverride || path.join( BLOCKS_DIR, dir, 'block.json' );
		const blockJson = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
		const gradAttr = gradientAttrName( row.attr );
		const wireOnly = wireOnlyGradientCheck( db, slug, blockJson, phpText, row.attr );

		let gradientPlan;
		if ( wireOnly.ok ) {
			gradientPlan = { mode: 'wire-only', gradAttr };
		} else {
			const varInfo = findVarAssignedFromAttr( phpText, row.attr );
			if ( ! varInfo.ok ) return { fixable: false, reason: 'REFUSED:gradient-' + varInfo.reason };

			const gradVarName = gradientVarName( varInfo.varName );
			if ( new RegExp( '\\$' + gradVarName + '\\b' ).test( phpText ) ) {
				return { fixable: false, reason: 'REFUSED:gradient-var-name-collision-' + gradVarName };
			}

			if ( mechanism === 'fill' ) {
				const site = resolveFillGradientDirectSite( phpText, varInfo.varName );
				if ( ! site.ok ) return { fixable: false, reason: 'REFUSED:fill-gradient-' + site.reason };
				gradientPlan = {
					mode: 'fill-direct',
					gradAttr,
					phpVarName: varInfo.varName,
					gradVarName,
					fragStart: site.fragStart,
					fragEnd: site.fragEnd,
					prefix: site.prefix,
					quote: site.quote,
				};
			} else {
				const site = resolveBorderGradientExtendSite( phpText, varInfo.varName );
				if ( ! site.ok ) return { fixable: false, reason: 'REFUSED:border-gradient-' + site.reason };
				gradientPlan = {
					mode: 'border-extend',
					gradAttr,
					phpVarName: varInfo.varName,
					gradVarName,
					fragStart: site.fragStart,
					fragEnd: site.fragEnd,
				};
			}
		}

		// Gradient target state: the row's 'normal' state when one exists,
		// else its sole existing state (a dedicated single-state design,
		// e.g. sgs/info-box's hover-only background row, paired with WP's
		// native colour support for the resting state).
		const explicitNormal = hasExplicitNormalState( row.statesNode );
		const targetState = explicitNormal
			? findStateByKey( row.statesNode, 'normal' )
			: row.statesNode.elements.filter( Boolean )[ 0 ];
		if ( ! targetState ) return { fixable: false, reason: 'REFUSED:gradient-target-state-not-found' };
		const targetIdent = stateValueIdent( targetState );
		if ( ! targetIdent ) return { fixable: false, reason: 'REFUSED:gradient-target-state-value-not-a-plain-identifier' };

		gradientPlan.targetState = targetState;
		gradientPlan.targetIdent = targetIdent;
		gradientPlan.statesNode = row.statesNode;
		gradientPlan.blockJsonPath = blockJsonPath;

		return { fixable: true, mechanism, baseAttr: row.attr, kind: 'gradient', gradientPlan, blockJsonPath };
	}

	if ( ! needsHover ) return { fixable: false, reason: 'CONFORMANT-already' };
	if ( ! hasExplicitNormalState( row.statesNode ) ) {
		return { fixable: false, reason: 'REFUSED:no-explicit-normal-state (sole state is non-normal — likely paired with native WP colour support; synthesising a normal state would misrepresent the design)' };
	}

	// hover only, from here.
	const normalState = findStateByKey( row.statesNode, 'normal' );
	if ( ! normalState ) return { fixable: false, reason: 'REFUSED:normal-state-node-not-found' };
	if ( findStateByKey( row.statesNode, 'hover' ) ) {
		return { fixable: false, reason: 'CONFORMANT-already (hover state already present in edit.js)' };
	}

	const varInfo = findVarAssignedFromAttr( phpText, row.attr );

	// Finding 5 (cross-tier review, 2026-09-04): a failed findVarAssignedFromAttr
	// used to be an early exit here. Strategy T's own fix (below, Bug B/C)
	// needed ONE specific case to fall through instead — a text-mechanism row
	// with NO intermediate PHP variable at all (e.g. sgs/nav-menu's
	// submenuColour, which reads $attributes['submenuColour'] directly), so
	// resolveTextGradientChainSelector can still be tried with varName=null.
	// That widening was accidentally left general: for every OTHER mechanism
	// a failed var lookup fell all the way through to Strategy H's hover-sink
	// fallback too, which was never meant to catch this case and has nothing
	// safe to act on without a resolved var. Gate the fall-through back to
	// exactly the Strategy-T attempt path; every other mechanism keeps the
	// original early exit.
	if ( ! varInfo.ok && mechanism !== 'text' ) {
		return { fixable: false, reason: 'REFUSED:' + varInfo.reason };
	}

	const newHoverAttr = hoverAttrName( row.attr );

	let renderPlan = null;
	let primaryFailureReason = varInfo.ok ? null : varInfo.reason;

	if ( varInfo.ok ) {
		const sel = resolveDirectSelector( phpText, varInfo.varName );
		if ( sel.ok ) {
			renderPlan = {
				mode: 'direct-new-statement',
				selectorTemplate: sel.selectorTemplate,
				propText: sel.propText,
				sinkVar: sel.sinkVar,
				sinkIsAppend: sel.sinkIsAppend,
				stmtStart: sel.stmtStart,
				stmtEnd: sel.stmtEnd,
				// Finding 2: the only variable provably derived from THIS row's
				// own base attribute at this call site — resolveDirectSelector
				// matched a COLOUR_HELPERS call taking `$varInfo.varName`
				// directly, so that's the sole variable safe to hoist past.
				guardVarNames: [ varInfo.varName ],
			};
		} else {
			primaryFailureReason = sel.reason;
		}
	}

	// Strategy T fallback (Bug B/C, 2026-09-04) — a text-mechanism row routed
	// through the gradient-aware sgs_resolve_text_colour_or_gradient() ->
	// sgs_text_colour_decl() chain never has its base var as a direct
	// COLOUR_HELPERS argument, so resolveDirectSelector (and, when there is
	// no intermediate variable at all, findVarAssignedFromAttr) always miss
	// it above. Tried whenever the direct strategies didn't already succeed
	// — never overrides a working direct-pattern result.
	if ( ! renderPlan && mechanism === 'text' ) {
		const chain = resolveTextGradientChainSelector( phpText, row.attr, varInfo.ok ? varInfo.varName : null );
		if ( chain.ok ) {
			renderPlan = {
				mode: 'direct-new-statement',
				selectorTemplate: chain.selectorTemplate,
				propText: 'color',
				sinkVar: chain.sinkVar,
				sinkIsAppend: chain.sinkIsAppend,
				stmtStart: chain.stmtStart,
				stmtEnd: chain.stmtEnd,
				// Finding 2: the effective/decl variables THIS chain resolved
				// FOR THIS ROW's own base attribute — the only ones safe to
				// hoist past.
				guardVarNames: chain.guardVarNames,
			};
		} else {
			// Strategy T is the MOST SPECIFIC attempt for a text-mechanism row —
			// its own refusal reason (e.g. Finding 3's
			// 'multiple-text-gradient-chain-sites-ambiguous') must surface in
			// the final message, not be silently shadowed by an earlier, less
			// specific attempt's reason (varInfo/resolveDirectSelector), which
			// is what the previous `else if ( ! primaryFailureReason )` guard
			// did — primaryFailureReason is ALWAYS already non-null by this
			// point for a text-mechanism row (varInfo.ok ? null : varInfo.reason
			// on line ~1020, or sel.reason above), so that guard never actually
			// let a chain-specific reason through. Found while adding Finding
			// 3's own self-test coverage (fixture-l).
			primaryFailureReason = chain.reason;
		}
	}

	if ( ! renderPlan ) {
		// Fallback: Strategy H — an existing hover-rule sink elsewhere in the
		// same file, for a property name trusted from the DB (not scraped
		// from the ambiguous/indirect normal-state statement).
		const propText = safeCssPropertyToken( cssProperty );
		if ( ! propText ) return { fixable: false, reason: 'REFUSED:' + primaryFailureReason + ' (and no safe single css_property token for hover-sink fallback)' };
		const sink = findHoverSink( phpText );
		if ( ! sink.ok ) return { fixable: false, reason: 'REFUSED:' + primaryFailureReason + ' (hover-sink fallback also failed: ' + sink.reason + ')' };
		renderPlan = {
			mode: 'sink-array-push',
			selectorTemplate: sink.sink.selectorTemplate,
			propText,
			sinkVar: sink.sink.hoverArrayVar,
			insertBeforeLine: sink.sink.insertBeforeLine,
			sinkIsBareExpr: !! sink.sink.isBareExpr,
		};
	}

	// This row's `value` must resolve to a plain identifier — buildHoverStateSource
	// depends on it (both for the value/onChange substitution AND to know
	// which sibling props are unclonable, per the comment above
	// identifyUnclonableSiblingProps).
	const normalValueNode = objProp( normalState, 'value' );
	const baseIdent = normalValueNode && normalValueNode.type === 'Identifier' ? normalValueNode.name : null;
	if ( ! baseIdent ) return { fixable: false, reason: 'REFUSED:normal-state-value-not-a-plain-identifier' };

	// block.json: does the hover attr already exist? (brief: "already
	// declared, no control wired" still counts as tier A — wire, don't
	// re-declare.)
	const blockJsonPath = blockJsonPathOverride || path.join( BLOCKS_DIR, dir, 'block.json' );
	const blockJson = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	const hoverAlreadyDeclared = !! ( blockJson.attributes && blockJson.attributes[ newHoverAttr ] );

	return Object.assign(
		{
			fixable: true,
			mechanism,
			baseAttr: row.attr,
			kind: 'hover',
			hoverAttr: newHoverAttr,
			baseIdent,
			normalState,
			statesNode: row.statesNode,
			hoverAlreadyDeclared,
			blockJsonPath,
		},
		renderPlan
	);
}

// ---------------------------------------------------------------------------
// Edit generation — plain string surgery, never a whole-file AST re-print
// (preserves formatting everywhere the diff doesn't touch, per the brief).
// ---------------------------------------------------------------------------

function indentOfLine( src, pos ) {
	const lineStart = src.lastIndexOf( '\n', pos - 1 ) + 1;
	const m = src.slice( lineStart, pos ).match( /^[ \t]*/ );
	return m ? m[ 0 ] : '';
}

function buildHoverStateSource( editSrc, normalState, hoverAttr, indent ) {
	// Clone the normal state object's source text, then do TARGETED
	// substring replacements of exactly the pieces the brief's naming table
	// says change (key/label/value/onChange target) — never a structural
	// rewrite of props we don't understand.
	let text = editSrc.slice( normalState.start, normalState.end );

	const valueNode = objProp( normalState, 'value' );
	const onChangeNode = objProp( normalState, 'onChange' );
	if ( ! valueNode || ! onChangeNode ) return null;
	const baseAttrSrc = editSrc.slice( valueNode.start, valueNode.end );
	const onChangeSrc = editSrc.slice( onChangeNode.start, onChangeNode.end );

	// CRITICAL FIX (cross-tier review, post-Task-1): strip any sibling prop
	// (e.g. gradientValue/onGradientChange -> {base}Gradient) BEFORE the
	// substring clone below, which would otherwise rewrite it into a NEW
	// `{hoverAttr}Gradient` reference with no render.php consumer anywhere in
	// the tree — a write WordPress silently discards, or (if declared) a
	// dead control. See identifyUnclonableSiblingProps's comment for the
	// full reasoning.
	const baseIdent = valueNode.type === 'Identifier' ? valueNode.name : null;
	const { toRemove } = identifyUnclonableSiblingProps( editSrc, normalState, baseIdent );
	text = removePropsFromClone( text, editSrc, normalState, toRemove );

	// key: 'normal' -> 'hover'
	text = text.replace( /(\bkey\s*:\s*)(['"])normal\2/, `$1$2hover$2` );
	// label: '...Normal...' text swapped to Hover (only the label STRING, not other props)
	const labelNode = objProp( normalState, 'label' );
	if ( labelNode ) {
		const labelSrc = editSrc.slice( labelNode.start, labelNode.end );
		if ( /Normal/.test( labelSrc ) ) {
			const newLabelSrc = labelSrc.replace( 'Normal', 'Hover' );
			text = text.split( labelSrc ).join( newLabelSrc );
		}
	}
	// value: <baseAttrSrc> -> hoverAttr identifier (only if baseAttrSrc is a
	// simple identifier or attributes.member — resolveAttrName's own domain).
	if ( baseAttrSrc.trim() === objProp( normalState, 'value' ) && false ) { /* no-op guard */ }
	text = text.split( baseAttrSrc ).join( hoverAttr );

	// onChange body: replace every occurrence of the base attr identifier
	// inside the onChange function with the hover attr identifier.
	if ( ! baseIdent ) return null;
	const newOnChangeSrc = onChangeSrc.replace( new RegExp( '\\b' + baseIdent + '\\b', 'g' ), hoverAttr );
	text = text.split( onChangeSrc ).join( newOnChangeSrc );

	return text;
}

// Insert a new ObjectProperty right after an existing one's VALUE node,
// consuming/adding the trailing comma so the object stays syntactically
// valid either way. Shared by the gradient-prop insertion below — mirrors
// the states-array insertion pattern already used for the hover clone.
function insertPropAfter( editSrc, afterValueNode, propSrc ) {
	const indent = indentOfLine( editSrc, afterValueNode.start );
	let insertAt = afterValueNode.end;
	const after = editSrc.slice( insertAt );
	const commaMatch = after.match( /^\s*,/ );
	if ( commaMatch ) insertAt += commaMatch[ 0 ].length;
	const prefix = commaMatch ? '' : ',';
	const insertion = prefix + '\n' + indent + propSrc + ',';
	return editSrc.slice( 0, insertAt ) + insertion + editSrc.slice( insertAt );
}

// TASK 2 — add `gradientValue`/`onGradientChange` to a row's target state
// (see planRow's gradient-dimension comment for how the target state is
// chosen). Reads/writes `attributes.{gradAttr}` directly rather than a
// destructured identifier — the new attribute is never destructured by this
// tool, so referencing it via `attributes.X` is always valid regardless of
// whether some OTHER code path in the file already destructures it too
// (the wire-only case, e.g. sgs/social-icons, already does — a second,
// `attributes.X`-shaped read alongside it is functionally identical, just a
// minor style inconsistency the automated tool accepts in exchange for never
// having to touch the destructuring list itself).
function applyGradientEditJsFix( editSrc, gp ) {
	const onChangeNode = objProp( gp.targetState, 'onChange' );
	if ( ! onChangeNode ) return { ok: false, reason: 'REFUSED:gradient-target-state-missing-onChange' };
	const propSrc =
		`gradientValue: attributes.${ gp.gradAttr },\n` +
		indentOfLine( editSrc, onChangeNode.start ) +
		`onGradientChange: ( val ) => setAttributes( { ${ gp.gradAttr }: val ?? '' } )`;
	const newSrc = insertPropAfter( editSrc, onChangeNode, propSrc );
	return { ok: true, src: newSrc };
}

// Add `hoverAttr` to the SAME destructuring `ObjectPattern` that already
// destructures `baseIdent` from `attributes` — found via a fresh AST parse
// (not the caller's stale one; the caller may be re-invoking this after an
// earlier splice already shifted offsets). Refuses rather than guesses: a
// file with no destructure block containing `baseIdent`, or with more than
// one, or that fails to parse, is left untouched and reported.
//
// FOUND LIVE 2026-09-04 (qc-council audit): buildHoverStateSource() clones
// the normal state's JSX and swaps in a brand-new bare identifier
// (`hoverAttr`) for `value:`, but never added that identifier anywhere the
// component could read it — every one of 11 real --apply runs this session
// threw "no binding in scope" at check-undefined-refs.js. This closes that
// gap as an independent, narrowly-scoped AST edit, rather than changing how
// the state clone itself is built (an earlier attempt to read via
// `attributes.X` instead broke unrelated self-tests that assume a bare
// Identifier shape for the states-array value).
function insertHoverAttrIntoDestructure( editSrc, baseIdent, hoverAttr ) {
	let ast;
	try {
		ast = babelParser.parse( editSrc, BABEL_PARSE_OPTS );
	} catch ( e ) {
		return { ok: false, reason: 'destructure-insert-parse-failed' };
	}
	const traverse = require( '@babel/traverse' ).default;
	const matches = [];
	traverse( ast, {
		ObjectPattern( p ) {
			const props = p.node.properties;
			const hasBase = props.some(
				( prop ) =>
					prop.type === 'ObjectProperty' &&
					prop.shorthand &&
					prop.key &&
					prop.key.type === 'Identifier' &&
					prop.key.name === baseIdent
			);
			if ( hasBase ) matches.push( p.node );
		},
	} );
	if ( matches.length === 0 ) return { ok: false, reason: 'destructure-block-not-found-for-base-attr' };
	if ( matches.length > 1 ) return { ok: false, reason: 'multiple-destructure-blocks-ambiguous' };

	const node = matches[ 0 ];
	const alreadyPresent = node.properties.some(
		( prop ) =>
			prop.type === 'ObjectProperty' &&
			prop.shorthand &&
			prop.key &&
			prop.key.type === 'Identifier' &&
			prop.key.name === hoverAttr
	);
	if ( alreadyPresent ) return { ok: true, src: editSrc };

	const last = node.properties[ node.properties.length - 1 ];
	const indent = indentOfLine( editSrc, last.start );
	const between = editSrc.slice( last.end, node.end - 1 );
	const commaMatch = between.match( /^\s*,/ );
	const insertAt = commaMatch ? last.end + commaMatch[ 0 ].length : last.end;
	const insertion = ( commaMatch ? '' : ',' ) + '\n' + indent + hoverAttr + ',';
	return { ok: true, src: editSrc.slice( 0, insertAt ) + insertion + editSrc.slice( insertAt ) };
}

function applyEditJsFix( editSrc, plan ) {
	if ( plan.kind === 'gradient' ) return applyGradientEditJsFix( editSrc, plan.gradientPlan );

	const stateSrc = buildHoverStateSource( editSrc, plan.normalState, plan.hoverAttr, '' );
	if ( stateSrc == null ) return { ok: false, reason: 'REFUSED:normal-state-value-not-a-plain-identifier' };

	const statesNode = plan.statesNode;
	// Insert before the closing bracket of the states array, after the last
	// element, matching that element's trailing-comma style.
	const elements = statesNode.elements.filter( Boolean );
	const last = elements[ elements.length - 1 ];
	const indent = indentOfLine( editSrc, last.start );
	const between = editSrc.slice( last.end, statesNode.end - 1 ); // text between last element and closing `]`
	const commaMatch = between.match( /^\s*,/ );
	// If a trailing comma already follows the last element, insert AFTER it
	// (so it stays attached to the last element) rather than before it —
	// inserting before would strand the original comma as a stray duplicate.
	const insertAt = commaMatch ? last.end + commaMatch[ 0 ].length : last.end;
	const insertion = ( commaMatch ? '' : ',' ) + '\n' + indent + stateSrc.trim() + ',';
	const newSrc = editSrc.slice( 0, insertAt ) + insertion + editSrc.slice( insertAt );

	if ( ! plan.baseIdent ) return { ok: false, reason: 'REFUSED:no-base-ident-for-destructure-insert' };
	const destructureResult = insertHoverAttrIntoDestructure( newSrc, plan.baseIdent, plan.hoverAttr );
	if ( ! destructureResult.ok ) return { ok: false, reason: 'REFUSED:' + destructureResult.reason };

	return { ok: true, src: destructureResult.src };
}

function applyBlockJsonFix( blockJson, plan ) {
	if ( plan.kind === 'gradient' ) {
		const gp = plan.gradientPlan;
		if ( gp.mode === 'wire-only' ) return { changed: false, json: blockJson }; // already declared.
		const already = !! ( blockJson.attributes && blockJson.attributes[ gp.gradAttr ] );
		if ( already ) return { changed: false, json: blockJson };
		const next = JSON.parse( JSON.stringify( blockJson ) );
		next.attributes = next.attributes || {};
		next.attributes[ gp.gradAttr ] = { type: 'string', default: '' };
		return { changed: true, json: next };
	}
	if ( plan.hoverAlreadyDeclared ) return { changed: false, json: blockJson };
	const next = JSON.parse( JSON.stringify( blockJson ) );
	next.attributes = next.attributes || {};
	next.attributes[ plan.hoverAttr ] = { type: 'string', default: '' };
	return { changed: true, json: next };
}

// TASK 2 — declare the new gradient PHP variable right after the base var's
// OWN statement ends (found via the SAME single-statement-assignment scan
// findVarAssignedFromAttr() already used for hover), then splice the
// resolved fragment (identified by planRow's resolveFillGradientDirectSite /
// resolveBorderGradientExtendSite) for the mechanism-specific replacement.
function applyGradientRenderPhpFix( phpText, gp ) {
	if ( gp.mode === 'wire-only' ) return phpText; // render.php already consumes this gradient attr.

	const declRe = new RegExp( '\\$' + gp.phpVarName + '\\s*=[^;\\n]*\\$attributes\\s*\\[[^;]*;', 'g' );
	const m = declRe.exec( phpText );
	if ( ! m ) return phpText; // planRow already verified findVarAssignedFromAttr succeeded; defensive no-op only.
	const stmtEnd = m.index + m[ 0 ].length;
	const indent = indentOfLine( phpText, phpText.lastIndexOf( '\n', m.index - 1 ) + 1 );
	const gradDecl = `\n${ indent }$${ gp.gradVarName } = sgs_css_gradient_value( $attributes['${ gp.gradAttr }'] ?? '' );`;

	// The fragment offsets were computed against the ORIGINAL phpText before
	// this insertion — apply the fragment replacement FIRST (offsets still
	// valid), then insert the declaration line (a position computed
	// independently via regex re-scan, not reused from the fragment's own
	// offsets, so it is unaffected by the fragment edit as long as the decl
	// insertion point is before the fragment — true here, since the var's
	// own assignment always precedes its first use).
	let replacement;
	if ( gp.mode === 'fill-direct' ) {
		const call = `sgs_background_paint_decl( $${ gp.phpVarName }, $${ gp.gradVarName } )`;
		// A fused literal (Bug A) carries a non-empty `prefix` — the text that
		// sat between the literal's opening quote and `background-color:`
		// (e.g. a selector like ` .sgs-nav-menu__burger{`). That text is NOT
		// part of what's being replaced (fragStart starts at the quote), so
		// it must be re-emitted, re-closed with the SAME quote char, before
		// concatenating the paint-decl call. An empty prefix (the original,
		// standalone `'background-color:' .` shape) replaces cleanly with
		// just the call, unchanged from before this fix.
		replacement = gp.prefix ? `${ gp.quote }${ gp.prefix }${ gp.quote } . ${ call }` : call;
	} else {
		replacement = `'' !== $${ gp.gradVarName } ? $${ gp.gradVarName } : sgs_colour_value( $${ gp.phpVarName } )`;
	}
	const withFragment = phpText.slice( 0, gp.fragStart ) + replacement + phpText.slice( gp.fragEnd );

	// Re-locate the decl insertion point in the FRAGMENT-EDITED text: since
	// the var's assignment statement is always BEFORE its first use, and the
	// fragment edit only touches text at/after fragStart (which is after the
	// var's own assignment), the decl statement's end offset in the original
	// text is still valid in `withFragment` whenever stmtEnd <= gp.fragStart.
	if ( stmtEnd > gp.fragStart ) {
		// Defensive: should never happen (a var's own assignment cannot start
		// after its own first use), but never silently trust a stale offset.
		return null;
	}
	return withFragment.slice( 0, stmtEnd ) + gradDecl + withFragment.slice( stmtEnd );
}

function applyRenderPhpFix( phpText, plan ) {
	if ( plan.kind === 'gradient' ) return applyGradientRenderPhpFix( phpText, plan.gradientPlan );

	const hoverGuardVar = '$attributes[\'' + plan.hoverAttr + '\']';

	if ( plan.mode === 'sink-array-push' ) {
		// Strategy H: push a new conditional element onto the block's
		// EXISTING hover-decls array, right before that array is consumed —
		// guaranteed to run after every one of the block's own pushes onto it.
		const indent = indentOfLine( phpText, plan.insertBeforeLine );
		const insertion =
			`${ indent }if ( '' !== ( ${ hoverGuardVar } ?? '' ) ) {\n` +
			`${ indent }\t$${ plan.sinkVar }[] = '${ plan.propText }:' . sgs_colour_value( ${ hoverGuardVar } );\n` +
			`${ indent }}\n`;
		return phpText.slice( 0, plan.insertBeforeLine ) + insertion + phpText.slice( plan.insertBeforeLine );
	}

	// The consumption statement (`plan.stmtEnd`) routinely sits nested inside
	// one or two `if ( '' !== $var )` guards testing the BASE attribute's
	// resolved value — splicing at the statement's own `;` would land the
	// hover block INSIDE those guards, so it silently never renders when the
	// base colour is unset. Hoist past every such enclosing guard (matching
	// the already-shipped burgerBg/burgerHoverColour top-level shape,
	// nav-menu:1166-1173) via `computeHoistedInsertionPoint` — a no-op
	// (returns `plan.stmtEnd` unchanged) when the statement isn't nested in a
	// base-value guard at all, or when `plan.stmtStart` is unavailable (an
	// older/other caller that hasn't been updated to supply it).
	const insertAt = plan.stmtStart != null
		? computeHoistedInsertionPoint( phpText, plan.stmtStart, plan.stmtEnd, plan.guardVarNames )
		: plan.stmtEnd;
	const indent = indentOfLine( phpText, phpText.lastIndexOf( '\n', insertAt - 1 ) + 1 );
	let insertion;
	if ( plan.sinkIsAppend ) {
		// Double-quoted, matching the array-push branch below — NOT the
		// single-quoted form this used to be. A selectorTemplate can now
		// legitimately carry `{$var}` PHP-interpolation syntax (Strategy T,
		// resolveTextGradientChainSelector, e.g. `{$uid_sel} .sgs-nav-menu__sublink`
		// for sgs/nav-menu.submenuColour) — PHP only expands `{$var}` inside
		// double quotes; inside single quotes it prints those seven
		// characters literally. Plain literal text (the ONLY shape
		// resolveDirectSelector itself ever produced) is unaffected by the
		// quote-style change.
		insertion =
			`\n${ indent }if ( '' !== ( ${ hoverGuardVar } ?? '' ) ) {\n` +
			`${ indent }\t$${ plan.sinkVar } .= "${ plan.selectorTemplate }:hover,${ plan.selectorTemplate }:focus-visible{" . "${ plan.propText }:" . sgs_colour_value( ${ hoverGuardVar } ) . '}';\n` +
			`${ indent }}`;
	} else {
		insertion =
			`\n${ indent }if ( '' !== ( ${ hoverGuardVar } ?? '' ) ) {\n` +
			`${ indent }\t$${ plan.sinkVar }[] = "${ plan.selectorTemplate }:hover,${ plan.selectorTemplate }:focus-visible{${ plan.propText }:" . sgs_colour_value( ${ hoverGuardVar } ) . '}';\n` +
			`${ indent }}`;
	}
	const newSrc = phpText.slice( 0, insertAt ) + insertion + phpText.slice( insertAt );
	return newSrc;
}

// ---------------------------------------------------------------------------
// Per-row driver
// ---------------------------------------------------------------------------
// Mirrors survey.js's own per-row verdict computation EXACTLY (same block-
// level emitsColour/emitsState/wrapperRouted gates). This tool must only ever
// act on rows survey itself would call `AUTOFIXABLE:helper-at-existing-
// selector` — recomputing fixability from row shape alone, without this
// gate, would silently widen scope onto tier B/C rows (STOP: a fixer that
// quietly widens its own scope is the failure task-1-brief.md exists to
// prevent).
function surveyVerdictForRow( db, slug, row, php ) {
	const wrapperRouted = /SGS_Container_Wrapper::render/.test( php );
	const emitsColour = [
		'sgs_text_colour_decl',
		'sgs_background_paint_decl',
		'sgs_border_gradient_css',
		'sgs_emit_state_colour_css',
		'sgs_colour_value',
	].some( ( h ) => php.includes( h + '(' ) );
	const emitsState = php.includes( 'sgs_emit_state_colour_css' ) || php.includes( ':hover' );

	const dbRow = row.attr && db[ slug ] ? db[ slug ][ row.attr ] : null;
	const cssProperty = dbRow ? dbRow.css_property : null;
	const mech = resolveMechanismFromCssProperty( cssProperty );
	const mechanisms = mech.unresolved ? [] : mech.mechanisms || [];
	const mechanism = mechanisms.length ? mechanisms.join( '|' ) : null;

	const needsHover = row.statesCount < 2;
	const needsGradient = ! row.hasGradient && ! mechanisms.includes( 'shadow' );

	if ( ! needsHover && ! needsGradient ) return 'CONFORMANT';
	if ( ! row.attr ) return 'REFUSED:unresolvable-attr';
	if ( ! mechanism ) return 'REFUSED:no-css_property';
	if ( emitsState ) return 'AUTOFIXABLE:helper-at-existing-selector';
	if ( emitsColour ) return 'AUTOFIXABLE:wire-state-emitter';
	if ( wrapperRouted ) return 'AUTOFIXABLE:wrapper-emits';
	return 'REFUSED:block-emits-no-colour-css';
}

function collectPlans( db, cache ) {
	const plans = [];
	const refusals = [];

	for ( const dir of blockDirs() ) {
		const slug = 'sgs/' + dir;
		const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
		const renderFile = path.join( BLOCKS_DIR, dir, 'render.php' );
		if ( ! fs.existsSync( renderFile ) ) continue;
		const phpText = fs.readFileSync( renderFile, 'utf8' );

		for ( const row of rowsInFile( cache, editFile ) ) {
			const verdict = surveyVerdictForRow( db, slug, row, phpText );
			if ( verdict !== 'AUTOFIXABLE:helper-at-existing-selector' ) continue; // out of THIS task's scope — Task 2/3, or already conformant, or a different refusal survey already named.

			const plan = planRow( db, dir, slug, row, phpText );
			if ( plan.fixable ) {
				plans.push( Object.assign( { dir, slug, editFile, renderFile }, plan ) );
			} else if ( ! /^CONFORMANT/.test( plan.reason ) ) {
				refusals.push( { dir, slug, rowKey: row.rowKey, attr: row.attr, reason: plan.reason } );
			}
		}

		// DesignTokenPicker-standalone rows: report tier-A ones as refused
		// (named reason), never silently drop them from the census.
		//
		// The refusal REASON is derived the same way planRow() derives it for
		// SgsColourPanel rows, not a single generic string for every case —
		// found live 2026-09-04 (qc-council audit): the blanket message
		// implied every row was blocked on "no hover-clone site", but several
		// standalone rows already carry an explicit hover state in their own
		// JSX (statesCount===2) and are refused purely on the SEPARATE
		// gradient dimension (text-mechanism, Task 3 scope) — the exact same
		// class fix.js already names accurately for SgsColourPanel rows. A
		// row whose sole state is non-normal (e.g. a deliberate hover-only
		// design) gets the SAME `no-explicit-normal-state` exemption reason
		// planRow() uses, rather than being folded into the DesignTokenPicker
		// bucket at all. Only a row that genuinely still needs the HOVER
		// dimension keeps the standalone-shape refusal — that part of the
		// original reason (fix.js cannot safely write a new row object into
		// raw JSX) remains true and unchanged.
		for ( const row of designTokenPickerRows( cache, editFile ) ) {
			const verdict = surveyVerdictForRow( db, slug, row, phpText );
			if ( verdict !== 'AUTOFIXABLE:helper-at-existing-selector' ) continue;

			const explicitNormal = hasExplicitNormalState( row.statesNode );
			if ( ! explicitNormal ) {
				refusals.push( {
					dir,
					slug,
					rowKey: row.rowKey,
					attr: row.attr,
					reason: 'REFUSED:no-explicit-normal-state (sole state is non-normal — likely paired with native WP colour support; synthesising a normal state would misrepresent the design)',
				} );
				continue;
			}

			const needsHover = row.statesCount < 2;
			if ( ! needsHover ) {
				const dbRow = row.attr && db[ slug ] ? db[ slug ][ row.attr ] : null;
				const mech = resolveMechanismFromCssProperty( dbRow ? dbRow.css_property : null );
				const mechanism = ! mech.unresolved && mech.mechanisms && mech.mechanisms.length === 1 ? mech.mechanisms[ 0 ] : null;
				if ( mechanism === 'text' ) {
					refusals.push( {
						dir,
						slug,
						rowKey: row.rowKey,
						attr: row.attr,
						reason:
							'REFUSED:gradient-path-deferred (text-mechanism gradient is background-clip:text, a ' +
							'structurally different helper pair — Task 3 scope, not this pass; hover state already ' +
							'present, this row is blocked on gradient alone)',
					} );
					continue;
				}

				// A fill/border (or unresolved) mechanism still needing only the
				// GRADIENT dimension — same "hover already shipped" situation as
				// the text branch above, just a different mechanism. Found live
				// 2026-09-04 (sgs/process-steps.backgroundColour): this branch used
				// to fall straight through to the generic row-shape-not-supported
				// reason below, whose wording ("no SgsColourPanel row object to
				// clone a hover state from") is written for a row that STILL NEEDS
				// hover — it reads as if nothing has been done, when hover is
				// already live in render.php and only the gradient dimension is
				// out of scope. Named honestly instead of restating the generic
				// deferred-mechanism reason.
				refusals.push( {
					dir,
					slug,
					rowKey: row.rowKey,
					attr: row.attr,
					reason:
						// `mechanism` is null here ONLY when 2+ mechanisms resolved
						// (ambiguous which one) -- a zero-mechanism row is already
						// filtered out upstream by surveyVerdictForRow's own
						// 'REFUSED:no-css_property' check (line ~1165), which every
						// row in this loop has already passed via the
						// AUTOFIXABLE:helper-at-existing-selector gate above. So the
						// null branch is never "we don't know the mechanism" --
						// naming it 'unresolved' would misrepresent an ambiguous-
						// multi-mechanism row as an unresolved one. Name the real
						// mechanism list instead.
						'REFUSED:gradient-path-deferred (mechanism=' + ( mechanism || mech.mechanisms.join( '|' ) ) +
						'; standalone DesignTokenPicker row shape — no SgsColourPanel row object to safely ' +
						'rewrite the gradient wiring into, out of scope for this pass; hover state already ' +
						'present, this row is blocked on gradient alone)',
				} );
				continue;
			}

			refusals.push( {
				dir,
				slug,
				rowKey: row.rowKey,
				attr: row.attr,
				reason:
					'REFUSED:standalone-DesignTokenPicker-row-shape-not-supported (no SgsColourPanel row object to clone a hover state from; out of scope for this pass)',
			} );
		}
	}
	return { plans, refusals };
}

function applyPlan( plan, apply ) {
	const editSrc = fs.readFileSync( plan.editFile, 'utf8' );
	const editResult = applyEditJsFix( editSrc, plan );
	if ( ! editResult.ok ) return { ok: false, reason: editResult.reason, dir: plan.dir, rowAttr: plan.baseAttr };

	const blockJson = JSON.parse( fs.readFileSync( plan.blockJsonPath, 'utf8' ) );
	const bjResult = applyBlockJsonFix( blockJson, plan );

	const phpSrc = fs.readFileSync( plan.renderFile, 'utf8' );
	const newPhpSrc = applyRenderPhpFix( phpSrc, plan );
	if ( newPhpSrc == null ) {
		return { ok: false, reason: 'REFUSED:gradient-decl-insertion-point-after-fragment (defensive guard tripped)', dir: plan.dir, rowAttr: plan.baseAttr };
	}

	const diffs = [
		{ file: plan.editFile, before: editSrc, after: editResult.src },
		{
			file: plan.blockJsonPath,
			before: JSON.stringify( blockJson, null, '\t' ) + '\n',
			after: bjResult.changed ? JSON.stringify( bjResult.json, null, '\t' ) + '\n' : null,
		},
		{ file: plan.renderFile, before: phpSrc, after: newPhpSrc },
	];

	if ( apply ) {
		fs.writeFileSync( plan.editFile, editResult.src, 'utf8' );
		if ( bjResult.changed ) {
			// Preserve original file's trailing newline convention.
			const original = fs.readFileSync( plan.blockJsonPath, 'utf8' );
			const trailingNl = /\n$/.test( original );
			let out = JSON.stringify( bjResult.json, null, '\t' );
			if ( trailingNl ) out += '\n';
			fs.writeFileSync( plan.blockJsonPath, out, 'utf8' );
		}
		fs.writeFileSync( plan.renderFile, newPhpSrc, 'utf8' );
	}

	const newAttrLabel = plan.kind === 'gradient' ? plan.gradientPlan.gradAttr : plan.hoverAttr;
	return { ok: true, dir: plan.dir, rowAttr: plan.baseAttr, hoverAttr: newAttrLabel, diffs };
}

// ---------------------------------------------------------------------------
// Idempotence check for --check / re-run: a row already fixed shows
// hasExplicitNormalState + hover state present + resolvable, and planRow()
// returns CONFORMANT-already, so collectPlans() naturally excludes it from
// both `plans` and `refusals`. --check therefore just re-collects and fails
// if any FIXABLE plan remains outstanding.
// ---------------------------------------------------------------------------

function printDiff( diffs ) {
	for ( const d of diffs ) {
		if ( d.after == null ) continue; // unchanged (e.g. block.json hover attr already declared)
		console.log( '--- ' + d.file );
		if ( d.before === d.after ) {
			console.log( '  (no change)' );
			continue;
		}
		// Minimal line-based diff for readability — this is a dry-run report,
		// not a patch file.
		const beforeLines = d.before.split( '\n' );
		const afterLines = d.after.split( '\n' );
		let i = 0;
		while ( i < beforeLines.length && i < afterLines.length && beforeLines[ i ] === afterLines[ i ] ) i++;
		let j = 0;
		while (
			j < beforeLines.length - i &&
			j < afterLines.length - i &&
			beforeLines[ beforeLines.length - 1 - j ] === afterLines[ afterLines.length - 1 - j ]
		)
			j++;
		const removed = beforeLines.slice( i, beforeLines.length - j );
		const added = afterLines.slice( i, afterLines.length - j );
		removed.forEach( ( l ) => console.log( '  - ' + l ) );
		added.forEach( ( l ) => console.log( '  + ' + l ) );
	}
}

// Re-resolve and apply ONE row fresh from the CURRENT on-disk state of its
// block's files. Required because when a single block has more than one
// tier-A row (e.g. sgs/text had both borderColour and firstLetterColour),
// applying the first row's fix shifts every byte offset the AST parse of the
// SECOND row's plan was computed against — reusing those stale offsets
// against the already-mutated file corrupts it. (Caught live: it did,
// mid-build, on sgs/text/edit.js — see task-1-report.md.)
function reresolveAndApplyOne( db, dir, slug, targetAttr, apply ) {
	const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
	const renderFile = path.join( BLOCKS_DIR, dir, 'render.php' );
	const blockJsonPath = path.join( BLOCKS_DIR, dir, 'block.json' );
	const cache = new SourceCache(); // fresh — must not reuse a cache holding the pre-mutation parse.
	const phpText = fs.readFileSync( renderFile, 'utf8' );
	const rows = rowsInFile( cache, editFile );
	const row = rows.find( ( r ) => r.attr === targetAttr );
	if ( ! row ) return { ok: false, reason: 'row-not-found-on-re-resolve (attr=' + targetAttr + ')' };
	const verdict = surveyVerdictForRow( db, slug, row, phpText );
	if ( verdict !== 'AUTOFIXABLE:helper-at-existing-selector' ) return { ok: false, reason: 'no-longer-tier-A-on-re-resolve: ' + verdict };
	const plan = planRow( db, dir, slug, row, phpText );
	if ( ! plan.fixable ) return { ok: false, reason: plan.reason };
	return applyPlan( Object.assign( { dir, slug, editFile, renderFile, blockJsonPath }, plan ), apply );
}

function runFix( { apply } ) {
	const db = loadDbRows();
	const cache = new SourceCache();
	const { plans, refusals } = collectPlans( db, cache );

	console.log(
		'\ncolour-codemod FIX (tier A, hover-only sub-scope) — ' +
			plans.length +
			' fixable, ' +
			refusals.length +
			' refused\n'
	);

	let fixedCount = 0;
	if ( ! apply ) {
		// DRY RUN never writes, so the single upfront parse is safe to reuse —
		// no offsets are ever invalidated by a write that never happens.
		for ( const plan of plans ) {
			const result = applyPlan( plan, false );
			if ( ! result.ok ) {
				console.log( `REFUSED (late) ${ plan.slug }.${ plan.baseAttr }: ${ result.reason }` );
				continue;
			}
			fixedCount++;
			console.log( `WOULD FIX ${ plan.slug }.${ plan.baseAttr } -> +${ result.hoverAttr } (${ plan.kind })` );
			printDiff( result.diffs );
		}
	} else {
		// APPLY: re-resolve each row fresh from disk immediately before
		// writing it, so a prior row's write in the SAME file can never leave
		// this row's edit working from stale AST offsets.
		for ( const plan of plans ) {
			const result = reresolveAndApplyOne( db, plan.dir, plan.slug, plan.baseAttr, true );
			if ( ! result.ok ) {
				console.log( `REFUSED (late) ${ plan.slug }.${ plan.baseAttr }: ${ result.reason }` );
				continue;
			}
			fixedCount++;
			console.log( `APPLIED ${ plan.slug }.${ plan.baseAttr } -> +${ result.hoverAttr } (${ plan.kind })` );
		}
	}

	console.log( `\n${ apply ? 'Applied' : 'Would apply' } ${ fixedCount } fix(es).` );
	console.log( `${ refusals.length } row(s) refused:` );
	for ( const r of refusals ) console.log( `  ${ r.slug }.${ r.attr || r.rowKey } — ${ r.reason }` );
	console.log();
	return { fixedCount, refusals };
}

function runCheck() {
	const db = loadDbRows();
	const cache = new SourceCache();
	const { plans } = collectPlans( db, cache );
	if ( plans.length > 0 ) {
		console.log( `[fix --check] ${ plans.length } tier-A row(s) still fixable and unfixed:` );
		for ( const p of plans ) console.log( `  ${ p.slug }.${ p.baseAttr }` );
		process.exitCode = 1;
		return;
	}
	console.log( '[fix --check] OK — no outstanding tier-A (hover-only sub-scope) rows.' );
}

// ---------------------------------------------------------------------------
// --self-test — including MANDATORY negative controls (task-1-brief.md).
// Runs entirely against synthetic fixture files under a temp dir; never
// touches the real block tree.
// ---------------------------------------------------------------------------
function assert( cond, msg ) {
	if ( ! cond ) throw new Error( 'SELF-TEST FAILED: ' + msg );
}

function countLiteralStatesElements( editSrc ) {
	// Re-parse the OUTPUT and count the states ArrayExpression's elements
	// STATICALLY — exactly what rule 31 does. This is the D738 guard: it must
	// be a literal ArrayExpression, never a runtime-computed count.
	const ast = babelParser.parse( editSrc, BABEL_PARSE_OPTS );
	let statesNode = null;
	const traverse = require( '@babel/traverse' ).default;
	traverse( ast, {
		JSXOpeningElement( p ) {
			if ( jsxName( p.node ) !== 'SgsColourPanel' ) return;
			const rowsExpr = jsxAttrExpr( p.node, 'rows' );
			if ( ! rowsExpr || rowsExpr.type !== 'ArrayExpression' ) return;
			for ( const el of rowsExpr.elements ) {
				const obj = unwrapRowObject( el );
				if ( ! obj ) continue;
				const st = objProp( obj, 'states' );
				if ( st && st.type === 'ArrayExpression' ) statesNode = st;
			}
		},
	} );
	assert( statesNode && statesNode.type === 'ArrayExpression', 'expected a literal states ArrayExpression after fix' );
	return statesNode.elements.length;
}

function makeFixture( tmpDir, name, { editJs, renderPhp, blockJson } ) {
	const dir = path.join( tmpDir, name );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'edit.js' ), editJs, 'utf8' );
	fs.writeFileSync( path.join( dir, 'render.php' ), renderPhp, 'utf8' );
	fs.writeFileSync( path.join( dir, 'block.json' ), JSON.stringify( blockJson, null, '\t' ) + '\n', 'utf8' );
	return dir;
}

const FIXTURE_EDIT_JS = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { titleColour } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'title',
					label: __( 'Title colour', 'sgs-blocks' ),
					gradientCapable: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: titleColour,
							onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;

const FIXTURE_RENDER_PHP = `<?php
$title_colour = $attributes['titleColour'] ?? '';
$scoped_css_parts = array();
if ( '' !== $title_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture__title{color:" . sgs_colour_value( $title_colour ) . '}';
}
`;

const FIXTURE_BLOCK_JSON = {
	apiVersion: 3,
	name: 'sgs/fixture',
	attributes: {
		titleColour: { type: 'string', default: '' },
	},
};

function runSelfTest() {
	const os = require( 'os' );
	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-colour-fix-selftest-' ) );
	let failures = 0;

	function check( label, fn ) {
		try {
			fn();
			console.log( '  PASS  ' + label );
		} catch ( e ) {
			failures++;
			console.log( '  FAIL  ' + label + '\n        ' + e.message );
		}
	}

	// --- fixable-shape assertions on the pure planning/editing functions ---
	check( 'resolveDirectSelector finds the fixture selector+property', () => {
		const r = resolveDirectSelector( FIXTURE_RENDER_PHP, 'title_colour' );
		assert( r.ok, 'expected ok, got refusal: ' + r.reason );
		assert( r.selectorTemplate === '.{$uid}.sgs-fixture__title', 'selector mismatch: ' + r.selectorTemplate );
		assert( r.propText === 'color', 'property mismatch: ' + r.propText );
	} );

	check( 'resolveDirectSelector refuses when no helper call exists', () => {
		const r = resolveDirectSelector( '<?php $x = $attributes["y"] ?? "";', 'x' );
		assert( ! r.ok, 'expected refusal' );
		assert( r.reason === 'no-colour-helper-call-found-for-attr-var', 'wrong reason: ' + r.reason );
	} );

	check( 'resolveDirectSelector refuses on indirect array-assembled selector', () => {
		const indirectPhp = `<?php
$attrib_colour = $attributes['attributionColour'] ?? '';
$attrib_decls = array();
if ( $attrib_colour ) {
	$attrib_decls[] = 'color:' . sgs_colour_value( $attrib_colour );
}
`;
		const r = resolveDirectSelector( indirectPhp, 'attrib_colour' );
		assert( ! r.ok, 'expected refusal for indirect assembly' );
		assert( r.reason === 'no-css-rule-brace-in-literal-prefix', 'wrong reason: ' + r.reason );
	} );

	// --- end-to-end: dry-run then apply on a real fixture directory ---
	const fx1 = makeFixture( tmpRoot, 'fixture-a', {
		editJs: FIXTURE_EDIT_JS,
		renderPhp: FIXTURE_RENDER_PHP,
		blockJson: FIXTURE_BLOCK_JSON,
	} );

	function planFixtureRow( dir ) {
		const cache = new SourceCache();
		const editFile = path.join( dir, 'edit.js' );
		const rows = rowsInFile( cache, editFile );
		assert( rows.length === 1, 'expected exactly one row in fixture, got ' + rows.length );
		const row = rows[ 0 ];
		const phpText = fs.readFileSync( path.join( dir, 'render.php' ), 'utf8' );
		const db = { 'sgs/fixture': { titleColour: { css_property: 'color' } } };
		return { row, plan: planRow( db, path.basename( dir ), 'sgs/fixture', row, phpText, path.join( dir, 'block.json' ) ), phpText };
	}

	let fx1Plan;
	check( 'fixture row plans as fixable (hover-only, mechanism=text)', () => {
		const { plan } = planFixtureRow( fx1 );
		assert( plan.fixable, 'expected fixable, got refusal: ' + JSON.stringify( plan ) );
		assert( plan.hoverAttr === 'titleColourHover', 'wrong hover attr name: ' + plan.hoverAttr );
		fx1Plan = plan;
	} );

	check( 'DRY RUN writes nothing', () => {
		const before = {
			editJs: fs.readFileSync( path.join( fx1, 'edit.js' ), 'utf8' ),
			renderPhp: fs.readFileSync( path.join( fx1, 'render.php' ), 'utf8' ),
			blockJson: fs.readFileSync( path.join( fx1, 'block.json' ), 'utf8' ),
		};
		const plan = Object.assign( {}, fx1Plan, {
			dir: 'fixture-a',
			slug: 'sgs/fixture',
			editFile: path.join( fx1, 'edit.js' ),
			renderFile: path.join( fx1, 'render.php' ),
			blockJsonPath: path.join( fx1, 'block.json' ),
		} );
		applyPlan( plan, false );
		const after = {
			editJs: fs.readFileSync( path.join( fx1, 'edit.js' ), 'utf8' ),
			renderPhp: fs.readFileSync( path.join( fx1, 'render.php' ), 'utf8' ),
			blockJson: fs.readFileSync( path.join( fx1, 'block.json' ), 'utf8' ),
		};
		assert( before.editJs === after.editJs, 'DRY RUN mutated edit.js' );
		assert( before.renderPhp === after.renderPhp, 'DRY RUN mutated render.php' );
		assert( before.blockJson === after.blockJson, 'DRY RUN mutated block.json' );
	} );

	check( 'APPLY writes a literal hover state (D738 guard: static element count)', () => {
		const plan = Object.assign( {}, fx1Plan, {
			dir: 'fixture-a',
			slug: 'sgs/fixture',
			editFile: path.join( fx1, 'edit.js' ),
			renderFile: path.join( fx1, 'render.php' ),
			blockJsonPath: path.join( fx1, 'block.json' ),
		} );
		const result = applyPlan( plan, true );
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );
		const editSrc = fs.readFileSync( path.join( fx1, 'edit.js' ), 'utf8' );
		const count = countLiteralStatesElements( editSrc );
		assert( count === 2, 'expected 2 literal states elements after fix, got ' + count );
		const php = fs.readFileSync( path.join( fx1, 'render.php' ), 'utf8' );
		assert( php.includes( ':hover' ), 'render.php missing :hover rule after fix' );
		const bj = JSON.parse( fs.readFileSync( path.join( fx1, 'block.json' ), 'utf8' ) );
		assert( !! bj.attributes.titleColourHover, 'block.json missing titleColourHover attribute' );
	} );

	// --- Idempotence control ---
	check( 'idempotence: applying twice is a no-op the second time', () => {
		const cache = new SourceCache();
		const editFile = path.join( fx1, 'edit.js' );
		const rows = rowsInFile( cache, editFile );
		const phpText = fs.readFileSync( path.join( fx1, 'render.php' ), 'utf8' );
		const db = { 'sgs/fixture': { titleColour: { css_property: 'color' } } };
		const plan2 = planRow( db, 'fixture-a', 'sgs/fixture', rows[ 0 ], phpText, path.join( fx1, 'block.json' ) );
		assert( ! plan2.fixable, 'expected second run to find nothing left to fix' );
		assert( /CONFORMANT-already/.test( plan2.reason ), 'expected CONFORMANT-already, got: ' + plan2.reason );
	} );

	// --- Refusal control: unresolvable mechanism must be refused, file untouched ---
	const FIXTURE_EDIT_JS_AMBIGUOUS = FIXTURE_EDIT_JS.split( 'titleColour' ).join( 'weirdColour' );
	const FIXTURE_RENDER_PHP_AMBIGUOUS = `<?php
$weird_colour = $attributes['weirdColour'] ?? '';
$scoped_css_parts = array();
if ( '' !== $weird_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture__weird{color:" . sgs_colour_value( $weird_colour ) . '}';
}
`;
	const fx2 = makeFixture( tmpRoot, 'fixture-b', {
		editJs: FIXTURE_EDIT_JS_AMBIGUOUS,
		renderPhp: FIXTURE_RENDER_PHP_AMBIGUOUS,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-b',
			attributes: { weirdColour: { type: 'string', default: '' } },
		},
	} );

	check( 'refusal control: no css_property in DB => REFUSED, file byte-identical after', () => {
		const before = fs.readFileSync( path.join( fx2, 'render.php' ), 'utf8' );
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx2, 'edit.js' ) );
		const phpText = fs.readFileSync( path.join( fx2, 'render.php' ), 'utf8' );
		const db = { 'sgs/fixture-b': { weirdColour: { css_property: null } } }; // unresolvable on purpose
		const plan = planRow( db, 'fixture-b', 'sgs/fixture-b', rows[ 0 ], phpText, path.join( fx2, 'block.json' ) );
		assert( ! plan.fixable, 'expected refusal for null css_property' );
		assert( /no-css_property-mechanism-unresolved/.test( plan.reason ), 'wrong refusal reason: ' + plan.reason );
		const after = fs.readFileSync( path.join( fx2, 'render.php' ), 'utf8' );
		assert( before === after, 'refusal control: file was mutated despite refusal' );
	} );

	// --- Detection control: a single-state row is DETECTED by --check ---
	check( 'detection control: single-state row makes --check-equivalent report non-empty, then empty after fix', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx1, 'edit.js' ) ); // fx1 already fixed above => 2 states now
		assert( rows[ 0 ].statesCount === 2, 'fixture-a expected to already carry 2 states from the apply step above' );

		// Build a FRESH single-state fixture to prove detection independently.
		const fx3 = makeFixture( tmpRoot, 'fixture-c', {
			editJs: FIXTURE_EDIT_JS.split( 'titleColour' ).join( 'panelColour' ),
			renderPhp: `<?php
$panel_colour = $attributes['panelColour'] ?? '';
$scoped_css_parts = array();
if ( '' !== $panel_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture__panel{background-color:" . sgs_colour_value( $panel_colour ) . '}';
}
`,
			blockJson: {
				apiVersion: 3,
				name: 'sgs/fixture-c',
				attributes: { panelColour: { type: 'string', default: '' } },
			},
		} );
		const rows3 = rowsInFile( new SourceCache(), path.join( fx3, 'edit.js' ) );
		assert( rows3[ 0 ].statesCount < 2, 'expected the deliberately-broken fixture to have <2 states (this is the mutation-landed check)' );

		const phpText3 = fs.readFileSync( path.join( fx3, 'render.php' ), 'utf8' );
		const db3 = { 'sgs/fixture-c': { panelColour: { css_property: 'background-color' } } };
		const planBefore = planRow( db3, 'fixture-c', 'sgs/fixture-c', rows3[ 0 ], phpText3, path.join( fx3, 'block.json' ) );
		assert( planBefore.fixable, '--check-equivalent: expected the broken fixture to be detected as an outstanding fixable row: ' + JSON.stringify( planBefore ) );

		const result = applyPlan(
			Object.assign( {}, planBefore, {
				dir: 'fixture-c',
				slug: 'sgs/fixture-c',
				editFile: path.join( fx3, 'edit.js' ),
				renderFile: path.join( fx3, 'render.php' ),
				blockJsonPath: path.join( fx3, 'block.json' ),
			} ),
			true
		);
		assert( result.ok, 'apply on fixture-c failed: ' + JSON.stringify( result ) );

		const rows3After = rowsInFile( new SourceCache(), path.join( fx3, 'edit.js' ) );
		const phpText3After = fs.readFileSync( path.join( fx3, 'render.php' ), 'utf8' );
		const planAfter = planRow( db3, 'fixture-c', 'sgs/fixture-c', rows3After[ 0 ], phpText3After, path.join( fx3, 'block.json' ) );
		assert( ! planAfter.fixable, '--check-equivalent: expected fixture-c to be clean after fix' );
		assert( /CONFORMANT-already/.test( planAfter.reason ), 'expected CONFORMANT-already after fix, got: ' + planAfter.reason );
	} );

	// --- Regression control: TWO tier-A rows in ONE file must both apply
	// cleanly. Caught live against the real tree (sgs/text — see
	// task-1-report.md): applying the second row's fix using the FIRST
	// pass's stale AST offsets (computed before the first row's write
	// shifted every subsequent byte position) corrupted the file. This
	// control fixes that regression in perpetuity.
	check( 'two tier-A rows in the same file both apply cleanly (stale-offset regression control)', () => {
		const fx4 = makeFixture( tmpRoot, 'fixture-d', {
			editJs: `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { titleColour, labelColour } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'title',
					label: __( 'Title colour', 'sgs-blocks' ),
					gradientCapable: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: titleColour,
							onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
						},
					],
				},
				{
					key: 'label',
					label: __( 'Label colour', 'sgs-blocks' ),
					gradientCapable: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: labelColour,
							onChange: ( val ) => setAttributes( { labelColour: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`,
			renderPhp: `<?php
$title_colour = $attributes['titleColour'] ?? '';
$label_colour = $attributes['labelColour'] ?? '';
$scoped_css_parts = array();
if ( '' !== $title_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-d__title{color:" . sgs_colour_value( $title_colour ) . '}';
}
if ( '' !== $label_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-d__label{color:" . sgs_colour_value( $label_colour ) . '}';
}
`,
			blockJson: {
				apiVersion: 3,
				name: 'sgs/fixture-d',
				attributes: {
					titleColour: { type: 'string', default: '' },
					labelColour: { type: 'string', default: '' },
				},
			},
		} );

		const db4 = {
			'sgs/fixture-d': {
				titleColour: { css_property: 'color' },
				labelColour: { css_property: 'color' },
			},
		};

		for ( const attr of [ 'titleColour', 'labelColour' ] ) {
			const result = reresolveAndApplyOneForSelfTest( db4, fx4, 'fixture-d', 'sgs/fixture-d', attr, true );
			assert( result.ok, `apply of ${ attr } failed: ` + JSON.stringify( result ) );
		}

		const finalEditSrc = fs.readFileSync( path.join( fx4, 'edit.js' ), 'utf8' );
		babelParser.parse( finalEditSrc, BABEL_PARSE_OPTS ); // throws on any corruption — that IS the assertion.
		assert( ( finalEditSrc.match( /key:\s*['"]hover['"]/g ) || [] ).length === 2, 'expected exactly 2 hover states after both fixes, got a corrupted or incomplete result' );
		const finalPhp = fs.readFileSync( path.join( fx4, 'render.php' ), 'utf8' );
		assert( ( finalPhp.match( /:hover/g ) || [] ).length === 2, 'expected exactly 2 :hover rules in render.php' );
	} );

	// --- Unclonable-sibling-attribute control (CRITICAL DEFECT, cross-tier
	// review post-Task-1). A row whose normal state already carries a
	// gradientValue/onGradientChange sibling (e.g. `borderColourGradient`)
	// used to get that sibling cloned into the hover state too, as
	// `{base}HoverGradient` — undeclared in block.json, so WordPress silently
	// discarded every write to it. This fixture reproduces the exact shape
	// found live in sgs/quote's borderColour row. The fix strips the sibling
	// from the clone entirely (see identifyUnclonableSiblingProps) rather
	// than declaring a control nothing in render.php would ever consume.
	const FIXTURE_EDIT_JS_GRADIENT = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { borderColour, borderColourGradient } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'borderColour',
					label: __( 'Border colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: borderColour,
							onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							gradientValue: borderColourGradient,
							onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;
	const FIXTURE_RENDER_PHP_GRADIENT = `<?php
$border_colour = $attributes['borderColour'] ?? '';
$scoped_css_parts = array();
if ( '' !== $border_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-e__border{border-color:" . sgs_colour_value( $border_colour ) . '}';
}
`;
	const fx5 = makeFixture( tmpRoot, 'fixture-e', {
		editJs: FIXTURE_EDIT_JS_GRADIENT,
		renderPhp: FIXTURE_RENDER_PHP_GRADIENT,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-e',
			attributes: {
				borderColour: { type: 'string', default: '' },
				borderColourGradient: { type: 'string', default: '' },
			},
		},
	} );
	const db5 = { 'sgs/fixture-e': { borderColour: { css_property: 'border-color' } } };

	check( 'planRow still plans the row fixable (hover-only) when a gradient sibling is present', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx5, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-e' );
		const phpText = fs.readFileSync( path.join( fx5, 'render.php' ), 'utf8' );
		const plan = planRow( db5, 'fixture-e', 'sgs/fixture-e', rows[ 0 ], phpText, path.join( fx5, 'block.json' ) );
		assert( plan.fixable, 'expected fixable, got refusal: ' + JSON.stringify( plan ) );
		assert( plan.baseIdent === 'borderColour', 'expected baseIdent to be borderColour, got: ' + plan.baseIdent );
	} );

	check( 'APPLY strips the unrenderable gradient sibling from the hover clone (CRITICAL DEFECT control)', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx5, 'edit.js' ) );
		const phpText = fs.readFileSync( path.join( fx5, 'render.php' ), 'utf8' );
		const plan = planRow( db5, 'fixture-e', 'sgs/fixture-e', rows[ 0 ], phpText, path.join( fx5, 'block.json' ) );
		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-e',
				slug: 'sgs/fixture-e',
				editFile: path.join( fx5, 'edit.js' ),
				renderFile: path.join( fx5, 'render.php' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );

		const editSrc = fs.readFileSync( path.join( fx5, 'edit.js' ), 'utf8' );
		babelParser.parse( editSrc, BABEL_PARSE_OPTS ); // throws on any corruption from the property removal.
		assert( ( editSrc.match( /key:\s*['"]hover['"]/g ) || [] ).length === 1, 'expected exactly 1 hover state' );
		assert( editSrc.includes( 'borderColourHover' ), 'expected the hover state to reference borderColourHover' );
		// THIS is the assertion that catches the critical defect: a control with
		// no render.php consumer must never be emitted at all — not emitted and
		// declared, not emitted and silently discarded.
		assert(
			! editSrc.includes( 'borderColourHoverGradient' ),
			'CRITICAL DEFECT REPRODUCED: edit.js still clones a borderColourHoverGradient control ' +
				'that no render.php in the tree consumes — it must be stripped from the hover state, not declared'
		);
		assert( ! /gradientValue|onGradientChange/.test( editSrc.slice( editSrc.indexOf( "key: 'hover'" ) ) ), 'expected no gradientValue/onGradientChange props on the hover state' );

		const bj = JSON.parse( fs.readFileSync( path.join( fx5, 'block.json' ), 'utf8' ) );
		assert( !! bj.attributes.borderColourHover, 'block.json missing borderColourHover' );
		assert( ! bj.attributes.borderColourHoverGradient, 'block.json must NOT declare borderColourHoverGradient — nothing writes to it any more' );
	} );

	// -------------------------------------------------------------------
	// TASK 2 — new negative control 1: GRADIENT ROUND-TRIP.
	// A fill row fixed with a gradient must land all three legs (block.json
	// declares it, edit.js wires it, render.php CONSUMES it) — reuses the
	// production wireOnlyGradientCheck() as the verifier (declared AND
	// consumed), the exact same "all three or none" concern Task 1's own
	// addendum defect was about, now for the gradient dimension's render
	// leg specifically. Watched to FAIL (render leg stripped) before it is
	// watched to PASS (restored) — per the brief's explicit requirement.
	// -------------------------------------------------------------------
	const FIXTURE_EDIT_JS_FILL = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { panelBg } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'panelBg',
					label: __( 'Panel background', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: panelBg,
							onChange: ( val ) => setAttributes( { panelBg: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;
	const FIXTURE_RENDER_PHP_FILL = `<?php
$panel_bg = $attributes['panelBg'] ?? '';
$root_decls = array();
if ( '' !== $panel_bg ) {
	$root_decls[] = 'background-color:' . sgs_colour_value( $panel_bg );
}
`;
	const fx6 = makeFixture( tmpRoot, 'fixture-f', {
		editJs: FIXTURE_EDIT_JS_FILL,
		renderPhp: FIXTURE_RENDER_PHP_FILL,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-f',
			attributes: { panelBg: { type: 'string', default: '' } },
		},
	} );
	const db6 = { 'sgs/fixture-f': { panelBg: { css_property: 'background-color' } } };

	check( 'gradient round-trip control: fill-direct fix lands all three legs (declared+wired+consumed)', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx6, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-f' );
		const phpText = fs.readFileSync( path.join( fx6, 'render.php' ), 'utf8' );
		const plan = planRow( db6, 'fixture-f', 'sgs/fixture-f', rows[ 0 ], phpText, path.join( fx6, 'block.json' ) );
		assert( plan.fixable, 'expected fixable (fill-direct), got refusal: ' + JSON.stringify( plan ) );
		assert( plan.kind === 'gradient' && plan.gradientPlan.mode === 'fill-direct', 'expected fill-direct gradient plan, got: ' + JSON.stringify( plan ) );

		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-f',
				slug: 'sgs/fixture-f',
				editFile: path.join( fx6, 'edit.js' ),
				renderFile: path.join( fx6, 'render.php' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );

		const editSrc = fs.readFileSync( path.join( fx6, 'edit.js' ), 'utf8' );
		babelParser.parse( editSrc, BABEL_PARSE_OPTS );
		assert( editSrc.includes( 'gradientValue: attributes.panelBgGradient' ), 'edit.js missing gradientValue wiring' );
		assert( editSrc.includes( 'onGradientChange' ) && editSrc.includes( 'panelBgGradient' ), 'edit.js missing onGradientChange wiring' );

		const bj = JSON.parse( fs.readFileSync( path.join( fx6, 'block.json' ), 'utf8' ) );
		assert( !! bj.attributes.panelBgGradient, 'block.json missing panelBgGradient declaration' );

		let phpAfter = fs.readFileSync( path.join( fx6, 'render.php' ), 'utf8' );
		assert( phpAfter.includes( 'sgs_background_paint_decl( $panel_bg, $panel_bg_gradient )' ), 'render.php did not switch to sgs_background_paint_decl' );

		// All three legs present. Verify the render leg with a DIRECT check
		// on the actual paint call — not wireOnlyGradientCheck(), which only
		// tests for the attribute name appearing ANYWHERE in the file (true
		// even of a file that merely DECLARES the `$panel_bg_gradient =
		// sgs_css_gradient_value( $attributes['panelBgGradient'] ?? '' );`
		// line without ever painting it — wireOnlyGradientCheck exists to
		// detect an ALREADY-wired row before this tool acts, not to verify
		// post-fix correctness, and reusing it here would make this control
		// trivially always pass).
		const paintsGradient = ( php ) => php.includes( 'sgs_background_paint_decl( $panel_bg, $panel_bg_gradient )' );
		assert( paintsGradient( phpAfter ), 'round-trip check FAILED with all three legs present: render.php does not actually paint the gradient' );

		// --- Remove the RENDER leg only (simulate the exact defect class
		// Task 1's addendum fixed for hover: a declared+wired control with no
		// real render consumer) and assert the SAME direct check now reports
		// broken. Watched to fail here, before being watched to pass once
		// restored — the earlier run of this exact assertion, reusing
		// wireOnlyGradientCheck() as the verifier, DID fail to catch this
		// (the decl line's own `['panelBgGradient']` reference kept that
		// weaker check trivially satisfied) — this direct check is the fix.
		const brokenPhp = phpAfter.replace(
			'sgs_background_paint_decl( $panel_bg, $panel_bg_gradient )',
			'sgs_colour_value( $panel_bg )'
		);
		assert( brokenPhp !== phpAfter, 'mutation for the round-trip-fail check did not land' );
		assert( ! paintsGradient( brokenPhp ), 'GRADIENT ROUND-TRIP CONTROL FAILED TO CATCH A STRIPPED RENDER LEG' );

		// --- Restore and re-assert the check passes again.
		assert( paintsGradient( phpAfter ), 'round-trip check failed AFTER restoring the render leg — should be back to ok' );
	} );

	// -------------------------------------------------------------------
	// TASK 2 — new negative control 2: TEXT-REFUSAL.
	// A text-mechanism row needing a gradient must be REFUSED BY NAME
	// (background-clip:text is Task 3 scope, a structurally different
	// helper pair — never attempted here) and its file left byte-identical.
	// -------------------------------------------------------------------
	const FIXTURE_EDIT_JS_TEXT = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { headingColour } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'heading',
					label: __( 'Heading colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: headingColour,
							onChange: ( val ) => setAttributes( { headingColour: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;
	const FIXTURE_RENDER_PHP_TEXT = `<?php
$heading_colour = $attributes['headingColour'] ?? '';
$scoped_css = array();
if ( '' !== $heading_colour ) {
	$scoped_css[] = ".{\$uid}.sgs-fixture-g__heading{color:" . sgs_colour_value( $heading_colour ) . '}';
}
`;
	const fx7 = makeFixture( tmpRoot, 'fixture-g', {
		editJs: FIXTURE_EDIT_JS_TEXT,
		renderPhp: FIXTURE_RENDER_PHP_TEXT,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-g',
			attributes: { headingColour: { type: 'string', default: '' } },
		},
	} );
	const db7 = { 'sgs/fixture-g': { headingColour: { css_property: 'color' } } };

	check( 'text-refusal control: text-mechanism row needing a gradient is REFUSED by name, file byte-identical', () => {
		const before = {
			editJs: fs.readFileSync( path.join( fx7, 'edit.js' ), 'utf8' ),
			renderPhp: fs.readFileSync( path.join( fx7, 'render.php' ), 'utf8' ),
			blockJson: fs.readFileSync( path.join( fx7, 'block.json' ), 'utf8' ),
		};
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx7, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-g' );
		const phpText = fs.readFileSync( path.join( fx7, 'render.php' ), 'utf8' );
		const plan = planRow( db7, 'fixture-g', 'sgs/fixture-g', rows[ 0 ], phpText, path.join( fx7, 'block.json' ) );
		assert( ! plan.fixable, 'expected a text-mechanism gradient row to be REFUSED, got fixable: ' + JSON.stringify( plan ) );
		assert(
			/background-clip:text/.test( plan.reason ) && /Task 3/.test( plan.reason ),
			'THIS ASSERTION IS THE CONTROL — expected the text-mechanism-SPECIFIC refusal reason ' +
				'(mentions background-clip:text and Task 3), got a generic/wrong reason instead: ' + plan.reason
		);

		const after = {
			editJs: fs.readFileSync( path.join( fx7, 'edit.js' ), 'utf8' ),
			renderPhp: fs.readFileSync( path.join( fx7, 'render.php' ), 'utf8' ),
			blockJson: fs.readFileSync( path.join( fx7, 'block.json' ), 'utf8' ),
		};
		assert( before.editJs === after.editJs, 'text-refusal control: edit.js was mutated despite refusal' );
		assert( before.renderPhp === after.renderPhp, 'text-refusal control: render.php was mutated despite refusal' );
		assert( before.blockJson === after.blockJson, 'text-refusal control: block.json was mutated despite refusal' );
	} );

	// -------------------------------------------------------------------
	// TASK 2 — regression control: a `attributes.X`-shaped gradient sibling
	// (the exact shape applyGradientEditJsFix() writes) must be stripped
	// from a hover clone exactly like Task 1's Identifier-shaped sibling
	// already is. REAL DEFECT FOUND live on sgs/process-steps.numberBackground
	// during this task's own verification: after the gradient dimension was
	// fixed (normal state gained `gradientValue: attributes.numberBackgroundGradient`),
	// a LATER run's hover-creation cloned that MemberExpression sibling
	// verbatim and the blanket substring rename turned it into
	// `attributes.numberBackgroundHoverGradient` — undeclared in block.json,
	// caught by scan-undeclared-setattributes.js. identifyUnclonableSiblingProps()
	// only recognised the Identifier shape (Task 1's own precedent); this
	// fixture reproduces the MemberExpression shape and fails without the
	// siblingAttrNameFromValueNode() fix.
	// -------------------------------------------------------------------
	const FIXTURE_EDIT_JS_GRADIENT_MEMBER = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { numberBackground } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'numberBackground',
					label: __( 'Number background colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: numberBackground,
							onChange: ( val ) => setAttributes( { numberBackground: val ?? '' } ),
							gradientValue: attributes.numberBackgroundGradient,
							onGradientChange: ( val ) => setAttributes( { numberBackgroundGradient: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;
	const FIXTURE_RENDER_PHP_GRADIENT_MEMBER = `<?php
$number_background = $attributes['numberBackground'] ?? '';
$scoped_css_parts = array();
if ( '' !== $number_background ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-h__num{background-color:" . sgs_colour_value( $number_background ) . '}';
}
`;
	const fx8 = makeFixture( tmpRoot, 'fixture-h', {
		editJs: FIXTURE_EDIT_JS_GRADIENT_MEMBER,
		renderPhp: FIXTURE_RENDER_PHP_GRADIENT_MEMBER,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-h',
			attributes: {
				numberBackground: { type: 'string', default: '' },
				numberBackgroundGradient: { type: 'string', default: '' },
			},
		},
	} );
	const db8 = { 'sgs/fixture-h': { numberBackground: { css_property: 'background-color' } } };

	check( 'APPLY strips a MemberExpression-shaped gradient sibling from the hover clone (regression control — real defect found live on sgs/process-steps)', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx8, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-h' );
		const phpText = fs.readFileSync( path.join( fx8, 'render.php' ), 'utf8' );
		const plan = planRow( db8, 'fixture-h', 'sgs/fixture-h', rows[ 0 ], phpText, path.join( fx8, 'block.json' ) );
		assert( plan.fixable, 'expected fixable (hover-only, gradient already present), got refusal: ' + JSON.stringify( plan ) );
		assert( plan.kind === 'hover', 'expected the hover-creation path (gradient already conformant), got: ' + plan.kind );

		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-h',
				slug: 'sgs/fixture-h',
				editFile: path.join( fx8, 'edit.js' ),
				renderFile: path.join( fx8, 'render.php' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );

		const editSrc = fs.readFileSync( path.join( fx8, 'edit.js' ), 'utf8' );
		babelParser.parse( editSrc, BABEL_PARSE_OPTS ); // throws on any corruption from the property removal.
		assert( ( editSrc.match( /key:\s*['"]hover['"]/g ) || [] ).length === 1, 'expected exactly 1 hover state' );
		assert( editSrc.includes( 'numberBackgroundHover' ), 'expected the hover state to reference numberBackgroundHover' );
		// THIS is the assertion that catches the regression: a MemberExpression
		// sibling (`attributes.numberBackgroundGradient`) must be stripped, not
		// blanket-renamed into an undeclared `numberBackgroundHoverGradient`.
		assert(
			! editSrc.includes( 'numberBackgroundHoverGradient' ),
			'REGRESSION REPRODUCED: edit.js still clones a numberBackgroundHoverGradient reference ' +
				'(MemberExpression-shaped gradient sibling) that no render.php in the tree consumes — ' +
				'it must be stripped from the hover state, not renamed'
		);
		assert(
			! /gradientValue|onGradientChange/.test( editSrc.slice( editSrc.indexOf( "key: 'hover'" ) ) ),
			'expected no gradientValue/onGradientChange props on the hover state'
		);

		const bj = JSON.parse( fs.readFileSync( path.join( fx8, 'block.json' ), 'utf8' ) );
		assert( !! bj.attributes.numberBackgroundHover, 'block.json missing numberBackgroundHover' );
		assert( ! bj.attributes.numberBackgroundHoverGradient, 'block.json must NOT declare numberBackgroundHoverGradient — nothing writes to it any more' );
	} );

	// -------------------------------------------------------------------
	// FINDING 2 (cross-tier review, 2026-09-04) — fix.js:344-461's new
	// quote/statement-scanning logic (findStatementEndRespectingStrings,
	// resolveTextGradientChainSelector) shipped with ZERO dedicated
	// self-test coverage. Four fixtures below close that gap:
	//   (i)   fixture-i  — a `;`-inside-a-string-literal statement, the exact
	//         shape Finding 1's fix addresses (regression-guards Finding 1).
	//   (ii)  fixture-j  — the `{$var}`-double-quote-interpolation
	//         consumption shape (team-member's real pattern).
	//   (iii) fixture-k  — the no-intermediate-PHP-variable, concatenation
	//         consumption shape (nav-menu.submenuColour's real pattern) —
	//         also regression-guards Finding 5 (this is the ONE case that
	//         must still fall through when findVarAssignedFromAttr fails).
	//   (iv)  fixture-l  — TWO consumption sites for one decl var: must be
	//         REFUSED as ambiguous (Finding 3), never silently pick the
	//         first, file byte-identical after.
	// -------------------------------------------------------------------

	// --- (i) semicolon-inside-string-literal statement (Finding 1 regression guard) ---
	const FIXTURE_EDIT_JS_SEMI = FIXTURE_EDIT_JS.split( 'titleColour' ).join( 'bannerColour' );
	const FIXTURE_RENDER_PHP_SEMI = `<?php
$banner_colour = $attributes['bannerColour'] ?? '';
$scoped_css_parts = array();
if ( '' !== $banner_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-i__banner{color:" . sgs_colour_value( $banner_colour ) . ';}';
}
`;
	const fx9 = makeFixture( tmpRoot, 'fixture-i', {
		editJs: FIXTURE_EDIT_JS_SEMI,
		renderPhp: FIXTURE_RENDER_PHP_SEMI,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-i',
			attributes: { bannerColour: { type: 'string', default: '' } },
		},
	} );
	const db9 = { 'sgs/fixture-i': { bannerColour: { css_property: 'color' } } };

	check( 'FINDING 1 regression guard: resolveDirectSelector captures the FULL statement when the literal carries its own `;` (nav-menu:1168 shape), not a truncated one', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx9, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-i' );
		const phpText = fs.readFileSync( path.join( fx9, 'render.php' ), 'utf8' );
		const plan = planRow( db9, 'fixture-i', 'sgs/fixture-i', rows[ 0 ], phpText, path.join( fx9, 'block.json' ) );
		assert( plan.fixable, 'expected fixable, got refusal: ' + JSON.stringify( plan ) );
		assert( plan.mode === 'direct-new-statement', 'expected the resolveDirectSelector path, got mode=' + plan.mode );

		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-i',
				slug: 'sgs/fixture-i',
				editFile: path.join( fx9, 'edit.js' ),
				renderFile: path.join( fx9, 'render.php' ),
				blockJsonPath: path.join( fx9, 'block.json' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );

		const php = fs.readFileSync( path.join( fx9, 'render.php' ), 'utf8' );
		// THIS is the assertion that catches the Finding 1 regression: the
		// ORIGINAL statement, closing brace and all, must survive intact and
		// UNSPLIT — a naive `indexOf(';', …)` would have truncated it right
		// after the literal's OWN `;`, inserting the new hover statement mid-
		// string and corrupting the file.
		assert(
			php.includes( "sgs_colour_value( $banner_colour ) . ';}';" ),
			'FINDING 1 REGRESSION: the original semicolon-inside-string statement was truncated/split by the fix — got: ' + php
		);
		assert( php.includes( ':hover' ), 'render.php missing :hover rule after fix' );
		babelParser.parse( fs.readFileSync( path.join( fx9, 'edit.js' ), 'utf8' ), BABEL_PARSE_OPTS ); // throws on corruption.
		const bj = JSON.parse( fs.readFileSync( path.join( fx9, 'block.json' ), 'utf8' ) );
		assert( !! bj.attributes.bannerColourHover, 'block.json missing bannerColourHover' );
	} );

	// --- (ii) `{$var}` double-quote interpolation consumption shape (team-member's real pattern) ---
	const FIXTURE_EDIT_JS_INTERP = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { nameColour } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'name',
					label: __( 'Name colour', 'sgs-blocks' ),
					gradientCapable: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: nameColour,
							onChange: ( val ) => setAttributes( { nameColour: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;
	const FIXTURE_RENDER_PHP_INTERP = `<?php
$name_colour = $attributes['nameColour'] ?? '';
$name_colour_gradient = $attributes['nameColourGradient'] ?? '';
$name_colour_sel = $root_sel . ' .sgs-fixture-j__name';
$scoped_css = array();
$name_colour_effective = sgs_resolve_text_colour_or_gradient( $name_colour, $name_colour_gradient );
if ( '' !== $name_colour_effective ) {
	$name_colour_decl = sgs_text_colour_decl( $name_colour_effective );
	if ( '' !== $name_colour_decl ) {
		$scoped_css[] = "{\$name_colour_sel}{{\$name_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $name_colour_sel, $name_colour_effective );
}
`;
	const fx10 = makeFixture( tmpRoot, 'fixture-j', {
		editJs: FIXTURE_EDIT_JS_INTERP,
		renderPhp: FIXTURE_RENDER_PHP_INTERP,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-j',
			attributes: {
				nameColour: { type: 'string', default: '' },
				nameColourGradient: { type: 'string', default: '' },
			},
		},
	} );
	const db10 = { 'sgs/fixture-j': { nameColour: { css_property: 'color' } } };

	check( 'resolveTextGradientChainSelector resolves the `{$var}` double-quote-interpolation consumption shape (team-member pattern)', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx10, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-j' );
		const phpText = fs.readFileSync( path.join( fx10, 'render.php' ), 'utf8' );
		const plan = planRow( db10, 'fixture-j', 'sgs/fixture-j', rows[ 0 ], phpText, path.join( fx10, 'block.json' ) );
		assert( plan.fixable, 'expected fixable via Strategy T, got refusal: ' + JSON.stringify( plan ) );
		assert( plan.mode === 'direct-new-statement', 'expected the chain-resolved path, got mode=' + plan.mode );
		assert( plan.selectorTemplate === '{$name_colour_sel}', 'wrong selector rebuilt from the interpolation shape: ' + plan.selectorTemplate );

		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-j',
				slug: 'sgs/fixture-j',
				editFile: path.join( fx10, 'edit.js' ),
				renderFile: path.join( fx10, 'render.php' ),
				blockJsonPath: path.join( fx10, 'block.json' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );
		const php = fs.readFileSync( path.join( fx10, 'render.php' ), 'utf8' );
		assert( php.includes( '{$name_colour_sel}:hover' ), 'expected the rebuilt interpolation selector to appear in the new :hover rule — got: ' + php );

		// PLACEMENT LOCK (the task-2-review bug this task fixes): the fixture's
		// consumption statement sits nested TWO `if` levels deep
		// (`if ('' !== $name_colour_effective) { if ('' !== $name_colour_decl) { <consumption> } }`
		// — the exact team-member:629/631 shape). A naive splice at the
		// consumption statement's own `;` lands the new hover `if` INSIDE both
		// guards, which is syntactically valid but semantically dead whenever
		// the base colour is unset. Assert the hover block landed AFTER the
		// OUTER guard's own closing brace, not merely that ':hover' appears
		// somewhere in the file (that weaker assertion above would pass either
		// way — it's exactly what let this bug through review the first time).
		const outerGuardCloseMarker = "gradient_fallback_rule( $name_colour_sel, $name_colour_effective );\n}";
		const outerGuardCloseIdx = php.indexOf( outerGuardCloseMarker );
		assert( outerGuardCloseIdx !== -1, 'fixture render.php missing its expected outer-guard close shape — fixture drifted: ' + php );
		const hoverIfIdx = php.indexOf( "if ( '' !== ( $attributes['nameColourHover']" );
		assert( hoverIfIdx !== -1, 'hover if-guard not found in output: ' + php );
		assert(
			hoverIfIdx > outerGuardCloseIdx,
			'PLACEMENT REGRESSION: the hover if-block landed INSIDE the base-value guard(s) instead of hoisted past them — got: ' + php
		);
		// The hoisted block must also be TOP-LEVEL (0 indent), matching the
		// already-shipped burgerBg/burgerHoverColour shape (nav-menu:1166-1173)
		// — not merely somewhere after the guard but still nested a level.
		assert(
			/^if \( '' !== \( \$attributes\['nameColourHover'\]/m.test( php ),
			'hover if-block is not at top-level (0 indent) — expected the burgerBg/burgerHoverColour sibling shape: ' + php
		);
	} );

	// --- (iii) no-intermediate-variable, concatenation consumption shape (nav-menu.submenuColour's real pattern) ---
	const FIXTURE_EDIT_JS_NOVAR = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { sublinkColour } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'sublink',
					label: __( 'Sublink colour', 'sgs-blocks' ),
					gradientCapable: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: sublinkColour,
							onChange: ( val ) => setAttributes( { sublinkColour: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;
	const FIXTURE_RENDER_PHP_NOVAR = `<?php
$uid_sel = '.' . $uid;
$css = '';
$sublink_colour_effective = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['sublinkColour'] ?? '' ),
	(string) ( $attributes['sublinkColourGradient'] ?? '' )
);
if ( '' !== $sublink_colour_effective ) {
	$sublink_colour_decl = sgs_text_colour_decl( $sublink_colour_effective );
	if ( '' !== $sublink_colour_decl ) {
		$css .= $uid_sel . ' .sgs-fixture-k__sublink{' . $sublink_colour_decl . ';}';
	}
	$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel . ' .sgs-fixture-k__sublink', $sublink_colour_effective );
}
`;
	const fx11 = makeFixture( tmpRoot, 'fixture-k', {
		editJs: FIXTURE_EDIT_JS_NOVAR,
		renderPhp: FIXTURE_RENDER_PHP_NOVAR,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-k',
			attributes: {
				sublinkColour: { type: 'string', default: '' },
				sublinkColourGradient: { type: 'string', default: '' },
			},
		},
	} );
	const db11 = { 'sgs/fixture-k': { sublinkColour: { css_property: 'color' } } };

	check( 'resolveTextGradientChainSelector resolves the no-intermediate-variable, direct-call-argument consumption shape (nav-menu.submenuColour pattern) — also regression-guards Finding 5\'s narrowed fall-through', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx11, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-k' );
		const phpText = fs.readFileSync( path.join( fx11, 'render.php' ), 'utf8' );
		const plan = planRow( db11, 'fixture-k', 'sgs/fixture-k', rows[ 0 ], phpText, path.join( fx11, 'block.json' ) );
		assert( plan.fixable, 'expected fixable via Strategy T with varName=null, got refusal: ' + JSON.stringify( plan ) );
		assert( plan.mode === 'direct-new-statement', 'expected the chain-resolved path, got mode=' + plan.mode );
		assert( plan.selectorTemplate === "{$uid_sel} .sgs-fixture-k__sublink", 'wrong selector rebuilt from the concat shape: ' + plan.selectorTemplate );

		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-k',
				slug: 'sgs/fixture-k',
				editFile: path.join( fx11, 'edit.js' ),
				renderFile: path.join( fx11, 'render.php' ),
				blockJsonPath: path.join( fx11, 'block.json' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );
		const php = fs.readFileSync( path.join( fx11, 'render.php' ), 'utf8' );
		assert( php.includes( '{$uid_sel} .sgs-fixture-k__sublink:hover' ), 'expected the rebuilt concat selector to appear in the new :hover rule — got: ' + php );

		// PLACEMENT LOCK — same shape as fixture-j (nav-menu:864/866 for real):
		// the consumption statement sits nested inside
		// `if ('' !== $sublink_colour_effective) { ... }`. Assert the hover
		// block landed AFTER that guard's own close, not merely that ':hover'
		// appears somewhere — a nested-but-present hover rule passes the
		// weaker assertion above and is the exact defect this task fixes.
		const outerGuardCloseMarker = "gradient_fallback_rule( $uid_sel . ' .sgs-fixture-k__sublink', $sublink_colour_effective );\n}";
		const outerGuardCloseIdx = php.indexOf( outerGuardCloseMarker );
		assert( outerGuardCloseIdx !== -1, 'fixture render.php missing its expected outer-guard close shape — fixture drifted: ' + php );
		const hoverIfIdx = php.indexOf( "if ( '' !== ( $attributes['sublinkColourHover']" );
		assert( hoverIfIdx !== -1, 'hover if-guard not found in output: ' + php );
		assert(
			hoverIfIdx > outerGuardCloseIdx,
			'PLACEMENT REGRESSION: the hover if-block landed INSIDE the base-value guard instead of hoisted past it — got: ' + php
		);
		assert(
			/^if \( '' !== \( \$attributes\['sublinkColourHover'\]/m.test( php ),
			'hover if-block is not at top-level (0 indent) — expected the burgerBg/burgerHoverColour sibling shape: ' + php
		);
	} );

	// --- (iv) FINDING 3 — two consumption sites for the same decl var must be REFUSED as ambiguous, never silently pick the first ---
	const FIXTURE_EDIT_JS_AMBIG_CHAIN = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components/SgsColourPanel';

export default function Edit( { attributes, setAttributes } ) {
	const { eyebrowColour } = attributes;
	return (
		<SgsColourPanel
			rows={ [
				{
					key: 'eyebrow',
					label: __( 'Eyebrow colour', 'sgs-blocks' ),
					gradientCapable: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: eyebrowColour,
							onChange: ( val ) => setAttributes( { eyebrowColour: val ?? '' } ),
						},
					],
				},
			] }
		/>
	);
}
`;
	const FIXTURE_RENDER_PHP_AMBIG_CHAIN = `<?php
$uid_sel = '.' . $uid;
$scoped_css = array();
$eyebrow_colour = $attributes['eyebrowColour'] ?? '';
$eyebrow_colour_gradient = $attributes['eyebrowColourGradient'] ?? '';
$eyebrow_colour_effective = sgs_resolve_text_colour_or_gradient( $eyebrow_colour, $eyebrow_colour_gradient );
if ( '' !== $eyebrow_colour_effective ) {
	$eyebrow_colour_decl = sgs_text_colour_decl( $eyebrow_colour_effective );
	if ( '' !== $eyebrow_colour_decl ) {
		$scoped_css[] = $uid_sel . ' .sgs-fixture-l__eyebrow-a{' . $eyebrow_colour_decl . ';}';
		$scoped_css[] = $uid_sel . ' .sgs-fixture-l__eyebrow-b{' . $eyebrow_colour_decl . ';}';
	}
}
`;
	const fx12 = makeFixture( tmpRoot, 'fixture-l', {
		editJs: FIXTURE_EDIT_JS_AMBIG_CHAIN,
		renderPhp: FIXTURE_RENDER_PHP_AMBIG_CHAIN,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-l',
			attributes: {
				eyebrowColour: { type: 'string', default: '' },
				eyebrowColourGradient: { type: 'string', default: '' },
			},
		},
	} );
	const db12 = { 'sgs/fixture-l': { eyebrowColour: { css_property: 'color' } } };

	check( 'FINDING 3: resolveTextGradientChainSelector REFUSES (does not silently pick the first) when the decl var has TWO consumption sites, file byte-identical after', () => {
		const before = {
			editJs: fs.readFileSync( path.join( fx12, 'edit.js' ), 'utf8' ),
			renderPhp: fs.readFileSync( path.join( fx12, 'render.php' ), 'utf8' ),
			blockJson: fs.readFileSync( path.join( fx12, 'block.json' ), 'utf8' ),
		};
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx12, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-l' );
		const phpText = fs.readFileSync( path.join( fx12, 'render.php' ), 'utf8' );
		const plan = planRow( db12, 'fixture-l', 'sgs/fixture-l', rows[ 0 ], phpText, path.join( fx12, 'block.json' ) );
		assert( ! plan.fixable, 'expected a REFUSAL for an ambiguous two-site chain, got fixable: ' + JSON.stringify( plan ) );
		assert(
			/multiple-text-gradient-chain-sites-ambiguous/.test( plan.reason ),
			'THIS ASSERTION IS THE CONTROL — expected the named ambiguity refusal reason, got: ' + plan.reason
		);
		const after = {
			editJs: fs.readFileSync( path.join( fx12, 'edit.js' ), 'utf8' ),
			renderPhp: fs.readFileSync( path.join( fx12, 'render.php' ), 'utf8' ),
			blockJson: fs.readFileSync( path.join( fx12, 'block.json' ), 'utf8' ),
		};
		assert( before.editJs === after.editJs, 'ambiguity control: edit.js was mutated despite refusal' );
		assert( before.renderPhp === after.renderPhp, 'ambiguity control: render.php was mutated despite refusal' );
		assert( before.blockJson === after.blockJson, 'ambiguity control: block.json was mutated despite refusal' );
	} );

	// -------------------------------------------------------------------
	// FINDING 1 + FINDING 3 (cross-tier review ROUND 2, 2026-09-04) —
	// permanent end-to-end regression guards for the two silent-failure-mode
	// bugs found in computeHoistedInsertionPoint/isSimplePresenceGuard.
	// -------------------------------------------------------------------

	// --- (v) fixture-m — the base-value guard is immediately followed by
	// `else { … }` (a shape no currently-fixable row has today, but the
	// codemod is generic and will meet one). Hoisting past the guard as
	// fixture-i does would splice the new hover `if` BETWEEN the guard's
	// `}` and `else`, a PHP parse error. The fix must stop hoisting at the
	// guard's own OPEN boundary (stmtEnd, still nested) instead.
	const FIXTURE_EDIT_JS_ELSE = FIXTURE_EDIT_JS.split( 'titleColour' ).join( 'panelColour' );
	const FIXTURE_RENDER_PHP_ELSE = `<?php
$panel_colour = $attributes['panelColour'] ?? '';
$scoped_css_parts = array();
if ( '' !== $panel_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-m__panel{color:" . sgs_colour_value( $panel_colour ) . ';}';
} else {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-m__panel{color:inherit;}";
}
`;
	const fx13 = makeFixture( tmpRoot, 'fixture-m', {
		editJs: FIXTURE_EDIT_JS_ELSE,
		renderPhp: FIXTURE_RENDER_PHP_ELSE,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-m',
			attributes: { panelColour: { type: 'string', default: '' } },
		},
	} );
	const db13 = { 'sgs/fixture-m': { panelColour: { css_property: 'color' } } };

	check( 'FINDING 1: a base-value guard immediately followed by `else` is never hoisted past — no `}` <hover-block> `else` splice (would fatal)', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx13, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-m' );
		const phpText = fs.readFileSync( path.join( fx13, 'render.php' ), 'utf8' );
		const plan = planRow( db13, 'fixture-m', 'sgs/fixture-m', rows[ 0 ], phpText, path.join( fx13, 'block.json' ) );
		assert( plan.fixable, 'expected fixable, got refusal: ' + JSON.stringify( plan ) );

		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-m',
				slug: 'sgs/fixture-m',
				editFile: path.join( fx13, 'edit.js' ),
				renderFile: path.join( fx13, 'render.php' ),
				blockJsonPath: path.join( fx13, 'block.json' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );

		const php = fs.readFileSync( path.join( fx13, 'render.php' ), 'utf8' );
		// THE REGRESSION GUARD: the guard's own closing `}` must be followed
		// (ignoring whitespace) directly by `else`, exactly as authored — the
		// hover block must NOT have been spliced in between.
		assert(
			/\}\s*else\s*\{/.test( php ),
			'FINDING 1 REGRESSION: the guard\'s `}` is no longer immediately followed by `else {` — the hover block was likely spliced between them (a PHP parse error): ' + php
		);
		assert(
			! /\}\s*if\s*\(\s*''\s*!==\s*\(\s*\$attributes\[\s*'panelColourHover'[\s\S]*?\}\s*else/.test( php ),
			'FINDING 1 REGRESSION: the hover if-block was inserted between the guard\'s `}` and its `else` — got: ' + php
		);
		// The hover block must instead have landed INSIDE the original guard
		// (nested, before its own closing `}`) — a no-op stop-one-level-
		// earlier, not a crash.
		const guardOpenIdx = php.indexOf( "if ( '' !== $panel_colour ) {" );
		const hoverIfIdx = php.indexOf( "if ( '' !== ( $attributes['panelColourHover']" );
		assert( hoverIfIdx !== -1, 'hover if-guard not found in output: ' + php );
		const elseIdx = php.indexOf( '} else {' );
		assert( guardOpenIdx !== -1 && elseIdx !== -1, 'fixture render.php missing its expected guard/else shape — fixture drifted: ' + php );
		assert(
			hoverIfIdx > guardOpenIdx && hoverIfIdx < elseIdx,
			'FINDING 1: expected the hover block nested INSIDE the original guard (before its own `}`), not hoisted past it — got: ' + php
		);
		babelParser.parse( fs.readFileSync( path.join( fx13, 'edit.js' ), 'utf8' ), BABEL_PARSE_OPTS ); // throws on corruption.
	} );

	// --- (vi) fixture-n — a `//` comment line sits between the previous
	// statement and the base-value guard's own `if`. Before the fix this
	// silently disabled hoisting (the `^if` anchor failed against the
	// comment-prefixed header) with NO refusal reason at all — the codemod
	// fell back to the original un-hoisted (broken) placement, indistin-
	// guishable from success. The fix must hoist THROUGH the comment.
	const FIXTURE_EDIT_JS_COMMENT = FIXTURE_EDIT_JS.split( 'titleColour' ).join( 'strapColour' );
	const FIXTURE_RENDER_PHP_COMMENT = `<?php
$strap_colour = $attributes['strapColour'] ?? '';
$scoped_css_parts = array();
// base colour presence guard
if ( '' !== $strap_colour ) {
	$scoped_css_parts[] = ".{\$uid}.sgs-fixture-n__strap{color:" . sgs_colour_value( $strap_colour ) . ';}';
}
`;
	const fx14 = makeFixture( tmpRoot, 'fixture-n', {
		editJs: FIXTURE_EDIT_JS_COMMENT,
		renderPhp: FIXTURE_RENDER_PHP_COMMENT,
		blockJson: {
			apiVersion: 3,
			name: 'sgs/fixture-n',
			attributes: { strapColour: { type: 'string', default: '' } },
		},
	} );
	const db14 = { 'sgs/fixture-n': { strapColour: { css_property: 'color' } } };

	check( 'FINDING 3: a `//` comment line immediately before the guard does not silently disable hoisting', () => {
		const cache = new SourceCache();
		const rows = rowsInFile( cache, path.join( fx14, 'edit.js' ) );
		assert( rows.length === 1, 'expected exactly one row in fixture-n' );
		const phpText = fs.readFileSync( path.join( fx14, 'render.php' ), 'utf8' );
		const plan = planRow( db14, 'fixture-n', 'sgs/fixture-n', rows[ 0 ], phpText, path.join( fx14, 'block.json' ) );
		assert( plan.fixable, 'expected fixable, got refusal: ' + JSON.stringify( plan ) );

		const result = applyPlan(
			Object.assign( {}, plan, {
				dir: 'fixture-n',
				slug: 'sgs/fixture-n',
				editFile: path.join( fx14, 'edit.js' ),
				renderFile: path.join( fx14, 'render.php' ),
				blockJsonPath: path.join( fx14, 'block.json' ),
			} ),
			true
		);
		assert( result.ok, 'apply failed: ' + JSON.stringify( result ) );

		const php = fs.readFileSync( path.join( fx14, 'render.php' ), 'utf8' );
		// THE REGRESSION GUARD: the hover if-block must have landed AFTER the
		// (comment-preceded) guard's own closing `}` — TOP-LEVEL, matching the
		// already-shipped burgerBg/burgerHoverColour sibling shape — not
		// silently left nested inside it (the pre-fix behaviour, which gave
		// no error at all and looked identical to success).
		const guardCloseMarker = "sgs_colour_value( $strap_colour ) . ';}';\n}";
		const guardCloseIdx = php.indexOf( guardCloseMarker );
		assert( guardCloseIdx !== -1, 'fixture render.php missing its expected guard-close shape — fixture drifted: ' + php );
		const hoverIfIdx = php.indexOf( "if ( '' !== ( $attributes['strapColourHover']" );
		assert( hoverIfIdx !== -1, 'hover if-guard not found in output: ' + php );
		assert(
			hoverIfIdx > guardCloseIdx,
			'FINDING 3 REGRESSION: the hover block stayed nested inside the comment-preceded guard instead of being hoisted past it (this bug is SILENT — no refusal reason at all) — got: ' + php
		);
		assert(
			/^if \( '' !== \( \$attributes\['strapColourHover'\]/m.test( php ),
			'hover if-block is not at top-level (0 indent) — expected the burgerBg/burgerHoverColour sibling shape: ' + php
		);
	} );

	console.log( `\n${ failures === 0 ? 'ALL SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED' } (tmp dir: ${ tmpRoot })\n` );
	process.exitCode = failures === 0 ? 0 : 1;
}

// Test-only helper: reresolveAndApplyOne() re-derives BLOCKS_DIR-relative
// paths internally (the real fix), which doesn't fit a tmp-dir fixture — this
// mirrors its exact logic against an explicit fixture directory instead.
function reresolveAndApplyOneForSelfTest( db, fixtureDir, dir, slug, targetAttr, apply ) {
	const editFile = path.join( fixtureDir, 'edit.js' );
	const renderFile = path.join( fixtureDir, 'render.php' );
	const blockJsonPath = path.join( fixtureDir, 'block.json' );
	const cache = new SourceCache();
	const phpText = fs.readFileSync( renderFile, 'utf8' );
	const rows = rowsInFile( cache, editFile );
	const row = rows.find( ( r ) => r.attr === targetAttr );
	if ( ! row ) return { ok: false, reason: 'row-not-found (attr=' + targetAttr + ')' };
	const plan = planRow( db, dir, slug, row, phpText, blockJsonPath );
	if ( ! plan.fixable ) return { ok: false, reason: plan.reason };
	return applyPlan( Object.assign( { dir, slug, editFile, renderFile, blockJsonPath }, plan ), apply );
}

// ---------------------------------------------------------------------------
function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) return runSelfTest();
	if ( argv.includes( '--check' ) ) return runCheck();
	if ( argv.includes( '--fix' ) ) return void runFix( { apply: argv.includes( '--apply' ) } );
	console.log(
		'Usage: node fix.js --fix [--apply] | node fix.js --check | node fix.js --self-test'
	);
	process.exitCode = 1;
}

main();
