/**
 * Writes the carousel dots kit's attributes into each declaring block's committed `block.json`, and the
 * framework-database override entries that describe them.
 *
 * Pure functions over text and parsed JSON: `scripts/generate-carousel-dots-attributes.mjs` reads the files, calls these, and
 * either writes the results or (with `--check`) compares them with what is on disk. The file-level writers
 * (`applyGeneratedAttributes`, `applyOverrideEntries`, `findBlockJsons`) are the media generator's, imported from
 * `scripts/lib/media-block-json.mjs`, the same ones the button kit's lib uses; this file adds only what is the dots' own.
 *
 * A block declares its dots in `supports.sgs.carouselDots`: `{ prefix, part, label }`. The registry
 * (`src/components/carousel-dots/registry.json`) lists the rows; the block gets one attribute per row, named
 * `{prefix}{Base}`. An attribute the block already declares with the row's type is kept as the block's own (it still gets
 * its override entry); one with another type throws, naming every such attribute. Generated attributes carry
 * `"_generated": "carousel-dots"` and carry no default: unset means the block's own look.
 *
 * Override entries state, for each attribute: the role, `css_property`, `css_layer: null`, `css_element` (the declared
 * `part`), `css_state` (hover and current rows) and `tier_shape`, as the button kit's do.
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

export const GENERATED_MARK = 'carousel-dots';
export const OVERRIDE_REASON = GENERATORS.find( ( g ) => g.mark === GENERATED_MARK ).reason;

const PREFIX_RE = /^[a-z][A-Za-z0-9]*$/;
const PART_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Check the registry's shape and return it.
 *
 * @param {Object} registry Parsed registry.json.
 * @return {Object} The same registry.
 */
export function validateRegistry( registry ) {
	const problems = [];
	const rows = registry?.rows;
	if ( ! Array.isArray( rows ) || ! rows.length ) {
		throw new Error( 'carousel dots registry has no "rows" list' );
	}
	const seen = new Set();
	for ( const row of rows ) {
		if ( ! row.base || ! /^[A-Z][A-Za-z0-9]*$/.test( row.base ) ) {
			problems.push( `a row has no valid "base" (${ JSON.stringify( row.base ) })` );
		} else if ( seen.has( row.base ) ) {
			problems.push( `base "${ row.base }" appears twice` );
		}
		seen.add( row.base );
		if ( ! [ 'string', 'object' ].includes( row.type ) ) {
			problems.push( `base "${ row.base }": type must be string or object` );
		}
		if ( ! row.role ) {
			problems.push( `base "${ row.base }": no role` );
		}
		if ( ! row.css_property ) {
			problems.push( `base "${ row.base }": every dot setting names a css_property` );
		}
		if ( row.tier_shape && 'object' !== row.type ) {
			problems.push( `base "${ row.base }": tier_shape on a non-object` );
		}
		if ( 'object' === row.type && 'tier_object' !== row.tier_shape ) {
			problems.push( `base "${ row.base }": an object row is a {desktop,tablet,mobile} length, so its tier_shape is tier_object` );
		}
	}
	if ( problems.length ) {
		throw new Error( `carousel dots registry is invalid: ${ problems.join( '; ' ) }` );
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
 * The dots a block declares, validated.
 *
 * @param {Object} block Parsed block.json.
 * @return {{prefix:string, part:string, label:string}|null} The declaration, or null when there is none.
 */
export function declaredDots( block ) {
	const declared = block?.supports?.sgs?.carouselDots;
	if ( undefined === declared ) {
		return null;
	}
	const where = block?.name || 'block';
	const problems = [];
	if ( ! declared || 'object' !== typeof declared || Array.isArray( declared ) ) {
		throw new Error( `${ where }: supports.sgs.carouselDots must be an object { prefix, part, label }` );
	}
	if ( ! declared.prefix || ! PREFIX_RE.test( declared.prefix ) ) {
		problems.push( `${ where }: carouselDots needs a "prefix" in lowerCamelCase (${ JSON.stringify( declared.prefix ) })` );
	}
	if ( ! declared.part || ! PART_RE.test( declared.part ) ) {
		problems.push( `${ where }: carouselDots needs a "part" in kebab-case (${ JSON.stringify( declared.part ) })` );
	}
	if ( ! declared.label || 'string' !== typeof declared.label ) {
		problems.push( `${ where }: carouselDots needs a "label"` );
	}
	checkShowWhen( declared, `${ where }: carouselDots`, block?.attributes, problems );
	if ( problems.length ) {
		throw new Error( problems.join( '; ' ) );
	}
	return { prefix: declared.prefix, part: declared.part, label: declared.label };
}

/**
 * The attributes a block's `carouselDots` declaration produces.
 *
 * @param {Object} block    Parsed block.json.
 * @param {Object} registry Validated registry.
 * @param {Object} ownDefs  The attributes the block declares itself, name to definition. A name the kit would also write
 *                          must carry the same type, or this throws naming every such attribute.
 * @param {{kept: string[]}} [report] Receives `block attribute` for each own attribute kept because its type matches.
 * @return {Array<{name:string, def:Object, row:Object, part:string, prefix:string, kept:boolean}>} Every member of the set.
 */
export function generatedAttributes( block, registry, ownDefs, report ) {
	const dots = declaredDots( block );
	if ( ! dots ) {
		return [];
	}
	const own = ownDefs || {};
	const out = [];
	const clashes = [];
	for ( const row of registry.rows ) {
		const name = dots.prefix + row.base;
		let kept = false;
		if ( Object.prototype.hasOwnProperty.call( own, name ) ) {
			const declaredType = own[ name ]?.type;
			const types = Array.isArray( declaredType ) ? declaredType : [ declaredType ];
			if ( ! types.includes( row.type ) ) {
				clashes.push( `${ block.name }: attribute "${ name }" is declared as ${ JSON.stringify( declaredType ) } but the carousel dots kit needs "${ row.type }"` );
				continue;
			}
			kept = true;
			report?.kept.push( `${ block.name } ${ name }` );
		}
		out.push( { name, def: { type: row.type, _generated: GENERATED_MARK }, row, part: dots.part, prefix: dots.prefix, kept } );
	}
	if ( clashes.length ) {
		throw new Error( `${ clashes.join( '; ' ) }; fix the block.json declaration or the registry` );
	}
	return out;
}

/**
 * Rewrite block.json text so its dots-generated attributes equal `attrs`.
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
	const fields = { role: row.role, css_property: row.css_property, css_layer: null, css_element: part };
	if ( row.css_state ) {
		fields.css_state = row.css_state;
	}
	if ( row.tier_shape ) {
		fields.tier_shape = row.tier_shape;
	}
	return { slug, attr: attr.name, fields, _reason: OVERRIDE_REASON };
}

/**
 * Rewrite the override file so its dots-generated entries equal `entries`.
 *
 * @param {string}   text       Current attr-classification-overrides.json source.
 * @param {Object[]} entries    overrideEntry() results.
 * @param {string}   [onlySlug] Restrict the rewrite to one block.
 * @return {string} New source.
 */
export function applyOverrideEntries( text, entries, onlySlug ) {
	return applyMarkedOverrides( text, entries, onlySlug, OVERRIDE_REASON );
}

/**
 * (slug, attr) keys the dots kit does not own: hand-written entries and the other generators'.
 *
 * @param {string} text Override file source.
 * @return {Set<string>} `slug|attr` keys.
 */
export function handWrittenOverrideKeys( text ) {
	return handWrittenFor( text, OVERRIDE_REASON );
}
