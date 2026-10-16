// Spec 38A (Bean, 2026-10-15): a block's default entrance lives in the inserter-default channels (the "Save as Default"
// variation, the SGS patterns), never in block.json, so a person's inserted block gets it and a clone built from a
// draft's block tree never does. This proves the second half on a live editor: with a "Save as Default" entrance stored
// for sgs/card-grid, `scripts/wp-build-page.js` builds a no-motion tree whose saved card grid has no `sgsMotion`, while
// in the same editor the inserter's default variation does carry the entrance (the control: the channel is live, so the
// build's absence is not vacuous). The stored defaults are put back and the draft page deleted in `finally`.
//
// Live: needs .claude/secrets/sandybrown.env (skipped without it) and the canary's serial-queue slot (it changes
// `sgs_block_defaults` for the length of the run).
//   node --test scripts/computed-route/tests/wp-build-page-inserter-defaults.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire( import.meta.url );
const ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const ENV_FILE = path.join( ROOT, '.claude', 'secrets', 'sandybrown.env' );
const BLOCK = 'sgs/card-grid';
const ENTRANCE = { v: 1, elements: { root: { entrance: { base: { preset: 'entrance-fade-up', trigger: 'scroll' } } } } };

function readEnv( file ) {
	const env = {};
	for ( const line of fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/ );
		if ( m ) {
			env[ m[ 1 ] ] = m[ 2 ].replace( /^(['"])(.*)\1$/, '$2' );
		}
	}
	return env;
}

test( 'wp-build-page.js never picks up an inserter default entrance', { skip: ! fs.existsSync( ENV_FILE ) && 'no sandybrown secrets', timeout: 300000 }, async () => {
	const env = readEnv( ENV_FILE );
	const url = env.WP_URL_SANDYBROWN.replace( /\/$/, '' );
	const auth = 'Basic ' + Buffer.from( `${ env.WP_USER_SANDYBROWN }:${ env.WP_APP_PWD_SANDYBROWN }` ).toString( 'base64' );
	const rest = async ( route, method = 'GET', body ) => {
		const res = await fetch( `${ url }/wp-json${ route }`, {
			method,
			headers: { Authorization: auth, 'Content-Type': 'application/json' },
			body: body ? JSON.stringify( body ) : undefined,
		} );
		const text = await res.text();
		assert.ok( res.ok, `${ method } ${ route } answered ${ res.status }: ${ text.slice( 0, 200 ) }` );
		return JSON.parse( text );
	};

	const before = await rest( '/sgs-blocks/v1/defaults' );
	const had = Object.prototype.hasOwnProperty.call( before, BLOCK ) ? before[ BLOCK ] : null;
	let postId = null;
	const treeFile = path.join( os.tmpdir(), `sgs-inserter-defaults-${ process.pid }.json` );
	try {
		await rest( '/sgs-blocks/v1/defaults', 'POST', { block: BLOCK, attributes: { ...( had || {} ), sgsMotion: ENTRANCE } } );

		// The build: a tree that asks for no motion.
		fs.writeFileSync( treeFile, JSON.stringify( [ { name: BLOCK, attributes: {} } ] ) );
		const out = execFileSync( process.execPath, [ path.join( ROOT, 'scripts', 'wp-build-page.js' ), '--env-file', ENV_FILE, '--env-key', 'SANDYBROWN', '--tree', treeFile, '--create', 'page', '--title', '[TEST] inserter defaults', '--status', 'draft' ], { encoding: 'utf8', timeout: 240000 } );
		const result = JSON.parse( out.trim().split( /\r?\n/ ).pop() );
		postId = result.id;
		assert.ok( result.ok && postId, `the build saved: ${ out.slice( -300 ) }` );
		const saved = await rest( `/wp/v2/pages/${ postId }?context=edit` );
		const raw = saved.content.raw;
		assert.match( raw, /<!-- wp:sgs\/card-grid/, 'the saved page holds the card grid' );
		assert.doesNotMatch( raw, /sgsMotion/, 'the built card grid carries no sgsMotion: the inserter default never reached it' );

		// The control, in the same editor: the inserter's default variation carries the stored entrance; createBlock
		// (what the build calls) does not.
		const { chromium } = createRequire( path.join( ROOT, 'plugins', 'sgs-blocks', 'package.json' ) )( 'playwright' );
		const { ensureLoggedIn } = require( '../../lib/wp-session.js' );
		const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED } );
		try {
			const page = await ( await browser.newContext( { ignoreHTTPSErrors: true } ) ).newPage();
			await ensureLoggedIn( page, { url, user: env.WP_USER_SANDYBROWN, pwd: env.WP_PWD_SANDYBROWN } );
			await page.goto( `${ url }/wp-admin/post.php?post=${ postId }&action=edit`, { waitUntil: 'domcontentloaded', timeout: 90000 } );
			await page.waitForFunction( ( name ) => !! window.wp?.blocks?.getBlockType?.( name ), BLOCK, { timeout: 90000 } );
			const seen = await page.evaluate( ( name ) => {
				const variation = window.wp.blocks.getBlockVariations( name, 'inserter' ).find( ( v ) => v.isDefault );
				return {
					inserter: !! variation?.attributes?.sgsMotion,
					created: !! window.wp.blocks.createBlock( name, {} ).attributes.sgsMotion,
				};
			}, BLOCK );
			assert.equal( seen.inserter, true, 'CONTROL: the inserter default variation carries the stored entrance' );
			assert.equal( seen.created, false, 'createBlock with the tree attributes carries none' );
		} finally {
			await browser.close();
		}
	} finally {
		fs.rmSync( treeFile, { force: true } );
		if ( had ) {
			await rest( '/sgs-blocks/v1/defaults', 'POST', { block: BLOCK, attributes: had } );
		} else {
			await rest( '/sgs-blocks/v1/defaults', 'DELETE', { block: BLOCK } );
		}
		if ( postId ) {
			await rest( `/wp/v2/pages/${ postId }?force=true`, 'DELETE' );
		}
		const after = await rest( '/sgs-blocks/v1/defaults' );
		assert.deepEqual( after[ BLOCK ] ?? null, had, 'the stored defaults are back as they were' );
	}
} );
