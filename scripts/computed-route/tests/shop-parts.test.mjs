// Proves Spec 48 FR-48-60, FR-48-61, FR-48-62: a draft's buy box, filter and basket drawer are matched part by part, by
// what the draft's code is and does. MUST FAIL controls: each known part maps to its home from its structure (an h1, a
// handler that appends a record, a stepper, a select, a range input, a reset, a loop editing the basket, a link to a
// form page, a currency total); a control named by words alone is a gap row, never a mapped part, and a control whose
// handler adds to the basket is the add button whatever it says; an unknown part becomes a missing-features row and no
// unit is silently lost; a vocabulary entry naming a setting the DB lacks, a block a part file lacks, a duplicate id, an
// unknown rule, or matching no unit of any draft is refused; the two committed client records are what the reader and
// matcher produce from the committed drafts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTemplate, readShopSurfaces, unitsOf } from '../lib/shop-parts-read.mjs';
import { ShopPartsError, buildRecord, loadVocab, locatorsOf, resolveVocab } from '../lib/shop-parts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const vocabFile = loadVocab();
// The framework facts a vocabulary needs, derived from the vocabulary itself: each anchored settings pattern names one
// attribute, each fixed value an entry writes one more, each part or template home names the block comment its file holds.
const envFor = ( vocab, fixtures ) => {
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
	return { attrs, files, ...( fixtures ? { fixtures } : {} ) };
};

