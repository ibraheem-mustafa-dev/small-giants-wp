#!/usr/bin/env node
/**
 * Postbuild: copy style-index.css to style.css per block.
 *
 * @wordpress/scripts emits the compiled per-block frontend stylesheet as
 * `style-index.css`, but block.json's `"style": "file:./style.css"` manifest
 * tells WordPress to look for `style.css` literally. On WordPress versions
 * that do not transparently alias the two, the per-block stylesheet never
 * enqueues and the block ships without its CSS.
 *
 * Verified 2026-05-11 on sandybrown: copying style-index.css -> style.css
 * makes WP enqueue the block's scoped CSS inline as expected.
 *
 * This script runs after `npm run build` and copies both LTR and RTL
 * variants for every block that has them. Idempotent: re-running is safe.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const BLOCKS_DIR = path.resolve( __dirname, '..', 'build', 'blocks' );

if ( ! fs.existsSync( BLOCKS_DIR ) ) {
	console.warn( `[copy-built-styles] build/blocks not found at ${ BLOCKS_DIR } -- skipping.` );
	process.exit( 0 );
}

const entries = fs.readdirSync( BLOCKS_DIR, { withFileTypes: true } );
let copied = 0;
let skipped = 0;

for ( const entry of entries ) {
	if ( ! entry.isDirectory() ) {
		continue;
	}
	const blockDir = path.join( BLOCKS_DIR, entry.name );

	for ( const [ srcName, destName ] of [
		[ 'style-index.css', 'style.css' ],
		[ 'style-index-rtl.css', 'style-rtl.css' ],
	] ) {
		const src = path.join( blockDir, srcName );
		const dest = path.join( blockDir, destName );
		if ( ! fs.existsSync( src ) ) {
			continue;
		}
		// Only copy when source is newer than dest (or dest missing).
		const srcStat = fs.statSync( src );
		let destStat = null;
		try {
			destStat = fs.statSync( dest );
		} catch {
			// dest missing, fall through to copy
		}
		if ( destStat && destStat.mtimeMs >= srcStat.mtimeMs ) {
			skipped += 1;
			continue;
		}
		fs.copyFileSync( src, dest );
		copied += 1;
	}
}

console.log( `[copy-built-styles] copied ${ copied } file(s), skipped ${ skipped } (up to date).` );
