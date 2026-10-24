import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { conservation, conservationRun, groupFailures, longhandsOf, readRowsOf } from '../lib/census-conservation.mjs';
import { inputHashes, readSetFile } from '../lib/census-reads.mjs';

const ROOT = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

const read = ( property, value, over = {} ) => ( { draft: '{"tpl":"Root/45#0"}', node: 'cr-ref-header-15', block: 'sgs/nav-bar-menu', slot: '.link', property, width: 1440, value, ...over } );
const write = ( prop, over = {} ) => ( { node: 'cr-ref-header-15', slot: '.link', prop, attr: 'x', widths: [ 1440 ], how: 'single', ...over } );
const verdict = ( reads, report = {}, unmapped = [] ) => conservation( { reads, report: { writes: [], confirm: [], alreadyHeld: [], ledger: [], ...report }, unmapped } );

test( 'MUST FAIL: a declared value with no write, held or unwritten row is a failure carrying draft id, block, part, property, value and width', () => {
	const out = verdict( [ read( 'letter-spacing', '-0.01em' ) ], { writes: [ write( 'font-size' ) ] } );
	assert.equal( out.failures.length, 1 );
	assert.deepEqual( out.failures[ 0 ], { draft: '{"tpl":"Root/45#0"}', block: 'sgs/nav-bar-menu', node: 'cr-ref-header-15', slot: '.link', property: 'letter-spacing', value: '-0.01em', width: 1440, state: 'rest' } );
} );

test( 'MUST FAIL: a written, a held and an unwritten row each conserve their read', () => {
	const reads = [ read( 'color', 'red' ), read( 'font-size', '17px' ), read( 'display', 'block' ) ];
	const out = verdict( reads, { writes: [ write( 'color' ) ], alreadyHeld: [ { node: 'cr-ref-header-15', slot: '.link', property: 'font-size', state: null, reason: 'inherited' } ] }, [ { node: 'cr-ref-header-15', slot: '.link', property: 'display', reason: 'no-setting: x' } ] );
	assert.equal( out.conserved, 3 );
	assert.deepEqual( out.failures, [] );
} );

test( 'MUST FAIL: two widths are not merged (a write at 1440 does not answer the read at 375)', () => {
	const out = verdict( [ read( 'color', 'red', { width: 375 } ), read( 'color', 'red', { width: 1440 } ) ], { writes: [ write( 'color' ) ] } );
	assert.deepEqual( out.failures.map( ( f ) => f.width ), [ 375 ] );
} );

test( 'MUST FAIL: a confirm record answers its own width only', () => {
	const out = verdict( [ read( 'color', 'red', { width: 375 } ), read( 'color', 'red', { width: 768 } ) ], { confirm: [ { node: 'cr-ref-header-15', slot: '.link', property: 'color', width: 768, state: 'default', verdict: 'confirmed' } ] } );
	assert.deepEqual( out.failures.map( ( f ) => f.width ), [ 375 ] );
} );

test( 'MUST FAIL: a state write or state held row never answers a rest read', () => {
	const out = verdict( [ read( 'color', 'red' ) ], { writes: [ write( 'color', { state: 'hover' } ) ], alreadyHeld: [ { node: 'cr-ref-header-15', slot: '.link', property: 'color', state: 'hover', reason: 'covered' } ] } );
	assert.equal( out.failures.length, 1 );
} );

test( 'MUST FAIL: a hover confirm record does not answer a rest read', () => {
	const out = verdict( [ read( 'color', 'red' ) ], { confirm: [ { node: 'cr-ref-header-15', slot: '.link', property: 'color', width: 1440, state: 'hover' } ] } );
	assert.equal( out.failures.length, 1 );
} );

test( 'MUST FAIL: the same property on another part or another node does not answer', () => {
	const out = verdict( [ read( 'color', 'red' ) ], { writes: [ write( 'color', { slot: '.other' } ), write( 'color', { node: 'cr-ref-header-16' } ) ] } );
	assert.equal( out.failures.length, 1 );
} );

