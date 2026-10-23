// FR-48-65 classes for census rows. A row's base class is its Fill reason's (data/census-classes.json `frClass`, the
// resolver-gap reading of lib/gap-classes.mjs::mapResolverGap), `held` for an already-held row, or `unassessed` for a walker
// row no Fill row and no triage verdict covers. The instrument gates then read the row's block (lib/gap-classes.mjs::
// instrumentFinding): a NULL-routed, mistagged, uncalibrated or stale fitting setting makes it an I-class row.
import { execFileSync } from 'node:child_process';
import { isCssProperty } from './css-families.mjs';
import { GAP_CLASSES, HELD, UNASSESSED, ancestorsOf, classify, gapClassOf, instrumentFinding, staleCheck } from './gap-classes.mjs';

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
			memo.set( slug, check );
		}
		return memo.get( slug );
	};
}

// The base class of a census row: { class, candidate }.
export function baseClass( row ) {
	if ( ! row.fillClass ) {
		return { class: UNASSESSED, candidate: false };
	}
	if ( HELD !== row.fillClass && ! GAP_CLASSES.includes( row.fillClass ) ) {
		gapClassOf( row.fillClass );
	}
	return { class: row.fillClass, candidate: !! row.fillCandidate };
}

// Adds gapClass, gapCandidate, gapVia, gapAttribute and gapEvidence to every row. i: { db, calFor( client, surface, block ) ->
// calibration | null, freshness( slug ) -> { pass, class, evidence } }. A row whose block the framework DB does not hold (a class-name extension), or with no CSS property, keeps its base.
export function classifyRows( rows, { db, calFor, freshness } ) {
	const ancestors = ancestorsOf( db );
	const known = db.prepare( 'SELECT 1 AS found FROM blocks WHERE slug = ?' );
	const memo = new Map();
	return rows.map( ( row ) => {
		const base = baseClass( row );
		let finding = null;
		if ( row.slug && known.get( row.slug ) && isCssProperty( row.key ) && ! [ HELD ].includes( base.class ) ) {
			const state = 'default' === row.state ? null : row.state;
			const id = [ row.client, row.surface, row.slug, row.key, state ].join( '\u0001' );
			if ( ! memo.has( id ) ) {
				const cache = calFor( row.client, row.surface, row.slug );
				memo.set( id, instrumentFinding( { db, block: row.slug, ancestors: ancestors( row.slug ), property: row.key, state, cache, isDiscovered: ( r ) => !! calFor( row.client, row.surface, r.block_slug )?.discovered?.[ r.attr_name ], stale: freshness( row.slug ) } ) );
			}
			finding = memo.get( id );
		}
		const c = classify( base, finding );
		return { ...row, gapClass: c.class, gapCandidate: !! c.candidate, gapVia: c.via ?? null, gapAttribute: c.attribute ?? null, gapEvidence: c.evidence ?? null };
	} );
}

// Row counts per class, I-class rows named: { total, counts, instrument: [ { class, client, surface, block, attribute, property, via } ] }.
// A row carries exactly one class, so the counts sum to `total`, the number of rows given (grouped rows and rows with no
// signature alike); a row without a single class name throws.
export function classCounts( rows ) {
	const counts = {};
	for ( const r of rows ) {
		if ( 'string' !== typeof r.gapClass || '' === r.gapClass ) {
			throw new Error( `census row ${ r.client } ${ r.surface } ${ r.element } carries no single class (${ JSON.stringify( r.gapClass ?? null ) })` );
		}
		counts[ r.gapClass ] = ( counts[ r.gapClass ] ?? 0 ) + 1;
	}
	return { total: rows.length, counts, instrument: rows.filter( ( r ) => r.gapClass.startsWith( 'I-' ) ).map( ( r ) => ( { class: r.gapClass, client: r.client, surface: r.surface, block: r.slug, attribute: r.gapAttribute, property: r.key, via: r.gapVia } ) ) };
}
