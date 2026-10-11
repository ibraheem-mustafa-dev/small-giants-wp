#!/usr/bin/env node
// The Claude Design handoff folder check (Spec 48A, FR-48A-2 to FR-48A-8 and FR-48A-10).
//   node scripts/computed-route/handoff-check.mjs <handoff folder> [--known <known-runtimes.json>] [--schemas <dir>] [--json]
//   node scripts/computed-route/handoff-check.mjs <handoff folder> --probe-runtime [--known <file>]
//   node scripts/computed-route/handoff-check.mjs <handoff folder> --add-runtime [--source "<text>"] [--known <file>]
// Exit 0: pass (warnings allowed). Exit 1: a failure (each names the file and the rule). Exit 2: usage error.
// --probe-runtime renders data/runtime-probe.dc.html with the folder's support.js and requires the recorded data-dc-tpl
// numbering (data/runtime-probe.expected.json), then prints the module-by-module difference from the nearest known
// build. --add-runtime runs the probe and, only when it passes, records the build in the known list and data/runtimes/.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkHandoff, readKnown, sha256, KNOWN_RUNTIMES, MASTER_SCHEMAS } from './lib/handoff.mjs';
import { probeRuntime, compareProbe, nearestKnown, addRuntime, PROBE_EXPECTED } from './lib/runtime-probe.mjs';

const USAGE = 'usage: node scripts/computed-route/handoff-check.mjs <handoff folder> [--known <file>] [--schemas <dir>] [--json] [--probe-runtime | --add-runtime [--source "<text>"]]';
const VALUED = [ '--known', '--schemas', '--source' ];
const FLAGS = [ '--json', '--probe-runtime', '--add-runtime' ];

// The command line as { folder, known, schemas, source, json, probe, add }, or { error }.
export function parseArgs( argv ) {
	const o = { folder: null, known: KNOWN_RUNTIMES, schemas: MASTER_SCHEMAS, source: null, json: false, probe: false, add: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( VALUED.includes( a ) ) {
			if ( undefined === argv[ i + 1 ] ) {
				return { error: `${ a } needs a value` };
			}
			o[ a.slice( 2 ) ] = argv[ ++i ];
		} else if ( FLAGS.includes( a ) ) {
			o[ { '--json': 'json', '--probe-runtime': 'probe', '--add-runtime': 'add' }[ a ] ] = true;
		} else if ( a.startsWith( '--' ) ) {
			return { error: `unknown option ${ a }` };
		} else if ( o.folder ) {
			return { error: `a second folder ${ a }` };
		} else {
			o.folder = a;
		}
	}
	if ( ! o.folder ) {
		return { error: 'no handoff folder given' };
	}
	if ( o.probe && o.add ) {
		return { error: '--probe-runtime and --add-runtime are exclusive (--add-runtime runs the probe)' };
	}
	return o;
}

// Runs the probe on the folder's support.js and prints the result and the module difference; returns true on pass.
async function probe( o, log ) {
	const support = path.join( o.folder, 'support.js' );
	if ( ! fs.existsSync( support ) ) {
		log( `FR-48A-5 support.js: missing in ${ o.folder }` );
		return false;
	}
	const sha = sha256( fs.readFileSync( support ) );
	const result = await probeRuntime( support );
	const diffs = compareProbe( result, JSON.parse( fs.readFileSync( PROBE_EXPECTED, 'utf8' ) ) );
	log( `runtime ${ sha }: probe ${ diffs.length ? 'FAIL' : 'pass' } (${ result.live.length } rendered, ${ result.annotated.length } annotated elements)` );
	diffs.forEach( ( d ) => log( `  FR-48A-5 ${ d }` ) );
	const near = nearestKnown( fs.readFileSync( support, 'utf8' ), readKnown( o.known ), { exclude: sha } );
	if ( ! near ) {
		log( 'no other known build has a local copy to compare modules with' );
	} else {
		log( `modules against the nearest other known build ${ near.runtime.sha256 } (${ near.runtime.source }):` );
		near.diff.forEach( ( d ) => log( `  ${ d.module }: ${ d.status }${ 'same' === d.status ? '' : ` (${ d.from } -> ${ d.to } bytes)` }` ) );
	}
	return ! diffs.length;
}

export async function main( argv, log = console.log ) {
	const o = parseArgs( argv );
	if ( o.error || ! fs.existsSync( o.folder ) || ! fs.statSync( o.folder ).isDirectory() ) {
		log( o.error || `${ o.folder } is not a directory` );
		log( USAGE );
		return 2;
	}
	if ( o.probe || o.add ) {
		const ok = await probe( o, log );
		if ( o.add ) {
			if ( ! ok ) {
				log( 'runtime not added: the probe failed' );
				return 1;
			}
			const support = path.join( o.folder, 'support.js' );
			const listed = readKnown( o.known ).runtimes.some( ( r ) => r.sha256 === sha256( fs.readFileSync( support ) ) );
			const e = addRuntime( support, o.known, { source: o.source || `${ path.basename( path.resolve( o.folder ) ) } export` } );
			log( `runtime ${ e.sha256 } ${ listed ? 'was already' : 'now' } recorded in ${ path.relative( process.cwd(), o.known ) } (probe ${ e.probe }, copy ${ e.path })` );
		}
		return ok ? 0 : 1;
	}
	let r;
	try {
		r = checkHandoff( o.folder, { known: readKnown( o.known ), schemas: o.schemas } );
	} catch ( e ) {
		log( `handoff check could not run: ${ e.message }` );
		return 1;
	}
	if ( o.json ) {
		log( JSON.stringify( { folder: o.folder, ok: ! r.errors.length, runtime_sha256: r.sha, errors: r.errors, warnings: r.warnings }, null, 2 ) );
	} else {
		r.errors.forEach( ( e ) => log( `FAIL ${ e }` ) );
		r.warnings.forEach( ( w ) => log( `WARN ${ w }` ) );
		log( `${ o.folder }: ${ r.errors.length ? 'FAIL' : 'pass' } (${ r.errors.length } failures, ${ r.warnings.length } warnings)` );
	}
	return r.errors.length ? 1 : 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = await main( process.argv.slice( 2 ) );
}
