// The clone difference ledger (tools/clone-ledger.mjs) on small fixtures: the pairing from the skeleton, the built tree from the
// Filled tree and the apply plan, the comparison of two canned reads, and each stage's rule with its record row
// (lib/ledger-stage.mjs::stageOf, ::unpairedStage). Each stage test has a negative control: a matching element makes no row,
// or the same row without the record lands on another stage. No browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerTargets, unpairedDraft, builtAttributes, refsOfContent, applyIndex } from '../lib/ledger-pairs.mjs';
import { pairDiffs, paintsOf, pictureName } from '../lib/ledger-diff.mjs';
import { stageOf, fillIndex, unpairedStage, propsFor } from '../lib/ledger-stage.mjs';
import { mergeWidths, innermostText, summarise, ledgerMarkdown } from '../lib/ledger-report.mjs';
import { markFollows } from '../lib/ledger-follow.mjs';

// A section holding a heading and a layer, the layer with one slot.
const SKELETON = [ { name: 'sgs/container', attributes: {}, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [
	{ name: 'sgs/heading', attributes: {}, draftRef: { tpl: 'Root/2#0' }, innerBlocks: [] },
	{ name: 'sgs/decorative-image', attributes: {}, draftRef: { tpl: 'Root/3#0' }, draftSlots: { '.sgs-decorative-image__img': { tpl: 'Root/4#0' } }, innerBlocks: [] },
	{ name: 'sgs/spacer', attributes: {}, innerBlocks: [] },
] } ];
const FILLED = [ { name: 'sgs/container', attributes: { className: 'cr-ref-s-0' }, innerBlocks: [
	{ name: 'sgs/heading', attributes: { className: 'cr-ref-s-1', fontSize: { desktop: 40 } }, innerBlocks: [] },
	{ name: 'sgs/decorative-image', attributes: { className: 'cr-ref-s-2', layerHeight: { desktop: '100%' } }, innerBlocks: [] },
	{ name: 'sgs/spacer', attributes: { className: 'cr-ref-s-3' }, innerBlocks: [] },
] } ];
const targets = ledgerTargets( SKELETON, 's' );
const T = ( id ) => targets.find( ( t ) => t.id === id );

// A canned read of one element: the walker collector's shape.
const snap = ( styles = {}, box = { x: 0, y: 0, w: 100, h: 50 }, extra = {} ) => ( { found: true, shown: true, snap: { tag: 'div', text: 'Words', box, styles: { position: 'static', ...styles }, pseudo: {}, motion: { animation: 'none', transition: 'none' }, keyframes: 'none', loops: [], textFrom: 'own', layoutDisplay: 'block', layoutChildren: 1, ...extra } } );
const ctxOf = ( { report = {}, filled = FILLED, plan = null, inventory = [] } = {} ) => ( {
	fill: fillIndex( report ), built: builtAttributes( filled, 's', plan ), apply: applyIndex( plan ),
	inventory: new Map( inventory.map( ( e ) => [ e.key, e ] ) ), fillProps: new Set( [ 'color', 'font-size', 'height', 'top', 'background-color', 'display' ] ), live: { selector: '.cr-ref-s-2', box: { x: 0, y: 40, w: 100, h: 10 } },
} );
const diff = ( key, draft = 'a', live = 'b', width = 1440 ) => ( { key, kind: 'style', draft, live, width } );

