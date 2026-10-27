// The catalogue step of the site build (Spec 48 FR-48-55, FR-48-92): every product of sites/<client>/build/catalogue.json
// made on one site as a WooCommerce product, with its variations, prices, image, gallery, categories and brand, through
// the same wp-cli path as the rest of the build (`wp eval-file -` over SSH, or in a local mirror's WSL docroot).
//   - plan (reads only): per product `create` (no product has its SKU, its draft id or its slug), `complete` (one does,
//     and lacks something the catalogue gives it), `exists` (nothing to add) or `left` (the product found is a fixture or
//     calibration product: `_sgs_cr_fixture`, `_sgs_fixture` or an `sgs-fixture-` SKU, never touched);
//   - apply: creates what is missing and only fills what an existing product lacks (a product the catalogue did not make
//     keeps its name, price and choices; its variations are made only when it has none), then reads the site again, which
//     must plan nothing, and records each draft id's product id and permalink in catalogue.json's `sites.<site>`;
//   - the product base the draft's manifest declares is set when the site's differs; a product's address is then the
//     one the link resolver writes (lib/draft-link.mjs);
//   - each facet (a filter the draft's shop offers) is a global attribute with its terms, and each product's terms a
//     filter-only product attribute (lib/site-build-catalogue-facets.mjs); a product lacking one is completed, and each
//     facet's attribute id is recorded in `sites.<site>.attributes`;
//   - a product dropped in the intake review is skipped; the page map is never read or written;
//   - a product that would otherwise have no image (the draft gives none and the product found has none, or the draft's
//     image cannot be added) gets the "photo to come" image (data/photo-to-come.png, Bean 2026-10-27), so WooCommerce's
//     product checks let it publish: one attachment per site (found by its file's sha or name on a re-run, never
//     uploaded twice), `_sgs_photo_to_come` on each product carrying it, and `photoToCome` in catalogue.json's
//     `sites.<site>` record; an image the product already has is never replaced by it, a draft image replaces it, and
//     the marker is cleared once the product shows another image. The product card shows it as the product's photo.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogueFile, loadCatalogue, productAddress } from './catalogue-read.mjs';
import { catalogueProblems } from './intake-catalogue-run.mjs';
import { PHOTO_TO_COME, catalogueApplyPhp, catalogueStatePhp } from './site-build-catalogue-php.mjs';
import { facetLack, facetSay, planFacets, tallyFacets, writtenFacets } from './site-build-catalogue-facets.mjs';

export { PHOTO_TO_COME };

// The plugins whose presence settles a gap kind: a recurring order (switch gaps) and a gift card (open-amount gaps).
export const GAP_PLUGINS = { switch: /subscriptions/i, 'open-amount': /gift-?cards?/i };

// The "photo to come" image's file (the tool's own, not a client's).
export const PHOTO_TO_COME_FILE = fileURLToPath( new URL( '../data/photo-to-come.png', import.meta.url ) );
const sha256 = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );

// The images the catalogue names, keyed by asset path or address: { key: { name, sha } | { url } }, and the photo-to-come
// image under PHOTO_TO_COME.
export function catalogueImages( repo, catalogue ) {
	const out = { [ PHOTO_TO_COME ]: { name: path.basename( PHOTO_TO_COME_FILE ), sha: sha256( PHOTO_TO_COME_FILE ) } };
	for ( const p of catalogue.products ) {
		for ( const img of [ p.image, ...p.gallery ].filter( Boolean ) ) {
			if ( img.url ) {
				out[ img.url ] = { url: img.url };
			} else if ( ! out[ img.asset ] && fs.existsSync( path.join( repo, img.asset ) ) ) {
				out[ img.asset ] = { name: path.basename( img.asset ), sha: sha256( path.join( repo, img.asset ) ) };
			}
		}
	}
	return out;
}

const keyOf = ( img ) => ( img ? img.url || img.asset : null );
const products = ( catalogue ) => catalogue.products.filter( ( p ) => ! ( catalogue.dropped || [] ).includes( p.draftId ) );

