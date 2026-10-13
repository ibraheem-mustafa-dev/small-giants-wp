// The intake command's agent-run finaliser step (Spec 48 §3.4 steps 3 and 4, FR-48-17) and its re-render, without any
// browser stage. The command stays deterministic: it never calls a model.
//   --finalise <client>     writes build/intake/finalise-request.json: per surface, lib/skeleton-finalise.mjs::
//                           finaliseRequest over the skeleton rows (after collapsing) that are low confidence or
//                           unresolved and not yet finalised. The session dispatches an agent with
//                           prompts/skeleton-finaliser.md to write finalise-picks.json beside it.
//   --apply-picks <client>  validates finalise-picks.json against the request, intake.json and the framework DB
//                           (read-only); on any invalid pick it writes nothing. Otherwise each picked row's pick becomes
//                           its proposal (`finalisedBy: 'agent'`, the writer's proposal kept as `original`), a picked
//                           unresolved row's missing-feature row proposes the picked block, and intake.json and
//                           review.md are rewritten with every other row's mark kept.
//   --render <client>       re-renders review.md from intake.json.
// `--apply-review` records Bean's confirmed skeleton choices in the client decisions file (reviewDecisions).
import fs from 'fs';
import path from 'path';
import { openDb } from './db.mjs';
import { finaliseRequest, readPicks, recordDecision, skeletonDir } from './skeleton-finalise.mjs';
import { reviewRows, renderReview, readingCounts } from './intake-review.mjs';
import { refreshIntakeSkeletons } from './skeleton-rerun.mjs';

export const FINALISER_PROMPT = 'scripts/computed-route/prompts/skeleton-finaliser.md';
export const LOW_BELOW = 0.7;
const BLOCK = /^[a-z0-9-]+\/[a-z0-9-]+$/;
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );
const writeJson = ( file, v, indent = 1 ) => fs.writeFileSync( file, `${ JSON.stringify( v, null, indent ) }\n` );

// A skeleton row the finaliser decides: low confidence with no action, or unresolved; never one it already picked.
export const needsFinaliser = ( r ) => ! r.finalisedBy && ( ( r.low && ! r.action ) || 'unresolved' === r.action );

// The request for every surface with such rows: { generated, client, prompt, picksFile, picksShape, context, counts,
// surfaces: { <surface>: finaliseRequest(...) } }. intake.json keeps each row's tag, words, a 160-character snippet,
// its top three candidates and its copies, not the full inventory, so each element is built from the row (candidate
// evidence lines are absent); the row's parent, siblings and boxes (null on a row written without them) are copied in, and `neighbours` lists the rows before and after it in the surface.
export function intakeFinaliseRequest( intake, { promptFile = FINALISER_PROMPT } = {} ) {
	const surfaces = {};
	for ( const [ surface, s ] of Object.entries( intake.skeletons || {} ) ) {
		const all = s.rows || [];
		if ( ! all.some( needsFinaliser ) ) {
			continue;
		}
		const inventory = { source: `intake.json skeletons["${ surface }"]`, elements: all.map( ( r ) => ( { key: r.key, parentKey: `\u0000${ r.key }`, tag: r.tag, words: r.words, snippet: r.snippet } ) ) };
		const proposal = { rows: all.map( ( r ) => ( { ...r, low: needsFinaliser( r ) && r.low, action: needsFinaliser( r ) ? r.action : r.action || 'decided' } ) ) };
		const req = finaliseRequest( { inventory, proposal, surface, promptFile } );
		const at = new Map( all.map( ( r, i ) => [ r.key, i ] ) );
		req.rows = req.rows.map( ( x ) => {
			const i = at.get( x.key );
			const r = all[ i ];
			const near = [ all[ i - 1 ], all[ i + 1 ] ].filter( Boolean ).map( ( n ) => ( { key: n.key, tag: n.tag, words: n.words, block: n.block } ) );
			return {
				...x, rowId: r.rowId, draftId: r.draftId, action: r.action ?? null, copies: r.copies ?? 1, keys: r.keys, otherWords: r.otherWords, alsoIn: r.alsoIn, neighbours: near,
				// The writer's inventory context kept on the row (lib/intake-skeletons.mjs::contextOf); null where the record predates it.
				parent: r.parent ?? null, siblings: r.siblings ?? null, siblingCount: r.siblingCount ?? null, boxes: r.boxes ?? null,
			};
		} );
		surfaces[ surface ] = req;
	}
	const rows = Object.values( surfaces ).reduce( ( n, r ) => n + r.rows.length, 0 );
	return {
		generated: new Date().toISOString(), client: intake.client, prompt: promptFile, picksFile: 'finalise-picks.json',
		picksShape: '{ "<surface>": [ <one answerShape entry per row of that surface> ] }',
		context: 'Built from intake.json rows: the element is the row (tag, words, snippet); candidate evidence lines are not kept there. parent, siblings (the nearest 12 in document order; siblingCount is the full number) and boxes (375, 768, 1440; x and y are page coordinates) come from the skeleton inventory, null where it held none. neighbours are the rows before and after it in the surface.',
		counts: { surfaces: Object.keys( surfaces ).length, rows }, surfaces,
	};
}

