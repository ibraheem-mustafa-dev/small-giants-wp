// Flow 2: a second unit of the same product, within 20 seconds (register N11(b)).
//
// PRECONDITION  A fresh browser context (empty bag) and one in-stock product whose page carries the buybox. 31 s or
//               more since the last flow that added that product (run-all.mjs leaves the gap).
// STEPS         Open the product, add it, then add it again straight away. The gap between the two add-item responses
//               is measured and asserted to be UNDER 20 s: the shop's per-item cooldown is 30 s, so a 31 s wait would
//               let it expire and hide the bug. A gap of 20 s or more makes the run an ERROR, never a pass.
// PASS          The second add returns 2xx, no "please wait" text shows, and the Store API cart holds two units of
//               the product.
// FAILURE       cooldown-blocked-second-unit: the second add returns 429 sgs_rate_limited, or the shopper reads text
//               matching /please wait/i. lost-line: the second add returned 2xx but the bag holds fewer than 2 units.
// STATUS        N11(b) is ALREADY FIXED at HEAD by 35e8b94d4, which exempts an item already in the bag from
//               class-cart-proxy.php's cooldown, so this flow must PASS on a HEAD build. It can fail only against a
//               build older than 35e8b94d4. That is why tests/mock-shop.mjs (mode bug-b, which reproduces the
//               pre-35e8b94d4 cooldown) is the proof the failure signal works: the live site no longer has the bug to
//               fail against, and an old build must never be deployed to prove a test.
import { trackAdds, addViaUi, readBag, pickProducts, assertSecondUnit, SECOND_UNIT_MAX_GAP_MS } from './lib/bag.mjs';
import { STATUS, main, isDirectRun } from './lib/flow.mjs';

export const meta = {
	name: 'bag-second-unit',
	precondition: 'Empty bag in a fresh context; one in-stock product with a buybox; 31 s or more since the last add of it.',
	expected: `Second add under ${ SECOND_UNIT_MAX_GAP_MS / 1000 } s after the first returns 2xx, shows no "please wait" text, and the bag holds 2 units.`,
	failureSignals: [ 'cooldown-blocked-second-unit', 'bag-lost-line', 'gap-too-long (an error, not a pass)' ],
};

export async function run( { page, base, note } ) {
	const [ url ] = await pickProducts( page, base, 1 );
	note( 'product', { url } );
	const tracker = trackAdds( page );
	await page.goto( url, { waitUntil: 'domcontentloaded' } );

	const first = await addViaUi( page, tracker );
	note( 'add-1', { status: first.status, code: first.code, id: first.id } );
	if ( first.status < 200 || first.status >= 300 ) {
		return { status: STATUS.FAIL, signal: `add-rejected (HTTP ${ first.status }${ first.code ? ' ' + first.code : '' })`, detail: 'the first add was refused, so a second unit was never attempted', evidence: { adds: [ first ] } };
	}
	const second = await addViaUi( page, tracker );
	note( 'add-2', { status: second.status, code: second.code, ui: second.ui, gapMs: second.at - first.at } );

	const bag = await readBag( page );
	const verdict = assertSecondUnit( first, second, bag );
	if ( verdict.invalid ) {
		return { status: STATUS.ERROR, signal: verdict.signal, detail: verdict.detail, evidence: { adds: [ first, second ], bag, gapMs: second.at - first.at } };
	}
	return {
		status: verdict.ok ? STATUS.PASS : STATUS.FAIL,
		signal: verdict.signal,
		detail: verdict.detail,
		evidence: { adds: [ first, second ], bag, gapMs: second.at - first.at },
	};
}

if ( isDirectRun( import.meta.url ) ) {
	await main( { meta, run } );
}
