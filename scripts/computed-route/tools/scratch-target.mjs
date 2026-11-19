#!/usr/bin/env node
// Records a scratch copy of a local mirror as a site target, so a route run can name it with `--site` (lib/site-targets.mjs).
//   node scripts/computed-route/tools/scratch-target.mjs add <local-mediatest-name> --source <local mirror> --url http://localhost:<port>
//   node scripts/computed-route/tools/scratch-target.mjs remove <local-mediatest-name>
//   node scripts/computed-route/tools/scratch-target.mjs list
// `add` derives the copy's entry from the source mirror's committed entry (secrets file .claude/secrets/<name>.env, key, plugin
// folder and every localhost address moved to the copy; mirrorOf kept, so the copy's post ids and calibration cache are the
// test site's) and writes it to calibration-targets.local.json beside calibration-targets.json (gitignored: it is one
// machine's). `add` on a name already there updates it. Contacts no site and reads no secret.
// Exit 0 done, 2 usage or a refusal.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LOCAL_TARGETS_FILE, readTargets, scratchEntry, withScratch } from '../lib/site-targets.mjs';

const USAGE = 'usage: scratch-target.mjs add <local-mediatest-name> --source <local mirror> --url http://localhost:<port> | remove <local-mediatest-name> | list';

// Runs one command; `files.here` and `files.local` point the two target files elsewhere (tests). Returns the exit code.
export function main( argv, { log = console.log, error = console.error, files = {} } = {} ) {
	const here = files.here;
	const localFile = files.local ?? LOCAL_TARGETS_FILE;
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const [ command, name ] = argv;
	if ( ! [ 'add', 'remove', 'list' ].includes( command ) || ( 'list' !== command && ( ! name || name.startsWith( '--' ) ) ) ) {
		error( USAGE );
		return 2;
	}
	try {
		const committed = readTargets( { here, local: false } );
		const entries = fs.existsSync( localFile ) ? JSON.parse( fs.readFileSync( localFile, 'utf8' ) ) : {};
		if ( 'list' === command ) {
			Object.entries( entries ).forEach( ( [ site, t ] ) => log( `${ site }: scratch copy of ${ t.scratchOf }, ${ t.envFile }, ${ t.pluginDir }` ) );
			! Object.keys( entries ).length && log( 'no scratch copy is recorded' );
			return 0;
		}
		if ( Object.hasOwn( committed, name ) ) {
			throw new Error( `${ name } is a committed entry of calibration-targets.json: a scratch copy only adds a site` );
		}
		const next = 'add' === command ? withScratch( entries, { add: { name, entry: scratchEntry( { name, source: flag( '--source' ), url: flag( '--url' ) }, committed ) } } ) : withScratch( entries, { remove: name } );
		fs.writeFileSync( localFile, `${ JSON.stringify( next, null, 2 ) }\n` );
		log( 'add' === command ? `${ name } recorded in ${ path.basename( localFile ) }: scratch copy of ${ next[ name ].scratchOf } (${ next[ name ].envFile }, ${ next[ name ].pluginDir })` : `${ name } removed from ${ path.basename( localFile ) }` );
		return 0;
	} catch ( e ) {
		error( e.message );
		return 2;
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
