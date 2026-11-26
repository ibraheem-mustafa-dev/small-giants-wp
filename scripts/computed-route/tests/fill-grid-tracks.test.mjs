// The post-Fill track check (lib/fill-grid-tracks.mjs): a grid node's explicit tracks are re-derived from what each draft cell
// became. Indus's home hero wrote the draft's two tracks onto a container that held four items promoted from the first cell (the
// second cell's picture belongs to the hero), so the words sat in half the width. Mutation list: tests/fill-grid-tracks.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { retrack, gridTrackWrites, confirmable } from '../lib/fill-grid-tracks.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';

const el = ( key, parentKey, shown = [ 375, 768, 1440 ] ) => ( { key, parentKey, depth: parentKey ? 1 : 0, tag: 'div', words: '', visible: { 375: shown.includes( 375 ), 768: shown.includes( 768 ), 1440: shown.includes( 1440 ) }, box: {} } );
const A = [ el( 'cellA', 'grid' ), el( 'a1', 'cellA' ), el( 'a2', 'cellA' ), el( 'a3', 'cellA' ), el( 'a4', 'cellA' ) ];
const B = [ el( 'cellB', 'grid' ), el( 'pic', 'cellB' ) ];
const C = [ el( 'cellC', 'grid' ), el( 'c1', 'cellC' ) ];
// Two cells: grid > cellA > [a1..a4], cellB > pic. Three cells: cellC > c1 as well.
const two = () => inventoryModel( { elements: [ el( 'grid', null ), ...A, ...B ] } );
const three = () => inventoryModel( { elements: [ el( 'grid', null ), ...A, ...B, ...C ] } );
const base = { width: 1440 };

test( 'MUST FAIL: items promoted from the one cell left with items stack in that cell track, the other cell track gone', () => {
	const m = two();
	const r = retrack( { ...base, m, value: 'minmax(0, 1fr) minmax(0, 1.1fr)', element: m.byKey.grid, children: [ 'a1', 'a2', 'a3', 'a4' ] } );
	assert.deepEqual( [ r.ok, r.value, r.count ], [ true, 'minmax(0, 1fr)', 1 ] );
	assert.match( r.why, /cells hold 4, 0 items here: 1 track/ );
} );

test( 'a cell that kept none loses its track; cells that each kept one keep theirs', () => {
	const m = three();
	const kept = retrack( { ...base, m, value: '1fr 2fr 3fr', element: m.byKey.grid, children: [ 'a1', 'c1' ] } );
	assert.deepEqual( [ kept.ok, kept.value, kept.count ], [ true, '1fr 3fr', 2 ], 'cellA and cellC kept one item each, cellB none' );
	assert.deepEqual( retrack( { ...base, m, value: '1fr 1fr 1fr', element: m.byKey.grid, children: [ 'cellA', 'pic', 'c1' ] } ), { ok: true }, 'one item per cell: the draft tracks hold it' );
} );

test( 'negative control: two cells left with one promoting several items, an item in no cell, a wrapping grid, one track and no cell shown are not re-derived', () => {
	const m = three();
	const mixed = retrack( { ...base, m, value: '1fr 1fr 1fr', element: m.byKey.grid, children: [ 'a1', 'a2', 'c1' ] } );
	assert.equal( mixed.ok, false );
	assert.match( mixed.why, /hold 2, 0, 1 items here/ );
	const orphan = retrack( { ...base, m, value: '1fr 1fr 1fr', element: m.byKey.grid, children: [ 'a1', 'grid' ] } );
	assert.equal( orphan.ok, false );
	assert.match( orphan.why, /sits in none of the 3 cells/ );
	assert.deepEqual( retrack( { ...base, m, value: '1fr 1fr', element: m.byKey.grid, children: [ 'a1', 'a2', 'a3', 'a4' ] } ), { ok: true }, 'three cells in two tracks: the draft wraps, so the tracks stay' );
	assert.deepEqual( retrack( { ...base, m, value: '1fr', element: m.byKey.grid, children: [ 'a1', 'a2' ] } ), { ok: true }, 'one track: nothing to derive' );
	assert.deepEqual( retrack( { ...base, width: 375, m: inventoryModel( { elements: [ el( 'grid', null ), { ...A[ 0 ], visible: { 1440: true } }, { ...A[ 1 ], visible: { 1440: true } } ] } ), value: '1fr 1fr', element: { key: 'grid', visible: { 375: true } }, children: [] } ), { ok: true }, 'no cell shown at the width' );
} );

