// A selector rule for a part of a loop (lib/fill-loop-copy.mjs::copyClassSlot): the skeleton names a loop's part by the first copy's
// position (`.x__item:nth-of-type(1)`), and a rule built from that path styles the first copy alone. Where the draft draws every copy
// alike and the block paints the property on every copy, the width ladder's scoped @media rule is written on the part's class.
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyClassSlot, paintsEveryCopy } from '../lib/fill-loop-copy.mjs';
import { staticAtEachWidth } from '../lib/loop-body.mjs';
import { widthLadderWrites } from '../lib/fill-width-ladder.mjs';
import { ONE_VALUE_EVERY_WIDTH } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/ticker', title: 'Ticker', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		// One box on every item of the loop (no per-device value the resolver can use: the ladder writes a rule).
		{ block_slug: 'sgs/ticker', attr_name: 'itemPad', attr_type: 'object', css_property: 'padding', css_element: 'item', tier_shape: 'box_only', box_family: 'itemPad', role: 'spacing' },
		{ block_slug: 'sgs/ticker', attr_name: 'oneOffGap', attr_type: 'string', css_property: 'column-gap', css_element: 'item', role: 'spacing' },
	],
} ) );

const ITEM = '.x__item';
const copies = ( part ) => [ 1, 2, 3 ].map( ( n ) => part.replace( '#', String( n ) ) );
const CAL = { settings: {
	itemPad: { slot: `${ ITEM }:nth-of-type(1)`, slots: copies( `${ ITEM }:nth-of-type(#)` ) },
	// A setting that reaches one copy only (the first), as a part drawn once.
	oneOffGap: { slot: `${ ITEM }:nth-of-type(1)`, slots: [ `${ ITEM }:nth-of-type(1)` ] },
} };
const rec = { name: 'sgs/ticker' };
const target = { slot: `${ ITEM }:nth-of-type(1)`, finder: { tpl: 'Root/10#0' } };

// The fact record as the intake keeps it: the item is a body of a loop; its padding is a script value that is `0 20px` on a phone and
// `0` above it, the same in every copy at each width (`same`), or different from copy to copy (`!same`).
const facts = ( { same = true, loop = true } = {} ) => ( { elements: { 'Page/10': {
	template: { membership: { scFor: loop ? [ { key: 'Page/9', list: '{{ items }}', as: 't' } ] : [] }, holes: [ { id: 'style:padding#1', where: 'style:padding' } ] },
	logic: { holes: { 'style:padding#1': {
		375: { v: same ? [ { t: 'string', v: '0 20px' } ] : [ { t: 'string', v: '0 20px' }, { t: 'string', v: '0 4px' } ], n: 3, loop },
		768: { v: [ { t: 'string', v: '0' } ], n: 3, loop },
		1440: { v: [ { t: 'string', v: '0' } ], n: 3, loop },
	} } },
} } } );
const ask = ( over = {} ) => copyClassSlot( { slot: target.slot, target, prop: 'padding-right', rec, cal: CAL, db, facts: facts(), rootComponent: 'Page', ...over } );

test( 'MUST FAIL: a loop copy the draft draws alike in every copy, on a part the block paints on every copy, is written on its class', () => {
	assert.equal( ask(), ITEM );
	assert.equal( ask( { slot: `${ ITEM }:nth-of-type(1) > .x__label`, target: { ...target, slot: `${ ITEM }:nth-of-type(1) > .x__label` } } ), `${ ITEM }:nth-of-type(1) > .x__label`, 'a part no setting of the block paints keeps its position' );
	assert.equal( ask( { slot: `${ ITEM }:nth-of-type(2)` } ), ITEM, 'whichever copy the skeleton named' );
} );