// What one found product lacks of its catalogue record (names, for the plan line).
function missing( p, s, state, catalogue ) {
	const out = [];
	const ours = s.sku === p.sku;
	if ( 'simple' === p.type && '' === s.price ) {
		out.push( `price ${ p.price }` );
	}
	const onPlaceholder = Boolean( s.image ) && s.image === ( state.images[ PHOTO_TO_COME ] || 0 );
	if ( ! s.image ) {
		out.push( p.image ? 'image' : 'the photo-to-come image' );
	} else if ( p.image && onPlaceholder ) {
		out.push( 'image (in place of the photo-to-come image)' );
	} else if ( Boolean( s.photoToCome ) !== onPlaceholder ) {
		out.push( onPlaceholder ? 'its photo-to-come marker' : 'its photo-to-come marker cleared (it has its own image)' );
	}
	if ( p.gallery.length && ! s.gallery ) {
		out.push( `gallery of ${ p.gallery.length }` );
	}
	if ( p.categories.length && ! s.categories.filter( ( c ) => 'Uncategorized' !== c ).length ) {
		out.push( `categories ${ p.categories.join( ', ' ) }` );
	}
	if ( p.brand && state.brandTaxonomy && ! s.brand.length ) {
		out.push( `brand ${ p.brand }` );
	}
	if ( null !== p.rrp && '' === s.rrp ) {
		out.push( `RRP ${ p.rrp }` );
	}
	if ( s.draftMeta !== p.draftId ) {
		out.push( 'its draft id' );
	}
	if ( 'variable' === p.type && s.type === p.type && ( ours || ! s.variations.length ) ) {
		const lack = p.variations.filter( ( v ) => ! s.variations.includes( v.sku ) );
		lack.length && out.push( `${ lack.length } of ${ p.variations.length } variations` );
	}
	out.push( ...facetLack( catalogue, p, s ).map( ( f ) => `filter ${ f }` ) );
	if ( 'publish' !== s.status ) {
		out.push( `publishing (now ${ s.status })` );
	}
	return out;
}

