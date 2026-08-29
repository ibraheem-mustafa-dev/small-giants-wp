#!/usr/bin/env node
/**
 * migrate-border-shape-b.js — Shape-B border migration (NATIVE_FULL -> block-private).
 *
 * ⛔ THIS IS NOT A BRANCH OF migrate-border-control.js. That script's header
 * declares a hard Shape-B exclusion, on the stated grounds that "there is no
 * proven render.php shape to derive Shape B from". That is no longer true:
 * sgs/accordion was migrated end-to-end on 2026-08-29/30 and LIVE-VERIFIED with
 * scripts/qa/check-border-roundtrip.js (positive[4px solid rgb(230,138,149)]
 * from a palette token, control[0px none]). That block is this codemod's oracle.
 *
 * ⚠ THE ORACLE IS NARROWER THAN "COPY sgs/product-card". The accordion migration
 * initially modelled its colour leg on product-card, which calls
 * sgs_border_states_css(). That helper always routes through
 * sgs_border_gradient_css() -- even for a flat colour -- which sets
 * `border-color:transparent` and paints on a masked ::before ring, so the
 * client's flat colour is never readable as border-color. Measured live: BOTH of
 * that helper's callers (sgs/product-card, sgs/container) report
 * `border-color = rgba(0,0,0,0)`. This codemod therefore emits `border-color`
 * DIRECTLY for a flat colour and reserves the ring for an actual gradient.
 * Copying product-card's colour leg would have cloned that defect 37 times.
 *
 * WHAT SHAPE B IS (all three must land together, or the block is left broken):
 *   1. block.json  — supports.__experimentalBorder trimmed to
 *                    { radius, __experimentalSkipSerialization }; four private
 *                    attrs added; the elements attrMap repointed off `native:`.
 *   2. render.php  — the dead native border reads removed; a G5-gated private
 *                    emission added (style only alongside a real width).
 *   3. edit.js     — SgsBorderControl imported + mounted, plus a canvas preview
 *                    (without it the four new attrs are net-new CHECK A findings).
 *
 * Because a partial application leaves a block WORSE than untouched (attributes
 * declared, native supports stripped, nothing emitting), --fix is ATOMIC PER
 * BLOCK: a block is either fully transformed or refused untouched. There is no
 * partial write.
 *
 * Usage:
 *   node migrate-border-shape-b.js --survey [--json]
 *   node migrate-border-shape-b.js --fix [--apply] [--only <slug,slug>]
 *   node migrate-border-shape-b.js --rename-reserved-style [--apply] [--only <slug>]
 *   node migrate-border-shape-b.js --oracle
 *   node migrate-border-shape-b.js --check
 *   node migrate-border-shape-b.js --self-test
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const { execFileSync } = require( 'child_process' );

// ─── Repo anchoring (same convention as migrate-border-control.js) ───────────
function findRepoRoot( start ) {
	let dir = start;
	for ( let i = 0; i < 12; i++ ) {
		if ( fs.existsSync( path.join( dir, '.claude', 'THE-MIGRATION-METHOD.md' ) ) ) return dir;
		const up = path.dirname( dir );
		if ( up === dir ) break;
		dir = up;
	}
	throw new Error( 'could not locate repo root (.claude/THE-MIGRATION-METHOD.md)' );
}

const ROOT = findRepoRoot( __dirname );
const PLUGIN = path.join( ROOT, 'plugins', 'sgs-blocks' );
const BLOCKS_DIR = path.join( PLUGIN, 'src', 'blocks' );
const THEME_DIR = path.join( ROOT, 'theme', 'sgs-theme' );
const SURVEY_SCRIPT = path.join( PLUGIN, 'scripts', 'survey-border-control-migration.py' );

// The 9-value CSS border-style enum, copied from sgs/quote's block.json.
const BORDER_STYLE_ENUM = [
	'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset',
];

const PRIVATE_ATTRS = {
	borderWidth: { type: 'object', default: {} },
	borderStyle: { type: 'string', enum: BORDER_STYLE_ENUM, default: 'none' },
	borderColour: { type: 'string', default: '' },
	borderColourGradient: {
		type: 'string',
		default: '',
		description:
			'CSS gradient string painting the border with a masked ring instead of a flat colour ' +
			'(D636 border-gradient rollout). Non-empty wins over borderColour.',
	},
};

// ─── Small IO helpers. Line endings are preserved deliberately: reading with a
// normalising reader and writing back LF turns a rename into a whole-file diff
// and silently loses bytes (proven on post 2849, D881 defect 4). ─────────────
function readFile( p ) {
	return fs.readFileSync( p, 'utf8' );
}
function detectEol( text ) {
	return text.includes( '\r\n' ) ? '\r\n' : '\n';
}

function readJson( p ) {
	return JSON.parse( readFile( p ) );
}

function blockDir( slug ) {
	return path.join( BLOCKS_DIR, slug );
}

// ─── Census: the NATIVE_FULL bucket comes from the EXISTING classifier ───────
// Deliberately not re-implemented. One classifier, one definition of the
// buckets; this codemod consumes it exactly as migrate-border-control.js does.
function nativeFullSlugs() {
	const out = execFileSync( 'python', [ SURVEY_SCRIPT, '--survey', '--json' ], {
		cwd: ROOT,
		encoding: 'utf8',
	} );
	const census = JSON.parse( out );
	return Object.keys( census.blocks )
		.filter( ( s ) => census.blocks[ s ].category === 'NATIVE_FULL' )
		.sort();
}

// ─── Hazard detectors ───────────────────────────────────────────────────────

/**
 * A block attribute literally named `style` SHADOWS WordPress's reserved style
 * object, silently disabling every style support the block declares.
 *
 * This is not hypothetical and it is not only accordion: `rest_validate_value_
 * from_schema()` rejects an object against {"type":"string"}, so WP unsets it
 * and falls back to the default. Measured on the canary before the accordion
 * fix: a post storing 40px padding had prepare_attributes_for_render() return
 * style = 'bordered'. Every `$attributes['style']['border'|'color'|...]` read
 * evaluates a non-numeric string offset and returns false.
 *
 * Migrating such a block WITHOUT renaming first would silently inherit the
 * problem: radius stays native, and native radius is read off the same shadowed
 * key. So this is a REFUSAL, not a warning.
 */
function reservedStyleAttr( bj ) {
	const attr = ( bj.attributes || {} ).style;
	if ( ! attr ) return null;
	return {
		type: attr.type,
		default: attr.default,
		// Only costly when the block actually declares style supports to lose.
		costly: Boolean(
			( bj.supports || {} ).__experimentalBorder ||
				( bj.supports || {} ).color ||
				( bj.supports || {} ).typography ||
				( bj.supports || {} ).spacing
		),
	};
}

/**
 * D683 blind spot: check-dead-pattern-attrs.py asks whether the support KEY is
 * declared, not whether its SUB-FLAGS are on. So it cannot tell you that a theme
 * pattern authors a border WIDTH on a block whose width flag you are about to
 * remove. Grep the theme for an authored border on this block's markup.
 */
function themeAuthoredBorder( slug ) {
	if ( ! fs.existsSync( THEME_DIR ) ) return [];
	const hits = [];
	const walk = ( dir ) => {
		let entries;
		try {
			entries = fs.readdirSync( dir, { withFileTypes: true } );
		} catch ( e ) {
			return;
		}
		for ( const ent of entries ) {
			const p = path.join( dir, ent.name );
			if ( ent.isDirectory() ) {
				walk( p );
				continue;
			}
			if ( ! /\.(php|html)$/.test( ent.name ) ) continue;
			let text;
			try {
				text = readFile( p );
			} catch ( e ) {
				continue;
			}
			if ( ! text.includes( `wp:sgs/${ slug }` ) ) continue;
			// Any sgs/<slug> opening comment carrying a border-ish attribute.
			const re = new RegExp( `wp:sgs/${ slug }\\s+(\\{[\\s\\S]*?\\})\\s*/?-->`, 'g' );
			let m;
			while ( ( m = re.exec( text ) ) !== null ) {
				if ( /"border"\s*:|"borderWidth"|"borderStyle"|"borderColour"/.test( m[ 1 ] ) ) {
					hits.push( `${ path.relative( ROOT, p ) }: ${ m[ 1 ].slice( 0, 120 ) }` );
				}
			}
		}
	};
	walk( THEME_DIR );
	return hits;
}

/**
 * `skipSerialization: true` means WP does NOT paint the border -- the block must
 * emit it itself. A block that never reads `$attributes['style']['border']` has
 * a border control that does nothing at all.
 *
 * Reported as an ADVISORY, never a refusal: these are the HIGHEST-value
 * migration targets, because migrating them is what makes the control work.
 * Two sub-states, deliberately distinguished rather than lumped -- measured
 * 2026-08-30, and getting this wrong would misdescribe four blocks:
 *   · 'inert'      -- no border painted by any route (notice-banner, buybox)
 *   · 'own-design' -- the block paints its OWN border via a helper or literal,
 *                     but ignores the client's native value (info-box, testimonial)
 */
