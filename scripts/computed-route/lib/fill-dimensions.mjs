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
//   3. An interactive element's written height or width is never below 24px (WCAG 2.2 AA target size, 2.5.8): a smaller draft
//      value is written as 24px with a `touch-target` divergence-ledger entry.
// Every size is formatted and checked by the generic resolver (lib/fill-prop.mjs::resolveProperty), so a value is written
// as the setting's own shape. Returns { writes, unmapped (the rows left), notes, ledger }.
import fs from 'node:fs';
import path from 'node:path';
import { BLOCKS_DIR, defaultPaint, LOOSE } from './resolve.mjs';
import { WIDTHS, rowTarget, rowValues, rectAt, reresolve, commit } from './fill-regap.mjs';
import { innerToRoot } from './fill-same-box.mjs';

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

// A ceiling the block paints as something other than a length or `none` (100%, a calc()): its size is the page's.
const relativeCeiling = ( v ) => undefined !== v && null !== v && ! NO_SIZE.has( String( v ).trim() ) && null === pxOf( v );

// What a resolver result holds at a width, in px, or null where it cannot be read as px: a tier object carries its nearest
// wider tier down, and a unit partner write (maxWidthUnit beside maxWidth) names the unit.
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

// The content extent inside an element along an axis at a width: the children's far edge from the element's near edge, plus
// the element's padding and border on that far side. Null when nothing says how big the content is.
function contentExtent( { nodes, reads }, rec, target, axis, w ) {
	const own = rectAt( reads, target, w );
	const styles = reads.widths?.[ w ]?.[ target.id ]?.styles || {};
	const far = 'h' === axis ? [ 'padding-bottom', 'border-bottom-width' ] : [ 'padding-right', 'border-right-width' ];
	const tail = far.reduce( ( s, p ) => s + ( parseFloat( styles[ p ] ) || 0 ), 0 );
	const kids = rec.children.map( ( i ) => {
		const t = nodes[ i ].targets.find( ( x ) => '' === x.slot );
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
	const out = { writes: [], unmapped: [], notes: [], ledger: [] };
	const ctx = { reads, db, calFor, snapshot };
	for ( const row of unmapped ) {
		const size = sizeOf( row.property ?? '' );
		const hit = size && ONLY_GAPS.test( row.reason ?? '' ) && ! row.state ? rowTarget( { nodes, flat, refOf }, row ) : null;
		const result = hit ? handle( { row, size, hit, nodes, flat, ctx, out, scope, entries, date, resolver } ) : null;
		if ( null === result ) {
			out.unmapped.push( row );
		} else if ( result.raise ) {
			out.unmapped.push( { ...row, reason: `${ row.reason }; dimension: ${ result.raise }` } );
		}
	}
	return out;
}

// Returns true (the row is settled), { raise: reason } (the row stays with a reason), or null (not this pass's row).
function handle( { row, size, hit, nodes, flat, ctx, out, scope, entries, date, resolver } ) {
	const { rec, target } = hit;
	const { reads } = ctx;
	const node = flat[ rec.index ];
	const prop = physical( row.property );
	const slot = row.slot ?? '';
	const cal = ctx.calFor( rec.name );
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
	const settle = ( p, perWidth, why, check = null ) => {
		const draft = Object.fromEntries( widths.map( ( w ) => [ w, `${ guard( Math.round( ( perWidth[ w ] + ( home?.extra[ w ] ?? 0 ) ) * 100 ) / 100, w, p ) }px` ] ) );
		const res = ask( p, draft );
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
		return true;
	};
	const ledger = ( p ) => {
		const e = { id: nextId( [ ...entries, ...out.ledger ] ), scope, node: row.node, state: '*', property: p, widths: touched.map( ( t ) => t.w ), expected: { rule: 'touch-target' },
			reason: `the draft's ${ p } is ${ touched.map( ( t ) => `${ t.from }px at ${ t.w }` ).join( ', ' ) }; an interactive element is never written below the ${ MIN_TARGET }px target size (WCAG 2.2 AA 2.5.8)`, decided: `${ date } Bean ruling (24px target size)` };
		! out.ledger.some( ( x ) => x.node === e.node && x.property === e.property && x.reason === e.reason ) && out.ledger.push( e );
	};
	// 1: a floor or ceiling the draft does not declare but the block paints.
	const against = ( kind, p ) => {
		const paint = blockPaint( { block: rec.name, slot, prop: p, cal } );
		const clash = widths.filter( ( w ) => undefined !== paint[ w ] && ( 'min' === kind ? paint[ w ] > rendered[ w ] + 0.5 : paint[ w ] < rendered[ w ] - 0.5 ) );
		const raw = defaultPaint( cal, slot, p, ( a, b ) => LOOSE( a ) === LOOSE( b ) );
		const relative = 'max' === kind ? widths.filter( ( w ) => undefined === paint[ w ] && relativeCeiling( raw[ w ] ) ) : [];
		if ( ! clash.length && ! relative.length ) {
			out.notes.push( `${ row.node } ${ rec.name }${ slot ? ` (${ slot })` : '' } ${ row.property }: ${ Object.keys( paint ).length ? `the block's ${ p } (${ Object.values( paint ).join( ' / ' ) }px) does not contradict the draft's rendered size` : `the block paints no ${ p } that is known` }; nothing to write` );
			return Object.keys( paint ).length ? true : { raise: `the block's own ${ p } is unknown (no calibrated paint), so whether it contradicts the draft's rendered ${ Object.values( rendered ).join( ' / ' ) }px is unproven` };
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
			const below = widths.filter( ( w ) => null === writtenPx( res, w ) || writtenPx( res, w ) < rendered[ w ] - 0.5 );
			return below.length ? `the ${ p } the setting would hold (${ below.map( ( w ) => `${ writtenPx( res, w ) ?? 'not a px length' } at ${ w }` ).join( ', ' ) }) is below the draft's rendered ${ below.map( ( w ) => `${ Math.round( rendered[ w ] * 100 ) / 100 }px` ).join( ' / ' ) }, so it would clip the box ${ row.property } ${ none } leaves whole; not written` : null;
		} );
	};
	if ( 'min' === size.kind && widths.every( noSize ) ) {
		return against( 'min', prop );
	}
	if ( 'max' === size.kind && widths.every( noSize ) ) {
		return against( 'max', prop );
	}
	if ( 'exact' === size.kind && widths.every( noSize ) ) {
		return against( 'min', `min-${ prop }` );
	}
	// 2: a declared size in a dimension with no setting of its own.
	if ( 'exact' === size.kind && /^no-setting/.test( row.reason ) ) {
		const declared = Object.fromEntries( widths.map( ( w ) => [ w, pxOf( declaredAt( w ) ?? given[ w ] ) ] ).filter( ( [ , v ] ) => null !== v ) );
		if ( Object.keys( declared ).length !== widths.length ) {
			return { raise: `the code declares ${ prop } as ${ widths.map( ( w ) => declaredAt( w ) ?? given[ w ] ).join( ' / ' ) }, which is not a plain length` };
		}
		const taller = widths.map( ( w ) => [ w, contentExtent( { nodes, reads }, rec, target, size.axis, w ) ] ).filter( ( [ w, e ] ) => null === e || e > declared[ w ] + 0.5 );
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
