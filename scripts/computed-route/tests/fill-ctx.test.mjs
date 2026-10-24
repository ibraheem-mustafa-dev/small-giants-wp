// Context on both sides, and the flex item that does not shrink. Calibration records the context each default paint was
// read in (lib/calibrate-read.mjs::readInstancesInPage: `_parentDisplay`, `_position`) and the comparison canons each side
// in its own (lib/fill-prop.mjs::tiersDiffering, ::inOwnContext); Fill reads flex-shrink on the root's flex item, a
// wrapper holding only it included (lib/fill-read.mjs::flexItemsInPage), and holds a draft item that does not shrink with
// the block's fixed child sizing (lib/fill-dimensions.mjs::fixedSizing). Built on the real framework DB with planted reads.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { tiersDiffering, inOwnContext, calibratedContext } from '../lib/fill-prop.mjs';
import { readInstancesInPage } from '../lib/calibrate-read.mjs';
import { READ_PROPS, PSEUDO_PROPS, TEXT_PSEUDO_PROPS, OWN_INHERITED } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { flexItemsInPage, applyFlexItems, jobsFor, PROPS } from '../lib/fill-read.mjs';
import { dimensionWrites, NATURAL_SIZE } from '../lib/fill-dimensions.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const BASE = { display: 'block', direction: 'ltr', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', 'background-color': 'rgba(0, 0, 0, 0)', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const snap = ( styles, extra = {} ) => ( { styles: { ...BASE, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null, layoutDisplay: styles.display ?? 'block', ...extra } );
const readsOf = ( spec ) => ( { widths: Object.fromEntries( FIVE.map( ( w ) => [ w, { ...spec } ] ) ), declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' } );
const fill = ( skeleton, reads, cal ) => {
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	return { tree, ...fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot, rawSnapshot: { settings: { custom: {} } }, calFor: ( b ) => cal[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } ) };
};

// A container in a flex row, its draft min-height `auto` (a flex item's own); calibration read its root's 0px where it sat
// in a block (the computed form of `auto` off a flex item), with the context recorded or not.
function minHeightRun( draftValue, context ) {
	const paint = { ...BASE, 'min-height': '0px', ...( context ? { _parentDisplay: context, _position: 'static' } : {} ) };
	const cal = { 'sgs/container': { block: 'sgs/container', elements: { '': tiers( paint ) }, settings: { minHeight: setting( 'min-height' ) }, discovered: {} } };
	const skeleton = [ { name: 'sgs/container', draftRef: '.p', attributes: {}, innerBlocks: [ { name: 'sgs/container', draftRef: '.c', attributes: {} } ] } ];
	return fill( skeleton, readsOf( { '0:': snap( { display: 'flex', 'min-height': '0px' } ), '1:': snap( { 'min-height': draftValue } ) } ), cal );
}
const minHeightRows = ( r ) => [ ...r.writes.filter( ( w ) => 1 === w.index && 'minHeight' === w.attr ), ...r.unmapped.filter( ( u ) => 'min-height' === u.property && /-1$/.test( u.node ) ) ];

test( 'MUST FAIL: a flex item\'s auto minimum equals a 0px calibrated off a flex item, so nothing is written and no row is left', () => {
	const r = minHeightRun( 'auto', 'block' );
	assert.deepEqual( minHeightRows( r ), [], JSON.stringify( minHeightRows( r ) ) );
	// Negative control: a paint read before the context was recorded keeps the old comparison, so the row stays.
	assert.ok( minHeightRows( minHeightRun( 'auto', null ) ).length > 0, 'without the recorded context the two sides differ' );
	// Positive: a draft 0px on a flex item is a real value against the auto the default holds there, so it is written.
	assert.equal( minHeightRun( '0px', 'block' ).writes.filter( ( w ) => 1 === w.index && 'minHeight' === w.attr ).length, 1, 'a flex item\'s 0px minimum is not its default' );
} );

test( 'MUST FAIL: each side is canoned in its own context: the initial value\'s computed form there reads as the initial value', () => {
	const flex = { parentDisplay: 'flex' };
	const block = { parentDisplay: 'block' };
	assert.equal( inOwnContext( 'min-height', '0px', block ), 'auto' );
	assert.equal( inOwnContext( 'min-height', '0px', flex ), '0px', 'a flex item\'s 0px is a declared 0px' );
	assert.equal( inOwnContext( 'min-height', '0px', null ), '0px', 'no context of its own: as it is' );
	assert.equal( inOwnContext( 'min-height', '12px', block ), '12px' );
	assert.equal( inOwnContext( 'min-height', '0px', { parentDisplay: 'flex', position: 'absolute' } ), 'auto', 'an out-of-flow box is no flex item' );
	const all = { 375: 'auto', 768: 'auto', 1440: 'auto' };
	assert.deepEqual( tiersDiffering( 'min-height', all, () => '0px', () => '0px', () => flex, () => block ), {} );
	assert.deepEqual( tiersDiffering( 'min-height', all, () => '0px', () => '0px', () => flex ), { 1440: 'auto' }, 'the baseline judged in the draft\'s context differs (the desktop tier carries down)' );
	const cal = { elements: { '': { 1440: { 'min-height': '0px', _parentDisplay: 'grid', _position: 'relative', direction: 'rtl' } } } };
	assert.deepEqual( calibratedContext( cal, '', 1920 ), { parentDisplay: 'grid', position: 'relative', direction: 'rtl' } );
	assert.equal( calibratedContext( { elements: { '': { 375: { 'min-height': '0px' } } } }, '', 375 ), null );
} );

// One browser for the file; each read gets its own page, closed after it.
let shared = null;
after( async () => shared && ( await shared ).close() );
const launch = async ( html ) => {
	shared ??= import( 'playwright' ).then( ( { chromium } ) => chromium.launch() );
	const page = await ( await shared ).newPage();
	await page.setContent( html );
	return { browser: page, page };
};

test( 'MUST FAIL: calibration records the parent\'s display and the position on a default instance\'s elements, never on a marked one', async () => {
	const { browser, page } = await launch( `<div style="display:flex"><div class="cr-ref-cal-0" style="position:relative"><span>x</span></div></div><div class="cr-ref-cal-1"><span>y</span></div>` );
	try {
		const [ def, marked ] = await page.evaluate( readInstancesInPage, [ 2, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), PSEUDO_PROPS, TEXT_PSEUDO_PROPS, undefined, OWN_INHERITED, [ 0 ] ] );
		assert.equal( def[ '' ]._parentDisplay, 'flex' );
		assert.equal( def[ '' ]._position, 'relative' );
		assert.equal( def.span._parentDisplay, 'block' );
		assert.equal( marked[ '' ]._parentDisplay, undefined, 'a marked instance carries no context, so the slot finder never sees it change' );
		assert.ok( ! READ_PROPS.some( ( p ) => p.startsWith( '_' ) ), 'the context is no read property' );
	} finally {
		await browser.close();
	}
} );

const ROW = `<div class="row" style="display:flex;width:200px">%ITEM%<p style="width:400px;margin:0">long words</p></div>`;
const jobs = [ { id: '0:', finder: '.logo', owner: 0, root: true }, { id: '0:.in', finder: '.logo i', owner: 0, root: false } ];
async function itemsFor( item ) {
	const { browser, page } = await launch( ROW.replace( '%ITEM%', item ) );
	try {
		return await page.evaluate( flexItemsInPage, [ jobs, resolveFinder.toString() ] );
	} finally {
		await browser.close();
	}
}

test( 'MUST FAIL: flex-shrink is read on the flex item the root is, through a wrapper that holds only it and paints nothing', async () => {
	assert.ok( PROPS.includes( 'flex-shrink' ), 'Fill reads flex-shrink' );
	const wrapped = await itemsFor( '<a style="flex:0 0 auto"><span class="logo" style="display:block;width:150px"><i>L</i></span></a>' );
	assert.deepEqual( wrapped[ '0:' ], { shrink: '0', w: 150, h: wrapped[ '0:' ].h, depth: 1 } );
	assert.equal( '0:.in' in wrapped, false, 'an inner slot is no flex item of its own block' );
	// A wrapper that is itself a flex container holding the element (the element a flex item of it) is still the row's item.
	const flexWrap = await itemsFor( '<a style="display:flex;flex:0 0 auto"><span class="logo" style="width:150px"><i>L</i></span></a>' );
	assert.equal( flexWrap[ '0:' ].depth, 1 );
	assert.equal( flexWrap[ '0:' ].shrink, '0' );
	const itself = await itemsFor( '<span class="logo" style="display:block;width:150px;flex-shrink:0"><i>L</i></span>' );
	assert.equal( itself[ '0:' ].depth, 0 );
	assert.equal( itself[ '0:' ].shrink, '0' );
	// A wrapper that paints (padding) or holds a sibling is the block's surroundings, not its flex item.
	assert.equal( ( await itemsFor( '<a style="flex:0 0 auto;padding:4px"><span class="logo"><i>L</i></span></a>' ) )[ '0:' ], null );
	assert.equal( ( await itemsFor( '<a style="flex:0 0 auto"><span class="logo"><i>L</i></span><b>x</b></a>' ) )[ '0:' ], null );
	// Into the snapshot: the root holds the item's value and box; anything else keeps its element's own read.
	const widths = { '0:': { styles: { 'flex-shrink': '1' } }, '0:.in': { styles: { 'flex-shrink': '0' } }, '1:': { styles: { 'flex-shrink': '0' } } };
	applyFlexItems( widths, [ ...jobs, { id: '1:', root: true } ], { '0:': { shrink: '0', w: 150, h: 20, depth: 1 }, '0:.in': { shrink: '1', w: 1, h: 1, depth: 0 }, '1:': null } );
	assert.equal( widths[ '0:' ].styles[ 'flex-shrink' ], '0' );
	assert.deepEqual( widths[ '0:' ].flexItem, { w: 150, h: 20, depth: 1 } );
	assert.equal( widths[ '0:.in' ].styles[ 'flex-shrink' ], '0', 'an inner slot keeps its own read' );
	assert.equal( widths[ '0:.in' ].flexItem, undefined );
	assert.equal( widths[ '1:' ].styles[ 'flex-shrink' ], '0', 'a root that is no flex item keeps its own read' );
} );

// A logo in a flex row whose draft flex item does not shrink at `zeroAt`; calibration says the block's root shrinks. width:
// what the draft declares for the element's width ('px': its rendered size; a string: that value; null: nothing).
const SIZE = { 375: 238.22, 768: 247.05, 1440: 279.5 };
function logoRun( { block = 'sgs/responsive-logo', zeroAt = THREE, rootShrink = '1', plant = false, width = 'px' } = {} ) {
	const cal = { [ block ]: { block, elements: { '': tiers( { ...BASE, 'flex-shrink': rootShrink } ) }, settings: {}, discovered: {} } };
	const skeleton = [ { name: 'sgs/container', draftRef: '.p', attributes: {}, innerBlocks: [ { name: block, draftRef: '.c', attributes: {} } ] } ];
	const reads = readsOf( { '0:': snap( { display: 'flex' } ) } );
	for ( const w of FIVE ) {
		reads.widths[ w ] = { ...reads.widths[ w ], '1:': snap( { 'flex-shrink': zeroAt.includes( w ) ? '0' : '1' }, { flexItem: { w: SIZE[ w ] ?? 260, h: 54, depth: 1 } } ) };
	}
	const r = fill( skeleton, reads, cal );
	// The declared width is set after the generic pass, so only this pass judges it.
	reads.declared = Object.fromEntries( THREE.map( ( w ) => [ w, { '1:': null === width ? {} : { width: 'px' === width ? `${ SIZE[ w ] }px` : width } } ] ) );
	const flat = [ r.tree[ 0 ], r.tree[ 0 ].innerBlocks[ 0 ] ];
	const dims = dimensionWrites( { nodes: skeletonNodes( skeleton ), flat, refOf, reads, db, unmapped: plant ? [ { node: refOf( flat[ 1 ] ), block, slot: '', property: 'flex-shrink', value: '0', reason: 'no-setting: planted', state: null } ] : r.unmapped.filter( ( u ) => 'flex-shrink' === u.property ), calFor: ( b ) => cal[ b ] ?? null } );
	return { r, dims, attrs: flat[ 1 ].attributes };
}

test( 'MUST FAIL: a draft flex item that does not shrink, over a block root that would, is held by the fixed child sizing at its declared px width', () => {
	const { r, dims, attrs } = logoRun();
	const row = r.unmapped.find( ( u ) => 'flex-shrink' === u.property );
	assert.match( row?.reason ?? '', /^no-setting\b/, 'the generic pass leaves the row for this pass' );
	assert.deepEqual( attrs.sgsChildSizing, { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' } );
	assert.deepEqual( attrs.sgsChildWidth, { desktop: '279.5px', tablet: '247.05px', mobile: '238.22px' } );
	assert.deepEqual( dims.unmapped, [] );
	// Only the narrow width keeps it whole: the wider tiers stay the block's own sizing.
	const narrow = logoRun( { zeroAt: [ 375 ] } );
	assert.deepEqual( narrow.attrs.sgsChildSizing, { mobile: 'fixed' } );
	assert.deepEqual( narrow.attrs.sgsChildWidth, { mobile: '238.22px' } );
	// Fixed at the wide widths, shrinking at 375: the phone tier sizes to its content so the fixed width is not carried down.
	assert.deepEqual( logoRun( { zeroAt: [ 768, 1440 ] } ).attrs.sgsChildSizing, { desktop: 'fixed', tablet: 'fixed', mobile: 'fit' } );
	// Negative controls: a root that never shrinks needs nothing; a block without child sizing keeps the row with its reason.
	assert.equal( logoRun( { rootShrink: '0' } ).attrs.sgsChildSizing, undefined );
	assert.equal( logoRun( { rootShrink: '0', plant: true } ).attrs.sgsChildSizing, undefined, 'a row over a root that never shrinks writes nothing' );
	// A natural size (a fluid height with its intrinsic ratio, or no width declared) is never pinned to the read widths' px.
	for ( const width of [ null, 'clamp(200px, 20vw, 280px)', 'auto' ] ) {
		const natural = logoRun( { width } );
		assert.equal( natural.attrs.sgsChildSizing, undefined, `width ${ width }` );
		assert.equal( natural.attrs.sgsChildWidth, undefined );
		assert.match( natural.dims.unmapped[ 0 ]?.reason ?? '', /flex-shrink: 0 \(natural size\) - sgsChildWidth needs the 'auto' value \(Track F\)$/ );
		assert.ok( natural.dims.unmapped[ 0 ].reason.endsWith( NATURAL_SIZE ) );
	}
	const none = logoRun( { block: 'sgs/site-header-row' } );
	assert.equal( none.attrs.sgsChildSizing, undefined );
	assert.match( none.dims.unmapped[ 0 ]?.reason ?? '', /no fixed child sizing/ );
} );

test( 'MUST FAIL: only the root target of a node is read as a flex item', () => {
	const jobs = jobsFor( [ { index: 0, children: [], targets: [ { id: '0:', slot: '', finder: '.a' }, { id: '0:.b', slot: '.b', finder: '.b', scoped: true } ] } ] );
	assert.deepEqual( jobs.map( ( j ) => j.root ), [ true, false ] );
} );
