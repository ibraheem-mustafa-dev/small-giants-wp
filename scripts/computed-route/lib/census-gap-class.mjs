// FR-48-65 classes for census rows. A row's base class is its Fill reason's (data/census-classes.json `frClass`, the
// resolver-gap reading of lib/gap-classes.mjs::mapResolverGap), `held` for an already-held row, or `unassessed` for a walker
// row no Fill row and no triage verdict covers. The instrument gates then read the row's block (lib/gap-classes.mjs::
// instrumentFinding): a NULL-routed, mistagged, uncalibrated or stale fitting setting makes it an I-class row.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCssProperty } from './css-families.mjs';
import { fromCommand, fromFile, isEvidence, renderEvidence } from './gate-evidence.mjs';
import { LOOSE } from './resolve.mjs';
import { GAP_CLASSES, HELD, I_CLASSES, UNASSESSED, ancestorsOf, classify, gapClassOf, instrumentFinding, mapUnassessedArtefact, staleCheck } from './gap-classes.mjs';

// The Fill reason a walker row carries when no Fill row covers it (data/census-mechanisms.json reasonClasses.walkerOnly).
const VOCAB_WALKER_ONLY = JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'census-mechanisms.json' ), 'utf8' ) ).reasonClasses.walkerOnly;
const UNCALIBRATED_SETTINGS = new RegExp( JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'census-mechanisms.json' ), 'utf8' ) ).uncalibratedSettingsPattern );

// The DB-versus-code check per block (memoised): the DB's refresh time against the block's last commit and its uncommitted
// changes in `repo`. Returns slug -> { pass, class, evidence }.
export function gitFreshness( { repo, db } ) {
	const dbRefreshedAt = db.prepare( "SELECT value FROM schema_metadata WHERE key = 'last_full_refresh_ts'" ).get()?.value;
	const memo = new Map();
	const root = 'plugins/sgs-blocks/src/blocks';
	let changes = null;
	const git = ( args ) => execFileSync( 'git', args, { cwd: repo, encoding: 'utf8' } );
	return ( slug ) => {
		if ( ! memo.has( slug ) ) {
			const dir = `${ root }/${ slug.replace( /^sgs\//, '' ) }`;
			let check;
			try {
				check = staleCheck( { dbRefreshedAt, blockCommittedAt: git( [ 'log', '-1', '--format=%cI', '--', dir ] ).trim(), blockChanges: git( [ 'status', '--porcelain', '--', dir ] ).split( '\n' ).filter( Boolean ) } );
			} catch ( e ) {
				check = { pass: false, class: 'I-stale', evidence: `git could not be read for ${ dir }: ${ String( e.message || e ).slice( 0, 80 ) }` };
			}
			// The reading as FR-48-66 evidence: the commands that produced it (lib/gate-evidence.mjs).
			memo.set( slug, { ...check, evidence: fromCommand( `git log -1 --format=%cI -- ${ dir }; git status --porcelain -- ${ dir }; sgs-framework.db: SELECT value FROM schema_metadata WHERE key = 'last_full_refresh_ts'`, check.evidence ) } );
		}
		return memo.get( slug );
	};
}

// The base class of a census row: { class, candidate }. A row with no Fill row is W-walker when its measuring artefact was
// moved out (`walkerArtefact`, lib/census-unassessed.mjs), else `unassessed` (FR-48-65).
export function baseClass( row ) {
	if ( ! row.fillClass ) {
		return row.walkerArtefact ? mapUnassessedArtefact( row.walkerArtefact ) : { class: UNASSESSED, candidate: false };
	}
	if ( HELD !== row.fillClass && ! GAP_CLASSES.includes( row.fillClass ) ) {
		gapClassOf( row.fillClass );
	}
	return { class: row.fillClass, candidate: !! row.fillCandidate };
}

