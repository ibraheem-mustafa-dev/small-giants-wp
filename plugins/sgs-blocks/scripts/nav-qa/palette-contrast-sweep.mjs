/**
 * palette-contrast-sweep.mjs — cross-palette contrast gate for design-time
 * drafts (mega-menu panels and any other self-contained SGS-BEM draft).
 *
 * WHY THIS EXISTS
 * ---------------
 * Starter panels are token-driven: a panel declares `--primary` / `--surface`
 * / `--text` in its own `:root`, and at build time those values are replaced
 * by the CLIENT's brand tokens so the panel adopts their look (Bean's ruling,
 * 2026-07-21 — it dissolves the "register A vs register B" question).
 *
 * Inheritance makes a panel adapt to the brand. It does NOT make the panel
 * LEGIBLE in the brand. Those are different guarantees, and one client already
 * breaks the second: `--primary-dark` is a dusty pink (#c56a7a) on
 * mamas-munches, where white text measures 3.67:1 against a 4.5:1 minimum.
 * Seven of eight clients pass. A by-eye check on the draft's own palette would
 * never surface it — which is exactly how it would ship.
 *
 * So every panel is rendered once per client palette and measured.
 *
 * WHY axe-core AND NOT A CSS PAIRING ANALYSER
 * -------------------------------------------
 * Rule 4a (Spec 20): compare EFFECTIVE COMPUTED values on the rendered
 * element, never source declarations. A static analyser that pairs the `color`
 * and `background` in the same CSS rule is blind to INHERITED colour — and
 * inherited text colour on a nested panel element is precisely where these
 * drafts fail. axe-core walks the real cascade, resolves the effective
 * background through ancestors, and applies the correct large-text threshold
 * (3:1 at >=18pt or >=14pt bold). Reimplementing that would be a worse copy of
 * a solved problem.
 *
 * WHY NOT JUST EXTEND axe-run.mjs
 * -------------------------------
 * axe-run.mjs is the LIVE-SITE Gate-1 tool (Spec 36 FR-36-16): one URL, one
 * run, opens a drawer first. This is a different job — local files, no
 * interaction, one browser reused across 88 combinations. It deliberately
 * shares axe-run.mjs's local pinned axe-core copy rather than a second one, so
 * there is exactly one axe version in play.
 *
 * Usage
 * -----
 *   node palette-contrast-sweep.mjs <draft-glob-dir> [--snapshots <dir>]
 *                                   [--json] [--client <slug>] [--draft <name>]
 *
 * Examples
 * --------
 *   # Sweep every mega-menu draft against every client palette
 *   node palette-contrast-sweep.mjs ../../../../.claude/drafts/mega-menu
 *
 *   # One client only, while fixing
 *   node palette-contrast-sweep.mjs ../../../../.claude/drafts/mega-menu --client mamas-munches
 *
 * Exit codes
 * ----------
 *   0 — every draft passes on every client palette
 *   1 — at least one contrast failure (report printed)
 *   2 — bad arguments, missing axe-core, or no drafts/snapshots found
 *
 * SELF-TEST
 * ---------
 *   node palette-contrast-sweep.mjs --self-test
 * Renders a known-good and a known-bad fixture and asserts the gate passes the
 * first and FAILS the second. Without the failing half a green run proves
 * nothing: a check that cannot fail when the fault is present is worse than no
 * check (STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS).
 */

'use strict';

import { chromium } from 'playwright';
import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

// Same local pinned axe-core copy axe-run.mjs uses — one version in play.
const LOCAL_AXE_PATH = path.resolve(
	__dirname,
	'../../node_modules/axe-core/axe.min.js'
);

const REPO_ROOT = path.resolve( __dirname, '../../../..' );
const DEFAULT_SNAPSHOT_DIR = path.join( REPO_ROOT, 'sites' );

// Viewports a mega panel must be legible at. Contrast itself is
// viewport-independent, but the LARGE-TEXT threshold is not: a heading that
// shrinks below 18pt on mobile moves from the 3:1 bar to the 4.5:1 bar.
const VIEWPORTS = [ 1440, 375 ];