test( 'MUST FAIL: a shorthand write answers the longhands it sets, and only those', () => {
	const out = verdict( [ read( 'border-top-left-radius', '4px' ), read( 'border-top-width', '1px' ), read( 'margin-top', '2px' ) ], { writes: [ write( 'border-radius' ) ] } );
	assert.deepEqual( out.failures.map( ( f ) => f.property ).sort(), [ 'border-top-width', 'margin-top' ] );
	assert.ok( longhandsOf( 'border' ).includes( 'border-top-width' ) );
	assert.ok( ! longhandsOf( 'border-radius' ).includes( 'border-top-width' ) );
} );

test( 'MUST FAIL: a CSS-wide keyword is excluded and counted, a real value beside it is not', () => {
	const out = verdict( [ read( 'background-size', 'initial' ), read( 'background-size', 'cover', { slot: '.b' } ) ] );
	assert.equal( out.excluded.cssWide, 1 );
	assert.equal( out.failures.length, 1 );
	assert.equal( out.failures[ 0 ].value, 'cover' );
} );

test( 'MUST FAIL: a motion write answers the transition longhands of its own element and nothing else', () => {
	const out = verdict( [ read( 'transition-duration', '0.2s' ), read( 'transition-duration', '0.2s', { slot: '.other' } ), read( 'color', 'red' ) ], { writes: [ write( 'transition-duration', { how: 'fill-timing' } ) ] } );
	assert.deepEqual( out.failures.map( ( f ) => `${ f.slot } ${ f.property }` ).sort(), [ '.link color', '.other transition-duration' ] );
} );

test( 'MUST FAIL: failures group by block then property', () => {
	const g = groupFailures( [ read( 'a', '1' ), read( 'a', '2', { width: 375 } ), read( 'b', '1' ), read( 'a', '1', { block: 'sgs/button' } ) ] );
	assert.deepEqual( g.map( ( x ) => `${ x.block } ${ x.property } ${ x.count }` ), [ 'sgs/button a 1', 'sgs/nav-bar-menu a 2', 'sgs/nav-bar-menu b 1' ] );
} );

test( 'MUST FAIL: a malformed read set is an explicit failure with its reason', () => {
	assert.throws( () => readRowsOf( { version: 1, rows: [] } ), /not a read set/ );
	assert.throws( () => readRowsOf( { version: 3, rows: [] } ), /not a read set/ );
	assert.throws( () => readRowsOf( { version: 2, rows: [ { ...read( 'a', '1' ), width: 'x' } ] } ), /numeric width/ );
	assert.throws( () => readRowsOf( { version: 2, rows: [ { ...read( 'a', '1' ), slot: undefined } ] } ), /no slot/ );
	assert.throws( () => readRowsOf( { version: 2, rows: [ { ...read( 'a', '1' ), value: null } ] } ), /no value/ );
} );

test( 'readSetFile makes one row per declared longhand per width a part was found at', () => {
	const nodes = [ { name: 'sgs/nav-bar-menu', targets: [ { id: '0:.link', finder: { tpl: 'Root/45#0' } } ] } ];
	const reads = { declared: { 375: { '0:.link': { color: 'red' } }, 768: { '0:.link': { color: 'blue' } }, 1440: { '0:.link': { color: 'red', 'letter-spacing': '-0.01em' } } }, widths: { 375: { '0:.link': { missing: true } }, 768: { '0:.link': {} }, 1440: { '0:.link': {} } } };
	const inputs = { skeleton: { file: 'a', sha256: 'b' }, draft: { file: 'c', sha256: 'd' } };
	const file = readSetFile( { client: 'c', surface: 's', run: '2026-10-23T10-00-00', inputs, reads, nodes, refs: [ 'cr-ref-s-0' ] } );
	assert.deepEqual( [ file.version, file.run, file.inputs ], [ 2, '2026-10-23T10-00-00', inputs ] );
	assert.deepEqual( file.rows.map( ( r ) => `${ r.width } ${ r.property } ${ r.value } ${ r.draft }` ), [ '768 color blue {"tpl":"Root/45#0"}', '1440 color red {"tpl":"Root/45#0"}', '1440 letter-spacing -0.01em {"tpl":"Root/45#0"}' ] );
	assert.equal( readRowsOf( file ).length, 3 );
} );

