// The frame of a WooCommerce page's template copy (Spec 48 FR-48-56, FR-48-87): which header and footer the copy holds.
// A copy takes the site's shared header and footer parts only where the draft page mounts the shared header and footer.
// A draft page that draws its own top bar in place of the shared header (a checkout's slim bar: a back link, the logo, a
// secure note) gets that bar as the site's own template part for the template, `<template>-header`, and a page with no
// footer gets none. Everything is read from the handoff's records and the fact record, never from words:
//   - the shared header and footer are the handoff records of kind `header` and `footer` on every route (`route: "*"`);
//   - a page mounts one when its component is the record's own component (a single-file draft renders its header on every
//     route), or when the page's component imports the record's component (a `dc-import` element naming it);
//   - the page's own top bar is the one element beside the page's `<main>` and before it, under the same parent, where the
//     page mounts no shared header.
// The template surface's inventory is then read from that parent (`inventoryRootFor`), so the skeleton holds the bar; the
// pieces builder lib/template-piece-frame.mjs marks the bar node `templatePart: <slug>` and the main node
// `templateFrame: { header, footer }`; the copy (lib/template-copies.mjs::framed through `frameMarked`) prints those parts,
// and the site run builds each marked part as a `wp_template_part` (`partsOf`, `writePart`, wp-build-page.js
// --template-part) before the template.
import fs from 'node:fs';
import path from 'node:path';
import { templateKeyOf } from './fact-key.mjs';
import { loadFacts } from './fact-record.mjs';
import { loadPieces, piecesFor } from './template-pieces.mjs';

// The node keys this frame writes on a skeleton; a copy never prints them.
export const FRAME_KEYS = [ 'templatePart', 'templateFrame', 'draftStandsFor' ];
// Template elements that are no element of the page (runtime constructs).
const CONSTRUCTS = [ 'sc-if', 'sc-else', 'sc-for', 'dc-import', 'template', 'helmet' ];

// The slug of the site's own top-bar part for a template.
export const partSlug = ( template ) => `${ template }-header`;

const nOf = ( key ) => Number( String( key ).split( '/' ).pop() );
const elementOf = ( facts, key ) => facts?.elements?.[ key ]?.template || null;
const childrenOf = ( facts, key ) => Object.values( facts?.elements || {} ).map( ( e ) => e.template ).filter( ( t ) => t && t.parent === key ).sort( ( a, b ) => nOf( a.key ) - nOf( b.key ) );

// Whether the page component `component` mounts the record's component: it is the record's own component, or it imports it.
function mounts( facts, component, record ) {
	if ( ! record?.dc ) {
		return false;
	}
	if ( record.dc === component ) {
		return true;
	}
	return Object.values( facts?.elements || {} ).some( ( e ) => e.template?.component === component && 'dc-import' === e.template.tag && e.template.attrs?.name === record.dc );
}

// The frame of a page: { header: 'shared' | 'own' | 'none', footer: 'shared' | 'none', bar, root, main, reasons }. `facts`:
// the fact record; `records`: the handoff's surfaces.json records; `component`: the page's component; `mainKey`: the fact
// key of the page's `<main>` (the template surface's inventory root). A handoff with no shared header record keeps the
// shared header (the site's own header post stands in for it), and likewise for the footer.
export function pageFrame( { facts, records = [], component, mainKey } ) {
	const reasons = [];
	const main = elementOf( facts, mainKey );
	const shared = ( kind ) => ( records || [] ).find( ( r ) => kind === r.kind && '*' === r.route ) || null;
	const header = shared( 'header' );
	const footer = shared( 'footer' );
	const headerOn = ! header || mounts( facts, component, header );
	const footerOn = ! footer || mounts( facts, component, footer );
	reasons.push( header ? `${ component } ${ headerOn ? 'mounts' : 'does not mount' } the shared header (${ header.dc })` : 'the handoff names no shared header' );
	reasons.push( footer ? `${ component } ${ footerOn ? 'mounts' : 'does not mount' } the shared footer (${ footer.dc })` : 'the handoff names no shared footer' );
	let bar = null;
	if ( ! headerOn && main?.parent ) {
		const before = childrenOf( facts, main.parent ).filter( ( t ) => ! CONSTRUCTS.includes( t.tag ) && nOf( t.key ) < nOf( main.key ) );
		bar = 1 === before.length ? before[ 0 ].key : null;
		reasons.push( bar ? `its own top bar is ${ bar } (<${ before[ 0 ].tag }>), beside its <main> and before it` : `${ before.length } elements stand before its <main>, so none is read as its own top bar` );
	}
	return { header: headerOn ? 'shared' : bar ? 'own' : 'none', footer: footerOn ? 'shared' : 'none', bar, root: main?.parent || null, main: main ? mainKey : null, reasons };
}

