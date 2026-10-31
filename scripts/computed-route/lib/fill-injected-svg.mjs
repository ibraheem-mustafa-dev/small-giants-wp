// The SVG a draft's code injects into an element at run time (Spec 48 RC12): a fetched SVG written into a stamped holder,
// or a custom element's own content, read by the skeleton inventory per width (lib/skeleton-inventory.mjs::injectedContent,
// through lib/element-facts.mjs::injected). Fill carries it through the framework's own settings, chosen from the framework
// DB: on the block whose element holds the content, or else on the nearest ancestor element's block,
//   - a string setting whose role is `svg` (a container or hero's SVG background, the media block's SVG) takes the widest
//     width's file; a narrower width that injects another file takes that width's device setting where the block has one
//     (the setting's Tablet or Mobile sibling, per device in the framework DB: `is_responsive`, sgs/media's svgContentTablet
//     and svgContentMobile, each written only where it differs from the next wider one, since an empty tier falls back to
//     it), and is a named row where it has none (the setting holds one SVG for every width); a block with several SVG
//     settings of different names (before and after) names no one setting for the draft's SVG and is a named row;
//   - else a boolean setting of the block that prints its SVG inline (an `svg` setting name, the logo's `inlineSvg`) is
//     turned on, so the file the block already carries is printed inline and its parts can move;
//   - else the content is a named row.
import fs from 'fs';
import path from 'path';
import { elementFacts } from './element-facts.mjs';
import { setAttr } from './tree.mjs';
import { servedKey } from './key-space.mjs';
import { DEVICE_SUFFIX, deviceBase } from './db.mjs';
import { TIER_OF } from './fill-regap.mjs';

const WIDTHS = [ 1440, 768, 375 ];

// The block's SVG settings from the framework DB: { content (the string setting with role svg, by its base name: one only),
// devices ({ tablet, mobile }: its per-device siblings, when the DB marks them responsive), several (the block has SVG
// settings of more than one base name), inline (a boolean setting named for SVG) }, each an attribute name or null.
export function svgSettings( db, block ) {
	const rows = db.prepare( "SELECT attr_name, is_responsive FROM block_attributes WHERE block_slug = ? AND role = 'svg' AND attr_type = 'string' ORDER BY attr_name" ).all( block );
	const bases = [ ...new Set( rows.map( ( r ) => deviceBase( r.attr_name ) ) ) ];
	const content = 1 === bases.length && rows.some( ( r ) => r.attr_name === bases[ 0 ] ) ? bases[ 0 ] : null;
	const devices = Object.fromEntries( Object.entries( DEVICE_SUFFIX ).map( ( [ tier, suffix ] ) => [ tier, content && rows.some( ( r ) => r.attr_name === `${ content }${ suffix }` && r.is_responsive ) ? `${ content }${ suffix }` : null ] ) );
	const inline = db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND attr_type = 'boolean' AND lower( attr_name ) LIKE '%svg%' ORDER BY attr_name" ).get( block )?.attr_name ?? null;
	return { content, devices, several: bases.length > 1, inline };
}

// The settings the writer fills for a block (lib/content-coverage.mjs::claimsOf): its SVG content setting and its device siblings.
export const injectedSvgSettings = ( db, block ) => {
	const s = svgSettings( db, block );
	return s.content ? [ s.content, ...Object.values( s.devices ).filter( Boolean ) ] : [];
};

// An SVG file's markup as the draft's page shows it: the XML prolog, comments and editor metadata left out.
export function svgMarkup( text ) {
	return String( text ).replace( /<\?xml[^>]*>/g, '' ).replace( /<!--[\s\S]*?-->/g, '' ).replace( /<metadata[\s\S]*?<\/metadata>/g, '' ).trim();
}

