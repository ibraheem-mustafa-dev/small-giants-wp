// The shop's result count wherever the shop page draws it (Spec 48 FR-48-61; Bean 2026-10-30): a text bound to a count of a
// collection on the page holding the product listing is the shop's result count, inside the filter region or beside the
// listing (lib/shop-parts-read.mjs::countUnits), so the skeleton places WooCommerce's product-results-count there. MUST FAIL:
// a count above the listing, outside the filter's controls, is read; negative controls: a count on another page of the
// draft (the basket's), a text bound to no count, and a page with no listing read none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readShopSurfaces } from '../lib/shop-parts-read.mjs';

const draft = ( listing = true ) => `<x-dc>
<main>
  <section>
    <select onChange="{{ onSort }}"><option>Featured</option></select>
    <sc-for list="{{ chips }}" as="c"><button onClick="{{ c.pick }}">{{ c.n }}</button></sc-for>
  </section>
  <section>
    <div>{{ countText }}</div>
    <p>{{ blurb }}</p>
    ${ listing ? '<sc-for list="{{ shown }}" as="p"><dc-import name="Card" product="{{ p }}"></dc-import></sc-for>' : '' }
  </section>
</main>
<main><span>{{ bagCount }}</span></main>
</x-dc>
<script type="text/x-dc" data-dc-script>
class C extends DCComponent {
  state = { sort: 'a', f: [] };
  renderVals() {
    const S = this.state;
    const M = window.Shop;
    let list = M.products.filter((p) => S.f.every((x) => p.tags.includes(x)));
    if (S.sort === 'low') list = list.slice().sort((a, b) => a.price - b.price);
    return {
      chips: ['a'].map((id) => ({ n: id, pick: () => this.setState({ f: [id] }) })),
      onSort: (e) => this.setState({ sort: e.target.value }),
      shown: list.map((p) => p), countText: list.length + (list.length === 1 ? ' treat' : ' treats') + ' to choose from',
      blurb: M.blurb, bagCount: M.cart.items.length,
    };
  }
}
</script>`;
const counts = ( source ) => readShopSurfaces( { records: [ { name: 'Shop filter + sort', dc: 'Shop' } ], sources: { 'Shop.dc.html': source } } ).find( ( s ) => 'filter' === s.kind ).units.filter( ( u ) => 'text' === u.kind && u.facts.count ).map( ( u ) => u.text );

test( 'MUST FAIL: a result count beside the listing, outside the filter\'s controls, is the shop\'s count', () => {
	assert.deepEqual( counts( draft() ), [ '{{ countText }}' ], 'the count above the cards is read; the basket count on another page and the unbound blurb are not' );
	const surface = readShopSurfaces( { records: [ { name: 'Shop filter + sort', dc: 'Shop' } ], sources: { 'Shop.dc.html': draft( false ) } } ).find( ( s ) => 'filter' === s.kind );
	assert.ok( surface.problem, 'a page with no listing has no filter region and no count' );
} );
