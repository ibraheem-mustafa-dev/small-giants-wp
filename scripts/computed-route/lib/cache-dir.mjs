// Where the route's calibration cache lives (Spec 48 §3.2): slot maps, default paints, locks, build trees and the logged-in
// browser profiles. One resolver for every reader and writer; nothing else spells the cache path.
// Precedence: (1) the environment variable SGS_ROUTE_CACHE when non-empty; (2) the first non-empty line of
// scripts/computed-route/cache-dir.local (gitignored; it reaches sessions an environment variable set later cannot);
// (3) scripts/computed-route/cache beside the route. The answer is an absolute path; nothing is created here.
// A `repo` other than this checkout (a test's temporary repo) has its own cache folder and ignores both overrides.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const CACHE_ENV = 'SGS_ROUTE_CACHE';
export const CACHE_DIR_FILE = 'cache-dir.local';
const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const THIS_REPO = path.resolve( ROUTE, '..', '..' );

// The first non-empty line of the one-line override file (a BOM and CR removed), or null.
export function readCacheDirFile( file ) {
	if ( ! fs.existsSync( file ) ) {
		return null;
	}
	const line = fs.readFileSync( file, 'utf8' ).replace( /^﻿/, '' ).split( /\r?\n/ ).map( ( l ) => l.trim() ).find( Boolean );
	return line || null;
}

export function routeCacheDir( repo = THIS_REPO, env = process.env ) {
	const root = path.resolve( repo );
	const route = path.join( root, 'scripts', 'computed-route' );
	if ( path.resolve( root ).toLowerCase() === THIS_REPO.toLowerCase() ) {
		const fromEnv = String( env[ CACHE_ENV ] ?? '' ).trim();
		const chosen = fromEnv || readCacheDirFile( path.join( route, CACHE_DIR_FILE ) );
		if ( chosen ) {
			return path.resolve( chosen );
		}
	}
	return path.join( route, 'cache' );
}