test( 'pairing: node i is cr-ref-<surface>-<i>, its draftRef and draftSlots are its targets, a slot finder is scoped inside the node', () => {
	assert.deepEqual( targets.map( ( t ) => [ t.id, t.ref, t.slot, t.parent, t.draftKey ] ), [
		[ '0:', 'cr-ref-s-0', '', null, 'Root/1#0' ],
		[ '1:', 'cr-ref-s-1', '', 0, 'Root/2#0' ],
		[ '2:', 'cr-ref-s-2', '', 0, 'Root/3#0' ],
		[ '2:.sgs-decorative-image__img', 'cr-ref-s-2', '.sgs-decorative-image__img', 2, 'Root/4#0' ],
		[ '3:', 'cr-ref-s-3', '', 0, null ],
	] );
	assert.equal( T( '2:.sgs-decorative-image__img' ).scope, 2 );
	assert.equal( T( '2:.sgs-decorative-image__img' ).draftFinder.within, '[data-fill-scope="2"]' );
	assert.equal( T( '0:' ).top, true );
	assert.equal( T( '1:' ).top, false );
} );

test( 'unpaired draft elements carry their proposal row and the node that absorbed them', () => {
	const inventory = { elements: [ { key: 'Root/1#0' }, { key: 'Root/5#0' }, { key: 'Root/6#0' }, { key: 'Root/7#0' } ] };
	const proposal = { rows: [ { key: 'Root/5#0', action: 'absorbed', into: 'Root/3#0', rule: 'heroBackdrop', reason: 'behind the content' }, { key: 'Root/6#0', action: 'unwrap', rule: 'heroInner', reason: 'wrappers go' } ] };
	const u = unpairedDraft( inventory, proposal, targets );
	assert.deepEqual( u.map( ( x ) => x.key ), [ 'Root/5#0', 'Root/6#0', 'Root/7#0' ] );
	assert.deepEqual( u[ 0 ].owner, { ref: 'cr-ref-s-2', block: 'sgs/decorative-image', index: 2 } );
	assert.equal( unpairedStage( u[ 0 ].row, u[ 0 ].owner ).stage, 'other-block' );
	assert.equal( unpairedStage( u[ 1 ].row, u[ 1 ].owner ).stage, 'no-node' );
	assert.equal( unpairedStage( u[ 1 ].row, u[ 1 ].owner ).proof.rule, 'heroInner' );
	assert.equal( unpairedStage( null, null ).stage, 'no-node' );
} );

test( 'the built tree is the Filled tree with the apply plan\'s written operations and the build read-back laid over it', () => {
	const plan = { rows: [ { ref: 'cr-ref-s-1', status: 'written', writes: [ { attr: 'maxWidth', value: { desktop: '500px' } } ] }, { ref: 'cr-ref-s-2', status: 'no-setting', writes: [ { attr: 'x', value: 1 } ] } ] };
	const built = builtAttributes( FILLED, 's', plan );
	assert.deepEqual( built.get( 'cr-ref-s-1' ).maxWidth, { desktop: '500px' } );
	assert.equal( built.get( 'cr-ref-s-2' ).x, undefined );
	const back = refsOfContent( '<!-- wp:sgs/heading {"className":"cr-ref-s-1","fontSize":{"desktop":41}} /--><!-- wp:sgs/heading {"className":"cr-ref-s-12"} /-->', 's' );
	assert.deepEqual( [ ...back.keys() ], [ 'cr-ref-s-1', 'cr-ref-s-12' ] );
	assert.deepEqual( builtAttributes( FILLED, 's', null, back ).get( 'cr-ref-s-1' ).fontSize, { desktop: 41 } );
} );

