// The gift choice beside the buy box (Spec 48 FR-48-96; lib/template-piece-gift.mjs): a tick box in the buy box whose
// key makes the add button send the note of a textarea it reveals becomes one sgs/gift-order after the sgs/buybox, with
// the draft's label, help line, placeholder and length. Read from the logic, never the words. Tests marked MUST FAIL fail
// without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place } from '../lib/template-piece-gift.mjs';
import { lintSkeleton } from '../lint.mjs';
import { openDb } from '../lib/db.mjs';

const PIECE = { id: 'gift', block: 'sgs/gift-order', required: false, kind: 'gift', find: { surface: 'buybox', after: 'sgs/buybox', settings: { label: 'basketLabel', help: 'basketHelp', placeholder: 'messagePlaceholder', limit: 'messageLimit' } } };
// Template elements in stamp order: 0 the buy box, 1-2 a size choice, 3-10 the gift panel (4 label, 5 tick, 6-8 words,
// 9 sc-if, 10 note), 11-14 a newsletter tick, 15-16 the add button.
const TEMPLATE = `<x-dc>
<div>
  <div><button onClick="{{ pickSize }}">S</button></div>
  <div>
    <label><input type="checkbox" checked="{{ giftOn }}" onChange="{{ toggleGift }}"><span><span>Send as a gift</span><span>Add a note.</span></span></label>
    <sc-if value="{{ giftOn }}"><textarea value="{{ msg }}" onChange="{{ onMsg }}" placeholder="Congrats!"></textarea></sc-if>
  </div>
  <div><label><input type="checkbox" checked="{{ news }}" onChange="{{ toggleNews }}"><span>Email me news</span></label></div>
  <div><button onClick="{{ add }}">Add</button></div>
</div>
</x-dc>`;
const logic = ( add ) => `<script type="text/x-dc" data-dc-script>
class P {
  renderVals() {
    const S = this.state;
    return {
      toggleGift: e => this.setState({ giftOn: e.target.checked }),
      toggleNews: e => this.setState({ news: e.target.checked }),
      onMsg: e => this.setState({ msg: e.target.value.slice(0, 120) }),
      pickSize: () => this.setState({ size: 1 }),
      add: () => { ${ add } },
    };
  }
}
</script>`;
const ADD = "window.MM.cart.add({ id: 'a', qty: 1 }); if (S.giftOn) window.MM.cart.setGift({ on: true, message: S.msg }); if (S.news) window.MM.subscribe({ list: 'news' });";
const el = ( tpl, parent, tag, own = '' ) => ( { key: `Root/${ tpl }#0`, parentKey: null === parent ? 'Root/-1#0' : `Root/${ parent }#0`, tag, template: 'Root', tpl, srcOwnText: own, words: own, snippet: `<${ tag }>`, visible: { 1440: true }, membership: [], position: { 1440: 'static' } } );
const INVENTORY = { elements: [
	el( 0, null, 'div' ), el( 1, 0, 'div' ), el( 2, 1, 'button', 'S' ),
	el( 3, 0, 'div' ), el( 4, 3, 'label' ), el( 5, 4, 'input' ), el( 6, 4, 'span' ), el( 7, 6, 'span', 'Send as a gift' ), el( 8, 6, 'span', 'Add a note.' ),
	el( 11, 0, 'div' ), el( 12, 11, 'label' ), el( 13, 12, 'input' ), el( 14, 12, 'span', 'Email me news' ),
	el( 15, 0, 'div' ), el( 16, 15, 'button', 'Add' ),
] };
const RECORD = { surfaces: [ { kind: 'buybox', file: 'P.dc.html', parts: [
	{ id: 'buybox-option-picker', home: { type: 'setting', block: 'sgs/buybox', settings: [ 'pickerStyle' ] }, locators: [ 'P/2' ], sample: [ 'S' ] },
	{ id: 'buybox-add-to-basket', home: { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, locators: [ 'P/16' ], sample: [ 'Add' ] },
] } ] };
const TREE = () => [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/heading', attributes: {}, innerBlocks: [] }, { name: 'sgs/buybox', attributes: {}, innerBlocks: [] }, { name: 'sgs/text', attributes: {}, innerBlocks: [] } ] } ];
const ctx = ( over = {} ) => ( { key: 'single-product', tree: TREE(), inventory: INVENTORY, shopParts: RECORD, draftFile: 'P.dc.html', draftSource: TEMPLATE + logic( ADD ), ...over } );

test( 'MUST FAIL: the tick that sends a revealed note with the item becomes sgs/gift-order after the buy box, with the draft\'s words and length', () => {
	const got = place( ctx(), PIECE );
	const list = got.tree[ 0 ].innerBlocks;
	assert.deepEqual( list.map( ( n ) => n.name ), [ 'sgs/heading', 'sgs/buybox', 'sgs/gift-order', 'sgs/text' ] );
	assert.deepEqual( list[ 2 ], { name: 'sgs/gift-order', innerBlocks: [], draftRef: { tpl: 'Root/3#0' }, attributes: { basketLabel: 'Send as a gift', basketHelp: 'Add a note.', messagePlaceholder: 'Congrats!', messageLimit: 120 } } );
	assert.match( got.placed[ 0 ].at, /after sgs\/buybox, read at Root\/3#0 \(the tick Root\/5#0\)/ );
	// Nothing placed carries a style value.
	assert.deepEqual( lintSkeleton( got.tree, openDb() ), [] );
} );

test( 'MUST FAIL: a tick box the add button sends no note for is no gift choice (the newsletter tick), and stays a note', () => {
	const noNote = place( ctx( { draftSource: TEMPLATE + logic( "window.MM.cart.add({ id: 'a' }); if (S.news) window.MM.subscribe({ list: 'news' });" ) } ), PIECE );
	assert.equal( noNote.tree, undefined );
	assert.match( noNote.notes[ 0 ], /no tick box in the buy box \(Root\/5#0, Root\/13#0\) sends a note with the item being added/ );
	// A guarded call that sends no value of the revealed textarea is not it either.
	const other = place( ctx( { draftSource: TEMPLATE + logic( "window.MM.cart.add({ id: 'a' }); if (S.giftOn) window.MM.cart.setGift({ on: true });" ) } ), PIECE );
	assert.equal( other.tree, undefined );
} );

test( 'MUST FAIL: no buy box, a gift already placed, no tick box or no logic places nothing', () => {
	const none = TREE();
	none[ 0 ].innerBlocks.splice( 1, 1 );
	assert.match( place( ctx( { tree: none } ), PIECE ).notes[ 0 ], /the tree holds 0 sgs\/buybox/ );
	const placed = place( ctx(), PIECE ).tree;
	assert.match( place( ctx( { tree: placed } ), PIECE ).notes[ 0 ], /already holds sgs\/gift-order/ );
	const noTicks = { elements: INVENTORY.elements.filter( ( e ) => 'input' !== e.tag ) };
	assert.match( place( ctx( { inventory: noTicks } ), PIECE ).notes[ 0 ], /holds no tick box/ );
	assert.match( place( ctx( { draftSource: TEMPLATE } ), PIECE ).notes[ 0 ], /no logic/ );
} );

test( 'MUST FAIL: a tick counts only for a note it reveals and only for a call its own key guards', () => {
	// The newsletter tick's call sends the gift note too, but the tick does not reveal that note.
	const shared = place( ctx( { draftSource: TEMPLATE + logic( "window.MM.cart.add({ id: 'a' }); if (S.giftOn) window.MM.cart.setGift({ message: S.msg }); if (S.news) window.MM.subscribe({ text: S.msg });" ) } ), PIECE );
	assert.equal( shared.placed[ 0 ].at, 'after sgs/buybox, read at Root/3#0 (the tick Root/5#0)' );
	// The newsletter tick reveals a note of its own, which only the gift's test sends.
	const own = TEMPLATE.replace( '</div>\n</x-dc>', '  <div><sc-if value="{{ news }}"><textarea value="{{ newsNote }}"></textarea></sc-if></div>\n</div>\n</x-dc>' );
	const got = place( ctx( { draftSource: own + logic( "window.MM.cart.add({ id: 'a' }); if (S.giftOn) window.MM.cart.setGift({ message: S.msg, extra: S.newsNote });" ) } ), PIECE );
	assert.equal( got.placed[ 0 ].at, 'after sgs/buybox, read at Root/3#0 (the tick Root/5#0)' );
} );
