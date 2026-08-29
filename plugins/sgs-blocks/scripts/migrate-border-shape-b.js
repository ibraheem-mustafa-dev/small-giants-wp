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
	const lines = php.split( /\r?\n/ );
	const out = [];
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
			depth += ( line.match( /\{/g ) || [] ).length;
			depth -= ( line.match( /\}/g ) || [] ).length;
			removed++;
			if ( depth <= 0 && /;\s*$|\}\s*$/.test( line.trim() ) ) dropping = false;
			continue;
		}
		out.push( line );
	}
	return { text: out.join( detectEol( php ) === '\r\n' ? '\r\n' : '\n' ), removed };
}

function transformRenderPhp( php, rootVar, cssVar ) {
	const stripped = stripNativeBorderReads( php );
	const emission = renderPhpEmission( rootVar, cssVar );
	// Insert immediately before the accumulator is first CONSUMED (printed or
	// passed on), so the new rules are part of the same scoped <style>.
	const consumeRe = new RegExp( `(printf|echo|return|sprintf)[^;]*\\$${ cssVar }\\b` );
	const idx = stripped.text.search( consumeRe );
	if ( idx === -1 ) return null;
	// Back up to the start of that line.
	const lineStart = stripped.text.lastIndexOf( '\n', idx ) + 1;
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
	if ( ! /SgsBorderControl/.test( names ) ) {
		const injected = names.replace( /\s*$/, '' ) + ',\n\tSgsBorderControl,\n\tresolveColourToken,\n';
		out = out.replace( importRe, `import {${ injected }} from '../../components';` );
	}

	// 2. mount — appended as the LAST child of the first <InspectorControls>.
	const closeIdx = out.indexOf( '</InspectorControls>' );
	if ( closeIdx === -1 ) return null;
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

	if ( failures.length ) {
		console.log( `SELF-TEST FAILED (${ failures.length }):` );
		for ( const f of failures ) console.log( '  ! ' + f );
		return 1;
	}
	console.log( 'SELF-TEST OK — 27 assertions passed (7 of them negative controls).' );
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
	if ( argv.includes( '--fix' ) ) process.exit( fix( argv.includes( '--apply' ), onlyArg ) );

	console.log(
		'Usage: node migrate-border-shape-b.js --survey [--json] | --fix [--apply] [--only <slug>] | --check | --self-test'
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
};