test( 'comparison: a matching element makes no row; a colour, a box, a hidden element and a missing element each make one', () => {
	const parent = snap( {}, { x: 0, y: 100, w: 400, h: 400 } );
	assert.deepEqual( pairDiffs( snap( { color: 'rgb(20, 20, 20)' } ), snap( { color: 'rgb(21, 20, 20)' } ) ), [] );
	assert.deepEqual( pairDiffs( snap( { color: 'rgb(20, 20, 20)' } ), snap( { color: 'rgb(200, 20, 20)' } ) ).map( ( r ) => r.key ), [ 'color' ] );
	// The place inside the enclosing pair: the same offset from a parent placed elsewhere is no row.
	assert.deepEqual( pairDiffs( snap( {}, { x: 0, y: 120, w: 100, h: 50 } ), snap( {}, { x: 0, y: 320, w: 100, h: 50 } ), parent, snap( {}, { x: 0, y: 300, w: 400, h: 400 } ) ), [] );
	const moved = pairDiffs( snap( {}, { x: 0, y: 120, w: 100, h: 50 } ), snap( {}, { x: 0, y: 400, w: 100, h: 50 } ), parent, snap( {}, { x: 0, y: 300, w: 400, h: 400 } ) );
	assert.deepEqual( moved.map( ( r ) => [ r.key, r.draft, r.live ] ), [ [ 'y', 20, 100 ] ] );
	assert.deepEqual( pairDiffs( snap(), { found: true, shown: false } ).map( ( r ) => [ r.key, r.live ] ), [ [ 'shown', 'hidden' ] ] );
	assert.deepEqual( pairDiffs( snap(), { found: false } ).map( ( r ) => [ r.key, r.live ] ), [ [ 'element', 'missing' ] ] );
	assert.deepEqual( pairDiffs( { found: true, shown: false }, { found: false } ), [] );
	// An offset on an in-flow box paints nothing.
	assert.deepEqual( pairDiffs( snap( { right: '0px' } ), snap( { right: '30px' } ) ), [] );
	assert.deepEqual( pairDiffs( snap( { position: 'absolute', right: '0px' } ), snap( { position: 'absolute', right: '30px' } ) ).map( ( r ) => r.key ), [ 'right' ] );
	assert.equal( pictureName( 'http://x/wp-content/uploads/2026/11/photo-1-1024x683.jpg' ), pictureName( 'shots/photo-1.png' ) );
	assert.deepEqual( paintsOf( snap( { 'background-color': 'rgb(1, 2, 3)' }, undefined, { textFrom: 'none' } ) ), [ 'background-color' ] );
	assert.deepEqual( paintsOf( snap( { 'background-color': 'rgba(0, 0, 0, 0)' }, undefined, { textFrom: 'none' } ) ), [] );
} );

test( 'draft-read: the inventory holds a value the draft does not paint (negative control: the same value goes on to Fill\'s records)', () => {
	const inventory = [ { key: 'Root/2#0', resolved: { 1440: { color: 'rgb(9, 9, 9)' } } } ];
	assert.equal( stageOf( diff( 'color', 'rgb(1, 1, 1)', 'rgb(5, 5, 5)' ), T( '1:' ), ctxOf( { inventory } ) ).stage, 'draft-read' );
	const agree = [ { key: 'Root/2#0', resolved: { 1440: { color: 'rgb(1, 1, 1)' } } } ];
	assert.equal( stageOf( diff( 'color', 'rgb(1, 1, 1)', 'rgb(5, 5, 5)' ), T( '1:' ), ctxOf( { inventory: agree } ) ).stage, 'not-read-by-fill' );
} );

test( 'not-read-by-fill names the list: Fill\'s read list, the node\'s rows, or its draftSlots', () => {
	const noRow = stageOf( diff( 'color' ), T( '1:' ), ctxOf() );
	assert.equal( noRow.stage, 'not-read-by-fill' );
	assert.match( noRow.proof.reason, /no row names color on cr-ref-s-1/ );
	const notRead = stageOf( diff( 'mix-blend-mode', 'multiply', 'normal' ), T( '1:' ), ctxOf() );
	assert.equal( notRead.proof.list, 'lib/fill-read.mjs::PROPS' );
	const unread = stageOf( diff( 'color' ), T( '2:.sgs-decorative-image__img' ), ctxOf( { report: { unread: [ { node: 'cr-ref-s-2', kind: 'element', slot: '.sgs-decorative-image__img', reason: 'no draftSlots finder names it' } ] } } ) );
	assert.equal( unread.proof.record, 'fill-report.unread' );
} );

