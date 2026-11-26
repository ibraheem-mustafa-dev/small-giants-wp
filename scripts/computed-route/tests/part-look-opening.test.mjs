// How part-look opens a surface no client file describes (lib/part-look-opening.mjs): the basket drawer through the draft's own
// documented overlay states (the hand-off record's `how_to_reach`), filled and emptied, and the shop's header and account surfaces
// read by the Fill surface part-look reads them on (lib/fill-part-look-modes.mjs). Tests marked MUST FAIL fail without the code
// they name. Planted records and probes; no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseEmptied, chooseOpenings, documentedOpenings, isScript, pinsOf, visitorAtEveryWidth, visitorOpening } from '../lib/part-look-opening.mjs';
import { openPage } from '../lib/part-look-run.mjs';
import { serveDraft } from '../lib/draft.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { partLookSurfacesFor, readLocators } from '../lib/fill-part-look-modes.mjs';
import { derivedConfig, guardRead, refusalOf } from '../part-look.mjs';

const BAG = { id: 'S-24', kind: 'drawer', route: '*', states: [
	{ name: 'closed', how_to_reach: 'L.setState({bagOpen:false})' },
	{ name: 'open, empty', how_to_reach: 'L.setState({bagOpen:true, bag:[]})' },
	{ name: 'open, with items', how_to_reach: 'L.setState({bagOpen:true, bag:[{pid:5,size:\'M\',lens:null}]})' },
] };

test( 'MUST FAIL: a state\'s step is code only when it compiles and calls or sets something', () => {
	assert.equal( isScript( 'MM.cart.clear(); dcLogic(\'SiteHeader\').setState({ basket: true })' ), true );
	assert.equal( isScript( 'L.setState({bagOpen:true})' ), true );
	for ( const prose of [ 'Default', 'Add an item, then open', 'Sign in, or L.setState({page:\'account\'})', 'Tick "This is a gift" (MM.cart.setGift({ on: true }))', '', null, 'bagOpen' ] ) {
		assert.equal( isScript( prose ), false, prose );
	}
} );

test( 'MUST FAIL: the openings are the code steps of the draft\'s site-wide overlays, once each', () => {
	const records = [
		BAG,
		{ id: 'S-05', kind: 'drawer', route: '*', states: [ { name: 'open', how_to_reach: 'L.setState({bagOpen:true, bag:[]})' }, { name: 'shut', how_to_reach: 'Default' } ] },
		{ id: 'S-17', kind: 'drawer', route: 'shop', states: [ { name: 'open', how_to_reach: 'L.setState({filters:true})' } ] },
		{ id: 'S-41', kind: 'page', route: '*', states: [ { name: 'default', how_to_reach: 'L.setState({page:\'signin\'})' } ] },
		{ id: 'S-04', kind: 'drawer', states: [ { name: 'open, empty', how_to_reach: 'MM.cart.clear(); dcLogic(\'SiteHeader\').setState({ basket: true })' } ] },
	];
	assert.deepEqual( documentedOpenings( records ).map( ( o ) => `${ o.record } ${ o.state }` ), [ 'S-24 closed', 'S-24 open, empty', 'S-24 open, with items', 'S-04 open, empty' ], 'one route\'s drawer, a page, prose and a repeated step are not tried' );
} );

const DRAWER = { tpl: '1193', host: null };
const probe = ( label, located, extra = {} ) => ( { label, script: label, located, stamps: located.includes( 'panel' ) ? { panel: DRAWER } : {}, ...extra } );

