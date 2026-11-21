// A wrapper the rules would dissolve, whose look no reader takes, that is its parent's only content and paints only looks the
// parent block's own settings paint at one part, is absorbed by the parent (lib/skeleton-absorb-wrapper.mjs; Bean, 2026-11-21:
// "the draft's wrapper CSS should never get dropped, it should just get absorbed by the container parent if that has the
// settings/css rules that are equivalent"): it is the parent node's draft element at that part, found through the block's
// calibration, and makes no node. A wrapper with a sibling, a look the parent cannot hold at that part, a position of its own,
// or a parent whose part is taken or whose own element paints the same look (padding adds) stays a node.
// Pure functions and a temporary folder only: no command, no site. The block's real calibration (cache/container.json, read
// for indus-test, gitignored) gives the parts: a worktree without it skips the calibration tests and says why.
// Mutation list: tests/skeleton-absorb-wrapper.mutations.json.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import { loadCalibration } from '../lib/cache.mjs';
import { absorbSlot, onlyContent, positioned, clash } from '../lib/skeleton-absorb-wrapper.mjs';
import { makeSlotRows } from '../lib/skeleton-write-slots.mjs';
import { checkRecords } from '../lib/skeleton-paint-conservation.mjs';
import { skeletonProblems, cleanTree } from '../lib/fill-skeleton.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { N, run, find, build, draftRepo, facts, db } from './fixtures/skeleton-widgets/build.mjs';

