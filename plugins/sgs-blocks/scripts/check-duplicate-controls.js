/**
 * check-duplicate-controls.js
 *
 * STRUCTURAL GUARD (WARN-ONLY) — finds the "duplicate control" class of bug:
 * the SAME setting exposed to the client through TWO different editor
 * controls, so they see two knobs for one thing (or two that silently fight
 * each other at render time). This is the COMPLEMENT of
 * check-dead-controls.js (control with no render consumption) and
 * check-control-ux.js (responsive-family / unit-select anti-patterns) — read
 * both before touching this file; do not duplicate their checks.
 *
 * THREE CHECKS
 * ------------
 *  CHECK 1 — UNIVERSAL-HOVER-VS-PRIVATE-HOVER (primary target, per block):
 *    src/blocks/extensions/hover-effects.js provides a universal `sgsHover*`
 *    attribute family + "Hover Effects" inspector panel. It is OPT-IN: since
 *    D551 (Phase 2.1) a block carries the panel only when its block.json lists
 *    `supports.sgs.enabledExtensions: ["hover", ...]`. A block that has NOT
 *    opted in never had the universal panel, so its private `*Hover` attrs
 *    cannot duplicate it and it is skipped outright. (`hideExtensions` is a
 *    legacy DENYLIST, now a no-op under the opt-in model; it is still honoured
 *    defensively but is not the gate. ⚠ CORRECTED 2026-08-25: this docblock
 *    previously described CHECK 1 as opt-OUT via `hideExtensions`, which had
 *    been false since D551 — the code always read `enabledExtensions`.)
 *    Many opted-in blocks ALSO declare their OWN private `*Hover` attrs (e.g.
 *    card-grid's `scaleHover`/`shadowHover`) covering the same semantic
 *    ground, so the client is looking at TWO systems nominally responsible for
 *    the same visual effect. Severities `hover:controlled` / `hover:shadow` /
 *    `hover:scoped` / `hover:scoped-shadow` — see SEVERITY_MEANINGS below for
 *    the authoritative text of each.
 *    ⚠ CORRECTED 2026-08-25: the category list above USED to read "scale /
 *    shadow / bg-colour / text-colour / border-colour / image-zoom /
 *    grayscale". The three COLOUR categories were deleted from
 *    UNIVERSAL_HOVER_BY_CATEGORY the same day because hover-effects.js
 *    registers no colour attr at all and exposes no colour control — 36 of 64
 *    findings named a keeper that does not exist. The live categories are
 *    scale / shadow / imageZoom / grayscale / duration / easing / effect, and
 *    the drift guard below now fails loudly rather than let that list rot.
 *
 *  CHECK 2 — SAME-ATTR-TWO-CONTROLS (per block, one edit.js):
 *    Two distinct JSX control elements (SelectControl/RangeControl/
 *    ToggleControl/TextControl/ColorPicker/etc., or the house-style
 *    `update('attr', val)` setter) in the SAME block's edit.js both write the
 *    same attribute via setAttributes. AST-parsed (@babel/parser + traverse)
 *    so it is not fooled by nested/duplicated JSX text.
 *    Since 2026-08-25 it ALSO resolves DISPATCHER-driven controls — a shared
 *    component handed an attribute-name map that writes a COMPUTED key
 *    (`setAttributes( { [ attrNames.valueHover ]: v } )`), which the literal-key
 *    path could not see. CHECK 1 already folded these in; CHECK 2 did not, so
 *    `ShadowControl` (mounted by 15 blocks) was invisible to it. Gated
 *    behaviourally — a tag counts as a dispatcher only if its DEFINING FILE
 *    really contains a computed-key setAttributes. See componentIsDispatcher.
 *    CHECK 2 deliberately stays on the block's OWN edit.js while CHECK 1 scans
 *    a widened transitive corpus; that asymmetry is intentional and the reason
 *    is documented at checkSameFileDuplicateAst().
 *
 *  CHECK 3 — PARENT-CHILD-DUPLICATION (per composite block, heuristic):
 *    A composite block's edit.js mounts InnerBlocks with a `template` that
 *    includes a known SGS child block (sgs/heading, sgs/text, sgs/button,
 *    sgs/media, sgs/quote, sgs/icon) AND the composite ALSO declares its own
 *    styling attrs whose name is prefixed with a role keyword matching that
 *    child (e.g. `titleColour` + a template heading in the "title" role).
 *    The child already owns real typography/colour controls for itself — a
 *    same-named parent control is the HC2 "dead-by-specificity" duplicate,
 *    reported here from the DUPLICATE angle (two controls exist; only one is
 *    ever visibly load-bearing depending on CSS specificity). Best-effort
 *    static heuristic — under-reports rather than over-reports by design.
 *    Severity `parent-child:heuristic`. Since 2026-08-25 the child slug is
 *    RESOLVED to a real block on disk (name-checked, not merely a directory)
 *    before the finding may claim that child owns the setting — an
 *    unvalidated keeper advises deleting a working control in favour of
 *    nothing. See resolveChildBlockDir.
 *
 * SEVERITIES ARE NAMESPACED `<check>:<severity>` (2026-08-25). CHECK 1 and
 * CHECK 3 both used to emit a bare `scoped` meaning two unrelated things, and
 * both emitted a bare `controlled`. Full rationale + the authoritative meaning
 * of every token: the SEVERITY_MEANINGS block below.
 *
 * FAIL-CLOSED ON BLINDNESS (2026-08-25). Every parse this file performs feeds
 * a "does this attribute have a control?" question, and a parse that silently
 * yields nothing makes a controlled attr look UNCONTROLLED — inventing a
 * finding rather than merely missing one. So: all parses run through
 * parseWithRecovery(), which records both hard throws and Babel's recovered
 * `ast.errors` (three `errorRecovery: true` parses previously never inspected
 * them); an unreadable block.json no longer drops a block silently; and
 * `--check` now exits 1 on a non-empty `unparseable`, which never reached the
 * exit code before.
 *
 * BASELINE: scripts/duplicate-controls-baseline.json — same shape/philosophy
 * as the sibling guards. Starts EMPTY. To accept a finding, add it with a
 * reason; to fix one, remove the redundant control (keep the shared/universal
 * one per the `keeper` field) or scope the two controls apart.
 *
 * GATE-CAPABLE (fixed 2026-08-18): `--check` now exits 1 when any finding is
 * net-new (not already in the baseline) and 0 otherwise. Plain/--json runs
 * remain diagnostic-only and always exit 0.
 *
 * ⚠ CORRECTED 2026-08-25. This previously read "still NOT wired into
 * prebuild/prestart; run it manually". That is STALE: the gate is
 * registered in `scripts/gates.json` at tier `fast`, and `prebuild` runs
 * `run-gates.py --tier fast`, so it gates EVERY build. Grepping package.json
 * no longer answers this question — the chain moved to gates.json, which is
 * the exact drift this plugin's own CLAUDE.md warns about.
 *
 * Usage:
 *   node scripts/check-duplicate-controls.js                  # report, always exit 0
 *   node scripts/check-duplicate-controls.js --json             # machine-readable, always exit 0
 *   node scripts/check-duplicate-controls.js --check             # exit 1 on any net-new finding OR any unparseable surface
 *   node scripts/check-duplicate-controls.js --update-baseline   # accept every current finding, exit 0
 *   node scripts/check-duplicate-controls.js --self-test  # fixture assertions; READS the real tree + WRITES a tmpdir
 *
 * ⚠ CORRECTED 2026-08-25: the --self-test line above claimed "in-memory
 * fixture assertions, no disk access". False on both counts, and it matters —
 * a reader who believes it will not expect the test to notice a change in the
 * live tree, nor to need a writable tmpdir. It (a) READS the real tree: the
 * R3-a widening case and the CHECK 3 slug-resolution cases resolve real
 * components/blocks through resolveComponentFiles() + BLOCKS_DIR, which is the
 * point — a tmpdir fixture cannot exercise a filesystem-indexing resolver; and
 * (b) WRITES to disk: the CHECK 1 severity cases mkdtemp a directory under
 * os.tmpdir(), write fixture edit.js files into it, and rm it in a `finally`.
 * The genuinely in-memory groups are the CHECK 2 AST cases, classifyHoverAttr,
 * the drift guard, collectIndirectControlledAttrs and the dispatcher cases.
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const parser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;
const { resolveComponentFiles } = require( './inspector-scan/core/components' );

// R3-a (2026-08-20): the shared name -> file resolver, used to widen
// loadBlockOwnSrc() below past a block's own components/ dir to also cover
// FRAMEWORK-WIDE shared components (src/components/) it mounts via JSX —
// see the R-3 register (`.claude/plans/phase-shop-container-remediation.md`
// R3-a). Computed once; resolveComponentFiles() walks the filesystem.
const COMPONENT_FILE_MAP = resolveComponentFiles();
const JSX_TAG_RE = /<([A-Z]\w*)\b/g;

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const BASELINE_FILE = path.join( __dirname, 'duplicate-controls-baseline.json' );

// ---------------------------------------------------------------------------
// CHECK 1 — universal-hover vs private-hover category table.
// ---------------------------------------------------------------------------

// The universal sgsHover* attrs injected by hover-effects.js, grouped by the
// semantic category they control. Kept in sync with that file's
// `hoverAttributes` object (2026-07-18 shape). Not a DB lookup dict — this is
// a fixed cross-reference between two hand-authored control systems, same
// justification class as check-dead-controls.js's PREFIXED_HELPER_SUFFIXES.
const UNIVERSAL_HOVER_BY_CATEGORY = {
	// ⛔ bgColour / textColour / borderColour DELETED 2026-08-25. They named
	// `sgsHoverBgColour`, `sgsHoverTextColour` and `sgsHoverBorderColour` —
	// hover-effects.js registers NONE of them and exposes no colour control at
	// all. 36 of 64 findings therefore named a KEEPER that does not exist, i.e.
	// advised deleting a working block control in favour of nothing. A private
	// *ColourHover attr has no universal counterpart; it is not a duplicate.
	// The guard below stops this drifting again.
	scale: [ 'sgsHoverScale', 'sgsHoverScalePreset' ],
	shadow: [ 'sgsHoverShadow' ],
	imageZoom: [ 'sgsHoverImageZoom' ],
	grayscale: [ 'sgsHoverGrayscale' ],
	duration: [ 'sgsHoverDuration' ],
	easing: [ 'sgsHoverEasing' ],
	effect: [ 'sgsHoverScale', 'sgsHoverShadow', 'sgsHoverImageZoom' ], // "Hover effect" preset vs the "Hover Effects" panel — naming collision, not 1:1.
};

/**
 * Pure extraction step, split out of readRegisteredUniversalHoverAttrs() so
 * the self-test can exercise it in-memory against a synthetic source string
 * instead of the real hover-effects.js file. Behaviour is byte-identical to
 * the inline version this replaced.
 *
 * Comment-STRIPPED: reading raw source means a comment such as
 * `// sgsHoverBgColour: RETIRED, do not re-add` re-registers the phantom
 * as if it were a live key, silently un-guarding this guard. That is a
 * completely natural way to phrase a retirement note, so it is not a
 * hypothetical.
 *
 * @param {string} rawSrc Raw (not yet comment-stripped) source text.
 * @return {Set<string>} Registered `sgsHover*` / `sgsStagger*` key names.
 */
function extractRegisteredHoverAttrsFromSrc( rawSrc ) {
	const src = stripComments( rawSrc );
	const found = new Set();
	if ( ! src ) {
		return found;
	}
	const re = /\b(sgsHover[A-Za-z0-9]*|sgsStagger[A-Za-z0-9]*)\s*:/g;
	let m;
	while ( ( m = re.exec( src ) ) !== null ) {
		found.add( m[ 1 ] );
	}
	return found;
}

function readRegisteredUniversalHoverAttrs() {
	return extractRegisteredHoverAttrsFromSrc(
		readIfExists(
			path.join( ROOT, 'src', 'blocks', 'extensions', 'hover-effects.js' )
		)
	);
}

/**
 * Pure per-category drift computation, split out of the top-level guard body
 * so the self-test can exercise it in-memory against a synthetic category
 * list + registered set. Behaviour is byte-identical to the inline version
 * this replaced: a category naming an unregistered attr has that attr
 * dropped from its list and reported in `phantom`.
 *
 * @param {string[]}    list       Attr names a category currently claims.
 * @param {Set<string>} registered The real, currently-registered attr names.
 * @return {{phantom: string[], filtered: string[]}} Dropped names + survivors.
 */
function computeCategoryDrift( list, registered ) {
	const phantom = list.filter( ( a ) => ! registered.has( a ) );
	const filtered = list.filter( ( a ) => registered.has( a ) );
	return { phantom, filtered };
}

const REGISTERED_UNIVERSAL_HOVER = readRegisteredUniversalHoverAttrs();
const UNIVERSAL_MAP_DRIFT = [];
if ( REGISTERED_UNIVERSAL_HOVER.size > 0 ) {
	for ( const category of Object.keys( UNIVERSAL_HOVER_BY_CATEGORY ) ) {
		const { phantom, filtered } = computeCategoryDrift(
			UNIVERSAL_HOVER_BY_CATEGORY[ category ],
			REGISTERED_UNIVERSAL_HOVER
		);
		if ( phantom.length ) {
			UNIVERSAL_MAP_DRIFT.push( `${ category } -> ${ phantom.join( ', ' ) }` );
		}
		UNIVERSAL_HOVER_BY_CATEGORY[ category ] = filtered;
	}
}

// Sub-element prefix words that mean a private *Hover attr targets a named
// CHILD part of the block (a CTA button, a tab, an icon...) rather than the
// whole block — NOT the same setting as the block-wide universal control.
// Reported separately at lower confidence.
const SCOPED_SUBJECT_WORDS = new Set( [
	'cta', 'tab', 'link', 'icon', 'shape', 'overlay', 'ripple', 'primary', 'secondary',
] );

/**
 * Classify a declared attribute name that contains "hover" (case-insensitive)
 * into a semantic category + whether it is scoped to a named sub-element.
 * Returns null if the name contains "hover" but matches no known category
 * (e.g. `pauseOnHover`, `autoScrollPauseOnHover`, `hoverStyle` — behavioural
 * toggles with no universal-hover-panel equivalent).
 *
 * @param {string} attrName Declared attribute name.
 * @return {?{category: string, scoped: boolean, subject: ?string}} Classification.
 */
