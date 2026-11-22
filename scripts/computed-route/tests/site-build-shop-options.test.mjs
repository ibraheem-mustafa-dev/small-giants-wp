// The theme's shop options (Spec 48 FR-48-61; lib/site-build-shop-options.mjs, data/shop-options.json): the site build decides
// each sgs_shop_* theme mod the shop draft draws from the shop surface's artefacts, writes it with set_theme_mod, never
// overwrites a value the site holds, and reports every option it cannot decide. Tests marked MUST FAIL fail without the step.
// Synthetic artefacts and a stand-in PHP runner, plus Eye Care's saved shop artefacts; no browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOP_OPTIONS, decideShopOptions, ownAlternatives, planShopOptions, readShopArtefacts, runShopOptions, shopOptionsApplyPhp } from '../lib/site-build-shop-options.mjs';
import { sortOptionsOf } from '../lib/template-piece-shop-sort.mjs';
import { inventoryIndex } from '../lib/template-piece-draft.mjs';
import { logicOf } from '../lib/shop-parts-logic.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );

const SOURCE = `<x-dc>
<div>
  <div>
    <span>{{ resultCount }}</span>
    <button onClick="{{ toggleFilters }}" style="text-transform:uppercase">Filter {{ activeCountLabel }}</button>
    <select value="{{ sort }}">
      <option value="featured">Featured</option>
      <option value="low">Price: low to high</option>
      <option value="save">Biggest saving</option>
      <option value="brand">Brand A–Z</option>
    </select>
  </div>
  <aside style="background:transparent">
    <div>
      <div><span>Gender</span></div>
      <div><span>Brand</span></div>
      <div><span>Polarised only</span></div>
    </div>
    <div>
      <button onClick="{{ clearAll }}" style="text-transform:uppercase">Clear</button>
      <button onClick="{{ toggleFilters }}" style="text-transform:uppercase">Show {{ resultCount }}</button>
    </div>
  </aside>
  <div><div><span>{{ p.priceLabel }}</span></div></div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Shop extends DCLogic {
  renderVals() {
    const f = this.state;
    const products = C.map(p => { const save = p.rrp - p.price; return Object.assign({}, p, { saveRaw: save }); });
    let results = products;
    if (f.sort === 'low') results.sort((a, b) => a.price - b.price);
    if (f.sort === 'save') results.sort((a, b) => b.saveRaw - a.saveRaw);
    if (f.sort === 'brand') results.sort((a, b) => a.brand.localeCompare(b.brand));
    return { results, sort: f.sort, resultCount: results.length + (results.length === 1 ? ' frame' : ' frames') };
  }
}
</script>`;

