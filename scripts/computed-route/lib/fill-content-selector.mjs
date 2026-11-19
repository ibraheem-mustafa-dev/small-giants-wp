// The content-selector settings of a block (Spec 48 FR-48-97): an enum with no CSS property whose value decides which parts
// the block renders (Site Info's `displayType`: phone, email, address), not how they paint. The skeleton writer chooses its
// value from the draft's content, so a look write must never change it: calibration also records the display a value paints
// (`calibration.discovered`), and without this the resolver answers a draft's `display: block` by turning an email row into
// an address row. A setting qualifies when the framework database gives it the `select-from-enum` role with no
// `css_property` and calibration found its values change the parts present (`calibration.presence` holds `<attr>=<value>`
// entries, lib/calibrate-content.mjs). Layout enums (`layout` role) and enums whose values change no part stay look settings.
const BY_DB = new WeakMap();

const rolesOf = ( db, block ) => {
	const byBlock = BY_DB.get( db ) ?? new Map();
	BY_DB.set( db, byBlock );
	if ( ! byBlock.has( block ) ) {
		byBlock.set( block, db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND role = 'select-from-enum' AND css_property IS NULL AND enum_values IS NOT NULL" ).all( block ).map( ( r ) => r.attr_name ) );
	}
	return byBlock.get( block );
};

// { attr: value } for each content selector the node holds a value for; empty without a database handle or calibration.
// `attributes` is the node's own attribute object.
export function contentSelectors( { db, block, attributes, calibration } ) {
	if ( ! db?.prepare || ! block || ! calibration?.presence ) {
		return {};
	}
	const presence = Object.keys( calibration.presence );
	return Object.fromEntries( rolesOf( db, block ).filter( ( attr ) => undefined !== attributes?.[ attr ] && presence.some( ( k ) => k.startsWith( `${ attr }=` ) ) ).map( ( attr ) => [ attr, attributes[ attr ] ] ) );
}