// Every problem with a picks file against the request and the current intake.json: [ '<surface> <key>: why' ].
export function picksProblems( picks, request, intake, knownBlock ) {
	if ( ! picks || 'object' !== typeof picks || Array.isArray( picks ) ) {
		return [ `finalise-picks.json must be ${ request.picksShape }` ];
	}
	const out = [];
	for ( const [ surface, list ] of Object.entries( picks ) ) {
		const req = request.surfaces?.[ surface ];
		if ( ! req ) {
			out.push( `${ surface }: not a surface of the finalise request` );
			continue;
		}
		if ( ! Array.isArray( list ) ) {
			out.push( `${ surface }: the picks are not a list` );
			continue;
		}
		const asked = new Set( req.rows.map( ( r ) => r.key ) );
		const seen = new Set();
		for ( const p of list ) {
			const at = `${ surface } ${ p?.key ?? '(no key)' }`;
			const row = ( intake.skeletons?.[ surface ]?.rows || [] ).find( ( r ) => r.key === p?.key );
			if ( ! asked.has( p?.key ) ) {
				out.push( `${ at }: not a row of the finalise request` );
			} else if ( seen.has( p.key ) ) {
				out.push( `${ at }: picked twice` );
			} else if ( ! row || ! needsFinaliser( row ) ) {
				out.push( `${ at }: no longer a row awaiting the finaliser in intake.json (run --finalise again)` );
			} else if ( true !== p.remove && ! p.block ) {
				out.push( `${ at }: names neither a block nor remove` );
			} else if ( p.block && ( true === p.remove || ! BLOCK.test( p.block ) || ! knownBlock( p.block ) ) ) {
				out.push( `${ at }: ${ true === p.remove ? 'names both a block and remove' : `${ p.block } is not a block in the framework database` }` );
			} else if ( null != p.confidence && ! ( Number( p.confidence ) >= 0 && Number( p.confidence ) <= 1 ) ) {
				out.push( `${ at }: confidence ${ JSON.stringify( p.confidence ) } is not between 0 and 1` );
			} else if ( null != p.attributes && ( 'object' !== typeof p.attributes || Array.isArray( p.attributes ) ) ) {
				out.push( `${ at }: attributes must be an object` );
			}
			p?.key && seen.add( p.key );
		}
	}
	return out;
}

