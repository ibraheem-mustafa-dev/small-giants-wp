// The site options the site build applies (Spec 48 FR-48-55): the draft's behaviours that belong to the whole site (the
// route fade is `sgs_motion_settings` keys, `page_transitions`, `page_transition_style`, `page_transition_duration`,
// `page_transition_easing`) rather than to a block. Fill finds them and writes `site-options.json` into its run folder
// (`{ option, records, value }`); `promoteSiteOptions` merges that file into the client's committed
// `sites/<client>/build/site-options.json` (`{ "<option>": { records, value, sources } }`), the one input the site build
// reads, so a build never depends on which Fill run is newest. `sources` names each Fill run file the option's value came
// from (repo-relative, `sites/<client>/build/qa/fill/.../site-options.json`); the reader refuses an entry without one, so
// the committed file only ever holds what a Fill run wrote and is never a second, hand-written source. `planSiteOptions` compares each option with the site's stored value
// and plans one `site-option` action (applied by lib/site-build-apply.mjs) with a before-and-after row per changed key;
// a stored value that already holds every desired key plans nothing. The skeleton writer's site options are the second
// input (`skeletonSiteOptions`): a draft element that is a site setting rather than a block (a fixed back-to-top control, a
// reading progress bar: the Customiser's `sgs_floating_ui_*` options, each its own scalar option) is a row of the client's
// intake.json carrying `siteOptions`, on any intake surface whether or not a build surface proposes it, and each of those
// options is planned as one scalar `site-option` action.
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

// A Fill run file path for this client, repo-relative with forward slashes.
const fillRun = ( client ) => new RegExp( `^sites/${ client.replace( /[^a-z0-9-]/g, '' ) }/build/qa/fill/[^\s]+/site-options\.json$` );

// Throws on a committed entry that names no Fill run of this client as its source.
function sourced( client, name, entry ) {
	const sources = Array.isArray( entry?.sources ) ? entry.sources : [];
	if ( ! sources.length || sources.some( ( s ) => 'string' !== typeof s || ! fillRun( client ).test( s ) ) ) {
		throw new Error( `site option ${ name } names no Fill run of ${ client } as its source (sources: ${ JSON.stringify( entry?.sources ?? null ) }); promote one with --promote-options` );
	}
	return { ...checked( name, entry ), sources: [ ...sources ] };
}

// The client's committed site options: { <option>: { records, value, sources } }, {} when the file does not exist.
export function readSiteOptions( repo, client ) {
	const file = siteOptionsFile( repo, client );
	if ( ! fs.existsSync( file ) ) {
		return {};
	}
	const raw = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( ! isObject( raw ) ) {
		throw new Error( `${ path.relative( repo, file ) } is not an object of options` );
	}
	return Object.fromEntries( Object.entries( raw ).map( ( [ name, entry ] ) => [ name, sourced( client, name, entry ) ] ) );
}