const ALL = [ 375, 768, 1440 ];
const box = ( x, y, w, h ) => Object.fromEntries( ALL.map( ( width ) => [ width, { x, y, w, h } ] ) );
const el = ( tpl, parent, tag, words = '', extra = {} ) => ( {
	key: `Root/${ tpl }#0`, parentKey: null == parent ? null : `Root/${ parent }#0`, tag, template: 'Root', tpl, words, allText: extra.allText ?? words, srcOwnText: extra.own ?? words,
	snippet: extra.snippet ?? `<${ tag }>`, attrs: { style: extra.style ?? '' }, visible: extra.visible ?? { 375: true, 768: true, 1440: true },
	position: extra.position ?? { 375: 'static', 768: 'static', 1440: 'static' }, box: extra.box ?? box( 0, 0, 10, 10 ),
} );
const railShown = { 375: false, 768: false, 1440: true };
const INVENTORY = () => ( { elements: [
	el( 0, null, 'div' ), el( 1, 0, 'div' ),
	el( 2, 1, 'span', '16 frames', { own: '{{ resultCount }}', box: box( 20, 200, 60, 20 ) } ),
	el( 3, 1, 'button', 'Filter', { own: 'Filter {{ activeCountLabel }}', box: box( 100, 195, 80, 44 ), visible: { 375: true, 768: true, 1440: false } } ),
	el( 4, 1, 'select', '', { snippet: '<sc-raw-select value="{{ sort }}" style="font-size:13.5px">', style: 'font-size: 13.5px;', box: box( 200, 195, 120, 44 ) } ),
	el( 5, 4, 'option', 'Featured', { snippet: '<option value="featured">' } ), el( 6, 4, 'option', 'Price: low to high', { snippet: '<option value="low">' } ),
	el( 7, 4, 'option', 'Biggest saving', { snippet: '<option value="save">' } ), el( 8, 4, 'option', 'Brand A–Z', { snippet: '<option value="brand">' } ),
	el( 9, 0, 'aside', '', { style: 'background: transparent;', visible: railShown, box: { 1440: { x: 52, y: 280, w: 270, h: 900 } } } ),
	el( 10, 9, 'div', '', { visible: railShown } ),
	el( 11, 10, 'div', '', { visible: railShown, allText: 'Gender' } ), el( 12, 11, 'span', 'Gender', { visible: railShown } ),
	el( 13, 10, 'div', '', { visible: railShown, allText: 'Brand' } ), el( 14, 13, 'span', 'Brand', { visible: railShown } ),
	el( 15, 10, 'div', '', { visible: railShown, allText: 'Polarised only' } ), el( 16, 15, 'span', 'Polarised only', { visible: railShown } ),
	el( 20, 0, 'div', '', { box: { 1440: { x: 362, y: 280, w: 1026, h: 900 } } } ), el( 22, 20, 'div' ), el( 23, 22, 'span', '£139 £12.50' ),
] } );
const PROPOSAL = () => ( {
	commerceRegion: { key: 'Root/20#0' },
	filterRail: { key: 'Root/9#0', toggle: 'Root/3#0', groups: [ { kind: 'facet', key: 'Root/11#0' }, { kind: 'brand', key: 'Root/13#0' } ] },
	templatePieces: { placed: [ { id: 'results-count', block: 'woocommerce/product-results-count', run: [ 'Root/2#0' ] } ] },
} );
const RAIL_NODE = ( value ) => ( { name: 'sgs/container', attributes: {}, ownAlternativeBelow: { setting: 'sgs_shop_filter_drawer_breakpoint', scope: 'theme-mod', ...( null == value ? {} : { value } ) }, innerBlocks: [] } );
const ARTEFACTS = ( over = {} ) => ( {
	key: 'shop', entry: {}, inventory: INVENTORY(), proposal: PROPOSAL(), tree: [ { name: 'sgs/container', attributes: {}, innerBlocks: [ RAIL_NODE( 1060 ) ] } ], source: SOURCE,
	productFields: { name: [ 'name' ], price: [ 'price' ], rrp: [ 'rrp' ], brand: [ 'brand' ] },
	catalogue: { facets: [ { kind: 'boolean', label: 'Polarised', toggleLabel: 'Polarised only', slug: 'polarised', terms: [ { name: 'Yes' } ] } ] },
	...over,
} );
const values = ( d ) => Object.fromEntries( Object.entries( d.set ).map( ( [ k, v ] ) => [ k, v.value ] ) );

test( 'MUST FAIL: the shop draft decides the theme\'s shop options: the drawer width, count words, sort menu, prices, panel, drawer words and filter button', () => {
	const d = decideShopOptions( ARTEFACTS() );
	assert.deepEqual( values( d ), {
		sgs_shop_filter_drawer_breakpoint: 1060,
		sgs_shop_count_label: '%d frames',
		sgs_shop_count_label_single: '%d frame',
		sgs_shop_sort_menu: 'menu_order|Featured\nprice|Price: low to high\nsgs_biggest_saving|Biggest saving\nsgs_brand_az|Brand A–Z',
		sgs_shop_sort_biggest_saving_enabled: true,
		sgs_shop_sort_rrp_meta_key: '_sgs_rrp',
		sgs_shop_sort_brand_az_enabled: true,
		sgs_shop_hide_zero_decimals: true,
		sgs_shop_result_count_enabled: true,
		sgs_shop_result_count_label: 'Show %d frames',
		sgs_shop_clear_label: 'Clear',
		sgs_shop_drawer_caps: true,
		sgs_shop_filter_panel_style: 'plain',
		sgs_shop_filter_desktop_heading: false,
		sgs_shop_filters_width: 270,
		sgs_shop_layout_gap: 40,
		sgs_shop_toggle_count: true,
		sgs_shop_toggle_place: 'toolbar',
		sgs_shop_sticky_trigger: false,
		sgs_shop_filter_boolean_position: 'bottom',
		sgs_shop_sort_size: 13.5,
	} );
	// Every option of the data file is either decided or reported with its reason, once.
	const named = [ ...Object.keys( d.set ), ...d.unread.map( ( u ) => u.option ) ];
	assert.deepEqual( [ ...named ].sort(), SHOP_OPTIONS.map( ( o ) => o.option ).sort() );
	assert.ok( d.unread.every( ( u ) => u.why ) );
} );

