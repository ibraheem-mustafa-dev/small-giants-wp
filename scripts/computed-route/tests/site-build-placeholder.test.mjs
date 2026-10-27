// Spec 48 FR-48-55: a header or footer row with no stage 3 tree is built from a placeholder that its post type's locked
// template accepts - the slotted root (`sgs/site-header`, `sgs/site-footer`) holding its rows - the same check
// scripts/wp-build-page.js applies before it saves (scripts/lib/surface-tree-shape.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { placeholderTree } from '../lib/site-build-map.mjs';

const { surfaceTreeProblems } = createRequire( import.meta.url )( '../../lib/surface-tree-shape.js' );

test( 'MUST FAIL: the footer placeholder is sgs/site-footer with its rows, which the locked footer template accepts', () => {
	const tree = placeholderTree( { postType: 'sgs_footer', title: 'Footer', slug: 'footer' } );
	assert.deepEqual( surfaceTreeProblems( tree, 'sgs/site-footer' ), [] );
} );

test( 'MUST FAIL: the header placeholder is sgs/site-header with its rows and binds the header menu in its middle row', () => {
	const tree = placeholderTree( { postType: 'sgs_header', title: 'Header', slug: 'header' }, { header: 17 } );
	assert.deepEqual( surfaceTreeProblems( tree, 'sgs/site-header' ), [] );
	const middle = tree[ 0 ].innerBlocks.find( ( r ) => 'middle' === r.attributes.rowSlot );
	assert.deepEqual( middle.innerBlocks, [ { name: 'sgs/nav-bar-menu', attributes: { ref: 17 } } ] );
} );

test( 'a drawer and a page keep their placeholders', () => {
	assert.equal( placeholderTree( { postType: 'sgs_drawer' }, { drawer: 3 } )[ 0 ].name, 'sgs/nav-drawer' );
	assert.deepEqual( placeholderTree( { postType: 'page', title: 'About' } ), [ { name: 'sgs/heading', attributes: { content: 'About', level: 'h1' } } ] );
	assert.deepEqual( placeholderTree( { postType: 'post', title: 'News' } ), [ { name: 'sgs/text', attributes: { text: '' } } ], 'the single copy carries the post title, so a post placeholder is an empty body, never a second h1' );
	assert.deepEqual( placeholderTree( { postType: 'page', slug: 'my-account', title: 'Sign in' } ), [ { name: 'sgs/account' } ], 'the account page always holds WooCommerce’s account piece' );
} );
