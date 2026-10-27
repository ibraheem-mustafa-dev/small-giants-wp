// The draft catalogue (Spec 48 FR-48-92): the products a client draft's shop, product cards and product page draw,
// read from the draft code into the shape sites/<client>/build/catalogue.json holds (data/catalogue.schema.json), with a
// gap row for every choice WooCommerce core cannot hold. The records, their fields (lib/catalogue-records.mjs) and the
// choices each product offers (lib/catalogue-options.mjs) are read from the code alone; a client's name never decides
// anything. A client whose page map has no live `product` row has no catalogue (its products, if any, are content).
//   - a product with no choice is `simple`; one whose basket line carries one or more single-value choices with listed
//     options is `variable`, one variation per combination (at most MAX_VARIATIONS), priced by the one choice whose
//     options carry a price (else the record's price);
//   - a priced choice whose options are whole numbers of 2 or more, priced apart from the number, is a pack size (Spec 27 Part 2's pack axis:
//     `_sgs_pack_size_axis`, each variation's `_sgs_unit_divisor` and `_sgs_discount_label`);
//   - a multi-choice, a switch (and the choices it gates), a choice whose options cannot be read, an amount the shopper
//     picks as the price itself, more than one priced choice, too many variations and every filter field with no
//     WooCommerce home are gap rows (`kind`, `detail`), never silent drops.
import fs from 'node:fs';
import path from 'node:path';
import { embeddedManifest } from './intake-routing.mjs';
import { UNREAD, catalogueSources, valueOf } from './catalogue-source.mjs';
import { descriptionField, facetFields, imageFields, recordLists } from './catalogue-records.mjs';
import { basketLines, keyOptions, lineFor, lineKeys } from './catalogue-options.mjs';

export const MAX_VARIATIONS = 100;
export const SKU_PREFIX = 'sgs-draft-';
export const PACK_SLUG = 'pack-size';

export const slugify = ( s ) => String( s ).normalize( 'NFKD' ).replace( /[̀-ͯ]/g, '' ).toLowerCase().replace( /&/g, ' and ' ).replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' );
export const skuOf = ( draftId ) => `${ SKU_PREFIX }${ slugify( draftId ) }`;
const human = ( name ) => {
	const words = String( name || '' ).replace( /([a-z])([A-Z])/g, '$1 $2' ).toLowerCase().replace( /^(cur|selected|current)\s+/, '' );
	const one = /[^s]s$/.test( words ) && words.length > 3 ? words.slice( 0, -1 ) : words;
	return one ? one.charAt( 0 ).toUpperCase() + one.slice( 1 ) : null;
};
const money = ( n ) => ( 'number' === typeof n ? `£${ n % 1 ? n.toFixed( 2 ) : n }` : '?' );

// The product base the draft's own manifest declares for its single-product route (`/frames/{product-slug}` gives
// `frames`), else WooCommerce's default `product`.
export function productBase( exp ) {
	for ( const d of exp.drafts ) {
		const m = embeddedManifest( d.text, d.file ).manifest;
		for ( const p of m?.pages || [] ) {
			const route = /^\/([a-z0-9-]+)\/\{[^}]+\}\/?$/.exec( p.route || '' );
			if ( route && /product single/i.test( `${ p.wp?.type || '' } ${ p.kind || '' }` ) ) {
				return route[ 1 ];
			}
		}
	}
	return 'product';
}

// The draft file of the page map's live product row (a page file, or the file holding a hash route), or null.
function productFile( exp, rows ) {
	const row = rows.find( ( r ) => 'product' === r.postType && 'live' === r.collection );
	if ( ! row ) {
		return null;
	}
	if ( exp.drafts.some( ( d ) => d.file === row.route ) ) {
		return row.route;
	}
	if ( /\.dc\.html$/i.test( row.route || '' ) ) {
		return null;
	}
	return exp.entries.find( ( f ) => exp.drafts.some( ( d ) => d.file === f ) ) || exp.drafts[ 0 ]?.file || null;
}

