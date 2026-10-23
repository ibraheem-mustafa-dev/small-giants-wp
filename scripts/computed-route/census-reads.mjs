// Saves the read set of an existing Fill run: the draft read again with the surface's skeleton and draft, written beside
// the run as reads.json (the file census.mjs --check reads for conservation), bound to the run folder's name and the
// sha256 of the skeleton and draft files read (lib/census-reads.mjs::inputHashes): --check refuses it once either changes.
//   node census-reads.mjs <run dir> [--allow-external]
// A Claude Design draft loads its runtime from unpkg, so a draft that does needs --allow-external.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTree, addRefs, refOf, walk } from './lib/tree.mjs';
import { skeletonNodes, cleanTree, expandSiteInfoRows } from './lib/fill-skeleton.mjs';
import { assertDraftPage, serveDraft } from './lib/draft.mjs';
import { readDraft } from './lib/fill-read.mjs';
import { inputHashes, readSetFile } from './lib/census-reads.mjs';
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
const skeletonFile = path.join( build, 'skeleton', `${ surface }.skeleton.json` );
const inputs = inputHashes( { root: REPO, skeleton: path.relative( REPO, skeletonFile ), draft: path.join( entry.draftDir, entry.draftIndex || 'index.html' ) } );
const skeleton = expandSiteInfoRows( readTree( skeletonFile ) );
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
	const file = readSetFile( { client, surface, run: path.basename( path.resolve( dir ) ), inputs, reads, nodes, refs: flat.map( ( n ) => refOf( n ) ) } );
	fs.writeFileSync( path.join( dir, READ_FILE ), `${ JSON.stringify( file, null, 1 ) }\n` );
	console.log( `${ path.join( dir, READ_FILE ) }: ${ file.rows.length } declared reads` );
} finally {
	await served.close();
}
