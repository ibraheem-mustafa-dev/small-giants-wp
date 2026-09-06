'use strict';

/**
 * survey-golden-conformance.js — the per-axis conformance census (C1.5).
 *
 * WHAT THIS IS FOR. `golden-controls.json` states what shape a control must
 * have. Rule 31 enforces the colour contract and reports 409 findings. Neither
 * answers the question a migration actually needs: **for each block, which AXES
 * is it conformant on, and which shared file owns the fix?** A flat finding list
 * cannot be sharded — 409 findings across 64 blocks is not a work plan, because
 * one shared-panel row is thirty blocks' problem and one block can be conformant
 * on three axes and broken on a fourth.
 *
 * ⭐ SCHEMA-DRIVEN BY CONSTRUCTION. The axes are read from
 * `golden-controls.json`, never hardcoded here. `_meta.encoded` currently lists
 * only `colour`; when the parallel session adds the other 12 Part O control
 * types, this survey covers them WITHOUT A CODE CHANGE. That is the whole point
 * — the alternative is running this same design process thirteen times.
 *
 * ⛔ IT DOES NOT REIMPLEMENT RULE 31'S ROW RESOLUTION. Rule 31 already resolves
 * a panel's `rows` prop through `.push()`, separately-declared consts, spreads
 * and ternaries — a resolver that cost a real 33-row undercount to get right.
 * Building a second one here would give the repo two answers to the same
 * question with no way to arbitrate, which is the exact failure this session
 * spent the day removing. Row-level axes (state minimum, gradient) are read from
 * rule 31's live output; only the axes rule 31 does not answer are computed here.
 *
 * ⛔ SHARED PANELS ARE IN SCOPE. Component resolution goes through the ONE
 * shared resolver (`../inspector-scan/core/components.js`), which reaches
 * `src/components/`, every per-block `components` directory and
 * `src/blocks/extensions`, and resolves a name to the file that DECLARES it rather than one
 * that merely re-exports it. Rule 31 reads per-block `edit.js` only, so its 409
 * is a FLOOR: it has never opened the four shared wrapper panels that ~30 blocks
 * mount. Any row this survey attributes via a shared panel is invisible to it.
 *
 * ⛔ THIS IS A CENSUS, NOT A GATE. No `--check` mode, no exit code beyond
 * success/failure to run. Putting a non-gating script in the gate chain is
 * enforcement theatre (see the plugin CLAUDE.md note on the survey family).
 *
 * Usage:
 *   node scripts/surveys/survey-golden-conformance.js            # table
 *   node scripts/surveys/survey-golden-conformance.js --json     # machine-readable
 *   node scripts/surveys/survey-golden-conformance.js --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );
const parser = require( '@babel/parser' );
const { resolveComponentFiles } = require( '../inspector-scan/core/components' );
const {
	loadMergedSchema,
	axisIsMeasurable: schemaAxisIsMeasurable,
	MEASURABLE_AXES,
	canonicalComponentNames,
	declaredAxes,
	supportFamilyFromDetectVia,
	mountedComponents,
	reachedComponents,
	MAX_REACH_DEPTH,
} = require( '../inspector-scan/core/golden' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
// GOLDEN_PATH kept for reference/back-compat (some helper may still cite it in
// a message string) — the schema itself is loaded via loadMergedSchema() below,
// which unions golden-controls.json with any of goldens/{styling,input,behaviour}.json
// that have landed (D688, 2026-08-19). Never JSON.parse GOLDEN_PATH directly again.
const GOLDEN_PATH = path.join( PLUGIN_ROOT, 'scripts', 'consistency', 'golden-controls.json' );
const ROSTER_PATH = path.join( PLUGIN_ROOT, 'scripts', 'consistency', 'roster.json' );

const PARSER_OPTIONS = {
	sourceType: 'module',
	plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
};

// Verdict vocabulary. UNCLEAR is load-bearing and must never be collapsed into
// CONFORMANT: a census that cannot tell "done" from "could not tell" is not a
// census (the lesson D571 paid for on migrate-tier-object.py).
const OK = 'CONFORMANT';
const BAD = 'VIOLATION';
const UNCLEAR = 'UNCLEAR';
const NA = 'N/A';
// Split out of the old catch-all N/A (2026-08-19, Bean). "Not eligible" was
// hiding two opposite answers: a block that SHOULD have this control and does
// not, and a block the control cannot apply to. Only the first is work.
const MISSING = 'MISSING';
const NOT_APPLICABLE = 'NOT-APPLICABLE';

// golden-controls.json control-type names vs the raw WP core `support_name`
// build-roster.py's `qualifies.replacedCoreSupports` carries (e.g. schema
// "colour" vs core's own "color"). Only the schema's `encoded` types need an
// entry; an unmapped type falls back to its own name unchanged.
const FAMILY_BY_CONTROL_TYPE = { colour: 'color' };

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

function readFile( p ) {
	try {
		return fs.readFileSync( p, 'utf8' );
	} catch ( e ) {
		return null;
	}
}

function parseSafe( src ) {
	try {
		return parser.parse( src, PARSER_OPTIONS );
	} catch ( e ) {
		return null;
	}
}

// mountedComponents() / reachedComponents() / MAX_REACH_DEPTH — MOVED to
// core/golden.js verbatim (C4 step 1, 2026-08-20) and imported below, so rule
// 31 and this survey share ONE shared-panel reach walk instead of two that
// can silently disagree. All of the depth-4 measurement history (the
// banned-lookalike exclusion interaction, the compare-reach-depth.py plateau,
// the SgsColourPanel runtime-selection blind spot) now lives in that module's
// own header — read it there, not here. This survey's own regression check
// on the move: `--json` output must not shift by a single row.

// ---------------------------------------------------------------------------
// Axes — every one derived from the schema, none hardcoded
// ---------------------------------------------------------------------------

/**
 * Canonical component adoption: does the block reach the schema's panel/row?
 *
 * ⛔ UNREACHED MUST NOT DEFAULT TO BLANKET VIOLATION. That was the bug this
 * axis shipped with: EVERY block that didn't reach the canonical component
 * was reported VIOLATION regardless of whether the control even applies to
 * it. Measured 2026-08-19 for `typography` (26 blocks correctly mount
 * TypographyControls): 67 of 83 blocks came back VIOLATION — a phantom
 * backlog, exactly the Spec 35 §O.16 trap (an ungated scope predicate is
 * self-fulfilling). Fix: when unreached, ask `qualifiesFor()` whether the
 * block SHOULD have this control before deciding the verdict.
 *
 * ⚠ COLOUR IS DELIBERATELY EXCLUDED from the qualifiesFor() fallback below.
 * `survey()` already runs colour through its own pre-gate (search
 * `type === 'colour' && elig ===` further down this file), keyed on
 * roster.json's DESCRIPTIVE `surfaces.colour` flag: elig===false routes to
 * qualifiesFor() there and never reaches this function at all; elig===true
 * only reaches this function when the block roster.json ALREADY says has
 * colour. In that case "reaches none of the canonical components" is a real
 * shape violation (the block paints colour some other way), not an absence —
 * converting it to MISSING would misclassify a genuine bug as a gap. Measured
 * 2026-08-19: routing colour through qualifiesFor() here flips sgs/buybox
 * (which paints 27 own colour declarations) and sgs/site-footer from
 * VIOLATION to MISSING/NOT-APPLICABLE, moving colour's count off its
 * baseline (63 CONFORMANT / 2 VIOLATION / 6 NOT-APPLICABLE / 12 MISSING) —
 * excluded so that split stays byte-identical to before this fix.
 *
 * @param {Object}      spec       golden-controls.json row for this type.
 * @param {Map}         reached    reachedComponents() result for this block.
 * @param {Object|null} qualifyCtx { slug, blockJson, rosterEntry, type } —
 *   omit (or pass type:'colour') to keep the pre-fix blanket-VIOLATION
 *   behaviour; any other type routes an unreached verdict through
 *   qualifiesFor().
 */