// FR-48-66 evidence for a row whose Fill reason is itself I-calibration, read from the calibration cache: the absent slot-map
// file, the missing paint, or the paint key at the row's slot where no width holds a reading of the row's property. `files`
// is { slotMap, paint } (paths). A row whose reason names state settings the resolver found uncalibrated (data/census-mechanisms.json
// uncalibratedSettingsPattern) cites those settings' absent slot-map entries, with any untestedStates note. The cache's paint is
// the default (resting) paint, so any other row in a state (hover, focus, any state other than `default`) has only the absent
// slot map as evidence: its state paint was never looked at, so no paint
// reading proves or disproves it. The readKey named is the paint file's own, else the slot map's. Null where the cache
// does hold the reading, the row's state paint was not read, or no file is named: the reason is then unproven.
export function calibrationEvidence( row, cal, files ) {
	if ( ! files ) {
		return null;
	}
	if ( ! cal ) {
		return fromFile( files.slotMap, row.slug, `no calibration slot map for ${ row.slug }` );
	}
	// A state setting the resolver found uncalibrated (lib/resolve.mjs: none of the named settings has a slot-map entry):
	// the slot map's settings entries for those names are the evidence, whatever the row's state.
	const named = UNCALIBRATED_SETTINGS.exec( String( row.reasonText ?? '' ) );
	if ( named ) {
		const attrs = named[ 2 ].split( /,\s*/ ).filter( Boolean );
		if ( attrs.length && attrs.every( ( a ) => ! Object.hasOwn( cal.settings || {}, a ) ) ) {
			const untested = ( cal.untestedStates || [] ).filter( ( u ) => attrs.some( ( a ) => String( u ).startsWith( `${ a }:` ) ) );
			return fromFile( files.slotMap, attrs.map( ( a ) => `settings.${ a }` ).join( ', ' ), untested.length ? `untested: ${ untested.join( '; ' ) }` : `the slot map holds no calibration of ${ attrs.join( ', ' ) } (${ named[ 3 ] })` );
		}
		return null;
	}
	if ( ! [ undefined, null, 'default' ].includes( row.state ) ) {
		return null;
	}
	if ( cal.paintMissing ) {
		return fromFile( files.paint, row.slug, cal.paintMissing );
	}
	if ( ! isCssProperty( row.key ) ) {
		return null;
	}
	const slot = row.slot ?? '';
	const found = Object.keys( cal.elements || {} ).find( ( k ) => LOOSE( k ) === LOOSE( slot ) );
	const readKey = `(readKey ${ cal.paintReadKey ?? cal.readKey ?? 'unrecorded' })`;
	if ( undefined === found ) {
		return fromFile( files.paint, `elements[${ JSON.stringify( slot ) }].*.${ row.key }`, `the paint holds no element ${ slot || '(block root)' } ${ readKey }` );
	}
	const widths = Object.entries( cal.elements[ found ] || {} );
	if ( widths.some( ( [ , styles ] ) => styles && Object.hasOwn( styles, row.key ) ) ) {
		return null;
	}
	return fromFile( files.paint, `elements[${ JSON.stringify( found ) }].*.${ row.key }`, `no reading at ${ widths.map( ( [ w ] ) => w ).join( ', ' ) || 'any width' } ${ readKey }` );
}

