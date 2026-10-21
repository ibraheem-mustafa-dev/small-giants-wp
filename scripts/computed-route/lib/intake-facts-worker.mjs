// The secret-free worker of `intake.mjs --facts <client>` (Spec 48 FR-48-7): reads the draft's annotated templates in
// the sandbox (the census's own read, lib/intake-census-template.mjs::draftSources), then the template, logic and
// surfaces readers (lib/fact-record.mjs::buildFactRecord), and writes the validated fact record. It runs the draft's
// logic, so like the intake worker it refuses to start with a secret in its environment. The full intake writes the same
// record from its 'facts' stage (lib/intake-run-stages.mjs), reusing the census it has already taken.
// Usage (internal): node lib/intake-facts-worker.mjs <job.json>; the result goes to job.outFile.
import fs from 'fs';
import { assertSecretFree } from './intake-process.mjs';
import { draftSources } from './intake-census-template.mjs';
import { inventoryCensus } from './intake-inventory.mjs';
import { readRouting } from './intake-routing.mjs';
import { buildFactRecord, writeFacts } from './fact-record.mjs';

assertSecretFree();

async function main( jobFile ) {
	const job = JSON.parse( fs.readFileSync( jobFile, 'utf8' ) );
	const t0 = Date.now();
	const entrySources = await draftSources( { folder: job.folder, entry: job.entry, harPath: job.harPath } );
	// Every page of a one-file-per-page draft, as the inventory stage widens the census.
	const { sources } = await inventoryCensus( { folder: job.folder, entry: job.entry, routing: readRouting( { folder: job.folder } ), census: { rows: [], sources: entrySources }, harPath: job.harPath } );
	const tCensus = Date.now() - t0;
	const { record, blocked } = await buildFactRecord( { folder: job.folder, client: job.client, entry: job.entry, harPath: job.harPath, sources, widths: job.widths, inventoriesDir: job.inventoriesDir } );
	const counts = writeFacts( job.factsFile, record );
	fs.writeFileSync( job.outFile, JSON.stringify( { counts, gaps: record.gaps, blocked, ms: { census: tCensus, total: Date.now() - t0 } } ) );
}

main( process.argv[ 2 ] ).catch( ( e ) => {
	process.stderr.write( `${ e?.stack || e }\n` );
	process.exit( 1 );
} );
