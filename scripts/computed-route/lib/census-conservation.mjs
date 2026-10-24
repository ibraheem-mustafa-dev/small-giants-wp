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
import { SETTLED } from './fill-report.mjs';
import { msOf, easingOf, clientTokens } from './motion-tokens.mjs';
import { sameCanonical } from './css-equivalence/values.mjs';
import { parseColour } from './normalise.mjs';
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
// The state names an outcome row carries for the rest look: none, `default` (the confirm records') and `*` (a ledger entry
// for every state).
const REST = [ undefined, null, '', 'default', 'rest', '*' ];
const atRest = ( state ) => REST.includes( state );
// The confirm verdicts that say the element shows the value (lib/fill-confirm.mjs::verdictOf).
const SHOWN = [ 'confirmed' ];
// The motion writers: their writes name settings, not properties (motionLonghands).
const MOTION_HOW = [ 'motion', 'fill-timing' ];
// What a motion layer's timing values write on its element (the sgsMotion layer, fill-motion-element.mjs).
const LAYER_LONGHANDS = { duration: 'transition-duration', paintDuration: 'transition-duration', easing: 'transition-timing-function', paintEasing: 'transition-timing-function', delay: 'transition-delay', paintDelay: 'transition-delay' };

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

// The timing values the sgsMotion root layer gives each longhand: { longhand: [ value ] } from its state values (duration
// and paintDuration both time transition-duration entries; a layer that sets no delay runs at 0ms,
// class-sgs-motion-emitter.php::hover_state). Only the root element's layers time the write's element: a part's layer
// times the part.
export function rootLayerTimings( doc ) {
	const out = {};
	for ( const layer of Object.values( doc?.elements?.root || {} ) ) {
		const values = layer?.state?.values || {};
		if ( ! Object.keys( values ).length ) {
			continue;
		}
		for ( const [ k, v ] of Object.entries( values ) ) {
			LAYER_LONGHANDS[ k ] && ( out[ LAYER_LONGHANDS[ k ] ] ??= [] ).push( v );
		}
		undefined === values.delay && undefined === values.paintDelay && ( out[ 'transition-delay' ] ??= [] ).push( 0 );
	}
	return out;
}

// The longhands one motion-pass write sets: the timing longhands its sgsMotion root layer's values write (on the write's
// element, rootLayerTimings), the write's own property when it names one (fill-timing writes name it), else none (a
// scroll or magnet setting writes no CSS longhand the read set holds).
export function motionLonghands( w ) {
	if ( 'sgsMotion' === w.attr && w.after && 'object' === typeof w.after ) {
		return Object.keys( rootLayerTimings( w.after ) );
	}
	return MDN[ w.covers ?? w.prop ] ? [ w.covers ?? w.prop ] : [];
}

const ENTRIES = ( v ) => String( v ?? '' ).split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() ).filter( Boolean );
// Whether a timing longhand's read value is what the layer gives it at every entry of the list: each entry equals one of
// the layer's values for that longhand (times by ms, easings by their canonical spelling; a 'token:' value read through
// the client's tokens, an unknown token never equal).
export function layerGives( prop, raw, given, tokens = {} ) {
	const tok = ( v ) => ( 'string' === typeof v && v.startsWith( 'token:' ) ? tokens[ v.slice( 6 ) ] : v );
	const read = 'transition-timing-function' === prop ? easingOf : msOf;
	const have = ( given || [] ).map( ( v ) => read( tok( v ) ) ).filter( ( v ) => null !== v && undefined !== v );
	const entries = ENTRIES( raw );
	return !! have.length && !! entries.length && entries.every( ( x ) => have.includes( read( x ) ) );
}

