/**
 * check-shared-css-state-rules.js
 *
 * STRUCTURAL GUARD — stops the "state-only shared-CSS size literal" class of
 * bug from regressing. This is the class of defect that shipped LIVE on
 * 2026-07-26 in assets/css/header-behaviours.css:
 *
 *   .sgs-row-behaviour.is-row-shrink-active.is-row-shrunk {
 *       padding-block: var( --wp--preset--spacing--10, 0.5rem );
 *   }
 *
 * A header row's RESTING padding is set PER INSTANCE by that row's own block
 * (a rule like `.sgs-container-<hash>{padding-top:48px}`, specificity 0,1,0).
 * The rule above is (0,3,0), so on scroll it forced EVERY row to the SAME
 * absolute value regardless of its resting padding. A row with no padding
 * measured 0px at rest and 4px "shrunk" — it GREW.
 *
 * THE GENERAL DEFECT CLASS this gate detects: a shared stylesheet sets a SIZE
 * property, with a LITERAL value, on a STATE-ONLY selector (a selector
 * carrying an `.is-*` / `.has-*` class) — while nothing in that SAME
 * stylesheet sets the RESTING value of the same property on the
 * corresponding BASE selector (the same selector with the state class(es)
 * stripped out). Such a rule cannot know the value it is supposed to be
 * changing FROM, so it can only ever be right by luck.
 *
 * It is explicitly NOT a violation when the same stylesheet sets BOTH ends —
 * e.g. (this is the legitimate pattern, currently in the same file):
 *
 *   body.sgs-header-behaviour-shrink header.sgs-site-header {
 *       padding-block: var( --wp--preset--spacing--30, 1.5rem );   // resting
 *   }
 *   body.sgs-header-behaviour-shrink.is-header-shrunk header.sgs-site-header {
 *       padding-block: var( --wp--preset--spacing--10, 0.5rem );   // changed
 *   }
 *
 * Both ends are declared in the same file, so the transition is
 * self-consistent and bounded — NOT flagged.
 *
 * WHY A NEW GATE (not an extension of check-hardcoded-render-defaults.js)
 * ------------------------------------------------------------------------
 * That gate walks src/blocks/*  only (BLOCKS_DIR). Nothing in the repo scans
 * assets/css/ at all — which is exactly why the literal that caused this
 * defect sat in an unscanned file. This is a sibling script, same house
 * style (plain fs/regex, no CSS parser dependency), scanning a different
 * directory for a different — but related — defect shape.
 *
 * HOW IT WORKS
 * ------------
 *  1. Scan every *.css file directly under assets/css/ (discovered, not
 *     hardcoded).
 *  2. Strip comments (/* ... *\/ blocks) BEFORE parsing — replacing comment
 *     characters with spaces (keeping newlines, so line numbers stay
 *     correct) — so CSS-looking example code documented inside a doc-comment
 *     is never mistaken for a real rule.
 *  3. Parse into a rule tree with a brace-matching scanner. `@media` /
 *     `@supports` / `@container` / `@layer` are CONDITIONAL at-rules — their
 *     contents are descended into as ordinary nested rules. `@keyframes` /
 *     `@font-face` / `@page` / `@property` are OPAQUE at-rules — their
 *     contents are skipped entirely (keyframe selectors like `from`/`to`
 *     aren't state selectors and would only add noise).
 *  4. For each rule whose selector carries a `.is-*` / `.has-*` class, check
 *     each declaration: if the property is a SIZE property (padding/margin/
 *     gap/width/height/font-size/inset/top/right/bottom/left, incl. logical
 *     forms) AND the value is a fixed literal length (a bare literal, or a
 *     `var(--x, <literal>)` with a literal fallback — NOT a calc()/min()/
 *     max()/clamp() expression, NOT 0/auto/inherit/initial/unset/revert/none/
 *     100%, NOT a bare `var(--x)` with no fallback) — it's a CANDIDATE.
 *  5. A candidate is a FINDING only when NO OTHER rule in the SAME file
 *     declares that SAME property on the "base" selector (the candidate's
 *     own selector with every `.is-*`/`.has-*` class stripped, whitespace
 *     normalised). If the base selector's resting value for that property IS
 *     declared somewhere in the file, the transition is self-consistent and
 *     NOT flagged.
 *
 * BASELINE
 * --------
 *  scripts/shared-css-state-rules-baseline.json — same spirit as
 *  scripts/dead-controls-baseline.json. Starts EMPTY. Each entry MUST carry a
 *  non-empty `reason` string; a baseline entry without a reason is itself a
 *  gate error. To accept a genuine, justified finding: add it to the
 *  baseline with a reason. Do NOT baseline a finding just to make the gate
 *  pass — narrow the detection rule instead, or fix the CSS.
 *
 * Usage
 * -----
 *   node scripts/check-shared-css-state-rules.js            # human report, exit 0 unless net-new
 *   node scripts/check-shared-css-state-rules.js --check     # prebuild/CI gate (exit 1 on net-new)
 *
 * Wired into the END of the `prebuild` chain in package.json.
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );

const ROOT          = path.join( __dirname, '..' );
const CSS_DIR        = path.join( ROOT, 'assets', 'css' );
const BASELINE_FILE  = path.join( __dirname, 'shared-css-state-rules-baseline.json' );

const CHECK_MODE = process.argv.includes( '--check' );

// ---------------------------------------------------------------------------
// SIZE PROPERTY MATCHER
//
// Matches: padding / margin (+ physical sides + logical block/inline +
// block-start/end/inline-start/end), gap/row-gap/column-gap, width/min-width/
// max-width, height/min-height/max-height, font-size, inset (+ logical
// forms), top/right/bottom/left.
// ---------------------------------------------------------------------------
const SIZE_PROPERTY_RE = new RegExp(
	'^(' +
		'(padding|margin)(-(top|right|bottom|left|block(-start|-end)?|inline(-start|-end)?))?' +
		'|gap|row-gap|column-gap' +
		'|width|min-width|max-width' +
		'|height|min-height|max-height' +
		'|font-size' +
		'|inset(-block(-start|-end)?|-inline(-start|-end)?)?' +
		'|top|right|bottom|left' +
	')$'
);

// ---------------------------------------------------------------------------
// SELECTOR STATE-CLASS DETECTION
// ---------------------------------------------------------------------------
const STATE_CLASS_RE       = /\.(is|has)-[a-zA-Z0-9-]+/;
const STATE_CLASS_STRIP_RE = /\.(is|has)-[a-zA-Z0-9-]+/g;

// ---------------------------------------------------------------------------
// VALUE-LITERAL CLASSIFIER
// ---------------------------------------------------------------------------

const KEYWORD_EXEMPT_RE = /^(auto|inherit|initial|unset|revert|revert-layer|none)$/i;
const ZERO_RE           = /^0(\.0+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|pt|pc|in|cm|mm|q)?$/i;
const LITERAL_LENGTH_RE = /^-?\d*\.?\d+(px|rem|em|vh|vw|vmin|vmax|ch|ex|pt|pc|in|cm|mm|q|%)$/i;
const FN_WRAP_RE        = /\b(calc|min|max|clamp)\s*\(/i;
const PURE_VAR_WITH_FALLBACK_RE = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*,\s*([\s\S]+)\)$/i;
const PURE_VAR_NO_FALLBACK_RE   = /^var\(\s*--[a-zA-Z0-9_-]+\s*\)$/i;

/**
 * Split a CSS value into whitespace-separated tokens, ignoring whitespace
 * that occurs inside parentheses (so `var(--x, 1px)` stays one token, and a
 * shorthand like `10px var(--x, 20px)` splits into two tokens correctly).
 */
