#!/usr/bin/env node
// Copies a client's built surfaces from its local mirror to the test site it mirrors (lib/content-sync.mjs):
//   node scripts/computed-route/content-sync.mjs <client> --from <mirror> --to <site> [--only a,b] [--apply]
// <mirror> must be a calibration target whose `mirrorOf` is <site> (scripts/computed-route/calibration-targets.json). The
// posts are those `sites/<client>/build/surfaces.json` names (`target.postId`, `target.template`, `target.templatePart`).
// Without --apply it prints what differs and writes nothing; with --apply it writes each differing post, template copy and
// template part copy over `wp eval-file` (SSH for a hosted site, no browser), then reads the target again and fails unless
// every written one matches the mirror.
// Exit 0 done, 1 a problem or a mismatch after writing, 2 usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wpCommand } from './lib/calibration-refs.mjs';
import { readPhp, writePhp, syncTargets, planSync, writtenMismatches } from './lib/content-sync.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..' );
const argv = process.argv.slice( 2 );
const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
const client = argv[ 0 ] && ! argv[ 0 ].startsWith( '--' ) ? argv[ 0 ] : null;
const from = flag( '--from' );
const to = flag( '--to' );
if ( ! client || ! from || ! to ) {
	console.error( 'usage: node scripts/computed-route/content-sync.mjs <client> --from <mirror> --to <site> [--only a,b] [--apply]' );
	process.exit( 2 );
}
const targets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );
if ( targets[ from ]?.mirrorOf !== to ) {
	console.error( `${ from } is not a mirror of ${ to } in calibration-targets.json (mirrorOf: ${ targets[ from ]?.mirrorOf ?? 'none' })` );
	process.exit( 2 );
}
const surfaces = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', client, 'build', 'surfaces.json' ), 'utf8' ) );
const want = syncTargets( surfaces, flag( '--only' )?.split( ',' ) ?? null );
const run = ( site, php ) => wpCommand( targets[ site ] || {}, site, REPO )( [ 'eval-file', '-' ], php );
const read = ( site, withContent ) => JSON.parse( run( site, readPhp( { ...want, withContent } ) ) );

try {
	const plan = planSync( read( from, true ), read( to, false ) );
	const posts = Object.keys( plan.posts );
	const templates = Object.keys( plan.templates );
	const parts = Object.keys( plan.parts );
	console.log( `${ from } -> ${ to }: ${ posts.length } post(s), ${ templates.length } template(s) and ${ parts.length } template part(s) differ, ${ plan.same } already the same` );
	posts.length && console.log( `  posts: ${ posts.join( ', ' ) }` );
	templates.length && console.log( `  templates: ${ templates.join( ', ' ) }` );
	parts.length && console.log( `  template parts: ${ parts.join( ', ' ) }` );
	plan.notBuilt.length && console.log( `  not built yet on either site (skipped): ${ plan.notBuilt.join( ', ' ) }` );
	if ( plan.problems.length ) {
		throw new Error( plan.problems.join( '; ' ) );
	}
	if ( ! argv.includes( '--apply' ) ) {
		console.log( 'dry run: re-run with --apply to write' );
		process.exit( 0 );
	}
	if ( posts.length || templates.length || parts.length ) {
		const out = run( to, writePhp( plan ) );
		const errs = out.split( '\n' ).filter( ( l ) => l.startsWith( 'ERR' ) );
		if ( errs.length || ! out.includes( 'DONE' ) ) {
			throw new Error( `the write failed: ${ errs.join( '; ' ) || out.slice( -300 ) }` );
		}
		run( to, '<?php wp_cache_flush(); echo "ok";' );
	}
	const mirrorAfter = read( from, false );
	const targetAfter = read( to, false );
	const bad = writtenMismatches( plan, mirrorAfter, targetAfter );
	if ( bad.length ) {
		throw new Error( `still differ from the mirror after the write: ${ bad.join( ', ' ) }` );
	}
	const after = planSync( mirrorAfter, targetAfter );
	const left = Object.keys( after.posts ).length + Object.keys( after.templates ).length + Object.keys( after.parts ).length;
	if ( left ) {
		throw new Error( `${ left } still differ after the write` );
	}
	console.log( `synced: every one of ${ after.same } matches the mirror` );
} catch ( e ) {
	console.error( `FAILED: ${ e.message }` );
	process.exit( 1 );
}
