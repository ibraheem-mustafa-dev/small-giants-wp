// A draft's scroll reveals, fired before the draft is read. A Claude Design draft holds a section at `opacity: 0` and a small
// translate (set by its own script, inline) until an IntersectionObserver sees it enter the screen. A read that never scrolls
// finds every such section in that held look, which is an entrance and never the section's resting paint. The page is
// scrolled through its length one screen at a time, back to the top, and given the time the longest entrance takes to end.
const STEP_PAUSE_MS = 120;
const SETTLE_MS = 1200;
// A page this long is scrolled in at most this many steps (the step grows instead), so a very tall draft cannot hold a read up.
const MAX_STEPS = 120;

// In-page: scrolls from the top to the bottom and back to the top.
export async function scrollThrough( [ pause, maxSteps ] ) {
	const total = () => document.documentElement.scrollHeight;
	const step = Math.max( window.innerHeight * 0.8, total() / maxSteps );
	for ( let y = 0; y < total() - window.innerHeight; y += step ) {
		window.scrollTo( 0, y );
		await new Promise( ( r ) => setTimeout( r, pause ) );
	}
	window.scrollTo( 0, total() );
	await new Promise( ( r ) => setTimeout( r, pause ) );
	window.scrollTo( 0, 0 );
}

// page: a Playwright page with the draft open.
export async function fireScrollReveals( page ) {
	await page.evaluate( scrollThrough, [ STEP_PAUSE_MS, MAX_STEPS ] );
	await page.waitForTimeout( SETTLE_MS );
}
