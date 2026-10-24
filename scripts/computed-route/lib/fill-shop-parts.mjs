// Fill's reader of the shop parts record (Spec 48 FR-48-60 to FR-48-62): `sites/<client>/build/shop-parts.json`, written
// by shop-parts.mjs, maps each part of the draft's buy box, shop filter and basket drawer to its framework home. A part
// whose home is a block's settings and that carries the draft's own value (`write`: { attr: value }, the literal label of
// a checkout, remove or empty-basket part) is written onto every node of that block in the surface Fill builds (the
// header's `sgs/cart` takes the drawer's values), as a content write (`how: 'shop-part'`, never confirmed as a style). A
// setting the block's schema lacks, and a value another writer already put on the node that differs from the draft's, are
// rows, never written silently. A part whose block is not in this surface is a note: another surface builds it. A part
// the record lists with no value (a style setting, a built-in part, a missing feature) is left to the record and its
// missing-features rows.
import fs from 'node:fs';
import path from 'node:path';
import { setAttr } from './tree.mjs';

export const SHOP_PARTS_FILE = 'shop-parts.json';

const json = ( v ) => JSON.stringify( v ?? null );
const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );

// The client's shop parts record, or null when the client has none. A file that is not the record's shape throws, naming
// the file: a shop surface built without its parts is never silent.
export function loadShopParts( buildDir ) {
	const file = path.join( buildDir, SHOP_PARTS_FILE );
	if ( ! fs.existsSync( file ) ) {
		return null;
	}
	const record = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( ! isObj( record ) || ! Array.isArray( record.surfaces ) || record.surfaces.some( ( s ) => ! isObj( s ) || ! Array.isArray( s.parts ) ) ) {
		throw new Error( `${ file } is not a shop parts record (surfaces[].parts[]); rerun shop-parts.mjs --write` );
	}
	return record;
}

// The parts of a record that carry a value for a block's settings: [ { surface, part, block, writes: [ [ attr, value ] ] } ].
export function valueParts( record ) {
	return ( record?.surfaces || [] ).flatMap( ( s ) => ( s.parts || [] )
		.filter( ( p ) => 'setting' === p.home?.type && p.home.block && isObj( p.write ) && Object.keys( p.write ).length )
		.map( ( p ) => ( { surface: s.kind, part: p, block: p.home.block, writes: Object.entries( p.write ) } ) ) );
}

// The writes for one Fill run. nodes: Fill's records ({ index, name }); flat: the tree's nodes by index; refOf( node ): its
// ref; attrExists( block, attr ): whether the block's schema has the setting; writes: the writes made so far this run (a
// value another writer put on the node is theirs). Returns { writes, unmapped, notes }.
export function shopPartWrites( { record, nodes, flat, refOf, attrExists, writes: prior = [] } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	for ( const { surface, part, block, writes } of valueParts( record ) ) {
		const homes = nodes.filter( ( rec ) => rec.name === block );
		if ( ! homes.length ) {
			out.notes.push( `shop part ${ part.id } (${ surface }): no ${ block } in this surface, so its ${ writes.map( ( [ a ] ) => a ).join( ', ' ) } is written where ${ block } is built` );
			continue;
		}
		for ( const rec of homes ) {
			const node = flat[ rec.index ];
			const ref = refOf( node );
			for ( const [ attr, value ] of writes ) {
				const row = { node: ref, block, slot: '', property: '(content)', value: json( value ), state: null };
				if ( ! attrExists( block, attr ) ) {
					out.unmapped.push( { ...row, reason: `shop part ${ part.id } (${ surface }) names ${ attr }, which ${ block } has no setting for; rerun shop-parts.mjs against the current framework DB` } );
					continue;
				}
				const held = node.attributes?.[ attr ];
				if ( json( held ) === json( value ) ) {
					continue;
				}
				const other = prior.find( ( w ) => w.index === rec.index && w.attr === attr );
				if ( other && undefined !== held ) {
					out.unmapped.push( { ...row, reason: `conflict: ${ attr } already holds ${ json( held ) } (written by ${ other.how }); the draft's ${ part.label } is ${ json( value ) }` } );
					continue;
				}
				const { before, after } = setAttr( node, { attr, value } );
				out.writes.push( { node: ref, index: rec.index, block, slot: '', prop: '(content)', attr, before, after, widths: [], how: 'shop-part', note: `shop part ${ part.id } (${ surface }): the draft's ${ part.label }` } );
			}
		}
	}
	return out;
}
