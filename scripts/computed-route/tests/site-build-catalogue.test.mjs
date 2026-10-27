// Spec 48 FR-48-92, FR-48-55: the catalogue step of the site build (lib/site-build-catalogue.mjs) planned from a site
// state, the read PHP writing nothing, the id record in catalogue.json, and a draft product link resolving to the
// catalogue product's address (lib/draft-link.mjs). Each test fails when its mechanism breaks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { PHOTO_TO_COME, catalogueImages, planCatalogue, recordSite, runCatalogue, tallyCatalogue } from '../lib/site-build-catalogue.mjs';
import { catalogueApplyPhp, catalogueStatePhp } from '../lib/site-build-catalogue-php.mjs';
import { linkContext, resolveDraftLink, linkWrite } from '../lib/draft-link.mjs';
import { repoWith } from './fixtures/catalogue/repo.mjs';

const ROWS = [ { route: 'Shop.dc.html', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'Item.dc.html', slug: 'product', postType: 'product', collection: 'live', template: 'single-product' } ];
const setup = () => {
	const repo = repoWith( 'shared' );
	const { catalogue } = readCatalogue( { repo, client: 'demo', rows: ROWS } );
	fs.mkdirSync( path.join( repo, 'sites', 'demo', 'build' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( catalogue, null, 2 ) }\n` );
	return { repo, catalogue };
};
const site = ( products = [], extra = {} ) => ( { woocommerce: true, products, images: {}, productBase: 'product', brandTaxonomy: true, plugins: [], ...extra } );
const found = ( p, extra = {} ) => ( { draftId: p.draftId, id: 40, how: 'sku', fixture: false, type: p.type, status: 'publish', sku: p.sku, price: String( p.price ), image: 7, gallery: p.gallery.length, categories: p.categories, brand: p.brand ? [ p.brand ] : [], rrp: null === p.rrp ? '' : String( p.rrp ), draftMeta: p.draftId, attributes: Object.keys( p.facets ).map( ( k ) => `pa_${ k }` ), facets: p.facets, variations: p.variations.map( ( v ) => v.sku ), permalink: `https://x.test/product/${ p.slug }/`, ...extra } );

test( 'an empty site plans a create per product; a complete one plans nothing to make', () => {
	const { catalogue } = setup();
	const empty = planCatalogue( catalogue, site( catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	assert.deepEqual( tallyCatalogue( empty ), { create: 3, complete: 0, exists: 0, left: 0 } );
	assert.match( empty.actions[ 0 ].say, /create jar \(sgs-draft-jar\) variable "Honey Jar" at \/product\/honey-jar\/: price 4, 4 variations of Pack size \(6\/12\) x Grain/ );
	const full = planCatalogue( catalogue, site( catalogue.products.map( ( p ) => found( p ) ) ) );
	assert.deepEqual( tallyCatalogue( full ), { create: 0, complete: 0, exists: 3, left: 0 } );
	assert.equal( full.productBase, null );
} );

test( 'a found product lacking a price, an image, a variation or its draft id is completed with exactly those', () => {
	const { catalogue } = setup();
	const [ jar, box ] = catalogue.products;
	const plan = planCatalogue( catalogue, site( [ found( jar, { variations: jar.variations.slice( 1 ).map( ( v ) => v.sku ) } ), found( box, { price: '', image: 0, draftMeta: '', how: 'slug', sku: 'OTHER' } ) ] ) );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.draftId, a.action ] ), [ [ 'jar', 'complete' ], [ 'box', 'complete' ], [ 'voucher', 'create' ] ] );
	assert.match( plan.actions[ 0 ].say, /lacks 1 of 4 variations$/ );
	assert.match( plan.actions[ 1 ].say, /found by slug\) lacks price 12, image, its draft id$/ );
} );

test( 'a product found by slug that has its own variations keeps them; one with none gets the catalogue\'s', () => {
	const { catalogue } = setup();
	const jar = catalogue.products[ 0 ];
	const own = planCatalogue( catalogue, site( [ found( jar, { sku: 'SEEDED', how: 'slug', variations: [ 'SEEDED-a' ] } ) ] ) );
	assert.equal( own.actions[ 0 ].action, 'exists' );
	const none = planCatalogue( catalogue, site( [ found( jar, { sku: 'SEEDED', how: 'slug', variations: [] } ) ] ) );
	assert.match( none.actions[ 0 ].say, /4 of 4 variations/ );
} );

