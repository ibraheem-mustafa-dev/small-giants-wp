// Flow 3: choose a shop filter, then clear it (register N25's own test).
//
// PRECONDITION  A fresh browser context on the shop page (SGS_FLOW_SHOP_PATH, default /shop/) whose filter panel has
//               been built by sgs-shop-filters.js (groups in `.sgs-shop-filters__group`). No bag is needed. Not
//               rate-limited, but run-all.mjs still leaves its 31 s gap before it.
// STEPS         Open the panel and probe it (baseline). Choose the first unchosen filter chip, wait for WooCommerce to
//               redraw the region and the theme to rebuild the groups (`sgs-shop-filters:rebuilt`), probe. Clear all,
//               wait for the same redraw, probe again.
// PASS          After clearing: the group count equals the heading count, no two groups share a label, no group is an
//               empty shell, and the panel matches the baseline (same groups, nothing still chosen).
// FAILURE       groups!=headings (n vs m): the redraw left wrapper groups behind. empty-shell-groups: a group holds
//               nothing but its heading row (the "empty section with an arrow"). duplicate-group-labels: a heading
//               appears twice (the duplicated Gender). baseline-not-restored: the panel differs from before.
// STATUS        N25 is a framework repair on the parallel track; until it lands this flow fails on eye-care-test with
//               groups!=headings, which is the proof of the bug and not a fault in the flow.
import { probeFilters, evaluateFilterProbe, TOGGLE_SELECTOR, CHIP_SELECTOR, CLEAR_ALL_SELECTOR, GROUP_SELECTOR } from './lib/filters.mjs';
import { STATUS, main, isDirectRun } from './lib/flow.mjs';

export const meta = {
	name: 'filter-apply-clear',
	precondition: 'Shop page with the built filter panel; fresh context.',
	expected: 'After choosing then clearing a filter: group count equals heading count, no duplicate labels, no empty groups, baseline restored.',
	failureSignals: [ 'groups!=headings (n vs m)', 'empty-shell-groups', 'duplicate-group-labels', 'baseline-not-restored' ],
};

const REBUILD_WAIT_MS = 6000;
const SETTLE_MS = 800;

// Counts the theme's rebuild event so a redraw can be waited for rather than slept through.
async function watchRebuilds( page ) {
	await page.evaluate( () => {
		window.__sgsRebuilds = 0;
		document.addEventListener( 'sgs-shop-filters:rebuilt', () => {
			window.__sgsRebuilds++;
		}, true );
	} );
}

async function settle( page, rebuildsBefore ) {
	await page.waitForFunction( ( n ) => window.__sgsRebuilds > n, rebuildsBefore, { timeout: REBUILD_WAIT_MS } ).catch( () => {} );
	await page.waitForTimeout( SETTLE_MS );
}

export async function run( { page, base, note } ) {
	const path = process.env.SGS_FLOW_SHOP_PATH || '/shop/';
	await page.goto( base + path, { waitUntil: 'domcontentloaded' } );
	await page.waitForSelector( GROUP_SELECTOR, { state: 'attached', timeout: 20000 } );
	const toggle = page.locator( TOGGLE_SELECTOR ).first();
	if ( await toggle.isVisible().catch( () => false ) ) {
		await toggle.click();
		await page.waitForTimeout( 500 );
	}
	await watchRebuilds( page );
	const baseline = await probeFilters( page );
	note( 'baseline', baseline );

	// Press the chip the way the theme's own segmented buttons do: WooCommerce binds the click, not the visibility.
	const before = await page.evaluate( () => window.__sgsRebuilds );
	const clicked = await page.evaluate( ( sel ) => {
		const chip = document.querySelector( sel + '[aria-checked="false"]' );
		if ( ! chip ) {
			return false;
		}
		chip.click();
		return true;
	}, CHIP_SELECTOR );
	if ( ! clicked ) {
		throw new Error( 'precondition: no unchosen filter chip found to apply' );
	}
	await settle( page, before );
	const applied = await probeFilters( page );
	note( 'applied', applied );
	if ( applied.chosen < 1 ) {
		throw new Error( 'precondition: the chip was pressed but no filter shows as chosen, so there is nothing to clear' );
	}

	const beforeClear = await page.evaluate( () => window.__sgsRebuilds );
	await page.locator( CLEAR_ALL_SELECTOR ).first().evaluate( ( el ) => el.click() );
	await settle( page, beforeClear );
	const cleared = await probeFilters( page );
	note( 'cleared', cleared );

	const verdict = evaluateFilterProbe( baseline, cleared );
	return {
		status: verdict.ok ? STATUS.PASS : STATUS.FAIL,
		signal: verdict.signal,
		detail: verdict.ok ? `panel restored: ${ cleared.groups } group(s), ${ cleared.headings } heading(s)` : verdict.problems.map( ( p ) => `${ p.signal }: ${ p.detail }` ).join( '; ' ),
		evidence: { baseline, applied, cleared, problems: verdict.problems },
	};
}

if ( isDirectRun( import.meta.url ) ) {
	await main( { meta, run } );
}
