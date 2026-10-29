// Recognition by names and attributes (Spec 48 FR-48-6, lib/skeleton-recognise.mjs): an element is the mode-bearing block whose
// name holds the words of its own features, in the mode the element itself shows. A fixed element is the floating variant (and
// in the footer's bottom row, rules.footerSlots); the same block in flow stays where the draft puts it with its static or
// inline value; a sticky full-width bar in the header's top row is the notice banner with its sticky edge. The framework DB
// is copied to a temporary file and given the one setting value block.json now declares (the whatsapp-cta variant enum, which
// a reseed writes), so the test holds before and after a reseed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { openDb, DB_PATH } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-recognise-' ) );
const tmp = path.join( dir, 'framework.db' );
fs.copyFileSync( DB_PATH, tmp );
{
	const w = new DatabaseSync( tmp );
	w.prepare( "UPDATE block_attributes SET enum_values = ? WHERE block_slug = 'sgs/whatsapp-cta' AND attr_name = 'variant' AND enum_values IS NULL" ).run( JSON.stringify( [ 'inline', 'floating', 'banner', 'card' ] ) );
	w.close();
}
const db = openDb( tmp );
process.on( 'exit', () => {
	db.close();
	fs.rmSync( dir, { recursive: true, force: true } );
} );
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w, h ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const every = ( v ) => ( { 375: v, 768: v, 1440: v } );
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100, 400, 100 ), visible: x.visible || every( true ), display: x.display || 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ), ...( x.strip ? { strip: x.strip } : {} ) } );
const inv = ( root, elements, beside = [] ) => ( { generated: 'fixture', source: 'fixture', root: 'x', checks: { rootKey: root }, elements, ...( beside.length ? { beside } : {} ) } );
const run = ( inventory, kind ) => proposeSkeleton( { inventory, facts: facts(), surface: kind, surfaceKind: kind, surfaceName: kind, db } );
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const find = ( r, name ) => flat( r.skeleton ).filter( ( n ) => n.name === name );
const FIXED = every( 'fixed' );
const STATIC = every( 'static' );

// A footer: a root (1) holding a grid (2) of two link groups, then the given extra elements.
const footer = ( extra ) => {
	const col = ( n, label, x ) => [ el( `Root/${ n }#0`, 'Root/2#0', 'div', '', { depth: 2, box: place( x, 100, 100, 100 ) } ), el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'h4', label, { depth: 3 } ), el( `Root/${ n + 2 }#0`, `Root/${ n }#0`, 'a', `${ label } link`, { depth: 3, attrs: { href: `/${ label }` } } ) ];
	return [ el( 'Root/1#0', null, 'footer', '', { depth: 0, box: place( 0, 100, 400, 300 ) } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { box: place( 0, 100, 400, 100 ), display: 'grid' } ), ...col( 3, 'Shop', 0 ), ...col( 6, 'Help', 150 ), ...extra ];
};
// A chat link, its label shown from 768 up.
const chat = ( n, parent, pos = FIXED, style = 'position: fixed; right: 22px; bottom: 22px' ) => [
	el( `Root/${ n }#0`, parent, 'a', '', { attrs: { href: 'https://wa.me/441217714330', 'aria-label': 'Message us on WhatsApp', style }, position: pos, box: place( 330, 340, 54, 52 ) } ),
	el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'span', 'Chat with our team', { depth: 2, visible: { 375: false, 768: true, 1440: true }, box: { 375: null, 768: { x: 0, y: 0, w: 100, h: 20 }, 1440: { x: 0, y: 0, w: 100, h: 20 } } } ),
];
const head = () => [ el( 'Root/1#0', null, 'header', '', { depth: 0, box: place( 0, 90, 400, 60 ) } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { display: 'flex', box: place( 0, 100, 400, 20 ) } ), el( 'Root/3#0', 'Root/2#0', 'nav', '', { depth: 2 } ), el( 'Root/4#0', 'Root/3#0', 'a', 'Shop', { depth: 3, attrs: { href: '/shop' } } ), el( 'Root/5#0', 'Root/3#0', 'a', 'Help', { depth: 3, attrs: { href: '/help' } } ) ];
const bar = ( position, style ) => [ el( 'Root/10#0', null, 'div', '', { strip: { side: 'before', distance: 1 }, position, attrs: style ? { style } : {}, box: { 375: { x: 0, y: 0, w: 375, h: 30 }, 768: { x: 0, y: 0, w: 768, h: 30 }, 1440: { x: 0, y: 0, w: 1440, h: 30 } } } ), el( 'Root/11#0', 'Root/10#0', 'span', 'Free delivery over 50 pounds', { depth: 2, box: { 375: { x: 0, y: 0, w: 375, h: 30 }, 768: { x: 0, y: 0, w: 768, h: 30 }, 1440: { x: 0, y: 0, w: 1440, h: 30 } } } ) ];
const besideBar = ( position ) => [ { key: 'Root/10#0', side: 'before', distance: 1, position, renders: true, holdsOtherRoot: false } ];

