// Navigation gap rules (Indus round 8): the drawer close glyph size, the row arrow's hover colour scoped to panels that draw rows,
// and the drawer feature card as one link with a hover shadow. Run: node --test tests/apply-chrome-gaps-nav.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { chrome } from '../lib/apply-family-chrome.mjs';
import { closeIconSize, draftBarLength, strokeLengthPerUnit } from '../lib/apply-chrome-closeicon.mjs';
import { asideCard } from '../lib/apply-chrome-aside.mjs';
import { flatten } from '../lib/apply-skeleton.mjs';
import { recordIndex } from '../lib/apply-records.mjs';

const SVG = '<svg class="x" xmlns="http://www.w3.org/2000/svg" viewbox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M8.64 8.64L21.36 21.36M21.36 8.64L8.64 21.36" /></svg>';
const bar = ( key, sign, w = '18px' ) => ( { key, parentKey: 'Root/118#0', tag: 'span', attrs: { style: `position: absolute; width: ${ w }; height: 2.5px; transform: rotate(${ sign }45deg);` } } );
const inventory = [ { key: 'Root/108#0', tag: 'div', attrs: {} }, { key: 'Root/118#0', parentKey: 'Root/108#0', tag: 'button', attrs: {} }, bar( 'Root/119#0', '' ), bar( 'Root/120#0', '-' ) ];

test( 'close glyph: the size draws the draft bar length from the saved svg geometry', () => {
	assert.ok( Math.abs( strokeLengthPerUnit( SVG ) - ( 12.72 * Math.SQRT2 + 2.5 ) / 30 ) < 1e-9 );
	assert.equal( draftBarLength( inventory, { tpl: 'Root/108#0' } ), 18 );
	const ctx = { saved: { closeIcon: { source: 'custom', svg: SVG }, closeIconSize: { desktop: '30px' } }, target: { tpl: 'Root/108#0' }, clientData: { inventory } };
	const [ op ] = closeIconSize( ctx );
	assert.deepEqual( [ op.status, op.writes[ 0 ].value ], [ 'op', { desktop: '26.5px' } ] );
	assert.equal( closeIconSize( { ...ctx, saved: { ...ctx.saved, closeIconSize: { desktop: '26.5px' } } } )[ 0 ].status, 'equal' );
	const tiered = closeIconSize( { ...ctx, saved: { ...ctx.saved, closeIconSize: { desktop: '30px', mobile: '30px' } } } )[ 0 ];
	assert.deepEqual( tiered.writes[ 0 ].value, { desktop: '26.5px', mobile: '26.5px' } );
	assert.equal( chrome.decide( { ...ctx, block: 'sgs/nav-drawer', draft: {}, live: {}, aux: {}, recordsIndex: recordIndex( [], 'D' ) } ).find( ( i ) => 'closeIconSize' === i.prop ).status, 'op' );
} );

