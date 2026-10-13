// The cloning tool's sgsMotion validator (Spec 38A §6.3, FR-38A-2): Ajv for draft 2020-12, compiled once per schema,
// over `plugins/sgs-blocks/schemas/motion.schema.json` (the same file the PHP renderer and the inspector read), plus the
// §10 and §5.2 refusal evaluator (lib/motion-refusals.mjs). Strict mode is on; the schema's `x-sgs-*` annotation
// keywords are registered as a vocabulary so Ajv accepts them without treating them as assertions, except
// `x-sgs-range`, which is an assertion keyword (rangeProblem below).
import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import { fileURLToPath } from 'url';
import { motionRefusals } from './motion-refusals.mjs';

export { motionRefusals, elementRefusals, elementLayers } from './motion-refusals.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '../../..' );
export const MOTION_SCHEMA_FILE = path.join( REPO, 'plugins', 'sgs-blocks', 'schemas', 'motion.schema.json' );

export function loadMotionSchema( file = MOTION_SCHEMA_FILE ) {
	return JSON.parse( fs.readFileSync( file, 'utf8' ) );
}

// Every `x-sgs-*` keyword the schema uses, at any depth.
export function annotationKeywords( schema ) {
	const found = new Set();
	const walk = ( node ) => {
		if ( Array.isArray( node ) ) {
			node.forEach( walk );
		} else if ( node && typeof node === 'object' ) {
			for ( const [ k, v ] of Object.entries( node ) ) {
				if ( k.startsWith( 'x-sgs' ) ) {
					found.add( k );
				}
				walk( v );
			}
		}
	};
	walk( schema );
	return [ ...found ].sort();
}

// `x-sgs-range` {min, max, unit}: a range in the type's base unit (ms, px or deg) that also binds the string forms a
// sibling minimum/maximum cannot see. A number is read in the base unit; a string converts by its unit; token
// references (`token:`, `-token:`) and `calc(` strings are not range-checked (tokens are held to their §7 bands),
// except that a range starting at zero or above refuses a negated token, which is always negative.
// Context-relative units (em, rem, %, vh, vw, svh, dvh) have no fixed size, so a ranged field refuses them.
export const RANGE_UNITS = { ms: { ms: 1, s: 1000 }, px: { px: 1 }, deg: { deg: 1, turn: 360, rad: 180 / Math.PI } };
export const RELATIVE_UNITS = new Set( [ 'em', 'rem', '%', 'vh', 'vw', 'svh', 'dvh' ] );

// The problem with one value under one range, or null when it is in range or not range-checked.
export function rangeProblem( range, value ) {
	let amount;
	let raw;
	if ( typeof value === 'number' ) {
		amount = value;
		raw = `${ value }${ range.unit }`;
	} else if ( typeof value === 'string' ) {
		// A negated token is a negative length, so a range that starts at zero or above refuses it.
		if ( value.startsWith( '-token:' ) && typeof range.min === 'number' && range.min >= 0 ) {
			return `must be from ${ range.min } to ${ range.max }${ range.unit } (got ${ value }, a negated token)`;
		}
		if ( /^-?token:/.test( value ) || value.startsWith( 'calc(' ) ) {
			return null;
		}
		const m = value.match( /^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]+)$/ );
		if ( ! m ) {
			return null;
		}
		const factor = ( RANGE_UNITS[ range.unit ] || {} )[ m[ 2 ] ];
		if ( factor === undefined ) {
			return RELATIVE_UNITS.has( m[ 2 ] )
				? `unit "${ m[ 2 ] }" has no fixed size, so this ranged field takes ${ range.unit }`
				: `unit "${ m[ 2 ] }" does not convert to ${ range.unit }`;
		}
		amount = Number( m[ 1 ] ) * factor;
		raw = value;
	} else {
		return null;
	}
	if ( amount < range.min - 1e-9 || amount > range.max + 1e-9 ) {
		return `must be from ${ range.min } to ${ range.max }${ range.unit } (got ${ raw })`;
	}
	return null;
}

const compiled = new WeakMap();

