// The wrapper pass of the pair refresh (lib/pair-wrappers.mjs): a block with no text of its own is paired by the text of its blocks
// and by its box, shared with its text block as a part, or reported structural. Run: node --test tests/pair-wrappers.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { refreshPairs } from '../lib/refresh-pairs.mjs';
import { pairsReport } from '../lib/apply-targets.mjs';

const box = ( x, w, h ) => ( { 1440: { x, y: 0, w, h }, 375: { x: 0, y: 0, w: 0, h: 0 } } );
const el = ( n, tag, words, allText, parentKey, b, extra = {} ) => ( { key: `k/${ n }`, parentKey, depth: 1, tag, words, allText, box: b, visible: { 1440: true }, ...extra } );
const live = ( x, w, h ) => ( { 1440: { x, w, h } } );

// A list of two rows. Each row is a div holding a number span and a bare text node; a row's blocks are a container, a text for
// the number and a text for the label.
const elements = [
	el( 'root', 'div', '', 'x', null, box( 0, 1440, 400 ) ),
	el( 'list', 'div', '', '01First02Second', 'k/root', box( 100, 500, 80 ) ),
	el( 'row1', 'div', 'First', '01First', 'k/list', box( 100, 500, 38 ) ),
	el( 'n1', 'span', '01', '01', 'k/row1', box( 116, 15, 21 ) ),
	el( 'row2', 'div', 'Second', '02Second', 'k/list', box( 100, 500, 38 ), { box: { 1440: { x: 100, y: 40, w: 500, h: 38 } } } ),
	el( 'n2', 'span', '02', '02', 'k/row2', box( 116, 15, 21 ) ),
	el( 'icon', 'svg', '', '', 'k/root', box( 700, 24, 24 ) ),
	el( 'cta', 'div', '', 'Go nowGo later', 'k/root', box( 800, 431, 130 ) ),
	el( 'b1', 'a', 'Go now', 'Go now', 'k/cta', box( 800, 200, 56 ) ),
	el( 'b2', 'a', 'Go later', 'Go later', 'k/cta', box( 1010, 200, 56 ) ),
];
const blocks = [
	{ ref: 'r0', block: 'sgs/container', attrs: {}, parent: null },
	{ ref: 'list', block: 'sgs/container', attrs: {}, parent: 'r0' },
	{ ref: 'row1', block: 'sgs/container', attrs: {}, parent: 'list' },
	{ ref: 'num1', block: 'sgs/text', attrs: { text: '01' }, parent: 'row1' },
	{ ref: 'lab1', block: 'sgs/text', attrs: { text: 'First' }, parent: 'row1' },
	{ ref: 'row2', block: 'sgs/container', attrs: {}, parent: 'list' },
	{ ref: 'num2', block: 'sgs/text', attrs: { text: '02' }, parent: 'row2' },
	{ ref: 'lab2', block: 'sgs/text', attrs: { text: 'Second' }, parent: 'row2' },
	{ ref: 'ico', block: 'sgs/icon', attrs: { iconSource: 'brand' }, parent: 'r0' },
	{ ref: 'grp', block: 'sgs/multi-button', attrs: {}, parent: 'r0' },
	{ ref: 'bt1', block: 'sgs/button', attrs: { label: 'Go now' }, parent: 'grp' },
	{ ref: 'bt2', block: 'sgs/button', attrs: { label: 'Go later' }, parent: 'grp' },
	{ ref: 'wrap', block: 'sgs/container', attrs: {}, parent: 'r0' },
];
const boxes = {
	r0: live( 0, 1440, 400 ), list: live( 100, 500, 80 ), row1: live( 101, 499, 38.5 ), num1: live( 116, 15, 22 ), lab1: live( 140, 94, 22 ),
	row2: live( 100, 500, 38 ), num2: live( 116, 15, 22 ), lab2: live( 140, 94, 22 ), ico: live( 700, 24, 24 ),
	// The live button group is 17px narrower than the draft's wrapper: the text decides, the box cannot.
	grp: live( 800, 414, 126 ), bt1: live( 800, 200, 56 ), bt2: live( 1010, 200, 56 ), wrap: live( 20, 77, 31 ),
};