function classifyHoverAttr( attrName ) {
	if ( ! /hover/i.test( attrName ) ) {
		return null;
	}
	// Split camelCase into lowercase word tokens, drop the "hover" token itself.
	const words = attrName
		.replace( /([a-z0-9])([A-Z])/g, '$1 $2' )
		.toLowerCase()
		.split( /[\s_]+/ )
		.filter( ( w ) => w && w !== 'hover' );

	const has = ( w ) => words.includes( w );

	let category = null;
	// COLOUR FIRST (2026-08-25). The universal panel exposes NO colour control
	// at all — verified against hover-effects.js, which registers only scale /
	// shadow / imageZoom / grayscale / borderAccent / tilt / duration / easing
	// / stagger. So ANY private hover attr naming a colour has no universal
	// counterpart and can never be a duplicate.
	//
	// This ordering is load-bearing, not cosmetic. `shadowHoverColour` was
	// previously caught by the `has('shadow')` branch BELOW and reported as a
	// duplicate of `sgsHoverShadow` — but that attr is a shadow ELEVATION
	// PRESET string, while `shadowHoverColour` is the shadow's COLOUR. Two
	// different properties sharing one category word. Deleting the private one
	// on that advice would have silently removed the only way to colour a
	// hover shadow (which ShadowControl drives, per the full-symmetry ruling
	// of 2026-08-22).
	const isColour = has( 'colour' ) || has( 'color' );
	if ( isColour && ( has( 'background' ) || has( 'bg' ) ) ) {
		category = 'bgColour';
	} else if ( isColour && has( 'border' ) && ! has( 'accent' ) ) {
		category = 'borderColour';
	} else if ( isColour ) {
		// Every other colour-bearing hover attr, including `shadowHoverColour`
		// and bare `linkHoverColour`. All colour categories are empty after the
		// drift guard, so this yields no finding — which is the correct answer.
		category = 'textColour';
	} else if ( has( 'scale' ) ) {
		category = 'scale';
	} else if ( has( 'shadow' ) ) {
		category = 'shadow';
	} else if ( has( 'image' ) && has( 'zoom' ) ) {
		category = 'imageZoom';
	} else if ( has( 'grayscale' ) || has( 'greyscale' ) ) {
		category = 'grayscale';
	} else if ( has( 'duration' ) ) {
		category = 'duration';
	} else if ( has( 'easing' ) ) {
		category = 'easing';
	} else if ( has( 'effect' ) ) {
		category = 'effect';
	}

	if ( ! category ) {
		return null;
	}

	const subject = words.find( ( w ) => SCOPED_SUBJECT_WORDS.has( w ) ) || null;
	return { category, scoped: !! subject, subject };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

// ---------------------------------------------------------------------------
// PARSE DIAGNOSTICS (2026-08-25 defect 4 — fail-open hardening).
// ---------------------------------------------------------------------------
//
// THE FAILURE DIRECTION IS WHAT MAKES THIS LOAD-BEARING. Every one of this
// file's parses feeds a "does this attribute have a control?" question. A
// parse that silently returns nothing makes the attr look UNCONTROLLED, which
// flips CHECK 1's severity from `hover:controlled` to `hover:shadow` and
// INVENTS a hidden-duplicate finding — i.e. the tool tells an agent to add a
// control the client already has. Silence here does not under-report, it
// MIS-reports, so none of these paths may stay silent.
//
// Three parses used `errorRecovery: true` and NONE inspected `ast.errors`,
// which that option exists to populate. Babel then hands back a
// partially-recovered tree: `traverse` walks it happily, finds fewer
// setAttributes() calls than the file really contains, and reports success.
// Two of them additionally swallowed a hard throw with a bare `catch { return; }`.
//
// Every parse now goes through parseWithRecovery(), which records BOTH a hard
// throw and a soft (recovered) error into PARSE_DIAGNOSTICS. main() drains
// that into `unparseable`, and `--check` now FAILS on a non-empty
// `unparseable` (see main()). Measured on the clean tree 2026-08-25: 365 JS
// files under src/blocks + src/components, 0 recovered errors, 0 fatal — so
// this hardening costs nothing today and only bites when a parse really does
// degrade.
const PARSE_DIAGNOSTICS = [];

function resetParseDiagnostics() {
	PARSE_DIAGNOSTICS.length = 0;
}

const BABEL_PLUGINS = [
	'jsx',
	'classProperties',
	'objectRestSpread',
	'optionalChaining',
	'nullishCoalescingOperator',
	'dynamicImport',
];

/**
 * Parse `src` with Babel's error recovery, surfacing BOTH failure modes
 * instead of swallowing them.
 *
 * @param {string} src   JS source text.
 * @param {string} label Human-readable origin (block slug / file path) for the
 *                       diagnostic message.
 * @return {?Object} The AST, or null when the parse threw outright.
 */
function parseWithRecovery( src, label ) {
	let ast;
	try {
		ast = parser.parse( src, {
			sourceType: 'module',
			errorRecovery: true,
			plugins: BABEL_PLUGINS,
		} );
	} catch ( e ) {
		PARSE_DIAGNOSTICS.push( {
			dir: label,
			reason: `parse threw (no AST, this file contributed NOTHING to any check): ${ e.message }`,
		} );
		return null;
	}
	if ( ast.errors && ast.errors.length ) {
		const first = ast.errors[ 0 ];
		PARSE_DIAGNOSTICS.push( {
			dir: label,
			reason:
				`parse RECOVERED from ${ ast.errors.length } syntax error(s) — the AST is ` +
				`partial, so control detection under-reports for this file. First: ` +
				`${ first.reasonCode || first.message }`,
		} );
	}
	return ast;
}

/**
 * Strip `//` line comments, `/* *\/` block comments, and a leading `#!`
 * shebang line from `src`, WITHOUT touching text inside a single-quoted,
 * double-quoted, or template-literal string.
 *
 * The previous regex implementation matched a bare `//` anywhere and
 * ANYWHERE, including inside a string or template literal, to end of line.
 * `const label = 'Half // Half'; setAttributes({ realAttr: 1 });` lost the
 * setAttributes() call entirely (FALSE DEAD downstream). The `(^|[^:])`
 * guard only protects a `://` URL pattern, not a bare `//` inside a string.
 *
 * This is a small character scanner that tracks whether it is currently
 * inside a single-quote string, double-quote string, template literal, line
 * comment, or block comment, honouring backslash escapes, and only blanks
 * out `//...` / `/* ... *\/` when in plain code state. Interpolation bodies
 * inside a template literal (`${...}`) are copied through untouched — we
 * don't need to parse them, only to avoid misreading a `//`/`/*` inside the
 * literal's own text as a comment.
 *
 * @param {string} src Raw JS source.
 * @return {string} Source with comments blanked out (same length/line count
 *                   preserved where practical), strings left intact.
 */
function stripComments( src ) {
	// Shebang handling identical to the original: blank out a leading
	// `#...` line (e.g. `#!/usr/bin/env node`).
	src = src.replace( /^\s*#[^\n]*/, ( m ) => ' '.repeat( m.length ) );

	let out = '';
	let i = 0;
	const n = src.length;
	// States: 'code', 'sq' (single-quote string), 'dq' (double-quote string),
	// 'tpl' (template literal), 'line' (// comment), 'block' (/* */ comment).
	let state = 'code';

	while ( i < n ) {
		const ch = src[ i ];
		const next = i + 1 < n ? src[ i + 1 ] : '';

		if ( state === 'code' ) {
			if ( ch === '/' && next === '/' ) {
				state = 'line';
				out += '  ';
				i += 2;
				continue;
			}
			if ( ch === '/' && next === '*' ) {
				state = 'block';
				out += '  ';
				i += 2;
				continue;
			}
			if ( ch === '\'' ) {
				state = 'sq';
				out += ch;
				i += 1;
				continue;
			}
			if ( ch === '"' ) {
				state = 'dq';
				out += ch;
				i += 1;
				continue;
			}
			if ( ch === '`' ) {
				state = 'tpl';
				out += ch;
				i += 1;
				continue;
			}
			out += ch;
			i += 1;
			continue;
		}

		if ( state === 'sq' || state === 'dq' ) {
			const quote = state === 'sq' ? '\'' : '"';
			if ( ch === '\\' && i + 1 < n ) {
				// Preserve the escape pair verbatim so an escaped quote
				// doesn't prematurely end the string.
				out += ch + next;
				i += 2;
				continue;
			}
			if ( ch === quote ) {
				state = 'code';
				out += ch;
				i += 1;
				continue;
			}
			out += ch;
			i += 1;
			continue;
		}

		if ( state === 'tpl' ) {
			if ( ch === '\\' && i + 1 < n ) {
				out += ch + next;
				i += 2;
				continue;
			}
			if ( ch === '`' ) {
				state = 'code';
				out += ch;
				i += 1;
				continue;
			}
			out += ch;
			i += 1;
			continue;
		}

		if ( state === 'line' ) {
			if ( ch === '\n' ) {
				state = 'code';
				out += ch;
				i += 1;
				continue;
			}
			out += ' ';
			i += 1;
			continue;
		}

		// state === 'block'
		if ( ch === '*' && next === '/' ) {
			state = 'code';
			out += '  ';
			i += 2;
			continue;
		}
		out += ch === '\n' ? '\n' : ' ';
		i += 1;
	}

	return out;
}

/**
 * Collect attribute names written via setAttributes(...) or the house-style
 * update('attr', val) setter, parsed as a Babel AST.
 *
 * WHY (2026-08-25, defect fix). The previous regex implementation —
 * `/setAttributes\(\s*\{\s*([^}]*)\}/g` — used `[^}]*`, which stops at the
 * FIRST closing brace. For a nested call such as
 *   setAttributes( { style: { ...style, border: { ...style?.border, radius: {} } }, shadowHover: 'none' } )
 * the captured body was truncated mid-nest: `style`, `border`, `radius` (a
 * NESTED object's keys, not top-level attribute names) were extracted as if
 * top-level (FALSE CONTROLLED), and the sibling top-level key `shadowHover`
 * — which appears AFTER the first `}` — was never seen at all (FALSE DEAD).
 * A balanced-brace scan of the live tree found 28 real setAttributes() calls
 * with at least one top-level key invisible to the old regex.
 *
 * This walks the AST instead, so nesting depth of the VALUE doesn't matter:
 * only the TOP-LEVEL properties of the ObjectExpression passed directly to
 * setAttributes(...) are collected (a computed key is skipped — it names an
 * attribute only through collectIndirectControlledAttrs, never a literal).
 *
 * @param {string[]|string} parts One or more JS source strings — each MUST
 *                                be a single file's source (comment-stripped
 *                                is fine; already-folded multi-file text is
 *                                NOT — see collectControlledAttrs below).
 * @return {Set<string>} Attribute names with a live control.
 */
function collectControlledAttrsFromOneFile( src, out, label ) {
	if ( ! src ) {
		return;
	}
	// Defect 4 (2026-08-25): was `catch ( e ) { return; }` plus an unread
	// `ast.errors`. Both are now recorded — see parseWithRecovery above for why
	// silence here MIS-reports rather than under-reports.
	const ast = parseWithRecovery( src, label || 'collectControlledAttrs' );
	if ( ! ast ) {
		return;
	}
	try {
		traverse( ast, {
			CallExpression( p2 ) {
				const callee = p2.node.callee;
				if ( ! callee || callee.type !== 'Identifier' ) {
					return;
				}
				if ( callee.name === 'setAttributes' ) {
					const arg = p2.node.arguments[ 0 ];
					if ( arg && arg.type === 'ObjectExpression' ) {
						for ( const pr of arg.properties ) {
							if ( pr.type !== 'ObjectProperty' || pr.computed ) {
								continue;
							}
							if ( pr.key.type === 'Identifier' ) {
								out.add( pr.key.name );
							} else if ( pr.key.type === 'StringLiteral' ) {
								out.add( pr.key.value );
							}
						}
					}
					return;
				}
				if ( callee.name === 'update' ) {
					const arg = p2.node.arguments[ 0 ];
					if ( arg && arg.type === 'StringLiteral' ) {
						out.add( arg.value );
					}
				}
			},
		} );
	} catch ( e ) {
		// A scope error (e.g. Babel's "Duplicate declaration '__'" when a
		// caller accidentally folds two files' text together) must not take
		// down the whole check — skip just this file's contribution.
		//
		// DELIBERATE FAIL-OPEN, but no longer a SILENT one (defect 4,
		// 2026-08-25). Continuing is right: one malformed corpus entry must
		// not blank the other 82 blocks. Staying quiet was not: skipping this
		// file's contribution is exactly what makes a controlled attr read as
		// uncontrolled, so it is recorded and surfaced like any other parse
		// failure.
		PARSE_DIAGNOSTICS.push( {
			dir: label || 'collectControlledAttrs',
			reason: `traverse failed, this file contributed NO controlled attrs: ${ e.message }`,
		} );
	}
}

/**
 * Collect attribute names written via setAttributes(...) or update(...)
 * across one or more source files.
 *
 * Parsing MUST happen PER FILE, not on concatenated multi-file text: every
 * SGS block file imports `__` from @wordpress/i18n, so parsing two files'
 * text joined together throws Babel's scope error `Duplicate declaration
 * "__"`. Callers pass the per-file parts array (see OWN_SRC_PARTS / the
 * pattern collectIndirectControlledAttrs already uses), not the folded
 * `loadBlockOwnSrc()` string.
 *
 * @param {string[]|string} parts Per-file source strings.
 * @return {Set<string>} Attribute names with a live control.
 */
function collectControlledAttrs( parts, label ) {
	const controlled = new Set();
	if ( ! parts ) {
		return controlled;
	}
	const list = Array.isArray( parts ) ? parts : [ parts ];
	for ( const src of list ) {
		collectControlledAttrsFromOneFile( src, controlled, label );
	}
	return controlled;
}

/**
 * Collect attrs controlled INDIRECTLY, through a dispatcher table.
 *
 * WHY (2026-08-25). `collectControlledAttrs` matches a LITERAL key in
 * `setAttributes( { attrName: ... } )`. The shared `ShadowControl` (mounted by
 * 15 blocks) instead takes an `attrNames` MAP from its caller and writes
 * `setAttributes( { [ attrNames.valueHover ]: v } )` — a COMPUTED key. The
 * attribute name appears in the block only as a VALUE inside that map, so the
 * literal-key detector reported five genuinely-controlled attrs as dead
 * (`shadowHover` on card-grid / info-box / team-member, `effectHover` and
 * `imageZoomHover` on gallery). Acting on that would have ADDED a duplicate
 * while claiming to remove one. Same blind spot inspector-scan rule 21 hit:
 * "could not see a control reached through a dispatcher table".
 *
 * Deliberately CONSERVATIVE, so it cannot mask a genuinely dead control:
 * it returns nothing unless the folded source actually contains a computed-key
 * `setAttributes`, and it only accepts strings that are declared attributes of
 * THIS block.
 *
 * @param {string}      src           Folded block source (own + shared components).
 * @param {Set<string>} declaredAttrs This block's declared attribute names.
 * @return {Set<string>} Attribute names controlled via a dispatcher table.
 */
function collectIndirectControlledAttrs( parts, declaredAttrs, label ) {
	const out = new Set();
	if ( ! parts || ! parts.length ) {
		return out;
	}
	for ( const src of parts ) {
		collectIndirectFromOneFile( src, declaredAttrs, out, label );
	}
	return out;
}

function collectIndirectFromOneFile( src, declaredAttrs, out, label ) {
	if ( ! src ) {
		return;
	}
	// Defect 4 (2026-08-25): see parseWithRecovery. Previously a bare
	// `catch { return; }` with `ast.errors` never read.
	const ast = parseWithRecovery( src, label || 'collectIndirectControlledAttrs' );
	if ( ! ast ) {
		return;
	}

	// ⛔ THE PRECONDITION IS PER-ELEMENT, AND IT MUST ASK ABOUT THE COMPONENT.
	//
	// This gate previously asked "does the BLOCK'S OWN FILE contain a
	// computed-key setAttributes?" and returned early when it did not. That
	// question is the wrong one, and it was wrong in the DEAD direction:
	// the computed write lives in the DISPATCHER COMPONENT (ShadowControl.js),
	// never in the block that mounts it. A block was therefore only resolved
	// correctly when it happened to contain an UNRELATED computed write of its
	// own.
	//
	// Measured 2026-08-26: `sgs/card-grid` and `sgs/info-box` carry
	// BYTE-IDENTICAL `<ShadowControl attrNames={{ base: 'shadowHover', … }} />`
	// mounts. info-box has 2 unrelated computed writes and passed BY ACCIDENT;
	// card-grid has 0 and its four dispatcher mounts were invisible, so a fully
	// controlled `shadowHover` was reported as a DEAD attribute. Per D785 a
	// false DEAD makes an agent add a duplicate control the client then sees
	// twice — so this defect actively manufactures the bug the gate exists to
	// find. `sgs/cta-section` had the same blind spot (0 computed writes, 2
	// dispatcher mounts).
	//
	// The right question already had a helper: `componentIsDispatcher()` walks
	// the RESOLVED COMPONENT FILE and is memoised. Asking it PER JSX ELEMENT is
	// strictly more precise than any file-level gate — an object-valued prop on
	// a non-dispatcher component (e.g. a lookup table, or `options={…}`) can no
	// longer mark an attribute controlled, which was this function's OTHER
	// historical over-reach bug. Both directions close with one change.
	// ⚠ THE TWO SYNTACTIC POSITIONS NEED DIFFERENT PRECONDITIONS. Applying
	// one to both is a regression the self-test caught during this very fix:
	//   (a) `attrNames={{ base: 'shadowHover' }}` — the dispatch lives in a
	//       SHARED COMPONENT, so the question is "is that component a
	//       dispatcher?" -> componentIsDispatcher( tag ).
	//   (b) `onChange={ set( 'effectHover' ) }` — the curried setter is a
	//       LOCAL function in this very file (`const set = ( key ) => ( v ) =>
	//       setAttributes( { [ key ]: v } )`), mounted on an ordinary control
	//       that is NOT a dispatcher. Its precondition is the file-level one:
	//       does THIS file contain a computed-key write? sgs/gallery uses (b).
	const tagNameOf = ( jsxAttrPath ) => {
		const el = jsxAttrPath.parent;
		if ( ! el || el.type !== 'JSXOpeningElement' || ! el.name ) {
			return null;
		}
		return el.name.type === 'JSXIdentifier' ? el.name.name : null;
	};

	// File-level computed-key write — the precondition for position (b) ONLY.
	let hasComputedWrite = false;
	traverse( ast, {
		CallExpression( p2 ) {
			const c = p2.node.callee;
			if ( ! c || c.type !== 'Identifier' || c.name !== 'setAttributes' ) {
				return;
			}
			const arg = p2.node.arguments[ 0 ];
			if ( arg && arg.type === 'ObjectExpression' &&
				arg.properties.some( ( pr ) => pr.computed ) ) {
				hasComputedWrite = true;
			}
		},
	} );

	// Only two SYNTACTIC POSITIONS count, so an unrelated lookup table such as
	// `const ICON_LOOKUP = { home: 'ctaIconSlug' }` can never mark an attr
	// controlled (that over-reach was this function's own bug on 2026-08-25):
	//
	//   (a) a string value inside an OBJECT passed as a JSX PROP — the
	//       `attrNames={ { valueHover: 'shadowHover' } }` map idiom that
	//       ShadowControl uses across 15 blocks.
	//   (b) a single string ARGUMENT to a call inside a JSX prop — the curried
	//       setter idiom `onChange={ set( 'effectHover' ) }` where
	//       `const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } )`.
	//       sgs/gallery uses (b) and NOT (a); an earlier version of this
	//       function claimed to fix gallery and did not, because it only
	//       understood (a).
	const consider = ( name ) => {
		if ( declaredAttrs.has( name ) ) {
			out.add( name );
		}
	};
	traverse( ast, {
		JSXAttribute( p2 ) {
			const v = p2.node.value;
			if ( ! v || v.type !== 'JSXExpressionContainer' ) {
				return;
			}
			const expr = v.expression;
			if ( ! expr ) {
				return;
			}
			const tag = tagNameOf( p2 );
			if ( expr.type === 'ObjectExpression' ) {
				// Position (a): the dispatch is in the SHARED COMPONENT.
				if ( ! tag || ! componentIsDispatcher( tag ) ) {
					return;
				}
				for ( const pr of expr.properties ) {
					if ( pr.type === 'ObjectProperty' && pr.value &&
						pr.value.type === 'StringLiteral' ) {
						consider( pr.value.value );
					}
				}
				return;
			}
			// Position (b): the curried setter is a LOCAL function in this file,
			// mounted on an ordinary (non-dispatcher) control — so the
			// precondition is the file-level computed-key write, not the tag.
			if ( hasComputedWrite &&
				expr.type === 'CallExpression' && expr.arguments.length === 1 &&
				expr.arguments[ 0 ] && expr.arguments[ 0 ].type === 'StringLiteral' ) {
				consider( expr.arguments[ 0 ].value );
			}
		},
	} );
}

/**
 * Read every .js file directly under a block's own components/ dir (its
 * private control components, NOT shared library components) and concatenate
 * with edit.js. Mirrors the "block's own source" corpus used elsewhere.
 *
 * @param {string} blockDir Absolute path to the block's src directory.
 * @return {string} Concatenated, comment-stripped source.
 */
// Per-block list of the INDIVIDUAL source files loadBlockOwnSrc() folded in.
// The AST collector must parse each file on its own: parsing the concatenated
// text throws Babel's scope error `Duplicate declaration "__"` (every file
// imports `__` from @wordpress/i18n), which silently skipped sgs/gallery,
// sgs/google-reviews, sgs/pricing-table and sgs/whatsapp-cta entirely.
const OWN_SRC_PARTS = new Map();

function loadBlockOwnSrc( blockDir ) {
	const editJsPath = path.join( blockDir, 'edit.js' );
	let src = readIfExists( editJsPath );
	const readPaths = new Set( [ path.resolve( editJsPath ) ] );
	const componentsDir = path.join( blockDir, 'components' );
	if ( fs.existsSync( componentsDir ) ) {
		for ( const f of fs.readdirSync( componentsDir ) ) {
			if ( f.endsWith( '.js' ) ) {
				const p = path.join( componentsDir, f );
				src += '\n' + readIfExists( p );
				readPaths.add( path.resolve( p ) );
			}
		}
	}
	// R3-a: the loop above only covers the block's OWN components/ dir. A
	// control living in a FRAMEWORK-WIDE shared component (src/components/,
	// mounted via a JSX tag like `<WidthPanel .../>`) was previously invisible
	// here. Resolve every capitalised JSX tag referenced anywhere in the
	// source collected so far to the file that DEFINES it, and fold in any
	// not already read above (block-own components are already in `src`, so
	// this mainly picks up the framework-wide + extensions surfaces). Tracked
	// by resolved PATH, not a text substring match, so a file is never read
	// (and its content never duplicated) twice.
	// TRANSITIVE resolution (2026-08-25). This loop previously ran ONCE over the
	// tags in the block's own source, appended each resolved file, and stopped —
	// so a component reached through ANOTHER component was invisible.
	// Measured: `GradientOverlayControl` drives attrs through a computed-key
	// setAttributes and is mounted only by `BackgroundPanel` / `ShapeDividersPanel`
	// / `hero`. SEVEN blocks mount BackgroundPanel without mounting
	// GradientOverlayControl themselves — cta-section, multi-button, nav-drawer,
	// physics-canvas, site-footer, site-header, trust-bar — so for all seven its
	// source was never folded in and any attr it controls read as DEAD.
	// Now iterated to a FIXED POINT. Each file is read at most once (tracked by
	// resolved PATH), the component graph is finite, and the counter is a
	// backstop against a pathological cycle rather than an expected limit.
	const seenTags = new Set();
	let frontier = src;
	for ( let depth = 0; depth < 20; depth++ ) {
		const newTags = [];
		JSX_TAG_RE.lastIndex = 0;
		let m;
		while ( ( m = JSX_TAG_RE.exec( frontier ) ) !== null ) {
			if ( ! seenTags.has( m[ 1 ] ) ) {
				seenTags.add( m[ 1 ] );
				newTags.push( m[ 1 ] );
			}
		}
		let added = '';
		for ( const name of newTags ) {
			const file = COMPONENT_FILE_MAP.get( name );
			if ( file && ! readPaths.has( path.resolve( file ) ) ) {
				readPaths.add( path.resolve( file ) );
				added += '\n' + readIfExists( file );
			}
		}
		if ( ! added ) {
			break;
		}
		src += added;
		frontier = added;
	}
	OWN_SRC_PARTS.set(
		blockDir,
		[ ...readPaths ].map( ( f ) => stripComments( readIfExists( f ) ) )
	);
	return stripComments( src );
}

function readBlockJson( dir ) {
	const p = path.join( dir, 'block.json' );
	if ( ! fs.existsSync( p ) ) {
		return null;
	}
	try {
		return JSON.parse( fs.readFileSync( p, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `Invalid block.json in ${ dir }: ${ e.message }` );
	}
}

// ---------------------------------------------------------------------------
// CHECK 1 — universal hover vs private hover
// ---------------------------------------------------------------------------

function checkHoverDuplication( blockSlug, blockDir, meta ) {
	const findings = [];
	const supportsSgs = meta.supports && meta.supports.sgs ? meta.supports.sgs : {};
	const hideList = Array.isArray( supportsSgs.hideExtensions ) ? supportsSgs.hideExtensions : [];
	const enabledList = Array.isArray( supportsSgs.enabledExtensions ) ? supportsSgs.enabledExtensions : [];
	// D551 (Phase 2.1): 'hover' is OPT-IN, not opt-out — the universal panel
	// is absent unless the block lists it in enabledExtensions. A block that
	// hasn't opted in was never carrying the universal panel, so its private
	// *Hover attrs (if any) cannot be a duplicate of it.
	if ( ! enabledList.includes( 'hover' ) ) {
		return findings;
	}
	if ( hideList.includes( 'hover' ) ) {
		// Legacy denylist entry, now a no-op under the opt-in model — kept
		// harmless rather than treated as a second source of truth.
		return findings;
	}
	// className:false blocks never receive the universal extension either
	// (hover-effects.js checks type?.supports?.className === false).
	if ( meta.supports && meta.supports.className === false ) {
		return findings;
	}

	const attrs = meta.attributes || {};
	// loadBlockOwnSrc()'s RETURN value is folded text; we want its side effect of
	// populating OWN_SRC_PARTS, because both collectors must parse ONE FILE AT A
	// TIME - parsing folded text throws Babel's `Duplicate declaration "__"`.
	loadBlockOwnSrc( blockDir );
	const parts = OWN_SRC_PARTS.get( blockDir ) || [];
	const controlled = collectControlledAttrs( parts, blockSlug );
	// Fold in controls reached through a dispatcher table (e.g. ShadowControl's
	// `attrNames` map) — see collectIndirectControlledAttrs above.
	for ( const a of collectIndirectControlledAttrs(
		parts,
		new Set( Object.keys( attrs ) ),
		blockSlug
	) ) {
		controlled.add( a );
	}

	for ( const attrName of Object.keys( attrs ) ) {
		if ( /^sgs[A-Z]/.test( attrName ) ) {
			continue; // this IS a universal extension attr, not a private one.
		}
		const classification = classifyHoverAttr( attrName );
		if ( ! classification ) {
			continue;
		}
		const { category, scoped, subject } = classification;
		const universalKeepers = UNIVERSAL_HOVER_BY_CATEGORY[ category ] || [];
		if ( universalKeepers.length === 0 ) {
			continue;
		}
		const hasOwnControl = controlled.has( attrName );

		findings.push( {
			check: 'hover-duplicate',
			block: blockSlug,
			attr: attrName,
			category,
			// Defect 1 (2026-08-25): severities are NAMESPACED by check. The
			// bare token `scoped` used to mean two unrelated things — here
			// "sub-element-prefixed, so possibly not a duplicate at all", and
			// in CHECK 3 "parent/child role overlap, low confidence". Anyone
			// filtering or triaging on `severity` mixed the two populations.
			// See the SEVERITIES block at the top of this file.
			severity: hasOwnControl
				? ( scoped ? 'hover:scoped' : 'hover:controlled' )
				: ( scoped ? 'hover:scoped-shadow' : 'hover:shadow' ),
			keeper: universalKeepers.join( ' / ' ),
			sources: hasOwnControl
				? [ `${ blockSlug } edit.js: own control for "${ attrName }"`, `universal Hover Effects panel: "${ universalKeepers.join( '" / "' ) }"` ]
				: [ `${ blockSlug } block.json + render.php: "${ attrName }" declared/consumed but no editor control`, `universal Hover Effects panel: "${ universalKeepers.join( '" / "' ) }" (the only LIVE control for this effect)` ],
			reason: hasOwnControl
				? `Block has its own edit.js control for "${ attrName }" (category: ${ category }) while the universal Hover Effects panel ALSO exposes "${ universalKeepers.join( '" / "' ) }" for the same block — the client sees two controls for one visual effect.${ scoped ? ` Scoped to sub-element "${ subject }" — verify it genuinely targets a different element than the universal (whole-block) control before treating as a hard duplicate.` : '' }`
				: `"${ attrName }" (category: ${ category }) is declared in block.json and consumed in render.php/save.js but has NO editor control of its own — it is permanently stuck at its default while the universal "${ universalKeepers.join( '" / "' ) }" control is the only one the client can actually move. Hidden duplicate: two hover systems nominally cover this property, only one is reachable.${ scoped ? ` Scoped to sub-element "${ subject }".` : '' }`,
		} );
	}

	return findings;
}

// ---------------------------------------------------------------------------
// CHECK 2 — same attr, two controls, one edit.js (AST)
// ---------------------------------------------------------------------------

const CONTROL_JSX_NAME_RE = /(Control|Picker|Palette|Select|Toggle|RangeControl|Slider)$/;

/**
 * Does this JSXElement opening-tag name look like an editor control component
 * (SelectControl, ToggleControl, RangeControl, DesignTokenPicker, ColorPalette,
 * a bespoke *Control, etc.)? Deliberately broad — false positives here just
 * mean we track an extra element, which is harmless; false negatives would
 * silently miss a real duplicate.
 *
 * @param {string} name JSX element tag name.
 * @return {boolean} True if it looks like a control component.
 */
function looksLikeControlComponent( name ) {
	if ( ! name || name[ 0 ] !== name[ 0 ].toUpperCase() ) {
		return false; // lowercase = host element (div/span/...), never a control.
	}
	return CONTROL_JSX_NAME_RE.test( name );
}

// ---------------------------------------------------------------------------
// CHECK 2 dispatcher resolution (2026-08-25, defect 3).
// ---------------------------------------------------------------------------
//
// THE HOLE. resolveDynamicWrites() (below) is called from exactly ONE place —
// CHECK 2 — and it skips computed keys (`prop.computed` -> continue). So the
// shared dispatcher components, which take a name MAP from their caller and
// write `setAttributes( { [ attrNames.valueHover ]: v } )`, were invisible to
// CHECK 2 entirely. `ShadowControl` alone is mounted by 15 blocks. A block
// mounting TWO dispatchers onto one attribute, or a dispatcher alongside its
// own literal control, is a real visible duplicate CHECK 2 could not see.
// CHECK 1 already folds these in via collectIndirectControlledAttrs().
//
// WHY THE GATE IS BEHAVIOURAL, NOT NAME-KEYED. The obvious cheap version —
// "harvest string literals out of any object-valued JSX prop" — over-reports
// badly and in the DANGEROUS direction (CHECK 2 findings ASSERT a duplicate;
// a false one tells an agent to delete a working control). `<SelectControl
// options={ [ { label: 'Text colour', value: 'textColour' } ] } />` would
// register `textColour`, a declared attr on many blocks, as a second writer.
//
// So a tag qualifies as a dispatcher only when its DEFINING FILE, resolved
// through COMPONENT_FILE_MAP, actually contains a computed-key setAttributes.
// That kills the false positive structurally rather than by heuristic:
// SelectControl/RangeControl are @wordpress/components imports and are not in
// the map at all (verified 2026-08-25 — map size 134, `SelectControl` ->
// undefined, `ShadowControl` -> src/components/ShadowControl.js).
//
// NOT suffix-gated. looksLikeControlComponent()'s /(Control|Picker|...)$/ is
// used for the literal path, but the dispatcher path accepts ANY resolvable
// component that passes the behavioural test — this project's own rule is to
// detect a control by what it does, not by its component name, and the six
// real dispatchers include `BackgroundPanel`, `ProductHandpickPanel` and
// `ProductTaxonomyChecklist`, none of which match that suffix. Measured both
// ways on the clean tree: zero findings either way, so the wider gate costs
// nothing today and covers more tomorrow.
const DISPATCHER_MEMO = new Map();

/**
 * Does the component named `tagName` write attributes through a COMPUTED-key
 * setAttributes — i.e. is it a dispatcher whose caller names the attribute?
 *
 * @param {string} tagName JSX tag name.
 * @return {boolean} True when the resolved component file dispatches.
 */
function componentIsDispatcher( tagName ) {
	if ( DISPATCHER_MEMO.has( tagName ) ) {
		return DISPATCHER_MEMO.get( tagName );
	}
	let result = false;
	const file = COMPONENT_FILE_MAP.get( tagName );
	if ( file && fs.existsSync( file ) ) {
		const ast = parseWithRecovery( readIfExists( file ), `component ${ tagName } (${ file })` );
		if ( ast ) {
			try {
				traverse( ast, {
					CallExpression( p ) {
						const c = p.node.callee;
						if ( ! c || c.type !== 'Identifier' || c.name !== 'setAttributes' ) {
							return;
						}
						const a = p.node.arguments[ 0 ];
						if ( a && a.type === 'ObjectExpression' && a.properties.some( ( x ) => x.computed ) ) {
							result = true;
						}
					},
				} );
			} catch ( e ) {
				// Same deliberate-but-visible fail-open as elsewhere: a
				// component we cannot walk is treated as "not a dispatcher"
				// (the conservative answer, which cannot invent a finding),
				// but the reason is recorded rather than swallowed.
				PARSE_DIAGNOSTICS.push( {
					dir: `component ${ tagName }`,
					reason: `traverse failed; treated as NOT a dispatcher, so CHECK 2 may under-report: ${ e.message }`,
				} );
			}
		}
	}
	DISPATCHER_MEMO.set( tagName, result );
	return result;
}

/**
 * Harvest the attribute names a dispatcher element is told to write, from the
 * two syntactic positions collectIndirectFromOneFile() already recognises:
 *   (a) a string VALUE inside an object-valued JSX prop —
 *       `attrNames={ { valueHover: 'shadowHover' } }`
 *   (b) a single string ARGUMENT to a call in a JSX prop —
 *       `onChange={ set( 'effectHover' ) }`
 * Filtered to `declaredAttrs`, so a stray string can never name an attribute
 * this block does not have.
 *
 * @param {Object}      openingElement Babel JSXOpeningElement node.
 * @param {Set<string>} declaredAttrs  This block's declared attribute names.
 * @return {string[]} Attribute names this element dispatches writes to.
 */
function resolveDispatcherWrites( openingElement, declaredAttrs ) {
	const found = new Set();
	if ( ! declaredAttrs || declaredAttrs.size === 0 ) {
		return [];
	}
	for ( const a of openingElement.attributes || [] ) {
		if ( a.type !== 'JSXAttribute' || ! a.value || a.value.type !== 'JSXExpressionContainer' ) {
			continue;
		}
		const expr = a.value.expression;
		if ( ! expr ) {
			continue;
		}
		if ( expr.type === 'ObjectExpression' ) {
			for ( const pr of expr.properties ) {
				if ( pr.type === 'ObjectProperty' && pr.value && pr.value.type === 'StringLiteral' &&
					declaredAttrs.has( pr.value.value ) ) {
					found.add( pr.value.value );
				}
			}
		} else if ( expr.type === 'CallExpression' && expr.arguments.length === 1 &&
			expr.arguments[ 0 ] && expr.arguments[ 0 ].type === 'StringLiteral' &&
			declaredAttrs.has( expr.arguments[ 0 ].value ) ) {
			found.add( expr.arguments[ 0 ].value );
		}
	}
	return [ ...found ];
}

const AST_SKIP_KEYS = new Set( [ 'loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments' ] );

/**
 * Generic small-tree walk (handler bodies are a handful of statements at
 * most — no need for a full traverse() Path context).
 *
 * @param {Object}   node    Babel AST node or array of nodes.
 * @param {Function} visitor Called with every object node in the tree.
 */
function walkAst( node, visitor ) {
	if ( ! node || typeof node !== 'object' ) {
		return;
	}
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => walkAst( n, visitor ) );
		return;
	}
	visitor( node );
	for ( const key of Object.keys( node ) ) {
		if ( AST_SKIP_KEYS.has( key ) ) {
			continue;
		}
		const val = node[ key ];
		if ( val && typeof val === 'object' ) {
			walkAst( val, visitor );
		}
	}
}

/**
 * Collect every bound parameter NAME from a function's params list, including
 * names nested inside object/array destructuring (`{ source, name }`,
 * `[ a, b ]`, defaults). Used to tell a genuine "pass the new value through"
 * write apart from a hardcoded literal stamp (see resolveWrite below).
 *
 * @param {Array} params Babel function params array.
 * @return {Set<string>} Bound identifier names.
 */
function collectParamNames( params ) {
	const names = new Set();
	const visit = ( node ) => {
		if ( ! node ) {
			return;
		}
		if ( node.type === 'Identifier' ) {
			names.add( node.name );
		} else if ( node.type === 'AssignmentPattern' ) {
			visit( node.left );
		} else if ( node.type === 'ObjectPattern' ) {
			for ( const prop of node.properties ) {
				if ( prop.type === 'ObjectProperty' ) {
					visit( prop.value );
				} else if ( prop.type === 'RestElement' ) {
					visit( prop.argument );
				}
			}
		} else if ( node.type === 'ArrayPattern' ) {
			node.elements.forEach( visit );
		} else if ( node.type === 'RestElement' ) {
			visit( node.argument );
		}
	};
	( params || [] ).forEach( visit );
	return names;
}

/**
 * Does `node` reference any name in `paramNames` anywhere within it? Used to
 * distinguish a DYNAMIC write (`setAttributes({ foo: val })` — genuinely
 * passes the control's new value through) from a STATIC write (`setAttributes
 * ({ foo: '' })` / `{ foo: 'external' }` — a hardcoded literal, typically a
 * "reset" affordance or a side-effect state-consistency stamp riding along
 * with a DIFFERENT attr's real write, e.g. sgs/audio's URL field also
 * stamping `audioSource: 'external'`). Static writes are NOT counted as
 * "this control controls that attribute" — only the control whose value
 * prop the client actually manipulates counts.
 *
 * @param {Object}      node       Value expression AST node.
 * @param {Set<string>} paramNames Bound handler parameter names.
 * @return {boolean} True if the value is derived from a handler parameter.
 */
function referencesParam( node, paramNames ) {
	if ( ! node || paramNames.size === 0 ) {
		return false;
	}
	let found = false;
	walkAst( node, ( n ) => {
		if ( n.type === 'Identifier' && paramNames.has( n.name ) ) {
			found = true;
		}
	} );
	return found;
}

/**
 * Resolve a `setAttributes({ key: value })` write to its effective identity +
 * whether it is dynamic. Handles the pervasive "box-object interface" idiom
 * (Spec 32) where MULTIPLE distinct controls each write ONE named sub-key of
 * a shared object attr via self-spread — e.g.
 *   setAttributes({ style: { ...style, spacing: { ...style?.spacing, padding: next } } })
 *   setAttributes({ style: { ...style, spacing: { ...style?.spacing, margin: next } } })
 * are NOT duplicate controls for "style" — they are ONE control each for
 * "style.spacing.padding" and "style.spacing.margin" respectively. Only when
 * an object literal has exactly ONE non-spread key do we descend; 0 or 2+
 * non-spread keys means "this call sets the whole object" and we stop there.
 *
 * @param {string}      baseKey    The key name so far (dot-joined on recursion).
 * @param {Object}      valueNode  The value expression assigned to baseKey.
 * @param {Set<string>} paramNames Bound handler parameter names.
 * @return {{key: string, dynamic: boolean}} Effective attr identity + dynamism.
 */
function resolveWrite( baseKey, valueNode, paramNames ) {
	if ( valueNode && valueNode.type === 'ObjectExpression' ) {
		const nonSpread = valueNode.properties.filter( ( p ) => p.type === 'ObjectProperty' && ! p.computed );
		if ( nonSpread.length === 1 ) {
			const p = nonSpread[ 0 ];
			const subKey = p.key.type === 'Identifier' ? p.key.name : ( p.key.type === 'StringLiteral' ? p.key.value : null );
			if ( subKey ) {
				return resolveWrite( baseKey + '.' + subKey, p.value, paramNames );
			}
		}
	}
	// Mutual-exclusion sibling-clear idiom: `otherKey: val ? <literal> : otherKey`
	// (either branch order) — one branch is a bare Identifier with the SAME
	// NAME as the key being written, i.e. it just passes the attribute's own
	// CURRENT value straight through when this particular control isn't the
	// one being toggled (a "keep as-is unless I'm clearing you" clause, not a
	// real setting). Verified live shape: sgs/hero's mutually-exclusive
	// "Media Ken-burns"/"Media parallax" toggles — mediaKenBurns's onChange
	// writes `{ mediaKenBurns: val, mediaParallax: val ? false : mediaParallax }`
	// and mediaParallax's onChange does the mirror. Without this exclusion
	// each toggle is credited as a second "writer" for the OTHER's attr,
	// producing a false same-file-duplicate finding on a standard toggle-pair
	// pattern (also present in ContainerWrapperControls.js's own comment).
	// Do NOT credit this as an independent control-writer for baseKey.
	if ( valueNode && valueNode.type === 'ConditionalExpression' ) {
		const isSelfPassthrough = ( n ) => n && n.type === 'Identifier' && n.name === baseKey;
		if ( isSelfPassthrough( valueNode.consequent ) || isSelfPassthrough( valueNode.alternate ) ) {
			return { key: baseKey, dynamic: false };
		}
	}
	return { key: baseKey, dynamic: referencesParam( valueNode, paramNames ) };
}

/**
 * Extract effective attribute identities written via setAttributes({...}) or
 * update('x', v) inside a function/arrow-function AST node (an onChange
 * handler body) — DYNAMIC writes only (see resolveWrite / referencesParam).
 *
 * @param {Object} fnNode Babel AST node (ArrowFunctionExpression | FunctionExpression).
 * @return {string[]} Effective attribute identities written by this handler.
 */
function resolveDynamicWrites( fnNode ) {
	const found = [];
	if ( ! fnNode ) {
		return found;
	}
	const paramNames = collectParamNames( fnNode.params );

	walkAst( fnNode.body, ( node ) => {
		if ( node.type !== 'CallExpression' ) {
			return;
		}
		const callee = node.callee;
		const isSetAttributes = callee && callee.type === 'Identifier' && callee.name === 'setAttributes';
		const isUpdate = callee && callee.type === 'Identifier' && callee.name === 'update';

		if ( isSetAttributes && node.arguments[ 0 ] && node.arguments[ 0 ].type === 'ObjectExpression' ) {
			for ( const prop of node.arguments[ 0 ].properties ) {
				if ( prop.type !== 'ObjectProperty' || prop.computed ) {
					continue;
				}
				const keyName = prop.key.type === 'Identifier' ? prop.key.name : ( prop.key.type === 'StringLiteral' ? prop.key.value : null );
				if ( ! keyName ) {
					continue;
				}
				const resolved = resolveWrite( keyName, prop.value, paramNames );
				if ( resolved.dynamic ) {
					found.push( resolved.key );
				}
			}
		}
		if ( isUpdate && node.arguments[ 0 ] && node.arguments[ 0 ].type === 'StringLiteral' ) {
			const keyName = node.arguments[ 0 ].value;
			const dynamic = node.arguments[ 1 ] ? referencesParam( node.arguments[ 1 ], paramNames ) : false;
			if ( dynamic ) {
				found.push( keyName );
			}
		}
	} );

	return [ ...new Set( found ) ];
}

/**
 * Parse a block's edit.js with @babel/parser and find, per attribute name,
 * every DISTINCT control-like JSX element whose onChange handler writes it.
 * Returns findings for attrs written by 2+ distinct JSX control elements.
 *
 * Throws on unparseable source — caller catches and logs to unparseable[].
 *
 * CORPUS ASYMMETRY, DELIBERATE AND DOCUMENTED (2026-08-25, defect 3). CHECK 1
 * scans a WIDENED corpus — the block's edit.js, its own components/ dir, and
 * the transitive closure of every framework-wide shared component it mounts
 * (loadBlockOwnSrc). CHECK 2 stays on the block's OWN edit.js and does not
 * follow that graph. This asymmetry is KEPT, because the two checks make
 * different claims:
 *   - CHECK 1 asks "does a control for this attribute exist ANYWHERE reachable
 *     from this block?" A wider corpus makes that answer MORE correct, and
 *     missing a control there invents a false `hover:shadow` finding.
 *   - CHECK 2 asks "are there TWO knobs in this one editor surface?" Following
 *     the component graph would compare a shared component (mounted by 15
 *     blocks) against each block's own controls and call the pair a duplicate
 *     — a different claim (cross-file duplication) needing its own severity,
 *     its own keeper semantics and its own baseline. Widening CHECK 2 by
 *     default would silently convert it into that other check.
 * What CHECK 2 *does* now follow is one hop, for identity only: a mounted tag
 * is resolved to its defining file solely to ask "is this a dispatcher?" — no
 * controls are harvested from that file. See componentIsDispatcher above.
 *
 * @param {string}      blockSlug     Block name (e.g. 'sgs/card-grid').
 * @param {string}      src           edit.js source (NOT comment-stripped — AST handles comments).
 * @param {Set<string>} declaredAttrs This block's declared attribute names. REQUIRED to
 *                                    enable dispatcher resolution; when omitted, dispatcher
 *                                    resolution is skipped entirely (a stray string could
 *                                    otherwise name an attribute the block does not have).
 * @return {Array<Object>} Findings.
 */
function checkSameFileDuplicateAst( blockSlug, src, declaredAttrs ) {
	const findings = [];
	if ( ! src || ! /setAttributes/.test( src ) ) {
		return findings;
	}

	const ast = parser.parse( src, {
		sourceType: 'module',
		plugins: BABEL_PLUGINS,
		errorRecovery: true,
	} );
	if ( ast.errors && ast.errors.length ) {
		// Defect 4 (2026-08-25): this parse asked for errorRecovery and then
		// never looked at what it recovered from. A partial AST here means
		// fewer JSX controls found, i.e. a real duplicate silently drops off
		// the report while the run still says PASS.
		PARSE_DIAGNOSTICS.push( {
			dir: blockSlug,
			reason:
				`same-file-duplicate (AST): parse RECOVERED from ${ ast.errors.length } syntax ` +
				`error(s) — CHECK 2 under-reports for this block. First: ` +
				`${ ast.errors[ 0 ].reasonCode || ast.errors[ 0 ].message }`,
		} );
	}

	// attrName -> Array<{ tag, line, exclusiveGroup }>
	const writers = new Map();

	traverse( ast, {
		JSXOpeningElement( pathNode ) {
			const nameNode = pathNode.node.name;
			const tagName = nameNode && nameNode.type === 'JSXIdentifier' ? nameNode.name : null;
			if ( ! tagName ) {
				return;
			}

			// PATH B (2026-08-25, defect 3) — DISPATCHER-DRIVEN control. Tried
			// first because it does not need an inline onChange arrow at all:
			// the attribute name arrives as a string in a prop, and the
			// computed-key setAttributes lives in the component's own file.
			// Gated behaviourally by componentIsDispatcher(), not by tag name.
			let attrNames = [];
			let viaDispatcher = false;
			if ( declaredAttrs && declaredAttrs.size && componentIsDispatcher( tagName ) ) {
				attrNames = resolveDispatcherWrites( pathNode.node, declaredAttrs );
				viaDispatcher = attrNames.length > 0;
			}

			// PATH A — the original literal path: a control-shaped tag with an
			// inline onChange whose body writes a literal key.
			if ( ! viaDispatcher ) {
				if ( ! looksLikeControlComponent( tagName ) ) {
					return;
				}
				const onChangeAttr = pathNode.node.attributes.find(
					( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === 'onChange'
				);
				if ( ! onChangeAttr || ! onChangeAttr.value || onChangeAttr.value.type !== 'JSXExpressionContainer' ) {
					return;
				}
				const expr = onChangeAttr.value.expression;
				const fnNode =
					expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression'
						? expr
						: null;
				if ( ! fnNode ) {
					return; // onChange={ someNamedHandler } — not statically resolvable here.
				}
				attrNames = resolveDynamicWrites( fnNode );
			}
			if ( attrNames.length === 0 ) {
				return; // no dynamic (user-value-derived) write — e.g. a reset button
				// that stamps a hardcoded literal; not "a control for" that attr.
			}
			const line = pathNode.node.loc ? pathNode.node.loc.start.line : 0;

			// Ternary-exclusivity: `cond ? <A onChange=.../> : <B onChange=.../>`
			// renders exactly ONE of the two branches — a feature-detection
			// fallback (e.g. filter-search's NumberControl-vs-TextControl) is not
			// "two knobs", it is one slot with two implementations. If this
			// element's nearest ConditionalExpression ancestor already has an
			// entry for this attr, treat it as the same slot and don't add a
			// second entry.
			const condAncestorPath = pathNode.findParent( ( p ) => p.isConditionalExpression() );
			const exclusiveGroup = condAncestorPath ? condAncestorPath.node : null;

			for ( const attrName of attrNames ) {
				if ( ! writers.has( attrName ) ) {
					writers.set( attrName, [] );
				}
				const list = writers.get( attrName );
				if ( exclusiveGroup && list.some( ( e ) => e.exclusiveGroup === exclusiveGroup ) ) {
					continue; // alternate branch of a ternary already counted for this attr.
				}
				list.push( { tag: tagName, line, exclusiveGroup } );
			}
		},
	} );

	for ( const [ attrName, list ] of writers.entries() ) {
		if ( list.length < 2 ) {
			continue;
		}
		const sources = list.map( ( e ) => `<${ e.tag }> at line ${ e.line }` );
		findings.push( {
			check: 'same-file-duplicate',
			block: blockSlug,
			attr: attrName,
			// Defect 1 (2026-08-25): namespaced. Was the bare `controlled`,
			// which CHECK 1 also emits with a DIFFERENT meaning.
			severity: 'same-file:controlled',
			keeper: sources[ 0 ],
			sources,
			reason: `"${ attrName }" is written (with a value genuinely derived from the control's own input, not a hardcoded stamp) by ${ list.length } distinct JSX controls in the same edit.js that do not share a common conditional branch (${ sources.join( ', ' ) }) — the client is shown two knobs for one attribute (or they silently fight over which write wins on re-render).`,
		} );
	}

	return findings;
}

// ---------------------------------------------------------------------------
// CHECK 3 — parent/child duplication (heuristic, composite blocks)
// ---------------------------------------------------------------------------

// Child block slug -> role keywords a parent's own attr name would use for
// the same semantic element. Kept small + justified — extend as new
// composites are audited, do not blanket-generate from the DB (this is an
// editor-UX heuristic, not a render-consumption fact the DB tracks).
const CHILD_ROLE_KEYWORDS = {
	'sgs/heading': [ 'title', 'heading', 'headline' ],
	'sgs/text': [ 'text', 'body', 'description', 'subtitle', 'copy' ],
	'sgs/button': [ 'button', 'cta' ],
	'sgs/media': [ 'image', 'media', 'photo' ],
	'sgs/quote': [ 'quote' ],
	'sgs/icon': [ 'icon' ],
};

// Style-bearing suffix words that indicate an attr is a genuine styling
// control (not, say, a `titleTag` heading-level select or a `titleField`
// data-binding attr) — only THESE combined with a role keyword count as a
// parent/child duplicate candidate.
const STYLE_SUFFIX_RE = /(Colour|Color|FontSize|FontWeight|FontStyle|TextAlign|Align|LetterSpacing|LineHeight|TextTransform|TextDecoration)$/;

/**
 * Extract SGS child block slugs referenced in an InnerBlocks `template`
 * array literal inside edit.js (regex — good enough for a heuristic).
 *
 * @param {string} src edit.js source.
 * @return {Set<string>} Child block slugs found in the template.
 */
function extractTemplateChildSlugs( src ) {
	const slugs = new Set();
	const templateBlockMatch = src.match( /template\s*=\s*\[([\s\S]*?)\n\s*\]\s*;/ );
	const scanSrc = templateBlockMatch ? templateBlockMatch[ 1 ] : src;
	const slugRe = /['"](sgs\/[a-z0-9-]+)['"]/g;
	let m;
	while ( ( m = slugRe.exec( scanSrc ) ) !== null ) {
		slugs.add( m[ 1 ] );
	}
	return slugs;
}

// ---------------------------------------------------------------------------
// CHECK 3 child-slug existence resolution (2026-08-25, defect 2).
// ---------------------------------------------------------------------------
//
// THE HOLE. CHECK 3's `keeper` was unvalidated free text: `child ${childSlug}'s
// own typography/colour controls`, where childSlug came from a REGEX over
// edit.js (extractTemplateChildSlugs) filtered only by the hand-written
// CHILD_ROLE_KEYWORDS table. Nothing ever confirmed that block exists. The
// finding then advises deleting a working parent control in favour of a child
// that owns the setting — if the child is a typo, a renamed block, or a slug
// that only ever appeared in a comment, the keeper names NOTHING and the
// advice is "delete this control and get no replacement". That is the exact
// shape of the 36 wrong findings purged from CHECK 1 earlier the same day,
// where the keeper named `sgsHoverBgColour` and no such attr was registered.
//
// Same shape as CHECK 1's drift guard (readRegisteredUniversalHoverAttrs +
// computeCategoryDrift): resolve the claimed keeper against the real tree
// before asserting it. Reuses the existing primitives BLOCKS_DIR and
// readBlockJson(), and confirms `meta.name === childSlug` rather than merely
// that a directory exists — a directory name is not a block name.
//
// Verified 2026-08-25: all six CHILD_ROLE_KEYWORDS slugs resolve today
// (sgs/heading, sgs/text, sgs/button, sgs/media, sgs/quote, sgs/icon), so this
// changes no current finding. It is a guard against the table drifting.
const CHILD_SLUG_MEMO = new Map();

/**
 * Resolve an `sgs/foo` child block slug to a real block on disk.
 *
 * @param {string} childSlug Block slug from an InnerBlocks template.
 * @return {?string} The block's directory, or null when it does not resolve.
 */
function resolveChildBlockDir( childSlug ) {
	if ( CHILD_SLUG_MEMO.has( childSlug ) ) {
		return CHILD_SLUG_MEMO.get( childSlug );
	}
	let resolved = null;
	if ( /^sgs\/[a-z0-9-]+$/.test( childSlug ) ) {
		const dir = path.join( BLOCKS_DIR, childSlug.replace( 'sgs/', '' ) );
		try {
			const childMeta = readBlockJson( dir );
			// Name check, not a bare existsSync: a directory called `quote`
			// whose block.json declares some other name is not sgs/quote.
			if ( childMeta && childMeta.name === childSlug ) {
				resolved = dir;
			}
		} catch ( e ) {
			resolved = null; // malformed block.json — surfaced by the caller.
		}
	}
	CHILD_SLUG_MEMO.set( childSlug, resolved );
	return resolved;
}

/**
 * @param {string}         blockSlug     Parent block name.
 * @param {string}         blockDir      Parent block directory.
 * @param {Object}         meta          Parent block.json.
 * @param {Array<Object>=} unresolvedOut Optional sink for child slugs that did
 *                                       not resolve to a real block. Passing it
 *                                       is how the caller makes the skip
 *                                       VISIBLE instead of silent.
 * @return {Array<Object>} Findings.
 */
function checkParentChildDuplication( blockSlug, blockDir, meta, unresolvedOut ) {
	const findings = [];
	const editJs = readIfExists( path.join( blockDir, 'edit.js' ) );
	if ( ! editJs || ! /InnerBlocks|useInnerBlocksProps/.test( editJs ) ) {
		return findings; // not a composite that nests InnerBlocks.
	}
	const childSlugs = extractTemplateChildSlugs( editJs );
	if ( childSlugs.size === 0 ) {
		return findings;
	}

	const attrs = Object.keys( meta.attributes || {} );

	for ( const childSlug of childSlugs ) {
		const roleWords = CHILD_ROLE_KEYWORDS[ childSlug ];
		if ( ! roleWords ) {
			continue;
		}
		// Defect 2 (2026-08-25): the keeper must name a block that EXISTS
		// before this finding may claim the child owns the setting.
		const childDir = resolveChildBlockDir( childSlug );
		if ( ! childDir ) {
			if ( unresolvedOut ) {
				unresolvedOut.push( {
					dir: blockSlug,
					reason:
						`parent-child check: CHILD_ROLE_KEYWORDS names "${ childSlug }", which does ` +
						`not resolve to a block whose block.json declares that name. Every ` +
						`parent-child finding for it is SUPPRESSED — its keeper would have ` +
						`advised deleting a working control in favour of a block that does not ` +
						`exist. Fix CHILD_ROLE_KEYWORDS or restore the block.`,
				} );
			}
			continue;
		}
		for ( const attrName of attrs ) {
			if ( ! STYLE_SUFFIX_RE.test( attrName ) ) {
				continue;
			}
			const lower = attrName.toLowerCase();
			const matchedRole = roleWords.find( ( w ) => lower.startsWith( w.toLowerCase() ) );
			if ( ! matchedRole ) {
				continue;
			}
			findings.push( {
				check: 'parent-child-duplicate',
				block: blockSlug,
				attr: attrName,
				// Defect 1 (2026-08-25): was the bare token `scoped`, which
				// CHECK 1 also emits meaning something else entirely
				// ("sub-element-prefixed"). This one means "role-keyword
				// overlap between a parent attr and a mounted child block —
				// heuristic, low confidence".
				severity: 'parent-child:heuristic',
				// Defect 2 (2026-08-25): `childSlug` is now RESOLVED to a real
				// block (see resolveChildBlockDir) before this keeper claims
				// the child owns the setting.
				keeper: `child ${ childSlug }'s own typography/colour controls (block resolved at ${ path.relative( ROOT, childDir ) })`,
				sources: [
					`${ blockSlug } edit.js: parent-level control for "${ attrName }"`,
					`${ childSlug } (mounted via this block's InnerBlocks template, role "${ matchedRole }"): its own native typography/colour controls`,
				],
				reason: `"${ attrName }" (role "${ matchedRole }") is a parent-level styling attr on ${ blockSlug }, which also mounts a ${ childSlug } InnerBlock for that same role. ${ childSlug } owns real typography/colour controls for itself — whichever wins on CSS specificity, the client is shown two places to set the same visual property. Verify: does the parent attr actually still drive rendered CSS, or is it a dead-by-specificity leftover (check-dead-controls' angle) that should be removed in favour of the child's own controls?`,
			} );
		}
	}

	return findings;
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return [];
	}
	try {
		const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
		return Array.isArray( data.accepted ) ? data.accepted : [];
	} catch ( e ) {
		throw new Error( `Invalid duplicate-controls-baseline.json: ${ e.message }` );
	}
}

/**
 * The gate's exit decision, as a named function so the self-test asserts
 * against the REAL rule rather than a re-typed copy of the expression (a
 * duplicated expression in a test passes even when main() is reverted, which
 * makes the case vacuous).
 *
 * @param {boolean} isCheck        Was --check passed?
 * @param {number}  netNewCount    Findings not present in the baseline.
 * @param {number}  unparseableCount Surfaces the gate could not read.
 * @return {number} Process exit code.
 */
function computeExitCode( isCheck, netNewCount, unparseableCount ) {
	return isCheck && ( netNewCount > 0 || unparseableCount > 0 ) ? 1 : 0;
}

function findingKey( f ) {
	// NOTE (2026-08-25): severity is deliberately NOT part of the key. That is
	// what let defect 1's severity rename land without invalidating a single
	// baseline entry.
	return `${ f.check }:${ f.block }:${ f.attr }`;
}

// ---------------------------------------------------------------------------
// SEVERITIES — namespaced per check (2026-08-25, defect 1).
// ---------------------------------------------------------------------------
//
// THE BUG. CHECK 1 emitted `scoped` meaning "this private attr is prefixed for
// a named SUB-ELEMENT, so it may not be a duplicate of the block-wide
// universal control at all" — a CONFIDENCE-LOWERING qualifier about WHICH
// element is targeted. CHECK 3 hardcoded the same token `scoped` meaning
// "parent/child role-keyword overlap, heuristic" — an unrelated claim about a
// different mechanism. Both also emitted a bare `controlled`. Any consumer
// filtering or triaging on `severity` silently mixed two populations.
//
// FIX CHOSEN: namespace the token as `<check>:<severity>`, rather than the
// alternative of moving CHECK 3 to an informational stream. Reasons:
//   1. Demoting CHECK 3 would SUBTRACT gate coverage — 10 of the 13 current
//      findings are CHECK 3. This project's doc rules are explicit that
//      structural defences are carried forward, never quietly subtracted.
//   2. CHECK 3's low confidence is a property of the CHECK, and is now stated
//      in the token itself (`parent-child:heuristic`), so a reader sees it
//      without needing a separate stream to infer it from.
//   3. Namespacing is safe: findingKey() ignores severity (see above), so all
//      17 baseline entries survived the rename unchanged.
//
// Adding a severity? Add it here too — an unexplained token is how the last
// one drifted.
const SEVERITY_MEANINGS = {
	'hover:controlled':
		'CHECK 1 — private hover attr HAS its own edit.js control while the universal Hover Effects panel also covers it. Two visible knobs.',
	'hover:shadow':
		'CHECK 1 — private hover attr is declared + consumed but has NO control of its own. Hidden duplicate; permanently stuck at its default.',
	'hover:scoped':
		'CHECK 1 — as hover:controlled, but the private attr is prefixed for a named SUB-ELEMENT (cta/icon/tab/...), so it may legitimately target a different element. LOWER confidence; verify before acting.',
	'hover:scoped-shadow':
		'CHECK 1 — as hover:shadow, but sub-element-scoped. LOWER confidence.',
	'same-file:controlled':
		'CHECK 2 — two distinct JSX controls in ONE edit.js write the same attribute with a user-derived value, outside a shared conditional branch.',
	'parent-child:heuristic':
		'CHECK 3 — a parent styling attr\'s role keyword overlaps a child block mounted in its InnerBlocks template. Static heuristic, LOWEST confidence; the child slug is resolved to a real block but the CSS-specificity outcome is not measured.',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	// BLINDNESS CHECK (2026-08-25). The drift guard above validates the hover
	// category table against hover-effects.js — but it only RUNS when that file
	// could be read and parsed. If it is renamed, moved, or changes how it
	// declares attrs, the registered set comes back EMPTY, the guard silently
	// skips, and the table is used unvalidated: exactly the state that produced
	// 36 wrong findings before it was fixed. A guard that can quietly stop
	// guarding is not a guard, so this fails the gate LOUDLY instead.
	if ( REGISTERED_UNIVERSAL_HOVER.size === 0 ) {
		process.stderr.write(
			'[check-duplicate-controls] FAIL - could not read any universal hover attribute\n'
		);
		process.stderr.write(
			'  from src/blocks/extensions/hover-effects.js, so UNIVERSAL_HOVER_BY_CATEGORY\n'
		);
		process.stderr.write( '  CANNOT be validated and this gate is blind.\n' );
		process.stderr.write(
			'  Either that file moved, or it no longer declares attrs as `sgsHoverX:` /\n'
		);
		process.stderr.write(
			'  `sgsStaggerX:` keys. Fix readRegisteredUniversalHoverAttrs() to match -\n'
		);
		process.stderr.write( '  do NOT delete this check.\n' );
		process.exit( 1 );
	}
	if ( UNIVERSAL_MAP_DRIFT.length ) {
		process.stderr.write(
			'[check-duplicate-controls] WARNING - UNIVERSAL_HOVER_BY_CATEGORY has drifted\n'
		);
		process.stderr.write(
			'  from hover-effects.js. These name attrs that are NOT registered and were\n'
		);
		process.stderr.write(
			'  DROPPED for this run (they would advise deleting a working control in\n'
		);
		process.stderr.write( '  favour of nothing):\n' );
		for ( const d of UNIVERSAL_MAP_DRIFT ) {
			process.stderr.write( '    ' + d + '\n' );
		}
	}
	const asJson = process.argv.includes( '--json' );
	const isCheck = process.argv.includes( '--check' );
	const isUpdateBaseline = process.argv.includes( '--update-baseline' );

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );

	let findings = [];
	const unparseable = [];

	for ( const dir of blockDirs ) {
		let meta;
		try {
			meta = readBlockJson( dir );
		} catch ( e ) {
			unparseable.push( { dir, reason: `block.json: ${ e.message }` } );
			continue;
		}
		if ( ! meta ) {
			// Defect 4 (2026-08-25): a directory with NO block.json is
			// normally not a block, so skipping is correct and stays silent.
			// A directory with an edit.js but no block.json is NOT normal —
			// it has editor code this gate can never check, because every
			// check keys off the declared attributes. Surface that one.
			if ( fs.existsSync( path.join( dir, 'edit.js' ) ) ) {
				unparseable.push( {
					dir: path.basename( dir ),
					reason:
						'has an edit.js but NO block.json — every check keys off declared ' +
						'attributes, so this block\'s controls are entirely ungated.',
				} );
			}
			continue;
		}
		const blockSlug = meta.name || path.basename( dir );

		try {
			findings = findings.concat( checkHoverDuplication( blockSlug, dir, meta ) );
		} catch ( e ) {
			unparseable.push( { dir: blockSlug, reason: `hover-duplicate check: ${ e.message }` } );
		}

		try {
			findings = findings.concat(
				checkParentChildDuplication( blockSlug, dir, meta, unparseable )
			);
		} catch ( e ) {
			unparseable.push( { dir: blockSlug, reason: `parent-child check: ${ e.message }` } );
		}

		const editJsPath = path.join( dir, 'edit.js' );
		if ( fs.existsSync( editJsPath ) ) {
			try {
				const src = fs.readFileSync( editJsPath, 'utf8' );
				findings = findings.concat(
					checkSameFileDuplicateAst(
						blockSlug,
						src,
						new Set( Object.keys( meta.attributes || {} ) )
					)
				);
			} catch ( e ) {
				unparseable.push( { dir: blockSlug, reason: `same-file-duplicate (AST): ${ e.message }` } );
			}
		}
	}

	// Defect 4 (2026-08-25): drain the parse diagnostics collected deep inside
	// the collectors, which previously had no way to reach this report at all.
	for ( const d of PARSE_DIAGNOSTICS ) {
		unparseable.push( d );
	}

	if ( isUpdateBaseline ) {
		// MERGE, never overwrite (2026-08-25). This previously wrote O\nY the
		// current run's freshly-computed findings, so any hand-authored `reason`
		// in the baseline was DESTROYED on the next run - including a human
		// ruling dated 2026-08-21 that is still live in this file. The docblock
		// tells the reader to "add it with a reason"; this command used to
		// delete exactly that.
		const existingBaseline = loadBaseline();
		const existingMap = new Map(
			existingBaseline.map( ( f ) => [ findingKey( f ), f ] )
		);
		const dropped = new Set( existingMap.keys() );
		const merged = [];
		for ( const finding of findings ) {
			const key = findingKey( finding );
			dropped.delete( key );
			const prior = existingMap.get( key );
			// Keep the human-authored entry wholesale when one exists.
			merged.push( prior ? { ...prior } : finding );
		}
		// Stable order, so re-baselining on another machine cannot produce
		// diff churn unrelated to any real change.
		merged.sort( ( a, b ) => findingKey( a ).localeCompare( findingKey( b ) ) );
		// TAB indent, matching the committed baseline file (2026-08-25). This
		// wrote 2 SPACES while duplicate-controls-baseline.json is, and always
		// was, tab-indented — so any --update-baseline run reformatted all 208
		// lines and buried the one real severity/entry change in a whole-file
		// diff. Round-tripping the file's own format keeps the diff to what
		// actually changed.
		fs.writeFileSync( BASELINE_FILE, JSON.stringify( { accepted: merged }, null, '\t' ) + '\n' );
		if ( dropped.size ) {
			// A vanishing acceptance must be visible, not silent.
			process.stderr.write(
				`[check-duplicate-controls] dropped ${ dropped.size } baseline entry(ies) no longer found:\n`
			);
			for ( const key of [ ...dropped ].sort() ) {
				process.stderr.write( `    ${ key }\n` );
			}
		}
		process.stdout.write(
			`[check-duplicate-controls] Baseline merged — ${ merged.length } entry(ies); ${ existingBaseline.length } previously baselined; ${ dropped.size } dropped.\n`
		);
		process.exit( 0 );
	}

	// Baseline subtraction.
	const baseline = new Set( loadBaseline().map( findingKey ) );
	const netNew = findings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const accepted = findings.filter( ( f ) => baseline.has( findingKey( f ) ) );

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify(
				{ netNew, accepted, baselineSize: baseline.size, unparseable, blocksScanned: blockDirs.length },
				null,
				2
			) + '\n'
		);
	} else {
		process.stdout.write(
			`[check-duplicate-controls] WARN-ONLY. Scanned ${ blockDirs.length } blocks.\n`
		);
		if ( accepted.length ) {
			process.stdout.write( `${ accepted.length } baselined finding(s) (accepted with reason).\n` );
		}
		if ( unparseable.length ) {
			// Defect 4 (2026-08-25): this line used to read "(skipped, logged
			// — not a failure)" while `unparseable` never touched the exit
			// code. It IS a failure now: a file this gate cannot read is a
			// file it cannot gate, and the direction of that blindness is to
			// make a controlled attr look uncontrolled and invent a finding.
			process.stdout.write(
				`${ unparseable.length } parse/resolution problem(s) — GATE FAILURE under --check.\n` +
				'Each one is a surface this gate could not read, so its findings are unreliable:\n'
			);
			for ( const u of unparseable ) {
				process.stdout.write( `  - ${ u.dir }: ${ u.reason }\n` );
			}
		}
		if ( netNew.length ) {
			process.stdout.write( `\n${ netNew.length } net-new duplicate-control finding(s):\n\n` );
			const byCheck = {};
			for ( const f of netNew ) {
				byCheck[ f.check ] = byCheck[ f.check ] || [];
				byCheck[ f.check ].push( f );
			}
			for ( const [ checkName, list ] of Object.entries( byCheck ) ) {
				process.stdout.write( `--- ${ checkName } (${ list.length }) ---\n` );
				for ( const f of list ) {
					process.stdout.write(
						`  BLOCK:    ${ f.block }\n` +
						`  ATTR:     ${ f.attr }\n` +
						`  SEVERITY: ${ f.severity }${ SEVERITY_MEANINGS[ f.severity ] ? ` — ${ SEVERITY_MEANINGS[ f.severity ] }` : '' }\n` +
						`  SOURCES:  ${ f.sources.join( '  <->  ' ) }\n` +
						`  KEEPER:   ${ f.keeper }\n` +
						`  REASON:   ${ f.reason }\n\n`
					);
				}
			}
		} else {
			process.stdout.write( '\nNo net-new duplicate-control findings.\n' );
		}
	}

	// Plain/--json runs are diagnostic-only and always exit 0. --check is the
	// real gate: exit 1 when any finding is not already in the baseline —
	// OR when any surface could not be parsed/resolved.
	//
	// Defect 4 (2026-08-25): `unparseable` now reaches the exit code. It never
	// did before, so a block whose block.json stopped parsing dropped out of
	// ALL THREE checks and the gate still said PASS. There is no baseline for
	// parse failures on purpose: a baseline records an ACCEPTED duplicate,
	// whereas an unreadable file is not a finding to accept, it is the gate
	// admitting it cannot see. Measured clean on the current tree (365 JS
	// files, 0 recovered errors, 0 fatal, 0 unparseable block.json).
	process.exit( computeExitCode( isCheck, netNew.length, unparseable.length ) );
}

