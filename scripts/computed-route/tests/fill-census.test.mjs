import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { census, censusRun, loadRules } from '../lib/fill-census.mjs';

const ROOT = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

// One real reason text for every unmapped class, expected class beside it.
const SAMPLES = [
	[ 'state transition: the states wave (FR-48-81) or the owning block\'s setting', 'state-transition' ],
	[ 'unpaired-part: itemFontWeight paints the item part', 'unpaired-part' ],
	[ 'no declared part of sgs/nav-bar-menu is this element (.a > .b)', 'no-declared-part' ],
	[ 'uncalibrated: sgs/icon boxShadowHover (hover) not calibrated', 'uncalibrated' ],
	[ 'calibration has no presence reading for iconSource', 'uncalibrated' ],
	[ 'conflict: gap and rowGap both paint it', 'conflict' ],
	[ 'disagree: the 3 icons give childIconSize 2 different values', 'disagree' ],
	[ 'ambiguous: iconSource=wp-icon, iconSource=emoji all give align-items', 'ambiguous' ],
	[ 'width-gate: the draft shows it at 375 only', 'width-ladder' ],
	[ 'shape: justifyContent holds one value for every width; draft has "normal", "space-between"', 'width-ladder' ],
	[ 'unmapped-element: the draft paints x on y', 'unmapped-element' ],
	[ 'not-plain: the code declares x at 3px', 'not-plain' ],
	[ 'current-item: the draft renders no current copy', 'current-item' ],
	[ 'timing-computed: 0.3s', 'motion' ],
	[ 'the render shows motion (an endless animation, a marquee or an SVG animation) on this element', 'motion' ],
	[ 'the block declares no iconSource, so the draft icon\'s iconSource is not written', 'content-media-icon' ],
	[ 'the draftRef finder resolved no visible element at 375, 768 or 1440', 'draft-input' ],
	[ 'no-setting: sgs/icon has no setting for height; dimension: the content is of unknown height', 'dimension' ],
	[ 'shape: none cannot be held', 'shape' ],
	[ 'State Transition: capitalised text still matches', 'state-transition' ],
	[ 'no-setting: sgs/button has no setting for transition-duration', 'no-setting' ],
	[ 'no color setting on sgs/nav-bar-menu paints "x"', 'no-setting' ]
];

const row = ( reason, extra = {} ) => ( { property: 'gap', value: '1px', node: 'n', block: 'sgs/button', slot: '', reason, ...extra } );

test( 'MUST FAIL: every named class is matched by its real reason text', () => {
	const rules = loadRules();
	for ( const [ reason, expected ] of SAMPLES ) {
		const out = census( { unmapped: [ row( reason ) ] }, rules );
		assert.deepEqual( out.unclassified, [], `${ reason } is unclassified` );
		assert.equal( out.classes[ 0 ].class, expected, reason );
	}
	for ( const reason of [ 'covered', 'inherited', 'default' ] ) {
		const out = census( { held: [ row( reason ) ] }, rules );
		assert.equal( out.classes[ 0 ].class, `held-${ reason }` );
	}
} );

test( 'MUST FAIL: a planted row with a new reason is unclassified, and a held row with a new reason too', () => {
	const out = census( { unmapped: [ row( 'a brand new gap kind nobody named' ) ], held: [ row( 'mystery' ) ] } );
	assert.equal( out.unclassified.length, 2 );
	assert.deepEqual( out.classes, [] );
} );

test( 'MUST FAIL: counts, blocks, properties and owner are reported per class', () => {
	const out = census( { unmapped: [ row( 'no-setting: a', { block: 'sgs/icon', property: 'height' } ), row( 'no-setting: b', { block: 'sgs/button', property: 'gap' } ), row( 'shape: none cannot be held' ) ] } );
	const ns = out.classes.find( ( c ) => 'no-setting' === c.class );
	assert.equal( ns.count, 2 );
	assert.deepEqual( ns.blocks, [ 'sgs/button', 'sgs/icon' ] );
	assert.deepEqual( ns.properties, [ 'gap', 'height' ] );
	assert.match( ns.owner, /FR-48/ );
	assert.equal( out.total, 3 );
} );

test( 'MUST FAIL: census.mjs --check exits 1 on a planted unknown reason and 0 on known ones, reading alreadyHeld', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'census-' ) );
	const run = () => spawnSync( process.execPath, [ path.join( ROOT, 'census.mjs' ), dir, '--check' ], { encoding: 'utf8' } );
	fs.writeFileSync( path.join( dir, 'unmapped.json' ), JSON.stringify( [ row( 'no-setting: x' ) ] ) );
	fs.writeFileSync( path.join( dir, 'fill-report.json' ), JSON.stringify( { alreadyHeld: [ row( 'inherited' ) ] } ) );
	const ok = run();
	assert.equal( ok.status, 0, ok.stdout + ok.stderr );
	assert.match( ok.stdout, /2 rows, 2 classes, 0 unclassified/ );
	fs.writeFileSync( path.join( dir, 'unmapped.json' ), JSON.stringify( [ row( 'no-setting: x' ), row( 'new kind' ) ] ) );
	const bad = run();
	assert.equal( bad.status, 1 );
	assert.match( bad.stdout, /UNCLASSIFIED/ );
	assert.equal( censusRun( dir ).unclassified.length, 1 );
} );