function splitTopLevelBySpace( value ) {
	const tokens = [];
	let depth = 0;
	let cur   = '';
	for ( const ch of value ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( /\s/.test( ch ) && 0 === depth ) {
			if ( cur ) {
				tokens.push( cur );
			}
			cur = '';
		} else {
			cur += ch;
		}
	}
	if ( cur ) {
		tokens.push( cur );
	}
	return tokens;
}

/**
 * Is `tok` a "fixed size" token on its own — a bare literal length, or a
 * `var(--x, <literal>)` whose fallback is itself a literal length? Returns
 * false for exempt keywords/zero/100%/calc-family/no-fallback var (those are
 * NOT fixed-size literals for this gate's purposes).
 */
function isFixedSizeToken( tok ) {
	if ( KEYWORD_EXEMPT_RE.test( tok ) || ZERO_RE.test( tok ) || '100%' === tok ) {
		return false;
	}
	if ( FN_WRAP_RE.test( tok ) ) {
		return false; // calc()/min()/max()/clamp() — never a "fixed literal" for this gate.
	}
	const varMatch = tok.match( PURE_VAR_WITH_FALLBACK_RE );
	if ( varMatch ) {
		const fallback = varMatch[ 2 ].trim();
		if ( KEYWORD_EXEMPT_RE.test( fallback ) || ZERO_RE.test( fallback ) || '100%' === fallback ) {
			return false;
		}
		if ( FN_WRAP_RE.test( fallback ) ) {
			return false;
		}
		return LITERAL_LENGTH_RE.test( fallback );
	}
	if ( PURE_VAR_NO_FALLBACK_RE.test( tok ) ) {
		return false; // bare var(--x) with no fallback — nothing fixed to flag.
	}
	return LITERAL_LENGTH_RE.test( tok );
}

