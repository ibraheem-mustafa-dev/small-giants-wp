/**
 * check-universal-fit.js
 *
 * WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension
 * (src/blocks/extensions/*.js) to the blocks it is injected into.
 *
 * DIFFERENT FROM check-dead-controls.js: that script flags a CONTROL whose
 * attribute nothing renders (a truly dead attr). This script does NOT care
 * whether the attribute is rendered — universal extensions are legitimately
 * consumed by a SHARED system (includes/*.php render_block filters, or the
 * frontend IntersectionObserver for animation), never the block's own
 * render.php/save.js/view.js.
 *
 * HEADLINE = two genuinely-actionable signals, not a raw block x extension
 * cross-product count:
 *
 *   1. UNIVERSAL LOAD RANKING — per block, how many universal panels its
 *      own gating rule injects (irrespective of opt-out/consumption). This
 *      is a real editor-sidebar-bloat signal: an operator opening
 *      decorative-image or pricing-table sees a wall of irrelevant panels.
 *
 *   2. INAPPROPRIATE-FIT FLAGS — a *semantic* poor-fit heuristic, not "the
 *      block's own render.php doesn't reference the attr" (that condition
 *      is true for nearly every block x globally-rendered-universal pair BY
 *      DESIGN — the shared PHP filter/frontend observer consumes it, not
 *      the block itself, so it over-counts and isn't actionable on its
 *      own). The real signal: a FORM-FIELD or purely-structural/utility
 *      block (no styling surface, per roster.json `surfaces.styling`)
 *      carrying `hover` / `blockLink` / `clickEffects` / `parallax` /
 *      `animation` — a form input does not need a hover-scale or a
 *      parallax offset. "Kind" is derived from roster.json
 *      (`category` + `surfaces.styling`), not a hardcoded block-slug list —
 *      see `isInappropriateFitKind()`.
 *
 *   3. NO-OPT-OUT ARCHITECTURAL FINDING — four of the nine extensions
 *      (animation, conditional-visibility, custom-css, responsive-
 *      visibility) have NO `hideExtensions` opt-out slug in source at all.
 *      Of those four, THREE are UTILITY extensions (conditional-visibility,
 *      custom-css, responsive-visibility): Advanced-tab, opt-in-BY-USE
 *      (an operator only sees an effect once they set a condition / write
 *      CSS / hide a device tier — an unused panel is inert, not a bolted-on
 *      styling affordance), and legitimately universal — every block can
 *      meaningfully be conditionally visible, carry custom CSS, or be
 *      hidden per device, the same way every block can have a className.
 *      These are reported separately as "utility — universal by design",
 *      NOT as a gap. The remaining one, `animation`, is a STYLING/
 *      INTERACTION universal (alongside hover / blockLink / clickEffects /
 *      parallax, which DO have opt-out slugs) — a scroll-triggered motion
 *      effect a block did not ask for and cannot turn off is a genuine
 *      poor-fit risk (see the ANIMATION_DENYLIST it already needs to hand-
 *      roll instead of a declarative opt-out). `animation` is therefore the
 *      SOLE real no-opt-out gap this script flags as actionable.
 *
 * The full raw block x extension matrix (the old "opt-out candidate" flag —
 * kept for supporting detail + baseline compatibility) is still computed and
 * available under `--json`, but it is NOT the headline count: it over-counts
 * by design (see above) and produced 656 "candidates" that were mostly noise.
 *
 * GATING IS DERIVED FROM THE REAL EXTENSION SOURCE, not guessed or
 * hardcoded per block (blub.db 260, DB-first/no-hardcoded-dicts spirit —
 * here "the DB" is the extension source itself, read once and mirrored
 * faithfully below with a comment pointing at the source lines it mirrors).
 *
 * BASELINE: scripts/universal-fit-baseline.json lists already-reviewed
 * findings (from the raw matrix) that are accepted (deliberately kept) so
 * re-runs report only NET-NEW candidates in the supporting detail. Starts
 * as `{}` — zero accepted.
 *
 * Usage:
 *   node scripts/check-universal-fit.js            # full report (load ranking + inappropriate-fit + no-opt-out + supporting detail)
 *   node scripts/check-universal-fit.js --check     # concise headline summary (still exit 0)
 *   node scripts/check-universal-fit.js --json      # machine-readable findings, including the raw matrix
 *
 * WARN-ONLY (Spec 35 a11y-validation-informational-not-gate policy, extended
 * here to editor-extension fit): this script ALWAYS exits 0. It is NOT wired
 * into prebuild/CI — informational only, run manually or from a review skill.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const ROSTER_FILE = path.join( ROOT, 'scripts', 'consistency', 'roster.json' );
const BASELINE_FILE = path.join( __dirname, 'universal-fit-baseline.json' );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

/**
 * Strip line + block comments so an attribute name surviving only in a
 * doc-comment (e.g. a stale "TODO: wire sgsAnimation here" note) does not
 * count as real consumption. Handles JS `//` / `/* *\/`, CSS `/* *\/`, and
 * PHP `//` / `#` / `/* *\/`.
 */