const DRAFT = `<x-dc>
<main>
  <div>
    <h1>{{ name }}</h1>
    <h2>Details</h2>
    <sc-for list="{{ extras }}" as="x"><button onClick="{{ x.add }}">{{ x.n }}</button></sc-for>
    <div><button onClick="{{ wish }}">♥</button><span>{{ wishes }}</span><a href="#saved">see</a></div>
    <sc-if value="{{ giftable }}"><label><input type="checkbox" onChange="{{ toggleGift }}"><span>Send it as a gift</span></label></sc-if>
    <sc-for list="{{ sizes }}" as="o"><button onClick="{{ o.pick }}" aria-pressed="{{ o.on }}">{{ o.n }}</button></sc-for>
    <div><button onClick="{{ dec }}">−</button><span>{{ qty }}</span><button onClick="{{ inc }}">+</button></div>
    <div><span>{{ priceText }}</span></div>
    <button onClick="{{ buy }}">Go on then</button>
    <button onClick="{{ fake }}">Add to basket</button>
    <button onClick="{{ spin }}">Spin the wheel</button>
  </div>
  <div><button onClick="{{ more }}">More like this</button><sc-for list="{{ related }}" as="r"><dc-import name="Card" product="{{ r }}"></dc-import></sc-for></div>
  <div>
  <section>
    <span>{{ resultCount }}</span>
    <p>Hand-picked words that no part claims</p>
    <select onChange="{{ onSort }}"><option>Featured</option></select>
    <input type="range" onChange="{{ setPrice }}">
    <button onClick="{{ clearAll }}">Start again</button>
    <button onClick="{{ randomise }}">Surprise me</button>
    <sc-for list="{{ chips }}" as="c"><button onClick="{{ c.pick }}">{{ c.n }}</button></sc-for>
    <sc-for list="{{ modes }}" as="m"><button onClick="{{ m.pick }}">{{ m.n }}</button></sc-for>
    <sc-for list="{{ tags }}" as="g"><button onClick="{{ g.pick }}">{{ g.n }}</button></sc-for>
    <sc-for list="{{ tabs }}" as="t"><button onClick="{{ t.pick }}">{{ t.n }}</button></sc-for>
  </section>
  <sc-for list="{{ shown }}" as="p"><dc-import name="Card" product="{{ p }}"></dc-import></sc-for>
  </div>
  <aside>
    <div>Your basket <span>({{ count }})</span></div>
    <button onClick="{{ close }}">×</button>
    <sc-for list="{{ items }}" as="it"><span>{{ it.name }}</span><button onClick="{{ it.rm }}">Take out</button></sc-for>
    <div><span>Subtotal</span><span>{{ subText }}</span></div>
    <p>{{ eta }}</p>
    <a href="Checkout.dc.html">Checkout securely</a>
    <button onClick="{{ sparkle }}">Add sparkle</button>
  </aside>
</main>
</x-dc>
<script type="text/x-dc" data-dc-script>
class C extends DCComponent {
  state = { sort: 'a', price: 50, f: [], seed: 0, qty: 1, glow: false, open: false, size: 1 };
  renderVals() {
    const S = this.state;
    const M = window.Shop;
    const money = (n) => '£' + n.toFixed(2);
    let list = M.products.filter((p) => p.price <= S.price && S.f.every((x) => p.tags.includes(x)));
    if (S.sort === 'low') list = list.slice().sort((a, b) => a.price - b.price);
    const items = M.cart.items;
    const label = (t) => 'Due ' + t;
    const deco = (p) => (S.hot ? { ...p, hot: true } : p);
    return {
      extras: [1].map((n) => ({ n, add: () => M.cart.add({ id: n, qty: 1 }) })),
      wish: () => this.setState({ wished: true }), wishes: S.wished,
      related: M.products.filter((p) => p.id !== S.cur), more: () => this.setState({ cur: M.id }),
      chips: ['a'].map((id) => ({ n: id, pick: () => this.setState({ f: [id] }) })),
      modes: ['all'].map((id) => ({ n: id, pick: () => this.setState({ mode: id }) })),
      tags: ['hot'].map((id) => ({ n: id, pick: () => this.setState({ hot: id }) })),
      tabs: ['x'].map((id) => ({ n: id, pick: () => this.setState({ tab: id }) })),
      shown: (S.mode === 'all' ? list : list.slice(0, 4)).map((p) => deco(p)),
      eta: label(M.eta),
      name: M.name, giftable: true, toggleGift: (e) => this.setState({ gift: e.target.checked }),
      sizes: [1, 2].map((n) => ({ n, on: S.size === n, pick: () => this.setState({ size: n }) })),
      dec: () => this.setState({ qty: S.qty - 1 }), inc: () => this.setState({ qty: S.qty + 1 }), qty: S.qty,
      priceText: money(M.price),
      buy: () => M.cart.add({ id: M.id, qty: S.qty }),
      fake: () => this.setState({ seen: true }),
      spin: () => this.setState({ spun: S.seed + 1 }),
      onSort: (e) => this.setState({ sort: e.target.value }), setPrice: (e) => this.setState({ price: +e.target.value }),
      clearAll: () => this.setState({ f: [], price: 100 }), randomise: () => this.setState({ seed: Math.random() }),
      resultCount: list.length, list,
      count: items.length, close: () => this.setState({ open: false }),
      items: items.map((it) => ({ ...it, rm: () => M.cart.remove(it.id) })),
      subText: money(M.cart.total), sparkle: () => this.setState({ glow: true }),
    };
  }
}
</script>`;
const CHECKOUT = '<x-dc><form><input type="email"><input type="text"><input type="tel"></form></x-dc>';
const RECORDS = [ { name: 'Product buy box', dc: 'Page' }, { name: 'Shop filter + sort', dc: 'Page' }, { name: 'Basket drawer (right)', dc: 'Page' } ];
const surfaces = ( draft = DRAFT ) => readShopSurfaces( { records: RECORDS, sources: { 'Page.dc.html': draft, 'Checkout.dc.html': CHECKOUT } } );
const record = ( vocab = vocabFile, draft = DRAFT ) => buildRecord( { client: 'planted', surfaces: surfaces( draft ), vocab: resolveVocab( vocab, envFor( vocab ) ) } );
const part = ( rec, kind, id ) => rec.surfaces.find( ( s ) => s.kind === kind ).parts.find( ( p ) => p.id === id );

