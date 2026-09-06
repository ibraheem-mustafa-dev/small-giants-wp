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
 *   1. block.json  — supports.__experimentalBorder REMOVED ENTIRELY (not
 *                    trimmed); seven private attrs added (borderWidth/Style/
 *                    Colour/ColourGradient + borderRadius/Tablet/Mobile); the
 *                    elements attrMap repointed off `native:` on all four legs.
 *   2. render.php  — the dead native border reads removed (width/style/colour
 *                    AND radius); a G5-gated private emission added (style
 *                    only alongside a real width) plus radius painted via
 *                    wp_style_engine_get_styles() at base + both tiers.
 *   3. edit.js     — SgsBorderControl imported + mounted with the radius pair
 *                    wired (onRadiusChange), plus a canvas preview (without it
 *                    the seven new attrs are net-new CHECK A findings).
 *
 * ⚠ RADIUS TARGET-SHAPE CORRECTION (2026-08-30, Bean): radius was originally
 * left permanently native ({ radius: true, __experimentalSkipSerialization:
 * true }) -- that was WRONG. Bean's actual standard is to take a native
 * control's exact UI, wrap it, and make it a shared helper used across the
 * library; that wrapper (`ResponsiveBorderRadiusControl`) already exists and
 * is already the second control of `SgsBorderControl`'s pair (rendered only
 * when the caller wires `onRadiusChange`). So the end state has NO
 * __experimentalBorder support at all -- radius is block-private too, same as
 * the other three legs. 12+ blocks (sgs/button, sgs/media, sgs/timeline,
 * sgs/before-after, ...) already declare `borderRadiusTablet`/
 * `borderRadiusMobile` as private corner objects predating this codemod --
 * `reconcileRadiusAttrs()` ADOPTS those rather than colliding on them (checked
 * against the full corner-key SHAPE, not just `type === 'object'` -- a looser
 * check would adopt an object-typed attr that isn't actually a corner family),
 * and only refuses when an existing attr means something different (sgs/mega-
 * panel's `borderRadius` is a scalar CSS-length string; sgs/label's is
 * `['string','number']`).
 *
 * ⚠ KNOWN GAP, NOT FIXED HERE: the theme-authored-border pattern-rewrite
 * subsystem below (`splitAuthoredBorder` / `planPatternBorderMigration` /
 * `rewritePatternAttrJson`) still treats radius as "keep, not at risk" --
 * `SHAPE_B_LEGS` is unchanged (`['width','style','color']`). That was correct
 * while radius stayed native; now that this codemod also strips the native
 * radius READ, an authored theme/site radius on a migrated block would go
 * unread. Verified EMPIRICALLY (2026-08-30) that this affects ZERO of the
 * current 32 READY blocks -- no theme/site pattern authors a radius value
 * alongside an at-risk width/colour/style on any NATIVE_FULL block today.
 * Left as an open follow-up rather than expanding this pass into the pattern-
 * rewrite engine's per-side/per-corner value shapes, which is a materially
 * different (and already heavily self-tested) problem.
 *
 * Because a partial application leaves a block WORSE than untouched (attributes
 * declared, native supports stripped, nothing emitting), --fix is ATOMIC PER
 * BLOCK: a block is either fully transformed or refused untouched. There is no
 * partial write.
 *
 * COLLISION RECONCILIATION (2026-08-29). A block already declaring one of the
 * four names is not automatically a conflict. sgs/hero and sgs/info-box both
 * declare `borderColourGradient` meaning EXACTLY what Shape B means by it, and
 * both were being refused for it. Such an attribute is now ADOPTED — kept
 * verbatim, not re-added — and its superseded standalone emission is excised so
 * exactly one painter survives. Reconciliation requires all three of: string/''
 * shape, a wrapper-element `css:border-color-gradient` binding, and a
 * sgs_border_gradient_css() call on the same root selector. Anything else still
 * REFUSES. See reconcileCollision().
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
	// DEFAULT 'solid', not 'none' (Bean, 2026-08-30): "none isn't a style, and
	// that is usually set through putting thickness at 0 — there's no point in
	// having an invisible border." Defaulting to 'none' created a whole defect
	// class: a width and a colour that paint nothing. Absence of a border is now
	// expressed by absence of WIDTH, which the G5 rule already enforces.
	// 'none' STAYS in the enum — WP coerces an out-of-enum value to the default,
	// so removing it would silently rewrite every stored "none" to "solid" and
	// switch borders on across live content.
	borderStyle: { type: 'string', enum: BORDER_STYLE_ENUM, default: 'solid' },
	borderColour: { type: 'string', default: '' },
	borderColourGradient: {
		type: 'string',
		default: '',
		description:
			'CSS gradient string painting the border with a masked ring instead of a flat colour ' +
			'(D636 border-gradient rollout). Non-empty wins over borderColour.',
	},
};

// ─── Radius is now part of Shape B too (target-shape correction, 2026-08-30). ──
// Radius was originally left native ({ radius: true, __experimentalSkipSerialization:
// true }) on the theory that it is a permanent WP-native leftover. Bean's actual
// standard: take the native control's exact UI, wrap it (ResponsiveBorderRadiusControl
// already exists for this, exported from components/ResponsiveBoxControl.js), and make
// it a shared helper used across the library -- so the end state has NO
// __experimentalBorder support at all. These are corner OBJECTS
// ({ topLeft, topRight, bottomLeft, bottomRight }), matching the shape
// `wp_style_engine_get_styles( array( 'border' => array( 'radius' => $obj ) ) )`
// expects -- verified against the ALREADY-SHIPPED sgs/media + sgs/before-after
// borderRadiusTablet/borderRadiusMobile private attrs, which use this exact shape.
const RADIUS_CORNERS = [ 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ];
const RADIUS_ATTRS = {
	borderRadius: { type: 'object', default: {} },
	borderRadiusTablet: { type: 'object', default: {} },
	borderRadiusMobile: { type: 'object', default: {} },
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

// ─── Authored-border analysis ───────────────────────────────────────────────
// Shape B removes exactly three legs: width / style / colour. RADIUS IS NOT ONE
// OF THEM -- it stays native (`{ radius: true }` survives transformBlockJson).
// So a radius-only authored border is NOT at risk and must never be refused.
const SHAPE_B_LEGS = [ 'width', 'style', 'color' ];
const BORDER_SIDES = [ 'top', 'right', 'bottom', 'left' ];

/**
 * Decompose an authored `style.border` object into the legs Shape B removes and
 * the legs it leaves alone.
 *
 * Handles BOTH authored shapes, because the theme uses both:
 *   · flat     -- {"width":"2px","color":"var:preset|color|primary","radius":"12px"}
 *   · per-side -- {"top":{"color":"var:preset|color|border","width":"1px"}}
 *
 * @param {*} border The decoded style.border value.
 * @return {{atRisk:Object, sides:Object, keep:Object, hasRisk:boolean}} Split.
 */
function splitAuthoredBorder( border ) {
	const atRisk = {};
	const sides = {};
	const keep = {};
	if ( ! border || typeof border !== 'object' || Array.isArray( border ) ) {
		return { atRisk, sides, keep, hasRisk: false };
	}
	for ( const [ key, val ] of Object.entries( border ) ) {
		if ( SHAPE_B_LEGS.includes( key ) ) {
			if ( val !== undefined && val !== null && val !== '' ) atRisk[ key ] = val;
			continue;
		}
		if ( BORDER_SIDES.includes( key ) && val && typeof val === 'object' ) {
			const legs = {};
			const sideKeep = {};
			for ( const [ k, v ] of Object.entries( val ) ) {
				if ( SHAPE_B_LEGS.includes( k ) ) {
					if ( v !== undefined && v !== null && v !== '' ) legs[ k ] = v;
				} else {
					sideKeep[ k ] = v;
				}
			}
			if ( Object.keys( legs ).length ) sides[ key ] = legs;
			if ( Object.keys( sideKeep ).length ) keep[ key ] = sideKeep;
			continue;
		}
		// radius, and anything else Shape B does not touch.
		keep[ key ] = val;
	}
	const hasRisk = Object.keys( atRisk ).length > 0 || Object.keys( sides ).length > 0;
	return { atRisk, sides, keep, hasRisk };
}

/**
 * Convert a WP pattern-file colour token to what `borderColour` must STORE.
 *
 * `var:preset|color|border` is WP's pattern-file serialisation, NOT a value the
 * SGS resolver understands. Measured with the real helper (php
 * sgs_colour_value): storing the token verbatim yields
 * `var(--wp--preset--color--varpresetcolorborder)` -- the slug sanitiser eats
 * the punctuation and the browser drops the rule (D881 defect 3). Storing the
 * BARE SLUG yields `var(--wp--preset--color--border)`, which is byte-identical
 * to what WP's own style engine emits for the token. So: strip the prefix.
 *
 * @param {string} value Authored colour value.
 * @return {string} Value to store in the private `borderColour` attribute.
 */
function patternColourToAttr( value ) {
	const v = String( value == null ? '' : value ).trim();
	const m = v.match( /^var:preset\|color\|(.+)$/ );
	return m ? m[ 1 ] : v;
}

/**
 * D683 blind spot: check-dead-pattern-attrs.py asks whether the support KEY is
 * declared, not whether its SUB-FLAGS are on. So it cannot tell you that a theme
 * pattern authors a border WIDTH on a block whose width flag you are about to
 * remove. Scan the authored markup for a border on this block.
 *
 * ⚠ NARROWED 2026-08-29 (qc-council). The previous test was the regex
 * `/"border"\s*:/` over the raw attribute JSON, which is wrong in BOTH
 * directions:
 *   · OVER-matches -- it refused sgs/media for
 *     `"style":{"border":{"radius":"16px"}}`. Radius stays NATIVE under Shape B,
 *     so that value is not at risk at all. Measured false positive.
 *   · UNDER-matches -- it only ever walked theme/, and it could not distinguish
 *     an at-risk leg from a safe one, so its output could not drive a migration.
 * The test is now a real JSON parse plus a leg-level split, and the scan covers
 * sites/ as well as theme/.
 *
 * @param {string} slug Block slug without the `sgs/` namespace.
 * @return {Array<Object>} One entry per authored at-risk border occurrence.
 */
function authoredBorderScanDirs() {
	return [ THEME_DIR, path.join( ROOT, 'sites' ) ].filter( ( d ) => fs.existsSync( d ) );
}

function themeAuthoredBorder( slug ) {
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
				if ( /^(node_modules|vendor|build|\.git)$/.test( ent.name ) ) continue;
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
			const re = new RegExp( `wp:sgs/${ slug }\\s+(\\{[\\s\\S]*?\\})\\s*/?-->`, 'g' );
			let m;
			while ( ( m = re.exec( text ) ) !== null ) {
				const raw = m[ 1 ];
				let attrs;
				try {
					attrs = JSON.parse( raw );
				} catch ( e ) {
					// Unparseable attribute JSON is itself a hazard: we cannot prove
					// the border is radius-only, so treat it as at-risk.
					hits.push( {
						file: p,
						rel: path.relative( ROOT, p ),
						raw,
						index: m.index,
						unparseable: true,
					} );
					continue;
				}
				// An already-migrated pattern carries the private attrs; that is
				// not a hazard, it is the destination state.
				const hasPrivate =
					attrs.borderWidth !== undefined ||
					attrs.borderStyle !== undefined ||
					attrs.borderColour !== undefined;
				const split = splitAuthoredBorder( ( attrs.style || {} ).border );
				if ( ! split.hasRisk ) continue;
				hits.push( {
					file: p,
					rel: path.relative( ROOT, p ),
					raw,
					index: m.index,
					attrs,
					split,
					hasPrivate,
				} );
			}
		}
	};
	authoredBorderScanDirs().forEach( walk );
	return hits;
}

// ─── Pattern-markup migration ───────────────────────────────────────────────

/**
 * Plan the rewrite of ONE authored border into the three private attributes.
 *
 * ⚠ THE SHAPE MISMATCH, STATED HONESTLY. The authored value is per-side WITH A
 * PER-SIDE COLOUR and a per-side style. The private attrs are:
 *   · borderWidth  -- OBJECT  {top,right,bottom,left}  -> per-side, LOSSLESS
 *   · borderStyle  -- STRING  (one value for all sides) -> NOT per-side
 *   · borderColour -- STRING  (one value for all sides) -> NOT per-side
 * So a border whose sides carry DIFFERENT colours (or different styles) CANNOT
 * be expressed. This planner REFUSES that case rather than flattening it and
 * silently losing the design.
 *
 * Where only one side carries a width, a single colour IS behaviourally
 * lossless: the emission writes `border-width: <top> <right> <bottom> <left>`
 * with '0' for unset sides, so a colour on a zero-width side paints nothing
 * either way. Colours declared on zero-width sides are therefore DROPPED, and
 * the drop is reported as a note rather than passed off as a perfect copy.
 *
 * @param {Object} split Result of splitAuthoredBorder().
 * @return {Object} { ok, attrs, keep, notes, reason }
 */
