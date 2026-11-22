// Part-look decides the product card's show switches from the parts the draft's card draws (shop investigation F-33, MERGED.md):
// showSwatches, showWishlist, showBrandOverlay, showSavingBadge, showAttributeTag and the per-device showDescriptionTier. The locators
// (data/part-locators.json group productcard: brand, savingBadge, wishlist, swatch, attributeTag and the narrowed tag) find each part by
// where it sits and what it is (drawn over the photo, a box or a wordmark, in the title's row), never by a class or a word; the mode
// rules (data/part-look-modes.json sgs/product-card) switch a part on where the draft draws it and off only where the card's other parts
// are located and it is absent; lib/part-look-modes.mjs::from.tiers reads a part drawn at some widths only. The drafts' two cards
// (a one-file draft's frame card, a bakery's card) are planted here in the shape the draft runtime renders them: the words of an
// element sit in a wrapper inside it. Tests marked MUST FAIL fail without the code they name. Planted pages; no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-card-switches.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateModes } from '../lib/part-look-modes.mjs';
import { READ_PROPS, findPartsInPage } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const DATA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data' );
const MODES = JSON.parse( fs.readFileSync( path.join( DATA, 'part-look-modes.json' ), 'utf8' ) ).blocks[ 'sgs/product-card' ].rules;
const LOCATORS = JSON.parse( fs.readFileSync( path.join( DATA, 'part-locators.json' ), 'utf8' ) ).groups.productcard;
const SWITCHES = [ 'showSwatches', 'showWishlist', 'showBrandOverlay', 'showSavingBadge', 'showAttributeTag', 'showDescriptionTier' ];
const ROWS = [ ...SWITCHES, 'showCta', 'showDescription', 'showRating' ].map( ( attr_name ) => ( { attr_name } ) );
const PARTS = [ 'wrapper', 'title', 'price', 'desc', 'tag', 'brand', 'savingBadge', 'wishlist', 'swatch', 'attributeTag' ];

let browser;
let page;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	page = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

// Eye Care's frame card: the photo link holds the brand wordmark (a scrim, no box) and, on a discounted product, the saving badge (a dark
// box); the heart is a wordless round button beside the link, drawn over its corner; the title sits in a row with the attribute tag;
// the price row holds the price and the struck price; the colour dots are wordless round buttons. The runtime wraps each text in a span.
const frame = ( { brand = 'Ray-Ban', save = 'Save £32', heart = true, tag = 'Polarised', dots = 3, photo = true } = {} ) => `<div class="card" style="position:relative;width:280px;border:1px solid #e6e1da;display:flex;flex-direction:column">
	<a href="#" style="display:block;position:relative;width:280px;height:280px;background:#f3f0eb">
		${ photo ? '' : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span>Photo to come</span></div>' }
		${ brand ? `<span style="position:absolute;top:0;left:0;padding:12px 14px;background:linear-gradient(135deg,rgba(255,255,255,.9),rgba(255,255,255,0));text-transform:uppercase"><span>${ brand }</span></span>` : '' }
		${ save ? `<span style="position:absolute;bottom:12px;left:12px;background:#141414;color:#faf8f5;padding:6px 10px"><span>${ save }</span></span>` : '' }
	</a>
	${ heart ? '<button aria-label="Save" style="position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid #e0dad1;padding:0"><svg width="17" height="17" viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-9.6A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.4c0 5-7 9.6-7 9.6z"></path></svg></button>' : '' }
	<div style="padding:16px;display:flex;flex-direction:column;gap:8px">
		<div style="display:flex;justify-content:space-between"><a href="#"><span>Aviator Classic</span></a>${ tag ? `<span style="border:1px solid #d8d2c8;padding:4px 7px;font-size:9px"><span>${ tag }</span></span>` : '' }</div>
		<div style="display:flex;justify-content:space-between;align-items:flex-end">
			<div style="display:flex;gap:8px"><span>£139.00</span>${ save ? '<span style="text-decoration:line-through">£171.00</span>' : '' }</div>
			<div style="display:flex;gap:5px">${ Array.from( { length: dots }, ( _, i ) => `<button aria-label="c${ i }" style="width:17px;height:17px;border-radius:50%;padding:0;background:#${ [ 'c9a14a', '111', 'aaa' ][ i % 3 ] }"></button>` ).join( '' ) }</div>
		</div>
		<button>View product</button>
	</div>
</div>`;

