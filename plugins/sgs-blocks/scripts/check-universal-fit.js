/**
 * check-universal-fit.js
 *
 * WARN-ONLY STRUCTURAL REPORT — maps every universal editor extension
 * (src/blocks/extensions/*.js) to the blocks it is injected into, then flags
 * "opt-out candidates": a block that carries a universal extension where the
 * extension does nothing block-specific for it. This is the "universals
 * bolted onto everything regardless" problem (pricing-table and counter are
 * the known-bad cases that motivated this script — see the design brief).
 *
 * DIFFERENT FROM check-dead-controls.js: that script flags a CONTROL whose
 * attribute nothing renders (a truly dead attr). This script does NOT care
 * whether the attribute is rendered — universal extensions are legitimately
 * consumed by a SHARED system (includes/*.php render_block filters, or the
 * frontend IntersectionObserver for animation), never the block's own
 * render.php/save.js/view.js. What this script checks instead is FIT: does
 * the block have ANY of its own bespoke integration with the extension's
 * attribute(s) (proof someone deliberately wired/considered it for THIS
 * block), or is it silently inheriting the panel purely because the gating
 * rule is broad (e.g. "every block with className support")?
 *
 * GATING IS DERIVED FROM THE REAL EXTENSION SOURCE, not guessed or
 * hardcoded per block (blub.db 260, DB-first/no-hardcoded-dicts spirit —
 * here "the DB" is the extension source itself, read once and mirrored
 * faithfully below with a comment pointing at the source lines it mirrors).
 *
 * TWO FLAG CONDITIONS (both must hold):
 *   (a) the block's own render.php + save.js + view.js + style.css never
 *       reference any of the extension's injected attribute names — i.e.
 *       nothing in the block's OWN source shows bespoke awareness of the
 *       extension (comments stripped so a stale doc-comment doesn't count).
 *   (b) the block has NOT already opted out via
 *       supports.sgs.hideExtensions (where the extension has an opt-out
 *       slug at all — four of the nine extensions have NO opt-out
 *       mechanism in the source at all; that gap is itself reported).
 *
 * BASELINE: scripts/universal-fit-baseline.json lists already-reviewed
 * findings that are accepted (deliberately kept) so re-runs report only
 * NET-NEW candidates prominently. Starts as `{}` — zero accepted.
 *
 * Usage:
 *   node scripts/check-universal-fit.js            # full per-extension report
 *   node scripts/check-universal-fit.js --check     # concise summary (still exit 0)
 *   node scripts/check-universal-fit.js --json      # machine-readable findings
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
 */
function readBlock( slug ) {
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
	};
}

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
		hideSlug: null, // NO opt-out mechanism in source — reported as a gap.
		appliesTo: ( b ) => b.supportsClassName,
	},
	{
		id: 'customCss',
		file: 'custom-css.js',
		panel: 'Custom CSS (Advanced)',
		attrs: [ 'sgsCustomCss' ],
		hideSlug: null, // NO opt-out mechanism — gates only on settings.attributes existing (always true).
		appliesTo: () => true,
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
		hideSlug: null, // NO opt-out mechanism in source — reported as a gap.
		appliesTo: ( b ) => b.supportsClassName,
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
	const slugs = ( roster.blocks || [] ).map( ( b ) => b.slug );

	const unresolvedBlocks = [];
	const blocks = [];
	for ( const slug of slugs ) {
		const block = readBlock( slug );
		if ( ! block ) {
			unresolvedBlocks.push( { slug, reason: 'block.json not found for roster entry' } );
			continue;
		}
		blocks.push( block );
	}

	const baseline = loadBaseline();

	// Per-extension results.
	const extensionReports = [];
	// Per-block rollup: slug -> flagged extension ids.
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

	// Top offenders — blocks carrying the most flagged (net-new) universals.
	const topOffenders = [ ...blockFlags.entries() ]
		.map( ( [ block, ids ] ) => ( { block, count: ids.length, extensions: ids } ) )
		.sort( ( a, b ) => b.count - a.count );

	const totalFlagged = extensionReports.reduce( ( sum, r ) => sum + r.flaggedCount, 0 );
	const totalBaselined = extensionReports.reduce( ( sum, r ) => sum + r.flaggedBaselinedCount, 0 );

	const report = {
		blockCount: blocks.length,
		extensionCount: EXTENSIONS.length,
		totalFlagged,
		totalBaselined,
		extensions: extensionReports,
		topOffenders,
		unresolvedExtensions,
		unresolvedBlocks,
	};

	if ( isJson ) {
		process.stdout.write( JSON.stringify( report, null, 2 ) + '\n' );
		process.exit( 0 );
	}

	if ( isCheck ) {
		process.stdout.write(
			`[check-universal-fit] ${ blocks.length } blocks x ${ EXTENSIONS.length } extension-panels checked.\n` +
				`  ${ totalFlagged } NET-NEW opt-out candidate(s), ${ totalBaselined } already baselined.\n` +
				`  Top offenders: ${
					topOffenders.slice( 0, 10 ).map( ( o ) => `${ o.block } (${ o.count })` ).join( ', ' ) || 'none'
				}\n` +
				`  ${ unresolvedExtensions.length } extension(s) with unresolved/dynamic gating (see full report).\n` +
				'  Run without --check for the full per-extension breakdown.\n'
		);
		process.exit( 0 );
	}

	// Full human-readable report.
	process.stdout.write(
		`[check-universal-fit] ${ blocks.length } blocks in roster, ${ EXTENSIONS.length } universal extension-panels.\n\n`
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
		for ( const f of r.flagged ) {
			process.stdout.write( `    - ${ f.block }\n` );
		}
		process.stdout.write( '\n' );
	}

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

	process.stdout.write( '--- Top offenders (most flagged universals on one block) ---\n' );
	for ( const o of topOffenders.slice( 0, 20 ) ) {
		process.stdout.write( `  ${ o.block } — ${ o.count }: ${ o.extensions.join( ', ' ) }\n` );
	}

	process.stdout.write(
		`\n[check-universal-fit] TOTAL: ${ totalFlagged } net-new opt-out candidate(s) across ` +
			`${ blockFlags.size } block(s), ${ totalBaselined } already baselined.\n` +
			'This is INFORMATIONAL ONLY (WARN-only, always exits 0). To accept a finding, add it to ' +
			'scripts/universal-fit-baseline.json with a reason. To fix one, either wire the extension ' +
			"into the block's own render, or add supports.sgs.hideExtensions on the block.\n"
	);

	process.exit( 0 ); // WARN-ONLY — never fail a build.
}

main();