// A planted repository root with the run's skeleton and draft, and a run folder inside it whose reads.json is bound to them.
function plant( reads, { held = [] } = {} ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'conserve-' ) );
	fs.mkdirSync( path.join( root, 'sk' ) );
	fs.writeFileSync( path.join( root, 'sk', 's.skeleton.json' ), '[{"name":"sgs/nav-bar-menu"}]' );
	fs.writeFileSync( path.join( root, 'sk', 'Draft.dc.html' ), '<html></html>' );
	const dir = path.join( root, 'runs', '2026-10-23T10-00-00' );
	fs.mkdirSync( dir, { recursive: true } );
	const report = { client: 'c', surface: 's', writes: [ write( 'color' ) ], alreadyHeld: held, confirm: [], ledger: [] };
	fs.writeFileSync( path.join( dir, 'fill-report.json' ), JSON.stringify( report ) );
	fs.writeFileSync( path.join( dir, 'unmapped.json' ), '[]' );
	fs.writeFileSync( path.join( dir, 'filled.tree.json' ), JSON.stringify( [ { name: 'sgs/nav-bar-menu', attributes: { className: 'cr-ref-header-15' }, innerBlocks: [] } ] ) );
	const inputs = inputHashes( { root, skeleton: 'sk/s.skeleton.json', draft: 'sk/Draft.dc.html' } );
	reads && fs.writeFileSync( path.join( dir, 'reads.json' ), JSON.stringify( { version: 2, client: 'c', surface: 's', run: '2026-10-23T10-00-00', inputs, rows: reads } ) );
	return { dir, root };
}
const check = ( { dir, root } ) => spawnSync( process.execPath, [ path.join( ROOT, 'census.mjs' ), dir, '--check' ], { encoding: 'utf8', env: { ...process.env, SGS_REPO_ROOT: root } } );
const rewrite = ( dir, change ) => {
	const f = path.join( dir, 'reads.json' );
	fs.writeFileSync( f, JSON.stringify( change( JSON.parse( fs.readFileSync( f, 'utf8' ) ) ) ) );
};

