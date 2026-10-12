// The intake command's draft-defect stage (Spec 48 FR-48-34) in two passes, to cut its wall time on a many-route draft:
// pass A forces every candidate on the entry page and the first two other routes; pass B forces only what pass A left
// (its unreached defects and its incomplete-forcing gap rows, by census row ID) over every route. Both passes read the
// bound style-* rules on every page they open (test 1), so test 1 still sees every route. The result has
// lib/intake-defects.mjs::proposeDraftDefects' shape ({ rows, groups, notDefects, gaps }) plus `passes`, and the intake
// record keeps one review row per group (defectReviewRows).
import { unreachedDefects, boundStyleRows, readPageBindings, bindingVerdicts } from './intake-defects.mjs';
import { defectGroups } from './intake-defects-keys.mjs';

// `defect:<draftId>`, then `:2`, `:3` for a draft ID seen again (the numbering proposeDraftDefects uses).
const numberRows = ( rows ) => {
	const n = new Map();
	return rows.map( ( r ) => {
		const k = ( n.get( r.draftId ) || 0 ) + 1;
		n.set( r.draftId, k );
		return { rowId: `defect:${ r.draftId }${ 1 === k ? '' : `:${ k }` }`, ...r };
	} );
};
const gapKey = ( g ) => `${ g.construct }\u0000${ g.draftId }\u0000${ g.error }`;

// o: { folder, entry, harPath, census ({ rows, sources }), visits (census visit spellings, entry first), widths, flags,
// firstPass (visits in pass A, default 3), log }.
export async function twoPassDefects( { folder, entry, harPath, census, visits, widths, flags = null, firstPass = 3, log = () => {} } ) {
	const bound = boundStyleRows( census );
	const reads = new Map();
	const onPage = ( s, at ) => readPageBindings( s.page, bound, at, reads );
	const marked = census.rows.some( ( r ) => 'boolean' === typeof r.unreached );
	const base = { folder, entry, harPath, widths, onPage, flags, census: marked ? census : { ...census, rows: [] } };
	const t0 = Date.now();
	const a = await unreachedDefects( { ...base, visits: visits.slice( 0, firstPass ) } );
	const msA = Date.now() - t0;
	const unreached = census.rows.filter( ( r ) => true === r.unreached );
	const retried = ( g ) => unreached.filter( ( r ) => r.kind === g.construct && r.draftId === g.draftId && /forcing was incomplete/.test( g.error ) );
	const only = new Set( [ ...a.rows.map( ( r ) => r.censusId ), ...a.gaps.flatMap( retried ).map( ( r ) => r.id ) ] );
	log( `  defects pass A: ${ visits.slice( 0, firstPass ).length } visits, ${ a.rows.length } defects and ${ only.size - a.rows.length } incomplete left for pass B (${ ( msA / 1000 ).toFixed( 1 ) }s)` );
	const t1 = Date.now();
	const b = await unreachedDefects( { ...base, visits, only } );
	const msB = Date.now() - t1;
	log( `  defects pass B: ${ visits.length } visits, ${ only.size } candidates, ${ b.rows.length } defects (${ ( msB / 1000 ).toFixed( 1 ) }s)` );
	const inOnly = ( x ) => only.has( x.censusId );
	const keptA = a.gaps.filter( ( g ) => ! retried( g ).some( ( r ) => only.has( r.id ) ) );
	const bind = bindingVerdicts( bound, reads );
	const gaps = new Map( [ ...bind.gaps, ...keptA, ...b.gaps ].map( ( g ) => [ gapKey( g ), g ] ) );
	if ( ! marked ) {
		gaps.set( 'unmarked', { construct: 'draft-defect', draftId: entry, error: 'the census carries no runtime `unreached` marks: FR-48-34 test 2 was not run' } );
	}
	const rows = numberRows( [ ...bind.rows, ...b.rows ] );
	return {
		rows, groups: defectGroups( rows, census ),
		notDefects: [ ...bind.notDefects, ...a.notDefects, ...b.notDefects.filter( inOnly ) ],
		gaps: [ ...gaps.values() ],
		passes: { a: { visits: visits.slice( 0, firstPass ).length, defects: a.rows.length, ms: msA }, b: { visits: visits.length, candidates: only.size, defects: b.rows.length, ms: msB } },
	};
}

// One review row per group (rowId = groupId, draftId = its first row's draft ID), every member row kept inside.
export function defectReviewRows( { rows, groups } ) {
	const byId = new Map( rows.map( ( r ) => [ r.rowId, r ] ) );
	return groups.map( ( g ) => {
		const members = g.rowIds.map( ( id ) => byId.get( id ) );
		const ids = [ ...new Set( g.evidence.draftIds ) ];
		return {
			rowId: g.groupId, draftId: members[ 0 ].draftId, component: g.component, member: g.member, kinds: g.kinds, tests: g.evidence.tests, rowIds: g.rowIds,
			summary: `${ g.component } ${ g.member }: ${ members.length } defect${ 1 === members.length ? '' : 's' } (${ g.kinds.join( ', ' ) }) at ${ ids.slice( 0, 4 ).join( ', ' ) }${ ids.length > 4 ? ` and ${ ids.length - 4 } more` : '' }`,
			rows: members,
		};
	} );
}
