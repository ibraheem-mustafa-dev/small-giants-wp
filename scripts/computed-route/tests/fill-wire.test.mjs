// Fill's wiring of an element's context and of the shop parts record: canon() gets the draft element's parent display,
// position and direction from Fill (lib/fill-held.mjs::elementContext) on the resolve and held sides; render-matches
// refuses a fixed height whose content overflows it (lib/fill-equivalents.mjs::rendersAt); the copyright line's prefix
// is the draft's own words before the © (lib/skeleton-write-content.mjs::copyrightPrefixOf); and the shop parts record's
// values reach their blocks (lib/fill-shop-parts.mjs). Built on the real framework DB with planted reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { makeSettle, elementContext } from '../lib/fill-held.mjs';
import { rendersAt, fillEquivalent } from '../lib/fill-equivalents.mjs';
import { copyrightPrefixOf, makeContent } from '../lib/skeleton-write-content.mjs';
import { loadShopParts, shopPartWrites } from '../lib/fill-shop-parts.mjs';
import { blockSchema } from '../lib/resolve.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const BASE = { display: 'block', direction: 'ltr', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', 'background-color': 'rgba(0, 0, 0, 0)', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ], ...extra } );
// A container whose calibration page read its root's min-height as `auto` (a flex item there), with its minimum height setting.
const CAL = { 'sgs/container': { block: 'sgs/container', elements: { '': tiers( { ...BASE, 'min-height': 'auto' } ) }, settings: { minHeight: setting( 'min-height' ) }, discovered: {} } };
const snap = ( styles, extra = {} ) => ( { styles: { ...BASE, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null, layoutDisplay: styles.display ?? 'block', ...extra } );
const readsOf = ( spec ) => ( { widths: Object.fromEntries( FIVE.map( ( w ) => [ w, Object.fromEntries( Object.entries( spec ).map( ( [ id, s ] ) => [ id, s ] ) ) ] ) ), declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' } );
const nested = () => [ { name: 'sgs/container', draftRef: '.p', attributes: {}, innerBlocks: [ { name: 'sgs/container', draftRef: '.c', attributes: {} } ] } ];
const run = ( parentDisplay ) => {
	const skeleton = nested();
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const reads = readsOf( { '0:': snap( { display: parentDisplay, 'min-height': '0px' } ), '1:': snap( { 'min-height': '0px' } ) } );
	return { tree, ...fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot, rawSnapshot: { settings: { custom: {} } }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } ) };
};
const minHeightWrites = ( r ) => r.writes.filter( ( w ) => 'minHeight' === w.attr && 1 === w.index );

test( 'MUST FAIL: a draft 0px minimum on a box whose parent lays out no flex or grid items equals a calibrated auto, so nothing is written', () => {
	const r = run( 'block' );
	assert.deepEqual( minHeightWrites( r ), [], JSON.stringify( minHeightWrites( r ) ) );
	assert.equal( r.tree[ 0 ].innerBlocks[ 0 ].attributes.minHeight, undefined );
	assert.deepEqual( [ ...r.unmapped, ...( r.settled || [] ) ].filter( ( u ) => 'direction' === u.property ), [], 'a context read is never a row of its own' );
	// Negative control: in a flex parent the auto minimum is content-based, so the draft's 0px is a real value and is written.
	const flex = run( 'flex' );
	assert.equal( minHeightWrites( flex ).length, 1, 'a flex item\'s auto minimum is not 0px' );
} );

test( 'MUST FAIL: elementContext reads the parent node\'s layout element for a root, the slot one step up for an inner element, and the own position and direction', () => {
	const st = { nodes: [ { index: 0, parent: null, targets: [ { id: '0:', slot: '' }, { id: '0:in', slot: '.a__inner' }, { id: '0:deep', slot: '.a__inner > .a__item' } ] }, { index: 1, parent: 0, targets: [ { id: '1:', slot: '' } ] } ],
		reads: { widths: { 375: { '0:': { styles: { display: 'block' }, layoutDisplay: 'grid' }, '0:in': { styles: { display: 'flex' } }, '0:deep': { styles: { display: 'block', direction: 'rtl' }, position: 'absolute' }, '1:': { styles: { display: 'block', direction: 'ltr' }, position: 'static' } } } } };
	assert.deepEqual( elementContext( st, st.nodes[ 1 ], st.nodes[ 1 ].targets[ 0 ], 375 ), { parentDisplay: 'grid', position: 'static', direction: 'ltr' } );
	assert.equal( elementContext( st, st.nodes[ 0 ], st.nodes[ 0 ].targets[ 1 ], 375 ).parentDisplay, 'block', 'a first step\'s parent is the root element itself' );
	assert.deepEqual( elementContext( st, st.nodes[ 0 ], st.nodes[ 0 ].targets[ 2 ], 375 ), { parentDisplay: 'flex', position: 'absolute', direction: 'rtl' } );
	assert.equal( elementContext( st, st.nodes[ 0 ], st.nodes[ 0 ].targets[ 0 ], 375 ).parentDisplay, undefined, 'the top of the surface has no read parent: undecided' );
	assert.equal( elementContext( st, st.nodes[ 1 ], st.nodes[ 1 ].targets[ 0 ], 768 ).parentDisplay, undefined, 'an unread width is undecided' );
} );

// The held side: a row no setting writes by name, covered by a setting calibration saw change it, compared in context.
function heldRun( parentDisplay ) {
	const st = {
		rawSnapshot: {}, flat: [ { attributes: {} }, { attributes: {} } ],
		nodes: [ { index: 0, name: 'sgs/container', parent: null, children: [ 1 ], targets: [ { id: '0:', slot: '' } ] }, { index: 1, name: 'sgs/container', parent: 0, children: [], targets: [ { id: '1:', slot: '' } ] } ],
		reads: { widths: Object.fromEntries( THREE.map( ( w ) => [ w, { '0:': snap( { display: parentDisplay } ), '1:': snap( { 'min-height': 'auto' } ) } ] ) ) },
		calFor: () => ( { elements: { '': tiers( BASE ) }, settings: { boxHeight: setting( 'height', { effects: [ '|min-height' ] } ) } } ),
	};
	st.flat.forEach( ( n, i ) => Object.assign( n, { name: 'sgs/container', attributes: { className: `fx-${ i }` } } ) );
	addRefs( st.flat, 'fx' );
	const ref = refOf( st.flat[ 1 ] );
	const row = { node: ref, block: 'sgs/container', slot: '', property: 'min-height', value: 'auto', reason: 'no-setting: sgs/container has no setting for min-height', state: null };
	const writes = [ { node: ref, index: 1, attr: 'boxHeight', after: '0px', how: 'single', widths: THREE } ];
	return makeSettle( st )( { unmapped: [ row ], writes } );
}

test( 'MUST FAIL: the held side compares in the element\'s context: an auto minimum off a flex item is the 0px a written setting paints', () => {
	const off = heldRun( 'block' );
	assert.deepEqual( off.alreadyHeld.map( ( h ) => h.heldReason ), [ 'covered' ] );
	assert.equal( off.unmapped.length, 0 );
	// Negative control: a flex item's auto minimum is content-based, never the written 0px.
	const on = heldRun( 'flex' );
	assert.equal( on.alreadyHeld.length, 0 );
	assert.equal( on.unmapped.length, 1 );
} );

test( 'MUST FAIL: render-matches refuses a fixed height whose content is taller than the box', () => {
	assert.equal( rendersAt( { 1440: '42px' }, () => ( { h: 42 } ), () => 60 ), false, 'a 42px box with 60px of content overflows: a minimum would grow it' );
	assert.equal( rendersAt( { 1440: '42px' }, () => ( { h: 42 } ), () => 30 ), true );
	assert.equal( rendersAt( { 1440: '42px' }, () => ( { h: 42 } ), () => null ), true, 'an unknown content height leaves the box\'s own height to decide' );
	assert.equal( rendersAt( { 1440: '42px' }, () => ( { h: 42 } ) ), true );
} );

// fillEquivalent end of render-matches: the content comes from the box's scroll height, else its children's extent.
function overflowState( { kidH = null, scrollHeight = undefined } ) {
	const own = { styles: { 'padding-bottom': '0px' }, rect: { x: 0, y: 0, w: 300, h: 42 }, ...( undefined !== scrollHeight ? { scrollHeight } : {} ) };
	const kids = null === kidH ? [] : [ 1 ];
	const widths = { 1440: { '0:': own, ...( null === kidH ? {} : { '1:': { styles: {}, rect: { x: 0, y: 0, w: 100, h: kidH }, inFlow: true } } ) } };
	return {
		db, reads: { widths }, snaps: [], out: { writes: [] }, flat: [ { attributes: {} }, { attributes: {} } ],
		nodes: [ { index: 0, name: 'sgs/container', parent: null, children: kids, targets: [ { id: '0:', slot: '' } ] }, { index: 1, name: 'sgs/text', parent: 0, children: [], targets: [ { id: '1:', slot: '' } ] } ],
		calFor: () => ( { settings: {} } ),
	};
}
const hooks = () => ( { baselineFn: () => () => undefined, apply: () => {}, resolve: ( c ) => ( 'min-height' === c.prop ? { status: 'written', slot: '', writes: [ { attr: 'minHeight', value: c.draft[ 1440 ] } ], included: c.draft } : { status: 'gap', gap: 'no-setting' } ) } );

test( 'MUST FAIL: a declared height is no minimum when the children or the scroll height overflow the box', () => {
	const eq = ( st ) => fillEquivalent( st, st.nodes[ 0 ], st.nodes[ 0 ].targets[ 0 ], 'height', { 1440: '42px' }, hooks() );
	assert.equal( eq( overflowState( { kidH: 60 } ) )?.condition, undefined, 'a 60px child in a 42px box overflows it' );
	assert.equal( eq( overflowState( { scrollHeight: 60 } ) )?.condition, undefined, 'a 60px scroll height overflows the box' );
	assert.equal( eq( overflowState( { kidH: 30 } ) ).condition, 'render-matches' );
	assert.equal( eq( overflowState( { scrollHeight: 42 } ) ).condition, 'render-matches' );
	// The setting is resolved in the context of the element it paints: a child's parent is the parent node's layout element.
	const st = overflowState( { kidH: 30 } );
	Object.assign( st.reads.widths[ 1440 ][ '0:' ], { layoutDisplay: 'flex' } );
	Object.assign( st.reads.widths[ 1440 ][ '1:' ], { rect: { x: 0, y: 0, w: 100, h: 42 } } );
	const seen = [];
	const h = { ...hooks(), resolve: ( c ) => ( seen.push( c ), hooks().resolve( c ) ) };
	assert.equal( fillEquivalent( st, st.nodes[ 1 ], st.nodes[ 1 ].targets[ 0 ], 'height', { 1440: '42px' }, h ).condition, 'render-matches' );
	assert.equal( seen[ 0 ].contextAt?.( 1440 )?.parentDisplay, 'flex' );
} );

test( 'MUST FAIL: the copyright prefix is the draft\'s own words before the ©', () => {
	assert.equal( copyrightPrefixOf( 'Copyright © 2026 Acme Ltd' ), 'Copyright' );
	assert.equal( copyrightPrefixOf( '© 2026 Acme Ltd' ), '' );
	assert.equal( copyrightPrefixOf( 'All content © 2026 Acme' ), 'All content' );
	assert.equal( copyrightPrefixOf( '  All\n  content   ©2026' ), 'All content', 'the line\'s spacing is collapsed' );
	assert.equal( copyrightPrefixOf( 'Copyright (c) 2026 Acme' ), 'Copyright' );
	assert.equal( copyrightPrefixOf( 'Copyright 2026 Acme' ), 'Copyright', 'no mark: the words before the year' );
	assert.equal( copyrightPrefixOf( 'Acme Ltd, all rights reserved' ), '' );
} );

test( 'MUST FAIL: the skeleton writes the copyright prefix from the draft line through contentAttrs', () => {
	const facts = { composition: {}, enumOf: ( b, a ) => ( 'displayType' === a ? [ 'copyright', 'phone' ] : null ), attr: ( b, a ) => 'copyrightPrefix' === a, wrapperShells: [], displayTypes: [ 'copyright', 'phone' ], logoBlocks: [], firstAttrByRole: () => null };
	const m = { words: ( e ) => e.text, textWithBreaks: ( e ) => e.text, blockKids: () => [] };
	const { contentAttrs } = makeContent( { m, facts, view: null, carried: null, surfaceKind: 'footer' } );
	const attrs = ( text ) => contentAttrs( 'sgs/business-info', { text, tag: 'p' }, { siteInfoKind: 'copyright' } ).a;
	assert.equal( attrs( 'All content © 2026 Acme' ).copyrightPrefix, 'All content' );
	assert.equal( attrs( '© 2026 Acme' ).copyrightPrefix, '' );
} );

// A planted shop parts record (the shape shop-parts.mjs writes) with a drawer part that carries the draft's own values.
const RECORD = { client: 'fx', counts: {}, surfaces: [
	{ kind: 'drawer', record: 'Bag', file: 'x.dc.html', problem: null, units: 2, missing: [], parts: [
		{ id: 'drawer-empty-message', label: 'Empty-basket message', home: { type: 'setting', block: 'sgs/cart', settings: [ 'emptyCartMessage' ] }, write: { emptyCartMessage: 'Nothing in here yet.' }, by: [ 'structure' ], units: 1, sample: [] },
		{ id: 'drawer-remove', label: 'Line remove control', home: { type: 'setting', block: 'sgs/cart', settings: [ 'itemRemoveLabel' ] }, write: { itemRemoveLabel: 'Take out' }, by: [ 'structure' ], units: 1, sample: [] },
		{ id: 'drawer-count', label: 'Item count', home: { type: 'setting', block: 'sgs/cart', settings: [ 'panelShowCount' ] }, write: null, by: [ 'structure' ], units: 1, sample: [] },
		{ id: 'drawer-stale', label: 'Stale', home: { type: 'setting', block: 'sgs/cart', settings: [ 'noSuchSetting' ] }, write: { noSuchSetting: 'x' }, by: [ 'structure' ], units: 1, sample: [] },
	] },
	{ kind: 'buybox', record: 'PDP', file: 'x.dc.html', problem: null, units: 1, missing: [], parts: [
		{ id: 'buybox-add', label: 'Add', home: { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, write: { addToCartLabel: 'Add to bag' }, by: [ 'structure' ], units: 1, sample: [] },
	] },
] };
const attrExists = ( b, a ) => Object.hasOwn( blockSchema( b ) || {}, a );
const shopTree = ( cartAttrs = {} ) => {
	const flat = [ { name: 'sgs/site-header', attributes: {} }, { name: 'sgs/cart', attributes: { ...cartAttrs } } ];
	addRefs( flat, 'fx' );
	return { flat, nodes: [ { index: 0, name: 'sgs/site-header' }, { index: 1, name: 'sgs/cart' } ] };
};

test( 'MUST FAIL: Fill reads build/shop-parts.json and writes each part\'s draft value onto its block', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'shop-parts-' ) );
	assert.equal( loadShopParts( dir ), null, 'a client with no record has nothing to write' );
	fs.writeFileSync( path.join( dir, 'shop-parts.json' ), JSON.stringify( RECORD ) );
	const record = loadShopParts( dir );
	const { flat, nodes } = shopTree();
	const r = shopPartWrites( { record, nodes, flat, refOf, attrExists } );
	assert.deepEqual( flat[ 1 ].attributes, { className: flat[ 1 ].attributes.className, emptyCartMessage: 'Nothing in here yet.', itemRemoveLabel: 'Take out' } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.how, w.prop, w.index ] ), [ [ 'emptyCartMessage', 'shop-part', '(content)', 1 ], [ 'itemRemoveLabel', 'shop-part', '(content)', 1 ] ] );
	assert.deepEqual( r.unmapped.map( ( u ) => u.reason.match( /names (\w+)/ )?.[ 1 ] ), [ 'noSuchSetting' ], 'a setting the block lacks is a row' );
	assert.equal( r.notes.length, 1 );
	assert.match( r.notes[ 0 ], /no sgs\/buybox in this surface/ );
	fs.writeFileSync( path.join( dir, 'shop-parts.json' ), JSON.stringify( { surfaces: [ { kind: 'drawer' } ] } ) );
	assert.throws( () => loadShopParts( dir ), /not a shop parts record/ );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a shop part never overwrites a different value another writer put on the block this run', () => {
	const { flat, nodes } = shopTree( { itemRemoveLabel: 'Remove item' } );
	const r = shopPartWrites( { record: RECORD, nodes, flat, refOf, attrExists, writes: [ { index: 1, attr: 'itemRemoveLabel', how: 'content' } ] } );
	assert.equal( flat[ 1 ].attributes.itemRemoveLabel, 'Remove item' );
	assert.ok( r.unmapped.some( ( u ) => /^conflict: itemRemoveLabel/.test( u.reason ) ) );
	// A value the node already holds is no write and no row.
	const same = shopTree( { emptyCartMessage: 'Nothing in here yet.' } );
	const s = shopPartWrites( { record: RECORD, nodes: same.nodes, flat: same.flat, refOf, attrExists } );
	assert.ok( ! s.writes.some( ( w ) => 'emptyCartMessage' === w.attr ) );
	assert.ok( ! s.unmapped.some( ( u ) => /emptyCartMessage/.test( u.reason ) ), 'and no row' );
} );

test( 'MUST FAIL: the context reads stay among the properties the resolver judges with: a block box\'s justify-content is inert by its column count', () => {
	const skeleton = nested();
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const box = { 'justify-content': 'center', 'column-count': 'auto', 'column-width': 'auto' };
	const reads = readsOf( { '0:': snap( { display: 'block' } ), '1:': snap( box ) } );
	const r = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot, rawSnapshot: { settings: { custom: {} } }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	const rows = [ ...r.unmapped, ...r.alreadyHeld ].filter( ( u ) => 'justify-content' === u.property && /-1$/.test( u.node ) );
	assert.deepEqual( rows.map( ( u ) => u.heldReason ?? u.reason.slice( 0, 40 ) ), [ 'inert' ] );
} );
