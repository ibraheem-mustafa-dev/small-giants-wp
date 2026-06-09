/**
 * check-hardcoded-render-defaults.js
 *
 * STRUCTURAL GUARD (Gate B) — stops the "hardcoded render default" class of
 * bug (F3) from regressing. An F3 violation occurs when a block declares an
 * attribute that is SUPPOSED to control a CSS property, but that same CSS
 * property is ALSO hardcoded with a literal value in the block's render.php
 * or style.css — silently overriding the attribute so the editor control
 * does nothing on the painted page.
 *
 * HOW IT WORKS
 * ------------
 *  For each block under src/blocks/<block>/:
 *    1. Parse block.json → collect attribute names.
 *    2. Map each attr name → the CSS property (or properties) it is expected
 *       to control, using the ATTR_TO_CSS_PROPS suffix map below.
 *    3. Scan style.css and render.php for CSS declarations that:
 *         a) set one of those mapped CSS properties,
 *         b) with a LITERAL value (not a CSS custom-property reference and not
 *            a PHP-interpolated value), and
 *         c) are NOT covered by an exemption (see EXEMPTIONS below).
 *    4. Report the violation: file, line, property, literal value, the attr
 *       that should own it.
 *
 * EXEMPTIONS (a declaration is NOT a violation when)
 * ---------------------------------------------------
 *  - Value uses a CSS custom property:  var(--...)
 *  - Declaration is inside :where(...)  (low-specificity default)
 *  - File is editor.css                 (editor-only, not painted)
 *  - Value is a CSS reset keyword:      inherit | initial | unset | revert | normal | none | auto
 *  - Value is 0 (universal reset)
 *  - PHP render.php: the value is dynamically emitted (contains $, esc_attr,
 *    <?php, or a PHP interpolation marker) — only LITERAL string constants
 *    qualify.
 *  - The CSS selector is scoped to a :where() or a reset / animation /
 *    keyframes context (handled by the context-aware scanner).
 *
 * BASELINE
 * --------
 *  Because existing blocks carry many current hardcodes (layout debt predates
 *  Gate B), the first run with --write-baseline seeds ALL current findings
 *  into scripts/hardcoded-render-defaults-baseline.json. Subsequent runs
 *  fail ONLY on NET-NEW violations that are not in the baseline. The baseline
 *  count is always printed so burn-down is visible.
 *
 *  To accept a new intentional hardcode: run with --write-baseline (dangerous)
 *  OR manually add the finding to the baseline with a reason — do NOT dump
 *  noise in to hide a real F3 violation. False-positive patterns should be
 *  fixed by broadening the EXEMPTION logic in this script instead.
 *
 * Usage
 * -----
 *   node scripts/check-hardcoded-render-defaults.js                  # report (exit 0 unless net-new)
 *   node scripts/check-hardcoded-render-defaults.js --check          # prebuild/CI gate (exit 1 on net-new)
 *   node scripts/check-hardcoded-render-defaults.js --write-baseline # seed / refresh the baseline
 *   node scripts/check-hardcoded-render-defaults.js --json           # machine-readable output
 *
 * Wired into prebuild / prestart in package.json.
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );

const ROOT      = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const BASELINE_FILE = path.join( __dirname, 'hardcoded-render-defaults-baseline.json' );

// ---------------------------------------------------------------------------
// ATTR → CSS PROPERTIES MAP
//
// Derived mechanically from camelCase attr-name suffixes: given an attr name
// like `flexWrap`, `gap`, `labelFontSize`, `contentWidth`, the suffix (or
// full name) maps to the CSS property (or properties) it is expected to own.
//
// One-line justification per entry. Ordered from most-specific to least so
// the first match wins (most-specific is checked first in attrToCssProps()).
//
// Convention: keys are suffix patterns (lowercase, no dashes).
// A suffix is matched against the lowercased attr name with endsWith().
// Full-name matches are listed as patterns that equal the full lowercase name.
// ---------------------------------------------------------------------------

const SUFFIX_MAP = [
	// Typography
	{ suffix: 'fontsize',       props: [ 'font-size' ],                note: 'controls the element font size' },
	{ suffix: 'lineheight',     props: [ 'line-height' ],              note: 'controls line height' },
	{ suffix: 'letterspacing',  props: [ 'letter-spacing' ],           note: 'controls letter spacing' },
	{ suffix: 'fontweight',     props: [ 'font-weight' ],              note: 'controls font weight' },
	{ suffix: 'texttransform',  props: [ 'text-transform' ],           note: 'controls text transform' },
	// Alignment
	{ suffix: 'textalign',      props: [ 'text-align' ],               note: 'controls text alignment' },
	{ suffix: 'alignment',      props: [ 'text-align', 'align-items' ],note: 'generic alignment attr' },
	{ suffix: 'verticalalign',  props: [ 'vertical-align', 'align-items' ], note: 'vertical alignment' },
	{ suffix: 'alignitems',     props: [ 'align-items' ],              note: 'flex/grid align-items' },
	{ suffix: 'aligncontent',   props: [ 'align-content' ],            note: 'flex/grid align-content' },
	{ suffix: 'justifycontent', props: [ 'justify-content' ],          note: 'flex/grid justify-content' },
	// Flex / layout
	{ suffix: 'flexwrap',       props: [ 'flex-wrap' ],                note: 'controls flex-wrap' },
	{ suffix: 'wrap',           props: [ 'flex-wrap' ],                note: 'shorthand wrap attr → flex-wrap' },
	{ suffix: 'flexdirection',  props: [ 'flex-direction' ],           note: 'controls flex-direction' },
	{ suffix: 'direction',      props: [ 'flex-direction' ],           note: 'shorthand direction attr → flex-direction' },
	// Grid
	{ suffix: 'gridtemplatecolumns', props: [ 'grid-template-columns' ], note: 'controls grid columns template' },
	{ suffix: 'columns',        props: [ 'grid-template-columns' ],    note: 'columns count → grid-template-columns' },
	// Spacing
	{ suffix: 'gap',            props: [ 'gap', 'column-gap', 'row-gap' ], note: 'controls gap / column-gap / row-gap' },
	{ suffix: 'padding',        props: [ 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ], note: 'controls padding' },
	{ suffix: 'paddingtop',     props: [ 'padding-top' ],              note: 'padding-top' },
	{ suffix: 'paddingright',   props: [ 'padding-right' ],            note: 'padding-right' },
	{ suffix: 'paddingbottom',  props: [ 'padding-bottom' ],           note: 'padding-bottom' },
	{ suffix: 'paddingleft',    props: [ 'padding-left' ],             note: 'padding-left' },
	{ suffix: 'margin',         props: [ 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left' ], note: 'controls margin' },
	{ suffix: 'margintop',      props: [ 'margin-top' ],               note: 'margin-top' },
	{ suffix: 'marginright',    props: [ 'margin-right' ],             note: 'margin-right' },
	{ suffix: 'marginbottom',   props: [ 'margin-bottom' ],            note: 'margin-bottom' },
	{ suffix: 'marginleft',     props: [ 'margin-left' ],              note: 'margin-left' },
	// Sizing
	{ suffix: 'maxwidth',       props: [ 'max-width' ],                note: 'controls max-width' },
	{ suffix: 'minwidth',       props: [ 'min-width' ],                note: 'controls min-width' },
	{ suffix: 'maxheight',      props: [ 'max-height' ],               note: 'controls max-height' },
	{ suffix: 'minheight',      props: [ 'min-height' ],               note: 'controls min-height' },
	{ suffix: 'width',          props: [ 'width', 'max-width' ],       note: 'controls width / max-width' },
	{ suffix: 'height',         props: [ 'height' ],                   note: 'controls height' },
	{ suffix: 'size',           props: [ 'font-size', 'width', 'height' ], note: 'generic size attr (star/icon/badge size → font-size or width+height)' },
	// Colour
	{ suffix: 'colour',         props: [ 'color', 'background-color', 'fill', 'stroke', 'border-color' ], note: 'SGS-style *Colour attr → colour properties' },
	{ suffix: 'color',          props: [ 'color', 'background-color', 'fill', 'stroke', 'border-color' ], note: 'US-spelling *Color attr → colour properties' },
	{ suffix: 'backgroundcolour', props: [ 'background-color', 'background' ], note: 'background colour attr' },
	{ suffix: 'backgroundcolor',  props: [ 'background-color', 'background' ], note: 'background colour attr (US)' },
	// Border
	{ suffix: 'borderwidth',    props: [ 'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width' ], note: 'border width' },
	{ suffix: 'bordercolour',   props: [ 'border-color' ],             note: 'border colour' },
	{ suffix: 'bordercolor',    props: [ 'border-color' ],             note: 'border colour (US)' },
	{ suffix: 'borderradius',   props: [ 'border-radius' ],            note: 'border radius' },
	// Opacity / z-index
	{ suffix: 'opacity',        props: [ 'opacity' ],                  note: 'controls opacity' },
	{ suffix: 'zindex',         props: [ 'z-index' ],                  note: 'controls z-index' },
];

// ---------------------------------------------------------------------------
// CSS VALUE EXEMPTION PATTERNS
//
// A declaration value is EXEMPT (not a violation) when it matches any of
// these. The check applies AFTER stripping whitespace.
// ---------------------------------------------------------------------------

/**
 * CSS reset / non-layout keywords that are never "attr-owned" constants, plus
 * `currentColor` (always derives from the parent colour cascade — not a fixed
 * override) and `transparent` (a structural reset on hover/focus states, not
 * a hardcoded colour override).
 */
