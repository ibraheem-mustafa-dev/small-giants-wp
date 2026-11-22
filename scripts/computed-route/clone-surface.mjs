#!/usr/bin/env node
// The surface command: one or more surfaces of a client cloned onto a site through every stage, passing only when every stage ran.
//   node scripts/computed-route/clone-surface.mjs <client> --surface a,b --site <target>
//        [--allow-missing-paint sgs/a,sgs/b] [--allow-unpicked] [--no-retry] [--jobs 1]
// It checks each surface's finaliser picks (lib/clone-surface.mjs::finaliserVerdict; a surface whose draft record matched with no intake
// skeleton, the manifest's noIntake, stops there instead of passing as a copy), runs site-run.mjs for the surfaces with every stage
// (inventory, propose, fill, build, apply, walk) and --strict, retries a build that timed out once with --stages build,apply,walk, and prints
// one line per surface and stage: `ok`, `skip` or `FAIL` with its reason and, for a failure, the stage log. A template copy a page sits in is
// run with the page (never --no-copies). A run that includes the page map's account row first sets the registration options its draft's register
// form needs (accountStep: a register form turns registration on and password generation off), so the walk sees the register card. Exit 0 when every stage ran and passed; 1 otherwise (each failure and each stage that did not run
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
import { buildManifest } from './lib/manifest-build.mjs';
import { hasPost, isAccountRow, readPageMap } from './lib/site-build-map.mjs';
import { surfaceKey } from './lib/manifest-build.mjs';
import { runAccountRegistration } from './lib/site-build-account-registration.mjs';
import { wpEvalRunner } from './lib/calibration-refs.mjs';
import { stateRows } from './lib/state-vocab.mjs';
import { openDb } from './lib/db.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const USAGE = 'usage: clone-surface.mjs <client> --surface a,b --site <target> [--allow-missing-paint sgs/a,sgs/b] [--allow-unpicked] [--no-retry] [--jobs 1]';

// The manifest's noIntake rows for `keys` (lib/manifest-build.mjs::buildManifest, as manifest.mjs builds it without --apply): each
// surface whose draft record intake holds no skeleton for, which lib/clone-surface.mjs::finaliserVerdict stops on.
export function noIntakeOf( { repo, client, site, keys, surfaces, intake, targets } ) {
	const dir = path.join( repo, 'sites', client );
	const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const facts = path.join( dir, 'build', 'intake', 'facts.json' );
	return buildManifest( {
		client,
		site,
		rows: readPageMap( path.join( dir, 'build', 'page-map.json' ) ),
		only: keys,
		records: readJson( path.join( dir, 'handoff', 'surfaces.json' ) ).records,
		intake,
		facts: fs.existsSync( facts ) ? readJson( facts ) : null,
		target: targets[ site ],
		entryFiles: readJson( path.join( dir, 'handoff', 'MANIFEST.json' ) ).entry_drafts || [],
		vocab: stateRows( openDb() ),
		existing: surfaces,
	} ).noIntake;
}

// The account step for `keys` (lib/site-build-account-registration.mjs::runAccountRegistration, applied): when one of them is the page map's
// account row, the registration options its draft's register form needs are set on `site` before the run. Resolves { ok, detail } or null when no
// account surface is among `keys`. `runPhp` is the site's PHP runner.
export function accountStep( { repo, client, keys, runPhp } ) {
	const rows = readPageMap( path.join( repo, 'sites', client, 'build', 'page-map.json' ) );
	if ( ! rows.some( ( r ) => hasPost( r ) && isAccountRow( r ) && keys.includes( surfaceKey( r ) ) ) ) {
		return null;
	}
	const said = [];
	const code = runAccountRegistration( { rows, repo, client, runPhp, apply: true, log: ( l ) => said.push( l ), error: ( l ) => said.push( l ) } );
	return { ok: 0 === code, detail: said.filter( ( l ) => /^account registration:|^FAILED/.test( l ) ).join( '; ' ) || 'nothing to do' };
}

export async function main( argv, { launch = launchSiteRun, repo = REPO, log = console.log, error = console.error, gaps = noIntakeOf, account = accountStep } = {} ) {
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
			client, site, keys, intake, surfaces, noIntake: gaps( { repo, client, site, keys, surfaces, intake, targets } ), prepare: ( { keys: asked } ) => account( { repo, client, keys: asked, runPhp: wpEvalRunner( targets[ site ], site, repo, { readOnly: false } ) } ), allowMissingPaint: allowMissingPaintArg( argv ), allowUnpicked: argv.includes( '--allow-unpicked' ), retry: ! argv.includes( '--no-retry' ), log,
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
