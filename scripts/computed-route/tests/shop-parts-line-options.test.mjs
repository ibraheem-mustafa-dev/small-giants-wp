// Proves Spec 48 FR-48-62 for the basket line's "finish configuring this item" control: a control inside the basket
// drawer's line loop, shown only on some lines (under a condition read from the line item), whose handler is the line
// item's own and leaves the drawer for somewhere else (it sets a key the drawer's handoff record opens it with to false,
// and another key besides) is `sgs/cart`'s per-item add-options link. Its record part writes `itemShowAddOptions` and the
// control's own words as `itemAddOptionsLabel`, and Fill's shop-part writer puts both on the `sgs/cart` node it builds.
// MUST FAIL controls: each structural condition removed in turn leaves the control unmapped, the words never decide it,
// and a bound label writes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readShopSurfaces } from '../lib/shop-parts-read.mjs';
import { RULES, ShopPartsError, buildRecord, loadVocab, resolveVocab } from '../lib/shop-parts.mjs';
import { shopPartWrites } from '../lib/fill-shop-parts.mjs';
import { blockSchema } from '../lib/resolve.mjs';

const vocabFile = loadVocab();
// The framework facts the vocabulary needs, derived from the vocabulary: each anchored settings pattern names one
// attribute, and each fixed value an entry writes names one more.
const envFor = ( vocab ) => {
	const attrs = {};
	const files = {};
	for ( const e of vocab.entries ) {
		for ( const p of e.home.settings || [] ) {
			( attrs[ e.home.block ] ||= new Set() ).add( p.replace( /^\^|\$$/g, '' ) );
		}
		for ( const a of Object.keys( e.home.also || {} ) ) {
			( attrs[ e.home.block ] ||= new Set() ).add( a );
		}
		if ( e.home.file ) {
			files[ e.home.file ] = `${ files[ e.home.file ] || '' }<!-- ${ e.home.contains } /-->`;
		}
	}
	return { attrs, files };
};

const LINE = '<sc-if value="{{ it.open }}"><button onClick="{{ it.finish }}">Pick a finish</button></sc-if>';
const HANDLER = "finish: () => this.setState((s) => ({ shown: false, view: 'item', pick: it.id }))";
const draft = ( { line = LINE, handler = HANDLER } = {} ) => `<x-dc>
<aside>
  <div>Basket <span>({{ count }})</span></div>
  <button onClick="{{ close }}">×</button>
  <sc-for list="{{ items }}" as="it">
    <span>{{ it.name }}</span>
    ${ line }
    <button onClick="{{ it.rm }}">Take out</button>
  </sc-for>
  <div><span>Subtotal</span><span>{{ subText }}</span></div>
</aside>
</x-dc>
<script type="text/x-dc" data-dc-script>
class C extends DCComponent {
  renderVals() {
    const M = window.Shop;
    const money = (n) => '£' + n.toFixed(2);
    return {
      count: M.cart.items.length,
      close: () => this.setState({ shown: false }),
      finishAll: () => this.setState({ shown: false, view: 'item' }),
      items: M.cart.items.map((it) => ({ ...it, open: !it.extras, cta: it.word, ${ handler }, rm: () => M.cart.remove(it.id) })),
      subText: money(M.cart.total),
    };
  }
}
</script>`;
const OPENS = [ { name: 'closed', state_keys: { shown: false } }, { name: 'open', state_keys: { shown: true, items: '[]' } } ];
const record = ( o = {}, states = OPENS ) => buildRecord( {
	client: 'planted',
	surfaces: readShopSurfaces( { records: [ { name: 'Basket drawer (right)', dc: 'Page', states } ], sources: { 'Page.dc.html': draft( o ) } } ),
	vocab: resolveVocab( vocabFile, envFor( vocabFile ) ),
} );
const drawer = ( rec ) => rec.surfaces.find( ( s ) => 'drawer' === s.kind );
const addOptions = ( rec ) => drawer( rec ).parts.find( ( p ) => 'drawer-add-options' === p.id );

test( 'MUST FAIL: a line control shown on some lines whose item handler leaves the drawer is the cart\'s add-options link, its words the label', () => {
	const rec = record();
	assert.equal( drawer( rec ).problem, null );
	const p = addOptions( rec );
	assert.ok( p, JSON.stringify( drawer( rec ).parts.map( ( x ) => x.id ) ) );
	assert.deepEqual( p.by, [ 'structure' ] );
	assert.deepEqual( p.home, { type: 'setting', block: 'sgs/cart', settings: [ 'itemAddOptionsLabel' ] } );
	assert.deepEqual( p.write, { itemShowAddOptions: true, itemAddOptionsLabel: 'Pick a finish' } );
	assert.deepEqual( drawer( rec ).parts.find( ( x ) => 'drawer-remove' === x.id ).write, { itemRemoveLabel: 'Take out' }, 'the line control that edits the basket stays the remove link' );
	assert.ok( ! drawer( rec ).missing.some( ( r ) => /add-options|pick a finish/i.test( r.rowId ) ), 'no missing-features row for it' );
} );

