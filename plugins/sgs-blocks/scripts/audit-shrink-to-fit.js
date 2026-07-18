/**
 * audit-shrink-to-fit.js — Spec 35 UNIT A: live-DOM shrink-to-fit audit.
 *
 * WHY LIVE (not static)
 * ----------------------
 * Whether a block is INTRINSICALLY responsive (min-content <= container at
 * every breakpoint) can only be proven by measuring the painted DOM at real
 * viewport widths — static CSS reading cannot see the resolved layout after
 * flex/grid resolution, slider/carousel JS, or content-driven min-widths.
 * The failure this catches: a block forcing its own container wider than the
 * viewport (e.g. the testimonial-slider forcing a 360px section to 894px —
 * memory `blocks-must-shrink-to-fit-container`). The framework `min-width:0`
 * grid/flex-item backstop (Spec 35 UNIT C) is NOT built yet, so this audit
 * measures the block's UNRESCUED intrinsic behaviour — exactly what the
 * Spec 35 T2 shrink-to-fit standard wants proven.
 *
 * WARN-ONLY — this script ALWAYS exits 0. It is not a build gate (it cannot
 * run at prebuild time — it needs a deployed, live page) and is not wired
 * into any CI failure path. Run on-demand / at Phase-4 close.
 *
 * WHAT IT DOES
 * ------------
 *  For each URL supplied:
 *    1. Launch headless Chromium.
 *    2. For each tier (default 375 / 768 / 1440):
 *       a. Set the viewport, navigate/reload the page.
 *       b. Assert `document.documentElement.scrollWidth <= window.innerWidth`
 *          (no page-level horizontal scroll) as a page-level finding.
 *       c. For every SGS block present on the page (matched by
 *          `.wp-block-sgs-<slug-without-sgs->` root class, derived from the
 *          roster — `scripts/consistency/roster.json`), measure:
 *            - self-overflow: element.scrollWidth > element.clientWidth
 *            - container-forcing: element.scrollWidth > parent.clientWidth
 *          A block instance not present on the page is skipped silently.
 *    3. Report every overflow finding (block, tier, element, widths).
 *
 * Usage
 * -----
 *   node scripts/audit-shrink-to-fit.js --url <live-page-url>
 *   node scripts/audit-shrink-to-fit.js --url <url> --block sgs/testimonial-slider
 *   node scripts/audit-shrink-to-fit.js --url <url> --tiers 375,768,1440
 *   node scripts/audit-shrink-to-fit.js --url <url> --json
 *   node scripts/audit-shrink-to-fit.js                       # prints usage, exits 0
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROSTER_PATH = path.resolve( __dirname, 'consistency/roster.json' );
const DEFAULT_TIERS = [ 375, 768, 1440 ];

function printUsage() {
	console.log( `
audit-shrink-to-fit.js — Spec 35 UNIT A live-DOM shrink-to-fit audit (WARN-ONLY, always exits 0)

This script needs a LIVE, deployed page to measure — it cannot run at prebuild time
(it predates deploy). Pass a reachable URL with --url.

Usage:
  node scripts/audit-shrink-to-fit.js --url <live-page-url> [options]

Options:
  --url <url>          Required to actually run. A live, publicly reachable page.
  --block <sgs/slug>    Scope the audit to a single block slug (repeatable, or comma-separated).
  --tiers <list>        Comma-separated viewport widths in px. Default: 375,768,1440
  --json                 Emit machine-readable JSON instead of the human report.

Examples:
  node scripts/audit-shrink-to-fit.js --url https://sandybrown-nightingale-600381.hostingersite.com/
  node scripts/audit-shrink-to-fit.js --url https://palestine-lives.org/some-page/ --block sgs/testimonial-slider
  node scripts/audit-shrink-to-fit.js --url https://palestine-lives.org/some-page/ --tiers 375,1440 --json
` );
}

function parseArgs( argv ) {
	const args = { url: null, blocks: [], tiers: DEFAULT_TIERS.slice(), json: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--url' ) {
			args.url = argv[ ++i ];
		} else if ( a === '--block' ) {
			args.blocks.push( ...argv[ ++i ].split( ',' ).map( ( s ) => s.trim() ).filter( Boolean ) );
		} else if ( a === '--tiers' ) {
			args.tiers = argv[ ++i ]
				.split( ',' )
				.map( ( s ) => parseInt( s.trim(), 10 ) )
				.filter( ( n ) => Number.isFinite( n ) && n > 0 );
		} else if ( a === '--json' ) {
			args.json = true;
		}
	}
	return args;
}

function loadRoster() {
	const raw = JSON.parse( fs.readFileSync( ROSTER_PATH, 'utf8' ) );
	return raw.blocks || [];
}

/**
 * Convert an SGS block slug (e.g. "sgs/testimonial-slider") into the CSS
 * class WordPress emits on the block wrapper: "wp-block-sgs-testimonial-slider".
 */