test( 'negative controls: a draft that draws otherwise decides otherwise, and one that draws nothing decides nothing', () => {
	const inv = INVENTORY();
	const set = ( tpl, patch ) => Object.assign( inv.elements.find( ( e ) => e.tpl === tpl ), patch );
	set( 9, { attrs: { style: 'background: rgb(243, 240, 235); border: 1px solid rgb(0, 0, 0);' } } );
	set( 3, { srcOwnText: 'Filter', box: box( 20, 260, 335, 44 ), position: { 375: 'fixed', 768: 'fixed', 1440: 'static' } } );
	set( 23, { words: '£139.00 £12.50' } );
	set( 12, { visible: { 375: false, 768: false, 1440: false } } );
	const tag = el( 17, 9, 'p', 'Refine', { visible: railShown } );
	inv.elements.splice( inv.elements.indexOf( inv.elements.find( ( e ) => 10 === e.tpl ) ), 0, tag );
	const d = values( decideShopOptions( ARTEFACTS( { inventory: inv } ) ) );
	assert.equal( d.sgs_shop_filter_panel_style, 'panel' );
	// A border alone (no fill) is a panel too.
	const bordered = INVENTORY();
	Object.assign( bordered.elements.find( ( e ) => 9 === e.tpl ), { attrs: { style: 'background: transparent; border: 1px solid rgb(0, 0, 0);' } } );
	assert.equal( values( decideShopOptions( ARTEFACTS( { inventory: bordered } ) ) ).sgs_shop_filter_panel_style, 'panel' );
	assert.equal( d.sgs_shop_toggle_count, false );
	assert.equal( d.sgs_shop_toggle_place, 'row' );
	assert.equal( d.sgs_shop_sticky_trigger, true );
	assert.equal( d.sgs_shop_hide_zero_decimals, false );
	assert.equal( d.sgs_shop_filter_desktop_heading, true );
	// A sort option the theme does not offer leaves the menu, and a saving the logic does not show as rrp minus price is no saving.
	const plain = SOURCE.replace( 'const save = p.rrp - p.price;', 'const save = p.price;' );
	const noSave = decideShopOptions( ARTEFACTS( { source: plain } ) );
	assert.equal( noSave.set.sgs_shop_sort_menu, undefined );
	assert.match( noSave.unread.find( ( u ) => 'sgs_shop_sort_menu' === u.option ).why, /"Biggest saving" order in a way neither WooCommerce nor the theme offers/ );
	assert.equal( noSave.set.sgs_shop_sort_biggest_saving_enabled, undefined );
	assert.equal( noSave.set.sgs_shop_sort_brand_az_enabled.value, true );
	// No rail, no count piece, no toggle, no source: nothing is decided from them.
	const bare = decideShopOptions( ARTEFACTS( { proposal: { commerceRegion: { key: 'Root/20#0' } }, tree: [], source: null } ) );
	assert.deepEqual( Object.keys( bare.set ), [ 'sgs_shop_hide_zero_decimals', 'sgs_shop_sort_size' ] );
} );

