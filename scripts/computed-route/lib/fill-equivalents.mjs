// Same look, different setting (FR-48-8 step 5, Bean 2026-10-19): a draft property no setting holds on its own element,
// painted the same by a setting for another property on the element itself or on its parent. The rows live in the
// framework DB (property_equivalents, seeded from plugins/sgs-blocks/scripts/data/property-equivalents.json); Fill tries
// them only after the direct and discovered matches fail, and only under each row's condition; a row whose condition
// this module does not know is skipped and named, never applied. The check confirms every write on the built page
// (FR-48-76): each carries how 'equivalent:<hop>'.
import { resolveProperty } from './fill-prop.mjs';
import { refOf } from './tree.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

const PX_TOL = 0.5;
const RATIO_TOL = 0.02;
// The conditions fillEquivalent evaluates.
export const CONDITIONS = [ 'every-child-same', 'render-matches', 'intrinsic-ratio' ];

// The rows for one draft property, or none when the DB predates the table.
export function equivalentRows( db, prop ) {
	if ( ! db ) {
		return [];
	}
	try {
		return db.prepare( 'SELECT draft_property, setting_property, hop, condition FROM property_equivalents WHERE draft_property = ? ORDER BY setting_property' ).all( prop );
	} catch ( e ) {
		if ( /no such table/.test( e.message ) ) {
			return [];
		}
		throw e;
	}
}

// The paths a block's calibration shows a resting setting for `prop` painting.
const layoutSlots = ( cal, prop ) => Object.values( cal?.settings || {} ).filter( ( s ) => s.property === prop && ! s.state ).flatMap( ( s ) => s.slots || [ s.slot ] );

// every-child-same: every child of the parent was measured and asks the same value as the draft at each of its widths.
// styleOf( childIndex, width ): that child's root styles, or null when it has no reading there.
export function everyChildSame( kids, prop, draft, styleOf ) {
	return kids.length > 0 && Object.entries( draft ).every( ( [ w, v ] ) => kids.every( ( c ) => styleOf( c, Number( w ) )?.[ prop ] === v ) );
}

// render-matches: the element renders at the declared length at every width, so its content fits and a minimum of that
// length paints the same box. rectOf( width ): the element's measured box, or null.
export function rendersAt( draft, rectOf ) {
	return Object.keys( draft ).length > 0 && Object.entries( draft ).every( ( [ w, v ] ) => {
		const r = rectOf( Number( w ) );
		return /^-?[\d.]+px$/.test( String( v ) ) && !! r && Math.abs( r.h - parseFloat( v ) ) <= PX_TOL;
	} );
}

// The ratio ("3741 / 848", "auto 3741 / 848", "1.5") a declared aspect-ratio states, as width over height, or null.
export function ratioOf( raw ) {
	const m = /(\d*\.?\d+)\s*(?:\/\s*(\d*\.?\d+))?\s*$/.exec( String( raw ?? '' ).trim() );
	const n = m ? parseFloat( m[ 1 ] ) / ( m[ 2 ] ? parseFloat( m[ 2 ] ) : 1 ) : NaN;
	return Number.isFinite( n ) && n > 0 ? n : null;
}

// intrinsic-ratio: the element is an image, an SVG or a logo holding one, with an intrinsic ratio (the page-read ratio of
// its natural size, width and height attributes or viewBox, else its declared aspect-ratio), and its box keeps that ratio
// at every width, so its width follows its height and a maximum height of the rendered height paints the same box.
// snapOf( width ): the element's measured snapshot ({ rect, intrinsic: { ratio } }), declaredOf( width ): its declared
// aspect-ratio. widths: the widths the draft names.
export function intrinsicRatio( widths, snapOf, declaredOf ) {
	return widths.length > 0 && widths.every( ( w ) => {
		const snap = snapOf( w );
		const ratio = snap?.intrinsic?.ratio ?? ratioOf( declaredOf( w ) );
		// No ratio, or a box of no height, makes the quotient Infinity or NaN, which is never within the tolerance.
		return !! snap?.rect && Math.abs( snap.rect.w / snap.rect.h / ratio - 1 ) <= RATIO_TOL;
	} );
}