// Mama's card: the photo link holds a badge pill (a fill and a border) on some products; the title, the description, the price row with its
// note and the button follow in the one column; no brand, saving badge, heart, dots or tag. showShort hides the description.
const bakery = ( { badge = 'Gift favourite', desc = true } = {} ) => `<div class="card" style="width:300px;border:2px solid #3a2a22;display:flex;flex-direction:column">
	<a href="#" style="display:block;position:relative;width:300px;height:300px;background:#f3e6cc">
		${ badge ? `<span style="position:absolute;top:10px;left:10px;background:#f9cf6e;border:2px solid #3a2a22;padding:4px 10px;border-radius:999px"><span>${ badge }</span></span>` : '' }
	</a>
	<div style="padding:16px;display:flex;flex-direction:column;gap:6px">
		<a href="#"><span>Zookies</span></a>
		${ desc ? '<p>Soft cookies, baked fresh.</p>' : '' }
		<div style="display:flex;gap:8px"><span>from £9.50</span><span>£1.19 a cookie</span></div>
		<button>Build your box</button>
	</div>
</div>`;

const read = async ( cards, names = PARTS ) => {
	await page.setContent( `<!doctype html><body style="margin:0"><main style="display:flex;gap:20px">${ cards }</main></body>` );
	const got = await page.evaluate( findPartsInPage, { spec: LOCATORS, names, props: READ_PROPS, pages: {} } );
	return Object.fromEntries( names.map( ( n ) => [ n, ( got[ n ] || [] ).map( ( i ) => i.text ) ] ) );
};
const wide = ( list ) => ( list.length ? { 1440: list } : {} );
const readsOf = ( found ) => Object.fromEntries( Object.entries( found ).map( ( [ part, texts ] ) => [ part, wide( texts.map( ( text ) => ( { text } ) ) ) ] ) );
const run = ( reads ) => evaluateModes( { block: 'sgs/product-card', rules: MODES, rows: ROWS, reads } );
const written = ( r ) => Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.value ] ) );
const switches = ( r ) => Object.fromEntries( Object.entries( written( r ) ).filter( ( [ k ] ) => SWITCHES.includes( k ) ) );

test( 'MUST FAIL: a frame card\'s brand, saving badge, heart, colour dots and attribute tag are each found by where they sit, and the brand is no longer read as the tag', async () => {
	const got = await read( frame() + frame( { brand: 'Gucci', save: '', tag: '' } ) );
	assert.deepEqual( got.brand, [ 'Ray-Ban', 'Gucci' ] );
	assert.deepEqual( got.savingBadge, [ 'Save £32' ], 'only the discounted card draws the badge' );
	assert.equal( got.wishlist.length, 2, 'one heart a card' );
	assert.equal( got.swatch.length, 6, 'three dots a card' );
	assert.deepEqual( got.attributeTag, [ 'Polarised' ] );
	assert.deepEqual( got.tag, [], 'a wordmark on a scrim and an amount badge are not the card\'s tag' );
	assert.equal( got.desc.length, 0 );
} );

test( 'MUST FAIL: a bakery card\'s pill badge stays the tag; it draws no brand, saving badge, heart, dots or attribute tag, and its description is found', async () => {
	const got = await read( bakery() + bakery( { badge: '' } ) );
	assert.deepEqual( got.tag, [ 'Gift favourite' ] );
	assert.deepEqual( [ got.brand, got.savingBadge, got.wishlist, got.swatch, got.attributeTag ].map( ( l ) => l.length ), [ 0, 0, 0, 0, 0 ] );
	assert.equal( got.desc.length, 2 );
	assert.ok( got.title.length && got.price.length && got.wrapper.length, 'the card\'s other parts are located' );
} );

