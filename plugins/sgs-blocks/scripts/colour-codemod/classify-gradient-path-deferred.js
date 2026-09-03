'use strict';

/**
 * classify-gradient-path-deferred.js — Task T6 classifier.
 *
 * Splits every `gradient-path-deferred` refusal that fix.js's dry run
 * (`node fix.js --fix`, no --apply) currently reports into the repair each
 * row actually needs:
 *
 *   Cluster A — DIRECT PAINT. render.php (or a shared PHP emitter it calls,
 *   e.g. sgs_button_element_style_css()) concatenates the resolved colour
 *   straight into a CSS declaration (e.g. `'color:' . sgs_colour_value($v)`
 *   or `'{color:' . sgs_colour_value($v) . '}'`). These are near drop-in
 *   for the shipped sgs_resolve_text_colour_or_gradient() /
 *   sgs_text_colour_decl() / sgs_text_colour_gradient_fallback_rule()
 *   helper triad — already in production on 32 blocks.
 *
 *   Cluster B — CUSTOM-PROPERTY INDIRECTION. The resolved colour is
 *   assigned to a CSS custom property (either inline in render.php, or in
 *   a shared PHP emitter such as Post_Grid_REST::card_vars_decls()), and a
 *   stylesheet rule elsewhere consumes that property later via var(). A
 *   text gradient needs three declarations (background-image /
 *   background-clip:text / color:transparent) and cannot be posted through
 *   a single custom property used as the value of `color:`, so these rows
 *   need a structurally different repair from Cluster A.
 *
 *   NEEDS-HUMAN — the classifier could not find BOTH halves of either
 *   pattern with direct textual evidence. Never guessed a verdict.
 *
 * Detection strategies, tried in order per row (first hit wins):
 *   0. Shared button-element helper — sgs_button_element_style_css() call
 *      in render.php whose prefix + a known suffix equals the attribute
 *      name. That helper's own source (includes/helpers-button-style.php)
 *      is read and quoted as evidence — it does a direct `color:` paint for
 *      the *ColourText/*ColourTextHover suffixes.
 *   1. Shared custom-property MAP — an array literal (in render.php or a
 *      file it require_once's) shaped either `'attrName' => '--css-var'`
 *      (post-grid/tabs shape) or `'--css-var' => ...$attributes['attrName']`
 *      (nav-menu shape). Verdict B once a var(--css-var) consumer is found.
 *   2. Direct variable trace — `$var = $attributes['attrName']`, followed
 *      one hop through any `$derived = <expr using $var>` assignment
 *      (covers the mega-panel iconColour shape: slug var -> resolved-value
 *      var -> custom prop), then classified as A or B by scanning every
 *      line referencing $var/$derived for a CSS paint-property token or a
 *      `--` custom-property token.
 *
 * READ-ONLY over render.php / style.css / block.json / includes/*.php and
 * the DB (opened read-only). Never edits, deploys, or touches git.
 *
 * Usage:
 *   node classify-gradient-path-deferred.js                  # human table
 *   node classify-gradient-path-deferred.js --json out.json   # machine list
 *   node classify-gradient-path-deferred.js --disable-a-detection  # anti-vacuity control
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
const INCLUDES_DIR = path.join( PLUGIN_ROOT, 'includes' );
const DB_PATH = 'C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db';

const argv = process.argv.slice( 2 );
const DISABLE_A = argv.includes( '--disable-a-detection' );
const jsonFlagIdx = argv.indexOf( '--json' );
const JSON_OUT = jsonFlagIdx !== -1 ? argv[ jsonFlagIdx + 1 ] : null;

const PAINT_PROP_RE = /\b(color|background-color|background-image|background|border-color|fill|stroke)\s*:/i;
// Fourth direct-paint shape found live (sgs/testimonial): a shared inline
// closure builds a CSS rule from a `prop => value` array, e.g.
// `$sgs_el_rule('.sel', array('color' => $rating_colour))`, and the closure
// itself later does `$prop . ':' . $val` (verified per-block before this
// branch is trusted). The array KEY is the literal property name here, not
// text immediately preceding the variable, so it needs its own pattern.
const PAINT_PROP_ARRAY_KEY_RE = /['"](color|background-color|background-image|background|border-color|fill|stroke)['"]\s*=>/i;
// A genuine CSS custom property always starts at a token boundary — NOT
// preceded by a word character or another hyphen. Without the negative
// lookbehind this also matches a BEM double-hyphen MODIFIER inside a class
// name, e.g. `sgs-product-card__tag--trial` (real incident:
// product-card.tagTextColour false-matched `--trial` as a custom property
// before this guard was added).
const CUSTOM_PROP_TOKEN_RE = /(?<![\w-])--[a-z][a-z0-9-]*/i;