test( 'a container takes the row element whose text and box it has, and its text block shares the element as a part', () => {
	const { pairs, structural } = refreshPairs( { blocks, elements, boxes } );
	assert.equal( pairs.row1.tpl, 'k/row1' );
	assert.equal( pairs.row2.tpl, 'k/row2' );
	assert.equal( pairs.lab1.tpl, 'k/row1', 'the label text is the row element\'s own text node' );
	assert.equal( pairs.lab1.part, 'text' );
	assert.equal( pairs.row1.part, undefined );
	assert.equal( pairs.num1.tpl, 'k/n1' );
	assert.equal( pairs.num1.part, undefined );
} );

test( 'a button group takes the wrapper whose whole text its buttons show, though the live box differs by more than 2px', () => {
	const { pairs } = refreshPairs( { blocks, elements, boxes, old: { grp: 'k/b1' } } );
	assert.equal( pairs.grp.tpl, 'k/cta' );
	assert.equal( pairs.bt1.tpl, 'k/b1' );
	assert.equal( pairs.bt2.tpl, 'k/b2' );
} );

test( 'an icon takes the one element with its box inside its parent\'s element', () => {
	assert.equal( refreshPairs( { blocks, elements, boxes } ).pairs.ico.tpl, 'k/icon' );
} );

test( 'negative controls: a box off by more than 2px is not a match, and a wrapper nothing draws is structural, never paired', () => {
	const off = { ...boxes, ico: live( 700, 24, 28 ) };
	const r = refreshPairs( { blocks, elements, boxes: off } );
	assert.equal( r.pairs.ico, undefined );
	assert.match( r.structural.ico, /structural: no draft element .* has its box/ );
	assert.equal( r.pairs.wrap, undefined );
	assert.match( r.structural.wrap, /structural/ );
	// No live box and no text to go on: unpaired with that reason, not structural and not a guess.
	const hidden = refreshPairs( { blocks, elements, boxes: { ...boxes, wrap: undefined } } );
	assert.match( hidden.unpaired.wrap, /nothing to measure/ );
	assert.equal( hidden.structural.wrap, undefined );
	// Without boxes the wrapper pass still pairs by text.
	assert.equal( refreshPairs( { blocks, elements } ).pairs.grp.tpl, 'k/cta' );
} );

test( 'negative control: two draft elements with the same box inside its parent are not chosen between', () => {
	const twins = [ ...elements, el( 'icon2', 'svg', '', '', 'k/root', box( 700, 24, 24 ) ) ];
	const r = refreshPairs( { blocks, elements: twins, boxes } );
	assert.equal( r.pairs.ico, undefined );
	assert.match( r.unpaired.ico, /2 draft elements .* none is chosen by guess/ );
} );

test( 'a text block whose box is the element box keeps it: the inner wrapper with the same box is structural, the outer one takes the free element', () => {
	const els = [ el( 'root', 'div', '', 'Hi', null, box( 0, 600, 100 ) ), el( 'p', 'p', 'Hi', 'Hi', 'k/root', box( 0, 600, 100 ) ) ];
	const bl = [ { ref: 'outer', block: 'sgs/container', attrs: {}, parent: null }, { ref: 'inner', block: 'sgs/container', attrs: {}, parent: 'outer' }, { ref: 't', block: 'sgs/text', attrs: { text: 'Hi' }, parent: 'inner' } ];
	const bx = { outer: live( 0, 600, 100 ), inner: live( 0, 600, 100 ), t: live( 0, 600, 100 ) };
	const r = refreshPairs( { blocks: bl, elements: els, boxes: bx } );
	assert.equal( r.pairs.outer.tpl, 'k/root' );
	assert.equal( r.pairs.t.tpl, 'k/p' );
	assert.match( r.structural.inner, /structural/ );
} );