function planPatternBorderMigration( split ) {
	const notes = [];
	const widths = {};
	const colourBySide = {};
	const styleBySide = {};

	// Flat legs apply to every side.
	const flat = split.atRisk;
	for ( const side of BORDER_SIDES ) {
		const s = split.sides[ side ] || {};
		const width = s.width !== undefined ? s.width : flat.width;
		const colour = s.color !== undefined ? s.color : flat.color;
		const style = s.style !== undefined ? s.style : flat.style;
		if ( width !== undefined && width !== '' ) widths[ side ] = String( width );
		if ( colour !== undefined && colour !== '' ) colourBySide[ side ] = String( colour );
		if ( style !== undefined && style !== '' ) styleBySide[ side ] = String( style );
	}

	const paintedSides = Object.keys( widths );
	if ( ! paintedSides.length ) {
		// Width is the only leg that makes a border paint. A colour/style with no
		// width anywhere paints nothing today and would paint nothing after.
		notes.push(
			'no width on any side — the authored colour/style paints nothing (CSS: a border ' +
				'needs a width); migrating drops values that were already inert'
		);
	}

	// Losslessness gate — distinct colours/styles across PAINTED sides.
	const distinctColours = [ ...new Set( paintedSides.map( ( s ) => colourBySide[ s ] ).filter( Boolean ) ) ];
	const distinctStyles = [ ...new Set( paintedSides.map( ( s ) => styleBySide[ s ] ).filter( Boolean ) ) ];
	if ( distinctColours.length > 1 ) {
		return {
			ok: false,
			reason:
				`per-side border COLOURS differ across painted sides (${ distinctColours.join( ', ' ) }) ` +
				'and `borderColour` is a single string — flattening would silently lose the design. ' +
				'Options: (a) give borderColour a per-side object shape, (b) split the row into ' +
				'nested blocks, (c) keep this instance on native supports. Bean decides.',
		};
	}
	if ( distinctStyles.length > 1 ) {
		return {
			ok: false,
			reason:
				`per-side border STYLES differ across painted sides (${ distinctStyles.join( ', ' ) }) ` +
				'and `borderStyle` is a single string — flattening would silently lose the design.',
		};
	}

	// A colour declared on a side with NO width never paints. Dropping it is
	// behaviourally lossless, but say so rather than implying a perfect copy.
	const droppedColourSides = Object.keys( colourBySide ).filter( ( s ) => ! widths[ s ] );
	if ( droppedColourSides.length ) {
		notes.push(
			`colour on zero-width side(s) ${ droppedColourSides.join( '/' ) } dropped — ` +
				'a border with no width paints nothing, so this is behaviourally lossless'
		);
	}

	const attrs = {};
	if ( paintedSides.length ) {
		attrs.borderWidth = {};
		for ( const side of BORDER_SIDES ) {
			if ( widths[ side ] ) attrs.borderWidth[ side ] = widths[ side ];
		}
	}

	// STYLE. Nothing was authored in the theme's per-side borders, and CSS
	// treats a missing border-style as `none` -> nothing paints. Preserving the
	// absence literally would reproduce today's INVISIBLE border. `solid` is the
	// only value that makes a 1px coloured hairline render, and it is what the
	// design plainly intends -- but it is an INFERENCE, flagged as one.
	if ( distinctStyles.length === 1 ) {
		attrs.borderStyle = distinctStyles[ 0 ];
	} else if ( paintedSides.length && distinctColours.length ) {
		attrs.borderStyle = 'solid';
		notes.push(
			'INFERENCE: no border-style was authored, so this border paints NOTHING today ' +
				'(CSS border-style defaults to none). `solid` is written so the intended ' +
				'hairline actually renders. This REPAIRS a dead value rather than copying it — ' +
				'needs sign-off.'
		);
	}
	if ( attrs.borderStyle !== undefined && ! BORDER_STYLE_ENUM.includes( attrs.borderStyle ) ) {
		return {
			ok: false,
			reason: `authored border-style "${ attrs.borderStyle }" is outside the 9-value CSS enum`,
		};
	}

	if ( distinctColours.length === 1 ) {
		const stored = patternColourToAttr( distinctColours[ 0 ] );
		if ( stored === '' ) {
			return { ok: false, reason: 'authored border colour resolved to an empty value' };
		}
		attrs.borderColour = stored;
		if ( stored !== distinctColours[ 0 ] ) {
			notes.push(
				`colour token "${ distinctColours[ 0 ] }" stored as bare slug "${ stored }" — ` +
					'sgs_colour_value() sanitises punctuation out of a slug, so storing the raw ' +
					'`var:preset|color|…` token would emit ' +
					'var(--wp--preset--color--varpresetcolorborder) and paint nothing (D881 defect 3)'
			);
		}
	}

	if ( ! Object.keys( attrs ).length ) {
		return { ok: false, reason: 'nothing migratable extracted from the authored border' };
	}

	return { ok: true, attrs, keep: split.keep, notes };
}

/**
 * Find the span of the JSON value that starts at `from` (the index of the char
 * after a `"key":`). Brace/bracket aware and STRING aware, so a `}` inside a
 * quoted value cannot end the span early.
 *
 * @param {string} text Enclosing text.
 * @param {number} from Index of the first character of the value.
 * @return {number} Index one past the end of the value.
 */
function jsonValueEnd( text, from ) {
	let i = from;
	while ( i < text.length && /\s/.test( text[ i ] ) ) i++;
	const c = text[ i ];
	if ( c === '{' || c === '[' ) {
		const open = c;
		const close = c === '{' ? '}' : ']';
		let depth = 0;
		let inStr = false;
		for ( ; i < text.length; i++ ) {
			const ch = text[ i ];
			if ( inStr ) {
				if ( ch === '\\' ) i++;
				else if ( ch === '"' ) inStr = false;
				continue;
			}
			if ( ch === '"' ) inStr = true;
			else if ( ch === open ) depth++;
			else if ( ch === close ) {
				depth--;
				if ( depth === 0 ) return i + 1;
			}
		}
		return -1;
	}
	if ( c === '"' ) {
		for ( i++; i < text.length; i++ ) {
			if ( text[ i ] === '\\' ) i++;
			else if ( text[ i ] === '"' ) return i + 1;
		}
		return -1;
	}
	while ( i < text.length && ! /[,}\]]/.test( text[ i ] ) ) i++;
	return i;
}

/** Locate `"key":` at the TOP LEVEL of the object literal `objText`. */
function topLevelKeyIndex( objText, key ) {
	const needle = `"${ key }":`;
	let depth = 0;
	let inStr = false;
	for ( let i = 0; i < objText.length; i++ ) {
		const ch = objText[ i ];
		if ( inStr ) {
			if ( ch === '\\' ) i++;
			else if ( ch === '"' ) inStr = false;
			continue;
		}
		if ( ch === '"' ) {
			if ( depth === 1 && objText.startsWith( needle, i ) ) return i;
			inStr = true;
			continue;
		}
		if ( ch === '{' || ch === '[' ) depth++;
		else if ( ch === '}' || ch === ']' ) depth--;
	}
	return -1;
}

/**
 * Rewrite one attribute-JSON span: strip the Shape-B legs out of `style.border`
 * and add the private attrs.
 *
 * SURGICAL, NOT RE-SERIALISED. Only the `"border":<value>` span is replaced and
 * the three new keys are inserted after the opening brace; every other byte is
 * untouched. A whole-object JSON.stringify would reorder keys and re-escape
 * unicode across the file for a change confined to one sub-object
 * (`never-reserialise-to-rename-a-key`).
 *
 * @param {string} raw   The attribute JSON text, `{...}` inclusive.
 * @param {Object} plan  Result of planPatternBorderMigration().
 * @return {string|null} New attribute JSON text, or null if the span is not found.
 */
function rewritePatternAttrJson( raw, plan ) {
	const styleIdx = topLevelKeyIndex( raw, 'style' );
	if ( styleIdx === -1 ) return null;
	const styleValStart = styleIdx + '"style":'.length;
	const styleValEnd = jsonValueEnd( raw, styleValStart );
	if ( styleValEnd === -1 ) return null;
	const styleText = raw.slice( styleValStart, styleValEnd );

	const borderIdx = topLevelKeyIndex( styleText, 'border' );
	if ( borderIdx === -1 ) return null;
	const borderValStart = borderIdx + '"border":'.length;
	const borderValEnd = jsonValueEnd( styleText, borderValStart );
	if ( borderValEnd === -1 ) return null;

	const keep = plan.keep || {};
	let newStyleText;
	if ( Object.keys( keep ).length ) {
		newStyleText =
			styleText.slice( 0, borderValStart ) +
			JSON.stringify( keep ) +
			styleText.slice( borderValEnd );
	} else {
		// Remove `"border":<value>` entirely, plus exactly one adjacent comma.
		let cutStart = borderIdx;
		let cutEnd = borderValEnd;
		if ( styleText[ cutEnd ] === ',' ) cutEnd++;
		else if ( styleText[ cutStart - 1 ] === ',' ) cutStart--;
		newStyleText = styleText.slice( 0, cutStart ) + styleText.slice( cutEnd );
	}

	let out;
	const styleIsEmpty = /^\{\s*\}$/.test( newStyleText );
	if ( styleIsEmpty ) {
		let cutStart = styleIdx;
		let cutEnd = styleValEnd;
		if ( raw[ cutEnd ] === ',' ) cutEnd++;
		else if ( raw[ cutStart - 1 ] === ',' ) cutStart--;
		out = raw.slice( 0, cutStart ) + raw.slice( cutEnd );
	} else {
		out = raw.slice( 0, styleValStart ) + newStyleText + raw.slice( styleValEnd );
	}

	// Insert the private attrs immediately after the opening brace.
	const injected = Object.entries( plan.attrs )
		.map( ( [ k, v ] ) => `"${ k }":${ JSON.stringify( v ) }` )
		.join( ',' );
	const bodyIsEmpty = /^\{\s*\}$/.test( out );
	out = '{' + injected + ( bodyIsEmpty ? '' : ',' ) + out.slice( 1 );

	// Prove the result before handing it back: it must parse, it must carry the
	// private attrs, and it must NO LONGER carry any Shape-B leg.
	let parsed;
	try {
		parsed = JSON.parse( out );
	} catch ( e ) {
		return null;
	}
	for ( const k of Object.keys( plan.attrs ) ) {
		if ( JSON.stringify( parsed[ k ] ) !== JSON.stringify( plan.attrs[ k ] ) ) return null;
	}
	if ( splitAuthoredBorder( ( parsed.style || {} ).border ).hasRisk ) return null;
	return out;
}

/**
 * Build the full set of pattern-file rewrites for one block.
 *
 * @param {string} slug Block slug.
 * @param {Array}  hits themeAuthoredBorder() output.
 * @return {Object} { ok, files: Map<path,text>, notes, reason }
 */
