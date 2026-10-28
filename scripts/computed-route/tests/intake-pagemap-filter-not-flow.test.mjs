// Spec 48 FR-48-30: a filter is not a choice flow. A group of pick lists whose chips only narrow another list the page
// renders is a filter (the standing rule, lib/skeleton-narrowing.mjs::narrowsRenderedList, shared with the skeleton stage),
// so lib/intake-pagemap-surfaces.mjs::isChoiceFlow counts only the pick lists that are no filter. Fixture
// tests/fixtures/choice-flow-filter/Shop.dc.html holds a "Find a gift" section (two chip lists narrowing the Results list)
// and a "Build your box" section (two chip lists feeding a summary line). The real Mama's Munches and Eye Care drafts
// are read-only: the Gifts filter makes no flow row, "Build your Zookie" and the lens flow still do. Each MUST FAIL test
// turns red under a mutation in tests/intake-pagemap-filter-not-flow.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/intake-pagemap-filter-not-flow.mutations.json tests/intake-pagemap-filter-not-flow.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { loadDraft } from '../lib/intake-ast.mjs';
import { narrowedListsOfDraft, narrowsRenderedList } from '../lib/skeleton-narrowing.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'choice-flow-filter' );
const real = ( slug ) => path.resolve( HERE, '../../../sites', slug, 'handoff' );
const flows = ( folder ) => proposePageMap( { folder } ).rows.filter( ( r ) => 'sgs_choice_flow' === r.postType ).map( ( r ) => r.slug );

test( 'MUST FAIL: chips that only narrow a list the page renders make no choice flow row', () => {
	assert.ok( ! flows( FIX ).includes( 'choice-flow-find-a-gift' ), 'the filter section is no flow' );
} );

test( 'negative control: chips whose picks feed a summary line, not another list, are still a choice flow', () => {
	assert.deepEqual( flows( FIX ), [ 'choice-flow-build-your-box' ] );
} );

test( 'MUST FAIL: the filter rule is the shared one: the draft\'s narrowed lists and the rendered lists decide it', () => {
	const shop = loadDraft( FIX, 'Shop.dc.html' );
	assert.deepEqual( narrowedListsOfDraft( shop, 'occasions' ), [ 'results' ] );
	assert.deepEqual( narrowedListsOfDraft( shop, 'budgets' ), [ 'results' ] );
	assert.deepEqual( narrowedListsOfDraft( shop, 'bases' ), [], 'a list feeding only a summary string narrows no list' );
	assert.equal( narrowsRenderedList( [ 'results' ], [ '{{ occasions }}', '{{ results }}' ] ), true );
	assert.equal( narrowsRenderedList( [ 'results' ], [ '{{ occasions }}' ] ), false, 'a narrowed list nothing renders is no filter' );
	assert.equal( narrowsRenderedList( [], [ '{{ results }}' ] ), false );
} );

test( 'MUST FAIL: Mama\'s Munches Gifts hero (two chip lists narrowing the results) is no flow; Build your Zookie is', () => {
	const slugs = flows( real( 'mamas-munches-redesign' ) );
	assert.ok( ! slugs.includes( 'choice-flow-gifts-she-ll-actually-eat' ), 'the Gifts filter is no flow' );
	assert.ok( slugs.includes( 'choice-flow-build-your-zookie' ), 'the Zookie builder is a flow' );
} );

test( 'negative control: Eye Care\'s lens flow is still a choice flow', () => {
	assert.ok( flows( real( 'eye-care-ward-end' ) ).includes( 'choice-flow-add-prescription-lenses' ) );
} );
