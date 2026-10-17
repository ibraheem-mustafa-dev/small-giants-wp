/**
 * Spec 38A unit M2.9: live acceptance of the motion model on a deployed site.
 *
 * WHAT IT MEASURES (one check per measurement; each has a negative control that reads a different element, arm or
 * state and must come out red, so a vacuous check cannot pass; a control that comes out not red fails the run):
 *   hover-transition-property, hover-duration-token, hover-lift-scale, hover-magnet-sum, hover-none-tap,
 *   focus-visible-parity, reveal-hidden-only-when-ready, js-blocked-visible, js-blocked-load-entrance,
 *   fade-plays-on-part-only, entrance-ends-translate-none, distance-token-resolves, lcp-first-section-opacity,
 *   load-later-fades, keyframes-three-with-delay, entrance-then-hover-lift, scroll-driver-progress (+ cross-engine),
 *   tilt-no-inline-transform, no-inline-style:<marker>, no-motion-assets, no-fx-stylesheet, reduced-no-movement, reduced-delays-zero,
 *   reduced-colour-hover, reduced-mid-session-switch.
 *
 * OUT OF SCOPE FOR M2 (listed with the unit that closes each):
 *   - Replay plays once (FR-38A-54): M3 (the Replay control and its editor wiring).
 *   - Editor canvas parity, the editor-iframe asset guard behaviour: M3.
 *   - Real-effect stacks (parallax, magnet and sheen layers together, scroll-progress effect, loops): M5.
 *   - Snapshot retune of `duration.fast` changing the computed hover duration, and editing a preset row leaving stored
 *     values unchanged (FR-38A-6): needs two snapshot states pushed by M1.5; `hover-duration-token` only proves the
 *     live duration equals the live token, which is the reading the retune check compares across states.
 *   - Renderer drop of an invalid value on a live page (FR-38A-2) and `post_content` holding no motion value outside
 *     the block comment: server-side reads (wp-cli), run by the main thread; the fixtures are schema-valid
 *     (`--validate-fixtures`).
 *   - `audit-inline-styling.js --check` and the axe run: separate commands, batched (they are not Playwright probes).
 *
 * FIXTURES: tests/fixtures/motion/pages/*.json, built with scripts/wp-build-page.js. Pages are found by marker class
 * (`.m29-*`), not by name, so any page ID built from a fixture works. A check whose marker is on none of the given
 * pages reports UNANSWERED, never PASS.
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-model.mjs --page <id> [--page <id> ...] [--engine chromium|firefox|webkit ...]
 *        [--width 1440|768|375 ...] [--site sandybrown] [--scroll-driver-url <url>]
 *   node scripts/motion-qa/probe-motion-model.mjs --self-test          (offline: judges, fixtures and schema)
 *   node scripts/motion-qa/probe-motion-model.mjs --validate-fixtures  (offline: every fixture sgsMotion value)
 * Output: one JSON row per check, then a summary row. Exit: 0 all pass; 1 any FAIL or any control that did not go red;
 * 2 only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */

import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, validateFixtures, selfTest, Reporter, near } from './probe-motion-model-lib.mjs';
import { hoverChecks, touchAndFocusChecks, reducedMotionChecks, tiltAndInlineChecks } from './probe-motion-model-hover.mjs';
import { fadeChecks, loadChecks, keyframeChecks, scrollDriverChecks, assetChecks } from './probe-motion-model-entrance.mjs';

const BROWSERS = { chromium, firefox, webkit };
const MARKERS = [ '.m29-hover-card', '.m29-fade-part', '.m29-load-first', '.m29-kf', '.m29-both', '.m29-tilt', '.m29-nomotion', '.m29-baseline', '.m29-first' ];
const HEIGHT = 900;

const FX_STYLESHEET = /\/fx-[a-z0-9-]+\.css/;

/**
 * A page that uses no fx effect loads no `fx-<effect>.css` (Spec 38A: effect stylesheets load on the same terms as
 * their script). The fixture pages carry no fx effect, so no request on any of them may match. The control fetches a
 * real effect stylesheet from the first page; the detector must see that request, so a listener that sees nothing
 * cannot pass the check.
 */
