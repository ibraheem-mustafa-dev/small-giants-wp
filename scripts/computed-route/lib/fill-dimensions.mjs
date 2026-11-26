// A draft's size against a block's built-in size (Spec 48 FR-48-8) for Fill. The generic resolver writes a plain size
// property to the setting that paints it, and writes a size keyword (`none`, `auto`, `fit-content`, `min-content`, `max-content`)
// where the setting prints one (lib/resolve-declared.mjs::sizeKeyword); it leaves a row when the setting stores a number beside
// a unit (a keyword it cannot print: "cannot be held") or when the block has no setting for the property (a declared `height`). Both
// leave the block's own floor or ceiling in force: `sgs/button` paints `min-height: 48px`, so a 34px draft pill renders 48px
// and wraps. This pass is one rule over the whole size family (height, width, min-*, max-*, and their block-size /
// inline-size forms), for every block and property:
//   1. A floor or ceiling the draft does not declare (`auto`, `none`, 0) but the block paints, against the draft's rendered
//      size. A floor above the rendered size, or a ceiling below it, is written to the block's min-* / max-* setting at the
//      rendered size at every width ("match the draft"). The block's paint comes from its calibration (the default paint of
//      the element); for the block's own root it also comes from the block's stylesheet. A ceiling stands in for the draft's
//      `none` by effect: a ceiling at or above the element's unconstrained size paints the same, and under `none` the draft's
//      rendered size is that size. So a ceiling the block paints relative to the page (a percentage of its container, whose
//      size only the built page knows) is written as the rendered size too. A ceiling is written only when the draft's
//      rendered size is known at every width the element is read at, and only when the value the setting holds is at or above
//      that size at every width; otherwise the row stays, with the reason.
//   2. A declared size in a dimension the block has no setting for: a declared height or width goes to the block's minimum in
//      that dimension when the draft's content fits inside it at every width (children's extents, plus the element's padding
//      and border). When the content is taller or wider it is not written (the minimum would grow the box the draft overflows);
//      the row stays, with that reason.
//   2b. A declared height or width on a replaced image (img, picture, video, canvas) whose other dimension is not declared as a
//      length, so it keeps its proportions, goes to the block's ceiling in that dimension (max-height, max-width) when a setting
//      of that ceiling is calibrated on the element read and the block paints the element larger than the declared size at
//      every width (an image the block leaves unbounded, an `auto` size under a `none` ceiling as the site look keeps it, is larger than any declared size): the ceiling clamps the image to the declared size and the other dimension follows. A block that paints it
//      smaller, or an element with both dimensions declared, is left to rule 2. A picture a custom element draws (a logo
//      element inlining its SVG) read at the block's root counts as the image, and the ceiling goes to the block's one
//      calibrated inner image when the root has none. A fluid declared size (clamp(), min(), calc()) is the image's rendered
//      size at that width, so the ceiling is written per device; a not-plain exact size row reaches this rule alone.
//   3. An interactive element's written height or width is never below 24px (WCAG 2.2 AA target size, 2.5.8): a smaller draft
//      value is written as 24px with a `touch-target` divergence-ledger entry.
// Every size is formatted and checked by the generic resolver (lib/fill-prop.mjs::resolveProperty), so a value is written
// as the setting's own shape. A row naming several nodes (`nodes`) is judged and written on each. Returns { writes, unmapped
// (the rows left), answered (lib/fill-regap.mjs::answer: each row written or settled, with the read widths it answers),
// notes, ledger }.
import fs from 'node:fs';
import path from 'node:path';
import { BLOCKS_DIR, defaultPaint, LOOSE } from './resolve.mjs';
import { WIDTHS, TIER_OF, rowTarget, rowValues, rectAt, reresolve, commit, perNode, regroup, answer } from './fill-regap.mjs';
import { innerToRoot } from './fill-same-box.mjs';
import { attrRow } from './db.mjs';
import { paintedProps } from './css-families.mjs';
import { inlineBox, INLINE_LEVEL } from './fill-inline-box.mjs';
import { PX_TOL } from './css-equivalence/tolerance.mjs';