test( 'the decisions entry is sound: rules.recognise and the link hosts compile and name known blocks', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	const R = facts().decisions.rules;
	assert.equal( R.linkSourceForKind.hosts[ 'wa.me' ], 'whatsapp' );
	assert.equal( R.recognise.modes.floating, 'floating' );
} );

test( 'MUST FAIL: a WhatsApp link fixed to the corner is sgs/whatsapp-cta, floating, with its label and the width its label hides below, in the footer bottom row', () => {
	const r = run( inv( 'Root/1#0', footer( chat( 9, 'Root/1#0' ) ) ), 'footer' );
	const [ cta ] = find( r, 'sgs/whatsapp-cta' );
	assert.ok( cta, 'the fixed link is the WhatsApp block' );
	assert.equal( cta.attributes.variant, 'floating' );
	assert.equal( cta.attributes.label, 'Chat with our team' );
	assert.equal( cta.attributes.floatingHideLabelBelow, 768 );
	const bottom = r.skeleton[ 0 ].innerBlocks.find( ( n ) => 'bottom' === n.attributes.rowSlot );
	assert.ok( flat( bottom.innerBlocks ).includes( cta ), 'a fixed element goes in the footer bottom row' );
	const row = r.proposal.rows.find( ( x ) => 'Root/9#0' === x.key );
	assert.equal( row.rule, 'recognise' );
	assert.match( row.reason, /sgs\/whatsapp-cta holds whatsapp/ );
} );

test( 'negative control: the same WhatsApp link in flow stays where the draft puts it with the inline variant, never floating', () => {
	const page = [ el( 'Root/1#0', null, 'section', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'p', 'Questions?' ), ...chat( 3, 'Root/1#0', STATIC, 'display: inline-flex' ) ];
	const r = run( inv( 'Root/1#0', page ), 'page' );
	const [ cta ] = find( r, 'sgs/whatsapp-cta' );
	assert.ok( cta, 'the in-flow link is still the WhatsApp block' );
	assert.equal( cta.attributes.variant, 'inline' );
	assert.equal( cta.attributes.floatingHideLabelBelow, undefined );
	assert.ok( r.skeleton[ 0 ].innerBlocks.includes( cta ), 'it stays a child of the section it is in' );
} );

test( 'MUST FAIL: a rating badge fixed to a corner is sgs/google-rating-badge, floating, with the corner and the offset the draft declares', () => {
	const badge = [ el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { class: 'google-rating-badge', style: 'position: fixed; left: 20px; bottom: 20px' }, position: FIXED, box: place( 20, 340, 120, 50 ) } ), el( 'Root/10#0', 'Root/9#0', 'span', '4.9 on Google', { depth: 2 } ) ];
	const r = run( inv( 'Root/1#0', footer( badge ) ), 'footer' );
	const [ b ] = find( r, 'sgs/google-rating-badge' );
	assert.ok( b );
	assert.deepEqual( [ b.attributes.position, b.attributes.floatingCorner, b.attributes.floatingOffset ], [ 'floating', 'bottom-left', { desktop: '20px' } ] );
} );