test( 'judged-equal: Fill settled the property against a baseline (negative control: a settled row at another width does not answer)', () => {
	const report = { settled: [ { node: 'cr-ref-s-1', slot: '', property: 'font-size', value: '40px', widths: [ 1440 ], reason: 'equal', detail: 'the calibrated default paints it' } ] };
	const r = stageOf( diff( 'font-size', '40px', '32px', 1440 ), T( '1:' ), ctxOf( { report } ) );
	assert.equal( r.stage, 'judged-equal' );
	assert.equal( r.proof.baseline, 'the calibrated default paints it' );
	assert.equal( stageOf( diff( 'font-size', '40px', '32px', 375 ), T( '1:' ), ctxOf( { report } ) ).stage, 'not-read-by-fill' );
	const held = { alreadyHeld: [ { node: 'cr-ref-s-1', slot: '', property: 'color', value: 'x', reason: 'covered', detail: 'd' } ] };
	assert.equal( stageOf( diff( 'color' ), T( '1:' ), ctxOf( { report: held } ) ).stage, 'judged-equal' );
} );

test( 'unmapped: the row\'s reason verbatim (negative control: a row of another node does not answer)', () => {
	const report = { unmapped: [ { node: 'cr-ref-s-1', slot: '', property: 'color', value: 'x', reason: 'no setting of the block paints color here' } ] };
	const r = stageOf( diff( 'color' ), T( '1:' ), ctxOf( { report } ) );
	assert.equal( r.stage, 'unmapped' );
	assert.equal( r.proof.reason, 'no setting of the block paints color here' );
	assert.equal( stageOf( diff( 'color' ), T( '2:' ), ctxOf( { report } ) ).stage, 'not-read-by-fill' );
} );

test( 'custom-css: a custom CSS gap, a residual rule or a ladder write (negative control: a gap for another property)', () => {
	const gap = { customCssGaps: [ { node: 'cr-ref-s-1', slot: '', properties: [ 'max-width' ], css: '@media…' } ] };
	assert.equal( stageOf( diff( 'max-width' ), T( '1:' ), ctxOf( { report: gap } ) ).stage, 'custom-css' );
	assert.equal( stageOf( diff( 'color' ), T( '1:' ), ctxOf( { report: gap } ) ).stage, 'not-read-by-fill' );
	const residual = { residualCss: { rules: [ { node: 'cr-ref-s-1', part: '', declarations: [ 'height: 82vh' ] } ] } };
	assert.equal( stageOf( diff( 'h', 500, 400 ), T( '1:' ), ctxOf( { report: residual } ) ).stage, 'custom-css' );
	const ladder = { writes: [ { node: 'cr-ref-s-1', slot: '', prop: 'width ladder (color): scoped @media rule', covers: 'color', attr: 'sgsCustomCss', after: '@media', widths: [ 1440 ], how: 'width-ladder' } ] };
	const filled = [ { ...FILLED[ 0 ], innerBlocks: [ { ...FILLED[ 0 ].innerBlocks[ 0 ], attributes: { ...FILLED[ 0 ].innerBlocks[ 0 ].attributes, sgsCustomCss: '@media' } }, ...FILLED[ 0 ].innerBlocks.slice( 1 ) ] } ];
	assert.equal( stageOf( diff( 'color' ), T( '1:' ), ctxOf( { report: ladder, filled } ) ).stage, 'custom-css' );
} );

