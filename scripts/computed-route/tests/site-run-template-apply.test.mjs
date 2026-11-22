// A template copy's tree takes the apply rules that need only the draft element (lib/site-run-template-apply.mjs), and site-run.mjs runs them
// on each copy's tree before it is written and built. Run: node --test tests/site-run-template-apply.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { applyTemplateRules } from '../lib/site-run-template-apply.mjs';

const source = fs.readFileSync( new URL( '../site-run.mjs', import.meta.url ), 'utf8' );
const node = ( name, ref, attributes = {}, innerBlocks = [] ) => ( { name, attributes: { className: ref, ...attributes }, innerBlocks } );
const origin = ( tag ) => ( { tpl: 'Root/1#0', fingerprint: { tag } } );

test( 'MUST FAIL: site-run.mjs runs the template rules on each copy\'s tree before the copy is written', () => {
	assert.match( source, /applyTemplateRules/ );
	assert.ok( source.indexOf( 'applyTemplateRules(' ) > source.indexOf( 'copies = copyTrees(' ), 'after the copy trees are made' );
	assert.ok( source.indexOf( 'applyTemplateRules(' ) < source.indexOf( 'writeCopy( build, slug' ), 'before a copy is written' );
} );

test( 'MUST FAIL: a heading block the draft draws as an h1 takes level h1 on a template copy\'s tree', () => {
	const tree = [ node( 'core/template-part', 'x' ), node( 'sgs/container', 'cr-ref-template-cart-0', {}, [ node( 'sgs/heading', 'cr-ref-template-cart-1', { content: 'Your basket' } ), node( 'sgs/heading', 'cr-ref-template-cart-2', { level: 'h2' } ) ] ) ];
	const origins = { 'cr-ref-template-cart-1': origin( 'h1' ), 'cr-ref-template-cart-2': origin( 'h2' ) };
	const r = applyTemplateRules( { tree, origins } );
	const [ , container ] = tree;
	assert.equal( container.innerBlocks[ 0 ].attributes.level, 'h1' );
	assert.equal( container.innerBlocks[ 1 ].attributes.level, 'h2', 'an h2 stays' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.ref, w.attr, w.value ] ), [ [ 'cr-ref-template-cart-1', 'level', 'h1' ] ] );
	assert.equal( r.equal, 1 );
} );

test( 'a heading drawn as a div takes the level below the nearest real heading of its own surface, not another surface', () => {
	const tree = [ node( 'sgs/heading', 'cr-ref-a-1', { level: 'h2' } ), node( 'sgs/heading', 'cr-ref-a-5' ), node( 'sgs/heading', 'cr-ref-b-2', { level: 'h4' } ), node( 'sgs/heading', 'cr-ref-b-9' ) ];
	const origins = { 'cr-ref-a-1': origin( 'h2' ), 'cr-ref-a-5': origin( 'div' ), 'cr-ref-b-9': origin( 'div' ), 'cr-ref-b-2': origin( 'h4' ) };
	applyTemplateRules( { tree, origins } );
	assert.equal( tree[ 1 ].attributes.level, 'h3', 'under a-1 (h2)' );
	assert.equal( tree[ 3 ].attributes.level, 'h5', 'under b-2 (h4), not a-1' );
} );

test( 'a block with no origin entry, a block that is not a heading and a tree with no refs are left alone', () => {
	const tree = [ node( 'sgs/heading', 'cr-ref-a-1' ), node( 'sgs/text', 'cr-ref-a-2' ), { name: 'core/template-part', attributes: {} } ];
	const before = JSON.stringify( tree );
	const r = applyTemplateRules( { tree, origins: { 'cr-ref-a-2': origin( 'h1' ) } } );
	assert.equal( JSON.stringify( tree ), before );
	assert.deepEqual( r, { writes: [], equal: 0 } );
} );