test( 'MUST FAIL: a read set is bound to its run: another run\'s stamp, a skeleton or draft changed since it was saved, a hash the run records otherwise, or a node the run\'s tree does not hold leaves the run unchecked and fails --check', () => {
	const cases = [
		[ ( p ) => rewrite( p.dir, ( r ) => ( { ...r, run: '2026-10-22T09-00-00' } ) ), /saved for run 2026-10-22T09-00-00, not 2026-10-23T10-00-00/ ],
		[ ( p ) => fs.writeFileSync( path.join( p.root, 'sk', 's.skeleton.json' ), '[{"name":"sgs/other"}]' ), /the skeleton sk\/s\.skeleton\.json changed since the read set was saved/ ],
		[ ( p ) => fs.writeFileSync( path.join( p.root, 'sk', 'Draft.dc.html' ), '<html>2</html>' ), /the draft sk\/Draft\.dc\.html changed/ ],
		[ ( p ) => rewrite( p.dir, ( r ) => ( { ...r, inputs: { draft: r.inputs.draft } } ) ), /binds no skeleton hash/ ],
		[ ( p ) => rewrite( p.dir, ( r ) => ( { ...r, inputs: { ...r.inputs, skeleton: { file: r.inputs.skeleton.file } } } ) ), /binds no skeleton hash/ ],
		[ ( p ) => rewrite( p.dir, ( r ) => ( { ...r, rows: r.rows.map( ( x ) => ( { ...x, node: 'cr-ref-header-99' } ) ) } ) ), /cr-ref-header-99 \(sgs\/nav-bar-menu\), which the run's filled\.tree\.json does not hold/ ],
		[ ( p ) => fs.writeFileSync( path.join( p.dir, 'fill-report.json' ), JSON.stringify( { client: 'c', surface: 's', inputs: { skeleton: 'f00', draft: 'f00' } } ) ), /the run recorded skeleton f00/ ],
		[ ( p ) => fs.unlinkSync( path.join( p.dir, 'filled.tree.json' ) ), /no filled\.tree\.json/ ],
	];
	for ( const [ spoil, why ] of cases ) {
		const p = plant( [ read( 'color', 'red' ) ] );
		spoil( p );
		const r = conservationRun( p.dir, { root: p.root } );
		assert.equal( r.status, 'unbound', String( why ) );
		assert.match( r.reason, why );
		const c = check( p );
		assert.equal( c.status, 1, String( why ) );
		assert.match( c.stdout, /CONSERVATION: not checked/ );
	}
	// negative control: the untouched run is bound, and a hash the run records that matches passes
	const p = plant( [ read( 'color', 'red' ) ] );
	assert.equal( conservationRun( p.dir, { root: p.root } ).status, 'checked' );
	assert.equal( check( p ).status, 0 );
	const rec = JSON.parse( fs.readFileSync( path.join( p.dir, 'reads.json' ), 'utf8' ) ).inputs;
	fs.writeFileSync( path.join( p.dir, 'fill-report.json' ), JSON.stringify( { client: 'c', surface: 's', writes: [ write( 'color' ) ], inputs: { skeleton: rec.skeleton.sha256, draft: rec.draft.sha256 } } ) );
	assert.equal( conservationRun( p.dir, { root: p.root } ).status, 'checked' );
} );

test( 'MUST FAIL: Fill\'s held rows carry no width, so a read they conserve is listed as resting on a widthless hold', () => {
	const held = { node: 'cr-ref-header-15', slot: '.link', property: 'font-size', state: null, reason: 'inherited' };
	const out = verdict( [ read( 'font-size', '17px', { width: 375 } ), read( 'color', 'red' ) ], { writes: [ write( 'color' ) ], alreadyHeld: [ held ] } );
	assert.equal( out.conserved, 2 );
	assert.deepEqual( out.widthlessHolds.map( ( r ) => `${ r.property } ${ r.width } ${ r.how }` ), [ 'font-size 375 inherited' ] );
	// negative control: a read a write at its width also answers does not rest on the hold
	assert.deepEqual( verdict( [ read( 'font-size', '17px' ) ], { writes: [ write( 'font-size' ) ], alreadyHeld: [ held ] } ).widthlessHolds, [] );
	const c = check( plant( [ read( 'color', 'red' ), read( 'font-size', '17px' ) ], { held: [ held ] } ) );
	assert.match( c.stdout, /1 conserved read rests on a held row that records no width/ );
} );

test( 'MUST FAIL: census.mjs --check exits 1 on a dropped declared value and lists its row', () => {
	const bad = check( plant( [ read( 'color', 'red' ), read( 'letter-spacing', '-0.01em' ) ] ) );
	assert.equal( bad.status, 1, bad.stdout + bad.stderr );
	assert.match( bad.stdout, /CONSERVATION: 1 of 2 declared reads dropped/ );
	assert.match( bad.stdout, /sgs\/nav-bar-menu letter-spacing/ );
	assert.match( bad.stdout, /Root\/45#0/ );
	assert.match( bad.stdout, /-0\.01em/ );
	const ok = check( plant( [ read( 'color', 'red' ) ] ) );
	assert.equal( ok.status, 0, ok.stdout + ok.stderr );
	assert.match( ok.stdout, /CONSERVATION: 1 declared reads, 1 conserved, 0 dropped/ );
} );

test( 'MUST FAIL: a run with no read set is reported as such and fails --check, never clean', () => {
	const p = plant( null );
	assert.equal( conservationRun( p.dir ).status, 'no-read-set' );
	const bad = check( p );
	assert.equal( bad.status, 1 );
	assert.match( bad.stdout, /CONSERVATION: not checked/ );
} );

test( 'MUST FAIL: a read set of another surface is refused', () => {
	const { dir } = plant( [ read( 'color', 'red' ) ] );
	const f = path.join( dir, 'reads.json' );
	fs.writeFileSync( f, JSON.stringify( { ...JSON.parse( fs.readFileSync( f, 'utf8' ) ), surface: 'footer' } ) );
	assert.throws( () => conservationRun( dir ), /read set of c\/footer/ );
} );

test( 'MUST FAIL: --json carries the conservation result', () => {
	const p = plant( [ read( 'letter-spacing', '-0.01em' ) ] );
	const r = spawnSync( process.execPath, [ path.join( ROOT, 'census.mjs' ), p.dir, '--json' ], { encoding: 'utf8', env: { ...process.env, SGS_REPO_ROOT: p.root } } );
	assert.equal( JSON.parse( r.stdout ).conservation.failures[ 0 ].property, 'letter-spacing' );
} );

// Track W's review: each shape below counted a read as conserved by an outcome of another state, element, width or property.
test( 'MUST FAIL: an UNMAPPED row of another state or another width does not conserve a rest read', () => {
	const hover = { node: 'cr-ref-header-15', slot: '.link', property: 'color', value: 'red', state: 'hover', reason: 'no-setting: x' };
	assert.equal( verdict( [ read( 'color', 'red' ) ], {}, [ hover ] ).failures.length, 1 );
	const at768 = { node: 'cr-ref-header-15', slot: '.link', property: 'color', value: '{"768":"red"}', state: null, reason: 'no-setting: x' };
	assert.deepEqual( verdict( [ read( 'color', 'red' ), read( 'color', 'red', { width: 768 } ) ], {}, [ at768 ] ).failures.map( ( f ) => f.width ), [ 1440 ] );
	// negative control: the rest row with a plain value conserves the read at every width
	assert.equal( verdict( [ read( 'color', 'red' ), read( 'color', 'red', { width: 375 } ) ], {}, [ { ...hover, state: null } ] ).conserved, 2 );
} );

test( 'MUST FAIL: a confirm record counts as written only when its verdict says the element shows the value', () => {
	const c = ( v ) => ( { node: 'cr-ref-header-15', slot: '.link', property: 'color', width: 1440, state: 'default', verdict: v, renderedLive: null } );
	for ( const v of [ 'open', 'render-wins', 'draft-defect', 'effect-differs', undefined ] ) {
		assert.equal( verdict( [ read( 'color', 'red' ) ], { confirm: [ c( v ) ] } ).failures.length, 1, String( v ) );
	}
	assert.equal( verdict( [ read( 'color', 'red' ) ], { confirm: [ c( 'confirmed' ) ] } ).conserved, 1 );
} );

test( 'MUST FAIL: a ledger row of another state, or one Fill did not apply to the rest look, does not conserve a rest read', () => {
	const l = { node: 'cr-ref-header-15', slot: '.link', prop: 'color', width: 1440, id: 'D-1' };
	assert.equal( verdict( [ read( 'color', 'red' ) ], { ledger: [ { ...l, state: 'hover' } ] } ).failures.length, 1 );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { ledger: [ { ...l, applied: false } ] } ).failures.length, 1 );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { ledger: [ { ...l, applied: true } ] } ).conserved, 1 );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { ledger: [ { ...l, state: '*' } ] } ).conserved, 1 );
} );

