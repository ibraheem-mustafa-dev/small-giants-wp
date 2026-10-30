// Whether a record the route saved (intake.json, a saved inventory) still describes the export on disk. Intake writes a
// `sources` object into each record: the sha256 of every draft (`*.dc.html`), `support.js`, `surfaces.json`,
// `animations.json`, `README.md`, `tokens/*.css`, every file under `assets/` and every `*.js` file anywhere under the handoff folder, and the commit of the route that built it. Every reader
// of a record calls assertCurrent( record, handoffRoot ), which throws a StaleRecordError naming each changed file. A
// record written before `sources` existed passes with one warning, never silently, except where the reader requires them
// (`requireSources`: a saved skeleton inventory a proposal is built from, assertInventoryCurrent), where it is refused.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { walkFolder, sha256 } from './handoff.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );

// The handoff files a record depends on: drafts, the runtime and every script (`*.js`, at any depth), the two inventories, the token stylesheets and the assets.
export const isSourceFile = ( rel ) => /\.dc\.html$/.test( rel ) || /^assets\/./.test( rel ) || /\.js$/.test( rel ) || [ 'support.js', 'surfaces.json', 'animations.json', 'README.md' ].includes( rel ) || /^tokens\/[^/]+\.css$/.test( rel );

// The commit of the route working tree, or null when git cannot answer.
export function routeCommit() {
	try {
		return execFileSync( 'git', [ 'rev-parse', 'HEAD' ], { cwd: HERE, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ] } ).trim();
	} catch {
		return null;
	}
}

// { files: { <folder-relative path>: sha256 }, route: { commit } } for a handoff folder; a folder that does not exist holds
// no files, so a record read from files that are gone reads them as removed.
export function sourcesOf( handoffRoot, { commit = routeCommit() } = {} ) {
	const files = {};
	for ( const rel of fs.existsSync( handoffRoot ) ? walkFolder( handoffRoot ).files.filter( isSourceFile ) : [] ) {
		files[ rel ] = sha256( fs.readFileSync( path.join( handoffRoot, rel ) ) );
	}
	return { files, route: { commit } };
}

export class StaleRecordError extends Error {
	constructor( label, changed ) {
		super( `${ label } is stale: the export changed since it was written (${ changed.join( '; ' ) }); run intake again` );
		this.name = 'StaleRecordError';
		this.changed = changed;
	}
}

// Each file whose hash differs between the recorded sources and the folder now: [ 'support.js changed', 'x.dc.html
// added', 'y.dc.html removed' ]. `current` is a sourcesOf result the caller already took (so a loop over many records
// hashes the folder once); without it the folder is hashed here.
export function changedSources( recorded, handoffRoot, current = null ) {
	const now = ( current || sourcesOf( handoffRoot, { commit: null } ) ).files;
	const was = recorded?.files || {};
	return [
		...Object.keys( was ).filter( ( f ) => f in now && was[ f ] !== now[ f ] ).map( ( f ) => `${ f } changed` ),
		...Object.keys( now ).filter( ( f ) => ! ( f in was ) ).map( ( f ) => `${ f } added` ),
		...Object.keys( was ).filter( ( f ) => ! ( f in now ) ).map( ( f ) => `${ f } removed` ),
	];
}

// Throws StaleRecordError when the record's `sources` disagree with the folder. A record with no `sources` passes with
// one warning through `warn` (default console.warn) and returns { checked: false }, or, with `requireSources`, throws a
// StaleRecordError saying so; a current one returns { checked: true }. `current`: an optional sourcesOf result already taken
// for the folder.
export function assertCurrent( record, handoffRoot, { label = 'the record', warn = ( line ) => console.warn( line ), current = null, requireSources = false } = {} ) {
	if ( ! record?.sources && requireSources ) {
		const e = new StaleRecordError( label, [] );
		e.message = `${ label } records no sources, so whether the export changed since it was written is unknown; run intake again`;
		throw e;
	}
	if ( ! record?.sources ) {
		warn( `freshness: ${ label } has no sources (written before the route recorded them); its currency is not checked` );
		return { checked: false };
	}
	const changed = changedSources( record.sources, handoffRoot, current );
	if ( changed.length ) {
		throw new StaleRecordError( label, changed );
	}
	return { checked: true };
}

// The handoff folder a client's saved records depend on.
export const handoffOf = ( repo, client ) => path.join( repo, 'sites', client, 'handoff' );

// A saved skeleton inventory (`sites/<client>/build/skeleton/<surface>.inventory.json`, or the intake inventory it is taken
// from) is read only while it describes the export on disk: one with no `sources`, or whose sources changed, is refused with
// the changed files named. Returns the inventory.
export function assertInventoryCurrent( inventory, handoffRoot, label, current = null ) {
	assertCurrent( inventory, handoffRoot, { label, requireSources: true, ...( current ? { current } : {} ) } );
	return inventory;
}
