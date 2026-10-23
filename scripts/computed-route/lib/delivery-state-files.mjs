// Whether the commit a done `state:<surface>:<name>` key names changed that surface. A surface's files come from the data:
// the build entries in sites/<client>/build/surfaces.json whose intake skeleton (`intakeSurface`, keyed in
// build/intake/intake.json `skeletons`) carries the handoff surface id, each entry's tree, walker and full walker config.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { REPO } from './capabilities.mjs';

const surfaceOf = ( key ) => /^state:([^:]+):/.exec( String( key ) )?.[ 1 ] ?? null;

// { files, why }: the repo paths of one handoff surface's build files, and the reason when there are none.
export function surfaceFiles( client, surfaceId, root = REPO ) {
	const build = path.join( root, 'sites', client, 'build' );
	const read = ( f ) => ( fs.existsSync( path.join( build, f ) ) ? JSON.parse( fs.readFileSync( path.join( build, f ), 'utf8' ) ) : null );
	const [ surfaces, intake ] = [ read( 'surfaces.json' ), read( path.join( 'intake', 'intake.json' ) ) ];
	if ( ! surfaces || ! intake ) {
		return { files: [], why: `sites/${ client }/build/${ surfaces ? 'intake/intake.json' : 'surfaces.json' } is missing, so the surface's files are unknown` };
	}
	const entries = Object.values( surfaces ).filter( ( e ) => e && null != surfaceId && intake.skeletons?.[ e.intakeSurface ]?.id === surfaceId );
	const files = entries.flatMap( ( e ) => [ e.tree, e.walker, e.walkerFull ] ).filter( ( f ) => 'string' === typeof f && f ).map( ( f ) => `sites/${ client }/build/${ f }` );
	return { files: [ ...new Set( files ) ], why: files.length ? '' : `no build entry in sites/${ client }/build/surfaces.json is the surface ${ surfaceId } (no tree or walker config to change)` };
}

// The repo paths a commit changed (a merge's against each parent); empty when the commit is unknown.
export function commitFiles( hash, root = REPO ) {
	const r = spawnSync( 'git', [ 'diff-tree', '--no-commit-id', '--name-only', '-r', '-m', '--root', hash ], { cwd: root, encoding: 'utf8' } );
	return 0 === r.status ? r.stdout.split( '\n' ).map( ( l ) => l.trim() ).filter( Boolean ) : [];
}

// { ok, why } for a done state key's commit: it changed at least one of the surface's files. `filesOf( surfaceId )` ->
// { files, why } (surfaceFiles), `changedIn( commit )` -> [paths] (commitFiles).
export function stateCommitEvidence( key, commit, { filesOf, changedIn } ) {
	const surface = surfaceOf( key );
	const { files, why } = filesOf( surface );
	if ( ! files.length ) {
		return { ok: false, why };
	}
	const changed = new Set( changedIn( commit ) );
	const hit = files.filter( ( f ) => changed.has( f ) );
	return hit.length ? { ok: true, why: `commit ${ commit } changed ${ hit.join( ', ' ) }` } : { ok: false, why: `commit ${ commit } changed none of the ${ surface } surface's files (${ files.join( ', ' ) })` };
}