test( 'a fixture or calibration product is left; a dropped product is not planned; a site without WooCommerce stops', () => {
	const { catalogue } = setup();
	const plan = planCatalogue( { ...catalogue, dropped: [ 'voucher' ] }, site( [ found( catalogue.products[ 0 ], { fixture: true, how: 'slug' } ), { draftId: 'box', id: 0 } ] ) );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.draftId, a.action ] ), [ [ 'jar', 'left' ], [ 'box', 'create' ] ] );
	assert.ok( plan.notes.some( ( n ) => /fixture or calibration product, left/.test( n ) ) );
	assert.deepEqual( planCatalogue( catalogue, { woocommerce: false } ).problems, [ 'the site has no active WooCommerce' ] );
} );

test( 'the product base the catalogue names is planned when the site differs; plugin notes say whether a gap stands', () => {
	const { catalogue } = setup();
	const plan = planCatalogue( { ...catalogue, productBase: 'goods' }, site( [], { productBase: '' } ) );
	assert.deepEqual( plan.productBase, { from: 'product', to: 'goods' } );
	assert.ok( plan.notes.some( ( n ) => /no subscriptions plugin is active.*switch gap\(s\) of jar stand/.test( n ) ) );
	assert.ok( plan.notes.some( ( n ) => /no gift-card plugin is active.*open-amount gap\(s\) of voucher stand/.test( n ) ) );
	const withPlugin = planCatalogue( catalogue, site( [], { plugins: [ 'woocommerce-subscriptions/woocommerce-subscriptions.php' ] } ) );
	assert.ok( withPlugin.notes.some( ( n ) => /woocommerce-subscriptions\.php is active/.test( n ) ) );
} );