// The handoff's records (handoff/surfaces.json), [] when the folder has none.
export function handoffRecords( folder ) {
	const file = path.join( folder || '', 'surfaces.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).records || [] : [];
}

// The selector a template surface's inventory is read from: the parent of the page's `<main>` when the page draws its own
// top bar beside it (so the bar is read with the page), else null (the intake skeleton's own root stands). Only a template
// whose pieces include a `frame` piece (data/template-pieces.json) is read so, since that piece takes the bar out again.
// `skel`: the intake skeleton entry (its `inventory.checks` name the root component and the main's key). `facts`: the fact
// record, read from the client's files when not given.
export function inventoryRootFor( { repo, client, entry, skel, facts = null, pieces = loadPieces() } ) {
	if ( ! piecesFor( entry?.target?.template, pieces ).some( ( p ) => 'frame' === p.kind ) || 'main' !== skel?.root?.tag ) {
		return null;
	}
	const component = skel.inventory?.checks?.rootName;
	const mainKey = templateKeyOf( skel.inventory?.checks?.rootKey, component );
	const folder = entry.draftDir ? path.resolve( repo, entry.draftDir ) : path.join( repo, 'sites', client, 'handoff' );
	const frame = pageFrame( { facts: facts || loadFacts( client, { repo } ), records: handoffRecords( folder ), component, mainKey } );
	return 'own' === frame.header ? `[data-dc-tpl="${ nOf( frame.root ) }"]:has(> [data-dc-tpl="${ nOf( frame.main ) }"])` : null;
}

// A node with the frame's keys taken off, at every depth.
export function stripFrame( node ) {
	const out = Object.fromEntries( Object.entries( node ).filter( ( [ k ] ) => ! FRAME_KEYS.includes( k ) ) );
	return node.innerBlocks ? { ...out, innerBlocks: node.innerBlocks.map( stripFrame ) } : out;
}

// The tag a part's own wrapper takes: `header` (the banner landmark), unless the bar's own node already renders a header,
// which may not hold another.
const partTag = ( node ) => ( 'header' === node?.attributes?.tagName ? 'div' : 'header' );

// The parts a marked tree carries: [ { slug, tree } ] for every top-level node marked `templatePart`.
export function partsOf( tree ) {
	return ( tree || [] ).filter( ( n ) => n?.templatePart ).map( ( n ) => ( { slug: n.templatePart, tree: [ stripFrame( n ) ] } ) );
}

// A copy tree for a tree the frame marked, or null when no top-level node carries `templateFrame`. `make`: { part( slug,
// tagName ), main } (lib/template-copies.mjs's own part line and theme `<main>`). The header line is the frame's header
// part (the shared `header`, or the page's own part, printed where its node stood), the footer line the frame's footer, a
// null one none; the body is the rest, inside the theme's `<main>` unless it is the main itself.
export function frameMarked( tree, make ) {
	const framed = ( tree || [] ).find( ( n ) => n?.templateFrame );
	if ( ! framed ) {
		return null;
	}
	const { header = null, footer = null } = framed.templateFrame;
	const own = ( tree || [] ).filter( ( n ) => n?.templatePart );
	const body = ( tree || [] ).filter( ( n ) => ! n?.templatePart ).map( stripFrame );
	const main = 1 === body.length && 'main' === body[ 0 ].attributes?.tagName ? body : [ { ...make.main, innerBlocks: body } ];
	const head = own.length ? own.map( ( n ) => make.part( n.templatePart, partTag( n ) ) ) : header ? [ make.part( header, 'header' ) ] : [];
	return [ ...head, ...main, ...( footer ? [ make.part( footer, 'footer' ) ] : [] ) ];
}

// Where the run writes a part's tree: sites/<client>/build/trees/template-part/<slug>.json. Returns the file.
export function writePart( buildDir, part ) {
	const file = path.join( buildDir, 'trees', 'template-part', `${ part.slug }.json` );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( part.tree, null, 2 ) }\n` );
	return file;
}

// The site's own parts a copy tree prints that the run wrote (writePart): [ { slug, tree } ] for every top-level
// `core/template-part` whose sites/<client>/build/trees/template-part/<slug>.json exists, so the site build builds each one
// before the template that prints it. The shared header and footer are posts of their own and have no such file.
export function ownParts( buildDir, tree ) {
	return ( tree || [] ).filter( ( n ) => 'core/template-part' === n?.name && n.attributes?.slug ).map( ( n ) => ( { slug: n.attributes.slug, file: path.join( buildDir, 'trees', 'template-part', `${ n.attributes.slug }.json` ) } ) ).filter( ( p ) => fs.existsSync( p.file ) ).map( ( p ) => ( { slug: p.slug, tree: JSON.parse( fs.readFileSync( p.file, 'utf8' ) ) } ) );
}

// The fact key of a served inventory key (`Root/16#0` -> `Checkout/16`).
export const factKey = ( key, rootComponent ) => templateKeyOf( key, rootComponent );
// The served key of a page-component fact key's first copy (`Checkout/16` -> `Root/16#0`).
export const servedOf = ( key ) => `Root/${ nOf( key ) }#0`;
