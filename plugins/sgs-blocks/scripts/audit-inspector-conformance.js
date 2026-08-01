/**
 * audit-inspector-conformance.js
 *
 * Spec 35 UNIT A — static inspector-conformance audit (WARN-ONLY).
 *
 * Parses every SGS block's `edit.js` (JSX, via @babel/parser + @babel/traverse)
 * plus `block.json`/`style.css`/`view.js` where relevant, keyed to the roster
 * at `scripts/consistency/roster.json`, and flags Spec 35 DONE-checklist
 * violations (`.claude/plans/spec-35-inspector-DONE-checklist.md`).
 *
 * Rules implemented (see the checklist item each maps to):
 *
 *   1. colour-no-alpha            — item 4  — ColorPalette / ColorGradientControl /
 *      GradientPicker / PanelColorGradientSettings used directly (JSX element)
 *      with no `enableAlpha` JSX attribute. DesignTokenPicker is EXEMPT — it
 *      defaults `enableAlpha` to `true` (src/components/DesignTokenPicker.js).
 *      Native `supports.color` (block.json) is a theme.json concern, not scanned.
 *
 *   2. raw-url-link               — item 8  — a `TextControl` JSX element with a
 *      `type="url"` attribute (should be `SgsLinkControl`).
 *
 *   3. media-upload-no-check      — item 14 — `MediaUpload` used with no
 *      `MediaUploadCheck` anywhere in the same file.
 *
 *   4. preset-only-shadow         — item 7  — SEVERITY: informational, fuzzy.
 *      A `SelectControl` whose `label` text contains "shadow" (case-insensitive)
 *      — likely a None/Small/Medium preset select that should be the shared
 *      `ShadowControl` real builder (X/Y/blur/spread/colour+alpha/inset).
 *
 *   5. animation-no-reduced-motion — item 17 — for a roster block whose
 *      `surfaces.animation === true`, neither its `style.css` nor `view.js`
 *      contains the string `prefers-reduced-motion`, AND no framework-wide
 *      reduced-motion gate was found covering it. The framework-wide gate
 *      (theme/sgs-theme/assets/css/core-blocks-critical.css, targeting
 *      `*, *::before, *::after`, enqueued unconditionally from functions.php)
 *      is detected LIVE each run by reading those theme files — never
 *      hardcoded as "it exists" — so if the gate is ever removed or its
 *      enqueue becomes conditional, this rule goes back to flagging every
 *      genuinely-ungated animating block. See Spec 35 Part I "Reduced-motion
 *      gate" row.
 *
 *   6. dense-panel-candidate      — item 3  — SEVERITY: informational, coarse.
 *      An InspectorControls `PanelBody` with >6 descendant control-like JSX
 *      elements and no `ToolsPanel` anywhere inside it.
 *
 * Exceptions: `scripts/inspector-conformance-baseline.json`, shape
 *   { "sgs/block": { "ruleKey": { "reason": "..." } } }
 * A flagged (block, rule) pair present there is reported with status
 * "EXCEPTION" and excluded from the totals used for a future hard gate.
 *
 * WARN-ONLY: this script always exits 0, regardless of findings. Promotion to
 * a hard prebuild gate happens at Spec 35 close (plan Gate 3), per the
 * DONE-checklist "How to use this checklist" section.
 *
 * Usage
 * -----
 *   node scripts/audit-inspector-conformance.js            # human report
 *   node scripts/audit-inspector-conformance.js --json      # machine report to stdout
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const parser = require( '@babel/parser' );
const traverseModule = require( '@babel/traverse' );
const traverse = traverseModule.default || traverseModule;

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const ROSTER_PATH = path.join( __dirname, 'consistency', 'roster.json' );
const BASELINE_PATH = path.join( __dirname, 'inspector-conformance-baseline.json' );

// ROOT = plugins/sgs-blocks; repo root is two levels up (plugins/sgs-blocks -> plugins -> repo root).
const REPO_ROOT = path.join( ROOT, '..', '..' );
const THEME_DIR = path.join( REPO_ROOT, 'theme', 'sgs-theme' );
const THEME_FUNCTIONS_PATH = path.join( THEME_DIR, 'functions.php' );

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const RAW_COLOUR_PICKER_NAMES = new Set( [
	'ColorPalette',
	'ColorGradientControl',
	'GradientPicker',
	'PanelColorGradientSettings',
] );

// JSX tag names treated as "control-like" for the dense-panel heuristic.
const CONTROL_NAME_RE = /(Control|Picker|Palette|Toggle|Checkbox|Radio|Combobox)$/;

// ---------------------------------------------------------------------------
// GENERIC HELPERS
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

function loadJson( p, fallback ) {
	if ( ! fs.existsSync( p ) ) return fallback;
	try {
		return JSON.parse( fs.readFileSync( p, 'utf8' ) );
	} catch ( e ) {
		return fallback;
	}
}

// ---------------------------------------------------------------------------
// FRAMEWORK-WIDE REDUCED-MOTION GATE DETECTION (Rule 5 support)
// ---------------------------------------------------------------------------
//
// A framework-wide `prefers-reduced-motion` rule already exists at
// theme/sgs-theme/assets/css/core-blocks-critical.css, targeting
// `*, *::before, *::after` with `!important`, enqueued unconditionally from
// theme/sgs-theme/functions.php on `wp_enqueue_scripts`. Its own comment says
// it "replaces piecemeal per-block reduced-motion rules" (Spec 35 Part I
// "Reduced-motion gate" row). Rule 5 must not flag a block that genuinely
// relies on that gate — but it must ALSO go back to flagging if the gate is
// ever removed or its enqueue becomes conditional. So this is detected LIVE
// by reading the actual theme files each run — never assumed true from a
// cached/hardcoded flag.

// Extracts the text of a brace-delimited block starting at the index of its
// opening `{`, using brace-depth balancing (so it doesn't stop at the first
// nested `}`). Returns null if the braces never balance (malformed source —
// treat as "gate not found" rather than guess).
function extractBalancedBraceBlock( text, openBraceIndex ) {
	let depth = 0;
	for ( let i = openBraceIndex; i < text.length; i++ ) {
		if ( text[ i ] === '{' ) depth++;
		else if ( text[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) return text.slice( openBraceIndex, i + 1 );
		}
	}
	return null;
}

// Returns the CSS asset paths (relative to THEME_DIR, e.g.
// "assets/css/core-blocks-critical.css") that theme/sgs-theme/functions.php
// enqueues UNCONDITIONALLY — as a direct top-level statement inside a
// function hooked to `wp_enqueue_scripts` via `add_action`, not nested inside
// an `if`/`foreach`/etc. A call at nested brace-depth is treated as
// conditional and excluded.
function findUnconditionallyEnqueuedThemeCssPaths() {
	const php = readIfExists( THEME_FUNCTIONS_PATH );
	if ( ! php ) return [];

	const hookRe = /add_action\(\s*'wp_enqueue_scripts'\s*,\s*__NAMESPACE__\s*\.\s*'\\?([A-Za-z0-9_]+)'/g;
	const cssPaths = [];
	let hookMatch;
	while ( ( hookMatch = hookRe.exec( php ) ) !== null ) {
		const funcName = hookMatch[ 1 ];
		const fnDefRe = new RegExp( `function\\s+${ funcName }\\s*\\([^)]*\\)[^{]*\\{` );
		const fnMatch = fnDefRe.exec( php );
		if ( ! fnMatch ) continue;

		const openBraceIndex = fnMatch.index + fnMatch[ 0 ].length - 1;
		const rawBody = extractBalancedBraceBlock( php, openBraceIndex );
		if ( ! rawBody ) continue;
		// Strip the function's own wrapping braces so depth 0 means "a direct
		// top-level statement in the function body" (extractBalancedBraceBlock
		// includes the outer `{`/`}` in its return value, which would otherwise
		// make every top-level call read as depth 1, not 0).
		const body = rawBody.slice( 1, -1 );

		const callRe = /wp_enqueue_style\s*\(/g;
		let callMatch;
		while ( ( callMatch = callRe.exec( body ) ) !== null ) {
			const prefix = body.slice( 0, callMatch.index );
			const depth = ( prefix.match( /\{/g ) || [] ).length - ( prefix.match( /\}/g ) || [] ).length;
			if ( depth !== 0 ) continue; // nested inside if/foreach/etc — conditional, not unconditional.

			const argsStart = callMatch.index + callMatch[ 0 ].length;
			const argsEnd = body.indexOf( ');', argsStart );
			const args = argsEnd === -1 ? body.slice( argsStart ) : body.slice( argsStart, argsEnd );
			const pathMatch = /get_theme_file_uri\(\s*'([^']+\.css)'\s*\)/.exec( args );
			if ( pathMatch ) cssPaths.push( pathMatch[ 1 ] );
		}
	}
	return cssPaths;
}

// True if the given CSS source contains a `@media (prefers-reduced-motion:
// reduce)` block that targets `*, *::before, *::after` and forces
// `animation-duration`/`transition-duration` via `!important` — the
// universal-gate shape, not a scoped per-block rule.
function cssHasUniversalReducedMotionGate( cssText ) {
	const mediaOpen = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/.exec( cssText );
	if ( ! mediaOpen ) return false;

	const openBraceIndex = mediaOpen.index + mediaOpen[ 0 ].length - 1;
	const block = extractBalancedBraceBlock( cssText, openBraceIndex );
	if ( ! block ) return false;

	const targetsUniversalSelectors = /\*\s*,\s*\*::before\s*,\s*\*::after/.test( block );
	const forcesImportant = /(animation-duration|transition-duration)\s*:\s*[^;]+!important/.test( block );
	return targetsUniversalSelectors && forcesImportant;
}

// Lazily computed + cached for the lifetime of one audit run (reading two
// theme files once per invocation is enough; a fresh run re-reads them, so a
// theme change is always picked up on the next run — nothing is assumed
// across invocations).
let _frameworkWideReducedMotionGateCache = null;
function hasFrameworkWideReducedMotionGate() {
	if ( _frameworkWideReducedMotionGateCache !== null ) return _frameworkWideReducedMotionGateCache;
	const cssPaths = findUnconditionallyEnqueuedThemeCssPaths();
	_frameworkWideReducedMotionGateCache = cssPaths.some( ( relPath ) => {
		const cssText = readIfExists( path.join( THEME_DIR, relPath ) );
		return !! cssText && cssHasUniversalReducedMotionGate( cssText );
	} );
	return _frameworkWideReducedMotionGateCache;
}

/** JSXOpeningElement -> its tag name string, or null for member expressions we don't care about. */
function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		// e.g. <Foo.Bar /> — use the rightmost segment.
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