const tree = ( attrs, kids ) => {
	const nodes = [ { index: 0, name: 'sgs/container', node: { draftRef: { tpl: 'grid' } }, children: kids.map( ( k, i ) => i + 1 ) }, ...kids.map( ( k, i ) => ( { index: i + 1, name: 'sgs/text', node: { draftRef: { tpl: k } }, children: [] } ) ) ];
	const flat = nodes.map( ( n, i ) => ( { attributes: 0 === i ? attrs : {} } ) );
	return { nodes, flat, refOf: ( n ) => `n${ flat.indexOf( n ) }` };
};

test( 'MUST FAIL: the node tiers, its count setting and the write Fill made take the re-derived tracks, and the write is judged against the draft only where no rewrite reached', () => {
	const attrs = { gridTemplateColumns: { desktop: '1fr 1fr', tablet: '1fr 1fr', mobile: '1fr' }, columns: { desktop: 2, tablet: 2, mobile: 1 } };
	const t = tree( attrs, [ 'a1', 'a2', 'a3', 'a4' ] );
	const prior = { node: 'n0', attr: 'gridTemplateColumns', after: structuredClone( attrs.gridTemplateColumns ), widths: [ 375, 768, 1440 ], how: 'declared' };
	const r = gridTrackWrites( { ...t, m: two(), writes: [ prior ] } );
	assert.deepEqual( attrs.gridTemplateColumns, { desktop: '1fr', tablet: '1fr', mobile: '1fr' } );
	assert.deepEqual( attrs.columns, { desktop: 1, tablet: 1, mobile: 1 } );
	assert.deepEqual( [ prior.how, prior.after, prior.retracked ], [ 'declared', attrs.gridTemplateColumns, [ 1440, 768 ] ], 'the write keeps its own how and names the widths the rewrite reached' );
	assert.deepEqual( confirmable( [ prior ] ).map( ( w ) => w.widths ), [ [ 375 ] ], 'only the width no rewrite reached is judged against the draft' );
	assert.deepEqual( [ r.unmapped.length, r.notes.length ], [ 0, 2 ], 'desktop and tablet are noted' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.how, w.widths, w.before, w.after ] ), [ [ 'columns', 'grid-tracks', [ 1440, 768 ], { desktop: 2, tablet: 2, mobile: 1 }, attrs.columns ] ], 'the count setting is a write of its own: the report shows the new count, not the draft count' );
	// A count write Fill already made is rewritten in place, the same way.
	const attrs2 = { gridTemplateColumns: { desktop: '1fr 1fr' }, columns: { desktop: 2 } };
	const priorCount = { node: 'n0', attr: 'columns', after: { desktop: 2 }, widths: [ 1440 ], how: 'declared' };
	const r2 = gridTrackWrites( { ...tree( attrs2, [ 'a1', 'a2' ] ), m: two(), writes: [ priorCount ] } );
	assert.deepEqual( [ priorCount.after, priorCount.retracked, r2.writes.map( ( w ) => w.attr ) ], [ { desktop: 1 }, [ 1440 ], [ 'gridTemplateColumns' ] ] );
	assert.deepEqual( confirmable( [ priorCount ] ), [], 'a write every width of which was rewritten is not judged' );
	const bare = tree( { gridTemplateColumns: { desktop: '1fr 1fr' } }, [ 'a1', 'a2' ] );
	assert.equal( gridTrackWrites( { ...bare, m: two(), writes: [] } ).writes.length, 1, 'with no write to replace, the rewrite is a write of its own' );
} );

