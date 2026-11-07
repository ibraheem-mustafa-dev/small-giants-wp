#!/usr/bin/env node
// Refreshes a surface's block-to-draft pairs from the saved post and the draft's inventory, with no clone route and no write to the
// site (lib/refresh-pairs.mjs: by block type, order and shared text, one block to one draft element). It shows the old pairs
// against the new, and with --write saves sites/<client>/build/<surface>.pairs.json, which the applier reads over the surface's
// walker config and origin file (lib/apply-targets.mjs::pairsReport).
//   node scripts/computed-route/refresh-pairs.mjs <client> --surface <key> [--write] [--blocks <read-block-attrs output>]
// The draft side is the surface's skeleton inventory (sites/<client>/build/skeleton/<surface>.inventory.json); the saved side is read
// from the client's local mirror by scripts/local-wp/read-block-attrs.py, or from --blocks.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSurfaces } from './lib/apply-targets.mjs';
import { refreshPairs } from './lib/refresh-pairs.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const flag = ( name ) => ( process.argv.includes( name ) ? process.argv[ process.argv.indexOf( name ) + 1 ] : null );

const client = process.argv[ 2 ];
const surfaceKey = flag( '--surface' );
if ( ! client || client.startsWith( '--' ) || ! surfaceKey ) {
	console.error( 'usage: node scripts/computed-route/refresh-pairs.mjs <client> --surface <key> [--write] [--blocks <file>]' );
	process.exit( 2 );
}
const build = path.join( REPO, 'sites', client, 'build' );
const { surfaces } = await loadSurfaces( { repo: REPO, client, only: [ surfaceKey ], draftOrigin: 'http://127.0.0.1:5181' } );
const surface = surfaces[ 0 ];
if ( ! surface ) {
	throw new Error( `${ surfaceKey } has no post and walker config in sites/${ client }/build` );
}
if ( ! /^local-/.test( surface.site ) ) {
	throw new Error( `${ surface.site } is not a local mirror` );
}
let file = flag( '--blocks' );
if ( ! file ) {
	file = path.join( os.tmpdir(), `refresh-pairs-${ process.pid }.json` );
	const r = spawnSync( process.platform === 'win32' ? 'python' : 'python3', [ path.join( REPO, 'scripts/local-wp/read-block-attrs.py' ), '--site', surface.site, '--out', file, String( surface.postId ) ], { encoding: 'utf8' } );
	if ( 0 !== r.status ) {
		throw new Error( `could not read the blocks of ${ surface.site }: ${ r.stderr }` );
	}
}
const saved = JSON.parse( fs.readFileSync( file, 'utf8' ) )[ surface.postId ]?.blocks ?? {};
const blocks = Object.entries( saved ).map( ( [ ref, b ] ) => ( { ref, block: b.block, attrs: b.attrs } ) );
const inventory = JSON.parse( fs.readFileSync( path.join( build, 'skeleton', `${ surfaceKey }.inventory.json` ), 'utf8' ) );
const old = new Map( surface.pairs.map( ( p ) => [ p.ref, p.tpl ] ) );
const result = refreshPairs( { blocks, elements: inventory.elements, old: Object.fromEntries( old ) } );
const short = ( tpl ) => String( tpl ?? '' ).split( '/' ).pop();
console.log( `${ surfaceKey } (post ${ surface.postId }): ${ blocks.length } saved blocks, ${ old.size } old pairs, ${ Object.keys( result.pairs ).length } new pairs, ${ Object.keys( result.unpaired ).length } with a reason` );
for ( const { ref, block } of blocks ) {
	const now = result.pairs[ ref ]?.tpl;
	const was = old.get( ref );
	const mark = was === now ? '  ' : was && now ? '~~' : was ? '--' : '++';
	console.log( `${ mark } ${ ref.replace( `cr-ref-${ surfaceKey }-`, '' ).padEnd( 4 ) } ${ block.padEnd( 26 ) } old ${ short( was ).padEnd( 10 ) } new ${ short( now ).padEnd( 10 ) } ${ now ? '' : result.unpaired[ ref ] ?? '' }` );
}
const dupes = Object.entries( Object.values( result.pairs ).reduce( ( m, p ) => ( { ...m, [ p.tpl ]: ( m[ p.tpl ] || 0 ) + 1 } ), {} ) ).filter( ( [ , n ] ) => n > 1 );
console.log( dupes.length ? `DUPLICATE draft elements: ${ dupes.map( ( [ t ] ) => t ).join( ', ' ) }` : 'no draft element is paired twice' );
if ( process.argv.includes( '--write' ) ) {
	const out = path.join( build, `${ surfaceKey }.pairs.json` );
	fs.writeFileSync( out, `${ JSON.stringify( { generated: 'refresh-pairs.mjs', pairs: result.pairs, unpaired: result.unpaired }, null, 1 ) }\n` );
	console.log( `wrote ${ path.relative( REPO, out ) }` );
}