function axisCanonical( spec, reached, qualifyCtx ) {
	// Every canonical component the row declares, at any key — NOT just
	// `panel`/`row`. See canonicalComponentNames() in core/golden.js: three
	// finalised types name their components under other keys and were reporting
	// N/A across all 83 blocks as a result.
	const wanted = canonicalComponentNames( spec );
	if ( ! wanted.length ) return { verdict: NA, detail: 'schema declares no canonical component' };

	const hit = wanted.filter( ( w ) => reached.has( w ) );
	if ( ! hit.length ) {
		// ⛔ NO PER-TYPE CARVE-OUT. `colour` used to skip this branch entirely
		// and take a blanket VIOLATION, because routing it through
		// qualifiesFor() flipped sgs/buybox and sgs/site-footer — which paint
		// colour themselves — from VIOLATION to MISSING, understating a real
		// bug as a gap. The carve-out preserved the right answer by the wrong
		// mechanism: it pinned colour to roster.json's `surfaces.colour`, the
		// DERIVED field this repo already records as self-fulfilling (it is
		// computed from what a block ALREADY has, so it can never find a block
		// that is missing one).
		//
		// The distinction the carve-out was protecting is real, so it is now
		// made UNIVERSALLY, from the predicate's own evidence rather than from
		// a block's identity:
		//
		//   basis 'own-paint'  -> the block paints this surface ITSELF and
		//                         offers no canonical control. The styling
		//                         exists and the client cannot reach it. That
		//                         is a VIOLATION, not an absence.
		//   qualifies via an ancestor / feature parity -> the control SHOULD
		//                         exist here and does not: MISSING.
		//   does not qualify   -> NOT-APPLICABLE.
		//
		// Every control type now answers the same question the same way, and
		// `surfaces.colour` is no longer consulted anywhere.
		const q = qualifiesFor( spec, qualifyCtx.slug, qualifyCtx.blockJson, qualifyCtx.rosterEntry, qualifyCtx.type );
		if ( null === q.qualifies ) {
			return { verdict: UNCLEAR, detail: `reaches none of ${ wanted.join( ' / ' ) } — ${ q.why }` };
		}
		if ( q.qualifies ) {
			if ( 'own-paint' === q.basis ) {
				return {
					verdict: BAD,
					detail: `reaches none of ${ wanted.join( ' / ' ) } — but ${ q.why }: styling exists with no client control`,
					home: q.home,
				};
			}
			return {
				verdict: MISSING,
				detail:
					`reaches none of ${ wanted.join( ' / ' ) } — qualifies (${ q.why })` +
					( 'ancestor' === q.home ? ' — control belongs on the ANCESTOR' : '' ),
				home: q.home,
			};
		}
		return { verdict: NOT_APPLICABLE, detail: `reaches none of ${ wanted.join( ' / ' ) } — ${ q.why }` };
	}
	const via = hit.map( ( h ) => reached.get( h ) ).find( Boolean );
	return {
		verdict: OK,
		detail: hit.join( ' + ' ) + ( via ? ` (via ${ path.basename( via ) })` : '' ),
		sharedOwner: via || null,
	};
}

/**
 * Banned lookalike primitives — a regression guard, expected at zero.
 *
 * ⛔ AXIS SCOPE IS NOT UNIFORM, and getting it wrong here produced five false
 * positives on the first run (hero, mega-panel, multi-button, pricing-table,
 * trust-bar). The canonical row component LEGITIMATELY wraps the raw primitive:
 * `<ColorPalette>` lives inside `DesignTokenPicker.js` (:250, :483) and
 * `GradientCapableColourControl.js` (:107). What the schema bans is a block
 * mounting the raw primitive DIRECTLY, bypassing the token palette — reaching it
 * THROUGH the canonical picker is the conformant shape.
 *
 * So this axis must NOT follow the shared-component hop into a canonical
 * component, even though `canonical` adoption depends on exactly that hop. Two
 * axes, two scopes, same corpus. Any future control type added to the schema
 * needs this question asked again: does this axis want the block's own JSX, the
 * one-hop view, or the one-hop view minus the canonical components?
 */
function axisBannedLookalikes( spec, reached, canonicalFiles ) {
	const banned = new Set( ( spec.bannedLookalikes && spec.bannedLookalikes.jsxComponents ) || [] );
	if ( ! banned.size ) return { verdict: NA, detail: 'schema declares none' };
	// EXACT identifier match via Set membership, never substring — the schema's
	// own matchRule: `MyColorPaletteButton` must not flag.
	const found = [ ...reached.entries() ]
		.filter( ( [ n, owner ] ) => banned.has( n ) && ! ( owner && canonicalFiles.has( owner ) ) )
		.map( ( [ n ] ) => n );
	return found.length
		? { verdict: BAD, detail: `banned, mounted outside a canonical component: ${ found.join( ', ' ) }` }
		: { verdict: OK, detail: 'none' };
}

/**
 * Core-native UI competing with the SGS panel.
 *
 * The schema states `detectVia: "block.json supports.color — any sub-flag set
 * true"` and `conformantShape: declared with every sub-flag false`. ⛔
 * `__experimentalSkipSerialization` is NOT a UI flag — it is the serialisation
 * opt-out and is REQUIRED by the conformant shape, so counting it inverts the
 * answer. Measured 2026-08-19: including it reports 50 blocks; excluding it
 * reports 26, which reproduces the schema's own independently-dated figure.
 */
/**
 * Which `supports.*` key makes WordPress CORE render its own competing UI.
 *
 * ⛔ READ FROM THE SCHEMA, NEVER HARDCODED. This axis previously checked
 * `supports.color` for EVERY control type, because it was written when the
 * schema encoded colour alone. The moment the other 13 types landed it reported
 * 350 violations — 25 blocks x 14 types — the same colour answer repeated under
 * thirteen wrong headings. The engine is only generic if it reads the predicate.
 *
 * Only 4 types declare a detectVia today (colour -> supports.color, length-unit
 * and box-4value -> supports.spacing, typography -> supports.typography). The
 * rest have no native competitor and correctly report N/A.
 */
function nativeUiSupportKey( spec ) {
	const via = spec.nativeUi && spec.nativeUi.detectVia;
	if ( ! via || 'string' !== typeof via ) return null;
	// ⛔ The leading `_` is REQUIRED in this character class. WordPress ships
	// real support families under `__experimental*` names, and the previous
	// pattern `[A-Za-z][A-Za-z0-9]*` could not match one — so `border`, whose
	// row DOES declare `detectVia: block.json supports.__experimentalBorder`,
	// silently resolved to null and reported N/A across all 83 blocks. A
	// declared predicate that the engine cannot read is the worst shape a
	// detector can take: it looks like "this type has no native competitor"
	// and is indistinguishable from a clean result. Session A's own handover
	// records 52 blocks with `supports.__experimentalBorder` sub-flags TRUE —
	// none of which this axis could see. Covered by the selfTest fixture
	// 'an __experimental support family is readable, not silently N/A'.
	return supportFamilyFromDetectVia( via );
}