// The outcome rows of a run as { node, slot (the element the row answers for: a write's or settled row's readSlot where it
// has one), property, properties (a motion write's longhands), widths (null = every width), outcome, how }. `report` is
// fill-report.json, `unmapped` is unmapped.json. Rows of another look (a state) are left out: the read set is the rest look.
// A write that names no widths answers none. A confirm record counts as written only when its verdict says the element
// shows the value. An sgsMotion write carries its root layer's timing values (`timings`, rootLayerTimings). `unreasoned`
// lists the settled rows, of any look, whose reason is not one Fill gives (lib/fill-report.mjs::SETTLED).
export function outcomesOf( { report, unmapped } ) {
	const out = [];
	const unreasoned = [];
	for ( const w of report.writes || [] ) {
		if ( ! atRest( w.state ) ) {
			continue;
		}
		const widths = [ ...new Set( [ ...( w.widths || [] ), ...( w.answers || [] ) ] ) ];
		const motion = MOTION_HOW.includes( w.how ) ? { properties: motionLonghands( w ), ...( 'sgsMotion' === w.attr ? { timings: rootLayerTimings( w.after ) } : {} ) } : {};
		out.push( { node: w.node, slot: w.readSlot ?? w.slot, writtenOn: w.slot, property: w.covers ?? w.prop, ...motion, widths, outcome: 'written', how: w.how } );
	}
	for ( const s of report.settled || [] ) {
		if ( ! SETTLED.includes( s.reason ) ) {
			unreasoned.push( { node: s.node, block: s.block, slot: s.slot ?? '', property: s.property, state: s.state ?? null, reason: s.reason ?? null } );
			continue;
		}
		if ( ! atRest( s.state ) ) {
			continue;
		}
		// A settled row answers the widths it records, and none when it records none.
		out.push( { node: s.node, slot: s.readSlot ?? s.slot, writtenOn: s.slot, property: s.property, widths: s.widths?.length ? s.widths : [], outcome: 'held', how: `settled:${ s.reason }` } );
	}
	for ( const c of report.confirm || [] ) {
		atRest( c.state ) && SHOWN.includes( c.verdict ) && out.push( { node: c.node, slot: c.slot, property: c.property, widths: [ c.width ], outcome: 'written', how: 'confirm' } );
	}
	for ( const h of report.alreadyHeld || [] ) {
		atRest( h.state ) && out.push( { node: h.node, slot: h.slot, property: h.property, widths: null, outcome: 'held', how: h.reason } );
	}
	for ( const l of report.ledger || [] ) {
		// An entry Fill did not apply to the rest look (a decided hover value, lib/fill-resolve-state.mjs::ledgerView) holds no rest read.
		atRest( l.state ) && false !== l.applied && out.push( { node: l.node, slot: l.slot, property: l.prop, widths: null === l.width || undefined === l.width ? null : [ l.width ], outcome: 'held', how: 'ledger' } );
	}
	for ( const u of unmapped || [] ) {
		if ( ! atRest( u.state ) ) {
			continue;
		}
		for ( const node of u.nodes?.length ? u.nodes : [ u.node ] ) {
			out.push( { node, slot: u.slot, property: u.property, value: u.value, widths: null, outcome: 'unwritten', how: 'unmapped' } );
		}
	}
	Object.defineProperty( out, 'unreasoned', { value: unreasoned } );
	return out;
}

// Whether one outcome row answers one read: (the index has matched node and element) a property that is the read's or a
// shorthand setting it (a motion write: one of the longhands it writes, where its root layer gives the read's value,
// layerGives), and a width it states (null: every width). An unwritten row with a value answers only where its value
// at the read's width is the read's (unwrittenSays). tokens: the client's theme tokens (motion-tokens.mjs::clientTokens).
function answers( o, read, tokens ) {
	if ( o.widths && ! o.widths.includes( read.width ) ) {
		return false;
	}
	if ( 'unwritten' === o.outcome && o.value && ! unwrittenSays( o.value, read ) ) {
		return false;
	}
	if ( o.properties ) {
		return o.properties.includes( read.property ) && ( ! o.timings || layerGives( read.property, read.value, o.timings[ read.property ], tokens ) );
	}
	return !! o.property && longhandsOf( o.property ).includes( read.property );
}

// Whether an UNMAPPED row's value speaks for one read: its value at the read's width (a width-keyed object's entry, else
// the value) is the read's, as a list (LIST), as a canonical value (css-equivalence/values.mjs::sameCanonical: times,
// easings, transforms, paint) or as one colour in two spellings (normalise.mjs::parseColour); a list of timing groups ([{ properties, value }],
// lib/fill-timing.mjs::splitRows) speaks for a read whose list holds every group's value.
function unwrittenSays( value, read ) {
	let held = value;
	try {
		held = JSON.parse( value );
	} catch {}
	if ( Array.isArray( held ) ) {
		const entries = ENTRIES( read.value ).map( ( x ) => x.toLowerCase() );
		return !! held.length && held.every( ( g ) => entries.includes( String( g?.value ?? '' ).toLowerCase() ) );
	}
	const at = valueAtWidth( value, read.width );
	if ( undefined === at || null === at ) {
		return false;
	}
	const [ a, b ] = [ String( at ), String( read.value ) ];
	const [ ca, cb ] = [ parseColour( a ), parseColour( b ) ];
	return LIST( a ) === LIST( b ) || sameCanonical( read.property, a, b ) || ( !! ca && !! cb && [ 'r', 'g', 'b', 'a' ].every( ( k ) => ca[ k ] === cb[ k ] ) ) || ( 'display' === read.property && BLOCKIFIED[ LIST( b ) ] === LIST( a ) );
}

// A declared inner display and the outer display a flex or grid item computes it to (CSS Display 3 §2.7): Fill reads the
// computed display, so its row for an item declared inline-flex says flex.
const BLOCKIFIED = { 'inline-flex': 'flex', 'inline-grid': 'grid', 'inline-block': 'block', inline: 'block', 'inline-table': 'table', 'inline flow-root': 'block' };