const EXEMPT_VALUE_RE =
	/^(inherit|initial|unset|revert|revert-layer|normal|none|auto|currentcolor|transparent|0|0px|0%|0rem|0em)$/i;

/**
 * CSS custom property reference — the sanctioned overridable-default pattern.
 * Allow optional whitespace after the opening paren: `var( --sgs-x, 1 )` is
 * common in WP / SGS codebases (phpcs forces the space).
 */
const CSS_VAR_RE = /var\s*\(\s*--/;

/**
 * Value contains a PHP dynamic expression. An inline style in render.php
 * is exempt if the ENTIRE value string contains a PHP interpolation —
 * meaning the PHP script writes it, not a static constant.
 * Also matches sprintf placeholders (`%s`, `%d`, `%f`) which appear in
 * string-template arguments that are later filled with PHP values.
 */
const PHP_DYNAMIC_RE = /\$[a-zA-Z_]|\besc_attr\b|\besc_html\b|<\?php|%[sdfe]/;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

/**
 * Given a camelCase attribute name, return the set of CSS properties it is
 * expected to control. Returns an empty Set when the attr name does not match
 * any suffix in SUFFIX_MAP (e.g. purely semantic attrs like `content`, `label`).
 *
 * Strategy: normalise attr to lowercase, then walk SUFFIX_MAP from most-specific
 * to least-specific (array order). First match wins.
 */
function attrToCssProps( attrName ) {
	const lower = attrName.toLowerCase();
	for ( const entry of SUFFIX_MAP ) {
		if ( lower.endsWith( entry.suffix ) ) {
			return new Set( entry.props );
		}
	}
	return new Set();
}

/**
 * Strip CSS and PHP comments from source so a property surviving only in a
 * comment is NOT flagged. Also strips @media / selector context noise for the
 * purpose of finding literal values (the per-line scanner handles context).
 */
function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ) // /* ... */
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ) // // ... (not http://)
		.replace( /^\s*#[^\n]*/gm, ' ' ); // # PHP comment
}

