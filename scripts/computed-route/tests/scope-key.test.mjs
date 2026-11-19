// lib/fill-width-gate.mjs::scopeKeyOf, the scope key of a node's Additional CSS (`sgsCustomCssId`, printed as the class
// `sgs-c-<key>` by the plugin's includes/custom-css.php). A page draws the header, the footer, a drawer and the page
// itself at once, and the key was the node's position in its own tree (`wgate11`), so the header's eleventh node and the
// footer's shared one class: on Mama's clean copy (2026-11-19) a header icon's `text-decoration-line: underline` rule
// underlined the whole second footer row. The key is now a hash of the node's own ref.
// tests/scope-key.mutations.json holds the mutations (tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeKeyOf, scopedCssPuts } from '../lib/fill-width-gate.mjs';

const node = ( ref, attributes = {} ) => ( { name: 'sgs/container', attributes: { ...( ref ? { className: `is-style-x ${ ref }` } : {} ), ...attributes } } );
const keyOf = ( puts ) => puts.find( ( p ) => 'sgsCustomCssId' === p.attr ).value;

test( 'MUST FAIL: two surfaces\' nodes at the same position get different scope keys, each the plugin accepts', () => {
	const header = scopedCssPuts( node( 'cr-ref-header-11' ), { css: '& { text-decoration-line: underline; }', label: 'a', index: 11, why: 'residual' } );
	const footer = scopedCssPuts( node( 'cr-ref-footer-11' ), { css: '& { overflow-x: hidden; }', label: 'b', index: 11, why: 'residual' } );
	assert.notEqual( keyOf( header ), keyOf( footer ), 'MUST FAIL: a key made from the position alone is shared' );
	for ( const k of [ keyOf( header ), keyOf( footer ) ] ) {
		assert.match( k, /^[a-z0-9]{4,16}$/, 'the form includes/custom-css.php::sgs_custom_css_uid accepts' );
	}
} );

test( 'the key is the node\'s own: the same on every run, different for two nodes of one surface, kept once held', () => {
	assert.equal( scopeKeyOf( node( 'cr-ref-footer-11' ), 'wgate11' ), scopeKeyOf( node( 'cr-ref-footer-11' ), 'wgate99' ), 'a rerun gives the node the same key whatever its position' );
	assert.notEqual( scopeKeyOf( node( 'cr-ref-footer-11' ), 'x' ), scopeKeyOf( node( 'cr-ref-footer-12' ), 'x' ) );
	const held = scopedCssPuts( node( 'cr-ref-footer-11', { sgsCustomCss: '& { gap: 1px; }', sgsCustomCssId: 'mine1' } ), { css: '& { top: 0; }', label: 'c', index: 11, why: 'residual' } );
	assert.equal( keyOf( held ), 'mine1', 'a key the node already holds is kept, so its saved class does not change' );
} );

test( 'negative control: a node with no ref keeps the caller\'s key, cut to the plugin\'s 16 characters', () => {
	assert.equal( scopeKeyOf( node( null ), 'wgate7' ), 'wgate7' );
	assert.equal( scopeKeyOf( node( null ), 'loop' + 'a'.repeat( 30 ) ).length, 16 );
} );