function slugToWrapperClass( slug ) {
	return 'wp-block-' + slug.replace( '/', '-' );
}

async function auditUrl( { chromium }, url, roster, tiers, jsonMode ) {
	const browser = await chromium.launch( { headless: true } );
	const findings = [];
	const pageFindings = [];
	let blocksChecked = new Set();

	try {
		const page = await browser.newPage();

		for ( const width of tiers ) {
			await page.setViewportSize( { width, height: 900 } );
			try {
				await page.goto( url, { waitUntil: 'networkidle', timeout: 30000 } );
			} catch ( err ) {
				// Fall back to a looser wait condition — some pages never reach
				// full networkidle (analytics beacons, live chat widgets, etc.).
				await page.goto( url, { waitUntil: 'load', timeout: 30000 } );
			}
			// Let any client-side layout (sliders, Interactivity API hydration) settle.
			await page.waitForTimeout( 500 );

			// Page-level assertion: no horizontal scroll caused by ANY element.
			const pageOverflow = await page.evaluate( () => {
				return {
					documentScrollWidth: document.documentElement.scrollWidth,
					innerWidth: window.innerWidth,
				};
			} );
			if ( pageOverflow.documentScrollWidth > pageOverflow.innerWidth ) {
				pageFindings.push( {
					tier: width,
					scrollWidth: pageOverflow.documentScrollWidth,
					innerWidth: pageOverflow.innerWidth,
					verdict: 'PAGE_HORIZONTAL_OVERFLOW',
				} );
			}

			// Per-block measurement.
			const result = await page.evaluate( ( wrapperClasses ) => {
				const out = [];
				for ( const { slug, wrapperClass } of wrapperClasses ) {
					const els = document.getElementsByClassName( wrapperClass );
					for ( let i = 0; i < els.length; i++ ) {
						const el = els[ i ];
						const parent = el.parentElement;
						const selfOverflow = el.scrollWidth > el.clientWidth + 1; // +1px rounding tolerance
						const containerWidth = parent ? parent.clientWidth : null;
						const forcesContainer =
							parent !== null && el.scrollWidth > containerWidth + 1;
						if ( selfOverflow || forcesContainer ) {
							out.push( {
								slug,
								instanceIndex: i,
								elementScrollWidth: el.scrollWidth,
								elementClientWidth: el.clientWidth,
								containerClientWidth: containerWidth,
								selfOverflow,
								forcesContainer,
							} );
						}
					}
				}
				return out;
			}, roster.map( ( b ) => ( { slug: b.slug, wrapperClass: slugToWrapperClass( b.slug ) } ) ) );

			// Track which roster blocks are actually present at this tier
			// (for the "blocks_checked" denominator — only count what rendered).
			const presence = await page.evaluate( ( wrapperClasses ) => {
				return wrapperClasses
					.filter( ( { wrapperClass } ) => document.getElementsByClassName( wrapperClass ).length > 0 )
					.map( ( { slug } ) => slug );
			}, roster.map( ( b ) => ( { slug: b.slug, wrapperClass: slugToWrapperClass( b.slug ) } ) ) );
			presence.forEach( ( s ) => blocksChecked.add( s ) );

			for ( const r of result ) {
				findings.push( {
					block: r.slug,
					tier: width,
					instanceIndex: r.instanceIndex,
					scrollWidth: r.elementScrollWidth,
					clientWidth: r.elementClientWidth,
					containerWidth: r.containerClientWidth,
					verdict: r.forcesContainer
						? 'FORCES_CONTAINER_WIDER'
						: 'SELF_OVERFLOW',
				} );
			}
		}
	} finally {
		await browser.close();
	}

	return { findings, pageFindings, blocksChecked: Array.from( blocksChecked ) };
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );

	if ( ! args.url ) {
		printUsage();
		console.log( 'No --url supplied — this audit needs a live, deployed page to measure. Exiting 0 (warn-only, nothing to check).' );
		process.exit( 0 );
	}

	let chromium;
	try {
		( { chromium } = require( 'playwright' ) );
	} catch ( err ) {
		console.error( 'Playwright is not installed in this environment (require("playwright") failed).' );
		console.error( 'Install with: npm install -D playwright && npx playwright install chromium' );
		console.error( String( err && err.message ? err.message : err ) );
		process.exit( 0 ); // warn-only — never fail the caller.
	}

	let roster = loadRoster();
	if ( args.blocks.length ) {
		roster = roster.filter( ( b ) => args.blocks.includes( b.slug ) );
		if ( ! roster.length ) {
			console.error( `--block filter matched nothing in the roster: ${ args.blocks.join( ', ' ) }` );
			process.exit( 0 );
		}
	}

	const tiers = args.tiers.length ? args.tiers : DEFAULT_TIERS;

	let result;
	try {
		result = await auditUrl( { chromium }, args.url, roster, tiers, args.json );
	} catch ( err ) {
		console.error( `Audit run failed for ${ args.url }: ${ String( err && err.message ? err.message : err ) }` );
		process.exit( 0 ); // warn-only.
	}

	const overflowCount = result.findings.length + result.pageFindings.length;

	const report = {
		_meta: {
			url: args.url,
			tiers,
			warn_only: true,
			blocks_checked: result.blocksChecked.sort(),
			overflow_count: overflowCount,
		},
		page_findings: result.pageFindings,
		findings: result.findings,
	};

	if ( args.json ) {
		console.log( JSON.stringify( report, null, 2 ) );
		process.exit( 0 );
	}

	console.log( `\nShrink-to-fit audit — ${ args.url }` );
	console.log( `Tiers: ${ tiers.join( 'px, ' ) }px` );
	console.log( `Blocks present + checked: ${ result.blocksChecked.length ? result.blocksChecked.join( ', ' ) : '(none of the roster blocks were found on this page)' }` );

	if ( ! overflowCount ) {
		console.log( '\nNo overflow detected — every checked block is intrinsically responsive at every tier, and the page has no horizontal scroll.' );
		process.exit( 0 );
	}

	if ( result.pageFindings.length ) {
		console.log( '\nPage-level horizontal overflow:' );
		for ( const f of result.pageFindings ) {
			console.log(
				`  [${ f.tier }px] document.scrollWidth=${ f.scrollWidth } > window.innerWidth=${ f.innerWidth } (${ f.verdict })`
			);
		}
	}

	if ( result.findings.length ) {
		console.log( '\nBlock-level overflow:' );
		for ( const f of result.findings ) {
			console.log(
				`  [${ f.tier }px] ${ f.block } (#${ f.instanceIndex }): scrollWidth=${ f.scrollWidth } clientWidth=${ f.clientWidth } containerWidth=${ f.containerWidth } — ${ f.verdict }`
			);
		}
	}

	console.log( `\nTotal overflow findings: ${ overflowCount } (WARN-ONLY — exiting 0)` );
	process.exit( 0 );
}

main().catch( ( err ) => {
	console.error( 'Unexpected error (warn-only, still exiting 0):', err );
	process.exit( 0 );
} );
