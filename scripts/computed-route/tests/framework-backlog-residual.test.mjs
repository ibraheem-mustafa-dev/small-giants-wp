// The residual Custom CSS gap rows reach the framework backlog (Spec 48 FR-48-109, FR-48-68): each surface's latest Fill run's
// `residualCss.gaps` (lib/fill-residual-css.mjs) is read as an F-setting source, keyed by block and property like every
// backlog row, with the part in each entry's rowKey; an older run of the surface is not read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { findResidualGapRows, mergeBacklog } from '../lib/framework-backlog.mjs';

const gap = ( o ) => ( { id: `residual:help:sgs/field|.f__input|${ o.property }`, class: 'F-setting', framework: true, block: 'sgs/field', attribute: null, part: '.f__input', rowKey: '.f__input', state: null, surface: 'help', instances: [ 'n0' ], declared: [ 'n0 every width: 17px' ], ...o } );
function sites( runs ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-residual-backlog-' ) );
	for ( const [ surface, run, rows ] of runs ) {
		const dir = path.join( root, 'alpha', 'build', 'qa', 'fill', surface, run );
		fs.mkdirSync( dir, { recursive: true } );
		fs.writeFileSync( path.join( dir, 'fill-report.json' ), JSON.stringify( { residualCss: { gaps: rows } } ) );
	}
	return root;
}

test( 'MUST FAIL WITHOUT THE RESIDUAL SOURCE: the latest run\'s residual gap rows merge as open F-setting backlog rows', () => {
	const root = sites( [ [ 'help', '2026-11-18T10-00-00', [ gap( { property: 'height' } ) ] ], [ 'help', '2026-11-19T10-00-00', [ gap( { property: 'font-size' } ) ] ] ] );
	const found = findResidualGapRows( root );
	assert.equal( found.length, 1 );
	assert.deepEqual( found[ 0 ].rows.map( ( r ) => r.property ), [ 'font-size' ], 'only the latest run of a surface is read' );
	const { backlog, stats } = mergeBacklog( { backlog: { rows: [] }, sources: found, mergedOn: '2026-11-19' } );
	assert.equal( stats.merged, 1 );
	assert.deepEqual( backlog.rows.map( ( r ) => [ r.key, r.status, r.entries[ 0 ].rowKey ] ), [ [ 'sgs/field||font-size', 'open', '.f__input' ] ] );
} );

test( 'negative control: a run with no residual rows, or no report, adds no source', () => {
	assert.deepEqual( findResidualGapRows( sites( [ [ 'help', '2026-11-19T10-00-00', [] ] ] ) ), [] );
	const empty = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-residual-backlog-' ) );
	fs.mkdirSync( path.join( empty, 'beta', 'build', 'qa', 'fill', 'home', '2026-11-19T10-00-00' ), { recursive: true } );
	assert.deepEqual( findResidualGapRows( empty ), [] );
} );