// The labels a code list gives a set of values: an array of `[ value, label ]` pairs or of `{ id, name|label }` records
// covering them all; else each value as it is.
function labelsFor( ctx, values ) {
	const want = new Set( values );
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all.filter( ( x ) => 'ArrayExpression' === x.type && x.elements.length >= want.size ) ) {
			const v = valueOf( ctx, src, n );
			if ( UNREAD === v || ! Array.isArray( v ) ) {
				continue;
			}
			const pairs = new Map( v.map( ( e ) => ( Array.isArray( e ) && 'string' === typeof e[ 1 ] ? [ e[ 0 ], e[ 1 ] ] : e && 'object' === typeof e && 'string' === typeof ( e.name ?? e.label ) ? [ e.id, e.name ?? e.label ] : null ) ).filter( Boolean ) );
			if ( [ ...want ].every( ( x ) => pairs.has( x ) ) ) {
				return pairs;
			}
		}
	}
	return new Map( values.map( ( x ) => [ x, x ] ) );
}

// Whether a field's values are the keys of an object literal the code holds (a lookup table, `COLS[ k ]`).
function keyedValues( ctx, values ) {
	const want = [ ...new Set( values ) ];
	return ctx.sources.some( ( src ) => src.idx.all.some( ( n ) => 'ObjectExpression' === n.type && n.properties.length >= want.length && ( () => {
		const keys = new Set( n.properties.map( ( p ) => p.key?.name ?? p.key?.value ) );
		return want.every( ( w ) => keys.has( w ) );
	} )() ) );
}

// One attribute from a choice: { key, label, slug, packSize, options, default }.
function attributeOf( choice ) {
	const priced = choice.options.every( ( o ) => 'number' === typeof o.price );
	const pack = priced && choice.options.every( ( o ) => Number.isInteger( o.value ) && o.value >= 2 ) && choice.options.some( ( o ) => o.price !== o.value );
	const label = pack ? 'Pack size' : human( choice.name ) || human( choice.key ) || choice.key;
	return {
		key: choice.key, label, slug: pack ? PACK_SLUG : slugify( label ), packSize: pack, priced,
		options: choice.options.map( ( o ) => ( { value: o.value, term: String( o.label ?? o.value ), price: priced ? o.price : null, swatch: o.swatch || null, badge: pack ? o.badge || null : null } ) ),
		default: choice.options.some( ( o ) => o.value === choice.first ) ? String( choice.options.find( ( o ) => o.value === choice.first ).label ?? choice.first ) : null,
	};
}

// Every combination of the attributes' options: [{ options: { slug: term }, price }].
function combinations( attrs, price ) {
	let out = [ { options: {}, price, parts: [] } ];
	for ( const a of attrs ) {
		out = out.flatMap( ( c ) => a.options.map( ( o ) => ( { options: { ...c.options, [ a.slug ]: o.term }, price: null != o.price ? o.price : c.price, parts: [ ...c.parts, slugify( o.term ) ] } ) ) );
	}
	return out;
}

