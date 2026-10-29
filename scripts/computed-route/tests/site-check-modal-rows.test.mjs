// Spec 48 §3.7 (register A1): the site check's part rows cover the page map's sgs_modal rows as well as its sgs_choice_flow rows
// (lib/site-check-parts.mjs::missingFlowRows): a modal row no checked page renders is a failed row, matched by the frame's anchor
// (the row's slug) else by the dialog's accessible name (the saved modal post's title). Tests marked MUST FAIL fail before the
// rows are covered.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { missingFlowRows } from '../lib/site-check-parts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const MODAL = { slug: 'modal-size-guide', title: 'Size guide', postType: 'sgs_modal' };
const FLOW = { slug: 'choice-flow-lenses', title: 'Add lenses', postType: 'sgs_choice_flow' };
const slugs = ( list ) => list.map( ( r ) => r.slug );

test( 'MUST FAIL: a modal row no rendered modal shows is missing; one shown by its anchor or by its dialog name (case ignored) is not', () => {
	assert.deepEqual( slugs( missingFlowRows( [ MODAL ], [], [] ) ), [ 'modal-size-guide' ] );
	assert.deepEqual( slugs( missingFlowRows( [ MODAL ], [] ) ), [ 'modal-size-guide' ], 'modals default to none rendered' );
	assert.deepEqual( missingFlowRows( [ MODAL ], [], [ { anchor: 'modal-size-guide', label: '' } ] ), [] );
	assert.deepEqual( missingFlowRows( [ MODAL ], [], [ { anchor: '', label: 'SIZE GUIDE' } ] ), [] );
	assert.deepEqual( slugs( missingFlowRows( [ MODAL ], [], [ { anchor: 'other', label: 'Other' } ] ) ), [ 'modal-size-guide' ], 'another modal is not this row' );
} );

test( 'NEGATIVE: flow rows keep their own matching, a modal never satisfies a flow row and a flow never a modal row, and other rows are not parts', () => {
	assert.deepEqual( slugs( missingFlowRows( [ MODAL, FLOW ], [], [] ) ), [ 'choice-flow-lenses', 'modal-size-guide' ], 'flows first, then modals' );
	assert.deepEqual( slugs( missingFlowRows( [ MODAL, FLOW ], [ { flowSlug: 'choice-flow-lenses', label: '' } ], [] ) ), [ 'modal-size-guide' ] );
	assert.deepEqual( slugs( missingFlowRows( [ MODAL, FLOW ], [], [ { anchor: 'choice-flow-lenses', label: 'Add lenses' } ] ) ), [ 'choice-flow-lenses', 'modal-size-guide' ] );
	assert.deepEqual( slugs( missingFlowRows( [ MODAL, FLOW ], [ { flowSlug: '', label: 'Size guide' } ], [] ) ), [ 'choice-flow-lenses', 'modal-size-guide' ] );
	assert.deepEqual( missingFlowRows( [ { slug: 'about', title: 'About', postType: 'page' } ], [], [] ), [] );
} );

test( 'MUST FAIL: site-check.mjs passes the modals it saw to the rows check and reports a missing modal row', () => {
	const text = fs.readFileSync( path.join( HERE, '..', 'site-check.mjs' ), 'utf8' );
	assert.match( text, /seenModals\.push\( m \);/ );
	assert.match( text, /missingFlowRows\( rows, seenFlows, seenModals \)/ );
	assert.match( text, /'sgs_modal' === r\.postType/ );
} );