test( 'MUST FAIL: Fill\'s shop-part writer puts both settings on the sgs/cart node of the surface it builds', () => {
	const flat = [ { name: 'sgs/site-header', attributes: {} }, { name: 'sgs/cart', attributes: { displayMode: 'drawer' } } ];
	const nodes = [ { index: 0, name: 'sgs/site-header' }, { index: 1, name: 'sgs/cart' } ];
	const r = shopPartWrites( { record: record(), nodes, flat, refOf: ( n ) => `fx-${ flat.indexOf( n ) }`, attrExists: ( b, a ) => Object.hasOwn( blockSchema( b ) || {}, a ) } );
	assert.equal( flat[ 1 ].attributes.itemShowAddOptions, true );
	assert.equal( flat[ 1 ].attributes.itemAddOptionsLabel, 'Pick a finish' );
	assert.deepEqual( r.unmapped, [], 'both settings exist on the block' );
	assert.deepEqual( flat[ 0 ].attributes, {} );
} );

test( 'MUST FAIL: each structural condition removed leaves the control unmapped; the words never decide it', () => {
	const cases = {
		'shown on every line (no condition read from the item)': { line: '<button onClick="{{ it.finish }}">Pick a finish</button>' },
		'a condition not read from the item': { line: '<sc-if value="{{ count }}"><button onClick="{{ it.finish }}">Pick a finish</button></sc-if>' },
		'the handler is not the item\'s own': { line: '<sc-if value="{{ it.open }}"><button onClick="{{ finishAll }}">Pick a finish</button></sc-if>' },
		'the handler stays in the drawer': { handler: "finish: () => this.setState({ view: 'item', pick: it.id })" },
		'the handler only shuts the drawer': { handler: 'finish: () => this.setState({ shown: false })' },
		'the handler sets the drawer key to true': { handler: "finish: () => this.setState({ shown: true, view: 'item' })" },
		'the handler edits the basket': { handler: 'finish: () => M.cart.update(it.id)' },
	};
	for ( const [ why, o ] of Object.entries( cases ) ) {
		assert.equal( addOptions( record( o ) ), undefined, why );
	}
	assert.equal( addOptions( record( {}, [ { name: 'open', state_keys: { shown: 'open', view: 'item' } } ] ) ), undefined, 'a drawer record whose states set no key to true gives the handler nothing to leave' );
	// The rule itself, whatever entry comes first: a line control that leaves the drawer but also edits the basket is not it.
	const edits = readShopSurfaces( { records: [ { name: 'Basket drawer (right)', dc: 'Page', states: OPENS } ], sources: { 'Page.dc.html': draft( { handler: "finish: () => { M.cart.update(it.id); this.setState({ shown: false, view: 'item' }); }" } ) } } )
		.find( ( s ) => 'drawer' === s.kind ).units.find( ( u ) => 'Pick a finish' === u.text );
	assert.ok( edits?.facts.leaves && edits.facts.editsBasket, 'the planted control leaves the drawer and edits the basket' );
	assert.equal( RULES[ 'line-options' ]( edits ), false );
	assert.ok( addOptions( record( { line: LINE.replace( 'Pick a finish', 'Engrave it' ) } ) ), 'other words, same structure: still the link' );
} );

test( 'MUST FAIL: a bound label maps the control but writes nothing (an empty label hides the link)', () => {
	const p = addOptions( record( { line: '<sc-if value="{{ it.open }}"><button onClick="{{ it.finish }}">{{ it.cta }}</button></sc-if>' } ) );
	assert.ok( p );
	assert.equal( p.write, null );
} );

test( 'a fixed value the framework DB does not hold is refused', () => {
	const env = envFor( vocabFile );
	env.attrs[ 'sgs/cart' ].delete( 'itemShowAddOptions' );
	assert.throws( () => resolveVocab( vocabFile, env ), ( e ) => e instanceof ShopPartsError && /drawer-add-options: no sgs\/cart attribute itemShowAddOptions for its fixed value/.test( e.message ) );
} );
