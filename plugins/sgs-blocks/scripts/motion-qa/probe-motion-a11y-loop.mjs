/**
 * Check (c) of probe-motion-a11y.mjs (FR-38A-30): a looping effect over five seconds has a working pause control.
 *
 * The fixture holds two identical ambient-float loops, one with the pause control on (`.m310-loop-pause`) and one with it
 * off (`.m310-loop-nopause`, the negative control). On the first the probe drives the real control with the keyboard and
 * pointer and reads `Animation.playState` of every infinite animation in the block, `data-sgs-loop-paused` on the element
 * and `aria-pressed` on the button after each step. The twin must come out red, so a judge that passes anything is caught.
 *
 * @package SGS\Blocks
 */

import { judgeLoopControl, judgeReducedLoop, allIn } from './probe-motion-a11y-lib.mjs';
import { READ_LOOP, settle, tabInto, leave } from './probe-motion-a11y-page.mjs';

const PAUSE = '.m310-loop-pause';
const NOPAUSE = '.m310-loop-nopause';
const BUTTON = '.sgs-motion-pause';

/** The pause button's locator: the sibling that follows a loop that is its own block root, else a descendant. */
async function buttonLocator( page, sel ) {
	for ( const css of [ `${ sel } + ${ BUTTON }`, `${ sel } ${ BUTTON }` ] ) {
		const loc = page.locator( css );
		if ( await loc.count() ) return loc.first();
	}
	return null;
}

/** Run the sequence on one loop and return the readings `judgeLoopControl` takes. `drive` false takes only the first reading. */
async function sequence( page, sel, drive ) {
	await settle( page, sel );
	await leave( page, 500 );
	const read = () => page.evaluate( READ_LOOP, sel );
	const running = await read();
	const s = { running, button: running.button ? { ...running.button, tabReached: false } : { present: false } };
	if ( ! running.button || ! drive ) return s;

	const landed = await tabInto( page, sel, BUTTON );
	s.button.tabReached = landed.matches;
	s.button.landed = landed;
	await page.waitForTimeout( 150 );
	s.focus = await read();
	await leave( page );
	s.blurred = await read();

	const loc = await buttonLocator( page, sel );
	await loc.click();
	await page.waitForTimeout( 250 );
	s.paused = await read();
	await leave( page );
	s.held = await read();
	await loc.click();
	await page.waitForTimeout( 250 );
	s.resumed = await read();
	await leave( page );
	s.afterLeave = await read();
	return s;
}

/** Why a reduced-motion reading failed, in words: the infinite animations still running, or the pause button still showing. */
function reducedWhy( r ) {
	const why = [];
	if ( r.anims.length ) why.push( `${ r.anims.length } infinite animation(s) still run` );
	if ( r.button && ! r.button.hidden ) why.push( 'the pause button is still visible although nothing moves' );
	return why.join( '; ' );
}

/** The measured values written into a row: the state of each step, not the whole reading. */
function brief( s ) {
	const step = ( r ) => ( r ? { states: [ ...new Set( r.anims.map( ( a ) => a.playState ) ) ], animations: r.anims.length, loopPausedAttr: r.attr, ariaPressed: r.pressed } : null );
	return { button: s.button, running: step( s.running ), focusInside: step( s.focus ), afterFocusLeaves: step( s.blurred ), afterPress: step( s.paused ), afterLeaveWhilePaused: step( s.held ), afterSecondPress: step( s.resumed ), afterLeaveWhileRunning: step( s.afterLeave ) };
}

