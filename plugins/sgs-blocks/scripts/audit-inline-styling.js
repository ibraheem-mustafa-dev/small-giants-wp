/**
 * audit-inline-styling.js
 *
 * READ-ONLY DETECTION INSTRUMENT (not a build gate) — classifies HOW every
 * SGS block emits its styling, so a future "no-inline-styling" migration can
 * be planned from real data instead of guesswork.
 *
 * For each block under src/blocks/<block>/ this script classifies styling
 * emission into 5 buckets:
 *
 *   1. INLINE-via-supports  — WP-native block.json `supports` groups
 *      (color / spacing / __experimentalBorder / typography / shadow).
 *      These serialise INLINE by default via get_block_wrapper_attributes().
 *
 *   2. INLINE-via-render    — render.php sites that build a `style="..."`
 *      attribute or push a real CSS declaration into a `$*_style*` /
 *      `$inline_styles` / `$styles` / `extra_styles` / `$media_style*` array.
 *      Emitting a CSS custom-property VALUE (`--sgs-x: ...`) is NOT a
 *      violation (it's a var, not a paint declaration) — only a real CSS
 *      property (color, padding, border, object-fit, etc.) counts.
 *
 *   3. INLINE-via-wrapper   — the block routes its base box CSS through the
 *      shared `SGS_Container_Wrapper::render()`, whose non-responsive base
 *      declarations serialise inline.
 *
 *   4. DROP-conditional-inert — block.json declares grid/flex-family attrs
 *      (columns / gridTemplate* / gridAuto* / justifyItems / justifyContent
 *      / alignItems / alignContent / flexDirection / flexWrap / gap* /
 *      gridItem*) but the block's own `layout` attr defaults to something
 *      other than grid/flex — so those attrs are likely inert unless an
 *      operator explicitly sets layout=grid/flex.
 *
 *   5. DROP-unrouted        — attrs declared in block.json that never reach
 *      any CSS-emitting sink: never read via `$attributes['X']` in
 *      render.php at all, OR read into a PHP variable that is then either
 *      (a) never used again (dead read), (b) explicitly nulled out before a
 *      shared-wrapper delegation call (the "C3 double-emit guard" idiom —
 *      and its whole attr FAMILY is nulled with it, e.g. nulling
 *      backgroundImage also drops backgroundSize/Position/Repeat/
 *      Attachment, nulling bgSvgContent drops the whole bgSvg* family), or
 *      (c) passed into a block-private helper function whose body never
 *      reads the corresponding dict key.
 *
 * PLUS two cross-cutting columns:
 *
 *   - base-attr-family gap  — a block declaring `supports.spacing` /
 *     `__experimentalBorder` / `typography` with ONLY *Tablet/*Mobile tier
 *     attrs and no unsuffixed BASE attr (e.g. `paddingTopTablet` +
 *     `paddingTopMobile` but no `paddingTop`) — the "tier-without-base"
 *     defect.
 *
 *   - shared-helper attribution — which shared helper produced each
 *     emission: SGS_Container_Wrapper / sgs_typography_css_rule /
 *     sgs_responsive_css_rule / sgs_button_element_style_css / a
 *     block-private render.php site.
 *
 * Usage
 * -----
 *   node scripts/audit-inline-styling.js
 *
 * Outputs
 * -------
 *   reports/inline-styling-audit-2026-07-09.json
 *   reports/inline-styling-audit-2026-07-09.md
 *
 * READ-ONLY: this script never writes to any block/converter/DB file. It
 * only creates the two report files above.
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );

const ROOT        = path.join( __dirname, '..' );
const BLOCKS_DIR   = path.join( ROOT, 'src', 'blocks' );
const INCLUDES_DIR = path.join( ROOT, 'includes' );
const REPORTS_DIR  = path.join( __dirname, '..', '..', '..', '.claude', 'reports' );

const OUT_JSON = path.join( REPORTS_DIR, 'inline-styling-audit-2026-07-09.json' );
const OUT_MD   = path.join( REPORTS_DIR, 'inline-styling-audit-2026-07-09.md' );

// ---------------------------------------------------------------------------
// GENERIC HELPERS (patterns reused from check-hardcoded-render-defaults.js)
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ) // /* ... */
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ); // // ... (not http://)
}

/**
 * Capture the raw argument text of each call to `fnName` in `src` (balanced
 * parens; whole-identifier match). Returns an array of arg-region strings.
 * (Ported verbatim from check-hardcoded-render-defaults.js.)
 */
function captureCallArgRegions( src, fnName ) {
	const regions = [];
	const needle = fnName + '(';
	let from = 0;
	let idx;
	while ( ( idx = src.indexOf( needle, from ) ) !== -1 ) {
		const before = idx > 0 ? src[ idx - 1 ] : '';
		if ( /[A-Za-z0-9_]/.test( before ) ) {
			from = idx + needle.length;
			continue;
		}
		let i = idx + needle.length;
		let depth = 1;
		const start = i;
		while ( i < src.length && depth > 0 ) {
			const ch = src[ i ];
			if ( ch === '(' ) {
				depth++;
			} else if ( ch === ')' ) {
				depth--;
			}
			i++;
		}
		regions.push( src.slice( start, i - 1 ) );
		from = i;
	}
	return regions;
}

/** Capture all `function name( ... ) { ... }` bodies in `src` (balanced braces). */
function captureLocalFunctions( src ) {
	const fns = new Map(); // name -> body text
	const defRe = /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
	let m;
	while ( ( m = defRe.exec( src ) ) !== null ) {
		const name = m[ 1 ];
		// Find the opening brace of the function body after the closing paren
		// of the parameter list.
		let i = defRe.lastIndex;
		let parenDepth = 1;
		while ( i < src.length && parenDepth > 0 ) {
			if ( src[ i ] === '(' ) parenDepth++;
			else if ( src[ i ] === ')' ) parenDepth--;
			i++;
		}
		// Skip past return-type hints etc. until the first `{`.
		while ( i < src.length && src[ i ] !== '{' && src[ i ] !== ';' ) {
			i++;
		}
		if ( src[ i ] !== '{' ) {
			continue; // abstract/interface decl — no body
		}
		const bodyStart = i;
		let braceDepth = 1;
		i++;
		while ( i < src.length && braceDepth > 0 ) {
			if ( src[ i ] === '{' ) braceDepth++;
			else if ( src[ i ] === '}' ) braceDepth--;
			i++;
		}
		fns.set( name, src.slice( bodyStart, i ) );
	}
	return fns;
}

