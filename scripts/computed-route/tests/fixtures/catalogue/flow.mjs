// A choice flow over the shared catalogue fixture (tests/catalogue-read.test.mjs, tests/flow-product.test.mjs): `withFlow( to )`
// writes its component and the handoff's surfaces.json into a fixture copy; FLOW_ROWS is the page map holding its row.
import fs from 'node:fs';
import path from 'node:path';

export const SHARED_ROWS = [ { route: 'Shop.dc.html', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'Item.dc.html', slug: 'product', postType: 'product', collection: 'live', template: 'single-product' } ];
// The flow, drawn by its own component (the page map's sgs_choice_flow row, surfaces.json naming its component): its basket
// call adds the jar with the grain, the toppings and the pack.
export const FLOW_ROWS = [ ...SHARED_ROWS, { slug: 'choice-flow-build', postType: 'sgs_choice_flow', collection: 'static', draftId: 'surfaces.json S-01' } ];
const BUILDER = `<!doctype html>
<html><head><script src="data.js"></script></head><body>
<x-dc><main>
  <sc-for list="{{ grains }}" as="o"><button onClick="{{ o.pick }}">{{ o.name }}</button></sc-for>
  <sc-for list="{{ tops }}" as="o"><button onClick="{{ o.pick }}">{{ o.name }}</button></sc-for>
  <sc-for list="{{ packs }}" as="o"><button onClick="{{ o.pick }}">{{ o.n }}</button></sc-for>
  <button onClick="{{ add }}">Add</button>
</main></x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {
  state = { pack: 6, grain: 'fine', tops: [] };
  renderVals() {
    const S = this.state, D = window.SHOPDATA;
    const togTop = t => { const a = S.tops.includes(t) ? S.tops.filter(x => x !== t) : [...S.tops, t]; this.setState({ tops: a }); };
    return {
      grains: (D ? D.grains : []).map(o => ({ ...o, pick: () => this.setState({ grain: o.id }) })),
      tops: (D ? D.toppings : []).map(o => ({ ...o, pick: () => togTop(o.id) })),
      packs: (D ? D.packs : []).map(o => ({ ...o, pick: () => this.setState({ pack: o.n }) })),
      add: () => D.basket.add({ key: 'jar', id: 'jar', grain: S.grain, tops: S.tops, pack: S.pack })
    };
  }
}
</script>
</body></html>
`;
export const withFlow = ( to ) => {
	fs.writeFileSync( path.join( to, 'Builder.dc.html' ), BUILDER );
	fs.writeFileSync( path.join( to, 'surfaces.json' ), JSON.stringify( { records: [ { id: 'S-01', kind: 'modal', name: 'Build a jar', dc: 'Builder' } ] } ) );
};
