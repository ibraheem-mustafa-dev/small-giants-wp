// Scores a catch-rate benchmark run from its recorded walker reports (<out>/<config>-control and
// <out>/case-<id>): benchmark.mjs calls it after the runs, and it re-scores a recorded run on its own:
//   node scripts/parity/benchmark/score.mjs <out dir>
// A row is new when the control lacks it, or when its live value moved by more than the tolerance while
// its draft value held (the injection touches live only, so a draft that moved is run-to-run noise). A
// case is caught when a new row matches its `match`; rows its config accepted still count (detection)
// and are marked. The no-op noise run's rows that match a case are reported against it.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CASES } from './cases.mjs';

const TOL = 4;

// Every difference row of a report, keyed by where it is and what it measures.
function rowsOf( file ) {
	const rows = new Map();
	for ( const run of JSON.parse( fs.readFileSync( file, 'utf8' ) ).runs ) {
		for ( const [ pair, p ] of Object.entries( run.pairs ) ) {
			for ( const d of p.diffs ) {
				rows.set( `${ run.state }@${ run.width } | ${ pair } | ${ d.kind } | ${ d.key }`, { draft: d.draft, live: d.live, accepted: d.accepted || null } );
			}
		}
	}
	return rows;
}

// Two recorded values differ materially: numbers in the same shape by more than TOL, else as text.
function moved( a, b ) {
	const num = /-?\d+(\.\d+)?/g;
	const x = String( a ?? '' ).match( num ) || [];
	const y = String( b ?? '' ).match( num ) || [];
	if ( x.length && x.length === y.length && String( a ).replace( num, '#' ) === String( b ).replace( num, '#' ) ) {
		return x.some( ( n, i ) => Math.abs( Number( n ) - Number( y[ i ] ) ) > TOL );
	}
	return JSON.stringify( a ) !== JSON.stringify( b );
}

function newRows( control, run, widths ) {
	const out = [];
	for ( const [ key, row ] of run ) {
		if ( ! widths.includes( Number( key.split( ' | ' )[ 0 ].split( '@' ).pop() ) ) ) {
			continue;
		}
		const before = control.get( key );
		if ( ! before ) {
			out.push( { key, change: 'new', ...row } );
		} else if ( ! moved( before.draft, row.draft ) && moved( before.live, row.live ) ) {
			out.push( { key, change: 'changed', ...row, was: before.live } );
		}
	}
	return out;
}

const rowText = ( r ) => `${ r.key } | ${ JSON.stringify( r.draft ) } | ${ JSON.stringify( r.live ) }`;
const cell = ( v ) => String( v ?? '' ).replace( /\|/g, '\\|' ).replace( /\n/g, ' ' ).slice( 0, 120 );

// Scores every case with a recorded run in outDir; writes summary.md and summary.json.
export function scoreDir( outDir, meta = {} ) {
	const has = ( dir ) => fs.existsSync( path.join( outDir, dir, 'report.json' ) );
	const cases = [ ...CASES, ...[ ...new Set( CASES.map( ( c ) => c.config ) ) ].map( ( config ) => ( { id: `noise-${ config }`, config, noise: true, label: 'No-op injection: every row here is noise' } ) ) ]
		.filter( ( c ) => has( `case-${ c.id }` ) && has( `${ c.config }-control` ) );
	const results = cases.map( ( c ) => {
		const control = rowsOf( path.join( outDir, `${ c.config }-control`, 'report.json' ) );
		const widths = c.widths || [ 1440, 768, 375 ];
		const rows = newRows( control, rowsOf( path.join( outDir, `case-${ c.id }`, 'report.json' ) ), widths );
		const hits = c.match ? rows.filter( ( r ) => c.match.test( rowText( r ) ) ) : [];
		return { id: c.id, config: c.config, label: c.label, fix: c.fix, noise: !! c.noise, match: String( c.match || '' ), caught: hits.length > 0, onlyAccepted: hits.length > 0 && hits.every( ( r ) => r.accepted ), hits, rows };
	} );
	for ( const r of results ) {
		r.draftHasIt = !! CASES.find( ( k ) => k.id === r.id )?.draftHasIt;
	}
	// A gap the draft itself has is not a draft-versus-live difference: reported, never scored.
	const scored = results.filter( ( r ) => ! r.noise && ! r.draftHasIt );
	for ( const n of results.filter( ( r ) => r.noise ) ) {
		for ( const r of scored.filter( ( x ) => x.config === n.config ) ) {
			const re = CASES.find( ( k ) => k.id === r.id ).match;
			r.noiseHits = n.rows.filter( ( x ) => re.test( rowText( x ) ) ).length;
		}
	}
	const score = scored.filter( ( r ) => r.caught ).length;
	const lines = [ '# Walker catch-rate benchmark', '', `Run ${ meta.stamp || path.basename( outDir ) }. Walker args: ${ ( meta.extra || [] ).join( ' ' ) || '(default)' }.`, '', `**Caught ${ score } of ${ scored.length }.**`, '' ];
	for ( const r of results ) {
		let verdict = `${ r.rows.length } noise row(s)`;
		if ( r.draftHasIt ) {
			verdict = `NOT SCORED: the draft has this gap too, so only design review can catch it (${ r.hits.length } matching row(s) this run)`;
		} else if ( ! r.noise ) {
			verdict = r.caught ? `CAUGHT by ${ r.hits.length } row(s)${ r.onlyAccepted ? ', every one accepted by the config' : '' }` : 'MISSED';
			verdict += ` · ${ r.rows.length - r.hits.length } other new row(s) · match ${ r.match }${ r.noiseHits ? ` · ${ r.noiseHits } noise row(s) also match` : '' }`;
		}
		lines.push( `## ${ r.id }. ${ r.label }`, '', `${ verdict }${ r.fix ? ` · fix ${ r.fix }` : '' }`, '' );
		const show = r.noise ? r.rows : r.hits;
		if ( show.length ) {
			lines.push( '| where / pair / kind / key | change | draft | live | accepted by config |', '|---|---|---|---|---|' );
			lines.push( ...show.slice( 0, 40 ).map( ( x ) => `| ${ cell( x.key ) } | ${ x.change }${ x.was === undefined ? '' : ` (was ${ cell( x.was ) })` } | ${ cell( x.draft ) } | ${ cell( x.live ) } | ${ cell( x.accepted ) } |` ) );
			if ( show.length > 40 ) {
				lines.push( `| ... ${ show.length - 40 } more in summary.json | | | | |` );
			}
			lines.push( '' );
		}
	}
	fs.writeFileSync( path.join( outDir, 'summary.md' ), lines.join( '\n' ) );
	fs.writeFileSync( path.join( outDir, 'summary.json' ), JSON.stringify( { ...meta, score, of: scored.length, results }, null, 1 ) );
	return { score, of: scored.length, results };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const dir = path.resolve( process.argv[ 2 ] || '' );
	const { score, of, results } = scoreDir( dir );
	for ( const r of results ) {
		let line = `${ r.caught ? 'CAUGHT' : 'MISSED' } (${ r.hits.length } hit, ${ r.noiseHits || 0 } noise match)`;
		if ( r.noise ) {
			line = `${ r.rows.length } noise rows`;
		} else if ( r.draftHasIt ) {
			line = 'not scored: the draft has it too';
		}
		console.log( `${ r.id }: ${ line }` );
	}
	console.log( `Caught ${ score } of ${ of }. Summary: ${ path.join( dir, 'summary.md' ) }` );
}
