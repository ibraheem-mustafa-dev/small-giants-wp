// A modal or choice-flow surface is read live at a page that opens it (lib/site-run-opener-row.mjs::openerRow, used by
// site-run.mjs's prepare step). It has no page of its own, so the run read it at the home page, where it is not placed: Eye
// Care's size guide and lens configurator walked hollow on 2026-10-28 ("no .cr-ref-modal-size-guide-0 on the page") and
// failed the absence check on 2026-11-01 (restores 066238eef's rule, lost in the 2026-11-02 rewind).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openerRow } from '../lib/site-run-opener-row.mjs';

const ROWS = [
	{ id: 1, postType: 'page', slug: 'home', route: 'home' },
	{ id: 2, postType: 'product', slug: 'product', template: 'single-product', opens: [ { kind: 'flow', slug: 'lens' }, { kind: 'modal', slug: 'size-guide' } ] },
	{ id: 3, postType: 'page', slug: 'help', route: 'help', opens: [ { kind: 'modal', slug: 'size-guide' }, { kind: 'form', slug: 'contact-form' } ] },
	{ id: 5, postType: 'sgs_form', slug: 'contact-form' },
	{ id: 4, postType: 'sgs_footer', slug: 'footer', opens: [ { kind: 'modal', slug: 'size-guide' }, { kind: 'modal', slug: 'footer-only' } ] },
	{ id: 118, postType: 'sgs_modal', slug: 'size-guide' },
	{ id: 120, postType: 'sgs_choice_flow', slug: 'lens' },
	{ id: 121, postType: 'sgs_modal', slug: 'unopened' },
	{ id: 122, postType: 'sgs_modal', slug: 'footer-only' },
];

test( 'MUST FAIL: a modal or flow surface is read live at a page that opens it, a page before a product', () => {
	assert.equal( openerRow( { target: { postId: 118 } }, ROWS ).slug, 'help' );
	assert.equal( openerRow( { target: { postId: 120 } }, ROWS ).slug, 'product', 'a flow only a product opens is read at the product' );
	// Negative controls: a modal nothing opens, one only the footer opens (it renders on every page), a page, and an entry
	// with no post keep the surface's own reach.
	assert.equal( openerRow( { target: { postId: 121 } }, ROWS ), null );
	assert.equal( openerRow( { target: { postId: 122 } }, ROWS ), null, 'a footer has no live address of its own' );
	assert.equal( openerRow( { target: { postId: 1 } }, ROWS ), null );
	assert.equal( openerRow( { target: { postId: 5 } }, ROWS ), null, 'a form is read on its own page (its draftRoute)' );
	assert.equal( openerRow( { target: { template: 'single-product' } }, ROWS ), null );
	assert.equal( openerRow( null, ROWS ), null );
} );