test( 'negative control: a rating badge in flow keeps the static position and takes no corner or offset', () => {
	const page = [ el( 'Root/1#0', null, 'section', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { attrs: { class: 'google-rating-badge' }, position: STATIC } ), el( 'Root/3#0', 'Root/2#0', 'span', '4.9 on Google', { depth: 2 } ) ];
	const r = run( inv( 'Root/1#0', page ), 'page' );
	const [ b ] = find( r, 'sgs/google-rating-badge' );
	assert.ok( b );
	assert.equal( b.attributes.position, 'static' );
	assert.equal( b.attributes.floatingCorner, undefined );
	assert.equal( b.attributes.floatingOffset, undefined );
} );

test( 'negative control: a fixed element whose features no block name holds is not recognised', () => {
	const odd = [ el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { class: 'promo', style: 'position: fixed; right: 10px; bottom: 10px' }, position: FIXED } ), el( 'Root/10#0', 'Root/9#0', 'span', 'Hello', { depth: 2 } ) ];
	const r = run( inv( 'Root/1#0', footer( odd ) ), 'footer' );
	assert.ok( ! r.proposal.rows.some( ( x ) => 'recognise' === x.rule ) );
} );

test( 'negative control: a section that merely carries a block word in its class is not recognised (it holds a heading and a list)', () => {
	const page = [ el( 'Root/1#0', null, 'section', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { attrs: { class: 'whatsapp-help' } } ), el( 'Root/3#0', 'Root/2#0', 'h3', 'Help', { depth: 2 } ), el( 'Root/4#0', 'Root/2#0', 'ul', '', { depth: 2 } ), el( 'Root/5#0', 'Root/4#0', 'li', 'One', { depth: 3 } ) ];
	const r = run( inv( 'Root/1#0', page ), 'page' );
	assert.equal( find( r, 'sgs/whatsapp-cta' ).length, 0 );
} );

test( 'MUST FAIL: a sticky full-width bar beside the header is the notice banner in the top row with its sticky edge', () => {
	const r = run( inv( 'Root/1#0', [ ...head(), ...bar( every( 'sticky' ), 'position: sticky; top: 0' ) ], besideBar( 'sticky' ) ), 'header' );
	const top = r.skeleton[ 0 ].innerBlocks.find( ( n ) => 'top' === n.attributes.rowSlot );
	const [ banner ] = find( { skeleton: top.innerBlocks }, 'sgs/notice-banner' );
	assert.ok( banner, 'the sticky bar is the notice banner, inside the top row' );
	assert.equal( banner.attributes.stickyPosition, 'top' );
	assert.equal( banner.attributes.text, 'Free delivery over 50 pounds' );
} );

test( 'negative control: the same bar in flow (not sticky) is not turned into a notice banner', () => {
	const r = run( inv( 'Root/1#0', [ ...head(), ...bar( STATIC ) ], besideBar( 'static' ) ), 'header' );
	assert.equal( find( r, 'sgs/notice-banner' ).length, 0 );
} );

test( 'negative control: a fixed wrapper that holds many parts is not the block its link host names', () => {
	const kids = Array.from( { length: 10 }, ( _, i ) => el( `Root/${ 20 + i }#0`, 'Root/9#0', 'span', `Part ${ i }`, { depth: 2 } ) );
	const wrap = [ el( 'Root/9#0', 'Root/1#0', 'a', '', { attrs: { href: 'https://wa.me/1', style: 'position: fixed; right: 10px; bottom: 10px' }, position: FIXED } ), ...kids ];
	const r = run( inv( 'Root/1#0', footer( wrap ) ), 'footer' );
	assert.equal( find( r, 'sgs/whatsapp-cta' ).length, 0 );
} );