// ---------------------------------------------------------------------------
// SELF-TEST (--self-test). NOT disk-free — see the ⚠ note in the top docblock:
// it reads the real tree (resolveComponentFiles / BLOCKS_DIR) and writes a
// temporary fixture directory under os.tmpdir(), removed in a `finally`.
// Covers CHECK 1 (classify + severities), CHECK 2 (literal + dispatcher),
// CHECK 3 (role match + child-slug resolution), the drift guard, and the
// parse-diagnostics fail-closed path.
// ---------------------------------------------------------------------------

// Two <TextControl> elements in the same edit.js both writing `ctaText` via
// setAttributes with no shared conditional ancestor — the exact live shape
// found at sgs/product-card (ctaText, ctaUrl). MUST be flagged.
const SELF_TEST_FAIL_FIXTURE = `
import { TextControl } from '@wordpress/components';
export default function Edit( { attributes, setAttributes } ) {
	return (
		<div>
			<TextControl label="CTA text" value={ attributes.ctaText } onChange={ ( v ) => setAttributes( { ctaText: v } ) } />
			<TextControl label="CTA text (duplicate)" value={ attributes.ctaText } onChange={ ( v ) => setAttributes( { ctaText: v } ) } />
		</div>
	);
}
`;

// Same shape, but only ONE control writes ctaText — no duplication.
const SELF_TEST_PASS_FIXTURE = `
import { TextControl } from '@wordpress/components';
export default function Edit( { attributes, setAttributes } ) {
	return (
		<div>
			<TextControl label="CTA text" value={ attributes.ctaText } onChange={ ( v ) => setAttributes( { ctaText: v } ) } />
		</div>
	);
}
`;