test( 'MUST FAIL: a node marked ownAlternativeBelow gives its value to the theme mod it names; with no value it is reported, never guessed', () => {
	assert.deepEqual( ownAlternatives( [ RAIL_NODE( 1059.6 ) ] ).set, { sgs_shop_filter_drawer_breakpoint: { value: 1060, evidence: 'sgs/container swaps for its own alternative below 1059.6px (ownAlternativeBelow.value, the draft\'s threshold read by Fill)' } } );
	const none = ownAlternatives( [ RAIL_NODE( null ) ] );
	assert.deepEqual( none.set, {} );
	assert.match( none.unread[ 0 ].why, /marked ownAlternativeBelow but Fill named no threshold/ );
	// A mark of another scope, or a setting that is no sgs_ option, gives nothing.
	assert.deepEqual( ownAlternatives( [ { ...RAIL_NODE( 900 ), ownAlternativeBelow: { setting: 'sgs_x', scope: 'attribute', value: 900 } } ] ), { set: {}, unread: [] } );
	assert.deepEqual( ownAlternatives( [ { ...RAIL_NODE( 900 ), ownAlternativeBelow: { setting: 'blogname', scope: 'theme-mod', value: 900 } } ] ), { set: {}, unread: [] } );
	const d = decideShopOptions( ARTEFACTS( { tree: [ RAIL_NODE( null ) ] } ) );
	assert.equal( d.unread.filter( ( u ) => 'sgs_shop_filter_drawer_breakpoint' === u.option ).length, 1 );
} );