test( 'a block only a draft state shows is paired by its text among the state\'s elements, and the structural list reaches the applier as refused rows', () => {
	const state = { component: 'F', keys: { step: 1 } };
	const els = [ el( 'root', 'div', '', 'x', null, box( 0, 600, 100 ) ), el( 'step', 'div', '', 'Step title', 'k/root', box( 0, 1, 1 ), { reveal: state } ), el( 'h', 'h2', 'Step title', 'Step title', 'k/step', box( 0, 1, 1 ), { reveal: state } ) ];
	const bl = [ { ref: 's', block: 'sgs/form-step', attrs: {}, parent: null }, { ref: 'h', block: 'sgs/heading', attrs: { content: 'Step title' }, parent: 's' } ];
	const r = refreshPairs( { blocks: bl, elements: els, boxes: {} } );
	assert.equal( r.pairs.s.tpl, 'k/step' );
	assert.deepEqual( r.pairs.s.reveal, state );
	assert.equal( r.pairs.h.tpl, 'k/h', 'the heading keeps its own element; the step takes the free wrapper with the same text' );
	assert.equal( r.pairs.h.part, undefined );
	const refused = pairsReport( { pairs: [] }, {}, { pairs: {}, unpaired: {}, structural: { x: 'structural: the draft draws nothing for it' } } );
	assert.deepEqual( refused.refused, [ { ref: 'x', why: 'structural: the draft draws nothing for it', structural: true } ] );
} );

test( 'a container whose old pair has its box keeps it, and its deeper text block shares the element; a text block with the element\'s own box does not', () => {
	const old = { row1: 'k/row1', row2: 'k/row2' };
	const { pairs } = refreshPairs( { blocks, elements, boxes, old } );
	assert.equal( pairs.row1.tpl, 'k/row1' );
	assert.match( pairs.row1.how, /own box/ );
	assert.equal( pairs.lab1.tpl, 'k/row1' );
	assert.equal( pairs.lab1.part, 'text' );
	// Negative control: the label's box is the row's own: the label is not a deeper node, so it cannot take the element the container holds.
	const same = refreshPairs( { blocks, elements, boxes: { ...boxes, lab1: live( 100, 500, 38 ) }, old } );
	assert.equal( same.pairs.lab1, undefined );
	assert.match( same.unpaired.lab1, /no unclaimed draft text/ );
	// Negative control: an old pair whose element is not the block's box is not confirmed by it.
	assert.equal( refreshPairs( { blocks, elements, boxes, old: { ico: 'k/root' } } ).pairs.ico.tpl, 'k/icon' );
} );

test( 'a block whose old pair is kept is one the box or the text still confirms: a structural verdict never removes it', () => {
	const off = { ...boxes, ico: live( 700, 24, 40 ) };
	const r = refreshPairs( { blocks, elements, boxes: off, old: { ico: 'k/icon' } } );
	assert.equal( r.pairs.ico.tpl, 'k/icon', 'the old pair stays when no rule finds a better element' );
	assert.equal( r.structural.ico, undefined );
} );

test( 'a block hidden in the opening state whose blocks\' text no element shows is structural once the live page was measured, and unpaired when it was not', () => {
	const step = [ { ref: 'st', block: 'sgs/form-step', attrs: {}, parent: null }, { ref: 'sh', block: 'sgs/heading', attrs: { content: 'Nowhere in the draft' }, parent: 'st' } ];
	const measured = refreshPairs( { blocks: step, elements, boxes } );
	assert.match( measured.structural.st, /structural: it is hidden at 1440 and 375/ );
	// Negative control: with no live measurement there is no verdict.
	const unmeasured = refreshPairs( { blocks: step, elements } );
	assert.equal( unmeasured.structural.st, undefined );
	assert.match( unmeasured.unpaired.st, /no draft element of its own/ );
} );

test( 'a checkbox with one option shows that option\'s label, so it pairs by that text; two options are not one text', () => {
	const one = { ref: 'ck', block: 'sgs/form-field-checkbox', attrs: { options: [ { value: 'v', label: 'Go now' } ] }, parent: null };
	assert.equal( refreshPairs( { blocks: [ one ], elements, boxes } ).pairs.ck?.tpl, 'k/b1' );
	const two = { ...one, attrs: { options: [ { label: 'Go now' }, { label: 'Go later' } ] } };
	assert.match( refreshPairs( { blocks: [ two ], elements, boxes } ).unpaired.ck, /no text to pair by/ );
} );
