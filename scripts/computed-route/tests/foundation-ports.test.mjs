// Proves the parts of the foundation command's real ports (lib/foundation-ports.mjs) that can be proved without a site: under SGS_NO_SITE (which the
// route's test script sets) the command runner and the REST check refuse before a process or a request starts, so a test or a mutation run that reached them
// by mistake touches nothing; the plugin build's state (missing, current, older than its sources), the built blocks compared with a site's copy, the folder that
// holds the gitignored intake files, the newest modification time of a folder and the free-space read.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { newestMtime, realPorts, resolveCommand, restProbe } from '../lib/foundation-ports.mjs';

const made = [];
after( () => made.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );
const tmp = () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'foundation-ports-' ) );
	made.push( d );
	return d;
};
const put = ( file, text, when = null ) => {
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, text );
	when && fs.utimesSync( file, when, when );
};

test( 'MUST FAIL: with the kill switch on, running a command and the REST check refuse before a process or a request starts', async () => {
	assert.ok( process.env.SGS_NO_SITE, 'the route\'s test script sets SGS_NO_SITE' );
	const repo = tmp();
	const ports = realPorts( { repo, client: 'acme', site: 'local-mediatest-acme', target: {}, logDir: path.join( repo, 'logs' ) } );
	const marker = path.join( repo, 'ran.txt' );
	await assert.rejects( ports.exec( 'x', process.execPath, [ '-e', `require('fs').writeFileSync(${ JSON.stringify( marker ) }, 'ran')` ] ), /SGS_NO_SITE|may not contact a site/i );
	assert.equal( fs.existsSync( marker ), false, 'the command never started' );
	await assert.rejects( ports.restCheck( { url: 'http://localhost:1', auth: 'Basic x' } ), /SGS_NO_SITE|may not contact a site/i );
} );

test( 'MUST FAIL: a protected target refuses a command even without the kill switch', async () => {
	const repo = tmp();
	const ports = realPorts( { repo, client: 'acme', site: 'acme-live', target: { protected: 'the live shop' }, logDir: path.join( repo, 'logs' ), env: {} } );
	const saved = process.env.SGS_NO_SITE;
	delete process.env.SGS_NO_SITE;
	try {
		await assert.rejects( ports.exec( 'x', process.execPath, [ '-e', '1' ] ), /acme-live is protected/ );
	} finally {
		process.env.SGS_NO_SITE = saved;
	}
} );

test( 'MUST FAIL: the plugin build is missing, current, or older than its block sources', () => {
	const repo = tmp();
	const ports = realPorts( { repo, client: 'acme', site: 's', target: {}, logDir: path.join( repo, 'logs' ) } );
	assert.deepEqual( ports.buildState(), { present: false, stale: false } );
	const old = new Date( Date.now() - 3600_000 );
	const now = new Date();
	put( path.join( repo, 'plugins', 'sgs-blocks', 'build', 'blocks', 'hero', 'block.json' ), '{}', old );
	put( path.join( repo, 'plugins', 'sgs-blocks', 'src', 'blocks', 'hero', 'edit.js' ), 'x', new Date( old.getTime() - 1000 ) );
	assert.deepEqual( ports.buildState(), { present: true, stale: false }, 'a build newer than its sources is current' );
	put( path.join( repo, 'plugins', 'sgs-blocks', 'src', 'blocks', 'hero', 'edit.js' ), 'y', now );
	assert.deepEqual( ports.buildState(), { present: true, stale: true }, 'a source newer than the build makes it stale' );
} );

test( 'MUST FAIL: the built blocks differ from a site\'s copy when one is missing or changed, and are equal when every block matches', async () => {
	const repo = tmp();
	const site = tmp();
	const block = ( root, name, text ) => put( path.join( root, 'build', 'blocks', name, 'block.json' ), text );
	[ [ 'hero', '{"a":1}' ], [ 'gallery', '{"b":2}' ] ].forEach( ( [ n, t ] ) => block( path.join( repo, 'plugins', 'sgs-blocks' ), n, t ) );
	const ports = realPorts( { repo, client: 'acme', site: 's', target: { pluginDir: site }, logDir: path.join( repo, 'logs' ) } );
	assert.deepEqual( await ports.buildsDiffer(), { differs: true, detail: '2 of 2 blocks differ (gallery, hero)' } );
	block( site, 'hero', '{"a":1}' );
	block( site, 'gallery', '{"b":999}' );
	assert.equal( ( await ports.buildsDiffer() ).detail, '1 of 2 blocks differ (gallery)' );
	block( site, 'gallery', '{"b":2}' );
	assert.deepEqual( await ports.buildsDiffer(), { differs: false, detail: '0 of 2 blocks differ' } );
	const a = await ports.buildDigest();
	block( path.join( repo, 'plugins', 'sgs-blocks' ), 'gallery', '{"b":3}' );
	assert.notEqual( await ports.buildDigest(), a, 'a changed block changes the digest' );
	const empty = realPorts( { repo: tmp(), client: 'acme', site: 's', target: { pluginDir: site }, logDir: path.join( repo, 'l2' ) } );
	assert.equal( ( await empty.buildsDiffer() ).differs, true, 'negative control: a checkout with no build differs from any site' );
} );

