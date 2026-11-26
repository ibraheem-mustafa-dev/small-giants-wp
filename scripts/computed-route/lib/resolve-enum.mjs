// A setting whose value list is not the CSS keywords (sgs/button's `linkUnderline`: "", none, always, hover, sweep, painting
// text-decoration-line) cannot be given the draft's computed keyword ("underline") as it stands. Calibration records what
// each enum value paints (`enumReads`: { value: { longhand: { width: computed } } }, lib/calibrate.mjs::foldReading).
// Two rules read it, both inside lib/resolve.mjs::resolve:
//   holdsValue   a tied setting whose list cannot hold the draft's value at some width, by name or by what a value paints, is no
//                candidate while another tied setting can (`textDecoration` lists overline and line-through only, so it never
//                competes with `linkUnderline` for an underline);
//   mapTiers     a tier's computed keyword the list does not hold becomes the list's value that paints it at that tier's
//                width (one value only: where several paint it the keyword goes on for the writer to judge; where none does it stays only if
//                the writer's alignment rule maps it to a list member, else it is a shape gap). A setting with no `enumReads` is left as it was.
import { sameAlignment } from './css-equivalence/keywords.mjs';

const WIDTH_OF = { desktop: 1440, tablet: 768, mobile: 375 };
const same = ( a, b ) => String( a ).replace( /\s+/g, '' ) === String( b ).replace( /\s+/g, '' );

// The non-empty values of a setting's list: from its database row (`enum_values`) or its schema, [] when it has none.
export function enumValues( row, def ) {
	let list = [];
	try {
		list = row?.enum_values ? JSON.parse( row.enum_values ) : [];
	} catch {
		list = [];
	}
	if ( ! list.length && Array.isArray( def?.enum ) ) {
		list = def.enum;
	}
	return list.filter( ( v ) => 'string' === typeof v && '' !== v );
}

// The list values whose recorded paint of `prop` at `width` is `raw`.
function valuesFor( enumReads, prop, width, raw ) {
	return Object.keys( enumReads ).filter( ( v ) => undefined !== enumReads[ v ]?.[ prop ]?.[ width ] && same( enumReads[ v ][ prop ][ width ], raw ) );
}

// Whether the setting can give `perWidth` (the draft's computed `prop` per read width): a setting with no list holds it; one
// with a list holds a keyword the list names or a value of it is recorded to paint (a setting calibrated before `enumReads`
// is judged by its names alone).
export function holdsValue( row, def, calibrationSetting, prop, perWidth ) {
	const list = enumValues( row, def );
	const reads = calibrationSetting?.enumReads || {};
	if ( ! list.length ) {
		return true;
	}
	return Object.entries( perWidth ).every( ( [ w, raw ] ) => [ 375, 768, 1440 ].includes( Number( w ) ) ? list.includes( String( raw ) ) || valuesFor( reads, prop, Number( w ), raw ).length > 0 : true );
}

// The tiers with each computed keyword the list does not hold replaced by the value that paints it: { tiers } or { error }.
export function mapTiers( row, def, calibrationSetting, prop, tiers, layoutAt = () => ( {} ) ) {
	const list = enumValues( row, def );
	const reads = calibrationSetting?.enumReads;
	if ( ! list.length || ! reads ) {
		return { tiers };
	}
	const out = {};
	for ( const [ t, raw ] of Object.entries( tiers ) ) {
		if ( list.includes( String( raw ) ) ) {
			out[ t ] = raw;
			continue;
		}
		// One value that paints the keyword is the answer. Several paint it (a border style with no width paints none whatever its
		// value): the keyword goes on as it is and the writer judges it against the list. None paints it: the keyword stays only
		// where the writer's own alignment rule gives it a list member (align-items flex-end is the list's `end` in a flex or grid
		// container, lib/resolve.mjs::formatValue); otherwise the setting has no answer.
		const painting = valuesFor( reads, prop, WIDTH_OF[ t ], raw );
		if ( 1 === painting.length ) {
			out[ t ] = painting[ 0 ];
		} else if ( painting.length > 1 || list.some( ( v ) => sameAlignment( prop, v, raw, layoutAt( t ) ) ) ) {
			out[ t ] = raw;
		} else {
			return { error: `${ row.attr_name } holds ${ list.join( ', ' ) }; none paints ${ prop } ${ raw } at ${ WIDTH_OF[ t ] }px` };
		}
	}
	return { tiers: out };
}

// The values of a setting that paint the draft's resting look at rest and its state look in `state` (hover, focus): `enumReads`
// holds what each value paints at rest and `enumStateReads[state]` what it paints with the state held (site_look.py::enum_reads).
// A link the draft draws plain and underlines on hover is `linkUnderline: hover`, which paints `none` at rest and `underline` on
// hover; `always` rests at `underline`. Both readings must fit at every width the draft was read at. Returns the matching values,
// [] when the setting has no state reading or no value fits (a rest underline that hover removes: no setting holds it).
export function valuesForState( calibrationSetting, prop, rest, draft, state ) {
	const atRest = calibrationSetting?.enumReads ?? {};
	const inState = calibrationSetting?.enumStateReads?.[ state ] || {};
	const widths = Object.keys( draft || {} ).map( Number ).filter( ( w ) => [ 375, 768, 1440 ].includes( w ) );
	if ( ! widths.length || widths.some( ( w ) => undefined === rest?.[ w ] ) ) {
		return [];
	}
	const fits = ( reads, want ) => widths.every( ( w ) => undefined !== reads?.[ prop ]?.[ w ] && same( reads[ prop ][ w ], want[ w ] ) );
	return Object.keys( inState ).filter( ( v ) => fits( atRest[ v ], rest ) && fits( inState[ v ], draft ) );
}

// A pin setting whose list names the edge a sticky element sticks to (top, bottom) and no `sticky`: the draft's `position: sticky` is
// the edge its offset names at that tier's width (`top` set: top; else `bottom` set: bottom; both: top), `static` and `relative` are
// no pin ("none" where the list holds it). A sticky element with neither offset set has no edge to pin to, so the row says so and
// nothing is written; any other position is not one of the list. Returns { tiers } or { error }, or null where the setting is no
// pin setting (prop is not position, or the list lacks top and bottom, or holds the keyword itself). `siblings`: the element's
// other properties by width ({ top: { 1440: '20px' }, bottom: { 1440: 'auto' } }).
export function pinEdges( row, def, prop, tiers, siblings ) {
	const list = enumValues( row, def );
	if ( 'position' !== prop || ! list.includes( 'top' ) || ! list.includes( 'bottom' ) || list.includes( 'sticky' ) ) {
		return null;
	}
	const set = ( v ) => undefined !== v && '' !== String( v ).trim() && 'auto' !== String( v ).trim();
	const out = {};
	for ( const [ t, raw ] of Object.entries( tiers ) ) {
		const at = WIDTH_OF[ t ];
		if ( 'sticky' === raw ) {
			const edge = set( siblings?.top?.[ at ] ) ? 'top' : set( siblings?.bottom?.[ at ] ) ? 'bottom' : null;
			if ( ! edge ) {
				return { error: `position sticky at ${ at }px names no edge (its top and bottom are not set), so ${ row.attr_name } has no edge to pin to` };
			}
			out[ t ] = edge;
		} else if ( [ 'static', 'relative' ].includes( raw ) && ( list.includes( 'none' ) || ! list.length ) ) {
			out[ t ] = 'none';
		} else if ( list.includes( String( raw ) ) ) {
			out[ t ] = raw;
		} else {
			return { error: `${ raw } is not one of ${ list.join( ', ' ) }` };
		}
	}
	return { tiers: out };
}
