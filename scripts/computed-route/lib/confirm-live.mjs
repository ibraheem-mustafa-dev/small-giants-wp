// The rendered-live half of the confirm record (Spec 48 FR-48-36). Fill writes the record with the declared and
// rendered-draft values (D–R) before the page is built; once Solve has walked the built page this module reads each
// record's element on the live page, compares it with the rendered draft value within the rendered tolerance (R–L,
// lengths ±1px) and gives the verdict table's answer. A live element is found the way the walker pairs it: the pair
// whose live trace names the record's node and element path, never a word match. A value that cannot be read or compared
// leaves the row `open` with the reason; no unreadable input confirms a value.
import fs from 'fs';
import path from 'path';
import { compareDR, TOLERANCE } from './fill-confirm.mjs';

// The rendered tolerance (FR-48-36): ±1px for lengths in place of the declared ±0.5px.
export const RENDERED_TOL = 1;

// R–L for one property: { rl: 'agree' | 'disagree' | 'unreadable', tolerance }.
export function compareRL( prop, renderedDraft, renderedLive, fontPx = 16 ) {
	const empty = ( v ) => null == v || '' === String( v ).trim();
	if ( empty( renderedDraft ) || empty( renderedLive ) ) {
		return { rl: 'unreadable', tolerance: null };
	}
	const c = compareDR( prop, renderedDraft, renderedLive, fontPx, { tol: RENDERED_TOL, rendered: true } );
	return { rl: c.dr, tolerance: 'length' === c.type ? `${ RENDERED_TOL }px` : TOLERANCE[ c.type ] ?? null };
}

// The verdict table. dr: the D–R result a record holds ('agree', 'runtime', 'disagree', 'no-declared', 'unreadable',
// 'no-target'); fr34Passes: intake lists the declaration as never painting (the record's D–R verdict was draft-defect);
// rl: R–L's result. Returns { verdict, pending, reason }.
export function liveVerdict( dr, fr34Passes, rl ) {
	if ( 'disagree' === dr && fr34Passes ) {
		return { verdict: 'draft-defect', pending: null, reason: null };
	}
	if ( 'unreadable' === rl ) {
		return { verdict: 'open', pending: null, reason: 'the live value could not be read or compared' };
	}
	if ( 'no-declared' === dr ) {
		return 'agree' === rl ? { verdict: 'confirmed', pending: null, reason: null } : { verdict: 'open', pending: null, reason: 'rendered draft and live disagree' };
	}
	if ( 'agree' === dr || 'runtime' === dr ) {
		return 'agree' === rl ? { verdict: 'confirmed', pending: null, reason: null } : { verdict: 'open', pending: null, reason: 'declared agrees with the draft render; the live page does not' };
	}
	if ( 'disagree' === dr ) {
		return 'agree' === rl ? { verdict: 'render-wins', pending: null, reason: null } : { verdict: 'open', pending: 'render-wins', reason: 'declared and rendered draft disagree and the live page does not show the draft render' };
	}
	return { verdict: 'open', pending: null, reason: `D–R is ${ dr }` };
}

// The walker states that hold the rest setting state, from the surface's state map ({ walker state: setting state });
// null = every state (no map).
export function restStates( stateMap ) {
	return stateMap ? Object.keys( stateMap ).filter( ( s ) => null === stateMap[ s ] ) : null;
}

// The live pair for a record at a width: { name, live } or { why }. A pair counts when its live trace names the record's
// node and the record's element path in a rest state; a node the walker marked mispaired, or two pairs naming the same
// element, read nothing.
export function livePair( report, record, width, rest ) {
	const base = String( record.slot ?? '' ).replace( /::(?:before|after)$/, '' );
	const found = [];
	let mispaired = false;
	for ( const run of report?.runs || [] ) {
		if ( run.width !== width || ( rest && ! rest.includes( run.state ) ) ) {
			continue;
		}
		for ( const [ name, p ] of Object.entries( run.pairs || {} ) ) {
			const t = p?.live?.trace;
			if ( name.startsWith( '(' ) || ! t || t.ref !== record.node ) {
				continue;
			}
			// The pair's draft side, where the walker states it, must be the record's draft element.
			const sideId = p.draftId ?? p.draft?.draftId ?? null;
			if ( null != sideId && null != record.draftId && sideId !== record.draftId ) {
				continue;
			}
			mispaired ||= ( p.diffs || [] ).some( ( d ) => d.mispaired );
			if ( ( t.path ?? '' ) === base && ! p.live.missing ) {
				// The same pair read in two state runs (rest and hover at one width) is one live element.
				const id = `${ name }|${ t.ref }|${ t.path ?? '' }`;
				found.some( ( x ) => x.id === id ) || found.push( { id, name, live: p.live } );
			}
		}
	}
	if ( mispaired ) {
		return { why: 'mispaired' };
	}
	if ( 1 !== found.length ) {
		return { why: found.length ? 'ambiguous-pair' : 'no-live-element' };
	}
	return { name: found[ 0 ].name, live: found[ 0 ].live };
}

// The records with the live half filled: renderedLive, rl, rlTolerance, the verdict from the table and, where the table
// says so, pending. Records with no width (no target) pass through open.
export function fillLive( records, report, { stateMap = null } = {} ) {
	const rest = restStates( stateMap );
	return records.map( ( rec ) => {
		if ( null == rec.width || 'no-target' === rec.dr ) {
			return { ...rec };
		}
		const layer = /::(?:before|after)$/.exec( String( rec.slot ?? '' ) )?.[ 0 ] ?? null;
		const hit = livePair( report, rec, rec.width, rest );
		const live = hit.live ? ( layer ? hit.live.pseudo?.[ layer ]?.[ rec.property ] : hit.live.styles?.[ rec.property ] ) ?? null : null;
		const { rl, tolerance } = compareRL( rec.property, rec.renderedDraft, live, parseFloat( hit.live?.styles?.[ 'font-size' ] ) || 16 );
		const v = liveVerdict( rec.dr, 'draft-defect' === rec.verdict, rl );
		return { ...rec, renderedLive: live, rl, rlTolerance: tolerance, ...( hit.why ? { liveWhy: hit.why } : {} ), verdict: v.verdict, pending: v.pending, ...( v.reason ? { reason: v.reason } : {} ) };
	} );
}

// Reads a Fill report's confirm records, fills the live half from the final walk and writes confirm-live.json beside
// Solve's report. Returns { file, counts: { verdict: n } }. A Fill report without a `confirm` list is an error, never
// an empty pass.
export function writeConfirmLive( outDir, fillReportFile, report, opts = {} ) {
	const fillReport = JSON.parse( fs.readFileSync( fillReportFile, 'utf8' ) );
	if ( ! Array.isArray( fillReport.confirm ) ) {
		throw new Error( `${ fillReportFile } has no confirm records` );
	}
	const records = fillLive( fillReport.confirm, report, opts );
	const counts = {};
	records.forEach( ( r ) => ( counts[ r.verdict ] = ( counts[ r.verdict ] ?? 0 ) + 1 ) );
	const file = path.join( outDir, 'confirm-live.json' );
	fs.writeFileSync( file, JSON.stringify( { counts, confirm: records }, null, 1 ) );
	return { file, counts };
}