test( 'MUST FAIL: the sync digest changes with any part the sync copies that the site runs, and not with the theme.json the sync writes', async () => {
	const repo = tmp();
	const plugin = path.join( repo, 'plugins', 'sgs-blocks' );
	const theme = path.join( repo, 'theme', 'sgs-theme' );
	put( path.join( plugin, 'build', 'blocks', 'hero', 'block.json' ), '{}' );
	put( path.join( plugin, 'build', 'extensions', 'index.js' ), 'a' );
	put( path.join( plugin, 'includes', 'x.php' ), '<?php' );
	put( path.join( plugin, 'sgs-blocks.php' ), '<?php' );
	put( path.join( theme, 'functions.php' ), '<?php' );
	put( path.join( theme, 'theme.json' ), '{}' );
	const ports = realPorts( { repo, client: 'acme', site: 's', target: { pluginDir: tmp() }, logDir: path.join( repo, 'logs' ) } );
	let last = await ports.syncDigest();
	const changes = ( why ) => {
		const now = ports.syncDigest();
		return now.then( ( d ) => {
			assert.notEqual( d, last, why );
			last = d;
		} );
	};
	put( path.join( plugin, 'build', 'extensions', 'index.js' ), 'b' );
	await changes( 'an editor extension beside build/blocks' );
	put( path.join( plugin, 'includes', 'x.php' ), '<?php //' );
	await changes( 'the plugin PHP' );
	put( path.join( plugin, 'sgs-blocks.php' ), '<?php //' );
	await changes( 'the plugin main file' );
	put( path.join( theme, 'functions.php' ), '<?php //' );
	await changes( 'a theme file' );
	put( path.join( plugin, 'build', 'blocks', 'hero', 'block.json' ), '{"x":1}' );
	await changes( 'a built block' );
	// negative controls
	put( path.join( theme, 'theme.json' ), '{"y":1}' );
	assert.equal( await ports.syncDigest(), last, 'the theme.json the sync replaces with the snapshot is left out' );
	put( path.join( plugin, 'scripts', 'tool.py' ), 'x' );
	put( path.join( plugin, 'src', 'blocks', 'hero', 'edit.js' ), 'x' );
	assert.equal( await ports.syncDigest(), last, 'sources and scripts the site never runs are left out' );
} );

test( 'the gitignored intake files come from SGS_INTAKE_SOURCE when it is set; the newest modification time and free space are read from the folder', () => {
	const repo = tmp();
	const ports = realPorts( { repo, client: 'acme', site: 's', target: {}, logDir: path.join( repo, 'logs' ), env: { SGS_INTAKE_SOURCE: 'X:/main' } } );
	assert.equal( ports.sourceCheckout(), 'X:/main' );
	const dir = tmp();
	assert.equal( newestMtime( dir ), 0 );
	put( path.join( dir, 'a', 'b.txt' ), 'x', new Date( 2020, 0, 1 ) );
	put( path.join( dir, 'c.txt' ), 'y', new Date( 2022, 0, 1 ) );
	put( path.join( dir, 'd.txt' ), 'z', new Date( 2019, 0, 1 ) );
	assert.equal( newestMtime( dir ), new Date( 2022, 0, 1 ).getTime() );
	assert.ok( ports.freeBytes( dir ) > 0 );
} );

test( 'MUST FAIL: a step\'s powershell runs as pwsh, or Windows PowerShell\'s own file, when PATH has no powershell (spawn powershell ENOENT)', () => {
	const PS7 = path.join( os.tmpdir(), 'ps7' );
	const files = ( ...list ) => ( f ) => list.includes( f );
	const only7 = { env: { PATH: PS7 }, platform: 'win32', exists: files( path.join( PS7, 'pwsh.exe' ) ) };
	assert.equal( resolveCommand( 'powershell', only7 ), 'pwsh', 'PowerShell 7 alone on PATH' );
	const full = resolveCommand( 'powershell', { env: { PATH: '' }, platform: 'win32', exists: () => true } );
	assert.equal( resolveCommand( 'powershell', { env: { PATH: os.tmpdir() }, platform: 'win32', exists: files( full ) } ), full, 'neither on PATH: the Windows PowerShell file' );
	// negative controls
	assert.equal( resolveCommand( 'powershell', { env: { PATH: PS7 }, platform: 'win32', exists: files( path.join( PS7, 'powershell.exe' ), path.join( PS7, 'pwsh.exe' ) ) } ), 'powershell', 'powershell on PATH keeps its name' );
	assert.equal( resolveCommand( 'node', only7 ), 'node', 'another command is unchanged' );
	assert.equal( resolveCommand( 'powershell', { ...only7, platform: 'linux' } ), 'powershell', 'only Windows swaps it' );
} );

test( 'MUST FAIL: a REST read with no answer is made once more with a longer wait; a refusal is not retried', async () => {
	const seen = [];
	const slow = async () => {
		seen.push( 'try' );
		if ( 1 === seen.length ) {
			throw new Error( 'timed out' );
		}
		return { status: 200 };
	};
	const r = await restProbe( { creds: { url: 'http://x', auth: 'a' }, fetchImpl: slow } );
	assert.deepEqual( [ r.ok, seen.length ], [ true, 2 ], 'the second attempt answers' );
	const refused = [];
	const r2 = await restProbe( { creds: { url: 'http://x', auth: 'a' }, fetchImpl: async () => ( refused.push( 1 ), { status: 401 } ) } );
	assert.deepEqual( [ r2.ok, refused.length, r2.detail ], [ false, 1, 'users/me answered 401' ], 'a 401 stands at once' );
	const none = await restProbe( { creds: { url: 'http://x', auth: 'a' }, fetchImpl: async () => { throw new Error( 'down' ); } } );
	assert.equal( none.ok, false );
	assert.match( none.detail, /no answer within 60s: down/ );
} );
