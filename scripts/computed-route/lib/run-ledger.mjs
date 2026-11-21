// The run ledger file: one file per run and surface (`<records>/qa/ledger/<surface>/<run stamp>/run.jsonl`, the stamp being
// the run's Fill stamp) to which each stage of a cloning run appends what it did with each draft look, in the row shape of
// lib/ledger-row.mjs (README "The run ledger"). The stages append after their own outputs are written and never read the
// file back, so a stage decides and writes exactly what it would without it; a stage given no file writes nothing.
// Row: { draftKey, node?, part, property, state, widths, draft, stage, outcome: { kind, setting?, value?, baseline?, reason?,
// into? }, record: { file, section, match } }. `node` is the cr-ref of the skeleton node whose target the look is (Fill and
// later); a skeleton row names the draft element only.
import fs from 'fs';
import path from 'path';
import { longhandsOf } from './css-families.mjs';

export const RUN_STAGES = [ 'inventory', 'skeleton', 'fill', 'build', 'apply', 'render', 'site', 'verify' ];
export const OUTCOME_KINDS = [ 'passed-on', 'written', 'judged-equal', 'custom-css', 'dropped', 'absorbed', 'unread', 'misread' ];
export const RUN_FILE = 'run.jsonl';

// The run file of one surface and run stamp under a client's build folder (`records`).
export const runLedgerFile = ( records, surface, stamp ) => path.join( records, 'qa', 'ledger', surface, stamp, RUN_FILE );

// The run file a Fill output folder (`<records>/qa/fill/<surface>/<stamp>`) belongs to: the same surface and stamp.
export function runLedgerFileOfFill( fillDir ) {
	const stamp = path.basename( fillDir );
	const surface = path.basename( path.dirname( fillDir ) );
	return runLedgerFile( path.resolve( fillDir, '..', '..', '..', '..' ), surface, stamp );
}

// The problems of one row: a stage or outcome kind outside the closed lists, a row naming no draft element and no node, no
// property, or widths that are not a list.
export function rowProblems( row ) {
	const out = [];
	! RUN_STAGES.includes( row?.stage ) && out.push( `stage ${ row?.stage } is not a run stage` );
	! OUTCOME_KINDS.includes( row?.outcome?.kind ) && out.push( `outcome ${ row?.outcome?.kind } is not an outcome kind` );
	! row?.draftKey && ! row?.node && out.push( 'the row names no draft element and no node' );
	! row?.property && out.push( 'the row names no property' );
	! Array.isArray( row?.widths ) && out.push( 'widths is not a list' );
	return out;
}

// One row in the shape, its optional fields left out when empty.
export function runRow( { draftKey = null, node = null, part = '', property, state = 'rest', widths = [], draft = null, stage, outcome, record = null } ) {
	return { draftKey, ...( node ? { node } : {} ), part: part ?? '', property, state: state || 'rest', widths: [ ...widths ].map( Number ).sort( ( a, b ) => a - b ), draft: draft ?? null, stage, outcome, record };
}

// The writer of one run file: { file, append( rows ) -> count }. A null file gives a writer that writes nothing. A row with a
// problem throws before anything is appended, so the file never holds a row the verify stage cannot read.
export function openRunLedger( file ) {
	if ( ! file ) {
		return { file: null, append: () => 0 };
	}
	return {
		file,
		append( rows ) {
			const list = ( rows || [] ).filter( Boolean );
			const bad = list.map( ( r ) => [ r, rowProblems( r ) ] ).find( ( [ , p ] ) => p.length );
			if ( bad ) {
				throw new Error( `run ledger row refused (${ bad[ 1 ].join( '; ' ) }): ${ JSON.stringify( bad[ 0 ] ).slice( 0, 300 ) }` );
			}
			if ( ! list.length ) {
				return 0;
			}
			fs.mkdirSync( path.dirname( file ), { recursive: true } );
			fs.appendFileSync( file, list.map( ( r ) => `${ JSON.stringify( r ) }\n` ).join( '' ) );
			return list.length;
		},
	};
}

// The rows of a run file ([] when there is none).
export function readRunLedger( file ) {
	if ( ! file || ! fs.existsSync( file ) ) {
		return [];
	}
	return fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).filter( Boolean ).map( ( l ) => JSON.parse( l ) );
}

// The newest run file of a surface (`<records>/qa/ledger/<surface>/<stamp>/run.jsonl`), the one whose stamp is `stamp` when
// given; null when none.
export function findRunLedger( records, surface, stamp = null ) {
	const dir = path.join( records, 'qa', 'ledger', surface );
	if ( stamp ) {
		const f = runLedgerFile( records, surface, stamp );
		return fs.existsSync( f ) ? f : null;
	}
	const stamps = fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( d ) => fs.existsSync( path.join( dir, d, RUN_FILE ) ) ).sort() : [];
	return stamps.length ? path.join( dir, stamps.at( -1 ), RUN_FILE ) : null;
}

// The properties an inventory element records itself painting: every key of its `resolved` read at any width (a paint
// property is recorded only where it differs from its initial value; the inherited text properties always).
export const paintedProperties = ( element ) => [ ...new Set( Object.values( element?.resolved || {} ).filter( ( v ) => v && 'object' === typeof v ).flatMap( Object.keys ) ) ].sort();

// The draft elements a skeleton or proposal names: every node's draftRef, draftSlots, band wrappers and overlay layers, and
// every proposal row's key.
export function namedElements( skeleton, proposal ) {
	const out = new Set( ( proposal?.rows || [] ).map( ( r ) => r.key ) );
	const tpl = ( f ) => ( 'string' === typeof f?.tpl ? f.tpl : null );
	const walk = ( list ) => ( list || [] ).forEach( ( n ) => {
		[ n.draftRef, ...Object.values( n.draftSlots || {} ), ...( Array.isArray( n.draftBandWrappers ) ? n.draftBandWrappers : [] ), ...( n.draftOverlay?.layers || [] ) ].map( tpl ).filter( Boolean ).forEach( ( k ) => out.add( k ) );
		walk( n.innerBlocks );
	} );
	walk( Array.isArray( skeleton ) ? skeleton : [ skeleton ] );
	return out;
}

// The coverage check: every draft element a node, a slot or a proposal row names has, for every property its inventory
// records it painting, at least one row of a stage after the inventory (a row of a shorthand covers its longhands).
// Returns { elements, pairs, covered, missing: [ { draftKey, property } ], byProperty: { property: missing count } }.
export function runCoverage( { inventory, skeleton, proposal, rows } ) {
	const has = new Set();
	for ( const r of rows || [] ) {
		if ( ! r.draftKey || [ 'inventory', 'verify' ].includes( r.stage ) ) {
			continue;
		}
		const prop = String( r.property ).replace( /^::?[a-z-]+ /, '' );
		[ prop, ...longhandsOf( prop ) ].forEach( ( p ) => has.add( `${ r.draftKey }|${ p }` ) );
	}
	const named = namedElements( skeleton, proposal );
	const out = { elements: 0, pairs: 0, covered: 0, missing: [], byProperty: {} };
	for ( const e of inventory?.elements || [] ) {
		if ( ! named.has( e.key ) ) {
			continue;
		}
		out.elements++;
		for ( const p of paintedProperties( e ) ) {
			out.pairs++;
			if ( has.has( `${ e.key }|${ p }` ) ) {
				out.covered++;
			} else {
				out.missing.push( { draftKey: e.key, property: p } );
				out.byProperty[ p ] = ( out.byProperty[ p ] || 0 ) + 1;
			}
		}
	}
	return out;
}