// The writers that act on a row the generic pass left UNMAPPED (fill.mjs's later passes): a write of theirs says the
// element did not already show the value.
const PASS_HOW = [ 'logo-size', 'width-ladder', 'width-gate', 'dimension' ];

// Why the outcomes answering one read contradict each other, or null: the run calls the read's own property `equal` (the
// element already shows it) and also leaves that property unwritten or writes it in a later pass. Only outcomes naming the
// read's property (or a shorthand of it) are compared, and an unwritten row speaks for this read only where its value there
// is the read's.
const LIST = ( v ) => [ ...new Set( String( v ?? '' ).split( ',' ).map( ( x ) => x.trim().toLowerCase() ) ) ].join( ',' );
function valueAtWidth( value, width ) {
	try {
		const held = JSON.parse( value );
		return held && 'object' === typeof held && ! Array.isArray( held ) ? held[ width ] : value;
	} catch {
		return value;
	}
}
function contradiction( found, read ) {
	const by = found.filter( ( o ) => !! o.property && longhandsOf( o.property ).includes( read.property ) && ( 'unwritten' !== o.outcome || ! o.value || LIST( valueAtWidth( o.value, read.width ) ) === LIST( read.value ) ) );
	const equal = by.find( ( o ) => 'settled:equal' === o.how );
	const other = equal && by.find( ( o ) => 'unwritten' === o.outcome || ( 'written' === o.outcome && PASS_HOW.includes( o.how ) ) );
	return other ? `settled equal${ ( equal.writtenOn ?? equal.slot ) !== ( other.writtenOn ?? other.slot ) ? ` (judged on ${ equal.writtenOn || 'the root' })` : '' } and ${ 'unwritten' === other.outcome ? 'unwritten' : `written by ${ other.how }` }: the run says both that the element shows the value and that it does not` : null;
}

// The conservation verdict of a read set against a run's outcomes.
// reads: [ { draft, node, block, slot, property, width, value } ]. Returns { reads, excluded, conserved, failures,
// widthlessHolds }: `excluded` counts the reads that are not declared values (a CSS-wide keyword is how Chrome lists the
// longhands a shorthand leaves implied), `failures` is every other read that no outcome answers or whose outcomes
// contradict each other (contradiction(), named in `why`), and `widthlessHolds`
// every conserved read only an `alreadyHeld` row answers: Fill records no width for a hold, so such a row answers every
// width and the hold may not cover this one; `unreasoned` every settled row whose reason is not one Fill gives (it conserves nothing
// and fails the check).
export function conservation( { reads, report, unmapped, tokens = {} } ) {
	const index = new Map();
	const outcomes = outcomesOf( { report, unmapped } );
	for ( const o of outcomes ) {
		const k = at( o.node, o.slot );
		index.has( k ) ? index.get( k ).push( o ) : index.set( k, [ o ] );
	}
	const failures = [];
	const widthlessHolds = [];
	let conserved = 0;
	let cssWide = 0;
	for ( const read of reads ) {
		const by = ( index.get( at( read.node, read.slot ) ) || [] ).filter( ( o ) => answers( o, read, tokens ) );
		if ( CSS_WIDE.test( String( read.value ).trim() ) ) {
			cssWide++;
		} else if ( by.length && contradiction( by, read ) ) {
			failures.push( { draft: read.draft, block: read.block, node: read.node, slot: read.slot ?? '', property: read.property, value: read.value, width: read.width, state: STATE, why: contradiction( by, read ) } );
		} else if ( by.length ) {
			conserved++;
			by.every( ( o ) => 'held' === o.outcome && null === o.widths && 'ledger' !== o.how ) && widthlessHolds.push( { block: read.block, node: read.node, slot: read.slot ?? '', property: read.property, width: read.width, how: by[ 0 ].how } );
		} else {
			failures.push( { draft: read.draft, block: read.block, node: read.node, slot: read.slot ?? '', property: read.property, value: read.value, width: read.width, state: STATE } );
		}
	}
	return { reads: reads.length, excluded: { cssWide }, conserved, failures, widthlessHolds, unreasoned: outcomes.unreasoned };
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
	const none = { reads: 0, excluded: { cssWide: 0 }, conserved: 0, failures: [], widthlessHolds: [], unreasoned: [] };
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
	const snapshot = path.join( root, 'sites', String( report.client ), 'theme-snapshot.json' );
	const tokens = fs.existsSync( snapshot ) ? clientTokens( JSON.parse( fs.readFileSync( snapshot, 'utf8' ) ) ) : {};
	return { status: 'checked', ...conservation( { reads: rows, report, unmapped: read( 'unmapped.json' ), tokens } ) };
}