test( 'negative controls: not a loop copy, copies that differ, a part one copy paints, no facts, no position or two positions keep the path', () => {
	assert.equal( ask( { facts: facts( { loop: false } ) } ), target.slot, 'the draft element is no loop body' );
	assert.equal( ask( { facts: facts( { same: false } ) } ), target.slot, 'the copies differ at a width' );
	assert.equal( ask( { facts: null } ), target.slot, 'nothing proves the loop' );
	assert.equal( ask( { prop: 'column-gap' } ), target.slot, 'the setting reaches only the first copy' );
	assert.equal( ask( { prop: 'margin-left' } ), target.slot, 'no setting of the block paints this property' );
	assert.equal( ask( { target: { slot: target.slot, finder: { tpl: 'Root/99#0' } } } ), target.slot, 'a draft element the fact record does not know' );
	assert.equal( ask( { target: { slot: target.slot } } ), target.slot, 'no finder' );
	assert.equal( ask( { slot: '.x__strip' } ), '.x__strip', 'no position' );
	assert.equal( ask( { slot: '.x__row:nth-of-type(1) > .x__item:nth-of-type(2)' } ), '.x__row:nth-of-type(1) > .x__item:nth-of-type(2)', 'two levels keep their own paths' );
} );

test( 'staticAtEachWidth: the value may differ between widths but not between copies; paintsEveryCopy needs more than one position', () => {
	assert.equal( staticAtEachWidth( facts(), 'Page/10', 'padding-right' ), true );
	assert.equal( staticAtEachWidth( facts(), 'Page/10', 'padding' ), true );
	assert.equal( staticAtEachWidth( facts( { same: false } ), 'Page/10', 'padding-right' ), false );
	assert.equal( staticAtEachWidth( facts( { same: false } ), 'Page/10', 'margin-left' ), true, 'another property is no hole of this one' );
	assert.equal( staticAtEachWidth( facts(), 'Page/404', 'padding' ), false );
	assert.equal( paintsEveryCopy( CAL, db, 'sgs/ticker', 'padding-left', null, target.slot ), true );
	assert.equal( paintsEveryCopy( CAL, db, 'sgs/ticker', 'column-gap', null, target.slot ), false );
	assert.equal( paintsEveryCopy( null, db, 'sgs/ticker', 'padding-left', null, target.slot ), false );
} );

// The ladder: a padding side the draft states `20px` on a phone and `0` above, which no per-device value of the block holds.
function world( { slot = target.slot } = {} ) {
	const flat = [ { name: 'sgs/ticker', attributes: {}, ref: 'n0' } ];
	const rect = { x: 0, y: 0, w: 100, h: 20 };
	const nodes = [ { index: 0, name: 'sgs/ticker', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' }, { id: `0:${ slot }`, index: 0, slot, finder: target.finder } ] } ];
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { rect, layoutDisplay: 'flex', styles: { display: 'flex' } }, [ `0:${ slot }` ]: { rect, layoutDisplay: 'flex', styles: { display: 'flex' } } } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
const resolver = () => ( { status: 'gap', gap: 'shape', code: ONE_VALUE_EVERY_WIDTH, detail: 'padding holds one value for every width' } );
const row = ( slot = target.slot ) => ( { node: 'n0', block: 'sgs/ticker', slot, property: 'padding-right', value: '{"375":"20px","768":"0px","1440":"0px"}', code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: padding holds one value for every width' } );
const ladder = ( w, o = {} ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: [ row( o.slot ) ], calFor: () => CAL, scope: 'header', resolver, date: '2026-11-21', facts: facts(), rootComponent: 'Page', ...o } );
const css = ( w ) => w.flat[ 0 ].attributes.sgsCustomCss;

test( 'MUST FAIL: the width ladder writes a loop part\'s phone padding on every copy\'s class, not on the first copy', () => {
	const w = world();
	const r = ladder( w );
	assert.deepEqual( r.unmapped, [] );
	assert.match( css( w ), /@media \(max-width: 767px\) \{ & \.x__item \{ padding-right: 20px; \} \}/ );
	assert.doesNotMatch( css( w ), /nth-of-type/ );
	assert.match( r.notes.join( ' ' ), /a rule on every copy \(\.x__item\)/ );
} );

test( 'negative control: a part that is not a loop copy keeps its own selector', () => {
	const w = world();
	const r = ladder( w, { facts: facts( { loop: false } ) } );
	assert.deepEqual( r.unmapped, [] );
	assert.match( css( w ), /& \.x__item:nth-of-type\(1\) \{ padding-right: 20px; \}/ );
	const none = world();
	ladder( none, { facts: null } );
	assert.match( css( none ), /nth-of-type\(1\)/ );
} );
