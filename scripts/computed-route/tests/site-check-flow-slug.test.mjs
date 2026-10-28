// The site check's choice-flow matching (lib/site-check-parts.mjs::readPartsInPage reads a flow root's data-flow-slug and
// ::missingFlowRows matches a page-map sgs_choice_flow row to a rendered flow): by the saved flow's slug, falling back to
// the flow's aria-label only for a flow that names no slug. Each MUST FAIL test turns red under a mutation in
// tests/site-check-flow-slug.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-check-flow-slug.mutations.json tests/site-check-flow-slug.test.mjs).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadChromium } from '../lib/fill-read.mjs';
import { MARK } from '../lib/site-check-nav.mjs';
import { readPartsInPage, missingFlowRows } from '../lib/site-check-parts.mjs';

let browser;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch();
} );
after( async () => browser?.close() );

const ROWS = [
	{ postType: 'sgs_choice_flow', slug: 'choice-flow-build-your-zookie', title: 'Build your Zookie' },
	{ postType: 'sgs_choice_flow', slug: 'choice-flow-gifts', title: 'Gifts' },
	{ postType: 'page', slug: 'home', title: 'Home' },
];

test( 'readPartsInPage reads the flow root\'s data-flow-slug, and an empty one when the root has none', async () => {
	const page = await browser.newPage();
	await page.setContent( '<div data-wp-interactive="sgs/choice-flow" data-flow-id="154-a" data-flow-slug="choice-flow-build-your-zookie"><div class="sgs-form-step"></div></div><div data-wp-interactive="sgs/choice-flow" data-flow-id="154-b" aria-label="Gifts"></div>' );
	const { flows } = await page.evaluate( readPartsInPage, MARK );
	await page.close();
	assert.equal( flows[ 0 ].flowSlug, 'choice-flow-build-your-zookie' );
	assert.equal( flows[ 0 ].label, '', 'the flow has no aria-label, as a cloned flow has none' );
	assert.equal( flows[ 1 ].flowSlug, '' );
	assert.equal( flows[ 1 ].label, 'Gifts' );
} );

test( 'a flow with no title is the page-map row whose slug it names', () => {
	const missing = missingFlowRows( ROWS, [ { flowSlug: 'choice-flow-build-your-zookie', label: '' } ] );
	assert.deepEqual( missing.map( ( r ) => r.slug ), [ 'choice-flow-gifts' ], 'only the row no flow names is missing' );
} );

test( 'a flow names its row by slug even when its label is another row\'s title', () => {
	const missing = missingFlowRows( ROWS, [ { flowSlug: 'choice-flow-build-your-zookie', label: 'Gifts' } ] );
	assert.deepEqual( missing.map( ( r ) => r.slug ), [ 'choice-flow-gifts' ], 'the label of a flow that names its slug claims no other row' );
} );

test( 'negative control: a flow with no slug still matches its row by aria-label, case ignored', () => {
	const missing = missingFlowRows( ROWS, [ { flowSlug: '', label: 'build your zookie' }, { flowSlug: '', label: 'GIFTS' } ] );
	assert.deepEqual( missing, [], 'both rows are found by label' );
} );

test( 'negative control: a flow with neither a matching slug nor a matching label leaves every row missing', () => {
	const missing = missingFlowRows( ROWS, [ { flowSlug: 'other-flow', label: 'Other' } ] );
	assert.equal( missing.length, 2 );
	assert.equal( missingFlowRows( ROWS, [] ).length, 2 );
} );