test( 'MUST FAIL: a write read on another element answers that element only, never the element it is written on', () => {
	const scoped = write( 'color', { slot: '', readSlot: '.link' } );
	assert.equal( verdict( [ read( 'color', 'red', { slot: '' } ) ], { writes: [ scoped ] } ).failures.length, 1 );
	assert.equal( verdict( [ read( 'color', 'red', { slot: '' } ) ], { writes: [ write( 'color', { slot: '', readSlot: '.icon' } ) ] } ).failures.length, 1 );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { writes: [ scoped ] } ).conserved, 1 );
	// the same holds for a settled row
	const s = { node: 'cr-ref-header-15', slot: '', readSlot: '.link', property: 'color', widths: [ 1440 ], reason: 'already-set' };
	assert.equal( verdict( [ read( 'color', 'red', { slot: '' } ) ], { settled: [ s ] } ).failures.length, 1 );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { settled: [ s ] } ).conserved, 1 );
} );

test( 'MUST FAIL: a write that names no widths and no answers answers no width', () => {
	assert.equal( verdict( [ read( 'color', 'red' ) ], { writes: [ write( 'color', { widths: [] } ) ] } ).failures.length, 1 );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { writes: [ write( 'color', { widths: undefined } ) ] } ).failures.length, 1 );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { writes: [ write( 'color', { widths: [], answers: [ 1440 ] } ) ] } ).conserved, 1 );
} );