test( 'close glyph negative controls: no draft bars, a glyph that is not a straight-stroke custom svg, or bars of two lengths write nothing', () => {
	const ctx = { saved: { closeIcon: { source: 'custom', svg: SVG } }, target: { tpl: 'Root/108#0' }, clientData: { inventory } };
	assert.deepEqual( closeIconSize( { ...ctx, clientData: { inventory: inventory.slice( 0, 2 ) } } ), [] );
	assert.equal( closeIconSize( { ...ctx, saved: { closeIcon: { source: 'lucide', name: 'x' } } } )[ 0 ].status, 'no-setting' );
	assert.equal( closeIconSize( { ...ctx, saved: { closeIcon: { source: 'custom', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>' } } } )[ 0 ].status, 'no-setting' );
	assert.equal( draftBarLength( [ ...inventory.slice( 0, 3 ), bar( 'Root/120#0', '-', '20px' ) ], { tpl: 'Root/108#0' } ), null );
	assert.equal( strokeLengthPerUnit( '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M18 6 6 18"/></svg>' ), Math.hypot( 12, 12 ) / 24 );
} );

const rec = ( id, tpl, descr, props ) => ( { id, mechanism: 'css-transition', status: 'active', element: { dc: 'D', template_tpl_id: String( tpl ), description: descr }, trigger: { type: 'hover', detail: ':hover rule (style-hover)' }, properties: props } );
const fade = rec( 'TR-034', 156, 'span {{ arrowIcon }}', [ { property: 'opacity', from: 'var(--la,.4)', to: '1' } ] );
const panel = ( name, kids ) => ( { b: 'sgs/mega-panel', t: '134', a: { source: `sgs_mega_menu: ${ name }` }, c: kids } );
const tree = ( ...panels ) => [ { id: 'drawer', nodes: flatten( [ { b: 'sgs/nav-drawer', t: '108', c: panels } ] ) } ];

test( 'row arrow hover: only a panel whose own drawer node holds link rows takes it; a cards panel gets no row and the icon is written when missing', () => {
	const skeleton = tree( panel( 'about', [ { b: 'sgs/mega-group', t: '149' } ] ), panel( 'sectors', [ { b: 'sgs/card-grid', t: '158' } ] ) );
	const run = ( name, saved ) => chrome.decide( { block: 'sgs/mega-panel', skeleton, surface: { name: `mega-${ name }` }, saved, draft: {}, live: {}, aux: {}, recordsIndex: recordIndex( [ rec( 'TR-033', 149, 'span {{ link.label }}', [ { property: 'transform', from: null, to: 'translateX(4px)' } ] ), fade ].map( ( r ) => r ), 'D' ), target: { tpl: 'Root/85#0', key: 'k', ref: 'k', owns: [] }, all: { blocks: {} } } ).filter( ( i ) => 'drawerLinkTrailingColourHover' === i.prop );
	const about = run( 'about', { drawerLinkLabelColour: '#2C3E50' } );
	assert.equal( about.length, 1 );
	assert.deepEqual( about[ 0 ].writes, [ { attr: 'drawerLinkTrailingIcon', value: 'arrow' }, { attr: 'drawerLinkTrailingColourHover', value: '#2C3E50' } ] );
	assert.deepEqual( run( 'about', { drawerLinkLabelColour: '#2C3E50', drawerLinkTrailingIcon: 'arrow' } )[ 0 ].writes, [ { attr: 'drawerLinkTrailingColourHover', value: '#2C3E50' } ] );
	assert.equal( run( 'about', {} )[ 0 ].status, 'no-setting' );
	assert.deepEqual( run( 'sectors', { drawerLinkLabelColour: '#2C3E50' } ), [] );
} );

const nodes = flatten( [ { b: 'sgs/nav-drawer', t: '108', c: [ panel( 'about', [ { b: 'sgs/mega-aside', t: '139' } ] ), panel( 'brands', [ { b: 'sgs/mega-aside', t: '173' } ] ), panel( 'trade', [ { b: 'sgs/mega-aside', t: '139' } ] ) ] } ] );
const card = ( i, href, style = 'display: block; border-radius: 16px;' ) => ( { key: `Root/139#${ i }`, tag: 'a', attrs: { href, style } } );
const shadow = rec( 'TR-030', 139, 'a {{ item.mobileFeature.tag }}', [ { property: 'box-shadow', from: null, to: '0 18px 30px -18px rgba(0,0,0,.6)' } ] );
const facts = { 'cr-a': { box: { x: 0, y: 0, w: 300, h: 400 } }, 'cr-b': { box: { x: 20, y: 300, w: 100, h: 40 } }, 'cr-far': { box: { x: 900, y: 0, w: 100, h: 40 } } };
const aside = ( over = {} ) => ( {
	surface: { name: 'mega-trade' }, target: { tpl: 'Root/67#0' }, saved: {}, recordsIndex: recordIndex( [ shadow ], 'D' ),
	clientData: { inventory: [ card( 0, '#/our-story' ), card( 1, '#/apply' ) ] },
	all: { blocks: { 'cr-a': { block: 'sgs/mega-aside', attrs: {} }, 'cr-b': { block: 'sgs/button', attrs: {} }, 'cr-far': { block: 'sgs/button', attrs: {} } }, lives: { 1440: { facts } } },
	...over,
} );

test( 'drawer feature card: the address, hover shadow and the aside buttons are written; a rest shadow is written when the draft card has one', () => {
	const stub = { goRoutes: new Map(), routes: [], pages: [], site: 'x' };
	const out = ( over ) => asideCard( aside( { links: stub, ...over } ), nodes );
	const rows = out( { clientData: { inventory: [ card( 0, 'https://example.org/apply/' ), card( 1, 'https://example.org/apply/' ) ] } } );
	const link = rows.find( ( r ) => 'aside card link' === r.prop );
	assert.equal( link.ref, 'cr-a' );
	assert.equal( link.writes[ 0 ].attr, 'sgsBlockLink' );
	const shadowOp = rows.find( ( r ) => 'aside card shadow' === r.prop );
	assert.deepEqual( shadowOp.writes, [ { attr: 'asideShadowHover', value: '0 18px 30px -18px' }, { attr: 'asideShadowColourHover', value: 'rgba(0,0,0,.6)' } ] );
	assert.deepEqual( rows.filter( ( r ) => 'visualOnly' === r.prop ).map( ( r ) => r.ref ), [ 'cr-b' ] );
	const resting = out( { clientData: { inventory: [ card( 0, 'https://example.org/a/' ), card( 1, 'https://example.org/a/', 'box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 10px 0px;' ) ] } } ).find( ( r ) => 'aside card shadow' === r.prop );
	assert.equal( resting.writes[ 0 ].value, '0px 4px 10px 0px' );
	assert.equal( resting.writes[ 1 ].value, 'rgba(0, 0, 0, 0.3)' );
} );

test( 'drawer feature card negative controls: no inventory card, an unwanted panel, a shadow list or an unlinked card write nothing wrong', () => {
	const stub = { goRoutes: new Map(), routes: [], pages: [], site: 'x' };
	const base = ( over ) => asideCard( aside( { links: stub, ...over } ), nodes );
	assert.deepEqual( base( { clientData: { inventory: [] } } ), [] );
	assert.deepEqual( base( { surface: { name: 'mega-sectors' } } ), [] );
	assert.deepEqual( base( { surface: { name: 'mega-brands' } } ), [] );
	assert.equal( base( { clientData: { inventory: [ card( 0, 'https://example.org/a/' ) ] } } )[ 0 ].status, 'no-setting' );
	assert.equal( base( { clientData: { inventory: [ card( 0, '#' ), card( 1, '#' ) ] } } ).find( ( r ) => 'aside card link' === r.prop ).status, 'no-setting' );
	const list = rec( 'TR-030', 139, 'a', [ { property: 'box-shadow', from: null, to: '0 2px 4px rgba(0,0,0,.2), 0 8px 16px rgba(0,0,0,.2)' } ] );
	const inv = [ card( 0, 'https://example.org/a/' ), card( 1, 'https://example.org/a/' ) ];
	assert.ok( base( { clientData: { inventory: inv }, recordsIndex: recordIndex( [ list ], 'D' ) } ).some( ( r ) => 'aside card shadow' === r.prop && 'no-setting' === r.status ) );
	const saved = { sgsBlockLink: 'https://example.org/a/', sgsBlockLinkLabel: '', asideShadowHover: '0 18px 30px -18px', asideShadowColourHover: 'rgba(0,0,0,.6)' };
	const done = base( { clientData: { inventory: inv }, all: { ...aside().all, blocks: { ...aside().all.blocks, 'cr-a': { block: 'sgs/mega-aside', attrs: saved }, 'cr-b': { block: 'sgs/button', attrs: { visualOnly: true } } } } } );
	assert.deepEqual( done.map( ( r ) => r.status ), [ 'equal', 'equal' ] );
} );

test( 'row arrow: a draft row that ends in an arrow gets the arrow icon even when the saved panel holds no row colour to keep it at', () => {
	const skeleton = tree( panel( 'about', [ { b: 'sgs/mega-group', t: '149' } ] ), panel( 'sectors', [ { b: 'sgs/card-grid', t: '158' } ] ) );
	const run = ( saved ) => chrome.decide( { block: 'sgs/mega-panel', skeleton, surface: { name: 'mega-about' }, saved, draft: {}, live: {}, aux: {}, recordsIndex: recordIndex( [ rec( 'TR-033', 149, 'span {{ link.label }}', [ { property: 'transform', from: null, to: 'translateX(4px)' } ] ), fade ], 'D' ), target: { tpl: 'Root/85#0', key: 'k', ref: 'k', owns: [] }, all: { blocks: {} } } );
	const items = run( {} );
	assert.deepEqual( items.find( ( i ) => 'drawerLinkTrailingIcon' === i.prop )?.writes, [ { attr: 'drawerLinkTrailingIcon', value: 'arrow' } ] );
	assert.ok( items.some( ( i ) => 'no-setting' === i.status && 'drawerLinkTrailingColourHover' === i.prop ) );
	// Negative control: an arrow already saved is equal, and a panel with no arrow record writes none.
	assert.equal( run( { drawerLinkTrailingIcon: 'arrow' } ).find( ( i ) => 'drawerLinkTrailingIcon' === i.prop )?.status, 'equal' );
} );
