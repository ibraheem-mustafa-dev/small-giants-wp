// The clone difference ledger's second pass: each property compared on the part the block paints it on
// (lib/ledger-paint.mjs), one row per fact (lib/ledger-fold.mjs), an aria-label is not words and hover rows
// (lib/ledger-page.mjs, lib/ledger-hover.mjs, in Chromium on a page of its own), the hover state in the stage judge, the
// inventory's age (lib/ledger-records.mjs) and the run ledger's row shape (lib/ledger-row.mjs). No site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { paintSlots, paintedRead } from '../lib/ledger-paint.mjs';
import { oneRowPerFact } from '../lib/ledger-fold.mjs';
import { pairDiffs } from '../lib/ledger-diff.mjs';
import { readBatchInPage } from '../lib/ledger-page.mjs';
import { hoverPlan, readHover, hoverDiffs } from '../lib/ledger-hover.mjs';
import { stageOf, fillIndex, propsFor } from '../lib/ledger-stage.mjs';
import { builtAttributes, applyIndex, ledgerTargets } from '../lib/ledger-pairs.mjs';
import { markFollows } from '../lib/ledger-follow.mjs';
import { inventoryHolds } from '../lib/ledger-records.mjs';
import { asRunRow } from '../lib/ledger-row.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { collectPair, resolveFinder, PSEUDO_PROPS } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { sameValue } from '../../parity/lib/compare.mjs';

// A container that paints its padding on its inner element; its gap on the root and the inner element.
const CONTAINER = { settings: {
	padding: { slot: '.sgs-container__inner', slots: [ '.sgs-container__inner' ], property: 'padding', state: null },
	gap: { slot: '', slots: [ '', '.sgs-container__inner' ], property: 'gap', state: null },
	textColour: { slot: '.sgs-container__inner', slots: [ '.sgs-container__inner' ], property: 'color', state: null },
	maxWidth: { slot: '', slots: [ '' ], property: 'max-width', state: null },
	backgroundColourHover: { slot: '', slots: [ '' ], property: 'background-color', state: 'hover' },
	overlayHover: { slot: '::after', slots: [ '::after' ], property: 'opacity', state: 'hover' },
} };
const padWrite = ( prop, after = { mobile: { top: '56px' } } ) => ( { node: 'cr-ref-s-0', slot: '', prop, attr: 'padding', after, widths: [ 375 ], how: 'width-ladder' } );
const read = ( styles, box = { x: 0, y: 0, w: 375, h: 300 } ) => ( { found: true, shown: true, snap: { tag: 'div', text: 'Words', box, styles: { position: 'static', ...styles }, pseudo: {}, motion: { animation: 'none', transition: 'none' }, keyframes: 'none', loops: [], textFrom: 'own', layoutDisplay: 'block', layoutChildren: 1 } } );

test( 'paint part: a write is compared on the part its setting paints (the container\'s padding on its inner element)', () => {
	const moves = paintSlots( { slot: '' }, [ padWrite( 'padding-top' ), padWrite( 'padding-left' ) ], CONTAINER );
	assert.deepEqual( moves.get( 'padding-top' ), { slot: '.sgs-container__inner', attr: 'padding', from: 'write' } );
	assert.equal( moves.get( 'padding-left' ).slot, '.sgs-container__inner' );
	// Negative controls: a setting that paints the root keeps the root; colour and typography are read where the words paint.
	const rooted = { settings: { padding: { ...CONTAINER.settings.padding, slot: '', slots: [ '' ] } } };
	assert.equal( paintSlots( { slot: '' }, [ padWrite( 'padding-top' ) ], rooted ).has( 'padding-top' ), false );
	assert.equal( paintSlots( { slot: '' }, [ { node: 'cr-ref-s-0', slot: '', prop: 'color', attr: 'textColour', after: 'ink' } ], CONTAINER ).has( 'color' ), false );
	// A hover write never moves the rest look's property.
	assert.equal( paintSlots( { slot: '.x' }, [ { ...padWrite( 'padding-top' ), slot: '.x', state: 'hover' } ], CONTAINER ).has( 'padding-top' ), false );
} );