// ---------------------------------------------------------------------------
// SHARED-HELPER GOVERNANCE (mirrors check-hardcoded-render-defaults.js E11)
// ---------------------------------------------------------------------------

const TYPOGRAPHY_SUFFIXES = [
	'FontSize', 'FontSizeUnit', 'FontSizeTablet', 'FontSizeMobile',
	'FontWeight', 'FontStyle', 'TextTransform', 'TextDecoration',
	'LineHeight', 'LineHeightUnit', 'LineHeightTablet', 'LineHeightMobile',
	'LetterSpacing', 'LetterSpacingUnit', 'LetterSpacingTablet', 'LetterSpacingMobile',
];

const BUTTON_SUFFIXES = [
	'ColourBackground', 'ColourText', 'ColourBorder',
	'ColourBackgroundHover', 'ColourTextHover', 'ColourBorderHover',
	'BorderStyle', 'BorderWidth', 'BorderRadius',
	'FontWeight', 'FontSize', 'PaddingY', 'PaddingX', 'WidthType',
];

/** Extract literal string args from a captured call-arg region. */
function literalsInRegion( region ) {
	const lits = [];
	const litRe = /'([^']*)'|"([^"]*)"/g;
	let m;
	while ( ( m = litRe.exec( region ) ) !== null ) {
		lits.push( m[ 1 ] !== undefined ? m[ 1 ] : m[ 2 ] );
	}
	return lits;
}

/**
 * Build the set of attr names routed via sgs_typography_css_rule() calls —
 * prefix (first literal arg) + each TYPOGRAPHY_SUFFIXES suffix.
 */
function collectTypographyRoutedAttrs( src ) {
	const routed = new Set();
	for ( const region of captureCallArgRegions( src, 'sgs_typography_css_rule' ) ) {
		const lits = literalsInRegion( region );
		if ( lits.length === 0 ) continue;
		const prefix = lits[ 0 ];
		for ( const suffix of TYPOGRAPHY_SUFFIXES ) {
			const attrName = '' !== prefix
				? prefix + suffix
				: suffix.charAt( 0 ).toLowerCase() + suffix.slice( 1 );
			routed.add( attrName );
		}
	}
	return routed;
}

/**
 * Build the set of attr names routed via sgs_button_element_style_css() calls.
 */
function collectButtonRoutedAttrs( src ) {
	const routed = new Set();
	for ( const region of captureCallArgRegions( src, 'sgs_button_element_style_css' ) ) {
		const lits = literalsInRegion( region );
		if ( lits.length === 0 ) continue;
		const prefix = lits[ 0 ];
		for ( const suffix of BUTTON_SUFFIXES ) {
			const attrName = '' !== prefix
				? prefix + suffix
				: suffix.charAt( 0 ).toLowerCase() + suffix.slice( 1 );
			routed.add( attrName );
		}
	}
	return routed;
}

/**
 * Build the set of attr names routed via sgs_responsive_css_rule() calls —
 * every literal value following 'attr' / 'tablet_attr' / 'mobile_attr' /
 * 'unit_attr' keys inside every call's prop_map argument.
 */