function planPatternRewrites( slug, hits ) {
	const files = new Map();
	const notes = [];
	for ( const hit of hits ) {
		if ( hit.unparseable ) {
			return { ok: false, reason: `${ hit.rel }: attribute JSON does not parse` };
		}
		const plan = planPatternBorderMigration( hit.split );
		if ( ! plan.ok ) return { ok: false, reason: `${ hit.rel }: ${ plan.reason }` };
		const replacement = rewritePatternAttrJson( hit.raw, plan );
		if ( ! replacement ) {
			return { ok: false, reason: `${ hit.rel }: rewrite failed self-verification` };
		}
		const cur = files.has( hit.file ) ? files.get( hit.file ) : readFile( hit.file );
		if ( ! cur.includes( hit.raw ) ) {
			return { ok: false, reason: `${ hit.rel }: authored span no longer found in file` };
		}
		files.set( hit.file, cur.split( hit.raw ).join( replacement ) );
		for ( const n of plan.notes ) notes.push( `${ hit.rel }: ${ n }` );
	}
	return { ok: true, files, notes };
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
 *
 * TWO SINK IDIOMS, both recognised (widened 2026-08-29 after measuring the 18
 * ambiguous-anchor refusals): the string append `$x .= '...'` AND the array push
 * `$scoped_css[] = '...'`, which 11 of the 18 use and which the `.=`-only scan
 * could not see at all. The array idiom carries the SAME markup-corruption
 * hazard, and worse: array pushes are how these very files build their HTML
 * ($meta_parts[], $attr_parts[], $classes[], $wrapper_vars[]). So the identical
 * CSS-ish proof is applied to the pushed value, and the `_css$` name is still
 * the disambiguator. `kind` is returned because the two idioms need DIFFERENT
 * emitted statements -- appending a string to an array sink with `.=` would
 * fatal ("Unsupported operand types"), and pushing to a string sink would
 * silently produce `$css[0]`.
 */
const NL = String.fromCharCode( 10 );
const SINK_STRING = 'string';
const SINK_ARRAY = 'array';

/**
 * The root selector variable.
 *
 * Preferred name is `*root_sel*` (the house convention). The fallback exists
 * because 5 of the 18 refusals name it per-block instead ($sgs_form_sel,
 * $sgs_ps_sel, $sgs_fs_sel, $sgs_ft_sel) -- but a bare `_sel$` scan is UNSAFE:
 * the same files also declare DESCENDANT selectors ($sgs_tm_link_sel =
 * $root_sel . ' a'), and scoping the border to one of those would paint the
 * border on a child element. The fallback therefore requires the RHS to be a
 * ROOT-selector literal -- `'.' . $uid . '.<class>'`, no descendant space -- and
 * requires it to be UNIQUE in the file.
 */
const ROOT_SEL_LITERAL = /^\s*'\.'\s*\.\s*\$\w+\s*\.\s*'\.[\w-]+'\s*$/;

function findRootVar( php ) {
	const preferred = php.match( /\$(\w*root_sel\w*)\s*=/ );
	if ( preferred ) return preferred[ 1 ];

	const found = new Set();
	const re = /\$(\w+_sel)\s*=\s*([^;]{0,160});/g;
	let m;
	while ( ( m = re.exec( php ) ) !== null ) {
		if ( ROOT_SEL_LITERAL.test( m[ 2 ] ) ) found.add( m[ 1 ] );
	}
	return found.size === 1 ? [ ...found ][ 0 ] : null;
}

/**
 * When more than one `*_css`-named accumulator exists, `findAnchors()` used to
 * refuse outright rather than guess which one is the border's sink (see the
 * comment above `findAnchors`). But the correct sink isn't actually ambiguous
 * -- it's whichever accumulator receives the `['css']` result of the
 * `wp_style_engine_get_styles()` call built from a `['border']`-keyed args
 * array. Trace THAT structurally instead of guessing from the variable's
 * name, so this generalises to any future block with the same shape rather
 * than hardcoding a per-block preferred name.
 *
 * Verified against the two real refusals this exists for (2026-09-03):
 *   · card-grid — $cg_style_engine_args['border'] = $cg_border_args; ...
 *                 $cg_scoped_styles = wp_style_engine_get_styles( $cg_style_engine_args, ... );
 *                 $card_grid_native_css .= $cg_scoped_styles['css'];
 *   · trust-bar — same shape; sink is $tb_extra_scoped_css (the second `_css`
 *                 candidate there, $typo_css, holds only typography and is
 *                 never touched by this trace).
 */
function traceBorderCssSink( php ) {
	const argsRe = /\$(\w+)\s*\[\s*'border'\s*\]\s*=/g;
	let am;
	while ( ( am = argsRe.exec( php ) ) !== null ) {
		const argsVar = am[ 1 ];

		const callRe = new RegExp( '\\$(\\w+)\\s*=\\s*wp_style_engine_get_styles\\(\\s*\\$' + argsVar + '\\b' );
		const cm = php.match( callRe );
		if ( ! cm ) continue;
		const resultVar = cm[ 1 ];

		const strSinkRe = new RegExp( '\\$(\\w+)\\s*\\.=\\s*\\$' + resultVar + "\\s*\\[\\s*'css'\\s*\\]" );
		const sm = php.match( strSinkRe );
		if ( sm ) return { sink: sm[ 1 ], kind: SINK_STRING };

		const arrSinkRe = new RegExp( '\\$(\\w+)\\s*\\[\\s*\\]\\s*=\\s*\\$' + resultVar + "\\s*\\[\\s*'css'\\s*\\]" );
		const am2 = php.match( arrSinkRe );
		if ( am2 ) return { sink: am2[ 1 ], kind: SINK_ARRAY };
	}
	return null;
}

function findAnchors( php ) {
	const rootVar = findRootVar( php );

	// name -> { kind, count }. A name appearing under BOTH idioms is a
	// contradiction (it cannot be a string and an array) and is dropped.
	const candidates = new Map();
	const note = ( name, rhs, kind ) => {
		const cssish =
			/\{[^}]*\}/.test( rhs ) ||
			/\['css'\]/.test( rhs ) ||
			/_css\b/.test( name ) ||
			/sgs_\w*_css\(/.test( rhs );
		if ( ! cssish ) return;
		const prev = candidates.get( name );
		if ( prev && prev.kind !== kind ) {
			prev.conflicted = true;
			return;
		}
		candidates.set( name, { kind, count: ( prev ? prev.count : 0 ) + 1 } );
	};

	let m;
	const strRe = /\$(\w+)\s*\.=\s*([^;]{0,200});/g;
	while ( ( m = strRe.exec( php ) ) !== null ) note( m[ 1 ], m[ 2 ], SINK_STRING );
	const arrRe = /\$(\w+)\s*\[\s*\]\s*=\s*([^;]{0,200});/g;
	while ( ( m = arrRe.exec( php ) ) !== null ) note( m[ 1 ], m[ 2 ], SINK_ARRAY );

	for ( const [ name, info ] of [ ...candidates ] ) {
		if ( info.conflicted ) candidates.delete( name );
	}

	// Prefer a *_css name; otherwise the sole CSS-ish variable.
	let cssVar = null;
	const named = [ ...candidates.keys() ].filter( ( n ) => /_css$/.test( n ) );
	if ( named.length === 1 ) cssVar = named[ 0 ];
	else if ( named.length > 1 ) {
		// More than one `*_css`-named candidate -- don't guess from the name.
		// Trace which one structurally receives the border rule's own CSS
		// output; only accept a traced sink that the file already proved is
		// CSS-ish (it must already be in `candidates`), never a brand-new name.
		const traced = traceBorderCssSink( php );
		cssVar = traced && candidates.has( traced.sink ) ? traced.sink : null;
	} else if ( candidates.size === 1 ) cssVar = [ ...candidates.keys() ][ 0 ];

	const cssKind = cssVar ? candidates.get( cssVar ).kind : null;
	return { rootVar, cssVar, cssKind, cssCandidates: [ ...candidates.keys() ] };
}

// ─── Collision reconciliation ───────────────────────────────────────────────
//
// A name collision is NOT automatically a conflict. Measured 2026-08-29 on the
// two blocks this codemod refused for `attr-name-collision` (sgs/hero,
// sgs/info-box): BOTH already declare `borderColourGradient`, and in both cases
// it means EXACTLY what Shape B means by it — the RESTING root border gradient,
// string, default '', non-empty wins over the flat colour, bound to the wrapper
// element's `css:border-color-gradient` and painted with sgs_border_gradient_css()
// on the same root selector.
//   · hero/block.json:447-451  + hero/render.php:189, 906-917   (D701)
//   · info-box/block.json:203-207 + info-box/render.php:86, 414-417 (D636)
//
// Blindly overwriting would clobber a richer declaration; blindly refusing
// declines a migration that is already three-quarters done. The correct move is
// ADOPT: keep the existing declaration, do not re-add it, and remove the
// superseded standalone gradient emission so exactly ONE painter survives.
// Leaving both would double-paint the ring and, worse, be unfalsifiable — you
// could not tell which emission produced a live result.
//
// Reconciliation is deliberately narrow. Only `borderColourGradient` has a rule,
// because it is the only one of the four with a proven oracle. The other three
// names (borderWidth / borderStyle / borderColour) have no compatibility rule
// and therefore still REFUSE on collision — an unknown same-named attribute is
// exactly the case the refusal exists for.
const RECONCILABLE = {
	borderColourGradient: {
		cssKey: 'css:border-color-gradient',
		painter: 'sgs_border_gradient_css',
	},
};

/**
 * Is an EXISTING attribute of a colliding name the same thing Shape B means?
 *
 * Three independent tests, all required. Any one alone over-matches:
 *   (a) SHAPE    — string, default '' (a differently-typed attr is a different thing)
 *   (b) SEMANTIC — the wrapper element's attrMap binds `css:border-color-gradient`
 *                  to THIS name. This is what separates "root border gradient"
 *                  from a same-named attribute belonging to a sub-part; without
 *                  it, sgs/hero's own `splitMediaBorderColourGradient` shape
 *                  would look identical.
 *   (c) PAINTER  — render.php assigns a local from it and paints it with
 *                  sgs_border_gradient_css() scoped to the SAME root selector
 *                  the migration will use. A declared-but-unpainted attr is not
 *                  evidence of the same semantic.
 */
function reconcileCollision( bj, php, rootVar, name ) {
	const rule = RECONCILABLE[ name ];
	if ( ! rule ) return { ok: false, why: `no reconciliation rule for \`${ name }\`` };

	const attr = ( bj.attributes || {} )[ name ];
	if ( ! attr || attr.type !== 'string' || ( attr.default !== '' && attr.default !== undefined ) ) {
		return {
			ok: false,
			why:
				`existing \`${ name }\` has an incompatible SHAPE ` +
				`(type=${ attr && attr.type }, default=${ JSON.stringify( attr && attr.default ) }); ` +
				"Shape B's is { type: 'string', default: '' }",
		};
	}

	const els = ( ( bj.supports || {} ).sgs || {} ).elements || {};
	const boundOnWrapper = Object.values( els ).some(
		( el ) => el && el.isWrapper && el.attrMap && el.attrMap[ rule.cssKey ] === name
	);
	if ( ! boundOnWrapper ) {
		return {
			ok: false,
			why:
				`existing \`${ name }\` is not bound to \`${ rule.cssKey }\` on the WRAPPER element — ` +
				'it names some other part, so the collision is real',
		};
	}

	const painter = findGradientPainter( php, name, rootVar );
	if ( ! painter ) {
		return {
			ok: false,
			why:
				`existing \`${ name }\` has no ${ rule.painter }() emission scoped to $${ rootVar } ` +
				'in render.php — cannot prove it means the resting ROOT border gradient',
		};
	}

	return { ok: true, name, painter };
}

/**
 * Locate the superseded standalone gradient emission for an adopted attribute:
 * the local assigned from `$attributes['<name>']`, and the `if ( '' !== $local )`
 * block that paints the ring. Returns char spans, or null if either is absent or
 * does not match the resting-root shape.
 */
function findGradientPainter( php, name, rootVar ) {
	const assignRe = new RegExp(
		"^[^\\S\\r\\n]*\\$(\\w+)\\s*=[^;]*\\$attributes\\[\\s*'" + name + "'[^;]*;",
		'm'
	);
	const am = php.match( assignRe );
	if ( ! am ) return null;
	const localVar = am[ 1 ];

	const ifRe = new RegExp( "^[^\\S\\r\\n]*if \\(\\s*'' !== \\$" + localVar + "\\s*\\)\\s*\\{", 'm' );
	const im = php.match( ifRe );
	if ( ! im ) return null;

	// Brace-balance from the opening `{` of that if.
	let depth = 0;
	let end = -1;
	for ( let i = im.index + im[ 0 ].length - 1; i < php.length; i++ ) {
		if ( php[ i ] === '{' ) depth++;
		else if ( php[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) {
				end = i + 1;
				break;
			}
		}
	}
	if ( end === -1 ) return null;

	const body = php.slice( im.index, end );
	if ( ! body.includes( 'sgs_border_gradient_css' ) ) return null;
	// Must paint the RESTING root, not the hover ring (which stays untouched:
	// borderColourHoverGradient is a different attribute the migration does not own).
	if ( /:hover/.test( body ) ) return null;
	if ( rootVar && ! new RegExp( '\\$' + rootVar + '\\b' ).test( body ) ) return null;

	return {
		localVar,
		assignStart: am.index,
		assignEnd: am.index + am[ 0 ].length,
		ifStart: im.index,
		ifEnd: end,
	};
}

/** Excise a char span plus the contiguous `//` comment lines directly above it. */
function cutSpanWithLeadingComments( text, start, end ) {
	const lines = text.split( /\r?\n/ );
	const eol = detectEol( text ) === '\r\n' ? '\r\n' : '\n';
	const lineOf = ( off ) => text.slice( 0, off ).split( /\r?\n/ ).length - 1;
	let a = lineOf( start );
	const b = lineOf( end - 1 );
	while ( a > 0 && /^\s*\/\//.test( lines[ a - 1 ] ) ) a--;
	lines.splice( a, b - a + 1 );
	return lines.join( eol );
}

/**
 * Dangling-reference guard: after the transform, is any variable whose ONLY
 * assignment was removed still read in a way that would FAULT?
 *
 * ⚠ This must NOT over-match. Every one of the 13 already-READY blocks loses
 * `$sgs_border_style_width`, and every surviving reference to it sits inside an
 * `isset()`-guarded block — PHP 8 evaluates isset() on an undefined variable as
 * false with no warning, so the branch is simply never taken. That is benign
 * dead code, not a defect, and refusing on it would regress 13 working blocks.
 * An UNGUARDED read (`'' !== $x`) is the real defect: PHP 8 warns and the
 * comparison against null succeeds, feeding null downstream. Measured on
 * sgs/hero's `$native_border_width_val`.
 */
function danglingUnguardedVars( before, after ) {
	const assigned = ( t ) => {
		const s = new Set();
		const re = /\$(\w+)\s*(?:\[[^\]]*\]\s*)?=[^=]/g;
		let m;
		while ( ( m = re.exec( t ) ) !== null ) s.add( m[ 1 ] );
		return s;
	};
	const beforeAssigned = assigned( before );
	const afterAssigned = assigned( after );
	const bad = [];
	for ( const v of beforeAssigned ) {
		if ( afterAssigned.has( v ) ) continue;
		const firstUse = after.search( new RegExp( '\\$' + v + '\\b' ) );
		if ( firstUse === -1 ) continue; // removed cleanly
		const lineStart = after.lastIndexOf( '\n', firstUse ) + 1;
		const lineEnd = after.indexOf( '\n', firstUse );
		const line = after.slice( lineStart, lineEnd === -1 ? undefined : lineEnd );
		// Guarded if the FIRST surviving read opens an isset()/empty() test — that
		// is the guard wrapping the whole dead block.
		if ( new RegExp( '(isset|empty)\\s*\\(\\s*\\$' + v + '\\b' ).test( line ) ) continue;
		bad.push( v );
	}
	return bad;
}

function alreadyShapeB( bj ) {
	const a = bj.attributes || {};
	const b = ( bj.supports || {} ).__experimentalBorder;
	const hasPrivate = Boolean( a.borderWidth && a.borderStyle && a.borderColour && a.borderRadius );
	// Target shape has NO __experimentalBorder support left at all (radius is
	// no longer native either) -- so "done" now means the support key is gone,
	// not merely trimmed to { radius, skipSerialization }.
	return hasPrivate && b === undefined;
}

/**
 * Reconcile pre-existing radius attrs rather than blanket-refusing on
 * collision. 12+ blocks (sgs/button, sgs/icon-list, sgs/media, sgs/timeline,
 * sgs/counter, sgs/before-after, sgs/table-of-contents, sgs/countdown-timer,
 * sgs/brand-strip, sgs/whatsapp-cta, sgs/option-picker...) already declare
 * `borderRadiusTablet`/`borderRadiusMobile` as private corner-object attrs
 * predating this codemod (some, like sgs/media + sgs/before-after, are
 * themselves NATIVE_FULL blocks with a still-native base radius). Refusing on
 * their mere presence would REFUSE the blocks furthest along, for no reason --
 * their shape already matches what this codemod would write.
 *
 * Tightened to compare the full CORNER-KEY shape, not just `type === 'object'`
 * (an earlier draft used the looser check; no current attr fails the
 * stricter one, which is exactly when to tighten it, per D881-style
 * discipline -- proven-safe now costs nothing later). An object-typed attr
 * whose declared default carries keys OTHER than the four corners (or none of
 * them) is not this family and must still refuse.
 *
 * Refuses when an existing attr means something different: sgs/mega-panel's
 * `borderRadius` is a scalar CSS-length STRING; sgs/label's is
 * `[ 'string', 'number' ]`. Neither is the family this codemod writes, and
 * silently redeclaring over them would break whatever already reads them.
 *
 * @param {Object} existing bj.attributes of the block under classification.
 * @return {{adopt: string[], add: string[]}|{conflict: string}}
 */
function reconcileRadiusAttrs( existing ) {
	const adopt = [];
	const add = [];
	for ( const name of Object.keys( RADIUS_ATTRS ) ) {
		const current = existing[ name ];
		if ( current === undefined ) {
			add.push( name );
			continue;
		}
		if ( current.type !== 'object' ) {
			return {
				conflict: `${ name }: declares type=${ JSON.stringify( current.type ) }, expected 'object' ` +
					'(corner values { topLeft, topRight, bottomLeft, bottomRight }) -- this attr means ' +
					'something different here; rename it first or add a per-block reconciliation',
			};
		}
		// SHAPE, not just type. A default whose keys are not a subset of the four
		// corners is an object-typed attr that isn't actually this family (e.g.
		// `{ default: { x: 1, y: 2 } }`). An EMPTY default (`{}`, the universal
		// shape every current declaration uses) always passes -- it carries no
		// keys to contradict the family.
		const defaultKeys = Object.keys( current.default || {} );
		const shapeOk = defaultKeys.every( ( k ) => RADIUS_CORNERS.includes( k ) );
		if ( ! shapeOk ) {
			return {
				conflict: `${ name }: object-typed but its default keys (${ defaultKeys.join( ', ' ) }) ` +
					`are not a subset of the corner family (${ RADIUS_CORNERS.join( ', ' ) }) -- this attr ` +
					'means something different here',
			};
		}
		adopt.push( name );
	}
	return { adopt, add };
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
		};
	}

	// Authored native border in pattern/template markup. Everything that
	// reaches here is migrated ALONGSIDE the block, in the same atomic write:
	// writing the private attrs into markup BEFORE block.json declares them
	// would have WordPress silently discard every one of them (D338).
	//
	// ⚠ KNOWN GAP (documented in the file header): radius is now ALSO part of
	// Shape B, but `splitAuthoredBorder`'s SHAPE_B_LEGS is unchanged -- an
	// authored radius still reports as "keep", not "at risk". Verified
	// empirically that this affects zero of the current 32 READY blocks.
	// Extending the pattern-rewrite planner to radius's different (per-corner,
	// not per-side) value shape is out of scope for this pass.
	const themeHits = themeAuthoredBorder( slug );
	let patternPlan = null;
	if ( themeHits.length ) {
		patternPlan = planPatternRewrites( slug, themeHits );
		if ( ! patternPlan.ok ) {
			return {
				slug,
				status: 'REFUSE',
				reason: 'theme-authored-border',
				detail: patternPlan.reason,
			};
		}
	}

	const anchors = findAnchors( php );

	// Collision gate. A colliding name is reconciled (ADOPTED) only when it is
	// provably the same semantic; otherwise it still refuses. Checked before the
	// anchor gate so a genuine collision keeps reporting as a collision.
	const existing = bj.attributes || {};
	const collides = Object.keys( PRIVATE_ATTRS ).filter( ( k ) => existing[ k ] !== undefined );
	const adopt = [];
	const unreconciled = [];
	for ( const k of collides ) {
		const r = reconcileCollision( bj, php, anchors.rootVar, k );
		if ( r.ok ) adopt.push( k );
		else unreconciled.push( `${ k }: ${ r.why }` );
	}
	if ( unreconciled.length ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'attr-name-collision',
			detail: 'block already declares an INCOMPATIBLE ' + unreconciled.join( ' | ' ),
		};
	}

	// Radius collision gate -- ADOPT a compatible pre-existing corner-object
	// declaration (12+ blocks already have one), REFUSE on an incompatible
	// shape (sgs/mega-panel's scalar string, sgs/label's ['string','number']).
	const radiusPlan = reconcileRadiusAttrs( existing );
	if ( radiusPlan.conflict ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'radius-attr-collision',
			detail: radiusPlan.conflict,
		};
	}

	if ( ! anchors.rootVar || ! anchors.cssVar ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'ambiguous-anchor',
			detail:
				`rootVar=${ anchors.rootVar || 'NOT FOUND' } cssVar=${ anchors.cssVar || 'NOT FOUND' }` +
				( anchors.cssKind ? ` (${ anchors.cssKind } sink)` : '' ) +
				( anchors.cssCandidates.length
					? ` (css candidates: ${ anchors.cssCandidates.join( ', ' ) })`
					: '' ),
		};
	}

	// A block is only READY if the emission has a proven-safe insertion point.
	// Without this check the anchor widening reported READY for three blocks
	// whose transform then returned null -- --fix would have refused them at
	// write time, but the SURVEY would have been lying about the migratable set.
	if ( findInsertionIndex( stripNativeBorderReads( php ).text, anchors.cssVar ) === -1 ) {
		return {
			slug,
			status: 'REFUSE',
			reason: 'no-insertion-point',
			detail:
				`found sink $${ anchors.cssVar } (${ anchors.cssKind }) but no top-level READ of it ` +
				'to insert before; every read is indented (inside a conditional, loop or closure)',
		};
	}

	return {
		slug,
		status: READY,
		anchors,
		adopt,
		radiusPlan,
		patternFiles: patternPlan ? patternPlan.files : null,
		patternNotes: patternPlan ? patternPlan.notes : [],
	};
}

