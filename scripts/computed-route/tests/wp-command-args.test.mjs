// lib/calibration-refs.mjs::wpCommand hands every argument to wp verbatim on both transports. A WSL mirror's call runs wp
// with `wsl --exec` (no Linux shell between wsl and wp), so '#', a space, '$HOME' and a quote arrive unchanged; the SSH
// call already quotes each argument for the remote shell. Every call here goes to a fake runner: nothing contacts a site.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { wpCommand } from '../lib/calibration-refs.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const MIRROR = { pluginDir: '//wsl.localhost/Ubuntu/var/www/local-x/wp-content/plugins/sgs-blocks' };
// The argument list of a custom menu item with a '#' link, followed by words a shell would split, expand or unquote.
const ARGS = [ 'menu', 'item', 'add-custom', '29', 'Glasses', '#', '--position=3', '--description=SOON', 'a b', '$HOME', "it's", 'x"y' ];

// Runs `fn` with SGS_NO_SITE removed (the test runner sets it; the fake runner is what keeps the site out of reach).
async function siteSwitchOff( fn ) {
	const was = process.env.SGS_NO_SITE;
	delete process.env.SGS_NO_SITE;
	try {
		return await fn();
	} finally {
		undefined === was ? delete process.env.SGS_NO_SITE : ( process.env.SGS_NO_SITE = was );
	}
}

const built = ( target, site ) => {
	const calls = [];
	wpCommand( target, site, REPO, { exec: ( cmd, argv ) => ( calls.push( { cmd, argv } ), '' ) } )( ARGS );
	return calls[ 0 ];
};

test( 'MUST FAIL: a WSL mirror runs wp through wsl --exec, so no Linux shell reads the arguments', async () => {
	const { cmd, argv } = await siteSwitchOff( () => built( MIRROR, 'local-x' ) );
	assert.equal( cmd, 'wsl' );
	const wp = argv.indexOf( 'wp' );
	assert.equal( argv[ wp - 1 ], '--exec', 'wp follows --exec: `wsl --` runs the line through the default shell, where # starts a comment' );
	assert.ok( ! argv.slice( 0, wp ).includes( '--' ), 'no shell separator before wp' );
	assert.deepEqual( argv.slice( 0, wp - 1 ), [ '-d', 'Ubuntu', '-u', 'root' ] );
} );

test( 'MUST FAIL: every argument, # and the shell words included, reaches wp unchanged and in order', async () => {
	const { argv } = await siteSwitchOff( () => built( MIRROR, 'local-x' ) );
	const wp = argv.indexOf( 'wp' );
	assert.equal( argv[ wp - 1 ], '--exec' );
	assert.deepEqual( argv.slice( wp + 1 ), [ '--path=/var/www/local-x', '--allow-root', ...ARGS, '--user=Claude' ] );
} );

test( 'negative control: an SSH site still quotes each argument for the remote shell', async () => {
	const { cmd, argv } = await siteSwitchOff( () => built( {}, 'sandybrown' ) );
	assert.equal( cmd, 'ssh' );
	const line = argv.at( -1 );
	assert.match( line, / && wp 'menu' 'item' 'add-custom' '29' 'Glasses' '#' '--position=3' '--description=SOON' 'a b' '\$HOME' 'it'\\''s' 'x"y' --user=Claude$/ );
} );
