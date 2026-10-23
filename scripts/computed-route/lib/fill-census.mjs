// The Fill census: every UNMAPPED row of a Fill run (and every already-held row) belongs to a named cause.
// Rules live in data/census-classes.json; a row no rule matches is a new gap kind.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RULES_FILE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'census-classes.json' );

// Reads the rule file into { unmapped, held } with each pattern compiled.
export function loadRules( file = RULES_FILE ) {
	const raw = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const compile = ( list ) => list.map( ( r ) => ( { ...r, re: new RegExp( r.pattern, 'i' ) } ) );
	return { unmapped: compile( raw.unmapped ), held: compile( raw.held ) };
}

// The first rule whose pattern matches the text, or null.
export function classify( text, rules ) {
	return rules.find( ( r ) => r.re.test( String( text ?? '' ) ) ) || null;
}

// Classifies the rows of one run. `unmapped` rows go by `reason`, `held` rows by `reason` (the held reason).
// Returns { total, classes: [ { class, owner, kind, count, blocks, properties } ], unclassified: [ row ] }.
export function census( { unmapped = [], held = [] }, rules = loadRules() ) {
	const by = new Map();
	const unclassified = [];
	const add = ( rows, list, kind ) => {
		for ( const row of rows ) {
			const rule = classify( row.reason, list );
			if ( ! rule ) {
				unclassified.push( { kind, ...row } );
				continue;
			}
			if ( ! by.has( rule.class ) ) by.set( rule.class, { class: rule.class, owner: rule.owner, kind, count: 0, blocks: new Set(), properties: new Set() } );
			const entry = by.get( rule.class );
			entry.count++;
			if ( row.block ) entry.blocks.add( row.block );
			if ( row.property ) entry.properties.add( row.property );
		}
	};
	add( unmapped, rules.unmapped, 'unmapped' );
	add( held, rules.held, 'held' );
	const classes = [ ...by.values() ].map( ( e ) => ( { ...e, blocks: [ ...e.blocks ].sort(), properties: [ ...e.properties ].sort() } ) ).sort( ( a, b ) => b.count - a.count || a.class.localeCompare( b.class ) );
	return { total: unmapped.length + held.length, classes, unclassified };
}

// Reads a Fill run folder (unmapped.json and fill-report.json) and runs the census.
export function censusRun( dir, rules = loadRules() ) {
	const read = ( f ) => JSON.parse( fs.readFileSync( path.join( dir, f ), 'utf8' ) );
	const unmapped = read( 'unmapped.json' );
	const held = fs.existsSync( path.join( dir, 'fill-report.json' ) ) ? ( read( 'fill-report.json' ).alreadyHeld || [] ) : [];
	return census( { unmapped, held: Array.isArray( held ) ? held : [] }, rules );
}
