// Flow 4: the lens pop-up's "Skip the lenses" adds the frame straight to the bag (register N38).
//
// PRECONDITION  A fresh browser context (empty bag) and a product page whose "Add my prescription" opens the lens
//               pop-up (`dialog[open] .sgs-choice-flow`) with its skip link on the first question. The product is the
//               first Store API product whose page offers that link; set SGS_FLOW_LENS_PRODUCT (path or URL) to force
//               one. 31 s or more since the last add of it (run-all.mjs leaves the gap).
// STEPS         Open the product, open the pop-up, press `.sgs-choice-flow__skip-button`. Do nothing else. Poll the
//               Store API cart for up to 6 s.
// PASS          The bag gains the frame with no further click: no extra step to confirm, no second button to press.
// FAILURE       skip-opens-extra-step: the bag is still empty and the pop-up now shows another step (the result step
//               with its own add-to-bag button). skip-did-nothing: the bag is empty and nothing new is showing.
// STATUS        EXPECTED TO FAIL on eye-care-test until register N38 lands. choice-flow/block.json has no "skip adds
//               to bag" attribute, and flow-skip.js::handleSkipClick routes to the "add to bag now" option's ending,
//               which is an extra step. A failure here is that documented gap, not a fault in the flow or the site.
import { trackAdds, readBag, listBuyboxProducts } from './lib/bag.mjs';
import { STATUS, main, isDirectRun } from './lib/flow.mjs';

export const meta = {
	name: 'lens-skip-to-bag',
	precondition: 'Empty bag in a fresh context; a product whose "Add my prescription" opens the lens pop-up with a skip link; 31 s or more since the last add of it.',
	expected: 'Pressing skip adds the frame to the bag with no further step.',
	failureSignals: [ 'skip-opens-extra-step', 'skip-did-nothing' ],
	knownFailure: 'Expected until register N38 lands: choice-flow/block.json has no "skip adds to bag" setting and flow-skip.js::handleSkipClick routes to the "add to bag now" option\'s ending (an extra step). This is a spec item, not a regression.',
};

const DIALOG = 'dialog[open] .sgs-choice-flow';
const TRIGGER_TEXT = /add my prescription/i;
const POLL_MS = 6000;

async function findLensProduct( page, base ) {
	if ( process.env.SGS_FLOW_LENS_PRODUCT ) {
		const u = process.env.SGS_FLOW_LENS_PRODUCT;
		return u.startsWith( 'http' ) ? u : base + u;
	}
	const candidates = await listBuyboxProducts( page, base, 8 );
	for ( const url of candidates ) {
		await page.goto( url, { waitUntil: 'domcontentloaded' } );
		const has = await page.evaluate( ( src ) => [ ...document.querySelectorAll( 'a,button' ) ].some( ( e ) => new RegExp( src, 'i' ).test( e.textContent ) ), TRIGGER_TEXT.source );
		if ( has ) {
			return url;
		}
	}
	throw new Error( 'precondition: no product page offers an "Add my prescription" lens pop-up' );
}

export async function run( { page, base, note } ) {
	const url = await findLensProduct( page, base );
	note( 'product', { url } );
	const tracker = trackAdds( page );
	await page.goto( url, { waitUntil: 'domcontentloaded' } );
	const empty = await readBag( page );
	if ( empty.lines.length ) {
		throw new Error( `precondition: the bag already holds ${ empty.lines.length } line(s); a fresh context should start empty` );
	}
	await page.evaluate( ( src ) => [ ...document.querySelectorAll( 'a,button' ) ].find( ( e ) => new RegExp( src, 'i' ).test( e.textContent ) && e.offsetParent )?.click(), TRIGGER_TEXT.source );
	await page.waitForSelector( DIALOG, { timeout: 15000 } );
	const skip = page.locator( `${ DIALOG } .sgs-choice-flow__skip-button` ).first();
	if ( ! await skip.isVisible().catch( () => false ) ) {
		throw new Error( 'precondition: the pop-up shows no skip link on its first question' );
	}
	await skip.click();

	let bag = empty;
	const deadline = Date.now() + POLL_MS;
	while ( ! bag.lines.length && Date.now() < deadline ) {
		await page.waitForTimeout( 400 );
		bag = await readBag( page );
	}
	const adds = tracker.list;
	note( 'after-skip', { lines: bag.lines.length, adds: adds.length } );
	if ( bag.lines.length ) {
		return { status: STATUS.PASS, signal: null, detail: `skip added the frame straight to the bag (${ bag.lines.length } line)`, evidence: { adds, bag } };
	}

	// The bag is still empty: say what the shopper is looking at instead.
	const view = await page.evaluate( ( dialog ) => {
		const root = document.querySelector( dialog );
		const visible = ( e ) => !! e && e.offsetParent !== null && ! e.hidden;
		return {
			addToBasketShown: visible( root?.querySelector( '.sgs-choice-flow__add-to-basket' ) ),
			resultShown: visible( root?.querySelector( '.sgs-choice-flow-result' ) ),
			stepsShown: [ ...( root?.querySelectorAll( '.sgs-form-step' ) || [] ) ].filter( visible ).length,
		};
	}, DIALOG );
	const extra = view.addToBasketShown || view.resultShown;
	return {
		status: STATUS.FAIL,
		signal: extra ? 'skip-opens-extra-step' : 'skip-did-nothing',
		detail: extra ? 'skip led to another step (the result step with its own add-to-bag button) and the bag is still empty' : 'skip was pressed and neither the bag nor the pop-up changed',
		evidence: { adds, bag, view },
	};
}

if ( isDirectRun( import.meta.url ) ) {
	await main( { meta, run } );
}
