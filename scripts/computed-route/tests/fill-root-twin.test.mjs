// A block whose items the draft lays out on the draft element itself (Spec 48 FR-48-3, FR-48-8): the skeleton pairs that
// element to the block's root and to the block's own item container (lib/skeleton-part-slots.mjs::itemSlots `container`),
// so the container's settings are read there; the element's box and placement stay the root's (lib/fill-shared-element.mjs::
// rootTwinProps), and the per-device layout is a swipe row only at the widths the draft's grid scrolls
// (lib/resolve.mjs::tierWrite). Real case, Mama's footer 2026-11-27: the Instagram strip is one draft element, a six-column
// grid on tablet and desktop and a sideways scroller below 768px; Fill read only its tiles, wrote the gallery a swipe row
// on every device and spilled the grid's tracks and overflow into Custom CSS.
// Run: node tools/run-tests.mjs tests/fill-root-twin.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { rootTwinProps, rootDefersTo } from '../lib/fill-shared-element.mjs';
import { SETTLED } from '../lib/fill-report.mjs';
import { equalFlexTracks } from '../lib/normalise.mjs';

const db = openDb();
const WIDTHS = [ 375, 768, 1440 ];
const GRID = '.sgs-gallery__grid';
const ITEM = `${ GRID } > .sgs-gallery__item:nth-of-type(1)`;
const all = ( v ) => ( { 375: v, 768: v, 1440: v } );
const byWidth = ( m ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, m ] ) );
const BOX = { display: 'block', 'margin-left': '0px', 'margin-right': '0px', 'padding-top': '0px', 'overflow-x': 'visible', 'grid-auto-flow': 'row', 'scroll-snap-align': 'none', 'scroll-snap-type': 'none' };
const cal = {
	block: 'sgs/gallery',
	elements: { '': byWidth( BOX ), [ GRID ]: byWidth( { ...BOX, display: 'grid' } ), [ ITEM ]: byWidth( BOX ) },
	settings: { tileBorderRadius: { slot: ITEM, slots: [ ITEM ], property: 'border-radius' } },
	discovered: { layout: {
		'scroll-snap-align': { slots: [ ITEM ], tier: 'tier_object', values: { scroll: all( 'start' ) } },
		'overflow-x': { slots: [ GRID ], tier: 'tier_object', values: { scroll: all( 'auto' ) } },
		'grid-auto-flow': { slots: [ GRID ], tier: 'tier_object', values: { scroll: all( 'column' ) } },
	} },
	link: {}, text: {}, presence: {},
};
// The draft's column tracks: implicit swipe-row cards on the phone (the code declares `none`), three and six equal flexible
// columns above. The block holds both a column count (`columns`) and a track list (`gridTemplateColumns`) for them.
const six = ( px ) => Array( 6 ).fill( px ).join( ' ' );
const TRACKS = { 375: six( '147.391px' ), 768: '225.328px 225.328px 225.328px', 1440: six( '195px' ) };
const DECLARED_TRACKS = { 375: 'none', 768: 'repeat(3, minmax(0, 1fr))', 1440: 'repeat(6, minmax(0, 1fr))' };
const COLUMNS_CAL = {
	...cal,
	elements: { ...cal.elements, [ GRID ]: byWidth( { ...BOX, display: 'grid', 'grid-template-columns': '300px 300px 300px' } ) },
	settings: {
		...cal.settings,
		columns: { slot: GRID, slots: [ GRID ], property: 'grid-auto-columns', properties: [ 'grid-auto-columns', 'grid-template-columns' ], state: null, forms: [], reachedAt: WIDTHS, effects: [] },
		gridTemplateColumns: { slot: GRID, slots: [ GRID ], property: 'grid-template-columns', state: null, forms: [ 'repeat' ], reachedAt: WIDTHS, effects: [] },
	},
};
const snap = ( styles ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 100 }, inFlow: true, words: '', href: null } );

