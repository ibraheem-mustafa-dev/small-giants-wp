/**
 * Spec 38A unit M3.10: live acceptance of motion accessibility (FR-38A-30, Spec 38A section 12), on the page built from
 * tests/fixtures/motion/pages/motion-a11y.json.
 *
 * WHAT IT MEASURES (each check has a negative control that feeds the same judge a deliberately wrong reading and must
 * come out red; a control that does not is a failure):
 *   hover-none-revealed-visible   under (hover: none), the gallery's hover-revealed captions are displayed, visible, opaque and
 *                                 inside their item (control: the same captions on a hover-capable device at rest are hidden)
 *   keyboard-parity               Tab to the card's link reads the same translate, scale and rotate as the pointer hover
 *                                 (control: the resting card read as the focused one)
 *   loop-pause-button             the 8 s ambient float with the pause control on: the button is reachable by Tab, 44px, named,
 *                                 aria-pressed; a press sets every infinite animation to playState paused with
 *                                 data-sgs-loop-paused and aria-pressed true and holds after focus and pointer leave; a second
 *                                 press resumes (control: the identical loop with the pause control off has no button)
 *   loop-focus-pauses             focus inside the block pauses the loop without a press and it resumes when focus leaves
 *   loop-reduced-motion[:live]    under prefers-reduced-motion the loop does not run, from the start and on a mid-session change
 *   axe-no-violations             axe-core (WCAG 2.0/2.1/2.2 A and AA) reports nothing on the page (control: a planted empty
 *                                 button and an image with no alt are found)
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-a11y.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...]
 *                                                [--site sandybrown] [--axe-scope page|fixture]
 *   node scripts/motion-qa/probe-motion-a11y.mjs --self-test     (offline: judges, the fixture's stored values and its schema)
 * Default widths: all three. Output: one JSON row per check, then a summary. Exit: 0 all pass and every control red;
 * 1 any FAIL or a control that did not turn red; 2 only UNANSWERED remain.
 *
 * @package SGS\Blocks
 */

import fs from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, validateFixtures, WIDTHS } from './probe-motion-model-lib.mjs';
import { loadFacts, selfTest, FIXTURE_FILE, FIXTURE_WRAPS } from './probe-motion-a11y-lib.mjs';
import { revealChecks, parityChecks, axeChecks } from './probe-motion-a11y-checks.mjs';
import { loopChecks, loopReducedChecks } from './probe-motion-a11y-loop.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const MARKERS = [ ...FIXTURE_WRAPS, 'm310-entrance', 'm310-reveal', 'm310-card', 'm310-loop-pause', 'm310-loop-nopause' ];

/** Remove a flag with a value from argv before the shared parser sees it. */
function takeOption( argv, flag, fallback ) {
	const at = argv.indexOf( flag );
	if ( at < 0 ) return { argv, value: fallback };
	return { argv: argv.filter( ( _, i ) => i !== at && i !== at + 1 ), value: argv[ at + 1 ] };
}

async function offline() {
	const failures = selfTest();
	const fixtures = await validateFixtures();
	if ( ! fixtures.ok ) failures.push( `a fixture sgsMotion value is invalid: ${ JSON.stringify( fixtures.rows.filter( ( r ) => ! r.valid ) ) }` );
	const classes = new Set( [ ...fs.readFileSync( FIXTURE_FILE, 'utf8' ).matchAll( /"className": "([^"]*)"/g ) ].flatMap( ( m ) => m[ 1 ].split( /\s+/ ) ) );
	for ( const m of MARKERS ) if ( ! classes.has( m ) ) failures.push( `the fixture has no marker class ${ m }` );
	console.log( JSON.stringify( { selfTest: true, failures } ) );
	process.exit( failures.length ? 1 : 0 );
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) await offline();
	const scoped = takeOption( process.argv, '--axe-scope', 'page' );
	if ( ! [ 'page', 'fixture' ].includes( scoped.value ) ) throw new Error( '--axe-scope must be page or fixture' );
	const args = parseArgs( scoped.argv );
	if ( ! scoped.argv.includes( '--width' ) ) args.widths = WIDTHS;
	if ( args.pages.length !== 1 ) {
		console.error( 'Pass exactly one --page <id> (the page built from tests/fixtures/motion/pages/motion-a11y.json).' );
		process.exit( 1 );
	}
	const url = `${ siteBase( args.site ) }/?p=${ args.pages[ 0 ] }&cb=m310`;
	const facts = loadFacts();
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const open = async ( opts = {} ) => {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
				const page = await context.newPage();
				await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
				await page.waitForTimeout( 600 );
				return { page, close: () => context.close() };
			};
			const { page, close } = await open();
			const ctx = { rep, page, width, engine, open };
			try {
				const runs = [
					[ 'revealChecks', () => revealChecks( ctx, facts ) ],
					[ 'parityChecks', () => parityChecks( ctx, facts ) ],
					[ 'loopChecks', () => loopChecks( ctx, facts ) ],
					[ 'loopReducedChecks', () => loopReducedChecks( ctx ) ],
					[ 'axeChecks', () => axeChecks( ctx, scoped.value ) ],
				];
				for ( const [ name, run ] of runs ) {
					try {
						await run();
					} catch ( e ) {
						rep.check( `error:${ name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
					}
				}
			} finally {
				await close();
			}
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	let code = finish.summary();
	if ( code === 0 && ! all.some( ( r ) => r.verdict === 'CONTROL_RED' ) ) {
		console.error( 'Every check passed but no negative control ran, so nothing proves the judges can fail.' );
		code = 1;
	}
	process.exit( code );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