// intake with the (valid) picks applied, and the review rebuilt: a row whose content hash is unchanged keeps its entry;
// a picked row is unmarked (Bean has not seen the pick). Returns { intake, applied, missing }.
export function applyIntakePicks( intake, picks ) {
	const next = structuredClone( intake );
	const picked = [];
	for ( const [ surface, list ] of Object.entries( picks ) ) {
		for ( const p of list ) {
			const rows = next.skeletons[ surface ].rows;
			const i = rows.findIndex( ( r ) => r.key === p.key );
			const r = rows[ i ];
			const confidence = Math.min( 0.95, Number( p.confidence ?? 0.8 ) );
			rows[ i ] = {
				...r, block: true === p.remove ? null : p.block, action: true === p.remove ? 'remove' : null, confidence, low: confidence < LOW_BELOW, reason: String( p.reason || '' ),
				...( p.attributes && Object.keys( p.attributes ).length ? { attributes: p.attributes } : {} ), finalisedBy: 'agent',
				original: { block: r.block ?? null, action: r.action ?? null, confidence: r.confidence ?? null, low: r.low ?? null, reason: r.reason ?? null, candidates: r.candidates ?? [] },
			};
			picked.push( { surface, row: rows[ i ], was: r } );
		}
	}
	let missing = 0;
	for ( const { surface, row, was } of picked.filter( ( x ) => 'unresolved' === x.was.action ) ) {
		next.missingFeatures = ( next.missingFeatures || [] ).map( ( m ) => {
			if ( 'skeleton' !== m.from || m.draftId !== was.draftId ) {
				return m;
			}
			missing++;
			return { ...m, ...( row.block ? { block: row.block } : {} ), resolvedByPick: { surface, key: row.key, ...( row.block ? { block: row.block } : { remove: true } ) } };
		} );
	}
	const prior = new Map( ( intake.review || [] ).map( ( r ) => [ r.rowId, r ] ) );
	const pickedIds = new Set( picked.map( ( x ) => x.row.rowId ) );
	next.review = reviewRows( next ).map( ( r ) => {
		const old = prior.get( r.rowId );
		if ( old && old.contentHash === r.contentHash && ! pickedIds.has( r.rowId ) ) {
			return old;
		}
		return { rowId: r.rowId, rowType: r.rowType, contentHash: r.contentHash, mark: null, markedOn: null, carriedFrom: null };
	} );
	return { intake: next, applied: picked.length, missing };
}

// The skeleton choices --apply-review saves in the client decisions file (§3.4 step 4): a row Bean marked
// `block:<slug>` (his correction), and a finaliser pick he accepted. A confident writer proposal he accepted is not
// saved: it already follows from the framework DB, so a decision would add no evidence the next run lacks. Each copy of
// a collapsed row is saved under its own element key when the copies share one text; otherwise only the first copy
// (the element signature is tag and words, so a copy with other words would read as stale). Returns
// [ { surface, element: { key, tag, words }, choice, reason } ].
export function reviewDecisions( intake, today ) {
	const marks = new Map( ( intake.review || [] ).map( ( r ) => [ r.rowId, r.mark ] ) );
	const out = [];
	for ( const [ surface, s ] of Object.entries( intake.skeletons || {} ) ) {
		for ( const r of s.rows || [] ) {
			const mark = marks.get( r.rowId || `skeleton:${ surface }:${ r.key }` ) ?? null;
			const own = /^block:(.+)$/.exec( mark || '' )?.[ 1 ];
			const accepted = 'accept' === mark && 'agent' === r.finalisedBy;
			const removed = 'remove' === mark;
			if ( ! own && ! accepted && ! removed ) {
				continue;
			}
			const choice = own ? { block: own } : removed || 'remove' === r.action ? { remove: true } : { block: r.block, ...( r.attributes ? { attributes: r.attributes } : {} ) };
			const reason = own ? `Bean marked block:${ own } in the intake review on ${ today }` : removed ? `Bean marked remove in the intake review on ${ today }: the element is absorbed into its parent block` : `Bean accepted the finaliser's pick in the intake review on ${ today }: ${ r.reason || '' }`.trim();
			const one = Boolean( r.distinctWords && r.distinctWords > 1 );
			const homes = [ { surface, keys: r.keys || [ r.key ] }, ...( one ? [] : r.alsoIn || [] ) ];
			for ( const h of homes ) {
				for ( const key of one ? h.keys.slice( 0, 1 ) : h.keys ) {
					out.push( { surface: h.surface, element: { key, tag: r.tag, words: r.words ?? '' }, choice, reason } );
				}
			}
		}
	}
	return out;
}

