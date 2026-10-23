// Read-only access to the framework database (R-47-2). Opened with node:sqlite in read-only mode, which refuses
// every write; the route never seeds, migrates or writes it.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import os from 'os';
import path from 'path';
import { reachedBy, storedKeys } from './css-families.mjs';

export const DB_PATH = path.join( os.homedir(), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db' );

const COLS = 'block_slug, attr_name, attr_type, default_value, enum_values, is_responsive, css_property, css_element, css_state, css_tier, tier_shape, box_family, source, role';

// Opens the database read-only. `file` overrides the path (tests).
export function openDb( file = DB_PATH ) {
	return new DatabaseSync( file, { readOnly: true } );
}

const plain = ( r ) => ( { ...r } );

// The namespaces whose stored css_property is a PSEUDO-property: the text after the colon names no CSS property of
// its own, so `anim:duration` can never be matched by asking for `anim`. Every other colon in a stored css_property
// belongs to a real property carrying a modifier (`grid-template-columns:count`), which must keep its exact string.
export const PSEUDO_NAMESPACES = [ 'anim', 'fx' ];

// The one leaf map: which CSS property each pseudo-namespace leaf stands for. A leaf that is absent maps to nothing,
// so the setting is deliberately unmatchable rather than wrongly matched (fx:pin, anim:stagger, anim:trigger paint no
// single CSS property).
const PSEUDO_LEAVES = { duration: 'animation-duration', easing: 'animation-timing-function', ease: 'animation-timing-function', preset: 'animation-name' };

// A gradient setting's stored css_property names its paint mechanism, because two gradients on one element must stay
// apart in the framework DB's slots (a text gradient and a background gradient both paint background-image). Each key
// reads as the CSS properties it paints; the keys live in plugins/sgs-blocks/scripts/data/gradient-paint-keys.json,
// shared with the seeder and its gate.
export const GRADIENT_PAINTS = Object.fromEntries( Object.entries( JSON.parse( readFileSync( new URL( '../../../plugins/sgs-blocks/scripts/data/gradient-paint-keys.json', import.meta.url ), 'utf8' ) ).keys ).map( ( [ k, v ] ) => [ k, v.paints ] ) );

// The stored css_property split into its namespace and leaf, or null when it carries no colon.
const namespaced = ( stored ) => {
	const m = /^([a-z][a-z0-9-]*):(.+)$/.exec( String( stored ?? '' ).trim() );
	return m ? { ns: m[ 1 ], leaf: m[ 2 ] } : null;
};

// Whether a stored css_property is a pseudo-property (its namespace is one of PSEUDO_NAMESPACES). A pseudo-property
// holds a keyword slug (fast, medium, slow), never a measured CSS value.
export function isPseudoProperty( stored ) {
	const n = namespaced( stored );
	return !! n && PSEUDO_NAMESPACES.includes( n.ns );
}

// The CSS properties ONE stored css_property value matches. The single definition both readers use (lib/db.mjs's
// `candidates` and lib/triage.mjs's `settingFits`), so the two cannot drift:
//   "padding"                     → [ 'padding' ]                   a plain property matches itself
//   "anim:duration"               → [ 'animation-duration' ]        a pseudo-property through the leaf map
//   "fx:pin"                      → [ ]                             a pseudo leaf that names no property: unmatchable
//   "grid-template-columns:count" → [ 'grid-template-columns:count' ] a real property with a modifier keeps its string
//   "color-gradient"              → [ 'background-image' ]          a gradient key through GRADIENT_PAINTS
export function cssPropertiesOf( stored ) {
	const s = String( stored ?? '' ).trim();
	if ( ! s ) {
		return [];
	}
	if ( GRADIENT_PAINTS[ s ] ) {
		return GRADIENT_PAINTS[ s ];
	}
	const n = namespaced( s );
	if ( ! n || ! PSEUDO_NAMESPACES.includes( n.ns ) ) {
		return [ s ];
	}
	const leaf = PSEUDO_LEAVES[ n.leaf ];
	return leaf ? [ leaf ] : [];
}

// The property a modifier row modifies (`grid-template-columns:count` → `grid-template-columns`), or null. A modifier
// row is a FITTING setting for that property (triage can cite it) but never a resolver candidate for it: it holds a
// track count, not the property's value.
export function modifierOf( stored ) {
	const n = namespaced( stored );
	return n && ! PSEUDO_NAMESPACES.includes( n.ns ) ? n.ns : null;
}

// Every CSS property a comma list of stored css_property values matches.
export const listedProperties = ( stored ) => String( stored ?? '' ).split( ',' ).flatMap( ( s ) => cssPropertiesOf( s ) );

// Every setting of one block that paints a CSS property, SGS-owned only (R-47-10: never native_wp or core style).
export function attrsFor( db, block ) {
	return db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND css_property IS NOT NULL` ).all( block ).map( plain );
}

// A block's enum settings with no css_property (a layout mode, say): calibration discovers what each value changes.
export function enumSettings( db, block ) {
	return db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' ) AND css_property IS NULL AND enum_values IS NOT NULL` ).all( block ).map( plain );
}

