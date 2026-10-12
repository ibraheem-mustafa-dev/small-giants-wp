// Spec 48 FR-48-24, lib/intake-census.mjs: the construct census's static pass and its registry join. The fixture
// export (tests/fixtures/intake-census/export/) holds at least one construct of every kind: a mounted import (read
// through the runtime bridge) and an unmounted one (read standalone), a helmet font, script, keyframes and @font-face,
// bindings, style-* rules, a ref, a data-* hook, links, template and addEventListener handlers, a getter, renderVals()
// keys built by spread, assignment and Object.assign, timers, an observer, a Web Animations call and transitions. The
// four FR-48-24 negative controls each turn the census red, and the unchanged fixture with a full registry of fixture
// readers (tests/fixtures/intake-census/lib/) passes. The fixture's replay HAR is recorded once into the OS temp
// folder (the first run needs the network); later runs replay it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildManifest } from '../lib/handoff.mjs';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus, runCensus, mergeSightings, markUnreached, regexCounts } from '../lib/intake-census.mjs';
import { logicRows } from '../lib/intake-census-logic.mjs';
import { cutDraft } from '../lib/intake-census-template.mjs';
import { loadRegistry, readerFor, REGISTRY_FILE } from '../lib/intake-registry.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.join( HERE, 'fixtures', 'intake-census' );
const EXPORT = path.join( ROOT, 'export' );
const ENTRY = 'Home.dc.html';
const KINDS = Object.keys( JSON.parse( fs.readFileSync( REGISTRY_FILE, 'utf8' ) ) );
const full = ( fn = 'readAny' ) => Object.fromEntries( KINDS.map( ( k ) => [ k, { module: 'lib/fixture-readers.mjs', fn } ] ) );
const temps = [];
let harPath;
let census;

test.before( async () => {
	const { manifestHash } = recheckManifest( EXPORT );
	harPath = path.join( os.tmpdir(), 'sgs-intake-census-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: EXPORT, index: ENTRY, harPath } );
	}
	census = await staticCensus( { folder: EXPORT, entry: ENTRY, harPath } );
} );

test.after( () => temps.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );

const of = ( kind ) => census.rows.filter( ( r ) => r.kind === kind );

test( 'the static pass finds every one of the 19 kinds in the fixture, with no unknown construct and no gap', () => {
	const found = new Set( census.rows.map( ( r ) => r.kind ) );
	assert.deepEqual( [ ...found ].sort(), [ ...KINDS ].sort() );
	assert.deepEqual( census.gaps, [] );
	assert.ok( census.rows.every( ( r ) => 'static' === r.source && null === r.unreached && r.id ), 'every row is static, undecided and has an id' );
	assert.equal( new Set( census.rows.map( ( r ) => r.id ) ).size, census.rows.length, 'row ids are unique' );
} );

test( 'imports: the mounted child is read through the bridge, the unmounted one standalone, with its name restored', () => {
	assert.deepEqual( census.sources.map( ( s ) => [ s.component, s.via ] ), [ [ 'Home', 'entry' ], [ 'Child', 'bridge' ], [ 'Panel', 'standalone' ] ] );
	assert.deepEqual( of( 'dc-import' ).map( ( r ) => r.detail.name ), [ 'Child', 'Panel' ] );
	assert.deepEqual( census.sources[ 0 ].scripts.map( ( s ) => s.file ), [ 'helper.js' ] );
	assert.ok( of( 'style-hover' ).some( ( r ) => 'Child' === r.component && 'active' === r.detail.pseudo ) );
	assert.ok( of( 'data-hook' ).some( ( r ) => 'Panel' === r.component && 'data-panel' === r.detail.name ) );
} );

test( 'draft IDs: template constructs are <component>:<data-dc-tpl>, logic constructs <component>:js:<file line>:<column>', () => {
	assert.ok( of( 'template-element' ).every( ( r ) => /^(Home|Child|Panel):\d+$/.test( r.draftId ) ) );
	assert.deepEqual( of( 'template-element' ).filter( ( r ) => 'Home' === r.component ).map( ( r ) => r.draftId ).slice( 0, 3 ), [ 'Home:0', 'Home:1', 'Home:2' ] );
	const getter = of( 'getter' )[ 0 ];
	assert.equal( getter.detail.name, 'links' );
	const line = fs.readFileSync( path.join( EXPORT, ENTRY ), 'utf8' ).split( '\n' ).findIndex( ( l ) => l.includes( 'get links()' ) ) + 1;
	assert.equal( getter.draftId, `Home:js:${ line }:2` );
} );