// The compiled validator for one schema object; compiled on first use only.
export function motionValidator( schema = defaultSchema() ) {
	if ( ! compiled.has( schema ) ) {
		const Ajv = Ajv2020.default || Ajv2020;
		// strictTypes and strictRequired are lint rules about schema style (a narrowing `minimum` beside a `$ref`, a
		// `required` inside an `if`/`then` branch); every other strict check stays on.
		const ajv = new Ajv( { strict: true, strictTypes: false, strictRequired: false, allErrors: true } );
		ajv.addVocabulary( annotationKeywords( schema ).filter( ( k ) => k !== 'x-sgs-range' ) );
		ajv.addKeyword( {
			keyword: 'x-sgs-range',
			schemaType: 'object',
			errors: true,
			validate: function checkRange( range, data ) {
				const problem = rangeProblem( range, data );
				checkRange.errors = problem ? [ { keyword: 'x-sgs-range', message: problem, params: { range } } ] : [];
				return ! problem;
			},
		} );
		compiled.set( schema, ajv.compile( schema ) );
	}
	return compiled.get( schema );
}

let cachedDefault = null;
function defaultSchema() {
	if ( ! cachedDefault ) {
		cachedDefault = loadMotionSchema();
	}
	return cachedDefault;
}

// One readable line per Ajv error: the instance path, the message and the offending key or limit.
export function formatError( e ) {
	const where = e.instancePath || '/';
	const p = e.params || {};
	let detail = '';
	if ( p.additionalProperty !== undefined ) {
		detail = ` (${ p.additionalProperty })`;
	} else if ( p.unevaluatedProperty !== undefined ) {
		detail = ` (${ p.unevaluatedProperty })`;
	}
	return `${ where }: ${ e.message }${ detail }`;
}

// Schema errors for one sgsMotion document, one line each (empty when valid).
export function schemaErrors( doc, schema = defaultSchema() ) {
	const validate = motionValidator( schema );
	return validate( doc ) ? [] : validate.errors.map( formatError );
}

// The cloning tool's verdict: schema errors, then (only on a schema-valid document) each refusal's exact text.
export function checkMotion( doc, schema = defaultSchema() ) {
	const errors = schemaErrors( doc, schema );
	const refusals = errors.length ? [] : motionRefusals( schema, doc );
	return { valid: errors.length === 0 && refusals.length === 0, errors, refusals };
}

// Every motion field the schema declares, from each layer's values node down through nested nodes: one row per field
// with its layer, effect, dot path, field type, CSS property, state, per-device flag and Intensity flag. The framework
// DB seeder (FR-38A-3) and the inspector read this shape.
export function enumerateFields( schema = defaultSchema() ) {
	const defs = schema.$defs;
	const name = ( ref ) => ref.replace( '#/$defs/', '' );
	const rows = [];
	const walk = ( defName, base, layer, effect ) => {
		for ( const [ key, entry ] of Object.entries( defs[ defName ].properties || {} ) ) {
			const meta = entry[ 'x-sgs-field' ];
			const p = base ? `${ base }.${ key }` : key;
			if ( meta ) {
				rows.push( { layer, effect, path: p, node: defName, ...meta, enum: entry.enum || null } );
			} else if ( entry.$ref && [ 'values', 'helper' ].includes( defs[ name( entry.$ref ) ][ 'x-sgs-kind' ] ) ) {
				walk( name( entry.$ref ), p, layer, effect );
			} else if ( entry.$ref && defs[ name( entry.$ref ) ][ 'x-sgs-kind' ] === 'list' ) {
				const item = defs[ name( entry.$ref ) ].items.$ref;
				if ( item && defs[ name( item ) ][ 'x-sgs-kind' ] === 'values' ) {
					walk( name( item ), `${ p }[]`, layer, effect );
				}
			}
		}
	};
	const layerRoots = { 'hover.state': 'HoverState', 'entrance.base': 'EntranceBase' };
	for ( const [ layer, def ] of Object.entries( layerRoots ) ) {
		for ( const key of [ 'values', 'close' ] ) {
			const ref = defs[ def ].properties[ key ];
			if ( ref ) {
				walk( name( ref.$ref ), key, layer, null );
			}
		}
	}
	for ( const [ slug, eff ] of Object.entries( schema[ 'x-sgs-effects' ] ) ) {
		for ( const panel of eff.panels ) {
			const layer = { hover: 'hover.effects', entrance: 'entrance.text', effects: 'effects' }[ panel ];
			walk( name( eff.values ), 'values', layer, slug );
		}
	}
	walk( name( schema.properties.stagger.$ref ), 'stagger', 'stagger', null );
	return rows;
}