// ---------------------------------------------------------------------------
// CSS SCANNER
//
// Scans a CSS (or PHP containing heredoc/echo CSS) source file for
// declarations of the form:   property: literal-value;
//
// Returns findings: { file, line, property, value, context }.
// ---------------------------------------------------------------------------

/**
 * Is `value` a literal constant that could override an attr-driven value?
 * Returns false (safe / exempt) when:
 *   - uses var(--...)
 *   - is a reset keyword or 0
 *   - is a PHP dynamic expression
 *   - is a CSS percentage used as a structural ratio (100% on w/h is structural)
 */
function isLiteralConstant( value, property ) {
	const v = value.trim();
	if ( ! v ) {
		return false;
	}
	if ( CSS_VAR_RE.test( v ) ) {
		return false; // uses custom property → sanctioned overridable default
	}
	if ( EXEMPT_VALUE_RE.test( v ) ) {
		return false; // reset keyword or 0
	}
	if ( PHP_DYNAMIC_RE.test( v ) ) {
		return false; // PHP-generated value
	}
	// 100% on width/height is a structural reset ("fill available space"), not a
	// layout constant that overrides an attr. Exempt it.
	if ( /^100%$/.test( v ) && /^(width|height|max-width)$/.test( property ) ) {
		return false;
	}
	// `1em` / `1.5em` etc. on width/height for inline SVG/icon elements scales
	// with the font size — it's a RELATIVE structural value, not a fixed
	// constant competing with an iconSize attr (which emits absolute px via
	// render.php). Exempt it.
	if ( /^\d*\.?\d+em$/.test( v ) && /^(width|height)$/.test( property ) ) {
		return false;
	}
	// `1px` on width/height/border is the standard accessibility visually-hidden
	// pattern (e.g. honeypot fields, screen-reader-only elements). It is never a
	// layout constant competing with an attr-driven dimension.
	if ( /^1px$/.test( v ) && /^(width|height|border(-width)?)$/.test( property ) ) {
		return false;
	}
	return true;
}

