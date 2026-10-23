// gaps.json (Spec 48 FR-48-66): sites/<client>/build/qa/gaps.json holds one row per open item, written from the gate
// chain's output (gate-chain.mjs). A row carries each of G0 to G7 with pass, fail or not-reached and its evidence, and a
// row without evidence for a gate it passed, or whose failing gate carries none, is refused when the file is written. A
// row a fresh walk closed (G7) is not an open item and is left out.
import fs from 'fs';
import path from 'path';
import { GATES } from './gate-chain.mjs';

// The class's owner (FR-48-65).
export const OWNERS = {
	'F-setting': 'owning framework spec', 'F-hardcode': 'owning framework spec', 'F-block': 'Spec 02', 'F-vocabulary': 'Spec 32',
	'F-behaviour': 'owning feature spec', 'W-walker': 'Spec 48 §3.6', 'W-route': 'Spec 48', 'I-stale': 'sgs-update-v2.py, calibration',
	'I-unrouted': 'sgs-update-v2.py', 'I-mistag': 'sgs-update-v2.py', 'I-calibration': 'calibration (§3.2)', 'draft-defect': 'Claude Design',
	'render-wins': 'the surface report', CLIENT: 'the client\'s ledger',
};

export const gapsPath = ( client, root ) => path.join( root, 'sites', client, 'build', 'qa', 'gaps.json' );

const STATUS = { pass: 'pass', fail: 'fail', 'not-reached': 'not-reached' };
const text = ( v ) => 'string' === typeof v && '' !== v.trim();

// One gaps.json row from a chain result row ({ key, class, gate, gates, candidate, ref, pair, property, widths, state,
// draftId, block, attribute, declared, renderedDraft, renderedLive }); throws when the row is incomplete.
export function gapRow( r, { surface, publishedOn, firstSeen } ) {
	if ( ! Array.isArray( r.gates ) || r.gates.length !== GATES.length || r.gates.some( ( g, i ) => g.gate !== GATES[ i ] || ! STATUS[ g.status ] ) ) {
		throw new Error( `${ r.key }: the row does not carry G0 to G7 with a status each` );
	}
	const bare = r.gates.find( ( g ) => 'not-reached' !== g.status && ! text( g.evidence ) );
	if ( bare ) {
		throw new Error( `${ r.key }: ${ bare.gate } is ${ bare.status } with no evidence` );
	}
	if ( ! text( r.class ) || ! OWNERS[ r.class ] ) {
		throw new Error( `${ r.key }: class ${ JSON.stringify( r.class ) } is not one of FR-48-65's` );
	}
	if ( r.candidate && r.gates.some( ( g ) => 'pass' !== g.status ) ) {
		throw new Error( `${ r.key }: a framework-gap candidate must pass every gate` );
	}
	if ( ! r.candidate && ! r.gates.some( ( g ) => 'fail' === g.status ) ) {
		throw new Error( `${ r.key }: a row with no framework candidacy must name the gate it failed` );
	}
	return {
		id: `${ surface }:${ r.key }`, class: r.class, owner: OWNERS[ r.class ], surface, draftId: r.draftId ?? null, block: r.block ?? null, attribute: r.attribute ?? null,
		property: r.property ?? null, widths: r.widths ?? [], state: r.state ?? null, declared: r.declared ?? null, renderedDraft: r.renderedDraft ?? null,
		renderedLive: r.renderedLive ?? null, gates: r.gates.map( ( g ) => ( { gate: g.gate, status: g.status, evidence: g.evidence ?? null } ) ),
		firstSeen: firstSeen ?? publishedOn, publishedOn, killed: false, framework: r.class.startsWith( 'F-' ),
	};
}

// Writes gaps.json for a client from the chain's rows. A row an earlier file already holds keeps its firstSeen. Every
// row is checked before the file is touched. Returns { file, rows, dropped } (dropped: rows a fresh walk closed).
export function writeGaps( { file, rows, surface, publishedOn } ) {
	const prior = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { rows: [] };
	const seen = new Map( ( prior.rows || [] ).map( ( r ) => [ r.id, r.firstSeen ] ) );
	const open = rows.filter( ( r ) => 'closed' !== r.class );
	const out = open.map( ( r ) => gapRow( r, { surface, publishedOn, firstSeen: seen.get( `${ surface }:${ r.key }` ) } ) );
	const dup = out.find( ( r, i ) => out.findIndex( ( x ) => x.id === r.id ) !== i );
	if ( dup ) {
		throw new Error( `${ dup.id }: two rows carry the same id` );
	}
	// Rows of other surfaces stay; this surface's rows are replaced.
	const kept = ( prior.rows || [] ).filter( ( r ) => r.surface !== surface );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( { rows: [ ...kept, ...out ] }, null, 1 ) );
	return { file, rows: out, dropped: rows.length - open.length };
}