test( 'the read PHP writes nothing; the apply PHP publishes last and writes the pack meta', () => {
	const { repo, catalogue } = setup();
	const images = catalogueImages( repo, catalogue );
	assert.deepEqual( Object.keys( images ).sort(), [ PHOTO_TO_COME, 'sites/demo/handoff/assets/box.svg', 'sites/demo/handoff/assets/card.svg', 'sites/demo/handoff/assets/jar-side.svg', 'sites/demo/handoff/assets/jar.svg' ] );
	assert.equal( images[ 'sites/demo/handoff/assets/jar.svg' ].sha.length, 64 );
	const read = catalogueStatePhp( catalogue.products.map( ( p ) => ( { draftId: p.draftId, sku: p.sku, slug: p.slug } ) ), images );
	assert.doesNotMatch( read, /update_|wp_insert|wp_set_|->save\(|delete_|wp_update|set_post_thumbnail|media_sideload/ );
	const write = catalogueApplyPhp( [], images, {}, null );
	// A new product is saved as a draft and published only after its variations and image exist (the preflight gate).
	assert.match( write, /\$wc->set_status\( 'draft' \)/ );
	assert.ok( write.indexOf( "'post_status' => 'publish'" ) > write.indexOf( 'WC_Product_Variable::sync' ) );
	assert.match( write, /_sgs_unit_divisor/ );
	assert.match( write, /_sgs_pack_size_axis/ );
} );

test( 'a dry run reads once and writes nothing; an apply that leaves work fails and still records what exists', () => {
	const { repo, catalogue } = setup();
	const calls = [];
	const runPhp = ( php ) => {
		calls.push( php );
		return JSON.stringify( site( catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	};
	const out = [];
	assert.equal( runCatalogue( { repo, client: 'demo', site: 's', runPhp, apply: false, log: ( l ) => out.push( l ), error: ( l ) => out.push( l ) } ), 0 );
	assert.equal( calls.length, 1 );
	assert.ok( out.some( ( l ) => /3 to create/.test( l ) ) );
	const applyCalls = [];
	const applyPhp = ( php ) => {
		applyCalls.push( php );
		return /\$steps =/.test( php ) ? JSON.stringify( { done: [], issues: [] } ) : JSON.stringify( site( catalogue.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	};
	assert.equal( runCatalogue( { repo, client: 'demo', site: 's', runPhp: applyPhp, apply: true, log: () => {}, error: () => {} } ), 1 );
	assert.equal( applyCalls.length, 3 );
} );

test( 'recordSite writes the site\'s product ids into catalogue.json, skipping fixtures, and keeps the file valid', () => {
	const { repo, catalogue } = setup();
	const [ jar, box ] = catalogue.products;
	assert.equal( recordSite( repo, 'demo', 'local', site( [ found( jar, { id: 11 } ), found( box, { id: 12, fixture: true } ), { draftId: 'voucher', id: 0 } ] ), catalogue ), 1 );
	const after = JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), 'utf8' ) );
	assert.deepEqual( after.sites.local.products, { jar: { id: 11, permalink: 'https://x.test/product/honey-jar/', variations: 4 } } );
	assert.deepEqual( after.products, catalogue.products );
} );

test( 'a draft product link resolves to its catalogue product; a choice query becomes the WooCommerce preselection; other queries drop; a dropped or unknown id stays a product-data handover', () => {
	const { catalogue } = setup();
	const ctx = linkContext( { rows: ROWS, catalogue } );
	assert.deepEqual( resolveDraftLink( 'Item.dc.html?id=box', ctx, { file: 'Shop.dc.html' } ), { kind: 'address', value: '/product/tea-box/', route: 'Item.dc.html' } );
	assert.equal( resolveDraftLink( 'Item.dc.html?id=jar&pack=12', ctx, { file: 'Shop.dc.html' } ).value, '/product/honey-jar/?attribute_pa_pack-size=12' );
	const gift = resolveDraftLink( 'Item.dc.html?id=jar&gift=1', ctx, { file: 'Shop.dc.html' } );
	assert.deepEqual( [ gift.value, gift.dropped ], [ '/product/honey-jar/', '?gift=1' ] );
	assert.equal( linkWrite( gift, 'Item.dc.html?id=jar&gift=1' ).handover.owner, 'behaviour' );
	assert.equal( resolveDraftLink( 'Item.dc.html?id=jar&pack=99', ctx, { file: 'Shop.dc.html' } ).dropped, '?pack=99' );
	for ( const [ href, c ] of [ [ 'Item.dc.html?id=gone', ctx ], [ 'Item.dc.html?id=box', linkContext( { rows: ROWS, catalogue: { ...catalogue, dropped: [ 'box' ] } } ) ], [ 'Item.dc.html?id=box', linkContext( { rows: ROWS } ) ] ] ) {
		const r = resolveDraftLink( href, c, { file: 'Shop.dc.html' } );
		assert.deepEqual( [ r.kind, r.owner ], [ 'unresolved', 'product-data' ] );
	}
} );

// Bean 2026-10-27: a product the draft gives no image gets the "photo to come" image, one attachment per site, marked
// `_sgs_photo_to_come`; an image the draft gives or the product already has is never replaced by it.
const imageless = ( catalogue, ids ) => ( { ...catalogue, products: catalogue.products.map( ( p ) => ( ids.includes( p.draftId ) ? { ...p, image: null } : p ) ) } );
const PTC_ID = 9;

test( 'photo to come: an imageless product is created with the placeholder and its marker; one with a draft image is not', () => {
	const { catalogue } = setup();
	const cat = imageless( catalogue, [ 'box' ] );
	const plan = planCatalogue( cat, site( cat.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	const [ jar, box ] = plan.actions;
	assert.deepEqual( [ box.image, box.photoToCome ], [ PHOTO_TO_COME, true ] );
	assert.match( box.say, /, image photo to come \(to upload\)/ );
	assert.deepEqual( [ jar.image, jar.photoToCome ], [ 'sites/demo/handoff/assets/jar.svg', false ] );
	assert.doesNotMatch( jar.say, /photo to come/ );
	assert.ok( plan.notes.some( ( n ) => /1 product\(s\) the draft gives no image get the photo-to-come image: box/.test( n ) ) );
	assert.ok( ! plan.notes.some( ( n ) => /not published until an image is set/.test( n ) ) );
	// The attachment already on the site is reused, never uploaded again.
	const held = planCatalogue( cat, site( cat.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ), { images: { [ PHOTO_TO_COME ]: PTC_ID } } ) );
	assert.match( held.actions[ 1 ].say, /, image photo to come \(attachment 9\)/ );
} );

test( 'photo to come: one placeholder upload serves every imageless product in an apply', () => {
	const { repo, catalogue } = setup();
	const cat = imageless( catalogue, [ 'jar', 'box', 'voucher' ] );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( cat, null, 2 ) }\n` );
	const images = catalogueImages( repo, cat );
	assert.equal( Object.keys( images ).filter( ( k ) => PHOTO_TO_COME === k ).length, 1 );
	assert.equal( images[ PHOTO_TO_COME ].name, 'photo-to-come.png' );
	let write = null;
	const runPhp = ( php ) => {
		if ( /\$steps =/.test( php ) ) {
			write = php;
			return JSON.stringify( { done: [], issues: [] } );
		}
		return JSON.stringify( site( cat.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	};
	runCatalogue( { repo, client: 'demo', site: 's', runPhp, apply: true, log: () => {}, error: () => {} } );
	const decode = ( name ) => JSON.parse( Buffer.from( new RegExp( `\\$${ name } = json_decode\\( base64_decode\\( '([^']+)'` ).exec( write )[ 1 ], 'base64' ).toString() );
	assert.deepEqual( decode( 'steps' ).map( ( s ) => s.image ), [ PHOTO_TO_COME, PHOTO_TO_COME, PHOTO_TO_COME ] );
	const uploads = decode( 'uploads' );
	assert.deepEqual( Object.keys( uploads ).filter( ( k ) => PHOTO_TO_COME === k ), [ PHOTO_TO_COME ] );
	assert.equal( Buffer.from( uploads[ PHOTO_TO_COME ].data, 'base64' ).subarray( 1, 4 ).toString(), 'PNG' );
} );

test( 'photo to come: a re-run over products carrying it plans nothing new', () => {
	const { catalogue } = setup();
	const cat = imageless( catalogue, [ 'jar', 'box', 'voucher' ] );
	const plan = planCatalogue( cat, site( cat.products.map( ( p ) => found( p, { image: PTC_ID, photoToCome: true } ) ), { images: { [ PHOTO_TO_COME ]: PTC_ID } } ) );
	assert.deepEqual( tallyCatalogue( plan ), { create: 0, complete: 0, exists: 3, left: 0 } );
	// The marker missing from a product on the placeholder is completed.
	const unmarked = planCatalogue( cat, site( [ found( cat.products[ 0 ], { image: PTC_ID, photoToCome: false } ) ], { images: { [ PHOTO_TO_COME ]: PTC_ID } } ) );
	assert.match( unmarked.actions[ 0 ].say, /lacks its photo-to-come marker$/ );
} );

test( 'photo to come: an existing product with its own image keeps it, and its stale marker is cleared', () => {
	const { catalogue } = setup();
	const cat = imageless( catalogue, [ 'jar' ] );
	const own = planCatalogue( cat, site( [ found( cat.products[ 0 ], { image: 7, how: 'slug', sku: 'SEEDED', variations: [ 'SEEDED-a' ] } ) ], { images: { [ PHOTO_TO_COME ]: PTC_ID } } ) );
	assert.equal( own.actions[ 0 ].action, 'exists' );
	assert.ok( ! own.notes.some( ( n ) => /photo-to-come/.test( n ) ) );
	const stale = planCatalogue( cat, site( [ found( cat.products[ 0 ], { image: 7, photoToCome: true } ) ], { images: { [ PHOTO_TO_COME ]: PTC_ID } } ) );
	assert.match( stale.actions[ 0 ].say, /lacks its photo-to-come marker cleared \(it has its own image\)$/ );
	// An imageless found product gets the placeholder; a draft image replaces a placeholder the product carries.
	const bare = planCatalogue( cat, site( [ found( cat.products[ 0 ], { image: 0 } ) ] ) );
	assert.match( bare.actions[ 0 ].say, /lacks the photo-to-come image$/ );
	const real = planCatalogue( catalogue, site( [ found( catalogue.products[ 0 ], { image: PTC_ID, photoToCome: true } ) ], { images: { [ PHOTO_TO_COME ]: PTC_ID } } ) );
	assert.match( real.actions[ 0 ].say, /lacks image \(in place of the photo-to-come image\)$/ );
	assert.equal( real.actions[ 0 ].image, 'sites/demo/handoff/assets/jar.svg' );
} );

test( 'photo to come: a fixture is left; the apply PHP sets and clears the marker; the read reports it; ids record it', () => {
	const { repo, catalogue } = setup();
	const cat = imageless( catalogue, [ 'jar' ] );
	const left = planCatalogue( cat, site( [ found( cat.products[ 0 ], { fixture: true, image: 0 } ) ] ) );
	assert.equal( left.actions[ 0 ].action, 'left' );
	const write = catalogueApplyPhp( [], {}, {}, null );
	assert.match( write, /update_post_meta\( \$id, '_sgs_photo_to_come', '1' \)/ );
	assert.match( write, /delete_post_meta\( \$id, '_sgs_photo_to_come' \)/ );
	// The thumbnail is set only when the product has none, or carries the placeholder and the draft gives an image; the
	// placeholder is the fallback only for a product left with none; the marker follows the thumbnail.
	assert.match( write, /if \( ! \$thumb \|\| \( 'photo-to-come' !== \$s\['image'\] && \$thumb === \$ptc\(\) \) \) \{/ );
	assert.match( write, /if \( ! \$att && ! \$thumb \) \{ \$att = \$image_id\( 'photo-to-come' \); \}/ );
	assert.match( write, /\$thumb = \(int\) get_post_thumbnail_id\( \$id \);\n\tif \( \$thumb && \$thumb === \$ptc\(\) \) \{\n\t\tupdate_post_meta/ );
	const read = catalogueStatePhp( [], {} );
	assert.match( read, /'photoToCome' => '' !== \(string\) get_post_meta\( \$id, '_sgs_photo_to_come', true \)/ );
	assert.match( read, /sgs_product_card_has_real_image/ );
	assert.equal( recordSite( repo, 'demo', 'local', site( [ found( cat.products[ 0 ], { id: 11, image: PTC_ID, photoToCome: true } ) ] ), cat ), 1 );
	const after = JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), 'utf8' ) );
	assert.equal( after.sites.local.products.jar.photoToCome, true );
	// The card would hide it (the site's WooCommerce placeholder): the plan says so.
	const hidden = planCatalogue( cat, site( [ { draftId: 'jar', id: 0 } ], { images: { [ PHOTO_TO_COME ]: PTC_ID }, photoToComeShows: false } ) );
	assert.ok( hidden.notes.some( ( n ) => /product card treats the photo-to-come image as no photo/.test( n ) ) );
} );

// SGS's product preflight publishes a variable product only when one of its variation terms carries a Google variesBy
// value (`_sgs_variesby_value`, no_variesby); the catalogue writes each attribute's axis and keeps a product with none a
// draft.
const writeOf = ( repo, cat ) => {
	let write = null;
	runCatalogue( { repo, client: 'demo', site: 's', apply: true, log: () => {}, error: () => {}, runPhp: ( php ) => {
		if ( /\$steps =/.test( php ) ) {
			write = php;
			return JSON.stringify( { done: [], issues: [] } );
		}
		return JSON.stringify( site( cat.products.map( ( p ) => ( { draftId: p.draftId, id: 0 } ) ) ) );
	} } );
	return write;
};
const decoded = ( write, name ) => JSON.parse( Buffer.from( new RegExp( `\\$${ name } = json_decode\\( base64_decode\\( '([^']+)'` ).exec( write )[ 1 ], 'base64' ).toString() );

test( 'variesBy: a found product whose axis terms lack the mapping is completed with it; an unmapped axis is never demanded', () => {
	const { catalogue } = setup();
	const jar = catalogue.products[ 0 ];
	const lacking = planCatalogue( catalogue, site( [ found( jar, { attributes: [ 'pa_pack-size', 'pa_grain' ], variesBy: { 'pa_pack-size': [ 'size', '' ], 'pa_grain': [ '', '' ] } } ) ] ) );
	assert.match( lacking.actions[ 0 ].say, /lacks variesBy size on pa_pack-size(,| *$)/ );
	const mapped = planCatalogue( catalogue, site( [ found( jar, { attributes: [ 'pa_pack-size', 'pa_grain' ], variesBy: { 'pa_pack-size': [ 'size', 'size' ], 'pa_grain': [ '', '' ] } } ) ] ) );
	assert.doesNotMatch( mapped.actions[ 0 ].say || '', /variesBy/, 'a mapped axis is never demanded (the product may still lack its filter terms)' );
} );

test( 'variesBy: a product with no variesBy axis is made and kept a draft, noted, and its publishing never planned', () => {
	const { repo, catalogue } = setup();
	const [ jar, box, voucher ] = catalogue.products;
	const plan = planCatalogue( catalogue, site( [ found( jar, { status: 'draft' } ), found( box ), found( voucher, { status: 'draft' } ) ] ) );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.draftId, a.action, a.hold ] ), [ [ 'jar', 'complete', false ], [ 'box', 'exists', false ], [ 'voucher', 'exists', true ] ] );
	assert.match( plan.actions[ 0 ].say, /lacks publishing \(now draft\)$/ );
	assert.ok( plan.notes.some( ( n ) => /1 product\(s\) are made and kept a draft.*no_variesby.*: voucher$/.test( n ) ) );
	// A create carries the hold to the write, and the write skips publishing it.
	const write = writeOf( repo, catalogue );
	const steps = decoded( write, 'steps' );
	assert.deepEqual( steps.map( ( s ) => [ s.draftId, s.hold ] ), [ [ 'jar', false ], [ 'box', false ], [ 'voucher', true ] ] );
	assert.deepEqual( steps[ 0 ].product.attributes.map( ( a ) => a.variesBy ), [ 'size', null ] );
	const hold = write.indexOf( "if ( ! empty( $s['hold'] ) ) {" );
	assert.ok( hold > 0 && hold < write.indexOf( "'post_status' => 'publish'" ) );
} );

