// Playwright launch, base-URL resolution and env loading for the functional flows (Spec 47 FR-47-7).
// Nothing here prints a secret: loadEnv returns values to the caller, which only ever uses the site URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO_ROOT = path.resolve( HERE, '..', '..', '..', '..' );
const ENV_FILE = '.claude/secrets/eye-care-test.env';
const ENV_KEY = 'WP_URL_EYECARETEST';

// The repo root, then (inside a git worktree under .claude/worktrees/<name>) the main checkout, because a worktree
// has neither the gitignored secrets nor the node_modules junction.
export function candidateRoots( root = REPO_ROOT ) {
	const norm = root.split( path.sep ).join( '/' );
	const at = norm.indexOf( '/.claude/worktrees/' );
	return at === -1 ? [ root ] : [ root, path.normalize( norm.slice( 0, at ) ) ];
}

// Parses KEY=value lines. Quotes are stripped; blank lines and # comments are skipped.
export function parseEnv( text ) {
	const out = {};
	for ( const line of text.split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/ );
		if ( m ) {
			out[ m[ 1 ] ] = m[ 2 ].replace( /^(['"])(.*)\1$/, '$2' );
		}
	}
	return out;
}

export function loadEnv( roots = candidateRoots() ) {
	for ( const r of roots ) {
		const f = path.join( r, ENV_FILE );
		if ( fs.existsSync( f ) ) {
			return parseEnv( fs.readFileSync( f, 'utf8' ) );
		}
	}
	return {};
}

// Precedence: --base on the command line, SGS_FLOW_BASE_URL, then eye-care-test's URL from its env file.
export function baseUrl( { arg, env = process.env, fileEnv } = {} ) {
	const raw = arg || env.SGS_FLOW_BASE_URL || ( fileEnv ?? loadEnv() )[ ENV_KEY ];
	if ( ! raw ) {
		throw new Error( `No base URL: pass --base <url>, set SGS_FLOW_BASE_URL, or add ${ ENV_KEY } to ${ ENV_FILE }` );
	}
	return raw.replace( /\/+$/, '' );
}

export async function loadPlaywright( roots = candidateRoots() ) {
	for ( const r of roots ) {
		const f = path.join( r, 'plugins', 'sgs-blocks', 'node_modules', 'playwright', 'index.mjs' );
		if ( fs.existsSync( f ) ) {
			return import( pathToFileURL( f ).href );
		}
	}
	throw new Error( 'playwright not found under plugins/sgs-blocks/node_modules in the repo or its main checkout (run npm install there)' );
}

// One browser per flow run; SGS_HEADED=1 shows it (Hostinger's edge can challenge headless bursts).
export async function launch( { headed = process.env.SGS_HEADED === '1' } = {} ) {
	const { chromium } = await loadPlaywright();
	return chromium.launch( { headless: ! headed } );
}

// A fresh context per flow: no cookies, no cart token, so one flow's bag and cooldown never leak into the next.
export async function freshContext( browser, { width = 1440, height = 900 } = {} ) {
	const context = await browser.newContext( { viewport: { width, height } } );
	const page = await context.newPage();
	return { context, page };
}
