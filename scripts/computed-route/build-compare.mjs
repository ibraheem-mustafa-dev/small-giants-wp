#!/usr/bin/env node
// The sgs-blocks build check before a mirror is pushed to its test site (scripts/local-wp/push-to-remote.sh runs it).
//   node scripts/computed-route/build-compare.mjs --local <local-site> --target <test-site>
// <local-site> is a calibration-targets.json key with a `pluginDir` (a WSL mirror); <test-site> a deploy_common.py::TARGETS
// key. Reads the mirror's build/blocks folder and the test site's over one ssh call and compares every block's front-end
// files (lib/build-compare.mjs). Exit 0 the builds match, 1 they differ (the fix is printed), 2 usage or a build that cannot be read.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compareBuilds, localFiles, refusal, remoteFiles } from './lib/build-compare.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );

export function main( argv, { local = localFiles, remote = remoteFiles, targets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) ), log = console.log, error = console.error } = {} ) {
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const site = flag( '--local' );
	const target = flag( '--target' );
	if ( ! site || ! target ) {
		error( 'usage: node scripts/computed-route/build-compare.mjs --local <local-site> --target <test-site>' );
		return 2;
	}
	const pluginDir = targets[ site ]?.pluginDir;
	if ( ! pluginDir ) {
		error( `${ site } has no pluginDir in calibration-targets.json, so its build cannot be read` );
		return 2;
	}
	let a;
	let b;
	try {
		a = local( path.join( pluginDir, 'build', 'blocks' ) );
		b = remote( target );
	} catch ( e ) {
		error( `the builds could not be read: ${ String( e.message || e ).split( /\r?\n/ )[ 0 ] }` );
		return 2;
	}
	if ( ! Object.keys( a ).length || ! Object.keys( b ).length ) {
		error( `a build listing is empty (mirror ${ Object.keys( a ).length } files, ${ target } ${ Object.keys( b ).length }): nothing to compare` );
		return 2;
	}
	const diff = compareBuilds( a, b );
	if ( ! diff.same ) {
		error( refusal( diff, target ) );
		return 1;
	}
	log( `sgs-blocks build: the mirror and ${ target } hold the same ${ Object.keys( a ).length } front-end files` );
	return 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
