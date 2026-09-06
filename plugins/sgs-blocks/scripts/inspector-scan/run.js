#!/usr/bin/env node
'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md
// source=spec evidence=this is the entry point described in §4.1/§4.6/§4.9 —
// CLI contract `default report | --check | --json`, mode table read from
// rules.json (never prose/code), and a generic --self-test harness that a
// rule cannot skip. WIRED INTO BOTH gate chains — `node scripts/inspector-scan/run.js
// --check` runs in package.json's `prebuild` chain AND in `.githooks/sgs-gates.sh`'s
// commit-time chain. Corrected 2026-08-24: this comment said "NOT wired into prebuild
// yet" after both wirings had already landed.

const fs = require( 'fs' );
const path = require( 'path' );

const { SourceCache } = require( './core/sources' );
const { reconcile, checkRosterFreshness, BLOCKS_DIR } = require( './core/roster' );
const { applyBaseline } = require( './core/baseline' );
const { makeFinding } = require( './core/finding' );
const { printHuman, printJson } = require( './core/report' );
const { testRule, runLiveInformational } = require( './core/selftest' );
const components = require( './core/components' );

const RULES_JSON_PATH = path.resolve( __dirname, 'rules.json' );
const RULES_DIR = path.resolve( __dirname, 'rules' );
const PATTERNS_DIR = path.resolve( __dirname, '..', '..', '..', '..', 'theme', 'sgs-theme', 'patterns' );
// GROUND-TRUTH: spec=plugins/sgs-blocks/scripts/audit-inspector-conformance.js:75-77
// source=file evidence=that script computes THEME_DIR as ROOT (sgs-blocks) ->
// '..'/'..' -> theme/sgs-theme; from inspector-scan/run.js the equivalent
// climb is 4 levels (inspector-scan -> scripts -> sgs-blocks -> plugins ->
// repo root), matching PATTERNS_DIR's existing climb above.
const THEME_DIR = path.resolve( __dirname, '..', '..', '..', '..', 'theme', 'sgs-theme' );
// GROUND-TRUTH: spec=task brief 2026-08-08 (extensionsDir plumbing) —
// src/blocks/extensions/ holds the six "universal extension" files that
// inject inspector controls into all blocks at runtime (see
// plugins/sgs-blocks/CLAUDE.md "Extensions" table: animation, responsive
// visibility, hover state, custom CSS, conditional visibility, image
// controls). core/roster.js only admits directories containing a
// block.json (~line 65 of core/roster.js), so extensions/ — which has none
// — is never in the roster and is structurally BLIND to every roster-keyed
// rule. This constant makes the surface reachable via ctx.extensionsDir;
// it does NOT add extensions to the roster denominator (they are a
// separate surface, not pseudo-blocks).
const EXTENSIONS_DIR = path.resolve( __dirname, '..', '..', 'src', 'blocks', 'extensions' );
// 0.5 (2026-08-18): src/components/*.js is the ONE corpus no rule could reach.
// rule 26's header declares this exact gap: "this rule does NOT scan
// src/components/*.js". Purely ADDITIVE plumbing, mirroring EXTENSIONS_DIR --
// no existing rule reads componentsDir, so no existing rule's corpus or count
// changes by adding it. A rule opts in by naming ctx.componentsDir.
const COMPONENTS_DIR = path.resolve( __dirname, '..', '..', 'src', 'components' );

// Repo root — reachable so a rule can assert on surfaces OUTSIDE the plugin
// (`.claude/specs`, `.claude/plans`) as well as inside it. Same ctx-supplied
// reasoning as themeDir and extensionsDir above: a rule that hardcoded an
// absolute real-repo path could never be exercised in isolation, and a gate
// that cannot fail reads green forever. Self-test points this inside its
// fixture temp dir instead (core/selftest.js).
const REPO_ROOT = path.resolve( __dirname, '..', '..', '..', '..' );