// The settings of a block that paint `prop` (a CSS shorthand such as "padding", or one listed in a comma list such
// as "padding-bottom,padding-left,...") in `state` (null = rest). Namespaced values go through `cssPropertiesOf`, so
// `anim:duration` is reached by asking for `animation-duration` and `grid-template-columns:count` is reached only by
// its exact stored string — never by `grid-template-columns`, whose value it cannot hold. A longhand also reaches the
// setting of its shorthand family (`border-top-left-radius` reaches a `border-radius` setting, `overflow-x` an `overflow`
// one) and a logical spelling the physical one (lib/css-families.mjs::reachedBy), in any of the block's stored spellings.
export function candidates( db, block, prop, state = null ) {
	const wanted = reachedBy( prop );
	return attrsFor( db, block ).filter( ( r ) => listedProperties( r.css_property ).some( ( stored ) => storedKeys( stored ).some( ( k ) => wanted.includes( k ) ) ) &&
		( r.css_state || null ) === ( state || null ) );
}

// The setting states the framework holds (block_attributes.css_state), or one block holds when `block` is given: a
// state look is written through one of them.
export function settingStates( db, block = null ) {
	const rows = block ? db.prepare( 'SELECT DISTINCT css_state FROM block_attributes WHERE css_state IS NOT NULL AND block_slug = ?' ).all( block ) : db.prepare( 'SELECT DISTINCT css_state FROM block_attributes WHERE css_state IS NOT NULL' ).all();
	return new Set( rows.map( ( r ) => r.css_state ) );
}

// The state vocabulary (the `states` table, seeded from plugins/sgs-blocks/scripts/data/states.json): every mechanism
// that expresses a state, its state word and how a reader reaches it. { rows, missing } — missing names why it is
// empty (a DB seeded before the table existed), so a caller reports it rather than reading nothing silently.
export function statesVocabulary( db ) {
	const has = db.prepare( "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'states'" ).get();
	if ( ! has ) {
		return { rows: [], missing: 'the framework DB has no states table: reseed it (sgs-update-v2.py) to read state looks' };
	}
	return { rows: db.prepare( 'SELECT state, family, kind, token, reach, call, note FROM states ORDER BY id' ).all().map( plain ), missing: null };
}

// The other rows sharing a flat_sibling base name (backgroundImage, backgroundImageTablet, backgroundImageMobile).
export function siblings( db, block, attr ) {
	const base = attr.replace( /(Tablet|Mobile)$/, '' );
	return attrsFor( db, block ).filter( ( r ) => 'flat_sibling' === r.tier_shape && r.attr_name.replace( /(Tablet|Mobile)$/, '' ) === base );
}

// One setting's row whatever its source (lint: is this attribute native_wp or a core style?).
export function attrRow( db, block, attr ) {
	const r = db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND attr_name = ?` ).get( block, attr );
	return r ? plain( r ) : null;
}

// A block's variant setting and the settings that render only under one of its values (blocks.variant_attr and
// variant_slots): calibration sets the variant before marking such a setting.
export function variantInfo( db, block ) {
	const b = db.prepare( 'SELECT variant_attr FROM blocks WHERE slug = ?' ).get( block );
	if ( ! b?.variant_attr ) {
		return { variantAttr: null, variantSlots: [] };
	}
	return { variantAttr: b.variant_attr, variantSlots: db.prepare( 'SELECT variant_value, unique_slot FROM variant_slots WHERE block_slug = ?' ).all( block ).map( plain ) };
}

// The property_equivalents rows for one draft property (lib/fill-equivalents.mjs evaluates their conditions), or none
// when the DB predates the table.
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
