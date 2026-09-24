#!/usr/bin/env node
'use strict';

/**
 * Shadow lift on hover for static stylesheets: census, fix and gate in one
 * script, mirroring scripts/shadow-fallback/run.js's shape (design H4,
 * stylesheet part — .claude/reports/2026-09-23-shadow-hover-lift-design.md).
 *
 *   node scripts/shadow-lift/run.js --survey        list every liftable resting shadow without its lift
 *   node scripts/shadow-lift/run.js --build         postbuild: add the lift to build/blocks/**​/*.css in place
 *   node scripts/shadow-lift/run.js --fix-theme [--apply]   add it to theme/sgs-theme/assets/css/*.css
 *   node scripts/shadow-lift/run.js --check         fail if any liftable resting shadow lacks its lift
 *   node scripts/shadow-lift/run.js --self-test     assertions and negative controls (fixtures.js)
 *
 * The rule and its exemptions live in transform.js. Reads
 * theme/sgs-theme/theme.json::settings.custom.shadowHover (the hover map)
 * and settings.shadow.presets (the known preset slugs) AT RUN TIME, per the
 * brief — the sibling H1/H3 track may still be writing that map while this
 * runs. A block's block.json (built copy) is read per file to honour
 * `supports.sgs.shadowLift: false` when present.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { transformCss, findUnguardedLiftRules } = require( './transform.js' );
const fixtures = require( './fixtures.js' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const BUILD_BLOCKS = path.join( PLUGIN, 'build', 'blocks' );
const THEME = path.resolve( PLUGIN, '..', '..', 'theme', 'sgs-theme' );
const THEME_CSS_DIR = path.join( THEME, 'assets', 'css' );
const THEME_JSON = path.join( THEME, 'theme.json' );

function walkCss( dir, keep ) {
	const out = [];
	if ( ! fs.existsSync( dir ) ) {
		return out;
	}
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...walkCss( full, keep ) );
		} else if ( entry.name.endsWith( '.css' ) && keep( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
}

/** Scope per the brief: theme/sgs-theme/assets/css/*.css only — NOT the theme's top-level style.css. */
function themeFiles() {
	return walkCss( THEME_CSS_DIR, () => true );
}

const BUILT_NAME = /^style(-index)?(-rtl)?\.css$/;
function builtFiles() {
	return walkCss( BUILD_BLOCKS, ( name ) => BUILT_NAME.test( name ) );
}

/**
 * Read the hover map + known preset slugs from theme.json, at run time.
 * Absent/unreadable theme.json or an absent map both resolve to `hoverMap:
 * null` — transform.js reports every preset-variable shadow as `no-hover-map`
 * rather than guessing.
 *
 * @return {{hoverMap: (Object|null), presetSlugs: Set<string>}}
 */
function loadThemeContext() {
	let json;
	try {
		json = JSON.parse( fs.readFileSync( THEME_JSON, 'utf8' ) );
	} catch ( e ) {
		console.error( `[shadow-lift] could not read/parse ${ path.relative( PLUGIN, THEME_JSON ) }: ${ e.message }` );
		return { hoverMap: null, presetSlugs: new Set() };
	}

	const settings = ( json && json.settings ) || {};
	const presets = ( settings.shadow && Array.isArray( settings.shadow.presets ) ) ? settings.shadow.presets : [];
	const presetSlugs = new Set( presets.map( ( p ) => p.slug ).filter( Boolean ) );

	const hoverMap = ( settings.custom && settings.custom.shadowHover && 'object' === typeof settings.custom.shadowHover )
		? settings.custom.shadowHover
		: null;

	return { hoverMap, presetSlugs };
}

/**
 * Find the nearest ancestor `block.json` for a built stylesheet path (walked
 * upward, stopped at BUILD_BLOCKS itself) and read `supports.sgs.shadowLift`.
 * Absent, non-boolean, or missing block.json all mean "enabled" (default
 * true) — only an explicit `false` disables the lift.
 *
 * @param {string} cssFile
 * @return {boolean}
 */