test( 'MUST FAIL: each known part of a planted draft maps to its framework home from its structure', () => {
	const rec = record();
	assert.equal( part( rec, 'buybox', 'buybox-title' ).home.type, 'part' );
	assert.deepEqual( part( rec, 'buybox', 'buybox-title' ).sample, [ '{{ name }}' ], 'only the h1 is the title' );
	assert.deepEqual( part( rec, 'filter', 'filter-options' ).sample, [ '{{ c.n }}', '{{ m.n }}' ], 'loop controls that set a key selecting the listing, through a filter callback or the test choosing between lists; a key read only by a function decorating each item, or read by nothing, does not count' );
	assert.equal( part( rec, 'drawer', 'drawer-subtotal' ).units, 2, 'a bound value from a function that formats no currency is not a total' );
	assert.deepEqual( part( rec, 'buybox', 'buybox-add-to-basket' ).home, { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel', 'addToCartStyle', 'addToCartShowPrice' ] } );
	assert.deepEqual( part( rec, 'buybox', 'buybox-add-to-basket' ).sample, [ 'Go on then' ], 'the control whose handler adds a record is the add button, whatever it says' );
	assert.equal( part( rec, 'buybox', 'buybox-option-picker' ).units, 1 );
	assert.equal( part( rec, 'buybox', 'buybox-quantity' ).units, 3 );
	assert.equal( part( rec, 'buybox', 'buybox-price' ).home.type, 'built-in' );
	assert.equal( part( rec, 'filter', 'filter-result-count' ).home.contains, 'wp:woocommerce/product-results-count' );
	assert.equal( part( rec, 'filter', 'filter-sort' ).home.contains, 'wp:woocommerce/catalog-sorting' );
	assert.equal( part( rec, 'filter', 'filter-price' ).home.contains, 'wp:woocommerce/product-filter-price-slider' );
	assert.equal( part( rec, 'filter', 'filter-clear' ).home.contains, 'wp:woocommerce/product-filter-clear-button' );
	assert.deepEqual( part( rec, 'filter', 'filter-clear' ).sample, [ 'Start again' ] );
	assert.deepEqual( part( rec, 'drawer', 'drawer-checkout' ).write, { checkoutLabel: 'Checkout securely' } );
	assert.deepEqual( part( rec, 'drawer', 'drawer-remove' ).write, { itemRemoveLabel: 'Take out' } );
	assert.equal( part( rec, 'drawer', 'drawer-close' ).home.type, 'built-in' );
	assert.equal( part( rec, 'drawer', 'drawer-count' ).home.settings[ 0 ], 'panelShowCount' );
	assert.equal( part( rec, 'drawer', 'drawer-line-details' ).units, 1 );
	assert.deepEqual( part( rec, 'drawer', 'drawer-subtotal' ).sample, [ 'Subtotal', '{{ subText }}' ], 'the label beside the total joins it by position' );
	assert.deepEqual( part( rec, 'drawer', 'drawer-subtotal' ).by, [ 'position', 'structure' ] );
	for ( const s of rec.surfaces ) {
		assert.ok( s.parts.filter( ( p ) => ! p.home.hint && ! p.id.startsWith( 'unmatched:' ) ).every( ( p ) => ! p.by.includes( 'hint' ) ) );
	}
} );

test( 'MUST FAIL: the template numbers each element as the runtime stamps data-dc-tpl: pre-order inside <x-dc> only, styles and scripts counted, their content never', () => {
	const root = parseTemplate( '<head><script src="s.js"><b></script></head><x-dc><helmet><style>p<i>{}</style></helmet><!-- <em> --><div><sc-if value="{{ a }}">hi<span>x</span></sc-if><img src="a.png"></div><p>y</p></x-dc><script data-dc-script>class C {}</script>' );
	const tags = [];
	const walk = ( n ) => n.children.forEach( ( c ) => c.tag && ( tags.push( `${ c.tag }:${ c.tpl }` ), walk( c ) ) );
	walk( root );
	assert.deepEqual( tags, [ 'head:null', 'script:null', 'x-dc:null', 'helmet:0', 'style:1', 'div:2', 'sc-if:3', 'span:4', 'img:5', 'p:6', 'script:null' ] );
	const div = root.children.find( ( c ) => 'x-dc' === c.tag ).children.find( ( c ) => 'div' === c.tag );
	assert.deepEqual( unitsOf( div, { file: 'T.dc.html', dc: 'T' } ).map( ( u ) => [ u.kind, u.text, u.dc, u.tpl ] ), [
		[ 'text', 'hi', 'T', 2 ],
		[ 'text', 'x', 'T', 4 ],
		[ 'image', '', 'T', 5 ],
	], 'a run directly inside sc-if is located by the element that renders around it' );
} );

test( 'MUST FAIL: each part carries the template key of every element its units were found on', () => {
	const rec = record();
	assert.deepEqual( part( rec, 'buybox', 'buybox-add-to-basket' ).locators, [ 'Page/22' ], 'the button whose handler appends, not the looped one' );
	assert.deepEqual( part( rec, 'buybox', 'buybox-title' ).locators, [ 'Page/2' ] );
	assert.deepEqual( part( rec, 'buybox', 'buybox-quantity' ).locators, [ 'Page/17', 'Page/18', 'Page/19' ] );
	assert.deepEqual( [ part( rec, 'buybox', 'buybox-price' ).sample, part( rec, 'buybox', 'buybox-price' ).locators ], [ [ 'Details', '{{ priceText }}' ], [ 'Page/3', 'Page/21' ] ], 'a text run is located by the element holding it: the price span and the label the price took by position (the h2)' );
	for ( const s of rec.surfaces ) {
		for ( const p of s.parts ) {
			assert.ok( p.locators.length >= 1 && p.locators.length <= p.units, `${ p.id }: one locator per element, at least one` );
		}
	}
	assert.deepEqual( locatorsOf( [ { dc: 'T', tpl: 3 }, { dc: 'T', tpl: 3 }, { dc: 'T', tpl: 1 }, { dc: null, tpl: 2 }, { dc: 'T', tpl: null } ] ), [ 'T/1', 'T/3' ], 'one key per element, in stamp order; an unstamped unit adds none' );
} );

test( 'MUST FAIL: a control named only by words is a reported gap row, never a mapped part', () => {
	const rec = record();
	const gap = part( rec, 'buybox', 'buybox-add-to-basket:hint' );
	assert.ok( gap, 'the "Add to basket" button whose handler adds nothing is a gap part' );
	assert.equal( gap.home.type, 'missing' );
	assert.equal( gap.home.hint, 'buybox-add-to-basket' );
	assert.match( gap.home.reason, /only words name this control .* no structural fact/ );
	assert.deepEqual( gap.sample, [ 'Add to basket' ] );
	const rows = rec.surfaces.flatMap( ( s ) => s.missing );
	assert.ok( rows.some( ( r ) => 'missing:shop:buybox:buybox-add-to-basket:hint' === r.rowId && 'buy' === r.mainFlow ) );
	assert.ok( part( rec, 'drawer', 'drawer-heading:hint' ), 'the drawer heading is a word hint here (no heading element)' );
	assert.ok( ! part( rec, 'drawer', 'drawer-heading' ) );
} );

test( 'MUST FAIL: an unknown part becomes a missing-features row in FR-48-34 shape', () => {
	const rec = record();
	const rows = rec.surfaces.flatMap( ( s ) => s.missing );
	for ( const word of [ 'Spin the wheel', 'Surprise me', 'Add sparkle' ] ) {
		const row = rows.find( ( r ) => r.rowId.toLowerCase().includes( word.toLowerCase() ) );
		assert.ok( row, `${ word } has no missing-features row` );
		assert.deepEqual( Object.keys( row ).sort(), [ 'construct', 'draftId', 'from', 'key', 'line', 'mainFlow', 'rowId', 'why' ] );
	}
	assert.ok( rows.some( ( r ) => r.rowId.includes( 'buybox-gift-note' ) && 'buy' === r.mainFlow ), 'the gift note is a missing row on the buy flow' );
} );

test( 'MUST FAIL: nothing is silently lost: every read unit lands in a part', () => {
	const rec = record();
	for ( const s of rec.surfaces ) {
		const placed = s.parts.reduce( ( n, p ) => n + p.units, 0 );
		const claimed = s.parts.filter( ( p ) => 'filter-result-count' === p.id ).reduce( ( n, p ) => n + p.units, 0 );
		const dropped = surfaces().find( ( x ) => x.kind === s.kind ).units.filter( ( u ) => 'filter' === s.kind && 'text' === u.kind ).length - claimed;
		assert.equal( placed, s.units - dropped, `${ s.kind }: ${ s.units } units read, ${ dropped } text runs a control-only surface ignores, ${ placed } placed` );
	}
	assert.equal( rec.counts.parts, rec.counts.mapped + rec.counts.missing + rec.counts.elsewhere );
	assert.ok( rec.counts.hinted > 0 && rec.counts.unmatched > 0 );
} );

test( 'MUST FAIL: a draft whose add control only sets a scalar has no buy box, and a drawer with no basket loop is not a drawer', () => {
	const noAdd = DRAFT.replaceAll( 'M.cart.add(', 'this.setState(' );
	assert.match( surfaces( noAdd ).find( ( s ) => 'buybox' === s.kind ).problem, /holds no buybox region the reader recognises by its structure/ );
	const noEdit = DRAFT.replace( 'rm: () => M.cart.remove(it.id)', 'rm: () => this.setState({ glow: false })' );
	assert.match( surfaces( noEdit ).find( ( s ) => 'drawer' === s.kind ).problem, /holds no drawer region/ );
	const noTotal = DRAFT.replace( 'subText: money(M.cart.total)', 'subText: M.cart.total' );
	assert.match( surfaces( noTotal ).find( ( s ) => 'drawer' === s.kind ).problem, /holds no drawer region/ );
	const noListing = DRAFT.replace( /<dc-import name="Card"[^>]*><\/dc-import>/g, '<span>{{ p.name }}</span>' );
	assert.match( surfaces( noListing ).find( ( s ) => 'filter' === s.kind ).problem, /holds no filter region/ );
} );

test( 'a setting the framework DB does not hold is refused', () => {
	const env = envFor( vocabFile );
	env.attrs[ 'sgs/cart' ].delete( 'checkoutLabel' );
	assert.throws( () => resolveVocab( vocabFile, env ), ( e ) => e instanceof ShopPartsError && /drawer-checkout: no sgs\/cart attribute matches \^checkoutLabel\$/.test( e.message ) );
} );

test( 'a block the framework DB does not hold, and a template that lost a block, are refused', () => {
	const env = envFor( vocabFile );
	delete env.attrs[ 'sgs/buybox' ];
	assert.throws( () => resolveVocab( vocabFile, env ), /the framework DB holds no block sgs\/buybox/ );
	const env2 = envFor( vocabFile );
	env2.files[ 'theme/sgs-theme/templates/archive-product.html' ] = '';
	assert.throws( () => resolveVocab( vocabFile, env2 ), /archive-product\.html holds no wp:woocommerce\/catalog-sorting/ );
} );

test( 'MUST FAIL: a duplicate id, an unknown rule, an entry nothing can reach, and an entry no draft matches are refused', () => {
	const twice = { ...vocabFile, entries: [ ...vocabFile.entries, { ...vocabFile.entries[ 0 ] } ] };
	assert.throws( () => resolveVocab( twice, envFor( twice ) ), /buybox-sticky-bar: the id is used by an earlier entry/ );
	const odd = { ...vocabFile, entries: vocabFile.entries.map( ( e ) => ( 'filter-sort' === e.id ? { ...e, rule: 'looks-like-sort' } : e ) ) };
	assert.throws( () => resolveVocab( odd, envFor( odd ) ), /filter-sort: no structural rule looks-like-sort/ );
	const bare = { ...vocabFile, entries: vocabFile.entries.map( ( e ) => ( 'buybox-rating' === e.id ? { ...e, hints: [] } : e ) ) };
	assert.throws( () => resolveVocab( bare, envFor( bare ) ), /buybox-rating: names neither a rule nor a hint/ );
	const stale = { ...vocabFile, entries: [ ...vocabFile.entries, { id: 'buybox-engraving', surface: 'buybox', label: 'Engraving', hints: [ { text: 'engrav' } ], home: { type: 'missing', reason: 'none' } } ] };
	assert.throws( () => resolveVocab( stale, envFor( stale, [ surfaces() ] ) ), /buybox-engraving: its rule and hints match no unit of any draft read/ );
} );

test( 'a surface the reader cannot find stays in the record with its problem', () => {
	const rec = buildRecord( { client: 'planted', surfaces: readShopSurfaces( { records: [], sources: {} } ), vocab: resolveVocab( vocabFile, envFor( vocabFile ) ) } );
	assert.equal( rec.counts.problems, 3 );
	assert.ok( rec.surfaces.every( ( s ) => s.problem && 0 === s.parts.length ) );
} );

// The committed drafts' surfaces, as shop-parts.mjs reads them.
const clientSurfaces = ( client ) => {
	const dir = path.join( REPO, 'sites', client, 'handoff' );
	const records = JSON.parse( fs.readFileSync( path.join( dir, 'surfaces.json' ), 'utf8' ) ).records;
	const sources = Object.fromEntries( fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '.dc.html' ) ).map( ( f ) => [ f, fs.readFileSync( path.join( dir, f ), 'utf8' ) ] ) );
	return readShopSurfaces( { records, sources } );
};
const shape = ( rec ) => ( { counts: rec.counts, parts: rec.surfaces.flatMap( ( s ) => s.parts.map( ( p ) => [ s.kind, p.id, p.home.type, p.units, p.by.join( '+' ), JSON.stringify( p.write ), p.locators.join( ' ' ) ] ) ) } );

