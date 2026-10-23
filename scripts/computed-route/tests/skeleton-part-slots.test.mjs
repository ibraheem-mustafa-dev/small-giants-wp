// An element a drawing block absorbs that is one of the block's own parts (Spec 48 FR-48-6): the control that opens the
// drawer is the navigation block's burger part, so it becomes the navigation node's draftSlots entry at the part's
// calibrated slot, and its children become the part's sub-part slots (the bars) where calibration measured them.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Example Co' } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const idOf = ( n ) => n.variantKey ?? n.draftRef?.tpl;
const nodeAt = ( r, key ) => nodes( r.skeleton ).find( ( n ) => idOf( n ) === key );
const at = ( x, y, w = 100 ) => ( { x, y, w, h: 20 } );
const el = ( id, parent, tag, words, x = {} ) => {
	const shown = x.widths || [ 375, 768, 1440 ];
	const vis = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, shown.includes( w ) ] ) );
	const box = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, vis[ w ] ? x.box : null ] ) );
	return { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: x.depth ?? 1, tag, template: 'Root', tpl: id, attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: x.snippet || `<${ tag }></${ tag }>`, visible: vis, box, display: x.display || 'block', widths: shown, flexDirection: x.flexDirection || null };
};
const inv = ( elements ) => ( { checks: {}, source: 'fixture', root: 'header', generated: 'fixture', elements } );
const DRAWER = { elements: {}, surfaces: { 'S-09': { id: 'S-09', kind: 'drawer', name: 'Mobile menu', parent: null } } };
const withDrawer = { factRecord: DRAWER, openers: { 'S-09': 'Burger button (toggleMobile) on tablet and mobile' } };
const click = '<button data-dc-tpl="59" sc-camel-on-click="{{ toggleMobile }}"></button>';
const COMPACT = [ 375, 768 ];
const HEADER = [
	el( 1, null, 'header', '', { depth: 0, box: at( 0, 0, 1000 ), display: 'flex' } ),
	el( 45, 1, 'nav', '', { depth: 1, box: at( 0, 0, 400 ), display: 'flex', allText: 'Home About' } ),
	el( 46, 45, 'a', 'Home', { depth: 2, box: at( 0, 0, 50 ), attrs: { href: '/' } } ),
	el( 47, 45, 'a', 'About', { depth: 2, box: at( 60, 0, 50 ), attrs: { href: '/about' } } ),
	el( 56, 1, 'div', '', { depth: 1, widths: COMPACT, box: at( 500, 0 ), display: 'flex' } ),
	el( 59, 56, 'button', '', { depth: 2, widths: COMPACT, box: at( 500, 0 ), snippet: click, display: 'flex' } ),
];
// The bars straight in the button (the draft draws no icon box), or inside one span.
const BARS = [ 60, 61, 62 ].map( ( id, i ) => el( id, 59, 'span', '', { depth: 3, widths: COMPACT, box: at( 500, i * 6, 18 - ( 5 * i ) ) } ) );
const BOXED = [ el( 63, 59, 'span', '', { depth: 3, widths: COMPACT, box: at( 500, 0, 18 ) } ), ...[ 60, 61, 62 ].map( ( id, i ) => el( id, 63, 'span', '', { depth: 4, widths: COMPACT, box: at( 500, i * 6, 18 ) } ) ) ];

const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
const ICON = `${ BURGER } > .sgs-nav-bar-menu__burger-icon`;
const BAR = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
// The slots the real cache holds for these settings (cache/nav-bar-menu.json), burgerSize and burgerWidth at the burger.
const CAL = {
	burgerSize: { slot: BURGER, slots: [ BURGER ] },
	burgerPadding: { slot: BURGER, slots: [ BURGER ] },
	burgerBg: { slot: BURGER, slots: [ BURGER ] },
	burgerBorderWidth: { slot: BURGER, slots: [ BURGER ] },
	burgerIconWidth: { slot: ICON, slots: [ ICON, BAR( 1 ), BAR( 2 ), BAR( 3 ) ] },
	burgerBarThickness: { slot: BAR( 1 ), slots: [ BAR( 1 ), BAR( 2 ), BAR( 3 ) ] },
};
const run = ( elements, calSettings = () => CAL ) => proposeSkeleton( { inventory: inv( elements ), facts, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, ...withDrawer, calSettings } );
const slotsOf = ( r ) => nodeAt( r, 'Root/45#0' ).draftSlots || {};

test( 'MUST FAIL (the opener is the nav\'s burger part): the absorbed button is the nav\'s draftSlots entry at the burger\'s calibrated slot', () => {
	const r = run( [ ...HEADER, ...BARS ] );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/59#0' === x.key ).rule, 'drawerOpener' );
	assert.equal( slotsOf( r )[ BURGER ].tpl, 'Root/59#0' );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/45#0' === x.key ).slots[ BURGER ].tpl, 'Root/59#0' );
} );

test( 'MUST FAIL (the bars are the part\'s sub-part slots): bars that sit straight in the button are the calibrated bar paths, in order; the box the draft does not draw is named, not invented', () => {
	const r = run( [ ...HEADER, ...BARS ] );
	assert.deepEqual( [ 1, 2, 3 ].map( ( n ) => slotsOf( r )[ BAR( n ) ]?.tpl ), [ 'Root/60#0', 'Root/61#0', 'Root/62#0' ] );
	assert.ok( ! ( ICON in slotsOf( r ) ), 'no draft element is the icon box' );
	assert.ok( r.proposal.rows.find( ( x ) => 'Root/45#0' === x.key ).slotNotes.some( ( n ) => n.startsWith( `${ ICON }:` ) ) );
} );

test( 'MUST FAIL (a drawn icon box is its slot): bars inside one span give the box and its bars their own elements', () => {
	const r = run( [ ...HEADER, ...BOXED ] );
	assert.equal( slotsOf( r )[ ICON ].tpl, 'Root/63#0' );
	assert.deepEqual( [ 1, 2, 3 ].map( ( n ) => slotsOf( r )[ BAR( n ) ]?.tpl ), [ 'Root/60#0', 'Root/61#0', 'Root/62#0' ] );
} );

test( 'MUST FAIL (no calibration, no slot): a block with no calibrated burger gains no slot and says so', () => {
	const r = run( [ ...HEADER, ...BARS ], () => ( {} ) );
	assert.ok( ! Object.keys( slotsOf( r ) ).some( ( k ) => k.includes( 'burger' ) ) );
	assert.ok( r.proposal.rows.find( ( x ) => 'Root/45#0' === x.key ).slotNotes.some( ( n ) => n.includes( 'no slot for the burger part' ) ) );
} );