export async function loopChecks( ctx, facts ) {
	const { rep, page } = ctx;
	const missing = [];
	for ( const sel of [ PAUSE, NOPAUSE ] ) if ( ! await page.$( sel ) ) missing.push( sel );
	if ( missing.length ) {
		rep.check( 'loop-pause-button', { selector: missing.join( ', ' ), pass: null, why: 'selector not on the page: build the fixture and pass its id' } );
		return;
	}
	const s = await sequence( page, PAUSE, true );
	if ( ! s.running.anims.length ) {
		rep.check( 'loop-pause-button', { selector: PAUSE, property: 'Animation.playState', measured: brief( s ), pass: null, why: 'no infinite animation is running in the loop\'s block: the loop script did not start (is the deployed code current?)' } );
		return;
	}
	const verdict = judgeLoopControl( s );
	const expected = `a pause button reachable by Tab, 44px, aria-pressed false; a press sets every animation paused, data-sgs-loop-paused and aria-pressed true and holds after focus and pointer leave; a second press resumes it; focus inside pauses without a press. Loop period ${ facts.pause.period }ms (over five seconds)`;
	rep.check( 'loop-pause-button', { selector: `${ PAUSE } + ${ BUTTON }`, property: 'hidden / aria-pressed / Animation.playState / data-sgs-loop-paused', measured: brief( s ), expected, pass: verdict.button.length === 0, why: verdict.button.join( '; ' ) } );
	rep.check( 'loop-focus-pauses', { selector: PAUSE, property: 'Animation.playState / data-sgs-loop-paused with focus inside the block', measured: { focusInside: brief( s ).focusInside, afterFocusLeaves: brief( s ).afterFocusLeaves, landed: s.button.landed }, expected: 'every animation paused with data-sgs-loop-paused while focus is inside the block, running again after it leaves', pass: verdict.focus.length === 0, why: verdict.focus.join( '; ' ) } );

	const twin = await sequence( page, NOPAUSE, false );
	const twinVerdict = judgeLoopControl( { ...twin, focus: null } );
	rep.control( 'loop-pause-button', { selector: NOPAUSE, property: 'pause button', measured: twin.button, expected: 'the same loop with the pause control off has no button, so the judge reads it red', red: twinVerdict.button.length > 0 && ! twin.button.present, why: twinVerdict.button.join( '; ' ) } );

	const live = await page.evaluate( READ_LOOP, PAUSE );
	await page.emulateMedia( { reducedMotion: 'reduce' } );
	await page.waitForTimeout( 400 );
	const reduced = await page.evaluate( READ_LOOP, PAUSE );
	await page.emulateMedia( { reducedMotion: 'no-preference' } );
	await page.waitForTimeout( 600 );
	const back = await page.evaluate( READ_LOOP, PAUSE );
	rep.check( 'loop-reduced-motion:live', { selector: PAUSE, property: 'infinite animations after prefers-reduced-motion changes mid-session', measured: { before: live.anims.length, reduce: reduced.anims.length, reduceButtonHidden: reduced.button ? reduced.button.hidden : null, afterReturn: back.anims.length }, expected: 'the loop runs, stops (and its button hides) when the preference becomes reduce, and runs again when it returns', pass: allIn( live.anims, 'running' ) && judgeReducedLoop( reduced ) && allIn( back.anims, 'running' ), why: [ allIn( live.anims, 'running' ) ? '' : 'the loop was not running before the switch', reducedWhy( reduced ), allIn( back.anims, 'running' ) ? '' : 'the loop did not run again when the preference returned' ].filter( Boolean ).join( '; ' ) } );
	rep.control( 'loop-reduced-motion:live', { selector: PAUSE, property: 'infinite animations', measured: live.anims.length, expected: 'the reading taken before the switch, when the loop runs, is judged red by the reduced-motion judge', red: ! judgeReducedLoop( live ) } );
}

/** Reduced motion from the start: a context that opens with the preference already set. */
export async function loopReducedChecks( ctx ) {
	const { rep } = ctx;
	if ( ! await ctx.page.$( PAUSE ) ) {
		rep.check( 'loop-reduced-motion', { selector: PAUSE, pass: null, why: 'selector not on the page: build the fixture and pass its id' } );
		return;
	}
	const normal = await ctx.page.evaluate( READ_LOOP, PAUSE );
	const reduced = await ctx.open( { reducedMotion: 'reduce' } );
	try {
		await settle( reduced.page, PAUSE );
		await reduced.page.waitForTimeout( 500 );
		const r = await reduced.page.evaluate( READ_LOOP, PAUSE );
		rep.check( 'loop-reduced-motion', { selector: PAUSE, property: 'infinite animations / pause button hidden under prefers-reduced-motion: reduce', measured: { animations: r.anims.length, button: r.button }, expected: 'no infinite animation runs and the pause button, if it exists, is hidden', pass: judgeReducedLoop( r ), why: reducedWhy( r ) } );
		rep.control( 'loop-reduced-motion', { selector: PAUSE, property: 'infinite animations', measured: normal.anims.length, expected: 'the same loop under no-preference runs, and the reduced-motion judge reads it red', red: normal.anims.length > 0 && ! judgeReducedLoop( normal ) } );
	} finally {
		await reduced.close();
	}
}
