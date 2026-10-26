// The site's own template copies (Spec 48 FR-48-56, Bean 2026-10-26): every theme template a site serves is the site's
// own copy, cloned from the draft surface playing that template's role. A copy is the theme's frame (the header and
// footer template parts) around the draft's page shell, and inside the shell either the page's own content
// (`core/post-content`: the page and the front page) or the theme template's own content block (the posts loop, a post's
// title and content, the not-found message, the results list, the order details). The shell is the run of single-child `sgs/container` wrappers
// at the top of a Filled tree (the main width and background); a template several pages use takes the wrappers every one
// of them has (their common prefix), so no page renders inside a wrapper it does not have, and each page's post then
// holds only what sits below that shell. The homepage's sections stay in the home page (editable there); its front-page
// copy is the shell around `core/post-content` like any page. WooCommerce's pages (the shop, the product, the cart, the
// checkout and the account page) are SGS pages with WooCommerce's piece in them (Bean, 2026-10-26): their copy is the
// whole Filled tree inside the frame, in which the skeleton placed WooCommerce's piece at the draft's commerce region
// (lib/skeleton-commerce-region.mjs: the product collection, or `core/post-content` printing the page's own Cart, Checkout
// or account block).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const THEME_TEMPLATES = path.resolve( HERE, '..', '..', '..', 'theme', 'sgs-theme', 'templates' );

export const POST_CONTENT = { name: 'core/post-content' };
const PART = ( slug ) => ( { name: 'core/template-part', attributes: { slug, tagName: slug } } );
// The theme's own `<main>` (theme/sgs-theme/templates/page.html): structure only, full width, each section capping itself.
const MAIN = { name: 'sgs/container', attributes: { tagName: 'main', anchor: 'main', contentWidth: { desktop: 'full' } } };

// Templates whose inner block is the page's own content.
export const PAGE_CONTENT = [ 'front-page', 'page' ];
// Templates built from their surface's whole Filled tree: WooCommerce's pages.
export const WHOLE_TREE = [ 'archive-product', 'single-product', 'cart', 'checkout', 'page-my-account' ];
// Templates the draft has no surface for: built from the site's own `page` copy with the theme template's own content.
export const DERIVED = [ '404', 'search', 'archive', 'product-search-results', 'taxonomy-product_attribute' ];
// The templates WordPress reaches by its template hierarchy (a page's slug reaches `page-<slug>`), never set as a page's
// `page_template`.
export const HIERARCHY = [ 'front-page', 'home', 'page', 'single', 'archive', 'search', '404', 'index', 'order-confirmation', 'archive-product', 'single-product', 'product-search-results', 'taxonomy-product_attribute' ];
const SHOP_SERVES = [ 'archive-product', 'single-product', 'product-search-results', 'taxonomy-product_attribute', 'cart', 'checkout', 'order-confirmation', 'page-my-account' ];
const ORDER = [ 'front-page', 'home', 'page', 'single', 'archive', 'search', '404', ...SHOP_SERVES ];

// The `page_template` a page row's post takes: none for a template the hierarchy reaches, else the row's own template.
export const pageTemplateOf = ( row ) => ( ! row.template || HIERARCHY.includes( row.template ) || `page-${ row.slug }` === row.template ? '' : row.template );

// Every template the site serves, in a fixed order: each template a row names, `page`, `404` and `search` on every site,
// `single` and `archive` with posts, and a shop's product, search, attribute, cart, checkout, confirmation and account
// templates.
export function servedTemplates( rows ) {
	const out = new Set( rows.map( ( r ) => r.template ).filter( Boolean ) );
	[ 'page', '404', 'search' ].forEach( ( s ) => out.add( s ) );
	rows.some( ( r ) => 'post' === r.postType ) && [ 'single', 'archive' ].forEach( ( s ) => out.add( s ) );
	rows.some( ( r ) => [ 'shop', 'product', 'product_cat' ].includes( r.postType ) ) && SHOP_SERVES.forEach( ( s ) => out.add( s ) );
	const rank = ( s ) => ( ORDER.includes( s ) ? ORDER.indexOf( s ) : ORDER.length );
	return [ ...out ].sort( ( a, b ) => rank( a ) - rank( b ) || a.localeCompare( b ) );
}