/**
 * Sub-flags that make core paint. "Any sub-flag set true" is the schema's own
 * wording, so this is generic across families rather than a per-family list.
 *
 * ⛔ `__experimental*` keys are EXCLUDED. They are serialisation opt-outs, not
 * UI switches — `__experimentalSkipSerialization` is REQUIRED by the conformant
 * shape. Counting it reported 50 blocks against a true 25, a mistake made
 * independently by two sessions before it was caught by re-reading the schema.
 */
function liveNativeFlags( supportValue ) {
	if ( true === supportValue ) return [ '(enabled)' ];
	if ( ! supportValue || 'object' !== typeof supportValue ) return [];
	return Object.keys( supportValue ).filter(
		( k ) => true === supportValue[ k ] && ! k.startsWith( '__' ) && 'enabled' !== k
	);
}

function axisNativeUi( spec, blockJson, reached ) {
	const key = nativeUiSupportKey( spec );
	if ( ! key ) return { verdict: NA, detail: 'schema declares no native-UI competitor for this control type' };

	const supports = ( blockJson || {} ).supports || {};
	if ( ! ( key in supports ) ) return { verdict: OK, detail: `does not declare supports.${ key }` };

	const live = liveNativeFlags( supports[ key ] );
	if ( ! live.length ) return { verdict: OK, detail: `supports.${ key } declared, every UI flag false` };

	const panel = ( ( spec.canonical || {} ).panel || {} ).component;
	const doublePainted = panel && reached.has( panel );
	return {
		verdict: BAD,
		detail: `core renders its own UI (supports.${ key }: ${ live.join( ',' ) })` +
			( doublePainted ? ' — DOUBLE-PAINTED alongside ours' : ' — CORE-ONLY, no SGS panel' ),
		kind: doublePainted ? 'double-painted' : 'core-only',
	};
}

/** Hover emission mechanism — the C1 axis, read from render.php. */
function axisHoverMechanism( slug ) {
	const render = readFile( path.join( BLOCKS_DIR, slug, 'render.php' ) );
	if ( render === null ) return { verdict: NA, detail: 'no render.php' };
	if ( /sgs_emit_state_colour_css/.test( render ) ) return { verdict: OK, detail: 'HELPER' };
	// A hover-colour custom property read back by a static stylesheet is the
	// pre-2026-08-19 scheme the shared helper replaced.
	if ( /--sgs-hover-(bg|text|border)/.test( render ) ) return { verdict: BAD, detail: 'VAR (pre-helper scheme)' };
	if ( slug === 'button' ) return { verdict: NA, detail: 'EXEMPT (D677b — preset cascade)' };
	if ( /:hover/.test( render ) ) return { verdict: UNCLEAR, detail: 'emits :hover by some other route — read it' };
	return { verdict: NA, detail: 'emits no hover' };
}

// ---------------------------------------------------------------------------
// Survey
// ---------------------------------------------------------------------------

/**
 * Absolute paths of the schema's own canonical components. A banned primitive
 * reached through one of these is the CONFORMANT shape, not a violation.
 */
/**
 * Rule 31's live findings, grouped by block slug, for the axes that are
 * ROW-LEVEL rather than block-level.
 *
 * ⛔ THIS SURVEY MUST NOT RE-RESOLVE ROWS. Rule 31 already walks a panel's
 * `rows` prop through .push(), separately-declared consts, spreads and
 * ternaries — a resolver that cost a real 33-row undercount to get right. This
 * file's own header forbids building a second one, because two resolvers give
 * the repo two answers to one question with no way to arbitrate. So the
 * gradient axis CONSUMES rule 31 instead of re-deriving it.
 *
 * ⚠ The header claimed this integration already existed ("Row-level axes
 * (state minimum, gradient) are read from rule 31's live output"). It did not —
 * measured 2026-08-20, the survey referenced rule 31 nowhere. Aspiration
 * written as fact; now actually built.
 *
 * @return {Map<string, {gradient: number}>|null} Per-slug counts, or null when
 *   rule 31 could not be run (the axis then reports UNCLEAR, never a false pass).
 */