// knownBlock over the framework DB (read-only): a slug in `blocks` or `block_composition`. Returns { known, close }.
export function dbKnownBlock() {
	const db = openDb();
	const q = ( sql, s ) => db.prepare( sql ).all( s ).length > 0;
	return { known: ( s ) => q( 'SELECT 1 FROM blocks WHERE slug = ?', s ) || q( 'SELECT 1 FROM block_composition WHERE block_slug = ?', s ), close: () => db.close() };
}

export const decisionsFile = ( repo, client ) => path.join( skeletonDir( repo, client ), 'decisions.json' );

// Writes each decision through recordDecision. Returns how many elements were recorded.
export function recordReviewDecisions( decisions, file ) {
	decisions.forEach( ( d ) => recordDecision( { file, surface: d.surface, element: d.element, choice: d.choice, reason: d.reason } ) );
	return decisions.length;
}

const countLine = ( intake ) => {
	const c = readingCounts( intake );
	return `${ c.total } rows: ${ c.read } need reading, ${ c.confident } confident proposals Accept all covers (skeleton ${ c.skeleton }, missing features ${ c.missing })`;
};

// --finalise. Returns the exit code.
export function runFinalise( at, o, { log } ) {
	const say = ( l ) => log( `[intake --finalise] ${ l }` );
	if ( ! fs.existsSync( at.intake ) ) {
		say( `${ at.intake } is missing: run the intake first` );
		return 1;
	}
	const req = intakeFinaliseRequest( readJson( at.intake ) );
	const file = path.join( at.dir, 'finalise-request.json' );
	writeJson( file, req, '\t' );
	const bytes = fs.statSync( file ).size;
	say( `${ o.client }: ${ req.counts.rows } low-confidence or unresolved skeleton rows on ${ req.counts.surfaces } surfaces (${ ( bytes / 1024 ).toFixed( 0 ) } KB) written to ${ file }` );
	say( req.counts.rows ? `next: dispatch an agent with ${ FINALISER_PROMPT } to write ${ path.join( at.dir, 'finalise-picks.json' ) } (shape ${ req.picksShape }), then run intake.mjs --apply-picks ${ o.client }` : 'nothing for the finaliser to decide' );
	return 0;
}