/**
 * Is `rawValue` (the full declaration value, possibly a multi-token
 * shorthand) a fixed-size literal for the purposes of this gate?
 *
 * Rules (per the design brief):
 *   - 0 / auto / inherit / initial / unset / revert / none / 100% → NOT flagged.
 *   - A calc()/min()/max()/clamp() expression → NOT flagged (even one that
 *     references var(--...)) — only a BARE literal or a bare
 *     `var(--x, <literal>)` triggers.
 *   - A bare literal length (`0.5rem`, `16px`, …) → flagged.
 *   - `var(--x, <literal length>)` → flagged (the fallback is the fixed size
 *     that actually paints when the custom property hasn't been set).
 *   - `var(--x)` with no fallback → NOT flagged (nothing fixed to reason about).
 *   - Multi-token shorthand (e.g. "10px 20px"): flagged only when EVERY token
 *     is either exempt/zero/100% or itself a fixed-size token, AND at least
 *     one token is a genuine fixed-size token (so "0 auto" is not flagged,
 *     but "10px 20px" is).
 */
function isSizeLiteralValue( rawValue ) {
	const v = rawValue.trim();
	if ( ! v ) {
		return false;
	}

	const tokens = splitTopLevelBySpace( v );

	if ( tokens.length <= 1 ) {
		return isFixedSizeToken( v );
	}

	let hasRealLiteral = false;
	for ( const tok of tokens ) {
		if ( KEYWORD_EXEMPT_RE.test( tok ) || ZERO_RE.test( tok ) || '100%' === tok ) {
			continue; // exempt token, doesn't disqualify the rest
		}
		if ( isFixedSizeToken( tok ) ) {
			hasRealLiteral = true;
			continue;
		}
		return false; // an unrecognised / non-fixed token anywhere → don't flag (conservative)
	}
	return hasRealLiteral;
}

// ---------------------------------------------------------------------------
// COMMENT STRIPPING (preserves line numbers — same length, newlines kept)
// ---------------------------------------------------------------------------