// Two controls writing the same attr, but in exclusive branches of a
// ternary (feature-detection fallback idiom) — must NOT be flagged.
const SELF_TEST_TERNARY_FIXTURE = `
import { TextControl, NumberControl } from '@wordpress/components';
export default function Edit( { attributes, setAttributes } ) {
	return (
		<div>
			{ attributes.useNumber
				? <NumberControl label="Qty" value={ attributes.qty } onChange={ ( v ) => setAttributes( { qty: v } ) } />
				: <TextControl label="Qty" value={ attributes.qty } onChange={ ( v ) => setAttributes( { qty: v } ) } /> }
		</div>
	);
}
`;

function runSelfTest() {
	const cases = [
		{
			name: 'two TextControls write ctaText with no shared conditional -> FLAGGED (negative control)',
			src: SELF_TEST_FAIL_FIXTURE,
			expectAttrs: [ 'ctaText' ],
		},
		{
			name: 'single TextControl writes ctaText -> pass',
			src: SELF_TEST_PASS_FIXTURE,
			expectAttrs: [],
		},
		{
			name: 'ternary-exclusive controls writing the same attr -> pass',
			src: SELF_TEST_TERNARY_FIXTURE,
			expectAttrs: [],
		},
	];

	let allOk = true;
	process.stdout.write( '[check-duplicate-controls] --self-test\n\n' );

	for ( const c of cases ) {
		let findings;
		let error = null;
		try {
			findings = checkSameFileDuplicateAst( 'sgs/self-test', c.src );
		} catch ( e ) {
			error = e;
		}

		if ( error ) {
			allOk = false;
			process.stdout.write( `  [ERROR] ${ c.name }: ${ error.message }\n` );
			continue;
		}

		const gotAttrs = findings.map( ( f ) => f.attr ).sort();
		const expectAttrs = [ ...c.expectAttrs ].sort();
		const ok = JSON.stringify( gotAttrs ) === JSON.stringify( expectAttrs );
		allOk = allOk && ok;

		process.stdout.write(
			`  [${ ok ? 'OK' : 'FAIL' }] ${ c.name }\n` +
				`         found=[${ gotAttrs.join( ', ' ) }] (expected [${ expectAttrs.join( ', ' ) }])\n`
		);
	}

	// R3-a widening regression test (2026-08-20), against the REAL tree (a
	// tmp-dir fixture can't exercise resolveComponentFiles(), which indexes
	// the real filesystem). NEGATIVE CONTROL: sgs/button has NO block-own
	// `components/` directory at all, so the old corpus (edit.js text + an
	// empty components/ loop) could never see a control living inside the
	// FRAMEWORK-WIDE shared `TypographyControls.js`, even though button
	// mounts it via `<TypographyControls .../>` JSX.
	const buttonDir = path.join( BLOCKS_DIR, 'button' );
	const buttonEditSrc = readIfExists( path.join( buttonDir, 'edit.js' ) );
	const buttonComponentsDir = path.join( buttonDir, 'components' );
	const oldNarrowHadNoLocalDir = ! fs.existsSync( buttonComponentsDir );
	const widenedButtonSrc = loadBlockOwnSrc( buttonDir );
	const typographyControlsResolved = COMPONENT_FILE_MAP.get( 'TypographyControls' );
	// stripComments() runs inside loadBlockOwnSrc(), so compare against the
	// SAME comment-stripped text rather than the raw file, or a real defect
	// (widening working) could spuriously read as a false comment-only match.
	const strippedTypographySrc = typographyControlsResolved
		? stripComments( readIfExists( typographyControlsResolved ) )
		: '';
	const widenedIncludesSharedFile =
		strippedTypographySrc.length > 0 &&
		widenedButtonSrc.includes( strippedTypographySrc.slice( 0, 200 ) );
	const buttonJsxMountsTypographyControls = /<TypographyControls\b/.test( buttonEditSrc );
	const widenedTest =
		oldNarrowHadNoLocalDir && buttonJsxMountsTypographyControls && widenedIncludesSharedFile;
	process.stdout.write(
		`\n  [${ widenedTest ? 'OK' : 'FAIL' }] R3-a negative control: sgs/button has no own components/ dir ` +
			'(old corpus could not see TypographyControls.js) but mounts it via JSX; the widened ' +
			`loadBlockOwnSrc() now includes that shared file's source\n`
	);
	allOk = allOk && widenedTest;
	let totalCases = cases.length + 1; // + the widened-test above.

	// -------------------------------------------------------------------
	// classifyHoverAttr() — colour-first ordering (2026-08-25 fix).
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- classifyHoverAttr() --\n' );
	const hoverClassifyCases = [
		{
			name: 'shadowHoverColour classifies as a COLOUR category, not shadow (colour-first ordering)',
			attr: 'shadowHoverColour',
			// isColour && !background/!border -> falls into the catch-all "every
			// other colour-bearing hover attr" branch, category 'textColour'.
			expectCategory: 'textColour',
		},
		{ name: 'scaleHover classifies as scale', attr: 'scaleHover', expectCategory: 'scale' },
		{ name: 'imageZoomHover classifies as imageZoom', attr: 'imageZoomHover', expectCategory: 'imageZoom' },
		{ name: 'grayscaleHover classifies as grayscale', attr: 'grayscaleHover', expectCategory: 'grayscale' },
		{
			name: 'pauseOnHover classifies to nothing (behavioural toggle, no panel equivalent)',
			attr: 'pauseOnHover',
			expectCategory: null,
		},
	];
	for ( const c of hoverClassifyCases ) {
		totalCases++;
		const got = classifyHoverAttr( c.attr );
		const gotCategory = got ? got.category : null;
		const ok = gotCategory === c.expectCategory;
		allOk = allOk && ok;
		process.stdout.write(
			`  [${ ok ? 'OK' : 'FAIL' }] ${ c.name }\n` +
				`         got=${ JSON.stringify( gotCategory ) } (expected ${ JSON.stringify( c.expectCategory ) })\n`
		);
	}

	// -------------------------------------------------------------------
	// Drift guard — extractRegisteredHoverAttrsFromSrc() + computeCategoryDrift().
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- drift guard --\n' );

	totalCases++;
	const driftPhantomSrc = `
const hoverAttributes = {
	sgsHoverScale: {},
	sgsHoverShadow: {},
};
`;
	const { phantom: driftPhantom, filtered: driftFiltered } = computeCategoryDrift(
		[ 'sgsHoverScale', 'sgsHoverPhantomGhost' ],
		extractRegisteredHoverAttrsFromSrc( driftPhantomSrc )
	);
	const driftOk =
		JSON.stringify( driftPhantom ) === JSON.stringify( [ 'sgsHoverPhantomGhost' ] ) &&
		JSON.stringify( driftFiltered ) === JSON.stringify( [ 'sgsHoverScale' ] );
	allOk = allOk && driftOk;
	process.stdout.write(
		`  [${ driftOk ? 'OK' : 'FAIL' }] a category naming an unregistered attr drops it and reports it; a real attr survives\n` +
			`         phantom=${ JSON.stringify( driftPhantom ) } filtered=${ JSON.stringify( driftFiltered ) }\n`
	);

	totalCases++;
	const driftCommentSrc = `
// sgsHoverPhantomGhost: RETIRED, do not re-add
const hoverAttributes = {
	sgsHoverScale: {},
};
`;
	const registeredFromComment = extractRegisteredHoverAttrsFromSrc( driftCommentSrc );
	const commentOk =
		registeredFromComment.has( 'sgsHoverScale' ) && ! registeredFromComment.has( 'sgsHoverPhantomGhost' );
	allOk = allOk && commentOk;
	process.stdout.write(
		`  [${ commentOk ? 'OK' : 'FAIL' }] a phantom name appearing only in a COMMENT does not get registered\n` +
			`         registered=[${ [ ...registeredFromComment ].join( ', ' ) }]\n`
	);

	// -------------------------------------------------------------------
	// collectIndirectControlledAttrs() — the two dispatcher idioms + the
	// unrelated-lookup-table false positive it must reject.
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- collectIndirectControlledAttrs() --\n' );

	const indirectCases = [
		{
			name: 'attrNames={ { valueHover: "shadowHover" } } JSX-prop object map -> controlled',
			src: `
export default function Edit( { attributes, setAttributes } ) {
	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	return (
		<ShadowControl attrNames={ { valueHover: 'shadowHover' } } />
	);
}
`,
			declaredAttrs: [ 'shadowHover' ],
			expectAttrs: [ 'shadowHover' ],
		},
		{
			name: 'onChange={ set( "effectHover" ) } curried setter in a JSX prop -> controlled',
			src: `
export default function Edit( { attributes, setAttributes } ) {
	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	return (
		<ColorPicker onChange={ set( 'effectHover' ) } />
	);
}
`,
			declaredAttrs: [ 'effectHover' ],
			expectAttrs: [ 'effectHover' ],
		},
		{
			name: 'unrelated lookup table (not a JSX prop) must NOT be marked controlled',
			src: `
export default function Edit( { attributes, setAttributes } ) {
	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	const ICON_LOOKUP = { home: 'ctaIconSlug' };
	return <div />;
}
`,
			declaredAttrs: [ 'ctaIconSlug' ],
			expectAttrs: [],
		},
		{
			// ⛔ THIS CASE ASSERTED THE BUG, and is inverted as of 2026-08-26.
			// It previously expected `[]` — "a file with no computed-key write of
			// its own returns nothing even with an attrNames map". That IS the
			// defect: the computed write lives in ShadowControl.js, never in the
			// block. `sgs/card-grid` (0 own computed writes, 4 dispatcher mounts)
			// therefore had a fully-controlled `shadowHover` reported DEAD, while
			// `sgs/info-box` — byte-identical mount, 2 unrelated computed writes —
			// passed by accident. The precondition is now asked PER ELEMENT, of the
			// COMPONENT. A test that encodes a bug makes the bug permanent.
			name: 'attrNames map on a real dispatcher IS found even with no computed-key write in this file',
			src: `
export default function Edit( { attributes, setAttributes } ) {
	return (
		<ShadowControl attrNames={ { valueHover: 'shadowHover' } } />
	);
}
`,
			declaredAttrs: [ 'shadowHover' ],
			expectAttrs: [ 'shadowHover' ],
		},
		{
			// DISCRIMINATION CONTROL for the case above. Dropping the file-level
			// precondition must NOT mean "any object-valued JSX prop counts".
			// `SelectControl` is not a dispatcher (it is a @wordpress/components
			// import, absent from COMPONENT_FILE_MAP), so an attrNames-SHAPED map
			// on it must still be ignored. Without this, the fix above would trade
			// a false-DEAD for a false-CONTROLLED, which D785 records as the more
			// damaging direction (it hides a genuinely dead setting forever).
			name: 'an attrNames-shaped map on a NON-dispatcher tag is still ignored',
			src: `
export default function Edit( { attributes, setAttributes } ) {
	return (
		<SelectControl attrNames={ { valueHover: 'shadowHover' } } />
	);
}
`,
			declaredAttrs: [ 'shadowHover' ],
			expectAttrs: [],
		},
	];
	for ( const c of indirectCases ) {
		totalCases++;
		const got = collectIndirectControlledAttrs( [ c.src ], new Set( c.declaredAttrs ) );
		const gotAttrs = [ ...got ].sort();
		const expectAttrs = [ ...c.expectAttrs ].sort();
		const ok = JSON.stringify( gotAttrs ) === JSON.stringify( expectAttrs );
		allOk = allOk && ok;
		process.stdout.write(
			`  [${ ok ? 'OK' : 'FAIL' }] ${ c.name }\n` +
				`         found=[${ gotAttrs.join( ', ' ) }] (expected [${ expectAttrs.join( ', ' ) }])\n`
		);
	}

	// -------------------------------------------------------------------
	// checkHoverDuplication() — the four severities (controlled / shadow /
	// scoped / scoped-shadow). Needs real files on disk for loadBlockOwnSrc()
	// to read, so this is the one group that is NOT in-memory-only: it writes
	// isolated fixture files under a fresh os.tmpdir() dir and removes them
	// afterwards.
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- checkHoverDuplication() severities (filesystem fixtures, cleaned up) --\n' );

	const severityCases = [
		{
			name: 'own control, unscoped attr -> severity "hover:controlled"',
			attrName: 'scaleHover',
			editJs:
				"import { RangeControl } from '@wordpress/components';\n" +
				'export default function Edit( { attributes, setAttributes } ) {\n' +
				"\treturn <RangeControl value={ attributes.scaleHover } onChange={ ( v ) => setAttributes( { scaleHover: v } ) } />;\n" +
				'}\n',
			expectSeverity: 'hover:controlled',
		},
		{
			name: 'no control, unscoped attr -> severity "hover:shadow"',
			attrName: 'grayscaleHover',
			editJs: 'export default function Edit() {\n\treturn null;\n}\n',
			expectSeverity: 'hover:shadow',
		},
		{
			name: 'own control, sub-element-scoped attr ("cta") -> severity "hover:scoped"',
			attrName: 'ctaScaleHover',
			editJs:
				"import { RangeControl } from '@wordpress/components';\n" +
				'export default function Edit( { attributes, setAttributes } ) {\n' +
				"\treturn <RangeControl value={ attributes.ctaScaleHover } onChange={ ( v ) => setAttributes( { ctaScaleHover: v } ) } />;\n" +
				'}\n',
			expectSeverity: 'hover:scoped',
		},
		{
			name: 'no control, sub-element-scoped attr ("icon") -> severity "hover:scoped-shadow"',
			attrName: 'iconGrayscaleHover',
			editJs: 'export default function Edit() {\n\treturn null;\n}\n',
			expectSeverity: 'hover:scoped-shadow',
		},
	];

	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-hover-selftest-' ) );
	try {
		for ( const c of severityCases ) {
			totalCases++;
			const blockDir = fs.mkdtempSync( path.join( tmpRoot, 'block-' ) );
			fs.writeFileSync( path.join( blockDir, 'edit.js' ), c.editJs );
			const meta = {
				attributes: { [ c.attrName ]: { type: 'number' } },
				supports: { sgs: { enabledExtensions: [ 'hover' ] } },
			};
			let findings;
			let error = null;
			try {
				findings = checkHoverDuplication( 'sgs/self-test-hover', blockDir, meta );
			} catch ( e ) {
				error = e;
			}
			if ( error ) {
				allOk = false;
				process.stdout.write( `  [ERROR] ${ c.name }: ${ error.message }\n` );
				continue;
			}
			const finding = findings.find( ( f ) => f.attr === c.attrName );
			const gotSeverity = finding ? finding.severity : null;
			const ok = gotSeverity === c.expectSeverity;
			allOk = allOk && ok;
			process.stdout.write(
				`  [${ ok ? 'OK' : 'FAIL' }] ${ c.name }\n` +
					`         got=${ JSON.stringify( gotSeverity ) } (expected ${ JSON.stringify( c.expectSeverity ) })\n`
			);
		}
	} finally {
		fs.rmSync( tmpRoot, { recursive: true, force: true } );
	}

	// ===================================================================
	// ADDED 2026-08-25 — coverage for the four adversarial-council defects.
	// Every case below was WATCHED FAILING against the unfixed code before
	// the fix was applied; each carries its own negative control, because a
	// case that only ever passes proves nothing.
	// ===================================================================

	const assertCase = ( name, ok, detail ) => {
		totalCases++;
		allOk = allOk && ok;
		process.stdout.write(
			`  [${ ok ? 'OK' : 'FAIL' }] ${ name }\n` + ( detail ? `         ${ detail }\n` : '' )
		);
	};

	// -------------------------------------------------------------------
	// DEFECT 1 — severity namespacing. The collision test: CHECK 1 and
	// CHECK 3 must not emit the same token, and every emitted token must be
	// documented. Under the old code BOTH emitted the bare `scoped`.
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- defect 1: severity namespacing --\n' );

	const c1Severities = new Set();
	const c3Severities = new Set();
	const c2Severities = new Set();

	const defect1Tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-sev-selftest-' ) );
	try {
		// A CHECK 1 finding (sub-element-scoped, with its own control).
		const c1Dir = fs.mkdtempSync( path.join( defect1Tmp, 'c1-' ) );
		fs.writeFileSync(
			path.join( c1Dir, 'edit.js' ),
			"import { RangeControl } from '@wordpress/components';\n" +
				'export default function Edit( { attributes, setAttributes } ) {\n' +
				'\treturn <RangeControl value={ attributes.ctaScaleHover } onChange={ ( v ) => setAttributes( { ctaScaleHover: v } ) } />;\n' +
				'}\n'
		);
		for ( const f of checkHoverDuplication( 'sgs/sev-c1', c1Dir, {
			attributes: { ctaScaleHover: { type: 'number' } },
			supports: { sgs: { enabledExtensions: [ 'hover' ] } },
		} ) ) {
			c1Severities.add( f.severity );
		}

		// A CHECK 3 finding: composite mounting sgs/text with a `textColour` attr.
		const c3Dir = fs.mkdtempSync( path.join( defect1Tmp, 'c3-' ) );
		fs.writeFileSync(
			path.join( c3Dir, 'edit.js' ),
			"import { InnerBlocks } from '@wordpress/block-editor';\n" +
				"const template = [\n\t[ 'sgs/text', {} ],\n];\n" +
				'export default function Edit() {\n\treturn <InnerBlocks template={ template } />;\n}\n'
		);
		for ( const f of checkParentChildDuplication( 'sgs/sev-c3', c3Dir, {
			attributes: { textColour: { type: 'string' } },
		}, [] ) ) {
			c3Severities.add( f.severity );
		}
	} finally {
		fs.rmSync( defect1Tmp, { recursive: true, force: true } );
	}

	for ( const f of checkSameFileDuplicateAst( 'sgs/sev-c2', SELF_TEST_FAIL_FIXTURE ) ) {
		c2Severities.add( f.severity );
	}

	const sevFixturesProduced =
		c1Severities.size > 0 && c2Severities.size > 0 && c3Severities.size > 0;
	assertCase(
		'severity fixtures actually produced a finding from all three checks (guards this group against vacuity)',
		sevFixturesProduced,
		`check1=[${ [ ...c1Severities ].join( ', ' ) }] check2=[${ [ ...c2Severities ].join( ', ' ) }] check3=[${ [ ...c3Severities ].join( ', ' ) }]`
	);

	const overlap12 = [ ...c1Severities ].filter( ( s ) => c2Severities.has( s ) );
	const overlap13 = [ ...c1Severities ].filter( ( s ) => c3Severities.has( s ) );
	const overlap23 = [ ...c2Severities ].filter( ( s ) => c3Severities.has( s ) );
	assertCase(
		'no severity token is emitted by two different checks (CHECK 1 + CHECK 3 both said "scoped" before)',
		sevFixturesProduced && overlap12.length === 0 && overlap13.length === 0 && overlap23.length === 0,
		`overlaps: 1x2=[${ overlap12.join( ', ' ) }] 1x3=[${ overlap13.join( ', ' ) }] 2x3=[${ overlap23.join( ', ' ) }]`
	);

	const allEmitted = [ ...c1Severities, ...c2Severities, ...c3Severities ];
	const undocumented = allEmitted.filter( ( s ) => ! SEVERITY_MEANINGS[ s ] );
	assertCase(
		'every emitted severity token has a SEVERITY_MEANINGS entry',
		sevFixturesProduced && undocumented.length === 0,
		`undocumented=[${ undocumented.join( ', ' ) }]`
	);

	// NEGATIVE CONTROL for the collision test itself: an intentionally
	// colliding pair MUST be detected as overlapping. Without this, the
	// assertion above would also "pass" if the overlap maths were broken.
	const fakeA = new Set( [ 'scoped' ] );
	const fakeB = new Set( [ 'scoped' ] );
	assertCase(
		'NEGATIVE CONTROL: the collision test detects a deliberately colliding token pair',
		[ ...fakeA ].filter( ( s ) => fakeB.has( s ) ).length === 1,
		'a synthetic { scoped } x { scoped } pair is reported as overlapping'
	);

	// -------------------------------------------------------------------
	// DEFECT 2 — CHECK 3's keeper must name a block that EXISTS.
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- defect 2: CHECK 3 child-slug resolution --\n' );

	assertCase(
		'NEGATIVE CONTROL: a real child slug (sgs/text, in CHILD_ROLE_KEYWORDS) resolves to its block dir',
		resolveChildBlockDir( 'sgs/text' ) !== null,
		`resolved=${ JSON.stringify( resolveChildBlockDir( 'sgs/text' ) ) }`
	);
	assertCase(
		'a slug with no block on disk resolves to null',
		resolveChildBlockDir( 'sgs/definitely-not-a-real-block' ) === null
	);
	assertCase(
		'a slug that is not a plain sgs/<name> (path traversal shape) resolves to null',
		resolveChildBlockDir( 'sgs/../../etc' ) === null
	);

	// End-to-end: a CHILD_ROLE_KEYWORDS entry naming a non-existent block must
	// produce ZERO findings and ONE visible unresolved report — never a
	// finding whose keeper points at nothing.
	const phantomSlug = 'sgs/phantom-child-block';
	CHILD_ROLE_KEYWORDS[ phantomSlug ] = [ 'title' ];
	const defect2Tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-child-selftest-' ) );
	let phantomFindings = [];
	let phantomUnresolved = [];
	let realFindings = [];
	let realUnresolved = [];
	try {
		const phantomDir = fs.mkdtempSync( path.join( defect2Tmp, 'phantom-' ) );
		fs.writeFileSync(
			path.join( phantomDir, 'edit.js' ),
			"import { InnerBlocks } from '@wordpress/block-editor';\n" +
				`const template = [\n\t[ '${ phantomSlug }', {} ],\n];\n` +
				'export default function Edit() {\n\treturn <InnerBlocks template={ template } />;\n}\n'
		);
		const phantomMeta = { attributes: { titleColour: { type: 'string' } } };
		phantomFindings = checkParentChildDuplication(
			'sgs/defect2-parent', phantomDir, phantomMeta, phantomUnresolved
		);

		// NEGATIVE CONTROL: the IDENTICAL fixture pointed at a child that DOES
		// exist must still be flagged — the fix must suppress only the
		// unresolvable child, not the check.
		const realDir = fs.mkdtempSync( path.join( defect2Tmp, 'real-' ) );
		fs.writeFileSync(
			path.join( realDir, 'edit.js' ),
			"import { InnerBlocks } from '@wordpress/block-editor';\n" +
				"const template = [\n\t[ 'sgs/heading', {} ],\n];\n" +
				'export default function Edit() {\n\treturn <InnerBlocks template={ template } />;\n}\n'
		);
		realFindings = checkParentChildDuplication(
			'sgs/defect2-parent', realDir, { attributes: { titleColour: { type: 'string' } } }, realUnresolved
		);
	} finally {
		fs.rmSync( defect2Tmp, { recursive: true, force: true } );
		delete CHILD_ROLE_KEYWORDS[ phantomSlug ];
	}

	assertCase(
		'a template child that resolves to NO block yields zero findings (its keeper would name nothing)',
		phantomFindings.length === 0,
		`findings=${ phantomFindings.length } (attrs=[${ phantomFindings.map( ( f ) => f.attr ).join( ', ' ) }])`
	);
	assertCase(
		'...and the suppression is REPORTED, not silent',
		phantomUnresolved.length === 1 && /does not resolve to a block/.test( phantomUnresolved[ 0 ].reason ),
		`unresolved=${ phantomUnresolved.length }`
	);
	assertCase(
		'NEGATIVE CONTROL: the same fixture with a REAL child (sgs/heading) is still flagged, with a resolved keeper',
		realFindings.length === 1 &&
			realFindings[ 0 ].attr === 'titleColour' &&
			realUnresolved.length === 0 &&
			/block resolved at/.test( realFindings[ 0 ].keeper ),
		`findings=${ realFindings.length } keeper=${ JSON.stringify( realFindings.length ? realFindings[ 0 ].keeper : null ) }`
	);

	// NEGATIVE CONTROL for CHECK 3's own matching rules — a parent attr with
	// no styling suffix must not be flagged even with a real child mounted.
	const defect2Tmp2 = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-child-neg-' ) );
	let nonStyleFindings = [];
	let noInnerFindings = [];
	try {
		const d = fs.mkdtempSync( path.join( defect2Tmp2, 'b-' ) );
		fs.writeFileSync(
			path.join( d, 'edit.js' ),
			"import { InnerBlocks } from '@wordpress/block-editor';\n" +
				"const template = [\n\t[ 'sgs/heading', {} ],\n];\n" +
				'export default function Edit() {\n\treturn <InnerBlocks template={ template } />;\n}\n'
		);
		nonStyleFindings = checkParentChildDuplication(
			'sgs/neg', d, { attributes: { titleTag: { type: 'string' } } }, []
		);

		const d2 = fs.mkdtempSync( path.join( defect2Tmp2, 'c-' ) );
		fs.writeFileSync(
			path.join( d2, 'edit.js' ),
			'export default function Edit() {\n\treturn <div />;\n}\n'
		);
		noInnerFindings = checkParentChildDuplication(
			'sgs/neg2', d2, { attributes: { titleColour: { type: 'string' } } }, []
		);
	} finally {
		fs.rmSync( defect2Tmp2, { recursive: true, force: true } );
	}
	assertCase(
		'NEGATIVE CONTROL: `titleTag` (no styling suffix) is not a parent/child duplicate',
		nonStyleFindings.length === 0,
		`findings=${ nonStyleFindings.length }`
	);
	assertCase(
		'NEGATIVE CONTROL: a block that mounts no InnerBlocks is not a parent/child duplicate',
		noInnerFindings.length === 0,
		`findings=${ noInnerFindings.length }`
	);

	// -------------------------------------------------------------------
	// DEFECT 3 — CHECK 2 must see dispatcher-driven (computed-key) writes.
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- defect 3: CHECK 2 dispatcher resolution --\n' );

	assertCase(
		'ShadowControl is recognised as a dispatcher (its file has a computed-key setAttributes)',
		componentIsDispatcher( 'ShadowControl' ) === true
	);
	assertCase(
		'NEGATIVE CONTROL: SelectControl (a @wordpress/components import, not in the component map) is NOT a dispatcher',
		componentIsDispatcher( 'SelectControl' ) === false
	);
	assertCase(
		'NEGATIVE CONTROL: an unresolvable tag name is NOT a dispatcher',
		componentIsDispatcher( 'TotallyMadeUpTagName' ) === false
	);

	const dispatcherDupSrc = `
import { RangeControl } from '@wordpress/components';
export default function Edit( { attributes, setAttributes } ) {
	return (
		<div>
			<ShadowControl attributes={ attributes } setAttributes={ setAttributes } attrNames={ { valueHover: 'shadowHover' } } />
			<RangeControl value={ attributes.shadowHover } onChange={ ( v ) => setAttributes( { shadowHover: v } ) } />
		</div>
	);
}
`;
	const dispatcherDup = checkSameFileDuplicateAst(
		'sgs/dispatch-test', dispatcherDupSrc, new Set( [ 'shadowHover' ] )
	);
	assertCase(
		'a dispatcher (<ShadowControl attrNames={{...:"shadowHover"}}/>) PLUS a literal control for the same attr is flagged',
		dispatcherDup.length === 1 && dispatcherDup[ 0 ].attr === 'shadowHover',
		`found=[${ dispatcherDup.map( ( f ) => f.attr ).join( ', ' ) }]`
	);

	const dispatcherSoloSrc = `
export default function Edit( { attributes, setAttributes } ) {
	return <ShadowControl attributes={ attributes } setAttributes={ setAttributes } attrNames={ { valueHover: 'shadowHover' } } />;
}
`;
	assertCase(
		'NEGATIVE CONTROL: a lone dispatcher writing one attr is NOT a duplicate',
		checkSameFileDuplicateAst( 'sgs/dispatch-solo', dispatcherSoloSrc, new Set( [ 'shadowHover' ] ) ).length === 0
	);

	// THE FALSE-POSITIVE KILLER. A declared attr name sitting in an
	// object-valued JSX prop of a control that is NOT a dispatcher. A naive
	// string-harvesting implementation credits SelectControl as a second
	// writer for `textColour` and INVENTS a duplicate — the dangerous
	// direction, since a CHECK 2 finding ASSERTS a duplicate and invites
	// deleting a working control. The behavioural dispatcher gate must reject it.
	//
	// The fixture carries TWO shapes on purpose. `options={ [ { value:
	// 'textColour' } ] }` is the realistic one but is an ArrayExpression, which
	// resolveDispatcherWrites never descends into — so on its own this case
	// passed VACUOUSLY (confirmed by breaking componentIsDispatcher to return
	// true for everything: the case stayed green). `labelMap={ { colour:
	// 'textColour' } }` is the shape the harvester really does read, so the
	// case now goes red the moment the dispatcher gate stops discriminating.
	const optionsTrapSrc = `
import { SelectControl, ColorPicker } from '@wordpress/components';
export default function Edit( { attributes, setAttributes } ) {
	return (
		<div>
			<SelectControl
				options={ [ { label: 'Text colour', value: 'textColour' }, { label: 'None', value: 'none' } ] }
				labelMap={ { colour: 'textColour' } }
				value={ attributes.align }
				onChange={ ( v ) => setAttributes( { align: v } ) }
			/>
			<ColorPicker color={ attributes.textColour } onChange={ ( v ) => setAttributes( { textColour: v } ) } />
		</div>
	);
}
`;
	const optionsTrap = checkSameFileDuplicateAst(
		'sgs/options-trap', optionsTrapSrc, new Set( [ 'textColour', 'align' ] )
	);
	assertCase(
		'NEGATIVE CONTROL: a non-dispatcher <SelectControl> carrying "textColour" in options=[] and labelMap={} is NOT a second writer for it',
		optionsTrap.length === 0,
		`found=[${ optionsTrap.map( ( f ) => f.attr ).join( ', ' ) }]`
	);

	assertCase(
		'NEGATIVE CONTROL: with no declaredAttrs passed, dispatcher resolution is skipped (legacy callers unchanged)',
		checkSameFileDuplicateAst( 'sgs/dispatch-nodecl', dispatcherDupSrc ).length === 0,
		'the literal RangeControl alone is one writer, so no duplicate'
	);

	// -------------------------------------------------------------------
	// DEFECT 4 — fail-open paths must surface, not stay silent.
	// -------------------------------------------------------------------
	process.stdout.write( '\n  -- defect 4: parse diagnostics (fail-closed) --\n' );

	// Babel RECOVERS from a var redeclaration (reasonCode VarRedeclaration):
	// it returns a usable-looking AST and populates ast.errors, which all
	// three errorRecovery parses previously ignored.
	const RECOVERABLE_SRC =
		'let a = 1; let a = 2;\nexport default function E( { setAttributes } ) { setAttributes( { realAttr: 1 } ); }\n';
	// Unterminated JSX makes Babel THROW even with errorRecovery on.
	const FATAL_SRC = 'export default function E() { return <div><span></div>; }\n';
	const CLEAN_SRC =
		'export default function E( { setAttributes } ) { setAttributes( { realAttr: 1 } ); }\n';

	resetParseDiagnostics();
	const recoveredAst = parseWithRecovery( RECOVERABLE_SRC, 'selftest-recoverable' );
	assertCase(
		'a RECOVERED parse (ast.errors populated) is recorded — errorRecovery no longer hides a partial AST',
		recoveredAst !== null && PARSE_DIAGNOSTICS.length === 1 &&
			/RECOVERED/.test( PARSE_DIAGNOSTICS[ 0 ].reason ),
		`diagnostics=${ PARSE_DIAGNOSTICS.length } reason=${ JSON.stringify( ( PARSE_DIAGNOSTICS[ 0 ] || {} ).reason || null ) }`
	);

	resetParseDiagnostics();
	const fatalAst = parseWithRecovery( FATAL_SRC, 'selftest-fatal' );
	assertCase(
		'a THROWN parse returns null and is recorded (was a bare `catch { return; }`)',
		fatalAst === null && PARSE_DIAGNOSTICS.length === 1 &&
			/parse threw/.test( PARSE_DIAGNOSTICS[ 0 ].reason ),
		`diagnostics=${ PARSE_DIAGNOSTICS.length }`
	);

	resetParseDiagnostics();
	const cleanAst = parseWithRecovery( CLEAN_SRC, 'selftest-clean' );
	assertCase(
		'NEGATIVE CONTROL: a clean parse records NOTHING (the diagnostic is not fired unconditionally)',
		cleanAst !== null && PARSE_DIAGNOSTICS.length === 0,
		`diagnostics=${ PARSE_DIAGNOSTICS.length }`
	);

	// Through the real collector, not just the helper: the collector must both
	// still extract what it can AND report that the file was degraded.
	resetParseDiagnostics();
	const degradedControlled = collectControlledAttrs( [ RECOVERABLE_SRC ], 'sgs/selftest-degraded' );
	// This fixture trips BOTH fail-open paths at once, which is exactly why it
	// is the right fixture: Babel recovers the parse (ast.errors populated),
	// and then traverse() throws a scope error on the duplicate declaration —
	// so the file contributes NO controlled attrs. Under the old code both
	// events were silent and the caller saw an empty set indistinguishable
	// from "this file genuinely controls nothing", which is the mis-report
	// that invents a `hover:shadow` finding. Assert both are now recorded.
	const degradedReasons = PARSE_DIAGNOSTICS.map( ( d ) => d.reason ).join( ' | ' );
	assertCase(
		'collectControlledAttrs on a degraded file reports BOTH degradations (recovered parse + failed traverse); it used to return silently',
		PARSE_DIAGNOSTICS.length === 2 &&
			PARSE_DIAGNOSTICS.every( ( d ) => d.dir === 'sgs/selftest-degraded' ) &&
			/RECOVERED/.test( degradedReasons ) &&
			/traverse failed/.test( degradedReasons ) &&
			degradedControlled.size === 0,
		`diagnostics=${ PARSE_DIAGNOSTICS.length } controlled=[${ [ ...degradedControlled ].join( ', ' ) }]`
	);

	resetParseDiagnostics();
	const cleanControlled = collectControlledAttrs( [ CLEAN_SRC ], 'sgs/selftest-clean' );
	assertCase(
		'NEGATIVE CONTROL: collectControlledAttrs on a clean file finds the attr and reports nothing',
		PARSE_DIAGNOSTICS.length === 0 && cleanControlled.has( 'realAttr' ),
		`diagnostics=${ PARSE_DIAGNOSTICS.length } controlled=[${ [ ...cleanControlled ].join( ', ' ) }]`
	);

	// The gate arithmetic itself: `unparseable` must be able to fail --check
	// independently of findings. This is the line that never reached the exit
	// code before.
	assertCase(
		'--check exits 1 on an unparseable surface even with ZERO net-new findings',
		computeExitCode( true, 0, 1 ) === 1
	);
	assertCase(
		'NEGATIVE CONTROL: --check still exits 0 when both net-new and unparseable are empty',
		computeExitCode( true, 0, 0 ) === 0
	);
	assertCase(
		'NEGATIVE CONTROL: a net-new finding still fails --check (the original gate rule is intact)',
		computeExitCode( true, 1, 0 ) === 1
	);
	assertCase(
		'NEGATIVE CONTROL: without --check, an unparseable surface does NOT fail (diagnostic runs stay exit 0)',
		computeExitCode( false, 0, 1 ) === 0
	);

	// Leave no residue for the (unreachable, but cheap to guarantee) case of
	// a caller running the self-test in-process before main().
	resetParseDiagnostics();

	process.stdout.write(
		`\n[check-duplicate-controls] self-test ${ allOk ? 'PASSED' : 'FAILED' } (${ totalCases } cases).\n`
	);
	process.exit( allOk ? 0 : 1 );
}

if ( process.argv.includes( '--self-test' ) ) {
	runSelfTest();
} else {
	main();
}