// The rows a template is cloned from: every row naming it, and for `single` the posts (the first post shapes it).
export const rowsOf = ( rows, slug ) => rows.filter( ( r ) => r.template === slug || ( 'single' === slug && ! r.template && 'post' === r.postType ) );

// How a copy is made: 'whole' (the shop row's tree), 'shell' (the shell of the rows' Filled trees), 'page' (the site's own
// `page` copy's shell, for a template no row names), or null (no source: the site keeps the theme's file).
export function copySource( rows, slug ) {
	if ( WHOLE_TREE.includes( slug ) && rowsOf( rows, slug ).length ) {
		return 'whole';
	}
	if ( rowsOf( rows, slug ).length ) {
		return 'shell';
	}
	return DERIVED.includes( slug ) ? 'page' : null;
}

const sameNode = ( a, b ) => a.name === b.name && JSON.stringify( a.attributes || {} ) === JSON.stringify( b.attributes || {} );

// A Filled tree's shell: the run of single-child `sgs/container` wrappers from its root (each without its inner blocks),
// and the content below it.
export function splitShell( tree ) {
	const chain = [];
	let list = Array.isArray( tree ) ? tree : [];
	while ( 1 === list.length && 'sgs/container' === list[ 0 ].name && ( list[ 0 ].innerBlocks || [] ).length ) {
		const { innerBlocks, ...node } = list[ 0 ];
		chain.push( node );
		list = innerBlocks;
	}
	return { chain, content: list };
}

// The wrappers every chain shares from the top.
export function commonChain( chains ) {
	if ( ! chains.length ) {
		return [];
	}
	const out = [];
	for ( let i = 0; chains.every( ( c ) => i < c.length && sameNode( c[ i ], chains[ 0 ][ i ] ) ); i++ ) {
		out.push( chains[ 0 ][ i ] );
	}
	return out;
}

// What a page's post holds under a template whose shell is `chain`: its tree below those wrappers.
export function contentUnder( tree, chain ) {
	let list = Array.isArray( tree ) ? tree : [];
	for ( const node of chain ) {
		if ( 1 !== list.length || ! sameNode( list[ 0 ], node ) ) {
			throw new Error( `the page's tree does not start with the template's shell (${ node.name } ${ JSON.stringify( node.attributes || {} ).slice( 0, 120 ) })` );
		}
		list = list[ 0 ].innerBlocks || [];
	}
	return list;
}

// Block markup to a { name, attributes, innerBlocks } tree (block comments only; HTML between them is the blocks' own
// saved markup, which the editor rebuilds from the attributes).
export function parseBlocks( text ) {
	const root = { innerBlocks: [] };
	const stack = [ root ];
	for ( const m of String( text ).matchAll( /<!--\s+(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)(\s+(\{[\s\S]*?\}))?\s+(\/)?-->/g ) ) {
		const name = m[ 2 ].includes( '/' ) ? m[ 2 ] : `core/${ m[ 2 ] }`;
		if ( m[ 1 ] ) {
			if ( stack.length < 2 || stack[ stack.length - 1 ].name !== name ) {
				throw new Error( `block markup closes ${ name } where ${ stack[ stack.length - 1 ].name || 'nothing' } is open` );
			}
			stack.pop();
			continue;
		}
		const node = { name, ...( m[ 4 ] ? { attributes: JSON.parse( m[ 4 ] ) } : {} ), innerBlocks: [] };
		stack[ stack.length - 1 ].innerBlocks.push( node );
		m[ 5 ] || stack.push( node );
	}
	if ( stack.length > 1 ) {
		throw new Error( `block markup leaves ${ stack[ stack.length - 1 ].name } open` );
	}
	const tidy = ( nodes ) => nodes.map( ( n ) => ( n.innerBlocks.length ? { ...n, innerBlocks: tidy( n.innerBlocks ) } : ( ( { innerBlocks, ...rest } ) => rest )( n ) ) );
	return tidy( root.innerBlocks );
}