function stripComments( src ) {
	return src.replace( /\/\*[\s\S]*?\*\//g, ( m ) => m.replace( /[^\n]/g, ' ' ) );
}

// ---------------------------------------------------------------------------
// LINE-NUMBER LOOKUP
// ---------------------------------------------------------------------------

function buildLineIndex( src ) {
	const idx = [ 0 ];
	for ( let i = 0; i < src.length; i++ ) {
		if ( '\n' === src[ i ] ) {
			idx.push( i + 1 );
		}
	}
	return idx;
}

function offsetToLine( lineIndex, offset ) {
	let lo = 0;
	let hi = lineIndex.length - 1;
	let ans = 0;
	while ( lo <= hi ) {
		const mid = ( lo + hi ) >> 1;
		if ( lineIndex[ mid ] <= offset ) {
			ans = mid;
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}
	return ans + 1;
}

// ---------------------------------------------------------------------------
// BRACE-MATCHING RULE PARSER
//
// Walks the (comment-stripped) source once, respecting quoted strings so a
// brace inside `content: '{'` never confuses nesting. Conditional at-rules
// (@media/@supports/@container/@layer) are descended into; opaque at-rules
// (@keyframes/@font-face/@page/@property/anything else with a block) are
// skipped whole. Everything else with a block is a real rule.
// ---------------------------------------------------------------------------

const CONDITIONAL_AT_RULES = new Set( [ 'media', 'supports', 'container', 'layer' ] );

function parseBlock( src, start, end ) {
	const rules = [];
	let i = start;

	while ( i < end ) {
		// Read selector/at-rule text up to the next top-level '{', skipping quotes.
		const selStart = i;
		let quote = null;
		while ( i < end ) {
			const ch = src[ i ];
			if ( quote ) {
				if ( ch === quote && src[ i - 1 ] !== '\\' ) {
					quote = null;
				}
				i++;
				continue;
			}
			if ( '"' === ch || "'" === ch ) {
				quote = ch;
				i++;
				continue;
			}
			if ( '{' === ch ) {
				break;
			}
			if ( '}' === ch ) {
				// Stray close at this depth — nothing more to parse in this block.
				return { rules, next: i + 1 };
			}
			i++;
		}
		if ( i >= end ) {
			break; // no more blocks — trailing text (or nothing) is not a rule
		}
		const selectorText = src.slice( selStart, i ).trim();
		const blockStart   = i + 1;

		// Find the matching closing brace for this block.
		let depth = 1;
		let j = blockStart;
		quote = null;
		while ( j < end && depth > 0 ) {
			const ch = src[ j ];
			if ( quote ) {
				if ( ch === quote && src[ j - 1 ] !== '\\' ) {
					quote = null;
				}
				j++;
				continue;
			}
			if ( '"' === ch || "'" === ch ) {
				quote = ch;
				j++;
				continue;
			}
			if ( '{' === ch ) {
				depth++;
			} else if ( '}' === ch ) {
				depth--;
			}
			j++;
		}
		const blockEnd = j - 1; // index of the matching '}'

		if ( selectorText.startsWith( '@' ) ) {
			const atNameMatch = selectorText.match( /^@([a-zA-Z-]+)/ );
			const atName      = atNameMatch ? atNameMatch[ 1 ].toLowerCase() : '';
			if ( CONDITIONAL_AT_RULES.has( atName ) ) {
				const nested = parseBlock( src, blockStart, blockEnd );
				rules.push( ...nested.rules );
			}
			// else: opaque at-rule (@keyframes, @font-face, @page, @property, …) — skip its body.
		} else if ( selectorText ) {
			rules.push( { selector: selectorText, bodyStart: blockStart, bodyEnd: blockEnd } );
		}

		i = j;
	}

	return { rules, next: i };
}

/**
 * Split a rule's body into raw declaration strings, respecting parens depth
 * (so a comma/semicolon-free var()/calc() argument list is never split
 * mid-function) and quoted strings. Returns [{ raw, offset }].
 */
function parseDeclarations( src, bodyStart, bodyEnd ) {
	const decls = [];
	let i = bodyStart;
	let declStart = i;
	let parenDepth = 0;
	let quote = null;

	while ( i < bodyEnd ) {
		const ch = src[ i ];
		if ( quote ) {
			if ( ch === quote && src[ i - 1 ] !== '\\' ) {
				quote = null;
			}
			i++;
			continue;
		}
		if ( '"' === ch || "'" === ch ) {
			quote = ch;
			i++;
			continue;
		}
		if ( '(' === ch ) {
			parenDepth++;
			i++;
			continue;
		}
		if ( ')' === ch ) {
			parenDepth--;
			i++;
			continue;
		}
		if ( ';' === ch && 0 === parenDepth ) {
			decls.push( { raw: src.slice( declStart, i ), offset: declStart } );
			declStart = i + 1;
			i++;
			continue;
		}
		i++;
	}
	const tail = src.slice( declStart, bodyEnd );
	if ( tail.trim() ) {
		decls.push( { raw: tail, offset: declStart } );
	}
	return decls;
}

/** Normalise a selector for base-selector comparison (collapse whitespace). */
function normaliseSelector( selector ) {
	return selector.replace( /\s+/g, ' ' ).trim();
}

/** Strip `.is-*` / `.has-*` classes from a selector, then normalise. */
function stripStateClasses( selector ) {
	return normaliseSelector( selector.replace( STATE_CLASS_STRIP_RE, '' ) );
}

// ---------------------------------------------------------------------------
// PER-FILE SCAN
// ---------------------------------------------------------------------------

/**
 * Scan one CSS file's (already comment-stripped) source. Returns:
 *   - findings: candidates whose property has NO base-selector declaration
 *               anywhere else in the file.
 */
function scanFile( relPath, strippedSrc ) {
	const lineIndex = buildLineIndex( strippedSrc );
	const { rules }  = parseBlock( strippedSrc, 0, strippedSrc.length );

	// First pass: collect every (normalisedSelector -> Set<property>) pair
	// declared ANYWHERE in the file, so we can check "is the base selector's
	// resting value for this property declared somewhere in this file?".
	const selectorPropertyMap = new Map(); // normalisedSelector -> Set<property>
	// Second pass input: candidate declarations (state selector + size literal).
	const candidates = [];

	for ( const rule of rules ) {
		const normSelector  = normaliseSelector( rule.selector );
		const isStateSelector = STATE_CLASS_RE.test( rule.selector );
		const decls = parseDeclarations( strippedSrc, rule.bodyStart, rule.bodyEnd );

		for ( const { raw, offset } of decls ) {
			const colonIdx = raw.indexOf( ':' );
			if ( -1 === colonIdx ) {
				continue;
			}
			const property = raw.slice( 0, colonIdx ).trim().toLowerCase();
			const value     = raw.slice( colonIdx + 1 ).trim();
			if ( ! property ) {
				continue;
			}

			if ( ! selectorPropertyMap.has( normSelector ) ) {
				selectorPropertyMap.set( normSelector, new Set() );
			}
			selectorPropertyMap.get( normSelector ).add( property );

			if ( isStateSelector && SIZE_PROPERTY_RE.test( property ) && isSizeLiteralValue( value ) ) {
				candidates.push( {
					selector: rule.selector,
					normSelector,
					property,
					value,
					line: offsetToLine( lineIndex, offset ),
				} );
			}
		}
	}

	const findings = [];
	for ( const cand of candidates ) {
		const baseSelector = stripStateClasses( cand.selector );
		const baseProps    = selectorPropertyMap.get( baseSelector );
		const hasBaseDeclaration = !! ( baseProps && baseProps.has( cand.property ) );
		if ( ! hasBaseDeclaration ) {
			findings.push( {
				file:     relPath,
				line:     cand.line,
				selector: normaliseSelector( cand.selector ),
				property: cand.property,
				value:    cand.value,
			} );
		}
	}

	return findings;
}

// ---------------------------------------------------------------------------
// BASELINE
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return { accepted: [] };
	}
	const raw = fs.readFileSync( BASELINE_FILE, 'utf8' );
	let parsed;
	try {
		parsed = JSON.parse( raw );
	} catch ( e ) {
		process.stderr.write(
			`[check-shared-css-state-rules] ERROR: could not parse baseline JSON (${ e.message }).\n`
		);
		process.exit( 1 );
	}
	const accepted = Array.isArray( parsed.accepted ) ? parsed.accepted : [];
	const errors = [];
	for ( const entry of accepted ) {
		if ( ! entry || 'string' !== typeof entry.reason || ! entry.reason.trim() ) {
			errors.push( entry );
		}
	}
	if ( errors.length > 0 ) {
		process.stderr.write(
			'[check-shared-css-state-rules] ERROR: baseline contains ' + errors.length +
			' entry(ies) with no `reason`. Every accepted baseline entry MUST carry a justification.\n'
		);
		process.stderr.write( JSON.stringify( errors, null, 2 ) + '\n' );
		process.exit( 1 );
	}
	return { accepted };
}

