#!/usr/bin/env node
// The surface command: one or more surfaces of a client cloned onto a site through every stage, passing only when every stage ran.
//   node scripts/computed-route/clone-surface.mjs <client> --surface a,b --site <target>
//        [--allow-missing-paint sgs/a,sgs/b] [--allow-unpicked] [--no-retry] [--jobs 1]
// It checks each surface's finaliser picks (lib/clone-surface.mjs::finaliserVerdict), runs site-run.mjs for the surfaces with every stage
// (inventory, propose, fill, build, apply, walk) and --strict, retries a build that timed out once with --stages build,apply,walk, and prints
// one line per surface and stage: `ok`, `skip` or `FAIL` with its reason and, for a failure, the stage log. A template copy a page sits in is
// run with the page (never --no-copies). Exit 0 when every stage ran and passed; 1 otherwise (each failure and each stage that did not run
// is listed); 2 on a usage error or a refused site. --site is the only site read or written: a protected site is refused here, and site-run.mjs
// refuses a scratch copy in a main checkout and a site with other post ids than the surfaces'.
// --allow-missing-paint (lib/paint-gate.mjs) and --allow-unpicked are named allowances, never wildcards. Run it from a worktree.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cloneSurfaces } from './lib/clone-surface.mjs';
import { launchSiteRun } from './lib/site-run-launch.mjs';
import { allowMissingPaintArg } from './lib/paint-gate.mjs';
import { assertUnprotected, readTargets, targetOf } from './lib/site-targets.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const USAGE = 'usage: clone-surface.mjs <client> --surface a,b --site <target> [--allow-missing-paint sgs/a,sgs/b] [--allow-unpicked] [--no-retry] [--jobs 1]';

export async function main( argv, { launch = launchSiteRun, repo = REPO, log = console.log, error = console.error } = {} ) {
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = argv[ 0 ] && ! argv[ 0 ].startsWith( '--' ) ? argv[ 0 ] : null;
	const site = flag( '--site' );
	const keys = ( flag( '--surface' ) ?? '' ).split( ',' ).filter( Boolean );
	if ( ! client || ! site || ! keys.length ) {
		error( USAGE );
		return 2;
	}
	try {
		const targets = readTargets();
		targetOf( site, targets );
		assertUnprotected( site, targets );
		const build = path.join( repo, 'sites', client, 'build' );
		const surfaces = JSON.parse( fs.readFileSync( path.join( build, 'surfaces.json' ), 'utf8' ) );
		const intake = JSON.parse( fs.readFileSync( path.join( build, 'intake', 'intake.json' ), 'utf8' ) );
		const verdict = await cloneSurfaces( {
			client, site, keys, intake, surfaces, allowMissingPaint: allowMissingPaintArg( argv ), allowUnpicked: argv.includes( '--allow-unpicked' ), retry: ! argv.includes( '--no-retry' ), log,
			jobs: Number( flag( '--jobs' ) ?? 1 ),
			run: ( args ) => launch( { repo, client, args } ),
		} );
		return verdict.ok ? 0 : 1;
	} catch ( e ) {
		error( e.message );
		return 2;
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).then( ( code ) => {
		process.exitCode = code;
	} );
}
