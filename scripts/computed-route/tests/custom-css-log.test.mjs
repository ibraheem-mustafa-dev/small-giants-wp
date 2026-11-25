// The per-draft Custom CSS log and ruling F's check (Spec 48 FR-48-109; Bean 2026-10-24): the log merges each surface's latest
// Fill report, and the check refuses a written rule with no justification.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCustomCssLog, unjustifiedRules, writeCustomCssLog, logMarkdown } from '../lib/custom-css-log.mjs';

const WHY = 'all five equivalence layers failed and no setting of the block paints it on this part';
const rule = ( over = {} ) => ( { node: 'n1', block: 'sgs/icon-list', part: 'item', state: null, range: 'all widths', declarations: [ 'gap: 6px' ], css: '& { gap: 6px; }', bytes: 9, reason: WHY, tokens: [], ...over } );
// The per-rule gap row Fill writes beside the rules, in the report's top-level `customCssGaps`.
const gap = ( over = {} ) => ( { node: 'n1', block: 'sgs/icon-list', slot: 'item', properties: [ 'gap' ], css: '& { gap: 6px; }', how: 'residual-css', control: 'a gap setting on item', reason: `custom-css: ${ WHY }`, ...over } );

// One client's build folder with two surfaces; the first has two runs, of which only the latest counts.
function fixture( reports ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'ccl-' ) );
	for ( const [ surface, run, residualCss, customCssGaps = [] ] of reports ) {
		const d = path.join( dir, 'qa', 'fill', surface, run );
		fs.mkdirSync( d, { recursive: true } );
		fs.writeFileSync( path.join( d, 'fill-report.json' ), JSON.stringify( { residualCss, customCssGaps } ) );
	}
	return dir;
}

test( 'the log merges the latest run of every surface, with each rule\'s gap row and the refusals', () => {
	const dir = fixture( [
		[ 'header', '2026-11-24', { rules: [ rule( { node: 'old' } ) ], gaps: [], refused: [] } ],
		[ 'header', '2026-11-25', { rules: [ rule() ], gaps: [], refused: [ { node: 'n2', block: 'sgs/icon-list', slot: '', property: 'list-style', value: 'none', reason: 'markerType is set on this instance and draws list-style; a rule would cancel it' } ] }, [ gap() ] ],
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
	const dir = fixture( [ [ 'home', 'r1', { rules: [ rule( { node: 'a', reason: '' } ), rule( { node: 'b', reason: 'looked nicer' } ), rule( { node: 'c' } ) ], gaps: [], refused: [] }, [ gap( { node: 'a' } ), gap( { node: 'b' } ) ] ] ] );
	const bad = unjustifiedRules( buildCustomCssLog( { client: 'demo', buildDir: dir } ) );
	assert.deepEqual( bad.map( ( r ) => r.node ), [ 'a', 'b', 'c' ] );
	assert.match( bad[ 0 ].problems.join( ';' ), /no reason/ );
	assert.match( bad[ 1 ].problems.join( ';' ), /names no ground/ );
	assert.match( bad[ 2 ].problems.join( ';' ), /no gap row/ );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'FR-48-50\'s visibility-by-width reason justifies a rule; the log writes its JSON and Markdown files', () => {
	const dir = fixture( [ [ 'header', 'r1', { rules: [ rule( { reason: 'FR-48-50: the draft shows this element by screen width and the block has no breakpoint setting' } ) ], gaps: [], refused: [] }, [ gap() ] ] ] );
	const { bad, files, log } = writeCustomCssLog( { client: 'demo', buildDir: dir } );
	assert.deepEqual( bad, [] );
	assert.ok( files.every( ( f ) => fs.existsSync( f ) ) );
	assert.ok( ! /\n {2,}\S/.test( logMarkdown( log ).replace( /^- /gm, '' ) ), 'no hard-wrapped lines' );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

// A real report: the footer surface of the first client's 2026-11-24 proof run, trimmed to six rules and their gap rows. Fill
// writes the per-rule gap rows as the report's `customCssGaps`; `residualCss.gaps` is the aggregated backlog (property,
// instances, part), which names no node, so the check once flagged every rule of every real run.
const REAL = JSON.parse( fs.readFileSync( new URL( './fixtures/custom-css-log/footer-fill-report.json', import.meta.url ), 'utf8' ) );
const realDir = ( edit = ( r ) => r ) => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'ccl-real-' ) );
	const d = path.join( dir, 'qa', 'fill', 'footer', '2026-11-24T17-40-00' );
	fs.mkdirSync( d, { recursive: true } );
	fs.writeFileSync( path.join( d, 'fill-report.json' ), JSON.stringify( edit( structuredClone( REAL ) ) ) );
	return dir;
};

test( 'MUST FAIL: every rule of a real Fill report is justified by the gap row Fill wrote for it, and the aggregated backlog is not what the check reads', () => {
	const dir = realDir();
	const log = buildCustomCssLog( { client: 'demo', buildDir: dir } );
	assert.equal( log.rules.length, 6 );
	assert.ok( log.rules.every( ( r ) => r.gap?.control ), 'each rule finds its own gap row' );
	assert.deepEqual( unjustifiedRules( log ), [] );
	// the aggregated rows hold no node: with the per-rule rows dropped only the backlog is left, and every rule is flagged
	const noRows = buildCustomCssLog( { client: 'demo', buildDir: realDir( ( r ) => ( { ...r, customCssGaps: [] } ) ) } );
	assert.equal( unjustifiedRules( noRows ).length, 6 );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a real rule with no gap row of its own is refused, and the row of another range of the same property does not justify it', () => {
	const victim = REAL.residualCss.rules[ 3 ];
	const without = realDir( ( r ) => ( { ...r, customCssGaps: r.customCssGaps.filter( ( g ) => g.css !== victim.css ) } ) );
	const bad = unjustifiedRules( buildCustomCssLog( { client: 'demo', buildDir: without } ) );
	assert.deepEqual( bad.map( ( b ) => b.css ), [ victim.css ] );
	assert.match( bad[ 0 ].problems.join( ';' ), /no gap row/ );
	const other = { ...REAL.customCssGaps.find( ( g ) => g.css === victim.css ), css: '@media (min-width: 9999px) { & { x: y; } }' };
	const wrongRange = realDir( ( r ) => ( { ...r, customCssGaps: [ ...r.customCssGaps.filter( ( g ) => g.css !== victim.css ), other ] } ) );
	assert.equal( unjustifiedRules( buildCustomCssLog( { client: 'demo', buildDir: wrongRange } ) ).length, 1 );
	fs.rmSync( without, { recursive: true, force: true } );
	fs.rmSync( wrongRange, { recursive: true, force: true } );
} );
