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
	for ( const [ surface, run, residualCss, customCssGaps = [], writes = [] ] of reports ) {
		const d = path.join( dir, 'qa', 'fill', surface, run );
		fs.mkdirSync( d, { recursive: true } );
		fs.writeFileSync( path.join( d, 'fill-report.json' ), JSON.stringify( { residualCss, customCssGaps, writes } ) );
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

// A write into sgsCustomCss as the width gate, the width ladder and the step ladder record it.
const put = ( prop, after, over = {} ) => ( { node: 'n1', block: 'sgs/nav-bar-menu', slot: '', prop, attr: 'sgsCustomCss', before: '', after, widths: [], how: 'width-gate', ...over } );
const STEP = '@media (min-width: 900px) { & .item { gap: 4px; } }';

test( 'MUST FAIL: Custom CSS the step ladder, the width ladder and the width gate wrote into sgsCustomCss is logged and checked, beyond residualCss.rules', () => {
	const gate = put( 'width gate (a and b): scoped @media rule', '@media (max-width: 767px) { & { display: none; } }', { node: 'n2' } );
	const step = put( 'step ladder: scoped @media rule', STEP );
	const ladder = put( 'width ladder (padding-left): scoped @media rule', '@media (max-width: 599px) { & .x { padding-left: 4px; } }', { node: 'n3', covers: 'padding-left' } );
	const stepGap = { node: 'n1', block: 'sgs/nav-bar-menu', slot: '.item', properties: [ 'gap' ], css: '@media (min-width: 900px) { & .item { gap: 4px; } }', how: 'step ladder', control: 'itemGap with a step at 900px', reason: 'custom-css: gap 900-up is a scoped @media rule in Additional CSS because itemGap holds one value per device tier; native once that setting takes a step at 900px' };
	const label = put( 'step ladder: label', 'Step ladder: item 900-up gap: 4px;', { attr: 'sgsCustomCssNote' } );
	const dir = fixture( [ [ 'header', 'r1', { rules: [], gaps: [], refused: [] }, [ stepGap ], [ gate, step, ladder, label ] ] ] );
	const log = buildCustomCssLog( { client: 'demo', buildDir: dir } );
	assert.deepEqual( log.rules.map( ( r ) => r.node ), [ 'n2', 'n1', 'n3' ], 'one rule per write that adds Custom CSS; the note and scope-key writes are no rule' );
	assert.equal( log.rules[ 1 ].gap.control, 'itemGap with a step at 900px' );
	assert.deepEqual( unjustifiedRules( log ), [], 'each carries the ground of the pass that wrote it' );
	// A step ladder rule with no gap row has no ground of its own.
	const bare = fixture( [ [ 'header', 'r1', { rules: [], gaps: [], refused: [] }, [], [ step ] ] ] );
	const bad = unjustifiedRules( buildCustomCssLog( { client: 'demo', buildDir: bare } ) );
	assert.equal( bad.length, 1 );
	assert.match( bad[ 0 ].problems.join( ';' ), /no reason/ );
	// A rule a later write replaced, and one that adds nothing, are no rule.
	const none = fixture( [ [ 'header', 'r1', { rules: [], gaps: [], refused: [] }, [], [ { ...gate, supersededBy: 3 }, { ...ladder, before: ladder.after } ] ] ] );
	assert.deepEqual( buildCustomCssLog( { client: 'demo', buildDir: none } ).rules, [] );
	// The residual pass's own write is its rules' business: it is not counted twice.
	const residual = fixture( [ [ 'home', 'r1', { rules: [ rule() ], gaps: [], refused: [] }, [ gap() ], [ { ...step, how: 'residual-css' } ] ] ] );
	assert.equal( buildCustomCssLog( { client: 'demo', buildDir: residual } ).rules.length, 1 );
	[ dir, bare, none, residual ].forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) );
} );

test( 'MUST FAIL: the logged part is the element the write read, and a write that rewrote the box is flagged rather than passed off as the appended text', () => {
	const moved = put( 'width ladder (padding-left): scoped @media rule', '@media (max-width: 599px) { & .x { padding-left: 4px; } }', { slot: '', readSlot: '.x', covers: 'padding-left' } );
	const rewrite = put( 'width gate (a and b): scoped @media rule', '@media (max-width: 767px) { & { display: none; } }', { before: '& { color: red; }', node: 'n2' } );
	const append = put( 'width gate (a and b): scoped @media rule', '& { color: red; }\n@media (max-width: 767px) { & { display: none; } }', { before: '& { color: red; }', node: 'n4' } );
	const dir = fixture( [ [ 'header', 'r1', { rules: [], gaps: [], refused: [] }, [], [ moved, rewrite, append ] ] ] );
	const log = buildCustomCssLog( { client: 'demo', buildDir: dir } );
	assert.equal( log.rules.find( ( r ) => 'n1' === r.node ).part, '.x', 'the part is the read element, as the census names it' );
	assert.equal( log.rules.find( ( r ) => 'n2' === r.node ).rewritten, true );
	const added = log.rules.find( ( r ) => 'n4' === r.node );
	assert.equal( added.rewritten, undefined );
	assert.equal( added.css, '@media (max-width: 767px) { & { display: none; } }', 'only the appended text' );
	fs.rmSync( dir, { recursive: true, force: true } );
} );