test( 'negative controls: a photo-to-come panel, a percent-free plain label in the title row, a boxed price row, a lone dot, a thumbnail strip and a worded button over the photo are none of them a part', async () => {
	// The panel covers the photo, so it is no brand wordmark.
	assert.deepEqual( ( await read( frame( { brand: '', save: '', photo: false } ) ) ).brand, [] );
	// A heart-less card has no wishlist; a worded absolute button over the photo is no heart.
	assert.deepEqual( ( await read( frame( { heart: false } ) ) ).wishlist, [] );
	assert.deepEqual( ( await read( frame( { heart: false } ).replace( '</a>\n', '<button style="position:absolute;top:8px;right:8px;width:36px;height:36px;padding:0">Quick</button></a>\n' ) ) ).wishlist, [] );
	// A wordless round drawing-button drawn below the photo (a compare icon in the price row) is no heart.
	assert.deepEqual( ( await read( frame( { heart: false } ).replace( '<button>View product</button>', '<button aria-label="Compare" style="position:absolute;bottom:8px;right:8px;width:36px;height:36px;border-radius:50%;padding:0"><svg width="17" height="17"><path d="M0 0h10v10z"></path></svg></button><button>View product</button>' ) ) ).wishlist, [] );
	// One dot is a lone control, not a row of dots; a row of picture thumbnails is no dots.
	assert.deepEqual( ( await read( frame( { dots: 1 } ) ) ).swatch, [] );
	const thumbs = frame( { dots: 0 } ).replace( '<div style="display:flex;gap:5px"></div>', `<div style="display:flex;gap:5px">${ '<button style="width:17px;height:17px;padding:0"><img alt="" width="15" height="15" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></button>'.repeat( 3 ) }</div>` );
	assert.deepEqual( ( await read( thumbs ) ).swatch, [] );
	// A plain (unboxed) label beside the title is no attribute tag; a boxed price row is none either.
	assert.deepEqual( ( await read( frame( { tag: '' } ).replace( '</a></div>', '</a><span>Plain</span></div>' ) ) ).attributeTag, [] );
	assert.deepEqual( ( await read( frame( { tag: '' } ).replace( '<div style="display:flex;gap:8px"><span>£139.00', '<div style="display:flex;gap:8px;border:1px solid #000"><span>£139.00' ) ) ).attributeTag, [] );
	// An attribute-less bakery card (the description beside the title is plain words) draws no tag.
	assert.deepEqual( ( await read( bakery() ) ).attributeTag, [] );
} );

test( 'MUST FAIL: a percent badge is a saving badge and a boxed label without an amount over the photo is not', async () => {
	assert.deepEqual( ( await read( frame( { save: '-20%' } ) ) ).savingBadge, [ '-20%' ] );
	assert.deepEqual( ( await read( frame( { save: '20% off' } ) ) ).savingBadge, [ '20% off' ] );
	assert.deepEqual( ( await read( frame( { save: 'New in' } ) ) ).savingBadge, [], 'a box of plain words is the tag' );
	assert.deepEqual( ( await read( frame( { save: 'New in' } ) ) ).tag, [ 'New in' ] );
	// A plain label that is not laid over the photo (no position of its own) is the tag, not the brand.
	const flat = bakery().replace( 'position:absolute;top:10px;left:10px;background:#f9cf6e;border:2px solid #3a2a22;padding:4px 10px;border-radius:999px', 'padding:4px 10px' );
	const plain = await read( flat );
	assert.deepEqual( [ plain.tag, plain.brand ], [ [ 'Gift favourite' ], [] ] );
} );

test( 'MUST FAIL: the frame card switches heart, dots, brand, saving badge and attribute tag on; the bakery card switches them off', async () => {
	const eye = switches( run( readsOf( await read( frame() + frame( { brand: 'Gucci', save: '', tag: '' } ) ) ) ) );
	assert.deepEqual( eye, { showSwatches: true, showWishlist: true, showBrandOverlay: true, showSavingBadge: true, showAttributeTag: true } );
	const mama = switches( run( readsOf( await read( bakery() + bakery( { badge: '' } ) ) ) ) );
	assert.deepEqual( mama, { showSwatches: false, showWishlist: false, showBrandOverlay: false, showSavingBadge: false, showAttributeTag: false } );
} );

