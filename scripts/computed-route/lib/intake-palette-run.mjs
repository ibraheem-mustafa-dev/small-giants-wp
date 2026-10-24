// `intake.mjs --palette-only <client> [--record]` (Spec 48 FR-48-31): the palette proposal without the other intake
// stages. The secret-free worker (lib/intake-run-worker.mjs through lib/intake-process.mjs::runIsolated) runs only the
// routing, replay and 'tokens and palette' stages: the draft tokens (lib/tokens.mjs) and one 1440 rest reading per
// route with its grounds (lib/intake-palette-grounds.mjs). It writes sites/<client>/build/intake/palette.json
// ({ client, takenOn, manifestHash, palette, usage, gaps }) and never touches intake.json, review.md or the page map.
// --record records the replay file first (a client with none); without it a missing replay file is an error.
// Returns the exit code.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from './intake-sandbox.mjs';
import { runIsolated } from './intake-process.mjs';
import { pathsFor } from './intake-run.mjs';

const WORKER = path.join( path.dirname( fileURLToPath( import.meta.url ) ), 'intake-run-worker.mjs' );
export const PALETTE_STAGES = Object.freeze( [ 'routing', 'replay', 'tokens and palette' ] );

export async function runPaletteOnly( o, { log = ( l ) => process.stderr.write( `${ l }\n` ) } = {} ) {
	const t0 = Date.now();
	const at = pathsFor( o.repo, o.client );
	const say = ( l ) => log( `[intake --palette-only] ${ l }` );
	let manifest;
	try {
		manifest = recheckManifest( at.folder );
	} catch ( e ) {
		say( `manifest re-check FAILED for ${ at.folder }: ${ e.message }` );
		return 1;
	}
	const harPath = at.replay( manifest.manifestHash );
	if ( ! o.record && ! fs.existsSync( harPath ) ) {
		say( `no replay file ${ harPath } for this export: run again with --record to record it` );
		return 1;
	}
	const m = JSON.parse( fs.readFileSync( path.join( at.folder, 'MANIFEST.json' ), 'utf8' ) );
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-palette-' ) );
	const job = { repo: o.repo, client: o.client, folder: at.folder, entry: m.entry_drafts?.[ 0 ], harPath, record: o.record, widths: o.widths, stages: PALETTE_STAGES,
		runtimeSha: m.runtime_sha256 ?? 'none', progressFile: path.join( work, 'progress.log' ), outFile: path.join( work, 'result.json' ) };
	fs.mkdirSync( path.dirname( harPath ), { recursive: true } );
	fs.writeFileSync( path.join( work, 'job.json' ), JSON.stringify( job ) );
	fs.writeFileSync( job.progressFile, '' );
	try {
		await runIsolated( WORKER, [ path.join( work, 'job.json' ) ], { cwd: work, timeout: 3600 * 1000 } );
		fs.readFileSync( job.progressFile, 'utf8' ).split( '\n' ).filter( Boolean ).forEach( say );
		const r = JSON.parse( fs.readFileSync( job.outFile, 'utf8' ) );
		const part = r.parts[ 'tokens and palette' ];
		if ( ! part?.palette ) {
			say( `the palette stage FAILED: ${ r.gaps.filter( ( g ) => /palette|replay|routing/.test( g.stage ) ).map( ( g ) => g.error ).join( '; ' ) || 'no palette part' }` );
			return 1;
		}
		const out = { client: o.client, takenOn: new Date().toISOString(), manifestHash: manifest.manifestHash, palette: part.palette, usage: part.usage, gaps: r.gaps };
		const file = path.join( at.dir, 'palette.json' );
		fs.mkdirSync( at.dir, { recursive: true } );
		fs.writeFileSync( file, `${ JSON.stringify( out, null, '\t' ) }\n` );
		say( `${ o.client }: wrote ${ path.relative( o.repo, file ) } in ${ ( ( Date.now() - t0 ) / 1000 ).toFixed( 1 ) }s: ${ part.palette.rows.length } rows, ${ part.usage.length } colour uses, ${ r.gaps.length } gaps` );
		return 0;
	} catch ( e ) {
		say( `the worker FAILED: ${ e.message }` );
		return 1;
	} finally {
		fs.rmSync( work, { recursive: true, force: true } );
	}
}