// Writes the injected SVG of every inventory element that holds one. nodes, flat, refOf as Fill's; inventory the surface's
// skeleton inventory; db the framework DB; draftFolder the handoff folder the sources are relative to; rootComponent the
// entry draft's component (an intake-space key and a served one name the same element). Returns { writes, unmapped, notes }.
export function injectedSvgWrites( { nodes, flat, refOf, inventory, db, draftFolder, rootComponent = null } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const facts = elementFacts();
	const elements = inventory?.elements || [];
	const key = ( k ) => servedKey( k, rootComponent );
	const byKey = new Map( elements.map( ( e ) => [ key( e.key ), e ] ) );
	const nodeOf = new Map( nodes.flatMap( ( n ) => n.targets.filter( ( t ) => '' === t.slot && t.finder?.tpl ).map( ( t ) => [ key( t.finder.tpl ), n ] ) ) );
	const done = new Set();
	for ( const e of elements ) {
		const by = Object.fromEntries( WIDTHS.map( ( w ) => [ w, facts.injected( e, w ) ] ).filter( ( [ , v ] ) => v?.source ) );
		const widest = WIDTHS.find( ( w ) => by[ w ] );
		if ( ! widest ) {
			continue;
		}
		let n = null;
		for ( let at = e; at && ! n; at = byKey.get( key( at.parentKey ) ) ) {
			n = nodeOf.get( key( at.key ) ) ?? null;
		}
		const where = n ? { node: refOf( flat[ n.index ] ), block: n.name, slot: '' } : { node: e.key, block: '', slot: '' };
		const source = by[ widest ].source;
		if ( ! n ) {
			out.unmapped.push( { ...where, property: 'svg', value: source, reason: `the draft's code puts ${ source } into ${ e.key }, and no block of this surface holds that element or an ancestor of it` } );
			continue;
		}
		if ( done.has( `${ n.index }|${ source }` ) ) {
			continue;
		}
		done.add( `${ n.index }|${ source }` );
		const { content, devices, several, inline } = svgSettings( db, n.name );
		if ( content ) {
			// Writes one file to one setting; a file the draft folder lacks is a named row.
			const write = ( attr, file, widths ) => {
				if ( ! fs.existsSync( path.join( draftFolder, file ) ) ) {
					out.unmapped.push( { ...where, property: attr, value: file, reason: `the injected SVG ${ file } is not in the draft folder` } );
					return false;
				}
				const { before, after } = setAttr( flat[ n.index ], { attr, value: svgMarkup( fs.readFileSync( path.join( draftFolder, file ), 'utf8' ) ) } );
				out.writes.push( { ...where, prop: `injected svg ${ file }`, attr, before, after, widths, how: 'injected-svg' } );
				return true;
			};
			if ( ! write( content, source, [ widest ] ) ) {
				continue;
			}
			// A narrower width's own file goes to its device setting, where it differs from the file the next wider width shows.
			let shown = source;
			const held = [];
			for ( const w of WIDTHS.filter( ( x ) => x < widest && by[ x ] ) ) {
				const attr = devices[ TIER_OF[ w ] ];
				if ( attr && by[ w ].source !== shown && write( attr, by[ w ].source, [ w ] ) ) {
					out.notes.push( `${ where.node } ${ n.name }: ${ attr } is the SVG the draft's code puts into ${ e.key } at ${ w }px (${ by[ w ].source })` );
				}
				if ( attr ) {
					held.push( w );
					shown = by[ w ].source;
				}
			}
			const others = WIDTHS.filter( ( w ) => by[ w ] && by[ w ].source !== source && ! held.includes( w ) );
			others.length && out.unmapped.push( { ...where, property: content, value: others.map( ( w ) => `${ w }: ${ by[ w ].source }` ).join( ', ' ), reason: `${ n.name } ${ content } holds one SVG for every width; the draft swaps to ${ others.map( ( w ) => `${ by[ w ].source } at ${ w }px` ).join( ' and ' ) }` } );
			out.notes.push( `${ where.node } ${ n.name }: ${ content } is the SVG the draft's code puts into ${ e.key } (${ source })` );
			continue;
		}
		if ( inline ) {
			const { before, after } = setAttr( flat[ n.index ], { attr: inline, value: true } );
			out.writes.push( { ...where, prop: `injected svg ${ source }`, attr: inline, before, after, widths: [], how: 'injected-svg' } );
			out.notes.push( `${ where.node } ${ n.name }: ${ inline } on, so the SVG the draft's code puts into ${ e.key } (${ source }) prints inline and its parts can move` );
			continue;
		}
		out.unmapped.push( { ...where, property: 'svg', value: source, reason: several ? `the draft's code puts ${ source } into ${ e.key }; ${ n.name } holds several SVG settings, none of which the draft names` : `the draft's code puts ${ source } into ${ e.key }; ${ n.name } has no SVG content or inline SVG setting` } );
	}
	return out;
}