test( 'paint part: a write Fill read from the root and wrote to a part that is no target of its own is the root\'s (the icon\'s shape)', () => {
	const ICON = { settings: { backgroundColour: { slot: '.sgs-icon__shape', slots: [ '.sgs-icon__shape', '.sgs-icon__link > .sgs-icon__shape' ], property: 'background-color', state: null } } };
	const w = { node: 'cr-ref-s-0', slot: '.sgs-icon__shape', prop: 'background-color', attr: 'backgroundColour', after: '#fff' };
	assert.deepEqual( paintSlots( { slot: '' }, [ w ], ICON ).get( 'background-color' ), { slot: '.sgs-icon__shape', attr: 'backgroundColour', from: 'write' } );
	// Negative controls: the part is a target of its own (its draft element is compared there), and a slot target never
	// takes another part's write.
	assert.equal( paintSlots( { slot: '' }, [ w ], ICON, { targetSlots: new Set( [ '', '.sgs-icon__shape' ] ) } ).size, 0 );
	assert.equal( paintSlots( { slot: '.sgs-icon__shape' }, [ w ], ICON ).size, 0 );
	// The shape paints the circle, so the shape's box is the circle's: the root spanning its column makes no size row.
	const moves = paintSlots( { slot: '' }, [ w ], ICON );
	const shape = read( { 'background-color': 'rgb(255, 255, 255)' }, { x: 83, y: 0, w: 36, h: 36 } );
	const painted = paintedRead( read( { 'background-color': 'rgba(0, 0, 0, 0)' }, { x: 21, y: 0, w: 161, h: 36 } ), new Map( [ [ '.sgs-icon__shape', shape ] ] ), moves );
	assert.equal( painted.boxOn, '.sgs-icon__shape' );
	assert.deepEqual( pairDiffs( read( { 'background-color': 'rgb(255, 255, 255)' }, { x: 83, y: 0, w: 36, h: 36 } ), painted.read ), [] );
	// Negative control: a moved padding (no ground) keeps the root's box.
	assert.equal( paintedRead( read( {} ), new Map( [ [ '.sgs-container__inner', read( {}, { x: 9, y: 9, w: 9, h: 9 } ) ] ] ), paintSlots( { slot: '' }, [ padWrite( 'padding-top' ) ], CONTAINER ) ).boxOn, null );
	// A write read on one part (readSlot) and written to another is compared where it is written.
	assert.equal( paintSlots( { slot: '.q' }, [ { ...w, readSlot: '.q', slot: '.n', attr: 'x' } ], null ).get( 'background-color' )?.slot, '.n' );
} );

test( 'paint part: with no write, a root property goes to the one part whose default paint holds it (negative: no paint, a setting on the root)', () => {
	const paint = { elements: { '': { 375: { 'padding-top': '0px', 'row-gap': '0px' } }, '.sgs-container__inner': { 375: { 'padding-top': '24px', 'row-gap': '8px' } } } };
	const moves = paintSlots( { slot: '' }, [], CONTAINER, { paint } );
	assert.deepEqual( moves.get( 'padding-top' ), { slot: '.sgs-container__inner', attr: 'padding', from: 'default paint' } );
	assert.equal( moves.has( 'row-gap' ), false );
	assert.equal( paintSlots( { slot: '' }, [], CONTAINER ).size, 0 );
	const same = { elements: { '': { 375: { 'padding-top': '0px' } }, '.sgs-container__inner': { 375: { 'padding-top': '0px' } } } };
	assert.equal( paintSlots( { slot: '' }, [], CONTAINER, { paint: same } ).size, 0 );
	assert.equal( paintSlots( { slot: '.sgs-container__inner > p' }, [], CONTAINER, { paint } ).size, 0 );
} );

test( 'an alignment keyword and its flex form place alike (negative control: a reversed flex direction)', () => {
	const flex = ( styles ) => { const r = read( { display: 'flex', ...styles } ); return { ...r, snap: { ...r.snap, layoutDisplay: 'flex', layoutChildren: 2 } }; };
	assert.deepEqual( pairDiffs( flex( { 'align-items': 'flex-end' } ), flex( { 'align-items': 'end' } ) ), [] );
	assert.deepEqual( pairDiffs( flex( { 'align-items': 'flex-end' } ), flex( { 'align-items': 'center' } ) ).map( ( r ) => r.key ), [ 'align-items' ] );
	assert.deepEqual( pairDiffs( flex( { 'align-items': 'flex-end', 'flex-direction': 'row-reverse' } ), flex( { 'align-items': 'end', 'flex-direction': 'row-reverse' } ) ).map( ( r ) => r.key ), [ 'align-items' ] );
} );