test( 'MUST FAIL: the filled drawer is the read locating the panel with the most parts; the emptied one is the same drawer pinned', () => {
	const probes = [
		probe( 'load', [ 'trigger', 'badge' ] ),
		probe( 'closed', [ 'trigger' ] ),
		probe( 'empty', [ 'panel', 'panelHead', 'emptyMessage' ] ),
		probe( 'items', [ 'panel', 'panelHead', 'item', 'item-price', 'subtotal', 'checkout' ] ),
		probe( 'broken', [ 'panel', 'item', 'subtotal', 'checkout', 'a', 'b', 'c' ], { error: 'L is undefined' } ),
	];
	const got = chooseOpenings( probes, [ 'panel' ] );
	assert.deepEqual( [ got.init, got.evidence ], [ 'items', 'filled: items (6 parts)' ] );
	assert.deepEqual( pinsOf( { drawer: 'panel' }, got.filled ), { drawer: DRAWER }, 'the emptied tries pin the drawer to the panel of the filled read' );
	assert.equal( pinsOf( { drawer: 'panel' }, { stamps: {} } ), null, 'an unstamped panel pins nothing, so no emptied read is tried' );
	// Pinned to that drawer, the emptied step adds its empty parts; a configurator overlay pinned to the drawer shows nothing new.
	const pinned = [ probe( 'recommending', [ 'panel', 'emptyMessage', 'emptyCta', 'emptyBody', 'subtotal', 'checkout' ] ), probe( 'empty', [ 'panel', 'emptyMessage', 'emptyCta' ] ), probe( 'configurator', [] ), probe( 'other', [ 'item', 'zzz' ] ), probe( 'items', [ 'q', 'r' ] ), probe( 'bad', [ 'x' ], { error: 'boom' } ) ];
	assert.deepEqual( chooseEmptied( pinned, got.filled, [ 'item' ] ), { empty: 'empty', evidence: 'emptied: empty (2 more parts)' }, 'the barest read adding parts; one still drawing an item line is no emptied read' );
	assert.equal( chooseEmptied( [ probe( 'a', [ 'panel', 'emptyMessage' ] ), probe( 'b', [ 'emptyCta', 'emptyBody' ] ) ], got.filled ).empty, 'b', 'equally bare: the one adding more parts' );
	assert.equal( chooseEmptied( [ probe( 'same', [ 'panel', 'item' ] ) ], got.filled ), null, 'a step adding no part is no emptied read' );
	// A drawer open at load (the store seeds it) needs no step: init stays null.
	assert.equal( chooseOpenings( [ { ...probe( 'x', [ 'panel', 'item', 'subtotal' ] ), script: null }, probe( 'emptied', [ 'panel' ] ) ], [ 'panel' ] ).init, null );
} );

test( 'MUST FAIL: a draft whose documented states never show the panel is refused with what was tried', () => {
	const got = chooseOpenings( [ probe( 'the page as it loads', [ 'trigger' ] ), probe( 'S-24 "closed"', [ 'trigger' ] ), probe( 'S-24 "open"', [ 'panel' ], { error: 'boom' } ) ], [ 'panel' ] );
	assert.equal( got.init, undefined );
	assert.match( got.why, /no documented state of the draft shows its panel \(tried 3: the page as it loads; S-24 "closed"; S-24 "open"\)/ );
} );

test( 'MUST FAIL: the header\'s drawer and the account views apply to the Fill surface part-look reads them on, never another', () => {
	const L = readLocators();
	const rec = ( index, name ) => ( { index, name, node: {} } );
	const wanted = ( nodes, surfaceKey, template = null ) => partLookSurfacesFor( { locators: L, template, nodes, surfaceKey } ).map( ( w ) => w.surface );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/cart' ) ], 'header' ), [ 'header' ] );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/account' ) ], 'my-account' ), [ 'my-account', 'my-account-in' ] );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/cart' ) ], 'footer' ), [], 'a basket placed on another surface is not read as the header\'s drawer' );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/account' ) ], 'template-page-my-account', 'page' ), [] );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/container' ) ], 'header' ), [], 'a header with no basket block reads no drawer' );
} );

test( 'MUST FAIL: with derive, a one-file draft surface opens on the route intake read for it, so it is no longer refused', () => {
	const cfg = derivedConfig( { derive: true, given: {}, entry: {}, draftRoute: 'signin' } );
	assert.deepEqual( cfg, { route: 'signin' } );
	assert.equal( refusalOf( { surface: 'my-account', draftRoute: 'signin', cfg } ), null );
	assert.match( refusalOf( { surface: 'my-account', draftRoute: 'signin', cfg: derivedConfig( { derive: false, draftRoute: 'signin' } ) } ), /names no route for this surface/, 'the standalone command still asks for the client file' );
	assert.deepEqual( derivedConfig( { derive: true, given: { route: 'account', init: 'x()' }, draftRoute: 'signin' } ), { route: 'account', init: 'x()' }, 'the route the client names wins' );
	assert.deepEqual( derivedConfig( { derive: true, draftRoute: 'Product.dc.html?id=zookies' } ), {}, 'a page file needs no route' );
	assert.deepEqual( derivedConfig( { derive: true, draftRoute: '*' } ), {} );
	assert.deepEqual( derivedConfig( { derive: true, entry: { noDraft: 'woo page' }, draftRoute: 'cart' } ), {} );
} );