function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ) // /* ... */
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ) // // ... (avoid http://)
		.replace( /^\s*#[^\n]*/gm, ' ' ); // # ... (PHP line comment)
}

/** Word-boundary test — `sgsHoverScale` does not match inside `sgsHoverScalePreset`. */
function referencesAttr( attr, corpus ) {
	const re = new RegExp( '\\b' + attr + '\\b' );
	return re.test( corpus );
}

/**
 * Build the "own corpus" for a block: render.php + save.js + view.js +
 * style.css, comments stripped. This is deliberately narrower than
 * check-dead-controls.js's consumption corpus (which also pulls in the
 * shared includes/ tree) — here we specifically want to know whether THIS
 * block's OWN files show bespoke awareness of the attribute, not whether
 * some shared system consumes it (every sgs* extension attr is, by design,
 * consumed by a shared system — that's not evidence of fit).
 */
function readBlockOwnCorpus( dir ) {
	const parts = [
		readIfExists( path.join( dir, 'render.php' ) ),
		readIfExists( path.join( dir, 'save.js' ) ),
		readIfExists( path.join( dir, 'view.js' ) ),
		readIfExists( path.join( dir, 'style.css' ) ),
	];
	return stripComments( parts.join( '\n' ) );
}

// ---------------------------------------------------------------------------
// Per-extension gating — each mirrors the REAL logic in the named source
// file (line refs are to the file as read for this script; re-check them if
// the extension is edited). No block-specific carve-outs live here — only
// the extension's own universal condition, translated from JS runtime
// (getBlockType/registerBlockType-time checks) to a static block.json read.
// ---------------------------------------------------------------------------

// animation.js — ANIMATION_DENYLIST (inner/child blocks that are never
// scroll targets) + CORE_ANIMATION_BLOCKS (4 core blocks, outside our sgs/*
// roster so irrelevant to this report's denominator).
const ANIMATION_DENYLIST = [
	'sgs/tab',
	'sgs/accordion-item',
	'sgs/form-step',
	'sgs/form-review',
	'sgs/form-field-text',
	'sgs/form-field-email',
	'sgs/form-field-phone',
	'sgs/form-field-textarea',
	'sgs/form-field-checkbox',
	'sgs/form-field-radio',
	'sgs/form-field-select',
	'sgs/form-field-tiles',
	'sgs/form-field-file',
	'sgs/form-field-consent',
];

/**
 * Read a block's block.json + derive the gating facts every extension's
 * appliesTo() needs. One read per block, shared across all extensions.
 *
 * @param {string} slug        Block slug, e.g. "sgs/form-field-text".
 * @param {Object} rosterEntry The matching roster.json entry (category,
 *                             surfaces, tier) — DB-derived (source =
 *                             sgs-framework.db blocks, per roster.json
 *                             `_meta`), used for the block-"kind" heuristic
 *                             below rather than a hardcoded slug list.
 */