// ─── Transforms ─────────────────────────────────────────────────────────────

/**
 * @param {string} text        Raw block.json source.
 * @param {string[]} [adopt]   Names from PRIVATE_ATTRS to leave verbatim (a
 *                             proven-compatible pre-existing declaration).
 * @param {Object} [radiusPlan] `reconcileRadiusAttrs()` result -- which radius
 *                              attrs to ADD vs ADOPT (leave an existing
 *                              compatible declaration untouched). Defaults to
 *                              "add all three" for callers (e.g. the
 *                              self-test) that don't pass one.
 */
function transformBlockJson( text, adopt, radiusPlan ) {
	const adopted = new Set( adopt || [] );
	const rplan = radiusPlan || { adopt: [], add: Object.keys( RADIUS_ATTRS ) };
	const bj = JSON.parse( text );
	const eol = detectEol( text );

	// Target shape has NO __experimentalBorder support left at all -- radius is
	// no longer native either (Bean's standard: wrap the native control the
	// same way width/style/colour already were, don't leave one leg
	// permanently native). Removing the key outright, not trimming it.
	delete bj.supports.__experimentalBorder;

	bj.attributes = bj.attributes || {};
	for ( const [ name, def ] of Object.entries( PRIVATE_ATTRS ) ) {
		// An ADOPTED attribute is left exactly as the block declares it. It is
		// already the right shape (reconcileCollision proved that) and its own
		// description carries the block's D-number provenance, which the generic
		// PRIVATE_ATTRS text would destroy.
		if ( adopted.has( name ) ) continue;
		bj.attributes[ name ] = JSON.parse( JSON.stringify( def ) );
	}
	// Radius attrs: only ADD the ones that don't already exist. An adopted attr
	// (already declared, compatible corner-object shape) is left exactly as-is
	// -- it may carry a description or default this codemod doesn't know about.
	for ( const name of rplan.add ) {
		bj.attributes[ name ] = JSON.parse( JSON.stringify( RADIUS_ATTRS[ name ] ) );
	}

	// boxFamilies.borderRadius — REQUIRED, not cosmetic. Without it the three
	// radius attrs are indistinguishable to the DB seeder: all three map to
	// css_property 'border-radius' with element/state/tier NULL, so the resolver
	// reports them as "3 competing attrs ... genuinely contend for the same slot"
	// and raises AmbiguousLayerAttrError at clone time. This entry is what lets
	// the seeder derive css_tier=tablet/mobile from the tier attrs.
	//
	// Measured 2026-08-30: sgs/pricing-table was migrated by this codemod WITHOUT
	// it and produced 4 db-consistency findings; the 11 blocks migrated alongside
	// it had the entry added by hand and produced none. Emitting it here stops
	// the next 32 migrations reproducing the same four findings each.
	const sgsSupports = ( bj.supports || {} ).sgs;
	if ( sgsSupports ) {
		sgsSupports.boxFamilies = sgsSupports.boxFamilies || {};
		if ( ! sgsSupports.boxFamilies.borderRadius ) {
			sgsSupports.boxFamilies.borderRadius = [ 'borderRadiusTablet', 'borderRadiusMobile' ];
		}
	}

	// attrMap: repoint the FOUR legs (width/style/colour/radius) off `native:`
	// and add the gradient key. This is the R-31-1 declarative source that
	// seeds the DB and is gated by check-element-manifest-conformance.js --
	// leaving any leg on `native:` would make the DB describe a support the
	// block no longer has.
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
		if ( m[ 'css:border-radius' ] === 'native:__experimentalBorder.radius' ) {
			m[ 'css:border-radius' ] = 'borderRadius';
		}
	}

	let out = JSON.stringify( bj, null, '\t' );
	if ( eol === '\r\n' ) out = out.replace( /\n/g, '\r\n' );
	return out + eol;
}

/**
 * The append statement for whichever sink idiom this block uses. `.=` on an
 * array sink is a PHP fatal, and `[] =` on a string sink silently writes an
 * offset, so this is not cosmetic.
 */
function sinkAppend( cssVar, kind, expr ) {
	return kind === SINK_ARRAY
		? `$${ cssVar }[] = ${ expr };`
		: `$${ cssVar } .= ${ expr };`;
}

function renderPhpEmission( rootVar, cssVar, kind = SINK_STRING ) {
	const append = ( expr ) => sinkAppend( cssVar, kind, expr );
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
		${ append( `$${ rootVar } . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}'` ) }
	}

	// A FLAT colour emits \`border-color\` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		${ append( `sgs_border_gradient_css( $${ rootVar }, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' )` ) }
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		${ append( `$${ rootVar } . '{border-color:' . sgs_colour_value( $border_colour ) . ';}'` ) }
	}
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (\`.=\` for a string accumulator, \`[] =\` for an array one). ──
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $${ rootVar } )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		${ append( `$border_radius_out['css']` ) }
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $${ rootVar } )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		${ append( `'@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}'` ) }
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $${ rootVar } )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		${ append( `'@media(max-width:767px){' . $border_radius_mob_out['css'] . '}'` ) }
	}
}
`;
}

/**
 * Remove the native border arg construction. Matched narrowly: only the
 * assignments that read `$attributes['style']['border'][...]` for width/style/
 * colour/radius. Radius is INCLUDED now (2026-08-30 target-shape correction)
 * -- it no longer stays native, so its native read is dead code same as the
 * other three legs once the private `borderRadius` attr takes over.
 */