test( 'MUST FAIL: the visitor\'s way in adds on the product page, then presses the basket button the page shows at load', () => {
	const load = { stamps: { trigger: { tpl: '88', host: 'Shop Root' } } };
	const adds = [ { dc: 'Shop Root', tpl: '396' } ];
	assert.deepEqual( visitorOpening( { adds, load, product: { file: 'Shop.dc.html', route: 'product' } } ), {
		label: 'add to the basket on the product page, then the basket button', script: null, file: 'Shop.dc.html', route: 'product',
		clicks: [ { tpl: '396', hosts: [ 'Shop Root' ] }, { tpl: '396', hosts: [ 'Shop Root' ] }, { tpl: '88', host: 'Shop Root' } ],
	} );
	assert.equal( visitorOpening( { adds, load, product: { file: 'Product.dc.html' } } ).route, null, 'a product page file needs no route' );
	// Negative controls: no located add control, no basket button at load, no product page.
	assert.equal( visitorOpening( { adds: [], load, product: { file: 'P.dc.html' } } ), null );
	assert.equal( visitorOpening( { adds, load: { stamps: {} }, product: { file: 'P.dc.html' } } ), null );
	assert.equal( visitorOpening( { adds, load, product: null } ), null );
} );

test( 'MUST FAIL: a read showing item lines is the filled drawer, even when a read of the empty drawer locates more parts', () => {
	const probes = [ probe( 'documented with items', [ 'panel', 'emptyMessage', 'emptyBody', 'emptyCta', 'subtotal', 'a', 'b', 'c' ] ), probe( 'visitor', [ 'panel', 'item', 'item-price', 'subtotal' ] ) ];
	assert.equal( chooseOpenings( probes, [ 'panel' ], [ 'item' ] ).filled.label, 'visitor' );
	assert.equal( chooseOpenings( [ probes[ 0 ] ], [ 'panel' ], [ 'item' ] ).filled.label, 'documented with items', 'with no read showing items, the panel with the most parts' );
	assert.equal( chooseOpenings( probes, [ 'panel' ] ).filled.label, 'documented with items', 'a group naming no filled part counts parts only' );
} );

test( 'MUST FAIL: the visitor\'s clicks reach a control stamped Root on the served page, and fail where the control is hidden', async () => {
	const fixtures = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'fixtures', 'part-look' );
	// The shop parts record locates the add control in the product page's own component ("Product/108"); the page stamps it Root.
	const way = visitorOpening( { adds: [ { dc: 'Product', tpl: '108' } ], load: { stamps: { trigger: { tpl: '44', host: 'Root' } } }, product: { file: 'Product.dc.html' } } );
	assert.deepEqual( way.clicks[ 0 ], { tpl: '108', hosts: [ 'Root', 'Product' ] } );
	assert.deepEqual( visitorOpening( { adds: [ { dc: 'ProductCard', tpl: '7' } ], load: { stamps: { trigger: { tpl: '44', host: 'Root' } } }, product: { file: 'Product.dc.html' } } ).clicks[ 0 ].hosts, [ 'ProductCard' ], 'a control of another component keeps its own name' );
	const { chromium } = await loadChromium();
	const served = await serveDraft( fixtures, { index: 'visitor-click.html' } );
	const browser = await chromium.launch( { headless: true } );
	try {
		const url = `${ served.url }visitor-click.html`;
		const wide = await openPage( browser, { url, width: 1440, config: { clicks: way.clicks } } );
		assert.deepEqual( await wide.page.evaluate( () => [ document.body.dataset.adds, document.body.dataset.opened ] ), [ '2', 'yes' ], 'added twice, then the basket opened' );
		await wide.ctx.close();
		// The basket button is hidden on a phone: the open fails there, and the visitor's way in is not taken.
		await assert.rejects( openPage( browser, { url, width: 375, config: { clicks: way.clicks } } ), /no shown element stamped Root\/44 to click/ );
	} finally {
		await browser.close();
		await served.close();
	}
} );

test( 'MUST FAIL: the visitor\'s way in counts only when it opens at every width, and a failed read refuses only its own surface', async () => {
	assert.deepEqual( visitorAtEveryWidth( [ { label: '1440', located: [ 'panel' ] }, { label: '768' }, { label: '375' } ] ), { probe: { label: '1440', located: [ 'panel' ] } } );
	assert.match( visitorAtEveryWidth( [ { label: '1440' }, { label: '768' }, { label: '375', error: 'no shown element stamped Root/44 to click' } ] ).why, /does not open at every width: no shown element stamped Root\/44/ );
	assert.match( visitorAtEveryWidth( [] ).why, /it was not tried/ );
	const refusals = [];
	const guarded = guardRead( { derive: true, surface: 'header', refusals } );
	assert.equal( await guarded( async () => {
		throw new Error( 'no shown element stamped Root/44 to click\nstack' );
	} ), null );
	assert.deepEqual( refusals, [ 'header: the draft read failed, so none of its settings is decided: no shown element stamped Root/44 to click' ] );
	assert.deepEqual( await guarded( async () => ( { reads: {} } ) ), { reads: {} } );
	await assert.rejects( guardRead( { derive: false, surface: 'header', refusals } )( async () => {
		throw new Error( 'boom' );
	} ), /boom/, 'the standalone command still stops on a failed read' );
} );