const LOGICAL = { 'block-size': 'height', 'inline-size': 'width', 'min-block-size': 'min-height', 'min-inline-size': 'min-width', 'max-block-size': 'max-height', 'max-inline-size': 'max-width' };
// The size family: physical name -> { kind: exact | min | max, axis: h | w }.
export const SIZE_FAMILY = {
	height: { kind: 'exact', axis: 'h' }, width: { kind: 'exact', axis: 'w' },
	'min-height': { kind: 'min', axis: 'h' }, 'min-width': { kind: 'min', axis: 'w' },
	'max-height': { kind: 'max', axis: 'h' }, 'max-width': { kind: 'max', axis: 'w' },
};
export const physical = ( prop ) => LOGICAL[ prop ] ?? prop;
export const sizeOf = ( prop ) => SIZE_FAMILY[ physical( prop ) ] ?? null;
export const MIN_TARGET = 24;
const NO_SIZE = new Set( [ 'auto', 'none', 'normal', '0', '0px', 'initial', 'unset', 'revert' ] );
const INTERACTIVE_TAGS = new Set( [ 'a', 'button', 'input', 'select', 'textarea', 'summary' ] );
const REPLACED_TAGS = new Set( [ 'img', 'picture', 'video', 'canvas' ] );

// The block's one inner image element (calibrated default paint `_tag` img), or null when it has none or several.
export function innerImageSlot( cal ) {
	const imgs = Object.entries( cal?.elements || {} ).filter( ( [ k, byWidth ] ) => '' !== k && ! k.includes( '::' ) && Object.values( byWidth || {} ).some( ( r ) => 'img' === String( r?._tag ?? '' ).toLowerCase() ) );
	return 1 === imgs.length ? imgs[ 0 ][ 0 ] : null;
}

