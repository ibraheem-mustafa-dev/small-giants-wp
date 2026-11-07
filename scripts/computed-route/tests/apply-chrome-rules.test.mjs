// Chrome and drawer rules added for the Indus round 8 hover and device points. Run: node --test tests/apply-chrome-rules.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { itemCardHover, arrowHover, spanAfter } from '../lib/apply-chrome-cards.mjs';
import { groundRule } from '../lib/apply-chrome-ground.mjs';
import { iconHoverColour } from '../lib/apply-chrome-iconcolour.mjs';
import { cardHoverDevices, entranceDevices } from '../lib/apply-drawer-devices.mjs';
import { flatten } from '../lib/apply-skeleton.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const rawSnapshot = { settings: { custom: { easing: { default: 'cubic-bezier(.34,1.56,.64,1)', emphasised: 'cubic-bezier(0.16, 0.84, 0.32, 1)' }, duration: { fast: '250ms' }, distance: { md: '6px' } } } };
const rec = ( id, tpl, props, detail = ':hover rule (style-hover), applied with !important', extra = {} ) => ( { id, mechanism: 'css-transition', status: 'active', element: { dc: 'D', template_tpl_id: String( tpl ), description: extra.description ?? 'a' }, trigger: { type: 'hover', detail }, duration_ms: 350, easing: 'cubic-bezier(.16,.84,.32,1)', properties: props, ...extra } );
const index = ( records ) => recordIndex( records, 'D' );
const pair = ( ref, id ) => ( { ref, tpl: `Root/${ id }#0` } );

test( 'span: ids after the target up to the next element that pairs with a live block', () => {
	const surface = { pairs: [ pair( 'a', 10 ), pair( 'gone', 12 ), pair( 'b', 15 ) ] };
	assert.deepEqual( spanAfter( { target: pair( 'a', 10 ), surface, all: { blocks: { a: {}, b: {} } } } ), [ 11, 12, 13, 14 ] );
	assert.deepEqual( spanAfter( { target: pair( 'a', 10 ), surface, all: { blocks: { a: {}, b: {}, gone: {} } } } ), [ 11 ] );
} );

test( 'item card hover: the card lift and shadow of a block that declares items become the part hover and shadow settings', () => {
	const records = [ rec( 'TR-091', 606, [ { property: 'transform', from: null, to: 'translateY(-6px)', duration_ms: 350 }, { property: 'box-shadow', from: null, to: '0 26px 46px -28px rgba(7,60,80,.5)' } ] ) ];
	const ctx = { db, rawSnapshot, block: 'sgs/post-grid', saved: {}, target: pair( 'g', 604 ), surface: { pairs: [ pair( 'g', 604 ) ] }, all: { blocks: { g: {} } }, recordsIndex: index( records ) };
	const [ item ] = itemCardHover( ctx );
	assert.equal( item.status, 'op' );
	assert.ok( item.writes.some( ( w ) => 'shadowHover' === w.attr && '0 26px 46px -28px' === w.value ) );
	assert.ok( item.writes.some( ( w ) => 'shadowColourHover' === w.attr && 'rgba(7,60,80,.5)' === w.value ) );
	assert.ok( item.writes.some( ( w ) => 'shadowLiftOnHover' === w.attr && false === w.value ) );
	assert.ok( 'translateY' in item.writes.find( ( w ) => 'sgsMotion' === w.attr ).value.elements.card.hover.state.values );
} );

test( 'item card hover negative control: a block that declares no items, and a span with no hover record, write nothing', () => {
	const records = [ rec( 'TR-091', 606, [ { property: 'transform', from: null, to: 'translateY(-6px)' } ] ) ];
	const base = { db, rawSnapshot, saved: {}, target: pair( 'g', 604 ), surface: { pairs: [ pair( 'g', 604 ) ] }, all: { blocks: { g: {} } } };
	assert.deepEqual( itemCardHover( { ...base, block: 'sgs/icon', recordsIndex: index( records ) } ), [] );
	assert.deepEqual( itemCardHover( { ...base, block: 'sgs/post-grid', recordsIndex: index( [] ) } ), [] );
} );