test( 'negative control: a sticky full-width header element is never a notice banner', () => {
	const sticky = [ el( 'Root/1#0', null, 'header', '', { depth: 0, position: every( 'sticky' ), attrs: { class: 'site-banner', style: 'position: sticky; top: 0' }, box: { 375: { x: 0, y: 0, w: 375, h: 30 }, 768: { x: 0, y: 0, w: 768, h: 30 }, 1440: { x: 0, y: 0, w: 1440, h: 30 } } } ), el( 'Root/2#0', 'Root/1#0', 'span', 'Words only', { depth: 1 } ) ];
	const r = run( inv( 'Root/1#0', sticky ), 'header' );
	assert.equal( find( r, 'sgs/notice-banner' ).length, 0 );
} );

test( 'negative control: a word many blocks are named with is too weak to choose one (a fixed element classed notice)', () => {
	const odd = [ el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { class: 'notice', style: 'position: fixed; right: 10px; bottom: 10px' }, position: FIXED } ), el( 'Root/10#0', 'Root/9#0', 'span', 'New', { depth: 2 } ) ];
	const r = run( inv( 'Root/1#0', footer( odd ) ), 'footer' );
	assert.ok( ! r.proposal.rows.some( ( x ) => 'recognise' === x.rule ) );
} );

test( 'negative control: two blocks that the element names equally well give no verdict', () => {
	const odd = [ el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { class: 'whatsapp badge', style: 'position: fixed; right: 10px; bottom: 10px' }, position: FIXED, box: place( 300, 340, 60, 40 ) } ), el( 'Root/10#0', 'Root/9#0', 'span', 'Hi', { depth: 2 } ) ];
	const r = run( inv( 'Root/1#0', footer( odd ) ), 'footer' );
	assert.ok( ! r.proposal.rows.some( ( x ) => 'recognise' === x.rule ) );
} );

test( 'negative control: a floating link whose label shows at every read width writes no hidden-label width', () => {
	const shown = chat( 9, 'Root/1#0' ).map( ( x ) => ( 'span' === x.tag ? { ...x, visible: every( true ), box: place( 0, 0, 100, 20 ) } : x ) );
	const r = run( inv( 'Root/1#0', footer( shown ) ), 'footer' );
	const [ cta ] = find( r, 'sgs/whatsapp-cta' );
	assert.equal( cta.attributes.variant, 'floating' );
	assert.equal( cta.attributes.floatingHideLabelBelow, undefined );
} );

test( 'negative control: a fixed element that covers the whole screen is a bar by width only and is never a notice banner', () => {
	const cover = [ el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { style: 'position: fixed; top: 0; left: 0' }, position: FIXED, box: { 375: { x: 0, y: 0, w: 375, h: 900 }, 768: { x: 0, y: 0, w: 768, h: 900 }, 1440: { x: 0, y: 0, w: 1440, h: 900 } } } ), el( 'Root/10#0', 'Root/9#0', 'span', 'Hello', { depth: 2 } ) ];
	const r = run( inv( 'Root/1#0', footer( cover ) ), 'footer' );
	assert.equal( find( r, 'sgs/notice-banner' ).length, 0 );
} );

test( 'negative control: a WhatsApp icon link with no words in flow (a brand icon in a row of icons) is never the block', () => {
	const icon = ( n, href ) => [ el( `Root/${ n }#0`, 'Root/2#0', 'a', '', { depth: 2, attrs: { href }, position: STATIC } ), el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'svg', '', { depth: 3 } ) ];
	const page = [ el( 'Root/1#0', null, 'section', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { display: 'flex' } ), ...icon( 3, 'https://www.instagram.com/x' ), ...icon( 5, 'https://wa.me/441217714330' ) ];
	const r = run( inv( 'Root/1#0', page ), 'page' );
	assert.deepEqual( find( r, 'sgs/whatsapp-cta' ), [] );
	assert.notEqual( r.proposal.rows.find( ( x ) => 'Root/5#0' === x.key ).rule, 'recognise' );
} );