function readBlock( slug, rosterEntry ) {
	const dirName = slug.replace( /^sgs\//, '' );
	const dir = path.join( BLOCKS_DIR, dirName );
	const blockJsonPath = path.join( dir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) {
		return null;
	}
	let json;
	try {
		json = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `Invalid block.json in ${ dir }: ${ e.message }` );
	}
	const supports = json.supports || {};
	const sgsSupports = supports.sgs || {};
	return {
		slug,
		name: json.name || slug,
		dir,
		json,
		// className support defaults true; only an explicit `false` disables it
		// (mirrors `settings?.supports?.className === false` checks throughout
		// the extensions — every extension treats "unset" as "supported").
		supportsClassName: supports.className !== false,
		// custom-spacing.js: `if ( settings.supports?.spacing ) { return settings; }`
		// — ANY truthy `supports.spacing` (the object form used across this
		// plugin) skips the extension; only a missing/false value lets it in.
		hasNativeSpacingSupport: Boolean( supports.spacing ),
		// image-controls.js: `!!blockNameOrSettings?.supports?.sgs?.imageControls`
		imageControlsEnabled: Boolean( sgsSupports.imageControls ),
		// hide-extensions.js: `supports?.sgs?.hideExtensions` array of slugs.
		hideExtensions: Array.isArray( sgsSupports.hideExtensions )
			? sgsSupports.hideExtensions
			: [],
		ownCorpus: readBlockOwnCorpus( dir ),
		// roster.json fields — DB-derived "kind" signal, see isInappropriateFitKind().
		category: rosterEntry ? rosterEntry.category : null,
		tier: rosterEntry ? rosterEntry.tier : null,
		surfaces: rosterEntry ? rosterEntry.surfaces || {} : {},
	};
}

/**
 * Block "kind" heuristic for the inappropriate-fit signal, derived from
 * roster.json rather than a hardcoded block-slug list: a block in the
 * `sgs-forms` category whose own `surfaces.styling` is `false` is a leaf
 * form-input control or a purely-structural/utility block (verified against
 * the live roster 2026-07-19 — this combination selects exactly the 13
 * `sgs/form-field-*` leaf controls plus `sgs/form-review`; it deliberately
 * excludes `sgs/form` and `sgs/form-step`, which DO carry a styling surface
 * — they are containers an operator legitimately wants to hover/animate —
 * and `sgs/form-field-tiles`, which has its own visual tile styling surface
 * and is a legitimate hover/click target). A form input does not need a
 * hover-scale, a block-link wrap, a click-ripple, a parallax offset, or a
 * scroll-triggered animation.
 */
function isInappropriateFitKind( block ) {
	return block.category === 'sgs-forms' && block.surfaces.styling === false;
}

// Extension ids for which "carried on a form-field/utility block" is treated
// as a genuine semantic poor-fit, not merely unproven bespoke wiring — these
// are all visual/motion affordances a plain form input has no use for.
const INAPPROPRIATE_FIT_EXTENSION_IDS = new Set( [
	'animation',
	'hover',
	'blockLink',
	'clickEffects',
	'parallax',
] );

/**
 * The nine universal extension FILES loaded by extensions/index.js
 * (hide-extensions.js is the shared opt-out utility they import — it is not
 * itself a universal extension, so it is not listed here). hover-effects.js
 * renders THREE independently-gated panels (hover / blockLink /
 * clickEffects), each with its own hideExtensions slug and attribute set, so
 * it contributes three entries below sharing one `file`.
 */
