// A picture the draft paints as a box's own background (`<div style="background-image:url(x.jpg); background-size:cover">`,
// a card photo drawn with CSS), copied by a block that draws its picture as a replaced element (an <img> part). The media
// writer already takes the box's picture as the block's Source (lib/fill-read-collect.mjs reads it as the element's own
// image); this pass makes the picture's look reach the settings of the part that draws it.
//   - The part: the one element of the block's calibrated default paint that is a replaced picture (`_tag` img) and that a
//     calibrated setting paints object-fit on (the part a fit setting holds). A block with none gains nothing.
//   - The read: a node whose draft element is read at its root only, and paints exactly one url() picture there, gains a
//     target at that part reading the same element, with the picture's fit and position as object-fit and object-position:
//     background-size cover and contain are those fits, `100% 100%` is fill and `auto` is none; background-position is the
//     same place (both properties place the picture in its box by the same rules).
//   - The background longhands that describe the picture (its image, size, position, and its repeat when the picture covers
//     the box) leave the root's read: the block draws the picture at the part, so no background setting answers them.
//   - A size no fit draws (a percentage or a length) and the repeat beside it stay in the root's read, so they are reported
//     as before; the part's read carries no background longhand.
//   - The box's own object-fit and an `auto` aspect-ratio are no look of the picture (a box that is no replaced element draws
//     nothing with object-fit, and its auto ratio means "sized by its box", where a picture's means "its file's"): the part's
//     read drops them, so a size no fit draws writes no fit and the picture keeps the block's ratio.
// Never a block name or a slot name: the part comes from the calibration. Mutates reads.widths, reads.declared and the nodes'
// targets in place; returns one entry per node changed ({ index, slot, fits: { width: object-fit } }).
import { READ_WIDTHS } from './fill-read.mjs';
import { paintedProps } from './css-families.mjs';

