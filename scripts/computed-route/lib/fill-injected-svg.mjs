// The SVG a draft's code injects into an element at run time (Spec 48 RC12): a fetched SVG written into a stamped holder,
// or a custom element's own content, read by the skeleton inventory per width (lib/skeleton-inventory.mjs::injectedContent,
// through lib/element-facts.mjs::injectedAt). Fill carries it through the framework's own settings, chosen from the framework
// DB: on the block whose element holds the content, or else on the nearest ancestor element's block when the holder covers
// that block's element (the block's background layer; a foreground icon deep inside a block is a named row instead),
//   - a string setting whose role is `svg` (a container or hero's SVG background) takes the widest width's file, and a
//     narrower width that injects another file is a named row (the setting holds one SVG for every width);
//   - else the block's inline-SVG switch (a boolean named `inlineSvg` or ending `InlineSvg`: the logo's `inlineSvg`, the
//     drawer's `chromeLogoInlineSvg`) is turned on, so the file the block already carries is printed inline and its parts
//     can move. The logo's switch has one owner: when the client has build/logo-svgparts.json the apply stage writes it
//     with the parts (lib/apply-chrome-logo.mjs::logoRule), and Fill leaves it, with a note;
//   - else the content is a named row.
import fs from 'fs';
import path from 'path';
import { injectedAt } from './element-facts.mjs';
import { setAttr } from './tree.mjs';
import { servedKey } from './key-space.mjs';
import { LOGO_INLINE } from './apply-chrome-logo.mjs';

const WIDTHS = [ 1440, 768, 375 ];

// The block's SVG settings from the framework DB: { content (a string setting with role svg), inline (the boolean that
// prints the block's SVG inline: `inlineSvg`, or a name ending `InlineSvg`; GLOB is case-sensitive, so `bgSvgTextShadow`
// and the other SVG-named switches never match) }, each an attribute name or null.
function svgSettings( db, block ) {
	const content = db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND role = 'svg' AND attr_type = 'string' ORDER BY attr_name" ).get( block )?.attr_name ?? null;
	const inline = db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND attr_type = 'boolean' AND ( attr_name = 'inlineSvg' OR attr_name GLOB '*InlineSvg' ) ORDER BY attr_name" ).get( block )?.attr_name ?? null;
	return { content, inline };
}

// Whether a holder's box covers an element's box at a width (each side at least COVERS of the element's): the holder is
// that element's background layer, not a part inside it.
const COVERS = 0.9;
function covers( holder, el, w ) {
	const a = holder?.box?.[ w ];
	const b = el?.box?.[ w ];
	return !! a && !! b && b.w > 0 && b.h > 0 && a.w >= COVERS * b.w && a.h >= COVERS * b.h;
}

// An SVG file's markup as the draft's page shows it: the XML prolog, comments and editor metadata left out.
export function svgMarkup( text ) {
	return String( text ).replace( /<\?xml[^>]*>/g, '' ).replace( /<!--[\s\S]*?-->/g, '' ).replace( /<metadata[\s\S]*?<\/metadata>/g, '' ).trim();
}