// The theme template's own content: the blocks inside its `<main>` container (or every block that is not a template part).
export function themeContent( slug, dir = THEME_TEMPLATES ) {
	const file = path.join( dir, `${ slug }.html` );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `the theme has no ${ slug } template (${ file })` );
	}
	const tree = parseBlocks( fs.readFileSync( file, 'utf8' ) );
	const main = tree.find( ( n ) => 'main' === n.attributes?.tagName );
	return main ? main.innerBlocks || [] : tree.filter( ( n ) => 'core/template-part' !== n.name );
}

// The inner block a shell holds for a template.
export const innerOf = ( slug, dir = THEME_TEMPLATES ) => ( PAGE_CONTENT.includes( slug ) ? [ POST_CONTENT ] : themeContent( slug, dir ) );

// `inner` inside the shell `chain`, inside the theme's `<main>` unless the shell's outer wrapper is the main itself.
function wrap( chain, inner ) {
	const nested = chain.reduceRight( ( kids, node ) => [ { ...node, innerBlocks: kids } ], inner );
	return 'main' === chain[ 0 ]?.attributes?.tagName ? nested : [ { ...MAIN, innerBlocks: nested } ];
}

// A whole tree inside the frame: as it is when it already holds a template part, else in the theme's `<main>` between
// the header and footer parts.
export function framed( tree ) {
	if ( tree.some( ( n ) => 'core/template-part' === n.name ) ) {
		return tree;
	}
	const body = 1 === tree.length && 'main' === tree[ 0 ].attributes?.tagName ? tree : [ { ...MAIN, innerBlocks: tree } ];
	return [ PART( 'header' ), ...body, PART( 'footer' ) ];
}

// The copy's tree: the frame around `whole`, or around the shell `chain` holding the template's inner block.
export function copyTree( { slug, chain = [], whole = null, dir = THEME_TEMPLATES } ) {
	return whole ? framed( whole ) : [ PART( 'header' ), ...wrap( chain, innerOf( slug, dir ) ), PART( 'footer' ) ];
}

// Where the run records each template copy's shell beside its tree: sites/<client>/build/trees/template/<slug>.json (the
// copy, the site build's stage 3 tree for it) and <slug>.shell.json ({ chain, from }).
export const copyFile = ( buildDir, slug ) => path.join( buildDir, 'trees', 'template', `${ slug }.json` );
export const shellFile = ( buildDir, slug ) => path.join( buildDir, 'trees', 'template', `${ slug }.shell.json` );
export const readShell = ( buildDir, slug ) => ( fs.existsSync( shellFile( buildDir, slug ) ) ? JSON.parse( fs.readFileSync( shellFile( buildDir, slug ), 'utf8' ) ) : null );

export function writeCopy( buildDir, slug, tree, shell ) {
	fs.mkdirSync( path.dirname( copyFile( buildDir, slug ) ), { recursive: true } );
	fs.writeFileSync( copyFile( buildDir, slug ), `${ JSON.stringify( tree, null, 2 ) }\n` );
	shell && fs.writeFileSync( shellFile( buildDir, slug ), `${ JSON.stringify( shell, null, 2 ) }\n` );
}

// The copies derived from the site's own `page` copy (DERIVED slugs no row names), from its recorded shell.
export function derivedCopies( rows, pageShell, dir = THEME_TEMPLATES ) {
	return servedTemplates( rows ).filter( ( s ) => 'page' === copySource( rows, s ) ).map( ( slug ) => ( { slug, tree: copyTree( { slug, chain: pageShell?.chain || [], dir } ) } ) );
}
