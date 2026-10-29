// An element shown only at some widths inside a block that draws its own content (Spec 48 FR-48-50): it is a variation of
// that block, hiding the block on its widths, only when the block's own content is hidden there. Mama's real checkout
// template draft shows a "Show order summary" toggle on phones beside the checkout form, which renders at every width: the
// toggle is an addition, not an alternative, and the region is WooCommerce's Checkout block (`core/post-content`), which
// draws the order summary and its own narrow-width collapse itself. Tests marked MUST FAIL fail before the addition rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'mamas-munches-redesign', repo: REPO, siteName: 'Acme' } );
const INV = JSON.parse( fs.readFileSync( path.join( REPO, 'sites/mamas-munches-redesign/build/skeleton/template-checkout.inventory.json' ), 'utf8' ) );
const CHECKOUT = { role: 'checkout', checkout: null };
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const run = ( inventory = INV ) => proposeSkeleton( { inventory, facts, surface: 'template-checkout', commerce: CHECKOUT, db } );
const TOGGLE = 'Root/19#0';

test( 'MUST FAIL: the checkout region is never hidden by the phone-only order-summary toggle; the toggle is WooCommerce\'s own', () => {
	const { skeleton, proposal } = run();
	const region = nodes( skeleton ).find( ( n ) => 'core/post-content' === n.name );
	assert.ok( region, 'the region is WooCommerce\'s Checkout block' );
	assert.equal( region.widthVariants, undefined, 'no width variant hides the region on phones' );
	assert.equal( nodes( skeleton ).filter( ( n ) => n.widthShown ).length, 0, 'no static copy of the toggle is built' );
	const row = proposal.rows.find( ( r ) => TOGGLE === r.key );
	assert.equal( row.action, 'absorbed' );
	assert.equal( row.into, 'Root/17#0' );
	assert.match( row.reason, /draws it itself/ );
	assert.deepEqual( proposal.widthAlternatives, [], 'nothing is left unbuilt: the region draws it' );
} );

// A pill link holding its label at every width (16) and a phone-only icon wrapper (18): the icon is shown beside the label.
const at = ( x, y, w = 100 ) => ( { x, y, w, h: 20 } );
const el = ( id, parent, tag, words, x = {} ) => {
	const shown = x.widths || [ 375, 768, 1440 ];
	const vis = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, shown.includes( w ) ] ) );
	const box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, vis[ w ] ? x.box : null ] ) );
	return { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: id, attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box, visible: vis, display: x.display || 'block', flexDirection: 'row', screenshots: {} };
};
const PILL = ( labelWidths ) => [
	el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 800 ), display: 'flex' } ),
	el( 11, 1, 'div', '', { depth: 1, box: at( 0, 0, 500 ), display: 'flex' } ),
	el( 14, 11, 'a', '', { depth: 2, box: at( 110, 0 ), attrs: { href: '/contact' }, allText: 'Order now' } ),
	el( 16, 14, 'span', 'Order now', { depth: 3, widths: labelWidths, box: at( 110, 0 ) } ),
	el( 18, 14, 'span', '', { depth: 3, widths: [ 375 ], box: at( 110, 0 ), display: 'flex' } ),
	el( 19, 18, 'a', 'Menu', { depth: 4, widths: [ 375 ], box: at( 110, 0 ), attrs: { href: '/menu' } } ),
	el( 20, 11, 'a', 'Email us', { depth: 2, box: at( 220, 0 ), attrs: { href: '/email' } } ),
];
const header = ( elements ) => proposeSkeleton( { inventory: { checks: {}, source: 'fixture', root: 'header', generated: 'fixture', elements }, facts: loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Example Co' } ), surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
const byRef = ( r, key ) => nodes( r.skeleton ).find( ( n ) => ( n.variantKey ?? n.draftRef?.tpl ) === key );

test( 'MUST FAIL: a phone-only element beside content shown at the same width is built beside the block without hiding it', () => {
	const r = header( PILL( [ 375, 768, 1440 ] ) );
	assert.equal( byRef( r, 'Root/14#0' ).widthVariants, undefined, 'the pill, whose label shows on phones too, is never hidden there' );
	assert.deepEqual( byRef( r, 'Root/18#0' ).widthShown, [ 375 ], 'the phone-only element is built, shown on phones only' );
} );

test( 'MUST FAIL: a phone-only label beside a label shown on phones too is its own block on its own element, not the pill again', () => {
	const els = PILL( [ 375, 768, 1440 ] ).filter( ( e ) => ! [ 'Root/18#0', 'Root/19#0' ].includes( e.key ) );
	const r = header( [ ...els, el( 18, 14, 'span', 'Call', { depth: 3, widths: [ 375 ], box: at( 110, 0 ) } ) ] );
	const call = byRef( r, 'Root/18#0' );
	assert.ok( call, 'the label is built' );
	assert.equal( call.variantKey, undefined, 'not a words variant measured on the pill' );
	assert.deepEqual( call.draftRef, { tpl: 'Root/18#0' }, 'measured on its own element' );
	assert.deepEqual( call.widthShown, [ 375 ] );
	assert.equal( byRef( r, 'Root/14#0' ).widthVariants, undefined );
} );

test( 'negative control: a phone-only element that replaces content hidden on phones still hides the block there', () => {
	const r = header( PILL( [ 768, 1440 ] ) );
	assert.deepEqual( byRef( r, 'Root/14#0' ).widthVariants, [ { key: 'Root/18#0', shown: [ 375 ] } ] );
	assert.deepEqual( byRef( r, 'Root/18#0' ).widthShown, [ 375 ] );
} );
