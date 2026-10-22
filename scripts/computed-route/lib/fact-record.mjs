// The shared fact record (Spec 48 FR-48-7, Spec 48A §3): the template, logic and surfaces readers joined into
// `sites/<client>/build/intake/facts.json`, one entry per template element keyed by template key (lib/fact-key.mjs):
//   { schema, client, generated, widths, sources, elements: { <template key>: { template, logic, surfaces, effects, assets, alt?,
//     instances: [ { key, state } ], fingerprint } }, surfaces, animations: { records, unjoined }, assets: { files, unused,
//     missing }, gaps, counts }
// `sources` is lib/freshness.mjs::sourcesOf: the sha256 of every handoff input and the route's commit. `instances` are the
// element's instance keys (`<chain>/<tpl>#<copy>`) in the per-surface inventories intake saved (the copy index is counted
// on the rendered page, so only a rendered inventory can name one); `state` is the inventory's surface slug. Intake writes
// the record (lib/intake-run-stages.mjs); every reader loads it through loadFacts, which refuses a record whose inputs
// changed (assertCurrent) and never falls back to reading the draft again.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAjv, schemaProblems, readJson } from './handoff.mjs';
import { sourcesOf, assertCurrent, changedSources } from './freshness.mjs';
import { templateKey } from './fact-key.mjs';
import { readTemplate } from './read-template.mjs';
import { readLogic, READ_WIDTHS } from './read-logic.mjs';
import { readSurfaces } from './read-surfaces.mjs';
import { readAnimations } from './read-animations.mjs';
import { readAssets } from './read-assets.mjs';
import { readReadme } from './read-readme.mjs';
import { openSandbox } from './intake-sandbox.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
export const FACTS_SCHEMA = path.join( HERE, '..', 'data', 'facts.schema.json' );
export const FACTS_SCHEMA_VERSION = '3';

// Where a client's fact record lives.
export const factsFile = ( repo, client ) => path.join( repo, 'sites', client, 'build', 'intake', 'facts.json' );

// Every instance key the saved inventories hold, by template key: { byTemplate: Map( template key → [ { key, state } ] ),
// gaps }. An inventory whose `sources` disagree with the folder is stale: it is skipped and listed; one without `sources`
// is read and counted in one gap row.
export function instancesOf( { inventoriesDir, folder, current = null } ) {
	const byTemplate = new Map();
	const gaps = [];
	let unchecked = 0;
	const files = inventoriesDir && fs.existsSync( inventoriesDir ) ? fs.readdirSync( inventoriesDir ).filter( ( f ) => f.endsWith( '.json' ) ).sort() : [];
	for ( const f of files ) {
		const read = readJson( path.join( inventoriesDir, f ) );
		if ( read.error ) {
			gaps.push( { construct: 'inventory', draftId: f, error: `the saved inventory does not parse: ${ read.error }` } );
			continue;
		}
		const inv = read.data;
		if ( inv.sources ) {
			const changed = changedSources( inv.sources, folder, current ?? ( current = sourcesOf( folder, { commit: null } ) ) );
			if ( changed.length ) {
				gaps.push( { construct: 'inventory', draftId: f, error: `the saved inventory is stale and its instance keys are not used (${ changed.slice( 0, 3 ).join( '; ' ) }); run intake again` } );
				continue;
			}
		} else {
			unchecked++;
		}
		const state = f.replace( /\.json$/, '' );
		for ( const e of inv.elements || [] ) {
			if ( ! e.key || ! e.template || null == e.tpl ) {
				continue;
			}
			const k = templateKey( { dc: e.template, tpl: String( e.tpl ) } );
			byTemplate.has( k ) || byTemplate.set( k, [] );
			byTemplate.get( k ).push( { key: e.key, state } );
		}
	}
	unchecked && gaps.push( { construct: 'inventory', draftId: inventoriesDir, error: `${ unchecked } saved inventories carry no sources (written before the route recorded them); their currency is not checked` } );
	return { byTemplate, gaps };
}