function parseArgs( argv ) {
	const args = {
		draftDir: null,
		snapshotDir: DEFAULT_SNAPSHOT_DIR,
		json: false,
		client: null,
		draft: null,
		selfTest: false,
	};
	const rest = [ ...argv ];
	if ( rest[ 0 ] && ! rest[ 0 ].startsWith( '--' ) ) {
		args.draftDir = rest.shift();
	}
	while ( rest.length ) {
		const flag = rest.shift();
		if ( flag === '--snapshots' ) args.snapshotDir = rest.shift();
		else if ( flag === '--client' ) args.client = rest.shift();
		else if ( flag === '--draft' ) args.draft = rest.shift();
		else if ( flag === '--json' ) args.json = true;
		else if ( flag === '--self-test' ) args.selfTest = true;
		else {
			process.stderr.write(
				`palette-contrast-sweep: unrecognised argument "${ flag }"\n`
			);
			process.exit( 2 );
		}
	}
	return args;
}

/**
 * Read a client theme-snapshot.json and return {slug: hex} for its palette.
 * Snapshots vary in shape — some wrap in `settings`, some do not.
 */
function loadPalette( snapshotPath ) {
	const raw = JSON.parse( readFileSync( snapshotPath, 'utf8' ) );
	const settings = raw.settings || raw;
	const palette = settings?.color?.palette || [];
	const out = {};
	for ( const entry of palette ) {
		if ( entry?.slug && typeof entry.color === 'string' ) {
			out[ entry.slug ] = entry.color;
		}
	}
	return out;
}

function discoverClients( snapshotDir, only ) {
	if ( ! existsSync( snapshotDir ) ) return [];
	const clients = [];
	for ( const name of readdirSync( snapshotDir ) ) {
		const file = path.join( snapshotDir, name, 'theme-snapshot.json' );
		if ( ! existsSync( file ) ) continue;
		if ( only && name !== only ) continue;
		const palette = loadPalette( file );
		if ( Object.keys( palette ).length ) clients.push( { slug: name, palette } );
	}
	return clients;
}

function discoverDrafts( draftDir, only ) {
	if ( ! existsSync( draftDir ) ) return [];
	return readdirSync( draftDir )
		.filter( ( f ) => f.toLowerCase().endsWith( '.html' ) )
		.filter( ( f ) => ! only || f === only || f === `${ only }.html` )
		.map( ( f ) => path.join( draftDir, f ) );
}

/**
 * Build the override stylesheet that repoints a draft's own tokens at a
 * client's brand values.
 *
 * Only names the draft ACTUALLY declares are overridden, and only where the
 * client supplies a same-named token. A draft token with no client equivalent
 * keeps the draft's value — that is a real gap worth reporting, not something
 * to paper over with a guessed colour.
 */
function buildOverrideCss( draftHtml, palette ) {
	const declared = new Set(
		[ ...draftHtml.matchAll( /(--[A-Za-z0-9_-]+)\s*:/g ) ].map( ( m ) => m[ 1 ] )
	);
	const applied = [];
	const unmatched = [];
	for ( const name of declared ) {
		const slug = name.replace( /^--/, '' );
		if ( Object.prototype.hasOwnProperty.call( palette, slug ) ) {
			applied.push( `${ name }: ${ palette[ slug ] };` );
		} else if ( /colour|color|primary|accent|surface|text|border|bg/i.test( slug ) ) {
			unmatched.push( name );
		}
	}
	return {
		css: applied.length ? `:root{${ applied.join( '' ) }}` : '',
		appliedCount: applied.length,
		unmatched,
	};
}

async function runAxeOnPage( page, axeSource ) {
	await page.addScriptTag( { content: axeSource } );
	return page.evaluate( async () => {
		// Contrast only — this gate owns contrast. Structural a11y for the
		// built blocks is axe-run.mjs's job on the live page, and duplicating
		// it here would produce two sources of truth for the same finding.
		const results = await window.axe.run( document, {
			runOnly: { type: 'rule', values: [ 'color-contrast' ] },
			resultTypes: [ 'violations' ],
		} );
		return results.violations.flatMap( ( v ) =>
			v.nodes.map( ( n ) => ( {
				impact: n.impact,
				target: Array.isArray( n.target ) ? n.target.join( ' ' ) : String( n.target ),
				message: ( n.any && n.any[ 0 ] && n.any[ 0 ].message ) || v.help,
				html: ( n.html || '' ).slice( 0, 120 ),
			} ) )
		);
	} );
}