function collectResponsiveCssRuleRoutedAttrs( src ) {
	const routed = new Set();
	for ( const region of captureCallArgRegions( src, 'sgs_responsive_css_rule' ) ) {
		const keyRe = /(?:attr|tablet_attr|mobile_attr|unit_attr)\s*=>\s*['"]([A-Za-z0-9_]+)['"]/g;
		let m;
		while ( ( m = keyRe.exec( region ) ) !== null ) {
			routed.add( m[ 1 ] );
		}
	}
	return routed;
}

/**
 * Read includes/class-sgs-container-wrapper.php once and derive the set of
 * attr names it reads via `$attributes['X']` / `$attributes[ 'X' ]`. This is
 * the authoritative "wrapper-owned attr" list — read from the real source
 * file rather than hand-maintained, so it can't drift.
 */
function loadWrapperOwnedAttrs() {
	const wrapperSrc = readIfExists( path.join( INCLUDES_DIR, 'class-sgs-container-wrapper.php' ) );
	const owned = new Set();
	const re = /attributes\s*\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g;
	let m;
	while ( ( m = re.exec( wrapperSrc ) ) !== null ) {
		owned.add( m[ 1 ] );
	}
	return owned;
}

// ---------------------------------------------------------------------------
// GRID/FLEX FAMILY (Bucket 4 — DROP-conditional-inert)
// ---------------------------------------------------------------------------

function isGridFlexFamilyAttr( attrName ) {
	const lower = attrName.toLowerCase();
	if ( lower.includes( 'columns' ) ) return true;
	if ( lower.startsWith( 'gridtemplate' ) ) return true;
	if ( lower.startsWith( 'gridauto' ) ) return true;
	if ( lower.startsWith( 'griditem' ) ) return true;
	if ( lower.includes( 'justifyitems' ) ) return true;
	if ( lower.includes( 'justifycontent' ) ) return true;
	if ( lower.includes( 'alignitems' ) ) return true;
	if ( lower.includes( 'aligncontent' ) ) return true;
	if ( lower.includes( 'flexdirection' ) ) return true;
	if ( lower.includes( 'flexwrap' ) ) return true;
	if ( lower.startsWith( 'gap' ) ) return true;
	return false;
}

// ---------------------------------------------------------------------------
// BUCKET 1 — INLINE-via-supports
// ---------------------------------------------------------------------------

function classifySupports( meta ) {
	const supports = meta.supports || {};
	const groups = {};

	if ( supports.color ) {
		groups.color = typeof supports.color === 'object'
			? Object.keys( supports.color ).filter( ( k ) => supports.color[ k ] )
			: [ 'color' ];
	}
	if ( supports.spacing ) {
		groups.spacing = typeof supports.spacing === 'object'
			? Object.keys( supports.spacing ).filter( ( k ) => supports.spacing[ k ] )
			: [ 'spacing' ];
	}
	if ( supports.__experimentalBorder ) {
		groups.__experimentalBorder = typeof supports.__experimentalBorder === 'object'
			? Object.keys( supports.__experimentalBorder ).filter( ( k ) => supports.__experimentalBorder[ k ] )
			: [ 'border' ];
	}
	if ( supports.typography ) {
		groups.typography = typeof supports.typography === 'object'
			? Object.keys( supports.typography ).filter( ( k ) => supports.typography[ k ] )
			: [ 'typography' ];
	}
	if ( supports.shadow ) {
		groups.shadow = [ 'shadow' ];
	}

	return groups;
}

// ---------------------------------------------------------------------------
// BUCKET 2 — INLINE-via-render
// ---------------------------------------------------------------------------

/** Is this a CSS custom-property VALUE emission (acceptable), not a paint decl? */
function isCustomPropertyDecl( property ) {
	return property.startsWith( '--' );
}

/** 1-based line number of `offset` within `src`. */
function lineAt( src, offset ) {
	let line = 1;
	for ( let i = 0; i < offset && i < src.length; i++ ) {
		if ( src[ i ] === '\n' ) line++;
	}
	return line;
}

/**
 * From `src` starting at index `parenIdx` (which MUST point at an opening
 * `(`), return the index just past the matching closing `)`.
 */
function endOfBalancedParens( src, parenIdx ) {
	let depth = 1;
	let i = parenIdx + 1;
	while ( i < src.length && depth > 0 ) {
		if ( src[ i ] === '(' ) depth++;
		else if ( src[ i ] === ')' ) depth--;
		i++;
	}
	return i;
}

/** Extract `prop:value` declarations from a text blob and push findings. */
function extractDeclsFromText( text, findings, srcForLineNum, offsetInSrc ) {
	const segments = text.split( ';' );
	for ( const seg of segments ) {
		const declM = /^\s*(-{0,2}[a-zA-Z-]+)\s*:/.exec( seg );
		if ( ! declM ) continue;
		const property = declM[ 1 ].toLowerCase();
		if ( isCustomPropertyDecl( property ) ) continue; // sanctioned CSS-var value
		findings.push( {
			line: lineAt( srcForLineNum, offsetInSrc ),
			property,
			snippet: text.trim(),
		} );
	}
}

/**
 * Collect every "style-ish" variable assignment region in `stripped` source:
 * a variable whose name contains "style" (case-insensitive), assigned via
 * `array( ... )` / `sprintf( ... )` / `implode( ... )` (balanced parens,
 * possibly multi-line) or a scalar expression (up to the terminating `;`,
 * possibly multi-line). Returns `[{ varName, regionText, valueStart }]`.
 *
 * When `localFns` (Map<name, bodyText>) is supplied and the captured value
 * is a bare call to a LOCALLY-DEFINED function (e.g. a block-private
 * `sgs_quote_build_slot_style( array( ... ) )` helper that itself builds
 * `'prop:' . $x` declarations into its own accumulator), the callee's body
 * text is appended to the region — so literals built one call-frame deeper
 * are still attributed to the call-site line.
 */
function collectStyleSinkRegions( stripped, localFns ) {
	const regions = [];
	// Whole-identifier `$varName` immediately followed by an optional `[...]`
	// index and an `=` or `.=` assignment operator (not `==`/`=>`/`===`).
	const assignRe = /\$([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[[^\]]*\])?\s*(\.?=)(?!=)(?!>)/g;
	let m;
	while ( ( m = assignRe.exec( stripped ) ) !== null ) {
		const varName = m[ 1 ];
		if ( ! /style/i.test( varName ) ) continue;

		let valueStart = assignRe.lastIndex;
		while ( valueStart < stripped.length && /\s/.test( stripped[ valueStart ] ) ) valueStart++;

		let regionText;
		let kind;
		if ( stripped.slice( valueStart ).match( /^(array\s*\(|sprintf\s*\(|implode\s*\()/i ) ) {
			const parenIdx = stripped.indexOf( '(', valueStart );
			const end = endOfBalancedParens( stripped, parenIdx );
			regionText = stripped.slice( valueStart, end );
			kind = 'literal-builder';
		} else {
			const semiIdx = stripped.indexOf( ';', valueStart );
			regionText = semiIdx === -1 ? stripped.slice( valueStart, valueStart + 400 ) : stripped.slice( valueStart, semiIdx );
			// A bare call to a NAMED function (e.g. `sgs_quote_build_slot_style( array( ... ) )`)
			// is NOT a safe context for a blind "variable is present → reaches this
			// sink" check: an arg passed in the call's dict may never actually be
			// read by the callee (the "dead pass-through" case). Tag it distinctly
			// so varReachesStyleSink can exclude it and defer to the dict-key-aware
			// varPassedToLocalHelper()/varPassedToSharedHelper() checks instead.
			kind = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/.test( regionText ) ? 'function-call' : 'scalar';
		}

		if ( localFns && kind === 'function-call' ) {
			const callM = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec( regionText );
			if ( callM && localFns.has( callM[ 1 ] ) ) {
				// For literal-extraction purposes (scanInlineRenderSites) it's safe
				// to also scan the callee's OWN body text — a declaration built
				// there IS a real emission regardless of which dict keys the
				// call site happened to pass. Region `kind` stays 'function-call'
				// so varReachesStyleSink (which needs dict-key precision) still
				// excludes it.
				regionText += ' ' + localFns.get( callM[ 1 ] );
			}
		}

		regions.push( { varName, regionText, valueStart, kind } );
	}
	return regions;
}

/**
 * Scan a "style-ish" variable's assignments (array literal, array-push, or
 * scalar assignment — single OR multi-line) for `'property:value'`
 * declarations. Returns findings with property + line.
 *
 * Matches: $styles = array( 'display:grid', ... );
 *          $xStyles[] = 'object-fit:' . $var;
 *          $x_style = sprintf( 'a:%s;b:%s', ... );
 *          echoed literal style="..." HTML attributes.
 *
 * Region-based (not line-by-line) so multi-line `array( ... )` literals —
 * where the variable name and the string literal live on different lines —
 * are still captured.
 */
function scanInlineRenderSites( renderPhpSrc, localFns ) {
	const findings = [];
	if ( ! renderPhpSrc ) return findings;
	const stripped = stripComments( renderPhpSrc );

	for ( const { regionText, valueStart } of collectStyleSinkRegions( stripped, localFns ) ) {
		// Extract every quoted-string literal within the captured region.
		const strRe = /'([^']*)'|"([^"]*)"/g;
		let sm;
		while ( ( sm = strRe.exec( regionText ) ) !== null ) {
			const text = sm[ 1 ] !== undefined ? sm[ 1 ] : sm[ 2 ];
			if ( ! text.includes( ':' ) ) continue;
			extractDeclsFromText( text, findings, stripped, valueStart + sm.index );
		}
	}

	// Also catch echoed literal `style="..."` HTML attributes that are NOT
	// built via a style-ish variable (direct inline in echoed HTML).
	const styleAttrRe = /style\s*=\s*["']([^"']*?)["']/gi;
	let am;
	while ( ( am = styleAttrRe.exec( stripped ) ) !== null ) {
		const val = am[ 1 ];
		if ( /^\s*<\?php/.test( val ) ) continue; // pure PHP interpolation attr
		if ( ! val.includes( ':' ) ) continue;
		extractDeclsFromText( val, findings, stripped, am.index );
	}

	// Deduplicate identical {line, property} pairs (the two scanners above
	// can both see the same literal via a wrapping var + its later echo).
	const seen = new Set();
	return findings.filter( ( f ) => {
		const key = f.line + '|' + f.property + '|' + f.snippet;
		if ( seen.has( key ) ) return false;
		seen.add( key );
		return true;
	} );
}

// ---------------------------------------------------------------------------
// BUCKET 3 — INLINE-via-wrapper
// ---------------------------------------------------------------------------

function detectsWrapperUsage( renderPhpSrc ) {
	return /SGS_Container_Wrapper\s*::\s*render/.test( renderPhpSrc );
}

/**
 * Collect the "explicitly nulled before wrapper delegation" attr set — the
 * C3 double-emit-guard idiom:
 *
 *   foreach ( array( 'attrA', 'attrB', ... ) as $x ) {
 *       $helper_attrs[ $x ] = null;
 *   }
 *
 * plus direct single assignments: $helper_attrs['attrX'] = null;
 *
 * Then EXPANDS the set by attr "root family" — nulling one member of a
 * family (background*, bgSvg*, bgVideo*, minHeight*) renders every sibling
 * in that family functionally inert too (e.g. nulling backgroundImage also
 * drops backgroundSize/Position/Repeat/Attachment; nulling bgSvgContent
 * drops the whole bgSvg* family).
 */
const NULL_FAMILY_ROOTS = [ 'background', 'bgSvg', 'bgVideo', 'minHeight' ];

function collectWrapperNulledAttrs( renderPhpSrc, allKnownAttrNames ) {
	const nulled = new Set();
	if ( ! renderPhpSrc ) return nulled;
	const stripped = stripComments( renderPhpSrc );

	// Foreach-array idiom.
	const foreachRe = /foreach\s*\(\s*array\s*\(([\s\S]*?)\)\s*as\s*\$\w+\s*\)\s*\{\s*\$\w+\s*\[\s*\$\w+\s*\]\s*=\s*null\s*;/g;
	let m;
	while ( ( m = foreachRe.exec( stripped ) ) !== null ) {
		for ( const lit of literalsInRegion( m[ 1 ] ) ) {
			nulled.add( lit );
		}
	}

	// Direct single assignment idiom.
	const directRe = /\$\w+\s*\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]\s*=\s*null\s*;/g;
	while ( ( m = directRe.exec( stripped ) ) !== null ) {
		nulled.add( m[ 1 ] );
	}

	// Family expansion.
	const expanded = new Set( nulled );
	for ( const nulledAttr of nulled ) {
		const root = NULL_FAMILY_ROOTS.find( ( r ) => nulledAttr.toLowerCase().startsWith( r.toLowerCase() ) );
		if ( ! root ) continue;
		for ( const candidate of allKnownAttrNames ) {
			if ( candidate.toLowerCase().startsWith( root.toLowerCase() ) ) {
				expanded.add( candidate );
			}
		}
	}

	return expanded;
}

/** Detect a `no_overlay` (or similar) opt-out flag passed to the wrapper opts. */
function detectsNoOverlayOptOut( renderPhpSrc ) {
	return /['"]no_overlay['"]\s*=>\s*true/.test( renderPhpSrc || '' );
}

// ---------------------------------------------------------------------------
// BUCKET 5 — DROP-unrouted
// ---------------------------------------------------------------------------

/**
 * For a single attr, determine whether render.php reads it via
 * `$attributes['AttrName']` and, if so, the assigned variable name(s).
 */
function findSubscriptReadVars( renderPhpSrc, attrName ) {
	const vars = new Set();
	const escaped = attrName.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const subscriptRe = new RegExp( `\\$attributes\\s*\\[\\s*['"]${ escaped }['"]\\s*\\]`, 'g' );
	const hasSubscript = subscriptRe.test( renderPhpSrc );
	if ( ! hasSubscript ) {
		return { hasSubscript: false, vars };
	}

	// Look for `$var = ...$attributes['AttrName']...;` assignment lines.
	const assignRe = new RegExp(
		`\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=[^;]*\\$attributes\\s*\\[\\s*['"]${ escaped }['"]\\s*\\][^;]*;`,
		'g'
	);
	let m;
	while ( ( m = assignRe.exec( renderPhpSrc ) ) !== null ) {
		vars.add( m[ 1 ] );
	}

	return { hasSubscript: true, vars };
}

/** Count total occurrences of `$varName` (word-boundary) in src. */
function countVarOccurrences( src, varName ) {
	const re = new RegExp( `\\$${ varName }\\b`, 'g' );
	const matches = src.match( re );
	return matches ? matches.length : 0;
}

/**
 * Does `varName` appear inside the assignment REGION of any "style-ish"
 * variable elsewhere in the file (i.e. reaches a CSS-emission sink,
 * directly or via a multi-line array( )/sprintf( ) region)?
 */
function varReachesStyleSink( src, varName ) {
	const varRe = new RegExp( `\\$${ varName }\\b` );
	for ( const { varName: sinkVar, regionText, kind } of collectStyleSinkRegions( src ) ) {
		if ( sinkVar === varName ) continue; // the sink IS this var — not a use of it
		if ( kind === 'function-call' ) continue; // dict-key gated — see varPassedToLocalHelper/varPassedToSharedHelper
		if ( varRe.test( regionText ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Is `varName` passed as a dict value into a call to one of the 4 known
 * shared CSS helpers? Returns the helper name if so, else null.
 */
const SHARED_HELPER_NAMES = [
	'sgs_typography_css_rule',
	'sgs_button_element_style_css',
	'sgs_responsive_css_rule',
];

function varPassedToSharedHelper( src, varName ) {
	for ( const fnName of SHARED_HELPER_NAMES ) {
		for ( const region of captureCallArgRegions( src, fnName ) ) {
			if ( new RegExp( `\\$${ varName }\\b` ).test( region ) ) {
				return fnName;
			}
		}
	}
	if ( /SGS_Container_Wrapper\s*::\s*render/.test( src ) ) {
		for ( const region of captureCallArgRegions( src, 'SGS_Container_Wrapper::render' ) ) {
			if ( new RegExp( `\\$${ varName }\\b` ).test( region ) ) {
				return 'SGS_Container_Wrapper';
			}
		}
	}
	return null;
}

/**
 * Is `varName` passed as `'key' => $varName` into a call to a LOCAL
 * (block-private) function whose body actually reads `['key']`? Returns the
 * local function name if routed, or null if not found / dead pass-through.
 */
function varPassedToLocalHelper( src, varName, localFns ) {
	// Find any call `funcName( array( ... 'key' => $varName ... ) )` for each
	// known local function name.
	for ( const [ fnName, body ] of localFns ) {
		for ( const region of captureCallArgRegions( src, fnName ) ) {
			const keyRe = new RegExp( `['"]([A-Za-z0-9_]+)['"]\\s*=>\\s*\\$${ varName }\\b` );
			const km = keyRe.exec( region );
			if ( ! km ) continue;
			const dictKey = km[ 1 ];
			const keyUsedRe = new RegExp( `\\[\\s*['"]${ dictKey }['"]\\s*\\]` );
			if ( keyUsedRe.test( body ) ) {
				return fnName; // routed — the local function's body reads this key
			}
			return null; // dead pass-through — key never read inside the function body
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// PER-BLOCK ANALYSIS
// ---------------------------------------------------------------------------

function analyseBlock( blockDir, wrapperOwnedAttrs ) {
	const blockJsonPath = path.join( blockDir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) return null;

	let meta;
	try {
		meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		process.stderr.write( `[audit-inline-styling] WARNING: invalid block.json in ${ blockDir } (${ e.message }) — skipped.\n` );
		return null;
	}

	const blockName = meta.name || path.basename( blockDir );
	const attrs = meta.attributes || {};
	const attrNames = Object.keys( attrs );

	const renderPhpPath = path.join( blockDir, 'render.php' );
	const renderPhpSrc = readIfExists( renderPhpPath );
	const strippedSrc = stripComments( renderPhpSrc );
	const styleCssPath = path.join( blockDir, 'style.css' );
	const styleCssSrc = readIfExists( styleCssPath );

	// ---- Bucket 1: INLINE-via-supports ------------------------------------
	const supportsGroups = classifySupports( meta );

	// ---- Local function bodies (needed by Bucket 2 + Bucket 5 tracing) -----
	const localFns = captureLocalFunctions( strippedSrc );

	// ---- Bucket 2: INLINE-via-render ---------------------------------------
	const inlineRenderFindings = scanInlineRenderSites( renderPhpSrc, localFns ).map( ( f ) => ( {
		...f,
		file: path.relative( ROOT, renderPhpPath ),
	} ) );

	// ---- Bucket 3: INLINE-via-wrapper ---------------------------------------
	const usesWrapper = detectsWrapperUsage( strippedSrc );
	const noOverlayOptOut = detectsNoOverlayOptOut( strippedSrc );

	// ---- Shared-helper governance sets --------------------------------------
	const typographyRouted = collectTypographyRoutedAttrs( strippedSrc );
	const buttonRouted     = collectButtonRoutedAttrs( strippedSrc );
	const responsiveRouted = collectResponsiveCssRuleRoutedAttrs( strippedSrc );

	// All attr names the wrapper *could* own, minus explicit nulls + family
	// expansion, minus overlay-family attrs when no_overlay opt-out is set.
	const nulledForWrapper = collectWrapperNulledAttrs( strippedSrc, attrNames );
	if ( noOverlayOptOut ) {
		for ( const a of attrNames ) {
			if ( a.toLowerCase().startsWith( 'overlaygradient' ) ) {
				nulledForWrapper.add( a );
			}
		}
	}

	// ---- Bucket 4: DROP-conditional-inert -----------------------------------
	const layoutAttr = attrs.layout;
	const layoutDefault = layoutAttr && typeof layoutAttr.default === 'string' ? layoutAttr.default : undefined;
	const hasLayoutAttr = !! layoutAttr;
	const layoutEngagesGridFlex = hasLayoutAttr && [ 'grid', 'flex' ].includes( ( layoutDefault || '' ).toLowerCase() );

	const conditionalInert = [];
	if ( hasLayoutAttr && ! layoutEngagesGridFlex ) {
		for ( const a of attrNames ) {
			if ( isGridFlexFamilyAttr( a ) ) {
				conditionalInert.push( a );
			}
		}
	}
	const conditionalInertSet = new Set( conditionalInert );

	// ---- Bucket 5: DROP-unrouted + shared-helper attribution per attr ------
	const unrouted = [];
	const attrRouting = {}; // attrName -> { routed: bool, via: string|null }

	for ( const attrName of attrNames ) {
		if ( conditionalInertSet.has( attrName ) ) {
			continue; // classified separately in bucket 4
		}

		// WP-native support-backed attrs are not "unrouted" — they're handled
		// entirely by WP core via get_block_wrapper_attributes(); this audit
		// doesn't apply per-attr routing checks to core-supports groups since
		// they aren't individual block.json attributes in the first place.

		// Shared-helper credit (checked before per-var tracing).
		if ( typographyRouted.has( attrName ) ) {
			attrRouting[ attrName ] = { routed: true, via: 'sgs_typography_css_rule' };
			continue;
		}
		if ( buttonRouted.has( attrName ) ) {
			attrRouting[ attrName ] = { routed: true, via: 'sgs_button_element_style_css' };
			continue;
		}
		if ( responsiveRouted.has( attrName ) ) {
			attrRouting[ attrName ] = { routed: true, via: 'sgs_responsive_css_rule' };
			continue;
		}
		if ( usesWrapper && wrapperOwnedAttrs.has( attrName ) && ! nulledForWrapper.has( attrName ) ) {
			attrRouting[ attrName ] = { routed: true, via: 'SGS_Container_Wrapper' };
			continue;
		}

		// Direct subscript-read tracing.
		const { hasSubscript, vars } = findSubscriptReadVars( strippedSrc, attrName );
		if ( ! hasSubscript ) {
			attrRouting[ attrName ] = { routed: false, via: null };
			unrouted.push( attrName );
			continue;
		}

		let routedVia = null;
		for ( const v of vars ) {
			const occurrences = countVarOccurrences( strippedSrc, v );
			if ( occurrences <= 1 ) {
				continue; // dead read — assigned, never used again
			}
			if ( varReachesStyleSink( strippedSrc, v ) ) {
				routedVia = 'render.php (block-private)';
				break;
			}
			const sharedHelper = varPassedToSharedHelper( strippedSrc, v );
			if ( sharedHelper ) {
				routedVia = sharedHelper;
				break;
			}
			const localHelper = varPassedToLocalHelper( strippedSrc, v, localFns );
			if ( localHelper ) {
				routedVia = 'block-private helper: ' + localHelper;
				break;
			}
		}

		if ( routedVia ) {
			attrRouting[ attrName ] = { routed: true, via: routedVia };
		} else {
			attrRouting[ attrName ] = { routed: false, via: null };
			unrouted.push( attrName );
		}
	}

	// ---- Cross-cutting: base-attr-family gap (tier-without-base) -----------
	//
	// PER-SIDE only. The SGS norm is per-side spacing attrs (paddingTop,
	// marginBottom, ...) — the bare shorthand `padding`/`margin` is a WP
	// supports concept, NOT a typed attr, so it is IGNORED here entirely.
	//
	// The defect fires when a tier attr `{F}{S}Tablet` OR `{F}{S}Mobile`
	// exists but its base per-side `{F}{S}` does NOT. Reports the specific
	// missing base per-side attr names. Border/typography roots keep the
	// simpler base-vs-Tablet/Mobile check (they are already per-property, no
	// shorthand ambiguity).
	const attrSet = new Set( attrNames );
	const tierWithoutBase = [];

	// Per-side spacing (padding/margin × Top/Right/Bottom/Left).
	const SPACING_FAMILIES = [ 'padding', 'margin' ];
	const SIDES = [ 'Top', 'Right', 'Bottom', 'Left' ];
	for ( const fam of SPACING_FAMILIES ) {
		for ( const side of SIDES ) {
			const base   = fam + side;            // paddingTop
			const tablet = base + 'Tablet';       // paddingTopTablet
			const mobile = base + 'Mobile';       // paddingTopMobile
			if ( ( attrSet.has( tablet ) || attrSet.has( mobile ) ) && ! attrSet.has( base ) ) {
				tierWithoutBase.push( base );
			}
		}
	}

	// Per-property border/typography roots (only when the relevant supports
	// group is declared — a tier attr with no base + no supports backing is
	// caught separately as drop-unrouted).
	const groupPresent = ( g ) => Object.prototype.hasOwnProperty.call( supportsGroups, g );
	const ROOT_CHECKS = [
		{ root: 'borderRadius',   group: '__experimentalBorder' },
		{ root: 'borderWidth',    group: '__experimentalBorder' },
		{ root: 'fontSize',       group: 'typography' },
		{ root: 'lineHeight',     group: 'typography' },
		{ root: 'letterSpacing',  group: 'typography' },
	];
	for ( const { root, group } of ROOT_CHECKS ) {
		if ( ! groupPresent( group ) ) continue;
		const hasBase   = attrSet.has( root );
		const hasTablet = attrSet.has( root + 'Tablet' );
		const hasMobile = attrSet.has( root + 'Mobile' );
		if ( ( hasTablet || hasMobile ) && ! hasBase ) {
			tierWithoutBase.push( root );
		}
	}

	const tierWithoutBaseUnique = [ ...new Set( tierWithoutBase ) ];

	// ---- Shared-helper attribution summary (dominant helper) ---------------
	const helperCounts = {};
	const bump = ( key ) => { helperCounts[ key ] = ( helperCounts[ key ] || 0 ) + 1; };
	for ( const f of inlineRenderFindings ) bump( 'render.php (block-private)' );
	for ( const attrName of attrNames ) {
		const r = attrRouting[ attrName ];
		if ( r && r.routed && r.via ) bump( r.via );
	}
	let dominantHelper = 'none';
	let maxCount = 0;
	for ( const [ key, count ] of Object.entries( helperCounts ) ) {
		if ( count > maxCount ) {
			maxCount = count;
			dominantHelper = key;
		}
	}

	return {
		block: blockName,
		dir: path.relative( ROOT, blockDir ),
		hasRenderPhp: fs.existsSync( renderPhpPath ),
		hasStyleCss: fs.existsSync( styleCssPath ),
		inlineViaSupports: supportsGroups,
		inlineViaRender: inlineRenderFindings,
		inlineViaWrapper: {
			usesWrapper,
			noOverlayOptOut,
			nulledAttrs: [ ...nulledForWrapper ],
		},
		dropConditionalInert: conditionalInert,
		dropUnrouted: unrouted,
		tierWithoutBase: tierWithoutBaseUnique,
		attrRouting,
		helperCounts,
		dominantHelper,
		scalarStylingLift: !! ( meta.supports && meta.supports.sgs && meta.supports.sgs.scalarStylingLift ),
	};
}

// ---------------------------------------------------------------------------
// REPORT GENERATION
// ---------------------------------------------------------------------------

function buildMarkdownReport( results ) {
	const lines = [];
	lines.push( '# SGS Blocks — Inline Styling Audit' );
	lines.push( '' );
	lines.push( '_Generated by `plugins/sgs-blocks/scripts/audit-inline-styling.js` on 2026-07-09._' );
	lines.push( '' );
	lines.push( 'Read-only detection instrument classifying how every SGS block emits its styling, to plan a "no-inline-styling" migration.' );
	lines.push( '' );

	// Summary table.
	lines.push( '## Summary table' );
	lines.push( '' );
	lines.push( '| Block | inline-supports | inline-render count | via-wrapper | drop-inert count | drop-unrouted count | tier-without-base | dominant shared-helper |' );
	lines.push( '|---|---|---|---|---|---|---|---|' );
	for ( const r of results ) {
		const supportsStr = Object.keys( r.inlineViaSupports ).join( '+' ) || '(none)';
		lines.push(
			`| ${ r.block } | ${ supportsStr } | ${ r.inlineViaRender.length } | ${ r.inlineViaWrapper.usesWrapper ? 'yes' : 'no' } | ${ r.dropConditionalInert.length } | ${ r.dropUnrouted.length } | ${ r.tierWithoutBase.length ? r.tierWithoutBase.join( ', ' ) : '—' } | ${ r.dominantHelper } |`
		);
	}
	lines.push( '' );

	// Per-block detail.
	lines.push( '## Per-block detail' );
	lines.push( '' );
	for ( const r of results ) {
		lines.push( `### ${ r.block }` );
		lines.push( '' );
		lines.push( `- \`block.json\`: ${ r.dir }/block.json` );
		lines.push( `- render.php: ${ r.hasRenderPhp ? 'yes' : 'no (static block)' } | style.css: ${ r.hasStyleCss ? 'yes' : 'no' }` );
		lines.push( `- scalarStylingLift declared: ${ r.scalarStylingLift ? 'yes' : 'no' }` );
		lines.push( '' );
		lines.push( '**1. INLINE-via-supports**' );
		if ( Object.keys( r.inlineViaSupports ).length === 0 ) {
			lines.push( '- (none declared)' );
		} else {
			for ( const [ group, subs ] of Object.entries( r.inlineViaSupports ) ) {
				lines.push( `- \`${ group }\`: ${ subs.join( ', ' ) }` );
			}
		}
		lines.push( '' );
		lines.push( '**2. INLINE-via-render (violations — real CSS property in a style="..." site)**' );
		if ( r.inlineViaRender.length === 0 ) {
			lines.push( '- (none — clean)' );
		} else {
			for ( const f of r.inlineViaRender ) {
				lines.push( `- \`${ f.file }:${ f.line }\` — \`${ f.property }\` (\`${ f.snippet }\`)` );
			}
		}
		lines.push( '' );
		lines.push( '**3. INLINE-via-wrapper**' );
		lines.push( `- calls SGS_Container_Wrapper::render(): ${ r.inlineViaWrapper.usesWrapper ? 'yes' : 'no' }` );
		if ( r.inlineViaWrapper.usesWrapper ) {
			lines.push( `- no_overlay opt-out detected: ${ r.inlineViaWrapper.noOverlayOptOut ? 'yes' : 'no' }` );
			lines.push( `- attrs nulled before delegation (incl. family expansion): ${ r.inlineViaWrapper.nulledAttrs.length ? r.inlineViaWrapper.nulledAttrs.join( ', ' ) : '(none)' }` );
		}
		lines.push( '' );
		lines.push( '**4. DROP-conditional-inert (grid/flex family, layout attr not defaulting to grid/flex)**' );
		lines.push( r.dropConditionalInert.length ? `- ${ r.dropConditionalInert.join( ', ' ) }` : '- (none)' );
		lines.push( '' );
		lines.push( '**5. DROP-unrouted (declared, never reaches a CSS sink)**' );
		lines.push( r.dropUnrouted.length ? `- ${ r.dropUnrouted.join( ', ' ) }` : '- (none)' );
		lines.push( '' );
		lines.push( `**tier-without-base:** ${ r.tierWithoutBase.length ? r.tierWithoutBase.join( ', ' ) : '(none)' }` );
		lines.push( '' );
		lines.push( `**dominant shared-helper:** ${ r.dominantHelper } (${ JSON.stringify( r.helperCounts ) })` );
		lines.push( '' );
		lines.push( '---' );
		lines.push( '' );
	}

	// Framework totals.
	lines.push( '## Framework totals' );
	lines.push( '' );
	const totalBlocks = results.length;
	const withInlineRender = results.filter( ( r ) => r.inlineViaRender.length > 0 ).length;
	const withWrapper = results.filter( ( r ) => r.inlineViaWrapper.usesWrapper ).length;
	const withConditionalInert = results.filter( ( r ) => r.dropConditionalInert.length > 0 ).length;
	const withUnrouted = results.filter( ( r ) => r.dropUnrouted.length > 0 ).length;
	const withTierWithoutBase = results.filter( ( r ) => r.tierWithoutBase.length > 0 );
	const totalInlineRenderSites = results.reduce( ( sum, r ) => sum + r.inlineViaRender.length, 0 );
	const totalUnroutedAttrs = results.reduce( ( sum, r ) => sum + r.dropUnrouted.length, 0 );
	const totalConditionalInertAttrs = results.reduce( ( sum, r ) => sum + r.dropConditionalInert.length, 0 );

	// Aggregate shared-helper vs block-private split across all routed attrs
	// + inline-render sites (the total "inline styling surface").
	let sharedHelperSites = 0;
	let blockPrivateSites = 0;
	for ( const r of results ) {
		blockPrivateSites += r.inlineViaRender.length;
		for ( const attrName of Object.keys( r.attrRouting ) ) {
			const routing = r.attrRouting[ attrName ];
			if ( ! routing || ! routing.routed ) continue;
			if ( routing.via === 'render.php (block-private)' || ( routing.via || '' ).startsWith( 'block-private helper' ) ) {
				blockPrivateSites++;
			} else {
				sharedHelperSites++;
			}
		}
	}
	const totalSurface = sharedHelperSites + blockPrivateSites;
	const sharedPct = totalSurface > 0 ? Math.round( ( sharedHelperSites / totalSurface ) * 1000 ) / 10 : 0;
	const privatePct = totalSurface > 0 ? Math.round( ( blockPrivateSites / totalSurface ) * 1000 ) / 10 : 0;

	lines.push( `- Total blocks scanned: ${ totalBlocks }` );
	lines.push( `- Blocks with INLINE-via-render sites: ${ withInlineRender } (${ totalInlineRenderSites } total sites)` );
	lines.push( `- Blocks routing through SGS_Container_Wrapper: ${ withWrapper }` );
	lines.push( `- Blocks with DROP-conditional-inert grid/flex attrs: ${ withConditionalInert } (${ totalConditionalInertAttrs } total attrs)` );
	lines.push( `- Blocks with DROP-unrouted attrs: ${ withUnrouted } (${ totalUnroutedAttrs } total attrs)` );
	lines.push( `- Blocks with tier-without-base defect: ${ withTierWithoutBase.length }` );
	if ( withTierWithoutBase.length ) {
		lines.push( '  - ' + withTierWithoutBase.map( ( r ) => `${ r.block } (${ r.tierWithoutBase.join( ', ' ) })` ).join( '; ' ) );
	}
	lines.push( `- Inline-styling surface routed via shared helpers: ${ sharedHelperSites } sites (${ sharedPct }%)` );
	lines.push( `- Inline-styling surface that is block-private: ${ blockPrivateSites } sites (${ privatePct }%)` );
	lines.push( '' );

	return lines.join( '\n' );
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	if ( ! fs.existsSync( REPORTS_DIR ) ) {
		fs.mkdirSync( REPORTS_DIR, { recursive: true } );
	}

	const wrapperOwnedAttrs = loadWrapperOwnedAttrs();

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) )
		.sort();

	const results = [];
	for ( const dir of blockDirs ) {
		const r = analyseBlock( dir, wrapperOwnedAttrs );
		if ( r ) results.push( r );
	}

	fs.writeFileSync( OUT_JSON, JSON.stringify( { generatedAt: new Date().toISOString(), totalBlocks: results.length, blocks: results }, null, '\t' ) + '\n', 'utf8' );

	const md = buildMarkdownReport( results );
	fs.writeFileSync( OUT_MD, md, 'utf8' );

	// Console summary.
	const totalInlineRenderSites = results.reduce( ( sum, r ) => sum + r.inlineViaRender.length, 0 );
	const withWrapper = results.filter( ( r ) => r.inlineViaWrapper.usesWrapper ).length;
	const totalUnroutedAttrs = results.reduce( ( sum, r ) => sum + r.dropUnrouted.length, 0 );
	const totalConditionalInertAttrs = results.reduce( ( sum, r ) => sum + r.dropConditionalInert.length, 0 );
	const tierWithoutBaseBlocks = results.filter( ( r ) => r.tierWithoutBase.length > 0 );

	process.stdout.write( `[audit-inline-styling] Scanned ${ results.length } blocks.\n` );
	process.stdout.write( `  INLINE-via-render sites: ${ totalInlineRenderSites }\n` );
	process.stdout.write( `  Blocks routing via SGS_Container_Wrapper: ${ withWrapper }\n` );
	process.stdout.write( `  DROP-conditional-inert attrs: ${ totalConditionalInertAttrs }\n` );
	process.stdout.write( `  DROP-unrouted attrs: ${ totalUnroutedAttrs }\n` );
	process.stdout.write( `  Blocks with tier-without-base defect: ${ tierWithoutBaseBlocks.length } (${ tierWithoutBaseBlocks.map( ( r ) => r.block ).join( ', ' ) })\n` );
	process.stdout.write( `  Report written: ${ path.relative( ROOT, OUT_JSON ) }\n` );
	process.stdout.write( `  Report written: ${ path.relative( ROOT, OUT_MD ) }\n` );

	// --- ZERO-TOLERANCE --check gate (Spec 32 no-inline contract) ---------------
	// A violation is a REAL CSS property declaration (not a --custom-property VALUE,
	// which is the sanctioned override channel per FR-32-4) emitted INLINE: either a
	// block render.php inline-render site, OR a real-property push into the shared
	// SGS_Container_Wrapper's inline $styles sink. Wired into `prebuild` so an inline
	// regression fails the build. Report files are still written above.
	if ( process.argv.includes( '--check' ) ) {
		const violations = [];
		for ( const r of results ) {
			for ( const f of r.inlineViaRender ) {
				violations.push( `${ r.block }  (${ f.file }:${ f.line })  ${ f.property }` );
			}
		}
		// Shared wrapper — its inline $styles sink (custom-property VALUES are skipped
		// by the scanner; only real-property pushes count). Scoped rules ($responsive_css
		// / $base_*_decls / $scoped_css) are not "style"-named sinks, so are not scanned.
		const wrapperSrc = readIfExists( path.join( INCLUDES_DIR, 'class-sgs-container-wrapper.php' ) );
		for ( const f of scanInlineRenderSites( wrapperSrc, captureLocalFunctions( stripComments( wrapperSrc ) ) ) ) {
			violations.push( `SGS_Container_Wrapper  (includes/class-sgs-container-wrapper.php:${ f.line })  ${ f.property }` );
		}

		if ( violations.length ) {
			process.stdout.write( `\n[audit-inline-styling --check] FAIL — ${ violations.length } inline styling violation(s):\n` );
			for ( const v of violations ) process.stdout.write( `  X  ${ v }\n` );
			process.stdout.write( '\nEvery SGS block + the shared wrapper must emit styling via scoped <style> rules\n' );
			process.stdout.write( 'or block attributes — never an inline CSS property declaration (Spec 32). CSS\n' );
			process.stdout.write( 'custom-property VALUES (--sgs-*) are permitted. Route the above to scoped CSS.\n' );
			process.exitCode = 1;
			return;
		}
		process.stdout.write( `\n[audit-inline-styling --check] PASS — 0 inline styling violations across ${ results.length } blocks + the shared wrapper.\n` );
	}
}

main();