const BUTTON_HELPER_SUFFIXES = {
	ColourText: 'color',
	ColourTextHover: 'color (hover)',
};

// ---------------------------------------------------------------------------
// Step 1 — get the live refusal list straight from fix.js --fix (dry run,
// no --apply). This is the SAME command a human would run; never hand-typed.
// ---------------------------------------------------------------------------
function getRefusalLines() {
	const out = execFileSync( process.execPath, [ path.join( __dirname, 'fix.js' ), '--fix' ], {
		cwd: __dirname,
		encoding: 'utf8',
		maxBuffer: 1024 * 1024 * 16,
	} );
	return out.split( /\r?\n/ );
}

function parseGradientPathDeferredRows( lines ) {
	const rows = [];
	const re = /^\s*(sgs\/[a-z0-9-]+)\.([A-Za-z0-9]+)\s+—\s+REFUSED:gradient-path-deferred \(([^)]*)\)/;
	for ( const line of lines ) {
		const m = line.match( re );
		if ( ! m ) continue;
		const [ , slug, attr, detail ] = m;
		const isText = /text-mechanism gradient is background-clip:text/.test( detail );
		const mechMatch = detail.match( /mechanism=(\w+)/ );
		rows.push( {
			block: slug,
			attr,
			mechanism: isText ? 'text' : mechMatch ? mechMatch[ 1 ] : 'unknown',
			refusalDetail: detail,
		} );
	}
	return rows;
}

// ---------------------------------------------------------------------------
// Step 2 — DB lookup (read-only connection, per project rule: never import
// converter/db/db_lookup.py — it runs schema migrations as an import side
// effect).
// ---------------------------------------------------------------------------
function dbLookup( rows ) {
	const slugs = [ ...new Set( rows.map( ( r ) => r.block ) ) ];
	const py = `
import sqlite3, json, sys
db = sqlite3.connect("file:${ DB_PATH.replace( /\\/g, '/' ) }?mode=ro", uri=True)
db.row_factory = sqlite3.Row
slugs = json.loads(sys.argv[1])
qmarks = ",".join("?" for _ in slugs)
rows = db.execute(f"SELECT block_slug, attr_name, css_property, css_element, css_state FROM block_attributes WHERE block_slug IN ({qmarks})", slugs).fetchall()
print(json.dumps([dict(r) for r in rows]))
`;
	const tmp = path.join( require( 'os' ).tmpdir(), 'gpd-db-lookup.py' );
	fs.writeFileSync( tmp, py, 'utf8' );
	const out = execFileSync( 'python', [ tmp, JSON.stringify( slugs ) ], { encoding: 'utf8' } );
	const dbRows = JSON.parse( out );
	const byKey = {};
	for ( const r of dbRows ) byKey[ r.block_slug + '.' + r.attr_name ] = r;
	return byKey;
}

function lineOf( text, idx ) {
	return text.slice( 0, idx ).split( /\r?\n/ ).length;
}

function linesContaining( text, needle ) {
	const lines = text.split( /\r?\n/ );
	const out = [];
	lines.forEach( ( l, i ) => {
		if ( l.includes( needle ) ) out.push( { n: i + 1, text: l.trim() } );
	} );
	return out;
}

