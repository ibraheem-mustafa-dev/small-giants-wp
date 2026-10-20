// Same look, different setting (FR-48-8 step 5, Bean 2026-10-19): a draft property no setting holds on its own element,
// painted the same by a setting for another property on the element itself or on its parent. The rows live in the
// framework DB (property_equivalents, seeded from plugins/sgs-blocks/scripts/data/property-equivalents.json); Fill tries
// them only after the direct and discovered matches fail, and only under each row's condition. The check confirms every
// write on the built page (FR-48-76): each carries how 'equivalent:<hop>'.
import { resolveProperty } from './fill-prop.mjs';
import { refOf } from './tree.mjs';

const PX_TOL = 0.5;

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

// Tries each row for one gap. h: { baselineFn( st, rec, cal, prop ), apply( st, rec, ref, target, prop, res, slot ),
// resolve? } from lib/fill-resolve.mjs. Returns the resolver's result ('written' or 'equal'), { status: 'held' } when a
// sibling already wrote the parent's setting, or null when no row applies.
export function fillEquivalent( st, rec, target, prop, draft, h ) {
	const resolve = h.resolve || resolveProperty;
	st.equivalentsDone ??= new Set();
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
		if ( 'every-child-same' === row.condition ) {
			if ( ! everyChildSame( at.children, prop, draft, ( c, w ) => {
				const s = st.reads.widths[ w ]?.[ `${ c }:` ];
				return s && ! s.missing ? s.styles : null;
			} ) ) {
				continue;
			}
			if ( st.equivalentsDone.has( key ) ) {
				return { status: 'held' };
			}
		} else if ( 'render-matches' === row.condition && ! rendersAt( draft, ( w ) => st.reads.widths[ w ]?.[ target.id ]?.rect ) ) {
			continue;
		}
		// The parent's setting paints the element that lays out its children (sgs/container's alignItems: its inner).
		const slots = onParent ? [ ...new Set( [ ...layoutSlots( cal, row.setting_property ), '' ] ) ] : [ target.slot ];
		const res = resolve( { node: st.flat[ at.index ], block: at.name, prop: row.setting_property, draft, baseline: h.baselineFn( st, at, cal, row.setting_property ), slots, calibration: cal, db: st.db, snapshot: st.snapshot, log: st.snaps, fontPx: {}, siblings: {} } );
		if ( 'gap' === res.status ) {
			continue;
		}
		st.equivalentsDone.add( key );
		if ( 'written' === res.status ) {
			h.apply( st, at, refOf( st.flat[ at.index ] ), { slot: res.slot }, prop, { ...res, how: `equivalent:${ row.hop }` }, res.slot );
		}
		return res;
	}
	return null;
}
