/**
 * Validation of a kit declaration's `showWhen` (the condition under which a built-in button or the carousel dots print),
 * shared by the button kit's and the carousel dots kit's block.json generators.
 *
 * The shape and the condition kinds are `src/components/kit-show-when.json`, which the editor reader
 * (`src/components/kitShown.js`) shares. `showWhen` is a list; every item is a leaf `{ attr, op, value?, key?, default? }` or a
 * group `{ any: [...] }` / `{ all: [...] }`. An empty list means "always printed" and then `showWhenNote` should say why the
 * gate cannot be mirrored (a site setting or product data the editor cannot read). Every `attr` must name a declared
 * attribute of the block (the part before a dot, for a path such as `sgsMotion.elements.root.effects`).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OPS_FILE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../src/components/kit-show-when.json' );
export const SHOW_WHEN_KINDS = JSON.parse( fs.readFileSync( OPS_FILE, 'utf8' ) );

const LEAF_KEYS = new Set( [ 'attr', 'op', 'value', 'key', 'default' ] );

function checkItem( item, at, attributes, problems ) {
	if ( ! item || 'object' !== typeof item || Array.isArray( item ) ) {
		problems.push( `${ at } must be an object` );
		return;
	}
	const groups = SHOW_WHEN_KINDS.groupOps.filter( ( g ) => g in item );
	if ( groups.length ) {
		if ( groups.length > 1 || Object.keys( item ).length > 1 ) {
			problems.push( `${ at } is a group and holds only one of ${ SHOW_WHEN_KINDS.groupOps.join( ' / ' ) }` );
			return;
		}
		const list = item[ groups[ 0 ] ];
		if ( ! Array.isArray( list ) || ! list.length ) {
			problems.push( `${ at }.${ groups[ 0 ] } must be a non-empty list` );
			return;
		}
		list.forEach( ( inner, i ) => checkItem( inner, `${ at }.${ groups[ 0 ] }[${ i }]`, attributes, problems ) );
		return;
	}
	if ( 'string' !== typeof item.attr || ! item.attr ) {
		problems.push( `${ at } needs an "attr"` );
	} else if ( attributes && ! Object.prototype.hasOwnProperty.call( attributes, item.attr.split( '.' )[ 0 ] ) && ! SHOW_WHEN_KINDS.extensionAttributes.includes( item.attr.split( '.' )[ 0 ] ) ) {
		problems.push( `${ at } names "${ item.attr }", which the block does not declare` );
	}
	const op = SHOW_WHEN_KINDS.leafOps[ item.op ];
	if ( ! op ) {
		problems.push( `${ at } has op ${ JSON.stringify( item.op ) }; known: ${ Object.keys( SHOW_WHEN_KINDS.leafOps ).join( ', ' ) }` );
		return;
	}
	for ( const need of op.needs ) {
		if ( ! ( need in item ) ) {
			problems.push( `${ at } (${ item.op }) needs "${ need }"` );
		}
	}
	const extra = Object.keys( item ).filter( ( k ) => ! LEAF_KEYS.has( k ) );
	if ( extra.length ) {
		problems.push( `${ at } has unknown keys: ${ extra.join( ', ' ) }` );
	}
}

/**
 * Check one declaration's `showWhen` and `showWhenNote`; push each problem onto `problems`.
 *
 * @param {Object}   entry      The builtinButtons entry or the carouselDots object.
 * @param {string}   at         Where it sits, for the messages.
 * @param {Object}   [attributes] The block's declared attributes (names are checked when given).
 * @param {string[]} problems   Receives the problems.
 */
export function checkShowWhen( entry, at, attributes, problems ) {
	if ( undefined !== entry?.showWhenNote && 'string' !== typeof entry.showWhenNote ) {
		problems.push( `${ at } showWhenNote must be a string` );
	}
	if ( undefined === entry?.showWhen ) {
		return;
	}
	if ( ! Array.isArray( entry.showWhen ) ) {
		problems.push( `${ at } showWhen must be a list` );
		return;
	}
	entry.showWhen.forEach( ( item, i ) => checkItem( item, `${ at } showWhen[${ i }]`, attributes, problems ) );
}
