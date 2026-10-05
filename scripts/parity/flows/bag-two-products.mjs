// Flow 1: two different products in the bag (register N11(a)).
//
// PRECONDITION  A fresh browser context (empty bag, no cart cookie, so no cooldown from an earlier flow) and a shop
//               with at least two in-stock products whose pages carry the buybox. The products are picked from the
//               Store API; set SGS_FLOW_PRODUCT_A / SGS_FLOW_PRODUCT_B to force two. Needs 31 s or more since the last
//               flow that added either product (run-all.mjs leaves that gap), or the per-variation limit window
//               could refuse the add.
// STEPS         Read the bag (must be empty). Open product A, add it. Open product B, add it. Read the bag through
//               GET /wp-json/wc/store/v1/cart, independent of how the drawer renders. Each add's status and code from
//               POST /wp-json/sgs/v1/cart/add-item are recorded.
// PASS          Both adds return 2xx and the bag holds two lines, one for each product added.
// FAILURE       bag-lost-line: the add returns 2xx but the bag still has one line (the shop's add-to-bag route says
//               "added" and drops the line when the bag already holds something). add-rejected (HTTP n code): the
//               shop refused an add outright.
// STATUS        Register N11(a) is a live fault, so on eye-care-test this flow is the proof of it until it is fixed.
import { trackAdds, addViaUi, readBag, pickProducts, assertTwoProducts } from './lib/bag.mjs';
import { STATUS, main, isDirectRun } from './lib/flow.mjs';

export const meta = {
	name: 'bag-two-products',
	precondition: 'Empty bag in a fresh context; two in-stock products with a buybox; 31 s or more since the last add of either.',
	expected: 'Both adds return 2xx and the Store API cart holds two lines, one per product.',
	failureSignals: [ 'bag-lost-line', 'add-rejected (HTTP n code)' ],
};

export async function run( { page, base, note } ) {
	const [ urlA, urlB ] = await pickProducts( page, base, 2 );
	note( 'products', { urlA, urlB } );
	const tracker = trackAdds( page );

	await page.goto( urlA, { waitUntil: 'domcontentloaded' } );
	const empty = await readBag( page );
	if ( empty.lines.length ) {
		throw new Error( `precondition: the bag already holds ${ empty.lines.length } line(s); a fresh context should start empty` );
	}
	const addA = await addViaUi( page, tracker );
	note( 'add-a', { status: addA.status, code: addA.code, id: addA.id } );

	await page.goto( urlB, { waitUntil: 'domcontentloaded' } );
	const addB = await addViaUi( page, tracker );
	note( 'add-b', { status: addB.status, code: addB.code, id: addB.id } );

	const bag = await readBag( page );
	const verdict = assertTwoProducts( addA, addB, bag );
	return {
		status: verdict.ok ? STATUS.PASS : STATUS.FAIL,
		signal: verdict.signal,
		detail: verdict.detail,
		evidence: { adds: [ addA, addB ], bag },
	};
}

if ( isDirectRun( import.meta.url ) ) {
	await main( { meta, run } );
}