// Tries each row for one gap. h: { baselineFn( st, rec, cal, prop ), apply( st, rec, ref, target, prop, res, slot ),
// resolve?, rendered? } from lib/fill-resolve.mjs (rendered: the rendered value per width before a used-value property
// was cut to its plain declared widths). Returns the resolver's result ('written' or 'equal') with the row's condition,
// { status: 'held' } when a sibling already wrote the parent's setting, { status: 'gap', gap: 'unknown-condition' } when
// only rows with a condition this module does not know matched, or null when no row applies.
export function fillEquivalent( st, rec, target, prop, draft, h ) {
	const resolve = h.resolve || resolveProperty;
	st.equivalentsDone ??= new Set();
	const unknown = [];
	for ( const row of equivalentRows( st.db, prop ) ) {
		const onParent = 'parent' === row.hop;
		// The parent lays out the child's root element; an inner element of the block is laid out by the block itself.
		if ( onParent && ( null === rec.parent || '' !== target.slot ) ) {
			continue;
		}
		const at = onParent ? st.nodes[ rec.parent ] : rec;
		const cal = st.calFor( at.name );
		if ( ! cal ) {
			continue;
		}
		const key = `${ at.index }|${ row.setting_property }`;
		let forRow = draft;
		if ( 'every-child-same' === row.condition ) {
			const styleOf = ( c, w ) => {
				const s = st.reads.widths[ w ]?.[ `${ c }:` ];
				return s && ! s.missing ? s.styles : null;
			};
			// The child's draft must cover every width a sibling was read at: the parent's setting paints them all.
			const readAt = READ_WIDTHS.filter( ( w ) => at.children.some( ( c ) => styleOf( c, w ) ) );
			if ( readAt.some( ( w ) => undefined === draft[ w ] ) || ! everyChildSame( at.children, prop, draft, styleOf ) ) {
				continue;
			}
			if ( st.equivalentsDone.has( key ) ) {
				return { status: 'held' };
			}
		} else if ( 'render-matches' === row.condition ) {
			if ( ! rendersAt( draft, ( w ) => st.reads.widths[ w ]?.[ target.id ]?.rect ) ) {
				continue;
			}
		} else if ( 'intrinsic-ratio' === row.condition ) {
			forRow = h.rendered && Object.keys( h.rendered ).length ? h.rendered : draft;
			if ( onParent || ! intrinsicRatio( Object.keys( forRow ).map( Number ), ( w ) => st.reads.widths[ w ]?.[ target.id ], ( w ) => st.reads.declared?.[ w ]?.[ target.id ]?.[ 'aspect-ratio' ] ) ) {
				continue;
			}
		} else {
			unknown.push( `${ row.draft_property } to ${ row.setting_property } (${ row.condition })` );
			continue;
		}
		// The parent's setting paints the element that lays out its children (sgs/container's alignItems: its inner).
		const slots = onParent ? [ ...new Set( [ ...layoutSlots( cal, row.setting_property ), '' ] ) ] : [ target.slot ];
		const res = resolve( { node: st.flat[ at.index ], block: at.name, prop: row.setting_property, draft: forRow, baseline: h.baselineFn( st, at, cal, row.setting_property ), slots, calibration: cal, db: st.db, snapshot: st.snapshot, log: st.snaps, fontPx: {}, siblings: {} } );
		if ( 'gap' === res.status ) {
			continue;
		}
		// The parent's own draft already set this setting: its own value stands, and the child's row stays unmapped.
		if ( onParent && 'written' === res.status && res.writes.some( ( w ) => st.out.writes.some( ( x ) => x.index === at.index && x.attr === w.attr ) ) ) {
			continue;
		}
		st.equivalentsDone.add( key );
		if ( 'written' === res.status ) {
			const before = st.out.writes.length;
			h.apply( st, at, refOf( st.flat[ at.index ] ), { slot: res.slot }, prop, { ...res, how: `equivalent:${ row.hop }` }, res.slot );
			// Confirmed on the element that asked for the property (lib/fill-confirm.mjs::confirmRecords).
			st.out.writes.slice( before ).forEach( ( w ) => Object.assign( w, { from: { index: rec.index, slot: target.slot } } ) );
		}
		return { ...res, condition: row.condition };
	}
	return unknown.length ? { status: 'gap', gap: 'unknown-condition', detail: `property_equivalents row ${ unknown.join( ', ' ) } names a condition Fill does not evaluate; not applied` } : null;
}
