#!/usr/bin/env node
// Sets a local mirror's WordPress login to the password its secrets file holds, after refresh-from-remote.sh has copied the
// test site's users over it:
//   node scripts/local-wp/reset-login.mjs <mirror, e.g. local-eye-care>
// The mirror's secrets file and key come from scripts/computed-route/calibration-targets.json. The password is read the way
// every route script reads it (scripts/computed-route/lib/wp-run-session.mjs::readEnv: trimmed, one pair of surrounding
// quotes removed), handed to WordPress on stdin and set with wp_set_password (no slashing), so it is never printed and a
// quoted value reaches WordPress exactly as the scripts send it. Exit 0 set and checked, 1 failure, 2 usage.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readEnv } from '../computed-route/lib/wp-run-session.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..' );
const mirror = process.argv[ 2 ];
const targets = JSON.parse( fs.readFileSync( path.join( REPO, 'scripts', 'computed-route', 'calibration-targets.json' ), 'utf8' ) );
const target = targets[ mirror ];
if ( ! mirror || ! target?.pluginDir?.startsWith( '//wsl.localhost/' ) ) {
	console.error( 'Usage: node scripts/local-wp/reset-login.mjs <mirror>; the name must be a local mirror in calibration-targets.json' );
	process.exit( 2 );
}
const root = target.pluginDir.replace( /^\/\/wsl\.localhost\/Ubuntu/, '' ).replace( /\/wp-content\/.*$/, '' );
const env = readEnv( target.envFile, target.envKey, REPO );
// Runs as PHP inside the mirror: the password arrives on stdin, the user by login name.
const php = `<?php
$p = stream_get_contents( STDIN );
$u = get_user_by( 'login', ${ JSON.stringify( env.user ) } );
if ( ! $u ) { echo "no-user\\n"; return; }
wp_set_password( $p, $u->ID );
echo wp_check_password( $p, get_userdata( $u->ID )->user_pass, $u->ID ) ? "set-ok\\n" : "set-no\\n";
`;
const file = path.join( REPO, 'scripts', 'local-wp', '.reset-login.php' );
fs.writeFileSync( file, php );
try {
	const wslFile = `/mnt/${ file[ 0 ].toLowerCase() }${ file.slice( 2 ).replace( /\\/g, '/' ) }`;
	const out = execFileSync( 'wsl', [ '-d', 'Ubuntu', '-u', 'root', '--', 'wp', '--allow-root', `--path=${ root }`, 'eval-file', wslFile ], { input: env.pwd, encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } } ).trim();
	console.log( `${ mirror }: ${ 'set-ok' === out ? `login for ${ env.user } set and checked` : `not set (${ out })` }` );
	process.exit( 'set-ok' === out ? 0 : 1 );
} catch ( e ) {
	console.error( `${ mirror }: ${ String( e.stderr || e.message ).trim().slice( -300 ) }` );
	process.exit( 1 );
} finally {
	fs.rmSync( file, { force: true } );
}
