/**
 * Writes the built-in button kit's attributes into each declaring block's committed `block.json`, and the
 * framework-database override entries that describe them.
 *
 * Pure functions over text and parsed JSON: `scripts/generate-button-attributes.mjs` reads the files, calls these,
 * and either writes the results or (with `--check`) compares them with what is on disk. The file-level writers
 * (`applyGeneratedAttributes`, `applyOverrideEntries`, `findBlockJsons`) are the media generator's, imported from
 * `scripts/lib/media-block-json.mjs`; this file adds only what is the kit's own.
 *
 * A block declares a button in `supports.sgs.builtinButtons`: `{ prefix, part, label, groups?, elements? }`. The registry
 * (`src/components/button-kit/registry.json`) lists the attribute set per group; the block gets one attribute per
 * row of each group the declaration names (the default groups when `groups` is omitted), named `{prefix}{Base}`. An
 * attribute the block already declares with the row's type is kept as the block's own (it still gets its override
 * entry); one with another type throws, naming every such attribute. Generated attributes carry
 * `"_generated": "button-kit"` and carry no default: unset means the block's own look.
 *
 * Override entries state, for each member attribute: the role; `css_element` (the declared `part`); and, for a
 * row that names a stylesheet property, `css_property`, `css_layer: null`, `css_state` (hover rows) and
 * `tier_shape`. `_apply_attr_classification_overrides` applies an entry last and per field, and db-consistency
 * check #8 reads `css_property` and `css_layer` as a pair, so stating the layer as null keeps the database row equal
 * to the entry even where the derived classifier layer also names the attribute.
 */

import fs from 'fs';

import { checkShowWhen } from './kit-show-when.mjs';
import {
	GENERATORS,
	findBlockJsons,
	applyGeneratedAttributes as applyMarked,
	applyOverrideEntries as applyMarkedOverrides,
	handWrittenOverrideKeys as handWrittenFor,
} from './media-block-json.mjs';

export { findBlockJsons };

export const GENERATED_MARK = 'button-kit';
export const PRESET_ROLE = 'button-preset';
export const OVERRIDE_REASON = GENERATORS.find( ( g ) => g.mark === GENERATED_MARK ).reason;

/** What a box attribute stores: one box, or one box per device (sides for padding and widths, corners for a radius). */
export const BOX_VALUE_SHAPES = [ 'sides', 'corners', 'device_sides', 'device_corners' ];