test( 'MUST FAIL: a motion or timing write answers only the longhands it writes', () => {
	const reads = [ 'animation-name', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay' ].map( ( p ) => read( p, 'x' ) );
	const dropped = ( w ) => verdict( reads, { writes: [ w ] } ).failures.map( ( f ) => f.property ).sort();
	assert.deepEqual( dropped( write( 'transition-duration', { how: 'fill-timing' } ) ), [ 'animation-name', 'transition-delay', 'transition-property', 'transition-timing-function' ] );
	assert.deepEqual( dropped( write( 'transition-delay', { how: 'single' } ) ), [ 'animation-name', 'transition-duration', 'transition-property', 'transition-timing-function' ] );
	const layer = write( 'motion root', { how: 'motion', attr: 'sgsMotion', after: { v: 1, elements: { root: { hover: { state: { values: { duration: 200, easing: 'ease', scale: 1.1 } } } } } } } );
	assert.deepEqual( dropped( layer ), [ 'animation-name', 'transition-delay', 'transition-property' ] );
	assert.deepEqual( dropped( write( 'J-12 scrolledOffset', { how: 'motion', attr: 'scrolledOffset', after: 8 } ) ), reads.map( ( r ) => r.property ).sort() );
	// negative control: a transition shorthand write answers every transition longhand
	assert.deepEqual( dropped( write( 'transition' ) ), [ 'animation-name' ] );
} );

test( 'MUST FAIL: a settled row with no reason conserves nothing and fails --check', () => {
	const s = { node: 'cr-ref-header-15', block: 'sgs/nav-bar-menu', slot: '.link', property: 'color', widths: [ 1440 ] };
	const out = verdict( [ read( 'color', 'red' ) ], { settled: [ s ] } );
	assert.equal( out.failures.length, 1 );
	assert.deepEqual( out.unreasoned.map( ( u ) => u.property ), [ 'color' ] );
	assert.equal( verdict( [ read( 'color', 'red' ) ], { settled: [ { ...s, reason: 'equal' } ] } ).conserved, 1 );
	const p = plant( [ read( 'color', 'red' ) ] );
	const f = path.join( p.dir, 'fill-report.json' );
	fs.writeFileSync( f, JSON.stringify( { ...JSON.parse( fs.readFileSync( f, 'utf8' ) ), settled: [ s ] } ) );
	const c = check( p );
	assert.equal( c.status, 1, c.stdout );
	assert.match( c.stdout, /SETTLED WITH NO REASON: sgs\/nav-bar-menu cr-ref-header-15 \.link color/ );
} );
