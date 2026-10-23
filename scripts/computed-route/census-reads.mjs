// Saves the read set of an existing Fill run: the draft read again with the run's own skeleton and draft, written beside
// the run as reads.json (the file census.mjs --check reads for conservation).
//   node census-reads.mjs <run dir> [--allow-external]
// A Claude Design draft loads its runtime from unpkg, so a draft that does needs --allow-external.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTree, addRefs, refOf, walk } from './lib/tree.mjs';
import { skeletonNodes, cleanTree, expandSiteInfoRows } from './lib/fill-skeleton.mjs';
import { assertDraftPage, serveDraft } from './lib/draft.mjs';
import { readDraft } from './lib/fill-read.mjs';
import { readSetFile } from './lib/census-reads.mjs';
import { READ_FILE } from './lib/census-conservation.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const dir = process.argv.slice( 2 ).find( ( a ) => ! a.startsWith( '--' ) );
if ( ! dir ) {
	console.error( 'usage: node census-reads.mjs <run dir> [--allow-external]' );
	process.exit( 2 );
}
const { client, surface } = JSON.parse( fs.readFileSync( path.join( dir, 'fill-report.json' ), 'utf8' ) );
const build = path.join( REPO, 'sites', client, 'build' );
const entry = JSON.parse( fs.readFileSync( path.join( build, 'surfaces.json' ), 'utf8' ) )[ surface ];
const skeleton = expandSiteInfoRows( readTree( path.join( build, 'skeleton', `${ surface }.skeleton.json` ) ) );
const tree = cleanTree( skeleton );
addRefs( tree, surface );
const nodes = skeletonNodes( skeleton );
const flat = [];
walk( tree, ( n, i ) => {
	flat[ i ] = n;
} );
const served = await serveDraft( assertDraftPage( path.join( REPO, entry.draftDir ), entry.draftIndex || null ), { index: entry.draftIndex || null } );
try {
	const reads = await readDraft( { url: served.url, nodes, sweep: false, external: process.argv.includes( '--allow-external' ), log: console.log } );
	const file = readSetFile( { client, surface, reads, nodes, refs: flat.map( ( n ) => refOf( n ) ) } );
	fs.writeFileSync( path.join( dir, READ_FILE ), `${ JSON.stringify( file, null, 1 ) }\n` );
	console.log( `${ path.join( dir, READ_FILE ) }: ${ file.rows.length } declared reads` );
} finally {
	await served.close();
}