test( 'MUST FAIL: the committed client records are what the structural reader and matcher produce from the committed drafts', () => {
	const clients = [ 'eye-care-ward-end', 'mamas-munches-redesign' ];
	const all = clients.map( clientSurfaces );
	const vocab = resolveVocab( vocabFile, envFor( vocabFile, all ) );
	clients.forEach( ( client, i ) => {
		const committed = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', client, 'build', 'shop-parts.json' ), 'utf8' ) );
		assert.deepEqual( shape( buildRecord( { client, surfaces: all[ i ], vocab } ) ), shape( committed ), client );
	} );
} );

test( 'MUST FAIL: the basket drawer\'s link to the basket page writes the draft\'s own words as the cart block\'s view-basket label (negative control: no link, no write)', () => {
	const withLink = DRAFT.replace( '<button onClick="{{ sparkle }}">Add sparkle</button>', '<a href="Basket.dc.html">View full basket</a><button onClick="{{ sparkle }}">Add sparkle</button>' );
	const sources = { 'Page.dc.html': withLink, 'Checkout.dc.html': CHECKOUT, 'Basket.dc.html': '<x-dc><main>Your basket</main></x-dc>' };
	const rec = buildRecord( { client: 'planted', surfaces: readShopSurfaces( { records: RECORDS, sources }, ), vocab: resolveVocab( vocabFile, envFor( vocabFile ) ) } );
	assert.deepEqual( part( rec, 'drawer', 'drawer-view-basket' ).write, { panelShowViewCart: true, viewCartLabel: 'View full basket' } );
	assert.equal( part( record(), 'drawer', 'drawer-view-basket' ), undefined, 'a drawer with no basket link has no such part' );
} );