// `effects` are the animations.json records that target the element (reach `self`) or a descendant (lib/read-animations.mjs).
// The counts of a record: elements, holes, hole answers per width (resolved to a value, absent: the live state holds no value
// for it, unresolved: the expression or the instance failed), width conditions, elements in a surface, instances, gaps.
export function countsOf( elements, widths, gaps, animations = { records: 0, unjoined: [] }, assets = emptyAssets ) {
	const per = Object.fromEntries( widths.map( ( w ) => [ w, { resolved: 0, absent: 0, unresolved: 0 } ] ) );
	let holes = 0;
	let joined = 0;
	let instances = 0;
	let conditions = 0;
	for ( const e of Object.values( elements ) ) {
		joined += e.surfaces.length ? 1 : 0;
		instances += e.instances.length;
		conditions += e.logic.width ? 1 : 0;
		for ( const answers of Object.values( e.logic.holes ) ) {
			holes++;
			for ( const w of widths ) {
				answers[ w ].err ? per[ w ].unresolved++ : answers[ w ].v.every( ( x ) => 'undefined' === x.t ) ? per[ w ].absent++ : per[ w ].resolved++;
			}
		}
	}
	return { elements: Object.keys( elements ).length, holes, perWidth: per, widthConditions: conditions, elementsInSurfaces: joined, instances, gaps: gaps.length, effects: effectCounts( elements, animations ), assets: assetCounts( elements, assets ) };
}

// Effect counts: animations.json records read, records that landed on a template element, records with no element, and
// elements carrying at least one effect.
const effectCounts = ( elements, a ) => ( { records: a.records, joined: a.records - a.unjoined.length, unjoined: a.unjoined.length, elements: Object.values( elements ).filter( ( e ) => e.effects.length ).length } );

// Asset counts: files under `assets/`, elements using at least one, files no element or project script names, and
// referenced paths with no file.
const assetCounts = ( elements, a ) => ( { files: a.assets.files, elements: Object.values( elements ).filter( ( e ) => e.assets.length ).length, unused: a.assets.unused.length, missing: a.assets.missing.length } );

// The assets result of a record with no assets reader run: no files, no references.
const emptyAssets = { byElement: {}, alt: {}, gaps: [], assets: { files: 0, unused: [], missing: [] } };

// Joins the readers' results into the record (no browser, no files).
export function joinFacts( { client, sources, widths, template, logic, surfaces, animations, assets = emptyAssets, readme = null, instances, generated = new Date().toISOString() } ) {
	const elements = {};
	const gaps = [ ...template.gaps, ...logic.gaps, ...surfaces.gaps, ...animations.gaps, ...assets.gaps, ...instances.gaps ];
	for ( const key of template.order ) {
		const { fingerprint, ...rec } = template.elements[ key ];
		const cond = logic.conditions[ key ];
		elements[ key ] = {
			template: rec,
			logic: { holes: logic.holes[ key ] || {}, ...( cond ? { width: cond.width, ...( cond.via ? { via: cond.via } : {} ) } : {} ) },
			surfaces: surfaces.byElement[ key ] || [],
			effects: animations.byElement[ key ] || [],
			assets: assets.byElement[ key ] || [],
			...( assets.alt[ key ] ? { alt: assets.alt[ key ] } : {} ),
			instances: instances.byTemplate.get( key ) || [],
			fingerprint,
		};
	}
	for ( const [ key, list ] of instances.byTemplate ) {
		elements[ key ] || gaps.push( { construct: 'instance', draftId: key, error: `${ list.length } instance key(s) of a template element the annotated template does not hold (first ${ list[ 0 ].key } in ${ list[ 0 ].state })` } );
	}
	return {
		schema: FACTS_SCHEMA_VERSION, client, generated, widths, sources, elements, surfaces: surfaces.surfaces, animations: { records: animations.records, unjoined: animations.unjoined }, assets: assets.assets, ...( readme ? { readme } : {} ), mounted: logic.mounted, state: logic.state || {}, gaps,
		counts: countsOf( elements, widths, gaps, animations, assets ),
	};
}