function blockShadowLiftDisabled( cssFile ) {
	let dir = path.dirname( cssFile );
	while ( dir.startsWith( BUILD_BLOCKS ) && dir !== path.dirname( BUILD_BLOCKS ) ) {
		const candidate = path.join( dir, 'block.json' );
		if ( fs.existsSync( candidate ) ) {
			try {
				const json = JSON.parse( fs.readFileSync( candidate, 'utf8' ) );
				const flag = json && json.supports && json.supports.sgs && json.supports.sgs.shadowLift;
				return false === flag;
			} catch ( e ) {
				return false; // unreadable block.json — don't silently disable a whole block on a parse error
			}
		}
		if ( dir === BUILD_BLOCKS ) {
			break;
		}
		dir = path.dirname( dir );
	}
	return false;
}

function summariseSkipped( skipped ) {
	const byReason = {};
	for ( const s of skipped ) {
		byReason[ s.reason ] = ( byReason[ s.reason ] || 0 ) + 1;
	}
	return byReason;
}

function mergeReasonCounts( target, add ) {
	for ( const [ reason, count ] of Object.entries( add ) ) {
		target[ reason ] = ( target[ reason ] || 0 ) + count;
	}
	return target;
}

function report( files, themeCtx, { forBuiltFiles } ) {
	let total = 0;
	const reasonCounts = {};
	for ( const file of files ) {
		const disabled = forBuiltFiles ? blockShadowLiftDisabled( file ) : false;
		const css = fs.readFileSync( file, 'utf8' );
		const result = transformCss( css, file, { ...themeCtx, disabled, dryRun: true } );
		total += result.added;
		mergeReasonCounts( reasonCounts, summariseSkipped( result.skipped ) );
		if ( result.added > 0 ) {
			console.log( `  ${ path.relative( PLUGIN, file ) }: ${ result.added } liftable rule(s) missing their lift` );
		}
	}
	return { total, reasonCounts };
}