test( 'the container case: the draft\'s padding on the live inner element makes no row; the hero layer\'s box still does', () => {
	const draft = read( { 'padding-top': '56px', 'padding-right': '20px' } );
	const live = read( { 'padding-top': '0px', 'padding-right': '0px' } );
	const inner = read( { 'padding-top': '56px', 'padding-right': '20px' } );
	assert.deepEqual( pairDiffs( draft, live ).map( ( r ) => r.key ), [ 'padding-top', 'padding-right' ] );
	const moves = paintSlots( { slot: '' }, [ padWrite( 'padding-top' ), padWrite( 'padding-right' ) ], CONTAINER );
	const painted = paintedRead( live, new Map( [ [ '.sgs-container__inner', inner ] ] ), moves );
	assert.deepEqual( pairDiffs( draft, painted.read ), [] );
	assert.equal( painted.paintedOn.get( 'padding-top' ), '.sgs-container__inner' );
	// A part the live block does not print keeps the paired element's value and is named.
	const none = paintedRead( live, new Map(), moves );
	assert.deepEqual( none.missing, [ '.sgs-container__inner' ] );
	assert.deepEqual( pairDiffs( draft, none.read ).map( ( r ) => r.key ), [ 'padding-top', 'padding-right' ] );
	// The seeded true case: a layer 756 high in the draft and 484 live stays a row.
	const layer = { settings: { layerHeight: { slot: '', slots: [ '' ], property: 'height', state: null } } };
	const lm = paintSlots( { slot: '' }, [ { node: 'cr-ref-s-2', slot: '', prop: 'height', attr: 'layerHeight', after: { desktop: '100%' } } ], layer );
	assert.deepEqual( pairDiffs( read( {}, { x: 0, y: 0, w: 1440, h: 756 } ), paintedRead( read( {}, { x: 0, y: 0, w: 1440, h: 484 } ), new Map(), lm ).read ).map( ( r ) => [ r.key, r.draft, r.live ] ), [ [ 'h', 756, 484 ] ] );
} );

test( 'one row per fact: a shorthand and its longhands, a computed size and the box, sides of one family with one stage', () => {
	const r = ( key, stage = 'unmapped', extra = {} ) => ( { id: '1:', width: 375, key, draft: 'a', live: 'b', stage, kind: 'style', ...extra } );
	const radius = oneRowPerFact( [ r( 'border-radius' ), r( 'border-top-left-radius' ), r( 'border-top-right-radius' ), r( 'border-bottom-right-radius' ), r( 'border-bottom-left-radius' ) ] );
	assert.deepEqual( radius.rows.map( ( x ) => [ x.key, x.covers.length ] ), [ [ 'border-radius', 4 ] ] );
	assert.deepEqual( oneRowPerFact( [ r( 'transition' ), r( 'transition-duration', 'judged-equal' ) ] ).rows.map( ( x ) => x.key ), [ 'transition' ] );
	assert.deepEqual( oneRowPerFact( [ r( 'w' ), r( 'width' ) ] ).rows.map( ( x ) => [ x.key, x.covers ] ), [ [ 'w', [ 'width' ] ] ] );
	const sides = oneRowPerFact( [ r( 'padding-top', 'block-render', { draft: '56px', live: '0px' } ), r( 'padding-left', 'block-render', { draft: '20px', live: '0px' } ) ] );
	assert.deepEqual( sides.rows.map( ( x ) => [ x.key, x.draft, x.live ] ), [ [ 'padding', 'top 56px, left 20px', 'top 0px, left 0px' ] ] );
	// Negative controls: sides with different stages, another width, another element or a hover row stay apart.
	assert.equal( oneRowPerFact( [ r( 'padding-top', 'block-render' ), r( 'padding-left', 'unmapped' ) ] ).rows.length, 2 );
	assert.equal( oneRowPerFact( [ r( 'padding-top' ), { ...r( 'padding-left' ), width: 768 } ] ).rows.length, 2 );
	assert.equal( oneRowPerFact( [ r( 'border-radius' ), { ...r( 'border-top-left-radius' ), id: '2:' } ] ).rows.length, 2 );
	assert.equal( oneRowPerFact( [ r( 'transition' ), r( 'transition-duration', 'unmapped', { state: 'hover' } ) ] ).rows.length, 2 );
	assert.equal( oneRowPerFact( [ r( 'color' ), r( 'font-size' ) ] ).rows.length, 2 );
} );

