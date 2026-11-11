// Spec 49 section 8.3 and 11: a block's media slots, read from `block.json::supports.sgs.mediaElements` (the slot declaration) and
// its attributes. A slot's settings are named `{prefix}{Base}` with the first letter lower-cased when the prefix is empty
// (`source`, `alt`, `decorative`, `caption`). Only a slot that declares `kinds` and whose Source attribute is an object is
// adopted; an `element` slot with no kinds (a flag, a thumbnail fit) has no Source and is not a slot the route writes.
import fs from 'node:fs';
import path from 'node:path';
import { BLOCKS_DIR } from '../resolve.mjs';

export const slotAttr = ( prefix, base ) => ( prefix ? `${ prefix }${ base }` : base.charAt( 0 ).toLowerCase() + base.slice( 1 ) );

let index = null;
function load() {
	index = {};
	for ( const dir of fs.readdirSync( BLOCKS_DIR ) ) {
		const f = path.join( BLOCKS_DIR, dir, 'block.json' );
		if ( ! fs.existsSync( f ) ) {
			continue;
		}
		const j = JSON.parse( fs.readFileSync( f, 'utf8' ) );
		const attrs = j.attributes || {};
		index[ j.name ] = ( j.supports?.sgs?.mediaElements || [] )
			.filter( ( m ) => Array.isArray( m.kinds ) && m.kinds.length && 'object' === attrs[ slotAttr( m.prefix, 'Source' ) ]?.type )
			.map( ( m ) => {
				const has = ( base, type ) => ( type === [].concat( attrs[ slotAttr( m.prefix, base ) ]?.type ?? [] )[ 0 ] ? slotAttr( m.prefix, base ) : null );
				return { prefix: m.prefix, context: m.context, kinds: m.kinds, source: slotAttr( m.prefix, 'Source' ), alt: has( 'Alt', 'string' ), decorative: has( 'Decorative', 'boolean' ), caption: has( 'Caption', 'string' ) };
			} );
	}
}

/** @param {string} slug Block name. @return {Object[]} Its adopted media slots: { prefix, context, kinds, source, alt, decorative, caption }. */
export function blockMediaSlots( slug ) {
	index || load();
	return index[ slug ] || [];
}

/**
 * The slot one group of draft media goes to (section 11's placement rows): a background group goes to the block's Background
 * slot, a decorative group to an `element` slot (the decorative-image layer) else a content slot, any other media to the one
 * content slot. A slot is chosen only when its kinds hold every kind the group shows.
 *
 * @param {Object[]} slots Block slots.
 * @param {'background'|'decorative-image'|'media'} group Placement.
 * @param {string[]} kinds Kinds the group shows at any width.
 * @return {{slot:Object|null, reason:string|null}} The slot, or why none.
 */
export function pickSlot( slots, group, kinds ) {
	const contexts = 'background' === group ? [ 'background' ] : 'decorative-image' === group ? [ 'element', 'content' ] : [ 'content' ];
	for ( const context of contexts ) {
		const fits = slots.filter( ( s ) => s.context === context && kinds.every( ( k ) => s.kinds.includes( k ) ) );
		if ( 1 === fits.length ) {
			return { slot: fits[ 0 ], reason: null };
		}
		if ( fits.length > 1 ) {
			return { slot: null, reason: `the block has ${ fits.length } ${ context } media settings (${ fits.map( ( s ) => s.source ).join( ', ' ) }) and Fill cannot choose between them` };
		}
	}
	return { slot: null, reason: `the block has no ${ contexts[ 0 ] } media setting that takes ${ kinds.join( ' and ' ) || 'this media' }` };
}

/** @param {string} slug Block name. @return {string[]} Every setting the media writer can write for the block (each slot's Source, Alt, Decorative and Caption). */
export const mediaSettings = ( slug ) => blockMediaSlots( slug ).filter( ( s ) => 'item' !== s.context ).flatMap( ( s ) => [ s.source, s.alt, s.decorative, s.caption ].filter( Boolean ) );