function nativeBorderLiveness( bj, php ) {
	const b = ( bj.supports || {} ).__experimentalBorder || {};
	if ( b.__experimentalSkipSerialization !== true ) return 'wp-serialised';
	const readsNative =
		/\$attributes\['style'\]\['border'\]/.test( php ) || /'border'\s*=>/.test( php );
	if ( readsNative ) return 'live';
	const paintsOwn =
		/border-(width|style|color)\s*:/.test( php ) || /sgs_border_\w+\(/.test( php );
	return paintsOwn ? 'dead-own-design' : 'dead-inert';
}

/**
 * Locate the two anchors the render.php transform needs:
 *   · the root-selector variable (what the emitted rules are scoped to)
 *   · the scoped-CSS accumulator (where emitted CSS is appended)
 *
 * The accumulator is NOT found by a bare `$x .=` scan: measured across the 37
 * NATIVE_FULL blocks, that also matches HTML accumulators ($logos_html,
 * $data_attrs), and appending CSS to those would corrupt markup. It is only
 * accepted when the same variable is appended a value that is demonstrably CSS
 * (contains a `{`...`}` rule or a style-engine result).
 */
function findAnchors( php ) {
	const rootMatch = php.match( /\$(\w*root_sel\w*)\s*=/ );
	const rootVar = rootMatch ? rootMatch[ 1 ] : null;

	const candidates = new Map();
	const re = /\$(\w+)\s*\.=\s*([^;]{0,200});/g;
	let m;
	while ( ( m = re.exec( php ) ) !== null ) {
		const name = m[ 1 ];
		const rhs = m[ 2 ];
		const cssish =
			/\{[^}]*\}/.test( rhs ) ||
			/\['css'\]/.test( rhs ) ||
			/_css\b/.test( name ) ||
			/sgs_\w*_css\(/.test( rhs );
		if ( ! cssish ) continue;
		candidates.set( name, ( candidates.get( name ) || 0 ) + 1 );
	}
	// Prefer a *_css name; otherwise the most-appended CSS-ish variable.
	let cssVar = null;
	const named = [ ...candidates.keys() ].filter( ( n ) => /_css$/.test( n ) );
	if ( named.length === 1 ) cssVar = named[ 0 ];
	else if ( named.length > 1 ) cssVar = null; // ambiguous on purpose
	else if ( candidates.size === 1 ) cssVar = [ ...candidates.keys() ][ 0 ];

	return { rootVar, cssVar, cssCandidates: [ ...candidates.keys() ] };
}

function alreadyShapeB( bj ) {
	const a = bj.attributes || {};
	const b = ( bj.supports || {} ).__experimentalBorder || {};
	const hasPrivate = a.borderWidth && a.borderStyle && a.borderColour;
	const trimmed = b.width === undefined && b.color === undefined && b.style === undefined;
	return Boolean( hasPrivate && trimmed );
}

// ─── Classification ─────────────────────────────────────────────────────────
const READY = 'READY';
const DONE = 'DONE';

function classify( slug ) {
	const dir = blockDir( slug );
	const bjPath = path.join( dir, 'block.json' );
	const phpPath = path.join( dir, 'render.php' );
	const editPath = path.join( dir, 'edit.js' );

	if ( ! fs.existsSync( bjPath ) ) return { slug, status: 'REFUSE', reason: 'no-block-json' };
	let bj;
	try {
		bj = readJson( bjPath );
	} catch ( e ) {
		return { slug, status: 'REFUSE', reason: 'block-json-unparseable: ' + e.message.slice( 0, 60 ) };
	}

	if ( alreadyShapeB( bj ) ) return { slug, status: DONE, reason: 'already Shape B' };

	if ( ! fs.existsSync( phpPath ) ) return { slug, status: 'REFUSE', reason: 'no-render-php' };
	if ( ! fs.existsSync( editPath ) ) return { slug, status: 'REFUSE', reason: 'no-edit-js' };

	const php = readFile( phpPath );
	const liveness = nativeBorderLiveness( bj, php );

	const shadow = reservedStyleAttr( bj );
	if ( shadow && shadow.costly ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'reserved-style-attr',
			detail:
				`declares a \`style\` attribute (type=${ shadow.type }, default=` +
				`${ JSON.stringify( shadow.default ) }) which shadows WP's reserved style object; ` +
				'rename it first (see sgs/accordion -> accordionStyle) or the migration inherits a dead native radius',
			liveness,
		};
	}

	const themeHits = themeAuthoredBorder( slug );
	if ( themeHits.length ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'theme-authored-border',
			detail: themeHits.slice( 0, 3 ).join( ' | ' ),
			liveness,
		};
	}

	const existing = bj.attributes || {};
	const collides = Object.keys( PRIVATE_ATTRS ).filter( ( k ) => existing[ k ] !== undefined );
	if ( collides.length ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'attr-name-collision',
			detail: 'block already declares: ' + collides.join( ', ' ),
			liveness,
		};
	}

	const anchors = findAnchors( php );
	if ( ! anchors.rootVar || ! anchors.cssVar ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'ambiguous-anchor',
			detail:
				`rootVar=${ anchors.rootVar || 'NOT FOUND' } cssVar=${ anchors.cssVar || 'NOT FOUND' }` +
				( anchors.cssCandidates.length
					? ` (css candidates: ${ anchors.cssCandidates.join( ', ' ) })`
					: '' ),
			liveness,
		};
	}

	return { slug, status: READY, liveness, anchors };
}

// ─── Transforms ─────────────────────────────────────────────────────────────

function transformBlockJson( text ) {
	const bj = JSON.parse( text );
	const eol = detectEol( text );

	const border = ( bj.supports || {} ).__experimentalBorder || {};
	const trimmed = { radius: true, __experimentalSkipSerialization: true };
	if ( border.radius === undefined ) delete trimmed.radius;
	bj.supports.__experimentalBorder = { radius: true, __experimentalSkipSerialization: true };

	bj.attributes = bj.attributes || {};
	for ( const [ name, def ] of Object.entries( PRIVATE_ATTRS ) ) {
		bj.attributes[ name ] = JSON.parse( JSON.stringify( def ) );
	}

	// attrMap: repoint the three legs off `native:` and add the gradient key.
	// This is the R-31-1 declarative source that seeds the DB and is gated by
	// check-element-manifest-conformance.js -- leaving it on `native:` would
	// make the DB describe a support the block no longer has.
	const els = ( ( bj.supports || {} ).sgs || {} ).elements || {};
	for ( const el of Object.values( els ) ) {
		if ( ! el || ! el.attrMap ) continue;
		const m = el.attrMap;
		if ( m[ 'css:border-width' ] === 'native:__experimentalBorder.width' ) {
			m[ 'css:border-width' ] = 'borderWidth';
		}
		if ( m[ 'css:border-style' ] === 'native:__experimentalBorder.style' ) {
			m[ 'css:border-style' ] = 'borderStyle';
		}
		if ( m[ 'css:border-color' ] === 'native:__experimentalBorder.color' ) {
			m[ 'css:border-color' ] = 'borderColour';
			if ( m[ 'css:border-color-gradient' ] === undefined ) {
				m[ 'css:border-color-gradient' ] = 'borderColourGradient';
			}
		}
	}

	let out = JSON.stringify( bj, null, '\t' );
	if ( eol === '\r\n' ) out = out.replace( /\n/g, '\r\n' );
	return out + eol;
}

function renderPhpEmission( rootVar, cssVar ) {
	return `
// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial \`medium\` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$${ cssVar } .= $${ rootVar } . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits \`border-color\` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$${ cssVar } .= sgs_border_gradient_css( $${ rootVar }, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$${ cssVar } .= $${ rootVar } . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
}
`;
}

/**
 * Remove the native border arg construction. Matched narrowly: only the
 * assignments that read `$attributes['style']['border'][...]` for width/style/
 * colour. The RADIUS read is deliberately preserved -- radius stays native.
 */
function stripNativeBorderReads( php ) {
	// Pass 1 — remove the statements that read the native non-radius legs, and
	// RECORD every local variable whose assignment went with them.
	const lines = php.split( /\r?\n/ );
	const out = [];
	const orphaned = new Set();
	let removed = 0;
	let depth = 0;
	let dropping = false;
	for ( const line of lines ) {
		const touchesNonRadiusBorder =
			/\$attributes\['style'\]\['border'\]\['(color|style|width)'\]/.test( line ) ||
			/sgs_native_border_style_width_args\s*\(/.test( line );
		if ( ! dropping && touchesNonRadiusBorder ) {
			dropping = true;
			depth = 0;
		}
		if ( dropping ) {
			const assign = line.match( /^\s*\$(\w+)\s*=[^=]/ );
			if ( assign ) orphaned.add( assign[ 1 ] );
			depth += ( line.match( /\{/g ) || [] ).length;
			depth -= ( line.match( /\}/g ) || [] ).length;
			removed++;
			if ( depth <= 0 && /;\s*$|\}\s*$/.test( line.trim() ) ) dropping = false;
			continue;
		}
		out.push( line );
	}

	// Pass 2 — remove what a removed assignment left behind.
	//
	// Deleting an assignment but keeping its readers is a REAL defect, measured
	// on sgs/pricing-table: pass 1 removed
	// `$pt_border_style_width = sgs_native_border_style_width_args( … );` and
	// left both `if ( isset( $pt_border_style_width['width'] ) ) { … }` blocks
	// behind. `php -l` reports that file CLEAN — an undefined variable is a
	// runtime notice, not a parse error — so the syntax gate cannot catch it,
	// and nothing then sets $pt_border_args['width'] either. The migration would
	// have shipped a border that silently never paints.
	let out2 = out;
	if ( orphaned.size ) {
		const re = new RegExp( `\\$(?:${ [ ...orphaned ].join( '|' ) })\\b` );
		const kept = [];
		depth = 0;
		dropping = false;
		for ( const line of out2 ) {
			if ( ! dropping && re.test( line ) ) {
				dropping = true;
				depth = 0;
			}
			if ( dropping ) {
				depth += ( line.match( /\{/g ) || [] ).length;
				depth -= ( line.match( /\}/g ) || [] ).length;
				removed++;
				if ( depth <= 0 && /;\s*$|\}\s*$/.test( line.trim() ) ) dropping = false;
				continue;
			}
			kept.push( line );
		}
		out2 = kept;
	}

	return {
		text: out2.join( detectEol( php ) === '\r\n' ? '\r\n' : '\n' ),
		removed,
		orphaned: [ ...orphaned ],
	};
}

/**
 * Byte offset of the line where the accumulator is first genuinely CONSUMED.
 *
 * Two hazards, both MEASURED on sgs/pricing-table (2026-08-30) rather than
 * imagined, and both of which silently produce a block whose border can never
 * paint while `php -l` stays green:
 *
 *   1. PROSE. Comment lines are masked out before the search. That block's
 *      accumulator is introduced by `// … before the wrapper echo.` on the line
 *      directly above `$responsive_css = '';`. The unmasked regex matched the
 *      word `echo` in that COMMENT (`[^;]*` spans newlines), so the emission was
 *      inserted ABOVE the initialiser — which then assigned `''` over it. The
 *      real consumption was 445 lines further down.
 *   2. THE INITIALISER. Even with prose masked, the insertion must be forced
 *      below `$cssVar = ''`. Anything written above it is erased.
 */
