// The live side of the state check (Spec 48 FR-48-81, FR-48-46): the draft and the live page are opened as the
// pairing command opens them (lib/pairs-page.mjs::openDraft, ::openLive, with the walker config's navigation), each
// side's paired elements are read by the same state reader (lib/fill-state-read.mjs::readStates) at every read width,
// and lib/state-check.mjs::checkStates compares them. The live resting value is read for every property the draft's
// states change, so a live page that never styles a state's property shows its resting value and the row differs,
// rather than going unread.
import { openDraft, openLive } from './pairs-page.mjs';
import { openDevtools, declaredValues } from '../../parity/lib/devtools.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { readStates } from './fill-state-read.mjs';
import { renderedOf } from './fill-state-apply.mjs';
import { checkStates, stateSummary } from './state-check.mjs';
import { READ_WIDTHS, loadChromium } from './fill-read.mjs';

const RESOLVE = resolveFinder.toString();

// The walker config's pairs a state read follows: a selector on both sides (a group or text-run pair measures words,
// not one element) and no walker-state scope (the pages are read at rest). Each pair gets one job id per side.
export function statePairs( cfg ) {
	return ( cfg.pairs || [] )
		.filter( ( p ) => 'string' === typeof p.draft && 'string' === typeof p.live && ! p.states?.length )
		.map( ( p, i ) => ( { name: p.name, draft: `d${ i }`, live: `l${ i }`, draftFinder: p.draft, liveFinder: p.live } ) );
}

// One side at the page's current width: each job's resting declared values (what a state look is diffed against) and
// its state looks; with `want` ({ jobId: [prop] }), each job's rendered resting value of those properties too.
export async function readSide( page, jobs, rows, want = null, log = () => {} ) {
	const cdp = await openDevtools( page );
	const rest = {};
	for ( const j of jobs ) {
		rest[ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, null ).catch( () => null );
	}
	const states = await readStates( { page, cdp, jobs, rows, rest, resolveSrc: RESOLVE, log } );
	const rendered = {};
	for ( const [ id, props ] of Object.entries( want || {} ) ) {
		const j = jobs.find( ( x ) => x.id === id );
		rendered[ id ] = j && props.length ? await page.evaluate( renderedOf, [ j.finder, RESOLVE, props ] ).catch( () => null ) : null;
	}
	return { states, rendered };
}

// The properties each live job must be read for: every property any of its draft partner's state looks changes.
export function wantedProps( draftRead, pairs ) {
	return Object.fromEntries( pairs.map( ( p ) => [ p.live, [ ...new Set( ( draftRead.looks?.[ p.draft ] || [] ).flatMap( ( l ) => Object.keys( l.declared ) ) ) ] ] ) );
}

// The state check over a surface's walker config: { rows, summary, pairs } where rows are lib/state-check.mjs's rows
// carrying each pair's name. browser: a launched Chromium; cfg: the walker config (draft, live, pairs); rows: the state
// vocabulary (lib/db.mjs::statesVocabulary).
export async function liveStateCheck( { browser, cfg, rows, widths = READ_WIDTHS, log = () => {} } ) {
	const pairs = statePairs( cfg );
	const draftJobs = pairs.map( ( p ) => ( { id: p.draft, finder: p.draftFinder } ) );
	const liveJobs = pairs.map( ( p ) => ( { id: p.live, finder: p.liveFinder } ) );
	const draft = {};
	const live = {};
	const liveRest = {};
	for ( const width of widths ) {
		const d = await openDraft( browser, cfg, width );
		try {
			draft[ width ] = ( await readSide( d, draftJobs, rows, null, log ) ).states;
		} finally {
			await d.close();
		}
		const l = await openLive( browser, cfg, width );
		try {
			const side = await readSide( l, liveJobs, rows, wantedProps( draft[ width ], pairs ), log );
			live[ width ] = side.states;
			liveRest[ width ] = side.rendered;
		} finally {
			await l.close();
		}
		log( `state check ${ width }px: ${ Object.keys( draft[ width ].looks ).length } draft and ${ Object.keys( live[ width ].looks ).length } live elements with a state look` );
	}
	const names = Object.fromEntries( pairs.map( ( p ) => [ p.draft, p.name ] ) );
	const checked = checkStates( { draft, live, liveRest, pairs: pairs.map( ( p ) => ( { draft: p.draft, live: p.live } ) ) } ).map( ( r ) => ( { pair: names[ r.draft ], ...r } ) );
	return { rows: checked, summary: stateSummary( checked, draft ), pairs: pairs.length };
}

// Solve's state check (solve.mjs): the check in its own browser, as the report part; with no states table in the DB it
// reads nothing and the report says why.
export async function surfaceStateCheck( { cfg, vocab, headless = true, log = () => {} } ) {
	if ( vocab.missing ) {
		return { json: { off: vocab.missing }, markdown: `## States (FR-48-81)\n\nNot checked: ${ vocab.missing }.` };
	}
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless } );
	try {
		return stateReport( await liveStateCheck( { browser, cfg, rows: vocab.rows, log } ) );
	} finally {
		await browser.close();
	}
}

// The report part: the summary and every row that is not a match (differs, then unreadable).
export function stateReport( check ) {
	const open = check.rows.filter( ( r ) => 'match' !== r.verdict ).sort( ( a, b ) => ( a.verdict === b.verdict ? 0 : 'differs' === a.verdict ? -1 : 1 ) );
	const md = [
		`## States (FR-48-81)`,
		'',
		`${ check.pairs } pairs read: ${ check.summary.match } match, ${ check.summary.differs } differ, ${ check.summary.unreadable } unreadable.`,
		...( check.summary.unreachedDraft.length ? [ '', `Draft states no page can enter: ${ [ ...new Set( check.summary.unreachedDraft.map( ( u ) => u.selector ) ) ].join( ', ' ) }` ] : [] ),
		...( open.length ? [ '', '| Pair | Width | State | Property | Draft | Live | Verdict |', '|---|---|---|---|---|---|---|', ...open.map( ( r ) => `| ${ r.pair } | ${ r.width } | ${ r.state } | ${ r.prop } | ${ r.draftValue } | ${ r.liveValue ?? '(none)' }${ r.liveState ? '' : ' (no live state look)' } | ${ r.verdict } |` ) ] : [] ),
	];
	return { json: { summary: check.summary, pairs: check.pairs, open }, markdown: md.join( '\n' ) };
}