// Writes the injected SVG of every inventory element that holds one. nodes, flat, refOf as Fill's; inventory the surface's
// skeleton inventory; db the framework DB; draftFolder the handoff folder the sources are relative to; rootComponent the
// entry draft's component (an intake-space key and a served one name the same element); logoOwned: the client has
// build/logo-svgparts.json, so the apply stage owns the logo's inline switch. Returns { writes, unmapped, notes }.
export function injectedSvgWrites( { nodes, flat, refOf, inventory, db, draftFolder, rootComponent = null, logoOwned = false } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const elements = inventory?.elements || [];
	const key = ( k ) => servedKey( k, rootComponent );
	const byKey = new Map( elements.map( ( e ) => [ key( e.key ), e ] ) );
	const nodeOf = new Map( nodes.flatMap( ( n ) => n.targets.filter( ( t ) => '' === t.slot && t.finder?.tpl ).map( ( t ) => [ key( t.finder.tpl ), n ] ) ) );
	const done = new Set();
	for ( const e of elements ) {
		const by = Object.fromEntries( WIDTHS.map( ( w ) => [ w, injectedAt( e, w ) ] ).filter( ( [ , v ] ) => v?.source ) );
		const widest = WIDTHS.find( ( w ) => by[ w ] );
		if ( ! widest ) {
			continue;
		}
		let n = null;
		let owner = null;
		for ( let at = e; at && ! n; at = byKey.get( key( at.parentKey ) ) ) {
			n = nodeOf.get( key( at.key ) ) ?? null;
			owner = n ? at : null;
		}
		const where = n ? { node: refOf( flat[ n.index ] ), block: n.name, slot: '' } : { node: e.key, block: '', slot: '' };
		const source = by[ widest ].source;
		if ( ! n ) {
			out.unmapped.push( { ...where, property: 'svg', value: source, reason: `the draft's code puts ${ source } into ${ e.key }, and no block of this surface holds that element or an ancestor of it` } );
			continue;
		}
		if ( owner !== e && ! covers( e, owner, widest ) ) {
			out.unmapped.push( { ...where, property: 'svg', value: source, reason: `the draft's code puts ${ source } into ${ e.key }, a part inside ${ n.name }'s element ${ owner.key } that does not cover it, so it is not the block's background; no setting of ${ n.name } holds a foreground SVG there` } );
			continue;
		}
		if ( done.has( `${ n.index }|${ source }` ) ) {
			continue;
		}
		done.add( `${ n.index }|${ source }` );
		const { content, inline } = svgSettings( db, n.name );
		if ( content ) {
			const file = path.join( draftFolder, source );
			if ( ! fs.existsSync( file ) ) {
				out.unmapped.push( { ...where, property: content, value: source, reason: `the injected SVG ${ source } is not in the draft folder` } );
				continue;
			}
			const { before, after } = setAttr( flat[ n.index ], { attr: content, value: svgMarkup( fs.readFileSync( file, 'utf8' ) ) } );
			out.writes.push( { ...where, prop: `injected svg ${ source }`, attr: content, before, after, widths: [ widest ], how: 'injected-svg' } );
			const others = WIDTHS.filter( ( w ) => by[ w ] && by[ w ].source !== source );
			others.length && out.unmapped.push( { ...where, property: content, value: others.map( ( w ) => `${ w }: ${ by[ w ].source }` ).join( ', ' ), reason: `${ n.name } ${ content } holds one SVG for every width; the draft swaps to ${ others.map( ( w ) => `${ by[ w ].source } at ${ w }px` ).join( ' and ' ) }` } );
			out.notes.push( `${ where.node } ${ n.name }: ${ content } is the SVG the draft's code puts into ${ e.key } (${ source })` );
			continue;
		}
		if ( inline && logoOwned && LOGO_INLINE[ n.name ] === inline ) {
			out.notes.push( `${ where.node } ${ n.name }: ${ inline } is left to the apply stage, which writes it with the logo's parts from build/logo-svgparts.json (lib/apply-chrome-logo.mjs::logoRule)` );
			continue;
		}
		if ( inline ) {
			const { before, after } = setAttr( flat[ n.index ], { attr: inline, value: true } );
			out.writes.push( { ...where, prop: `injected svg ${ source }`, attr: inline, before, after, widths: [], how: 'injected-svg' } );
			out.notes.push( `${ where.node } ${ n.name }: ${ inline } on, so the SVG the draft's code puts into ${ e.key } (${ source }) prints inline and its parts can move` );
			continue;
		}
		out.unmapped.push( { ...where, property: 'svg', value: source, reason: `the draft's code puts ${ source } into ${ e.key }; ${ n.name } has no SVG content or inline SVG setting` } );
	}
	return out;
}