const EXTENSIONS = [
	{
		id: 'animation',
		file: 'animation.js',
		panel: 'Animation',
		attrs: [ 'sgsAnimation', 'sgsAnimationDelay', 'sgsAnimationDuration', 'sgsAnimationEasing' ],
		hideSlug: null, // NO opt-out mechanism in source — reported as a gap.
		appliesTo: ( b ) =>
			! ANIMATION_DENYLIST.includes( b.name ) && b.name.startsWith( 'sgs/' ),
	},
	{
		id: 'hover',
		file: 'hover-effects.js',
		panel: 'Hover Effects',
		attrs: [
			'sgsHoverBgColour', 'sgsHoverTextColour', 'sgsHoverBorderColour',
			'sgsHoverScale', 'sgsHoverScalePreset', 'sgsHoverShadow',
			'sgsHoverDuration', 'sgsHoverEasing', 'sgsHoverImageZoom',
			'sgsStaggerDelay', 'sgsHoverGrayscale', 'sgsHoverBorderAccent',
			'sgsHoverTilt3D', 'sgsFocusRing',
		],
		hideSlug: 'hover',
		appliesTo: ( b ) => b.supportsClassName,
	},
	{
		id: 'blockLink',
		file: 'hover-effects.js',
		panel: 'Block Link',
		attrs: [ 'sgsBlockLink', 'sgsBlockLinkTarget' ],
		hideSlug: 'blockLink',
		appliesTo: ( b ) => b.supportsClassName,
	},
	{
		id: 'clickEffects',
		file: 'hover-effects.js',
		panel: 'Click Effects',
		attrs: [ 'sgsClickEffect', 'sgsClickRippleColour', 'sgsClickRippleDuration' ],
		hideSlug: 'clickEffects',
		appliesTo: ( b ) => b.supportsClassName,
	},
	{
		id: 'conditionalVisibility',
		file: 'conditional-visibility.js',
		panel: 'Visibility Conditions',
		attrs: [
			'sgsConditionLoggedIn', 'sgsConditionUserRole', 'sgsConditionDateStart',
			'sgsConditionDateEnd', 'sgsConditionDays', 'sgsConditionUrlParam',
			'sgsConditionReferrer',
		],
		hideSlug: null, // NO opt-out mechanism in source — UTILITY, see isUtility below.
		appliesTo: ( b ) => b.supportsClassName,
		// Advanced-tab, opt-in-by-use: an operator only sees an effect once
		// they actually set a condition. Legitimately universal (any block
		// can meaningfully be conditionally visible) — excluded from the
		// "no-opt-out gap" finding, reported separately as utility-by-design.
		isUtility: true,
	},
	{
		id: 'customCss',
		file: 'custom-css.js',
		panel: 'Custom CSS (Advanced)',
		attrs: [ 'sgsCustomCss' ],
		hideSlug: null, // NO opt-out mechanism — UTILITY, see isUtility below.
		appliesTo: () => true,
		// Advanced-tab, opt-in-by-use: an empty Custom CSS field is inert.
		// Legitimately universal (any block can take custom CSS) —
		// excluded from the "no-opt-out gap" finding.
		isUtility: true,
	},
	{
		id: 'customSpacing',
		file: 'custom-spacing.js',
		panel: 'Spacing',
		attrs: [ 'sgsMarginTop', 'sgsMarginBottom', 'sgsPaddingTop', 'sgsPaddingBottom' ],
		hideSlug: 'spacing',
		appliesTo: ( b ) => b.name.startsWith( 'sgs/' ) && ! b.hasNativeSpacingSupport,
	},
	{
		id: 'parallax',
		file: 'parallax.js',
		panel: 'Parallax',
		attrs: [ 'sgsParallax', 'sgsParallaxStrength' ],
		hideSlug: 'parallax',
		appliesTo: ( b ) => b.supportsClassName,
	},
	{
		id: 'responsiveVisibility',
		file: 'responsive-visibility.js',
		panel: 'Device visibility',
		attrs: [ 'sgsHideOnMobile', 'sgsHideOnTablet', 'sgsHideOnDesktop' ],
		hideSlug: null, // NO opt-out mechanism in source — UTILITY, see isUtility below.
		appliesTo: ( b ) => b.supportsClassName,
		// Advanced-tab, opt-in-by-use: all three toggles default off/false.
		// Legitimately universal (any block can meaningfully be hidden per
		// device) — excluded from the "no-opt-out gap" finding.
		isUtility: true,
	},
	{
		id: 'imageControls',
		file: 'image-controls.js',
		panel: 'Image Controls',
		attrs: [
			'sgsObjectPosition', 'sgsMaxWidth', 'sgsHeightDesktop',
			'sgsHeightTablet', 'sgsHeightMobile', 'sgsHeightUnit',
		],
		hideSlug: null, // opt-IN allowlist (supports.sgs.imageControls) — no opt-out needed.
		appliesTo: ( b ) => b.imageControlsEnabled,
		// Marks this extension exempt from the "no-opt-out gap" finding below:
		// it is opt-IN (a block must declare supports.sgs.imageControls to see
		// the panel at all), so there is nothing "bolted onto everything
		// regardless" for it to opt back out of.
		optIn: true,
	},
	{
		id: 'blockDefaults',
		file: 'block-defaults.js',
		panel: 'Save as Default (Advanced)',
		attrs: [], // injects NO schema attribute — see `unresolved` handling below.
		hideSlug: null,
		appliesTo: ( b ) => b.name.startsWith( 'sgs/' ),
		unresolved:
			'block-defaults.js has two halves: (1) a "Save as Default" button ' +
			'shown on every sgs/* block (statically resolvable, but injects no ' +
			'attribute — there is nothing to test for bespoke consumption); ' +
			'(2) auto-seeding new instances from window.sgsBlockDefaults, which ' +
			'is populated at runtime from wp_options and differs per site/admin ' +
			'action — not statically resolvable. Excluded from opt-out-candidate ' +
			'flagging; reported separately.',
	},
];