const CAL = loadCalibration( new URL( '../cache', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' ), 'sgs/container', 'indus-test' );
const NO_CAL = ! CAL?.settings ? 'no sgs/container slot map in cache/' : null;
const test = NO_CAL ? ( name, fn ) => nodeTest( name, { skip: `needs the indus-test calibration of sgs/container in cache/ (gitignored; run calibrate.mjs): ${ NO_CAL }` }, fn ) : nodeTest;
const INNER = '.sgs-container__inner';
const cal = ( b ) => ( 'sgs/container' === b ? CAL.settings : {} );

// main > section (its own padding) > div wrapper (its padding) > heading and text, with optional siblings beside the wrapper.
const page = ( { wrap = 'padding:0 40px', section = 'padding:38px 0;background:#f5efe6', siblings = [] } = {} ) => N( 'main', {}, [ N( 'section', { style: section, box: [ 1000, 200 ] }, [ N( 'div', { style: wrap, box: [ 1000, 120 ] }, [ N( 'h2', { words: 'Our story' } ), N( 'p', { words: 'Body text of the section.' } ) ] ), ...siblings ] ) ] );
// The fixture run with rules.alignWrapper taking more properties (`props`): the seam that lets a positioned or laying-out
// wrapper reach the unwrap guard, as another dissolving rule's wrapper would.
const runWith = ( root, props, extra = {} ) => {
	const b = build( root );
	const draft = draftRepo( b.html, 'class Component {}' );
	const f = facts( draft.repo );
	f.decisions.rules.alignWrapper.properties = [ ...f.decisions.rules.alignWrapper.properties, ...props ];
	Object.assign( f.decisions.rules.alignWrapper, extra );
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': draft.hash } } };
	return proposeSkeleton( { inventory: b.inventory, facts: f, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: rec, openers: {}, carried: null, calSettings: cal } );
};
const outcome = ( o = {}, opts = {} ) => {
	const r = opts.props ? runWith( page( o ), opts.props ) : run( page( o ), 'class Component {}', { calSettings: cal, ...opts } );
	const wrapper = r.proposal.rows.find( ( x ) => 'Root/3#0' === x.key );
	const section = find( r.skeleton, ( n ) => 'Root/2#0' === n.draftRef?.tpl )[ 0 ];
	const kept = find( r.skeleton, ( n ) => 'Root/3#0' === n.draftRef?.tpl )[ 0 ] ?? null;
	return { r, wrapper, section, kept };
};

test( 'MUST FAIL: a padded wrapper that is its section\'s only content is the section\'s content band, not a container of its own', () => {
	const { r, wrapper, section, kept } = outcome();
	assert.equal( wrapper.action, 'unwrap' );
	assert.equal( kept, null, 'no node is made for the wrapper' );
	assert.deepEqual( section.draftSlots?.[ INNER ], { tpl: 'Root/3#0' }, 'the wrapper is the section\'s draft element at the part its padding setting paints' );
	assert.deepEqual( section.draftAbsorbed, [ INNER ], 'Fill is told the wrapper sits inside the section\'s own element' );
	const rec = wrapper.conserve.find( ( c ) => 'absorbed' === c.kind );
	assert.equal( rec.node, 'Root/2#0' );
	assert.equal( rec.slot, INNER );
	assert.ok( rec.settings.includes( 'padding' ) );
	assert.deepEqual( rec.looks, [ 'padding' ] );
	assert.match( wrapper.reason, /parent absorbs it/ );
	// The record is verified by the paint detector against the section's node (read through the parent, never dropped).
	const nodes = new Map( [ [ 'Root/2#0', section ] ] );
	assert.deepEqual( checkRecords( [ rec ], { looks: [ 'padding' ], nodes } ).delivered, [ 'padding' ] );
	assert.equal( checkRecords( [ rec ], { looks: [ 'padding' ], nodes: new Map() } ).bad.length, 1, 'an absorbed record naming no node is refused' );
	assert.deepEqual( skeletonProblems( r.skeleton ), [] );
	assert.ok( ! JSON.stringify( cleanTree( r.skeleton ) ).includes( 'draftAbsorbed' ), 'the key is the skeleton\'s, never the page\'s' );
	assert.deepEqual( section.innerBlocks.map( ( n ) => n.draftRef?.tpl ), [ 'Root/4#0', 'Root/5#0' ], 'the wrapper\'s children are the section\'s' );
} );

test( 'MUST FAIL: a wrapper that holds space above and below (alignWrapper.blockPadding) is absorbed too', () => {
	const { wrapper, section, kept } = outcome( { wrap: 'padding:24px 40px' } );
	assert.equal( wrapper.action, 'unwrap' );
	assert.equal( kept, null );
	assert.deepEqual( section.draftAbsorbed, [ INNER ] );
	// The same side declared on both: absorbed, since the two paddings add (the draft renders them nested).
	const same = outcome( { wrap: 'padding:24px 40px', section: 'padding:38px 12px;background:#f5efe6' } );
	assert.deepEqual( same.section.draftAbsorbed, [ INNER ] );
} );

test( 'negative control: a wrapper with a sibling stays a node; a sibling that draws no box does not count', () => {
	const beside = outcome( { siblings: [ N( 'p', { words: 'A note beside the column.' } ) ] } );
	assert.equal( beside.wrapper.action, null );
	assert.equal( beside.wrapper.block, 'sgs/container' );
	assert.ok( beside.kept, 'the wrapper is a container of its own' );
	assert.equal( beside.section.draftSlots?.[ INNER ], undefined );
	const empty = outcome( { siblings: [ N( 'span', { box: [ 0, 0 ] } ) ] } );
	assert.equal( empty.kept, null, 'an empty box beside it is no content the padding would move' );
	assert.deepEqual( empty.section.draftAbsorbed, [ INNER ] );
} );

test( 'negative control: a wrapper that paints a look the parent\'s part cannot hold stays a node', () => {
	for ( const wrap of [ 'padding:0 40px;background:#fde', 'padding:0 40px;border:1px solid #333', 'padding:0 40px;box-shadow:0 2px 4px #000', 'padding:0 40px;border-radius:12px' ] ) {
		const { wrapper, kept, section } = outcome( { wrap } );
		assert.equal( wrapper.action, null, wrap );
		assert.ok( kept, wrap );
		assert.equal( section.draftAbsorbed, undefined, wrap );
	}
} );

test( 'negative control: a wrapper holding space above and below that its parent does not absorb stays a node, even where a reader takes its look (alignWrapper.blockPadding)', () => {
	// A host setting on the rule (the seam a hero picture's frame reaches through its part slot) makes the guard keep the unwrap.
	const beside = [ N( 'p', { words: 'A note beside the column.' } ) ];
	const held = ( wrap ) => {
		const r = runWith( page( { wrap, siblings: beside } ), [], { hostSetting: 'contentWidth' } );
		return r.proposal.rows.find( ( x ) => 'Root/3#0' === x.key );
	};
	assert.equal( held( 'padding:24px 40px' ).action, null, 'the space would be lost: the wrapper stays' );
	assert.equal( held( 'padding:0 40px' ).action, 'unwrap', 'side padding the reader takes goes, as before' );
} );

test( 'negative control: a wrapper that places itself stays a node', () => {
	const { wrapper, kept, section } = outcome( { wrap: 'padding:0 40px;position:relative' }, { props: [ 'position' ] } );
	assert.equal( wrapper.action, null );
	assert.ok( kept );
	assert.equal( section.draftAbsorbed, undefined );
	assert.deepEqual( outcome( { wrap: 'padding:0 40px;position:static' }, { props: [ 'position' ] } ).section.draftAbsorbed, [ INNER ], 'static places nothing' );
} );

test( 'a wrapper that lays out its children is absorbed with its layout settings; one whose parent lays out itself stays (negative control)', () => {
	const flex = outcome( { wrap: 'padding:0 40px;display:flex' }, { props: [ 'display' ] } );
	assert.equal( flex.kept, null );
	const rec = flex.wrapper.conserve.find( ( c ) => 'absorbed' === c.kind );
	assert.deepEqual( rec.looks.sort(), [ 'layout', 'padding' ] );
	assert.ok( rec.settings.includes( 'flexDirection' ) && rec.settings.includes( 'padding' ) );
	// The parent's own element lays out its one child (a grid): the wrapper's layout would overwrite it.
	const grid = outcome( { wrap: 'padding:0 40px;display:flex', section: 'padding:38px 0;background:#f5efe6;display:grid' }, { props: [ 'display' ] } );
	assert.ok( grid.kept );
	assert.equal( grid.section.draftAbsorbed, undefined );
	// Padding on both is no clash: the two add.
	assert.deepEqual( outcome( { wrap: 'padding:0 40px', section: 'padding:38px 0;background:#f5efe6;display:grid' } ).section.draftAbsorbed, [ INNER ] );
} );

test( 'a wrapper of a wrapper: the outer one is absorbed by the page\'s root, and the inner one, whose parent is gone and whose part is taken, stays', () => {
	const r = run( page( { section: 'padding:38px 0' } ), 'class Component {}', { calSettings: cal } );
	const root = find( r.skeleton, ( n ) => 'Root/1#0' === n.draftRef?.tpl )[ 0 ];
	assert.deepEqual( root.draftSlots?.[ INNER ], { tpl: 'Root/2#0' } );
	assert.ok( find( r.skeleton, ( n ) => 'Root/3#0' === n.draftRef?.tpl )[ 0 ], 'the inner wrapper is a container of its own' );
} );

test( 'negative control: a block whose calibration paints padding at no part but its root absorbs nothing', () => {
	const { kept, section } = outcome( {}, { calSettings: ( b ) => ( 'sgs/container' === b ? { ...CAL.settings, padding: { ...CAL.settings.padding, slot: '', slots: [ '' ] } } : {} ) } );
	assert.ok( kept );
	assert.equal( section.draftAbsorbed, undefined );
} );

test( 'MUST FAIL: absorbSlot finds the outermost part where the calibration paints every look, never the root or a pseudo layer', () => {
	assert.deepEqual( absorbSlot( { looks: [ 'padding' ], settings: CAL.settings } ), { slot: INNER, settings: [ 'padding' ] } );
	const both = absorbSlot( { looks: [ 'padding', 'layout' ], settings: CAL.settings } );
	assert.equal( both.slot, INNER );
	assert.ok( both.settings.includes( 'padding' ) && both.settings.includes( 'flexDirection' ) );
	assert.equal( absorbSlot( { looks: [ 'padding', 'background' ], settings: CAL.settings } ), null, 'a background is painted at the root only' );
	assert.equal( absorbSlot( { looks: [ 'shadow' ], settings: CAL.settings } ), null );
	assert.equal( absorbSlot( { looks: [ 'padding' ], settings: { p: { slot: '::before', slots: [ '::before' ], property: 'padding' } } } ), null );
	const text = { slot: '', reaches: [ '.a > p' ], property: 'color' };
	assert.deepEqual( absorbSlot( { looks: [ 'padding' ], settings: { p: { slot: '.a', property: 'padding' }, text } } ), { slot: '.a', settings: [ 'p' ] } );
	assert.equal( absorbSlot( { looks: [ 'padding' ], settings: { p: { slot: '.a', property: 'padding', state: 'hover' }, text } } ), null, 'a state setting is no resting look' );
	assert.equal( absorbSlot( { looks: [], settings: CAL.settings } ), null );
} );

nodeTest( 'absorbSlot takes the outermost part that holds another element, whatever the order of the settings', () => {
	const settings = { inner: { slot: '.x > .y', property: 'padding' }, outer: { slot: '.x', property: 'padding' }, text: { slot: '', reaches: [ '.x > .y > p' ], property: 'color' } };
	assert.deepEqual( absorbSlot( { looks: [ 'padding' ], settings } ), { slot: '.x', settings: [ 'outer' ] } );
	assert.equal( absorbSlot( { looks: [ 'padding' ], settings: { leaf: { slot: '.x', property: 'padding' } } } ), null, 'a part holding nothing is no home for a wrapper of children' );
	const layout = { gap: { slot: '', slots: [ '', '.x' ], property: 'gap' }, text: { slot: '', reaches: [ '.x > p' ], property: 'color' } };
	assert.deepEqual( absorbSlot( { looks: [ 'layout' ], settings: layout } ), { slot: '.x', settings: [ 'gap' ] }, 'the root, the parent\'s own element, is never the wrapper\'s part' );
} );

nodeTest( 'onlyContent, positioned and clash', () => {
	const els = { p: { key: 'p', words: '' }, w: { key: 'w', parentKey: 'p' }, s: { key: 's', parentKey: 'p', box: { 1440: { w: 10, h: 10 } } }, z: { key: 'z', parentKey: 'p', box: { 1440: { w: 0, h: 10 } } } };
	const m = ( kids, words = '' ) => ( { words: ( e ) => ( e === els.p ? words : '' ), kids: () => kids, isPart: () => false, shownAt: () => [ 1440 ] } );
	assert.equal( onlyContent( m( [ els.w ] ), els.p, els.w ), true );
	assert.equal( onlyContent( m( [ els.w, els.s ] ), els.p, els.w ), false, 'a sibling with a box' );
	assert.equal( onlyContent( m( [ els.w, els.z ] ), els.p, els.w ), true, 'a sibling of no width' );
	assert.equal( onlyContent( m( [ els.w ], 'Words' ), els.p, els.w ), false, 'the parent prints words of its own' );
	assert.equal( onlyContent( m( [ els.w ] ), els.s, els.w ), false, 'not the parent' );
	assert.equal( positioned( { position: 'static' }, {} ), false );
	assert.equal( positioned( { position: 'static' }, { position: 'relative' } ), true );
	assert.equal( positioned( { position: 'absolute' }, {} ), true );
	assert.equal( positioned( { resolved: { 1440: { position: 'sticky' } } }, {} ), true );
	assert.deepEqual( clash( { looks: [ 'padding' ], parentLooks: [ 'padding' ] } ), [], 'padding adds' );
	assert.deepEqual( clash( { looks: [ 'padding', 'layout' ], parentLooks: [], parentLays: true } ), [ 'layout' ], 'the parent lays out its own child' );
	assert.deepEqual( clash( { looks: [ 'max-width' ], parentLooks: [ 'max-width' ] } ), [ 'max-width' ] );
	assert.deepEqual( clash( { looks: [ 'layout' ], parentLooks: [], parentLays: false } ), [] );
} );

test( 'negative control: a parent whose part is already taken by another draft element absorbs nothing', () => {
	const parent = { key: 'p', words: '' };
	const e = { key: 'w', parentKey: 'p' };
	const m = { words: () => '', kids: () => [ e ], isPart: () => false, shownAt: () => [ 1440 ], blockKids: () => [ e ] };
	const slotRows = ( draftSlots ) => makeSlotRows( { m, facts: {}, cls: {}, R: {}, view: {}, inventory: {}, calSettings: cal, finder: ( x ) => ( { tpl: x.key } ), base: () => ( {} ), hosts: [ { block: 'sgs/container', e: parent, node: { draftRef: { tpl: 'p' }, ...( draftSlots ? { draftSlots } : {} ) }, row: {} } ], slotProblems: [], w: {} } );
	assert.deepEqual( slotRows().absorbInto( e, [ 'padding' ] ), { node: 'p', block: 'sgs/container', slot: INNER, settings: [ 'padding' ] } );
	assert.equal( slotRows( { [ INNER ]: { tpl: 'other' } } ).absorbInto( e, [ 'padding' ] ), null );
	assert.equal( slotRows().absorbInto( { key: 'w', parentKey: 'elsewhere' }, [ 'padding' ] ), null, 'not a child of the block being built' );
} );
