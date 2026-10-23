// The site options the site build applies (Spec 48 FR-48-55): the draft's behaviours that belong to the whole site (the
// route fade is `sgs_motion_settings` keys, `page_transitions`, `page_transition_style`, `page_transition_duration`,
// `page_transition_easing`) rather than to a block. Fill finds them and writes `site-options.json` into its run folder
// (`{ option, records, value }`); `promoteSiteOptions` merges that file into the client's committed
// `sites/<client>/build/site-options.json` (`{ "<option>": { records, value } }`), the one input the site build reads, so
// a build never depends on which Fill run is newest. `planSiteOptions` compares each option with the site's stored value
// and plans one `site-option` action (applied by lib/site-build-apply.mjs) with a before-and-after row per changed key;
// a stored value that already holds every desired key plans nothing.
import fs from 'fs';
import path from 'path';

const NAME = /^[a-z][a-z0-9_]*$/;
const KEY = /^[a-z][a-z0-9_]*$/;

export const siteOptionsFile = ( repo, client ) => path.join( repo, 'sites', client, 'build', 'site-options.json' );

const isObject = ( v ) => !! v && 'object' === typeof v && ! Array.isArray( v );
const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// Throws on an entry the site build must not write: an option name or key that is not a plain identifier, or a value that is not an object.
function checked( name, entry ) {
	if ( ! NAME.test( name ) ) {
		throw new Error( `site option "${ name }" is not a plain option name` );
	}
	if ( ! isObject( entry?.value ) || ! Object.keys( entry.value ).length ) {
		throw new Error( `site option ${ name } has no value object` );
	}
	for ( const [ k, v ] of Object.entries( entry.value ) ) {
		if ( ! KEY.test( k ) || ( null !== v && ! [ 'string', 'number', 'boolean' ].includes( typeof v ) ) ) {
			throw new Error( `site option ${ name } key ${ JSON.stringify( k ) } is not a plain key with a string, number or boolean value` );
		}
	}
	return { records: Array.isArray( entry.records ) ? entry.records.map( String ) : [], value: entry.value };
}

// The client's committed site options: { <option>: { records, value } }, {} when the file does not exist.
export function readSiteOptions( repo, client ) {
	const file = siteOptionsFile( repo, client );
	if ( ! fs.existsSync( file ) ) {
		return {};
	}
	const raw = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( ! isObject( raw ) ) {
		throw new Error( `${ path.relative( repo, file ) } is not an object of options` );
	}
	return Object.fromEntries( Object.entries( raw ).map( ( [ name, entry ] ) => [ name, checked( name, entry ) ] ) );
}

// Merges a Fill run's `site-options.json` (a folder holding it, or the file) into the client's committed file: the
// run's keys replace the same keys, other keys and records stay. Returns { file, changed, options }.
export function promoteSiteOptions( { repo, client, from } ) {
	const source = fs.existsSync( from ) && fs.statSync( from ).isDirectory() ? path.join( from, 'site-options.json' ) : from;
	if ( ! fs.existsSync( source ) ) {
		throw new Error( `${ source } does not exist: Fill writes site-options.json only when the draft sets a site option` );
	}
	const run = JSON.parse( fs.readFileSync( source, 'utf8' ) );
	const incoming = checked( run.option, { records: run.records, value: run.value } );
	const held = readSiteOptions( repo, client );
	const was = held[ run.option ] || { records: [], value: {} };
	const next = { records: [ ...new Set( [ ...was.records, ...incoming.records ] ) ].sort(), value: { ...was.value, ...incoming.value } };
	const options = { ...held, [ run.option ]: next };
	const file = siteOptionsFile( repo, client );
	const changed = ! same( was, next );
	if ( changed ) {
		fs.mkdirSync( path.dirname( file ), { recursive: true } );
		fs.writeFileSync( file, `${ JSON.stringify( options, null, '\t' ) }\n` );
	}
	return { file, changed, options };
}

// The PHP that prints the stored value of each option as JSON (`null` for one the site does not hold).
export const optionsPhp = ( names ) => {
	names.forEach( ( n ) => {
		if ( ! NAME.test( n ) ) {
			throw new Error( `site option "${ n }" is not a plain option name` );
		}
	} );
	return `$out = array();\nforeach ( array( ${ names.map( ( n ) => `'${ n }'` ).join( ', ' ) } ) as $n ) {\n\t$out[ $n ] = get_option( $n, null );\n}\necho wp_json_encode( (object) $out );`;
};

// The stored value of each desired option on the site: { <option>: value | null }.
export function readStoredOptions( runPhp, desired ) {
	const names = Object.keys( desired );
	if ( ! names.length ) {
		return {};
	}
	const text = String( runPhp( optionsPhp( names ) ) );
	const start = text.indexOf( '{' );
	if ( start < 0 ) {
		throw new Error( `the site option read printed no JSON: ${ text.slice( 0, 300 ) }` );
	}
	return JSON.parse( text.slice( start ) );
}

const shown = ( v ) => ( undefined === v ? '(unset)' : JSON.stringify( v ) );

// The plan for the site options: { actions, options, notes }. `desired` is readSiteOptions' result, `stored` is
// readStoredOptions'. The written value is the stored one with the desired keys over it, so a key the site holds that
// the draft does not set stays as it is.
export function planSiteOptions( { desired, stored } ) {
	const out = { actions: [], options: [], notes: [] };
	for ( const [ name, { value } ] of Object.entries( desired ) ) {
		const held = stored[ name ];
		if ( null !== held && undefined !== held && ! isObject( held ) ) {
			out.notes.push( `${ name } holds ${ shown( held ) }, not an array of settings: it is replaced by the draft's keys` );
		}
		const base = isObject( held ) ? held : {};
		const changed = Object.entries( value ).filter( ( [ k, v ] ) => ! same( base[ k ], v ) );
		if ( ! changed.length ) {
			continue;
		}
		changed.forEach( ( [ k, v ] ) => out.options.push( { name: `${ name }[${ k }]`, before: shown( base[ k ] ), after: shown( v ) } ) );
		out.actions.push( { phase: 'site', type: 'site-option', name, value: { ...base, ...value }, say: `option ${ name }: set ${ changed.map( ( [ k, v ] ) => `${ k } ${ shown( base[ k ] ) } -> ${ shown( v ) }` ).join( ', ' ) }` } );
	}
	return out;
}

// The site build's plan with the site options added: the planner's own plan, then the options' actions and table rows.
export function withSiteOptions( plan, { repo, client, runPhp } ) {
	const desired = readSiteOptions( repo, client );
	const mine = planSiteOptions( { desired, stored: readStoredOptions( runPhp, desired ) } );
	plan.actions.push( ...mine.actions );
	plan.options.push( ...mine.options );
	plan.notes.push( ...mine.notes );
	return plan;
}