/**
 * Scan `src` for CSS declarations matching any property in `targetProps`.
 * Skips declarations inside :where(...) blocks (low-specificity default OK).
 * Skips declarations inside @keyframes blocks (animation keyframes, not layout).
 * Skips the file entirely when it is editor.css.
 *
 * Returns array of { line (1-based), property, value, inWhereBlock }.
 */
function scanCssDeclarations( src, targetProps ) {
	const findings = [];
	const lines    = src.split( '\n' );

	let depthTotal  = 0; // { } brace depth
	let whereDepth  = 0; // depth at entry of a :where( block
	let inWhere     = false;
	let keyframeDepth = 0;
	let inKeyframes = false;

	for ( let i = 0; i < lines.length; i++ ) {
		const line    = lines[ i ];
		const lineNum = i + 1;

		// Track brace depth to detect :where / @keyframes exit.
		const opens  = ( line.match( /\{/g ) || [] ).length;
		const closes = ( line.match( /\}/g ) || [] ).length;

		// Detect :where( entry before incrementing.
		if ( /:[a-z-]*where\s*\(/i.test( line ) ) {
			inWhere     = true;
			whereDepth  = depthTotal + opens; // depth AFTER the opening brace on this line
		}

		// Detect @keyframes entry.
		if ( /^\s*@keyframes/i.test( line ) ) {
			inKeyframes   = true;
			keyframeDepth = depthTotal + opens;
		}

		depthTotal += opens - closes;

		// Exit :where / @keyframes when depth drops back to entry level.
		if ( inWhere && depthTotal < whereDepth ) {
			inWhere = false;
		}
		if ( inKeyframes && depthTotal < keyframeDepth ) {
			inKeyframes = false;
		}

		if ( inWhere || inKeyframes ) {
			continue; // exempt context
		}

		// Match CSS declaration: property: value;
		// Allow multi-value declarations (e.g. `flex-direction: column row;`).
		const declRe = /^\s*([\w-]+)\s*:\s*([^;{}]+);?/;
		const m      = declRe.exec( line );
		if ( ! m ) {
			continue;
		}
		const property = m[ 1 ].toLowerCase().trim();
		const rawValue = m[ 2 ].trim();

		if ( ! targetProps.has( property ) ) {
			continue;
		}
		if ( ! isLiteralConstant( rawValue, property ) ) {
			continue;
		}

		findings.push( { line: lineNum, property, value: rawValue } );
	}

	return findings;
}

// ---------------------------------------------------------------------------
// PHP RENDER.PHP SCANNER
//
// Looks for echo'd inline style attributes that contain hardcoded literal
// values for a target property.  Only flags genuinely static string constants;
// PHP-dynamic values (containing $, esc_attr, <?php) are exempt.
//
// Pattern targeted:
//   echo 'style="flex-direction: column"';
//   echo "<div style=\"gap: 10px\">";
//   style="gap: 10px"    (literal string fragment not wrapped in PHP)
// ---------------------------------------------------------------------------

function scanPhpInlineStyles( src, targetProps ) {
	const findings = [];

	// Strip PHP single-line comments (// ...) and block comments (/* ... */)
	// BEFORE splitting into lines, so a comment containing `style="..."` is
	// never mistaken for a real static inline style (hero render.php line 358
	// comment incident).
	const stripped = src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ) // /* ... */
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ); // // ... (not http://)

	const lines = stripped.split( '\n' );

	// Match style="..." or style='...' literals in echo'd strings.
	// We look for the whole value of the style attr in a string context.
	const styleAttrRe = /style\s*=\s*["']([^"']*?)["']/gi;

	for ( let i = 0; i < lines.length; i++ ) {
		const line    = lines[ i ];
		const lineNum = i + 1;

		// If the line contains PHP dynamics, the style value is not a constant —
		// skip it. This is a line-level check; per-property scanning is below.
		if ( PHP_DYNAMIC_RE.test( line ) ) {
			continue;
		}

		let m;
		styleAttrRe.lastIndex = 0;
		while ( ( m = styleAttrRe.exec( line ) ) !== null ) {
			const styleValue = m[ 1 ];
			// Parse individual declarations from the style value.
			const declRe = /([\w-]+)\s*:\s*([^;]+)/g;
			let d;
			while ( ( d = declRe.exec( styleValue ) ) !== null ) {
				const property = d[ 1 ].toLowerCase().trim();
				const rawValue = d[ 2 ].trim();
				if ( ! targetProps.has( property ) ) {
					continue;
				}
				if ( ! isLiteralConstant( rawValue, property ) ) {
					continue;
				}
				findings.push( { line: lineNum, property, value: rawValue } );
			}
		}
	}

	return findings;
}

