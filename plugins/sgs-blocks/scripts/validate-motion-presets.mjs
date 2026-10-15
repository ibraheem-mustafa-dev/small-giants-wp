#!/usr/bin/env node
/**
 * validate-motion-presets.mjs: validates scripts/data/motion-presets.json against schemas/motion.schema.json.
 *
 * Each preset is wrapped in the smallest sgsMotion document that carries it (the layer its panel and effect name,
 * on the root target) and run through the cloning tool's checkMotion, so a preset is held to exactly the field
 * types, ranges, token enums and refusals a stored layer is. On top of the schema it checks the file's own contract:
 *
 *   - unique slugs, known panel / kind / target, an effect that exists in `x-sgs-effects` and allows the panel;
 *   - a kind=intensity family has exactly Subtle, Standard and Bold ("Dramatic" is refused), and its three rows share
 *     one panel, effect, trigger and target (FR-38A-46: Intensity never changes trigger or target);
 *   - an intensity row carries only fields the schema flags `intensity` (a restamp never touches other values);
 *   - a family's Standard row agrees with the preset of the same family on every field both carry.
 *
 * Usage: node validate-motion-presets.mjs [presets.json]
 * Prints one JSON line {"count": N, "failures": [{"slug", "problems": [...]}]} on stdout and exits 1 on any failure.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkMotion, enumerateFields, loadMotionSchema } from '../../../scripts/computed-route/lib/motion-schema.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const DEFAULT_FILE = path.join( HERE, 'data', 'motion-presets.json' );
const KINDS = [ 'preset', 'intensity', 'keyframe' ];
const LEVELS = [ 'subtle', 'standard', 'bold' ];
const TARGETS = [ 'block', 'surface', 'part' ];
const PANELS = [ 'hover', 'entrance', 'effects' ];
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

// The sgsMotion document carrying one preset as a layer of the panel (and effect) it belongs to.
export function wrapPreset( p ) {
	const layer = { preset: p.slug, trigger: p.trigger, values: p.values };
	// A state preset leaves the state to the author (the layer names the block's own state); a placeholder lets the
	// schema check the rest of the layer.
	if ( 'state' === p.trigger ) {
		layer.state = 'preset-check';
	}
	if ( p.intensity ) {
		layer.intensity = p.intensity;
	}
	if ( p.devices && Object.keys( p.devices ).length ) {
		layer.devices = p.devices;
	}
	const element = {};
	if ( p.panel === 'hover' ) {
		element.hover = p.effect ? { effects: [ { id: 'p1', effect: p.effect, ...layer } ] } : { state: layer };
	} else if ( p.panel === 'entrance' ) {
		element.entrance = p.effect ? { text: [ { id: 'p1', effect: p.effect, ...layer } ] } : { base: layer };
	} else {
		element.effects = [ { id: 'p1', effect: p.effect, ...layer } ];
	}
	return { v: 1, elements: { root: element } };
}

// Dot paths of the leaves of an intensity row's values, a list (rows, keyframes) counting as one leaf.
function leafPaths( node, base ) {
	if ( node === null || typeof node !== 'object' || Array.isArray( node ) ) {
		return [ base ];
	}
	return Object.entries( node ).flatMap( ( [ k, v ] ) => leafPaths( v, `${ base }.${ k }` ) );
}

function intensityPaths( rows, p ) {
	const layer = p.effect ? null : { hover: 'hover.state', entrance: 'entrance.base' }[ p.panel ];
	return new Set( rows.filter( ( r ) => r.intensity && ( p.effect ? r.effect === p.effect : r.layer === layer ) ).map( ( r ) => r.path.replace( /\[\]$/, '' ) ) );
}

export function validatePresets( doc, schema = loadMotionSchema() ) {
	const failures = new Map();
	const fail = ( slug, msg ) => failures.set( slug, [ ...( failures.get( slug ) || [] ), msg ] );
	const presets = Array.isArray( doc.presets ) ? doc.presets : [];
	if ( ! presets.length ) {
		fail( '(file)', 'presets is empty or missing' );
	}
	const fields = enumerateFields( schema );
	const effects = schema[ 'x-sgs-effects' ];
	const seen = new Set();
	const families = new Map();

	for ( const p of presets ) {
		const slug = typeof p.slug === 'string' ? p.slug : '(no slug)';
		if ( ! SLUG.test( slug ) || seen.has( slug ) ) {
			fail( slug, seen.has( slug ) ? 'duplicate slug' : 'slug is not lower-case words and hyphens' );
		}
		seen.add( slug );
		if ( ! PANELS.includes( p.panel ) || ! KINDS.includes( p.kind ) || ! TARGETS.includes( p.target ) ) {
			fail( slug, `panel, kind or target is not one of ${ PANELS }, ${ KINDS }, ${ TARGETS }` );
			continue;
		}
		if ( typeof p.family !== 'string' || ! p.family || typeof p.label !== 'string' || ! p.label || typeof p.source !== 'string' ) {
			fail( slug, 'family, label and source are required' );
			continue;
		}
		if ( p.effect !== null && ! ( effects[ p.effect ] && effects[ p.effect ].panels.includes( p.panel ) ) ) {
			fail( slug, `effect "${ p.effect }" is not an x-sgs-effects slug that allows the ${ p.panel } panel` );
			continue;
		}
		if ( p.effect === null && p.panel === 'effects' ) {
			fail( slug, 'an Effects panel row needs an effect' );
			continue;
		}
		if ( ( p.kind === 'intensity' ) !== LEVELS.includes( p.intensity ) ) {
			fail( slug, `intensity "${ p.intensity }" must be one of ${ LEVELS } exactly when kind is intensity` );
			continue;
		}
		const verdict = checkMotion( wrapPreset( p ), schema );
		[ ...verdict.errors, ...verdict.refusals.map( ( r ) => ( typeof r === 'string' ? r : r.text || JSON.stringify( r ) ) ) ].forEach( ( e ) => fail( slug, e ) );
		if ( p.kind === 'intensity' ) {
			const allowed = intensityPaths( fields, p );
			leafPaths( p.values, 'values' ).filter( ( l ) => ! allowed.has( l ) ).forEach( ( l ) => fail( slug, `${ l } is not an Intensity-governed field (travel, angle, radius, range and speed only)` ) );
		}
		families.set( p.family, [ ...( families.get( p.family ) || [] ), p ] );
	}

	for ( const [ family, rows ] of families ) {
		const trio = rows.filter( ( r ) => r.kind === 'intensity' );
		if ( trio.length ) {
			if ( trio.map( ( r ) => r.intensity ).sort().join() !== [ ...LEVELS ].sort().join() ) {
				fail( trio[ 0 ].slug, `family ${ family } must have exactly one Subtle, Standard and Bold row` );
			}
			for ( const key of [ 'panel', 'effect', 'trigger', 'target' ] ) {
				if ( new Set( trio.map( ( r ) => r[ key ] ) ).size > 1 ) {
					fail( trio[ 0 ].slug, `family ${ family } rows differ in ${ key } (Intensity must not change trigger or target)` );
				}
			}
			const standard = trio.find( ( r ) => r.intensity === 'standard' );
			for ( const base of rows.filter( ( r ) => r.kind === 'preset' ) ) {
				for ( const leaf of leafPaths( standard.values, 'values' ) ) {
					const get = ( o ) => leaf.split( '.' ).slice( 1 ).reduce( ( a, k ) => ( a === undefined || a === null ? undefined : a[ k ] ), o );
					const a = get( standard.values );
					const b = get( base.values );
					if ( b !== undefined && JSON.stringify( a ) !== JSON.stringify( b ) ) {
						fail( standard.slug, `Standard ${ leaf } differs from preset ${ base.slug } (${ JSON.stringify( a ) } vs ${ JSON.stringify( b ) })` );
					}
				}
			}
		}
	}
	return { count: presets.length, failures: [ ...failures ].map( ( [ slug, problems ] ) => ( { slug, problems } ) ) };
}

function main() {
	const file = process.argv[ 2 ] ? path.resolve( process.argv[ 2 ] ) : DEFAULT_FILE;
	let doc;
	try {
		doc = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch ( e ) {
		process.stdout.write( JSON.stringify( { count: 0, failures: [ { slug: '(file)', problems: [ `${ file }: ${ e.message }` ] } ] } ) + '\n' );
		process.exit( 1 );
	}
	const result = validatePresets( doc );
	process.stdout.write( JSON.stringify( result ) + '\n' );
	process.exit( result.failures.length ? 1 : 0 );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main();
}