// A size declared as an expression (clamp(), min(), max(), calc()): its value is a layout result, the rendered size.
const FLUID = /^(clamp|min|max|calc)\(/i;

// Whether a setting painting `prop` at rest is calibrated on `slot` of the block.
export const calibratedAt = ( cal, slot, prop ) => Object.values( cal?.settings || {} ).some( ( s ) => paintedProps( s ).includes( prop ) && ! s.state && [ s.slot, ...( s.slots || [] ) ].some( ( x ) => 'string' === typeof x && LOOSE( x ) === LOOSE( slot ) ) );
const ONLY_GAPS = /^(shape|no-setting)\b/;
const pxOf = ( v ) => ( /^-?\d+(\.\d+)?(px)?$/.test( String( v ).trim() ) ? parseFloat( v ) : null );

// The px a stylesheet paints on the block's root for a property (`.sgs-<name> { min-height: 48px }`), or {}.
const cssFloors = new Map();
function stylesheetPaint( block, prop ) {
	const dir = block.replace( /^sgs\//, '' );
	if ( ! cssFloors.has( block ) ) {
		const file = path.join( BLOCKS_DIR, dir, 'style.css' );
		const text = fs.existsSync( file ) ? fs.readFileSync( file, 'utf8' ).replace( /\/\*[\s\S]*?\*\//g, '' ) : '';
		cssFloors.set( block, [ ...text.matchAll( /([^{}]+)\{([^{}]*)\}/g ) ].filter( ( m ) => m[ 1 ].split( ',' ).some( ( s ) => s.trim() === `.sgs-${ dir }` ) ).map( ( m ) => m[ 2 ] ).join( ';' ) );
	}
	const m = cssFloors.get( block ).match( new RegExp( `(?:^|;|\\s)${ prop }\\s*:\\s*([^;]+)` ) );
	const px = m ? [ ...m[ 1 ].matchAll( /(-?\d+(?:\.\d+)?)px/g ) ].at( -1 )?.[ 1 ] : null;
	return null === px || undefined === px ? {} : Object.fromEntries( WIDTHS.map( ( w ) => [ w, parseFloat( px ) ] ) );
}

// The size the block paints for a replaced image at each width, in px, for the ceiling rule (2b). Where the element paints no
// length of its own, an `auto` size under a `none` ceiling (what the site look keeps from the cascade: nothing bounds the
// picture), it is as large as the picture itself: `natural`, the picture's own size along the axis read from the draft's media
// (a file 16px tall is 16px, never more). A picture whose natural size is unknown (an svg with no intrinsic size) claims nothing.
function pictureRoom( { block, slot, prop, cal, natural = {} } ) {
	const paint = blockPaint( { block, slot, prop, cal } );
	const same = ( a, b ) => LOOSE( a ) === LOOSE( b );
	const size = defaultPaint( cal, slot, prop, same );
	const ceiling = defaultPaint( cal, slot, `max-${ prop }`, same );
	const unbounded = ( w ) => 'auto' === String( size[ w ] ?? '' ).trim() && 'none' === String( ceiling[ w ] ?? '' ).trim();
	return Object.fromEntries( WIDTHS.map( ( w ) => [ w, paint[ w ] ?? ( unbounded( w ) ? natural[ w ] : undefined ) ] ).filter( ( [ , v ] ) => Number.isFinite( v ) ) );
}

// The natural size, in px along an axis, of the one picture the target holds at each width where the read knows it.
function naturalSize( reads, target, prop, widths ) {
	const key = /height/.test( prop ) ? 'h' : 'w';
	return Object.fromEntries( widths.map( ( w ) => {
		const media = reads.widths?.[ w ]?.[ target.id ]?.media || [];
		return [ w, 1 === media.length ? media[ 0 ].natural?.[ key ] : undefined ];
	} ).filter( ( [ , v ] ) => Number.isFinite( v ) && v > 0 ) );
}

// A ceiling the block paints as something other than a length or `none` (100%, a calc()): its size is the page's.
const relativeCeiling = ( v ) => undefined !== v && null !== v && ! NO_SIZE.has( String( v ).trim() ) && null === pxOf( v );

// What a resolver result holds at a width, in px, or null where it cannot be read as px: a tier object carries its nearest
// wider tier down, and a unit partner write (a typography setting's fontSizeUnit beside fontSize) names the unit.
const WIDER = { 375: [ 'mobile', 'tablet', 'desktop' ], 768: [ 'tablet', 'desktop' ], 1440: [ 'desktop' ] };
function writtenPx( res, w ) {
	const at = ( value ) => ( value && 'object' === typeof value ? WIDER[ w ].map( ( t ) => value[ t ] ).find( ( v ) => undefined !== v && '' !== v ) : value );
	const main = ( res.writes || [] ).filter( ( x ) => ! x.unit );
	const unit = ( res.writes || [] ).find( ( x ) => x.unit );
	if ( 1 !== main.length || ( unit && 'px' !== String( at( unit.value ) ?? 'px' ) ) ) {
		return null;
	}
	const m = /^(-?\d*\.?\d+)(px)?$/.exec( String( at( main[ 0 ].value ) ?? '' ).trim() );
	return m ? Number( m[ 1 ] ) : null;
}

// The size the block paints for a property on an element at each width, in px: { width: px }.
function blockPaint( { block, slot, prop, cal } ) {
	const painted = defaultPaint( cal, slot, prop, ( a, b ) => LOOSE( a ) === LOOSE( b ) );
	const out = Object.fromEntries( Object.entries( painted ).map( ( [ w, v ] ) => [ w, pxOf( v ) ] ).filter( ( [ , v ] ) => null !== v ) );
	return Object.keys( out ).length || '' !== slot ? out : stylesheetPaint( block, prop );
}

// The content extent inside an element along an axis at a width: the box's own scroll size where the read has it (the
// content's whole extent, overflow included), else the children's far edge from the element's near edge plus the element's
// padding and border on that far side. Null when nothing says how big the content is.
export function contentExtent( { nodes, reads }, rec, target, axis, w ) {
	const scroll = reads.widths?.[ w ]?.[ target.id ]?.[ 'h' === axis ? 'scrollHeight' : 'scrollWidth' ];
	if ( Number.isFinite( scroll ) ) {
		return scroll;
	}
	const own = rectAt( reads, target, w );
	const styles = reads.widths?.[ w ]?.[ target.id ]?.styles || {};
	const far = 'h' === axis ? [ 'padding-bottom', 'border-bottom-width' ] : [ 'padding-right', 'border-right-width' ];
	const tail = far.reduce( ( s, p ) => s + ( parseFloat( styles[ p ] ) || 0 ), 0 );
	const kids = ( rec.children || [] ).map( ( i ) => {
		const t = ( nodes[ i ]?.targets || [] ).find( ( x ) => '' === x.slot );
		const r = t ? reads.widths?.[ w ]?.[ t.id ] : null;
		return r && ! r.missing && false !== r.inFlow && r.rect ? r.rect : null;
	} ).filter( Boolean );
	if ( ! own || ! kids.length ) {
		return null;
	}
	const edge = Math.max( ...kids.map( ( r ) => ( 'h' === axis ? r.y + r.h : r.x + r.w ) ) );
	return edge - ( 'h' === axis ? own.y : own.x ) + tail;
}

const interactive = ( reads, target, w ) => {
	const r = reads.widths?.[ w ]?.[ target.id ];
	return !! r && ( INTERACTIVE_TAGS.has( r.tag ) || !! r.href || 'button' === r.styles?.role );
};

const nextId = ( entries ) => `D-${ 1 + Math.max( 0, ...entries.map( ( e ) => Number( String( e.id ).replace( /^D-/, '' ) ) || 0 ) ) }`;

export function dimensionWrites( { nodes, flat, refOf, reads, db, unmapped, calFor = () => null, snapshot = null, scope = '', entries = [], date = new Date().toISOString().slice( 0, 10 ), resolver } ) {
	const out = { writes: [], unmapped: [], answered: [], notes: [], ledger: [] };
	const ctx = { reads, db, calFor, snapshot };
	for ( const row of perNode( unmapped ) ) {
		let result = null;
		if ( 'display' === row.property ) {
			// A draft's inline-level box (shrink-to-content) against a block that paints block-level (lib/fill-inline-box.mjs).
			const hit = /^no-setting\b/.test( row.reason ?? '' ) && '' === ( row.slot ?? '' ) && INLINE_LEVEL.test( String( row.value ?? '' ).trim() ) ? rowTarget( { nodes, flat, refOf }, row ) : null;
			result = hit ? inlineBox( { row, hit, nodes, flat, ctx, out, resolver } ) : null;
		} else if ( 'flex-shrink' === row.property ) {
			result = /^no-setting\b/.test( row.reason ?? '' ) && ! row.state && '' === ( row.slot ?? '' ) ? fixedSizing( { row, nodes, flat, refOf, reads, db, calFor, out } ) : null;
		} else {
			const size = sizeOf( row.property ?? '' );
			const gapRow = ONLY_GAPS.test( row.reason ?? '' ) || ( 'exact' === size?.kind && /^not-plain\b/.test( row.reason ?? '' ) );
			const hit = size && gapRow && ! row.state ? rowTarget( { nodes, flat, refOf }, row ) : null;
			result = hit ? handle( { row, size, hit, nodes, flat, ctx, out, scope, entries, date, resolver } ) : null;
		}
		if ( null === result ) {
			out.unmapped.push( row );
		} else if ( result.raise ) {
			out.unmapped.push( { ...row, reason: `${ row.reason }; dimension: ${ result.raise }` } );
		} else {
			out.answered.push( answer( row, result.answered ) );
		}
	}
	out.unmapped = regroup( out.unmapped );
	return out;
}

// Returns { answered: the read widths the row is settled at }, { raise: reason } (the row stays with a reason), or null
// (not this pass's row).
function handle( { row, size, hit, nodes, flat, ctx, out, scope, entries, date, resolver } ) {
	const { rec, target } = hit;
	const { reads } = ctx;
	const node = flat[ rec.index ];
	const prop = physical( row.property );
	const slot = row.slot ?? '';
	const cal = ctx.calFor( rec.name, rec );
	const given = rowValues( row, reads, target );
	const declaredAt = ( w ) => reads.declared?.[ w ]?.[ target.id ]?.[ prop ];
	const rendered = Object.fromEntries( WIDTHS.map( ( w ) => [ w, rectAt( reads, target, w )?.[ size.axis ] ] ).filter( ( [ , v ] ) => Number.isFinite( v ) ) );
	const widths = WIDTHS.filter( ( w ) => undefined !== rendered[ w ] );
	if ( ! widths.length ) {
		return null;
	}
	const noSize = ( w ) => NO_SIZE.has( String( given[ w ] ?? declaredAt( w ) ?? 'auto' ).trim() );
	const noSizeAll = () => widths.every( noSize );
	// A size declared on an inner element that is the root's content box (the block's own band inside its root) goes to the
	// root's setting, with the root's padding and border added; the draft's one element is both in the live DOM.
	const home = '' !== slot && ! noSizeAll() ? innerToRoot( { rec, target, axis: size.axis, reads, cal, widths } ) : null;
	const ask = ( p, draft ) => reresolve( { rec, node, target: home?.root ?? target, slot: home ? '' : slot, prop: p, draft, ctx, resolver } );
	const touched = [];
	// 3: an interactive element's size is never below the target size.
	const guard = ( px, w, p ) => {
		if ( px < MIN_TARGET && interactive( reads, target, w ) ) {
			touched.push( { w, from: px, prop: p } );
			return MIN_TARGET;
		}
		return px;
	};
	// check( res ): a reason the result must not be written, or null.
	// here: ask on the element read itself (a setting calibrated on it), never on the root it may be the content box of.
	// at: the slot asked when `here` (the element's own slot by default).
	const settle = ( p, perWidth, why, check = null, here = false, at = slot ) => {
		const draft = Object.fromEntries( widths.map( ( w ) => [ w, `${ guard( Math.round( ( perWidth[ w ] + ( here ? 0 : home?.extra[ w ] ?? 0 ) ) * 100 ) / 100, w, p ) }px` ] ) );
		const res = here ? reresolve( { rec, node, target, slot: at, prop: p, draft, ctx, resolver } ) : ask( p, draft );
		if ( 'written' !== res.status && 'equal' !== res.status ) {
			return { raise: `the block has no setting that holds ${ p } ${ Object.values( draft ).join( ' / ' ) } (${ res.gap ?? 'gap' }: ${ res.detail ?? '' }); a framework setting is needed` };
		}
		const refused = 'written' === res.status && check ? check( res ) : null;
		if ( refused ) {
			return { raise: refused };
		}
		'written' === res.status && commit( out, { rec, node, row, prop: p, res, how: 'dimension', note: why } );
		touched.length && ledger( p );
		out.notes.push( `${ row.node } ${ rec.name }${ slot ? ` (${ slot })` : '' } ${ p }: ${ why }${ touched.length ? `; ${ touched.map( ( t ) => `${ t.from }px at ${ t.w } raised to ${ MIN_TARGET }px (touch target)` ).join( ', ' ) }` : '' }` );
		return { answered: widths };
	};
	const ledger = ( p ) => {
		const e = { id: nextId( [ ...entries, ...out.ledger ] ), scope, node: row.node, state: '*', property: p, widths: touched.map( ( t ) => t.w ), expected: { rule: 'touch-target' },
			reason: `the draft's ${ p } is ${ touched.map( ( t ) => `${ t.from }px at ${ t.w }` ).join( ', ' ) }; an interactive element is never written below the ${ MIN_TARGET }px target size (WCAG 2.2 AA 2.5.8)`, decided: `${ date } Bean ruling (24px target size)` };
		! out.ledger.some( ( x ) => x.node === e.node && x.property === e.property && x.reason === e.reason ) && out.ledger.push( e );
	};
	// 1: a floor or ceiling the draft does not declare but the block paints.
	const against = ( kind, p ) => {
		const paint = blockPaint( { block: rec.name, slot, prop: p, cal } );
		const clash = widths.filter( ( w ) => undefined !== paint[ w ] && ( 'min' === kind ? paint[ w ] > rendered[ w ] + PX_TOL : paint[ w ] < rendered[ w ] - PX_TOL ) );
		const raw = defaultPaint( cal, slot, p, ( a, b ) => LOOSE( a ) === LOOSE( b ) );
		const relative = 'max' === kind ? widths.filter( ( w ) => undefined === paint[ w ] && relativeCeiling( raw[ w ] ) ) : [];
		if ( ! clash.length && ! relative.length ) {
			out.notes.push( `${ row.node } ${ rec.name }${ slot ? ` (${ slot })` : '' } ${ row.property }: ${ Object.keys( paint ).length ? `the block's ${ p } (${ Object.values( paint ).join( ' / ' ) }px) does not contradict the draft's rendered size` : `the block paints no ${ p } that is known` }; nothing to write` );
			return Object.keys( paint ).length ? { answered: widths } : { raise: `the block's own ${ p } is unknown (no calibrated paint), so whether it contradicts the draft's rendered ${ Object.values( rendered ).join( ' / ' ) }px is unproven` };
		}
		const why = `the block paints ${ p } ${ [ ...clash.map( ( w ) => `${ paint[ w ] }px` ), ...relative.map( ( w ) => raw[ w ] ) ].join( ' / ' ) } where the draft renders ${ [ ...clash, ...relative ].map( ( w ) => `${ Math.round( rendered[ w ] ) }px` ).join( ' / ' ) } (${ row.property } ${ [ ...new Set( widths.map( ( w ) => given[ w ] ?? 'auto' ) ) ].join( ' / ' ) }); the draft's rendered size is written`;
		return 'min' === kind ? settle( p, rendered, why ) : ceiling( p, why );
	};
	// A ceiling equal to the draft's none by effect: the rendered size must be known wherever the element is read, and the value
	// the setting holds must not be below it anywhere.
	const ceiling = ( p, why ) => {
		const none = given[ widths[ 0 ] ] ?? 'none';
		const unknown = WIDTHS.filter( ( w ) => reads.widths?.[ w ]?.[ target.id ] && ! reads.widths[ w ][ target.id ].missing && undefined === rendered[ w ] );
		if ( unknown.length ) {
			return { raise: `the block paints a ${ p } ceiling, but the draft's rendered size is unknown at ${ unknown.join( ', ' ) }, so no ceiling equal to ${ row.property } ${ none } can be written` };
		}
		return settle( p, rendered, `${ why } as the ceiling (a ceiling at the unconstrained size paints the same as ${ none })`, ( res ) => {
			const below = widths.filter( ( w ) => null === writtenPx( res, w ) || writtenPx( res, w ) < rendered[ w ] - PX_TOL );
			return below.length ? `the ${ p } the setting would hold (${ below.map( ( w ) => `${ writtenPx( res, w ) ?? 'not a px length' } at ${ w }` ).join( ', ' ) }) is below the draft's rendered ${ below.map( ( w ) => `${ Math.round( rendered[ w ] * 100 ) / 100 }px` ).join( ' / ' ) }, so it would clip the box ${ row.property } ${ none } leaves whole; not written` : null;
		} );
	};
	const notPlain = /^not-plain\b/.test( row.reason ?? '' );
	if ( 'min' === size.kind && widths.every( noSize ) ) {
		return against( 'min', prop );
	}
	if ( 'max' === size.kind && widths.every( noSize ) ) {
		return against( 'max', prop );
	}
	if ( 'exact' === size.kind && widths.every( noSize ) ) {
		return against( 'min', `min-${ prop }` );
	}
	// 2b: a declared size on a replaced image that keeps its proportions is the block's ceiling where the block paints it larger.
	const tagAt = ( w ) => String( reads.widths?.[ w ]?.[ target.id ]?.tag ?? '' ).toLowerCase();
	const custom = widths.every( ( w ) => tagAt( w ).includes( '-' ) );
	const replaced = custom || widths.every( ( w ) => REPLACED_TAGS.has( tagAt( w ) ) );
	const other = 'h' === size.axis ? 'width' : 'height';
	// The slot holding the ceiling: the element's own, else (a picture read at the block's root) the block's one inner image.
	const inner = '' === slot && replaced ? innerImageSlot( cal ) : null;
	const ceilingSlot = calibratedAt( cal, slot, `max-${ prop }` ) ? slot : ( null !== inner && calibratedAt( cal, inner, `max-${ prop }` ) ? inner : null );
	if ( 'exact' === size.kind && ( notPlain || /^no-setting/.test( row.reason ) ) && replaced && null !== ceilingSlot && ! widths.some( ( w ) => null !== pxOf( reads.declared?.[ w ]?.[ target.id ]?.[ other ] ?? '' ) ) ) {
		const sizeAt = ( w ) => {
			const v = declaredAt( w ) ?? given[ w ];
			return pxOf( v ) ?? ( FLUID.test( String( v ?? '' ).trim() ) ? rendered[ w ] : null );
		};
		const declared = Object.fromEntries( widths.map( ( w ) => [ w, sizeAt( w ) ] ).filter( ( [ , v ] ) => null !== v && undefined !== v ) );
		const paint = pictureRoom( { block: rec.name, slot: ceilingSlot, prop, cal, natural: naturalSize( reads, target, prop, widths ) } );
		const shown = ( w ) => `${ Math.round( paint[ w ] * 100 ) / 100 }px`;
		if ( Object.keys( declared ).length === widths.length && widths.every( ( w ) => undefined !== paint[ w ] && paint[ w ] > declared[ w ] + PX_TOL ) ) {
			return settle( `max-${ prop }`, declared, `the draft declares ${ prop } ${ widths.map( ( w ) => `${ Math.round( declared[ w ] * 100 ) / 100 }px` ).join( ' / ' ) }${ widths.some( ( w ) => null === pxOf( declaredAt( w ) ?? given[ w ] ) ) ? ' (a fluid size as its rendered value)' : '' } on ${ custom ? 'a picture a custom element draws' : 'a replaced image' } that keeps its proportions (${ other } not declared), and the block paints it ${ widths.map( shown ).join( ' / ' ) }, so the block's max-${ prop }${ ceilingSlot === slot ? '' : ` on its inner image (${ ceilingSlot })` } clamps it to the declared size`, null, true, ceilingSlot );
		}
	}
	// 2: a declared size in a dimension with no setting of its own.
	if ( 'exact' === size.kind && /^no-setting/.test( row.reason ) ) {
		const declared = Object.fromEntries( widths.map( ( w ) => [ w, pxOf( declaredAt( w ) ?? given[ w ] ) ] ).filter( ( [ , v ] ) => null !== v ) );
		if ( Object.keys( declared ).length !== widths.length ) {
			return { raise: `the code declares ${ prop } as ${ widths.map( ( w ) => declaredAt( w ) ?? given[ w ] ).join( ' / ' ) }, which is not a plain length` };
		}
		const taller = widths.map( ( w ) => [ w, contentExtent( { nodes, reads }, rec, target, size.axis, w ) ] ).filter( ( [ w, e ] ) => null === e || e > declared[ w ] + PX_TOL );
		if ( taller.length ) {
			return { raise: `the content is ${ taller.map( ( [ w, e ] ) => ( null === e ? `of unknown ${ 'h' === size.axis ? 'height' : 'width' } at ${ w }` : `${ Math.round( e ) }px at ${ w }` ) ).join( ', ' ) } against a declared ${ prop } of ${ taller.map( ( [ w ] ) => `${ declared[ w ] }px` ).join( ' / ' ) }, so a minimum would grow the box the draft overflows; not written` };
		}
		return settle( `min-${ prop }`, declared, `the draft declares ${ prop } ${ widths.map( ( w ) => `${ declared[ w ] }px` ).join( ' / ' ) }, no setting holds ${ prop } and the content fits, so it is the block's minimum${ home ? `, written on the root (the draft's ${ slot } is the root's content box; the root's own ${ widths.map( ( w ) => `${ home.extra[ w ] }px` ).join( ' / ' ) } of padding and border is added)` : '' }` );
	}
	// A declared minimum or ceiling on the inner element that is the root's content box: the same size on the root.
	if ( home && ( 'min' === size.kind || 'max' === size.kind ) ) {
		const declared = Object.fromEntries( widths.map( ( w ) => [ w, pxOf( declaredAt( w ) ?? given[ w ] ) ] ).filter( ( [ , v ] ) => null !== v ) );
		return Object.keys( declared ).length === widths.length
			? settle( prop, declared, `the draft declares ${ prop } ${ widths.map( ( w ) => `${ declared[ w ] }px` ).join( ' / ' ) } on ${ slot }, the root's content box, so the root holds it (plus the root's own ${ widths.map( ( w ) => `${ home.extra[ w ] }px` ).join( ' / ' ) } of padding and border)` )
			: null;
	}
	return null;
}

// The child-sizing extension's settings (includes/child-sizing.php): 'fixed' paints `flex: 0 0 auto` and the width.
const SIZING = 'sgsChildSizing';
const SIZING_WIDTH = 'sgsChildWidth';
// The child width that holds a non-shrinking item at its natural size: under 'fixed' it paints `flex: 0 0 auto; width: auto;
// max-width: none` (includes/child-sizing.php::child_sizing_declarations).
export const NATURAL_SIZE = 'auto';

// 4: a flex item the draft keeps from shrinking (flex-shrink 0, read on the root's flex item, lib/fill-read.mjs::
// flexItemsInPage) where the block's root would shrink is held by the block's fixed child sizing at each width the draft
// does not shrink it: at its rendered width where the draft declares that width as a plain px length, else at its natural
// size (NATURAL_SIZE, `auto`: a fluid height with an intrinsic ratio, a clamp(), none declared, which px per tier would pin
// between the read widths). A read width where it does shrink, below a fixed one, sizes to its content ('fit'), so the fixed
// tier is not carried down. Nothing is written where the block's root shrinks at none of those widths. Returns
// { answered: the widths held }, { raise }, or null (not this pass's row).
function fixedSizing( { row, nodes, flat, refOf, reads, db, calFor, out } ) {
	const hit = rowTarget( { nodes, flat, refOf }, row );
	if ( ! hit ) {
		return null;
	}
	const { rec, target } = hit;
	const node = flat[ rec.index ];
	const given = rowValues( row, reads, target );
	const fixedAt = WIDTHS.filter( ( w ) => undefined !== given[ w ] && 0 === parseFloat( given[ w ] ) );
	if ( ! fixedAt.length ) {
		return null;
	}
	const sizing = attrRow( db, rec.name, SIZING );
	if ( ! sizing || ! attrRow( db, rec.name, SIZING_WIDTH ) || ! String( sizing.enum_values ?? '' ).includes( '"fixed"' ) ) {
		return { raise: `${ rec.name } has no fixed child sizing (${ SIZING } with ${ SIZING_WIDTH }) to keep it from shrinking; a framework setting is needed` };
	}
	const paint = defaultPaint( calFor( rec.name, rec ), '', 'flex-shrink' );
	const unknown = fixedAt.filter( ( w ) => undefined === paint[ w ] );
	if ( unknown.length ) {
		return { raise: `whether ${ rec.name }'s root shrinks is unknown at ${ unknown.join( ', ' ) } (no calibrated flex-shrink)` };
	}
	const shrinks = fixedAt.filter( ( w ) => parseFloat( paint[ w ] ) > 0 );
	if ( ! shrinks.length ) {
		return null;
	}
	// A width the draft declares as a plain px length is the item's size at every viewport between the read widths too, so
	// it is written; any other size is the item's natural size.
	const fluid = ( w ) => null === pxOf( reads.declared?.[ w ]?.[ target.id ]?.width ?? '' );
	const sizeAt = ( w ) => reads.widths?.[ w ]?.[ target.id ]?.flexItem?.w ?? rectAt( reads, target, w )?.w;
	const unsized = fixedAt.filter( ( w ) => ! fluid( w ) && ! Number.isFinite( sizeAt( w ) ) );
	if ( unsized.length ) {
		return { raise: `the draft's rendered width of the flex item is unknown at ${ unsized.join( ', ' ) }` };
	}
	const held = node.attributes?.[ SIZING ];
	if ( held && 'object' === typeof held && Object.values( held ).some( ( v ) => '' !== v && undefined !== v && null !== v ) ) {
		return { raise: `${ SIZING } already holds ${ JSON.stringify( held ) }, so the draft's fixed size is not written over it` };
	}
	const modes = {};
	const widths = {};
	// Widest first: a narrower read width that shrinks, under a fixed wider one, sizes to its content.
	for ( const w of [ ...WIDTHS ].reverse() ) {
		if ( fixedAt.includes( w ) ) {
			modes[ TIER_OF[ w ] ] = 'fixed';
			widths[ TIER_OF[ w ] ] = fluid( w ) ? NATURAL_SIZE : `${ Math.round( sizeAt( w ) * 100 ) / 100 }px`;
		} else if ( Object.keys( modes ).length && undefined !== given[ w ] ) {
			modes[ TIER_OF[ w ] ] = 'fit';
		}
	}
	const included = Object.fromEntries( fixedAt.map( ( w ) => [ w, given[ w ] ] ) );
	commit( out, { rec, node, row, prop: 'flex-shrink', res: { writes: [ { attr: SIZING, value: modes }, { attr: SIZING_WIDTH, value: widths } ], included }, how: 'dimension', note: `the draft keeps the flex item from shrinking (flex-shrink 0 at ${ fixedAt.join( ', ' ) }) where the block's root shrinks (flex-shrink ${ fixedAt.map( ( w ) => paint[ w ] ).join( ' / ' ) }), so the fixed child sizing holds its ${ fixedAt.some( fluid ) ? 'natural size' : 'rendered width' } ${ Object.values( widths ).join( ' / ' ) }` } );
	out.notes.push( `${ row.node } ${ rec.name } flex-shrink: fixed child sizing at ${ Object.entries( widths ).map( ( [ t, v ] ) => `${ t } ${ v }` ).join( ', ' ) }` );
	return { answered: fixedAt };
}