// --apply-picks. `knownBlock` defaults to the framework DB. Returns the exit code.
export function runApplyPicks( at, o, { log, recordProblems, knownBlock = null } ) {
	const say = ( l ) => log( `[intake --apply-picks] ${ l }` );
	const files = { request: path.join( at.dir, 'finalise-request.json' ), picks: path.join( at.dir, 'finalise-picks.json' ) };
	for ( const f of [ at.intake, files.request, files.picks ] ) {
		if ( ! fs.existsSync( f ) ) {
			say( `${ f } is missing: ${ f === at.intake ? 'run the intake first' : f === files.request ? `run --finalise ${ o.client } first` : 'the finaliser agent has not written its picks' }` );
			return 1;
		}
	}
	let picks;
	try {
		picks = readPicks( files.picks );
	} catch ( e ) {
		say( `finalise-picks.json does not parse (${ e.message }); nothing written` );
		return 1;
	}
	const intake = readJson( at.intake );
	const db = knownBlock ? null : dbKnownBlock();
	let problems;
	try {
		problems = picksProblems( picks, readJson( files.request ), intake, knownBlock || db.known );
	} finally {
		db?.close();
	}
	if ( problems.length ) {
		say( `invalid picks, nothing written:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	const res = applyIntakePicks( intake, picks );
	const bad = recordProblems( res.intake );
	if ( bad.length ) {
		say( `the record with the picks applied does not validate, nothing written:\n${ bad.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	writeJson( at.intake, res.intake );
	fs.writeFileSync( at.review, renderReview( res.intake ) );
	const asked = Object.values( readJson( files.request ).surfaces ).reduce( ( n, r ) => n + r.rows.length, 0 );
	say( `${ o.client }: ${ res.applied } picks applied (${ asked - res.applied } request rows left as proposed), ${ res.missing } missing-feature rows carry the pick (a picked block becomes their proposal); review.md rewritten, ${ countLine( res.intake ) }` );
	return 0;
}

// --render. Returns the exit code.
export function runRender( at, o, { log } ) {
	if ( ! fs.existsSync( at.intake ) ) {
		log( `[intake --render] ${ at.intake } is missing: run the intake first` );
		return 1;
	}
	const intake = readJson( at.intake );
	fs.writeFileSync( at.review, renderReview( intake ) );
	log( `[intake --render] ${ o.client }: review.md rewritten from intake.json; ${ countLine( intake ) }` );
	return 0;
}

// --rerun-skeletons (Spec 48 FR-48-6): the skeleton rows proposed again offline from the inventories the last run saved,
// with today's standing rules and database (lib/skeleton-rerun.mjs::refreshIntakeSkeletons); every other part of
// intake.json is kept. The finaliser request is rewritten for the rows that still await it, and the earlier picks for
// those rows are carried over (a row a rule now settles drops its pick). The previous record is kept as intake.prev.json.
// Returns the exit code.
export function runRerunSkeletons( at, o, { log, recordProblems } ) {
	const say = ( l ) => log( `[intake --rerun-skeletons] ${ l }` );
	if ( ! fs.existsSync( at.intake ) ) {
		say( `${ at.intake } is missing: run the intake first` );
		return 1;
	}
	const intake = readJson( at.intake );
	const db = openDb();
	let res;
	try {
		res = refreshIntakeSkeletons( { intake, client: o.client, db, repo: o.repo } );
	} catch ( e ) {
		say( `the skeletons could not be proposed again: ${ e.message }` );
		return 1;
	} finally {
		db.close();
	}
	res.missing.length && say( `no saved inventory for ${ res.missing.join( ', ' ) }: those surfaces keep their rows (run the intake to save them)` );
	let next = res.intake;
	const request = intakeFinaliseRequest( next );
	const files = { request: path.join( at.dir, 'finalise-request.json' ), picks: path.join( at.dir, 'finalise-picks.json' ) };
	let carried = 0;
	if ( fs.existsSync( files.picks ) ) {
		const awaiting = ( s, key ) => ( request.surfaces?.[ s ]?.rows || [] ).some( ( r ) => r.key === key );
		const keep = Object.fromEntries( Object.entries( readPicks( files.picks ) ).map( ( [ s, list ] ) => [ s, ( list || [] ).filter( ( p ) => awaiting( s, p?.key ) ) ] ).filter( ( [ , list ] ) => list.length ) );
		const kb = dbKnownBlock();
		let problems;
		try {
			problems = picksProblems( keep, request, next, kb.known );
		} finally {
			kb.close();
		}
		if ( problems.length ) {
			say( `the earlier picks were not carried over:\n${ problems.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		} else {
			next = applyIntakePicks( next, keep ).intake;
			carried = Object.values( keep ).reduce( ( n, l ) => n + l.length, 0 );
		}
	}
	const bad = recordProblems( next );
	if ( bad.length ) {
		say( `the record does not validate, nothing written:\n${ bad.map( ( p ) => `  - ${ p }` ).join( '\n' ) }` );
		return 1;
	}
	fs.copyFileSync( at.intake, at.prev );
	writeJson( at.intake, next );
	writeJson( files.request, request, '\t' );
	fs.writeFileSync( at.review, renderReview( next ) );
	say( `${ o.client }: ${ res.before } rows, ${ res.after } after collapsing; ${ request.counts.rows } still await the finaliser, ${ carried } earlier picks carried over; review.md rewritten, ${ countLine( next ) }` );
	return 0;
}