// The choices of one record turned into attributes and gap rows: { attributes, gaps }.
function choicesOf( ctx, lines, list, record, draftId ) {
	const gaps = [];
	const gap = ( kind, detail ) => gaps.push( { draftId, kind, detail } );
	const found = lineFor( ctx, lines, list, record );
	if ( ! found.line ) {
		if ( lines.length ) {
			gap( 'basket-line', `no single basket line in the draft code builds this product (${ found.problem }); it is made with no choices` );
		}
		return { attributes: [], gaps };
	}
	const keys = lineKeys( ctx, found.line ).map( ( k ) => keyOptions( ctx, found.line.src, k ) );
	const list2 = ( c ) => c.options.map( ( o ) => o.label ?? o.value ).join( ', ' );
	const choices = [];
	for ( const c of keys ) {
		if ( c.gatedBy ) {
			continue;
		}
		if ( 'count' === c.kind ) {
			continue;
		}
		const gated = keys.filter( ( g ) => g.gatedBy === c.key );
		const gatedText = gated.length ? `; when on, the shopper also picks ${ gated.map( ( g ) => `"${ g.key }" (${ list2( g ) || 'options unread' })` ).join( ' and ' ) }` : '';
		if ( 'switch' === c.kind ) {
			gap( 'switch', `choice "${ c.key }" is an on/off switch${ c.factor ? ` that multiplies the price by ${ c.factor }` : '' }${ gatedText }: WooCommerce core holds no recurring or price-changing switch (a recurring order needs WooCommerce Subscriptions or an equivalent plugin); recorded, not built` );
		} else if ( 'multi' === c.kind ) {
			gap( 'multi-choice', `choice "${ c.key }" lets the shopper pick several of ${ list2( c ) || 'options the code does not list' }${ gatedText }: a WooCommerce variation holds one value per attribute, so it needs a product add-ons field; recorded, not built` );
		} else if ( 'choice' === c.kind ) {
			choices.push( c );
			if ( gatedText ) {
				gap( 'gated-choice', `choice "${ c.key }"${ gatedText }: a choice that appears only after another is not a WooCommerce variation; recorded, not built` );
			}
		} else {
			gap( 'unread-choice', `the basket line reads choice "${ c.key }", whose options the code does not list statically; recorded, not built` );
		}
	}
	let attributes = choices.map( attributeOf );
	const priced = attributes.filter( ( a ) => a.priced );
	if ( priced.length > 1 ) {
		gap( 'priced-choices', `${ priced.length } choices each carry a price (${ priced.map( ( a ) => a.key ).join( ', ' ) }) and the code's combined price is not read; the product is made with none of them` );
		attributes = [];
	}
	for ( const a of attributes.filter( ( x ) => x.priced && ! x.packSize && x.options.every( ( o ) => o.price === o.value ) ) ) {
		gap( 'open-amount', `the shopper picks the amount paid (${ a.options.map( ( o ) => money( o.price ) ).join( ', ' ) }): sold as one variation per amount; redeeming it later as store credit needs a gift-card plugin, which WooCommerce core does not have` );
	}
	const count = attributes.reduce( ( n, a ) => n * a.options.length, 1 );
	if ( count > MAX_VARIATIONS ) {
		gap( 'too-many-variations', `${ count } combinations of ${ attributes.map( ( a ) => a.key ).join( ', ' ) } exceed ${ MAX_VARIATIONS }; the product is made with no choices` );
		attributes = [];
	}
	return { attributes, gaps };
}

// The asset path of an image value, repo-relative, or a web address.
const imageOf = ( v, roles, repo, folder ) => {
	if ( 'string' !== typeof v || ! v ) {
		return null;
	}
	if ( roles.table ) {
		return 'string' === typeof roles.table[ v ] ? { url: roles.table[ v ] } : null;
	}
	return { asset: path.relative( repo, path.join( folder, v ) ).split( path.sep ).join( '/' ) };
};

