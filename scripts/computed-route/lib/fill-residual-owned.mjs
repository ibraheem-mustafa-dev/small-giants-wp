// A property a setting of the block already owns, so a Custom CSS rule for it would cancel the setting (Spec 48 FR-48-109:
// a rule never fights a setting). The framework DB records no CSS property for these settings (`block_attributes.css_property`
// is null for `markerType`), so the block's own `block.json` names them (`sgs.ownsCss`, a list of CSS properties) and the
// seeder stores them in `block_attributes.owns_css` (plugins/sgs-blocks/scripts/sgs-update-v2.py::_populate_owned_css, FP-1).
import { longhandsOf } from './css-families.mjs';

const filled = ( v ) => null !== v && undefined !== v && '' !== v;

// The default a `block_attributes.default_value` cell holds (JSON text), or undefined where the setting has none.
function defaultOf( cell ) {
	if ( null === cell || undefined === cell || '' === cell ) {
		return undefined;
	}
	try {
		return JSON.parse( cell );
	} catch {
		return cell;
	}
}

// The owned properties of one block's settings: [ { attr, props, fallback } ] for each setting that names some (`fallback`:
// the setting's default, undefined where it has none; a block with none gives []). A DB seeded before the column existed is
// refused, not read as "no setting owns anything".
export function ownedProperties( db, block ) {
	if ( ! db.prepare( 'PRAGMA table_info(block_attributes)' ).all().some( ( c ) => 'owns_css' === c.name ) ) {
		throw new Error( 'the framework DB has no block_attributes.owns_css column: reseed it (/sgs-update)' );
	}
	return db.prepare( "SELECT attr_name, owns_css, default_value FROM block_attributes WHERE block_slug = ? AND owns_css IS NOT NULL AND source IN ( 'sgs', 'sgs-ext' )" ).all( block )
		.map( ( r ) => ( { attr: r.attr_name, props: JSON.parse( r.owns_css ), fallback: defaultOf( r.default_value ) } ) );
}

// The attribute of `attributes` (the node's settings) that owns `prop` and holds a value, or null. A setting the node does
// not save holds its default, which the block's own stylesheet draws (the icon list's `markerType` defaults to `icon` and its
// style.css draws `list-style: none` for it), so a rule would cancel that default too; a default of false, 0 or '' (an option
// switched off) draws nothing, so it holds nothing. A shorthand a setting owns owns its
// longhands.
export function ownedBySetting( db, block, prop, attributes ) {
	for ( const { attr, props, fallback } of ownedProperties( db, block ) ) {
		const saved = attributes?.[ attr ];
		const unsaved = null === saved || undefined === saved;
		if ( ( unsaved ? filled( fallback ) && ! [ false, 0, '' ].includes( fallback ) : filled( saved ) ) && props.some( ( p ) => p === prop || longhandsOf( p ).includes( prop ) ) ) {
			return attr;
		}
	}
	return null;
}