function readFileSafe( p ) {
	try {
		return fs.readFileSync( p, 'utf8' );
	} catch ( e ) {
		return null;
	}
}

// require_once targets referenced from render.php, resolved to absolute
// paths where the file actually exists on disk. Best-effort textual scan —
// only follows literal string paths, never a computed require.
function findRequiredFiles( phpText, renderPhpPath ) {
	const dir = path.dirname( renderPhpPath );
	const out = new Set();
	const re = /require(?:_once)?\s+([^;]+);/g;
	let m;
	while ( ( m = re.exec( phpText ) ) !== null ) {
		const expr = m[ 1 ];
		// dirname( __FILE__, N ) . '/relative/path.php'  or  __DIR__ . '/x.php'
		const relMatch = expr.match( /['"]([^'"]+\.php)['"]/ );
		if ( ! relMatch ) continue;
		const rel = relMatch[ 1 ];
		// PHP's dirname($file, $levels) applies dirname() $levels times
		// starting from the FULL file path (the first application already
		// strips the filename) — so start from renderPhpPath itself, not
		// from `dir` (which is already one dirname() call deep), or every
		// require_once resolves one directory too high.
		const dirnameFileMatch = expr.match( /dirname\(\s*__FILE__\s*,\s*(\d+)\s*\)/ );
		const dirnameDirMatch = expr.match( /dirname\(\s*__DIR__\s*,\s*(\d+)\s*\)/ );
		let base = dir;
		if ( dirnameFileMatch ) {
			let up = parseInt( dirnameFileMatch[ 1 ], 10 );
			base = renderPhpPath;
			while ( up-- > 0 ) base = path.dirname( base );
		} else if ( dirnameDirMatch ) {
			// __DIR__ === dirname(__FILE__) === `dir` already; dirname(__DIR__, N)
			// applies N MORE dirname() calls on top of that.
			let up = parseInt( dirnameDirMatch[ 1 ], 10 );
			base = dir;
			while ( up-- > 0 ) base = path.dirname( base );
		} else if ( /__DIR__/.test( expr ) ) {
			base = dir;
		}
		const resolved = path.resolve( base, rel.replace( /^\//, '' ) );
		if ( fs.existsSync( resolved ) ) out.add( resolved );
	}
	return [ ...out ];
}

// ---------------------------------------------------------------------------
// Strategy 0 — shared button-element helper.
// ---------------------------------------------------------------------------
function tryButtonHelperStrategy( row, phpText, helperSrc ) {
	if ( DISABLE_A ) return null;
	const callRe = /sgs_button_element_style_css\(\s*\$attributes\s*,\s*['"]([A-Za-z0-9]+)['"]/g;
	let m;
	const calls = [];
	while ( ( m = callRe.exec( phpText ) ) !== null ) {
		calls.push( { prefix: m[ 1 ], line: lineOf( phpText, m.index ) } );
	}
	for ( const call of calls ) {
		if ( ! row.attr.startsWith( call.prefix ) ) continue;
		const suffix = row.attr.slice( call.prefix.length );
		if ( ! ( suffix in BUTTON_HELPER_SUFFIXES ) ) continue;
		const helperLine = suffix === 'ColourTextHover'
			? "includes/helpers-button-style.php:200: `\$hover_decls[] = 'color:' . sgs_colour_value( \$colour_text_hover ) . ';';`"
			: "includes/helpers-button-style.php:144: `\$base_decls[] = 'color:' . sgs_colour_value( \$colour_text ) . ';';`";
		return {
			verdict: 'A',
			evidence:
				'render.php:' + call.line + ' calls sgs_button_element_style_css($attributes, \'' + call.prefix +
				"', …), which reads `" + row.attr + "` via \$read('" + suffix + "') and paints it directly — " + helperLine,
			phpVar: '(shared helper: sgs_button_element_style_css, prefix "' + call.prefix + '")',
			assignLine: call.line,
			paintLine: null,
			customProp: null,
			selector: null,
			mechanismNote: helperLine,
		};
	}
	return null;
}

// ---------------------------------------------------------------------------
// Strategy 1 — shared custom-property MAP array (post-grid / tabs / nav-menu
// shapes), searched in render.php and any require_once'd file.
// ---------------------------------------------------------------------------
function tryCustomPropMapStrategy( row, files ) {
	for ( const { path: fp, text } of files ) {
		// Shape A: 'attrName' => '--css-var'
		const shapeARe = new RegExp( "['\"]" + row.attr + "['\"]\\s*=>\\s*['\"](--[a-z0-9-]+)['\"]", 'i' );
		let m = text.match( shapeARe );
		if ( m ) {
			const customProp = m[ 1 ];
			const assignLine = lineOf( text, m.index );
			return { customProp, assignLine, sourceFile: fp, shape: 'A (attrName => --css-var map)' };
		}
		// Shape B: '--css-var' => ... $attributes['attrName'] ...
		const shapeBRe = new RegExp(
			"['\"](--[a-z0-9-]+)['\"]\\s*=>[^,\\n]*\\$attributes\\s*\\[\\s*['\"]" + row.attr + "['\"]\\s*\\]",
			'i'
		);
		m = text.match( shapeBRe );
		if ( m ) {
			const customProp = m[ 1 ];
			const assignLine = lineOf( text, m.index );
			return { customProp, assignLine, sourceFile: fp, shape: "B (--css-var => ...\\$attributes['attrName'])" };
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Strategy 2 — direct variable trace with one-hop derived-variable follow.
// ---------------------------------------------------------------------------
function findPhpVar( phpText, attrName ) {
	// Allows an optional `['key']` array-index on the LHS too (the
	// process-steps.textColour shape: `$style_color_args['text'] = (string)
	// $attributes['textColour'];` — the accumulator var still matters for
	// tracing even though the assignment targets one of its keys).
	const re = new RegExp(
		'\\$([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*\\[[^\\]]*\\])?\\s*=[^;\\n]*\\$attributes\\s*\\[\\s*[\'"]' + attrName + '[\'"]\\s*\\]',
		'm'
	);
	const m = phpText.match( re );
	if ( m ) return { ok: true, varName: m[ 1 ], line: lineOf( phpText, m.index ) };
	return { ok: false };
}

function findDerivedVars( phpText, varName ) {
	// Same array-KEYED-index LHS allowance as findPhpVar — covers
	// `$slider_color_args['text'] = $slider_text_value;`. Deliberately
	// EXCLUDES a bare `$var[] = …` push (empty brackets): that shape is a
	// generic multi-purpose ACCUMULATOR array (e.g. `$scoped_css[] = …`,
	// pushed to from dozens of unrelated call sites across the file), not a
	// single-value derivation — following it produced a real false positive
	// (sgs/brand-strip.nameColour traced through $scoped_css into an
	// unrelated `--sgs-name-text-align` custom-prop line belonging to a
	// completely different attribute) before this exclusion was added.
	const re = new RegExp(
		'\\$([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*\\[[^\\]]+\\])?\\s*=[^;\\n]*\\$' + varName + '\\b[^;\\n]*;',
		'g'
	);
	const derived = [];
	let m;
	while ( ( m = re.exec( phpText ) ) !== null ) {
		if ( m[ 1 ] !== varName ) derived.push( { name: m[ 1 ], line: lineOf( phpText, m.index ) } );
	}
	return derived;
}

function tryDirectVarStrategy( row, phpText, cssText ) {
	const varInfo = findPhpVar( phpText, row.attr );
	if ( ! varInfo.ok ) return null;

	// Trace TWO hops of `$derived = <expr using $var>` (mega-panel.iconColour
	// needs one hop: slug -> resolved value -> custom prop; testimonial-
	// slider.textColour needs two: resolved value -> color-args entry ->
	// style-engine-args entry). Never follows through a function boundary.
	const varNames = [ varInfo.varName ];
	for ( const d of findDerivedVars( phpText, varInfo.varName ) ) {
		if ( ! varNames.includes( d.name ) ) varNames.push( d.name );
	}
	for ( const vn of [ ...varNames ] ) {
		for ( const d of findDerivedVars( phpText, vn ) ) {
			if ( ! varNames.includes( d.name ) ) varNames.push( d.name );
		}
	}

	let customPropLine = null;
	let customPropName = null;
	let customPropVar = null;
	for ( const vn of varNames ) {
		for ( const l of linesContaining( phpText, '$' + vn ) ) {
			const cm = l.text.match( CUSTOM_PROP_TOKEN_RE );
			if ( cm && new RegExp( '\\$' + vn + '\\b' ).test( l.text ) ) {
				customPropLine = l;
				customPropName = cm[ 0 ];
				customPropVar = vn;
				break;
			}
		}
		if ( customPropLine ) break;
	}

	let paintLine = null;
	let paintVar = null;
	if ( ! DISABLE_A ) {
		for ( const vn of varNames ) {
			for ( const l of linesContaining( phpText, '$' + vn ) ) {
				if ( CUSTOM_PROP_TOKEN_RE.test( l.text ) ) continue; // that's Cluster B on this line
				if ( PAINT_PROP_RE.test( l.text ) ) {
					paintLine = l;
					paintVar = vn;
					break;
				}
				// `array( 'color' => $var, … )` fed into a shared prop=>value CSS
				// builder (sgs/testimonial's $sgs_el_rule shape). Only trusted when
				// the same file also contains a concrete `$prop . ':' . $val`-style
				// concatenation proving such a builder really exists here — never
				// assumed from the array shape alone.
				if ( PAINT_PROP_ARRAY_KEY_RE.test( l.text ) && /\$\w+\s*\.\s*['"]:['"]\s*\.\s*\$\w+/.test( phpText ) ) {
					paintLine = l;
					paintVar = vn;
					break;
				}
			}
			if ( paintLine ) break;
		}
	}

	if ( customPropLine ) {
		const consumeRe = new RegExp( 'var\\(\\s*' + customPropName.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) + '\\b' );
		let consumerFile = null;
		let consumerLine = null;
		if ( cssText && consumeRe.test( cssText ) ) {
			consumerFile = 'style.css';
			consumerLine = linesContaining( cssText, customPropName ).find( ( l ) => l.text.includes( 'var(' ) ) || null;
		} else if ( consumeRe.test( phpText ) ) {
			consumerFile = 'render.php';
			consumerLine = linesContaining( phpText, customPropName ).find( ( l ) => l.text.includes( 'var(' ) ) || null;
		}
		if ( consumerFile ) {
			return {
				verdict: 'B',
				evidence:
					'render.php:' + varInfo.line + ' assigns $' + varInfo.varName + " from \$attributes['" + row.attr + "']" +
					( customPropVar !== varInfo.varName ? '; derived $' + customPropVar + ' at render.php:' + customPropLine.n : '' ) +
					'; render.php:' + customPropLine.n + ' assigns `' + customPropName + '` from $' + customPropVar +
					'; consumed at ' + consumerFile + ':' + ( consumerLine ? consumerLine.n : '?' ) + ' via var(' + customPropName + ')',
				phpVar: varInfo.varName,
				assignLine: varInfo.line,
				customProp: customPropName,
				customPropAssignLine: customPropLine.n,
				consumerFile,
				consumerLine: consumerLine ? consumerLine.n : null,
				paintLine: null,
				selector: null,
			};
		}
		return {
			verdict: 'NEEDS-HUMAN',
			evidence:
				'render.php:' + customPropLine.n + ' assigns `' + customPropName + '` from $' + customPropVar +
				' but no `var(' + customPropName + ')` consumer was found in style.css or render.php',
			phpVar: varInfo.varName,
			assignLine: varInfo.line,
			customProp: customPropName,
			paintLine: null,
			selector: null,
		};
	}

	if ( paintLine ) {
		return {
			verdict: 'A',
			evidence:
				'render.php:' + varInfo.line + ' assigns $' + varInfo.varName + " from \$attributes['" + row.attr + "']" +
				( paintVar !== varInfo.varName ? '; derived $' + paintVar : '' ) +
				'; render.php:' + paintLine.n + ' concatenates it directly into a CSS declaration: `' + paintLine.text + '`',
			phpVar: varInfo.varName,
			assignLine: varInfo.line,
			paintLine: paintLine.n,
			paintLineText: paintLine.text,
			customProp: null,
			selector: null,
		};
	}

	// A THIRD mechanism, distinct from both SGS clusters: the resolved
	// variable IS (or feeds) a `style_color_args`/`style_engine_args`
	// accumulator consumed by WordPress core's native
	// wp_style_engine_get_styles() — not an SGS colour helper at all.
	// Neither Cluster A's nor Cluster B's recipe applies here; reported
	// honestly as its own case rather than forced into A or B.
	if (
		/wp_style_engine_get_styles\s*\(/.test( phpText ) &&
		varNames.some( ( vn ) => /style_(color|engine)_args/.test( vn ) )
	) {
		return {
			verdict: 'NEEDS-HUMAN',
			evidence:
				'$' + varInfo.varName + " routes into WordPress core's native wp_style_engine_get_styles() " +
				'(via a style_color_args/style_engine_args accumulator), not an SGS colour helper — a THIRD ' +
				"mechanism outside both Cluster A and Cluster B; needs its own repair shape, not this classifier's recipes",
			phpVar: varInfo.varName,
			assignLine: varInfo.line,
			paintLine: null,
			customProp: null,
			selector: null,
		};
	}

	const allRefLines = varNames.reduce( ( acc, vn ) => acc + linesContaining( phpText, '$' + vn ).length, 0 );
	return {
		verdict: 'NEEDS-HUMAN',
		evidence:
			'$' + varInfo.varName + ' assigned at render.php:' + varInfo.line +
			( varNames.length > 1 ? ' (traced ' + ( varNames.length - 1 ) + ' derived var(s): ' + varNames.slice( 1 ).join( ', ' ) + ')' : '' ) +
			' but neither a direct-paint concatenation nor a custom-property assignment pattern matched any of its ' +
			allRefLines + ' reference line(s)',
		phpVar: varInfo.varName,
		assignLine: varInfo.line,
		paintLine: null,
		customProp: null,
		selector: null,
	};
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
function classifyRow( row, phpText, cssText, renderPhpPath ) {
	const files = [ { path: 'render.php', text: phpText } ];
	for ( const rf of findRequiredFiles( phpText, renderPhpPath ) ) {
		const t = readFileSafe( rf );
		if ( t !== null ) files.push( { path: path.relative( PLUGIN_ROOT, rf ), text: t } );
	}

	// Strategy 0.
	const btn = tryButtonHelperStrategy( row, phpText, null );
	if ( btn ) return { ...row, ...btn };

	// Strategy 1 — try in render.php + every required file.
	const mapHit = tryCustomPropMapStrategy( row, files );
	if ( mapHit ) {
		const owningText = files.find( ( f ) => f.path === mapHit.sourceFile ).text;
		const consumeRe = new RegExp( 'var\\(\\s*' + mapHit.customProp.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) + '\\b' );
		let consumerFile = null;
		let consumerLine = null;
		if ( cssText && consumeRe.test( cssText ) ) {
			consumerFile = 'style.css';
			consumerLine = linesContaining( cssText, mapHit.customProp ).find( ( l ) => l.text.includes( 'var(' ) ) || null;
		} else if ( consumeRe.test( phpText ) ) {
			consumerFile = 'render.php';
			consumerLine = linesContaining( phpText, mapHit.customProp ).find( ( l ) => l.text.includes( 'var(' ) ) || null;
		}
		if ( consumerFile ) {
			return {
				...row,
				verdict: 'B',
				evidence:
					mapHit.sourceFile + ':' + mapHit.assignLine + ' maps `' + row.attr + '` -> `' + mapHit.customProp +
					'` (shape ' + mapHit.shape + '); consumed at ' + consumerFile + ':' + ( consumerLine ? consumerLine.n : '?' ) +
					' via var(' + mapHit.customProp + ')',
				phpVar: '(shared map array)',
				customProp: mapHit.customProp,
				customPropAssignLine: mapHit.assignLine,
				consumerFile,
				consumerLine: consumerLine ? consumerLine.n : null,
				paintLine: null,
				selector: null,
			};
		}
		return {
			...row,
			verdict: 'NEEDS-HUMAN',
			evidence:
				mapHit.sourceFile + ':' + mapHit.assignLine + ' maps `' + row.attr + '` -> `' + mapHit.customProp +
				'` but no var(' + mapHit.customProp + ') consumer was found',
			phpVar: null,
			customProp: mapHit.customProp,
			paintLine: null,
			selector: null,
		};
	}

	// Strategy 2 — direct variable trace in render.php.
	const direct = tryDirectVarStrategy( row, phpText, cssText );
	if ( direct ) return { ...row, ...direct };

	// Also try the direct-variable trace inside any required file (covers a
	// shared class emitter that itself does `$var = $params['attrName']`
	// rather than an array-literal map).
	for ( const f of files ) {
		if ( f.path === 'render.php' ) continue;
		const hit = tryDirectVarStrategy( row, f.text, cssText );
		if ( hit && hit.verdict !== 'NEEDS-HUMAN' ) {
			hit.evidence = '[' + f.path + '] ' + hit.evidence;
			return { ...row, ...hit };
		}
	}

	return {
		...row,
		verdict: 'NEEDS-HUMAN',
		evidence:
			"no `\$var = \$attributes['" + row.attr + "']` assignment, custom-property map entry, or shared-helper call " +
			'found for this attribute in render.php or its ' + ( files.length - 1 ) + ' require_once target(s)',
		phpVar: null,
		paintLine: null,
		customProp: null,
		selector: null,
	};
}

function main() {
	const lines = getRefusalLines();
	const allRows = parseGradientPathDeferredRows( lines );
	dbLookup( allRows ); // fail loudly if the DB is unreachable; not otherwise consumed by verdict logic.

	const results = [];
	for ( const row of allRows ) {
		const dir = row.block.replace( 'sgs/', '' );
		const renderPath = path.join( BLOCKS_DIR, dir, 'render.php' );
		const cssPath = path.join( BLOCKS_DIR, dir, 'style.css' );
		if ( ! fs.existsSync( renderPath ) ) {
			results.push( { ...row, verdict: 'NEEDS-HUMAN', evidence: 'render.php not found at ' + renderPath } );
			continue;
		}
		const phpText = fs.readFileSync( renderPath, 'utf8' );
		const cssText = fs.existsSync( cssPath ) ? fs.readFileSync( cssPath, 'utf8' ) : '';
		results.push( classifyRow( row, phpText, cssText, renderPath ) );
	}

	const counts = { A: 0, B: 0, 'NEEDS-HUMAN': 0 };
	for ( const r of results ) counts[ r.verdict ] = ( counts[ r.verdict ] || 0 ) + 1;

	if ( JSON_OUT ) {
		fs.writeFileSync(
			JSON_OUT,
			JSON.stringify( { generatedAt: new Date().toISOString(), disableADetection: DISABLE_A, counts, rows: results }, null, 2 ),
			'utf8'
		);
		console.log( 'Wrote ' + JSON_OUT );
	}

	console.log(
		'gradient-path-deferred classifier — ' + results.length + ' row(s): A=' + counts.A + ' B=' + counts.B +
		' NEEDS-HUMAN=' + counts[ 'NEEDS-HUMAN' ] + ( DISABLE_A ? '  [A-DETECTION DISABLED — control run]' : '' )
	);
	for ( const r of results ) {
		console.log( '  [' + r.verdict + '] ' + r.block + '.' + r.attr + ' — ' + r.evidence );
	}
}

main();