async function sweep( { drafts, clients, axeSource, viewports } ) {
	const browser = await chromium.launch();
	const findings = [];
	let combinations = 0;
	const gaps = new Map();

	try {
		for ( const draftPath of drafts ) {
			const draftHtml = readFileSync( draftPath, 'utf8' );
			const draftName = path.basename( draftPath );

			for ( const client of clients ) {
				const { css, unmatched } = buildOverrideCss( draftHtml, client.palette );
				// Record the gap per (draft, token) with the SET of clients
				// missing it. Unioning across clients and calling the result
				// "no client supplies this" would be false whenever even one
				// client does — `--text` is missing on 5 of 8 snapshots and
				// present on 3, and the union phrasing reported it as absent
				// everywhere.
				for ( const name of unmatched ) {
					const key = `${ draftName } ${ name }`;
					const prev = gaps.get( key ) || new Set();
					prev.add( client.slug );
					gaps.set( key, prev );
				}

				for ( const width of viewports ) {
					const page = await browser.newPage( {
						viewport: { width, height: 900 },
					} );
					try {
						await page.goto( pathToFileURL( draftPath ).href, {
							waitUntil: 'load',
						} );
						if ( css ) {
							await page.addStyleTag( { content: css } );
						}
						// Let any transition settle before measuring — an
						// unsettled colour reads as a false value
						// (STOP-MEASUREMENT-VS-EYE).
						await page.waitForTimeout( 250 );

						const violations = await runAxeOnPage( page, axeSource );
						combinations++;
						for ( const v of violations ) {
							findings.push( {
								draft: draftName,
								client: client.slug,
								viewport: width,
								...v,
							} );
						}
					} finally {
						await page.close();
					}
				}
			}
		}
	} finally {
		await browser.close();
	}

	return { findings, combinations, gaps };
}

function report( { findings, combinations, gaps }, json ) {
	if ( json ) {
		process.stdout.write(
			JSON.stringify(
				{
					combinations_tested: combinations,
					failure_count: findings.length,
					passed: findings.length === 0,
					findings,
					unmapped_tokens: Object.fromEntries(
						[ ...gaps ].map( ( [ k, v ] ) => [ k, [ ...v ] ] )
					),
				},
				null,
				2
			) + '\n'
		);
		return;
	}

	const lines = [];
	lines.push(
		'='.repeat( 72 ),
		'  Cross-palette contrast sweep — drafts x client brand palettes',
		'='.repeat( 72 ),
		''
	);

	if ( gaps.size ) {
		lines.push(
			'Token-coverage gaps — a draft declares the token but SOME clients do',
			'not supply it, so on those clients it keeps the draft value and does',
			'NOT rebrand. Fix by adding the slug to those theme-snapshot.json files.'
		);
		// Collapse to token -> clients; the same gap repeats across drafts and
		// listing it per draft buries the actual signal (which SNAPSHOTS are
		// incomplete).
		const byToken = new Map();
		for ( const [ key, clientSet ] of gaps ) {
			const token = key.slice( key.indexOf( ' ' ) + 1 );
			const prev = byToken.get( token ) || new Set();
			clientSet.forEach( ( c ) => prev.add( c ) );
			byToken.set( token, prev );
		}
		for ( const [ token, clientSet ] of byToken ) {
			const list = [ ...clientSet ].sort();
			lines.push(
				`  ${ token }  — missing on ${ list.length } client(s): ${ list.join( ', ' ) }`
			);
		}
		lines.push( '' );
	}

	if ( ! findings.length ) {
		lines.push(
			`PASS — ${ combinations } draft x client x viewport combination(s), 0 contrast failures.`
		);
		process.stdout.write( lines.join( '\n' ) + '\n' );
		return;
	}

	// Group by draft+client so a fix has one obvious address.
	const grouped = new Map();
	for ( const f of findings ) {
		const key = `${ f.draft }  ->  ${ f.client }`;
		if ( ! grouped.has( key ) ) grouped.set( key, [] );
		grouped.get( key ).push( f );
	}

	for ( const [ key, group ] of grouped ) {
		lines.push( `${ key }  (${ group.length } failure(s))` );
		for ( const f of group ) {
			lines.push( `    [${ f.viewport }px] ${ f.target }` );
			lines.push( `        ${ f.message }` );
		}
		lines.push( '' );
	}

	lines.push(
		`FAIL — ${ findings.length } contrast failure(s) across ` +
			`${ combinations } combination(s), in ${ grouped.size } draft/client pairing(s).`
	);
	process.stdout.write( lines.join( '\n' ) + '\n' );
}

// ---------------------------------------------------------------------------
// Self-test — includes the negative control
// ---------------------------------------------------------------------------

const FIXTURE_GOOD = `<!doctype html><html><head><style>
:root{--surface:#FFFFFF;--text:#111111;}
body{margin:0}
.p{background:var(--surface);color:var(--text);font-size:16px;padding:20px}
</style></head><body><div class="p">Readable panel copy</div></body></html>`;

