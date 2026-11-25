// A property a setting of the block already owns, so a Custom CSS rule for it would cancel the setting (Spec 48 FR-48-109:
// a rule never fights a setting). The framework DB records no CSS property for these settings (`block_attributes.css_property`
// is null for `markerType`), so the block's own `block.json` names them (`sgs.ownsCss`, a list of CSS properties) and the
// seeder stores them in `block_attributes.owns_css` (plugins/sgs-blocks/scripts/sgs-update-v2.py::_populate_owned_css, FP-1).
import { longhandsOf } from './css-families.mjs';

const filled = ( v ) => null !== v && undefined !== v && '' !== v;

// The owned properties of one block's settings: [ { attr, props } ] for each setting that names some (a block with none
// gives []). A DB seeded before the column existed is refused, not read as "no setting owns anything".
export function ownedProperties( db, block ) {
	if ( ! db.prepare( 'PRAGMA table_info(block_attributes)' ).all().some( ( c ) => 'owns_css' === c.name ) ) {
		throw new Error( 'the framework DB has no block_attributes.owns_css column: reseed it (/sgs-update)' );
	}
	return db.prepare( "SELECT attr_name, owns_css FROM block_attributes WHERE block_slug = ? AND owns_css IS NOT NULL AND source IN ( 'sgs', 'sgs-ext' )" ).all( block )
		.map( ( r ) => ( { attr: r.attr_name, props: JSON.parse( r.owns_css ) } ) );
}

// The attribute of `attributes` (the node's settings) that owns `prop` and holds a value, or null. A shorthand a setting
// owns owns its longhands.
export function ownedBySetting( db, block, prop, attributes ) {
	for ( const { attr, props } of ownedProperties( db, block ) ) {
		if ( filled( attributes?.[ attr ] ) && props.some( ( p ) => p === prop || longhandsOf( p ).includes( prop ) ) ) {
			return attr;
		}
	}
	return null;
}
