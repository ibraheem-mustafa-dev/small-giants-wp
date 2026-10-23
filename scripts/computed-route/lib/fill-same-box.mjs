// Two elements of one block that are the same box (Spec 48 FR-48-8), for the Fill post-passes. A block's root and its content
// band (`sgs/container` and every block built on it: `.sgs-container__inner` inside the root) are two elements in the live
// DOM and one element in the draft: the draft's single element carries the size and the layout the block splits across the
// two. Calibration measured both boxes at every width, so two elements whose measured boxes are equal on an axis at every
// width are one box on that axis, and a setting that paints one of them paints the other as far as that axis goes.
//   - calSameBox: calibration measured the two elements as the same box (both axes by default) at every width.
//   - layoutHome: the element a layout setting (flex-direction, align-items, justify-content ...) of the block paints, when the
//     draft element's own slot has no such setting and one of the block's settings paints an element that is the same box.
//   - innerToRoot: a size declared on an inner element of the draft whose box is the root's content box on an axis, at every
//     width, with the root's own padding and border on that axis (the extra a root minimum must add: root boxes are
//     border-box, the inner's are not).
// Never a block name, a slot name or a pixel value: the boxes come from calibration and the draft's reads.
import { LOOSE } from './resolve.mjs';
import { candidates } from './db.mjs';

const WIDTHS = [ 375, 768, 1440 ];
const TOL = 0.5;
const AXIS = { h: [ 'height', [ 'padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width' ] ], w: [ 'width', [ 'padding-left', 'padding-right', 'border-left-width', 'border-right-width' ] ] };

const elementAt = ( cal, slot ) => {
	const key = Object.keys( cal?.elements || {} ).find( ( k ) => LOOSE( k ) === LOOSE( slot ) );
	return undefined === key ? null : cal.elements[ key ];
};
const sizeAt = ( cal, slot, w, prop ) => parseFloat( elementAt( cal, slot )?.[ w ]?.[ prop ] );

// Whether calibration measured two elements as the same box on the given axes (default both) at every width.
export function calSameBox( cal, a, b, axes = [ 'h', 'w' ] ) {
	return LOOSE( a ) === LOOSE( b ) || axes.every( ( axis ) => WIDTHS.every( ( w ) => {
		const x = sizeAt( cal, a, w, AXIS[ axis ][ 0 ] );
		const y = sizeAt( cal, b, w, AXIS[ axis ][ 0 ] );
		return Number.isFinite( x ) && Number.isFinite( y ) && Math.abs( x - y ) <= TOL;
	} ) );
}

const paintedAt = ( cal, attr ) => {
	const c = cal?.settings?.[ attr ];
	return c ? [ ...( c.slots || ( undefined !== c.slot ? [ c.slot ] : [] ) ), ...( c.reaches || [] ) ] : [];
};

// The slot a setting for `prop` is written at: `slot` itself when a setting of the block paints it, else the slot of a setting
// that paints an element calibration measured as the same box as `slot` (the same box on both axes at every width), else
// `slot`. A setting is a candidate for the property in the state; a flat or tier-shaped one counts through its base name.
export function layoutHome( { db, block, cal, prop, state = null, slot } ) {
	const rows = candidates( db, block, prop, state );
	const bases = rows.map( ( r ) => r.attr_name.replace( /(Tablet|Mobile)$/, '' ) );
	const painted = bases.flatMap( ( a ) => paintedAt( cal, a ) );
	if ( painted.some( ( p ) => LOOSE( p ) === LOOSE( slot ) ) ) {
		return slot;
	}
	return painted.find( ( p ) => calSameBox( cal, slot, p ) ) ?? slot;
}

// The root target of a skeleton node and the extra a root size must carry, when the draft element `target` (a part of the
// node, at a slot) is the root's content box on `axis` at every width in `widths`: { root, extra: { width: px } }. The
// extra is the root's padding and border on that axis (the root's box less the inner's), so a root minimum of the inner's
// size plus the extra renders the inner at the size the draft declares. Null when the calibration measures the two as
// different boxes, or the draft's inner does not fill the root's content box.
export function innerToRoot( { rec, target, axis, reads, cal, widths = WIDTHS } ) {
	const root = rec.targets.find( ( t ) => '' === ( t.slot ?? '' ) );
	const slot = target.slot ?? '';
	if ( ! root || '' === slot || ! calSameBox( cal, '', slot, [ axis ] ) ) {
		return null;
	}
	const [ dim, edges ] = AXIS[ axis ];
	const extra = {};
	for ( const w of widths ) {
		const own = reads.widths?.[ w ]?.[ root.id ];
		const inner = reads.widths?.[ w ]?.[ target.id ];
		const box = own?.rect?.[ axis ];
		const part = inner?.rect?.[ axis ];
		if ( ! Number.isFinite( box ) || ! Number.isFinite( part ) ) {
			return null;
		}
		const frame = edges.reduce( ( s, p ) => s + ( parseFloat( own.styles?.[ p ] ) || 0 ), 0 );
		if ( Math.abs( box - frame - part ) > TOL + 0.5 ) {
			return null;
		}
		extra[ w ] = Math.round( ( box - part ) * 100 ) / 100;
	}
	return { root, extra, dim };
}
