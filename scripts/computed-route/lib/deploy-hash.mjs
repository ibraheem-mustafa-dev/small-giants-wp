// The deploy key calibration stamps on a cache: md5 of a block's front-end build files, locally and on the site, so a
// cache is used only while the deployed build is the one it measured.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

const SSH = [ '-i', path.join( process.env.USERPROFILE || process.env.HOME, '.ssh', 'id_ed25519' ), '-p', '65002', '-o', 'ConnectTimeout=20', 'u945238940@141.136.39.73' ];
// Remote plugin roots per site (the deploy script's TARGETS hold the same paths).
export const REMOTE_PLUGIN = {
	'eye-care-test': 'domains/darkcyan-grouse-898606.hostingersite.com/public_html/wp-content/plugins/sgs-blocks',
	sandybrown: 'domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content/plugins/sgs-blocks',
};

export const md5 = ( s ) => crypto.createHash( 'md5' ).update( s ).digest( 'hex' );

// The editor bundles (index.js, index.css, their rtl copy, index.asset.php) are left out of the key: they paint nothing
// on the front end, and the same commit built in another folder (the deploy builds in a temporary worktree) gives a
// different index.js, so a local build could never match. The key covers what a page paints: block.json, render.php,
// the front-end stylesheets and view scripts.
export const EDITOR_ONLY = /^\.\/index(-rtl)?\.(js|css|asset\.php)$/;

// Webpack names each bundled module by a number that depends on the build folder, not the code: the same commit gives
// `var e={2310(){` and `r(2310)` locally and 6469 from the deploy's temporary worktree (proven on trust-bar's view.js,
// 2026-10-03: the two files differ only in that number), and an asset file's version is a hash of its bundle. Both are
// normalised before hashing, so the key follows behaviour, never build order.
export const BUNDLE_TEXT = /^\.\/(view[^/]*\.js|[^/]*\.asset\.php)$/;
export function normaliseBundle( rel, text ) {
	if ( /\.asset\.php$/.test( rel ) ) {
		return text.replace( /'version'\s*=>\s*'[^']*'/g, "'version' => ''" );
	}
	// A module is `NNN(){` or, when it uses exports or require, `NNN(e,t,r){`.
	const ids = [ ...text.matchAll( /[{,](\d+)\([\w$,\s]*\)\{/g ) ].map( ( m ) => m[ 1 ] );
	return ids.reduce( ( t, id, i ) => t.replace( new RegExp( `([{,(])${ id }(?=[(){},])`, 'g' ), `$1M${ i }` ), text );
}

// The deploy builds from a clean checkout of HEAD, so the server's text files always end lines with LF; a local working
// copy may carry CRLF (proven 2026-10-03: language-switch and wishlist-link render.php, CRLF locally, LF in git and on
// sandybrown, byte counts differing by exactly their line counts). The local key reads text files with LF endings.
export const TEXT_FILE = /\.(php|json|css|js|svg|txt|html)$/;
export const lfText = ( buf ) => buf.toString( 'utf8' ).replace( /\r\n/g, '\n' );

// md5 of a build directory's front-end files: each file's md5 (bundles normalised, text files with LF endings) and
// relative path, sorted. The remote side lists the same.
const keyOf = ( lines ) => md5( lines.filter( ( l ) => ! EDITOR_ONLY.test( l.slice( 34 ) ) ).sort( ( a, b ) => a.slice( 34 ).localeCompare( b.slice( 34 ) ) ).join( '\n' ) );
export function localBlockHash( dir ) {
	const lines = [];
	const go = ( d ) => fs.readdirSync( d, { withFileTypes: true } ).forEach( ( f ) => {
		const p = path.join( d, f.name );
		if ( f.isDirectory() ) {
			go( p );
			return;
		}
		const rel = `./${ path.relative( dir, p ).split( path.sep ).join( '/' ) }`;
		const buf = fs.readFileSync( p );
		const text = TEXT_FILE.test( rel ) ? lfText( buf ) : null;
		lines.push( `${ md5( BUNDLE_TEXT.test( rel ) ? normaliseBundle( rel, text ?? buf.toString( 'utf8' ) ) : text ?? buf ) }  ${ rel }` );
	} );
	go( dir );
	return keyOf( lines );
}

export function remoteBlockHash( site, short ) {
	const dir = `${ REMOTE_PLUGIN[ site ] }/build/blocks/${ short }`;
	const listed = execFileSync( 'ssh', [ ...SSH, `cd ${ dir } && find . -type f -exec md5sum {} +` ], { encoding: 'utf8', timeout: 60000 } ).trim().split( '\n' ).map( ( l ) => l.trim() );
	const lines = listed.filter( ( l ) => ! BUNDLE_TEXT.test( l.slice( 34 ) ) );
	for ( const rel of listed.map( ( l ) => l.slice( 34 ) ).filter( ( r ) => BUNDLE_TEXT.test( r ) && ! EDITOR_ONLY.test( r ) ) ) {
		const text = execFileSync( 'ssh', [ ...SSH, `cat ${ dir }/${ rel.slice( 2 ) }` ], { encoding: 'utf8', timeout: 60000 } );
		lines.push( `${ md5( normaliseBundle( rel, text ) ) }  ${ rel }` );
	}
	return keyOf( lines );
}