test( 'arrow hover: a parent-driven arrow slide becomes the icon part hover driven by the group', () => {
	const records = [ rec( 'TR-071', 419, [ { property: 'transform', from: 'translateX(var(--ax,0px))', to: 'translateX(4px)', duration_ms: 300 } ], ':hover - parent-driven: --ax set by :hover on tpl 410', { description: 'span {{ arrowIcon }}' } ) ];
	const ctx = { db, rawSnapshot, block: 'sgs/button', saved: {}, target: pair( 'btn', 418 ), surface: { pairs: [ pair( 'btn', 418 ), pair( 'next', 421 ) ] }, all: { blocks: { btn: {}, next: {} } }, recordsIndex: index( records ) };
	const [ item ] = arrowHover( ctx );
	assert.equal( item.status, 'op' );
	const state = item.writes[ 0 ].value.elements.icon.hover.state;
	assert.equal( state.source, 'group' );
	assert.equal( state.values.translateX, 4 );
	assert.deepEqual( arrowHover( { ...ctx, recordsIndex: index( [] ) } ), [] );
	assert.deepEqual( arrowHover( { ...ctx, block: 'sgs/text' } ), [] );
} );

test( 'ground: a hover ground the draft lacks is cleared; one the draft has, or an unread hover, is left', () => {
	const f = ( bg, hbg ) => ( { styles: { 'background-color': bg }, hover: { 'background-color': hbg } } );
	const ctx = ( d, l ) => ( { saved: { backgroundColourHover: '#D8CA501F' }, target: pair( 'c', 726 ), draft: { 1440: d }, live: { 1440: l }, snapshot: null } );
	const [ item ] = groundRule( ctx( f( 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)' ), f( 'rgba(0, 0, 0, 0)', 'rgba(216, 202, 80, 0.12)' ) ) );
	assert.deepEqual( item.writes, [ { attr: 'backgroundColourHover', unset: true } ] );
	assert.deepEqual( groundRule( ctx( f( 'rgba(0, 0, 0, 0)', 'rgb(1, 2, 3)' ), f( 'rgba(0, 0, 0, 0)', 'rgb(1, 2, 3)' ) ) ), [] );
	assert.deepEqual( groundRule( ctx( f( 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)' ), { styles: {}, hover: { unreached: true } } ) ), [] );
} );

test( 'icon colour: the record colour is written to iconColourHover; a block without the setting, or a record with no colour, is left', () => {
	const records = [ rec( 'TR-053', 244, [ { property: 'color', from: 'var(--ic)', to: '#D8CA50' } ], ':hover - parent-driven: --ic set by :hover on tpl 243' ) ];
	const ctx = { saved: { iconColourHover: 'primary' }, target: pair( 'i', 244 ), recordsIndex: index( records ), snapshot: { palette: [] } };
	const [ item ] = iconHoverColour( ctx );
	assert.equal( item.writes[ 0 ].attr, 'iconColourHover' );
	assert.equal( item.writes[ 0 ].value, '#D8CA50' );
	assert.deepEqual( iconHoverColour( { ...ctx, saved: {} } ), [] );
	assert.deepEqual( iconHoverColour( { ...ctx, recordsIndex: index( [] ) } ), [] );
} );

const nodes = flatten( [ { b: 'sgs/nav-drawer', t: '108', c: [ { b: 'sgs/mega-panel', t: '134', a: { source: 'sgs_mega_menu: sectors' }, c: [ { b: 'sgs/mega-aside', t: '139' }, { b: 'sgs/card-grid', t: '158', x: 4, item: { slot: 'card', t: '160' } } ] } ] } ] );
const skeleton = [ { id: 'drawer', nodes } ];
const hoverRec = rec( 'TR-035', 160, [ { property: 'transform', from: null, to: 'translateY(-4px) rotate(-1deg)', duration_ms: 350 } ] );
const open = { id: 'A-39', group: 'drawer', mechanism: 'waapi', stagger: { ms: 45, base_ms: 80, cap_ms: 360 }, duration_ms: 520, easing: 'cubic-bezier(.16,.84,.32,1)', element: { dc: 'D', template_tpl_id: [ '160' ] }, trigger: { type: 'state' }, properties: [] };
const entrance = { trigger: 'open', values: { from: { opacity: 0, translateY: 14 }, to: { opacity: 1, translateY: 0 }, duration: 460, delay: 0, easing: 'token:entrance.easing' } };

test( 'drawer card hover devices: the drawer card pose becomes Tablet and Mobile hover values on a linked container', () => {
	const saved = { sgsBlockLink: '/x/', sgsMotion: { v: 1, elements: { root: { hover: { state: { values: { translateY: -6, duration: 250, easing: 'token:easing.emphasised' } } } } } } };
	const ctx = { db, rawSnapshot, skeleton, surface: { name: 'mega-sectors' }, block: 'sgs/container', saved, target: pair( 'c', 87 ), recordsIndex: index( [ hoverRec ] ) };
	const items = cardHoverDevices( ctx );
	const devices = items[ 0 ].writes[ 0 ].value.elements.root.hover.state.devices;
	assert.equal( devices.tablet.translateY, -4 );
	assert.equal( devices.mobile.rotate, -1 );
	assert.deepEqual( cardHoverDevices( { ...ctx, surface: { name: 'mega-about' } } ), [] );
	assert.deepEqual( cardHoverDevices( { ...ctx, saved: { ...saved, sgsBlockLink: undefined } } ), [] );
} );

test( 'drawer entrance devices: the stagger index counts the aside the live panel gives no entrance, delays cap', () => {
	const mk = ( n ) => Object.fromEntries( Array.from( { length: n }, ( _, i ) => [ `c-${ i }`, { block: 'sgs/container', attrs: { sgsMotion: { v: 1, elements: { root: { entrance: { base: entrance } } } } } } ] ) );
	const blocks = mk( 4 );
	const ctx = ( ref ) => ( { db, rawSnapshot, skeleton, surface: { name: 'mega-sectors' }, block: 'sgs/container', saved: blocks[ ref ].attrs, target: pair( ref, 87 ), records: [ open ], recordsIndex: index( [ open ] ), all: { blocks } } );
	const delay = ( ref ) => entranceDevices( ctx( ref ) )[ 0 ].writes[ 0 ].value.elements.root.entrance.base.devices.mobile;
	assert.deepEqual( delay( 'c-0' ), { duration: 520, delay: 125 } );
	assert.deepEqual( delay( 'c-3' ), { duration: 520, delay: 260 } );
	assert.deepEqual( entranceDevices( { ...ctx( 'c-0' ), saved: {} } ), [] );
	assert.deepEqual( entranceDevices( { ...ctx( 'c-0' ), records: [] } ), [] );
} );

test( 'settle: a deep write is equal once the saved document holds that part, and an op while it does not', async () => {
	const { settle } = await import( '../lib/apply-chrome-records.mjs' );
	const part = { v: 1, elements: { number: { hover: { state: { values: { scale: 1.12 } } } } } };
	const saved = { sgsMotion: { v: 1, elements: { root: { x: 1 }, number: { hover: { state: { values: { scale: 1.12, duration: 450 } } } } } } };
	assert.equal( settle( { prop: 'p', why: 'w', saved, writes: [ { attr: 'sgsMotion', value: part, merge: 'deep' } ] } ).status, 'equal' );
	assert.equal( settle( { prop: 'p', why: 'w', saved: { sgsMotion: { v: 1, elements: {} } }, writes: [ { attr: 'sgsMotion', value: part, merge: 'deep' } ] } ).status, 'op' );
	assert.equal( settle( { prop: 'p', why: 'w', saved: { a: 1 }, writes: [ { attr: 'a', value: 1 } ] } ).status, 'equal' );
} );

test( 'item card hover negative control: a shadow list or a second colour is refused, not half-written', () => {
	const records = [ rec( 'TR-091', 606, [ { property: 'transform', from: null, to: 'translateY(-6px)' }, { property: 'box-shadow', from: null, to: '0 2px 4px rgba(0,0,0,.2), 0 20px 40px rgba(7,60,80,.5)' } ] ) ];
	const ctx = { db, rawSnapshot, block: 'sgs/post-grid', saved: {}, target: pair( 'g', 604 ), surface: { pairs: [ pair( 'g', 604 ) ] }, all: { blocks: { g: {} } }, recordsIndex: index( records ) };
	const items = itemCardHover( ctx );
	assert.ok( items.some( ( i ) => 'no-setting' === i.status && /hover shadow/.test( i.prop ) ) );
	assert.ok( ! items.flatMap( ( i ) => i.writes ?? [] ).some( ( w ) => 'shadowHover' === w.attr ) );
} );

test( 'heading level: a real draft heading sets its level; a p or div takes the level below the nearest real heading before it; equal and subheadings are left', async () => {
	const { headingLevel } = await import( '../lib/apply-chrome-heading.mjs' );
	const facts = { 'x-1': { tag: 'h2' }, 'x-2': { tag: 'div' }, 'x-3': { tag: 'h3' } };
	const blocks = Object.fromEntries( Object.keys( facts ).map( ( k ) => [ k, { block: 'sgs/heading', attrs: {} } ] ) );
	const ctx = ( ref, saved = {} ) => ( { block: 'sgs/heading', saved, target: { ref, tpl: 'Root/1#0' }, draft: { 1440: facts[ ref ] }, all: { blocks, drafts: { 1440: { facts } } } } );
	assert.deepEqual( headingLevel( ctx( 'x-2' ) )[ 0 ].writes, [ { attr: 'level', value: 'h3' } ] );
	assert.deepEqual( headingLevel( ctx( 'x-3' ) )[ 0 ].writes, [ { attr: 'level', value: 'h3' } ] );
	assert.equal( headingLevel( ctx( 'x-1' ) )[ 0 ].status, 'equal' );
	assert.equal( headingLevel( ctx( 'x-3', { level: 'h3' } ) )[ 0 ].status, 'equal' );
	assert.deepEqual( headingLevel( ctx( 'x-2', { headingRole: 'subheading' } ) ), [] );
	assert.deepEqual( headingLevel( { ...ctx( 'x-2' ), block: 'sgs/text' } ), [] );
} );

test( 'gallery devices: the drawer tile height and column count come from the draft inventory, per device; no inventory is a no-setting row', async () => {
	const { galleryDevices } = await import( '../lib/apply-drawer-devices.mjs' );
	const nodes = flatten( [ { b: 'sgs/nav-drawer', t: '108', c: [ { b: 'sgs/mega-panel', t: '134', a: { source: 'sgs_mega_menu: brands' }, c: [ { b: 'sgs/gallery', t: '169', x: 9, item: { slot: 'logo tile', t: '171' } } ] } ] } ] );
	const inventory = [ { key: 'Root/171#0', tpl: 171, box: { 375: { w: 97, h: 64 }, 768: { w: 118.7, h: 64 } } }, { key: 'Root/169#0', tpl: 169, attrs: { style: 'display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));' } } ];
	const ctx = { skeleton: [ { id: 'drawer', nodes } ], surface: { name: 'mega-brands' }, block: 'sgs/gallery', saved: { columns: { desktop: 4, tablet: 3, mobile: 3 } }, target: pair( 'g', 98 ), clientData: { inventory } };
	const items = galleryDevices( ctx );
	assert.deepEqual( items.find( ( i ) => 'tileMinHeight' === i.prop ).writes[ 0 ].value, { tablet: '64px', mobile: '64px' } );
	assert.equal( items.find( ( i ) => 'columns' === i.prop ).status, 'equal' );
	assert.equal( galleryDevices( { ...ctx, clientData: { inventory: [] } } ).length, 0 );
	assert.equal( galleryDevices( { ...ctx, surface: { name: 'mega-about' } } ).length, 0 );
} );
