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
 *    src/blocks/extensions/hover-effects.js injects a universal `sgsHover*`
 *    attribute family + "Hover Effects" inspector panel onto EVERY block that
 *    does not declare `supports.sgs.hideExtensions: ["hover", ...]`. Many
 *    blocks ALSO declare their OWN private `*Hover` attrs (e.g. card-grid's
 *    `scaleHover`/`shadowHover`, hero's `backgroundColourHover`) covering the
 *    same semantic ground (scale / shadow / bg-colour / text-colour /
 *    border-colour / image-zoom / grayscale). If the block does not hide the
 *    universal hover extension, the client is looking at TWO systems
 *    nominally responsible for the same visual effect. Two severities:
 *      - 'controlled'   the private attr ALSO has its own edit.js control —
 *                        the client literally sees two knobs for one thing.
 *      - 'shadow'        the private attr is declared + consumed by
 *                        render.php/save.js but has NO editor control of its
 *                        own — it silently sits at its default forever while
 *                        the universal control is the only live one, so the
 *                        private attribute is dead weight that LOOKS load-
 *                        bearing (a hidden duplicate, not a visible one).
 *    Sub-element-scoped private attrs (prefixed cta/tab/link/icon/shape/
 *    overlay/ripple — e.g. hero's `ctaPrimaryHoverBackground`) target a named
 *    CHILD element, not the whole block, so they are NOT the same setting as
 *    the block-wide universal control — reported separately at lower
 *    confidence ('scoped') rather than folded into the primary finding.
 *
 *  CHECK 2 — SAME-ATTR-TWO-CONTROLS (per block, one edit.js):
 *    Two distinct JSX control elements (SelectControl/RangeControl/
 *    ToggleControl/TextControl/ColorPicker/etc., or the house-style
 *    `update('attr', val)` setter) in the SAME block's edit.js both write the
 *    same attribute via setAttributes. AST-parsed (@babel/parser + traverse)
 *    so it is not fooled by nested/duplicated JSX text.
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
 *   node scripts/check-duplicate-controls.js --check             # exit 1 on any net-new finding
 *   node scripts/check-duplicate-controls.js --update-baseline   # accept every current finding, exit 0
 *   node scripts/check-duplicate-controls.js --self-test  # in-memory fixture assertions, no disk access
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
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

// ---------------------------------------------------------------------------
// DRIFT GUARD (2026-08-25) — the table above is HAND-MAINTAINED against a
// second hand-authored system, and it HAD drifted: three categories named
// attrs that do not exist. Two hand-maintained lists diverging silently is a
// failure this codebase has met repeatedly, so the table is now validated
// against its source of truth on every run. A category naming an unregistered
// attr is dropped (yielding no finding, so the gate never advises deleting a
// control in favour of nothing) and reported loudly.
// ---------------------------------------------------------------------------
function readRegisteredUniversalHoverAttrs() {
	// Comment-STRIPPED: reading raw source means a comment such as
	// `// sgsHoverBgColour: RETIRED, do not re-add` re-registers the phantom
	// as if it were a live key, silently un-guarding this guard. That is a
	// completely natural way to phrase a retirement note, so it is not a
	// hypothetical.
	const src = stripComments(
		readIfExists(
			path.join( ROOT, 'src', 'blocks', 'extensions', 'hover-effects.js' )
		)
	);
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

const REGISTERED_UNIVERSAL_HOVER = readRegisteredUniversalHoverAttrs();
const UNIVERSAL_MAP_DRIFT = [];
if ( REGISTERED_UNIVERSAL_HOVER.size > 0 ) {
	for ( const category of Object.keys( UNIVERSAL_HOVER_BY_CATEGORY ) ) {
		const list = UNIVERSAL_HOVER_BY_CATEGORY[ category ];
		const phantom = list.filter( ( a ) => ! REGISTERED_UNIVERSAL_HOVER.has( a ) );
		if ( phantom.length ) {
			UNIVERSAL_MAP_DRIFT.push( `${ category } -> ${ phantom.join( ', ' ) }` );
		}
		UNIVERSAL_HOVER_BY_CATEGORY[ category ] = list.filter( ( a ) =>
			REGISTERED_UNIVERSAL_HOVER.has( a )
		);
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

function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' )
		.replace( /^\s*#[^\n]*/gm, ' ' );
}

/**
 * Collect attribute names written via setAttributes(...) or the house-style
 * update('attr', val) setter anywhere in `src`. Regex-based (mirrors
 * check-dead-controls.js) — used as the CHECK 1 "is this private attr
 * actually controlled" test, since it is robust and never throws.
 *
 * @param {string} src JS source (block's own edit.js + block-local components).
 * @return {Set<string>} Attribute names with a live control.
 */
function collectControlledAttrs( src ) {
	const controlled = new Set();
	if ( ! src ) {
		return controlled;
	}
	const setAttrRe = /setAttributes\(\s*\{\s*([^}]*)\}/g;
	let m;
	while ( ( m = setAttrRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		const keyRe = /(?:^|[\s,])(?:['"]?)([A-Za-z_$][\w$]*)(?:['"]?)\s*:/g;
		let k;
		while ( ( k = keyRe.exec( body ) ) !== null ) {
			controlled.add( k[ 1 ] );
		}
	}
	const updateRe = /\bupdate\(\s*['"]([A-Za-z_$][\w$]*)['"]/g;
	while ( ( m = updateRe.exec( src ) ) !== null ) {
		controlled.add( m[ 1 ] );
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
function collectIndirectControlledAttrs( parts, declaredAttrs ) {
	const out = new Set();
	if ( ! parts || ! parts.length ) {
		return out;
	}
	for ( const src of parts ) {
		collectIndirectFromOneFile( src, declaredAttrs, out );
	}
	return out;
}

function collectIndirectFromOneFile( src, declaredAttrs, out ) {
	if ( ! src ) {
		return;
	}
	let ast;
	try {
		ast = parser.parse( src, {
			sourceType: 'module',
			errorRecovery: true,
			plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
		} );
	} catch ( e ) {
		return;
	}

	// Gate: only blocks that actually contain a COMPUTED-key setAttributes are
	// candidates. Without one there is no dispatcher to be indirect through.
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
	if ( ! hasComputedWrite ) {
		return;
	}

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
			if ( expr.type === 'ObjectExpression' ) {
				for ( const pr of expr.properties ) {
					if ( pr.type === 'ObjectProperty' && pr.value &&
						pr.value.type === 'StringLiteral' ) {
						consider( pr.value.value );
					}
				}
				return;
			}
			if ( expr.type === 'CallExpression' && expr.arguments.length === 1 &&
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
	const ownSrc = loadBlockOwnSrc( blockDir );
	const controlled = collectControlledAttrs( ownSrc );
	// Fold in controls reached through a dispatcher table (e.g. ShadowControl's
	// `attrNames` map) — see collectIndirectControlledAttrs above.
	for ( const a of collectIndirectControlledAttrs(
		OWN_SRC_PARTS.get( blockDir ) || [],
		new Set( Object.keys( attrs ) )
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
			severity: hasOwnControl ? ( scoped ? 'scoped' : 'controlled' ) : ( scoped ? 'scoped-shadow' : 'shadow' ),
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
 * @param {string} blockSlug Block name (e.g. 'sgs/card-grid').
 * @param {string} src       edit.js source (NOT comment-stripped — AST handles comments).
 * @return {Array<Object>} Findings.
 */
function checkSameFileDuplicateAst( blockSlug, src ) {
	const findings = [];
	if ( ! src || ! /setAttributes/.test( src ) ) {
		return findings;
	}

	const ast = parser.parse( src, {
		sourceType: 'module',
		plugins: [
			'jsx',
			'classProperties',
			'objectRestSpread',
			'optionalChaining',
			'nullishCoalescingOperator',
			'dynamicImport',
		],
		errorRecovery: true,
	} );

	// attrName -> Array<{ tag, line, exclusiveGroup }>
	const writers = new Map();

	traverse( ast, {
		JSXOpeningElement( pathNode ) {
			const nameNode = pathNode.node.name;
			const tagName = nameNode && nameNode.type === 'JSXIdentifier' ? nameNode.name : null;
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
			const attrNames = resolveDynamicWrites( fnNode );
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
			severity: 'controlled',
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

function checkParentChildDuplication( blockSlug, blockDir, meta ) {
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
				severity: 'scoped',
				keeper: `child ${ childSlug }'s own typography/colour controls`,
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

function findingKey( f ) {
	return `${ f.check }:${ f.block }:${ f.attr }`;
}

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
			continue;
		}
		const blockSlug = meta.name || path.basename( dir );

		try {
			findings = findings.concat( checkHoverDuplication( blockSlug, dir, meta ) );
		} catch ( e ) {
			unparseable.push( { dir: blockSlug, reason: `hover-duplicate check: ${ e.message }` } );
		}

		try {
			findings = findings.concat( checkParentChildDuplication( blockSlug, dir, meta ) );
		} catch ( e ) {
			unparseable.push( { dir: blockSlug, reason: `parent-child check: ${ e.message }` } );
		}

		const editJsPath = path.join( dir, 'edit.js' );
		if ( fs.existsSync( editJsPath ) ) {
			try {
				const src = fs.readFileSync( editJsPath, 'utf8' );
				findings = findings.concat( checkSameFileDuplicateAst( blockSlug, src ) );
			} catch ( e ) {
				unparseable.push( { dir: blockSlug, reason: `same-file-duplicate (AST): ${ e.message }` } );
			}
		}
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
		fs.writeFileSync( BASELINE_FILE, JSON.stringify( { accepted: merged }, null, 2 ) + '\n' );
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
			process.stdout.write(
				`${ unparseable.length } block(s) could not be fully parsed (skipped, logged — not a failure):\n`
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
						`  SEVERITY: ${ f.severity }\n` +
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
	// real gate: exit 1 when any finding is not already in the baseline.
	process.exit( isCheck && netNew.length > 0 ? 1 : 0 );
}

// ---------------------------------------------------------------------------
// SELF-TEST (--self-test) — no disk access, in-memory fixtures only.
// Exercises checkSameFileDuplicateAst(), the CHECK 2 same-file AST detector,
// directly against synthetic edit.js source strings.
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

	process.stdout.write( `\n[check-duplicate-controls] self-test ${ allOk ? 'PASSED' : 'FAILED' }.\n` );
	process.exit( allOk ? 0 : 1 );
}

if ( process.argv.includes( '--self-test' ) ) {
	runSelfTest();
} else {
	main();
}
