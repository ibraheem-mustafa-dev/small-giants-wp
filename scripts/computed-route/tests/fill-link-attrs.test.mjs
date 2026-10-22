// linkAttrDecisions (lib/fill-link-attrs.mjs): a draft link's target, rel, id and aria-label go to the block's own
// settings (real block.json schemas), and to a named UNMAPPED row where the block has none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkAttrDecisions, blockSupportsAnchor } from '../lib/fill-link-attrs.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { linkDecisions } from '../lib/fill-presence.mjs';

const CAL = { link: { url: { path: '', attr: 'href' } } };
const run = ( block, slots, over = {} ) => linkAttrDecisions( { calibration: CAL, schema: blockSchema( block ), anchor: blockSupportsAnchor( block ), slots, ...over } );
const val = ( r, attr ) => r.writes.find( ( w ) => w.attr === attr )?.value;

test( 'MUST FAIL: target _blank writes the block\'s own new-tab setting (a string target, a boolean, a calibrated target)', () => {
	assert.equal( val( run( 'sgs/button', { '': { target: '_blank' } } ), 'linkTarget' ), '_blank' );
	assert.equal( val( linkAttrDecisions( { calibration: { link: { linkUrl: { path: '', attr: 'href' } } }, schema: blockSchema( 'sgs/media' ), slots: { '': { target: '_blank' } } } ), 'linkOpensNewTab' ), true );
	const cal = { link: { url: { path: '', attr: 'href' }, openWhere: { path: '', attr: 'target' } } };
	assert.equal( val( linkAttrDecisions( { calibration: cal, schema: { url: { type: 'string' }, openWhere: { type: 'string' } }, slots: { '': { target: '_blank' } } } ), 'openWhere' ), '_blank' );
	assert.deepEqual( run( 'sgs/button', { '': { target: '_self' } } ).writes, [], 'a same-tab link needs no write' );
} );

test( 'a block with no new-tab setting raises a named target gap, never a silent drop', () => {
	const r = linkAttrDecisions( { calibration: CAL, schema: { url: { type: 'string' } }, slots: { '': { target: '_blank' } } } );
	assert.deepEqual( r.writes, [] );
	assert.equal( r.unmapped[ 0 ].property, 'target' );
	assert.match( r.unmapped[ 0 ].reason, /no setting of the block opens/ );
} );

test( 'MUST FAIL: rel is written to the block\'s rel setting, and the tokens a new tab adds itself are not a difference', () => {
	assert.equal( val( run( 'sgs/button', { '': { rel: 'nofollow sponsored' } } ), 'rel' ), 'nofollow sponsored' );
	assert.equal( val( run( 'sgs/button', { '': { target: '_blank', rel: 'noopener noreferrer nofollow' } } ), 'rel' ), 'nofollow' );
	assert.equal( run( 'sgs/button', { '': { target: '_blank', rel: 'noopener noreferrer' } } ).writes.some( ( w ) => 'rel' === w.attr ), false, 'the block adds noopener itself' );
	const none = linkAttrDecisions( { calibration: CAL, schema: { url: { type: 'string' } }, slots: { '': { rel: 'nofollow' } } } );
	assert.equal( none.unmapped[ 0 ].property, 'rel' );
} );

test( 'MUST FAIL: id goes to anchor only when the block declares supports.anchor, and only for the root element', () => {
	assert.equal( blockSupportsAnchor( 'sgs/button' ), true );
	assert.equal( blockSupportsAnchor( 'sgs/mega-group' ), false );
	assert.equal( val( run( 'sgs/button', { '': { id: 'book' } } ), 'anchor' ), 'book' );
	const no = linkAttrDecisions( { calibration: CAL, schema: blockSchema( 'sgs/mega-group' ), anchor: false, slots: { '': { id: 'book' } } } );
	assert.deepEqual( no.writes, [] );
	assert.equal( no.unmapped[ 0 ].property, 'id' );
	assert.match( no.unmapped[ 0 ].reason, /supports\.anchor/ );
	const nested = run( 'sgs/button', { '.sgs-button__label': { id: 'x' } } );
	assert.equal( nested.writes.length, 0 );
	assert.equal( nested.unmapped[ 0 ].property, 'id' );
} );

test( 'MUST FAIL: aria-label is written where the block has the attribute and raised as a named gap where it does not', () => {
	assert.equal( val( run( 'sgs/button', { '': { ariaLabel: 'Book now' } } ), 'ariaLabel' ), 'Book now' );
	const no = linkAttrDecisions( { calibration: CAL, schema: { url: { type: 'string' } }, slots: { '': { ariaLabel: 'Book now' } } } );
	assert.deepEqual( no.writes, [] );
	assert.equal( no.unmapped[ 0 ].property, 'aria-label' );
	assert.equal( no.unmapped[ 0 ].value, 'Book now' );
} );

test( 'a value the node already holds is kept, and a contradiction is a note, not an overwrite', () => {
	const r = run( 'sgs/button', { '': { ariaLabel: 'Book now' } }, { attributes: { ariaLabel: 'Reserve' } } );
	assert.deepEqual( r.writes, [] );
	assert.match( r.notes[ 0 ], /ariaLabel holds "Reserve"/ );
	assert.deepEqual( run( 'sgs/button', { '': { ariaLabel: 'Book now' } }, { attributes: { ariaLabel: 'Book now' } } ).notes, [] );
} );

const PAGES = [
	{ route: 'home', slug: 'home', parent: null, postType: 'page' },
	{ route: 'apply', slug: 'apply', parent: null, postType: 'page' },
	{ route: 'about', slug: 'about', parent: null, postType: 'page' },
	{ route: 'our-story', slug: 'our-story', parent: 'about', postType: 'page' },
	{ route: 'blog-index', slug: 'blog', parent: null, postType: 'post' },
];
const hash = ( href, pages = PAGES ) => linkDecisions( { calibration: CAL, attributes: {}, slots: { '': href }, origin: 'http://x', pages } );

test( 'MUST FAIL: a draft hash route is written as the page map\'s permalink for that route', () => {
	assert.deepEqual( hash( '#/apply' ).writes, [ { attr: 'url', value: '/apply/', merge: 'replace' } ] );
	assert.equal( hash( '#/' ).writes[ 0 ].value, '/', 'the bare route is the home page' );
	assert.equal( hash( '#/our-story' ).writes[ 0 ].value, '/about/our-story/', 'a child page keeps its parent chain' );
} );

test( 'a hash route with no page, a non-page row, no page map, and a bare # stay no route', () => {
	assert.deepEqual( hash( '#/nowhere' ).writes, [] );
	assert.deepEqual( hash( '#/blog-index' ).writes, [], 'a post row has no page permalink' );
	assert.deepEqual( hash( '#/apply', null ).writes, [], 'no page map, no route' );
	assert.deepEqual( hash( '#' ).writes, [] );
	assert.deepEqual( hash( '#section' ).writes, [], 'an in-page fragment is not a route' );
} );