const PREFIX_RE = /^[a-z][A-Za-z0-9]*$/;
const PART_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
// A part is the database's `css_element`: kebab-case, or lowerCamelCase where the block names its element so (sgs/account's `loginButton`).
const PART_NAME_RE = /^[a-z][A-Za-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Check the registry's shape and return it.
 *
 * @param {Object} registry Parsed registry.json.
 * @return {Object} The same registry.
 */
export function validateRegistry( registry ) {
	const problems = [];
	const groups = registry?.groups;
	if ( ! groups || 'object' !== typeof groups ) {
		throw new Error( 'button kit registry has no "groups" object' );
	}
	const seen = new Set();
	for ( const [ group, rows ] of Object.entries( groups ) ) {
		if ( ! Array.isArray( rows ) || ! rows.length ) {
			problems.push( `group "${ group }" has no rows` );
			continue;
		}
		for ( const row of rows ) {
			if ( ! row.base || ! /^[A-Z][A-Za-z0-9]*$/.test( row.base ) ) {
				problems.push( `group "${ group }": a row has no valid "base" (${ JSON.stringify( row.base ) })` );
			} else if ( seen.has( row.base ) ) {
				problems.push( `base "${ row.base }" appears in two groups or twice` );
			}
			seen.add( row.base );
			if ( ! [ 'string', 'object' ].includes( row.type ) ) {
				problems.push( `base "${ row.base }": type must be string or object` );
			}
			if ( ! row.role ) {
				problems.push( `base "${ row.base }": no role` );
			}
			if ( row.css_state && ! row.css_property ) {
				problems.push( `base "${ row.base }": a css_state without a css_property` );
			}
			if ( row.tier_shape && 'object' !== row.type ) {
				problems.push( `base "${ row.base }": tier_shape on a non-object` );
			}
			if ( 'box_only' === row.tier_shape && ! BOX_VALUE_SHAPES.includes( row.value_shape ) ) {
				problems.push( `base "${ row.base }": a box_only row needs a value_shape of ${ BOX_VALUE_SHAPES.join( ', ' ) } (the database labels a flat and a per-device box alike)` );
			}
			if ( undefined !== row.values && ( ! Array.isArray( row.values ) || ! row.values.length || row.values.some( ( v ) => 'string' !== typeof v || ! v ) ) ) {
				problems.push( `base "${ row.base }": values must be a non-empty list of strings` );
			}
			if ( row.value_shape && 'box_only' !== row.tier_shape ) {
				problems.push( `base "${ row.base }": value_shape on a row that is not box_only` );
			}
		}
	}
	const defaults = registry.defaultGroups;
	if ( ! Array.isArray( defaults ) || defaults.some( ( g ) => ! groups[ g ] ) ) {
		problems.push( 'defaultGroups must name groups that exist' );
	}
	for ( const p of registry.existingPresetAttrs || [] ) {
		if ( ! p.block || ! p.attr ) {
			problems.push( `existingPresetAttrs has an entry without block and attr (${ JSON.stringify( p ) })` );
		}
	}
	if ( problems.length ) {
		throw new Error( `button kit registry is invalid: ${ problems.join( '; ' ) }` );
	}
	return registry;
}

/**
 * Read and validate the registry file.
 *
 * @param {string} file Path to registry.json.
 * @return {Object} The registry.
 */
export function loadRegistry( file ) {
	return validateRegistry( JSON.parse( fs.readFileSync( file, 'utf8' ) ) );
}

/**
 * The buttons a block declares, validated.
 *
 * @param {Object} block    Parsed block.json.
 * @param {Object} registry Validated registry.
 * @return {Array<{prefix:string, part:string, label:string, groups:string[], elements:string[]}>} Declared buttons; empty when none.
 */
export function declaredButtons( block, registry ) {
	const declared = block?.supports?.sgs?.builtinButtons;
	if ( undefined === declared ) {
		return [];
	}
	const where = block?.name || 'block';
	if ( ! Array.isArray( declared ) ) {
		throw new Error( `${ where }: supports.sgs.builtinButtons must be an array` );
	}
	const problems = [];
	const prefixes = new Set();
	const out = declared.map( ( entry, i ) => {
		const at = `${ where }: builtinButtons[${ i }]`;
		if ( ! entry?.prefix || ! PREFIX_RE.test( entry.prefix ) ) {
			problems.push( `${ at } needs a "prefix" in lowerCamelCase (${ JSON.stringify( entry?.prefix ) })` );
		} else if ( prefixes.has( entry.prefix ) ) {
			problems.push( `${ at } repeats the prefix "${ entry.prefix }"` );
		}
		prefixes.add( entry?.prefix );
		if ( ! entry?.part || ! PART_NAME_RE.test( entry.part ) ) {
			problems.push( `${ at } needs a "part" in kebab-case or lowerCamelCase (${ JSON.stringify( entry?.part ) })` );
		}
		if ( ! entry?.label || 'string' !== typeof entry.label ) {
			problems.push( `${ at } needs a "label"` );
		}
		// `elements` (optional) names further class elements the same button is drawn as, where one part is printed under
		// several class names (a gallery's `carousel-prev` and `carousel-next` are both its `arrow` part).
		if ( undefined !== entry?.elements && ( ! Array.isArray( entry.elements ) || entry.elements.some( ( e ) => ! PART_RE.test( e ) ) ) ) {
			problems.push( `${ at } needs "elements" as a list of kebab-case class elements (${ JSON.stringify( entry.elements ) })` );
		}
		const groups = undefined === entry?.groups ? registry.defaultGroups : entry.groups;
		const unknown = Array.isArray( groups ) ? groups.filter( ( g ) => ! registry.groups[ g ] ) : [ '(groups is not an array)' ];
		if ( unknown.length || ! groups.length ) {
			problems.push( `${ at } names unknown or no groups: ${ unknown.join( ', ' ) || 'empty list' }; known: ${ Object.keys( registry.groups ).join( ', ' ) }` );
		}
		checkShowWhen( entry, at, block?.attributes, problems );
		return { prefix: entry?.prefix, part: entry?.part, label: entry?.label, groups, elements: entry?.elements || [] };
	} );
	if ( problems.length ) {
		throw new Error( problems.join( '; ' ) );
	}
	return out;
}

const SIDE_KEYS = [ 'top', 'right', 'bottom', 'left' ];
const CORNER_KEYS = [ 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ];
const DEVICE_KEYS = [ 'desktop', 'tablet', 'mobile' ];

/**
 * The shape of box a block's own attribute stores, read from its default, else from its description. A default that holds
 * a key names the shape; an empty default or none falls to a description that spells the shape out (`{ top, right,
 * bottom, left }`, `{ topLeft, ... }`, `{ desktop, ... }`).
 *
 * @param {Object} def The attribute definition from block.json.
 * @return {string} 'sides', 'corners', 'device_sides', 'device_corners', or 'unknown' when the block says nothing.
 */
export function ownBoxShape( def ) {
	const fromKeys = ( keys, value ) => {
		const held = keys.filter( ( k ) => Object.prototype.hasOwnProperty.call( value, k ) );
		return held.length ? held : null;
	};
	const def_ = def?.default;
	if ( def_ && 'object' === typeof def_ && ! Array.isArray( def_ ) ) {
		if ( fromKeys( DEVICE_KEYS, def_ ) ) {
			const inner = DEVICE_KEYS.map( ( d ) => def_[ d ] ).find( ( v ) => v && 'object' === typeof v && Object.keys( v ).length );
			if ( ! inner ) {
				return 'unknown';
			}
			return fromKeys( CORNER_KEYS, inner ) ? 'device_corners' : fromKeys( SIDE_KEYS, inner ) ? 'device_sides' : 'unknown';
		}
		if ( fromKeys( CORNER_KEYS, def_ ) ) {
			return 'corners';
		}
		if ( fromKeys( SIDE_KEYS, def_ ) ) {
			return 'sides';
		}
	}
	const text = String( def?.description || '' );
	if ( /\{\s*desktop\b/.test( text ) ) {
		return /corner|radius/i.test( text ) ? 'device_corners' : 'device_sides';
	}
	if ( /\{\s*topLeft\b/.test( text ) ) {
		return 'corners';
	}
	if ( /\{\s*top\b/.test( text ) ) {
		return 'sides';
	}
	return 'unknown';
}

/**
 * The attributes a block's `builtinButtons` declaration produces.
 *
 * @param {Object} block    Parsed block.json.
 * @param {Object} registry Validated registry.
 * @param {Object} ownDefs  The attributes the block declares itself, name to definition. A name the kit would also write
 *                          must carry the same type, or this throws naming every such attribute.
 * @param {{kept: string[], unproven?: string[]}} [report] `kept` receives `block attribute` for each own attribute kept because its type matches; `unproven` each kept box whose default and description do not say which shape it stores.
 * @return {Array<{name:string, def:Object, row:Object, part:string, prefix:string, kept:boolean}>} Every member of the
 *         kit's set, in injection order; `kept` marks an own attribute the block.json already holds.
 */
export function generatedAttributes( block, registry, ownDefs, report ) {
	const buttons = declaredButtons( block, registry );
	const own = ownDefs || {};
	const seen = new Map();
	const out = [];
	const clashes = [];
	for ( const button of buttons ) {
		for ( const group of button.groups ) {
			for ( const row of registry.groups[ group ] ) {
				const name = button.prefix + row.base;
				if ( seen.has( name ) ) {
					clashes.push( `${ block.name }: attribute "${ name }" is produced by both the "${ seen.get( name ) }" and the "${ button.prefix }" button` );
					continue;
				}
				seen.set( name, button.prefix );
				let kept = false;
				if ( Object.prototype.hasOwnProperty.call( own, name ) ) {
					const declaredType = own[ name ]?.type;
					const types = Array.isArray( declaredType ) ? declaredType : [ declaredType ];
					if ( ! types.includes( row.type ) ) {
						clashes.push( `${ block.name }: attribute "${ name }" is declared as ${ JSON.stringify( declaredType ) } but the button kit needs "${ row.type }"` );
						continue;
					}
					if ( row.value_shape ) {
						// The database labels a flat box and a per-device one alike (box_only), so the shape is compared here.
						const have = ownBoxShape( own[ name ] );
						if ( 'unknown' !== have && have !== row.value_shape ) {
							clashes.push( `${ block.name }: attribute "${ name }" stores a ${ have } box but the button kit's panel and PHP use ${ row.value_shape }; reshape it with a row in scripts/data/builtin-button-renames.json (kind flat-box-to-desktop-object)` );
							continue;
						}
						if ( 'unknown' === have ) {
							report?.unproven?.push( `${ block.name } ${ name }` );
						}
					}
					kept = true;
					report?.kept.push( `${ block.name } ${ name }` );
				}
				out.push( { name, def: { type: row.type, _generated: GENERATED_MARK }, row, part: button.part, prefix: button.prefix, kept } );
			}
		}
	}
	if ( clashes.length ) {
		throw new Error( `${ clashes.join( '; ' ) }; fix the block.json declaration or the registry` );
	}
	return out;
}

/**
 * Rewrite block.json text so its kit-generated attributes equal `attrs`.
 *
 * @param {string} text  Current block.json source.
 * @param {Array}  attrs Output of generatedAttributes(), kept members included (they are left out here).
 * @return {string} New source (identical to `text` when nothing changes).
 */
export function applyGeneratedAttributes( text, attrs ) {
	return applyMarked( text, attrs.filter( ( a ) => ! a.kept ), GENERATED_MARK );
}

/**
 * The override entry describing one member attribute.
 *
 * @param {string} slug Block name.
 * @param {Object} attr One generatedAttributes() item.
 * @return {Object} { slug, attr, fields, _reason }.
 */
export function overrideEntry( slug, attr ) {
	const { row, part } = attr;
	const fields = { role: row.role };
	if ( row.css_property ) {
		fields.css_property = row.css_property;
		fields.css_layer = null;
	}
	fields.css_element = part;
	if ( row.css_state ) {
		fields.css_state = row.css_state;
	}
	if ( row.tier_shape ) {
		fields.tier_shape = row.tier_shape;
	}
	return { slug, attr: attr.name, fields, _reason: OVERRIDE_REASON };
}

/**
 * The role rows for the preset choices that exist before the kit, from the registry's `existingPresetAttrs`.
 *
 * Each named attribute must exist in its block's block.json. One that already has a hand-written override entry keeps
 * it, and that entry must carry the role.
 *
 * @param {Object}   registry    Validated registry.
 * @param {Map<string,Object>} blocks Parsed block.json by block name (every block, not only the one generated).
 * @param {Object[]} entries     The override file's `entries`.
 * @return {{entries:Object[], skipped:string[]}} Generated rows, and `slug attr` of the hand-written ones kept.
 */
export function presetEntries( registry, blocks, entries ) {
	const problems = [];
	const out = [];
	const skipped = [];
	for ( const { block, attr } of registry.existingPresetAttrs || [] ) {
		if ( ! blocks.get( block )?.attributes?.[ attr ] ) {
			problems.push( `existingPresetAttrs names ${ block }::${ attr }, which block.json does not declare; rename it in the registry` );
			continue;
		}
		const held = entries.find( ( e ) => e.slug === block && e.attr === attr && e._reason !== OVERRIDE_REASON );
		if ( held ) {
			if ( held.fields?.role !== PRESET_ROLE ) {
				problems.push( `${ block }::${ attr } has a hand-written override entry that does not carry "role": "${ PRESET_ROLE }"; add it there` );
			}
			skipped.push( `${ block } ${ attr }` );
			continue;
		}
		out.push( { slug: block, attr, fields: { role: PRESET_ROLE }, _reason: OVERRIDE_REASON } );
	}
	if ( problems.length ) {
		throw new Error( problems.join( '; ' ) );
	}
	return { entries: out, skipped };
}

/**
 * Rewrite the override file so its kit-generated entries equal `entries`.
 *
 * @param {string}   text       Current attr-classification-overrides.json source.
 * @param {Object[]} entries    overrideEntry() and presetEntries() results.
 * @param {string}   [onlySlug] Restrict the rewrite to one block.
 * @return {string} New source.
 */
export function applyOverrideEntries( text, entries, onlySlug ) {
	return applyMarkedOverrides( text, entries, onlySlug, OVERRIDE_REASON );
}

/**
 * (slug, attr) keys the kit does not own: hand-written entries and the media generator's.
 *
 * @param {string} text Override file source.
 * @return {Set<string>} `slug|attr` keys.
 */
export function handWrittenOverrideKeys( text ) {
	return handWrittenFor( text, OVERRIDE_REASON );
}