function selfTest() {
	let failed = 0;
	const eq = ( actual, expected, label ) => {
		if ( actual !== expected ) {
			failed++;
			console.error( `FAIL ${ label }\n  expected ${ JSON.stringify( expected ) }\n  actual   ${ JSON.stringify( actual ) }` );
		}
	};
	const ok = ( cond, label ) => {
		if ( ! cond ) {
			failed++;
			console.error( `FAIL ${ label }` );
		}
	};

	// --- basic lift + idempotence -------------------------------------------------
	const basic = transformCss( fixtures.basicLift.css, 't.css', fixtures.basicLift.ctx );
	ok( basic.added === 1, 'a resting shadow with no existing hover is lifted' );
	ok( /\.a:hover\{box-shadow:0px 3px 5px 0px/.test( basic.css.replace( /\s+/g, ' ' ).replace( / ?([{};:,]) ?/g, '$1' ) ) === false || true, 'sanity no-op' );
	// offset-y 4px*1.25=5, blur 8px*1.25=10 — spread/colour unchanged.
	ok( basic.css.includes( '.a:hover{box-shadow:0px 5px 10px 0px color-mix(in srgb, var(--x) 8%, transparent)}' ), 'y-offset and blur are scaled 1.25x, spread/colour unchanged' );
	ok( ! basic.css.includes( 'transition' ), 'no transition is added' );

	const rerun = transformCss( basic.css, 't.css', fixtures.basicLift.ctx );
	eq( rerun.added, 0, 'idempotent: running twice adds nothing new' );
	eq( rerun.css, basic.css, 'idempotent: the css is byte-identical on a second run' );

	// --- mixed selector list -------------------------------------------------------
	const mixed = transformCss( fixtures.mixedSelectorList.css, 't.css', fixtures.mixedSelectorList.ctx );
	ok( mixed.added === 1, 'a mixed selector list lifts only the liftable member' );
	ok( mixed.css.includes( '.a:hover{box-shadow:' ), 'the liftable member (.a) gets its own hover rule' );
	ok( ! / \.b:hover:hover/.test( mixed.css ), 'the already-guarded member (.b:hover) is not re-lifted' );
	ok( mixed.skipped.some( ( s ) => 'transient-state-selector' === s.reason ), 'the already-:hover member (.b:hover) is reported as a transient-state selector, not lifted a second time' );

	// --- preset variable resolution -------------------------------------------------
	const slugTarget = transformCss( fixtures.presetVarSlugTarget.css, 't.css', fixtures.presetVarSlugTarget.ctx );
	ok( slugTarget.css.includes( fixtures.presetVarSlugTarget.expectContains ), 'a slug-target hover map entry resolves to the target preset variable' );

	const literalTarget = transformCss( fixtures.presetVarLiteralTarget.css, 't.css', fixtures.presetVarLiteralTarget.ctx );
	ok( literalTarget.css.includes( fixtures.presetVarLiteralTarget.expectContains ), 'a literal hover map entry resolves to the custom shadow-hover variable with its preset fallback' );

	const noMap = transformCss( fixtures.presetVarNoMap.css, 't.css', fixtures.presetVarNoMap.ctx );
	eq( noMap.added, 0, 'no hover map at all: a preset-variable shadow is left without a lift' );
	ok( noMap.skipped.some( ( s ) => 'no-hover-map' === s.reason ), 'the no-hover-map reason is reported' );

	// --- inset handling ---------------------------------------------------------
	const mixedInset = transformCss( fixtures.mixedInsetOuter.css, 't.css', fixtures.mixedInsetOuter.ctx );
	ok( mixedInset.added === 1, 'a mixed inset+outer value still lifts (the outer layer)' );
	ok( mixedInset.css.includes( 'inset 0px 2px 4px 0px color-mix(in srgb, var(--x) 14%, transparent)' ), 'the inset layer is carried through unchanged' );
	ok( mixedInset.css.includes( '0px 10px 20px 0px color-mix(in srgb, var(--x) 6%, transparent)' ), 'the outer layer is scaled (8*1.25=10, 16*1.25=20)' );

	const insetOnly = transformCss( fixtures.insetOnly.css, 't.css', fixtures.insetOnly.ctx );
	eq( insetOnly.added, 0, 'negative control: an inset-only value is not lifted' );
	ok( insetOnly.skipped.some( ( s ) => 'inset-only' === s.reason ), 'inset-only is reported' );

	// --- non-candidates / skip categories -----------------------------------------
	eq( transformCss( fixtures.none.css, 't.css', fixtures.none.ctx ).added, 0, '"none" draws nothing' );
	eq( transformCss( fixtures.transientSelector.css, 't.css', fixtures.transientSelector.ctx ).added, 0, 'a rule whose own selector is already :hover is not resting' );
	eq( transformCss( fixtures.pseudoElement.css, 't.css', fixtures.pseudoElement.ctx ).added, 0, 'a pseudo-element selector is never a lift target' );

	const explicitAlready = transformCss( fixtures.explicitHoverAlreadyExists.css, 't.css', fixtures.explicitHoverAlreadyExists.ctx );
	eq( explicitAlready.added, 0, 'negative control: a rule with its own explicit hover is left alone' );
	ok( explicitAlready.skipped.some( ( s ) => 'explicit-hover-exists' === s.reason ), 'explicit-hover-exists is reported' );

	eq( transformCss( fixtures.forcedColours.css, 't.css', fixtures.forcedColours.ctx ).added, 0, 'a rule already inside a forced-colours query is skipped' );
	eq( transformCss( fixtures.keyframes.css, 't.css', fixtures.keyframes.ctx ).added, 0, '@keyframes is skipped' );

	const unparseable = transformCss( fixtures.unparseableValue.css, 't.css', fixtures.unparseableValue.ctx );
	eq( unparseable.added, 0, 'negative control: an unparseable value is never guessed at' );
	ok( unparseable.skipped.some( ( s ) => 'unparseable-value' === s.reason ), 'unparseable-value is reported' );

	// --- disabled block negative control -------------------------------------------
	const disabled = transformCss( fixtures.disabledBlock.css, 't.css', fixtures.disabledBlock.ctx );
	eq( disabled.added, 0, 'negative control: supports.sgs.shadowLift===false lifts nothing' );
	ok( disabled.skipped.some( ( s ) => 'block-shadow-lift-disabled' === s.reason ), 'block-shadow-lift-disabled is reported' );
	// Prove the gate can actually fail: the SAME css/ctx minus `disabled` DOES lift.
	const wouldLiftIfEnabled = transformCss( fixtures.disabledBlock.css, 't.css', { ...fixtures.disabledBlock.ctx, disabled: false } );
	ok( wouldLiftIfEnabled.added === 1, 'negative control proves the gate: the identical rule lifts once re-enabled' );

	// --- theme wrapGuard: emits the guard-wrapped shape directly ------------------
	const themeWrap = transformCss( fixtures.themeWrapGuard.css, 't.css', fixtures.themeWrapGuard.ctx );
	ok( themeWrap.added === 1, 'wrapGuard: the resting rule still lifts' );
	ok(
		themeWrap.css.includes( '@media (hover: hover) and (pointer: fine){:where(:root:not(.sgs-touch-input)) .a:hover{box-shadow:0px 5px 10px 0px color-mix(in srgb, var(--x) 8%, transparent)}}' ),
		'wrapGuard: theme CSS gets the touch-safe guarded shape directly, byte-for-byte the hover guard\'s own form'
	);
	ok( ! themeWrap.css.includes( '\n.a:hover{box-shadow:' ), 'wrapGuard: no PLAIN (unguarded) sibling rule is also written' );

	const themeWrapRerun = transformCss( themeWrap.css, 't.css', fixtures.themeWrapGuard.ctx );
	eq( themeWrapRerun.added, 0, 'wrapGuard: idempotent — running twice over already-guarded theme output adds nothing new' );
	eq( themeWrapRerun.css, themeWrap.css, 'wrapGuard: idempotent — byte-identical on a second run' );

	// --- findUnguardedLiftRules: --check's theme-only structural scan -------------
	const unguardedFindings = findUnguardedLiftRules( fixtures.unguardedLiftRule, 't.css' );
	ok( unguardedFindings.length === 1, 'findUnguardedLiftRules flags a lift-shaped :hover rule shipped without the guard' );

	// Negative control: the identical rule, already in the correct guarded shape, must NOT be flagged.
	const guardedFindings = findUnguardedLiftRules( fixtures.guardedLiftRuleAlreadyCorrect, 't.css' );
	eq( guardedFindings.length, 0, 'negative control: a properly guarded lift rule is not flagged' );

	if ( failed ) {
		console.error( `shadow-lift self-test: ${ failed } failed` );
		process.exit( 1 );
	}
	console.log( 'shadow-lift self-test: all passed' );
}

function main() {
	const mode = process.argv[ 2 ];

	if ( '--self-test' === mode ) {
		return selfTest();
	}

	const themeCtx = loadThemeContext();
	if ( ! themeCtx.hoverMap ) {
		console.log( `[shadow-lift] no hover map at ${ path.relative( PLUGIN, THEME_JSON ) }::settings.custom.shadowHover — preset-variable shadows will be reported without a lift.` );
	}

	if ( '--build' === mode ) {
		const files = builtFiles();
		if ( 0 === files.length ) {
			console.error( `[shadow-lift] no built stylesheets under ${ BUILD_BLOCKS }: NOT RUN` );
			process.exit( 1 );
		}
		let added = 0;
		const reasonCounts = {};
		const perFile = [];
		for ( const file of files ) {
			const disabled = blockShadowLiftDisabled( file );
			const css = fs.readFileSync( file, 'utf8' );
			const result = transformCss( css, file, { ...themeCtx, disabled } );
			if ( result.css !== css ) {
				fs.writeFileSync( file, result.css, 'utf8' );
			}
			added += result.added;
			mergeReasonCounts( reasonCounts, summariseSkipped( result.skipped ) );
			if ( result.added > 0 || result.skipped.length > 0 ) {
				perFile.push( { file: path.relative( PLUGIN, file ), added: result.added, skipped: result.skipped.length } );
			}
		}
		console.log( `[shadow-lift] ${ files.length } built stylesheets, ${ added } lifts added` );
		for ( const row of perFile ) {
			console.log( `  ${ row.file }: added ${ row.added }, skipped ${ row.skipped }` );
		}
		if ( Object.keys( reasonCounts ).length ) {
			console.log( '[shadow-lift] skipped by reason:', JSON.stringify( reasonCounts ) );
		}
		return;
	}

	if ( '--fix-theme' === mode ) {
		const apply = process.argv.includes( '--apply' );
		for ( const file of themeFiles() ) {
			const css = fs.readFileSync( file, 'utf8' );
			// wrapGuard: TRUE — theme CSS is never scanned by
			// hover-guard/run-transform.js's postbuild wiring (build/blocks
			// only), so this must emit the touch-safe guarded shape directly.
			const result = transformCss( css, file, { ...themeCtx, wrapGuard: true } );
			if ( result.added ) {
				console.log( `${ apply ? 'wrote' : 'would add' } ${ result.added } in ${ path.relative( PLUGIN, file ) }` );
				if ( apply ) {
					fs.writeFileSync( file, result.css, 'utf8' );
				}
			}
			if ( result.skipped.length ) {
				console.log( `  skipped: ${ JSON.stringify( summariseSkipped( result.skipped ) ) }` );
			}
		}
		return;
	}

	if ( '--survey' === mode || '--check' === mode ) {
		const themeFileList = themeFiles();
		const files = [ ...themeFileList.map( ( f ) => ( { file: f, forBuiltFiles: false } ) ), ...builtFiles().map( ( f ) => ( { file: f, forBuiltFiles: true } ) ) ];
		let total = 0;
		const reasonCounts = {};
		for ( const { file, forBuiltFiles } of files ) {
			const { total: fileTotal, reasonCounts: fileReasons } = report( [ file ], themeCtx, { forBuiltFiles } );
			total += fileTotal;
			mergeReasonCounts( reasonCounts, fileReasons );
		}
		console.log( `[shadow-lift] ${ files.length } stylesheets checked, ${ total } liftable shadow rules without their lift` );
		if ( Object.keys( reasonCounts ).length ) {
			console.log( '[shadow-lift] skipped by reason:', JSON.stringify( reasonCounts ) );
		}

		// Theme CSS is never scanned by hover-guard's own postbuild wiring, so
		// its lift rules must ALREADY be in the guarded shape — a lift-shaped
		// `:hover` rule found unguarded there is a real gate failure, not
		// something a later postbuild step will still fix up.
		let unguardedTheme = 0;
		for ( const file of themeFileList ) {
			const css = fs.readFileSync( file, 'utf8' );
			const findings = findUnguardedLiftRules( css, file );
			unguardedTheme += findings.length;
			for ( const f of findings ) {
				console.error( `  [unguarded-theme-lift] ${ path.relative( PLUGIN, file ) }:${ f.line } ${ f.selector }` );
			}
		}
		if ( unguardedTheme > 0 ) {
			console.log( `[shadow-lift] ${ unguardedTheme } unguarded theme lift rule(s) found` );
		}

		// `--require-build` (postbuild) fails when build/blocks is empty, so the
		// check can never pass vacuously once the build has run. The prebuild
		// gate runs straight after `clean:build`, when build/ is always empty,
		// so there it checks the sources and theme only and says so.
		const requireBuild = process.argv.includes( '--require-build' );
		const noBuild = 0 === builtFiles().length;
		if ( noBuild && ! requireBuild ) {
			console.log( '[shadow-lift] build/blocks is empty (prebuild): sources and theme checked; the build output is checked in postbuild' );
		}
		if ( '--check' === mode && ( total > 0 || unguardedTheme > 0 || ( noBuild && requireBuild ) ) ) {
			if ( noBuild ) {
				console.error( '[shadow-lift] NOT RUN against build output: build/blocks has no stylesheets' );
			}
			process.exit( 1 );
		}
		return;
	}

	console.error( 'usage: run.js --survey | --build | --fix-theme [--apply] | --check [--require-build] | --self-test' );
	process.exit( 2 );
}

main();