// The plan: { actions: [{ draftId, action, say, product, image, gallery }], facets: [{ slug, action, say }], notes,
// problems, productBase: { from, to } | null }.
export function planCatalogue( catalogue, state ) {
	const notes = [];
	const problems = [];
	if ( ! state.woocommerce ) {
		return { actions: [], facets: [], notes, problems: [ 'the site has no active WooCommerce' ], productBase: null };
	}
	const want = catalogue.productBase || 'product';
	const productBase = ( state.productBase || 'product' ) !== want ? { from: state.productBase || 'product', to: want } : null;
	const actions = [];
	for ( const p of products( catalogue ) ) {
		const s = state.products.find( ( x ) => x.draftId === p.draftId ) || { id: 0 };
		const step = { draftId: p.draftId, product: p, image: keyOf( p.image ) || PHOTO_TO_COME, photoToCome: ! p.image, gallery: p.gallery.map( keyOf ) };
		const address = productAddress( catalogue, p );
		if ( ! s.id ) {
			const imgs = [ p.image, ...p.gallery ].filter( Boolean ).filter( ( i ) => ! state.images[ keyOf( i ) ] ).length;
			actions.push( { ...step, action: 'create', placeholder: step.photoToCome, say: `create ${ p.draftId } (${ p.sku }) ${ p.type } "${ p.name }" at ${ address }: price ${ p.price }${ p.rrp ? `, RRP ${ p.rrp }` : '' }${ p.variations.length ? `, ${ p.variations.length } variations of ${ p.attributes.map( ( a ) => `${ a.label } (${ a.options.map( ( o ) => o.term ).join( '/' ) })` ).join( ' x ' ) }` : '' }${ p.categories.length ? `, categories ${ p.categories.join( ', ' ) }` : '' }${ p.brand ? `, brand ${ p.brand }` : '' }${ p.image ? `, image ${ state.images[ keyOf( p.image ) ] ? `attachment ${ state.images[ keyOf( p.image ) ] }` : p.image.url ? 'to fetch' : 'to upload' }` : `, image photo to come (${ state.images[ PHOTO_TO_COME ] ? `attachment ${ state.images[ PHOTO_TO_COME ] }` : 'to upload' })` }${ imgs ? ` (${ imgs } image file(s) to add)` : '' }` } );
			continue;
		}
		if ( s.fixture ) {
			notes.push( `${ p.draftId }: product ${ s.id } (found by ${ s.how }) is a fixture or calibration product, left as it is; the catalogue product is not made` );
			actions.push( { ...step, action: 'left', say: `left ${ p.draftId }: product ${ s.id } is a fixture` } );
			continue;
		}
		const lack = missing( p, s, state, catalogue );
		if ( s.type !== p.type ) {
			notes.push( `${ p.draftId }: product ${ s.id } (found by ${ s.how }) is ${ s.type }, the catalogue's is ${ p.type }; its type is left` );
		}
		if ( s.permalink && ! s.permalink.endsWith( address ) && ! productBase ) {
			notes.push( `${ p.draftId }: product ${ s.id } is at ${ s.permalink }, not ${ address }, so draft links to it miss` );
		}
		actions.push( { ...step, action: lack.length ? 'complete' : 'exists', placeholder: step.photoToCome && ! s.image, id: s.id, say: lack.length ? `complete ${ p.draftId }: product ${ s.id } (found by ${ s.how }) lacks ${ lack.join( ', ' ) }` : `exists ${ p.draftId }: product ${ s.id }` } );
	}
	for ( const [ kind, re ] of Object.entries( GAP_PLUGINS ) ) {
		const gaps = catalogue.gaps.filter( ( g ) => g.kind === kind );
		if ( gaps.length ) {
			const plugin = state.plugins.find( ( x ) => re.test( x ) );
			notes.push( plugin ? `${ plugin } is active: the ${ kind } gap(s) of ${ gaps.map( ( g ) => g.draftId ).join( ', ' ) } can be built on it (not done by this step)` : `no ${ 'switch' === kind ? 'subscriptions' : 'gift-card' } plugin is active (wp option active_plugins), so the ${ kind } gap(s) of ${ gaps.map( ( g ) => g.draftId ).join( ', ' ) } stand` );
		}
	}
	actions.filter( ( a ) => 'create' === a.action ).forEach( ( a ) => {
		a.say += facetSay( catalogue, a.product );
	} );
	const facets = planFacets( catalogue, state );
	notes.push( ...facets.notes );
	problems.push( ...facets.problems );
	const bare = actions.filter( ( a ) => a.placeholder ).map( ( a ) => a.draftId );
	if ( bare.length ) {
		notes.push( `${ bare.length } product(s) the draft gives no image get the photo-to-come image: ${ bare.join( ', ' ) }` );
	}
	if ( bare.length && false === state.photoToComeShows ) {
		notes.push( `the product card treats the photo-to-come image as no photo on this site (attachment ${ state.images[ PHOTO_TO_COME ] } is, or shares its file name with, WooCommerce's placeholder image), so cards show their no-photo box` );
	}
	if ( catalogue.products.some( ( p ) => p.brand ) && ! state.brandTaxonomy ) {
		notes.push( 'the site has no product_brand taxonomy (WooCommerce Brands), so brands are not written' );
	}
	return { actions, facets: facets.actions, notes, problems, productBase };
}

export const tallyCatalogue = ( plan ) => Object.fromEntries( [ 'create', 'complete', 'exists', 'left' ].map( ( k ) => [ k, plan.actions.filter( ( a ) => a.action === k ).length ] ) );

const parseJson = ( text, what ) => {
	const s = String( text );
	const start = s.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `${ what } printed no JSON: ${ s.slice( 0, 300 ) }` );
	}
	return JSON.parse( s.slice( start ) );
};

export const readCatalogueState = ( runPhp, catalogue, images ) => parseJson( runPhp( catalogueStatePhp( products( catalogue ).map( ( p ) => ( { draftId: p.draftId, sku: p.sku, slug: p.slug } ) ), images, catalogue ) ), 'the catalogue read' );

// The uploads an apply needs: every image the site does not hold, with its bytes (an asset) or address.
function uploadsFor( repo, images, state ) {
	return Object.fromEntries( Object.entries( images ).filter( ( [ k ] ) => ! state.images[ k ] ).map( ( [ k, v ] ) => [ k, v.url ? { url: v.url } : { ...v, data: fs.readFileSync( PHOTO_TO_COME === k ? PHOTO_TO_COME_FILE : path.join( repo, k ) ).toString( 'base64' ) } ] ) );
}