test( 'written-not-built and block-render: a write the built tree lacks, and one it holds while the live element paints otherwise', () => {
	const report = { writes: [ { node: 'cr-ref-s-2', slot: '', prop: 'height', attr: 'layerHeight', after: { desktop: '100%' }, widths: [], answers: [ 1440 ], how: 'single' } ] };
	const held = stageOf( diff( 'h', 756, 484 ), T( '2:' ), ctxOf( { report } ) );
	assert.equal( held.stage, 'block-render' );
	assert.deepEqual( held.proof.built, { layerHeight: { desktop: '100%' } } );
	assert.equal( held.proof.live.selector, '.cr-ref-s-2' );
	const lost = { writes: [ { ...report.writes[ 0 ], after: { desktop: '90%' } } ] };
	assert.equal( stageOf( diff( 'h', 756, 484 ), T( '2:' ), ctxOf( { report: lost } ) ).stage, 'written-not-built' );
	// A setting written in steps is checked at its last write: the first step's partial value is not what the build holds.
	const steps = { writes: [ { node: 'cr-ref-s-2', slot: '', prop: 'top', attr: 'layerHeight', after: { mobile: '50%' }, widths: [], how: 'tiers' }, { node: 'cr-ref-s-2', slot: '', prop: 'height', attr: 'layerHeight', after: { desktop: '100%' }, widths: [], how: 'tiers' } ] };
	assert.equal( stageOf( diff( 'y', 0, 40 ), T( '2:' ), ctxOf( { report: steps } ) ).stage, 'block-render' );
} );

test( 'apply-failed: the apply plan names the operation (negative control: a written operation is no failure)', () => {
	const plan = { rows: [ { ref: 'cr-ref-s-1', status: 'no-effect', prop: 'max-width', writes: [ { attr: 'maxWidth', value: 1 } ] } ] };
	assert.equal( stageOf( diff( 'max-width' ), T( '1:' ), ctxOf( { plan } ) ).stage, 'apply-failed' );
	const ok = { rows: [ { ref: 'cr-ref-s-1', status: 'written', prop: 'max-width', writes: [ { attr: 'maxWidth', value: 1 } ] } ] };
	assert.equal( stageOf( diff( 'max-width' ), T( '1:' ), ctxOf( { plan: ok } ) ).stage, 'not-read-by-fill' );
} );

test( 'content and live-only: words differ; the surface root is placed by the site (negative control: an inner node\'s place)', () => {
	assert.equal( stageOf( { key: 'text', kind: 'text', draft: 'About Eye Care', live: 'About', width: 1440 }, T( '1:' ), ctxOf() ).stage, 'content' );
	assert.equal( stageOf( diff( 'x', 0, 40 ), T( '0:' ), ctxOf() ).stage, 'live-only' );
	assert.notEqual( stageOf( diff( 'x', 0, 40 ), T( '1:' ), ctxOf() ).stage, 'live-only' );
	assert.ok( propsFor( 'shown' ).includes( 'display' ) );
} );

test( 'the report: widths merged, an outer words row folded into its inner one, counts by stage and block', () => {
	const base = { id: '1:', index: 1, ref: 'cr-ref-s-1', block: 'sgs/heading', slot: '', key: 'color', draft: 'a', live: 'b', stage: 'unmapped', proof: {} };
	const merged = mergeWidths( [ { ...base, width: 375 }, { ...base, width: 1440 }, { ...base, key: 'font-size', width: 375 } ] );
	assert.deepEqual( merged.map( ( r ) => [ r.key, r.widths ] ), [ [ 'color', [ 375, 1440 ] ], [ 'font-size', [ 375 ] ] ] );
	const parentOf = ( i ) => ( 1 === i ? 0 : null );
	const text = [ { ...base, key: 'text', width: 375 }, { ...base, index: 0, id: '0:', key: 'text', width: 375 }, { ...base, index: 0, id: '0:', key: 'text', width: 768 } ];
	const folded = innermostText( text, parentOf );
	assert.equal( folded.dropped, 1 );
	assert.deepEqual( folded.rows.map( ( r ) => [ r.index, r.width ] ), [ [ 1, 375 ], [ 0, 768 ] ] );
	const s = summarise( merged );
	assert.deepEqual( s.byStage, { unmapped: 2 } );
	assert.equal( s.byBlock[ 'sgs/heading' ].total, 2 );
	assert.match( ledgerMarkdown( { client: 'c', surface: 's', site: 'x', widths: [ 375 ], seconds: 1, summary: s, rows: merged, unpaired: [], notes: [] } ), /\| unmapped \| 2 \|/ );
} );