// ---------------------------------------------------------------------------
// PER-BLOCK SCAN
// ---------------------------------------------------------------------------

/**
 * Scan one block directory. Returns an array of violation objects:
 *   { block, file, line, property, value, attr }
 */
function checkBlock( blockDir ) {
	const blockJsonPath = path.join( blockDir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) {
		return [];
	}

	let meta;
	try {
		meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		// Invalid block.json — skip without crashing the gate.
		process.stderr.write(
			`[check-hardcoded-render-defaults] WARNING: invalid block.json in ${ blockDir } (${ e.message }) — skipped.\n`
		);
		return [];
	}

	const blockName = meta.name || path.basename( blockDir );
	const attrs     = Object.keys( meta.attributes || {} );

	// Build a map: CSS property → Set of attr names that own it.
	// Used in violation reporting to name which attr should own the property.
	/** @type {Map<string, Set<string>>} */
	const cssToAttrs = new Map();
	for ( const attr of attrs ) {
		for ( const prop of attrToCssProps( attr ) ) {
			if ( ! cssToAttrs.has( prop ) ) {
				cssToAttrs.set( prop, new Set() );
			}
			cssToAttrs.get( prop ).add( attr );
		}
	}

	if ( cssToAttrs.size === 0 ) {
		return []; // no layout-related attrs → nothing to check
	}

	const targetProps = new Set( cssToAttrs.keys() );
	const violations  = [];

	// --- style.css ---------------------------------------------------------
	const styleCssPath = path.join( blockDir, 'style.css' );
	if ( fs.existsSync( styleCssPath ) ) {
		const cssFindings = scanCssDeclarations(
			readIfExists( styleCssPath ),
			targetProps
		);
		for ( const f of cssFindings ) {
			const owningAttrs = [ ...( cssToAttrs.get( f.property ) || [] ) ].join( ', ' );
			violations.push( {
				block:    blockName,
				file:     path.relative( ROOT, styleCssPath ),
				line:     f.line,
				property: f.property,
				value:    f.value,
				attr:     owningAttrs,
			} );
		}
	}

	// --- render.php — inline style attributes ------------------------------
	const renderPhpPath = path.join( blockDir, 'render.php' );
	if ( fs.existsSync( renderPhpPath ) ) {
		const phpFindings = scanPhpInlineStyles(
			readIfExists( renderPhpPath ),
			targetProps
		);
		for ( const f of phpFindings ) {
			const owningAttrs = [ ...( cssToAttrs.get( f.property ) || [] ) ].join( ', ' );
			violations.push( {
				block:    blockName,
				file:     path.relative( ROOT, renderPhpPath ),
				line:     f.line,
				property: f.property,
				value:    f.value,
				attr:     owningAttrs,
			} );
		}
	}

	return violations;
}

// ---------------------------------------------------------------------------
// BASELINE
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return { _comment: '', accepted: [] };
	}
	try {
		const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
		return data;
	} catch ( e ) {
		throw new Error( `Invalid hardcoded-render-defaults-baseline.json: ${ e.message }` );
	}
}

function findingKey( f ) {
	// Stable key for baseline deduplication. Does NOT include line number
	// because a minor refactor (adding a comment line) must not invalidate
	// an accepted baseline entry.
	return `${ f.block }:${ f.file }:${ f.property }:${ f.value }`;
}