test( 'template details: bound style-* rules, handlers wired to methods, the sc-for, the fonts', () => {
	assert.deepEqual( of( 'style-hover' ).filter( ( r ) => 'Home' === r.component ).map( ( r ) => [ r.detail.pseudo, r.detail.bound ] ), [ [ 'hover', true ], [ 'focus', false ] ] );
	assert.deepEqual( of( 'handler' ).map( ( r ) => [ r.detail.wiring, r.detail.event, r.detail.method ] ), [
		[ 'template', 'onClick', 'toggle' ], [ 'template', 'onDoubleClick', 'neverCalled' ], [ 'addEventListener', 'resize', 'onResize' ] ] );
	assert.deepEqual( of( 'sc-for' ).map( ( r ) => r.detail ), [ { list: '{{ links }}', as: 'item' } ] );
	assert.deepEqual( of( 'helmet-font' ).map( ( r ) => r.detail.via ), [ 'stylesheet', '@font-face' ] );
	assert.deepEqual( of( 'keyframes' ).map( ( r ) => r.detail.via ), [ '@keyframes', 'stylesheet' ] );
	assert.ok( of( 'binding' ).some( ( r ) => 'attr:style-hover' === r.detail.where && 'hoverColour' === r.detail.expression ) );
} );

test( 'logic details: renderVals() keys through spread, assignment and Object.assign; timers, observer, animate, style write', () => {
	assert.deepEqual( of( 'renderVals-key' ).filter( ( r ) => 'Home' === r.component ).map( ( r ) => r.detail.name ),
		[ 'title', 'hoverColour', 'links', 'toggle', 'setBox', 'neverCalled', 'open', 'showPanel' ] );
	assert.deepEqual( of( 'timer' ).map( ( r ) => r.detail.fn ), [ 'setTimeout', 'requestAnimationFrame' ] );
	assert.deepEqual( of( 'observer' ).map( ( r ) => r.detail.type ), [ 'IntersectionObserver' ] );
	assert.deepEqual( of( 'waapi' ).map( ( r ) => r.detail.target ), [ 'this._box' ] );
	assert.deepEqual( of( 'transition' ).map( ( r ) => r.detail.via ), [ 'style', 'style-assign' ] );
} );

test( 'METHOD.md §4 regex counts agree with the census on the fixture', () => {
	assert.ok( census.counts.length > 30 );
	assert.deepEqual( census.counts.filter( ( c ) => c.regex !== c.census ), [] );
	assert.equal( regexCounts( '<a style-hover="x" style-focus="y">' ).pseudo, 2 );
} );

test( 'POSITIVE: the unchanged fixture with a full registry of fixture readers passes', async () => {
	const res = await runCensus( { census, registry: full(), root: ROOT } );
	assert.deepEqual( res.problems, [] );
	assert.equal( res.pass, true );
	assert.ok( res.rows.every( ( r ) => 'lib/fixture-readers.mjs#readAny' === r.reader ) );
} );

test( 'the committed registry validates, holds only gaps, and the fixture census passes with it', async () => {
	const reg = loadRegistry();
	assert.ok( Object.values( reg ).every( ( e ) => e.gap ) );
	const res = await runCensus( { census, registry: reg } );
	assert.equal( res.pass, true, res.problems.join( '\n' ) );
	assert.ok( res.rows.every( ( r ) => r.gap && ! r.reader ) );
} );

test( 'MUST FAIL (control 1): a registry missing one entry fails and names the unread kind', async () => {
	const reg = full();
	delete reg.link;
	const res = await runCensus( { census, registry: reg, root: ROOT } );
	assert.equal( res.pass, false );
	assert.deepEqual( res.problems, [ 'unread kind link: no registry entry (2 constructs, first Home:6)' ] );
} );

test( 'MUST FAIL (control 2): an unknown sc-* attribute and a computed-key getter fail the census and are named', async () => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'intake-census-' ) );
	temps.push( d );
	fs.cpSync( EXPORT, d, { recursive: true } );
	const file = path.join( d, ENTRY );
	const src = fs.readFileSync( file, 'utf8' );
	const planted = src.replace( '<h1 class="census-title"', '<h1 sc-zzz="1" class="census-title"' ).replace( '  get links() {', "  get [ 'dyn' + 'amic' ]() {\n    return 1;\n  }\n\n  get links() {" );
	assert.notEqual( planted, src );
	fs.writeFileSync( file, planted );
	fs.writeFileSync( path.join( d, 'MANIFEST.json' ), JSON.stringify( buildManifest( d, { project: 'Census fixture', entryDrafts: [ ENTRY ], generated: '2026-10-12' } ), null, 2 ) );
	const res = await runCensus( { folder: d, entry: ENTRY, harPath, registry: full(), root: ROOT } );
	assert.equal( res.pass, false );
	assert.ok( res.problems.some( ( p ) => /^unknown construct at Home:\d+: unknown sc-\* attribute sc-zzz$/.test( p ) ), res.problems.join( '\n' ) );
	assert.ok( res.problems.some( ( p ) => /^unknown construct at Home:js:\d+:2: computed-key getter \(get \[ 'dyn' \+ 'amic' \]/.test( p ) ), res.problems.join( '\n' ) );
} );