/** Does this JSXOpeningElement have an attribute literally named `attrName`? */
function hasJsxAttr( openingElement, attrName ) {
	return ( openingElement.attributes || [] ).some(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === attrName
	);
}

/**
 * Best-effort extraction of a JSXAttribute's string value, whether it's a
 * plain string literal (`label="Shadow"`) or a JSXExpressionContainer
 * wrapping a call like `__( 'Shadow', 'sgs-blocks' )` (first string arg) or a
 * plain string/template literal.
 */
function jsxAttrStringValue( openingElement, attrName ) {
	const attr = ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === attrName
	);
	if ( ! attr || ! attr.value ) return null;

	if ( attr.value.type === 'StringLiteral' ) {
		return attr.value.value;
	}
	if ( attr.value.type === 'JSXExpressionContainer' ) {
		const expr = attr.value.expression;
		if ( expr.type === 'StringLiteral' ) return expr.value;
		if ( expr.type === 'TemplateLiteral' && expr.quasis.length ) {
			return expr.quasis.map( ( q ) => q.value.raw ).join( ' ' );
		}
		if ( expr.type === 'CallExpression' && expr.arguments.length ) {
			const firstArg = expr.arguments[ 0 ];
			if ( firstArg.type === 'StringLiteral' ) return firstArg.value;
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// PER-FILE AST SCAN
// ---------------------------------------------------------------------------

/**
 * Parse an edit.js source and return the collected findings for the 4
 * AST-driven rules (1, 2, 3, 4, 6). Throws on unparseable input — caller
 * catches and records it in `unparseable[]`.
 */
function scanEditJs( src, relFile ) {
	const ast = parser.parse( src, {
		sourceType: 'module',
		plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
		errorRecovery: false,
	} );

	const colourNoAlpha = [];
	const rawUrlLinks = [];
	let mediaUploadUsed = false;
	let mediaUploadCheckUsed = false;
	const shadowSelects = [];
	const panelBodies = []; // { path, line, hasToolsPanel, controlCount }

	traverse( ast, {
		JSXOpeningElement( nodePath ) {
			const node = nodePath.node;
			const name = jsxName( node );
			if ( ! name ) return;
			const line = node.loc ? node.loc.start.line : 0;

			// Rule 1 — colour-no-alpha.
			if ( RAW_COLOUR_PICKER_NAMES.has( name ) ) {
				if ( ! hasJsxAttr( node, 'enableAlpha' ) ) {
					colourNoAlpha.push( { line, component: name } );
				}
			}

			// Rule 2 — raw-url-link.
			if ( name === 'TextControl' ) {
				const typeVal = jsxAttrStringValue( node, 'type' );
				if ( typeVal === 'url' ) {
					rawUrlLinks.push( { line } );
				}
			}

			// Rule 3 — media-upload-no-check (presence tracking).
			if ( name === 'MediaUpload' ) mediaUploadUsed = true;
			if ( name === 'MediaUploadCheck' ) mediaUploadCheckUsed = true;

			// Rule 4 — preset-only-shadow (fuzzy, informational).
			if ( name === 'SelectControl' ) {
				const label = jsxAttrStringValue( node, 'label' );
				if ( label && /shadow/i.test( label ) ) {
					shadowSelects.push( { line, label } );
				}
			}
		},
	} );

	// Rule 6 — dense-panel-candidate. Walk PanelBody JSXElements (not just
	// opening elements) so we can count descendant control-like tags and
	// detect a ToolsPanel anywhere inside.
	traverse( ast, {
		JSXElement( nodePath ) {
			const opening = nodePath.node.openingElement;
			const name = jsxName( opening );
			if ( name !== 'PanelBody' ) return;

			let controlCount = 0;
			let hasToolsPanel = false;
			nodePath.traverse( {
				JSXOpeningElement( inner ) {
					const innerName = jsxName( inner.node );
					if ( ! innerName ) return;
					if ( innerName === 'ToolsPanel' ) {
						hasToolsPanel = true;
					}
					if ( CONTROL_NAME_RE.test( innerName ) ) {
						controlCount++;
					}
				},
			} );

			const line = opening.loc ? opening.loc.start.line : 0;
			panelBodies.push( { line, controlCount, hasToolsPanel } );
		},
	} );

	return {
		colourNoAlpha,
		rawUrlLinks,
		mediaUploadUsed,
		mediaUploadCheckUsed,
		shadowSelects,
		panelBodies,
	};
}

// ---------------------------------------------------------------------------
// EXCEPTION-FILE APPLICATION
// ---------------------------------------------------------------------------

function exceptionFor( baseline, blockSlug, ruleKey ) {
	const forBlock = baseline[ blockSlug ];
	if ( ! forBlock ) return null;
	return forBlock[ ruleKey ] || null;
}

function pushFinding( findings, baseline, { block, rule, severity, detail } ) {
	const exc = exceptionFor( baseline, block, rule );
	findings.push( {
		block,
		rule,
		severity,
		detail,
		status: exc ? 'EXCEPTION' : 'FLAGGED',
		reason: exc ? exc.reason : undefined,
	} );
}

// ---------------------------------------------------------------------------
// PER-BLOCK ANALYSIS
// ---------------------------------------------------------------------------

function analyseBlock( block, baseline, findings, unparseable ) {
	const dirName = block.slug.split( '/' )[ 1 ];
	const blockDir = path.join( BLOCKS_DIR, dirName );
	const editJsPath = path.join( blockDir, 'edit.js' );

	if ( ! fs.existsSync( editJsPath ) ) {
		return false; // no source edit.js — out of scope for this audit
	}

	const relFile = path.relative( ROOT, editJsPath );
	const src = readIfExists( editJsPath );

	let scan;
	try {
		scan = scanEditJs( src, relFile );
	} catch ( e ) {
		unparseable.push( { block: block.slug, file: relFile, error: e.message } );
		scan = null;
	}

	if ( scan ) {
		// Rule 1 — colour-no-alpha.
		for ( const f of scan.colourNoAlpha ) {
			pushFinding( findings, baseline, {
				block: block.slug,
				rule: 'colour-no-alpha',
				severity: 'warn',
				detail: `${ relFile }:${ f.line } — <${ f.component }> with no \`enableAlpha\` attribute`,
			} );
		}

		// Rule 2 — raw-url-link.
		for ( const f of scan.rawUrlLinks ) {
			pushFinding( findings, baseline, {
				block: block.slug,
				rule: 'raw-url-link',
				severity: 'warn',
				detail: `${ relFile }:${ f.line } — <TextControl type="url"> should be SgsLinkControl`,
			} );
		}

		// Rule 3 — media-upload-no-check.
		if ( scan.mediaUploadUsed && ! scan.mediaUploadCheckUsed ) {
			pushFinding( findings, baseline, {
				block: block.slug,
				rule: 'media-upload-no-check',
				severity: 'warn',
				detail: `${ relFile } — <MediaUpload> used with no <MediaUploadCheck> capability gate anywhere in file`,
			} );
		}

		// Rule 4 — preset-only-shadow (informational).
		for ( const f of scan.shadowSelects ) {
			pushFinding( findings, baseline, {
				block: block.slug,
				rule: 'preset-only-shadow',
				severity: 'informational',
				detail: `${ relFile }:${ f.line } — <SelectControl label="${ f.label }"> — likely a preset select; consider the shared ShadowControl real builder`,
			} );
		}

		// Rule 6 — dense-panel-candidate (informational, coarse).
		for ( const p of scan.panelBodies ) {
			if ( p.controlCount > 6 && ! p.hasToolsPanel ) {
				pushFinding( findings, baseline, {
					block: block.slug,
					rule: 'dense-panel-candidate',
					severity: 'informational',
					detail: `${ relFile }:${ p.line } — PanelBody with ~${ p.controlCount } control-like elements and no ToolsPanel progressive disclosure`,
				} );
			}
		}
	}

	// Rule 5 — animation-no-reduced-motion (not AST-driven — text search over
	// style.css/view.js). Independent of edit.js parse success.
	if ( block.surfaces && block.surfaces.animation ) {
		const styleCss = readIfExists( path.join( blockDir, 'style.css' ) );
		const viewJs = readIfExists( path.join( blockDir, 'view.js' ) );
		const hasOwnGate = styleCss.includes( 'prefers-reduced-motion' ) || viewJs.includes( 'prefers-reduced-motion' );
		if ( ! hasOwnGate && ! hasFrameworkWideReducedMotionGate() ) {
			pushFinding( findings, baseline, {
				block: block.slug,
				rule: 'animation-no-reduced-motion',
				severity: 'warn',
				detail: `${ dirName }/style.css and ${ dirName }/view.js — neither contains \`prefers-reduced-motion\`, and no framework-wide reduced-motion gate was found unconditionally enqueued from theme/sgs-theme/functions.php (WCAG 2.3.3 gate missing)`,
			} );
		}
	}

	return true;
}

// ---------------------------------------------------------------------------
// REPORT GENERATION
// ---------------------------------------------------------------------------

function buildMeta( results, findings, unparseable ) {
	const flagged = findings.filter( ( f ) => f.status === 'FLAGGED' );
	const perRule = {};
	for ( const f of flagged ) {
		perRule[ f.rule ] = ( perRule[ f.rule ] || 0 ) + 1;
	}
	return {
		audit: 'inspector-conformance',
		warn_only: true,
		roster_count: results.rosterCount,
		blocks_scanned: results.scannedCount,
		blocks_skipped_no_edit_js: results.rosterCount - results.scannedCount,
		unparseable_count: unparseable.length,
		total_flagged: flagged.length,
		total_exceptions: findings.length - flagged.length,
		per_rule_totals: perRule,
		framework_wide_reduced_motion_gate_detected: hasFrameworkWideReducedMotionGate(),
	};
}

function printHuman( meta, findings, unparseable ) {
	process.stdout.write( '[audit-inspector-conformance] Spec 35 UNIT A — static inspector-conformance audit (WARN-ONLY)\n\n' );
	process.stdout.write( `Roster: ${ meta.roster_count } blocks | scanned (has edit.js): ${ meta.blocks_scanned } | skipped (no edit.js): ${ meta.blocks_skipped_no_edit_js }\n` );
	process.stdout.write( `Unparseable edit.js files: ${ meta.unparseable_count }\n` );
	process.stdout.write( `Framework-wide reduced-motion gate detected (theme/sgs-theme functions.php + CSS): ${ meta.framework_wide_reduced_motion_gate_detected ? 'YES — rule 5 skips blocks that rely on it' : 'NO — rule 5 flags every animating block with no own gate' }\n` );
	process.stdout.write( `Total FLAGGED findings: ${ meta.total_flagged } | total EXCEPTIONS suppressed: ${ meta.total_exceptions }\n\n` );

	process.stdout.write( 'Per-rule totals (FLAGGED only):\n' );
	const ruleKeys = Object.keys( meta.per_rule_totals ).sort();
	if ( ruleKeys.length === 0 ) {
		process.stdout.write( '  (none)\n' );
	} else {
		for ( const k of ruleKeys ) {
			process.stdout.write( `  ${ k }: ${ meta.per_rule_totals[ k ] }\n` );
		}
	}
	process.stdout.write( '\n' );

	if ( unparseable.length ) {
		process.stdout.write( 'Unparseable files:\n' );
		for ( const u of unparseable ) {
			process.stdout.write( `  X  ${ u.block } — ${ u.file } — ${ u.error }\n` );
		}
		process.stdout.write( '\n' );
	}

	const byBlock = {};
	for ( const f of findings ) {
		if ( ! byBlock[ f.block ] ) byBlock[ f.block ] = [];
		byBlock[ f.block ].push( f );
	}

	process.stdout.write( 'Per-block findings:\n' );
	const blockSlugs = Object.keys( byBlock ).sort();
	if ( blockSlugs.length === 0 ) {
		process.stdout.write( '  (none)\n' );
		return;
	}
	for ( const slug of blockSlugs ) {
		process.stdout.write( `\n${ slug }\n` );
		for ( const f of byBlock[ slug ] ) {
			const tag = f.status === 'EXCEPTION' ? 'EXC' : ( f.severity === 'informational' ? 'INFO' : 'WARN' );
			process.stdout.write( `  [${ tag }] ${ f.rule } — ${ f.detail }\n` );
			if ( f.status === 'EXCEPTION' && f.reason ) {
				process.stdout.write( `        reason: ${ f.reason }\n` );
			}
		}
	}
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	const roster = loadJson( ROSTER_PATH, null );
	if ( ! roster || ! Array.isArray( roster.blocks ) ) {
		process.stderr.write( '[audit-inspector-conformance] roster.json missing or invalid — run scripts/consistency/build-roster.py first.\n' );
		// In --check (hard-gate) mode a missing roster must FAIL, not pass
		// vacuously — a gate whose input vanished has verified nothing.
		process.exitCode = process.argv.includes( '--check' ) ? 1 : 0;
		return;
	}

	const baseline = loadJson( BASELINE_PATH, {} );

	const findings = [];
	const unparseable = [];
	let scannedCount = 0;

	for ( const block of roster.blocks ) {
		const scanned = analyseBlock( block, baseline, findings, unparseable );
		if ( scanned ) scannedCount++;
	}

	const results = { rosterCount: roster.blocks.length, scannedCount };
	const meta = buildMeta( results, findings, unparseable );

	if ( process.argv.includes( '--json' ) ) {
		process.stdout.write( JSON.stringify( { _meta: meta, findings, unparseable }, null, 2 ) + '\n' );
	} else {
		printHuman( meta, findings, unparseable );
	}

	// --check = the promoted HARD GATE (Spec 35 T5.1, Gate 3 — promoted
	// 2026-07-28 once the WARN count reached 0 with all deliberate exemptions
	// registered in inspector-conformance-baseline.json). Fails the build on
	// any non-exempt WARN-severity finding. INFO-severity findings (dense-panel
	// candidates, advisory preset notes) never gate — they are Part-J roadmap
	// signals, not defects. Without --check the script stays observational.
	if ( process.argv.includes( '--check' ) ) {
		const gating = findings.filter(
			( f ) => 'warn' === f.severity && 'EXCEPTION' !== f.status
		);
		if ( gating.length > 0 ) {
			process.stderr.write(
				`\n[audit-inspector-conformance --check] FAIL — ${ gating.length } WARN-severity finding(s). ` +
					'Fix the control (see rules in the header docblock) or register a REASONED exemption in ' +
					'scripts/inspector-conformance-baseline.json — never silence a finding without a reason.\n'
			);
			process.exitCode = 1;
			return;
		}
		process.stdout.write( '\n[audit-inspector-conformance --check] PASS — 0 WARN-severity findings (exemptions + INFO advisories excluded by design).\n' );
		process.exitCode = 0;
		return;
	}

	// Observational mode: always exits 0.
	process.exitCode = 0;
}

main();