test( 'MUST FAIL: a cell the draft shows only at some widths holds its items at those widths, so they are no orphans there', () => {
	const m = inventoryModel( { elements: [ el( 'grid', null ), ...A, el( 'cellM', 'grid', [ 375 ] ), el( 'm1', 'cellM', [ 375 ] ) ] } );
	assert.deepEqual( retrack( { width: 375, m, value: '1fr 1fr', element: m.byKey.grid, children: [ 'a1', 'a2', 'a3', 'a4', 'm1' ] } ).ok, false, 'the phone-only cell is a cell: cellA holds four items beside it, so no track list holds them' );
	assert.deepEqual( retrack( { width: 375, m, value: '1fr 1fr', element: m.byKey.grid, children: [ 'a1', 'm1' ] } ), { ok: true }, 'one item in each of the two cells shown at 375: the draft tracks hold them' );
} );

test( 'negative control: a track left empty (fewer cells shown than tracks) is not re-derived, as which track a cell sits in is not known', () => {
	const m = two();
	assert.deepEqual( retrack( { ...base, m, value: '1fr 1fr 1fr', element: m.byKey.grid, children: [ 'a1', 'a2', 'a3', 'a4' ] } ), { ok: true } );
} );

test( 'MUST FAIL: tracks no list holds are an UNMAPPED row naming the node, the width and why; the node is left as Fill wrote it', () => {
	const attrs = { gridTemplateColumns: { desktop: '1fr 1fr 1fr' } };
	const t = tree( attrs, [ 'a1', 'a2', 'c1' ] );
	const r = gridTrackWrites( { ...t, m: three(), writes: [] } );
	assert.deepEqual( attrs.gridTemplateColumns, { desktop: '1fr 1fr 1fr' } );
	assert.deepEqual( r.unmapped.map( ( u ) => [ u.node, u.property, u.widths ] ), [ [ 'n0', 'grid-template-columns', [ 1440 ] ] ] );
	assert.match( r.unmapped[ 0 ].reason, /^tracks: the draft's 3 cells hold 2, 0, 1 items here/ );
} );

test( 'negative control: a node with no explicit tracks, no draft element or tracks that already fit is untouched', () => {
	const none = tree( { layout: 'grid' }, [ 'a1', 'a2' ] );
	assert.deepEqual( gridTrackWrites( { ...none, m: two(), writes: [] } ), { writes: [], unmapped: [], notes: [] } );
	const fits = tree( { gridTemplateColumns: { desktop: '1fr 1fr 1fr' } }, [ 'a1', 'pic', 'c1' ] );
	assert.deepEqual( gridTrackWrites( { ...fits, m: three(), writes: [] } ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( fits.flat[ 0 ].attributes.gridTemplateColumns, { desktop: '1fr 1fr 1fr' } );
	const unknown = tree( { gridTemplateColumns: { desktop: '1fr 1fr' } }, [ 'a1' ] );
	unknown.nodes[ 0 ].node.draftRef.tpl = 'missing';
	assert.deepEqual( gridTrackWrites( { ...unknown, m: two(), writes: [] } ).notes, [] );
} );

test( 'MUST FAIL: cells the host block draws itself as its own parts (a split hero content column and picture) keep the tracks of the host, however many items sit in them', () => {
	const m = two();
	const kept = retrack( { ...base, m, value: 'minmax(0, 1fr) minmax(0, 1.1fr)', element: m.byKey.grid, children: [ 'a1', 'a2', 'a3', 'a4' ], parts: [ 'cellA', 'pic' ] } );
	assert.deepEqual( kept, { ok: true }, 'content column and picture are the two parts of the hero: two tracks for two columns' );
	const media = retrack( { ...base, m, value: 'minmax(0, 1fr) minmax(0, 1.1fr)', element: m.byKey.grid, children: [ 'a1', 'a2' ], parts: [ 'pic' ] } );
	assert.equal( media.ok, false, 'one cell a part, the other promoting two items: no track list holds both' );
	const attrs = { gridTemplateColumns: { desktop: '1fr 1fr' } };
	const t = tree( attrs, [ 'a1', 'a2', 'a3', 'a4' ] );
	t.nodes[ 0 ].node.draftSlots = { '.content': { tpl: 'cellA' }, '.media': { tpl: 'pic' }, '.other': { js: 'x' } };
	assert.deepEqual( gridTrackWrites( { ...t, m: two(), writes: [] } ), { writes: [], unmapped: [], notes: [] } );
	assert.deepEqual( attrs.gridTemplateColumns, { desktop: '1fr 1fr' } );
} );
