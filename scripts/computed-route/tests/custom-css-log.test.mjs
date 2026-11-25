// The per-draft Custom CSS log and ruling F's check (Spec 48 FR-48-109; Bean 2026-10-24): the log merges each surface's latest
// Fill report, and the check refuses a written rule with no justification.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCustomCssLog, unjustifiedRules, writeCustomCssLog, logMarkdown } from '../lib/custom-css-log.mjs';

const WHY = 'all five equivalence layers failed and no setting of the block paints it on this part';
const rule = ( over = {} ) => ( { node: 'n1', block: 'sgs/icon-list', part: 'item', state: null, range: 'all widths', declarations: [ 'gap: 6px' ], css: '', bytes: 9, reason: WHY, tokens: [], ...over } );
const gap = ( over = {} ) => ( { node: 'n1', block: 'sgs/icon-list', slot: 'item', properties: [ 'gap' ], how: 'residual-css', control: 'a gap setting on item', reason: `custom-css: ${ WHY }`, ...over } );

// One client's build folder with two surfaces; the first has two runs, of which only the latest counts.
function fixture( reports ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'ccl-' ) );
	for ( const [ surface, run, residualCss ] of reports ) {
		const d = path.join( dir, 'qa', 'fill', surface, run );
		fs.mkdirSync( d, { recursive: true } );
		fs.writeFileSync( path.join( d, 'fill-report.json' ), JSON.stringify( { residualCss } ) );
	}
	return dir;
}

test( 'the log merges the latest run of every surface, with each rule\'s gap row and the refusals', () => {
	const dir = fixture( [
		[ 'header', '2026-11-24', { rules: [ rule( { node: 'old' } ) ], gaps: [], refused: [] } ],
		[ 'header', '2026-11-25', { rules: [ rule() ], gaps: [ gap() ], refused: [ { node: 'n2', block: 'sgs/icon-list', slot: '', property: 'list-style', value: 'none', reason: 'markerType is set on this instance and draws list-style; a rule would cancel it' } ] } ],
		[ 'home', '2026-11-25', { rules: [], gaps: [], refused: [] } ],
	] );
	const log = buildCustomCssLog( { client: 'demo', buildDir: dir } );
	assert.deepEqual( log.surfaces, [ 'header', 'home' ] );
	assert.equal( log.rules.length, 1 );
	assert.equal( log.rules[ 0 ].node, 'n1' );
	assert.equal( log.rules[ 0 ].gap.control, 'a gap setting on item' );
	assert.equal( log.refused.length, 1 );
	assert.deepEqual( unjustifiedRules( log ), [] );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a rule with no reason, an unallowed reason, or no gap row naming its setting is refused', () => {
	const dir = fixture( [ [ 'home', 'r1', { rules: [ rule( { node: 'a', reason: '' } ), rule( { node: 'b', reason: 'looked nicer' } ), rule( { node: 'c' } ) ], gaps: [ gap( { node: 'a' } ), gap( { node: 'b' } ) ], refused: [] } ] ] );
	const bad = unjustifiedRules( buildCustomCssLog( { client: 'demo', buildDir: dir } ) );
	assert.deepEqual( bad.map( ( r ) => r.node ), [ 'a', 'b', 'c' ] );
	assert.match( bad[ 0 ].problems.join( ';' ), /no reason/ );
	assert.match( bad[ 1 ].problems.join( ';' ), /names no ground/ );
	assert.match( bad[ 2 ].problems.join( ';' ), /no gap row/ );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'FR-48-50\'s visibility-by-width reason justifies a rule; the log writes its JSON and Markdown files', () => {
	const dir = fixture( [ [ 'header', 'r1', { rules: [ rule( { reason: 'FR-48-50: the draft shows this element by screen width and the block has no breakpoint setting' } ) ], gaps: [ gap() ], refused: [] } ] ] );
	const { bad, files, log } = writeCustomCssLog( { client: 'demo', buildDir: dir } );
	assert.deepEqual( bad, [] );
	assert.ok( files.every( ( f ) => fs.existsSync( f ) ) );
	assert.ok( ! /\n {2,}\S/.test( logMarkdown( log ).replace( /^- /gm, '' ) ), 'no hard-wrapped lines' );
	fs.rmSync( dir, { recursive: true, force: true } );
} );