// ---------------------------------------------------------------------------
// Flagging
// ---------------------------------------------------------------------------

/**
 * Evaluate one extension against one block.
 *
 * @return {{status: string, reason?: string}} status is one of:
 *   'not-applicable' | 'opted-out' | 'unresolved' | 'bespoke' | 'flagged'
 */
function evaluate( extension, block ) {
	if ( ! extension.appliesTo( block ) ) {
		return { status: 'not-applicable' };
	}
	if ( extension.hideSlug && block.hideExtensions.includes( extension.hideSlug ) ) {
		return { status: 'opted-out' };
	}
	if ( extension.unresolved ) {
		return { status: 'unresolved' };
	}
	const referenced = extension.attrs.filter( ( a ) => referencesAttr( a, block.ownCorpus ) );
	if ( referenced.length > 0 ) {
		return { status: 'bespoke', referenced };
	}
	const optOutHint = extension.hideSlug
		? `supports.sgs.hideExtensions:["${ extension.hideSlug }"]`
		: '(no opt-out mechanism exists in this extension — would need one added)';
	return {
		status: 'flagged',
		reason:
			`${ block.name } carries the "${ extension.panel }" panel (${ extension.file }) via ` +
			'its universal gating rule, but its own render.php/save.js/view.js/style.css never ' +
			`reference any of [${ extension.attrs.join( ', ' ) }] — nothing shows this block was ` +
			`deliberately wired for this extension. Opt-out: ${ optOutHint }.`,
	};
}

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return new Set();
	}
	let data;
	try {
		data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `Invalid universal-fit-baseline.json: ${ e.message }` );
	}
	const accepted = Array.isArray( data.accepted ) ? data.accepted : [];
	return new Set( accepted.map( ( a ) => `${ a.extension }:${ a.block }` ) );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const isJson = process.argv.includes( '--json' );
	const isCheck = process.argv.includes( '--check' );

	if ( ! fs.existsSync( ROSTER_FILE ) ) {
		process.stderr.write(
			`[check-universal-fit] roster.json not found at ${ ROSTER_FILE } — cannot run.\n`
		);
		process.exit( 0 ); // WARN-ONLY: never fail the build even on missing input.
	}
	const roster = JSON.parse( fs.readFileSync( ROSTER_FILE, 'utf8' ) );
	const rosterEntries = roster.blocks || [];

	const unresolvedBlocks = [];
	const blocks = [];
	for ( const entry of rosterEntries ) {
		const block = readBlock( entry.slug, entry );
		if ( ! block ) {
			unresolvedBlocks.push( { slug: entry.slug, reason: 'block.json not found for roster entry' } );
			continue;
		}
		blocks.push( block );
	}

	const baseline = loadBaseline();

	// -------------------------------------------------------------------
	// Signal 1: universal LOAD RANKING — per block, how many universal
	// PANELS its own gating rule actually shows (appliesTo() true, not
	// opted out via hideExtensions, and genuinely a configurable panel —
	// block-defaults' "Save as Default" button is excluded: it injects no
	// schema attribute at all, see its `unresolved` note, so it is not a
	// panel in the same sense as the other ten). This is independent of
	// whether the block has bespoke evidence of consuming the extension —
	// an operator sees the panel either way, so this is the real
	// sidebar-bloat metric.
	// -------------------------------------------------------------------
	const loadRanking = blocks
		.map( ( block ) => {
			const loaded = EXTENSIONS.filter( ( extension ) => {
				if ( extension.unresolved ) {
					return false;
				}
				if ( ! extension.appliesTo( block ) ) {
					return false;
				}
				if ( extension.hideSlug && block.hideExtensions.includes( extension.hideSlug ) ) {
					return false;
				}
				return true;
			} ).map( ( extension ) => extension.id );
			return { block: block.name, count: loaded.length, extensions: loaded };
		} )
		.sort( ( a, b ) => b.count - a.count );

	// -------------------------------------------------------------------
	// Signal 2: INAPPROPRIATE-FIT — a form-field/utility block (roster
	// category=sgs-forms, surfaces.styling=false, see isInappropriateFitKind)
	// carrying a visual/motion universal (hover / blockLink / clickEffects /
	// parallax / animation) that its own gating rule did not already exclude
	// and that has not already been opted out. Independent of bespoke-
	// consumption evidence — the poor fit is semantic, not evidentiary.
	// -------------------------------------------------------------------
	const inappropriateFit = [];
	for ( const extension of EXTENSIONS ) {
		if ( ! INAPPROPRIATE_FIT_EXTENSION_IDS.has( extension.id ) ) {
			continue;
		}
		for ( const block of blocks ) {
			if ( ! isInappropriateFitKind( block ) ) {
				continue;
			}
			if ( ! extension.appliesTo( block ) ) {
				continue; // extension's own gating rule already excludes this block (e.g. ANIMATION_DENYLIST).
			}
			if ( extension.hideSlug && block.hideExtensions.includes( extension.hideSlug ) ) {
				continue; // already opted out — not a live gap.
			}
			inappropriateFit.push( {
				extension: extension.id,
				panel: extension.panel,
				block: block.name,
				hasOptOut: Boolean( extension.hideSlug ),
				reason:
					`${ block.name } is a form-field/utility block (roster category=sgs-forms, ` +
					`surfaces.styling=false) but its universal gating rule still injects the ` +
					`"${ extension.panel }" panel (${ extension.file }) — a plain form control has ` +
					`no use for ${ extension.panel.toLowerCase() }. ` +
					( extension.hideSlug
						? `Opt-out: supports.sgs.hideExtensions:["${ extension.hideSlug }"].`
						: '(no opt-out mechanism exists in this extension — would need one added).' ),
			} );
		}
	}
	const inappropriateFitByBlock = new Map();
	for ( const f of inappropriateFit ) {
		const list = inappropriateFitByBlock.get( f.block ) || [];
		list.push( f.extension );
		inappropriateFitByBlock.set( f.block, list );
	}
	const inappropriateFitBlocks = [ ...inappropriateFitByBlock.entries() ]
		.map( ( [ block, ids ] ) => ( { block, count: ids.length, extensions: ids } ) )
		.sort( ( a, b ) => b.count - a.count );

	// -------------------------------------------------------------------
	// Signal 3: NO-OPT-OUT architectural gap — STYLING/INTERACTION
	// extensions with no hideExtensions slug in source at all, excluding
	// opt-IN extensions (nothing to opt back out of), the unresolved
	// block-defaults button (injects no attribute, not a visual/motion
	// panel), and UTILITY extensions (conditional-visibility / custom-css /
	// responsive-visibility — Advanced-tab, opt-in-by-use, legitimately
	// universal by design, see isUtility on each extension's definition
	// above). `animation` is the sole extension that is BOTH a styling/
	// motion affordance AND has no opt-out — the one real gap.
	// -------------------------------------------------------------------
	const noOptOutExtensions = EXTENSIONS.filter(
		( extension ) =>
			extension.hideSlug === null &&
			! extension.optIn &&
			! extension.unresolved &&
			! extension.isUtility
	).map( ( extension ) => ( { id: extension.id, file: extension.file, panel: extension.panel } ) );

	// Utility extensions with no opt-out — NOT a gap, reported as a
	// separate "universal by design" note so the finding isn't silently
	// dropped, just correctly reframed.
	const utilityNoOptOutExtensions = EXTENSIONS.filter(
		( extension ) => extension.hideSlug === null && extension.isUtility
	).map( ( extension ) => ( { id: extension.id, file: extension.file, panel: extension.panel } ) );

	// -------------------------------------------------------------------
	// Supporting detail: the raw block x extension matrix (the original
	// "opt-out candidate" flag — kept for --json + baseline compatibility,
	// but no longer the headline: it is TRUE for nearly every block x
	// globally-rendered-universal pair by design, since the shared PHP
	// filter/frontend observer consumes the attribute, not the block's own
	// render.php/save.js/view.js — see the file-header comment).
	// -------------------------------------------------------------------
	const extensionReports = [];
	const blockFlags = new Map();
	const unresolvedExtensions = [];

	for ( const extension of EXTENSIONS ) {
		if ( extension.unresolved ) {
			unresolvedExtensions.push( {
				extension: extension.id,
				file: extension.file,
				reason: extension.unresolved,
			} );
		}

		let appliesToCount = 0;
		let optedOutCount = 0;
		let bespokeCount = 0;
		const flagged = [];
		const flaggedBaselined = [];

		for ( const block of blocks ) {
			const result = evaluate( extension, block );
			if ( result.status === 'not-applicable' ) {
				continue;
			}
			appliesToCount++;
			if ( result.status === 'opted-out' ) {
				optedOutCount++;
			} else if ( result.status === 'bespoke' ) {
				bespokeCount++;
			} else if ( result.status === 'flagged' ) {
				const key = `${ extension.id }:${ block.name }`;
				const entry = { extension: extension.id, block: block.name, reason: result.reason };
				if ( baseline.has( key ) ) {
					flaggedBaselined.push( entry );
				} else {
					flagged.push( entry );
					const list = blockFlags.get( block.name ) || [];
					list.push( extension.id );
					blockFlags.set( block.name, list );
				}
			}
		}

		extensionReports.push( {
			id: extension.id,
			file: extension.file,
			panel: extension.panel,
			attrs: extension.attrs,
			hideSlug: extension.hideSlug,
			appliesToCount,
			optedOutCount,
			bespokeCount,
			flaggedCount: flagged.length,
			flaggedBaselinedCount: flaggedBaselined.length,
			flagged,
			flaggedBaselined,
		} );
	}

	// Matrix top offenders — blocks carrying the most raw-matrix-flagged
	// (net-new) universals. Renamed from the old headline `topOffenders` —
	// still computed for supporting detail, superseded as a headline by
	// `loadRanking` (Signal 1) above.
	const matrixTopOffenders = [ ...blockFlags.entries() ]
		.map( ( [ block, ids ] ) => ( { block, count: ids.length, extensions: ids } ) )
		.sort( ( a, b ) => b.count - a.count );

	const totalFlagged = extensionReports.reduce( ( sum, r ) => sum + r.flaggedCount, 0 );
	const totalBaselined = extensionReports.reduce( ( sum, r ) => sum + r.flaggedBaselinedCount, 0 );

	const report = {
		blockCount: blocks.length,
		extensionCount: EXTENSIONS.length,
		// Headline signals.
		loadRanking,
		inappropriateFit: {
			count: inappropriateFit.length,
			findings: inappropriateFit,
			byBlock: inappropriateFitBlocks,
		},
		noOptOutExtensions,
		utilityNoOptOutExtensions,
		// Supporting detail — the raw matrix (old headline, now demoted).
		matrix: {
			totalFlagged,
			totalBaselined,
			extensions: extensionReports,
			topOffenders: matrixTopOffenders,
		},
		unresolvedExtensions,
		unresolvedBlocks,
	};

	if ( isJson ) {
		process.stdout.write( JSON.stringify( report, null, 2 ) + '\n' );
		process.exit( 0 );
	}

	if ( isCheck ) {
		process.stdout.write(
			`[check-universal-fit] ${ blocks.length } blocks x ${ EXTENSIONS.length } extension-panels checked.\n\n` +
				'UNIVERSAL LOAD RANKING (top 5 — most panels injected into one block):\n' +
				loadRanking
					.slice( 0, 5 )
					.map( ( o ) => `  ${ o.block } — ${ o.count } panel(s)` )
					.join( '\n' ) +
				'\n\n' +
				`INAPPROPRIATE-FIT FLAGS: ${ inappropriateFit.length } (form-field/utility block carrying ` +
				'hover/blockLink/clickEffects/parallax/animation with no opt-out applied)\n' +
				( inappropriateFitBlocks.length
					? inappropriateFitBlocks
							.map( ( o ) => `  ${ o.block } — ${ o.extensions.join( ', ' ) }` )
							.join( '\n' ) + '\n'
					: '  none\n' ) +
				'\n' +
				`NO-OPT-OUT GAP: ${ noOptOutExtensions.length } styling/interaction extension(s) have ` +
				'NO hideExtensions opt-out mechanism in source at all:\n' +
				noOptOutExtensions.map( ( e ) => `  ${ e.id } (${ e.file })` ).join( '\n' ) +
				'\n\n' +
				`  (${ utilityNoOptOutExtensions.length } utility extension(s) also have no opt-out — ` +
				'universal by design, NOT a gap: ' +
				utilityNoOptOutExtensions.map( ( e ) => e.id ).join( ', ' ) + '.)\n\n' +
				`(Supporting detail: ${ totalFlagged } raw block x extension matrix flags, ` +
				`${ totalBaselined } baselined — see --json / full report for the matrix, no longer the headline.)\n` +
				'  Run without --check for the full breakdown.\n'
		);
		process.exit( 0 );
	}

	// Full human-readable report — headline signals first.
	process.stdout.write(
		`[check-universal-fit] ${ blocks.length } blocks in roster, ${ EXTENSIONS.length } universal extension-panels.\n\n`
	);

	process.stdout.write( '=== 1. UNIVERSAL LOAD RANKING (panels injected per block, opt-outs excluded) ===\n' );
	for ( const o of loadRanking.slice( 0, 20 ) ) {
		process.stdout.write( `  ${ o.block } — ${ o.count }: ${ o.extensions.join( ', ' ) }\n` );
	}
	process.stdout.write( '\n' );

	process.stdout.write(
		`=== 2. INAPPROPRIATE-FIT FLAGS (${ inappropriateFit.length }) — form-field/utility block ` +
			'carrying a visual/motion universal ===\n'
	);
	if ( inappropriateFit.length ) {
		for ( const f of inappropriateFit ) {
			process.stdout.write( `  - ${ f.reason }\n` );
		}
	} else {
		process.stdout.write( '  none\n' );
	}
	process.stdout.write( '\n' );

	process.stdout.write(
		`=== 3. NO-OPT-OUT ARCHITECTURAL GAP (${ noOptOutExtensions.length } styling/interaction extension(s)) ===\n`
	);
	if ( noOptOutExtensions.length ) {
		for ( const e of noOptOutExtensions ) {
			process.stdout.write( `  - ${ e.id } (${ e.panel }, ${ e.file }) — no supports.sgs.hideExtensions slug exists for it.\n` );
		}
	} else {
		process.stdout.write( '  none\n' );
	}
	process.stdout.write( '\n' );
	process.stdout.write(
		`--- Utility extensions with no opt-out (${ utilityNoOptOutExtensions.length }) — universal by design, NOT a gap ---\n`
	);
	for ( const e of utilityNoOptOutExtensions ) {
		process.stdout.write(
			`  - ${ e.id } (${ e.panel }, ${ e.file }) — Advanced-tab, opt-in-by-use, legitimately universal; ` +
				'no opt-out needed.\n'
		);
	}
	process.stdout.write( '\n' );

	if ( unresolvedExtensions.length ) {
		process.stdout.write( '--- Unresolved (dynamic gating, not statically checkable) ---\n' );
		for ( const u of unresolvedExtensions ) {
			process.stdout.write( `  - ${ u.extension } (${ u.file }): ${ u.reason }\n` );
		}
		process.stdout.write( '\n' );
	}

	if ( unresolvedBlocks.length ) {
		process.stdout.write( '--- Roster entries with no block.json found ---\n' );
		for ( const u of unresolvedBlocks ) {
			process.stdout.write( `  - ${ u.slug }: ${ u.reason }\n` );
		}
		process.stdout.write( '\n' );
	}

	process.stdout.write(
		'=== Supporting detail: raw block x extension matrix (superseded as headline — see file header) ===\n'
	);
	for ( const r of extensionReports ) {
		process.stdout.write(
			`--- ${ r.panel } (${ r.file }, id=${ r.id }) ---\n` +
				`  Attributes: ${ r.attrs.length ? r.attrs.join( ', ' ) : '(none — see unresolved section)' }\n` +
				`  Opt-out slug: ${ r.hideSlug || '(NONE — no opt-out mechanism exists in source)' }\n` +
				`  Applies to: ${ r.appliesToCount } block(s) | opted-out: ${ r.optedOutCount } | ` +
				`bespoke-consumption: ${ r.bespokeCount } | flagged: ${ r.flaggedCount }` +
				( r.flaggedBaselinedCount ? ` (+${ r.flaggedBaselinedCount } baselined)` : '' ) +
				'\n'
		);
	}
	process.stdout.write(
		`\n[check-universal-fit] Matrix total: ${ totalFlagged } net-new raw-matrix flag(s) across ` +
			`${ blockFlags.size } block(s), ${ totalBaselined } already baselined. This count is NOT the ` +
			'headline (see file header) — it over-counts by design.\n' +
			'This is INFORMATIONAL ONLY (WARN-only, always exits 0). To accept a matrix finding, add it to ' +
			'scripts/universal-fit-baseline.json with a reason. To fix an inappropriate-fit flag, add ' +
			"supports.sgs.hideExtensions on the block (where an opt-out slug exists).\n"
	);

	process.exit( 0 ); // WARN-ONLY — never fail a build.
}

main();