test( 'variesBy: the write sets each axis on the product\'s terms that have none, before publishing; the read reports each term\'s value', () => {
	const write = catalogueApplyPhp( [], {}, {}, null );
	assert.match( write, /if \( '' === \$sgs_variesby\( get_term_meta\( \$tid, '_sgs_variesby_value', true \) \) \) \{\n\t\t\t\tupdate_term_meta\( \$tid, '_sgs_variesby_value', \$sgs_variesby\( \$a\['variesBy'\] \) \);/ );
	assert.match( write, /if \( empty\( \$a\['variesBy'\] \) \|\| ! taxonomy_exists\( \$tax \) \) \{ continue; \}\n\t\tforeach \( wc_get_product_terms\( \$id, \$tax, array\( 'fields' => 'ids' \) \) as \$tid \) \{/ );
	assert.ok( write.indexOf( "update_term_meta( $tid, '_sgs_variesby_value'" ) < write.indexOf( "'post_status' => 'publish'" ) );
	assert.match( write, /Configurator_Meta::sanitize_variesby/ );
	const read = catalogueStatePhp( [], {} );
	assert.match( read, /\$vb\[ \$tax \]\[\] = \$sgs_variesby\( get_term_meta\( \$tid, '_sgs_variesby_value', true \) \);/ );
	assert.match( read, /'variesBy' => \(object\) \$vb,/ );
	assert.doesNotMatch( read, /update_|delete_/ );
} );

test( 'address images: a stock photo is found by the media upload\'s file name and fetched under it; any address is downloaded and typed by its bytes, never by its extension', () => {
	const { repo, catalogue } = setup();
	const stock = 'https://images.unsplash.com/photo-1508296695146-257a814070b4';
	const other = 'https://images.example.test/a.jpg';
	const cat = { ...catalogue, products: catalogue.products.map( ( p, i ) => ( 0 === i ? { ...p, image: { url: stock }, gallery: [] } : 1 === i ? { ...p, image: { url: other }, gallery: [] } : p ) ) };
	const images = catalogueImages( repo, cat );
	assert.deepEqual( images[ stock ], { url: stock, stem: 'stock-1508296695146-257a814070b4' } );
	assert.deepEqual( images[ other ], { url: other } );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'catalogue.json' ), `${ JSON.stringify( cat, null, 2 ) }\n` );
	const write = writeOf( repo, cat );
	assert.deepEqual( decoded( write, 'uploads' )[ stock ], { url: stock, stem: 'stock-1508296695146-257a814070b4' } );
	assert.doesNotMatch( write, /media_sideload_image\( \$/ );
	assert.match( write, /\$tmp = download_url\( \$u\['url'\] \);/ );
	assert.match( write, /\$mime = wp_get_image_mime\( \$tmp \);\n\t\t\$ext = \$mime \? wp_get_default_extension_for_mime_type\( \$mime \) : '';/ );
	assert.match( write, /\$stem = ! empty\( \$u\['stem'\] \) \? \$u\['stem'\] : pathinfo/ );
	assert.match( write, /media_handle_sideload\( array\( 'name' => sanitize_file_name\( \( '' !== \$stem \? \$stem : 'draft-image' \) \. '\.' \. \$ext \), 'tmp_name' => \$tmp \), 0 \)/ );
	assert.match( write, /if \( ! \$id && ! empty\( \$img\['stem'\] \) \) \{\n\t\t\t\$stem = \$wpdb->esc_like\( \$img\['stem'\] \) \. '\.%';/ );
	assert.match( catalogueStatePhp( [], images ), /meta_value LIKE %s OR meta_value LIKE %s \) ORDER BY post_id ASC LIMIT 1", \$stem, '%\/' \. \$stem \)/ );
} );