// Identical except the text token is a pale grey on white — ~1.6:1.
const FIXTURE_BAD = FIXTURE_GOOD.replace( '--text:#111111', '--text:#DDDDDD' );

async function runSelfTest( axeSource ) {
	const tmp = os.tmpdir();
	const goodPath = path.join( tmp, 'sgs-contrast-good.html' );
	const badPath = path.join( tmp, 'sgs-contrast-bad.html' );
	writeFileSync( goodPath, FIXTURE_GOOD, 'utf8' );
	writeFileSync( badPath, FIXTURE_BAD, 'utf8' );

	// No palette overrides — the fixtures carry their own values, so this
	// isolates the contrast engine from the token-substitution layer.
	const noClient = [ { slug: '<fixture>', palette: {} } ];
	const failures = [];

	try {
		const good = await sweep( {
			drafts: [ goodPath ],
			clients: noClient,
			axeSource,
			viewports: [ 1440 ],
		} );
		const goodOk = good.findings.length === 0;
		process.stdout.write(
			`  [${ goodOk ? 'PASS' : 'FAIL' }] Known-good fixture reports 0 failures\n`
		);
		if ( ! goodOk ) failures.push( 'good-fixture' );

		const bad = await sweep( {
			drafts: [ badPath ],
			clients: noClient,
			axeSource,
			viewports: [ 1440 ],
		} );
		const badOk = bad.findings.length > 0;
		process.stdout.write(
			`  [${ badOk ? 'PASS' : 'FAIL' }] NEGATIVE CONTROL — pale-grey-on-white fixture FAILS\n`
		);
		if ( ! badOk ) failures.push( 'bad-fixture-negative-control' );

		// The token-substitution layer needs its own control: overriding
		// --text to a failing value on the GOOD fixture must flip it to FAIL.
		const substituted = await sweep( {
			drafts: [ goodPath ],
			clients: [ { slug: '<bad-palette>', palette: { text: '#DDDDDD' } } ],
			axeSource,
			viewports: [ 1440 ],
		} );
		const subOk = substituted.findings.length > 0;
		process.stdout.write(
			`  [${ subOk ? 'PASS' : 'FAIL' }] NEGATIVE CONTROL — client palette substitution ` +
				`turns a passing draft into a failure\n`
		);
		if ( ! subOk ) failures.push( 'palette-substitution' );
	} finally {
		unlinkSync( goodPath );
		unlinkSync( badPath );
	}

	if ( failures.length ) {
		process.stdout.write( `\nFAIL — ${ failures.join( ', ' ) }\n` );
		return 1;
	}
	process.stdout.write( '\nAll self-tests passed.\n' );
	return 0;
}

// ---------------------------------------------------------------------------

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );

	if ( ! existsSync( LOCAL_AXE_PATH ) ) {
		process.stderr.write(
			`palette-contrast-sweep: axe-core not found at ${ LOCAL_AXE_PATH }.\n` +
				'Run `npm install` in plugins/sgs-blocks first.\n'
		);
		return 2;
	}
	const axeSource = readFileSync( LOCAL_AXE_PATH, 'utf8' );

	if ( args.selfTest ) {
		process.stdout.write( 'Running palette-contrast-sweep self-tests...\n\n' );
		return runSelfTest( axeSource );
	}

	if ( ! args.draftDir ) {
		process.stderr.write(
			'Usage: node palette-contrast-sweep.mjs <draft-dir> ' +
				'[--snapshots <dir>] [--client <slug>] [--draft <name>] [--json]\n' +
				'       node palette-contrast-sweep.mjs --self-test\n'
		);
		return 2;
	}

	const drafts = discoverDrafts( path.resolve( args.draftDir ), args.draft );
	if ( ! drafts.length ) {
		process.stderr.write(
			`palette-contrast-sweep: no .html drafts found in ${ args.draftDir }\n`
		);
		return 2;
	}

	const clients = discoverClients( path.resolve( args.snapshotDir ), args.client );
	if ( ! clients.length ) {
		process.stderr.write(
			`palette-contrast-sweep: no client theme-snapshot.json found under ` +
				`${ args.snapshotDir }\n`
		);
		return 2;
	}

	const result = await sweep( {
		drafts,
		clients,
		axeSource,
		viewports: VIEWPORTS,
	} );
	report( result, args.json );
	return result.findings.length ? 1 : 0;
}

main()
	.then( ( code ) => process.exit( code ) )
	.catch( ( err ) => {
		process.stderr.write( `palette-contrast-sweep: ${ err && err.stack ? err.stack : err }\n` );
		process.exit( 2 );
	} );
