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
	else if ( named.length > 1 ) cssVar = null; // ambiguous on purpose
	else if ( candidates.size === 1 ) cssVar = [ ...candidates.keys() ][ 0 ];

	const cssKind = cssVar ? candidates.get( cssVar ).kind : null;
	return { rootVar, cssVar, cssKind, cssCandidates: [ ...candidates.keys() ] };
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

	// Authored native border in pattern/template markup. A radius-only value is
	// NOT a hazard (radius stays native) and never reaches here. Everything that
	// does reach here is migrated ALONGSIDE the block, in the same atomic write:
	// writing the private attrs into markup BEFORE block.json declares them
	// would have WordPress silently discard every one of them (D338).
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
				liveness,
			};
		}
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
				( anchors.cssKind ? ` (${ anchors.cssKind } sink)` : '' ) +
				( anchors.cssCandidates.length
					? ` (css candidates: ${ anchors.cssCandidates.join( ', ' ) })`
					: '' ),
			liveness,
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
			liveness,
		};
	}

	return {
		slug,
		status: READY,
		liveness,
		anchors,
		patternFiles: patternPlan ? patternPlan.files : null,
		patternNotes: patternPlan ? patternPlan.notes : [],
	};
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

function transformRenderPhp( php, rootVar, cssVar, cssKind = SINK_STRING ) {
	const stripped = stripNativeBorderReads( php );
	const emission = renderPhpEmission( rootVar, cssVar, cssKind );
	// Insert on the line the accumulator is first READ (see findInsertionIndex),
	// so the new rules are part of the same scoped <style> AND are appended
	// before any guard that tests whether the accumulator is non-empty.
	const lineStart = findInsertionIndex( stripped.text, cssVar );
	if ( lineStart === -1 ) return null;
	const chunk = inHtmlMode( stripped.text, lineStart )
		? '<?php' + emission + '?>\n'
		: emission + '\n';
	return stripped.text.slice( 0, lineStart ) + chunk + stripped.text.slice( lineStart );
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

		const newBj = transformBlockJson( readFile( bjPath ) );
		const newPhp = transformRenderPhp(
			readFile( phpPath ),
			r.anchors.rootVar,
			r.anchors.cssVar,
			r.anchors.cssKind
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
	findInsertionIndex,
	inHtmlMode,
	SINK_STRING,
	SINK_ARRAY,
	classify,
	stripNativeBorderReads,
	renderPhpEmission,
	reservedStyleAttr,
	nativeBorderLiveness,
	splitAuthoredBorder,
	patternColourToAttr,
	planPatternBorderMigration,
	rewritePatternAttrJson,
	themeAuthoredBorder,
	planPatternRewrites,
	jsonValueEnd,
};