function loadRulesTable() {
	if ( ! fs.existsSync( RULES_JSON_PATH ) ) {
		throw new Error(
			`[inspector-scan] rules.json missing at ${ RULES_JSON_PATH } — the mode table is the single ` +
				'source of truth and cannot be inferred from code or prose (H12).'
		);
	}
	let table;
	try {
		table = JSON.parse( fs.readFileSync( RULES_JSON_PATH, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `[inspector-scan] rules.json is MALFORMED (${ e.message }) — refusing to run.` );
	}
	if ( ! Array.isArray( table.rules ) ) {
		throw new Error( "[inspector-scan] rules.json has no 'rules' array." );
	}
	for ( const r of table.rules ) {
		if ( ! [ 'gate', 'advisory', 'off' ].includes( r.mode ) ) {
			throw new Error( `[inspector-scan] rule "${ r.id }" has an unknown mode "${ r.mode }".` );
		}
		if ( r.mode === 'advisory' && ! r.advisoryReason ) {
			throw new Error(
				`[inspector-scan] rule "${ r.id }" is mode:advisory but has no advisoryReason — refusing ` +
					"to start (every advisory entry must carry a mandatory human reason, Bean-locked)."
			);
		}
		if ( r.mode === 'off' && ! r.offReason ) {
			throw new Error( `[inspector-scan] rule "${ r.id }" is mode:off but has no offReason — refusing to start.` );
		}
	}

	// Inverse of H7: a rule file on disk not listed in rules.json will never
	// run and must itself be reported, not silently ignored.
	const registeredFiles = new Set( table.rules.map( ( r ) => r.file ).filter( Boolean ) );
	const onDiskRuleFiles = fs.existsSync( RULES_DIR )
		? fs
				.readdirSync( RULES_DIR )
				.filter( ( f ) => f.endsWith( '.js' ) )
				.map( ( f ) => `rules/${ f }` )
		: [];
	const unregistered = onDiskRuleFiles.filter( ( f ) => ! registeredFiles.has( f ) );

	return { table, unregistered };
}

function loadRule( ruleDef ) {
	const mod = require( path.resolve( __dirname, ruleDef.file ) );
	if ( ! mod.selfTest ) {
		throw new Error(
			`[inspector-scan] rule "${ ruleDef.id }" has no 'selfTest' block — a rule cannot be registered without one.`
		);
	}
	return mod;
}

function buildCtx( cache, rosterInfo ) {
	return {
		cache,
		roster: rosterInfo,
		blocksDir: BLOCKS_DIR,
		patternsDir: PATTERNS_DIR,
		themeDir: THEME_DIR,
		extensionsDir: EXTENSIONS_DIR,
		componentsDir: COMPONENTS_DIR,
		repoRoot: REPO_ROOT,
		components: components.discover( cache ), // resolved once per run, not per rule/block
		ast: ( f ) => cache.parse( f ),
		text: ( f ) => cache.text( f ),
		stripped: ( f ) => cache.strippedText( f ),
		json: ( f ) => cache.json( f ),
	};
}

function runAllRules( table, ctx ) {
	const results = [];
	for ( const ruleDef of table.rules ) {
		if ( ruleDef.file === null ) continue; // meta rules (roster-drift/parse-error) handled separately
		if ( ruleDef.mode === 'off' ) {
			results.push( { ruleDef, findings: [], skipped: true } );
			continue;
		}
		let findings = [];
		let runError = null;
		try {
			const mod = loadRule( ruleDef );
			if ( mod.scope === 'per-block' ) {
				for ( const entry of ctx.roster.entries ) {
					if ( ! entry.onDisk ) continue;
					findings = findings.concat( mod.run( ctx, entry ) || [] );
				}
			} else {
				findings = mod.run( ctx ) || [];
			}
			findings = findings.map( ( f ) => ( { ...f, rule: ruleDef.id, checklistItem: ruleDef.checklistItem } ) );
		} catch ( e ) {
			runError = e.message;
		}
		findings = applyBaseline( ruleDef.id, findings );
		results.push( { ruleDef, findings, runError } );
	}
	return results;
}

function modeOf( table, id ) {
	const r = table.rules.find( ( x ) => x.id === id );
	return r ? r.mode : 'advisory';
}

function computeExit( table, results, driftFindings, parseErrorFindings, registryDriftFindings ) {
	let failing = false;
	for ( const r of results ) {
		if ( r.ruleDef.mode !== 'gate' ) continue;
		if ( r.runError ) {
			failing = true;
			continue;
		}
		if ( r.findings.some( ( f ) => f.status === 'FLAGGED' ) ) failing = true;
	}
	if ( modeOf( table, 'roster-drift' ) === 'gate' && driftFindings.length ) failing = true;
	if ( modeOf( table, 'parse-error' ) === 'gate' && parseErrorFindings.length ) failing = true;
	if ( registryDriftFindings.length ) failing = true; // scanner self-integrity — always enforced

	// ------------------------------------------------------------------
	// 0.6 ADVISORY RATCHET (2026-08-18). An advisory rule never gates on
	// its absolute count, but its debt may only go DOWN. Freezing today's
	// measured figure turns a silent backlog into a floor: rule 21 grew
	// 129 -> 259 unnoticed precisely because nothing compared them.
	// `openBacklog` was already carried on 19 rule entries and read by
	// NOTHING before this.
	// ------------------------------------------------------------------
	for ( const r of results ) {
		if ( r.ruleDef.mode !== 'advisory' ) continue;
		if ( r.runError ) continue;
		const cap = r.ruleDef.openBacklog;
		if ( typeof cap !== 'number' ) {
			// An advisory rule with no declared backlog cannot be ratcheted, so
			// it would silently escape this check forever. Registration defect.
			console.error(
				`[inspector-scan] rule "${ r.ruleDef.id }" is advisory with no numeric openBacklog — cannot ratchet. Declare one in rules.json.`
			);
			failing = true;
			continue;
		}
		const flagged = r.findings.filter( ( f ) => f.status === 'FLAGGED' ).length;
		if ( flagged > cap ) {
			console.error(
				`[inspector-scan] RATCHET: rule "${ r.ruleDef.id }" has ${ flagged } finding(s), above its declared openBacklog of ${ cap }. Advisory debt may only go DOWN. Fix the new finding(s), or lower/raise the backlog deliberately in rules.json with a reason.`
			);
			failing = true;
		}
	}
	return failing ? 1 : 0;
}

function buildDriftAndParseFindings( cache, rosterInfo ) {
	const driftFindings = [];
	if ( ! rosterInfo.roster.ok ) {
		driftFindings.push(
			makeFinding( {
				rule: 'roster-drift',
				block: null,
				severity: 'error',
				detail: `roster.json could not be used: ${ rosterInfo.roster.reason }`,
				fix: 'Run: python scripts/consistency/build-roster.py',
				keyParts: [ 'roster-unusable' ],
			} )
		);
	}
	for ( const slug of rosterInfo.onDiskNotInRoster ) {
		driftFindings.push(
			makeFinding( {
				rule: 'roster-drift',
				block: slug,
				severity: 'error',
				detail: `${ slug } is on disk (src/blocks/${ slug }/block.json exists) but ABSENT from roster.json — no roster-keyed rule audits it.`,
				fix: 'Run: python scripts/consistency/build-roster.py',
				keyParts: [ 'on-disk-not-in-roster' ],
			} )
		);
	}
	for ( const slug of rosterInfo.inRosterNotOnDisk ) {
		driftFindings.push(
			makeFinding( {
				rule: 'roster-drift',
				block: slug,
				severity: 'warn',
				detail: `${ slug } is listed in roster.json but has no matching src/blocks directory with a block.json.`,
				fix: 'Regenerate the roster (python scripts/consistency/build-roster.py), or confirm the block was retired and remove its DB row.',
				keyParts: [ 'in-roster-not-on-disk' ],
			} )
		);
	}

	const parseErrorFindings = [];
	for ( const entry of rosterInfo.entries ) {
		if ( ! entry.onDisk ) continue;
		const editFile = path.join( BLOCKS_DIR, entry.tail, 'edit.js' );
		if ( ! fs.existsSync( editFile ) ) continue;
		const parsed = cache.parse( editFile );
		if ( ! parsed.ok ) {
			parseErrorFindings.push(
				makeFinding( {
					rule: 'parse-error',
					block: entry.slug,
					file: editFile,
					severity: 'error',
					detail: `edit.js failed to parse: ${ parsed.error }`,
					fix: `Fix the syntax error in ${ editFile }, or if this is a deliberate non-standard construct, extend BABEL_PARSE_OPTS in core/sources.js.`,
					keyParts: [ 'parse-error' ],
				} )
			);
		}
	}

	return { driftFindings, parseErrorFindings };
}

function selfTestMain( ruleIdArg ) {
	const { table } = loadRulesTable();
	const targets = ruleIdArg ? table.rules.filter( ( r ) => r.id === ruleIdArg ) : table.rules;
	if ( ruleIdArg && targets.length === 0 ) {
		console.error( `[inspector-scan] no rule "${ ruleIdArg }" found in rules.json` );
		return 2;
	}

	let anyFail = false;
	const cache = new SourceCache();
	const realCtxFactory = () => buildCtx( cache, reconcile() );

	for ( const ruleDef of targets ) {
		if ( ruleDef.file === null ) continue; // roster-drift/parse-error are meta rules, not pluggable modules
		let mod;
		try {
			mod = require( path.resolve( __dirname, ruleDef.file ) );
		} catch ( e ) {
			console.log( `RULE ${ ruleDef.id } — FAIL (could not load module: ${ e.message })` );
			anyFail = true;
			continue;
		}
		const result = testRule( ruleDef, mod );
		const liveCount = runLiveInformational( mod, realCtxFactory() );
		if ( result.pass ) {
			console.log(
				`RULE ${ ruleDef.id } — PASS  (live scan, informational: ${ liveCount === null ? 'error running against real tree' : liveCount + ' finding(s)' })`
			);
		} else {
			anyFail = true;
			console.log( `RULE ${ ruleDef.id } — FAIL` );
			for ( const f of result.failures ) console.log( `  - ${ f }` );
		}
	}

	if ( ! ruleIdArg ) {
		const metaPath = path.resolve( __dirname, 'fixtures', '_harness', 'always-passes-rule.js' );
		if ( fs.existsSync( metaPath ) ) {
			const metaMod = require( metaPath );
			const metaResult = testRule( { id: metaMod.id }, metaMod );
			if ( metaResult.pass ) {
				console.log(
					'HARNESS META-CHECK — FAIL: a rule that never flags anything was reported PASS by the harness. ' +
						'The harness itself cannot fail. This is fatal — the self-test protocol is broken.'
				);
				anyFail = true;
			} else {
				console.log(
					'HARNESS META-CHECK — PASS: the deliberately-broken meta-rule was correctly caught as FAILING.'
				);
			}
		} else {
			console.log( 'HARNESS META-CHECK — FAIL: fixtures/_harness/always-passes-rule.js is missing.' );
			anyFail = true;
		}
	}

	return anyFail ? 1 : 0;
}

function main() {
	const args = process.argv.slice( 2 );
	const isCheck = args.includes( '--check' );
	const isJson = args.includes( '--json' );
	const isModes = args.includes( '--modes' );
	const selfTestIdx = args.indexOf( '--self-test' );

	if ( selfTestIdx !== -1 ) {
		const next = args[ selfTestIdx + 1 ];
		const ruleId = next && ! next.startsWith( '--' ) ? next : null;
		process.exit( selfTestMain( ruleId ) );
		return;
	}

	const { table, unregistered } = loadRulesTable();

	if ( isModes ) {
		console.log( `MODE TABLE (${ table.rules.length } rules)` );
		for ( const r of table.rules ) {
			const note = r.mode === 'advisory' ? r.advisoryReason : r.mode === 'off' ? r.offReason : '';
			console.log( `${ r.id.padEnd( 28 ) } [${ r.mode.toUpperCase() }]  ${ note }` );
		}
		process.exit( 0 );
		return;
	}

	// Roster-freshness gate — this is the standalone entry point that bypasses `prebuild`'s
	// own fresh `build-roster.py` regeneration (see core/roster.js `checkRosterFreshness`
	// for the incident history: D523 + the 2026-07-30 18-block false-positive). A stale
	// roster.json here is not a scanner finding to report gracefully alongside everything
	// else — it invalidates the denominator every rule below depends on, so fail loud and
	// fail first, before spending time computing findings against data that may be wrong.
	const freshness = checkRosterFreshness();
	if ( ! freshness.fresh ) {
		console.error( freshness.message );
		process.exit( 1 );
	}

	const cache = new SourceCache();
	const rosterInfo = reconcile();
	const { driftFindings, parseErrorFindings } = buildDriftAndParseFindings( cache, rosterInfo );

	const registryDriftFindings = unregistered.map( ( f ) =>
		makeFinding( {
			rule: 'registry-drift',
			block: null,
			severity: 'error',
			detail: `rule file ${ f } exists on disk under rules/ but is not listed in rules.json — it will never run.`,
			fix: `Add an entry for ${ f } to inspector-scan/rules.json (mode + reason), or delete the file if it is abandoned.`,
			keyParts: [ f ],
		} )
	);

	const ctx = buildCtx( cache, rosterInfo );
	const results = runAllRules( table, ctx );
	const stats = cache.stats();

	if ( isJson ) {
		printJson( {
			table,
			results,
			driftFindings: driftFindings.concat( registryDriftFindings ),
			parseErrorFindings,
			rosterInfo,
			stats,
		} );
	} else {
		printHuman( {
			table,
			results,
			driftFindings: driftFindings.concat( registryDriftFindings ),
			parseErrorFindings,
			rosterInfo,
			stats,
		} );
	}

	if ( isCheck ) {
		process.exit( computeExit( table, results, driftFindings, parseErrorFindings, registryDriftFindings ) );
	}
}

main();
