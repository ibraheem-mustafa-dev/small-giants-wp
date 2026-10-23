// The per-client draft-defects list (Spec 48 FR-48-69, FR-48-34): every draft defect intake found (intake.json `draftDefects`,
// grouped by the class member or script that holds them) as one entry per defect, with what Claude Design needs to fix its
// export: the draft ID, the construct, what the code declares, what the render does, and who owns it. The list is the
// content of `sites/<client>/build/qa/draft-defects.json`; lib/draft-defects-file.mjs reads, merges and writes it and renders
// the text sent with the next export request. A defect keeps its first `listedOn` date and its `sentOn` date across re-runs.

export const OWNER_DEFAULT = 'Claude Design';
export const FIELDS = [ 'id', 'draftId', 'construct', 'test', 'declares', 'renders', 'owner', 'widths', 'built', 'listedOn', 'sentOn' ];

const tail = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();

// The defect rows of intake's `draftDefects` (a group holds `rows`; a bare row is its own group).
export const defectRows = ( draftDefects = [] ) => draftDefects.flatMap( ( g ) => g.rows || [ g ] ).filter( ( r ) => r?.draftId && r.test );

const droppedDecls = ( r ) => ( r.evidence?.decls || [] ).filter( ( d ) => 'dropped' === d.state );

// What the code declares: the dropped declarations of an unresolved binding, else the text the row recorded, else the construct and where it sits.
function declares( r ) {
	const e = r.evidence || {};
	if ( 'unresolved-binding' === r.test && droppedDecls( r ).length ) {
		return tail( `${ e.pseudo ? `:${ e.pseudo } ` : '' }${ droppedDecls( r ).map( ( d ) => `${ d.prop }: ${ d.declared }` ).join( '; ' ) }` );
	}
	return tail( e.declared || e.rule || `a ${ r.kind } in the draft's code` );
}

// What the render does with it.
function renders( r ) {
	const e = r.evidence || {};
	if ( 'unresolved-binding' === r.test ) {
		const props = droppedDecls( r ).map( ( d ) => d.prop );
		return tail( `the {{ }} binding is not resolved where the runtime compiles a ${ r.kind } attribute, so the browser drops ${ props.join( ' and ' ) || 'the declaration' } and the page never paints it${ e.rule ? `; the rule that paints is ${ e.rule }` : '' }` );
	}
	const f = e.forced || {};
	const forced = [ f.pseudo && `:${ f.pseudo }`, f.event, ...( f.state || [] ) ].filter( Boolean );
	return tail( `never reached at ${ ( r.widths || [] ).join( ', ' ) } px, even with ${ forced.length ? `${ forced.join( ', ' ) } forced` : 'hover, focus, state keys and events forced' }${ e.scrollPass ? ' and the scroll pass run' : '' }` );
}

const construct = ( r ) => ( 'unresolved-binding' === r.test && r.evidence?.pseudo ? `${ r.kind } :${ r.evidence.pseudo }` : r.kind );
export const defectKey = ( d ) => `${ d.draftId }|${ d.construct }|${ d.test }`;

// The list entries for one intake: `listed` is Fill's `fill-state-defect.mjs::addDefectLooks` `listed` rows (what the code
// intent was built as), matched by draft ID; `owner` is who fixes the export; `date` is today's.
export function buildDraftDefects( { draftDefects = [], listed = [], owner = OWNER_DEFAULT, date = new Date().toISOString().slice( 0, 10 ) } = {} ) {
	const seen = new Set();
	const out = [];
	for ( const r of defectRows( draftDefects ) ) {
		const entry = { id: r.rowId || `defect:${ r.draftId }`, draftId: r.draftId, construct: construct( r ), test: r.test, declares: declares( r ), renders: renders( r ), owner, widths: r.widths || [], built: null, listedOn: date, sentOn: null };
		const built = listed.filter( ( l ) => l.draftId === r.draftId );
		if ( built.length ) {
			entry.built = built.map( ( l ) => ( { state: l.state, prop: l.prop, values: l.built } ) );
		}
		if ( ! seen.has( defectKey( entry ) ) ) {
			seen.add( defectKey( entry ) );
			out.push( entry );
		}
	}
	return out.sort( ( a, b ) => a.draftId.localeCompare( b.draftId, 'en', { numeric: true } ) || a.construct.localeCompare( b.construct ) );
}

// The list a re-run writes: the fresh entries, each keeping the dates and owner of the entry the earlier file held for the
// same defect (a defect the draft no longer has drops out; one still present is never re-listed as new or as unsent).
export function mergeDraftDefects( fresh, earlier = [] ) {
	const was = new Map( earlier.map( ( d ) => [ defectKey( d ), d ] ) );
	return fresh.map( ( d ) => {
		const old = was.get( defectKey( d ) );
		return old ? { ...d, listedOn: old.listedOn ?? d.listedOn, sentOn: old.sentOn ?? null, owner: old.owner ?? d.owner } : d;
	} );
}

// Why a list is not a valid file, as strings (empty when valid): every entry holds every field, and none of the five
// the request reads is empty.
export function validateDraftDefects( list ) {
	if ( ! Array.isArray( list ) ) {
		return [ 'the list is not an array' ];
	}
	const bad = [];
	list.forEach( ( d, i ) => {
		for ( const f of FIELDS ) {
			if ( ! ( f in d ) ) {
				bad.push( `entry ${ i } (${ d.draftId ?? '?' }) has no ${ f }` );
			}
		}
		for ( const f of [ 'draftId', 'construct', 'declares', 'renders', 'owner' ] ) {
			if ( f in d && ! tail( d[ f ] ) ) {
				bad.push( `entry ${ i } (${ d.draftId ?? '?' }) has an empty ${ f }` );
			}
		}
	} );
	return bad;
}
