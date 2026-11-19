// A setting whose value list is not the CSS keywords (sgs/button's `linkUnderline`: "", none, always, hover, sweep, painting
// text-decoration-line) cannot be given the draft's computed keyword ("underline") as it stands. Calibration records what
// each enum value paints (`enumReads`: { value: { longhand: { width: computed } } }, lib/calibrate.mjs::foldReading).
// Two rules read it, both inside lib/resolve.mjs::resolve:
//   holdsValue   a tied setting whose list cannot hold the draft's value at some width, by name or by what a value paints, is no
//                candidate while another tied setting can (`textDecoration` lists overline and line-through only, so it never
//                competes with `linkUnderline` for an underline);
//   mapTiers     a tier's computed keyword the list does not hold becomes the list's value that paints it at that tier's
//                width; a keyword no value paints is a shape gap. A setting with no `enumReads` is left as it was.
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

// The list value whose recorded paint of `prop` at `width` is `raw`, or undefined.
function valueFor( enumReads, prop, width, raw ) {
	return Object.keys( enumReads ).find( ( v ) => undefined !== enumReads[ v ]?.[ prop ]?.[ width ] && same( enumReads[ v ][ prop ][ width ], raw ) );
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
	return Object.entries( perWidth ).every( ( [ w, raw ] ) => [ 375, 768, 1440 ].includes( Number( w ) ) ? list.includes( String( raw ) ) || undefined !== valueFor( reads, prop, Number( w ), raw ) : true );
}

// The tiers with each computed keyword the list does not hold replaced by the value that paints it: { tiers } or { error }.
export function mapTiers( row, def, calibrationSetting, prop, tiers ) {
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
		const v = valueFor( reads, prop, WIDTH_OF[ t ], raw );
		if ( undefined === v ) {
			return { error: `${ row.attr_name } holds ${ list.join( ', ' ) }; none paints ${ prop } ${ raw } at ${ WIDTH_OF[ t ] }px` };
		}
		out[ t ] = v;
	}
	return { tiers: out };
}
