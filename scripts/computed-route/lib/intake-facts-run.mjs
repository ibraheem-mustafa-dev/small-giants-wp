// `intake.mjs --facts <client>` (Spec 48 FR-48-7): writes only sites/<client>/build/intake/facts.json, from the export, the
// replay file and the inventories the last full intake saved, without the other intake stages. This parent re-checks
// the manifest and the replay file and runs no draft code; the secret-free worker (lib/intake-facts-worker.mjs, started
// through lib/intake-process.mjs::runIsolated) reads the drafts. Returns the exit code.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from './intake-sandbox.mjs';
import { runIsolated } from './intake-process.mjs';
import { pathsFor } from './intake-run.mjs';

const WORKER = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'intake-facts-worker.mjs' );
const secs = ( ms ) => `${ ( ms / 1000 ).toFixed( 1 ) }s`;

export async function runFacts( o, { log = ( l ) => process.stderr.write( `${ l }\n` ), widths = [ 375, 768, 1440 ] } = {} ) {
	const t0 = Date.now();
	const at = pathsFor( o.repo, o.client );
	const say = ( l ) => log( `[intake --facts] ${ l }` );
	let manifest;
	try {
		manifest = recheckManifest( at.folder );
	} catch ( e ) {
		say( `manifest re-check FAILED for ${ at.folder }: ${ e.message }` );
		return 1;
	}
	const harPath = at.replay( manifest.manifestHash );
	if ( ! fs.existsSync( harPath ) ) {
		say( `no replay file ${ harPath } for this export: run the full intake with --record first` );
		return 1;
	}
	const m = JSON.parse( fs.readFileSync( path.join( at.folder, 'MANIFEST.json' ), 'utf8' ) );
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-facts-' ) );
	const job = { client: o.client, folder: at.folder, entry: m.entry_drafts?.[ 0 ], harPath, widths, inventoriesDir: at.inventories, factsFile: at.facts, outFile: path.join( work, 'result.json' ) };
	fs.writeFileSync( path.join( work, 'job.json' ), JSON.stringify( job ) );
	try {
		await runIsolated( WORKER, [ path.join( work, 'job.json' ) ], { cwd: work, timeout: 3600 * 1000 } );
		const r = JSON.parse( fs.readFileSync( job.outFile, 'utf8' ) );
		const c = r.counts;
		say( `${ o.client }: wrote ${ path.relative( o.repo, at.facts ) } in ${ secs( Date.now() - t0 ) } (census ${ secs( r.ms.census ) }): ${ c.elements } elements, ${ c.holes } holes (${ widths.map( ( w ) => `${ w }px ${ c.perWidth[ w ].resolved } resolved, ${ c.perWidth[ w ].absent } absent, ${ c.perWidth[ w ].unresolved } unresolved` ).join( ', ' ) }), ${ c.widthConditions } width conditions, ${ c.elementsInSurfaces } elements in surfaces, ${ c.instances } instance keys, ${ r.gaps.length } gaps` );
		return 0;
	} catch ( e ) {
		say( `the worker FAILED: ${ e.message }` );
		return 1;
	} finally {
		fs.rmSync( work, { recursive: true, force: true } );
	}
}