// Writes `sites.<site>` into catalogue.json (validated first; refused when the file changed shape).
export function recordSite( repo, client, site, state, catalogue ) {
	const file = catalogueFile( repo, client );
	const record = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const made = Object.fromEntries( state.products.filter( ( s ) => s.id && ! s.fixture ).map( ( s ) => [ s.draftId, { id: s.id, permalink: s.permalink, variations: s.variations.length, ...( s.photoToCome ? { photoToCome: true } : {} ) } ] ) );
	const attributes = Object.fromEntries( writtenFacets( catalogue ).filter( ( f ) => state.facets?.[ f.slug ]?.id ).map( ( f ) => [ f.slug, state.facets[ f.slug ].id ] ) );
	const next = { ...record, sites: { ...( record.sites || {} ), [ site ]: { builtAt: new Date().toISOString(), products: made, ...( Object.keys( attributes ).length ? { attributes } : {} ) } } };
	const problems = catalogueProblems( next );
	if ( problems.length ) {
		throw new Error( `catalogue.json with the ${ site } ids does not validate: ${ problems.join( '; ' ) }` );
	}
	fs.writeFileSync( file, `${ JSON.stringify( next, null, 2 ) }\n` );
	return Object.keys( made ).length;
}

// Runs the step: prints the plan, and with `apply` writes it, reads back and records the ids. Returns the exit code.
export function runCatalogue( { repo, client, site, runPhp, apply, log = console.log, error = console.error } ) {
	const catalogue = loadCatalogue( repo, client );
	if ( ! catalogue ) {
		error( `FAILED: sites/${ client }/build/catalogue.json is missing (run intake.mjs --catalogue ${ client } first)` );
		return 1;
	}
	if ( ! products( catalogue ).length ) {
		log( 'catalogue: the draft catalogue has no product to make' );
		return 0;
	}
	const images = catalogueImages( repo, catalogue );
	const state = readCatalogueState( runPhp, catalogue, images );
	const plan = planCatalogue( catalogue, state );
	plan.notes.forEach( ( n ) => log( `note: ${ n }` ) );
	catalogue.gaps.forEach( ( g ) => log( `gap ${ g.draftId } ${ g.kind }: ${ g.detail }` ) );
	if ( plan.problems.length ) {
		plan.problems.forEach( ( p ) => error( `STOP ${ p }` ) );
		error( `FAILED: ${ plan.problems.length } problem(s); nothing was written` );
		return 1;
	}
	log( 'catalogue:' );
	plan.productBase && log( `  product base /${ plan.productBase.from } -> /${ plan.productBase.to }` );
	plan.facets.forEach( ( a ) => log( `  ${ a.say }` ) );
	plan.actions.forEach( ( a ) => log( `  ${ a.say }` ) );
	const t = tallyCatalogue( plan );
	const ft = tallyFacets( plan.facets );
	if ( ! apply ) {
		log( `${ t.create } to create, ${ t.complete } to complete, ${ t.exists } existing, ${ t.left } left; filter attributes ${ ft.create } to create, ${ ft.complete } to complete, ${ ft.exists } existing (dry run: re-run with --apply)` );
		return 0;
	}
	const steps = plan.actions.filter( ( a ) => 'create' === a.action || 'complete' === a.action );
	const done = parseJson( runPhp( catalogueApplyPhp( steps, images, uploadsFor( repo, images, state ), plan.productBase ? plan.productBase.to : null, catalogue ) ), 'the catalogue write' );
	done.done.forEach( ( d ) => log( `  done: ${ d }` ) );
	done.issues.forEach( ( d ) => error( `  issue: ${ d }` ) );
	const after = readCatalogueState( runPhp, catalogue, images );
	const again = planCatalogue( catalogue, after );
	const left = [ ...again.facets, ...again.actions ].filter( ( a ) => 'create' === a.action || 'complete' === a.action );
	const recorded = recordSite( repo, client, site, after, catalogue );
	log( `catalogue.json: ${ recorded } product id(s) recorded for ${ site }` );
	const placeholders = after.products.filter( ( s ) => s.id && ! s.fixture && s.photoToCome ).map( ( s ) => s.draftId );
	placeholders.length && log( `${ placeholders.length } product(s) carry the photo-to-come image (a real photo replaces it): ${ placeholders.join( ', ' ) }` );
	if ( done.issues.length || left.length || again.productBase ) {
		error( `FAILED: a fresh read still plans ${ left.length } product or filter step(s)${ again.productBase ? ' and the product base' : '' }: ${ left.map( ( a ) => a.say ).join( '; ' ) }` );
		return 1;
	}
	log( `${ steps.length } product step(s) run; a fresh read plans 0` );
	return 0;
}