// The record for a client's handoff folder. `sources`: the census sources (lib/intake-census-template.mjs::draftSources),
// read once by intake and reused here, so no template is rendered twice. Opens one sandbox for the logic reads (and one
// page of it for the CSS parser) unless `sandbox` is given. Returns { record, blocked }.
// The hashes of the handoff inputs are taken before anything is read (`hashed`, or sourcesOf here), so a draft edited
// while the record is built leaves a record that assertCurrent refuses.
export async function buildFactRecord( { folder, client, entry, harPath = null, sources, widths = READ_WIDTHS, inventoriesDir = null, sandbox = null, hashed = null } ) {
	const taken = hashed || sourcesOf( folder );
	const sb = sandbox || await openSandbox( { folder, index: entry, harPath, mode: 'replay', widths } );
	try {
		const css = await sb.newPage();
		let template;
		try {
			template = await readTemplate( { sources, page: css } );
		} finally {
			await css.close();
		}
		const logic = await readLogic( { sandbox: sb, entry, sources, template, widths } );
		const surfaceFile = readJson( path.join( folder, 'surfaces.json' ) );
		const surfaces = readSurfaces( { records: surfaceFile.data?.records || [], template } );
		surfaceFile.error && surfaces.gaps.push( { construct: 'surfaces', draftId: 'surfaces.json', error: `surfaces.json could not be read: ${ surfaceFile.error }` } );
		const animationFile = readJson( path.join( folder, 'animations.json' ) );
		const animations = readAnimations( { records: animationFile.data?.records || [], template } );
		animationFile.error && animations.gaps.push( { construct: 'animations', draftId: 'animations.json', error: `animations.json could not be read: ${ animationFile.error }` } );
		const assets = readAssets( { folder, template } );
		const instances = instancesOf( { inventoriesDir, folder, current: taken } );
		const record = joinFacts( { client, sources: taken, widths, template, logic, surfaces, animations, assets, readme: readReadme( { folder } ), instances } );
		return { record, blocked: sandbox ? [] : sb.blocked };
	} finally {
		if ( ! sandbox ) {
			await sb.close();
		}
	}
}

// Schema problems of a record, empty when valid.
export const factsProblems = ( record, ajv = loadAjv() ) => schemaProblems( ajv, FACTS_SCHEMA, record );

// Writes the record after validating it; an invalid record is never written (throws naming the problems).
export function writeFacts( file, record ) {
	const problems = factsProblems( record );
	if ( problems.length ) {
		throw new Error( `facts.json does not validate, nothing written: ${ problems.join( '; ' ) }` );
	}
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, `${ JSON.stringify( record ) }\n` );
	return record.counts;
}

// A client's fact record, refused when it is missing, invalid or stale (a StaleRecordError names each changed input). The
// one way a stage reads the draft's template, logic and surface facts.
export function loadFacts( client, { repo = REPO, folder = path.join( repo, 'sites', client, 'handoff' ), warn, current = null } = {} ) {
	const file = factsFile( repo, client );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `${ path.relative( repo, file ) } is missing: run intake for ${ client } first` );
	}
	const record = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const problems = factsProblems( record );
	if ( problems.length ) {
		throw new Error( `${ path.relative( repo, file ) } does not validate: ${ problems.join( '; ' ) }; run intake again` );
	}
	assertCurrent( record, folder, { label: 'facts.json', current, ...( warn ? { warn } : {} ) } );
	return record;
}

const warnedMissing = new Set();

// Whether a client's fact record is absent although its handoff folder exists. Warns once per client and process through
// `warn`, naming the client (a reader that falls back to a record-free read must not do so silently); a client with no
// handoff folder (a fixture) is silent. Returns true when the record is missing and the handoff exists.
export function warnMissingFacts( client, { repo = REPO, folder = path.join( repo, 'sites', client, 'handoff' ), warn = ( line ) => console.warn( line ) } = {} ) {
	if ( fs.existsSync( factsFile( repo, client ) ) || ! fs.existsSync( folder ) ) {
		return false;
	}
	const id = `${ repo }|${ client }`;
	warnedMissing.has( id ) || ( warnedMissing.add( id ), warn( `facts: ${ client } has a handoff folder but no ${ path.relative( repo, factsFile( repo, client ) ) }; readers use no fact record until intake --facts ${ client } has run` ) );
	return true;
}