// The draft: one strip element, a grid at 768 and 1440 and a scroller at 375 (pulled out to the screen edge by a negative
// margin), its tiles declaring a snap alignment at every width. `grid`: the strip is also the gallery's grid (the pairing).
function run( { grid = true, tracks = false } = {} ) {
	const skeleton = [ { name: 'sgs/gallery', draftRef: '.strip', attributes: {}, draftSlots: { [ ITEM ]: '.tile', ...( grid ? { [ GRID ]: '.strip' } : {} ) } } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'footer' );
	const id = ( slot ) => nodes[ 0 ].targets.find( ( t ) => t.slot === slot ).id;
	const strip = ( w ) => ( { ...BOX, display: 'grid', ...( 375 === w ? { 'margin-left': '-20px', 'overflow-x': 'auto', 'grid-auto-flow': 'column' } : {} ), 'scroll-snap-type': 'x mandatory', ...( tracks ? { 'grid-template-columns': TRACKS[ w ] } : {} ) } );
	const widths = Object.fromEntries( WIDTHS.map( ( w ) => [ w, {
		[ id( '' ) ]: snap( strip( w ) ),
		...( grid ? { [ id( GRID ) ]: snap( strip( w ) ) } : {} ),
		[ id( ITEM ) ]: snap( { ...BOX, 'scroll-snap-align': 'start' } ),
	} ] ) );
	// What the draft's code declares: the strip's scroller only below 768px, its snap type and the tiles' snap alignment everywhere.
	const own = ( w ) => ( { 'overflow-x': 375 === w ? 'auto' : 'visible', 'grid-auto-flow': 375 === w ? 'column' : 'row', 'scroll-snap-type': 'x mandatory', ...( tracks ? { 'grid-template-columns': DECLARED_TRACKS[ w ] } : {} ) } );
	const declared = Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ id( '' ) ]: own( w ), ...( grid ? { [ id( GRID ) ]: own( w ) } : {} ), [ id( ITEM ) ]: { 'scroll-snap-align': 'start' } } ] ) );
	const reads = { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => ( tracks ? COLUMNS_CAL : cal ), fixtures: null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { out, node: tree[ 0 ] ?? tree };
}

const layoutOf = ( out ) => out.writes.filter( ( w ) => 'layout' === w.attr ).at( -1 )?.after;

test( 'MUST FAIL: the strip is a swipe row only on the phone, where the draft grid scrolls; the grid above', () => {
	const { out } = run();
	// The phone tier is a swipe row; tablet and desktop stay unset, which the block draws as its grid (block.json `layout`).
	assert.deepEqual( layoutOf( out ), { mobile: 'scroll' }, JSON.stringify( out.writes.filter( ( w ) => 'layout' === w.attr ) ) );
} );

test( 'MUST FAIL: the grid reads only what its own settings paint: the strip\'s margin is the root\'s, read once and never written on the grid', () => {
	const { out } = run();
	const onGrid = [ ...out.unmapped, ...out.writes ].filter( ( r ) => ( r.slot ?? '' ) === GRID && /^margin/.test( String( r.property ?? r.prop ) ) );
	assert.deepEqual( onGrid, [], 'no margin row on the grid' );
	const held = ( out.settled || [] ).filter( ( s ) => GRID === s.slot && 'root-held' === s.reason );
	assert.ok( held.some( ( s ) => 'margin-left' === s.property ), JSON.stringify( held ) );
	assert.ok( [ ...out.unmapped, ...out.writes, ...( out.settled || [] ) ].some( ( r ) => '' === ( r.slot ?? '' ) && 'margin-left' === ( r.property ?? r.prop ) ), 'the root still reads the margin' );
	assert.ok( SETTLED.includes( 'root-held' ), 'the report knows the reason' );
} );

test( 'negative control: with no grid read there is no evidence against the swipe row, so the old reading stands', () => {
	assert.deepEqual( layoutOf( run( { grid: false } ).out ), { desktop: 'scroll' } );
} );

