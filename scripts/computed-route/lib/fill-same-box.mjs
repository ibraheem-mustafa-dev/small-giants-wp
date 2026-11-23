// Two elements of one block that are the same box (Spec 48 FR-48-8), for the Fill post-passes. A block's root and its content
// band (`sgs/container` and every block built on it: `.sgs-container__inner` inside the root) are two elements in the live
// DOM and one element in the draft: the draft's single element carries the size and the layout the block splits across the
// two. Two elements whose boxes are equal on an axis at every width are one box on that axis, and a setting that paints one of
// them paints the other as far as that axis goes. The boxes are calibration's measured sizes; where a size is declared rather
// than laid out (the setting record's site look keeps `auto` and `100%`), the root and the content band the record names are
// one box on an axis when nothing lies between them (declaredOneBox).
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
// A size laid out in pixels; a declared `100%`, `auto` or `stretch` is no measurement (NaN), so the declared rules judge it.
const sizeAt = ( cal, slot, w, prop ) => {
	const v = String( elementAt( cal, slot )?.[ w ]?.[ prop ] ?? '' ).trim();
	return /^-?[\d.]+px$/.test( v ) ? parseFloat( v ) : NaN;
};

const zero = ( v ) => 0 === parseFloat( v );
const MARGINS = { h: [ 'margin-top', 'margin-bottom' ], w: [ 'margin-left', 'margin-right' ] };

// The root and the block's content band at a width where the sizes are declared, not laid out (the setting record's site
// look keeps `auto` and `100%` as written): one box on the axis when the pair is the root and `cal.contentBand` (the band
// the record names, lib/setting-record.mjs), the root declares no padding or border on that axis and the band no margin other
// than `auto` (it centres in the root). The draft's one element is the block's root and its band (Spec 22 FR-22-21's
// content-width layer, which dissolves into the block).
function declaredOneBox( cal, a, b, axis, w ) {
	const band = cal?.contentBand;
	const pair = [ LOOSE( a ), LOOSE( b ) ];
	if ( ! band || ! pair.includes( '' ) || ! pair.includes( LOOSE( band ) ) ) {
		return false;
	}
	const root = elementAt( cal, '' )?.[ w ];
	const inner = elementAt( cal, band )?.[ w ];
	return !! root && !! inner && AXIS[ axis ][ 1 ].every( ( p ) => zero( root[ p ] ) ) && MARGINS[ axis ].every( ( p ) => 'auto' === inner[ p ] || zero( inner[ p ] ) );
}

const INLINE_BOX = /^inline-(flex|block|grid|table)$/;
const BLOCK_FLOW = /^(block|flow-root)$/;
const BLOCK_LEVEL = /^(block|flow-root|flex|grid|table|list-item)$/;
const OUT_OF_FLOW = /^(absolute|fixed)$/;
const childSlots = ( cal ) => Object.keys( cal?.elements || {} ).filter( ( k ) => '' !== k && ! /::/.test( k ) && ! k.includes( ' > ' ) );

// The root and a child part at a width where the sizes are declared (the site look keeps `auto` as written): one box on the
// axis when the part is the root's only in-flow child and nothing lies between them, by CSS's own sizing rules:
//   - the root declares no padding or border on the axis, and the part no margin other than `auto`;
//   - height: the root's height is `auto` (it wraps its content: the part, which is block-level or a flex or grid item);
//   - width: the root is a block box and the part fills it (`100%`, or a block-level box of `auto` width, with no maximum width), whatever its
//     siblings (a block box stacks its children); else, with no sibling beside it, the part's width is `100%`, or the root's
//     width is `auto` and it shrink-wraps (an inline-flex, inline-block, inline-grid or inline-table box).
// The look merges the block's default variants (a shape drawn bare in one, inside a link in another), so a sibling slot of the
// root counts as an alternative, not a second child, when it wraps a copy of the part (`<sibling> > <part>` is a slot too); a
// sibling out of flow (absolute, fixed) lies beside nothing. A sibling the offline render hides (display none) still counts:
// the live page's script may show it (a "read more" toggle). The root declares no minimum size on the axis.
function declaredOneChild( cal, a, b, axis, w ) {
	const pair = [ LOOSE( a ), LOOSE( b ) ];
	if ( ! pair.includes( '' ) ) {
		return false;
	}
	const part = pair.find( ( s ) => '' !== s );
	const partKey = childSlots( cal ).find( ( k ) => LOOSE( k ) === part );
	if ( ! partKey ) {
		return false;
	}
	const root = elementAt( cal, '' )?.[ w ];
	const inner = cal.elements[ partKey ]?.[ w ];
	if ( ! root || ! inner || 'none' === root.display || 'none' === inner.display || OUT_OF_FLOW.test( inner.position || '' ) ) {
		return false;
	}
	const beside = childSlots( cal ).filter( ( k ) => k !== partKey ).filter( ( k ) => {
		const e = cal.elements[ k ]?.[ w ];
		return e && ! OUT_OF_FLOW.test( e.position || '' ) && ! Object.keys( cal.elements ).includes( `${ k } > ${ partKey }` );
	} );
	const floor = String( root[ 'h' === axis ? 'min-height' : 'min-width' ] ?? 'auto' );
	if ( ! ( 'auto' === floor || zero( floor ) ) || ! AXIS[ axis ][ 1 ].every( ( p ) => zero( root[ p ] ) ) || ! MARGINS[ axis ].every( ( p ) => 'auto' === inner[ p ] || zero( inner[ p ] ) ) ) {
		return false;
	}
	const display = String( root.display || '' );
	const itemised = /(^|-)(flex|grid)$/.test( display );
	const capped = ! [ 'none', '100%', undefined ].includes( inner[ 'max-width' ] );
	const fills = ! capped && ( '100%' === inner.width || ( BLOCK_LEVEL.test( String( inner.display || '' ) ) && 'auto' === inner.width ) );
	// In a block box the children stack, so a sibling never narrows a part that fills the root's width.
	if ( 'w' === axis && BLOCK_FLOW.test( display ) && fills ) {
		return true;
	}
	if ( beside.length ) {
		return false;
	}
	if ( 'h' === axis ) {
		return 'auto' === root.height && ( itemised || BLOCK_LEVEL.test( String( inner.display || '' ) ) );
	}
	return ( ! capped && '100%' === inner.width ) || ( 'auto' === root.width && INLINE_BOX.test( display ) );
}

// Whether two elements are the same box on the given axes (default both) at every width: calibration's measured boxes equal,
// or, where the sizes are declared, the root and its content band with nothing between them (declaredOneBox), or the root and
// its only child part (declaredOneChild).
export function calSameBox( cal, a, b, axes = [ 'h', 'w' ] ) {
	return LOOSE( a ) === LOOSE( b ) || axes.every( ( axis ) => WIDTHS.every( ( w ) => {
		const x = sizeAt( cal, a, w, AXIS[ axis ][ 0 ] );
		const y = sizeAt( cal, b, w, AXIS[ axis ][ 0 ] );
		if ( Number.isFinite( x ) && Number.isFinite( y ) ) {
			return Math.abs( x - y ) <= TOL;
		}
		return declaredOneBox( cal, a, b, axis, w ) || declaredOneChild( cal, a, b, axis, w );
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