test( 'negative controls: a switch is never written off without the card\'s other parts, and a part drawn on only some cards keeps its switch on', async () => {
	// No title or price located (a failed read): nothing is switched off, however many parts are absent.
	const broken = run( { wrapper: wide( [ { text: 'x' } ] ) } );
	assert.deepEqual( switches( broken ), {} );
	assert.equal( broken.settings.showWishlist.code, 'neighboursNotFound' );
	// Nothing located at all: nothing written.
	assert.deepEqual( written( run( {} ) ), {} );
	// One card of two draws a heart: the switch is on.
	assert.equal( written( run( readsOf( await read( frame() + frame( { heart: false } ) ) ) ) ).showWishlist, true );
	// A part drawn at one width only still counts as drawn.
	const narrow = { wrapper: wide( [ { text: '' } ] ), title: wide( [ { text: 't' } ] ), price: wide( [ { text: '£1' } ] ), wishlist: { 375: [ { text: '' } ] } };
	assert.equal( written( run( narrow ) ).showWishlist, true );
} );

test( 'MUST FAIL: a description shown on desktop and tablet and hidden on a phone writes the per-device switch; widths alike write none', () => {
	const at = ( w, list ) => ( { [ w ]: list } );
	const card = { wrapper: { 1440: [ { text: '' } ], 768: [ { text: '' } ], 375: [ { text: '' } ] } };
	const desc = { 1440: [ { text: 'd' } ], 768: [ { text: 'd' } ] };
	const r = run( { ...card, desc } );
	assert.deepEqual( written( r ).showDescriptionTier, { desktop: 'on', mobile: 'off' } );
	assert.equal( written( r ).showDescription, true, 'the plain switch still says the description shows' );
	assert.match( r.writes.find( ( w ) => 'showDescriptionTier' === w.attr ).evidence, /draws desc on at desktop, on at tablet, off at mobile/ );
	// Hidden on desktop and tablet, shown on a phone: the first tier always writes, the phone differs from the tablet above it.
	assert.deepEqual( written( run( { ...card, desc: at( 375, [ { text: 'd' } ] ) } ) ).showDescriptionTier, { desktop: 'off', mobile: 'on' } );
	// Hidden from tablet down.
	assert.deepEqual( written( run( { ...card, desc: at( 1440, [ { text: 'd' } ] ) } ) ).showDescriptionTier, { desktop: 'on', tablet: 'off' } );
	// Negative controls: shown at every width, hidden at every width, and a width the card was not read at write nothing.
	const all = { 1440: [ { text: 'd' } ], 768: [ { text: 'd' } ], 375: [ { text: 'd' } ] };
	assert.equal( run( { ...card, desc: all } ).settings.showDescriptionTier.code, 'same' );
	assert.equal( run( { ...card } ).settings.showDescriptionTier.code, 'same' );
	assert.equal( run( { wrapper: { 1440: [ { text: '' } ], 768: [ { text: '' } ] }, desc: at( 1440, [ { text: 'd' } ] ) } ).settings.showDescriptionTier.code, 'neighboursNotFound' );
	assert.equal( written( run( { ...card, desc: all } ) ).showDescriptionTier, undefined );
} );

test( 'every card switch the route decides has a rule and a locator, and no rule writes a content value the route cannot see', () => {
	for ( const attr of SWITCHES ) {
		assert.ok( MODES.some( ( r ) => r.setting === attr ), `${ attr } has a rule` );
	}
	for ( const part of [ 'brand', 'savingBadge', 'wishlist', 'swatch', 'attributeTag' ] ) {
		assert.ok( LOCATORS.parts[ part ], `${ part } has a locator` );
		const rules = MODES.filter( ( r ) => r.whenFound === part || r.whenAbsent === part );
		assert.deepEqual( rules.map( ( r ) => r.value ).sort(), [ false, true ], `${ part } switches on where found and off where absent` );
		assert.deepEqual( rules.find( ( r ) => false === r.value ).neighbours, [ 'wrapper', 'title', 'price' ], `${ part } is switched off only with the card's other parts located` );
	}
	assert.ok( ! MODES.some( ( r ) => [ 'brandName', 'savingLabel', 'attributeTagTerm', 'attributeTagTaxonomy' ].includes( r.setting ) ), 'the brand\'s words, the badge\'s words and the tag\'s term are the catalogue\'s, not the route\'s' );
	// The locators name no class, selector or word (a comment is no locator).
	const bare = JSON.stringify( [ 'brand', 'savingBadge', 'wishlist', 'swatch', 'attributeTag' ].map( ( p ) => LOCATORS.parts[ p ] ), ( k, v ) => ( '_comment' === k ? undefined : v ) );
	assert.doesNotMatch( bare, /"(?:class|selector)"|\.sgs-|polaris|heart|brand-/i );
} );