async function fxStylesheetChecks( ctx ) {
	const { rep, browser, width, base, urls } = ctx;
	const load = async ( url, probeUrl ) => {
		const context = await browser.newContext( { viewport: { width, height: HEIGHT } } );
		const page = await context.newPage();
		const seen = [];
		page.on( 'request', ( r ) => seen.push( r.url() ) );
		const res = await page.goto( url, { waitUntil: 'load' } );
		if ( probeUrl ) await page.evaluate( ( u ) => fetch( u ).catch( () => null ), probeUrl );
		await page.waitForTimeout( 800 );
		await context.close();
		return { status: res ? res.status() : 0, hits: seen.filter( ( u ) => FX_STYLESHEET.test( u ) ) };
	};
	for ( const url of urls ) {
		const got = await load( url );
		rep.check( 'no-fx-stylesheet', { selector: url, property: 'network requests matching fx-<effect>.css', measured: got.hits, expected: [], pass: got.status === 200 && got.hits.length === 0 } );
	}
	const probeUrl = `${ base }/wp-content/plugins/sgs-blocks/assets/css/fx-morph.css`;
	const seen = await load( urls[ 0 ], probeUrl );
	rep.control( 'no-fx-stylesheet', { selector: urls[ 0 ], property: 'the same listener while the page fetches fx-morph.css', measured: seen.hits, expected: 'at least one request', red: seen.hits.length > 0 } );
}

/** Which given page carries each marker class (the first that does). */
async function findMarkers( browser, urls ) {
	const found = {};
	const context = await browser.newContext( { viewport: { width: 1440, height: HEIGHT } } );
	for ( const url of urls ) {
		const page = await context.newPage();
		await page.goto( url, { waitUntil: 'load' } );
		const present = await page.evaluate( ( list ) => list.filter( ( s ) => document.querySelector( s ) ), MARKERS );
		for ( const m of present ) if ( ! found[ m ] ) found[ m ] = url;
		await page.close();
	}
	await context.close();
	return found;
}

async function main() {
	const args = parseArgs( process.argv );
	if ( args.selfTest || args.validateFixtures ) {
		const fixtures = await validateFixtures();
		for ( const r of fixtures.rows ) console.log( JSON.stringify( r ) );
		const failures = args.selfTest ? await selfTest() : [];
		if ( ! fixtures.ok ) failures.push( 'a fixture sgsMotion value is invalid' );
		console.log( JSON.stringify( { selfTest: args.selfTest, fixtureValues: fixtures.rows.length, failures } ) );
		process.exit( failures.length ? 1 : 0 );
	}
	if ( ! args.pages.length ) {
		console.error( 'Pass at least one --page <id> (a page built from a fixture in tests/fixtures/motion/pages).' );
		process.exit( 1 );
	}
	const base = siteBase( args.site );
	const urls = args.pages.map( ( id ) => `${ base }/?p=${ id }&cb=m29` );
	const shared = { scroll: {} };
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		const markers = await findMarkers( browser, urls );
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const newPage = async ( url, opts = {}, init ) => {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
				const page = await context.newPage();
				if ( init ) await init( page );
				// One retry on a navigation timeout: a stalled network request is not a motion result.
				await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
				await page.waitForTimeout( 300 );
				return { page, close: () => context.close() };
			};
			const ctx = { browser, engine, width, base, args, markers, rep, newPage, shared, urls };
			for ( const run of [ hoverChecks, touchAndFocusChecks, fadeChecks, loadChecks, keyframeChecks, scrollDriverChecks, tiltAndInlineChecks, assetChecks, fxStylesheetChecks, reducedMotionChecks ] ) {
				try {
					await run( ctx );
				} catch ( e ) {
					rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
				}
			}
			all.push( ...rep.rows );
			console.log( JSON.stringify( { engine, width, markers: Object.keys( markers ) } ) );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	const engines = Object.keys( shared.scroll );
	if ( engines.length > 1 ) {
		const ref = shared.scroll[ engines[ 0 ] ];
		const equal = engines.slice( 1 ).every( ( e ) => shared.scroll[ e ].every( ( v, i ) => near( v, ref[ i ], 0.01 ) ) );
		finish.check( 'scroll-driver-cross-engine', { property: '--sgs-scroll-progress at three positions', measured: shared.scroll, expected: 'equal across engines within 0.01', pass: equal } );
		finish.control( 'scroll-driver-cross-engine', { measured: shared.scroll, expected: 'positions 1 and 3 differ, so equality is not trivially true', red: ! near( ref[ 0 ], ref[ 2 ], 0.05 ) } );
	} else {
		finish.check( 'scroll-driver-cross-engine', { pass: null, why: 'pass two or more --engine values to compare engines' } );
	}
	process.exit( finish.summary() );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