function writeBaseline( allFindings ) {
	const accepted = allFindings.map( ( f ) => ( {
		block:    f.block,
		file:     f.file,
		property: f.property,
		value:    f.value,
		attr:     f.attr,
		reason:   'baseline — pre-existing F3 debt (fix tracked separately)',
	} ) );
	// Deduplicate by key.
	const seen = new Set();
	const deduped = accepted.filter( ( f ) => {
		const k = findingKey( f );
		if ( seen.has( k ) ) {
			return false;
		}
		seen.add( k );
		return true;
	} );
	const data = {
		_comment:
			'Accepted hardcoded-render-default findings (Gate B). Each entry is a pre-existing ' +
			'F3 violation accepted as layout debt. To FIX: replace the literal with var(--sgs-x, <default>) ' +
			'OR read the attr in render.php and emit it dynamically, then delete the baseline entry. ' +
			'To accept a NEW intentional hardcode: add an entry manually with a reason — do NOT re-run ' +
			'--write-baseline (it overwrites ALL accepted reasons).',
		baselineSeededAt: new Date().toISOString(),
		accepted: deduped,
	};
	fs.writeFileSync( BASELINE_FILE, JSON.stringify( data, null, '\t' ) + '\n', 'utf8' );
	return deduped.length;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	const args            = process.argv.slice( 2 );
	const check           = args.includes( '--check' );
	const asJson          = args.includes( '--json' );
	const doWriteBaseline = args.includes( '--write-baseline' );

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );

	// Collect all findings across all blocks.
	let allFindings = [];
	for ( const dir of blockDirs ) {
		allFindings = allFindings.concat( checkBlock( dir ) );
	}

	// Deduplicate (same property+value in a single block+file can appear on
	// multiple lines — keep all lines for reporting but deduplicate for the
	// baseline key comparison).
	const baseline     = loadBaseline();
	const baselineKeys = new Set( ( baseline.accepted || [] ).map( findingKey ) );
	const netNew       = allFindings.filter( ( f ) => ! baselineKeys.has( findingKey( f ) ) );
	const accepted     = allFindings.filter( ( f ) => baselineKeys.has( findingKey( f ) ) );

	// --write-baseline: seed / refresh the baseline with ALL current findings.
	if ( doWriteBaseline ) {
		const count = writeBaseline( allFindings );
		process.stdout.write(
			`[check-hardcoded-render-defaults] Baseline written: ${ count } finding(s) accepted across ` +
			`${ blockDirs.length } blocks → ${ BASELINE_FILE }\n`
		);
		return;
	}

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify(
				{ netNew, accepted, baselineSize: baselineKeys.size, totalBlocks: blockDirs.length },
				null,
				2
			) + '\n'
		);
		return;
	}

	// Human-readable report.
	const baselineCount = baselineKeys.size;

	// Group accepted by block for the burn-down summary.
	/** @type {Map<string, number>} */
	const acceptedByBlock = new Map();
	for ( const f of accepted ) {
		acceptedByBlock.set( f.block, ( acceptedByBlock.get( f.block ) || 0 ) + 1 );
	}

	if ( baselineCount > 0 ) {
		process.stdout.write(
			`[check-hardcoded-render-defaults] Baseline: ${ baselineCount } accepted finding(s) (F3 debt).\n`
		);
		// Top blocks by debt — burn-down visibility.
		const top = [ ...acceptedByBlock.entries() ]
			.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
			.slice( 0, 10 );
		if ( top.length ) {
			process.stdout.write( '  Debt by block (top 10):\n' );
			for ( const [ block, count ] of top ) {
				process.stdout.write( `    ${ block }: ${ count }\n` );
			}
		}
	}

	if ( netNew.length ) {
		process.stderr.write(
			`[check-hardcoded-render-defaults] ${ netNew.length } NET-NEW F3 violation(s):\n`
		);
		for ( const f of netNew ) {
			process.stderr.write(
				`  - ${ f.block } | ${ f.file }:${ f.line } | ${ f.property }: ${ f.value } ` +
				`(attr "${ f.attr }" should own this)\n`
			);
		}
		process.stderr.write(
			'\nFix options:\n' +
			'  1. Replace the literal with var(--sgs-x, <default>) in the CSS — the sanctioned overridable-default pattern.\n' +
			'  2. Read the attr in render.php and emit it as an inline style (dynamic, not a constant).\n' +
			'  3. Scope the declaration inside :where(...) so attr-driven styles override it via specificity.\n' +
			'Do NOT dump findings into the baseline — that hides the bug. Fix the exemption logic in\n' +
			'this script if the finding is a genuine false positive.\n'
		);
	} else {
		process.stdout.write(
			`[check-hardcoded-render-defaults] OK — 0 net-new F3 violations across ${ blockDirs.length } blocks ` +
			`(${ baselineCount } known debt item(s) in baseline).\n`
		);
	}

	if ( check && netNew.length ) {
		process.exit( 1 );
	}
}

main();