// Adds gapClass, gapCandidate, gapVia, gapAttribute and gapEvidence to every row. i: { db, calFor( client, surface, block ) ->
// calibration | null, calFiles( client, surface, block ) -> { slotMap, paint } | null, freshness( slug ) -> { pass, class,
// evidence } }. A row whose Fill reason is I-calibration takes its evidence from the cache (calibrationEvidence). A row whose block the framework DB does not hold (a class-name extension), or with no CSS property, keeps its base.
export function classifyRows( rows, { db, calFor, calFiles = () => null, freshness } ) {
	const ancestors = ancestorsOf( db );
	const known = db.prepare( 'SELECT 1 AS found FROM blocks WHERE slug = ?' );
	const memo = new Map();
	return rows.map( ( row ) => {
		const base = baseClass( row );
		let finding = null;
		// A row with no Fill row takes its class from G0's freshness only: nothing tried to write its value, so G3 and G4 have no failed write to explain.
		const unwritten = UNASSESSED === base.class && VOCAB_WALKER_ONLY === row.reason;
		if ( row.slug && known.get( row.slug ) && isCssProperty( row.key ) && ! [ HELD ].includes( base.class ) ) {
			const state = 'default' === row.state ? null : row.state;
			const id = [ row.client, row.surface, row.slug, row.key, state ].join( '\u0001' );
			if ( ! memo.has( id ) ) {
				const cache = calFor( row.client, row.surface, row.slug );
				memo.set( id, instrumentFinding( { db, block: row.slug, ancestors: ancestors( row.slug ), property: row.key, state, cache, isDiscovered: ( r ) => !! calFor( row.client, row.surface, r.block_slug )?.discovered?.[ r.attr_name ], stale: freshness( row.slug ) } ) );
			}
			finding = memo.get( id );
		}
		// What G3 and G4 would say of a row with no Fill row is kept beside its class (`gapObserved`), not as its class.
		const c = classify( base, unwritten && finding ? { ...finding, db: null, calibration: null, attribute: null } : finding );
		const seen = unwritten && finding ? classify( base, { ...finding, stale: null } ) : null;
		const observed = seen && I_CLASSES.includes( seen.class ) ? { class: seen.class, via: seen.via ?? null, attribute: seen.attribute ?? null, evidence: seen.evidence ?? null } : null;
		const evidence = c.evidence ?? ( 'I-calibration' === c.class ? calibrationEvidence( row, calFor( row.client, row.surface, row.slug ), calFiles( row.client, row.surface, row.slug ) ) : null );
		return { ...row, gapClass: c.class, gapCandidate: !! c.candidate, gapVia: c.via ?? null, gapAttribute: c.attribute ?? null, gapEvidence: evidence ?? null, gapReason: c.reason ?? null, gapObserved: observed };
	} );
}

// Row counts per class, I-class rows named: { total, counts, instrument: [ { class, client, surface, block, attribute, property, via, evidence } ],
// observed: [ { class, block, attribute, via, evidence, rows } ] }. `observed` lists the settings G3 or G4 found on rows no Fill row covers
// (an I-class setting nobody tried to write: instrument debt seen, not a class of those rows, never counted in `counts`).
// A row carries exactly one class, so the counts sum to `total`, the number of rows given (grouped rows and rows with no
// signature alike); a row without a single class name throws, and so does an I-class row whose evidence is not a command
// and its output line or a file and key (lib/gate-evidence.mjs: free text is not evidence).
export function classCounts( rows ) {
	const counts = {};
	for ( const r of rows ) {
		if ( 'string' !== typeof r.gapClass || '' === r.gapClass ) {
			throw new Error( `census row ${ r.client } ${ r.surface } ${ r.element } carries no single class (${ JSON.stringify( r.gapClass ?? null ) })` );
		}
		if ( r.gapClass.startsWith( 'I-' ) && ! isEvidence( r.gapEvidence ) ) {
			throw new Error( `census row ${ r.client } ${ r.surface } ${ r.element } is ${ r.gapClass } with no evidence for its class (${ renderEvidence( r.gapEvidence ) })` );
		}
		counts[ r.gapClass ] = ( counts[ r.gapClass ] ?? 0 ) + 1;
	}
	const seen = new Map();
	for ( const r of rows.filter( ( x ) => x.gapObserved ) ) {
		const k = [ r.gapObserved.class, r.slug, r.gapObserved.attribute, r.gapObserved.via ].join( '|' );
		seen.has( k ) || seen.set( k, { class: r.gapObserved.class, block: r.slug, attribute: r.gapObserved.attribute, via: r.gapObserved.via, evidence: r.gapObserved.evidence, rows: 0 } );
		seen.get( k ).rows++;
	}
	return { total: rows.length, observed: [ ...seen.values() ], counts, instrument: rows.filter( ( r ) => r.gapClass.startsWith( 'I-' ) ).map( ( r ) => ( { class: r.gapClass, client: r.client, surface: r.surface, block: r.slug, attribute: r.gapAttribute, property: r.key, via: r.gapVia, evidence: r.gapEvidence } ) ) };
}