const SINGLE_URL = /^url\(\s*(["']?)([^"')]+)\1\s*\)$/;
const PICTURE_TAGS = new Set( [ 'img' ] );
const BG_LOOK = [ 'background-image', 'background-size', 'background-position-x', 'background-position-y', 'background-position' ];

// The object-fit that draws a picture the way a background-size does, or null when no fit does.
export function fitOfBackgroundSize( size ) {
	const v = String( size ?? '' ).trim().toLowerCase().replace( /\s+/g, ' ' );
	if ( 'cover' === v || 'contain' === v ) {
		return v;
	}
	if ( '100% 100%' === v ) {
		return 'fill';
	}
	return 'auto' === v || 'auto auto' === v ? 'none' : null;
}

// The block's one replaced-picture part that a calibrated resting setting paints object-fit on, or null.
export function picturePart( cal ) {
	const tagOf = ( slot ) => Object.values( cal?.elements?.[ slot ] || {} ).find( ( v ) => v?._tag )?._tag ?? null;
	const fitSlots = new Set( Object.values( cal?.settings || {} ).filter( ( s ) => paintedProps( s ).includes( 'object-fit' ) && ! s.state ).flatMap( ( s ) => s.slots || [ s.slot ] ) );
	const parts = [ ...fitSlots ].filter( ( slot ) => '' !== slot && PICTURE_TAGS.has( tagOf( slot ) ) );
	return 1 === parts.length ? parts[ 0 ] : null;
}

// Whether a read paints one picture as its own background: one url() background layer, and that address is the one picture
// the read lists (lib/fill-read-collect.mjs lists a background as the element's picture only for a wordless, childless box).
export function paintsOwnPicture( snap ) {
	const m = SINGLE_URL.exec( String( snap?.styles?.[ 'background-image' ] ?? '' ).trim() );
	const media = snap?.media || [];
	return !! ( m && ! snap.missing && 1 === media.length && media[ 0 ].src === m[ 2 ] );
}

// The part's read of the same element: the root's read with the picture's look as object-fit and object-position.
function asPicture( snap, fit ) {
	const styles = { ...snap.styles };
	[ ...BG_LOOK, 'background-repeat' ].forEach( ( p ) => delete styles[ p ] );
	const x = snap.styles[ 'background-position-x' ];
	const y = snap.styles[ 'background-position-y' ];
	fit ? ( styles[ 'object-fit' ] = fit ) : delete styles[ 'object-fit' ];
	undefined !== x && undefined !== y && ( styles[ 'object-position' ] = `${ x } ${ y }` );
	/^auto$/i.test( String( styles[ 'aspect-ratio' ] ?? '' ).trim() ) && delete styles[ 'aspect-ratio' ];
	return { ...snap, styles };
}

// The root's read once the part holds the picture: the background longhands the part's settings answer are gone.
function withoutPicture( styles, fit ) {
	const out = { ...styles };
	[ 'background-image', 'background-position-x', 'background-position-y', 'background-position' ].forEach( ( p ) => delete out[ p ] );
	if ( fit ) {
		delete out[ 'background-size' ];
		( 'cover' === fit || 'fill' === fit ) && delete out[ 'background-repeat' ];
	}
	return out;
}

// The same, for the author-declared longhands of one read (lib/fill-declared.mjs), when the draft declared any.
function declaredAs( declared, fit, own ) {
	if ( ! declared ) {
		return declared;
	}
	if ( own ) {
		return withoutPicture( declared, fit );
	}
	const out = { ...declared };
	[ ...BG_LOOK, 'background-repeat' ].forEach( ( p ) => delete out[ p ] );
	fit && undefined !== declared[ 'background-size' ] && ( out[ 'object-fit' ] = fit );
	undefined !== declared[ 'background-position-x' ] && undefined !== declared[ 'background-position-y' ] && ( out[ 'object-position' ] = `${ declared[ 'background-position-x' ] } ${ declared[ 'background-position-y' ] }` );
	return out;
}

/**
 * @param {Object}   reads  lib/fill-read.mjs::readDraft's result ({ widths, declared }).
 * @param {Object[]} nodes  lib/fill-skeleton.mjs::skeletonNodes.
 * @param {Function} calFor ( block ) => the block's calibration with its default paint's `elements`.
 * @return {Object[]} { index, slot, fits } per node given the part's read.
 */
export function pictureBoxReads( reads, nodes, calFor ) {
	const changed = [];
	for ( const rec of nodes ) {
		const root = rec.targets.find( ( t ) => '' === t.slot );
		if ( ! root ) {
			continue;
		}
		const slot = picturePart( calFor( rec.name ) );
		if ( null === slot || rec.targets.some( ( t ) => t.slot === slot ) ) {
			continue;
		}
		const widths = READ_WIDTHS.filter( ( w ) => paintsOwnPicture( reads.widths?.[ w ]?.[ root.id ] ) );
		if ( ! widths.length ) {
			continue;
		}
		const id = `${ rec.index }:${ slot }`;
		const fits = {};
		for ( const w of READ_WIDTHS ) {
			const snap = reads.widths?.[ w ]?.[ root.id ];
			if ( ! snap ) {
				continue;
			}
			if ( ! widths.includes( w ) ) {
				reads.widths[ w ][ id ] = snap.missing ? { missing: true } : snap;
				continue;
			}
			const fit = fitOfBackgroundSize( snap.styles[ 'background-size' ] );
			fits[ w ] = fit;
			reads.widths[ w ][ id ] = asPicture( snap, fit );
			reads.widths[ w ][ root.id ] = { ...snap, styles: withoutPicture( snap.styles, fit ) };
			const declared = reads.declared?.[ w ]?.[ root.id ];
			if ( declared ) {
				reads.declared[ w ][ id ] = declaredAs( declared, fit, false );
				reads.declared[ w ][ root.id ] = declaredAs( declared, fit, true );
			}
		}
		rec.targets.push( { id, index: rec.index, slot, finder: root.finder, scoped: true, state: null } );
		changed.push( { index: rec.index, slot, fits } );
	}
	return changed;
}
