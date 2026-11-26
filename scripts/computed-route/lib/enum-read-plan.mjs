// Which per-value renders the site look reads a block's enum settings from (what each value of a choice paints: the
// `enumReads` that lib/resolve-enum.mjs::holdsValue and ::mapTiers and lib/resolve.mjs::resolveDiscovered's `heldBySetting`
// read). lib/calibrate-instances.mjs::planInstances already plans one instance per value of an enum setting that paints a
// CSS property (marker `enumValue`); this picks the settings whose readings the resolver can need, so a block's build does
// not render every value of every choice (about 5,000 instances over 85 blocks).
//
// A setting needs readings when either
//   - one of its values is not a CSS value of the property it paints (`linkUnderline: always` paints text-decoration-line:
//     underline; `contentWidth: wide` paints a max-width), so the draft's computed keyword names no value of its list; or
//   - another setting of the block places the same property on the same part (the record's `setting_placements`): the two
//     can tie on a draft value, and what each paints is what breaks the tie (trust-bar's `flexWrap` nowrap against its `layout`).
// Only the first run of each marker is kept, once for each fixture variant: the later runs repeat it under another layout mode of
// the block. A placement the record cannot prove (`unproved` and not `accepted`) is no evidence that two settings paint one thing.
import { createRequire } from 'module';
import { longhands } from './calibrate-props.mjs';

const csstree = createRequire( import.meta.url )( 'css-tree' );

// Whether `value` is a value of the CSS property `prop`. A property css-tree does not know (a custom property, a vendor one)
// accepts any value: no keyword is shown to be foreign to it.
export function acceptsValue( prop, value ) {
	if ( ! csstree.lexer.getProperty( prop ) ) {
		return true;
	}
	return ! csstree.lexer.matchProperty( prop, String( value ) ).error;
}

// The (part, state, property) triples a setting's placements set, as readable longhands: { setting: Set( "part|state|longhand" ) }.
export function placedProperties( placements ) {
	const out = {};
	for ( const r of placements ) {
		if ( r.unproved && ! r.accepted ) {
			continue;
		}
		const set = ( out[ r.setting ] ??= new Set() );
		for ( const p of r.props || [] ) {
			[ p, ...longhands( p ) ].forEach( ( q ) => set.add( `${ r.part ?? '' }|${ r.state ?? '' }|${ q }` ) );
		}
	}
	return out;
}

// The enum-value instances to read: the plan's instances for settings that need readings (see above), the first run of each
// marker only. `placements`: the record's rows for the block ({ setting, part, state, props, unproved, accepted}).
export function enumReadInstances( instances, placements ) {
	const placed = placedProperties( placements );
	const needs = new Map();
	const needed = ( row ) => {
		if ( ! needs.has( row.attr_name ) ) {
			const props = longhands( row.css_property );
			const values = [ ...new Set( instances.filter( ( i ) => i.row === row && undefined !== i.marker?.enumValue ).map( ( i ) => i.marker.enumValue ) ) ];
			const foreign = values.some( ( v ) => props.some( ( p ) => ! acceptsValue( p, v ) ) );
			const own = [ ...( placed[ row.attr_name ] || [] ) ].filter( ( k ) => props.includes( k.slice( k.lastIndexOf( '|' ) + 1 ) ) );
			const shared = own.some( ( k ) => Object.entries( placed ).some( ( [ other, set ] ) => other !== row.attr_name && set.has( k ) ) );
			needs.set( row.attr_name, foreign || shared );
		}
		return needs.get( row.attr_name );
	};
	const seen = new Set();
	return instances.filter( ( i ) => {
		if ( ! i.row || undefined === i.marker?.enumValue || ! needed( i.row ) ) {
			return false;
		}
		const id = `${ i.row.attr_name }|${ i.marker.label }|${ i.variant ?? 0 }`;
		return ! seen.has( id ) && !! seen.add( id );
	} );
}