function ruleThirtyOneFindings() {
	try {
		const out = require( 'child_process' ).execFileSync(
			process.execPath,
			[ path.join( PLUGIN_ROOT, 'scripts', 'inspector-scan', 'run.js' ), '--json' ],
			{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
		);
		const parsed = JSON.parse( out );
		const rule = ( parsed.rules || [] ).find( ( r ) => String( r.id || '' ).startsWith( '31' ) );
		if ( ! rule ) return null;
		const bySlug = new Map();
		for ( const f of rule.findings || [] ) {
			// FLAGGED only — core/report.js serialises BASELINED findings into the
			// same array, and counting them over-reports (rule 21 reads 208 by
			// array length against a true 197).
			if ( f.status && f.status !== 'FLAGGED' ) continue;
			const slug = String( f.block || '' ).replace( /^sgs\//, '' );
			if ( ! slug ) continue;
			const rec = bySlug.get( slug ) || { gradient: 0 };
			if ( /no gradient path/.test( f.detail || '' ) ) rec.gradient += 1;
			bySlug.set( slug, rec );
		}
		return bySlug;
	} catch ( e ) {
		return null;
	}
}

/**
 * GRADIENT axis — every colour row must offer a gradient path unless the block
 * declares an exemption with a real reason (golden-controls.json
 * `controls.colour.gradient.required`, Bean ruling 2026-08-19).
 *
 * Block-level verdict derived from rule 31's row-level findings: a block with
 * one or more unmet gradient rows VIOLATES; a block with none CONFORMS.
 *
 * @param {Object}   spec     The control-type row.
 * @param {Object}   ctx      { slug, ruleFindings }.
 * @return {{verdict: string, detail: string}} Axis verdict.
 */
function axisGradient( spec, ctx ) {
	if ( ! spec.gradient ) return { verdict: NA, detail: 'schema declares no gradient contract' };
	if ( ! ctx || ! ctx.ruleFindings ) {
		return { verdict: UNCLEAR, detail: 'rule 31 could not be run — gradient rows not counted' };
	}
	const rec = ctx.ruleFindings.get( ctx.slug );
	const n = rec ? rec.gradient : 0;
	return n > 0
		? { verdict: BAD, detail: `${ n } colour row(s) offer no gradient path and declare no exemption` }
		: { verdict: OK, detail: 'every colour row offers a gradient path or a declared exemption' };
}

function canonicalFiles( spec, compFiles ) {
	const out = new Set();
	const c = spec.canonical || {};
	for ( const key of Object.keys( c ) ) {
		const name = c[ key ] && c[ key ].component;
		if ( ! name ) continue;
		const f = compFiles.get( name );
		if ( f ) out.add( f );
	}
	return out;
}

/**
 * The schema's own scope predicate, honoured rather than ignored.
 *
 * `golden-controls.json` `controls.colour.scope.eligible` reads "roster.json
 * blocks where surfaces.colour === true" — 65 of 83. Applying a colour axis to
 * the other 18 reports a block with no colour surface at all as a VIOLATION,
 * which inflates the backlog with work that does not exist. The first run of
 * this survey did exactly that: 21 canonical "violations" across all 83.
 *
 * ⛔ A block ABSENT from roster.json gets `surfaces: null`, and the schema's
 * nullSurfacesRule is explicit that null means UNKNOWN, NOT CLEAN. Treating it
 * as ineligible would silently drop it, so it is reported UNCLEAR instead.
 */
/**
 * The block whose stylesheet paints THIS block's rendered classes, if any.
 *
 * Keyed on classes emitted by render.php, cross-referenced against every OTHER
 * block's style.css — the same "detect by what it does" discipline used
 * throughout the inspector tooling.
 */
let SHEETS = null;
function ancestorPainter( slug ) {
	if ( ! SHEETS ) {
		SHEETS = new Map();
		for ( const dir of fs.readdirSync( BLOCKS_DIR, { withFileTypes: true } ) ) {
			if ( ! dir.isDirectory() ) continue;
			const css = readFile( path.join( BLOCKS_DIR, dir.name, 'style.css' ) );
			if ( css ) SHEETS.set( dir.name, css );
		}
	}
	const render = readFile( path.join( BLOCKS_DIR, slug, 'render.php' ) );
	if ( ! render ) return null;
	const classes = [ ...new Set( render.match( /sgs-[a-z0-9-]+__[a-z0-9-]+/g ) || [] ) ];
	if ( ! classes.length ) return null;

	for ( const [ other, css ] of SHEETS ) {
		if ( other === slug ) continue;
		for ( const c of classes ) {
			const at = css.indexOf( c );
			if ( at === -1 ) continue;
			const rule = css.slice( at, at + 400 ).split( '}' )[ 0 ];
			if ( /(background(-color)?|border-color|[^-\w]color)\s*:/.test( rule ) ) return other;
		}
	}
	return null;
}

/**
 * The "own paint" CSS-property regex for a `qualifiesWhen.paintsOwnSurface`
 * declaration.
 *
 * ⛔ SCHEMA-DRIVEN, NOT COLOUR-HARDCODED. This function used to be an inline
 * colour-only pattern (`background(-color)?|border-color|[^-\w]color`)
 * applied to EVERY control type's `paintsOwnSurface` check — so a non-colour
 * type (e.g. `typography`, whose evidence is `font-size|font-weight|
 * line-height`) could declare `qualifiesWhen.paintsOwnSurface` and never once
 * have it actually detected, because the regex only ever looked for colour
 * properties. Fix: read the property list from the schema row itself
 * (`qualifiesWhen.paintsOwnSurface.cssProperties`, an array of bare CSS
 * property names, e.g. `[ "font-size", "font-weight", "line-height" ]`) and
 * build the regex from THAT.
 *
 * ⚠ FALLBACK REPRODUCES COLOUR'S REGEX BYTE-FOR-BYTE. A schema row with no
 * `cssProperties` array (colour's own row today — out of scope for this
 * session to edit) must measure IDENTICALLY to before this function existed,
 * so the fallback is a verbatim copy of the original pattern, not a
 * re-derivation of it.
 *
 * @param {Object} when `qualifiesWhen` object from the schema row.
 * @return {RegExp} a fresh `g`-flagged regex (never reused across `.match()`
 *   calls — a shared `g` regex carries `lastIndex` state between calls).
 */
function ownPaintRegex( when ) {
	const props =
		when && when.paintsOwnSurface && Array.isArray( when.paintsOwnSurface.cssProperties )
			? when.paintsOwnSurface.cssProperties.filter( Boolean )
			: null;
	if ( ! props || ! props.length ) {
		// Colour's original hardcoded pattern, unchanged.
		return /(?:background(?:-color)?|border-color|[^-\w]color)\s*:/g;
	}
	const escaped = props
		.map( ( p ) => String( p ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) )
		// Longest alternative first. Alternation is leftmost-first, so `background`
		// listed ahead of `background-color` matches, then fails on the `\s*:` and
		// has to backtrack. JS backtracks correctly, so this is not a correctness
		// fix — it makes the ordering a non-question rather than something the next
		// reader has to re-derive from first principles.
		.sort( ( a, b ) => b.length - a.length );
	// ⛔ THE LOOKBEHIND IS LOAD-BEARING, NOT COSMETIC. `(?<![-\w])` reproduces the
	// fallback pattern's `[^-\w]` guard WITHOUT consuming a character. Drop it and a
	// bare `color` alternative also matches inside `--brand-color:` and
	// `-webkit-text-fill-color:`, silently inflating every count derived from this
	// regex. That matters more here than a boolean would: qualifiesFor() reads the
	// MATCH COUNT ( `m.length` ), not a truthiness, and prints it into the survey's
	// `why` string — so a semantic change is visible in the JSON and is caught by
	// the byte-identical gate rather than passing quietly.
	//
	// A lookbehind also fixes a latent edge the consuming class has: `[^-\w]` cannot
	// match at byte 0 of a file for want of a preceding character, so a stylesheet
	// opening literally with `color:` was invisible to the fallback.
	return new RegExp( `(?<![-\\w])(?:${ escaped.join( '|' ) })\\s*:`, 'g' );
}

/**
 * Does this block QUALIFY for a control type — should it have one?
 *
 * ⛔ THIS IS NOT `surfaces.colour`, AND THAT IS THE WHOLE POINT.
 * build-roster.py:106 computes `colour = "color" in supports or attr_hit(
 * "colour","color")` — DESCRIPTIVE, true exactly when the block ALREADY has
 * colour. Used as a scope predicate it is SELF-FULFILLING: a block with no
 * colour is excluded from the contract and can never be reported as MISSING
 * one. Only blocks that have some colour and got the shape wrong are visible.
 *
 * ⭐ THE ENGINE IS GENERIC; THE PREDICATE IS PER FAMILY. The evidence differs
 * by control type — colour qualifies on painted surfaces, typography on
 * rendered text, spacing on a box element, layout on multiple children, link on
 * an <a> or URL attribute. Each type declares its own `qualifiesWhen` in
 * golden-controls.json rather than this function growing a branch per family.
 *
 * ⚠ QUALIFYING DOES NOT ALWAYS MEAN THE CONTROL BELONGS HERE. Measured
 * 2026-08-19: every sgs/form-field-* declares 4 elements (label/input/help/
 * error) and paints ZERO of them, while sgs/form paints all 52. Those blocks
 * qualify COLLECTIVELY and the control's home is the ancestor, with children
 * inheriting (the group-default pattern sgs/multi-button proves at D640). A
 * predicate reading only the block's own stylesheet would wrongly report 13
 * form blocks NOT-APPLICABLE.
 *
 * @return {{qualifies:boolean, why:string, home:string}} home is 'self' or
 *   'ancestor'.
 */
function qualifiesFor( spec, slug, blockJson, rosterEntry, type ) {
	const when = spec.qualifiesWhen;
	if ( ! when ) return { qualifies: true, why: 'no qualifiesWhen declared — assume in scope', home: 'self', basis: 'no-predicate' };

	// (1) paints its own surface
	let ownPaint = 0;
	if ( when.paintsOwnSurface ) {
		const css = readFile( path.join( BLOCKS_DIR, slug, 'style.css' ) );
		if ( css ) {
			const m = css.match( ownPaintRegex( when ) );
			ownPaint = m ? m.length : 0;
		}
	}
	// basis:'own-paint' is load-bearing — see axisCanonical(). A block that
	// paints this surface ITSELF and reaches no canonical control is not
	// MISSING a control, it is VIOLATING the contract: the styling exists and
	// the client cannot reach it.
	if ( ownPaint > 0 ) return { qualifies: true, why: `paints ${ ownPaint } own declaration(s)`, home: 'self', basis: 'own-paint' };

	// (1b) WordPress CORE paints this surface for the block, because the block
	// declares the family with a live sub-flag. The surface demonstrably
	// applies — it is simply delivered by core's UI instead of the canonical
	// SGS control, which is the definition of MISSING, not NOT-APPLICABLE.
	//
	// Measured 2026-08-20: without this branch sgs/site-footer read
	// NOT-APPLICABLE for colour. Its own style.css is 473 bytes and paints
	// almost nothing, so the own-paint test found nothing — yet the block is
	// one of the 25 blocks the nativeUi axis reports as letting core render
	// its own colour panel. "This block has no colour surface" was flatly
	// false. Schema-driven via the same detectVia the nativeUi axis reads, so
	// it generalises to every type that declares one, with no per-type branch.
	const nativeKey = nativeUiSupportKey( spec );
	if ( nativeKey && blockJson && blockJson.supports && nativeKey in blockJson.supports ) {
		const live = liveNativeFlags( blockJson.supports[ nativeKey ] );
		if ( live.length ) {
			return {
				qualifies: true,
				why: `declares supports.${ nativeKey } with live sub-flag(s) ${ live.join( ', ' ) } — core paints it`,
				home: 'self',
				basis: 'native-supports',
			};
		}
	}

	// (2) an ancestor paints THIS block's own rendered classes.
	//
	// ⛔ Keyed on the BEM classes render.php actually EMITS, never on declared
	// element NAMES. The first version counted declared elements and qualified
	// 17 blocks — including sgs/decorative-image, because it declares an element
	// called "image". Element names like label/input/image are generic BEM parts
	// that recur across the library, so matching them found a painter for
	// everything. Measured with rendered classes instead: form-field-* and
	// form-review are painted by sgs/form (`.sgs-form-field__input` appears in
	// form/style.css 36 times); decorative-image, image-sequence, mega-group and
	// responsive-logo are painted by NOBODY.
	if ( when.paintedByAncestor ) {
		const painter = ancestorPainter( slug );
		if ( painter ) {
			return {
				qualifies: true,
				why: `its rendered classes are painted by sgs/${ painter }`,
				home: 'ancestor',
				basis: 'ancestor-paint',
			};
		}
	}

	// (3) feature parity — now a real verdict, read from `roster.json`'s
	// `qualifies.replacedCoreSupports` (build-roster.py, Spec 35).
	//
	// ⚠ A `replaces` entry says which core block this one supersedes; it does
	// NOT say the core block has this control family. sgs/responsive-logo
	// replaces core/site-logo, which core/site-logo's OWN `color` support
	// declares `enabled:true` but every UI sub-flag (background/text/link/
	// gradients/button/heading) false or null — no colour UI at all. Treating
	// `enabled:true` alone as a positive signal wrongly reported responsive-logo
	// MISSING a colour panel. `replacedCoreSupports` already applied
	// build-roster.py's `support_enabled()` rule (the same sub-flag test), so
	// this branch only has to ask "is `color` (or `type`'s family name) in the
	// list build-roster.py already computed" — never re-derive it here.
	if ( when.featureParity && rosterEntry && rosterEntry.replaces ) {
		const qualifiesData = rosterEntry.qualifies;
		if ( ! qualifiesData || ! Array.isArray( qualifiesData.replacedCoreSupports ) ) {
			// roster.json predates the `qualifies` key (stale regen) — same
			// honest fallback as before rather than a false positive/negative.
			return {
				qualifies: null,
				why: `replaces ${ JSON.stringify( rosterEntry.replaces ) } — roster.json has no qualifies.replacedCoreSupports; regenerate build-roster.py`,
				home: 'self',
				basis: 'feature-parity',
			};
		}
		// The schema's control-type name (e.g. "colour") vs the raw WP core
		// support family name (e.g. "color") differ; only "colour" is encoded
		// today (golden-controls.json `_meta.encoded`), mapped explicitly rather
		// than assumed 1:1 with future control types.
		const coreFamily = FAMILY_BY_CONTROL_TYPE[ type ] || type;
		const enables = qualifiesData.replacedCoreSupports.includes( coreFamily );
		return enables
			? {
				qualifies: true,
				why: `replaces ${ JSON.stringify( rosterEntry.replaces ) }, which enables core \`${ coreFamily }\` UI`,
				home: 'self',
				basis: 'feature-parity',
			}
			: {
				qualifies: false,
				why: `replaces ${ JSON.stringify( rosterEntry.replaces ) }, which does NOT enable core \`${ coreFamily }\` UI`,
				home: 'self',
				basis: 'feature-parity',
			};
	}

	return { qualifies: false, why: 'paints nothing, and nothing paints its rendered classes', home: 'self', basis: 'none' };
}

// colourEligibility() DELETED 2026-08-20 (Decision B). It read roster.json's
// DERIVED `surfaces.colour` flag, which is computed from what a block ALREADY
// has and is therefore self-fulfilling as a scope predicate — it excluded
// exactly the blocks that were missing a colour panel. Every type, colour
// included, now scopes through qualifiesFor()'s evidence instead.

function blockSlugs() {
	return fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( e ) => e.isDirectory() && e.name !== 'extensions' )
		.map( ( e ) => e.name )
		.filter( ( s ) => fs.existsSync( path.join( BLOCKS_DIR, s, 'block.json' ) ) )
		.sort();
}

function survey() {
	const golden = loadMergedSchema();
	const encoded = ( golden._meta && golden._meta.encoded ) || Object.keys( golden.controls || {} );
	const compFiles = resolveComponentFiles();
	// One rule-31 run per census, shared by every row-level axis.
	const ruleFindings = ruleThirtyOneFindings();
	const rosterBySlug = new Map();
	try {
		for ( const e of JSON.parse( fs.readFileSync( ROSTER_PATH, 'utf8' ) ).blocks || [] ) {
			rosterBySlug.set( String( e.slug || '' ).replace( /^sgs\//, '' ), e );
		}
	} catch ( e ) { /* absent roster is reported by the universal roster-presence gate below */ }
	const rows = [];

	for ( const slug of blockSlugs() ) {
		const editAst = parseSafe( readFile( path.join( BLOCKS_DIR, slug, 'edit.js' ) ) || '' );
		let blockJson = null;
		try {
			blockJson = JSON.parse( readFile( path.join( BLOCKS_DIR, slug, 'block.json' ) ) || '{}' );
		} catch ( e ) {
			blockJson = null;
		}
		const reached = reachedComponents( editAst, compFiles );

		for ( const type of encoded ) {
			const spec = ( golden.controls || {} )[ type ];
			if ( ! spec ) continue;
			// UNIVERSAL roster-presence gate. A block absent from roster.json is
			// UNKNOWN, not clean — previously this honesty was given to `colour`
			// alone; every type gets it now. (Today roster/disk/union all
			// reconcile at 83, so this fires for nothing — it is a tripwire, not
			// a live branch.)
			if ( ! rosterBySlug.has( slug ) ) {
				rows.push( {
					block: `sgs/${ slug }`,
					type,
					axes: { canonical: { verdict: UNCLEAR, detail: 'absent from roster.json — UNKNOWN, not clean' } },
				} );
				continue;
			}

			// Run only the axes THIS TYPE DECLARES (core/golden.js declaredAxes).
			// A declared axis with no evaluator built is reported as OWED, never
			// omitted — the old fixed axis list collapsed "does not apply",
			// "nothing measured it" and "not built yet" into one silent N/A.
			const evaluators = {
				canonical: () => axisCanonical( spec, reached, { slug, blockJson, rosterEntry: rosterBySlug.get( slug ), type } ),
				bannedLookalikes: () => axisBannedLookalikes( spec, reached, canonicalFiles( spec, compFiles ) ),
				nativeUi: () => axisNativeUi( spec, blockJson, reached ),
				hoverMechanism: () => axisHoverMechanism( slug ),
				gradient: () => axisGradient( spec, { slug, ruleFindings } ),
			};
			const axes = {};
			for ( const axis of declaredAxes( spec ) ) {
				axes[ axis ] = evaluators[ axis ]
					? evaluators[ axis ]()
					: { verdict: UNCLEAR, detail: 'axis DECLARED by the contract but no evaluator built', owed: true };
			}

			rows.push( { block: `sgs/${ slug }`, type, axes } );
		}
	}
	// schemaControls + capabilityLoss travel with the result so the report can
	// distinguish "this axis does not apply" from "nothing measured it", and
	// name any axis a peer row deleted. Without them a reader has only a column
	// of N/A, which looks like coverage.
	return {
		encoded,
		rows,
		schemaControls: golden.controls || {},
		capabilityLoss: ( golden._meta && golden._meta.capabilityLoss ) || [],
	};
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report( result ) {
	const AXES = [ 'canonical', 'nativeUi', 'bannedLookalikes', 'hoverMechanism', 'gradient' ];
	console.log( '' );
	console.log( 'GOLDEN CONFORMANCE SURVEY — per block, per axis' );
	console.log( `control types encoded in golden-controls.json: ${ result.encoded.join( ', ' ) }` );
	console.log( '='.repeat( 100 ) );
	console.log( 'block'.padEnd( 28 ) + AXES.map( ( a ) => a.slice( 0, 15 ).padEnd( 17 ) ).join( '' ) );
	console.log( '-'.repeat( 100 ) );

	const tally = {};
	for ( const r of result.rows ) {
		const cells = AXES.map( ( a ) => {
			const v = r.axes[ a ] ? r.axes[ a ].verdict : NA;
			tally[ a ] = tally[ a ] || {};
			tally[ a ][ v ] = ( tally[ a ][ v ] || 0 ) + 1;
			return v.padEnd( 17 );
		} );
		console.log( r.block.padEnd( 28 ) + cells.join( '' ) );
	}

	console.log( '' );
	console.log( 'TOTALS' );
	for ( const a of AXES ) {
		const t = tally[ a ] || {};
		console.log(
			'  ' + a.padEnd( 20 ) +
			Object.keys( t ).sort().map( ( k ) => `${ k }=${ t[ k ] }` ).join( '  ' )
		);
	}

	// Shared-panel attribution: one edit, many blocks. Reported separately so a
	// shared fix is never dispatched as N per-block edits.
	const owners = new Map();
	for ( const r of result.rows ) {
		const o = r.axes.canonical && r.axes.canonical.sharedOwner;
		if ( ! o ) continue;
		owners.set( o, ( owners.get( o ) || 0 ) + 1 );
	}
	if ( owners.size ) {
		console.log( '' );
		console.log( 'REACHED VIA A SHARED FILE (fix once there, not once per block):' );
		for ( const [ file, n ] of [ ...owners ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] ) ) {
			console.log( `  ${ String( n ).padStart( 3 ) } block(s)  ${ path.relative( PLUGIN_ROOT, file ) }` );
		}
	}

	// ── MEASURABILITY ────────────────────────────────────────────────────────
	// A column of N/A has two completely different meanings and the totals
	// above cannot tell them apart: "this axis genuinely does not apply to this
	// type" versus "this type's row never declared the field the engine reads,
	// so nothing was measured". Reporting the second as N/A is a false
	// absence — it reads exactly like a clean, fully-covered result. This
	// section states, per type, which axes the census could actually evaluate.
	console.log( '' );
	console.log( 'MEASURABILITY — which axes each control type can be scored on' );
	console.log( '  (UNMEASURED = the row declares no field for that axis; NOT a clean result)' );
	const MEASURED_AXES = MEASURABLE_AXES; // one list, imported — never a second copy that can drift
	const unmeasured = [];
	for ( const type of result.encoded ) {
		const spec = ( result.schemaControls || {} )[ type ] || {};
		const cells = MEASURED_AXES.map( ( a ) => {
			const can = schemaAxisIsMeasurable( spec, a );
			if ( ! can ) unmeasured.push( `${ type }.${ a }` );
			return ( can ? 'measured' : 'UNMEASURED' ).padEnd( 13 );
		} );
		console.log( '  ' + type.padEnd( 22 ) + cells.join( '' ) );
	}
	console.log(
		`  ${ result.encoded.length } type(s) x ${ MEASURED_AXES.length } axes = ` +
		`${ result.encoded.length * MEASURED_AXES.length } cells, ` +
		`${ unmeasured.length } UNMEASURED`
	);

	// Capability the merge DELETED: a finalised peer row replacing a base row
	// that declared an axis the peer does not. Loud, because the symptom is a
	// column of N/A that looks like coverage.
	const loss = result.capabilityLoss || [];
	if ( loss.length ) {
		console.log( '' );
		console.log( 'CAPABILITY LOST IN THE MERGE — a peer row dropped an axis its base row declared:' );
		for ( const l of loss ) {
			console.log( `  ${ l.type }.${ l.axis }  ${ l.from } -> ${ l.to }` );
		}
		console.log( '  Each is either a deliberate finalisation or an accidental deletion.' );
		console.log( '  It cannot be told apart from a genuine N/A downstream — decide it here.' );
	}
	console.log( '' );
}

// ---------------------------------------------------------------------------
// Self-test — every assertion is a claim this survey would otherwise make
// silently. The native-UI flag set is the one that has already been measured
// wrong once (by me, this session), so it gets both directions.
// ---------------------------------------------------------------------------

function selfTest() {
	let ok = true;
	const check = ( name, actual, expected ) => {
		const pass = JSON.stringify( actual ) === JSON.stringify( expected );
		if ( ! pass ) ok = false;
		console.log( `  [${ pass ? 'OK' : 'FAIL' }] ${ name }` );
		if ( ! pass ) console.log( `         got ${ JSON.stringify( actual ) }, expected ${ JSON.stringify( expected ) }` );
	};

	// detectVia is what makes this axis apply at all — a type without one has no
	// native competitor. Supplying it here keeps the fixtures honest about the
	// contract rather than the old hardcoded-supports.color behaviour.
	const spec = {
		nativeUi: { detectVia: 'block.json supports.color — any sub-flag set true' },
		canonical: { panel: { component: 'SgsColourPanel' } },
	};

	// NEGATIVE CONTROL for the trap I actually hit: __experimentalSkipSerialization
	// is REQUIRED by the conformant shape. Counting it as a UI flag reports 50
	// blocks instead of 26 and inverts the verdict.
	check(
		'skipSerialization alone is CONFORMANT, not native UI',
		axisNativeUi( spec, { supports: { color: { __experimentalSkipSerialization: true } } }, new Map() ).verdict,
		OK
	);
	check(
		'a real UI flag is a VIOLATION',
		axisNativeUi( spec, { supports: { color: { gradients: true } } }, new Map() ).verdict,
		BAD
	);
	check(
		'core UI + our panel is reported as double-painted',
		axisNativeUi( spec, { supports: { color: { text: true } } }, new Map( [ [ 'SgsColourPanel', null ] ] ) ).kind,
		'double-painted'
	);
	check(
		'core UI without our panel is reported as core-only',
		axisNativeUi( spec, { supports: { color: { text: true } } }, new Map() ).kind,
		'core-only'
	);
	check(
		'no supports.color at all is CONFORMANT',
		axisNativeUi( spec, { supports: {} }, new Map() ).verdict,
		OK
	);

	// Banned lookalikes match by EXACT identifier, never substring.
	const bspec = { bannedLookalikes: { jsxComponents: [ 'ColorPalette' ] } };
	check(
		'exact banned identifier flags',
		axisBannedLookalikes( bspec, new Map( [ [ 'ColorPalette', null ] ] ), new Set() ).verdict,
		BAD
	);
	check(
		'a name CONTAINING a banned identifier does not flag',
		axisBannedLookalikes( bspec, new Map( [ [ 'MyColorPaletteButton', null ] ] ), new Set() ).verdict,
		OK
	);
	// The five-false-positive case, pinned in both directions.
	check(
		'banned primitive reached THROUGH a canonical component is CONFORMANT',
		axisBannedLookalikes(
			bspec,
			new Map( [ [ 'ColorPalette', '/x/DesignTokenPicker.js' ] ] ),
			new Set( [ '/x/DesignTokenPicker.js' ] )
		).verdict,
		OK
	);
	check(
		'the same primitive mounted DIRECTLY by the block still flags',
		axisBannedLookalikes(
			bspec,
			new Map( [ [ 'ColorPalette', null ] ] ),
			new Set( [ '/x/DesignTokenPicker.js' ] )
		).verdict,
		BAD
	);

	// ── reachedComponents() depth fix (2026-08-20), pinned against REAL files ──
	// The unit tests above prove the exclusion logic in isolation with synthetic
	// maps; they cannot catch a `reachedComponents()` regression that stops
	// finding the primitive at all. This pins the actual multi-hop chain on
	// disk: `accordion/edit.js` -> `ContainerWrapperControls` (re-export
	// facade) -> `BackgroundPanel` -> `GradientOverlayControl` ->
	// `DesignTokenPicker` -> `ColorPalette` — five real files, verified by
	// direct reading before this test was written, not invented.
	{
		const realCompFiles = resolveComponentFiles();
		const accordionAst = parseSafe(
			readFile( path.join( BLOCKS_DIR, 'accordion', 'edit.js' ) ) || ''
		);
		const realReached = reachedComponents( accordionAst, realCompFiles );
		check(
			'real chain: accordion reaches ColorPalette at MAX_REACH_DEPTH (was invisible at 1 hop)',
			realReached.has( 'ColorPalette' ),
			true
		);
		const golden = loadMergedSchema();
		const colourSpec = ( golden.controls || {} ).colour;
		const realCanonicalFiles = colourSpec ? canonicalFiles( colourSpec, realCompFiles ) : new Set();
		check(
			'real chain: the discovered ColorPalette owner is a canonical file (correctly excluded)',
			realReached.has( 'ColorPalette' ) && realCanonicalFiles.has( realReached.get( 'ColorPalette' ) ),
			true
		);
	}

	// Feature-parity verdict, read from roster.json's qualifies.replacedCoreSupports.
	// Pins the acceptance test from Spec 35's DB build: sgs/responsive-logo
	// replaces core/site-logo, whose `color` support is `enabled:true` with
	// every UI sub-flag false/null — no colour UI. That must resolve to
	// qualifies:false / NOT-APPLICABLE, never MISSING (a false positive would
	// dispatch a fix for a panel that has nothing to attach to) and never
	// UNCLEAR (the old behaviour, before replacedCoreSupports existed).
	const paritySpec = { qualifiesWhen: { featureParity: true } };
	check(
		'core block with color enabled but every UI sub-flag false/null does NOT qualify',
		qualifiesFor(
			paritySpec,
			'responsive-logo',
			{},
			{ replaces: 'core/site-logo', qualifies: { replacedCoreSupports: [ 'anchor', 'spacing' ] } },
			'colour'
		).qualifies,
		false
	);
	check(
		'core block that DOES enable the family qualifies true',
		qualifiesFor(
			paritySpec,
			'text',
			{},
			{ replaces: 'core/paragraph', qualifies: { replacedCoreSupports: [ 'color', 'spacing', 'typography' ] } },
			'colour'
		).qualifies,
		true
	);
	// ── AXIS REGISTRY + gradient axis (2026-08-20) ─────────────────────────
	// The registry's whole purpose is that a type is scored on the axes IT
	// declares, so these pin both directions: declared and not-declared.
	check(
		'a row carrying `gradient` declares the gradient axis',
		declaredAxes( { canonical: {}, gradient: { required: true } } ).includes( 'gradient' ),
		true
	);
	check(
		'…and a row without it does NOT declare that axis',
		declaredAxes( { canonical: {} } ).includes( 'gradient' ),
		false
	);
	check(
		'gradient: rows with unmet gradient paths read VIOLATION',
		axisGradient( { gradient: { required: true } }, { slug: 'x', ruleFindings: new Map( [ [ 'x', { gradient: 3 } ] ] ) } ).verdict,
		BAD
	);
	// PAIRED NEGATIVE — same evaluator, same shape, zero findings. Without this
	// the check above could pass on a function that always returned VIOLATION.
	check(
		'…and a block with zero gradient findings reads CONFORMANT',
		axisGradient( { gradient: { required: true } }, { slug: 'x', ruleFindings: new Map() } ).verdict,
		OK
	);
	// FAIL TOWARD UNCLEAR, NEVER TOWARD A PASS. If rule 31 cannot be run the
	// axis must not report every block clean — that is the false-absence shape
	// this whole session has been removing.
	check(
		'gradient: rule 31 unavailable reads UNCLEAR, not CONFORMANT',
		axisGradient( { gradient: { required: true } }, { slug: 'x', ruleFindings: null } ).verdict,
		UNCLEAR
	);
	check(
		'gradient: a type with no gradient contract reads N/A',
		axisGradient( {}, { slug: 'x', ruleFindings: new Map() } ).verdict,
		NA
	);

	check(
		'a block whose family core paints QUALIFIES (not NOT-APPLICABLE)',
		qualifiesFor(
			{
				canonical: { panel: { component: 'SgsColourPanel' } },
				nativeUi: { detectVia: 'block.json supports.color — any sub-flag set true' },
				qualifiesWhen: { paintsOwnSurface: { cssProperties: [ 'color' ] } },
			},
			'__fixture-native-supports',
			{ supports: { color: { text: true } } },
			null,
			'colour'
		).basis,
		'native-supports'
	);
	// PAIRED NEGATIVE — same spec, same code path, family declared but every
	// sub-flag off. Without this the check above could pass on a function that
	// always returned 'native-supports'. Real case it pins: sgs/site-footer
	// read NOT-APPLICABLE for colour because its own style.css paints almost
	// nothing, while core was painting the block's colour the whole time.
	check(
		'…and the same family with every sub-flag false does NOT qualify on that basis',
		qualifiesFor(
			{
				canonical: { panel: { component: 'SgsColourPanel' } },
				nativeUi: { detectVia: 'block.json supports.color — any sub-flag set true' },
				qualifiesWhen: { paintsOwnSurface: { cssProperties: [ 'color' ] } },
			},
			'__fixture-native-supports-off',
			{ supports: { color: { text: false, __experimentalSkipSerialization: true } } },
			null,
			'colour'
		).basis,
		'none'
	);
	// The verdict mapping the basis drives: own-paint is a VIOLATION (styling
	// exists, client cannot reach it), everything else that qualifies is
	// MISSING. This is what replaced the `type !== 'colour'` carve-out.
	check(
		'a qualifying block that core paints reads MISSING, not VIOLATION',
		axisCanonical(
			{
				canonical: { panel: { component: 'SgsColourPanel' } },
				nativeUi: { detectVia: 'block.json supports.color — any sub-flag set true' },
				qualifiesWhen: { paintsOwnSurface: { cssProperties: [ 'color' ] } },
			},
			new Map(),
			{ slug: '__fixture-native-supports', blockJson: { supports: { color: { text: true } } }, rosterEntry: null, type: 'colour' }
		).verdict,
		MISSING
	);
	check(
		'roster.json missing qualifies.replacedCoreSupports falls back to UNCLEAR, not a guess',
		qualifiesFor(
			paritySpec,
			'responsive-logo',
			{},
			{ replaces: 'core/site-logo' },
			'colour'
		).qualifies,
		null
	);

	// The bug these pin: this axis used to check supports.color for EVERY control
	// type, reporting 350 violations (25 blocks x 14 types) the moment the other
	// 13 landed — one colour answer repeated under thirteen wrong headings.
	check(
		'a control type with NO detectVia reports N/A, not a colour answer',
		axisNativeUi( { nativeUi: {} }, { supports: { color: { text: true } } }, new Map() ).verdict,
		NA
	);
	// REGRESSION (2026-08-19). `border`'s row declares
	// `supports.__experimentalBorder`, which the old `[A-Za-z][A-Za-z0-9]*`
	// pattern could not match — the key resolved to null and the axis reported
	// N/A on all 83 blocks, reading exactly like "no native competitor exists".
	check(
		'an __experimental support family is readable, not silently N/A',
		axisNativeUi(
			{ nativeUi: { detectVia: 'block.json supports.__experimentalBorder — any sub-flag set true' } },
			{ supports: { __experimentalBorder: { color: true } } },
			new Map()
		).verdict,
		BAD
	);
	// Paired negative control: the same family declared but all sub-flags off
	// must read CONFORMANT, so the check above cannot pass by always saying BAD.
	check(
		'…and the same family with every sub-flag false reads CONFORMANT',
		axisNativeUi(
			{ nativeUi: { detectVia: 'block.json supports.__experimentalBorder — any sub-flag set true' } },
			{ supports: { __experimentalBorder: { color: false, __experimentalSkipSerialization: true } } },
			new Map()
		).verdict,
		OK
	);
	check(
		'detectVia routes to the declared support key, not always color',
		axisNativeUi(
			{ nativeUi: { detectVia: 'block.json supports.typography — any sub-flag set true' } },
			{ supports: { color: { text: true }, typography: { fontSize: true } } },
			new Map()
		).verdict,
		BAD
	);
	check(
		'…and a block with the OTHER family live reads CONFORMANT for this type',
		axisNativeUi(
			{ nativeUi: { detectVia: 'block.json supports.typography — any sub-flag set true' } },
			{ supports: { color: { text: true }, typography: { __experimentalSkipSerialization: true } } },
			new Map()
		).verdict,
		OK
	);

	// -----------------------------------------------------------------------
	// ownPaintRegex — the declared-cssProperties path vs the hardcoded fallback.
	//
	// ⛔ THESE EXIST BECAUSE THE GUARD IS DELETABLE WITHOUT ANYTHING NOTICING.
	// Colour moved off the fallback onto declared `cssProperties` on 2026-08-20.
	// The only thing keeping that migration measurement-neutral is the
	// `(?<![-\w])` lookbehind in the generated branch. Remove it and every count
	// derived from this function inflates silently — a custom property named
	// `--brand-colour` would read as a painted surface. A silently-inflated count
	// looks exactly like real backlog, so it needs a control that genuinely fails.
	// -----------------------------------------------------------------------
	const countPaint = ( when, css ) => ( css.match( ownPaintRegex( when ) ) || [] ).length;
	const declaredColour = {
		paintsOwnSurface: { cssProperties: [ 'background', 'background-color', 'border-color', 'color' ] },
	};
	const fallbackColour = { paintsOwnSurface: { source: 'prose only, no cssProperties array' } };

	check(
		'ownPaint: declared colour props count real declarations',
		countPaint( declaredColour, '.a{color:red}.b{background-color:blue}.c{border-color:#000}.d{background:none}' ),
		4
	);
	// NEGATIVE CONTROL — fails loudly if the lookbehind is ever removed.
	check(
		'ownPaint NEGATIVE CONTROL: a custom property is not a painted surface',
		countPaint( declaredColour, ':root{--brand-colour:red;--x-background-color:blue}' ),
		0
	);
	check(
		'ownPaint NEGATIVE CONTROL: a longer property ending in -color does not count twice',
		countPaint( declaredColour, '.a{-webkit-text-fill-color:red}' ),
		0
	);
	// EQUIVALENCE — the claim item 4 rests on. Declaring colour's properties must
	// measure what the fallback measured, or the migration moved the census.
	const realisticCss =
		'.sgs-x{background:var(--a);color:#111}\n' +
		'.sgs-x__y{background-color:#fff;border-color:#eee}\n' +
		// Deliberately AMERICAN-spelled: a `--sgs-brand-colour` custom property ends
		// in "colour" and could never match a bare `color` alternative, so it would
		// leave this assertion vacuous — green whether or not the guard is present.
		// `--brand-color` is the shape that actually distinguishes the two regexes.
		':root{--brand-color:#f0f}\n' +
		'.sgs-x:hover{color:#222}\n';
	check(
		'ownPaint EQUIVALENCE: declared colour props measure what the fallback measured',
		countPaint( declaredColour, realisticCss ),
		countPaint( fallbackColour, realisticCss )
	);

	console.log( '' );
	console.log( ok ? '[survey-golden-conformance] self-test PASSED.' : '[survey-golden-conformance] self-test FAILED.' );
	return ok;
}

// ---------------------------------------------------------------------------

function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) {
		process.exit( selfTest() ? 0 : 1 );
	}
	const result = survey();
	if ( argv.includes( '--json' ) ) {
		console.log( JSON.stringify( result, null, 2 ) );
		return;
	}
	report( result );
}

main();
