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
const traverse = require( '@babel/traverse' ).default;
const { resolveComponentFiles } = require( '../inspector-scan/core/components' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
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

/**
 * Every capitalised component a source file MOUNTS in JSX.
 *
 * Membership is decided by the JSX containing `<ComponentName`, never by an
 * import-path string — the same "detect by what it does" discipline the shared
 * resolver documents.
 */
function mountedComponents( ast ) {
	const names = new Set();
	if ( ! ast ) return names;
	traverse( ast, {
		JSXOpeningElement( p ) {
			const n = p.node.name;
			const name = n && n.type === 'JSXIdentifier' ? n.name : null;
			if ( name && /^[A-Z]/.test( name ) ) names.add( name );
		},
	} );
	return names;
}

/**
 * Components a block reaches, following shared components one hop.
 *
 * One hop, deliberately: `edit.js` -> a shared panel -> the row component it
 * mounts is the real shape (SgsColourPanel renders DesignTokenPicker). An
 * unbounded walk becomes a second import graph nobody can falsify. Each hop
 * records WHERE it came from so a finding can name the file that owns the fix
 * rather than blaming thirty blocks individually.
 */
function reachedComponents( editAst, compFiles ) {
	const direct = mountedComponents( editAst );
	const reached = new Map(); // name -> owning file (null = the block's own edit.js)
	for ( const n of direct ) reached.set( n, null );

	for ( const n of direct ) {
		const file = compFiles.get( n );
		if ( ! file ) continue;
		const ast = parseSafe( readFile( file ) || '' );
		for ( const inner of mountedComponents( ast ) ) {
			if ( ! reached.has( inner ) ) reached.set( inner, file );
		}
	}
	return reached;
}

// ---------------------------------------------------------------------------
// Axes — every one derived from the schema, none hardcoded
// ---------------------------------------------------------------------------

/** Canonical component adoption: does the block reach the schema's panel/row? */
function axisCanonical( spec, reached ) {
	const canonical = spec.canonical || {};
	const wanted = [ canonical.panel, canonical.row ]
		.filter( Boolean )
		.map( ( c ) => c.component )
		.filter( Boolean );
	if ( ! wanted.length ) return { verdict: NA, detail: 'schema declares no canonical component' };

	const hit = wanted.filter( ( w ) => reached.has( w ) );
	if ( ! hit.length ) {
		return { verdict: BAD, detail: `reaches none of ${ wanted.join( ' / ' ) }` };
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
const NATIVE_UI_FLAGS = [ 'background', 'text', 'link', 'gradients', 'button', 'heading', 'enableContrastChecker' ];

function axisNativeUi( spec, blockJson, reached ) {
	if ( ! spec.nativeUi ) return { verdict: NA, detail: 'schema declares no native-UI fingerprint' };
	const colour = ( ( blockJson || {} ).supports || {} ).color;
	if ( ! colour || typeof colour !== 'object' ) {
		return { verdict: OK, detail: 'does not declare supports.color' };
	}
	const live = NATIVE_UI_FLAGS.filter( ( f ) => colour[ f ] === true );
	if ( ! live.length ) return { verdict: OK, detail: 'declared, every UI flag false' };

	const panel = ( ( spec.canonical || {} ).panel || {} ).component;
	const doublePainted = panel && reached.has( panel );
	return {
		verdict: BAD,
		detail: `core renders its own UI (${ live.join( ',' ) })` + ( doublePainted ? ' — DOUBLE-PAINTED alongside ours' : ' — CORE-ONLY, no SGS panel' ),
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
	if ( ! when ) return { qualifies: true, why: 'no qualifiesWhen declared — assume in scope', home: 'self' };

	// (1) paints its own surface
	let ownPaint = 0;
	if ( when.paintsOwnSurface ) {
		const css = readFile( path.join( BLOCKS_DIR, slug, 'style.css' ) );
		if ( css ) {
			const m = css.match( /(?:background(?:-color)?|border-color|[^-\w]color)\s*:/g );
			ownPaint = m ? m.length : 0;
		}
	}
	if ( ownPaint > 0 ) return { qualifies: true, why: `paints ${ ownPaint } own declaration(s)`, home: 'self' };

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
			}
			: {
				qualifies: false,
				why: `replaces ${ JSON.stringify( rosterEntry.replaces ) }, which does NOT enable core \`${ coreFamily }\` UI`,
				home: 'self',
			};
	}

	return { qualifies: false, why: 'paints nothing, and nothing paints its rendered classes', home: 'self' };
}

function colourEligibility() {
	const map = new Map();
	try {
		const roster = JSON.parse( fs.readFileSync( ROSTER_PATH, 'utf8' ) );
		// ⚠ The list key is `blocks`, not `entries`, and slugs are `sgs/`-prefixed.
		// Both were guessed wrong first and reported every block UNCLEAR — a
		// scope gate that fails closed is at least visible, but a lookup keyed on
		// the wrong shape is indistinguishable from "nothing is eligible".
		for ( const e of roster.blocks || [] ) {
			const bare = String( e.slug || '' ).replace( /^sgs\//, '' );
			map.set( bare, e.surfaces === null ? null : !! ( e.surfaces && e.surfaces.colour ) );
		}
	} catch ( e ) {
		return map;
	}
	return map;
}

function blockSlugs() {
	return fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( e ) => e.isDirectory() && e.name !== 'extensions' )
		.map( ( e ) => e.name )
		.filter( ( s ) => fs.existsSync( path.join( BLOCKS_DIR, s, 'block.json' ) ) )
		.sort();
}

function survey() {
	const golden = JSON.parse( fs.readFileSync( GOLDEN_PATH, 'utf8' ) );
	const encoded = ( golden._meta && golden._meta.encoded ) || Object.keys( golden.controls || {} );
	const compFiles = resolveComponentFiles();
	const eligible = colourEligibility();
	const rosterBySlug = new Map();
	try {
		for ( const e of JSON.parse( fs.readFileSync( ROSTER_PATH, 'utf8' ) ).blocks || [] ) {
			rosterBySlug.set( String( e.slug || '' ).replace( /^sgs\//, '' ), e );
		}
	} catch ( e ) { /* reported as absent by colourEligibility */ }
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
			// Scope gate FIRST — an out-of-scope block must not report a
			// violation of a contract that does not apply to it.
			const elig = eligible.has( slug ) ? eligible.get( slug ) : null;
			if ( type === 'colour' && elig === false ) {
				// The block has no colour TODAY. That is descriptive, not a
				// verdict — ask whether it SHOULD, and split the old catch-all
				// N/A into the two opposite answers it was hiding.
				const q = qualifiesFor( spec, slug, blockJson, rosterBySlug.get( slug ), type );
				rows.push( {
					block: `sgs/${ slug }`,
					type,
					axes: {
						canonical: null === q.qualifies
							? { verdict: UNCLEAR, detail: q.why }
							: q.qualifies
								? { verdict: MISSING, detail: `qualifies (${ q.why })` + ( 'ancestor' === q.home ? ' — control belongs on the ANCESTOR' : '' ), home: q.home }
								: { verdict: NOT_APPLICABLE, detail: q.why },
						bannedLookalikes: axisBannedLookalikes( spec, reached, canonicalFiles( spec, compFiles ) ),
						nativeUi: axisNativeUi( spec, blockJson, reached ),
					},
				} );
				continue;
			}
			if ( type === 'colour' && elig === null ) {
				rows.push( {
					block: `sgs/${ slug }`,
					type,
					axes: { canonical: { verdict: UNCLEAR, detail: 'absent from roster.json — UNKNOWN, not clean' } },
				} );
				continue;
			}

			const axes = {
				canonical: axisCanonical( spec, reached ),
				bannedLookalikes: axisBannedLookalikes( spec, reached, canonicalFiles( spec, compFiles ) ),
				nativeUi: axisNativeUi( spec, blockJson, reached ),
			};
			// The hover axis belongs to the colour contract specifically; it is
			// applied only when the schema's own scope covers a paintable state.
			if ( spec.states ) axes.hoverMechanism = axisHoverMechanism( slug );

			rows.push( { block: `sgs/${ slug }`, type, axes } );
		}
	}
	return { encoded, rows };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report( result ) {
	const AXES = [ 'canonical', 'nativeUi', 'bannedLookalikes', 'hoverMechanism' ];
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

	const spec = { nativeUi: {}, canonical: { panel: { component: 'SgsColourPanel' } } };

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
