// The sgs-blocks build on a local mirror against the build on a test site, before a mirror's database is pushed
// (critique council 2026-10-29, finding 6): a push copies the database and uploads only, so a clone built with blocks the
// test site does not have would land on a plugin that cannot render them. The comparison covers the front-end files of
// every block under build/blocks, keyed as the deploy key is (lib/deploy-hash.mjs: editor bundles left out, view scripts
// and asset files normalised, text files read with LF endings).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { BUNDLE_TEXT, EDITOR_ONLY, SSH, TEXT_FILE, lfText, md5, normaliseBundle, remotePlugin } from './deploy-hash.mjs';

// Whether a build file counts: bundled module ids vary with the build folder, so view scripts and asset files are compared
// by name only; editor bundles are not compared at all.
export const counted = ( rel ) => ! EDITOR_ONLY.test( rel );

// { './<block>/<file>': md5 } for the files under `dir` (a build/blocks folder), as the deploy key reads them.
export function localFiles( dir ) {
	const out = {};
	const go = ( d ) => fs.readdirSync( d, { withFileTypes: true } ).forEach( ( f ) => {
		const p = path.join( d, f.name );
		if ( f.isDirectory() ) {
			return go( p );
		}
		const rel = `./${ path.relative( dir, p ).split( path.sep ).join( '/' ) }`;
		if ( ! counted( rel.replace( /^\.\/[^/]+/, '.' ) ) ) {
			return;
		}
		const buf = fs.readFileSync( p );
		const text = TEXT_FILE.test( rel ) ? lfText( buf ) : null;
		out[ rel ] = BUNDLE_TEXT.test( rel.replace( /^\.\/[^/]+/, '.' ) ) ? md5( normaliseBundle( rel.replace( /^\.\/[^/]+/, '.' ), text ?? buf.toString( 'utf8' ) ) ) : md5( text ?? buf );
	} );
	go( dir );
	return out;
}

// The same map for the test site's build/blocks folder, read with one ssh `find ... md5sum` (bundled files are compared by
// their name only: their ids differ by build folder and fetching each would cost an ssh call per block).
export function remoteFiles( site, run = ( cmd, args ) => execFileSync( cmd, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 } ) ) {
	const dir = `${ remotePlugin( site ) }/build/blocks`;
	const text = run( 'ssh', [ ...SSH, `cd ${ dir } && find . -type f -exec md5sum {} +` ] );
	return parseListing( text );
}

// `md5sum` lines ("<32 hex>  ./block/file") as { './block/file': md5 }.
export function parseListing( text ) {
	const out = {};
	for ( const l of String( text ).split( /\r?\n/ ) ) {
		const m = /^([0-9a-f]{32})\s+(\.\/.+)$/.exec( l.trim() );
		if ( m && counted( m[ 2 ].replace( /^\.\/[^/]+/, '.' ) ) ) {
			out[ m[ 2 ] ] = m[ 1 ];
		}
	}
	return out;
}

// Whether a file is compared by content: bundled view scripts and asset files are not (build-folder module ids), the rest are.
const byContent = ( rel ) => ! BUNDLE_TEXT.test( rel.replace( /^\.\/[^/]+/, '.' ) );

// The differences between a local and a remote map: files only the mirror has, files only the test site has, and files
// whose content differs (bundled files are compared by presence only).
export function compareBuilds( local, remote ) {
	const missing = Object.keys( local ).filter( ( k ) => ! ( k in remote ) ).sort();
	const extra = Object.keys( remote ).filter( ( k ) => ! ( k in local ) ).sort();
	const differ = Object.keys( local ).filter( ( k ) => k in remote && byContent( k ) && local[ k ] !== remote[ k ] ).sort();
	return { missing, extra, differ, same: ! missing.length && ! extra.length && ! differ.length };
}

// The text a refusal prints: the blocks that differ (first folder of each file) and the fix.
export function refusal( diff, target ) {
	const blocks = ( list ) => [ ...new Set( list.map( ( k ) => k.split( '/' )[ 1 ] ) ) ].sort();
	const parts = [
		[ 'differ', diff.differ ], [ 'only on the mirror', diff.missing ], [ 'only on the test site', diff.extra ],
	].filter( ( [ , l ] ) => l.length ).map( ( [ why, l ] ) => `${ why }: ${ blocks( l ).slice( 0, 12 ).join( ', ' ) }${ blocks( l ).length > 12 ? ', ...' : '' }` );
	return `the sgs-blocks build on the mirror is not the build on ${ target } (${ parts.join( '; ' ) }). Deploy the build first: python plugins/sgs-blocks/scripts/build-deploy.py --target ${ target }`;
}