test( 'MUST FAIL: the plan sets what the site leaves blank, keeps what matches and never overwrites what differs', () => {
	const decided = { set: { a: { value: 'x', evidence: 'e' }, b: { value: true, evidence: 'e' }, c: { value: 270, evidence: 'e' }, d: { value: 'y', evidence: 'e' } } };
	const plan = planShopOptions( decided, { mods: { a: null, b: '1', c: 300, d: '' } } );
	assert.deepEqual( plan.set, { a: 'x', d: 'y' } );
	assert.deepEqual( plan.exists, [ 'b' ] );
	assert.equal( plan.left.length, 1 );
	assert.match( plan.left[ 0 ], /^c is 300 on the site, the draft's 270/ );
	assert.match( shopOptionsApplyPhp( { a: 'x' } ), /set_theme_mod\( \$m, \$v \)/ );
} );

test( 'runShopOptions writes the planned theme mods with --apply and reads them back; a dry run writes nothing', () => {
	const tmp = fs.mkdtempSync( path.join( REPO, 'scripts', 'computed-route', 'tests', '.tmp-shop-options-' ) );
	try {
		const build = path.join( tmp, 'sites', 'demo', 'build' );
		fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
		fs.mkdirSync( path.join( build, 'trees', 'template' ), { recursive: true } );
		fs.mkdirSync( path.join( tmp, 'sites', 'demo', 'handoff' ), { recursive: true } );
		fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { shop: { target: { template: 'archive-product' }, draftDir: 'sites/demo/handoff', draftIndex: 'Shop.dc.html' } } ) );
		fs.writeFileSync( path.join( build, 'skeleton', 'shop.inventory.json' ), JSON.stringify( INVENTORY() ) );
		fs.writeFileSync( path.join( build, 'skeleton', 'shop.proposal.json' ), JSON.stringify( PROPOSAL() ) );
		fs.writeFileSync( path.join( build, 'trees', 'template', 'archive-product.json' ), JSON.stringify( [ RAIL_NODE( 1060 ) ] ) );
		fs.writeFileSync( path.join( tmp, 'sites', 'demo', 'handoff', 'Shop.dc.html' ), SOURCE );
		const mods = { sgs_shop_filters_width: 300 };
		const writes = [];
		const runPhp = ( php ) => {
			const asked = /base64_decode\( '([^']+)' \)/.exec( php )?.[ 1 ];
			const v = JSON.parse( Buffer.from( asked, 'base64' ).toString() );
			if ( /set_theme_mod/.test( php ) ) {
				writes.push( v );
				Object.assign( mods, v );
				return JSON.stringify( { set: Object.keys( v ) } );
			}
			return JSON.stringify( { mods: Object.fromEntries( v.map( ( m ) => [ m, mods[ m ] ?? null ] ) ) } );
		};
		const log = [];
		assert.equal( runShopOptions( { repo: tmp, client: 'demo', runPhp, apply: false, log: ( l ) => log.push( l ), error: ( l ) => log.push( l ) } ), 0 );
		assert.equal( writes.length, 0 );
		assert.ok( log.some( ( l ) => /^note: sgs_shop_filters_width is 300 on the site, the draft's 270/.test( l ) ) );
		assert.ok( log.some( ( l ) => /not written: sgs_shop_toggle_look: /.test( l ) ) );
		assert.equal( runShopOptions( { repo: tmp, client: 'demo', runPhp, apply: true, log: () => {}, error: ( l ) => log.push( l ) } ), 0 );
		assert.equal( writes.length, 1 );
		assert.equal( writes[ 0 ].sgs_shop_filter_drawer_breakpoint, 1060 );
		assert.equal( writes[ 0 ].sgs_shop_filters_width, undefined, 'a value the site holds is never overwritten' );
		assert.equal( mods.sgs_shop_count_label, '%d frames' );
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL: the sort options map the saving downwards and the brand as text to the theme\'s own orders', () => {
	const index = inventoryIndex( INVENTORY() );
	const got = sortOptionsOf( { index, select: index.byKey.get( 'Root/4#0' ), L: logicOf( SOURCE ), fields: { price: [ 'price' ], rrp: [ 'rrp' ], brand: [ 'brand' ] } } );
	assert.deepEqual( got.map( ( o ) => [ o.words, o.order ] ), [ [ 'Featured', 'menu_order' ], [ 'Price: low to high', 'price' ], [ 'Biggest saving', 'sgs_biggest_saving' ], [ 'Brand A–Z', 'sgs_brand_az' ] ] );
	// Negative controls: no brand field, no rrp field: neither order is the theme's.
	const bare = sortOptionsOf( { index, select: index.byKey.get( 'Root/4#0' ), L: logicOf( SOURCE ), fields: { price: [ 'price' ] } } );
	assert.deepEqual( bare.map( ( o ) => o.order ), [ 'menu_order', 'price', null, null ] );
} );

test( 'site-build.mjs runs the shop options step on its own flag, in a dry run and after a whole build', () => {
	const src = fs.readFileSync( path.join( REPO, 'scripts', 'computed-route', 'site-build.mjs' ), 'utf8' );
	assert.match( src, /args\.includes\( '--shop-options' \)[\s\S]*?runShopOptions\( \{ repo, client, runPhp: wpEvalRunner/ );
	assert.match( src, /runAccountRegistration\( \{ rows, repo, client, runPhp, apply: false \} \) \|\| runShopOptions\( \{ repo, client, runPhp, apply: false \} \)/ );
	assert.match( src, /0 !== runShopOptions\( \{ repo, client, runPhp, apply: true \} \)/ );
} );

test( 'Eye Care\'s saved shop artefacts decide its sort menu, panel, rail width and gap, heading and on-off row as its draft draws them', () => {
	const a = readShopArtefacts( { repo: REPO, client: 'eye-care-ward-end' } );
	const d = values( decideShopOptions( a ) );
	assert.equal( d.sgs_shop_sort_menu, 'menu_order|Featured\nprice|Price: low to high\nprice-desc|Price: high to low\nsgs_biggest_saving|Biggest saving\nsgs_brand_az|Brand A–Z' );
	assert.equal( d.sgs_shop_filter_panel_style, 'plain' );
	assert.equal( d.sgs_shop_filters_width, 270 );
	assert.equal( d.sgs_shop_layout_gap, 40 );
	assert.equal( d.sgs_shop_filter_desktop_heading, false );
	assert.equal( d.sgs_shop_filter_boolean_position, 'bottom' );
	assert.equal( d.sgs_shop_hide_zero_decimals, true );
} );