test( 'the stage judge reads the difference\'s state: a hover write answers a hover row and never a rest row', () => {
	const skeleton = [ { name: 'sgs/button', attributes: {}, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [] } ];
	const filled = [ { name: 'sgs/button', attributes: { className: 'cr-ref-s-0', colourBackgroundHover: 'ink' }, innerBlocks: [] } ];
	const report = { writes: [ { node: 'cr-ref-s-0', slot: '', prop: 'background-color', state: 'hover', attr: 'colourBackgroundHover', after: 'ink', widths: [] } ] };
	const ctx = { fill: fillIndex( report ), built: builtAttributes( filled, 's' ), apply: applyIndex( null ), inventory: new Map(), fillProps: new Set( [ 'background-color' ] ), live: { selector: '.cr-ref-s-0' } };
	const [ t ] = ledgerTargets( skeleton, 's' );
	const diff = { key: 'background-color', kind: 'style', draft: 'rgb(0, 0, 0)', live: 'rgb(9, 9, 9)', width: 1440 };
	assert.equal( stageOf( { ...diff, state: 'hover' }, t, ctx ).stage, 'block-render' );
	assert.equal( stageOf( diff, t, ctx ).stage, 'not-read-by-fill' );
	// A shorthand row is answered by its longhands' records, whether and how long anything moves first.
	assert.deepEqual( propsFor( 'transition' ).slice( 0, 3 ), [ 'transition', 'transition-property', 'transition-duration' ] );
	assert.ok( propsFor( 'border-radius' ).includes( 'border-top-left-radius' ) );
	assert.deepEqual( propsFor( 'color' ), [ 'color' ] );
	const settled = { settled: [ { node: 'cr-ref-s-0', slot: '', property: 'transition-delay', value: '0s', reason: 'not-painted', detail: 'delay' }, { node: 'cr-ref-s-0', slot: '', property: 'transition-duration', value: '0s', reason: 'not-painted', detail: 'duration' } ] };
	assert.equal( stageOf( { key: 'transition', kind: 'style', draft: 'none', live: 'color 0.3s', width: 1440 }, t, { ...ctx, fill: fillIndex( settled ) } ).proof.baseline, 'duration' );
} );

test( 'a box row does not follow an inner element taken out of flow (negative control: an in-flow inner element)', () => {
	const skeleton = [ { name: 'sgs/container', attributes: {}, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [ { name: 'sgs/decorative-image', attributes: {}, draftRef: { tpl: 'Root/2#0' }, innerBlocks: [] } ] } ];
	const targets = ledgerTargets( skeleton, 's' );
	const r = ( id, key, stage, extra = {} ) => ( { id, ref: `cr-ref-s-${ id[ 0 ] }`, key, width: 375, stage, proof: {}, ...extra } );
	const out = markFollows( [ r( '0:', 'h', 'judged-equal' ), r( '1:', 'h', 'block-render', { outOfFlow: true } ) ], targets );
	assert.equal( out[ 0 ].follows, undefined );
	assert.equal( markFollows( [ r( '0:', 'h', 'judged-equal' ), r( '1:', 'h', 'block-render' ) ], targets )[ 0 ].follows?.id, '1:' );
} );

test( 'hover plan: the targets a hover setting paints, a pseudo layer\'s under its name (negative control: a block with none)', () => {
	const targets = [ { block: 'sgs/container', slot: '', draftFinder: { tpl: 'Root/1#0' } }, { block: 'sgs/container', slot: '.sgs-container__inner', draftFinder: { tpl: 'Root/2#0' } }, { block: 'sgs/text', slot: '', draftFinder: { tpl: 'Root/3#0' } } ];
	const plan = hoverPlan( targets, ( b ) => ( 'sgs/container' === b ? CONTAINER : { settings: {} } ) );
	assert.deepEqual( [ ...plan.keys() ], [ 0 ] );
	assert.deepEqual( plan.get( 0 ), { props: [ 'background-color' ], pseudo: { '::after': [ 'opacity' ] } } );
	const d = { rest: { 'background-color': 'rgb(255, 255, 255)' }, hover: { 'background-color': 'rgb(0, 0, 0)' } };
	const l = { rest: { 'background-color': 'rgb(255, 255, 255)' } };
	const same = ( p, a, b ) => sameValue( p, String( a ), String( b ), 0.5 );
	assert.deepEqual( hoverDiffs( d, l, same ).map( ( x ) => [ x.key, x.state, x.draft, x.live ] ), [ [ 'background-color', 'hover', 'rgb(0, 0, 0)', 'rgb(255, 255, 255)' ] ] );
	// A difference already there at rest and unchanged under the mouse is the rest row's, not a hover row.
	assert.deepEqual( hoverDiffs( { rest: { color: 'rgb(1, 1, 1)' } }, { rest: { color: 'rgb(90, 1, 1)' } }, same ), [] );
} );