test( 'MUST FAIL (control 2, walker): a static block is an unknown member; a setter too', () => {
	const logic = 'class Component extends DCLogic {\n  static { this.x = 1; }\n  set y( v ) {}\n  renderVals() { return {}; }\n}\n';
	const { rows } = logicRows( { component: 'T', logic } );
	assert.deepEqual( rows.filter( ( r ) => 'unknown' === r.kind ).map( ( r ) => [ r.draftId, r.detail.why ] ), [ [ 'T:js:2:2', 'StaticBlock member' ], [ 'T:js:3:2', 'setter y' ] ] );
} );

test( 'MUST FAIL (control 3): a reader that throws is a gap row with its error text, and the census fails', async () => {
	const reg = { ...full(), timer: { module: 'lib/fixture-readers.mjs', fn: 'readThrows' } };
	const res = await runCensus( { census, registry: reg, root: ROOT } );
	assert.equal( res.pass, false );
	const timers = of( 'timer' ).map( ( r ) => r.draftId );
	assert.deepEqual( res.gaps, timers.map( ( id ) => ( { construct: 'timer', draftId: id, error: `fixture reader cannot read ${ id }` } ) ) );
	assert.ok( res.problems.every( ( p ) => p.startsWith( 'reader lib/fixture-readers.mjs#readThrows threw on timer ' ) ) );
	assert.equal( res.problems.length, timers.length );
} );

test( 'MUST FAIL (control 4): a reader returning nothing for a construct it claims fails ("empty reader")', async () => {
	const reg = { ...full(), waapi: { module: 'lib/fixture-readers.mjs', fn: 'readEmpty' } };
	const res = await runCensus( { census, registry: reg, root: ROOT } );
	assert.equal( res.pass, false );
	assert.deepEqual( res.problems, [ `empty reader waapi ${ of( 'waapi' )[ 0 ].draftId } (lib/fixture-readers.mjs#readEmpty)` ] );
} );

test( 'readerFor names a missing module or function; loadRegistry refuses an entry with both a reader and a gap', async () => {
	await assert.rejects( readerFor( { module: 'lib/missing.mjs', fn: 'x' }, { root: ROOT } ), /reader module lib\/missing\.mjs does not load/ );
	await assert.rejects( readerFor( { module: 'lib/fixture-readers.mjs', fn: 'nope' }, { root: ROOT } ), /has no function nope/ );
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'intake-registry-' ) );
	temps.push( d );
	const bad = path.join( d, 'construct-registry.json' );
	fs.writeFileSync( bad, JSON.stringify( { timer: { module: 'lib/x.mjs', fn: 'f', gap: 'both' } } ) );
	assert.throws( () => loadRegistry( bad ), /does not match construct-registry\.schema\.json:\n\/timer/ );
} );

test( 'the runtime pass merges by row id: a sighting makes a row both, a static-only row of a traced kind is unreached', () => {
	const rows = census.rows.filter( ( r ) => 'handler' === r.kind );
	const seen = rows.filter( ( r ) => 'neverCalled' !== r.detail.method ).map( ( { kind, draftId, component, detail } ) => ( { kind, draftId, component, detail } ) );
	const extra = { kind: 'handler', draftId: 'Home:99', component: 'Home', detail: { wiring: 'template', event: 'onClick' } };
	const merged = markUnreached( mergeSightings( rows, [ ...seen, extra ] ), { kinds: [ 'handler' ] } );
	assert.deepEqual( merged.map( ( r ) => [ r.detail.event, r.source, r.unreached ] ), [
		[ 'onClick', 'both', false ], [ 'onDoubleClick', 'static', true ], [ 'resize', 'both', false ], [ 'onClick', 'runtime', false ] ] );
} );

test( 'cutDraft cuts at the runtime boundaries and places the logic at its file line', () => {
	const text = '<x-dc>\n<p>{{ a }}</p>\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props="{&quot;x&quot;:1}">\nclass Component extends DCLogic {}\n</script>';
	const c = cutDraft( text );
	assert.equal( c.template, '\n<p>{{ a }}</p>\n' );
	assert.equal( c.logic, '\nclass Component extends DCLogic {}\n' );
	assert.equal( c.logicLine, 4 );
	assert.throws( () => cutDraft( '<p>no component</p>' ), /no <x-dc>/ );
} );
