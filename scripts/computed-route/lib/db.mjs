// Read-only access to the framework database (R-47-2). Opened with node:sqlite in read-only mode, which refuses
// every write; the route never seeds, migrates or writes it.
import { DatabaseSync } from 'node:sqlite';
import os from 'os';
import path from 'path';

export const DB_PATH = path.join( os.homedir(), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db' );

const COLS = 'block_slug, attr_name, attr_type, default_value, enum_values, is_responsive, css_property, css_element, css_state, css_tier, tier_shape, box_family, source';

// Opens the database read-only. `file` overrides the path (tests).
export function openDb( file = DB_PATH ) {
	return new DatabaseSync( file, { readOnly: true } );
}

const plain = ( r ) => ( { ...r } );

// Every setting of one block that paints a CSS property, SGS-owned only (R-47-10: never native_wp or core style).
export function attrsFor( db, block ) {
	return db.prepare( `SELECT ${ COLS } FROM block_attributes WHERE block_slug = ? AND source = 'sgs' AND css_property IS NOT NULL` ).all( block ).map( plain );
}

// The settings of a block that paint `prop` (a CSS shorthand such as "padding", or one listed in a comma list such
// as "padding-bottom,padding-left,...") in `state` (null = rest).
export function candidates( db, block, prop, state = null ) {
	return attrsFor( db, block ).filter( ( r ) => r.css_property.split( ',' ).map( ( s ) => s.trim() ).includes( prop ) &&
		( r.css_state || null ) === ( state || null ) );
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