// The catalogue of a client: { catalogue (catalogue.json's shape, without `sites`), notes }.
export function readCatalogue( { repo, client, rows } ) {
	const folder = path.join( repo, 'sites', client, 'handoff' );
	const base = { schemaVersion: 1, client, productBase: 'product', source: null, products: [], gaps: [] };
	const notes = [];
	if ( ! rows.some( ( r ) => 'product' === r.postType && 'live' === r.collection ) ) {
		notes.push( 'the page map has no live product row, so the draft sells nothing through WooCommerce and has no catalogue' );
		return { catalogue: base, notes };
	}
	const ctx = catalogueSources( folder );
	ctx.skipped.forEach( ( s ) => notes.push( `${ s.file } was not read: ${ s.why }` ) );
	const { lists, ambiguous } = recordLists( ctx );
	const out = { ...base, productBase: productBase( ctx.exp ) };
	ambiguous.forEach( ( a ) => out.gaps.push( { draftId: '*', kind: 'price', detail: `a looked-up list of named records in ${ a.src.file } has no single price: ${ a.problem }; it is not read as products` } ) );
	if ( ! lists.length ) {
		out.gaps.push( { draftId: '*', kind: 'no-records', detail: 'the page map has a live product row but the draft code looks up no list of named, priced records by id; no product is read' } );
		return { catalogue: out, notes };
	}
	const file = productFile( ctx.exp, rows );
	const shopRow = rows.find( ( r ) => 'shop' === r.postType );
	const shopFile = shopRow && ctx.exp.drafts.some( ( d ) => d.file === shopRow.route ) ? shopRow.route : file;
	out.source = { files: [ ...new Set( lists.map( ( l ) => l.src.file ) ) ].sort(), productPage: file, idKey: lists[ 0 ].key };
	for ( const list of lists ) {
		const { prices } = list;
		const taken = [ list.key, 'name', prices.price, prices.rrp ].filter( Boolean );
		const img = imageFields( ctx, list.records, folder, taken );
		const desc = descriptionField( ctx, list.records, [ ...taken, img.image, img.gallery ].filter( Boolean ) );
		const facets = facetFields( ctx, list.array ).filter( ( f ) => ! taken.includes( f.field ) );
		const words = ( f ) => list.records.every( ( r ) => Array.isArray( r[ f ] ) && r[ f ].every( ( x ) => 'string' === typeof x ) );
		const catField = facets.find( ( f ) => words( f.field ) && f.files.includes( shopFile ) && ! keyedValues( ctx, list.records.flatMap( ( r ) => r[ f.field ] ) ) )?.field || null;
		const brandField = facets.find( ( f ) => 'brand' === f.field && list.records.every( ( r ) => 'string' === typeof r.brand ) )?.field || null;
		const catLabels = catField ? labelsFor( ctx, [ ...new Set( list.records.flatMap( ( r ) => r[ catField ] ) ) ] ) : new Map();
		const loose = facets.filter( ( f ) => f.field !== catField && f.field !== brandField );
		if ( loose.length ) {
			out.gaps.push( { draftId: '*', kind: 'facet', detail: `the shop filters on ${ loose.map( ( f ) => `"${ f.field }"` ).join( ', ' ) } (${ loose.map( ( f ) => f.files.join( ' ' ) ).filter( ( v, i, a ) => a.indexOf( v ) === i ).join( '; ' ) }); the catalogue writes ${ [ catField && 'categories', brandField && 'brands' ].filter( Boolean ).join( ' and ' ) || 'no filter field' } only, so each of these is recorded on its product (facets) and has no WooCommerce attribute yet` } );
		}
		const lines = basketLines( ctx, list, file );
		for ( const r of list.records ) {
			const draftId = String( r[ list.key ] );
			const { attributes, gaps } = choicesOf( ctx, lines, list, r, draftId );
			out.gaps.push( ...gaps );
			const sku = skuOf( draftId );
			const variations = attributes.length ? combinations( attributes, r[ prices.price ] ).map( ( c ) => ( { sku: `${ sku }-${ c.parts.join( '-' ) }`, options: c.options, price: c.price } ) ) : [];
			const name = r.name;
			out.products.push( {
				draftId, sku, slug: slugify( brandField ? `${ r[ brandField ] } ${ name }` : name ), name, type: variations.length ? 'variable' : 'simple',
				price: variations.length ? Math.min( ...variations.map( ( v ) => v.price ) ) : r[ prices.price ], rrp: prices.rrp && 'number' === typeof r[ prices.rrp ] ? r[ prices.rrp ] : null,
				shortDescription: desc && 'string' === typeof r[ desc ] ? r[ desc ] : null,
				image: imageOf( r[ img.image ], img, repo, folder ),
				gallery: img.gallery && Array.isArray( r[ img.gallery ] ) ? r[ img.gallery ].map( ( g ) => imageOf( g, { table: null }, repo, folder ) ).filter( Boolean ) : [],
				categories: catField ? r[ catField ].map( ( c ) => String( catLabels.get( c ) ?? c ) ) : [],
				brand: brandField ? r[ brandField ] : null,
				facets: Object.fromEntries( loose.filter( ( f ) => null != r[ f.field ] && UNREAD !== r[ f.field ] ).map( ( f ) => [ f.field, r[ f.field ] ] ) ),
				attributes: attributes.map( ( { priced, ...a } ) => a ),
				variations,
			} );
		}
	}
	const seen = new Map();
	for ( const p of out.products ) {
		if ( seen.has( p.slug ) ) {
			out.gaps.push( { draftId: p.draftId, kind: 'slug', detail: `its name gives the slug "${ p.slug }", which product "${ seen.get( p.slug ) }" already takes; it is made as "${ p.slug }-${ slugify( p.draftId ) }"` } );
			p.slug = `${ p.slug }-${ slugify( p.draftId ) }`;
		}
		seen.set( p.slug, p.draftId );
	}
	return { catalogue: out, notes };
}

// The site address of a catalogue product: `/<product base>/<slug>/`.
export const productAddress = ( catalogue, product ) => `/${ catalogue.productBase || 'product' }/${ product.slug }/`;

export const catalogueFile = ( repo, client ) => path.join( repo, 'sites', client, 'build', 'catalogue.json' );

// The client's catalogue.json, or null.
export function loadCatalogue( repo, client ) {
	const file = catalogueFile( repo, client );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
}