test( 'in Chromium: an aria-label is not words, and a :hover rule is read under the real mouse', async () => {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
		await page.setContent( '<style>#b{background:#fff;transition:background 3s}#b:hover{background:#000}#c{background:#fff}</style><nav id="a" aria-label="first half"><span></span></nav><a id="w" aria-label="Basket">Basket</a><div id="b">Hover me</div><div id="c">Still</div>' );
		const items = [ { n: 0, finder: '#a' }, { n: 1, finder: '#w' }, { n: 2, finder: '#b' }, { n: 3, finder: '#c' } ];
		const out = await page.evaluate( readBatchInPage, [ items, collectPair.toString(), resolveFinder.toString(), PAINT_SRC, [ 'color', 'background-color' ], PSEUDO_PROPS ] );
		assert.equal( out[ 0 ].snap.text, '' );
		assert.equal( out[ 0 ].snap.ariaLabel, 'first half' );
		assert.equal( out[ 1 ].snap.text, 'Basket' );
		const hover = await readHover( page, [ { n: 2, props: [ 'background-color' ] }, { n: 3, props: [ 'background-color' ] } ] );
		assert.equal( hover[ 2 ].rest[ 'background-color' ], 'rgb(255, 255, 255)' );
		assert.equal( hover[ 2 ].hover[ 'background-color' ], 'rgb(0, 0, 0)' );
		assert.equal( hover[ 3 ].hover, undefined );
	} finally {
		await browser.close();
	}
} );

test( 'the inventory\'s age: one with no computed values, or none at a width, is too old (negative control: a current one)', () => {
	const old = inventoryHolds( { generated: '2026-11-20', elements: [ { key: 'a' } ] }, [ 'color' ], [ 375 ] );
	assert.equal( old.tooOld, true );
	assert.match( old.why, /no element holds computed values/ );
	assert.equal( inventoryHolds( { elements: [ { key: 'a', resolved: { 768: { color: 'x' } } } ] }, [ 'color' ], [ 375, 768 ] ).tooOld, true );
	const now = inventoryHolds( { elements: [ { key: 'a', resolved: { 375: { color: 'x' } } } ] }, [ 'color', 'opacity' ], [ 375 ] );
	assert.equal( now.tooOld, false );
	assert.deepEqual( now.lacks, [ 'opacity' ] );
} );

test( 'the run ledger\'s row shape: the pipeline stage, the outcome and the record it points to', () => {
	const row = { id: '0:', ref: 'cr-ref-s-0', block: 'sgs/container', slot: '', draftKey: 'Root/1#0', key: 'padding', widths: [ 375 ], draft: 'top 56px', live: 'top 0px', paintedOn: '.sgs-container__inner', stage: 'block-render', proof: { record: 'fill-report.writes + built tree', rows: [ { attr: 'padding', after: { mobile: { top: '56px' } } } ], live: { selector: '.cr-ref-s-0 .sgs-container__inner', box: { h: 10 } } } };
	const run = asRunRow( row, { surface: 'home', fill: 'run1' } );
	assert.equal( run.stage, 'render' );
	assert.equal( run.verdict, 'block-render' );
	assert.deepEqual( run.outcome, { kind: 'written', setting: 'padding', value: { mobile: { top: '56px' } } } );
	assert.equal( run.record.file, 'qa/fill/home/run1/fill-report.json' );
	assert.deepEqual( run.live, { selector: '.cr-ref-s-0 .sgs-container__inner', paintedOn: '.sgs-container__inner', value: 'top 0px', box: { h: 10 } } );
	assert.equal( run.property, 'padding' );
	assert.equal( run.state, 'rest' );
	const dropped = asRunRow( { ...row, paintedOn: undefined, stage: 'unmapped', proof: { record: 'fill-report.unmapped', reason: 'no-setting: x' } }, { surface: 'home', fill: 'run1' } );
	assert.deepEqual( [ dropped.stage, dropped.outcome.kind, dropped.outcome.reason ], [ 'fill', 'dropped', 'no-setting: x' ] );
} );