function stripNativeBorderReads( php ) {
	// Pass 1 — remove the statements that read the native legs (width/style/
	// colour/radius -- all four now), and RECORD every local variable whose
	// assignment went with them.
	const lines = php.split( /\r?\n/ );
	const out = [];
	const orphaned = new Set();
	let removed = 0;
	let depth = 0;
	let dropping = false;
	for ( const line of lines ) {
		// A COMMENT that merely NAMES the native border path is prose, not a read.
		// Measured on sgs/hero: its D701 comment block spells out
		// `$attributes['style']['border']['color']` to explain what the gradient
		// overrides. Without this guard the stripper fired on that comment and,
		// because no comment line ends in `;`, kept dropping until it reached the
		// NEXT statement — silently deleting the real, live
		// `$border_colour_gradient = sgs_css_gradient_value( ... )` assignment four
		// lines later. Resolve every match back to its owner: a match inside a
		// comment owns nothing.
		const isComment = /^\s*(\/\/|\*|\/\*)/.test( line );
		// Radius is INCLUDED now (2026-08-30) -- it no longer stays native, so its
		// native read is dead code same as the other three legs.
		//
		// A THIRD shape, found live on sgs/multi-button (2026-09-03): the whole
		// `$attributes['style']['border']` object read directly (not sub-keyed),
		// then handed wholesale into a style-engine args array
		// (`$mb_color_border['border'] = $attributes['style']['border'];`). The
		// sub-keyed regex above never matches this -- so it survived stripping
		// and kept running as a SECOND, competing border emitter alongside the
		// new block-private one, silently double-painting for any stored content
		// that still carries a native `style.border` value. `(?!\[)` excludes
		// the sub-keyed shape (already handled above) so this is additive, not a
		// re-match of the same line.
		const touchesBorder =
			/\$attributes\['style'\]\['border'\]\['(color|style|width|radius)'\]/.test( line ) ||
			/\$attributes\['style'\]\['border'\](?!\[)/.test( line ) ||
			/sgs_native_border_style_width_args\s*\(/.test( line );
		if ( ! dropping && ! isComment && touchesBorder ) {
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

	// Pass 3 — prune a now-vacuous `if ( ! empty( $X ) ) { … }` CONSUMER guard,
	// never the accumulator's own declaration (that stays out of scope on
	// purpose, same as Pass 1/2 above -- the self-test's own negative control
	// asserts a `$pt_border_args = array();` initializer must SURVIVE even
	// once nothing writes to it, precisely because this function's job is
	// removing NATIVE READS and their direct orphaned consumers, not
	// reasoning generally about which locals end up unused).
	//
	// What genuinely IS provable: once `$X = array();` never receives a
	// single `$X['key'] = …` write anywhere else in the file, `empty( $X )`
	// is UNCONDITIONALLY true forever -- PHP semantics, not a heuristic -- so
	// `if ( ! empty( $X ) ) { BODY }` is dead code REGARDLESS of what BODY
	// does. Deleting the whole guard is behaviour-preserving by construction.
	//
	// Runs to a FIXED POINT because the shape CASCADES, found live on
	// trust-bar (2026-09-03): stripping `if ( ! empty( $tb_border_args ) ) {
	// $tb_style_engine_args['border'] = $tb_border_args; }` (round 1, X =
	// tb_border_args) leaves `$tb_style_engine_args` itself with zero
	// remaining writes, so its OWN consumer `if ( ! empty(
	// $tb_style_engine_args ) ) { … wp_style_engine_get_styles( …) … }`
	// becomes vacuous too (round 2, X = tb_style_engine_args) -- a
	// DIFFERENT body shape (a style-engine call, not a bracket assignment),
	// which is exactly why this is brace-depth generic rather than matching
	// one fixed 3-line template.
	for ( let guard = true; guard; ) {
		guard = false;
		const initRe = /^\s*\$(\w+)\s*=\s*array\(\s*\);\s*$/;
		const vacuous = new Set();
		for ( const line of out2 ) {
			const m = line.match( initRe );
			if ( ! m ) continue;
			const name = m[ 1 ];
			const written = out2.some( ( l ) => l !== line && new RegExp( `\\$${ name }\\s*\\[` ).test( l ) );
			if ( ! written ) vacuous.add( name );
		}
		if ( ! vacuous.size ) break;

		const guardStartRe = new RegExp(
			`^\\s*if\\s*\\(\\s*!\\s*empty\\(\\s*\\$(?:${ [ ...vacuous ].join( '|' ) })\\s*\\)\\s*\\)\\s*\\{\\s*$`
		);
		const kept = [];
		depth = 0;
		dropping = false;
		for ( const line of out2 ) {
			if ( ! dropping && guardStartRe.test( line ) ) {
				dropping = true;
				depth = 0;
				guard = true; // something changed -- re-scan next iteration
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

/**
 * Where the emission goes: the line of the sink's FIRST READ.
 *
 * NOT the line of the print. Measured 2026-08-29 across the READY set: 9 of the
 * 13 blocks that were ALREADY ready guard their print with `if ( $responsive_css )`
 * / `if ( '' !== $sgs_form_supports_css )` on the line above. Inserting at the
 * print therefore put the border append INSIDE that truthiness test, so a block
 * whose ONLY styling was a border would emit nothing at all -- output that
 * parses, deploys and silently does nothing. Reading-not-printing also removes
 * the old `printf|echo|return|sprintf` list, which could not see the three
 * blocks that consume their sink by CONCATENATION into an output variable
 * (`$out = '<style>' . $css . '</style>' . $out`).
 *
 * A read is any `$var` that is not a push (`$var[] =`), an append (`$var .=`)
 * or an assignment (`$var =`).
 *
 * The line must also start at COLUMN 0. House style leaves top-level statements
 * unindented, so this is what keeps the emission out of a conditional, loop or
 * closure body -- where it would run zero times, or once per iteration. A block
 * with no column-0 read has no proven-safe insertion point and is REFUSED
 * rather than guessed at.
 */
function findInsertionIndex( text, name ) {
	const re = new RegExp( `\\$${ name }\\b`, 'g' );
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		const after = text.slice( m.index + name.length + 1, m.index + name.length + 32 );
		if ( /^\s*\[\s*\]\s*=[^=]/.test( after ) ) continue; // array push
		if ( /^\s*\.=/.test( after ) ) continue; // string append
		if ( /^\s*=[^=]/.test( after ) ) continue; // assignment / initialisation
		const lineStart = text.lastIndexOf( '\n', m.index ) + 1;
		if ( /^[ \t]/.test( text.slice( lineStart, lineStart + 1 ) ) ) continue; // nested
		return lineStart;
	}
	return -1;
}

/**
 * Is the byte at `idx` in HTML mode (i.e. outside `<?php ... ?>`)?
 *
 * Load-bearing for the array idiom: these blocks close PHP before their
 * `<?php if ( $scoped_css ) : ?><style>` tail, so the insertion point sits in
 * HTML mode. Emitting bare PHP there would print the migration source as
 * visible text on the page -- a defect that still parses under `php -l`.
 */
function inHtmlMode( text, idx ) {
	const pre = text.slice( 0, idx );
	const open = Math.max( pre.lastIndexOf( '<?php' ), pre.lastIndexOf( '<?=' ) );
	const close = pre.lastIndexOf( '?>' );
	return close > open;
}

function transformRenderPhp( php, rootVar, cssVar, cssKind = SINK_STRING, adopt = [] ) {
	const original = php;
	let work = php;

	// 1. ADOPTION. Excise the superseded standalone painter for every adopted
	// attribute BEFORE stripping, so its native-border read goes out with the
	// block rather than being half-eaten. Two painters for one property is
	// unfalsifiable -- you cannot tell which one is working.
	for ( const name of adopt || [] ) {
		const pnt = findGradientPainter( work, name, rootVar );
		if ( ! pnt ) return null; // proven present at classify time; absence now = refuse
		// Cut the if-block FIRST: it sits after the assignment, so removing it
		// leaves the earlier assignStart/assignEnd offsets valid. Re-deriving those
		// offsets with a fresh regex instead is what broke this on merge.
		work = cutSpanWithLeadingComments( work, pnt.ifStart, pnt.ifEnd );
		if ( findGradientPainter( work, name, rootVar ) ) return null;
		work = cutSpanWithLeadingComments( work, pnt.assignStart, pnt.assignEnd );
	}

	const stripped = stripNativeBorderReads( work );
	const emission = renderPhpEmission( rootVar, cssVar, cssKind );

	// 2. INSERTION POINT. The line the accumulator is first READ at top level --
	// NOT before its print. Nine blocks guard the print with
	// `if ( $responsive_css ) {`, so inserting before the print put the border
	// append INSIDE the truthiness test: a block whose only styling was a border
	// emitted nothing, while parsing and deploying cleanly.
	const lineStart = findInsertionIndex( stripped.text, cssVar );
	if ( lineStart === -1 ) return null;

	// 3. HTML-MODE WRAP. Array-sink tails close PHP before their markup; bare PHP
	// inserted there prints the migration's own source onto the page as text --
	// and still passes `php -l`.
	const chunk = inHtmlMode( stripped.text, lineStart )
		? '<?php' + emission + '?>' + NL
		: emission + NL;

	const out = stripped.text.slice( 0, lineStart ) + chunk + stripped.text.slice( lineStart );

	// 4. DANGLING-VAR REFUSAL. Never ship a file that reads a variable nothing
	// assigns: an undefined variable is a RUNTIME notice, so `php -l` calls such
	// a file clean.
	if ( danglingUnguardedVars( original, out ).length ) return null;

	return out;
}

/**
 * Is the block's OWN root border already mounted, as opposed to some OTHER
 * `SgsBorderControl` instance that governs a different attribute family
 * entirely (e.g. multi-button's "Button group defaults" panel, which binds
 * the SAME component to `childBtnBorderWidth`/`childBtnBorderStyle`/
 * `childBtnBorderColour` -- a per-child-button default, not the block's own
 * root border Shape B owns). A bare `/SgsBorderControl/` name-match cannot
 * tell those apart and refused multi-button outright even though its root
 * border was never mounted (found 2026-09-03). The disambiguator is the
 * SAME `widthValues={ attributes.borderWidth ?? {} }` binding this
 * function's own injected panel uses below -- if some existing instance is
 * already bound to the ROOT `borderWidth` attribute, it really is a repeat
 * run and refusing is correct; a differently-named sibling attribute is not
 * a collision.
 */
function hasRootBorderControlMounted( src ) {
	const re = /<SgsBorderControl\b[\s\S]*?\/>/g;
	let m;
	while ( ( m = re.exec( src ) ) !== null ) {
		if ( /\bwidthValues\s*=\s*\{\s*attributes\.borderWidth\b/.test( m[ 0 ] ) ) return true;
	}
	return false;
}

function transformEditJs( src ) {
	if ( hasRootBorderControlMounted( src ) ) return null; // already mounted

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
		// Strip trailing whitespace AND an optional trailing comma before
		// appending our own -- a multi-line import whose last specifier
		// already ends in a comma (e.g. `LinkPopoverField,\n} from ...`)
		// otherwise gets a DOUBLED comma, a JS syntax error `php -l` cannot
		// see (caught live, 9 of 32 blocks, 2026-08-30).
		const injected =
			names.replace( /,?\s*$/, '' ) + ',\n' + wanted.map( ( n ) => `\t${ n },` ).join( '\n' ) + '\n';
		out = out.replace( importRe, `import {${ injected }} from '../../components';` );
	}

	// 1b. PanelBody import. The panel injected below (step 2) assumes
	// PanelBody is already bound in this file's scope -- true for every
	// block that already renders a PanelBody elsewhere, false for a block
	// with no prior PanelBody usage at all (accordion-item, the only
	// observed case, 2026-08-30: two ReferenceErrors at runtime, caught by
	// check-undefined-refs, not by php -l or this tool's own self-test).
	// Checked BEFORE the panel text below is spliced in -- that text itself
	// contains the literal "PanelBody" and would make this check vacuously
	// true if run after.
	if ( ! /\bPanelBody\b/.test( out ) ) {
		const wpComponentsRe = /import\s*\{([^}]*)\}\s*from\s*(['"])@wordpress\/components\2\s*;/;
		const wc = out.match( wpComponentsRe );
		if ( wc ) {
			const wcNames = wc[ 1 ].replace( /,?\s*$/, '' );
			out = out.replace(
				wpComponentsRe,
				`import {${ wcNames },\n\tPanelBody,\n} from '@wordpress/components';`
			);
		} else {
			// No @wordpress/components import anywhere in this file -- insert a
			// standalone one immediately after the (possibly just-rewritten,
			// now MULTI-LINE) '../../components' import above -- never by
			// counting physical lines from the top of the file. Step 1 can
			// turn a single-line import into three lines; "line 1" then lands
			// INSIDE that statement instead of after it, corrupting the file
			// (caught by re-running --self-test after this very fix, not
			// assumed correct on the first attempt).
			const anchorRe = /import\s*\{[^}]*\}\s*from\s*(['"])\.\.\/\.\.\/components\1\s*;/;
			const anchor = out.match( anchorRe );
			const insertAt = anchor ? anchor.index + anchor[ 0 ].length : out.indexOf( '\n' ) + 1;
			out =
				out.slice( 0, insertAt ) +
				`\nimport { PanelBody } from '@wordpress/components';` +
				out.slice( insertAt );
		}
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
\t\t\t\t\t\tradiusValues={ {
\t\t\t\t\t\t\tbase: attributes.borderRadius ?? {},
\t\t\t\t\t\t\ttablet: attributes.borderRadiusTablet ?? {},
\t\t\t\t\t\t\tmobile: attributes.borderRadiusMobile ?? {},
\t\t\t\t\t\t} }
\t\t\t\t\t\tonRadiusChange={ ( tier, next ) => {
\t\t\t\t\t\t\tconst radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
\t\t\t\t\t\t\tsetAttributes( { [ radiusKey ]: next } );
\t\t\t\t\t\t} }
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

	for ( const r of by( READY ) ) {
		console.log( `  READY   sgs/${ r.slug }` );
		if ( r.patternFiles && r.patternFiles.size ) {
			console.log(
				`            authored native border in ${ r.patternFiles.size } file(s) — ` +
					'migrated to private attrs in the SAME atomic write'
			);
			for ( const n of r.patternNotes || [] ) console.log( `            ⚠ ${ n }` );
		}
	}
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

		const newBj = transformBlockJson( readFile( bjPath ), r.adopt, r.radiusPlan );
		const newPhp = transformRenderPhp(
			readFile( phpPath ),
			r.anchors.rootVar,
			r.anchors.cssVar,
			r.anchors.cssKind,
			r.adopt
		);
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
			// Same atomic batch as block.json ON PURPOSE. WordPress SILENTLY
			// DISCARDS an attribute the block.json does not declare (D338), so a
			// pattern rewritten before its block declares borderWidth/Style/Colour
			// loses the value outright — the exact failure this refusal exists to
			// prevent.
			if ( r.patternFiles ) {
				for ( const [ p, text ] of r.patternFiles ) fs.writeFileSync( p, text );
			}
		}
		applied++;
		console.log( `  ${ apply ? 'MIGRATED' : 'would migrate' }  sgs/${ r.slug }` );
		if ( r.patternFiles && r.patternFiles.size ) {
			console.log(
				`            + ${ r.patternFiles.size } pattern file(s) rewritten: ` +
					[ ...r.patternFiles.keys() ].map( ( p ) => path.basename( p ) ).join( ', ' )
			);
			for ( const n of r.patternNotes || [] ) console.log( `            ⚠ ${ n }` );
		}
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
// ⛔ NAMED BASELINE — the 11 blocks that were migrated BEFORE radius was part of
// Shape B. Each has private width/style/colour but still declares native radius,
// so each is genuinely half-migrated under the corrected target shape. This is
// real debt, recorded rather than hidden: the gate still FAILS on a 12th block,
// so it cannot silently grow.
//
// It is a baseline and NOT a scope-narrowing. The check was left red on purpose
// when radius joined Shape B; it is baselined only because a red gate on main
// blocks every co-active session's build, and blocking other people's work is
// not an acceptable way to hold a reminder. Removing a name from this list is
// the definition of done for that block's radius migration — the list should
// only ever shrink.
//
// Follow-up: a radius-only migration for these 11. They sit OUTSIDE this
// codemod's NATIVE_FULL census bucket (they are already past it), so --fix does
// not reach them and they need their own pass.
//
// 2026-08-30: all 11 migrated (radius joined the other three legs as a
// block-private corner-object attr, base + tablet + mobile, painted via
// wp_style_engine_get_styles()/sgs_corner_object_shorthand() same as every
// other private radius tier in the tree). The set is empty, not deleted --
// a correctly-empty baseline is the proof the debt is paid, and a future
// regression re-adds a name here rather than silently reappearing.
const RADIUS_DEBT_BASELINE = new Set( [] );

function check() {
	const problems = [];
	const baselined = [];
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
		// Radius is now PART of the family Bean is asking us to make uniform
		// (2026-08-30 target-shape correction) -- a block with private width/
		// style/colour but STILL-NATIVE radius is exactly the non-uniformity
		// this check exists to surface. Kept as a REAL finding, not scoped away
		// (Bean-directed): 11 already-migrated blocks (accordion, button,
		// container, heading, icon-list, option-picker, process-steps,
		// product-card, quote, text, timeline) currently fail this for exactly
		// that reason and need their own follow-up radius migration.
		const hasPrivate = Boolean( a.borderWidth || a.borderStyle || a.borderColour || a.borderRadius );
		const nativeLegs = [ b.width, b.color, b.style, b.radius ].filter( ( v ) => v !== undefined ).length;

		if ( hasPrivate && nativeLegs > 0 ) {
			// A baselined block whose ONLY remaining native leg is radius is known
			// debt. Anything else about it — or any block not on the list — still
			// fails.
			const onlyRadius = b.radius !== undefined && b.width === undefined
				&& b.color === undefined && b.style === undefined;
			if ( RADIUS_DEBT_BASELINE.has( slug ) && onlyRadius ) {
				baselined.push( slug );
			} else {
			problems.push(
				`sgs/${ slug }: declares private border attrs AND still declares ${ nativeLegs } ` +
					'native border sub-flag(s) — two sources for one property'
			);
			}
		}
		const phpPath = path.join( BLOCKS_DIR, slug, 'render.php' );
		if ( hasPrivate && fs.existsSync( phpPath ) ) {
			const php = readFile( phpPath );
			// A block whose border rides the shared media-atom layer (the
			// `box-shape` atom, `sgs/media` as of 2026-09-01) reads these
			// attrs INDIRECTLY — via a computed `$attributes[ $radius_key ]`
			// inside `sgs_media_atom_box_shape_css()`, not a literal
			// `$attributes['borderRadius']` in the block's OWN render.php.
			// `SGS_Media_Element::style(...)` dispatching to a `box-shape`
			// atom is the paired emitter for that pattern, verified against
			// `includes/media/atoms/box-shape.php` — a genuinely different,
			// equally-real consumption path the literal regex below cannot
			// see, not a half-migrated block.
			const viaMediaAtom = /SGS_Media_Element::style\(/.test( php ) && /'box-shape'/.test( php );
			// A `wrapper`-prefixed private border (2026-09-06, sgs/social-icons) —
			// needed because this block ALSO has a per-item `iconBorderColour`
			// family, so the wrapper-level control needed a distinct name to avoid
			// colliding with it. Its width/style/colour attrs are read through
			// `sgs_border_states_css()`'s attribute-NAME map (a string value, not a
			// literal `$attributes['borderX']` access), and radius through
			// `sgs_border_radius_tiers( $attributes )` — both genuinely consume the
			// block.json-declared attrs, this regex just can't see through either
			// indirection. Same class of gap as viaMediaAtom above, not a new one.
			const viaWrapperPrefix = /'wrapperBorder(Width|Style|Colour)'/.test( php )
				&& /sgs_border_radius_tiers\(\s*\$attributes\s*\)/.test( php );
			if ( ! viaMediaAtom && ! viaWrapperPrefix && ! /\$attributes\['border(Width|Style|Colour|Radius)'\]/.test( php ) ) {
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
	if ( baselined.length ) {
		console.log(
			`CHECK OK — ${ baselined.length } baselined radius-debt block(s): ` +
				baselined.join( ', ' ) + '.'
		);
		console.log( '  These were migrated before radius joined Shape B. Real debt, not hidden.' );
		console.log( '  A 12th block fails this gate. The list should only ever shrink.' );
		return 0;
	}
	console.log( 'CHECK OK — no half-migrated blocks (private attrs always paired with an emitter).' );
	return 0;
}

// ─── Self-test ──────────────────────────────────────────────────────────────
function runSelfTest() {
	const failures = [];
	// Counted, not hardcoded: the old closing line asserted "27 assertions" as a
	// literal and stayed at 27 while assertions were added.
	let asserted = 0;
	let negatives = 0;
	const ok = ( cond, msg ) => {
		asserted++;
		if ( /NEGATIVE CONTROL/.test( msg ) ) negatives++;
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
	const outBj = JSON.parse( transformBlockJson( srcBj, [], { adopt: [], add: Object.keys( RADIUS_ATTRS ) } ) );
	ok( outBj.supports.__experimentalBorder === undefined,
		'block.json: __experimentalBorder support must be REMOVED ENTIRELY (radius is no longer native either)' );
	for ( const n of Object.keys( PRIVATE_ATTRS ) ) {
		ok( outBj.attributes[ n ] !== undefined, `block.json: ${ n } attribute must be added` );
	}
	for ( const n of Object.keys( RADIUS_ATTRS ) ) {
		ok( outBj.attributes[ n ] !== undefined, `block.json: ${ n } attribute must be added` );
	}
	ok( outBj.attributes.borderStyle.enum.length === 9,
		'block.json: borderStyle must carry the 9-value enum' );
	ok( outBj.attributes.borderStyle.default === 'solid',
		'block.json: borderStyle must default to SOLID — "none" is not a style, and a border is ' +
			'turned off by zero WIDTH. Defaulting to none produced widths+colours that painted nothing.' );
	// NEGATIVE CONTROL — 'none' must REMAIN selectable in the enum. Removing it
	// would make WP coerce every stored "none" to the new default and switch
	// borders on across live content.
	ok( outBj.attributes.borderStyle.enum.includes( 'none' ),
		'block.json NEGATIVE CONTROL: "none" must stay in the enum even though it is no longer the ' +
			'default — WP coerces an out-of-enum stored value to the default' );
	ok( outBj.attributes.title !== undefined,
		'block.json: pre-existing attributes must survive the transform' );
	const m = outBj.supports.sgs.elements.wrapper.attrMap;
	ok( m[ 'css:border-width' ] === 'borderWidth', 'attrMap: width leg must repoint off native:' );
	ok( m[ 'css:border-style' ] === 'borderStyle', 'attrMap: style leg must repoint off native:' );
	ok( m[ 'css:border-color' ] === 'borderColour', 'attrMap: colour leg must repoint off native:' );
	ok( m[ 'css:border-color-gradient' ] === 'borderColourGradient',
		'attrMap: gradient key must be ADDED' );
	// boxFamilies.borderRadius is what lets the DB seeder derive css_tier for the
	// tier attrs. Without it all three radius attrs collide on one routing slot.
	ok(
		JSON.stringify( outBj.supports.sgs.boxFamilies.borderRadius )
			=== JSON.stringify( [ 'borderRadiusTablet', 'borderRadiusMobile' ] ),
		'boxFamilies.borderRadius must be emitted — without it the 3 radius attrs collide on ' +
			'(border-radius, element=NULL, tier=NULL) and the resolver raises AmbiguousLayerAttrError'
	);
	// NEGATIVE CONTROL — an EXISTING boxFamilies.borderRadius must be preserved,
	// not overwritten: a block may legitimately list different tier attr names.
	const bfKeep = JSON.parse( transformBlockJson(
		JSON.stringify( { ...JSON.parse( srcBj ), supports: { ...JSON.parse( srcBj ).supports,
			sgs: { ...JSON.parse( srcBj ).supports.sgs, boxFamilies: { borderRadius: [ 'customTablet' ] } } } }, null, '	' ),
		[], { adopt: [], add: Object.keys( RADIUS_ATTRS ) }
	) );
	ok(
		JSON.stringify( bfKeep.supports.sgs.boxFamilies.borderRadius ) === JSON.stringify( [ 'customTablet' ] ),
		'boxFamilies NEGATIVE CONTROL: an existing borderRadius family must be PRESERVED, not overwritten'
	);
	ok( m[ 'css:border-radius' ] === 'borderRadius',
		'attrMap: radius leg must NOW ALSO repoint off native: (target-shape correction — radius is no ' +
			'longer permanently native)' );

	// 1b. reconcileRadiusAttrs — adopt-if-compatible, refuse-if-different, on
	// the full CORNER-KEY shape (not just type === 'object').
	// Positive: pre-existing borderRadiusTablet/Mobile (the sgs/media,
	// sgs/before-after shape) must be ADOPTED, not re-added or refused.
	const preExisting = {
		borderRadiusTablet: { type: 'object', default: {} },
		borderRadiusMobile: { type: 'object', default: {} },
	};
	const plan1 = reconcileRadiusAttrs( preExisting );
	ok( ! plan1.conflict, 'reconcile: compatible pre-existing corner-object radius attrs must not conflict' );
	ok( plan1.adopt.includes( 'borderRadiusTablet' ) && plan1.adopt.includes( 'borderRadiusMobile' ),
		'reconcile: pre-existing corner-object borderRadiusTablet/Mobile must be ADOPTED' );
	ok( plan1.add.includes( 'borderRadius' ) && ! plan1.add.includes( 'borderRadiusTablet' ),
		'reconcile: only the MISSING radius attr (base) is queued to ADD, not the adopted ones' );
	// Applying that plan through transformBlockJson must NOT re-declare the
	// adopted attrs' definitions (idempotent — no clobbering an existing
	// description/default this codemod doesn't know about).
	const bjWithExistingRadius = JSON.parse( JSON.stringify( JSON.parse( srcBj ) ) );
	bjWithExistingRadius.attributes.borderRadiusTablet =
		{ type: 'object', default: {}, description: 'pre-existing, do not touch' };
	const outBj2 = JSON.parse(
		transformBlockJson( JSON.stringify( bjWithExistingRadius ), [], plan1 ) );
	ok( outBj2.attributes.borderRadiusTablet.description === 'pre-existing, do not touch',
		'reconcile NEGATIVE CONTROL: an ADOPTED radius attr must survive the transform UNCHANGED, ' +
			'not be overwritten' );
	// NEGATIVE CONTROL (a) — incompatible TYPE. sgs/mega-panel's scalar string.
	const plan2 = reconcileRadiusAttrs( { borderRadius: { type: 'string', default: '20px' } } );
	ok( plan2.conflict && /borderRadius/.test( plan2.conflict ),
		'reconcile NEGATIVE CONTROL: an incompatible scalar borderRadius (sgs/mega-panel shape) must ' +
			'REFUSE, not silently overwrite' );
	// NEGATIVE CONTROL (b) — incompatible TYPE, array-form. sgs/label's shape.
	const plan3 = reconcileRadiusAttrs( { borderRadiusMobile: { type: [ 'string', 'number' ] } } );
	ok( Boolean( plan3.conflict ),
		'reconcile NEGATIVE CONTROL: an incompatible array-typed radius attr (sgs/label shape) must REFUSE' );
	// NEGATIVE CONTROL (c) — the TIGHTENED check: object-typed but NOT the corner
	// family (proves the check compares SHAPE, not just `type === 'object'`).
	const plan4 = reconcileRadiusAttrs( { borderRadius: { type: 'object', default: { x: 1, y: 2 } } } );
	ok( plan4.conflict && /corner family/.test( plan4.conflict ),
		'reconcile NEGATIVE CONTROL: an object-typed attr whose default is NOT the corner-key shape ' +
			'must still REFUSE — proves the check is stricter than `type === \'object\'` alone' );
	// ...and prove that tightened check is not vacuous: a REAL corner subset passes.
	const plan5 = reconcileRadiusAttrs( { borderRadius: { type: 'object', default: { topLeft: '4px' } } } );
	ok( ! plan5.conflict,
		'reconcile NEGATIVE CONTROL is not vacuous: a partial-but-real corner-key default (topLeft only) ' +
			'must still be ADOPTED' );

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
	// Radius emission — base + both tiers, same wp_style_engine_get_styles()
	// route already proven live by sgs/media + sgs/before-after's tiers, and
	// respecting the string vs array SINK (not appended raw — only ['css']).
	ok( /\$attributes\['borderRadius'\]/.test( em ),
		'emission must read the private borderRadius (base) attr' );
	ok( /\$attributes\['borderRadiusTablet'\]/.test( em ) && /\$attributes\['borderRadiusMobile'\]/.test( em ),
		'emission must read both private radius tier attrs' );
	ok( /wp_style_engine_get_styles\(/.test( em ),
		'emission must route radius through wp_style_engine_get_styles() (the proven live mechanism)' );
	ok( /@media\(max-width:1023px\)/.test( em ) && /@media\(max-width:767px\)/.test( em ),
		'emission must gate radius tiers at the project standard 1023/767 breakpoints' );
	ok( /\$my_css \.= \$border_radius_out\['css'\]/.test( em ),
		'emission: a STRING sink must append the style-engine result with `.=`, not push it raw' );
	const emArrRadius = renderPhpEmission( 'root_sel', 'scoped_css', SINK_ARRAY );
	ok( /\$scoped_css\[\] = \$border_radius_out\['css'\]/.test( emArrRadius ),
		'emission: an ARRAY sink must push the radius style-engine result with `[] =`, not `.=` ' +
			'(the coordinator-flagged hazard — `.=` on an array sink is a PHP fatal)' );
	ok( ! /\$scoped_css \.= \$border_radius_out/.test( emArrRadius ),
		'emission NEGATIVE CONTROL: an array-sink radius emission must NOT also carry the `.=` form' );

	// 3. stripNativeBorderReads must remove ALL FOUR legs, including radius now
	// (2026-08-30 correction — radius is no longer preserved as native), while
	// still respecting Pass 2 (orphan-consumer removal) and the comment-skip
	// guard already proven in section 11 below.
	const php = [
		"$border_args = array();",
		"if ( isset( $attributes['style']['border']['color'] ) ) {",
		"\t$border_args['color'] = $attributes['style']['border']['color'];",
		'}',
		"if ( isset( $attributes['style']['border']['radius'] ) ) {",
		"\t$border_args['radius'] = $attributes['style']['border']['radius'];",
		'}',
		"if ( isset( $attributes['style']['spacing']['padding'] ) ) {",
		"\t$x = 1;",
		'}',
	].join( '\n' );
	const strippedOut = stripNativeBorderReads( php );
	ok( ! /\['border'\]\['color'\]/.test( strippedOut.text ),
		'strip: the native COLOUR read must be removed' );
	ok( ! /\['border'\]\['radius'\]/.test( strippedOut.text ),
		'strip: the native RADIUS read must NOW ALSO be removed (radius is no longer native)' );
	// NEGATIVE CONTROL — over-strip guard: an unrelated (non-border) style read
	// must SURVIVE, proving the stripper is scoped to border sub-keys only.
	ok( /\['spacing'\]\['padding'\]/.test( strippedOut.text ),
		'strip NEGATIVE CONTROL: a non-border style read (spacing) must SURVIVE' );

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

	// 6. transformEditJs must mount the radius pair (onRadiusChange), not just
	// the width/style/colour trio -- an unmigrated radius leg is a net-new
	// CHECK A finding (attribute declared, no control exposed).
	const radiusEditSrc = [
		"import { ResponsiveBoxControl } from '../../components';",
		'function Edit( { attributes, setAttributes } ) {',
		'\treturn (',
		'\t\t<InspectorControls>',
		'\t\t</InspectorControls>',
		'\t);',
		'}',
	].join( '\n' );
	const outEdit = transformEditJs( radiusEditSrc );
	ok( outEdit !== null, 'edit.js: transform must succeed against a plain InspectorControls block' );
	ok( /SgsBorderControl/.test( outEdit ), 'edit.js: SgsBorderControl must be imported + mounted' );
	ok( /onRadiusChange=/.test( outEdit ) && /radiusValues=/.test( outEdit ),
		'edit.js: the radius pair (radiusValues/onRadiusChange) must be wired, not just width/style/colour' );
	ok( /attributes\.borderRadius \?\? \{\}/.test( outEdit ),
		'edit.js: radiusValues.base must read the private borderRadius attr' );
	ok( /borderRadiusTablet/.test( outEdit ) && /borderRadiusMobile/.test( outEdit ),
		'edit.js: onRadiusChange must resolve both tablet and mobile attr keys' );
	// NEGATIVE CONTROL — already-mounted guard must still fire (unchanged
	// behaviour): re-running against SgsBorderControl-bearing source refuses.
	ok( transformEditJs( outEdit ) === null,
		'edit.js NEGATIVE CONTROL: an already-mounted block must be refused (returns null), not double-mounted' );

	// 7. Collision reconciliation — the attr-name-collision category.
	// Fixture models sgs/hero: an existing borderColourGradient with the SAME
	// semantic (wrapper-bound, painted on the root selector).
	const compatBj = {
		attributes: {
			borderColourGradient: { type: 'string', default: '', description: 'D701 resting ring.' },
		},
		supports: {
			sgs: {
				elements: {
					wrapper: {
						isWrapper: true,
						attrMap: { 'css:border-color-gradient': 'borderColourGradient' },
					},
				},
			},
		},
	};
	const compatPhp = [
		"$root_sel = '.x';",
		"// D701 — resting border gradient.",
		"$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );",
		"// paints the ring",
		"if ( '' !== $border_colour_gradient ) {",
		"\t$native_border_width_val = isset( $attributes['style']['border']['width'] ) ? $attributes['style']['border']['width'] : '';",
		"\t$responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '1px' );",
		'}',
		"$responsive_css .= $root_sel . '{color:red;}';",
		'echo $responsive_css;',
	].join( '\n' );

	const rec = reconcileCollision( compatBj, compatPhp, 'root_sel', 'borderColourGradient' );
	ok( rec.ok === true, 'reconcile: a same-semantic borderColourGradient must be ADOPTED, not refused' );
	ok( rec.painter && rec.painter.localVar === 'border_colour_gradient',
		'reconcile: the painter local must be identified (fixture declares $border_colour_gradient)' );

	// NEGATIVE CONTROL (a) — WRONG SHAPE. Same name, object-typed: must REFUSE.
	const wrongShape = JSON.parse( JSON.stringify( compatBj ) );
	wrongShape.attributes.borderColourGradient = { type: 'object', default: {} };
	const recShape = reconcileCollision( wrongShape, compatPhp, 'root_sel', 'borderColourGradient' );
	ok( recShape.ok === false && /SHAPE/.test( recShape.why ),
		'reconcile NEGATIVE CONTROL (a): an object-typed same-named attr must STILL be refused' );

	// NEGATIVE CONTROL (b) — WRONG SEMANTIC. Right shape, but bound to a NON-wrapper
	// sub-part (the sgs/hero splitMediaBorderColourGradient hazard): must REFUSE.
	const wrongSemantic = JSON.parse( JSON.stringify( compatBj ) );
	wrongSemantic.supports.sgs.elements = {
		'split-image': {
			isWrapper: false,
			attrMap: { 'css:border-color-gradient': 'borderColourGradient' },
		},
	};
	const recSem = reconcileCollision( wrongSemantic, compatPhp, 'root_sel', 'borderColourGradient' );
	ok( recSem.ok === false && /WRAPPER/.test( recSem.why ),
		'reconcile NEGATIVE CONTROL (b): a same-shaped attr bound to a NON-wrapper element ' +
			'names another part and must STILL be refused' );

	// NEGATIVE CONTROL (c) — NO PAINTER. Declared but never emitted: must REFUSE.
	const recNoPaint = reconcileCollision(
		compatBj,
		"$root_sel = '.x'; $responsive_css .= $root_sel . '{color:red;}'; echo $responsive_css;",
		'root_sel',
		'borderColourGradient'
	);
	ok( recNoPaint.ok === false && /no sgs_border_gradient_css/.test( recNoPaint.why ),
		'reconcile NEGATIVE CONTROL (c): a declared-but-unpainted attr must STILL be refused' );

	// NEGATIVE CONTROL (d) — an unreconcilable NAME. Only borderColourGradient has
	// a rule; the other three legs must never be silently adopted.
	for ( const n of [ 'borderWidth', 'borderStyle', 'borderColour' ] ) {
		const r = reconcileCollision( compatBj, compatPhp, 'root_sel', n );
		ok( r.ok === false && /no reconciliation rule/.test( r.why ),
			`reconcile NEGATIVE CONTROL (d): \`${ n }\` has no rule and must STILL be refused` );
	}

	// NEGATIVE CONTROL (e) — the HOVER ring must not be mistaken for the resting one.
	const hoverPhp = [
		"$root_sel = '.x';",
		"$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );",
		"if ( '' !== $border_colour_gradient ) {",
		"\t$responsive_css .= sgs_border_gradient_css( \"{$root_sel}:hover\", $border_colour_gradient, null, '1px' );",
		'}',
	].join( '\n' );
	ok( findGradientPainter( hoverPhp, 'borderColourGradient', 'root_sel' ) === null,
		'findGradientPainter NEGATIVE CONTROL (e): a :hover-scoped ring is NOT the resting painter' );

	// 8. transformBlockJson must ADOPT rather than overwrite.
	const adoptSrcBj = JSON.stringify( {
		name: 'sgs/fixture',
		supports: {
			__experimentalBorder: { radius: true, width: true, color: true, style: true },
			sgs: { elements: { wrapper: { isWrapper: true, attrMap: {
				'css:border-color': 'native:__experimentalBorder.color',
				'css:border-color-gradient': 'borderColourGradient',
			} } } },
		},
		attributes: {
			borderColourGradient: { type: 'string', default: '', description: 'KEEP ME (D701).' },
		},
	}, null, '\t' );
	const adoptOutRaw = transformBlockJson( adoptSrcBj, [ 'borderColourGradient' ] );
	const adoptOut = JSON.parse( adoptOutRaw );
	ok( adoptOut.attributes.borderColourGradient.description === 'KEEP ME (D701).',
		'adopt: an adopted attribute must keep its ORIGINAL declaration verbatim, not be overwritten ' +
			'with the generic PRIVATE_ATTRS text' );
	ok( ( adoptOutRaw.match( /"borderColourGradient"\s*:/g ) || [] ).length === 1,
		'adopt: borderColourGradient must appear EXACTLY ONCE — no duplicate key' );
	for ( const n of [ 'borderWidth', 'borderStyle', 'borderColour' ] ) {
		ok( adoptOut.attributes[ n ] !== undefined,
			`adopt: the missing leg ${ n } must still be ADDED alongside the adopted attr` );
	}
	// NEGATIVE CONTROL — with NO adopt list the attribute IS overwritten. This
	// proves the adopt branch is load-bearing rather than vacuously always-on.
	const noAdoptOut = JSON.parse( transformBlockJson( adoptSrcBj, [] ) );
	ok( noAdoptOut.attributes.borderColourGradient.description !== 'KEEP ME (D701).',
		'adopt NEGATIVE CONTROL: without an adopt list the attr IS replaced — the branch is real' );

	// 9. transformRenderPhp must excise the superseded emission (exactly ONE painter).
	const adoptedPhp = transformRenderPhp( compatPhp, 'root_sel', 'responsive_css', SINK_STRING,
		[ 'borderColourGradient' ] );
	ok( adoptedPhp !== null, 'adopt: the render.php transform must succeed for an adopted attr' );
	const painterCalls = ( adoptedPhp.replace( /^\s*\/\/.*$/gm, '' )
		.match( /sgs_border_gradient_css\s*\(/g ) || [] ).length;
	ok( painterCalls === 1,
		`adopt: exactly ONE resting-gradient painter must survive (found ${ painterCalls }) — ` +
			'two would double-paint the ring and be unfalsifiable' );
	ok( ! /\$native_border_width_val/.test( adoptedPhp ),
		'adopt: the superseded block\'s local ($native_border_width_val) must go WITH it, ' +
			'not be left dangling' );
	ok( ! /D701 — resting border gradient/.test( adoptedPhp ),
		'adopt: the superseded emission\'s leading comment must be removed with it — ' +
			'an orphan comment describes behaviour that no longer exists' );
	ok( /\$attributes\['borderColourGradient'\]/.test( adoptedPhp ),
		'adopt: the adopted attribute must STILL be read — by the new unified emission' );

	// 10. Dangling-variable guard.
	ok( danglingUnguardedVars( "$a = 1;\n'' !== $a;", "'' !== $a;" ).includes( 'a' ),
		'dangling guard: an UNGUARDED read of a variable whose assignment was removed must be caught' );
	// NEGATIVE CONTROL — the isset()-guarded shape is benign dead code and must NOT
	// be flagged. All 13 pre-existing READY blocks lose $sgs_border_style_width this
	// way; flagging it would regress every one of them.
	ok(
		danglingUnguardedVars(
			"$sgs_border_style_width = f();\nif ( isset( $sgs_border_style_width['width'] ) ) {\n\t$b['width'] = $sgs_border_style_width['width'];\n}",
			"if ( isset( $sgs_border_style_width['width'] ) ) {\n\t$b['width'] = $sgs_border_style_width['width'];\n}"
		).length === 0,
		'dangling guard NEGATIVE CONTROL: an isset()-guarded survivor is benign dead code and ' +
			'must NOT be flagged (else all 13 already-READY blocks regress)' );

	// 10b. The guard must be WIRED INTO transformRenderPhp, not merely unit-tested.
	// Found by mutation: deleting `if ( dangling.length ) return null;` left the
	// whole self-test green, because assertion 10 only exercised the helper.
	const danglerPhp = [
		"$root_sel = '.x';",
		"$w = $attributes['style']['border']['width'];",
		"$responsive_css .= ( '' !== $w ) ? 'a' : 'b';",
		'echo $responsive_css;',
	].join( '\n' );
	// ⚠ SUPERSEDED BY PASS 2, recorded rather than deleted. This originally
	// asserted a REFUSAL: stripping the `$w = $attributes['style']['border']
	// ['width']` assignment left `'' !== $w` reading a variable nothing assigns,
	// and the guard refused the file. Pass 2 of stripNativeBorderReads (added by
	// a different rater, in the same merge) now removes the CONSUMER of an
	// orphaned variable too, so no dangling read survives to refuse on and the
	// transform legitimately succeeds. Two raters solved one problem two ways;
	// Pass 2 reaches it first. The assertion now pins the REAL behaviour —
	// the orphaned read must be GONE — which is the property that actually
	// matters. danglingUnguardedVars stays wired at transformRenderPhp for the
	// cases Pass 2 cannot see, and its own unit assertions above still cover it.
	const danglerOut = transformRenderPhp( danglerPhp, 'root_sel', 'responsive_css', SINK_STRING, [] );
	ok( danglerOut !== null && ! /\$w/.test( danglerOut ),
		'dangling guard WIRING: stripping must leave NO unguarded read of $w — Pass 2 removes ' +
			'the orphaned consumer, so the file is safe rather than refused' );
	// NEGATIVE CONTROL — the identical shape with the read GUARDED must succeed,
	// proving the wiring does not simply refuse everything.
	const safePhp = [
		"$root_sel = '.x';",
		"$w = $attributes['style']['border']['width'];",
		"if ( isset( $w ) ) { $responsive_css .= 'a'; }",
		'echo $responsive_css;',
	].join( '\n' );
	ok( transformRenderPhp( safePhp, 'root_sel', 'responsive_css', SINK_STRING, [] ) !== null,
		'dangling guard WIRING NEGATIVE CONTROL: an isset()-guarded survivor must still ' +
			'transform successfully (the guard is not a blanket refusal)' );

	// 11. The stripper must not fire on a COMMENT naming the native border path.
	const commentTrap = [
		"// wins over the native $attributes['style']['border']['color'] further down",
		"$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );",
	].join( '\n' );
	const trapOut = stripNativeBorderReads( commentTrap );
	ok( /\$border_colour_gradient = sgs_css_gradient_value/.test( trapOut.text ),
		'strip NEGATIVE CONTROL: a COMMENT naming the native border path must NOT start a drop — ' +
			'it ate sgs/hero\'s live D701 assignment four lines later' );
	// ...and prove the comment guard has not disabled the stripper entirely.
	ok( stripNativeBorderReads(
		"$border_args['color'] = $attributes['style']['border']['color'];" ).removed === 1,
		'strip: a REAL native colour read is still removed (the comment guard is not a blanket off-switch)' );

	// 7. ARRAY-PUSH SINK — the idiom 11 of the 18 ambiguous-anchor refusals use.
	// Fixture mirrors the real sgs/testimonial shape: an array sink initialised
	// with array(), pushed a CSS rule, guarded, then imploded into a <style>.
	const arrPhp = [
		"$root_sel = '.' . $uid . '.wp-block-sgs-testimonial';",
		'$scoped_css = array();',
		"$scoped_css[] = $root_sel . '{color:red;}';",
		"$meta_parts[] = '<span class=\"x\">' . $label . '</span>';",
		'?>',
		'<?php if ( $scoped_css ) : ?>',
		'<style><?php echo wp_strip_all_tags( implode( \'\', $scoped_css ) ); ?></style>',
		'<?php endif; ?>',
	].join( '\n' );
	const arrA = findAnchors( arrPhp );
	ok( arrA.cssVar === 'scoped_css', 'anchors: an array-push CSS sink must be detected' );
	ok( arrA.cssKind === SINK_ARRAY, 'anchors: an array-push sink must be reported as kind=array' );
	ok( arrA.rootVar === 'root_sel', 'anchors: root_sel must still win when present' );
	// NEGATIVE CONTROL — the array-idiom twin of the $logos_html control above.
	// These very files build their MARKUP by array push ($meta_parts[],
	// $attr_parts[], $classes[]); pushing CSS into one would corrupt the output.
	ok( ! arrA.cssCandidates.includes( 'meta_parts' ),
		'anchors NEGATIVE CONTROL: an HTML array accumulator ($meta_parts[]) must NOT be a CSS-sink candidate' );
	// NEGATIVE CONTROL — a name used under BOTH idioms cannot be both a string
	// and an array; guessing would emit either a fatal or a silent $x[0] write.
	const conflicted = findAnchors(
		"$root_sel = '.x'; $mix_css .= '{a:b;}'; $mix_css[] = '{c:d;}';"
	);
	ok( conflicted.cssVar === null,
		'anchors NEGATIVE CONTROL: a name appended BOTH ways is contradictory and must be refused' );

	// 8. The emission must match the sink's type.
	const emArr = renderPhpEmission( 'root_sel', 'scoped_css', SINK_ARRAY );
	ok( /\$scoped_css\[\] = /.test( emArr ),
		'emission: an array sink must be written with `[] =`' );
	ok( ! /\$scoped_css \.=/.test( emArr ),
		'emission NEGATIVE CONTROL: an array sink must NOT use `.=` (PHP fatal, Unsupported operand types)' );
	ok( /\$my_css \.=/.test( renderPhpEmission( 'root_sel', 'my_css', SINK_STRING ) ),
		'emission: a string sink must still be written with `.=`' );

	// 9. ROOT-SELECTOR FALLBACK — 5 of the 18 name it per-block, not root_sel.
	const fbPhp = "$sgs_form_sel = '.' . $sgs_form_uid . '.sgs-form';\n$sgs_form_supports_css .= $sgs_form_sel . '{a:b;}';";
	ok( findAnchors( fbPhp ).rootVar === 'sgs_form_sel',
		'anchors: a per-block `*_sel` assigned a ROOT-selector literal must be accepted' );
	// NEGATIVE CONTROL — a DESCENDANT selector must never be taken as the root.
	// sgs/testimonial declares $sgs_tm_link_sel = $root_sel . ' a'; scoping the
	// border there would paint it on a child element instead of the block.
	const descPhp = "$sgs_tm_link_sel = $root_sel . ' a';\n$x_css .= $sgs_tm_link_sel . '{a:b;}';";
	ok( findAnchors( descPhp ).rootVar === null,
		'anchors NEGATIVE CONTROL: a descendant selector ($x_sel = $root_sel . \' a\') must NOT be taken as the root' );
	// NEGATIVE CONTROL — two competing root literals is ambiguous, not a coin toss.
	const twoPhp = "$a_sel = '.' . $uid . '.one';\n$b_sel = '.' . $uid . '.two';\n$x_css .= $a_sel . '{a:b;}';";
	ok( findAnchors( twoPhp ).rootVar === null,
		'anchors NEGATIVE CONTROL: two root-selector literals must be refused, not guessed between' );

	// 10. INSERTION POINT — before the guard, not before the print.
	const guarded = [
		"$responsive_css = '';",
		"$responsive_css .= '.x{a:b;}';",
		'if ( $responsive_css ) {',
		"\tprintf( '<style>%s</style>', $responsive_css );",
		'}',
	].join( '\n' );
	const gOut = transformRenderPhp( guarded, 'root_sel', 'responsive_css', SINK_STRING );
	ok( gOut !== null, 'insertion: a guarded string sink must still be transformable' );
	ok( gOut.indexOf( 'Shape B' ) < gOut.indexOf( 'if ( $responsive_css ) {' ),
		'insertion: the emission must land BEFORE `if ( $responsive_css )` — inside it, a ' +
			'border-only block would emit nothing at all (measured on 9 blocks, 2026-08-29)' );
	// NEGATIVE CONTROL — the assertion above cannot pass vacuously on a missing
	// marker: indexOf returns -1 for absent text, which is "before" everything.
	ok( gOut.indexOf( 'Shape B' ) !== -1 && gOut.indexOf( 'if ( $responsive_css ) {' ) !== -1,
		'insertion NEGATIVE CONTROL: both index probes must actually be found (guards -1 < n)' );
	// NEGATIVE CONTROL — no top-level read means no proven-safe point. Here the
	// only read is INDENTED (inside a foreach), where the emission would run
	// once per iteration or not at all. Refuse rather than guess.
	const nestedOnly = [
		"$only_css = '';",
		'foreach ( $items as $i ) {',
		"\techo $only_css;",
		'}',
	].join( '\n' );
	ok( findInsertionIndex( nestedOnly, 'only_css' ) === -1,
		'insertion NEGATIVE CONTROL: an indented-only read is NOT a safe insertion point' );

	// 11. PHP-MODE WRAPPING — an array-sink tail sits in HTML mode.
	const arrOut = transformRenderPhp( arrPhp, 'root_sel', 'scoped_css', SINK_ARRAY );
	ok( arrOut !== null, 'insertion: the array fixture must be transformable' );
	ok( /<\?php\n\/\/ ── Block-private border/.test( arrOut ),
		'insertion: an emission landing in HTML mode must be wrapped in <?php ... ?> — ' +
			'bare PHP there prints the migration source as visible page text (and still parses)' );
	ok( arrOut.indexOf( 'Shape B' ) < arrOut.indexOf( '<?php if ( $scoped_css ) : ?>' ),
		'insertion: the array emission must precede the `if ( $scoped_css )` guard' );
	// NEGATIVE CONTROL — a PHP-mode insertion must NOT gain a stray <?php, which
	// would be a parse error the moment it reopened an already-open tag.
	ok( ! /<\?php\n\/\/ ── Block-private border/.test( gOut ),
		'insertion NEGATIVE CONTROL: a PHP-mode insertion must NOT be wrapped in <?php' );
	ok( inHtmlMode( '<?php $a = 1; ?>\nplain', 20 ) === true &&
			inHtmlMode( '<?php $a = 1;\n$b = 2;', 15 ) === false,
		'inHtmlMode must distinguish HTML mode from PHP mode' );
	// 8. Authored-border detector — the false positive this narrowing fixes.
	// POSITIVE CONTROL: a per-side WIDTH is a genuine hazard and must be caught.
	const perSide = { top: { color: 'var:preset|color|border', width: '1px' } };
	ok( splitAuthoredBorder( perSide ).hasRisk === true,
		'authored-border POSITIVE CONTROL: border.top.width must be detected as at-risk' );
	ok( splitAuthoredBorder( { width: '2px', color: 'var:preset|color|primary' } ).hasRisk === true,
		'authored-border POSITIVE CONTROL: a FLAT border width/colour must be detected as at-risk' );
	// NEGATIVE CONTROL: radius stays NATIVE under Shape B, so a radius-only
	// authored border is not at risk. This is the measured sgs/media false
	// positive (theme/sgs-theme/patterns/about-image-left.php).
	ok( splitAuthoredBorder( { radius: '16px' } ).hasRisk === false,
		'authored-border NEGATIVE CONTROL: a radius-only border must NOT trigger a refusal ' +
			'(radius stays native — measured false positive on sgs/media)' );
	ok( splitAuthoredBorder( { radius: { topLeft: '14px', topRight: '14px' } } ).hasRisk === false,
		'authored-border NEGATIVE CONTROL: a per-corner radius-only border must NOT trigger' );
	ok( splitAuthoredBorder( undefined ).hasRisk === false,
		'authored-border NEGATIVE CONTROL: no border at all must NOT trigger' );
	// ...and the radius must SURVIVE into `keep`, not be silently dropped.
	ok( splitAuthoredBorder( { radius: '16px', width: '1px' } ).keep.radius === '16px',
		'authored-border: radius must be preserved in the keep set alongside an at-risk width' );

	// 8. Colour-token conversion — proven against the real PHP helper.
	// `sgs_colour_value('var:preset|color|border')` was MEASURED returning
	// var(--wp--preset--color--varpresetcolorborder): the slug sanitiser eats the
	// punctuation. Only the bare slug resolves correctly.
	ok( patternColourToAttr( 'var:preset|color|border' ) === 'border',
		'colour token: `var:preset|color|border` must be stored as the bare slug `border`' );
	ok( patternColourToAttr( 'var:preset|color|surface-alt' ) === 'surface-alt',
		'colour token: a hyphenated slug must survive intact' );
	// NEGATIVE CONTROL — a raw colour and a resolved var() must pass THROUGH
	// untouched; over-eager stripping would corrupt them.
	ok( patternColourToAttr( '#ff0000' ) === '#ff0000',
		'colour token NEGATIVE CONTROL: a raw hex colour must pass through unchanged' );
	ok( patternColourToAttr( 'var(--wp--preset--color--border)' ) === 'var(--wp--preset--color--border)',
		'colour token NEGATIVE CONTROL: an already-resolved var() must pass through unchanged' );

	// 9. Migration planner — losslessness gate.
	const planOk = planPatternBorderMigration( splitAuthoredBorder( perSide ) );
	ok( planOk.ok === true, 'planner: the real footer/header per-side border must be migratable' );
	ok( JSON.stringify( planOk.attrs.borderWidth ) === '{"top":"1px"}',
		'planner: per-side width must map LOSSLESSLY into the borderWidth object' );
	ok( planOk.attrs.borderColour === 'border',
		'planner: the colour token must be stored as the bare slug' );
	ok( planOk.attrs.borderStyle === 'solid',
		'planner: with no authored style, `solid` is inferred so the hairline renders' );
	ok( planOk.notes.some( ( n ) => /INFERENCE/.test( n ) ),
		'planner: the inferred style must be REPORTED as an inference, never silent' );
	// NEGATIVE CONTROL — the lossy case must REFUSE, not flatten. `borderColour`
	// is one string; two different painted-side colours cannot be expressed.
	const lossy = planPatternBorderMigration(
		splitAuthoredBorder( {
			top: { color: 'var:preset|color|border', width: '1px' },
			bottom: { color: 'var:preset|color|accent', width: '1px' },
		} )
	);
	ok( lossy.ok === false && /COLOURS differ/.test( lossy.reason ),
		'planner NEGATIVE CONTROL: two different per-side colours must REFUSE, not flatten ' +
			'(silently losing the client design is the failure mode this guards)' );
	// ...and prove that gate is not vacuous: the SAME colour on two sides is fine.
	const twoSameSides = planPatternBorderMigration(
		splitAuthoredBorder( {
			top: { color: 'var:preset|color|border', width: '1px' },
			bottom: { color: 'var:preset|color|border', width: '2px' },
		} )
	);
	ok( twoSameSides.ok === true &&
		JSON.stringify( twoSameSides.attrs.borderWidth ) === '{"top":"1px","bottom":"2px"}',
		'planner NEGATIVE CONTROL is not vacuous: two sides sharing one colour must MIGRATE, ' +
			'carrying both widths' );

	// 10. Pattern rewrite — end-to-end on the REAL authored span.
	const realSpan =
		'{"rowSlot":"bottom","layout":"flex","justifyContent":"center",' +
		'"padding":{"desktop":{"top":"var(--wp--preset--spacing--40)"}},' +
		'"style":{"border":{"top":{"color":"var:preset|color|border","width":"1px"}}}}';
	const rewritten = rewritePatternAttrJson( realSpan, planOk );
	ok( rewritten !== null, 'rewrite: the real footer-centred.php span must rewrite successfully' );
	const rp = JSON.parse( rewritten );
	ok( rp.borderColour === 'border' && rp.borderStyle === 'solid' &&
		JSON.stringify( rp.borderWidth ) === '{"top":"1px"}',
		'rewrite: the three private attrs must be present and correct in the output JSON' );
	ok( rp.style === undefined,
		'rewrite: an emptied `style` object must be removed entirely, not left as {}' );
	ok( rp.rowSlot === 'bottom' && rp.layout === 'flex' && rp.justifyContent === 'center',
		'rewrite: every unrelated attribute must survive byte-for-byte' );
	ok( JSON.stringify( rp.padding ) ===
		'{"desktop":{"top":"var(--wp--preset--spacing--40)"}}',
		'rewrite: a nested unrelated object (padding) must survive intact' );
	// NEGATIVE CONTROL — radius must SURVIVE the rewrite as a native style.border
	// value; it is not part of Shape B and stripping it would lose a real design.
	const mixedSplit = splitAuthoredBorder( { radius: '12px', width: '2px', color: 'var:preset|color|primary' } );
	const mixedPlan = planPatternBorderMigration( mixedSplit );
	const mixedOut = rewritePatternAttrJson(
		'{"style":{"border":{"radius":"12px","width":"2px","color":"var:preset|color|primary"}}}',
		mixedPlan
	);
	ok( mixedOut !== null, 'rewrite: a mixed radius+width+colour border must rewrite' );
	const mp = JSON.parse( mixedOut );
	ok( mp.style.border.radius === '12px',
		'rewrite NEGATIVE CONTROL: the native RADIUS must SURVIVE inside style.border ' +
			'(radius is not part of Shape B)' );
	ok( mp.style.border.width === undefined && mp.style.border.color === undefined,
		'rewrite: the at-risk width/colour legs must be gone from style.border' );
	ok( mp.borderColour === 'primary' && JSON.stringify( mp.borderWidth ) ===
		'{"top":"2px","right":"2px","bottom":"2px","left":"2px"}',
		'rewrite: a FLAT authored width must expand to all four sides' );
	// NEGATIVE CONTROL — the string-aware span finder must not be fooled by a
	// brace inside a quoted value.
	// `{"a":"}}}"}` — the value starts at index 5 and ends at index 10.
	ok( jsonValueEnd( '{"a":"}}}"}', 5 ) === 10,
		'jsonValueEnd NEGATIVE CONTROL: a `}` inside a quoted string must not end the span' );
	ok( jsonValueEnd( '{"a":{"b":"}"},"c":1}', 5 ) === 14,
		'jsonValueEnd NEGATIVE CONTROL: a `}` inside a nested quoted string must not end the object' );

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

	// 12a. edit.js IMPORT INJECTION must not double a comma the file already
	// has. Regression fixture for the live defect found 2026-08-30 across 9 of
	// 32 migrated blocks: a multi-line '../../components' import whose LAST
	// specifier already ends in its own trailing comma (e.g. brand-strip's
	// real shape) got a SECOND comma appended, a JS SyntaxError `php -l`
	// cannot see.
	const editImpTrailingComma = transformEditJs(
		"import { __ } from '@wordpress/i18n';\n" +
			'import {\n\tSgsColourPanel,\n\tLinkPopoverField,\n} from \'../../components\';\n' +
			'export default function Edit() {\n\treturn <><InspectorControls>\n\t\t\t</InspectorControls></>;\n}\n'
	);
	ok( ! /,,/.test( editImpTrailingComma ),
		'edit.js import: a pre-existing trailing comma on the last specifier must not be DOUBLED — ' +
			'the exact live defect (brand-strip, counter, hero, notice-banner, physics-canvas, ' +
			'site-footer-row, site-header-row, table-of-contents, testimonial; 2026-08-30)' );
	// NEGATIVE CONTROL — the fixture genuinely has a trailing comma to double,
	// proving the assertion above is not vacuous.
	ok( /LinkPopoverField,\s*$/m.test(
		"import {\n\tSgsColourPanel,\n\tLinkPopoverField,\n} from '../../components';"
	),
		'edit.js import NEGATIVE CONTROL is not vacuous: the fixture\'s last specifier really does end in a comma' );

	// 12b2. PanelBody import must be ADDED when genuinely absent, and must
	// never corrupt the (possibly just-rewritten, now multi-line)
	// '../../components' import it sits next to. Regression fixture for the
	// live defect found 2026-08-30 on accordion-item: the only migrated block
	// with zero prior PanelBody usage, which threw two ReferenceErrors at
	// runtime that neither php -l nor this tool's own pre-fix self-test caught.
	const editImpNoPanelBody = transformEditJs(
		"import { __ } from '@wordpress/i18n';\n" +
			"import { SgsColourPanel } from '../../components';\n" +
			'export default function Edit() {\n\treturn <><InspectorControls>\n\t\t\t</InspectorControls></>;\n}\n'
	);
	ok( /import \{ PanelBody \} from '@wordpress\/components';/.test( editImpNoPanelBody ),
		'edit.js import: PanelBody is added as a standalone import when the file has ' +
			'no @wordpress/components import and no prior PanelBody usage at all' );
	ok( /\} from '\.\.\/\.\.\/components';\nimport \{ PanelBody \}/.test( editImpNoPanelBody ),
		"edit.js import: the PanelBody import must land immediately AFTER the full " +
			"(possibly multi-line) '../../components' import statement, never spliced " +
			'inside it by counting physical lines from the top of the file' );
	// NEGATIVE CONTROL — a block that already has PanelBody must NOT get a
	// second import of it.
	const editImpHasPanelBody = transformEditJs(
		"import { __ } from '@wordpress/i18n';\n" +
			"import { PanelBody } from '@wordpress/components';\n" +
			"import { SgsColourPanel } from '../../components';\n" +
			'export default function Edit() {\n\treturn <><InspectorControls>\n' +
			'\t\t\t<PanelBody title="Existing"></PanelBody>\n\t\t\t</InspectorControls></>;\n}\n'
	);
	ok( ( editImpHasPanelBody.match( /@wordpress\/components/g ) || [] ).length === 1,
		'edit.js import NEGATIVE CONTROL: a block that already imports PanelBody must not get ' +
			'a second @wordpress/components import' );

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
	// Radius is REMOVED now too (2026-08-30 correction) -- this fixture's own
	// `$attributes['style']['border']['radius']` read is itself a native-border
	// touch and Pass 1 removes that single guarded line, same as any other leg.
	ok( ! /\$attributes\['style'\]\['border'\]\['radius'\]/.test( orphanOut.text ),
		'strip: the native RADIUS read inside an unrelated isset()-guarded block must ALSO be removed now' );
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
	console.log(
		`SELF-TEST OK — ${ asserted } assertions passed (${ negatives } of them negative controls).`
	);
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
	findInsertionIndex,
	inHtmlMode,
	SINK_STRING,
	SINK_ARRAY,
	classify,
	stripNativeBorderReads,
	renderPhpEmission,
	reservedStyleAttr,
	reconcileRadiusAttrs,
	splitAuthoredBorder,
	patternColourToAttr,
	planPatternBorderMigration,
	rewritePatternAttrJson,
	themeAuthoredBorder,
	planPatternRewrites,
	jsonValueEnd,
	reconcileCollision,
	findGradientPainter,
	cutSpanWithLeadingComments,
	danglingUnguardedVars,
	chooseReservedStyleName,
	renameStyleBlockJson,
	renameStyleEditJs,
	renameStyleRenderPhp,
	planReservedStyleRename,
	findConsumptionLineStart,
};