function findConsumptionLineStart( text, cssVar ) {
	const eolLen = detectEol( text ) === '\r\n' ? 2 : 1;
	const lines = text.split( /\r?\n/ );
	const masked = lines.map( ( l ) => ( /^\s*(\*|\/\/|#|\/\*)/.test( l ) ? '' : l ) );

	const initRe = new RegExp( `\\$${ cssVar }\\s*=\\s*['"]` );
	const initLine = masked.findIndex( ( l ) => initRe.test( l ) );

	const consumeRe = new RegExp( `(printf|echo|return|sprintf)[^;]*\\$${ cssVar }\\b` );
	// Offsets are computed on the MASKED text, whose lines are the same COUNT as
	// the real ones, so a line index maps back exactly. (Byte offsets do not —
	// hence mapping by line, not by index.)
	// Brace depth at the START of each line, so an insertion point can be
	// required to sit at top level.
	const depthAt = [];
	let d = 0;
	for ( const l of masked ) {
		depthAt.push( d );
		d += ( l.match( /\{/g ) || [] ).length;
		d -= ( l.match( /\}/g ) || [] ).length;
	}

	for ( let n = initLine + 1; n < masked.length; n++ ) {
		// A call can wrap; test a small window but require it to START here.
		const window = masked.slice( n, n + 8 ).join( '\n' );
		const m = window.match( consumeRe );
		if ( ! m ) continue;
		if ( m.index > masked[ n ].length ) continue; // the match starts on a later line

		// 3rd hazard, also measured on sgs/pricing-table: the consumption is
		// GUARDED — `if ( $responsive_css ) { printf( … ); }`. Inserting
		// immediately before the printf puts the emission INSIDE that guard, so a
		// user who sets ONLY a border gets nothing: the accumulator is still
		// empty when the guard is evaluated, the branch is skipped, and the
		// appends never run. Walk out to the enclosing TOP-LEVEL statement.
		let target = n;
		while ( target > initLine + 1 && depthAt[ target ] > 0 ) target--;
		if ( depthAt[ target ] !== 0 ) target = n; // could not reach top level

		let offset = 0;
		for ( let k = 0; k < target; k++ ) offset += lines[ k ].length + eolLen;
		return offset;
	}
	return -1;
}

function transformRenderPhp( php, rootVar, cssVar ) {
	const stripped = stripNativeBorderReads( php );
	const emission = renderPhpEmission( rootVar, cssVar );
	// Insert immediately before the accumulator is first CONSUMED (printed or
	// passed on), so the new rules are part of the same scoped <style>.
	const lineStart = findConsumptionLineStart( stripped.text, cssVar );
	if ( lineStart === -1 ) return null;
	return (
		stripped.text.slice( 0, lineStart ) + emission + '\n' + stripped.text.slice( lineStart )
	);
}

function transformEditJs( src ) {
	if ( /SgsBorderControl/.test( src ) ) return null; // already mounted

	// 1. import
	let out = src;
	const importRe = /import\s*\{([^}]*)\}\s*from\s*(['"])\.\.\/\.\.\/components\2\s*;/;
	const im = out.match( importRe );
	if ( ! im ) return null;
	const names = im[ 1 ];
	// Inject ONLY the names that are missing. Appending both unconditionally
	// re-declares an identifier the file already imports, which is a hard ES
	// module SyntaxError, not a lint nit — measured on sgs/pricing-table, whose
	// edit.js already imported resolveColourToken for its text-colour previews:
	// esbuild refused the file with "The symbol resolveColourToken has already
	// been declared", so `npm run build` would have failed on a migration the
	// codemod reported as successful.
	const wanted = [ 'SgsBorderControl', 'resolveColourToken' ].filter(
		( n ) => ! new RegExp( `\\b${ n }\\b` ).test( names )
	);
	if ( wanted.length ) {
		const injected =
			names.replace( /\s*$/, '' ) + ',\n' + wanted.map( ( n ) => `\t${ n },` ).join( '\n' ) + '\n';
		out = out.replace( importRe, `import {${ injected }} from '../../components';` );
	}

	// 2. mount — appended as the LAST child of the first <InspectorControls>.
	// Back up to the START of that line, so the closing tag keeps its own
	// indentation instead of donating it to the injected panel.
	const tagIdx = out.indexOf( '</InspectorControls>' );
	if ( tagIdx === -1 ) return null;
	const closeIdx = out.lastIndexOf( '\n', tagIdx ) + 1;
	const panel = `\t\t\t\t<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
\t\t\t\t\t<SgsBorderControl
\t\t\t\t\t\twidthValues={ attributes.borderWidth ?? {} }
\t\t\t\t\t\tonWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
\t\t\t\t\t\twidthPresets={ [ '10', '20', '30' ] }
\t\t\t\t\t\tstyleValue={ attributes.borderStyle }
\t\t\t\t\t\tonStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
\t\t\t\t\t\tcolourLabel={ __( 'Border colour', 'sgs-blocks' ) }
\t\t\t\t\t\tcolourValue={ attributes.borderColour }
\t\t\t\t\t\tonColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
\t\t\t\t\t\tcolourGradientValue={ attributes.borderColourGradient }
\t\t\t\t\t\tonColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
\t\t\t\t\t\tcolourLinked={ true }
\t\t\t\t\t/>
\t\t\t\t</PanelBody>
`;
	out = out.slice( 0, closeIdx ) + panel + out.slice( closeIdx );
	return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESERVED-`style` RENAME (clears the `reserved-style-attr` refusal)
//
// A block attribute literally named `style` shadows WP's reserved style object
// (see reservedStyleAttr() above). Shape B cannot be applied over the shadow:
// radius stays native and native radius is read off the same shadowed key.
// This section renames the attribute so the block can then migrate normally.
//
// ⚠ SCOPE IS SOURCE CODE ONLY. This does NOT migrate stored post content. A
// post whose block comment carries `{"style":"card"}` keeps writing to a key
// the block no longer declares; WP drops it and the block falls back to its
// default preset. sgs/accordion was censused first and had ZERO posts storing a
// string-valued `style`, which is why its rename needed no content migration.
// That census result belongs to accordion ALONE — it is not evidence about any
// other block. Hence this is its OWN opt-in mode, never part of --fix: --fix
// stays safe-by-default and keeps REFUSING a shadowed block until the rename
// has been run deliberately.
//
// Oracle: sgs/accordion, commit 542e256aa. `--oracle` replays these three
// transforms against 542e256aa~1 and asserts they reproduce the human edits.

/**
 * Pick the new attribute name.
 *
 * Derived, not hardcoded. The accordion precedent chose `accordionStyle`
 * BECAUSE the block already published `providesContext: {"sgs/accordionStyle":
 * "style"}` — matching the context key means consuming child blocks need zero
 * changes. So: if a context key is bound to this attribute and its tail is a
 * usable identifier, that tail IS the name. Otherwise fall back to the family
 * convention (<camelCasedSlug>Style), which is what `accordionStyle`,
 * `cardStyle` and `badgeStyle` all are anyway.
 */
function chooseReservedStyleName( bj, slug ) {
	const ctx = bj.providesContext || {};
	for ( const [ key, val ] of Object.entries( ctx ) ) {
		if ( val !== 'style' ) continue;
		const tail = key.split( '/' ).pop();
		if ( /^[A-Za-z_$][\w$]*$/.test( tail ) && tail !== 'style' ) {
			return { name: tail, why: `matches existing context key \`${ key }\`` };
		}
	}
	const camel = slug.replace( /-([a-z])/g, ( _m, c ) => c.toUpperCase() );
	return { name: camel + 'Style', why: 'no context key bound to `style`; <block>Style convention' };
}

// ── Minimal JSON text surgery. Deliberately NOT JSON.parse/stringify: a
// reserialise rewrites the whole file (this repo's block.json files mix inline
// and expanded objects), turning a 3-token rename into a whole-file diff and
// making the oracle replay unverifiable. Same reasoning as
// `never-reserialise-to-rename-a-key`. ────────────────────────────────────────

/** Byte span of the object literal that is the value of a top-level `key`. */
function objectSpan( text, key ) {
	const re = new RegExp( `"${ key }"\\s*:\\s*\\{` );
	const m = re.exec( text );
	if ( ! m ) return null;
	const open = m.index + m[ 0 ].length - 1;
	let depth = 0;
	let inStr = false;
	let esc = false;
	for ( let i = open; i < text.length; i++ ) {
		const ch = text[ i ];
		if ( inStr ) {
			if ( esc ) esc = false;
			else if ( ch === '\\' ) esc = true;
			else if ( ch === '"' ) inStr = false;
			continue;
		}
		if ( ch === '"' ) inStr = true;
		else if ( ch === '{' ) depth++;
		else if ( ch === '}' ) {
			depth--;
			if ( depth === 0 ) return { start: open, end: i };
		}
	}
	return null;
}

/**
 * Walk the immediate (depth-1) members of an object span, yielding the byte
 * range of each string token and whether it is a KEY. String-aware, so a
 * `"style"` appearing inside a `_note` prose value or a nested object is never
 * mistaken for a member key — the defect that makes a bare
 * `text.replace('"style"', …)` wrong on every block.json in this repo.
 */
function eachMember( text, span, fn ) {
	let depth = 0;
	let inStr = false;
	let esc = false;
	let strStart = -1;
	for ( let i = span.start; i <= span.end; i++ ) {
		const ch = text[ i ];
		if ( inStr ) {
			if ( esc ) esc = false;
			else if ( ch === '\\' ) esc = true;
			else if ( ch === '"' ) {
				inStr = false;
				if ( depth === 1 ) {
					const raw = text.slice( strStart + 1, i );
					let j = i + 1;
					while ( j <= span.end && /\s/.test( text[ j ] ) ) j++;
					fn( { raw, isKey: text[ j ] === ':', start: strStart, end: i } );
				}
			}
			continue;
		}
		if ( ch === '"' ) {
			inStr = true;
			strStart = i;
		} else if ( ch === '{' || ch === '[' ) depth++;
		else if ( ch === '}' || ch === ']' ) depth--;
	}
}

/** Rename the depth-1 member key `style` inside `container` to `newName`. */
function renameJsonMemberKey( text, container, newName ) {
	const span = objectSpan( text, container );
	if ( ! span ) return { text, hits: 0 };
	const edits = [];
	eachMember( text, span, ( t ) => {
		if ( t.isKey && t.raw === 'style' ) edits.push( t );
	} );
	let out = text;
	for ( const e of edits.reverse() ) {
		out = out.slice( 0, e.start ) + `"${ newName }"` + out.slice( e.end + 1 );
	}
	return { text: out, hits: edits.length };
}

/** Repoint any providesContext VALUE of `"style"` to `newName` (key unchanged). */
function renameJsonContextValue( text, newName ) {
	const span = objectSpan( text, 'providesContext' );
	if ( ! span ) return { text, hits: 0 };
	const edits = [];
	eachMember( text, span, ( t ) => {
		if ( ! t.isKey && t.raw === 'style' ) edits.push( t );
	} );
	let out = text;
	for ( const e of edits.reverse() ) {
		out = out.slice( 0, e.start ) + `"${ newName }"` + out.slice( e.end + 1 );
	}
	return { text: out, hits: edits.length };
}

function renameStyleBlockJson( text, newName ) {
	let hits = 0;
	let out = text;

	// 1. the attribute declaration itself
	const a = renameJsonMemberKey( out, 'attributes', newName );
	out = a.text;
	hits += a.hits;

	// 2. providesContext VALUE (the KEY is a published contract — never renamed)
	const c = renameJsonContextValue( out, newName );
	out = c.text;
	hits += c.hits;

	// 3. example.attributes — an unrenamed key here previews the DEFAULT preset
	const exSpan = objectSpan( out, 'example' );
	if ( exSpan ) {
		const exText = out.slice( exSpan.start, exSpan.end + 1 );
		const ex = renameJsonMemberKey( exText, 'attributes', newName );
		if ( ex.hits ) {
			out = out.slice( 0, exSpan.start ) + ex.text + out.slice( exSpan.end + 1 );
			hits += ex.hits;
		}
	}

	// NOT renamed, deliberately: the TOP-LEVEL `"style": "file:./style-index.css"`
	// stylesheet declaration, `supports.__experimentalBorder.style`, and any
	// `native:__experimentalBorder.style` attrMap string. All are the word
	// "style" in a different role; renaming any of them breaks the block.
	return { text: out, hits };
}

/**
 * edit.js. Two touch points only:
 *   · the `const { … } = attributes` destructure
 *   · `setAttributes( { style: <scalar> } )`
 *
 * Everything else spelled `style` in an edit.js is a DIFFERENT thing — a JSX
 * `style={{…}}` prop, or a genuine read/write of WP's reserved object
 * (`attributes.style?.spacing?.padding`, which the accordion's ResponsiveBox
 * controls use and which the rename is precisely what makes work). Those must
 * survive untouched.
 */
function renameStyleEditJs( text, newName ) {
	let hits = 0;
	let out = text;

	// 1. destructure
	const destructRe = /const\s*\{([\s\S]*?)\}\s*=\s*attributes\s*;/;
	const dm = out.match( destructRe );
	if ( dm ) {
		const body = dm[ 1 ];
		const lineRe = /^([ \t]*)style(?:[ \t]*:[ \t]*([A-Za-z_$][\w$]*))?([ \t]*,?)[ \t]*$/m;
		const lm = body.match( lineRe );
		if ( lm ) {
			const indent = lm[ 1 ];
			const alias = lm[ 2 ];
			const tail = lm[ 3 ];
			// If the block already aliased it to exactly the new name, the alias
			// becomes redundant — collapse it (this is what the accordion commit
			// did). If there is NO alias, keep `style` as the LOCAL name so every
			// downstream read in the file stays correct without further edits.
			const replacement =
				alias === newName
					? `${ indent }${ newName }${ tail }`
					: `${ indent }${ newName }: ${ alias || 'style' }${ tail }`;
			const newBody = body.replace( lineRe, replacement );
			out = out.replace( destructRe, ( full ) => full.replace( body, newBody ) );
			hits++;
		}
	}

	// 2. setAttributes writes of a SCALAR. The negative lookahead is load-bearing:
	// `setAttributes({ style: { ...attributes.style, spacing: … } })` writes WP's
	// reserved object and must NOT be renamed.
	//
	// ⚠ The lookahead MUST sit immediately after the colon and consume the
	// whitespace ITSELF. Written as `(\s*:\s*)(?!\{)` the engine simply
	// backtracks `\s*` to zero width, tests the space instead of the `{`, and
	// renames the object write anyway. The accordion oracle replay caught
	// exactly that: it produced `accordionStyle: {` twice, on the two
	// ResponsiveBoxControl spacing writes the human deliberately left alone.
	const writeRe = /(\bsetAttributes\s*\(\s*\{\s*)style(\s*:)(?!\s*\{)/g;
	out = out.replace( writeRe, ( _m, a, b ) => {
		hits++;
		return `${ a }${ newName }${ b }`;
	} );

	return { text: out, hits };
}

/**
 * render.php. Rename ONLY the scalar read `$attributes['style']` — an
 * occurrence followed by `[` is a read of WP's reserved object
 * (`$attributes['style']['border']['radius']`) and is exactly what the rename
 * un-breaks. Comment lines are skipped: they discuss the reserved object.
 */
function renameStyleRenderPhp( text, newName ) {
	const eol = detectEol( text ) === '\r\n' ? '\r\n' : '\n';
	let hits = 0;
	const lines = text.split( /\r?\n/ ).map( ( line ) => {
		if ( /^\s*(\*|\/\/|#)/.test( line ) ) return line;
		return line.replace( /\$attributes\['style'\](?!\s*\[)/g, () => {
			hits++;
			return `$attributes['${ newName }']`;
		} );
	} );
	return { text: lines.join( eol ), hits };
}

/**
 * Any OTHER file in the block directory that reads the shadowed attribute is
 * out of this transform's scope. Refuse rather than half-rename: a save.js or
 * view.js left reading `attributes.style` after the declaration moved is a
 * silent breakage, and this codemod's whole discipline is atomic-or-untouched.
 */
function otherFilesReadingStyleAttr( dir ) {
	const skip = new Set( [ 'block.json', 'edit.js', 'render.php' ] );
	const hits = [];
	for ( const name of fs.readdirSync( dir ) ) {
		if ( skip.has( name ) || ! /\.(js|jsx|php)$/.test( name ) ) continue;
		let text;
		try {
			text = readFile( path.join( dir, name ) );
		} catch ( e ) {
			continue;
		}
		if ( /attributes\.style\b(?!\s*\?\.\s*(spacing|color|typography|border))/.test( text ) ||
			/\$attributes\['style'\](?!\s*\[)/.test( text ) ) {
			hits.push( name );
		}
	}
	return hits;
}

/** Plan (and optionally apply) the rename for one block. */
function planReservedStyleRename( slug ) {
	const dir = blockDir( slug );
	const bjPath = path.join( dir, 'block.json' );
	const editPath = path.join( dir, 'edit.js' );
	const phpPath = path.join( dir, 'render.php' );
	if ( ! fs.existsSync( bjPath ) ) return { slug, ok: false, reason: 'no-block-json' };

	const bjText = readFile( bjPath );
	const bj = JSON.parse( bjText );
	const shadow = reservedStyleAttr( bj );
	if ( ! shadow ) return { slug, ok: false, reason: 'no `style` attribute — nothing to rename' };

	const { name, why } = chooseReservedStyleName( bj, slug );
	if ( ( bj.attributes || {} )[ name ] !== undefined ) {
		return { slug, ok: false, reason: `target name \`${ name }\` is already taken` };
	}

	const stray = otherFilesReadingStyleAttr( dir );
	if ( stray.length ) {
		return { slug, ok: false, reason: 'other file(s) read the attribute: ' + stray.join( ', ' ) };
	}

	const files = {};
	const bjOut = renameStyleBlockJson( bjText, name );
	if ( ! bjOut.hits ) return { slug, ok: false, reason: 'block.json rename found no attribute key' };
	files[ bjPath ] = bjOut.text;

	let editHits = 0;
	if ( fs.existsSync( editPath ) ) {
		const e = renameStyleEditJs( readFile( editPath ), name );
		editHits = e.hits;
		files[ editPath ] = e.text;
	}
	let phpHits = 0;
	if ( fs.existsSync( phpPath ) ) {
		const p = renameStyleRenderPhp( readFile( phpPath ), name );
		phpHits = p.hits;
		files[ phpPath ] = p.text;
	}
	// A block that declares the attribute but neither reads nor writes it in
	// edit.js/render.php means the transform did not find the code it expected.
	if ( editHits === 0 && phpHits === 0 ) {
		return { slug, ok: false, reason: 'neither edit.js nor render.php references the attribute' };
	}

	// RESIDUAL GUARD. A MISSED write is as bad as a wrong one: the control keeps
	// writing `style`, WP drops it, and the preset silently stops responding.
	// The setAttributes matcher only recognises `style` as the FIRST key of the
	// object literal, so anything it could not reach must fail loudly here
	// rather than ship as a half-rename.
	const residual = [];
	if ( files[ editPath ] &&
		/setAttributes\s*\(\s*\{[^{}]*?\bstyle\s*:(?!\s*\{)/.test( files[ editPath ] ) ) {
		residual.push( 'edit.js still writes a scalar `style:` via setAttributes' );
	}
	if ( files[ phpPath ] ) {
		const stillReads = files[ phpPath ]
			.split( /\r?\n/ )
			.some( ( l ) => ! /^\s*(\*|\/\/|#)/.test( l ) && /\$attributes\['style'\](?!\s*\[)/.test( l ) );
		if ( stillReads ) residual.push( "render.php still reads scalar $attributes['style']" );
	}
	if ( residual.length ) {
		return { slug, ok: false, reason: 'half-rename refused — ' + residual.join( '; ' ) };
	}

	return {
		slug,
		ok: true,
		name,
		why,
		hits: { blockJson: bjOut.hits, editJs: editHits, renderPhp: phpHits },
		files,
	};
}

function renameReservedStyle( apply, only ) {
	let slugs = nativeFullSlugs().filter( ( s ) => {
		const bjPath = path.join( blockDir( s ), 'block.json' );
		if ( ! fs.existsSync( bjPath ) ) return false;
		try {
			const shadow = reservedStyleAttr( readJson( bjPath ) );
			return Boolean( shadow && shadow.costly );
		} catch ( e ) {
			return false;
		}
	} );
	if ( only ) {
		const want = new Set( only.split( ',' ).map( ( s ) => s.trim().replace( /^sgs\//, '' ) ) );
		slugs = slugs.filter( ( s ) => want.has( s ) );
	}
	if ( ! slugs.length ) {
		console.log( 'no block carries a costly reserved-`style` attribute.' );
		return 0;
	}
	console.log(
		'\n⚠ STORED CONTENT IS OUT OF SCOPE. This renames SOURCE ONLY. Census each\n' +
			"  block's stored posts for a string-valued `style` before shipping — a post\n" +
			'  that has one loses its preset silently (sgs/accordion had zero; that\n' +
			'  result is evidence about accordion and nothing else).\n'
	);
	let done = 0;
	let refused = 0;
	for ( const slug of slugs ) {
		const plan = planReservedStyleRename( slug );
		if ( ! plan.ok ) {
			refused++;
			console.log( `  REFUSE  sgs/${ slug } — ${ plan.reason }` );
			continue;
		}
		if ( apply ) {
			for ( const [ p, text ] of Object.entries( plan.files ) ) fs.writeFileSync( p, text );
		}
		done++;
		console.log(
			`  ${ apply ? 'RENAMED ' : 'would rename' }  sgs/${ slug }: style -> ${ plan.name }  ` +
				`(${ plan.why }; block.json ${ plan.hits.blockJson }, edit.js ${ plan.hits.editJs }, ` +
				`render.php ${ plan.hits.renderPhp })`
		);
	}
	console.log(
		`\n${ apply ? 'applied' : 'dry run' }: ${ done } renamed, ${ refused } refused.` +
			( apply
				? '\nNext: `--survey` should now show the block READY, then `--fix --apply --only <slug>`.'
				: '\n(dry run — pass --apply to write)' )
	);
	return 0;
}

/**
 * --oracle: replay the three rename transforms against sgs/accordion's
 * PRE-rename source (542e256aa~1) and check them against the human's committed
 * POST-rename source (542e256aa).
 *
 * Byte-identity of whole files is NOT the assertion, and claiming it would be
 * dishonest: that commit bundles the rename WITH the Shape-B migration, four
 * new attributes, an attribute `description`, and a hand-written editor-canvas
 * preview. None of that is this transform's work. The falsifiable assertions
 * are narrower and sharper, and both are non-circular:
 *
 *   (a) HARD GATE — every line this transform changes must appear VERBATIM in
 *       the human's committed file. Inventing a line the human never wrote is
 *       the failure this oracle exists to catch.
 *   (b) COVERAGE — every line the human ADDED that is rename-shaped must appear
 *       in this transform's output. "Rename-shaped" is decided structurally,
 *       not by a hardcoded list: a post-only line is rename-shaped iff mapping
 *       exactly ONE of its occurrences of the new name back to `style` yields a
 *       line that exists in the pre file. That admits
 *       `"sgs/accordionStyle": "accordionStyle",` (reverse the 2nd occurrence)
 *       while correctly excluding the human's prose comment that merely
 *       mentions the new name.
 */
function oracleReplay() {
	const files = [ 'block.json', 'edit.js', 'render.php' ];
	const show = ( ref, f ) =>
		execFileSync( 'git', [ 'show', `${ ref }:plugins/sgs-blocks/src/blocks/accordion/${ f }` ], {
			cwd: ROOT,
			encoding: 'utf8',
			maxBuffer: 1024 * 1024 * 16,
		} );

	const pre = {};
	const post = {};
	for ( const f of files ) {
		pre[ f ] = show( '542e256aa~1', f );
		post[ f ] = show( '542e256aa', f );
	}

	const name = chooseReservedStyleName( JSON.parse( pre[ 'block.json' ] ), 'accordion' );
	const failures = [];
	if ( name.name !== 'accordionStyle' ) {
		failures.push( `name derivation: expected accordionStyle, got ${ name.name }` );
	}

	const out = {
		'block.json': renameStyleBlockJson( pre[ 'block.json' ], name.name ).text,
		'edit.js': renameStyleEditJs( pre[ 'edit.js' ], name.name ).text,
		'render.php': renameStyleRenderPhp( pre[ 'render.php' ], name.name ).text,
	};

	let identical = 0;
	console.log( `\nORACLE REPLAY vs 542e256aa (name derived: ${ name.name } — ${ name.why })\n` );
	for ( const f of files ) {
		const preL = pre[ f ].split( /\r?\n/ );
		const outL = out[ f ].split( /\r?\n/ );
		const postSet = new Set( post[ f ].split( /\r?\n/ ) );
		const preSet = new Set( preL );

		if ( out[ f ] === post[ f ] ) identical++;

		// (a) every line I CHANGED must exist verbatim in the human's file
		const changed = outL.filter( ( l, i ) => l !== preL[ i ] );
		const unmatched = changed.filter( ( l ) => ! postSet.has( l ) );
		// (b) every rename-SHAPED line the HUMAN added must exist in my output.
		// Rename-shaped == reversing exactly ONE occurrence of the new name
		// yields a line the pre file already had.
		const outSet = new Set( outL );
		const isRenameShaped = ( l ) => {
			const parts = l.split( name.name );
			if ( parts.length < 2 ) return false;
			for ( let k = 1; k < parts.length; k++ ) {
				const rebuilt = parts
					.map( ( p, i ) => ( i === 0 ? p : ( i === k ? 'style' : name.name ) + p ) )
					.join( '' );
				if ( preSet.has( rebuilt ) ) return true;
			}
			return false;
		};
		const humanRenameLines = post[ f ]
			.split( /\r?\n/ )
			.filter( ( l ) => ! preSet.has( l ) && isRenameShaped( l ) );
		const missed = humanRenameLines.filter( ( l ) => ! outSet.has( l ) );

		console.log(
			`  ${ f }: ${ changed.length } line(s) changed, ` +
				`${ changed.length - unmatched.length }/${ changed.length } matched in the human's file; ` +
				`human rename-lines reproduced ${ humanRenameLines.length - missed.length }/${ humanRenameLines.length }` +
				( out[ f ] === post[ f ] ? '  [byte-identical]' : '' )
		);
		for ( const l of unmatched ) {
			failures.push( `${ f }: produced a line the human never wrote: ${ JSON.stringify( l ) }` );
		}
		for ( const l of missed ) {
			failures.push( `${ f }: failed to reproduce the human's line: ${ JSON.stringify( l ) }` );
		}
	}

	console.log( `\n  whole-file byte-identical: ${ identical }/3` );
	console.log(
		'  (0/3 is the EXPECTED and honest number: 542e256aa bundles the rename with\n' +
			'   the Shape-B migration, four new attributes, an attribute description and a\n' +
			'   hand-written editor preview — none of which this transform does or should\n' +
			'   do. The load-bearing numbers are the two per-file ratios above.)\n'
	);
	if ( failures.length ) {
		console.log( `ORACLE FAILED (${ failures.length }):` );
		for ( const f of failures ) console.log( '  ! ' + f );
		return 1;
	}
	console.log( 'ORACLE OK — every rename edit reproduced, none invented.\n' );
	return 0;
}

// ─── Commands ───────────────────────────────────────────────────────────────

function survey( asJson ) {
	const rows = nativeFullSlugs().map( classify );
	if ( asJson ) {
		console.log( JSON.stringify( { blocks: rows }, null, 2 ) );
		return 0;
	}
	const by = ( s ) => rows.filter( ( r ) => r.status === s );
	console.log( `\nShape-B survey — ${ rows.length } NATIVE_FULL block(s)\n` );
	console.log( `  READY   ${ by( READY ).length }` );
	console.log( `  DONE    ${ by( DONE ).length }` );
	console.log( `  REFUSE  ${ by( 'REFUSE' ).length }\n` );

	const dead = rows.filter( ( r ) => /^dead-/.test( r.liveness || '' ) );
	if ( dead.length ) {
		console.log(
			`  ⚠ ${ dead.length } block(s) have a NATIVE BORDER THAT ALREADY DOES NOTHING\n` +
				'    (skipSerialization means WP does not paint it, and the block never reads it).\n' +
				'    These are the highest-value targets: migrating them is what makes the control work.'
		);
		for ( const r of dead ) {
			const kind =
				r.liveness === 'dead-inert'
					? 'no border painted at all'
					: 'paints its OWN border, ignores the client value';
			console.log( `      · sgs/${ r.slug } — ${ kind }` );
		}
		console.log( '' );
	}

	for ( const r of by( READY ) ) console.log( `  READY   sgs/${ r.slug }` );
	for ( const r of by( 'REFUSE' ) ) {
		console.log( `  REFUSE  sgs/${ r.slug } — ${ r.reason }` );
		if ( r.detail ) console.log( `             ${ r.detail }` );
	}
	console.log( '' );
	return 0;
}

function fix( apply, only ) {
	let rows = nativeFullSlugs().map( classify ).filter( ( r ) => r.status === READY );
	if ( only ) {
		const want = new Set( only.split( ',' ).map( ( s ) => s.trim().replace( /^sgs\//, '' ) ) );
		rows = rows.filter( ( r ) => want.has( r.slug ) );
	}
	if ( ! rows.length ) {
		console.log( 'nothing READY to migrate.' );
		return 0;
	}
	let applied = 0;
	let refused = 0;
	for ( const r of rows ) {
		const dir = blockDir( r.slug );
		const bjPath = path.join( dir, 'block.json' );
		const phpPath = path.join( dir, 'render.php' );
		const editPath = path.join( dir, 'edit.js' );

		const newBj = transformBlockJson( readFile( bjPath ) );
		const newPhp = transformRenderPhp( readFile( phpPath ), r.anchors.rootVar, r.anchors.cssVar );
		const newEdit = transformEditJs( readFile( editPath ) );

		// ATOMIC: all three or none. A partial write leaves the block with
		// attributes declared, native supports stripped and nothing emitting --
		// strictly worse than not touching it.
		if ( newPhp === null || newEdit === null ) {
			refused++;
			console.log(
				`  REFUSE  sgs/${ r.slug } — ` +
					( newPhp === null ? 'render.php insertion point not found' : '' ) +
					( newEdit === null ? ' edit.js mount point not found (or already mounted)' : '' )
			);
			continue;
		}
		if ( apply ) {
			fs.writeFileSync( bjPath, newBj );
			fs.writeFileSync( phpPath, newPhp );
			fs.writeFileSync( editPath, newEdit );
		}
		applied++;
		console.log( `  ${ apply ? 'MIGRATED' : 'would migrate' }  sgs/${ r.slug }` );
	}
	console.log(
		`\n${ apply ? 'applied' : 'dry run' }: ${ applied } migrated, ${ refused } refused.` +
			( apply
				? '\n⛔ NOT DONE YET: run `npm run build`, deploy, then prove each block with\n' +
				  '   node scripts/qa/check-border-roundtrip.js --blocks sgs/<slug>\n' +
				  '   A green build is not a painted border.'
				: '\n(dry run — pass --apply to write)' )
	);
	return 0;
}

/**
 * --check is a POST-APPLY invariant, deliberately.
 *
 * ⚠ It carries NO "fixable count" floor. migrate-border-control.js shipped with
 * FIXABLE_FLOOR = 6, which would have gone RED precisely because the migration
 * succeeded (applying all six makes them already-done). A guard that fails on
 * success trains people to ignore it. What is actually invariant is that no
 * block is left HALF-migrated -- that is a real defect at any count, including
 * zero.
 */
function check() {
	const problems = [];
	for ( const slug of fs.readdirSync( BLOCKS_DIR ) ) {
		const bjPath = path.join( BLOCKS_DIR, slug, 'block.json' );
		if ( ! fs.existsSync( bjPath ) ) continue;
		let bj;
		try {
			bj = readJson( bjPath );
		} catch ( e ) {
			continue;
		}
		const a = bj.attributes || {};
		const b = ( bj.supports || {} ).__experimentalBorder || {};
		const hasPrivate = Boolean( a.borderWidth || a.borderStyle || a.borderColour );
		const nativeLegs = [ b.width, b.color, b.style ].filter( ( v ) => v !== undefined ).length;

		if ( hasPrivate && nativeLegs > 0 ) {
			problems.push(
				`sgs/${ slug }: declares private border attrs AND still declares ${ nativeLegs } ` +
					'native border sub-flag(s) — two sources for one property'
			);
		}
		const phpPath = path.join( BLOCKS_DIR, slug, 'render.php' );
		if ( hasPrivate && fs.existsSync( phpPath ) ) {
			const php = readFile( phpPath );
			if ( ! /\$attributes\['border(Width|Style|Colour)'\]/.test( php ) ) {
				problems.push(
					`sgs/${ slug }: declares private border attrs but render.php never reads them — ` +
						'the control writes an attribute nothing paints (half-migrated)'
				);
			}
		}
	}
	if ( problems.length ) {
		console.log( 'CHECK FAILED — half-migrated block(s):' );
		for ( const p of problems ) console.log( '  · ' + p );
		return 1;
	}
	console.log( 'CHECK OK — no half-migrated blocks (private attrs always paired with an emitter).' );
	return 0;
}

// ─── Self-test ──────────────────────────────────────────────────────────────
function runSelfTest() {
	const failures = [];
	const ok = ( cond, msg ) => {
		if ( ! cond ) failures.push( msg );
	};

	// 1. block.json transform: supports trimmed, attrs added, attrMap repointed.
	const srcBj = JSON.stringify(
		{
			name: 'sgs/fixture',
			supports: {
				__experimentalBorder: {
					radius: true,
					width: true,
					color: true,
					style: true,
					__experimentalSkipSerialization: true,
				},
				sgs: {
					elements: {
						wrapper: {
							attrMap: {
								'css:border-width': 'native:__experimentalBorder.width',
								'css:border-style': 'native:__experimentalBorder.style',
								'css:border-color': 'native:__experimentalBorder.color',
								'css:border-radius': 'native:__experimentalBorder.radius',
							},
						},
					},
				},
			},
			attributes: { title: { type: 'string' } },
		},
		null,
		'\t'
	);
	const outBj = JSON.parse( transformBlockJson( srcBj ) );
	const b = outBj.supports.__experimentalBorder;
	ok( b.width === undefined && b.color === undefined && b.style === undefined,
		'block.json: native width/color/style sub-flags must be removed' );
	ok( b.radius === true && b.__experimentalSkipSerialization === true,
		'block.json: radius + skipSerialization must be PRESERVED (radius stays native)' );
	for ( const n of Object.keys( PRIVATE_ATTRS ) ) {
		ok( outBj.attributes[ n ] !== undefined, `block.json: ${ n } attribute must be added` );
	}
	ok( outBj.attributes.borderStyle.enum.length === 9,
		'block.json: borderStyle must carry the 9-value enum' );
	ok( outBj.attributes.borderStyle.default === 'none',
		'block.json: borderStyle must default to none' );
	ok( outBj.attributes.title !== undefined,
		'block.json: pre-existing attributes must survive the transform' );
	const m = outBj.supports.sgs.elements.wrapper.attrMap;
	ok( m[ 'css:border-width' ] === 'borderWidth', 'attrMap: width leg must repoint off native:' );
	ok( m[ 'css:border-style' ] === 'borderStyle', 'attrMap: style leg must repoint off native:' );
	ok( m[ 'css:border-color' ] === 'borderColour', 'attrMap: colour leg must repoint off native:' );
	ok( m[ 'css:border-color-gradient' ] === 'borderColourGradient',
		'attrMap: gradient key must be ADDED' );
	// NEGATIVE CONTROL — radius must NOT be repointed. Radius stays native, and
	// repointing it would make the DB describe an attribute that does not exist.
	ok( m[ 'css:border-radius' ] === 'native:__experimentalBorder.radius',
		'attrMap NEGATIVE CONTROL: radius must STAY native: (it is not part of Shape B)' );

	// 2. render.php emission must carry the two rules the live probe checks.
	const em = renderPhpEmission( 'root_sel', 'my_css' );
	ok( /\$my_css \.=/.test( em ), 'emission must append to the detected accumulator' );
	ok( /\$root_sel/.test( em ), 'emission must scope to the detected root selector' );
	ok( /sgs_colour_value\(/.test( em ),
		'emission must resolve a palette SLUG (a bare slug is invalid CSS — D881 defect 3)' );
	ok( /border-color:/.test( em ),
		'emission must set border-color DIRECTLY for a flat colour' );
	// NEGATIVE CONTROL — the defect this codemod exists to avoid cloning.
	// Comments are stripped first: the emission deliberately NAMES the helper in
	// a comment explaining why it is not used, and a raw substring test would
	// match that prose and fail on correct output. Assert on CODE, not on text.
	const emCode = em.replace( /^\s*\/\/.*$/gm, '' );
	ok( ! /sgs_border_states_css\s*\(/.test( emCode ),
		'emission NEGATIVE CONTROL: must NOT call sgs_border_states_css() — it paints ' +
			'border-color:transparent (measured on sgs/product-card + sgs/container)' );
	// ...and prove that stripper cannot vacuously pass by removing everything:
	// the real emission must still be present after comment removal.
	ok( /border-color:/.test( emCode ) && /\$my_css \.=/.test( emCode ),
		'emission NEGATIVE CONTROL is not vacuous: real code survives comment-stripping' );
	ok( /if \( \$has_border_width \)/.test( em ),
		'emission must G5-gate: border-style only alongside a real width' );

	// 3. stripNativeBorderReads must remove the dead legs and KEEP radius.
	const php = [
		"$border_args = array();",
		"if ( isset( $attributes['style']['border']['color'] ) ) {",
		"\t$border_args['color'] = $attributes['style']['border']['color'];",
		'}',
		"if ( isset( $attributes['style']['border']['radius'] ) ) {",
		"\t$border_args['radius'] = $attributes['style']['border']['radius'];",
		'}',
	].join( '\n' );
	const strippedOut = stripNativeBorderReads( php );
	ok( ! /\['border'\]\['color'\]/.test( strippedOut.text ),
		'strip: the native COLOUR read must be removed' );
	// NEGATIVE CONTROL — over-strip guard.
	ok( /\['border'\]\['radius'\]/.test( strippedOut.text ),
		'strip NEGATIVE CONTROL: the native RADIUS read must SURVIVE (radius stays native)' );

	// 4. Anchor detection must reject an HTML accumulator.
	const htmlOnly = "$root_sel = '.x'; $logos_html .= '<div>' . $x . '</div>';";
	ok( findAnchors( htmlOnly ).cssVar === null,
		'anchors NEGATIVE CONTROL: an HTML accumulator ($logos_html) must NOT be chosen as the CSS sink' );
	const cssOne = "$root_sel = '.x'; $responsive_css .= $root_sel . '{color:red;}';";
	ok( findAnchors( cssOne ).cssVar === 'responsive_css',
		'anchors: a genuine CSS accumulator must be detected' );

	// 5. The reserved-`style` shadow detector — the accordion/pricing-table class.
	ok( reservedStyleAttr( { attributes: { style: { type: 'string', default: 'card' } },
		supports: { __experimentalBorder: {} } } ).costly === true,
		'shadow detector: a string `style` attr on a block WITH style supports is costly' );
	// NEGATIVE CONTROL — no style attribute at all must not be flagged.
	ok( reservedStyleAttr( { attributes: { title: {} }, supports: {} } ) === null,
		'shadow detector NEGATIVE CONTROL: a block with no `style` attribute must not be flagged' );
	// NEGATIVE CONTROL — the harmless variant (sgs/mega-panel): a `style` attr on
	// a block declaring NO style supports costs nothing and must not be costly.
	ok( reservedStyleAttr( { attributes: { style: { type: 'string' } }, supports: {} } ).costly === false,
		'shadow detector NEGATIVE CONTROL: a `style` attr with no style supports must be non-costly' );

	// 6. Liveness classifier must separate the two dead sub-states.
	const skipBj = { supports: { __experimentalBorder: { __experimentalSkipSerialization: true } } };
	ok( nativeBorderLiveness( skipBj, "$attributes['style']['border']" ) === 'live',
		'liveness: a block that READS the native border is live' );
	ok( nativeBorderLiveness( skipBj, 'echo "hi";' ) === 'dead-inert',
		'liveness: no read and no paint is dead-inert' );
	ok( nativeBorderLiveness( skipBj, 'border-width: 2px;' ) === 'dead-own-design',
		'liveness: paints its own border but ignores the client value is dead-own-design' );

	// 7. Reserved-`style` RENAME. Name derivation.
	//
	// ⚠ The fixture DELIBERATELY does not use accordion. For accordion the two
	// branches AGREE — the context key is `sgs/accordionStyle` and the slug
	// fallback is also `accordionStyle` — so accordion cannot tell them apart,
	// and neither can the --oracle replay. A mutation that disables the
	// context-key branch entirely escaped both until this fixture was changed to
	// a slug where the branches DIFFER. Keep it that way.
	ok( chooseReservedStyleName(
		{ providesContext: { 'sgs/panelStyle': 'style' } }, 'mega-panel' ).name === 'panelStyle',
		'rename: a context key bound to `style` supplies the new name, and WINS over the ' +
			'slug fallback (which would say megaPanelStyle)' );
	ok( chooseReservedStyleName( {}, 'pricing-table' ).name === 'pricingTableStyle',
		'rename: with no context key, fall back to <camelCasedSlug>Style' );
	// NEGATIVE CONTROL — a context key bound to something ELSE must not be adopted.
	ok( chooseReservedStyleName(
		{ providesContext: { 'sgs/accordionIconPosition': 'iconPosition' } }, 'accordion' ).name
		=== 'accordionStyle',
		'rename NEGATIVE CONTROL: a context key bound to another attribute must not supply the name' );

	// 8. block.json rename — the three real positions, and the three decoys.
	// The decoys are the whole reason this is text surgery over a string-aware
	// member walk rather than a `.replace( '"style"', … )`: every one of them is
	// the literal token `"style"` in a role that must NOT move.
	const renameSrc = [
		'{',
		'\t"name": "sgs/fixture",',
		'\t"supports": {',
		'\t\t"__experimentalBorder": { "radius": true, "style": true },',
		'\t\t"sgs": { "elements": { "wrapper": {',
		'\t\t\t"attrMap": { "css:border-style": "native:__experimentalBorder.style" },',
		'\t\t\t"_note": "ctaStyle is a variant field, not an independent style control."',
		'\t\t} } }',
		'\t},',
		'\t"attributes": {',
		'\t\t"style": {',
		'\t\t\t"type": "string",',
		'\t\t\t"default": "card"',
		'\t\t},',
		'\t\t"ctaStyle": { "type": "string" }',
		'\t},',
		'\t"providesContext": {',
		'\t\t"sgs/fixtureStyle": "style"',
		'\t},',
		'\t"style": "file:./style-index.css",',
		'\t"example": { "attributes": { "style": "card", "columns": 3 } }',
		'}',
	].join( '\n' );
	const renamed = renameStyleBlockJson( renameSrc, 'fixtureStyle' );
	ok( renamed.hits === 3, `block.json rename: expected 3 edits, got ${ renamed.hits }` );
	ok( /"attributes": \{\n\t\t"fixtureStyle": \{/.test( renamed.text ),
		'block.json rename: the attribute declaration key must be renamed' );
	ok( /"sgs\/fixtureStyle": "fixtureStyle"/.test( renamed.text ),
		'block.json rename: the providesContext VALUE must be repointed (key unchanged)' );
	ok( /"example": \{ "attributes": \{ "fixtureStyle": "card"/.test( renamed.text ),
		'block.json rename: example.attributes must be renamed or the preview shows the default' );
	// NEGATIVE CONTROLS — three decoys spelled exactly `"style"` that must survive.
	ok( /"style": "file:\.\/style-index\.css"/.test( renamed.text ),
		'block.json rename NEGATIVE CONTROL: the top-level stylesheet declaration must survive' );
	ok( /"__experimentalBorder": \{ "radius": true, "style": true \}/.test( renamed.text ),
		'block.json rename NEGATIVE CONTROL: supports.__experimentalBorder.style must survive' );
	ok( /"native:__experimentalBorder\.style"/.test( renamed.text ),
		'block.json rename NEGATIVE CONTROL: a `native:` attrMap string must survive' );
	ok( /not an independent style control/.test( renamed.text ),
		'block.json rename NEGATIVE CONTROL: the word "style" inside prose must survive' );
	ok( /"ctaStyle": \{ "type": "string" \}/.test( renamed.text ),
		'block.json rename NEGATIVE CONTROL: a sibling *Style attribute must survive' );
	// NEGATIVE CONTROL — a block with NO `style` attribute must come back untouched.
	const noStyle = '{\n\t"attributes": { "title": { "type": "string" } },\n\t"style": "file:./s.css"\n}';
	const noStyleOut = renameStyleBlockJson( noStyle, 'fixtureStyle' );
	ok( noStyleOut.hits === 0 && noStyleOut.text === noStyle,
		'block.json rename NEGATIVE CONTROL: a block with no `style` ATTRIBUTE must be byte-untouched' );

	// 9. edit.js rename.
	const editSrc = [
		'const {',
		'  columns,',
		'  style,',
		'  ctaStyle,',
		'} = attributes;',
		'const cls = `sgs-x--${ style }`;',
		'<div style={ { margin: 0 } } />',
		'onChange={ ( val ) => setAttributes( { style: val } ) }',
		'onChange={ ( next ) => setAttributes( { style: { ...attributes.style, spacing: next } } ) }',
	].join( '\n' );
	const editOut = renameStyleEditJs( editSrc, 'xStyle' );
	ok( /^  xStyle: style,$/m.test( editOut.text ),
		'edit.js rename: an un-aliased destructure keeps `style` as the LOCAL name (no downstream edits)' );
	ok( /setAttributes\( \{ xStyle: val \} \)/.test( editOut.text ),
		'edit.js rename: a SCALAR setAttributes write must be renamed' );
	// NEGATIVE CONTROLS — the two things that legitimately mean WP's reserved object.
	ok( /setAttributes\( \{ style: \{ \.\.\.attributes\.style, spacing: next \} \} \)/.test( editOut.text ),
		'edit.js rename NEGATIVE CONTROL: an OBJECT setAttributes write is WP\'s reserved ' +
			'style and must NOT be renamed (this is the bug the accordion oracle caught)' );
	ok( /<div style=\{ \{ margin: 0 \} \} \/>/.test( editOut.text ),
		'edit.js rename NEGATIVE CONTROL: a JSX style prop must survive' );
	ok( /const cls = `sgs-x--\$\{ style \}`;/.test( editOut.text ),
		'edit.js rename NEGATIVE CONTROL: downstream reads of the local `style` must survive untouched' );
	ok( /^  ctaStyle,$/m.test( editOut.text ),
		'edit.js rename NEGATIVE CONTROL: a sibling *Style destructure member must survive' );
	// The alias-collapse branch — the shape the accordion actually had.
	const aliased = renameStyleEditJs( 'const {\n  style: xStyle,\n} = attributes;', 'xStyle' );
	ok( /^  xStyle,$/m.test( aliased.text ),
		'edit.js rename: an alias that already equals the new name collapses (accordion\'s shape)' );

	// 10. render.php rename.
	const phpSrc = [
		'/**',
		" * The resolved values are read from $attributes['style'] here.",
		' */',
		"$style = sanitize_key( $attributes['style'] ?? 'card' );",
		"if ( isset( $attributes['style']['border']['radius'] ) ) { $r = 1; }",
		"$t = $attributes['style']['typography']['fontSize'] ?? '';",
	].join( '\n' );
	const phpOut = renameStyleRenderPhp( phpSrc, 'xStyle' );
	ok( phpOut.hits === 1, `render.php rename: expected exactly 1 edit, got ${ phpOut.hits }` );
	ok( /\$style = sanitize_key\( \$attributes\['xStyle'\] \?\? 'card' \);/.test( phpOut.text ),
		'render.php rename: the SCALAR read must be renamed' );
	// NEGATIVE CONTROLS — the reserved-object reads are what the rename un-breaks.
	ok( /\$attributes\['style'\]\['border'\]\['radius'\]/.test( phpOut.text ),
		'render.php rename NEGATIVE CONTROL: a native BORDER read must survive (radius stays native)' );
	ok( /\$attributes\['style'\]\['typography'\]\['fontSize'\]/.test( phpOut.text ),
		'render.php rename NEGATIVE CONTROL: a native TYPOGRAPHY read must survive' );
	ok( / \* The resolved values are read from \$attributes\['style'\] here\./.test( phpOut.text ),
		'render.php rename NEGATIVE CONTROL: a comment discussing the reserved object must survive' );

	// 11. INSERTION POINT. Both hazards below were measured on sgs/pricing-table,
	// not imagined, and both ship a block whose border can never paint while
	// `php -l` stays green.
	const insertSrc = [
		"$root_sel = '.x';",
		'// Responsive/scoped CSS accumulator — populated below',
		'// and flushed into a single <style id="uid"> tag before the wrapper echo.',
		"$responsive_css = '';",
		"$responsive_css .= $root_sel . '{color:red;}';",
		"printf( '<style id=\"%s\">%s</style>', $uid, $responsive_css );",
	].join( '\n' );
	const insertAt = findConsumptionLineStart( insertSrc, 'responsive_css' );
	ok( insertSrc.slice( insertAt ).startsWith( 'printf(' ),
		'insertion: the emission goes immediately before the REAL consumption' );
	// NEGATIVE CONTROL — the exact defect. The word `echo` in the prose comment on
	// line 3, followed across the newline by `$responsive_css` on line 4, matched
	// the old unmasked regex and put the emission ABOVE the initialiser, which
	// then assigned '' over it.
	ok( insertAt > insertSrc.indexOf( "$responsive_css = '';" ),
		'insertion NEGATIVE CONTROL: never insert above the accumulator initialiser — ' +
			"prose ending `… wrapper echo.` must not be mistaken for a consumption" );
	// NEGATIVE CONTROL — and prove that check is not vacuous: the trap line must
	// actually still be present in the fixture, or it proves nothing.
	ok( /wrapper echo\.$/m.test( insertSrc ),
		'insertion NEGATIVE CONTROL is not vacuous: the prose trap line is present in the fixture' );
	ok( findConsumptionLineStart( "$responsive_css = '';", 'responsive_css' ) === -1,
		'insertion: a file that never consumes the accumulator returns -1 (the block is REFUSED)' );
	// A GUARDED consumption — sgs/pricing-table's real shape. The emission must
	// go OUTSIDE the guard.
	const guardedSrc = [
		"$root_sel = '.x';",
		"$responsive_css = '';",
		"$responsive_css .= $root_sel . '{color:red;}';",
		'if ( $responsive_css ) {',
		"\tprintf( '<style>%s</style>', $responsive_css );",
		'}',
	].join( '\n' );
	const guardedAt = findConsumptionLineStart( guardedSrc, 'responsive_css' );
	ok( guardedSrc.slice( guardedAt ).startsWith( 'if ( $responsive_css ) {' ),
		'insertion: a GUARDED consumption inserts before the guard, at top level' );
	// NEGATIVE CONTROL — inside the guard the appends never run for a
	// border-only configuration: the accumulator is empty when the guard is
	// evaluated, so the branch is skipped and the border silently never paints.
	ok( ! guardedSrc.slice( guardedAt ).startsWith( "\tprintf(" ),
		'insertion NEGATIVE CONTROL: the emission must NOT land inside `if ( $css ) { … }` — ' +
			'a border-only configuration would emit nothing at all' );

	// 12b. edit.js IMPORT INJECTION must not re-declare an existing binding.
	const editImp = transformEditJs(
		"import { SgsColourPanel, resolveColourToken } from '../../components';\n" +
			'export default function Edit() {\n\treturn <><InspectorControls>\n\t\t\t</InspectorControls></>;\n}\n'
	);
	const importedNames = editImp.match( /import \{([\s\S]*?)\} from/ )[ 1 ];
	ok( ( importedNames.match( /\bresolveColourToken\b/g ) || [] ).length === 1,
		'edit.js import: a name the file ALREADY imports must not be injected again — ' +
			'a duplicate ES module binding is a hard SyntaxError that fails `npm run build`' );
	ok( /\bSgsBorderControl\b/.test( importedNames ),
		'edit.js import: the genuinely missing name IS injected' );
	// NEGATIVE CONTROL — proves the de-dupe is not just dropping everything.
	const editImp2 = transformEditJs(
		"import { SgsColourPanel } from '../../components';\n" +
			'export default function Edit() {\n\treturn <><InspectorControls>\n\t\t\t</InspectorControls></>;\n}\n'
	);
	const names2 = editImp2.match( /import \{([\s\S]*?)\} from/ )[ 1 ];
	ok( ( names2.match( /\bresolveColourToken\b/g ) || [] ).length === 1,
		'edit.js import NEGATIVE CONTROL: when the name is ABSENT it must still be added exactly once' );
	ok( /^\t\t\t<\/InspectorControls>/m.test( editImp ),
		'edit.js mount: the closing </InspectorControls> keeps its own indentation' );

	// 12. ORPHANED-VARIABLE SWEEP. Removing an assignment must remove its readers.
	const orphanSrc = [
		'$pt_border_args = array();',
		"$pt_border_style_width = sgs_native_border_style_width_args( $attributes['style']['border']['style'] ?? null, null );",
		"if ( isset( $pt_border_style_width['width'] ) ) {",
		"\t$pt_border_args['width'] = $pt_border_style_width['width'];",
		'}',
		'$keep_me = 1;',
		'if ( isset( $keep_me ) ) {',
		"\t$pt_border_args['radius'] = $attributes['style']['border']['radius'];",
		'}',
	].join( '\n' );
	const orphanOut = stripNativeBorderReads( orphanSrc );
	ok( orphanOut.orphaned.includes( 'pt_border_style_width' ),
		'strip: a variable assigned on a removed line is recorded as orphaned' );
	ok( ! /\$pt_border_style_width/.test( orphanOut.text ),
		'strip: the ORPHANED READS must be removed too — an assignment deleted with its ' +
			'readers left behind is an undefined variable that php -l reports as clean' );
	// NEGATIVE CONTROLS — the sweep must not become a general-purpose deleter.
	ok( /\$keep_me = 1;/.test( orphanOut.text ),
		'strip NEGATIVE CONTROL: a variable that was NOT orphaned must survive' );
	ok( /\$attributes\['style'\]\['border'\]\['radius'\]/.test( orphanOut.text ),
		'strip NEGATIVE CONTROL: the native RADIUS read must still survive the second pass' );
	ok( /\$pt_border_args = array\(\);/.test( orphanOut.text ),
		'strip NEGATIVE CONTROL: the accumulator the removed code fed must survive' );
	// NEGATIVE CONTROL — nothing to strip means nothing is touched.
	const untouched = 'echo "hi";\n$x = 1;';
	ok( stripNativeBorderReads( untouched ).text === untouched &&
		stripNativeBorderReads( untouched ).orphaned.length === 0,
		'strip NEGATIVE CONTROL: a file with no native border reads is byte-untouched' );

	if ( failures.length ) {
		console.log( `SELF-TEST FAILED (${ failures.length }):` );
		for ( const f of failures ) console.log( '  ! ' + f );
		return 1;
	}
	// Counted from the source, never hardcoded: a literal count is a claim that
	// silently goes false the moment anyone adds or deletes an assertion.
	const selfTestSrc = fs.readFileSync( __filename, 'utf8' );
	const body = selfTestSrc.slice( selfTestSrc.indexOf( 'function runSelfTest' ) );
	// Split on the assertion boundary and count PER ASSERTION. A bare
	// `body.match( /NEGATIVE CONTROL/g )` over the whole function double-counts:
	// most of these assertions name the phrase in their explanatory comment AND
	// again in their failure message, which reported 32 negative controls where
	// there are 20. An inflated count is exactly the kind of confidently-wrong
	// number this codemod's own gates exist to refuse.
	// ...and each chunk is truncated before the NEXT statement or comment, because
	// the comment INTRODUCING assertion N+1 sits at the tail of chunk N and would
	// otherwise be attributed to N. Uncorrected that reported 29; the true figure
	// is 21.
	const chunks = body
		.split( /\n\tok\(/ )
		.slice( 1 )
		.map( ( c ) => c.split( /\n\t(?:\/\/|\/\*|const |let |console|if \(|return )/ )[ 0 ] );
	const total = chunks.length;
	const negs = chunks.filter( ( c ) => c.includes( 'NEGATIVE CONTROL' ) ).length;
	console.log( `SELF-TEST OK — ${ total } assertions passed (${ negs } of them negative controls).` );
	return 0;
}

// ─── Entry ──────────────────────────────────────────────────────────────────
// Guarded so `require()`ing this file for out-of-process validation does not run
// the CLI (and, worse, call process.exit) as an import side effect.
if ( require.main === module ) {
	const argv = process.argv.slice( 2 );
	const onlyArg = ( () => {
		const i = argv.indexOf( '--only' );
		return i !== -1 ? argv[ i + 1 ] : null;
	} )();

	if ( argv.includes( '--self-test' ) ) process.exit( runSelfTest() );
	if ( argv.includes( '--check' ) ) process.exit( check() );
	if ( argv.includes( '--survey' ) ) process.exit( survey( argv.includes( '--json' ) ) );
	if ( argv.includes( '--oracle' ) ) process.exit( oracleReplay() );
	if ( argv.includes( '--rename-reserved-style' ) )
		process.exit( renameReservedStyle( argv.includes( '--apply' ), onlyArg ) );
	if ( argv.includes( '--fix' ) ) process.exit( fix( argv.includes( '--apply' ), onlyArg ) );

	console.log(
		'Usage: node migrate-border-shape-b.js --survey [--json] | --fix [--apply] [--only <slug>]\n' +
			'       | --rename-reserved-style [--apply] [--only <slug>] | --oracle | --check | --self-test'
	);
	process.exit( 0 );
}

// Exported for out-of-process validation (a harness can run the transforms
// against real block files IN MEMORY, proving end-to-end output without
// writing to the tree). Not used by the CLI paths above.
module.exports = {
	transformBlockJson,
	transformRenderPhp,
	transformEditJs,
	findAnchors,
	classify,
	stripNativeBorderReads,
	renderPhpEmission,
	reservedStyleAttr,
	nativeBorderLiveness,
	chooseReservedStyleName,
	renameStyleBlockJson,
	renameStyleEditJs,
	renameStyleRenderPhp,
	planReservedStyleRename,
	findConsumptionLineStart,
};
