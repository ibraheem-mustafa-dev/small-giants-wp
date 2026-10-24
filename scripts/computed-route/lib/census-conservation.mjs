// The conservation check of a Fill run (plan register R7): every property the draft's code declares on a paired part
// (the run's read set, reads.json) must end written, held or unwritten (the run's outcome rows); one that ends in none of
// the three was dropped silently. Written rows come from `writes` and the confirm records, held rows from `alreadyHeld`,
// the divergence ledger and `settled` (a read Fill left with nothing to write, each with its reason and widths), unwritten
// rows from unmapped.json. A row read on one element and written on another carries the read element as `readSlot` (and a
// write whose `prop` is a label, a scoped rule, names the property it answers as `covers`; a write's `answers` are the
// read widths it leaves showing the draft's value beyond the tiers it changes), and
// one unmapped row the row lift raises once for several icons names them all in `nodes`. A read set is checked only while it is bound to its run.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { CSS_WIDE } from './fill-declared.mjs';
import { refOf, walk } from './tree.mjs';

const MDN = createRequire( import.meta.url )( 'mdn-data/css/properties.json' );
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );

export const READ_FILE = 'reads.json';
// Version 2 carries the run binding (run, inputs); a version 1 read set is unbound and refused.
export const READ_VERSION = 2;
const INPUTS = [ 'skeleton', 'draft' ];

// The sha256 of a file's bytes.
export const fileSha = ( file ) => createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
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