test( 'rootTwinProps: only a part read at the root\'s own element is limited, to the properties its settings and discoveries paint there', () => {
	const rec = { targets: [ { id: '0:', slot: '', finder: '.strip' }, { id: `0:${ GRID }`, slot: GRID, finder: '.strip' }, { id: `0:${ ITEM }`, slot: ITEM, finder: '.tile' } ] };
	const props = rootTwinProps( cal, rec, rec.targets[ 1 ] );
	assert.deepEqual( [ ...props ].sort(), [ 'grid-auto-flow', 'overflow-x' ] );
	assert.equal( rootTwinProps( cal, rec, rec.targets[ 2 ] ), null, 'a part at its own element' );
	assert.equal( rootTwinProps( cal, rec, rec.targets[ 0 ] ), null, 'the root itself' );
	const inner = { targets: [ { id: '0:', slot: '', finder: '.strip' }, { id: `0:${ GRID }`, slot: GRID, finder: '.row' }, { id: `0:${ ITEM }`, slot: ITEM, finder: '.tile' } ] };
	assert.equal( rootTwinProps( cal, inner, inner.targets[ 1 ] ), null, 'a container drawn on its own draft element keeps every property' );
	const leaf = { targets: [ { id: '0:', slot: '', finder: '.strip' }, { id: `0:${ GRID }`, slot: GRID, finder: '.strip' } ] };
	assert.equal( rootTwinProps( cal, leaf, leaf.targets[ 1 ] ), null, 'a part holding no other read part (a form field input) keeps every property' );
} );

test( 'MUST FAIL: equal flexible columns the code declares are the column count per device, the implicit phone cards are no template, and the root writes no track rule of its own', () => {
	const { out, node } = run( { tracks: true } );
	const rows = ( p ) => [ ...out.unmapped, ...out.writes ].filter( ( r ) => p === ( r.property ?? r.prop ) );
	assert.deepEqual( node.attributes.columns, { desktop: 6, tablet: 3 }, JSON.stringify( rows( 'grid-template-columns' ) ) );
	assert.equal( node.attributes.gridTemplateColumns, undefined, 'the track list setting is not written beside the count' );
	assert.deepEqual( out.unmapped.filter( ( u ) => 'grid-template-columns' === u.property ), [], 'no ambiguous or unheld track row is left' );
	const phone = ( out.settled || [] ).find( ( s ) => GRID === s.slot && 'grid-template-columns' === s.property && 'used-size' === s.reason );
	assert.deepEqual( phone?.widths, [ 375 ], 'the implicit phone tracks are a layout result' );
	assert.ok( ( out.settled || [] ).some( ( s ) => '' === s.slot && 'grid-template-columns' === s.property && 'part-held' === s.reason ), 'the root leaves the tracks to the grid' );
	assert.deepEqual( layoutOf( out ), { mobile: 'scroll' }, 'the phone still scrolls' );
	assert.ok( SETTLED.includes( 'part-held' ) );
} );

test( 'equalFlexTracks: a count only for equal flexible tracks', () => {
	assert.equal( equalFlexTracks( 'repeat(6, minmax(0, 1fr))' ), 6 );
	assert.equal( equalFlexTracks( '1fr 1fr 1fr' ), 3 );
	for ( const v of [ '1fr 2fr', '195px 195px', 'none', 'repeat(auto-fit, minmax(0, 1fr))', 'minmax(200px, 1fr) minmax(200px, 1fr)', undefined ] ) {
		assert.equal( equalFlexTracks( v ), null, String( v ) );
	}
} );

test( 'rootDefersTo: the root leaves the grid only what no root setting paints; a gap setting painting both stays with the root', () => {
	const withGap = { ...COLUMNS_CAL, settings: { ...COLUMNS_CAL.settings, gap: { slot: '', slots: [ '', GRID ], property: 'gap', state: null } } };
	const rec = { targets: [ { id: '0:', slot: '', finder: '.strip' }, { id: `0:${ GRID }`, slot: GRID, finder: '.strip' }, { id: `0:${ ITEM }`, slot: ITEM, finder: '.tile' } ] };
	const d = rootDefersTo( withGap, rec, rec.targets[ 0 ] );
	assert.equal( d.slot, GRID );
	assert.ok( d.props.has( 'grid-template-columns' ) && d.props.has( 'overflow-x' ), JSON.stringify( [ ...d.props ] ) );
	assert.equal( d.props.has( 'column-gap' ), false, 'the root gap setting keeps its reading' );
	assert.equal( rootDefersTo( withGap, rec, rec.targets[ 1 ] ), null, 'only the root defers' );
} );