// Merges a Fill run's `site-options.json` (a folder holding it, or the file) into the client's committed file: the
// run's keys replace the same keys, other keys and records stay, and the run's file joins the option's sources. The run
// must sit in this client's Fill output (`sites/<client>/build/qa/fill/`). Returns { file, changed, options }.
export function promoteSiteOptions( { repo, client, from } ) {
	const source = fs.existsSync( from ) && fs.statSync( from ).isDirectory() ? path.join( from, 'site-options.json' ) : from;
	if ( ! fs.existsSync( source ) ) {
		throw new Error( `${ source } does not exist: Fill writes site-options.json only when the draft sets a site option` );
	}
	const where = path.relative( repo, path.resolve( source ) ).split( path.sep ).join( '/' );
	if ( ! fillRun( client ).test( where ) ) {
		throw new Error( `${ where } is not a Fill run of ${ client }: promote a run folder under sites/${ client }/build/qa/fill/` );
	}
	const run = JSON.parse( fs.readFileSync( source, 'utf8' ) );
	const incoming = checked( run.option, { records: run.records, value: run.value } );
	const held = readSiteOptions( repo, client );
	const was = held[ run.option ] || { records: [], value: {}, sources: [] };
	const next = {
		records: [ ...new Set( [ ...was.records, ...incoming.records ] ) ].sort(),
		value: { ...was.value, ...incoming.value },
		sources: [ ...new Set( [ ...was.sources, where ] ) ].sort(),
	};
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

// The site options the skeleton rows of the client's intake.json set (`rows[].siteOptions`, lib/intake-skeletons.mjs::rowsOf):
// { <option>: { records (the row ids), value (a string, number or boolean), sources: [ 'sites/<client>/build/intake/intake.json' ] } },
// {} without an intake record. Two rows setting one option to different values plan neither: a note names them.
export function skeletonSiteOptions( repo, client ) {
	const file = path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' );
	const out = { options: {}, notes: [] };
	if ( ! fs.existsSync( file ) ) {
		return out;
	}
	const source = path.relative( repo, file ).split( path.sep ).join( '/' );
	const rows = Object.values( JSON.parse( fs.readFileSync( file, 'utf8' ) ).skeletons || {} ).flatMap( ( x ) => x.rows || [] ).filter( ( r ) => isObject( r.siteOptions ) );
	const clash = new Set();
	for ( const r of rows ) {
		for ( const [ name, value ] of Object.entries( r.siteOptions ) ) {
			const held = out.options[ name ];
			if ( held && ! same( held.value, value ) ) {
				clash.add( name );
				out.notes.push( `${ name }: ${ held.records.join( ', ' ) } set ${ shown( held.value ) } and ${ r.rowId } sets ${ shown( value ) }; neither is applied` );
				continue;
			}
			out.options[ name ] = { records: [ ...new Set( [ ...( held?.records || [] ), r.rowId ] ) ], value, sources: [ source ] };
		}
	}
	clash.forEach( ( n ) => delete out.options[ n ] );
	Object.entries( out.options ).forEach( ( [ n, o ] ) => checkedScalar( n, o.value ) );
	return out;
}

// Throws on a scalar option the site build must not write: a name that is not a plain option name, or a value that is not a string, number or boolean.
function checkedScalar( name, value ) {
	if ( ! NAME.test( name ) || ! [ 'string', 'number', 'boolean' ].includes( typeof value ) ) {
		throw new Error( `site option ${ JSON.stringify( name ) } is not a plain option name with a string, number or boolean value` );
	}
	return value;
}

// The plan for the site options: { actions, options, notes }. `desired` is readSiteOptions' result, `stored` is
// readStoredOptions'. The written value is the stored one with the desired keys over it, so a key the site holds that
// the draft does not set stays as it is.
export function planSiteOptions( { desired, stored } ) {
	const out = { actions: [], options: [], notes: [] };
	for ( const [ name, { value } ] of Object.entries( desired ) ) {
		const held = stored[ name ];
		// A scalar option (a skeleton row's Floating UI setting) is written whole when the stored value differs.
		if ( ! isObject( value ) ) {
			! same( held ?? undefined, value ) && out.options.push( { name, before: shown( held ?? undefined ), after: shown( value ) } );
			! same( held ?? undefined, value ) && out.actions.push( { phase: 'site', type: 'site-option', name, value, say: `option ${ name }: set ${ shown( held ?? undefined ) } -> ${ shown( value ) }` } );
			continue;
		}
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

// The site build's plan with the site options added: the planner's own plan, then the options' actions and table rows,
// for the committed site-options.json and the skeleton rows' scalar options alike.
export function withSiteOptions( plan, { repo, client, runPhp } ) {
	const skeleton = skeletonSiteOptions( repo, client );
	const desired = { ...skeleton.options, ...readSiteOptions( repo, client ) };
	const mine = planSiteOptions( { desired, stored: readStoredOptions( runPhp, desired ) } );
	plan.actions.push( ...mine.actions );
	plan.options.push( ...mine.options );
	plan.notes.push( ...skeleton.notes, ...mine.notes );
	return plan;
}