test( 'comparison folds a textless side into one text presence row and judges position only out of flow', () => {
	const textless = { found: true, shown: true, snap: { ...snap().snap, styles: { position: 'static' }, textFrom: 'none' } };
	const rows = pairDiffs( textless, snap( { color: 'rgb(0, 0, 0)', 'font-size': '13px' } ) );
	assert.deepEqual( rows.map( ( r ) => [ r.key, r.draft, r.live ] ), [ [ 'text presence', 'none', 'text' ] ] );
	assert.deepEqual( pairDiffs( snap( { position: 'static' } ), snap( { position: 'relative' } ) ), [] );
	assert.deepEqual( pairDiffs( snap( { position: 'absolute' } ), snap( { position: 'static' } ) ).map( ( r ) => r.key ), [ 'position' ] );
	// A tag of another kind is its own row and the look is still compared.
	const tagged = pairDiffs( snap( { color: 'rgb(0, 0, 0)' }, undefined, { tag: 'div' } ), snap( { color: 'rgb(90, 0, 0)' }, undefined, { tag: 'span' } ) );
	assert.deepEqual( tagged.map( ( r ) => r.key ), [ 'tag', 'color' ] );
	assert.equal( stageOf( { key: 'tag', kind: 'tag', draft: '<div>', live: '<span>', width: 1440 }, T( '2:' ), ctxOf() ).stage, 'block-render' );
} );

test( 'a box pushed by an inner or earlier row follows it and carries its stage (negative control: an own sizing row keeps its stage)', () => {
	const r = ( id, ref, key, stage ) => ( { id, ref, key, width: 375, stage, proof: { s: stage } } );
	const out = markFollows( [ r( '0:', 'cr-ref-s-0', 'h', 'judged-equal' ), r( '1:', 'cr-ref-s-1', 'h', 'unmapped' ), r( '2:', 'cr-ref-s-2', 'y', 'block-render' ) ], targets );
	const by = Object.fromEntries( out.map( ( x ) => [ x.id, x ] ) );
	assert.equal( by[ '0:' ].stage, 'unmapped' );
	assert.equal( by[ '0:' ].follows.id, '1:' );
	assert.equal( by[ '2:' ].follows.id, '1:' );
	assert.equal( by[ '1:' ].follows, undefined );
	// An earlier sibling's height alone moves the next sibling.
	const sib = markFollows( [ r( '1:', 'cr-ref-s-1', 'h', 'unmapped' ), r( '2:', 'cr-ref-s-2', 'y', 'block-render' ) ], targets );
	assert.equal( sib.find( ( x ) => '2:' === x.id ).follows?.id, '1:' );
	const own = markFollows( [ r( '0:', 'cr-ref-s-0', 'h', 'judged-equal' ), r( '0:', 'cr-ref-s-0', 'padding-top', 'judged-equal' ), r( '1:', 'cr-ref-s-1', 'h', 'unmapped' ) ], targets );
	assert.equal( own.find( ( x ) => 'h' === x.key && '0:' === x.id ).follows, undefined );
} );

test( 'an unpaired element carries the proposal problems naming it, never a longer key', () => {
	const proposal = { rows: [], problems: [ 'paint pairing: Root/5#0 fits several measured parts', 'paint pairing: Root/5#01 fits one' ] };
	const u = unpairedDraft( { elements: [ { key: 'Root/5#0' } ] }, proposal, targets );
	assert.deepEqual( u[ 0 ].problems, [ 'paint pairing: Root/5#0 fits several measured parts' ] );
	assert.deepEqual( unpairedStage( null, null, u[ 0 ].problems ).proof.problems, [ 'paint pairing: Root/5#0 fits several measured parts' ] );
} );