function baselineKey( finding ) {
	return [ finding.file, finding.selector, finding.property, finding.value ].join( '||' );
}

// ---------------------------------------------------------------------------
// EXPLANATION TEXT
// ---------------------------------------------------------------------------

function explain( finding ) {
	return (
		`A shared stylesheet sets '${ finding.property }' to the fixed value '${ finding.value }' ` +
		`on a state-only selector, but no rule in this file sets '${ finding.property }' on the ` +
		'corresponding base (resting) selector. This rule cannot know what value it is changing ' +
		'FROM, so it will silently override every instance\'s own resting value instead of ' +
		'adjusting it — exactly the header-row shrink bug from 2026-07-26, where a row with 0px ' +
		'padding grew to 4px on "shrink". Declare the resting value for this property on the base ' +
		'selector in the SAME file, or compute the changed value per-instance (e.g. a calc() of the ' +
		"instance's own value) instead of a shared literal."
	);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	if ( ! fs.existsSync( CSS_DIR ) ) {
		process.stderr.write( `[check-shared-css-state-rules] No such directory: ${ CSS_DIR }\n` );
		process.exit( CHECK_MODE ? 1 : 0 );
	}

	const cssFiles = fs.readdirSync( CSS_DIR )
		.filter( ( f ) => f.toLowerCase().endsWith( '.css' ) )
		.sort();

	const { accepted } = loadBaseline();
	const baselineKeys = new Set( accepted.map( baselineKey ) );

	const allFindings = [];
	for ( const file of cssFiles ) {
		const fullPath = path.join( CSS_DIR, file );
		const raw       = fs.readFileSync( fullPath, 'utf8' );
		const stripped  = stripComments( raw );
		const relPath   = path.join( 'assets', 'css', file );
		const findings  = scanFile( relPath, stripped );
		allFindings.push( ...findings );
	}

	const netNew   = allFindings.filter( ( f ) => ! baselineKeys.has( baselineKey( f ) ) );
	const baselined = allFindings.filter( ( f ) => baselineKeys.has( baselineKey( f ) ) );

	if ( 0 === allFindings.length ) {
		process.stdout.write( '[check-shared-css-state-rules] 0 findings — clean.\n' );
		process.exit( 0 );
	}

	process.stdout.write(
		`[check-shared-css-state-rules] ${ allFindings.length } finding(s) ` +
		`(${ netNew.length } net-new, ${ baselined.length } baselined).\n\n`
	);

	for ( const f of netNew ) {
		process.stdout.write( `NET-NEW  ${ f.file }:${ f.line }\n` );
		process.stdout.write( `  selector: ${ f.selector }\n` );
		process.stdout.write( `  property: ${ f.property }\n` );
		process.stdout.write( `  value:    ${ f.value }\n` );
		process.stdout.write( `  why:      ${ explain( f ) }\n\n` );
	}

	for ( const f of baselined ) {
		process.stdout.write( `baselined  ${ f.file }:${ f.line }  ${ f.selector } { ${ f.property }: ${ f.value } }\n` );
	}

	if ( CHECK_MODE && netNew.length > 0 ) {
		process.exitCode = 1;
		return;
	}
	process.exitCode = 0;
}

main();