// The outcome rows of a run as { node, slot, readSlot, property, widths (null = every width), outcome, how }. `report` is
// fill-report.json, `unmapped` is unmapped.json. State rows are left out: the read set is the rest look.
export function outcomesOf( { report, unmapped } ) {
	const out = [];
	for ( const w of report.writes || [] ) {
		const widths = [ ...new Set( [ ...( w.widths || [] ), ...( w.answers || [] ) ] ) ];
		w.state || out.push( { node: w.node, slot: w.slot, readSlot: w.readSlot, property: w.covers ?? w.prop, widths: widths.length ? widths : null, outcome: 'written', how: w.how } );
	}
	for ( const s of report.settled || [] ) {
		// A settled row answers the widths it records, and none when it records none.
		out.push( { node: s.node, slot: s.slot, readSlot: s.readSlot, property: s.property, widths: s.widths?.length ? s.widths : [], outcome: 'held', how: `settled:${ s.reason }` } );
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
		for ( const node of u.nodes?.length ? u.nodes : [ u.node ] ) {
			out.push( { node, slot: u.slot, property: u.property, widths: null, outcome: 'unwritten', how: 'unmapped' } );
		}
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

// The writers that act on a row the generic pass left UNMAPPED (fill.mjs's later passes): a write of theirs says the
// element did not already show the value.
const PASS_HOW = [ 'logo-size', 'width-ladder', 'width-gate', 'dimension' ];

// Why the outcomes answering one read contradict each other, or null: the run calls the read `equal` (the element already
// shows it) and also leaves it unwritten or writes it in a later pass.
function contradiction( by ) {
	const equal = by.find( ( o ) => 'settled:equal' === o.how );
	const other = equal && by.find( ( o ) => 'unwritten' === o.outcome || ( 'written' === o.outcome && PASS_HOW.includes( o.how ) ) );
	return other ? `settled equal${ equal.slot !== other.slot ? ` (judged on ${ equal.slot || 'the root' })` : '' } and ${ 'unwritten' === other.outcome ? 'unwritten' : `written by ${ other.how }` }: the run says both that the element shows the value and that it does not` : null;
}

// The conservation verdict of a read set against a run's outcomes.
// reads: [ { draft, node, block, slot, property, width, value } ]. Returns { reads, excluded, conserved, failures,
// widthlessHolds }: `excluded` counts the reads that are not declared values (a CSS-wide keyword is how Chrome lists the
// longhands a shorthand leaves implied), `failures` is every other read that no outcome answers or whose outcomes
// contradict each other (contradiction(), named in `why`), and `widthlessHolds`
// every conserved read only an `alreadyHeld` row answers: Fill records no width for a hold, so such a row answers every
// width and the hold may not cover this one.
export function conservation( { reads, report, unmapped } ) {
	const index = new Map();
	for ( const o of outcomesOf( { report, unmapped } ) ) {
		for ( const k of new Set( [ at( o.node, o.slot ), ...( undefined === o.readSlot ? [] : [ at( o.node, o.readSlot ) ] ) ] ) ) {
			index.has( k ) ? index.get( k ).push( o ) : index.set( k, [ o ] );
		}
	}
	const failures = [];
	const widthlessHolds = [];
	let conserved = 0;
	let cssWide = 0;
	for ( const read of reads ) {
		const by = ( index.get( at( read.node, read.slot ) ) || [] ).filter( ( o ) => answers( o, read ) );
		if ( CSS_WIDE.test( String( read.value ).trim() ) ) {
			cssWide++;
		} else if ( by.length && contradiction( by ) ) {
			failures.push( { draft: read.draft, block: read.block, node: read.node, slot: read.slot ?? '', property: read.property, value: read.value, width: read.width, state: STATE, why: contradiction( by ) } );
		} else if ( by.length ) {
			conserved++;
			by.every( ( o ) => 'held' === o.outcome && null === o.widths && 'ledger' !== o.how ) && widthlessHolds.push( { block: read.block, node: read.node, slot: read.slot ?? '', property: read.property, width: read.width, how: by[ 0 ].how } );
		} else {
			failures.push( { draft: read.draft, block: read.block, node: read.node, slot: read.slot ?? '', property: read.property, value: read.value, width: read.width, state: STATE } );
		}
	}
	return { reads: reads.length, excluded: { cssWide }, conserved, failures, widthlessHolds };
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

// Why a read set is not bound to the run in `dir`, or null when it is: its `run` is the run folder's name; its inputs'
// sha256 equal the ones the run records (fill-report.json `inputs`, when Fill records them) and the files under `root`
// today; and every node it reads is a node of the run's filled.tree.json with the same block.
export function bindingProblem( raw, dir, report, root ) {
	const name = path.basename( dir );
	if ( raw.run !== name ) {
		return `${ READ_FILE } was saved for run ${ raw.run ?? '(none)' }, not ${ name }`;
	}
	for ( const k of INPUTS ) {
		const b = raw.inputs?.[ k ];
		if ( 'string' !== typeof b?.file || 'string' !== typeof b?.sha256 ) {
			return `${ READ_FILE } binds no ${ k } hash`;
		}
		if ( report.inputs && report.inputs[ k ] !== b.sha256 ) {
			return `the run recorded ${ k } ${ report.inputs[ k ] ?? '(none)' }, but the read set was read from ${ b.sha256 }`;
		}
		const now = path.join( root, b.file );
		if ( ! fs.existsSync( now ) || fileSha( now ) !== b.sha256 ) {
			return `the ${ k } ${ b.file } changed since the read set was saved (${ fs.existsSync( now ) ? 'its sha256 differs' : 'it is gone' })`;
		}
	}
	const treeFile = path.join( dir, 'filled.tree.json' );
	if ( ! fs.existsSync( treeFile ) ) {
		return 'the run holds no filled.tree.json, so the read set\'s nodes cannot be bound to it';
	}
	const blocks = new Map();
	walk( JSON.parse( fs.readFileSync( treeFile, 'utf8' ) ), ( n ) => blocks.set( refOf( n ), n.name ) );
	const stray = ( raw.rows || [] ).find( ( r ) => blocks.get( r.node ) !== r.block );
	return stray ? `${ READ_FILE } reads ${ stray.node } (${ stray.block }), which the run's filled.tree.json does not hold` : null;
}

// Reads a Fill run folder: { status: 'checked', ...conservation }, { status: 'no-read-set', reason } when the run holds
// no reads.json (written before Fill saved its read set), or { status: 'unbound', reason } when its read set is not bound
// to the run (bindingProblem; root: the repository the inputs are read under). Neither is counted clean.
export function conservationRun( dir, { root = process.env.SGS_REPO_ROOT ? path.resolve( process.env.SGS_REPO_ROOT ) : REPO } = {} ) {
	const file = path.join( dir, READ_FILE );
	const none = { reads: 0, excluded: { cssWide: 0 }, conserved: 0, failures: [], widthlessHolds: [] };
	if ( ! fs.existsSync( file ) ) {
		return { status: 'no-read-set', reason: `${ READ_FILE } is not in the run folder, so what the draft declared is unknown`, ...none };
	}
	const read = ( f ) => JSON.parse( fs.readFileSync( path.join( dir, f ), 'utf8' ) );
	const raw = read( READ_FILE );
	const report = read( 'fill-report.json' );
	if ( raw.client !== report.client || raw.surface !== report.surface ) {
		throw new Error( `${ READ_FILE } is the read set of ${ raw.client }/${ raw.surface }, but the run is ${ report.client }/${ report.surface }` );
	}
	const rows = readRowsOf( raw, file );
	const unbound = bindingProblem( raw, dir, report, root );
	if ( unbound ) {
		return { status: 'unbound', reason: unbound, ...none };
	}
	return { status: 'checked', ...conservation( { reads: rows, report, unmapped: read( 'unmapped.json' ) } ) };
}
