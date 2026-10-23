// The conservation check of a Fill run (plan register R7): every property the draft's code declares on a paired part
// (the run's read set, reads.json) must end written, held or unwritten (the run's outcome rows); one that ends in none of
// the three was dropped silently. Written rows come from `writes` and the confirm records, held rows from `alreadyHeld`
// and the divergence ledger, unwritten rows from unmapped.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { CSS_WIDE } from './fill-declared.mjs';

const MDN = createRequire( import.meta.url )( 'mdn-data/css/properties.json' );

export const READ_FILE = 'reads.json';
export const READ_VERSION = 1;
// The read set holds the draft's rest look; a state look is judged by the state check, not here.
export const STATE = 'rest';
const MOTION = /^(?:transition|animation)(?:-|$)/;
// Writes of the motion writers carry no per-property row; they answer every transition and animation longhand of their element.
const MOTION_HOW = [ 'motion', 'fill-timing' ];

const longhandCache = new Map();
// A property and every longhand it sets, through nested shorthands (`border` reaches `border-top-width`).
export function longhandsOf( property ) {
	if ( ! longhandCache.has( property ) ) {
		const list = MDN[ property ]?.computed;
		longhandCache.set( property, Array.isArray( list ) ? [ property, ...list.filter( ( l ) => l !== property ).flatMap( longhandsOf ) ] : [ property ] );
	}
	return longhandCache.get( property );
}

const at = ( node, slot ) => `${ node }|${ slot ?? '' }`;

// The outcome rows of a run as { node, slot, property, widths (null = every width), outcome, how }. `report` is
// fill-report.json, `unmapped` is unmapped.json. State rows are left out: the read set is the rest look.
export function outcomesOf( { report, unmapped } ) {
	const out = [];
	for ( const w of report.writes || [] ) {
		w.state || out.push( { node: w.node, slot: w.slot, property: w.prop, widths: w.widths?.length ? w.widths : null, outcome: 'written', how: w.how } );
	}
	for ( const c of report.confirm || [] ) {
		( ! c.state || 'default' === c.state ) && out.push( { node: c.node, slot: c.slot, property: c.property, widths: [ c.width ], outcome: 'written', how: 'confirm' } );
	}
	for ( const h of report.alreadyHeld || [] ) {
		h.state || out.push( { node: h.node, slot: h.slot, property: h.property, widths: null, outcome: 'held', how: h.reason } );
	}
	for ( const l of report.ledger || [] ) {
		out.push( { node: l.node, slot: l.slot, property: l.prop, widths: null === l.width || undefined === l.width ? null : [ l.width ], outcome: 'held', how: 'ledger' } );
	}
	for ( const u of unmapped || [] ) {
		out.push( { node: u.node, slot: u.slot, property: u.property, widths: null, outcome: 'unwritten', how: 'unmapped' } );
	}
	return out;
}

// Whether one outcome row answers one read: same element, a property that is the read's or a shorthand setting it, and a
// width it states (an outcome with no width answers every width: unmapped and held rows carry none).
function answers( o, read ) {
	if ( o.widths && ! o.widths.includes( read.width ) ) {
		return false;
	}
	if ( MOTION.test( read.property ) && ( MOTION_HOW.includes( o.how ) || MOTION.test( o.property || '' ) ) ) {
		return true;
	}
	return !! o.property && longhandsOf( o.property ).includes( read.property );
}

// The conservation verdict of a read set against a run's outcomes.
// reads: [ { draft, node, block, slot, property, width, value } ]. Returns { reads, excluded, conserved, failures }:
// `excluded` counts the reads that are not declared values (a CSS-wide keyword is how Chrome lists the longhands a
// shorthand leaves implied), `failures` is every other read that no outcome answers.
export function conservation( { reads, report, unmapped } ) {
	const index = new Map();
	for ( const o of outcomesOf( { report, unmapped } ) ) {
		const k = at( o.node, o.slot );
		index.has( k ) ? index.get( k ).push( o ) : index.set( k, [ o ] );
	}
	const failures = [];
	let conserved = 0;
	let cssWide = 0;
	for ( const read of reads ) {
		if ( CSS_WIDE.test( String( read.value ).trim() ) ) {
			cssWide++;
		} else if ( ( index.get( at( read.node, read.slot ) ) || [] ).some( ( o ) => answers( o, read ) ) ) {
			conserved++;
		} else {
			failures.push( { draft: read.draft, block: read.block, node: read.node, slot: read.slot ?? '', property: read.property, value: read.value, width: read.width, state: STATE } );
		}
	}
	return { reads: reads.length, excluded: { cssWide }, conserved, failures };
}

// The failures grouped by block then property: [ { block, property, count, rows } ], largest first within a block.
export function groupFailures( failures ) {
	const by = new Map();
	for ( const f of failures ) {
		const k = `${ f.block }|${ f.property }`;
		by.has( k ) || by.set( k, { block: f.block, property: f.property, count: 0, rows: [] } );
		const g = by.get( k );
		g.count++;
		g.rows.push( f );
	}
	return [ ...by.values() ].sort( ( a, b ) => a.block.localeCompare( b.block ) || b.count - a.count || a.property.localeCompare( b.property ) );
}

// Validates a parsed reads.json and returns its rows; throws with the reason when it is not the shape the check reads.
export function readRowsOf( raw, file = READ_FILE ) {
	const bad = ( why ) => {
		throw new Error( `${ file } is not a read set: ${ why }` );
	};
	if ( ! raw || READ_VERSION !== raw.version || ! Array.isArray( raw.rows ) ) {
		bad( `expected { version: ${ READ_VERSION }, rows: [] }` );
	}
	raw.rows.forEach( ( r, i ) => {
		for ( const k of [ 'node', 'block', 'property' ] ) {
			( 'string' === typeof r?.[ k ] && r[ k ] ) || bad( `row ${ i } has no ${ k }` );
		}
		'string' === typeof r.slot || bad( `row ${ i } has no slot (use "" for the block root)` );
		Number.isFinite( r.width ) || bad( `row ${ i } has no numeric width` );
		( undefined !== r.value && null !== r.value ) || bad( `row ${ i } has no value` );
	} );
	return raw.rows;
}

// Reads a Fill run folder: { status: 'checked', ...conservation } or { status: 'no-read-set', reason, failures: [] } when
// the run holds no reads.json (written before Fill saved its read set), which is reported, never counted clean.
export function conservationRun( dir ) {
	const file = path.join( dir, READ_FILE );
	if ( ! fs.existsSync( file ) ) {
		return { status: 'no-read-set', reason: `${ READ_FILE } is not in the run folder, so what the draft declared is unknown`, reads: 0, excluded: { cssWide: 0 }, conserved: 0, failures: [] };
	}
	const read = ( f ) => JSON.parse( fs.readFileSync( path.join( dir, f ), 'utf8' ) );
	const raw = read( READ_FILE );
	const report = read( 'fill-report.json' );
	if ( raw.client !== report.client || raw.surface !== report.surface ) {
		throw new Error( `${ READ_FILE } is the read set of ${ raw.client }/${ raw.surface }, but the run is ${ report.client }/${ report.surface }` );
	}
	return { status: 'checked', ...conservation( { reads: readRowsOf( raw, file ), report, unmapped: read( 'unmapped.json' ) } ) };
}
